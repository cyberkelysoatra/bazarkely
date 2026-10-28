/**
 * Account listed first (and pre-selected) in the account sheet (pure, tested):
 * the account most used for that category in the user's last 90 days of local
 * transactions; fallback the default account, then the first one.
 */
import type { Account, Transaction, TransactionCategory } from '../../../types'

const QUATRE_VINGT_DIX_JOURS_MS = 90 * 24 * 60 * 60 * 1000

export function comptePrefere(
  comptes: Pick<Account, 'id' | 'isDefault'>[],
  transactions: Pick<Transaction, 'accountId' | 'category' | 'date' | 'type'>[],
  categorie: TransactionCategory | null,
  maintenant: Date = new Date()
): string | null {
  if (comptes.length === 0) return null
  const connus = new Set(comptes.map((c) => c.id))
  const limite = maintenant.getTime() - QUATRE_VINGT_DIX_JOURS_MS

  if (categorie) {
    const usage = new Map<string, { n: number; dernier: number }>()
    for (const t of transactions) {
      if (t.type === 'transfer' || t.category !== categorie || !connus.has(t.accountId)) continue
      const quand = new Date(t.date).getTime()
      if (!Number.isFinite(quand) || quand < limite || quand > maintenant.getTime() + 86_400_000) continue
      const u = usage.get(t.accountId) ?? { n: 0, dernier: 0 }
      u.n += 1
      u.dernier = Math.max(u.dernier, quand)
      usage.set(t.accountId, u)
    }
    let meilleur: string | null = null
    let score = { n: 0, dernier: 0 }
    for (const [id, u] of usage) {
      if (u.n > score.n || (u.n === score.n && u.dernier > score.dernier)) {
        meilleur = id
        score = u
      }
    }
    if (meilleur) return meilleur
  }

  return comptes.find((c) => c.isDefault)?.id ?? comptes[0].id
}

/** Accounts ordered for the sheet: preferred first, the rest unchanged. */
export function ordonnerComptes<T extends { id: string }>(comptes: T[], prefere: string | null): T[] {
  if (!prefere) return comptes
  const premier = comptes.find((c) => c.id === prefere)
  return premier ? [premier, ...comptes.filter((c) => c.id !== prefere)] : comptes
}

/**
 * Sheet order when the AI found several matching accounts (DICTEE-CC-02):
 * the matching ones first (preferred one at the top), then the others.
 */
export function ordonnerAvecCandidats<T extends { id: string }>(comptes: T[], candidats: string[], prefere: string | null): T[] {
  const enTete = ordonnerComptes(comptes.filter((c) => candidats.includes(c.id)), prefere)
  const reste = ordonnerComptes(comptes.filter((c) => !candidats.includes(c.id)), prefere)
  return [...enTete, ...reste]
}

/** Most frequent category among the lines missing an account (sheet pre-selection). */
export function categorieDominante(categories: (TransactionCategory | null)[]): TransactionCategory | null {
  const n = new Map<TransactionCategory, number>()
  for (const c of categories) if (c) n.set(c, (n.get(c) ?? 0) + 1)
  let meilleure: TransactionCategory | null = null
  let max = 0
  for (const [c, k] of n) if (k > max) { meilleure = c; max = k }
  return meilleure
}
