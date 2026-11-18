// Display helpers of screens 6 and 7: decimals of the PRD games (3 for metres, 1 for degrees), signed
// values with a true minus sign, colour pill of a result.
import type { Couleur } from '../../calcul'
import { formaterNombre } from '../../composants/ChampNombre'

/** « 52,468 » (3 decimals). */
export function metres(v: number | null | undefined): string {
  return formaterNombre(v, 3)
}

/** « +0,016 », « −0,124 », « 0,000 » (3 decimals, sign always shown except for zero). */
export function metresSigne(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return ''
  const s = formaterNombre(v, 3)
  return v > 0 && s !== '0,000' ? `+${s}` : s === '−0,000' ? '0,000' : s
}

/** « 64,4 » (1 decimal). */
export function degres(v: number | null | undefined): string {
  const s = formaterNombre(v, 1)
  return s === '−0,0' ? '0,0' : s
}

/** « 10 » or « 10,5 » (declination, as stored). */
export function nombreLibre(v: number | null | undefined): string {
  return formaterNombre(v)
}

export const MOT_COULEUR: Record<Couleur, string> = { vert: 'VERT', orange: 'ORANGE', rouge: 'ROUGE' }

/** First letter in upper case (« nord approximatif » -> « Nord approximatif »). */
export function majuscule(t: string): string {
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t
}
