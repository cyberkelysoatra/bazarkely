/**
 * Sure / doubt decision for dictated lines (pure, tested).
 *
 * A line is SURE when: confidence >= 0.85, amount > 0, no doubts, category set
 * (expense and income) and accounts resolved (transfer: both).
 * Account missing on some lines while everything else is sure: one account
 * sheet. Anything else: the recap screen, nothing saved before the user taps.
 */
import type { DicteeDecision, DicteeItem } from '../types'

export const SEUIL_CONFIANCE = 0.85

/** Everything except the accounts. */
export function ligneSureHorsCompte(item: DicteeItem): boolean {
  if (!(item.confidence >= SEUIL_CONFIANCE)) return false
  if (!(item.amount > 0) || !Number.isFinite(item.amount)) return false
  if (item.doubts && item.doubts.length > 0) return false
  if (item.type !== 'transfer' && !item.category) return false
  return true
}

/** Accounts resolved against the user's real accounts. */
export function comptesResolus(item: DicteeItem, comptes: Set<string>): boolean {
  const source = item.accountId !== null && comptes.has(item.accountId)
  if (item.type !== 'transfer') return source
  const cible = item.targetAccountId !== null && comptes.has(item.targetAccountId)
  return source && cible && item.accountId !== item.targetAccountId
}

export function ligneSure(item: DicteeItem, comptes: Set<string>): boolean {
  return ligneSureHorsCompte(item) && comptesResolus(item, comptes)
}

export function deciderDictee(items: DicteeItem[], idsComptes: string[]): DicteeDecision {
  if (items.length === 0) return { kind: 'empty' }
  const comptes = new Set(idsComptes)

  if (!items.every(ligneSureHorsCompte)) return { kind: 'review' }

  // The sheet only names ONE account (the source). A transfer missing an
  // account would need two choices: recap.
  const sansCompte: number[] = []
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (comptesResolus(item, comptes)) continue
    if (item.type === 'transfer') return { kind: 'review' }
    // An account id the AI made up is a doubt, not a missing account.
    if (item.accountId !== null) return { kind: 'review' }
    sansCompte.push(i)
  }
  return sansCompte.length > 0 ? { kind: 'account', lineIndexes: sansCompte } : { kind: 'sure' }
}

/** Fields the recap needs before « Tout enregistrer » can save a line. */
export function ligneEnregistrable(item: DicteeItem, comptes: Set<string>): boolean {
  if (!(item.amount > 0) || !Number.isFinite(item.amount)) return false
  if (item.type !== 'transfer' && !item.category) return false
  if (Number.isNaN(new Date(item.date).getTime())) return false
  return comptesResolus(item, comptes)
}
