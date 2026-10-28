/**
 * Doubts of a dictated line (pure, tested).
 *
 * Since DICTEE-CC-02 the server returns `{ kind, text }`. Results stored by
 * phase 1 in `pendingDictations` hold plain strings: they are still read, and
 * a string that clearly talks only about the account counts as `compte`.
 */
import type { DicteeDoubt, DicteeDoubtKind, DicteeItem } from '../types'

const TYPES: DicteeDoubtKind[] = ['compte', 'montant', 'categorie', 'type', 'date', 'autre']

const PARLE_DU_COMPTE = /\bcomptes?\b|esp[eè]ces|orange\s*money|mvola|airtel|banque/i
const PARLE_D_AUTRE_CHOSE = /montant|francs|fmg|cat[eé]gorie|\bdate\b|\bjour\b|hier|terme|\bmot\b|entendu|\btype\b/i

/** Old phase 1 string → kind. Only an account-only sentence becomes `compte`. */
export function typeDoutTexte(texte: string): DicteeDoubtKind {
  return PARLE_DU_COMPTE.test(texte) && !PARLE_D_AUTRE_CHOSE.test(texte) ? 'compte' : 'autre'
}

export function normaliserDoute(brut: unknown): DicteeDoubt | null {
  if (typeof brut === 'string') {
    const text = brut.trim()
    return text ? { kind: typeDoutTexte(text), text } : null
  }
  if (brut && typeof brut === 'object') {
    const o = brut as { kind?: unknown; text?: unknown }
    const text = typeof o.text === 'string' ? o.text.trim() : ''
    if (!text) return null
    const kind = TYPES.includes(o.kind as DicteeDoubtKind) ? (o.kind as DicteeDoubtKind) : 'autre'
    return { kind, text }
  }
  return null
}

/** Every doubt of a line, whatever the stored format. */
export function doutesDe(item: Pick<DicteeItem, 'doubts'>): DicteeDoubt[] {
  if (!Array.isArray(item.doubts)) return []
  const sortie: DicteeDoubt[] = []
  for (const d of item.doubts) {
    const n = normaliserDoute(d)
    if (n) sortie.push(n)
  }
  return sortie
}

/** Doubts other than the account: these alone send the line to the recap. */
export function doutesHorsCompte(item: Pick<DicteeItem, 'doubts'>): DicteeDoubt[] {
  return doutesDe(item).filter((d) => d.kind !== 'compte')
}
