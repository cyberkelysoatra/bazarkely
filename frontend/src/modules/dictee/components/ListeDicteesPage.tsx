/**
 * /dicter/attente (DICTEE-CC-02): every dictation of the current user that is
 * not finished, newest first. Reached from the badge, from /dicter and from
 * the user menu. Nothing is ever deleted without the user's confirmation.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { liveQuery } from 'dexie'
import { AlertTriangle, ArrowLeft, Clock, Inbox, Info, Loader2, Lock, Pause, Play, RotateCcw, Trash2, XCircle } from 'lucide-react'
import { db } from '../../../lib/database'
import { useAppStore } from '../../../stores/appStore'
import accountService from '../../../services/accountService'
import type { Account } from '../../../types'
import type { PendingDictation } from '../types'
import { adopterOrphelines, recupererTraitementsAbandonnes, reessayer, supprimerDictee } from '../services/dicteeQueueService'
import { estOrphelineEtrangere } from '../utils/proprietaire'
import { estAudioAncien } from '../utils/etatFile'
import { formaterMontant, libelleEssais, libelleStatut, LIBELLE_TYPE } from '../utils/libelles'
import { doutesHorsCompte } from '../utils/doutes'

type StatutListe = Exclude<PendingDictation['status'], 'done'>

const SORTIE_MS = 220

function quand(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}

function duree(ms: number): string {
  const s = Math.max(1, Math.round(ms / 1000))
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`
}

function useEnLigne(): boolean {
  const [enLigne, setEnLigne] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  useEffect(() => {
    const maj = () => setEnLigne(navigator.onLine)
    window.addEventListener('online', maj)
    window.addEventListener('offline', maj)
    return () => {
      window.removeEventListener('online', maj)
      window.removeEventListener('offline', maj)
    }
  }, [])
  return enLigne
}

const reductionMouvement = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function IconeStatut({ statut }: { statut: StatutListe }) {
  if (statut === 'processing') return <Loader2 className="h-5 w-5 text-blue-600 motion-safe:animate-spin" aria-hidden="true" />
  if (statut === 'needs_review') return <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
  if (statut === 'failed') return <XCircle className="h-5 w-5 text-amber-700" aria-hidden="true" />
  return <Clock className="h-5 w-5 text-gray-500" aria-hidden="true" />
}

/** Play / pause the kept recording. The object URL lives only while the card does. */
function Lecteur({ audio }: { audio: Blob }) {
  const [lecture, setLecture] = useState(false)
  const element = useRef<HTMLAudioElement | null>(null)
  const url = useMemo(() => URL.createObjectURL(audio), [audio])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  return (
    <>
      <audio ref={element} src={url} preload="none" onEnded={() => setLecture(false)} onPause={() => setLecture(false)} onPlay={() => setLecture(true)} />
      <button
        type="button"
        onClick={() => {
          const a = element.current
          if (!a) return
          if (lecture) a.pause()
          else void a.play().catch(() => setLecture(false))
        }}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {lecture ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
        {lecture ? 'Pause' : 'Écouter'}
      </button>
    </>
  )
}

export default function ListeDicteesPage() {
  const navigate = useNavigate()
  const userId = useAppStore((s) => s.user?.id ?? null)
  const enLigne = useEnLigne()
  const [dictees, setDictees] = useState<PendingDictation[] | null>(null)
  /** Recorded with nobody signed in, after someone else's session: « Supprimer » only, never sent. */
  const [etrangeres, setEtrangeres] = useState<PendingDictation[]>([])
  const [comptes, setComptes] = useState<Account[]>([])
  const [aConfirmer, setAConfirmer] = useState<string | null>(null)
  const [sortantes, setSortantes] = useState<Set<string>>(new Set())
  const [annonce, setAnnonce] = useState('')
  const titre = useRef<HTMLHeadingElement | null>(null)

  useEffect(() => {
    titre.current?.focus()
    void accountService.getAccounts().then(setComptes).catch(() => setComptes([]))
  }, [])

  useEffect(() => {
    if (!userId) return
    // Stuck `processing` (app killed): back to waiting, even offline.
    void recupererTraitementsAbandonnes(userId).catch(() => undefined)
    // Unowned dictation recorded right after this user's session: theirs (offline too).
    void adopterOrphelines(userId).catch(() => undefined)
    const recentes = (a: PendingDictation, b: PendingDictation) => b.recordedAt.localeCompare(a.recordedAt)
    const abonnement = liveQuery(() => db.pendingDictations.where('userId').anyOf([userId, '']).toArray()).subscribe({
      next: (liste) => {
        setDictees(liste.filter((d) => d.userId === userId && d.status !== 'done').sort(recentes))
        setEtrangeres(liste.filter((d) => estOrphelineEtrangere(d, userId)).sort(recentes))
      },
      error: () => setDictees([])
    })
    return () => abonnement.unsubscribe()
  }, [userId])

  const nomCompte = useCallback((id: string | null) => comptes.find((c) => c.id === id)?.name ?? null, [comptes])

  const supprimer = useCallback(async (id: string) => {
    setAConfirmer(null)
    setSortantes((s) => new Set(s).add(id))
    await new Promise((r) => setTimeout(r, reductionMouvement() ? 0 : SORTIE_MS))
    await supprimerDictee(id)
    setAnnonce('Dictée supprimée.')
    setSortantes((s) => {
      const suite = new Set(s)
      suite.delete(id)
      return suite
    })
  }, [])

  const relancer = useCallback(
    async (ids: string[]) => {
      if (!userId || ids.length === 0) return
      setAnnonce(ids.length > 1 ? 'Nouvel essai des dictées en cours.' : 'Nouvel essai en cours.')
      await reessayer(ids, userId)
    },
    [userId]
  )

  const relancables = (dictees ?? []).filter((d) => d.status === 'failed' || d.status === 'waiting')

  return (
    <div className="mx-auto max-w-md px-4 pb-8">
      <div className="flex items-center gap-2 py-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-full p-2 text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Retour"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <h1 ref={titre} tabIndex={-1} className="text-xl font-bold text-gray-900 focus:outline-none">
          Dictées en attente
        </h1>
      </div>

      <p className="sr-only" role="status" aria-live="polite">{annonce}</p>

      <details className="mb-3 rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-700">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-gray-900">
          <Info className="h-4 w-4 text-blue-600" aria-hidden="true" />
          Pourquoi une dictée attend ?
        </summary>
        <div className="mt-2 space-y-2">
          <p>Pour comprendre une dictée, le téléphone a besoin d'internet. Sans réseau, la dictée est gardée sur le téléphone.</p>
          <p>Elle part toute seule dès que le réseau revient, même si vous ne rouvrez pas cette page.</p>
          <p>Rien n'est perdu pendant l'attente : l'enregistrement reste sur le téléphone jusqu'à ce qu'il soit compris. Seules les dictées que vous supprimez disparaissent.</p>
          <p>« À vérifier » veut dire que la dictée est comprise mais qu'il manque un compte ou qu'un point est à confirmer.</p>
        </div>
      </details>

      {enLigne && relancables.length > 0 && (
        <button
          type="button"
          onClick={() => void relancer(relancables.map((d) => d.id))}
          className="mb-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Tout réessayer
        </button>
      )}

      {dictees === null ? (
        <div className="flex justify-center py-10" role="status" aria-label="Chargement">
          <Loader2 className="h-8 w-8 text-blue-600 motion-safe:animate-spin" aria-hidden="true" />
        </div>
      ) : dictees.length === 0 && etrangeres.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center text-gray-600" data-testid="dictees-vide">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Inbox className="h-7 w-7" aria-hidden="true" />
          </span>
          <p className="font-medium text-gray-900">Aucune dictée en attente</p>
        </div>
      ) : (
        <>
        {dictees.length > 0 && (
        <ul className="space-y-3" aria-label="Dictées">
          {dictees.map((d) => {
            const statut = d.status as StatutListe
            const sortante = sortantes.has(d.id)
            const ambre = statut === 'needs_review' || statut === 'failed'
            const lignes = d.lignesFinales?.map((l) => l.item) ?? d.result?.items ?? []
            return (
              <li
                key={d.id}
                data-testid="carte-dictee"
                data-statut={statut}
                className={`rounded-xl border bg-white p-4 shadow-sm transition-all duration-200 ease-out motion-reduce:transition-none ${
                  ambre ? 'border-amber-300' : 'border-gray-200'
                } ${sortante ? '-translate-x-4 opacity-0' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${ambre ? 'bg-amber-50' : 'bg-gray-100'}`}>
                    <IconeStatut statut={statut} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`font-semibold ${ambre ? 'text-amber-900' : 'text-gray-900'}`} data-testid="statut-dictee">
                      {libelleStatut(statut, d.error)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {quand(d.recordedAt)} · {duree(d.durationMs)}
                    </p>
                    {statut === 'failed' && <p className="text-sm text-gray-600">{libelleEssais(d.attempts)}</p>}
                  </div>
                </div>

                {estAudioAncien(d) && (
                  <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    Enregistrée il y a plus de 30 jours et pas encore comprise. Vous pouvez la supprimer si elle ne sert plus.
                  </p>
                )}

                {statut === 'needs_review' && d.result && (
                  <div className="mt-3 space-y-2">
                    {d.result.transcript && <p className="text-sm italic text-gray-700">« {d.result.transcript} »</p>}
                    <ul className="space-y-1 text-sm">
                      {lignes.map((item, k) => {
                        const compte = nomCompte(item.accountId)
                        // The account is shown on its own (« Compte à choisir »): only other doubts are counted.
                        const doutes = doutesHorsCompte(item).length
                        return (
                          <li key={k} className="flex flex-wrap items-baseline justify-between gap-x-2 rounded-lg bg-gray-50 px-3 py-1.5">
                            <span className="min-w-0 text-gray-900">
                              {item.description}
                              <span className="text-gray-500"> · {LIBELLE_TYPE[item.type]}</span>
                            </span>
                            <span className="font-medium tabular-nums text-gray-900">{formaterMontant(item.amount, item.currency)}</span>
                            <span className={`w-full text-xs ${compte ? 'text-gray-600' : 'text-amber-800'}`}>
                              {compte ?? 'Compte à choisir'}
                              {doutes > 0 && ` · ${doutes > 1 ? `${doutes} points à vérifier` : '1 point à vérifier'}`}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}

                {statut !== 'processing' && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {statut === 'needs_review' && (
                      <button
                        type="button"
                        onClick={() => navigate(`/dicter?id=${encodeURIComponent(d.id)}`)}
                        className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      >
                        Vérifier et enregistrer
                      </button>
                    )}
                    {statut === 'waiting' && d.audio && <Lecteur audio={d.audio} />}
                    {statut === 'failed' && (
                      <button
                        type="button"
                        disabled={!enLigne}
                        onClick={() => void relancer([d.id])}
                        className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50"
                      >
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                        Réessayer
                      </button>
                    )}
                    {statut !== 'needs_review' &&
                      (aConfirmer === d.id ? (
                        <div className="flex w-full flex-wrap items-center gap-2 rounded-lg bg-red-50 p-2" role="group" aria-label="Confirmer la suppression">
                          <span className="flex-1 text-sm text-red-900">Supprimer cette dictée ? L'enregistrement sera perdu.</span>
                          <button
                            type="button"
                            onClick={() => setAConfirmer(null)}
                            className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          >
                            Garder
                          </button>
                          <button
                            type="button"
                            onClick={() => void supprimer(d.id)}
                            className="min-h-11 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                          >
                            Supprimer
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setAConfirmer(d.id)}
                          className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          Supprimer
                        </button>
                      ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
        )}

        {etrangeres.length > 0 && (
          <section className="mt-6" aria-labelledby="dictees-etrangeres">
            <h2 id="dictees-etrangeres" className="mb-1 text-base font-semibold text-gray-900">Dictées d'une autre session</h2>
            <p className="mb-3 text-sm text-gray-600">
              Faites sur ce téléphone sans personne connectée, après la session d'un autre compte. Elles ne seront jamais traitées pour vous : seule cette personne peut les reprendre en se reconnectant ici.
            </p>
            <ul className="space-y-3" aria-label="Dictées d'une autre session">
              {etrangeres.map((d) => (
                <li
                  key={d.id}
                  data-testid="carte-dictee-etrangere"
                  className={`rounded-xl border border-gray-200 bg-gray-50 p-4 transition-all duration-200 ease-out motion-reduce:transition-none ${
                    sortantes.has(d.id) ? '-translate-x-4 opacity-0' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-200">
                      <Lock className="h-5 w-5 text-gray-600" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900">Dictée d'une autre personne</p>
                      <p className="text-sm text-gray-600">
                        {quand(d.recordedAt)} · {duree(d.durationMs)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {aConfirmer === d.id ? (
                      <div className="flex w-full flex-wrap items-center gap-2 rounded-lg bg-red-50 p-2" role="group" aria-label="Confirmer la suppression">
                        <span className="flex-1 text-sm text-red-900">Supprimer cette dictée ? L'enregistrement sera perdu.</span>
                        <button
                          type="button"
                          onClick={() => setAConfirmer(null)}
                          className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          Garder
                        </button>
                        <button
                          type="button"
                          onClick={() => void supprimer(d.id)}
                          className="min-h-11 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                        >
                          Supprimer
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAConfirmer(d.id)}
                        className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Supprimer
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
        </>
      )}
    </div>
  )
}
