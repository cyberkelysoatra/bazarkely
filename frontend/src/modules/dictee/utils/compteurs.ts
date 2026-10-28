/** Badge counts of the dictation queue (pure, tested). DICTEE-CC-02. */
import type { DicteeStatus } from '../types'

export interface ComptesDictees {
  waiting: number
  processing: number
  needs_review: number
  failed: number
  /** waiting + processing + needs_review + failed (the badge number). */
  total: number
  /** needs_review + failed: the badge turns amber. */
  aVerifier: number
}

export const COMPTES_VIDES: ComptesDictees = { waiting: 0, processing: 0, needs_review: 0, failed: 0, total: 0, aVerifier: 0 }

/** Pure, tested. Only the given user's dictations; `done` is never counted. */
export function compterParStatut(dictees: { userId: string; status: DicteeStatus }[], userId: string | null | undefined): ComptesDictees {
  const c = { ...COMPTES_VIDES }
  if (!userId) return c
  for (const d of dictees) {
    if (d.userId !== userId || d.status === 'done') continue
    c[d.status] += 1
  }
  c.total = c.waiting + c.processing + c.needs_review + c.failed
  c.aVerifier = c.needs_review + c.failed
  return c
}

/** « 2 dictées en attente, dont 1 à vérifier » (badge `aria-label`). */
export function libelleBadge(c: Pick<ComptesDictees, 'total' | 'aVerifier'>): string {
  const base = c.total <= 1 ? `${c.total} dictée en attente` : `${c.total} dictées en attente`
  return c.aVerifier > 0 ? `${base}, dont ${c.aVerifier} à vérifier` : base
}
