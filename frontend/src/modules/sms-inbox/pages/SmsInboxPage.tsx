/**
 * Page brute des SMS NON ecrits, a l'adresse /sms-inbox.
 *
 * Elle n'est liee depuis NULLE PART : aucun bouton, aucune entree de menu,
 * aucune pastille. On y accede en tapant l'adresse. Elle sert uniquement a
 * voir ce qui n'est pas passe, et ne pilote rien.
 *
 * Mise en page volontairement minimale : une liste, rien de plus. Sa place et
 * son apparence definitives seront decidees plus tard.
 *
 * Le motif affiche vient de la MEME fonction de decision que l'ecriture
 * automatique : ce qui est montre ici est exactement ce qui a bloque.
 */

import { useEffect, useState } from 'react'

import { supabase, withTimeout } from '../../../lib/supabase'
import { useAppStore } from '../../../stores/appStore'
import { deciderEcriture, type SmsEcarte } from '../utils/decisionEcriture'

const DELAI_SUPABASE_MS = 5000

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
  } catch {
    /* session illisible */
  }
  return null
}

const SmsInboxPage = () => {
  const [ecartes, setEcartes] = useState<SmsEcarte[] | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let vivant = true

    const charger = async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (vivant) setMessage('Hors ligne : la boite de reception est sur le serveur.')
        return
      }

      const userId = await utilisateurCourant()
      if (!userId) {
        if (vivant) setMessage('Aucune session.')
        return
      }

      try {
        const { data, error } = (await withTimeout(
          (supabase as any)
            .from('sms_inbox')
            .select('reference, texte_brut, etat, expediteur')
            .eq('user_id', userId),
          DELAI_SUPABASE_MS,
          'smsInbox.page'
        )) as any
        if (error) throw error

        // Toutes les lignes sont passees a la decision : une ligne deja ecrite
        // reste un maillon de la chaine des soldes.
        const decision = deciderEcriture(
          ((data ?? []) as any[]).map((ligne) => ({
            reference: ligne.reference,
            texteBrut: ligne.texte_brut,
            etat: ligne.etat,
            expediteur: ligne.expediteur
          }))
        )
        if (vivant) setEcartes(decision.ecartes)
      } catch (erreur) {
        console.warn('[SMS] Lecture impossible:', erreur)
        if (vivant) setMessage('Lecture impossible.')
      }
    }

    void charger()
    return () => {
      vivant = false
    }
  }, [])

  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold mb-3">SMS non ecrits</h1>

      {message && <p className="text-sm text-gray-600">{message}</p>}

      {!message && ecartes === null && <p className="text-sm text-gray-600">Chargement...</p>}

      {ecartes !== null && ecartes.length === 0 && (
        <p className="text-sm text-gray-600">Aucun SMS ecarte.</p>
      )}

      {ecartes !== null && ecartes.length > 0 && (
        <ul className="space-y-3">
          {ecartes.map((ecarte) => (
            <li key={ecarte.reference} className="border border-gray-200 rounded p-3">
              <p className="text-xs font-mono text-gray-500">{ecarte.reference}</p>
              <p className="text-sm break-words">{ecarte.texteBrut}</p>
              <p className="text-sm font-medium mt-1">{ecarte.motif}</p>
              <p className="text-xs text-gray-500">{ecarte.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default SmsInboxPage
