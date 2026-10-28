/** Plain French labels for the dictation screens and toasts (pure, tested). */
import type { TransactionCategory } from '../../../types'
import type { DicteeItem } from '../types'

export const LIBELLE_CATEGORIE: Record<TransactionCategory, string> = {
  alimentation: 'Alimentation',
  logement: 'Logement',
  transport: 'Transport',
  sante: 'Santé',
  education: 'Éducation',
  communication: 'Communication',
  vetements: 'Vêtements',
  loisirs: 'Loisirs',
  famille: 'Famille',
  solidarite: 'Solidarité',
  autres: 'Autres'
}

export const LIBELLE_TYPE: Record<DicteeItem['type'], string> = {
  expense: 'Dépense',
  income: 'Revenu',
  transfer: 'Transfert'
}

/** 5000 → « 5 000 Ar », 12.5 EUR → « 12,5 € » (plain spaces, readable by screen readers). */
export function formaterMontant(montant: number, devise: 'MGA' | 'EUR'): string {
  const nombre = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: devise === 'EUR' ? 2 : 0 })
    .format(montant)
    .replace(/[\u202f\u00a0]/g, ' ')
  return devise === 'EUR' ? `${nombre} €` : `${nombre} Ar`
}

/** Total per currency, joined: « 8 000 Ar » or « 8 000 Ar + 12 € ». */
export function totalParDevise(items: Pick<DicteeItem, 'amount' | 'currency'>[]): string {
  const totaux = new Map<'MGA' | 'EUR', number>()
  for (const i of items) totaux.set(i.currency, (totaux.get(i.currency) ?? 0) + i.amount)
  return [...totaux].map(([d, m]) => formaterMontant(m, d)).join(' + ')
}

/**
 * « Taxi, 5 000 Ar, Espèces : enregistré » for one line,
 * « 3 transactions enregistrées, 8 000 Ar » for several.
 */
export function messageEnregistre(
  items: Pick<DicteeItem, 'amount' | 'currency' | 'description' | 'accountId'>[],
  nomCompte: (id: string | null) => string
): string {
  if (items.length === 1) {
    const i = items[0]
    return `${i.description}, ${formaterMontant(i.amount, i.currency)}, ${nomCompte(i.accountId)} : enregistré`
  }
  return `${items.length} transactions enregistrées, ${totalParDevise(items)}`
}

export function libelleAttente(n: number): string {
  return n <= 1 ? '1 dictée en attente' : `${n} dictées en attente`
}
