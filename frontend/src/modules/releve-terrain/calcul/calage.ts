// PRD 6.2 (one side), 6.3 (main targets), 6.3 bis (orientation),
// 6.3 ter (control of the plan on the ground), plus heading helpers.
import { MESSAGES, couleurDe, pire, rangCouleur } from './seuils'
import type {
  CleControle,
  Couleur,
  EntreeCalage,
  EntreeCote,
  Point3,
  Reglages,
  ResultatCalage,
  ResultatCote,
  ValeursPlan,
} from './types'
import { deniveleVisee, enDegres, enRadians, horizontale } from './visee'

const moyenne = (v: number[]): number => v.reduce((s, x) => s + x, 0) / v.length

// ---------- headings ----------

/** Heading brought back into [0 ; 360[. */
export function normaliserCap(deg: number): number {
  const r = ((deg % 360) + 360) % 360
  return r === 360 ? 0 : r
}

/** Smallest angle between two headings, 0 to 180. */
export function ecartAngulaire(a: number, b: number): number {
  const d = normaliserCap(a - b)
  return d > 180 ? 360 - d : d
}

/** Circular mean (atan2 of mean sine and cosine); dispersion = largest ecartAngulaire to the mean. */
export function moyenneCaps(caps: number[]): { moyenne: number; dispersion: number } {
  if (caps.length === 0) return { moyenne: NaN, dispersion: NaN }
  const s = moyenne(caps.map((c) => Math.sin(enRadians(c))))
  const c = moyenne(caps.map((x) => Math.cos(enRadians(x))))
  const m = normaliserCap(enDegres(Math.atan2(s, c)))
  // Snap tiny floating residue (e.g. 359.9999999999) to the exact value.
  const moy = Math.abs(m - 360) < 1e-9 ? 0 : m
  let dispersion = 0
  for (const cap of caps) dispersion = Math.max(dispersion, ecartAngulaire(cap, moy))
  return { moyenne: moy, dispersion }
}

/** Heading of the vector (dx east, dy north), 0 = north, clockwise. */
export function capVecteur(dx: number, dy: number): number {
  return normaliserCap(enDegres(Math.atan2(dx, dy)))
}

// ---------- 6.2 one side ----------

/**
 * Calibration of one side. 'aller' readings go from the first target of the
 * side to the second; a 'retour' reading changes sign for the elevation.
 * Per reading, elevation first -> second = V + hi - ht (consistent with 6.1:
 * Zs = ZB + ht - hi - V); zero extra term when hi = ht.
 */
export function calerCote(e: EntreeCote, r: Reglages): ResultatCote {
  const lectures = e.lectures
  const distances = lectures.map((l) => l.distance)
  const hs = lectures.map((l) => horizontale(l.distance, l.pente))
  const dzs = lectures.map((l) => {
    const dz = deniveleVisee(l.distance, l.pente) + e.hi - e.ht
    return l.sens === 'aller' ? dz : -dz
  })
  const pentesAller = lectures.map((l) => (l.sens === 'aller' ? l.pente : -l.pente))

  const distanceAppareil = moyenne(hs)
  const denivele = moyenne(dzs)
  const moyD = moyenne(distances)
  const dispersion = Math.max(...distances) - Math.min(...distances)

  const aller = e.decametre?.aller ?? null
  const retour = e.decametre?.retour ?? null
  const valeursDeca = [aller, retour].filter((v): v is number => typeof v === 'number' && Number.isFinite(v))

  let distanceDecametre: number | null = null
  let ecartDecaApp: number | null = null
  let biais: number | null = null
  let ecartAllerRetour: number | null = null
  if (valeursDeca.length > 0) {
    const moyDeca = moyenne(valeursDeca)
    distanceDecametre = moyDeca * Math.cos(enRadians(moyenne(pentesAller)))
    ecartDecaApp = distanceDecametre - distanceAppareil
    biais = moyD - moyDeca
    if (aller !== null && retour !== null) ecartAllerRetour = aller - retour
  }

  const couleurs: ResultatCote['couleurs'] = {}
  if (ecartDecaApp !== null) couleurs.ecartDecaApp = couleurDe(ecartDecaApp, r.ecartDecaApp)
  if (ecartAllerRetour !== null) couleurs.ecartAllerRetour = couleurDe(ecartAllerRetour, r.ecartAllerRetour)

  return {
    distanceRetenue: distanceDecametre ?? distanceAppareil,
    distanceAppareil,
    distanceDecametre,
    ecartDecaApp,
    biais,
    ecartAllerRetour,
    denivele,
    couleur: pire(...Object.values(couleurs)),
    dispersion,
    couleurs,
  }
}

/**
 * 6.2 display-mode check: true when, on at least 2 sides measured with the
 * tape, |mean D - H_tape| < |mean D - mean tape|.
 */
export function modeAffichageSuspect(cotes: EntreeCote[]): boolean {
  let n = 0
  for (const e of cotes) {
    const valeurs = [e.decametre?.aller ?? null, e.decametre?.retour ?? null].filter(
      (v): v is number => typeof v === 'number' && Number.isFinite(v),
    )
    if (valeurs.length === 0 || e.lectures.length === 0) continue
    const moyD = moyenne(e.lectures.map((l) => l.distance))
    const moyDeca = moyenne(valeurs)
    const pentes = e.lectures.map((l) => (l.sens === 'aller' ? l.pente : -l.pente))
    const hDeca = moyDeca * Math.cos(enRadians(moyenne(pentes)))
    if (Math.abs(moyD - hDeca) < Math.abs(moyD - moyDeca)) n++
  }
  return n >= 2
}

// ---------- 6.3 / 6.3 bis / 6.3 ter ----------

const aXY = (p: ValeursPlan | null | undefined): p is { x: number; y: number; z?: number | null } =>
  !!p && typeof p.x === 'number' && typeof p.y === 'number' && Number.isFinite(p.x) && Number.isFinite(p.y)

const aZ = (p: ValeursPlan | null | undefined): p is { z: number } =>
  !!p && typeof p.z === 'number' && Number.isFinite(p.z)

/** Smallest angle of the triangle of sides a, b, c (degrees); 0 when impossible. */
export function angleMinTriangle(a: number, b: number, c: number): number {
  const angle = (opp: number, s1: number, s2: number) =>
    enDegres(Math.acos(Math.max(-1, Math.min(1, (s1 * s1 + s2 * s2 - opp * opp) / (2 * s1 * s2)))))
  if (!(a > 0 && b > 0 && c > 0)) return 0
  if (a > b + c || b > a + c || c > a + b) return 0
  return Math.min(angle(a, b, c), angle(b, a, c), angle(c, a, b))
}

export function calerBornes(e: EntreeCalage): ResultatCalage {
  const r = e.reglages
  const L = e.lettres ?? { a: 'A', b: 'B', c: 'C' }
  const messages: string[] = []
  const dAB = e.ab.distanceRetenue
  const dBC = e.bc.distanceRetenue
  const dAC = e.ac.distanceRetenue
  const dz12 = e.ab.denivele
  const dz23 = e.bc.denivele
  const dz13 = e.ac.denivele

  const incompatibles =
    !(dAB > 0 && dBC > 0 && dAC > 0) || dAC > dAB + dBC || dAB > dAC + dBC || dBC > dAB + dAC
  const angleMin = incompatibles ? 0 : angleMinTriangle(dAB, dBC, dAC)
  const alignees = !incompatibles && angleMin < 15

  const pa = e.plan.a ?? null
  const pb = e.plan.b ?? null
  const pc = e.plan.c ?? null

  // A (6.3)
  const ax = aXY(pa) ? pa.x : 0
  const ay = aXY(pa) ? pa.y : 0
  const z1 = aZ(pa) ? pa.z : 100

  // Orientation (6.3 bis)
  const capLu = typeof e.capLu === 'number' && Number.isFinite(e.capLu) ? e.capLu : null
  const capCorrige = capLu === null ? null : normaliserCap(capLu - r.declinaison)
  let orientation: ResultatCalage['orientation']
  let ux: number
  let uy: number
  let directionPlan: number | null = null
  if (aXY(pa) && aXY(pb) && Math.hypot(pb.x - pa.x, pb.y - pa.y) > 0) {
    orientation = 'plan'
    const n = Math.hypot(pb.x - pa.x, pb.y - pa.y)
    ux = (pb.x - pa.x) / n
    uy = (pb.y - pa.y) / n
    directionPlan = capVecteur(pb.x - pa.x, pb.y - pa.y)
  } else if (capCorrige !== null) {
    orientation = 'nord_approximatif'
    ux = Math.sin(enRadians(capCorrige))
    uy = Math.cos(enRadians(capCorrige))
  } else {
    orientation = 'libre'
    ux = 1
    uy = 0
  }
  const mentionOrientation =
    orientation === 'nord_approximatif'
      ? MESSAGES.nordApproximatif
      : orientation === 'libre'
        ? `orientation libre (axe ${L.a} vers ${L.b})`
        : null

  // B
  const z2 = z1 + dz12
  const b: Point3 = { x: ax + dAB * ux, y: ay + dAB * uy, z: z2 }

  // Side of C: from the plan only when A, B and C all have X and Y
  let coteC: 'gauche' | 'droite' | null = null
  if (orientation === 'plan' && aXY(pa) && aXY(pb) && aXY(pc)) {
    const cross = (pb.x - pa.x) * (pc.y - pa.y) - (pb.y - pa.y) * (pc.x - pa.x)
    coteC = cross >= 0 ? 'gauche' : 'droite'
  } else if (e.coteC === 'gauche' || e.coteC === 'droite') {
    coteC = e.coteC
  }

  // C (circle intersection)
  const z3 = (z1 + dz13 + (z2 + dz23)) / 2
  let c: Point3 = { x: NaN, y: NaN, z: z3 }
  let ok = true
  if (incompatibles) {
    ok = false
    messages.push(MESSAGES.cotesIncompatibles)
  }
  if (coteC === null) {
    ok = false
    messages.push(`${L.c} à gauche ou à droite en regardant de ${L.a} vers ${L.b}`)
  }
  if (ok && coteC !== null) {
    const along = (dAC * dAC - dBC * dBC + dAB * dAB) / (2 * dAB)
    const h = Math.sqrt(Math.max(0, dAC * dAC - along * along))
    const s = coteC === 'gauche' ? 1 : -1
    c = { x: ax + along * ux + s * h * -uy, y: ay + along * uy + s * h * ux, z: z3 }
  }
  if (alignees) messages.push(MESSAGES.bornesAlignees)

  const fermeture = dz12 + dz23 - dz13
  const couleurFermeture = couleurDe(fermeture, r.fermeture)

  // Control of the plan (6.3 ter)
  const couleursCtrl: Partial<Record<CleControle, Couleur>> = {}
  const msgCtrl: string[] = []
  let positionB: number | null = null
  let positionC: number | null = null
  let altitudeB: number | null = null
  let altitudeC: number | null = null
  let ecartCap: number | null = null
  if (orientation === 'plan') {
    if (aXY(pb)) {
      positionB = Math.hypot(b.x - pb.x, b.y - pb.y)
      couleursCtrl.positionB = couleurDe(positionB, r.ecartPositionPlan)
    }
    if (aXY(pc) && Number.isFinite(c.x)) {
      positionC = Math.hypot(c.x - pc.x, c.y - pc.y)
      couleursCtrl.positionC = couleurDe(positionC, r.ecartPositionPlan)
    }
  }
  if (aZ(pa)) {
    if (aZ(pb)) {
      altitudeB = b.z - pb.z
      couleursCtrl.altitudeB = couleurDe(altitudeB, r.ecartAltitudePlan)
    }
    if (aZ(pc)) {
      altitudeC = c.z - pc.z
      couleursCtrl.altitudeC = couleurDe(altitudeC, r.ecartAltitudePlan)
    }
  }
  if (directionPlan !== null) {
    if (capCorrige !== null) {
      ecartCap = ecartAngulaire(capCorrige, directionPlan)
      couleursCtrl.cap = couleurDe(ecartCap, r.ecartCap)
    } else {
      msgCtrl.push(MESSAGES.capNonControle)
    }
  }
  const rougeB = couleursCtrl.positionB === 'rouge' || couleursCtrl.altitudeB === 'rouge'
  const rougeC = couleursCtrl.positionC === 'rouge' || couleursCtrl.altitudeC === 'rouge'
  const rougeCap = couleursCtrl.cap === 'rouge'
  if (rougeB || rougeC || rougeCap) msgCtrl.unshift(MESSAGES.planTerrain)
  messages.push(...msgCtrl)
  if (mentionOrientation) messages.push(mentionOrientation)
  if (!aZ(pa)) messages.push(MESSAGES.altitudesRelatives)

  const couleur = pire(
    e.ab.couleur,
    e.bc.couleur,
    e.ac.couleur,
    couleurFermeture,
    ...Object.values(couleursCtrl),
    alignees || !ok ? 'rouge' : 'vert',
  )

  // Message shown before « Continuer quand même » (H05)
  let messageRouge: string | null = null
  const cotes = [
    { nom: `${L.a} vers ${L.b}`, r: e.ab },
    { nom: `${L.b} vers ${L.c}`, r: e.bc },
    { nom: `${L.a} vers ${L.c}`, r: e.ac },
  ]
  if (incompatibles) {
    messageRouge = MESSAGES.cotesIncompatibles
  } else if (alignees) {
    messageRouge = MESSAGES.bornesAlignees
  } else if (cotes.some((x) => x.r.couleur === 'rouge') || couleurFermeture === 'rouge') {
    const pireCote = [...cotes].sort((p, q) => {
      const dc = rangCouleur(q.r.couleur) - rangCouleur(p.r.couleur)
      if (dc !== 0) return dc
      const de = Math.abs(q.r.ecartDecaApp ?? 0) - Math.abs(p.r.ecartDecaApp ?? 0)
      if (de !== 0) return de
      return (q.r.dispersion ?? 0) - (p.r.dispersion ?? 0)
    })[0]
    messageRouge = MESSAGES.calageHorsTolerance.replace('côté X', `côté ${pireCote.nom}`)
  } else if (rougeB || rougeC || rougeCap) {
    const qui = rougeB && rougeC ? `${L.b} et ${L.c}` : rougeB ? L.b : rougeC ? L.c : `${L.a} ou ${L.b}`
    messageRouge = MESSAGES.planTerrainVerifier.replace('borne X', `borne ${qui}`)
  }

  return {
    ok,
    messages,
    bornes: { a: { x: ax, y: ay, z: z1 }, b, c },
    fermeture,
    couleurFermeture,
    angleMin,
    orientation,
    capLu,
    capCorrige,
    declinaison: r.declinaison,
    controle: {
      positionB,
      positionC,
      altitudeB,
      altitudeC,
      directionPlan,
      ecartCap,
      couleurs: couleursCtrl,
      messages: msgCtrl,
    },
    couleur,
    messageRouge,
    mentionOrientation,
    coteCUtilise: coteC,
  }
}
