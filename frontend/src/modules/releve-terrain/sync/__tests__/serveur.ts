// Test server: the REAL server SQL (SUPABASE-SQL.md section 5, copied in rt.sql, md5 checked) and the
// stubs of the workshop (auth.users, auth.uid() read from test.uid, public.users) in PGlite. The rpc
// adapter calls `select public.<fonction>(p_x => $1, ...)` with test.uid set to the calling account.
import { PGlite } from '@electric-sql/pglite'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { classerErreur, type Rpc } from '../rpc'

export const P = '00000000-0000-0000-0000-000000000001'
export const R = '00000000-0000-0000-0000-000000000002'
export const C = '00000000-0000-0000-0000-000000000003'
export const N = '00000000-0000-0000-0000-000000000004'

const lf = (s: string) => s.replace(/\r\n/g, '\n')
const chemin = (f: string) => fileURLToPath(new URL(f, import.meta.url))

/** Server SQL as UTF-8 text with LF line endings and one final newline. */
export function sqlServeur(): string {
  const t = lf(readFileSync(chemin('./rt.sql'), 'utf8')).replace(/\n*$/, '\n')
  return t
}

export function md5(t: string): string {
  return createHash('md5').update(Buffer.from(t, 'utf8')).digest('hex')
}

export interface Serveur {
  db: PGlite
  /** Adapter of one account (its phone). `apres` runs after every call (fault injection). */
  rpc: (uid: string) => Rpc
  /** Plain SQL as postgres (checks). */
  sql: <T = Record<string, unknown>>(q: string, params?: unknown[]) => Promise<T[]>
  appels: { uid: string; fonction: string; args: Record<string, unknown> }[]
}

function valeur(v: unknown): unknown {
  if (v === null || v === undefined) return null
  if (typeof v === 'object') return JSON.stringify(v)
  return v
}

export async function nouveauServeur(): Promise<Serveur> {
  const db = new PGlite()
  await db.exec(lf(readFileSync(chemin('./stubs.sql'), 'utf8')))
  const sql = sqlServeur()
  await db.exec(sql)
  await db.exec(sql)
  const appels: Serveur['appels'] = []
  const rpc =
    (uid: string): Rpc =>
    async (fonction, args) => {
      appels.push({ uid, fonction, args })
      const cles = Object.keys(args)
      const q = `select public.${fonction}(${cles.map((k, i) => `${k} => $${i + 1}`).join(', ')}) as r`
      try {
        await db.query(`select set_config('test.uid', $1, false)`, [uid])
        const res = await db.query<{ r: unknown }>(q, cles.map((k) => valeur(args[k])))
        return res.rows[0]?.r ?? null
      } catch (e) {
        throw classerErreur(e)
      }
    }
  return {
    db,
    rpc,
    appels,
    sql: async <T,>(q: string, params: unknown[] = []) => {
      await db.query(`select set_config('test.uid', '', false)`)
      return (await db.query<T>(q, params)).rows
    },
  }
}
