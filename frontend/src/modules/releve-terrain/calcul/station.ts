// PRD 6.4: position and altitude of a station (3 sighted targets or more).
import { MESSAGES, couleurDe, pire } from './seuils'
import type { BorneConnue, CleStation, Couleur, Reglages, ResultatPosition, ResultatStation, Visee } from './types'
import { altitudeDepuis, horizontale } from './visee'

interface Mesure {
  borne: BorneConnue
  distance: number
  pente: number
  h: number
  zs: number
}

/** Geometry index: sqrt(trace((A^T A)^-1)), A = unit vectors station -> target. */
export function indiceGeometrie(x: number, y: number, bornes: { x: number; y: number }[]): number {
  let a11 = 0
  let a12 = 0
  let a22 = 0
  for (const b of bornes) {
    const dx = b.x - x
    const dy = b.y - y
    const n = Math.hypot(dx, dy)
    if (n === 0) continue
    const ex = dx / n
    const ey = dy / n
    a11 += ex * ex
    a12 += ex * ey
    a22 += ey * ey
  }
  const det = a11 * a22 - a12 * a12
  if (!(det > 1e-12)) return Infinity
  return Math.sqrt((a11 + a22) / det)
}

/** Direct solution: subtract the circle equations of the 3 first sights two by two. */
function solutionDirecte(m: Mesure[]): { x: number; y: number } {
  const [p1, p2, p3] = m
  const a11 = 2 * (p2.borne.x - p1.borne.x)
  const a12 = 2 * (p2.borne.y - p1.borne.y)
  const a21 = 2 * (p3.borne.x - p1.borne.x)
  const a22 = 2 * (p3.borne.y - p1.borne.y)
  const sq = (p: Mesure) => p.borne.x * p.borne.x + p.borne.y * p.borne.y
  const b1 = p1.h * p1.h - p2.h * p2.h + sq(p2) - sq(p1)
  const b2 = p1.h * p1.h - p3.h * p3.h + sq(p3) - sq(p1)
  const det = a11 * a22 - a12 * a21
  if (Math.abs(det) < 1e-9) {
    return { x: (p1.borne.x + p2.borne.x + p3.borne.x) / 3, y: (p1.borne.y + p2.borne.y + p3.borne.y) / 3 }
  }
  return { x: (b1 * a22 - a12 * b2) / det, y: (a11 * b2 - b1 * a21) / det }
}

/** Least squares (Gauss-Newton) on the horizontal distances, from the direct solution. */
function moindresCarres(m: Mesure[]): { x: number; y: number } {
  let { x, y } = solutionDirecte(m)
  for (let it = 0; it < 50; it++) {
    let n11 = 0
    let n12 = 0
    let n22 = 0
    let g1 = 0
    let g2 = 0
    for (const p of m) {
      const dx = x - p.borne.x
      const dy = y - p.borne.y
      const d = Math.hypot(dx, dy)
      if (d === 0) continue
      const jx = dx / d
      const jy = dy / d
      const res = d - p.h
      n11 += jx * jx
      n12 += jx * jy
      n22 += jy * jy
      g1 += jx * res
      g2 += jy * res
    }
    const det = n11 * n22 - n12 * n12
    if (!(Math.abs(det) > 1e-15)) break
    const sx = (n22 * g1 - n12 * g2) / det
    const sy = (n11 * g2 - n12 * g1) / det
    x -= sx
    y -= sy
    if (Math.hypot(sx, sy) < 1e-10) break
  }
  return { x, y }
}

function position(m: Mesure[]): ResultatPosition {
  const { x, y } = moindresCarres(m)
  let ecartPosition = 0
  let somme = 0
  let poids = 0
  let zmin = Infinity
  let zmax = -Infinity
  const altitudesParBorne: Record<string, number> = {}
  for (const p of m) {
    ecartPosition = Math.max(ecartPosition, Math.abs(Math.hypot(x - p.borne.x, y - p.borne.y) - p.h))
    const w = 1 / (p.h * p.h)
    somme += w * p.zs
    poids += w
    zmin = Math.min(zmin, p.zs)
    zmax = Math.max(zmax, p.zs)
    altitudesParBorne[p.borne.id] = p.zs
  }
  return {
    x,
    y,
    z: somme / poids,
    altitudesParBorne,
    ecartAltitude: zmax - zmin,
    ecartPosition,
    indice: indiceGeometrie(x, y, m.map((p) => p.borne)),
  }
}

function mediane(v: number[]): number {
  const s = [...v].sort((a, b) => a - b)
  const k = Math.floor(s.length / 2)
  return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2
}

export function calculerStation(
  bornes: BorneConnue[],
  visees: Visee[],
  hi: number,
  ht: number,
  r: Reglages,
): ResultatStation {
  const parId = new Map(bornes.map((b) => [b.id, b]))
  const mesures: Mesure[] = []
  const visees_ok = new Set<string>()
  for (const v of visees) {
    const b = parId.get(v.borneId)
    if (!b || v.pasVisible || v.distance === null || v.pente === null) continue
    if (!Number.isFinite(v.distance) || !Number.isFinite(v.pente) || v.distance <= 0) continue
    if (visees_ok.has(b.id)) continue
    visees_ok.add(b.id)
    mesures.push({
      borne: b,
      distance: v.distance,
      pente: v.pente,
      h: horizontale(v.distance, v.pente),
      zs: altitudeDepuis(b.z, v.distance, v.pente, hi, ht),
    })
  }
  const bornesManquantes = bornes.filter((b) => !visees_ok.has(b.id)).map((b) => b.id)
  const rangMax = mesures.reduce<0 | 1 | 2>((m, p) => (p.borne.rang > m ? p.borne.rang : m), 0)
  const viseesLongues = mesures
    .filter((p) => couleurDe(p.distance, r.distanceVisee) !== 'vert')
    .map((p) => p.borne.id)

  if (mesures.length < 3) {
    return {
      calculee: false,
      incomplete: true,
      bornesManquantes,
      viseesLongues,
      rangMax,
      reportee: rangMax === 2,
      propositionEphemere: true,
      messages: [MESSAGES.stationEnAttente, MESSAGES.ajouterEphemere],
    }
  }

  const res = position(mesures)
  const couleurs: Partial<Record<CleStation, Couleur>> = {
    ecartPosition: couleurDe(res.ecartPosition, r.ecartPositionStation),
    ecartAltitude: couleurDe(res.ecartAltitude, r.ecartAltitudeStation),
    indice: couleurDe(res.indice, r.indice),
    distance: pire(...mesures.map((p) => couleurDe(p.distance, r.distanceVisee))),
  }
  const couleur = pire(...(Object.values(couleurs) as Couleur[]))
  const messages: string[] = []

  // Too close to a target (section 8)
  const tropPres = bornes.some((b) => Math.hypot(res.x - b.x, res.y - b.y) < 1) || mesures.some((p) => p.h < 1)
  if (tropPres) messages.push(MESSAGES.tropPres)

  // Suspicious sight: only when a reading is in doubt (position or altitude deviation not green)
  let viseeSuspecte: string | null = null
  let messageSuspect: string | null = null
  let sansSuspecte: ResultatPosition | null = null
  let retraits: Record<string, { ecartPosition: number; ecartAltitude: number }> | undefined
  const doute = couleurs.ecartPosition !== 'vert' || couleurs.ecartAltitude !== 'vert'
  if (doute) {
    if (mesures.length === 3) {
      if (couleurs.ecartAltitude === 'vert') {
        messageSuspect = MESSAGES.refaireTroisVisees
      } else {
        const med = mediane(mesures.map((p) => p.zs))
        let loin = mesures[0]
        for (const p of mesures) if (Math.abs(p.zs - med) > Math.abs(loin.zs - med)) loin = p
        viseeSuspecte = loin.borne.id
        messageSuspect = MESSAGES.refaireVisee.replace('X', loin.borne.lettre)
      }
    } else {
      retraits = {}
      let meilleur: { id: string; lettre: string; r: ResultatPosition } | null = null
      for (const p of mesures) {
        const rr = position(mesures.filter((q) => q !== p))
        retraits[p.borne.id] = { ecartPosition: rr.ecartPosition, ecartAltitude: rr.ecartAltitude }
        if (
          !meilleur ||
          rr.ecartPosition < meilleur.r.ecartPosition ||
          (rr.ecartPosition === meilleur.r.ecartPosition && rr.ecartAltitude < meilleur.r.ecartAltitude)
        ) {
          meilleur = { id: p.borne.id, lettre: p.borne.lettre, r: rr }
        }
      }
      if (meilleur) {
        viseeSuspecte = meilleur.id
        sansSuspecte = meilleur.r
        messageSuspect = MESSAGES.refaireVisee.replace('X', meilleur.lettre)
      }
    }
    if (messageSuspect) messages.push(messageSuspect)
  }
  if (rangMax === 2) messages.push(MESSAGES.reportee)

  return {
    ...res,
    calculee: true,
    incomplete: false,
    bornesManquantes,
    couleur,
    couleurs,
    viseeSuspecte,
    messageSuspect,
    sansSuspecte,
    retraits,
    tropPres,
    viseesLongues,
    rangMax,
    reportee: rangMax === 2,
    propositionEphemere: false,
    messages,
  }
}
