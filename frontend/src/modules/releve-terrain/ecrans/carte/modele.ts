// Pure data of the map (screen 11), the comparison with the plan (screen 12) and the plan PDF: contour
// lines and covered zone from useReleve's pointsCourbes (rule 6.5), weak geometry zones (H12, H13), labels
// of the bornes, view transform. No React here: unit tested (games D, D2).
import { altitudeEn, courbesDeNiveau, indiceGeometrie, trianguler, type Courbe, type PointCote, type Triangulation } from '../../calcul'
import type { DonneesBorne, DonneesPointPlan } from '../../db/types'
import type { BorneCalculee, ReleveCalcule, StationCalculee } from '../../etat/releveCalcule'

/** Contour interval choices: 0 = « Sans ». */
export const INTERVALLES = [0, 0.5, 1, 2] as const
export const INTERVALLE_DEFAUT = 1
/** H16: contour lines from 6 points on (bornes included). */
export const POINTS_MIN_COURBES = 6
/** H17: écart shown in red above 0,50 m. */
export const SEUIL_ECART_PLAN = 0.5

export function intervalleValide(v: unknown): number {
  return typeof v === 'number' && (INTERVALLES as readonly number[]).includes(v) ? v : INTERVALLE_DEFAUT
}

export function libelleIntervalle(v: number): string {
  return v === 0 ? 'Sans' : `${String(v).replace('.', ',')} m`
}

// ---------------------------------------------------------------------------------------------
// Contour lines (memoised: recomputed only when the points, the cut-off or the interval change)
// ---------------------------------------------------------------------------------------------

export interface DonneesCourbes {
  triangulation: Triangulation
  /** Number of kept triangles. */
  gardes: number
  courbes: Courbe[]
}

const signature = (points: PointCote[], coupure: number) =>
  `${coupure}#` + points.map((p) => `${p.x.toFixed(4)},${p.y.toFixed(4)},${p.z.toFixed(4)}`).join(';')

// Small caches (the map, the results card and the PDF ask for the same lines).
const cacheTri = new Map<string, Triangulation>()
const cacheCourbes = new Map<string, Courbe[]>()
function garder<T>(m: Map<string, T>, cle: string, v: T): T {
  if (m.size >= 8) m.delete(m.keys().next().value as string)
  m.set(cle, v)
  return v
}

/** Delaunay triangulation with the cut-off (cached on the points and the cut-off). */
export function triangulation(points: PointCote[], coupure: number): Triangulation {
  const cle = signature(points, coupure)
  return cacheTri.get(cle) ?? garder(cacheTri, cle, trianguler(points, coupure))
}

/** Function that feeds the map, the results and the PDF. */
export function donneesCourbes(points: PointCote[], coupure: number, intervalle: number): DonneesCourbes {
  const t = triangulation(points, coupure)
  const gardes = t.gardes.filter(Boolean).length
  let courbes: Courbe[] = []
  if (intervalle > 0 && points.length >= POINTS_MIN_COURBES) {
    const cle = signature(points, coupure) + `|${intervalle}`
    courbes = cacheCourbes.get(cle) ?? garder(cacheCourbes, cle, courbesDeNiveau(t, intervalle))
  }
  return { triangulation: t, gardes, courbes }
}

/** Label point of a contour line: middle of its middle segment. */
export function pointEtiquette(c: Courbe): [number, number] | null {
  if (!c.segments.length) return null
  // The longest segment around the middle of the list reads best.
  const milieu = Math.floor(c.segments.length / 2)
  let meilleur = c.segments[milieu]
  let lg = 0
  for (let i = Math.max(0, milieu - 3); i < Math.min(c.segments.length, milieu + 4); i++) {
    const [[x1, y1], [x2, y2]] = c.segments[i]
    const l = Math.hypot(x2 - x1, y2 - y1)
    if (l > lg) {
      lg = l
      meilleur = c.segments[i]
    }
  }
  const [[x1, y1], [x2, y2]] = meilleur
  return [(x1 + x2) / 2, (y1 + y2) / 2]
}

// ---------------------------------------------------------------------------------------------
// Comparison with the plan (H17)
// ---------------------------------------------------------------------------------------------

export interface LigneComparaison {
  id: string
  nom: string
  x: number | null
  y: number | null
  plan: number | null
  /** Altitude of the relevé at (x, y), null = « non couvert ». */
  releve: number | null
  /** Relevé minus plan. */
  ecart: number | null
  rouge: boolean
}

export function comparerPlan(t: Triangulation, points: { id: string; donnees: DonneesPointPlan }[]): LigneComparaison[] {
  return points.map(({ id, donnees: p }) => {
    const ok = typeof p.x === 'number' && typeof p.y === 'number'
    const releve = ok ? altitudeEn(t, p.x as number, p.y as number) : null
    const ecart = releve !== null && typeof p.z === 'number' ? releve - p.z : null
    return { id, nom: p.nom, x: p.x, y: p.y, plan: p.z, releve, ecart, rouge: ecart !== null && Math.abs(ecart) > SEUIL_ECART_PLAN }
  })
}

// ---------------------------------------------------------------------------------------------
// Weak geometry zones (H12: index > 2,5 with the active bornes; H13: index > 2,0 with the 3 principal ones)
// ---------------------------------------------------------------------------------------------

export interface Cadre {
  xmin: number
  xmax: number
  ymin: number
  ymax: number
}

export function cadreDe(points: { x: number; y: number }[], marge = 0): Cadre | null {
  if (!points.length) return null
  let xmin = Infinity
  let xmax = -Infinity
  let ymin = Infinity
  let ymax = -Infinity
  for (const p of points) {
    xmin = Math.min(xmin, p.x)
    xmax = Math.max(xmax, p.x)
    ymin = Math.min(ymin, p.y)
    ymax = Math.max(ymax, p.y)
  }
  return { xmin: xmin - marge, xmax: xmax + marge, ymin: ymin - marge, ymax: ymax + marge }
}

/** Grey rectangle in metres (one run of 2 m cells of a row). */
export interface Rectangle {
  x: number
  y: number
  largeur: number
  hauteur: number
}

export type ModeZones = 'normal' | 'ephemere'

export interface Zones {
  mode: ModeZones
  seuil: number
  bornes: { x: number; y: number }[]
  rectangles: Rectangle[]
}

const PAS_ZONES = 2
const MARGE_ZONES = 20

/** Bornes and threshold of each mode. */
export function bornesDesZones(calcule: ReleveCalcule, mode: ModeZones): { bornes: { x: number; y: number }[]; seuil: number } {
  if (mode === 'ephemere') {
    const p = [calcule.principales.a, calcule.principales.b, calcule.principales.c]
    return { bornes: p.flatMap((b) => (b?.position ? [{ x: b.position.x, y: b.position.y }] : [])), seuil: calcule.reglages.indiceEphemere }
  }
  return {
    bornes: calcule.bornes.filter((b) => b.active && b.position).map((b) => ({ x: b.position!.x, y: b.position!.y })),
    seuil: calcule.reglages.indice.orange ?? 2.5,
  }
}

/** Cells of a 2 m grid over the bounding box of the bornes plus 20 m whose index is above the threshold. */
export function calculerZones(bornes: { x: number; y: number }[], seuil: number, pas = PAS_ZONES, marge = MARGE_ZONES): Rectangle[] {
  const c = cadreDe(bornes, marge)
  if (!c || bornes.length < 2) return []
  const out: Rectangle[] = []
  const x0 = Math.floor(c.xmin / pas) * pas
  const y0 = Math.floor(c.ymin / pas) * pas
  const nx = Math.ceil((c.xmax - x0) / pas)
  const ny = Math.ceil((c.ymax - y0) / pas)
  for (let j = 0; j < ny; j++) {
    const y = y0 + j * pas
    let debut = -1
    for (let i = 0; i <= nx; i++) {
      const faible = i < nx && indiceGeometrie(x0 + (i + 0.5) * pas, y + pas / 2, bornes) > seuil
      if (faible && debut < 0) debut = i
      if (!faible && debut >= 0) {
        out.push({ x: x0 + debut * pas, y, largeur: (i - debut) * pas, hauteur: pas })
        debut = -1
      }
    }
  }
  return out
}

let derniereZone: { cle: string; z: Zones } | null = null

/** Zones of a mode, cached while the bornes (and the threshold) do not change. */
export function zonesFaibles(calcule: ReleveCalcule, mode: ModeZones): Zones {
  const { bornes, seuil } = bornesDesZones(calcule, mode)
  const cle = `${mode}|${seuil}|` + bornes.map((b) => `${b.x.toFixed(3)},${b.y.toFixed(3)}`).join(';')
  if (derniereZone?.cle === cle) return derniereZone.z
  const z: Zones = { mode, seuil, bornes, rectangles: calculerZones(bornes, seuil) }
  derniereZone = { cle, z }
  return z
}

/** Path of the zones in metres, Y flipped (drawn in the group scaled by the view). */
export function cheminZones(rectangles: Rectangle[]): string {
  return rectangles.map((r) => `M${r.x} ${-(r.y + r.hauteur)}h${r.largeur}v${r.hauteur}h${-r.largeur}z`).join('')
}

/** Path of the contour segments in metres, Y flipped. */
export function cheminSegments(c: Courbe): string {
  return c.segments.map(([[x1, y1], [x2, y2]]) => `M${x1.toFixed(3)} ${(-y1).toFixed(3)}L${x2.toFixed(3)} ${(-y2).toFixed(3)}`).join('')
}

// ---------------------------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------------------------

/** Point label of a borne: letter for a principal one, « D (1) » for an ephemeral one (H18, 6.9). */
export function libelleBorne(d: Pick<DonneesBorne, 'lettre' | 'usage' | 'type'>): string {
  return d.type === 'ephemere' ? `${d.lettre} (${d.usage})` : d.lettre
}

export function mentionCarte(calcule: ReleveCalcule): string | null {
  const a = calcule.principales.a?.donnees.lettre ?? 'A'
  const b = calcule.principales.b?.donnees.lettre ?? 'B'
  switch (calcule.orientation) {
    case 'plan':
      return 'Orienté par le plan'
    case 'nord_approximatif':
      return 'Nord approximatif'
    case 'libre':
      return `Orientation libre (axe ${a} vers ${b})`
    default:
      return null
  }
}

/** Position drawn for a station: the kept result, or the computed one for a station set aside. */
export function positionStation(s: StationCalculee): { x: number; y: number; z: number } | null {
  if (s.incomplete) return null
  if (s.retenu) return s.retenu
  const r = s.resultat
  return r.calculee && typeof r.x === 'number' && typeof r.y === 'number' && typeof r.z === 'number' ? { x: r.x, y: r.y, z: r.z } : null
}

export type TeinteStation = 'vert' | 'orange' | 'rouge' | 'gris'

export function teinteStation(s: StationCalculee): TeinteStation {
  if (s.donnees.etat === 'ecartee') return 'gris'
  return s.couleur ?? 'gris'
}

/** Fill of the map dots (strong colours, white ring). */
export const TEINTES: Record<TeinteStation, string> = { vert: '#15803D', orange: '#C2410C', rouge: '#B91C1C', gris: '#8A8A82' }

/** Bornes with a known position. */
export function bornesPlacees(calcule: ReleveCalcule): (BorneCalculee & { position: NonNullable<BorneCalculee['position']> })[] {
  return calcule.bornes.filter((b): b is BorneCalculee & { position: NonNullable<BorneCalculee['position']> } => !!b.position)
}

/** Every drawn position (bornes and stations), for « Recentrer » and the PDF frame. */
export function cadreContenu(calcule: ReleveCalcule): Cadre | null {
  const pts: { x: number; y: number }[] = bornesPlacees(calcule).map((b) => b.position)
  for (const s of calcule.stations) {
    const p = positionStation(s)
    if (p) pts.push(p)
  }
  return cadreDe(pts)
}

// ---------------------------------------------------------------------------------------------
// View (screen pixels <-> local metres, X east, Y north)
// ---------------------------------------------------------------------------------------------

export interface Vue {
  /** Centre of the screen in metres. */
  cx: number
  cy: number
  /** Pixels per metre. */
  s: number
}

export const ECHELLE_MIN = 0.3
export const ECHELLE_MAX = 120

export function borner(s: number): number {
  return Math.min(ECHELLE_MAX, Math.max(ECHELLE_MIN, s))
}

export function versEcran(v: Vue, l: number, h: number, x: number, y: number): [number, number] {
  return [(x - v.cx) * v.s + l / 2, (v.cy - y) * v.s + h / 2]
}

export function versMetres(v: Vue, l: number, h: number, px: number, py: number): [number, number] {
  return [(px - l / 2) / v.s + v.cx, v.cy - (py - h / 2) / v.s]
}

/** View that shows the whole frame with a margin of `marge` pixels. */
export function vueAjustee(c: Cadre | null, l: number, h: number, marge = 36): Vue {
  if (!c) return { cx: 0, cy: 0, s: 4 }
  const dx = Math.max(c.xmax - c.xmin, 5)
  const dy = Math.max(c.ymax - c.ymin, 5)
  const s = borner(Math.min((l - 2 * marge) / dx, (h - 2 * marge) / dy))
  return { cx: (c.xmin + c.xmax) / 2, cy: (c.ymin + c.ymax) / 2, s }
}

/** Zoom of factor k keeping the metre point under (px, py) in place. */
export function zoomer(v: Vue, l: number, h: number, px: number, py: number, k: number): Vue {
  const [mx, my] = versMetres(v, l, h, px, py)
  const s = borner(v.s * k)
  return { s, cx: mx - (px - l / 2) / s, cy: my + (py - h / 2) / s }
}

/** Nice length of the scale bar (1, 2 or 5 times a power of ten): 70 to 175 pixels. */
export function longueurEchelle(s: number): number {
  const cible = 100 / s
  const p = Math.pow(10, Math.floor(Math.log10(cible)))
  for (const k of [1, 2, 5, 10]) if (k * p * s >= 70) return k * p
  return 10 * p
}

/** Grid lines every 5 m, origin at the first borne, visible part only (metres). */
export function lignesQuadrillage(v: Vue, l: number, h: number, origine: { x: number; y: number }, pas = 5): { xs: number[]; ys: number[] } {
  // Dense grid at small scales: one line out of k so that lines stay 8 px apart at least.
  let p = pas
  while (p * v.s < 8) p *= 2
  const [x0, y1] = versMetres(v, l, h, 0, 0)
  const [x1, y0] = versMetres(v, l, h, l, h)
  const xs: number[] = []
  const ys: number[] = []
  for (let k = Math.ceil((x0 - origine.x) / p); origine.x + k * p <= x1; k++) xs.push(origine.x + k * p)
  for (let k = Math.ceil((y0 - origine.y) / p); origine.y + k * p <= y1; k++) ys.push(origine.y + k * p)
  return { xs, ys }
}

