/**
 * Traduction d'un SMS en libelles et en rattachement de compte.
 * Pur, sans dependance : consomme par le service d'ecriture et par les tests.
 */

import type { ModeleSms } from './parseurOrangeMoney'

export type Operateur = 'Orange Money' | 'MVola' | 'Airtel Money'

/** Type de compte BazarKELY correspondant a chaque operateur. */
export const TYPE_DE_COMPTE: Record<Operateur, 'orange_money' | 'mvola' | 'airtel_money'> = {
  'Orange Money': 'orange_money',
  MVola: 'mvola',
  'Airtel Money': 'airtel_money'
}

/**
 * Operateur d'une operation. Le parseur ne decode aujourd'hui que les SMS
 * Orange Money (references CI/PP/CO/MP), qui reste donc le repli : une
 * operation ne doit JAMAIS atterrir sur un compte bancaire ou en especes.
 */
export function operateurDepuisExpediteur(expediteur?: string | null): Operateur {
  const bas = (expediteur ?? '').toLowerCase()
  if (bas.includes('mvola')) return 'MVola'
  if (bas.includes('airtel')) return 'Airtel Money'
  return 'Orange Money'
}

/** Libelle lisible de l'operation principale, affiche dans la page Transactions. */
export function libelleOperation(modele: ModeleSms, tiers: string): string {
  const complement = tiers.trim()
  switch (modele) {
    case 'CI_BANQUE':
      return complement ? `Transfert depuis ${complement}` : 'Transfert bancaire recu'
    case 'CI_DEPOT':
      return complement ? `Depot par ${complement}` : 'Depot'
    case 'PP_ENVOI':
    case 'PP_NOMME':
      return complement ? `Transfert vers ${complement}` : 'Transfert envoye'
    case 'CO_RETRAIT':
      return complement ? `Retrait aupres du ${complement}` : 'Retrait'
    case 'MP_MARCHAND':
      return complement ? `Paiement ${complement}` : 'Paiement marchand'
    case 'MP_OFFRE':
      return complement ? `Achat offre ${complement}` : 'Achat offre'
    default:
      return 'Operation Mobile Money'
  }
}

/** Libelle de la ligne de frais, toujours distincte du mouvement principal. */
export function libelleFrais(modele: ModeleSms, tiers: string): string {
  return `Frais - ${libelleOperation(modele, tiers)}`
}
