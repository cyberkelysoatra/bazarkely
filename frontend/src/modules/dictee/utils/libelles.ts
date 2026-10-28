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

/**
 * Why a dictation failed, in plain French (DICTEE-CC-02). `code` is what the
 * queue stored: `413_audio_too_large`, `503_ai_not_configured`, `reseau`…
 */
export function raisonEchec(code: string | undefined): string {
  const c = code ?? ''
  if (c === 'session' || c.startsWith('401')) return 'Session expirée, reconnecte-toi'
  if (c.startsWith('413')) return 'Enregistrement trop long'
  if (c === 'format_refuse' || c === 'conversion_wav' || c.startsWith('415')) return "Format d'enregistrement non pris en charge"
  if (c === 'audio_absent') return 'Enregistrement introuvable sur ce téléphone'
  return 'Service de compréhension indisponible'
}

/** Short status line of a card in the list. */
export function libelleStatut(statut: 'waiting' | 'processing' | 'needs_review' | 'failed', error?: string): string {
  if (statut === 'processing') return 'En cours…'
  if (statut === 'needs_review') return 'À vérifier'
  if (statut === 'failed') return raisonEchec(error)
  return error === 'session' ? 'Session expirée, reconnecte-toi' : 'En attente du réseau'
}

/** « 1 essai », « 3 essais ». */
export function libelleEssais(n: number): string {
  return n <= 1 ? `${n} essai` : `${n} essais`
}

export function libelleAttente(n: number): string {
  return n <= 1 ? '1 dictée en attente' : `${n} dictées en attente`
}
