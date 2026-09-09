/**
 * Detection d'un doublon AVANT ecriture : l'utilisateur a-t-il deja saisi
 * cette operation a la main ?
 *
 * Fonction PURE, sans base ni reseau : la regle est donc rejouable telle
 * quelle dans les tests, et identique a celle qui tourne en production.
 *
 * Pourquoi c'est necessaire : entre le 29/07 et le 06/09 2026, six operations
 * saisies a la main par JOEL ont ete recreees par l'ecriture automatique des
 * SMS — les soldes sont devenus faux. Le SMS et la saisie manuelle decrivent
 * la meme depense, mais rien ne les reliait.
 *
 * Trois conditions, toutes obligatoires :
 *   1. meme jour (jour calendaire local, celui qu'affiche l'application) ;
 *   2. montant egal au montant SEUL, ou au montant PLUS les frais — la saisie
 *      manuelle inclut souvent les frais sans les distinguer (« Karate 3mois
 *      92 400 » = 91 900 + 500) ;
 *   3. la transaction candidate n'est pas elle-meme issue d'un SMS.
 *
 * Dans le doute on n'ecrit pas : un manque se rattrape a la main, un doublon
 * fausse les comptes en silence. La comparaison porte donc sur la VALEUR
 * ABSOLUE du montant, sans exiger que le sens corresponde.
 */

/** Une transaction deja presente, reduite a ce dont la comparaison a besoin. */
export interface TransactionCandidate {
  id: string
  amount: number
  /** Date de la transaction, telle que stockee (Date ou ISO). */
  date: Date | string
  /** Notes libres. Une transaction issue d'un SMS porte `SMS <reference>`. */
  notes?: string | null
}

/** L'operation que le SMS s'apprete a ecrire. */
export interface OperationCandidate {
  /** ISO 8601 avec fuseau, issu de la reference du SMS. */
  horodatage: string
  montant: number
  frais: number
}

/**
 * Marque de tracabilite posee sur toute transaction ecrite depuis un SMS.
 * Doit rester identique a celle du service d'ecriture.
 */
export const PREFIXE_TRACABILITE_SMS = 'SMS '

/** Une transaction issue d'un SMS ne peut jamais servir de preuve de doublon. */
export function estIssueDunSms(transaction: TransactionCandidate): boolean {
  return (transaction.notes ?? '').startsWith(PREFIXE_TRACABILITE_SMS)
}

/**
 * Jour calendaire LOCAL au format AAAA-MM-JJ.
 *
 * Local et non UTC, volontairement : c'est ce que l'application affiche et ce
 * sur quoi l'utilisateur raisonne. A Madagascar (UTC+3) une saisie du 05/09
 * est stockee `2026-09-04T21:00:00Z` — la comparer en UTC la placerait au 04/09
 * et le doublon passerait entre les mailles.
 */
export function jourLocal(date: Date | string): string {
  const valeur = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(valeur.getTime())) return ''
  const mois = String(valeur.getMonth() + 1).padStart(2, '0')
  const jour = String(valeur.getDate()).padStart(2, '0')
  return `${valeur.getFullYear()}-${mois}-${jour}`
}

/**
 * Cherche, parmi les transactions deja connues, celle qui decrit deja cette
 * operation. Retourne `null` si l'operation est inedite.
 *
 * @param dejaConsommees identifiants deja apparies a une autre operation de la
 *        meme passe : une saisie manuelle ne peut justifier qu'un seul SMS,
 *        sinon deux operations jumelles du meme jour s'annuleraient toutes deux.
 */
export function chercherDoublon(
  operation: OperationCandidate,
  candidates: TransactionCandidate[],
  dejaConsommees: Set<string> = new Set()
): TransactionCandidate | null {
  const jour = jourLocal(operation.horodatage)
  if (jour === '') return null

  const montantSeul = operation.montant
  const montantAvecFrais = operation.montant + operation.frais

  for (const candidate of candidates) {
    if (dejaConsommees.has(candidate.id)) continue
    if (estIssueDunSms(candidate)) continue
    if (jourLocal(candidate.date) !== jour) continue

    const montant = Math.abs(candidate.amount)
    if (montant === montantSeul || montant === montantAvecFrais) return candidate
  }

  return null
}
