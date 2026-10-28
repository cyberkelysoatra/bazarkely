/**
 * Microphone recorder: MediaRecorder + live level. Stops on « Terminé »,
 * automatically after 2 s of silence once speech was heard, or at 60 s.
 * Timers use setInterval (not requestAnimationFrame) so the auto-stop keeps
 * working when the screen is not repainting.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

export const DUREE_MAX_MS = 60_000
export const SILENCE_ARRET_MS = 2_000
const SEUIL_PAROLE = 0.035
const SEUIL_SILENCE = 0.02
const PAROLE_MIN_MS = 250
const PAS_MS = 100

export type EtatMicro = 'inconnu' | 'accorde' | 'refuse' | 'demande'

export interface Enregistrement {
  audio: Blob
  mime: string
  durationMs: number
}

function choisirMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  for (const m of ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']) {
    if (MediaRecorder.isTypeSupported?.(m)) return m
  }
  return undefined
}

export async function etatPermissionMicro(): Promise<EtatMicro> {
  try {
    const p = await navigator.permissions.query({ name: 'microphone' as PermissionName })
    if (p.state === 'granted') return 'accorde'
    if (p.state === 'denied') return 'refuse'
    return 'demande'
  } catch {
    return 'inconnu'
  }
}

export function useEnregistreur(onTermine: (e: Enregistrement) => void, onVide?: () => void) {
  const [enCours, setEnCours] = useState(false)
  const [niveau, setNiveau] = useState(0)
  const [ecouleMs, setEcouleMs] = useState(0)
  const [aParle, setParle] = useState(false)
  const [erreur, setErreur] = useState<'refuse' | 'indisponible' | null>(null)

  const recorder = useRef<MediaRecorder | null>(null)
  const flux = useRef<MediaStream | null>(null)
  const contexte = useRef<AudioContext | null>(null)
  const minuterie = useRef<number | null>(null)
  const morceaux = useRef<Blob[]>([])
  const annule = useRef(false)
  const debut = useRef(0)
  const rappel = useRef(onTermine)
  rappel.current = onTermine
  const rappelVide = useRef(onVide)
  rappelVide.current = onVide

  const nettoyer = useCallback(() => {
    if (minuterie.current !== null) window.clearInterval(minuterie.current)
    minuterie.current = null
    flux.current?.getTracks().forEach((t) => t.stop())
    flux.current = null
    void contexte.current?.close().catch(() => undefined)
    contexte.current = null
    setEnCours(false)
    setNiveau(0)
  }, [])

  const arreter = useCallback(() => {
    const r = recorder.current
    if (r && r.state !== 'inactive') r.stop()
  }, [])

  const annuler = useCallback(() => {
    annule.current = true
    arreter()
    nettoyer()
  }, [arreter, nettoyer])

  const demarrer = useCallback(async () => {
    setErreur(null)
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setErreur('indisponible')
      return
    }
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 }
      })
    } catch (e: any) {
      setErreur(e?.name === 'NotAllowedError' || e?.name === 'SecurityError' ? 'refuse' : 'indisponible')
      return
    }
    flux.current = stream
    annule.current = false
    morceaux.current = []

    const mime = choisirMime()
    const r = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
    recorder.current = r
    r.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) morceaux.current.push(ev.data)
    }
    r.onstop = () => {
      const duree = Date.now() - debut.current
      const type = (r.mimeType || mime || 'audio/webm').split(';')[0]
      const audio = new Blob(morceaux.current, { type })
      nettoyer()
      if (annule.current) return
      if (audio.size > 0) rappel.current({ audio, mime: type, durationMs: duree })
      else rappelVide.current?.()
    }

    // Live level + silence detection.
    const Ctx: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext
    const ctx = new Ctx()
    contexte.current = ctx
    const analyseur = ctx.createAnalyser()
    analyseur.fftSize = 1024
    ctx.createMediaStreamSource(stream).connect(analyseur)
    const tampon = new Float32Array(analyseur.fftSize)
    let paroleMs = 0
    let silenceMs = 0
    let parole = false

    debut.current = Date.now()
    setEcouleMs(0)
    setParle(false)
    r.start(250)
    setEnCours(true)

    minuterie.current = window.setInterval(() => {
      analyseur.getFloatTimeDomainData(tampon)
      let somme = 0
      for (let i = 0; i < tampon.length; i++) somme += tampon[i] * tampon[i]
      const rms = Math.sqrt(somme / tampon.length)
      setNiveau(Math.min(1, rms * 8))
      const ecoule = Date.now() - debut.current
      setEcouleMs(ecoule)

      if (rms > SEUIL_PAROLE) {
        paroleMs += PAS_MS
        silenceMs = 0
        if (!parole && paroleMs >= PAROLE_MIN_MS) {
          parole = true
          setParle(true)
        }
      } else if (rms < SEUIL_SILENCE) {
        silenceMs += PAS_MS
      }
      if ((parole && silenceMs >= SILENCE_ARRET_MS) || ecoule >= DUREE_MAX_MS) arreter()
    }, PAS_MS)
  }, [arreter, nettoyer])

  useEffect(() => () => {
    annule.current = true
    const r = recorder.current
    if (r && r.state !== 'inactive') r.stop()
    if (minuterie.current !== null) window.clearInterval(minuterie.current)
    flux.current?.getTracks().forEach((t) => t.stop())
    void contexte.current?.close().catch(() => undefined)
  }, [])

  return { enCours, niveau, ecouleMs, parle: aParle, erreur, demarrer, arreter, annuler }
}
