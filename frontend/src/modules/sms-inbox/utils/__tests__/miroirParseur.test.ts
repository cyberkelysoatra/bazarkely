import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const ICI = dirname(fileURLToPath(import.meta.url))

/**
 * L'Edge Function `ingest-sms` (Deno) ne peut pas importer depuis `frontend/src`.
 * Elle consomme donc une copie du parseur placee dans `supabase/functions/ingest-sms/`.
 * Ce test interdit la derive entre les deux : si le parseur evolue d un cote
 * sans etre recopie de l autre, l ingestion serveur decoderait les SMS
 * autrement que l application — en silence.
 *
 * Pour reparer :
 *   cp frontend/src/modules/sms-inbox/utils/parseurOrangeMoney.ts \
 *      supabase/functions/ingest-sms/parseurOrangeMoney.ts
 */
describe('parseurOrangeMoney — copie serveur', () => {
  it('la copie de supabase/functions/ingest-sms est identique a la source', () => {
    const source = resolve(ICI, '../parseurOrangeMoney.ts')
    const copie = resolve(ICI, '../../../../../../supabase/functions/ingest-sms/parseurOrangeMoney.ts')

    expect(readFileSync(copie, 'utf8')).toBe(readFileSync(source, 'utf8'))
  })
})
