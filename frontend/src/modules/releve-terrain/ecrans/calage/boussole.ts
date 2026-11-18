// Compass of the phone (6.3 bis, screen 7): `deviceorientationabsolute` (Chrome Android), heading =
// (360 - alpha) corrected by the screen rotation. Readings are kept once stable over 2 s: circular mean
// and dispersion with moyenneCaps (358 and 2 give 0, never 180), dispersion under 3 degrees. No event
// within 3 s, or no sensor at all: the caller shows the manual field.
import { moyenneCaps, normaliserCap } from '../../calcul'

export const DUREE_LECTURE = 2000
export const DELAI_AUCUNE = 3000
export const DISPERSION_MAX = 3

/** Heading of the top of the phone, from alpha of `deviceorientationabsolute` and the screen angle. */
export function capDepuisAlpha(alpha: number, angleEcran = 0): number {
  return normaliserCap(360 - alpha + angleEcran)
}

/** Corrected heading (6.3 bis): read heading minus the declination, back into [0 ; 360[. */
export function capCorrige(capLu: number, declinaison: number): number {
  return normaliserCap(capLu - declinaison)
}

/** True when the browser announces an absolute orientation sensor. */
export function boussoleAnnoncee(fenetre: Window | undefined = typeof window === 'undefined' ? undefined : window): boolean {
  return !!fenetre && 'ondeviceorientationabsolute' in fenetre
}

export interface OptionsBoussole {
  /** Where the events arrive (window). */
  cible: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>
  /** Screen rotation in degrees (screen.orientation.angle). */
  angleEcran?: () => number
  maintenant?: () => number
  attendre?: (f: () => void, ms: number) => unknown
  annuler?: (t: unknown) => void
  /** Stable reading: mean heading (read, not corrected) and its dispersion. */
  onStable: (r: { cap: number; dispersion: number; lectures: number }) => void
  /** No event within 3 s. */
  onAucune: () => void
  /** Every heading received (live display). */
  onLecture?: (cap: number) => void
}

/** Starts listening; returns the function that stops it. */
export function ecouterBoussole(o: OptionsBoussole): () => void {
  const maintenant = o.maintenant ?? (() => Date.now())
  const attendre = o.attendre ?? ((f: () => void, ms: number) => setTimeout(f, ms))
  const annuler = o.annuler ?? ((t: unknown) => clearTimeout(t as ReturnType<typeof setTimeout>))
  const angle = o.angleEcran ?? (() => 0)
  let lectures: { t: number; cap: number }[] = []
  let recue = false
  let fini = false
  let debut: number | null = null

  const arreter = () => {
    if (fini) return
    fini = true
    o.cible.removeEventListener('deviceorientationabsolute', surEvenement)
    annuler(minuterie)
  }

  function surEvenement(e: Event) {
    if (fini) return
    const alpha = (e as DeviceOrientationEvent).alpha
    if (typeof alpha !== 'number' || !Number.isFinite(alpha)) return
    recue = true
    const t = maintenant()
    const cap = capDepuisAlpha(alpha, angle())
    o.onLecture?.(cap)
    if (debut === null) debut = t
    lectures.push({ t, cap })
    // Window of the last 2 s only: an unstable start never blocks a later stable hold.
    lectures = lectures.filter((l) => l.t >= t - DUREE_LECTURE)
    const couvert = lectures.length >= 2 && t - lectures[0].t >= DUREE_LECTURE * 0.9
    if (!couvert) return
    const { moyenne, dispersion } = moyenneCaps(lectures.map((l) => l.cap))
    if (dispersion < DISPERSION_MAX) {
      const n = lectures.length
      arreter()
      o.onStable({ cap: moyenne, dispersion, lectures: n })
    }
  }

  o.cible.addEventListener('deviceorientationabsolute', surEvenement)
  const minuterie = attendre(() => {
    if (!recue && !fini) {
      arreter()
      o.onAucune()
    }
  }, DELAI_AUCUNE)
  return arreter
}
