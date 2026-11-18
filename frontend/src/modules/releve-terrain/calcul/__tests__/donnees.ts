// Shared data of the PRD test games (section 11, PRD v0.10) and helpers.
import { expect } from 'vitest'
import { REGLAGES_DEFAUT, calerCote } from '../index'
import type { BorneConnue, EntreeCote, Lecture, ResultatCote, Visee } from '../index'

export const HI = 1.5
export const HT = 1.5
export const R = REGLAGES_DEFAUT

/** |valeur - attendu| <= tolerance (plus a tiny floating margin). */
export function proche(valeur: number | null | undefined, attendu: number, tolerance = 0.01): void {
  expect(valeur, `attendu ${attendu} ± ${tolerance}`).not.toBeNull()
  expect(valeur, `attendu ${attendu} ± ${tolerance}`).not.toBeUndefined()
  expect(Math.abs((valeur as number) - attendu), `valeur ${valeur}, attendu ${attendu} ± ${tolerance}`).toBeLessThanOrEqual(
    tolerance + 1e-9,
  )
}

// Table of the targets (plan): origin A, X east, Y north.
export const PLAN = {
  a: { x: 0, y: 0, z: 38.11 },
  b: { x: 47.29, y: 22.67, z: 26.83 },
  c: { x: 69.15, y: -17.32, z: 21.33 },
}

export const BORNES: BorneConnue[] = [
  { id: 'A', lettre: 'A', x: 0, y: 0, z: 38.11, rang: 0 },
  { id: 'B', lettre: 'B', x: 47.29, y: 22.67, z: 26.83, rang: 0 },
  { id: 'C', lettre: 'C', x: 69.15, y: -17.32, z: 21.33, rang: 0 },
]

const aller = (distance: number, pente: number): Lecture => ({ distance, pente, sens: 'aller' })

// Game A readings
export const COTE_AB: EntreeCote = {
  lectures: [aller(53.64, -12.1), aller(53.67, -12.0), aller(53.62, -12.2)],
  decametre: { aller: 53.64, retour: 53.68 },
  hi: HI,
  ht: HT,
}
export const COTE_BC: EntreeCote = {
  lectures: [aller(45.93, -6.9), aller(45.88, -6.8), aller(45.92, -6.9)],
  decametre: { aller: 45.8, retour: 45.77 },
  hi: HI,
  ht: HT,
}
export const COTE_AC: EntreeCote = {
  lectures: [aller(73.28, -13.1), aller(73.23, -13.2), aller(73.19, -13.3)],
  decametre: { aller: 73.27, retour: 73.22 },
  hi: HI,
  ht: HT,
}

export function cotesJeuA(): { ab: ResultatCote; bc: ResultatCote; ac: ResultatCote } {
  return { ab: calerCote(COTE_AB, R), bc: calerCote(COTE_BC, R), ac: calerCote(COTE_AC, R) }
}

/** Sights of a station: [distance, slope] per target id, or null for « pas visible ». */
export function visees(v: Record<string, [number, number] | null>): Visee[] {
  return Object.entries(v).map(([borneId, m]) =>
    m === null ? { borneId, distance: null, pente: null, pasVisible: true } : { borneId, distance: m[0], pente: m[1] },
  )
}

/** Sight computed from a ground point (x, y, z) towards a target (hi = ht). */
export function viseeDepuis(
  p: { x: number; y: number; z: number },
  b: { id: string; x: number; y: number; z: number },
): Visee {
  const h = Math.hypot(b.x - p.x, b.y - p.y)
  const dz = b.z + HT - (p.z + HI)
  return { borneId: b.id, distance: Math.hypot(h, dz), pente: (Math.atan2(dz, h) * 180) / Math.PI }
}

// Game B
export interface AttenduB {
  nom: string
  v: Record<string, [number, number]>
  x: number
  y: number
  z: number
  ecartAltitude: number
  indice: number
}
export const JEU_B: AttenduB[] = [
  { nom: 'S01', v: { A: [20.57, 13.6], B: [36.06, -10.3], C: [53.47, -12.9] }, x: 19.993, y: 0.006, z: 33.274, ecartAltitude: 0.01, indice: 1.55 },
  { nom: 'S02', v: { A: [31.26, 13.3], B: [25.05, -9.4], C: [46.07, -12.0] }, x: 30.006, y: 5.006, z: 30.918, ecartAltitude: 0.013, indice: 1.34 },
  { nom: 'S03', v: { A: [41.15, 13.6], B: [23.87, -3.9], C: [34.65, -11.9] }, x: 39.998, y: -0.002, z: 28.455, ecartAltitude: 0.041, indice: 1.19 },
  { nom: 'S04', v: { A: [46.99, 13.4], B: [30.76, -0.7], C: [26.55, -12.8] }, x: 45.0, y: -8.001, z: 27.211, ecartAltitude: 0.014, indice: 1.24 },
  { nom: 'S05', v: { A: [56.58, 13.6], B: [24.03, 4.7], C: [22.64, -8.9] }, x: 54.993, y: -0.005, z: 24.843, ecartAltitude: 0.055, indice: 1.36 },
  { nom: 'S06', v: { A: [37.94, 12.8], B: [16.53, -10.1], C: [45.79, -10.6] }, x: 35.0, y: 11.999, z: 29.728, ecartAltitude: 0.049, indice: 1.27 },
  { nom: 'S07', v: { A: [25.9, 13.5], B: [34.4, -8.7], C: [47.64, -13.0] }, x: 24.998, y: -3.007, z: 32.052, ecartAltitude: 0.03, indice: 1.38 },
  { nom: 'S08', v: { A: [52.04, 13.4], B: [14.94, 2.8], C: [32.1, -8.5] }, x: 49.988, y: 7.993, z: 26.093, ecartAltitude: 0.05, indice: 1.23 },
]

export function mediane(v: number[]): number {
  const s = [...v].sort((a, b) => a - b)
  const k = Math.floor(s.length / 2)
  return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2
}

/** Median duration (ms) of n runs of f. */
export function dureeMediane(f: () => unknown, n = 20): number {
  f() // warm-up
  const t: number[] = []
  for (let i = 0; i < n; i++) {
    const t0 = performance.now()
    f()
    t.push(performance.now() - t0)
  }
  return mediane(t)
}
