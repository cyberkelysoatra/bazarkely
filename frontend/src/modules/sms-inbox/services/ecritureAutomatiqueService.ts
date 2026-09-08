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
 *    l'ecriture a pu aboutir, donc rejouer doit converger sur la meme ligne.
 */

import accountService from '../../../services/accountService'
import transactionService from '../../../services/transactionService'
import { db } from '../../../lib/database'
import { supabase, withTimeout } from '../../../lib/supabase'
import { useAppStore } from '../../../stores/appStore'
import type { TransactionCategory } from '../../../types'

import { deciderEcriture, type LigneSms, type OperationAEcrire } from '../utils/decisionEcriture'
import { identifiantTransactionSms } from '../utils/identifiantTransaction'
import {
  libelleFrais,
  libelleOperation,
  operateurDepuisExpediteur,
  TYPE_DE_COMPTE
} from '../utils/libelles'

const DELAI_SUPABASE_MS = 5000

/** Categorie par defaut de l'application : aucune categorie n'est inventee. */
const CATEGORIE_PAR_DEFAUT: TransactionCategory = 'autres'

export interface BilanEcriture {
  /** Motif d'un arret avant tout traitement (hors ligne, pas de session...). */
  ignore?: string
  lignesLues: number
  transactionsCreees: number
  operationsEcrites: number
  dejaEcrites: number
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
 * Ecrit une operation : le mouvement principal, et — si des frais existent —
 * une SECONDE transaction distincte. Jamais fondus dans le montant principal,
 * sinon les comptes ne tomberaient jamais juste.
 *
 * Retourne l'identifiant de la transaction principale et le nombre de lignes
 * reellement creees (0 si tout etait deja ecrit : rejeu sans doublon).
 */
async function ecrireOperation(
  userId: string,
  compteId: string,
  operation: OperationAEcrire
): Promise<{ idPrincipal: string; creees: number }> {
  const idPrincipal = identifiantTransactionSms(userId, operation.reference, 'principal')
  const date = new Date(operation.horodatage)
  const tracabilite = `SMS ${operation.reference}`
  let creees = 0

  // Depense = montant NEGATIF (convention de l'application : le solde du compte
  // est mis a jour par `balance + amount`).
  const signe = operation.sens === 'credit' ? 1 : -1

  if (!(await db.transactions.get(idPrincipal))) {
    await transactionService.createTransaction(
      userId,
      {
        accountId: compteId,
        type: operation.sens === 'credit' ? 'income' : 'expense',
        amount: signe * operation.montant,
        description: libelleOperation(operation.modele, operation.tiers),
        category: CATEGORIE_PAR_DEFAUT,
        date,
        notes: tracabilite,
        originalCurrency: 'MGA',
        originalAmount: operation.montant,
        currentOwnerId: userId
      },
      { id: idPrincipal }
    )
    creees++
  }

  if (operation.frais > 0) {
    const idFrais = identifiantTransactionSms(userId, operation.reference, 'frais')
    if (!(await db.transactions.get(idFrais))) {
      await transactionService.createTransaction(
        userId,
        {
          accountId: compteId,
          type: 'expense',
          amount: -operation.frais,
          description: libelleFrais(operation.modele, operation.tiers),
          category: CATEGORIE_PAR_DEFAUT,
          date,
          notes: tracabilite,
          originalCurrency: 'MGA',
          originalAmount: operation.frais,
          currentOwnerId: userId
        },
        { id: idFrais }
      )
      creees++
    }
  }

  return { idPrincipal, creees }
}

/** Une passe complete. Sans effet si rien n'est a ecrire, rejouable a volonte. */
export async function executerEcritureAutomatique(): Promise<BilanEcriture> {
  const bilan: BilanEcriture = {
    lignesLues: 0,
    transactionsCreees: 0,
    operationsEcrites: 0,
    dejaEcrites: 0,
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

  for (const operation of aTraiter) {
    try {
      const compteId = await assurerCompteOperateur(userId, operation.expediteur)
      if (!compteId) {
        bilan.erreurs.push(`${operation.reference}: compte operateur indisponible`)
        continue
      }

      const { idPrincipal, creees } = await ecrireOperation(userId, compteId, operation)
      bilan.transactionsCreees += creees
      if (creees === 0) bilan.dejaEcrites++
      bilan.operationsEcrites++

      // La ligne passe a `auto_ecrit` et pointe vers la transaction principale.
      // Un echec ici la laisse en `a_valider` : la passe suivante la reprendra,
      // sans creer de doublon (identifiants derives de la reference).
      try {
        const { error } = (await withTimeout(
          tableSmsInbox()
            .update({
              etat: 'auto_ecrit',
              transaction_id: idPrincipal,
              traite_le: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('reference', operation.reference),
          DELAI_SUPABASE_MS,
          'smsInbox.marquage'
        )) as any
        if (error) throw error
      } catch (erreurMarquage) {
        console.warn(`[SMS] Marquage de ${operation.reference} echoue:`, erreurMarquage)
        bilan.erreurs.push(`${operation.reference}: marquage differe`)
      }
    } catch (erreur) {
      console.error(`[SMS] Ecriture de ${operation.reference} echouee:`, erreur)
      bilan.erreurs.push(`${operation.reference}: ${(erreur as Error)?.message ?? 'erreur'}`)
    }
  }

  console.log(
    `[SMS] ${bilan.transactionsCreees} transaction(s) creee(s) pour ${bilan.operationsEcrites} operation(s), ${bilan.ecartees} SMS ecarte(s)`
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
