/**
 * Parseur des SMS Orange Money (Madagascar).
 *
 * Aucune dependance. Utilise aussi bien cote navigateur (module sms-inbox)
 * que cote serveur (Edge Function `ingest-sms`), ou une copie strictement
 * identique de ce fichier vit dans
 * `supabase/functions/ingest-sms/parseurOrangeMoney.ts`.
 */

export type ModeleSms =
  | 'CI_BANQUE'
  | 'CI_DEPOT'
  | 'PP_ENVOI'
  | 'PP_NOMME'
  | 'CO_RETRAIT'
  | 'MP_MARCHAND'
  | 'MP_OFFRE'
  | 'ECHEC'

export interface SmsAnalyse {
  modele: ModeleSms
  sens: 'credit' | 'debit' | 'aucun'
  montant: number | null
  frais: number
  solde: number | null
  tiers: string
  reference: string
  horodatage: string | null // ISO 8601
  reconnu: true
}

export type ResultatAnalyse = SmsAnalyse | { reconnu: false; raison: string }

/** Decalage horaire de Madagascar (EAT, sans heure d'ete). */
const FUSEAU_MADAGASCAR = '+03:00'

/**
 * Marques diacritiques combinantes, retirees apres normalize('NFD').
 * Ecrit en echappements \u volontairement : ce fichier est recopie tel quel
 * dans l'Edge Function, et des caracteres combinants bruts ne survivent pas
 * a un transfert mal encode (ils deviendraient de la bouillie, et le retrait
 * des accents cesserait silencieusement de fonctionner).
 */
const DIACRITIQUES = /[\u0300-\u036f]/g

/**
 * Normalisation obligatoire avant toute comparaison :
 * accents retires, suites d'espaces reduites a un espace unique.
 * `bas` est la variante minuscule ; `brut` conserve la casse d'origine pour
 * pouvoir en extraire des libelles de tiers lisibles. Les deux chaines sont
 * issues de la meme normalisation, donc parfaitement alignees.
 */
function normaliser(texte: string): { brut: string; bas: string } {
  const sansAccents = texte.normalize('NFD').replace(DIACRITIQUES, '')
  const brut = sansAccents.replace(/\s+/g, ' ').trim()
  return { brut, bas: brut.toLowerCase() }
}

/** Montant : espaces retires, partie decimale coupee (200000.00 -> 200000). */
function versEntier(valeur: string): number {
  return parseInt(valeur.replace(/\s/g, '').split('.')[0], 10)
}

/** Reference horodatee Orange Money : CI260730.1122.D89206 */
const REF_HORODATEE = String.raw`(?:ci|pp|co|mp)\d{6}\.\d{4}\.[a-z0-9]+`
/** Montant, avec ou sans partie decimale. */
const MONTANT = String.raw`\d+(?:\.\d+)?`

/**
 * Decode l'horodatage porte par une reference (CI|PP|CO|MP)AAMMJJ.HHMM.suffixe.
 * Renvoie null si la reference ne porte pas de date (PP_NOMME, ECHEC).
 */
export function horodatageDepuisReference(reference: string): string | null {
  const m = /^(?:CI|PP|CO|MP)(\d{2})(\d{2})(\d{2})\.(\d{2})(\d{2})\./i.exec(reference)
  if (!m) return null
  const [, aa, mm, jj, hh, mi] = m
  return `20${aa}-${mm}-${jj}T${hh}:${mi}:00${FUSEAU_MADAGASCAR}`
}

interface Modele {
  modele: ModeleSms
  motif: RegExp
  /** Indices des groupes captures (1-based), 0 = champ absent du SMS. */
  montant: number
  frais: number
  solde: number
  tiers: number
  reference: number
  /** Groupe du champ `Date :` separe, pour les references sans date. */
  date?: number
  sens: 'credit' | 'debit' | 'aucun'
}

const MODELES: Modele[] = [
  {
    // Votre transfert de 200000.00 AR sur votre compte Orange Money depuis
    // votre compte BMOI Compte  vue M SOATRA est reussi. ... CI260730.1122.D89206.
    // Montant a decimales, reference SANS etiquette `Trans Id`.
    modele: 'CI_BANQUE',
    sens: 'credit',
    motif: new RegExp(
      String.raw`^votre transfert de (${MONTANT}) ar sur votre compte orange money depuis votre compte (.+?) est reussi\. frais\s*:\s*(${MONTANT}) ar\. votre nouveau solde orange money\s*:\s*(${MONTANT}) ar\. (${REF_HORODATEE})\s*\.`,
      'i'
    ),
    montant: 1, tiers: 2, frais: 3, solde: 4, reference: 5
  },
  {
    // Votre depot de 400000 Ar par le 0324813191 est reussi.
    // Nouveau solde: 400243 Ar .Trans Id :CI260808.1220.D56174.
    // AUCUN champ Frais -> force a 0.
    modele: 'CI_DEPOT',
    sens: 'credit',
    motif: new RegExp(
      String.raw`^votre depot de (${MONTANT}) ar par le (\S+) est reussi\. nouveau solde\s*:\s*(${MONTANT}) ar\s*\.\s*trans id\s*:\s*(${REF_HORODATEE})\s*\.`,
      'i'
    ),
    montant: 1, tiers: 2, frais: 0, solde: 3, reference: 4
  },
  {
    // Votre transfert de 160000 AR vers Faraniaina Elina (0345607200) : TNR/NOS
    // est reussi. ... Trans Id : a7924941. Date : 2026-08-31 13:00:24.
    // Reference SANS date -> le champ `Date :` fait foi.
    modele: 'PP_NOMME',
    sens: 'debit',
    motif: new RegExp(
      String.raw`^votre transfert de (${MONTANT}) ar vers (.+?) est reussi\. frais\s*:\s*(${MONTANT}) ar\. votre solde est de (${MONTANT}) ar\. trans id\s*:\s*([a-z0-9]+)\s*\.\s*date\s*:\s*(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})`,
      'i'
    ),
    montant: 1, tiers: 2, frais: 3, solde: 4, reference: 5, date: 6
  },
  {
    // Votre transfert de 61900 Ar vers 0326528126 est reussi. ...
    // Trans Id: PP260730.0949.D63236.
    modele: 'PP_ENVOI',
    sens: 'debit',
    motif: new RegExp(
      String.raw`^votre transfert de (${MONTANT}) ar vers (\S+) est reussi\. frais\s*:\s*(${MONTANT}) ar\. nouveau solde\s*:\s*(${MONTANT}) ar\. trans id\s*:\s*(${REF_HORODATEE})\s*\.`,
      'i'
    ),
    montant: 1, tiers: 2, frais: 3, solde: 4, reference: 5
  },
  {
    // Le retrait de 60000 Ar sur votre compte aupres du 0327376371 est reussi.
    // Les deux orthographes du corpus (avec ou sans accent grave sur le e)
    // sont ramenees a la meme forme par la normalisation.
    modele: 'CO_RETRAIT',
    sens: 'debit',
    motif: new RegExp(
      String.raw`^le retrait de (${MONTANT}) ar sur votre compte aupres du (\S+) est reussi\. frais\s*:\s*(${MONTANT}) ar\. nouveau solde\s*:\s*(${MONTANT}) ar\. trans id\s*:\s*(${REF_HORODATEE})\s*\.`,
      'i'
    ),
    montant: 1, tiers: 2, frais: 3, solde: 4, reference: 5
  },
  {
    // Votre achat d'offre Orange Be connect 5Go de 30000Ar est reussi.
    // Nouveau solde : 176418Ar. Trans id: MP260903.1159.D16200.
    // AUCUN champ Frais -> force a 0. Montant colle a `Ar`, `Trans id` minuscule.
    modele: 'MP_OFFRE',
    sens: 'debit',
    motif: new RegExp(
      String.raw`^votre achat d'offre (.+?) de (${MONTANT})\s*ar est reussi\. nouveau solde\s*:\s*(${MONTANT})\s*ar\. trans id\s*:\s*(${REF_HORODATEE})\s*\.`,
      'i'
    ),
    montant: 2, tiers: 1, frais: 0, solde: 3, reference: 4
  },
  {
    // Votre paiement de 2000 Ar aupres de REVE DOR est reussi. ...
    // Trans Id: MP260730.1242.D23906 . (espace avant le point final)
    modele: 'MP_MARCHAND',
    sens: 'debit',
    motif: new RegExp(
      String.raw`^votre paiement de (${MONTANT}) ar aupres de (.+?) est reussi\. frais\s*:\s*(${MONTANT}) ar\. nouveau solde\s*:\s*(${MONTANT}) ar\. trans id\s*:\s*(${REF_HORODATEE})\s*\.`,
      'i'
    ),
    montant: 1, tiers: 2, frais: 3, solde: 4, reference: 5
  },
  {
    // Votre transaction a echoue. ... OR260903ZQO043
    // Ni montant, ni solde, ni frais.
    modele: 'ECHEC',
    sens: 'aucun',
    motif: /^votre transaction a echoue\..*?\b([a-z]{2}\d{6}[a-z0-9]+)\s*\.?$/i,
    montant: 0, tiers: 0, frais: 0, solde: 0, reference: 1
  }
]

export function analyserSms(texte: string): ResultatAnalyse {
  if (typeof texte !== 'string' || texte.trim() === '') {
    return { reconnu: false, raison: 'texte vide' }
  }

  const { brut, bas } = normaliser(texte)

  for (const modele of MODELES) {
    // Detection sur la variante minuscule (regle de normalisation),
    // extraction sur la variante qui conserve la casse.
    if (!modele.motif.test(bas)) continue
    const m = modele.motif.exec(brut)
    if (!m) continue

    const reference = m[modele.reference]
    const horodatage =
      modele.date !== undefined
        ? `${m[modele.date]}T${m[modele.date + 1]}${FUSEAU_MADAGASCAR}`
        : horodatageDepuisReference(reference)

    return {
      modele: modele.modele,
      sens: modele.sens,
      montant: modele.montant ? versEntier(m[modele.montant]) : null,
      frais: modele.frais ? versEntier(m[modele.frais]) : 0,
      solde: modele.solde ? versEntier(m[modele.solde]) : null,
      tiers: modele.tiers ? m[modele.tiers].trim() : '',
      reference,
      horodatage,
      reconnu: true
    }
  }

  return { reconnu: false, raison: 'aucun modele ne correspond' }
}
