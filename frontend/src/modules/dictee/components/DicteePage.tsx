/**
 * /dicter : full-screen voice entry. Record → local queue → AI → saved directly
 * when sure, otherwise the account sheet or the recap.
 * `?auto=1` (PWA shortcut « Dicter une dépense ») starts recording at once when
 * the microphone is already allowed. `?id=<dictation>` reopens a waiting one.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Info, Loader2, Mic, MicOff, Square, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useAppStore } from '../../../stores/appStore'
import accountService from '../../../services/accountService'
import { db } from '../../../lib/database'
import type { Account } from '../../../types'
import type { DicteeDecision, PendingDictation } from '../types'
import {
  ajouterDictee,
  dicteesEnAttente,
  EVENEMENT_DICTEE,
  lireDictee,
  enregistrerSiSure,
  signalerChangement,
  supprimerDictee,
  traiterFile
} from '../services/dicteeQueueService'
import { enregistrerDictee } from '../services/dicteeSaveService'
import { deciderDictee } from '../utils/decision'
import { categorieDominante, comptePrefere, ordonnerComptes } from '../utils/comptePrefere'
import { formaterMontant, libelleAttente, LIBELLE_CATEGORIE } from '../utils/libelles'
import { etatPermissionMicro, useEnregistreur, DUREE_MAX_MS, type Enregistrement } from './useEnregistreur'
import FeuilleCompte from './FeuilleCompte'
import RecapDictee, { type LigneRecap } from './RecapDictee'
import { toastDicteeEnregistree } from './toastDictee'

type Phase = 'pret' | 'enregistrement' | 'traitement' | 'compte' | 'recap'

const MESSAGE_HORS_LIGNE = 'Pas de réseau. Dictée gardée, elle sera traitée dès le retour du réseau.'

function duree(ms: number): string {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function DicteePage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const user = useAppStore((s) => s.user)
  const userId = user?.id ?? null

  const [phase, setPhase] = useState<Phase>('pret')
  const [dictee, setDictee] = useState<PendingDictation | null>(null)
  const [decision, setDecision] = useState<DicteeDecision | null>(null)
  const [comptes, setComptes] = useState<Account[]>([])
  const [prefere, setPrefere] = useState<string | null>(null)
  const [attente, setAttente] = useState<PendingDictation[]>([])
  const [message, setMessage] = useState<{ ton: 'info' | 'erreur'; texte: string } | null>(null)
  const [occupe, setOccupe] = useState(false)
  const courante = useRef<string | null>(null)
  const autoLance = useRef(false)

  const chargerComptes = useCallback(async () => {
    const liste = await accountService.getAccounts()
    setComptes(liste)
    return liste
  }, [])

  const rafraichirAttente = useCallback(async () => {
    if (!userId) return
    setAttente(await dicteesEnAttente(userId))
  }, [userId])

  /** Shows what a dictation needs: sheet, recap, or nothing (saved / waiting). */
  const ouvrir = useCallback(
    async (d: PendingDictation) => {
      courante.current = d.id
      setDictee(d)
      if (d.status === 'processing') return setPhase('traitement')
      if (d.status === 'waiting') {
        setPhase('pret')
        if (d.error === 'session') setMessage({ ton: 'erreur', texte: 'Votre connexion a expiré. Reconnectez-vous : la dictée est gardée et sera traitée ensuite.' })
        else if (!navigator.onLine) setMessage({ ton: 'info', texte: MESSAGE_HORS_LIGNE })
        return
      }
      if (d.status === 'failed') {
        setPhase('pret')
        setMessage({ ton: 'erreur', texte: "La dictée n'a pas pu être comprise pour l'instant. Elle est gardée et sera réessayée automatiquement." })
        return
      }
      if (d.status === 'done') {
        courante.current = null
        setDictee(null)
        return setPhase('pret')
      }
      // needs_review
      const liste = await chargerComptes()
      if (!d.result) return setPhase('pret')
      if (d.transactionIds) {
        setDecision({ kind: 'review' })
        return setPhase('recap')
      }
      const dec = deciderDictee(d.result.items, liste.map((c) => c.id))
      setDecision(dec)
      if (dec.kind === 'empty') {
        await supprimerDictee(d.id)
        courante.current = null
        setDictee(null)
        setPhase('pret')
        setMessage({ ton: 'info', texte: "Je n'ai entendu aucune dépense. Réessayez en disant le montant, par exemple « Taxi cinq mille »." })
        return
      }
      if (dec.kind === 'sure') {
        setPhase('traitement')
        try {
          if (!(await enregistrerSiSure(d))) {
            // Not saved and nobody else is saving it: let the user check.
            const relue = await lireDictee(d.id)
            if (relue?.status === 'needs_review' && !relue.transactionIds) setPhase('recap')
          }
        } catch {
          setPhase('recap')
        }
        return
      }
      if (dec.kind === 'account') {
        const locales = userId ? await db.transactions.where('userId').equals(userId).toArray() : []
        const categorie = categorieDominante(dec.lineIndexes.map((i) => d.result!.items[i].category))
        setPrefere(comptePrefere(liste, locales, categorie))
        return setPhase('compte')
      }
      setPhase('recap')
    },
    [chargerComptes, userId]
  )

  // Queue changes: counter + the dictation on screen.
  useEffect(() => {
    void rafraichirAttente()
    const ecouter = (e: Event) => {
      void rafraichirAttente()
      const { id } = (e as CustomEvent).detail ?? {}
      if (id && id === courante.current) {
        void lireDictee(id).then((d) => {
          if (d) void ouvrir(d)
          else {
            courante.current = null
            setDictee(null)
            setPhase('pret')
          }
        })
      }
    }
    window.addEventListener(EVENEMENT_DICTEE, ecouter)
    return () => window.removeEventListener(EVENEMENT_DICTEE, ecouter)
  }, [ouvrir, rafraichirAttente])

  // ?id=<dictation> : reopen a waiting dictation (from the counter).
  useEffect(() => {
    const id = params.get('id')
    if (!id) return
    void lireDictee(id).then((d) => d && void ouvrir(d))
  }, [params, ouvrir])

  const apresEnregistrement = useCallback(
    async (e: Enregistrement) => {
      setMessage(null)
      if (!userId) {
        setPhase('pret')
        setMessage({ ton: 'erreur', texte: 'Session introuvable. Reconnectez-vous puis réessayez.' })
        return
      }
      const d = await ajouterDictee({ userId, audio: e.audio, mime: e.mime, durationMs: e.durationMs })
      courante.current = d.id
      setDictee(d)
      if (!navigator.onLine) {
        setPhase('pret')
        toast(MESSAGE_HORS_LIGNE, { duration: 5000 })
        void rafraichirAttente()
        return
      }
      setPhase('traitement')
      await traiterFile()
      // The pass may stop before this one (session expired, network trouble):
      // never leave the spinner on a dictation that is only waiting.
      const relue = await lireDictee(d.id)
      if (relue && courante.current === d.id && relue.status !== 'processing') void ouvrir(relue)
    },
    [userId, rafraichirAttente, ouvrir]
  )

  const micro = useEnregistreur(apresEnregistrement, () => {
    setPhase('pret')
    setMessage({ ton: 'erreur', texte: "Je n'ai rien entendu. Vérifiez le micro et réessayez." })
  })

  const commencer = useCallback(async () => {
    setMessage(null)
    setPhase('enregistrement')
    await micro.demarrer()
  }, [micro])

  useEffect(() => {
    if (micro.erreur) setPhase('pret')
  }, [micro.erreur])

  // ?auto=1 : start at once if the microphone is already allowed.
  useEffect(() => {
    if (autoLance.current || params.get('auto') !== '1') return
    autoLance.current = true
    void etatPermissionMicro().then((etat) => {
      if (etat === 'accorde') void commencer()
    })
    const suite = new URLSearchParams(params)
    suite.delete('auto')
    setParams(suite, { replace: true })
  }, [params, setParams, commencer])

  const finirEnregistrement = useCallback(
    async (d: PendingDictation, lignes: LigneRecap[]) => {
      setOccupe(true)
      try {
        const terminee = await enregistrerDictee(d, lignes)
        signalerChangement(terminee.id, terminee.status)
        toastDicteeEnregistree(terminee, lignes.map((l) => l.item), comptes)
        courante.current = null
        setDictee(null)
        setPhase('pret')
      } catch (erreur) {
        console.error('[Dictée] Enregistrement interrompu:', erreur)
        const relue = (await lireDictee(d.id)) ?? d
        setDictee(relue)
        setPhase('recap')
        setMessage({ ton: 'erreur', texte: "L'enregistrement n'a pas abouti. La dictée est gardée : touchez « Réessayer l'enregistrement »." })
      } finally {
        setOccupe(false)
      }
    },
    [comptes]
  )

  const lignesRecap: LigneRecap[] = useMemo(() => {
    if (!dictee?.result) return []
    return dictee.lignesFinales ?? dictee.result.items.map((item, origine) => ({ item, origine }))
  }, [dictee])

  const resumeFeuille = useMemo(() => {
    if (!dictee?.result || decision?.kind !== 'account') return ''
    const items = decision.lineIndexes.map((i) => dictee.result!.items[i])
    return items
      .map((i) => `${i.description}, ${formaterMontant(i.amount, i.currency)}${i.category ? ` (${LIBELLE_CATEGORIE[i.category]})` : ''}`)
      .join(' · ')
  }, [dictee, decision])

  const aRevoir = attente.find((d) => d.status === 'needs_review' && d.id !== dictee?.id)

  return (
    <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-md flex-col px-4 pb-6">
      <div className="flex items-center gap-2 py-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-full p-2 text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Retour"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Dicter une dépense</h1>
      </div>

      {attente.length > 0 && phase !== 'recap' && (
        <button
          type="button"
          onClick={() => {
            if (aRevoir) void ouvrir(aRevoir)
            else if (navigator.onLine) void traiterFile()
            else setMessage({ ton: 'info', texte: MESSAGE_HORS_LIGNE })
          }}
          className="mb-3 flex w-full items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-left text-sm text-blue-900 hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <span className="font-medium" data-testid="dictee-compteur">{libelleAttente(attente.length)}</span>
          <span className="text-blue-700">{aRevoir ? 'À vérifier' : 'Voir'}</span>
        </button>
      )}

      {message && (
        <div
          role={message.ton === 'erreur' ? 'alert' : 'status'}
          className={`mb-3 flex items-start gap-2 rounded-xl border p-3 text-sm ${
            message.ton === 'erreur' ? 'border-red-200 bg-red-50 text-red-800' : 'border-blue-200 bg-blue-50 text-blue-900'
          }`}
        >
          <span className="flex-1">{message.texte}</span>
          <button type="button" onClick={() => setMessage(null)} aria-label="Fermer le message" className="-m-2 rounded-lg p-2 hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {phase === 'recap' && dictee?.result ? (
        <RecapDictee
          key={`${dictee.id}-${dictee.transactionIds ? 'fige' : 'libre'}`}
          transcript={dictee.result.transcript}
          lignesInitiales={lignesRecap}
          comptes={comptes}
          fige={Boolean(dictee.transactionIds)}
          occupe={occupe}
          onEnregistrer={(lignes) => {
            if (lignes.length === 0) {
              void supprimerDictee(dictee.id)
              setPhase('pret')
              return
            }
            void finirEnregistrement(dictee, lignes)
          }}
          onAbandonner={async () => {
            await supprimerDictee(dictee.id)
            courante.current = null
            setDictee(null)
            setPhase('pret')
            setMessage({ ton: 'info', texte: 'Dictée abandonnée, rien n\'a été enregistré.' })
          }}
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 py-6 text-center">
          {phase === 'enregistrement' ? (
            <>
              <p className="text-lg font-medium text-gray-900" aria-live="polite">
                {micro.parle ? "J'écoute…" : 'Parlez maintenant'}
              </p>
              <div className="relative flex h-32 w-32 items-center justify-center">
                <span
                  className="absolute inset-0 rounded-full bg-blue-200 motion-safe:transition-transform"
                  style={{ transform: `scale(${1 + micro.niveau * 0.35})` }}
                  aria-hidden="true"
                />
                <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg">
                  <Mic className="h-10 w-10" aria-hidden="true" />
                </span>
              </div>
              <div className="w-full max-w-xs">
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200" aria-hidden="true">
                  <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.round(micro.niveau * 100)}%` }} />
                </div>
                <p className="mt-2 text-sm tabular-nums text-gray-600">
                  {duree(micro.ecouleMs)} / {duree(DUREE_MAX_MS)}
                </p>
                <p className="mt-1 text-xs text-gray-500">S'arrête seul après 2 secondes de silence.</p>
              </div>
              <div className="flex w-full max-w-xs gap-3">
                <button
                  type="button"
                  onClick={() => {
                    micro.annuler()
                    setPhase('pret')
                  }}
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-3 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={micro.arreter}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  <Square className="h-4 w-4" aria-hidden="true" />
                  Terminé
                </button>
              </div>
            </>
          ) : phase === 'traitement' ? (
            <div role="status" aria-live="polite" className="flex flex-col items-center gap-3">
              <Loader2 className="h-12 w-12 text-blue-600 motion-safe:animate-spin" aria-hidden="true" />
              <p className="text-lg font-medium text-gray-900">Je comprends votre dictée…</p>
              <p className="text-sm text-gray-600">Quelques secondes.</p>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void commencer()}
                className="flex h-32 w-32 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
                aria-label="Commencer la dictée"
              >
                <Mic className="h-14 w-14" aria-hidden="true" />
              </button>
              <div>
                <p className="text-lg font-medium text-gray-900">Touchez le micro et parlez</p>
                <p className="mt-1 text-sm text-gray-600">Par exemple : « Taxi de Hell-Ville à Ambatoloaka, 5 000 ariary »</p>
              </div>

              {micro.erreur === 'refuse' && (
                <div role="alert" className="w-full rounded-xl border border-red-200 bg-red-50 p-3 text-left text-sm text-red-800">
                  <p className="flex items-center gap-2 font-semibold">
                    <MicOff className="h-4 w-4" aria-hidden="true" /> Le micro est bloqué
                  </p>
                  <p className="mt-1">Pour l'autoriser dans Chrome : touchez le cadenas à gauche de l'adresse, puis « Autorisations », « Micro », « Autoriser ».</p>
                  <p className="mt-1">Avec l'appli installée : Paramètres du téléphone, Applications, Chrome, Autorisations, Micro, « Autoriser ».</p>
                  <p className="mt-1">Revenez ensuite ici et touchez le micro.</p>
                </div>
              )}
              {micro.erreur === 'indisponible' && (
                <p role="alert" className="w-full rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  Aucun micro n'est disponible sur cet appareil.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {phase !== 'recap' && (
        <details className="mt-auto rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-700">
          <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-gray-900">
            <Info className="h-4 w-4 text-blue-600" aria-hidden="true" />
            Que puis-je dire ?
          </summary>
          <div className="mt-2 space-y-2">
            <p>Dites ce que vous avez payé, reçu ou déplacé, avec le montant. Le français, le malgache et le mélange des deux marchent.</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Une dépense : « Taxi de Hell-Ville à Ambatoloaka, 5 000 ariary »</li>
              <li>Plusieurs dépenses : « Pain 2 000, recharge 1 000, par Orange Money »</li>
              <li>Un transfert : « J'ai mis 20 000 de l'Orange Money vers les espèces »</li>
            </ul>
            <p>Vous pouvez dire le compte : « en espèces », « par Orange Money », « sur Mvola ». Sinon, je vous le demanderai.</p>
            <p>Si j'ai un doute, je vous montre les lignes à vérifier avant d'enregistrer.</p>
          </div>
        </details>
      )}

      {phase === 'compte' && dictee?.result && decision?.kind === 'account' && (
        <FeuilleCompte
          comptes={ordonnerComptes(comptes, prefere)}
          prefere={prefere}
          resume={resumeFeuille}
          occupe={occupe}
          onFermer={() => {
            setPhase('pret')
            setMessage({ ton: 'info', texte: 'Dictée gardée. Vous la retrouverez dans « dictée en attente ».' })
            void rafraichirAttente()
          }}
          onVerifier={() => setPhase('recap')}
          onChoisir={(id) => {
            const lignes = dictee.result!.items.map((item, origine) => ({
              item: decision.lineIndexes.includes(origine) ? { ...item, accountId: id } : item,
              origine
            }))
            void finirEnregistrement(dictee, lignes)
          }}
        />
      )}
    </div>
  )
}
