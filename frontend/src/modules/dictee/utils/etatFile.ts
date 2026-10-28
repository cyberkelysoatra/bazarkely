/**
 * Queue state machine (pure, tested). The service applies these transitions to
 * the Dexie record; nothing here touches storage or the network.
 *
 *   waiting ─▶ processing ─▶ needs_review ─▶ done
 *      ▲            │  └────────────────────▶ done   (sure: saved at once)
 *      │            ├─▶ waiting   (401: retried after the next SIGNED_IN)
 *      └────────────┴─▶ failed    (502/503/504/network: attempts + 1, backoff)
 */
import type { DicteeResult, PendingDictation } from '../types'

export const TENTATIVES_MAX = 5
const ATTENTE_BASE_MS = 30_000
export const DUREE_TRACE_MS = 7 * 24 * 60 * 60 * 1000

/** 30 s, 1 min, 2 min, 4 min… before retrying a failed dictation. */
export function delaiAvantNouvelEssai(tentatives: number): number {
  return ATTENTE_BASE_MS * Math.pow(2, Math.max(0, tentatives - 1))
}

export function estEligible(d: PendingDictation, maintenant: number = Date.now()): boolean {
  if (d.status === 'waiting') return true
  if (d.status !== 'failed' || d.attempts >= TENTATIVES_MAX) return false
  return maintenant - new Date(d.updatedAt).getTime() >= delaiAvantNouvelEssai(d.attempts)
}

/** Oldest eligible first: one dictation at a time, in recording order. */
export function prochaineDictee(file: PendingDictation[], maintenant: number = Date.now()): PendingDictation | null {
  return (
    file
      .filter((d) => estEligible(d, maintenant))
      .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))[0] ?? null
  )
}

const iso = (maintenant: number) => new Date(maintenant).toISOString()

export function versTraitement(d: PendingDictation, maintenant: number = Date.now()): PendingDictation {
  return { ...d, status: 'processing', error: undefined, updatedAt: iso(maintenant) }
}

/** 200: the result is kept, the audio is deleted at once. */
export function versAnalysee(d: PendingDictation, result: DicteeResult, maintenant: number = Date.now()): PendingDictation {
  return { ...d, status: 'needs_review', result, audio: undefined, updatedAt: iso(maintenant) }
}

/** 401: kept untouched, waits for the next SIGNED_IN. No attempt counted. */
export function versAttenteSession(d: PendingDictation, maintenant: number = Date.now()): PendingDictation {
  return { ...d, status: 'waiting', error: 'session', updatedAt: iso(maintenant) }
}

/** 502/503/504/413/network: kept, attempts + 1. */
export function versEchec(d: PendingDictation, erreur: string, maintenant: number = Date.now()): PendingDictation {
  return { ...d, status: 'failed', attempts: d.attempts + 1, error: erreur, updatedAt: iso(maintenant) }
}

/** Saved: only id, status and transaction ids remain (no audio, no transcript). */
export function versTerminee(d: PendingDictation, creees: string[], maintenant: number = Date.now()): PendingDictation {
  return {
    id: d.id,
    userId: d.userId,
    recordedAt: d.recordedAt,
    mime: d.mime,
    durationMs: d.durationMs,
    status: 'done',
    attempts: d.attempts,
    transactionIds: d.transactionIds,
    createdTransactionIds: creees,
    updatedAt: iso(maintenant)
  }
}

export function estAPurger(d: PendingDictation, maintenant: number = Date.now()): boolean {
  return d.status === 'done' && maintenant - new Date(d.updatedAt).getTime() > DUREE_TRACE_MS
}

/** Counted in « N dictées en attente ». */
export function estEnAttente(d: PendingDictation): boolean {
  return d.status !== 'done'
}
