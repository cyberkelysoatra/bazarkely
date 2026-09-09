/**
 * Ecriture automatique des transactions issues des SMS Mobile Money.
 *
 * Quand un SMS reconnu ET dont le solde concorde arrive dans `sms_inbox`,
 * la transaction correspondante est creee sans aucune intervention, puis
 * apparait dans la page Transactions comme n'importe quelle autre.
 *
 * Aucune interface : ce service travaille en fond. La seule page du module
 * (`/sms-inbox`) ne fait que MONTRER ce qui n'est pas passe, elle ne pilote rien.
 *
 * Regles structurantes :
 *  - offline-first : jamais `supabase.auth.getUser()` (reseau, plante hors
 *    ligne). Ordre store Zustand -> `getSession()` -> null ;
 *  - `withTimeout()` sur tout `supabase.from()` (les requetes peuvent hanger
 *    sans jamais ni reussir ni echouer) ;
 *  - idempotence : l'identifiant de chaque transaction est DERIVE de la
 *    reference du SMS, jamais tire au hasard. Un timeout n'est pas un echec :
 *    l'ecriture a pu aboutir, donc rejouer doit converger sur la meme ligne ;
 *  - UNE SEULE ligne par operation (v3.76.0) : les frais sont inclus dans le
 *    montant et detailles dans `transfer_fee`, plus jamais en seconde ligne ;
 *  - garde anti-doublon (v3.76.0) : si l'utilisateur a deja saisi l'operation
 *    a la main, rien n'est ecrit et la ligne passe a `doublon_probable`.
 *    Dans le doute on n'ecrit pas : un manque se rattrape, un doublon fausse
 *    les comptes en silence.
 */

import accountService from '../../../services/accountService'
import transactionService from '../../../services/transactionService'
import { db } from '../../../lib/database'
import { supabase, withTimeout } from '../../../lib/supabase'
import { useAppStore } from '../../../stores/appStore'
import type { TransactionCategory } from '../../../types'

import { deciderEcriture, type LigneSms, type OperationAEcrire } from '../utils/decisionEcriture'
import {
  chercherDoublon,
  jourLocal,
  PREFIXE_TRACABILITE_SMS,
  type TransactionCandidate
} from '../utils/doublon'
import { identifiantTransactionSms } from '../utils/identifiantTransaction'
import { libelleOperation, operateurDepuisExpediteur, TYPE_DE_COMPTE } from '../utils/libelles'

const DELAI_SUPABASE_MS = 5000
const UN_JOUR_MS = 24 * 60 * 60 * 1000

/** Categorie par defaut de l'application : aucune categorie n'est inventee. */
const CATEGORIE_PAR_DEFAUT: TransactionCategory = 'autres'

export interface BilanEcriture {
  /** Motif d'un arret avant tout traitement (hors ligne, pas de session...). */
  ignore?: string
  lignesLues: number
  transactionsCreees: number
  operationsEcrites: number
  dejaEcrites: number
  /** Operations abandonnees parce que deja saisies a la main (aucune ecriture). */
  doublons: number
  ecartees: number
  erreurs: string[]
}

/**
 * Utilisateur courant, offline-safe.
 * 1) store Zustand (synchrone, jamais reseau) 2) session Supabase (localStorage)
 * 3) null. `supabase.auth.getUser()` est un fetch HTTP : interdit ici.
 */
async function utilisateurCourant(): Promise<string | null> {
  try {
    const utilisateur = useAppStore.getState().user
    if (utilisateur?.id) return utilisateur.id
  } catch {
    /* store pas encore initialise */
  }
  try {
    const { data } = await supabase.auth.getSession()
    if (data?.session?.user?.id) return data.session.user.id
  } catch (erreur) {
    console.warn('[SMS] Session illisible:', erreur)
  }
  return null
}

/** Table hors du schema type genere : acces non type, comme les autres modules. */
function tableSmsInbox() {
  return (supabase as any).from('sms_inbox')
}

/**
 * Compte de l'operateur, cree au besoin. Une operation Orange Money ne doit
 * JAMAIS etre rattachee a un compte bancaire ou en especes.
 */
async function assurerCompteOperateur(
  userId: string,
  expediteur?: string | null
): Promise<string | null> {
  const operateur = operateurDepuisExpediteur(expediteur)
  const type = TYPE_DE_COMPTE[operateur]

  const comptes = await db.accounts.where('userId').equals(userId).toArray()
  const existant = comptes.find((compte) => compte.type === type)
  if (existant) return existant.id

  console.log(`[SMS] Aucun compte ${operateur}, creation...`)
  const cree = await accountService.createAccount(userId, {
    name: operateur,
    type,
    balance: 0,
    currency: 'MGA',
    isDefault: false
  })
  return cree?.id ?? null
}

/**
 * Transactions deja connues de l'utilisateur autour des operations a ecrire,
 * pour y chercher une saisie manuelle equivalente.
 *
 * Deux sources reunies, volontairement :
 *  - Supabase, qui fait foi et contient tout l'historique ;
 *  - IndexedDB, qui seule contient une saisie faite hors ligne et pas encore
 *    remontee. L'ignorer laisserait passer le doublon qu'on cherche a eviter.
 *
 * La fenetre est bornee aux jours concernes (avec un jour de marge de chaque
 * cote, les fuseaux decalant les bornes) : inutile de rapatrier tout l'historique.
 */
async function transactionsVoisines(
  userId: string,
  operations: OperationAEcrire[]
): Promise<TransactionCandidate[]> {
  const horodatages = operations.map((operation) => new Date(operation.horodatage).getTime())
  const debut = new Date(Math.min(...horodatages) - UN_JOUR_MS).toISOString()
  const fin = new Date(Math.max(...horodatages) + UN_JOUR_MS).toISOString()

  const parIdentifiant = new Map<string, TransactionCandidate>()

  try {
    const { data, error } = (await withTimeout(
      (supabase as any)
        .from('transactions')
        .select('id, amount, date, notes')
        .eq('user_id', userId)
        .gte('date', debut)
        .lte('date', fin),
      DELAI_SUPABASE_MS,
      'smsInbox.transactionsVoisines'
    )) as any
    if (error) throw error
    for (const ligne of (data ?? []) as any[]) {
      parIdentifiant.set(ligne.id, {
        id: ligne.id,
        amount: ligne.amount,
        date: ligne.date,
        notes: ligne.notes
      })
    }
  } catch (erreur) {
    // Lecture impossible : on ne renonce pas pour autant a la garde, IndexedDB
    // prend le relais. La passe suivante refera la lecture serveur.
    console.warn('[SMS] Transactions voisines illisibles cote serveur:', erreur)
  }

  try {
    const locales = await db.transactions.where('userId').equals(userId).toArray()
    for (const transaction of locales) {
      if (parIdentifiant.has(transaction.id)) continue
      parIdentifiant.set(transaction.id, {
        id: transaction.id,
        amount: transaction.amount,
        date: transaction.date,
        notes: transaction.notes
      })
    }
  } catch (erreur) {
    console.warn('[SMS] Transactions locales illisibles:', erreur)
  }

  return [...parIdentifiant.values()]
}

/**
 * Ecrit une operation : UNE SEULE transaction, frais compris.
 *
 * `amount` porte le total reellement debite (montant + frais) et `transfer_fee`
 * conserve le detail des frais, visible dans la fiche de la transaction. Une
 * seconde ligne de frais — ce que faisait la v3.75.0 — affichait deux lignes
 * dans la liste pour une seule operation reelle.
 *
 * `transfer_fee` n'entre dans AUCUN calcul de solde ni de budget (verifie :
 * la colonne est seulement lue et recopiee, jamais soustraite) : la loger la
 * ne compte donc les frais qu'une fois, dans `amount`.
 */
async function ecrireOperation(
  userId: string,
  compteId: string,
  operation: OperationAEcrire
): Promise<{ idPrincipal: string; creees: number }> {
  const idPrincipal = identifiantTransactionSms(userId, operation.reference, 'principal')
  if (await db.transactions.get(idPrincipal)) return { idPrincipal, creees: 0 }

  // Depense = montant NEGATIF (convention de l'application : le solde du compte
  // est mis a jour par `balance + amount`).
  const signe = operation.sens === 'credit' ? 1 : -1
  const total = operation.montant + operation.frais

  await transactionService.createTransaction(
    userId,
    {
      accountId: compteId,
      type: operation.sens === 'credit' ? 'income' : 'expense',
      amount: signe * total,
      description: libelleOperation(operation.modele, operation.tiers),
      category: CATEGORIE_PAR_DEFAUT,
      date: new Date(operation.horodatage),
      transferFee: operation.frais > 0 ? operation.frais : undefined,
      notes: `${PREFIXE_TRACABILITE_SMS}${operation.reference}`,
      originalCurrency: 'MGA',
      originalAmount: total,
      currentOwnerId: userId
    },
    { id: idPrincipal }
  )

  return { idPrincipal, creees: 1 }
}

/**
 * Fait passer une ligne de `sms_inbox` dans son etat final. Un echec n'est
 * jamais bloquant : la ligne reste `a_valider` et la passe suivante la
 * reprendra, sans rien dupliquer (identifiants derives de la reference,
 * et garde anti-doublon rejouee).
 */
async function marquerLigne(
  userId: string,
  reference: string,
  etat: 'auto_ecrit' | 'doublon_probable',
  transactionId: string,
  bilan: BilanEcriture
): Promise<void> {
  try {
    const { error } = (await withTimeout(
      tableSmsInbox()
        .update({ etat, transaction_id: transactionId, traite_le: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('reference', reference),
      DELAI_SUPABASE_MS,
      'smsInbox.marquage'
    )) as any
    if (error) throw error
  } catch (erreur) {
    console.warn(`[SMS] Marquage de ${reference} echoue:`, erreur)
    bilan.erreurs.push(`${reference}: marquage differe`)
  }
}

/** Une passe complete. Sans effet si rien n'est a ecrire, rejouable a volonte. */
export async function executerEcritureAutomatique(): Promise<BilanEcriture> {
  const bilan: BilanEcriture = {
    lignesLues: 0,
    transactionsCreees: 0,
    operationsEcrites: 0,
    dejaEcrites: 0,
    doublons: 0,
    ecartees: 0,
    erreurs: []
  }

  // `sms_inbox` vit cote serveur : hors ligne il n'y a rien a lire, et
  // surtout rien a rattraper. On sort avant toute requete.
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    bilan.ignore = 'hors ligne'
    return bilan
  }

  const userId = await utilisateurCourant()
  if (!userId) {
    bilan.ignore = 'aucune session'
    return bilan
  }

  let lignes: LigneSms[]
  try {
    const { data, error } = (await withTimeout(
      tableSmsInbox().select('reference, texte_brut, etat, expediteur').eq('user_id', userId),
      DELAI_SUPABASE_MS,
      'smsInbox.lecture'
    )) as any
    if (error) throw error
    lignes = ((data ?? []) as any[]).map((ligne) => ({
      reference: ligne.reference,
      texteBrut: ligne.texte_brut,
      etat: ligne.etat,
      expediteur: ligne.expediteur
    }))
  } catch (erreur) {
    // Un echec de lecture n'est jamais visible pour l'utilisateur : la passe
    // suivante reessaiera.
    console.warn('[SMS] Lecture de sms_inbox impossible (non bloquant):', erreur)
    bilan.ignore = 'lecture impossible'
    return bilan
  }

  bilan.lignesLues = lignes.length
  if (lignes.length === 0) return bilan

  // La decision porte sur TOUTES les lignes : une ligne deja ecrite reste un
  // maillon de la chaine des soldes, la retirer romprait la verification de la
  // suivante. Seules les lignes encore `a_valider` sont ensuite ecrites.
  const decision = deciderEcriture(lignes)
  bilan.ecartees = decision.ecartes.length

  const aTraiter = decision.aEcrire.filter((operation) => operation.etat === 'a_valider')
  if (aTraiter.length === 0) return bilan

  // Garde anti-doublon : les transactions deja presentes autour de ces dates,
  // chargees UNE fois pour toute la passe. Une saisie manuelle ne peut justifier
  // qu'une seule operation, d'ou le registre des candidates deja consommees.
  const voisines = await transactionsVoisines(userId, aTraiter)
  const consommees = new Set<string>()

  for (const operation of aTraiter) {
    try {
      const idPrevu = identifiantTransactionSms(userId, operation.reference, 'principal')
      const dejaEcrite = Boolean(await db.transactions.get(idPrevu))

      // Une operation deja ecrite n'est PAS un doublon a elle-meme : on la
      // marque et on passe. La garde ne concerne que ce qui reste a ecrire.
      if (!dejaEcrite) {
        const existante = chercherDoublon(operation, voisines, consommees)
        if (existante) {
          consommees.add(existante.id)
          bilan.doublons++
          console.log(
            `[SMS] ${operation.reference} deja saisi a la main le ${jourLocal(existante.date)} ` +
              `(${existante.amount}) : aucune ecriture`
          )
          await marquerLigne(userId, operation.reference, 'doublon_probable', existante.id, bilan)
          continue
        }
      }

      const compteId = await assurerCompteOperateur(userId, operation.expediteur)
      if (!compteId) {
        bilan.erreurs.push(`${operation.reference}: compte operateur indisponible`)
        continue
      }

      const { idPrincipal, creees } = await ecrireOperation(userId, compteId, operation)
      bilan.transactionsCreees += creees
      if (creees === 0) bilan.dejaEcrites++
      bilan.operationsEcrites++

      // La ligne passe a `auto_ecrit` et pointe vers la transaction ecrite.
      // Un echec ici la laisse en `a_valider` : la passe suivante la reprendra,
      // sans creer de doublon (identifiants derives de la reference).
      await marquerLigne(userId, operation.reference, 'auto_ecrit', idPrincipal, bilan)
    } catch (erreur) {
      console.error(`[SMS] Ecriture de ${operation.reference} echouee:`, erreur)
      bilan.erreurs.push(`${operation.reference}: ${(erreur as Error)?.message ?? 'erreur'}`)
    }
  }

  console.log(
    `[SMS] ${bilan.transactionsCreees} transaction(s) creee(s) pour ${bilan.operationsEcrites} operation(s), ` +
      `${bilan.doublons} deja saisie(s) a la main, ${bilan.ecartees} SMS ecarte(s)`
  )
  return bilan
}

let enCours = false
let demarre = false

/** Une seule passe a la fois : deux passes concurrentes reliraient la meme file. */
async function lancerPasse(): Promise<void> {
  if (enCours) return
  enCours = true
  try {
    await executerEcritureAutomatique()
  } catch (erreur) {
    console.error('[SMS] Passe automatique en echec (non bloquant):', erreur)
  } finally {
    enCours = false
  }
}

/**
 * Demarre le travail de fond. Appele une fois au demarrage de l'application.
 * N'ecrit AUCUNE interface et ne navigue jamais : ne peut pas perturber le flux
 * OAuth ni l'affichage.
 */
export function demarrerEcritureAutomatiqueSms(): void {
  if (demarre || typeof window === 'undefined') return
  demarre = true

  // Premiere passe differee : laisse le demarrage et le retour OAuth se terminer.
  window.setTimeout(() => void lancerPasse(), 8000)

  // Nouvelle connexion : la file de l'utilisateur peut deja contenir des SMS.
  // Seul SIGNED_IN est ecoute (INITIAL_SESSION reste l'affaire de App.tsx).
  supabase.auth.onAuthStateChange((evenement) => {
    if (evenement === 'SIGNED_IN') window.setTimeout(() => void lancerPasse(), 3000)
  })

  // Retour du reseau : ce qui n'a pas pu etre lu hors ligne le devient.
  window.addEventListener('online', () => window.setTimeout(() => void lancerPasse(), 2000))
}
