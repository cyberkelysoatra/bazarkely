/**
 * Decision d'ecriture : quels SMS deviennent des transactions, et lesquels
 * sont ecartes — avec le motif.
 *
 * Fonction PURE, sans base ni reseau : c'est elle qui porte la regle metier,
 * elle est donc rejouable telle quelle contre le corpus dans les tests, et
 * consommee a l'identique par le service d'ecriture et par la page /sms-inbox
 * (le motif affiche est exactement celui qui a bloque l'ecriture).
 *
 * Deux conditions, sans tolerance ni arrondi :
 *   1. le modele est reconnu et different de ECHEC ;
 *   2. le solde concorde : solde de la ligne precedente +/- (montant + frais)
 *      egale EXACTEMENT le solde annonce par le SMS.
 *
 * Exception a la condition 2 : la PREMIERE ligne de la chaine n'a aucun
 * predecesseur. Sa concordance est indeterminee, pas fausse — elle ancre la
 * chaine et est ecrite (v3.76.0).
 */

import { analyserSms, type ModeleSms } from './parseurOrangeMoney'

export type MotifEcart = 'non reconnu' | 'solde non concordant'

/** Une ligne de `sms_inbox`, reduite a ce dont la decision a besoin. */
export interface LigneSms {
  reference: string
  texteBrut: string
  /** Etat en base. Une ligne deja ecrite reste dans la chaine mais n'est pas rejouee. */
  etat?: string
  /** Expediteur brut du SMS, sert a rattacher l'operation au bon operateur. */
  expediteur?: string | null
}

export interface OperationAEcrire {
  reference: string
  texteBrut: string
  etat?: string
  expediteur?: string | null
  modele: ModeleSms
  sens: 'credit' | 'debit'
  montant: number
  frais: number
  solde: number
  tiers: string
  /** ISO 8601, fuseau de Madagascar. */
  horodatage: string
}

export interface SmsEcarte {
  reference: string
  texteBrut: string
  motif: MotifEcart
  /** Precision lisible : ce qui a exactement bloque. */
  detail: string
}

export interface DecisionEcriture {
  aEcrire: OperationAEcrire[]
  ecartes: SmsEcarte[]
}

/** Le solde annonce inclut deja les frais (cf. controleChaine). */
function variation(operation: OperationAEcrire): number {
  return (operation.montant + operation.frais) * (operation.sens === 'credit' ? 1 : -1)
}

/**
 * Tri chronologique par l'horodatage, jamais par ordre d'arrivee : l'operateur
 * delivre les SMS dans le desordre et un tri par arrivee casse la chaine.
 * Egalite d'horodatage -> ordre stable par reference.
 */
function trierChronologiquement(operations: OperationAEcrire[]): OperationAEcrire[] {
  return [...operations].sort((a, b) => {
    if (a.horodatage !== b.horodatage) return a.horodatage < b.horodatage ? -1 : 1
    return a.reference < b.reference ? -1 : a.reference > b.reference ? 1 : 0
  })
}

/**
 * @param lignes TOUTES les lignes connues de l'utilisateur, pas seulement
 *        celles a valider : une ligne deja ecrite reste un maillon de la
 *        chaine des soldes, la retirer romprait la verification de la suivante.
 */
export function deciderEcriture(lignes: LigneSms[]): DecisionEcriture {
  const ecartes: SmsEcarte[] = []
  const reconnues: OperationAEcrire[] = []

  for (const ligne of lignes) {
    const analyse = analyserSms(ligne.texteBrut)

    if (!analyse.reconnu) {
      ecartes.push({
        reference: ligne.reference,
        texteBrut: ligne.texteBrut,
        motif: 'non reconnu',
        detail: analyse.raison
      })
      continue
    }

    if (analyse.modele === 'ECHEC') {
      ecartes.push({
        reference: ligne.reference,
        texteBrut: ligne.texteBrut,
        motif: 'non reconnu',
        detail: 'transaction echouee cote operateur, aucun mouvement'
      })
      continue
    }

    // Un modele reconnu porte toujours montant, solde et horodatage ; le test
    // reste pour ne jamais ecrire une operation dont un champ manquerait.
    if (
      analyse.sens === 'aucun' ||
      analyse.montant === null ||
      analyse.solde === null ||
      analyse.horodatage === null
    ) {
      ecartes.push({
        reference: ligne.reference,
        texteBrut: ligne.texteBrut,
        motif: 'non reconnu',
        detail: 'champ obligatoire absent (montant, solde ou date)'
      })
      continue
    }

    reconnues.push({
      reference: ligne.reference,
      texteBrut: ligne.texteBrut,
      etat: ligne.etat,
      expediteur: ligne.expediteur,
      modele: analyse.modele,
      sens: analyse.sens,
      montant: analyse.montant,
      frais: analyse.frais,
      solde: analyse.solde,
      tiers: analyse.tiers,
      horodatage: analyse.horodatage
    })
  }

  const chaine = trierChronologiquement(reconnues)
  const aEcrire: OperationAEcrire[] = []

  for (let i = 0; i < chaine.length; i++) {
    const operation = chaine[i]

    // Le tout premier maillon n'a aucune ligne precedente : la concordance est
    // INDETERMINEE, pas fausse. L'ecarter reviendrait a perdre une operation
    // reelle a chaque rattrapage d'historique. Il ancre donc la chaine : il est
    // ecrit, et son solde annonce sert de reference a la ligne suivante.
    if (i === 0) {
      aEcrire.push(operation)
      continue
    }

    // On repart du solde ANNONCE par la ligne precedente : une rupture isolee
    // ne contamine pas toute la suite de la chaine.
    const soldeAttendu = chaine[i - 1].solde + variation(operation)

    if (soldeAttendu !== operation.solde) {
      ecartes.push({
        reference: operation.reference,
        texteBrut: operation.texteBrut,
        motif: 'solde non concordant',
        detail: `solde attendu ${soldeAttendu}, annonce ${operation.solde} (ecart ${operation.solde - soldeAttendu})`
      })
      continue
    }

    aEcrire.push(operation)
  }

  return { aEcrire, ecartes }
}
