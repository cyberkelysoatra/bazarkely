// Whole relevé recalculated from the raw inputs (D30): calibration, every target, every station in
// number order, points of the contour lines (rule 6.5). Pure function, uses only calcul/.
import { REGLAGES_DEFAUT, calculerStation, calerBornes, calerCote, etiquetteBorne } from '../calcul'
import type { BorneConnue, Couleur, EntreeCote, Lecture, Point3, PointCote, Reglages, ResultatCalage, ResultatCote, ResultatPosition, ResultatStation, Seuil, Visee } from '../calcul'
import type { DonneesBorne, DonneesCote, DonneesStation, EnteteReleve, EtatCalage, LectureCote, Objet, ObjetBorne, ObjetCote, ObjetStation } from '../db/types'

export interface BorneCalculee {
  id: string
  donnees: DonneesBorne
  /** Computed position (calibration, plan values when skipped, or origin station), null when unknown. */
  position: Point3 | null
  /** « A, Borne ouest » ; with the usage number when the letter was used more than once: « D (2), Angle sud du parking ». */
  etiquette: string
  active: boolean
}

export interface StationCalculee {
  id: string
  numero: string
  donnees: DonneesStation
  /** Result of every sight. */
  resultat: ResultatStation
  /** Result without the set-aside sight (sans_visee), null when not set. */
  resultatSans: ResultatStation | null
  /** Position kept for this station: the result without the set-aside sight when sans_visee, else the result. */
  retenu: ResultatPosition | null
  couleur: Couleur | null
  /** Fewer than 3 usable sights (D22), never for a station set aside. */
  incomplete: boolean
}

export interface CotesCalcules {
  ab: ResultatCote | null
  bc: ResultatCote | null
  ac: ResultatCote | null
}

export interface ReleveCalcule {
  reglages: Reglages
  cotes: CotesCalcules
  /** Calibration result when the three sides have readings, else null. */
  calage: ResultatCalage | null
  etatCalage: EtatCalage
  /** Colour of the calibration (null when not computed, or skipped). */
  couleurCalage: Couleur | null
  orientation: ResultatCalage['orientation'] | null
  mentionOrientation: string | null
  /** Principal targets by role (ordre 1, 2, 3). */
  principales: { a: BorneCalculee | null; b: BorneCalculee | null; c: BorneCalculee | null }
  /** Every target, active and withdrawn: principal ones first (by ordre), then ephemeral ones by letter and usage. */
  bornes: BorneCalculee[]
  /** Every station in number order. */
  stations: StationCalculee[]
  /** Points of rule 6.5, one per position. */
  pointsCourbes: PointCote[]
  /** D22: stations waiting for a target. */
  stationsIncompletes: number
  /** Next station number (« S01 » when none). */
  prochainNumero: string
  /** Step where the operator stands: 1 Bornes, 2 Calage, 3 Stations. */
  etape: 1 | 2 | 3
}

function fusionSeuil(a: Seuil, b: Seuil | undefined): Seuil {
  return b ? { ...a, ...b } : a
}

/** Default settings of the phone, then the settings of the relevé (key by key, thresholds merged). */
export function reglagesEffectifs(defaut: Reglages, partiel: Partial<Reglages> | undefined): Reglages {
  const r: Reglages = { ...defaut }
  if (!partiel) return r
  for (const [k, v] of Object.entries(partiel) as [keyof Reglages, unknown][]) {
    if (v === undefined || v === null) continue
    if (typeof v === 'number') {
      if (Number.isFinite(v)) (r as unknown as Record<string, unknown>)[k] = v
    } else if (typeof v === 'object') {
      ;(r as unknown as Record<string, unknown>)[k] = fusionSeuil(defaut[k] as Seuil, v as Seuil)
    }
  }
  return r
}

const ordreNumero = (n: string) => {
  const m = /(\d+)/.exec(n)
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER
}

const nombre = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** Side between two targets p -> q, whatever the direction it was entered in. */
function entreeCote(cotes: ObjetCote[], p: string, q: string, hi: number, ht: number): EntreeCote | null {
  const c = cotes.filter((o) => (o.donnees.de === p && o.donnees.vers === q) || (o.donnees.de === q && o.donnees.vers === p)).sort((a, b) => a.maj_at.localeCompare(b.maj_at)).pop()
  if (!c) return null
  const d: DonneesCote = c.donnees
  const direct = d.de === p
  const lectures: Lecture[] = (d.lectures ?? [])
    .filter((l): l is LectureCote & { distance: number; pente: number } => nombre(l.distance) && l.distance > 0 && nombre(l.pente))
    .map((l) => ({ distance: l.distance, pente: l.pente, sens: direct ? l.sens : l.sens === 'aller' ? 'retour' : 'aller' }))
  if (!lectures.length) return null
  const dec = d.decametre
  const decametre = dec ? (direct ? { aller: dec.aller, retour: dec.retour } : { aller: dec.retour, retour: dec.aller }) : null
  return { lectures, decametre, hi, ht }
}

function positionPlan(b: DonneesBorne): Point3 | null {
  const p = b.plan
  return p && nombre(p.x) && nombre(p.y) && nombre(p.z) ? { x: p.x, y: p.y, z: p.z } : null
}

function positionDe(r: Point3 | ResultatPosition | ResultatStation | null | undefined): Point3 | null {
  return r && nombre(r.x) && nombre(r.y) && nombre(r.z) ? { x: r.x, y: r.y, z: r.z } : null
}

function enPosition(r: ResultatStation | null): ResultatPosition | null {
  if (!r || !r.calculee || !nombre(r.x) || !nombre(r.y) || !nombre(r.z)) return null
  return { x: r.x, y: r.y, z: r.z, altitudesParBorne: r.altitudesParBorne ?? {}, ecartAltitude: r.ecartAltitude ?? 0, ecartPosition: r.ecartPosition ?? 0, indice: r.indice ?? 0 }
}

export function calculerReleve(entete: EnteteReleve, objets: Objet[], reglagesDefaut: Reglages = REGLAGES_DEFAUT): ReleveCalcule {
  const reglages = reglagesEffectifs(reglagesDefaut, entete.reglages)
  const vivants = objets.filter((o) => !o.supprime)
  const bornesObj = vivants.filter((o): o is ObjetBorne => o.type === 'borne')
  const cotesObj = vivants.filter((o): o is ObjetCote => o.type === 'cote')
  const stationsObj = vivants.filter((o): o is ObjetStation => o.type === 'station').sort((a, b) => ordreNumero(a.donnees.numero) - ordreNumero(b.donnees.numero) || a.saisi_at.localeCompare(b.saisi_at))
  const hi = nombre(entete.hi) ? entete.hi : 1.5
  const ht = nombre(entete.ht) ? entete.ht : 1.5

  const principalesObj = bornesObj.filter((b) => b.donnees.type === 'principale')
  const role = (o: 1 | 2 | 3) => principalesObj.find((b) => b.donnees.ordre === o) ?? null
  const [pa, pb, pc] = [role(1), role(2), role(3)]

  // ---- sides and calibration (6.2, 6.3)
  const ei = {
    ab: pa && pb ? entreeCote(cotesObj, pa.id, pb.id, hi, ht) : null,
    bc: pb && pc ? entreeCote(cotesObj, pb.id, pc.id, hi, ht) : null,
    ac: pa && pc ? entreeCote(cotesObj, pa.id, pc.id, hi, ht) : null,
  }
  const cotes: CotesCalcules = {
    ab: ei.ab ? calerCote(ei.ab, reglages) : null,
    bc: ei.bc ? calerCote(ei.bc, reglages) : null,
    ac: ei.ac ? calerCote(ei.ac, reglages) : null,
  }
  const etatCalage: EtatCalage = entete.calage?.etat ?? 'a_faire'
  const declinaison = nombre(entete.orientation?.declinaison) ? entete.orientation.declinaison : reglages.declinaison
  let calage: ResultatCalage | null = null
  if (pa && pb && pc && cotes.ab && cotes.bc && cotes.ac) {
    calage = calerBornes({
      ab: cotes.ab,
      bc: cotes.bc,
      ac: cotes.ac,
      plan: { a: pa.donnees.plan, b: pb.donnees.plan, c: pc.donnees.plan },
      capLu: entete.orientation?.cap_lu ?? null,
      coteC: entete.cote_c ?? null,
      reglages: { ...reglages, declinaison },
      lettres: { a: pa.donnees.lettre, b: pb.donnees.lettre, c: pc.donnees.lettre },
    })
  }

  const positions = new Map<string, Point3>()
  if (etatCalage === 'saute') {
    for (const b of principalesObj) {
      const p = b.donnees.verifiee ? positionPlan(b.donnees) : null
      if (p) positions.set(b.id, p)
    }
  } else if (calage && calage.ok) {
    const cles: [ObjetBorne | null, Point3][] = [
      [pa, calage.bornes.a],
      [pb, calage.bornes.b],
      [pc, calage.bornes.c],
    ]
    for (const [b, p] of cles) if (b && positionDe(p)) positions.set(b.id, { x: p.x, y: p.y, z: p.z })
  }

  // ---- stations (6.4), ephemeral targets after their origin station (6.7)
  const ephemeres = bornesObj.filter((b) => b.donnees.type === 'ephemere')
  const parOrigine = new Map<string, ObjetBorne[]>()
  for (const b of ephemeres) {
    const s = b.donnees.station_origine
    if (s) parOrigine.set(s, [...(parOrigine.get(s) ?? []), b])
  }
  const parId = new Map(bornesObj.map((b) => [b.id, b]))
  const resultats = new Map<string, { resultat: ResultatStation; resultatSans: ResultatStation | null }>()
  const enAttente = new Set(stationsObj.map((s) => s.id))

  const viseesDe = (s: DonneesStation, sauf: string | null): Visee[] =>
    (s.visees ?? []).filter((v) => v.borne_id !== sauf).map((v) => ({ borneId: v.borne_id, distance: v.distance, pente: v.pente, pasVisible: v.pas_visible }))

  const connues = (s: DonneesStation): BorneConnue[] => {
    const visees = new Set((s.visees ?? []).map((v) => v.borne_id))
    const out: BorneConnue[] = []
    for (const b of bornesObj) {
      const p = positions.get(b.id)
      if (!p) continue
      // Active targets, plus the withdrawn ones this station sights (its results stay attached to them).
      if (b.donnees.etat !== 'active' && !visees.has(b.id)) continue
      out.push({ id: b.id, lettre: b.donnees.lettre, x: p.x, y: p.y, z: p.z, rang: b.donnees.rang })
    }
    return out
  }

  const calculer = (s: ObjetStation) => {
    const bornes = connues(s.donnees)
    const resultat = calculerStation(bornes, viseesDe(s.donnees, null), hi, ht, reglages)
    const sans = s.donnees.sans_visee
    const resultatSans = sans ? calculerStation(bornes, viseesDe(s.donnees, sans), hi, ht, reglages) : null
    resultats.set(s.id, { resultat, resultatSans })
    enAttente.delete(s.id)
    const pos = positionDe(sans ? resultatSans : resultat)
    for (const b of parOrigine.get(s.id) ?? []) if (pos) positions.set(b.id, pos)
  }

  /** A sighted ephemeral target whose origin station is not computed yet. */
  const attendUneBorne = (s: ObjetStation) =>
    (s.donnees.visees ?? []).some((v) => {
      if (v.pas_visible || v.distance === null || v.pente === null) return false
      const b = parId.get(v.borne_id)
      if (!b || b.donnees.type !== 'ephemere' || positions.has(b.id)) return false
      const origine = b.donnees.station_origine
      return !!origine && origine !== s.id && enAttente.has(origine)
    })

  let avance = true
  while (avance && enAttente.size) {
    avance = false
    for (const s of stationsObj) {
      if (!enAttente.has(s.id) || attendUneBorne(s)) continue
      calculer(s)
      avance = true
    }
  }
  for (const s of stationsObj) if (enAttente.has(s.id)) calculer(s)

  const stations: StationCalculee[] = stationsObj.map((s) => {
    const { resultat, resultatSans } = resultats.get(s.id)!
    const retenu = enPosition(s.donnees.sans_visee ? resultatSans : resultat)
    return {
      id: s.id,
      numero: s.donnees.numero,
      donnees: s.donnees,
      resultat,
      resultatSans,
      retenu,
      couleur: resultat.calculee ? (resultat.couleur ?? null) : null,
      incomplete: s.donnees.etat !== 'ecartee' && resultat.incomplete,
    }
  })

  // ---- targets with labels
  const usagesParLettre = new Map<string, number>()
  for (const b of bornesObj) usagesParLettre.set(b.donnees.lettre, Math.max(usagesParLettre.get(b.donnees.lettre) ?? 0, b.donnees.usage))
  const calculee = (b: ObjetBorne): BorneCalculee => ({
    id: b.id,
    donnees: b.donnees,
    position: positions.get(b.id) ?? null,
    etiquette: etiquetteBorne({ lettre: b.donnees.lettre, usage: b.donnees.usage, nom: b.donnees.nom, etat: b.donnees.etat }, (usagesParLettre.get(b.donnees.lettre) ?? 1) > 1),
    active: b.donnees.etat === 'active',
  })
  const bornes = [
    ...principalesObj.sort((x, y) => (x.donnees.ordre ?? 9) - (y.donnees.ordre ?? 9)),
    ...ephemeres.sort((x, y) => x.donnees.lettre.localeCompare(y.donnees.lettre) || x.donnees.usage - y.donnees.usage),
  ].map(calculee)
  const parIdCalc = new Map(bornes.map((b) => [b.id, b]))

  // ---- points of the contour lines (6.5): targets first, so that an ephemeral target wins over its origin station
  const pointsCourbes: PointCote[] = []
  const vus = new Set<string>()
  const cle = (p: Point3) => `${Math.round(p.x * 1000)}|${Math.round(p.y * 1000)}`
  const ajouter = (id: string, p: Point3 | null) => {
    if (!p) return
    const k = cle(p)
    if (vus.has(k)) return
    vus.add(k)
    pointsCourbes.push({ id, x: p.x, y: p.y, z: p.z })
  }
  for (const b of bornes) ajouter(b.id, b.position)
  const origines = new Set(ephemeres.filter((b) => positions.has(b.id)).map((b) => b.donnees.station_origine))
  for (const s of stations) {
    if (s.donnees.etat === 'ecartee' || !s.resultat.calculee || origines.has(s.id)) continue
    const c = s.couleur
    const garde = c === 'vert' || c === 'orange' || (c === 'rouge' && s.donnees.etat === 'gardee')
    if (garde) ajouter(s.id, s.retenu)
  }

  // ---- step, counts
  const max = stationsObj.reduce((m, s) => Math.max(m, ordreNumero(s.donnees.numero) === Number.MAX_SAFE_INTEGER ? 0 : ordreNumero(s.donnees.numero)), 0)
  const prochainNumero = `S${String(max + 1).padStart(2, '0')}`
  const bornesSaisies = !!(pa && pb && pc) && [pa, pb, pc].every((b) => b!.donnees.nom.trim() !== '')
  const etape: 1 | 2 | 3 = etatCalage !== 'a_faire' ? 3 : bornesSaisies ? 2 : 1

  return {
    reglages,
    cotes,
    calage,
    etatCalage,
    couleurCalage: etatCalage === 'saute' ? null : (calage?.couleur ?? null),
    orientation: etatCalage === 'saute' ? 'plan' : (calage?.orientation ?? null),
    mentionOrientation: etatCalage === 'saute' ? null : (calage?.mentionOrientation ?? null),
    principales: { a: pa ? parIdCalc.get(pa.id)! : null, b: pb ? parIdCalc.get(pb.id)! : null, c: pc ? parIdCalc.get(pc.id)! : null },
    bornes,
    stations,
    pointsCourbes,
    stationsIncompletes: stations.filter((s) => s.incomplete).length,
    prochainNumero,
    etape,
  }
}
