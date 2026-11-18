// Plain data types of the releve-terrain calculation module.
// Lengths in metres, angles in degrees (slope positive upwards, headings
// counted clockwise from north, 0 to 360).

export type Couleur = 'vert' | 'orange' | 'rouge'

/** value > orange => orange, value > rouge => rouge (strictly greater, PRD 6.6). */
export interface Seuil {
  orange?: number
  rouge?: number
}

export interface Reglages {
  ecartPositionStation: Seuil
  ecartAltitudeStation: Seuil
  indice: Seuil
  distanceVisee: Seuil
  ecartDecaApp: Seuil
  ecartAllerRetour: Seuil
  fermeture: Seuil
  ecartAltitudePlan: Seuil
  ecartPositionPlan: Seuil
  ecartCap: Seuil
  /** Triangle cut-off for contour lines, 15 m by default, 5 to 100 m. */
  coupure: number
  /** Magnetic declination in degrees west, subtracted from the read heading. */
  declinaison: number
  /** Maximum geometry index for an ephemeral target (2.0). */
  indiceEphemere: number
}

// ---------- 6.2 calibration of one side ----------

/** 'aller' = read from the first target of the side towards the second. */
export interface Lecture {
  distance: number
  pente: number
  sens: 'aller' | 'retour'
}

export interface EntreeCote {
  lectures: Lecture[]
  decametre?: { aller?: number | null; retour?: number | null } | null
  hi: number
  ht: number
}

export interface ResultatCote {
  distanceRetenue: number
  distanceAppareil: number
  distanceDecametre: number | null
  ecartDecaApp: number | null
  biais: number | null
  ecartAllerRetour: number | null
  denivele: number
  couleur: Couleur
  /** Added: largest minus smallest read distance (tie-break of messageRouge). */
  dispersion?: number
  /** Added: colour of each graded value of the side. */
  couleurs?: Partial<Record<'ecartDecaApp' | 'ecartAllerRetour', Couleur>>
}

// ---------- 6.3 / 6.3 bis / 6.3 ter ----------

export interface Point3 {
  x: number
  y: number
  z: number
}

export interface ValeursPlan {
  x?: number | null
  y?: number | null
  z?: number | null
}

export interface EntreeCalage {
  ab: ResultatCote
  bc: ResultatCote
  ac: ResultatCote
  plan: { a?: ValeursPlan | null; b?: ValeursPlan | null; c?: ValeursPlan | null }
  capLu?: number | null
  coteC?: 'gauche' | 'droite' | null
  reglages: Reglages
  /** Real letters for the messages, default A, B, C. */
  lettres?: { a: string; b: string; c: string }
}

export type CleControle = 'positionB' | 'positionC' | 'altitudeB' | 'altitudeC' | 'cap'

export interface ResultatCalage {
  ok: boolean
  messages: string[]
  /** When ok is false because of incompatible sides or an unknown side of C, c.x and c.y are NaN. */
  bornes: { a: Point3; b: Point3; c: Point3 }
  fermeture: number
  couleurFermeture: Couleur
  angleMin: number
  orientation: 'plan' | 'nord_approximatif' | 'libre'
  capLu: number | null
  capCorrige: number | null
  declinaison: number
  controle: {
    positionB: number | null
    positionC: number | null
    altitudeB: number | null
    altitudeC: number | null
    directionPlan: number | null
    ecartCap: number | null
    couleurs: Partial<Record<CleControle, Couleur>>
    messages: string[]
  }
  couleur: Couleur
  messageRouge: string | null
  /** Added: 'nord approximatif' or 'orientation libre (axe A vers B)' (null when oriented by the plan). */
  mentionOrientation: string | null
  /** Added: side of C actually used. */
  coteCUtilise: 'gauche' | 'droite' | null
}

// ---------- 6.4 stations ----------

export interface BorneConnue {
  id: string
  lettre: string
  x: number
  y: number
  z: number
  rang: 0 | 1 | 2
}

export interface Visee {
  borneId: string
  distance: number | null
  pente: number | null
  pasVisible?: boolean
}

export interface ResultatPosition {
  x: number
  y: number
  z: number
  altitudesParBorne: Record<string, number>
  ecartAltitude: number
  ecartPosition: number
  indice: number
}

export type CleStation = 'ecartPosition' | 'ecartAltitude' | 'indice' | 'distance'

export interface ResultatStation extends Partial<ResultatPosition> {
  calculee: boolean
  /** Fewer than 3 usable sights: no calculation, station waiting. */
  incomplete: boolean
  bornesManquantes: string[]
  couleur?: Couleur
  couleurs?: Partial<Record<CleStation, Couleur>>
  /** Borne id, or null with 'Écart de position : refaire les 3 visées'. */
  viseeSuspecte?: string | null
  messageSuspect?: string | null
  /** 4 sights or more: result without the suspicious sight. */
  sansSuspecte?: ResultatPosition | null
  retraits?: Record<string, { ecartPosition: number; ecartAltitude: number }>
  tropPres?: boolean
  viseesLongues: string[]
  rangMax: 0 | 1 | 2
  reportee: boolean
  /** Added: H11, fewer than 3 targets -> propose « Ajouter une borne éphémère ». */
  propositionEphemere?: boolean
  /** Added: user messages of this station (fragile, suspect...). */
  messages?: string[]
}

// ---------- 6.5 contour lines ----------

export interface PointCote {
  id: string
  x: number
  y: number
  z: number
}

export interface Triangulation {
  points: PointCote[]
  triangles: [number, number, number][]
  /** gardes[i] true when triangle i is kept (no side strictly longer than the cut-off). */
  gardes: boolean[]
}

export interface Courbe {
  altitude: number
  majeure: boolean
  segments: [[number, number], [number, number]][]
}

// ---------- 6.9 letters ----------

export interface BorneEtiquette {
  lettre: string
  usage: number
  nom: string
  etat: 'active' | 'retiree'
}

/** Result of an input check (section 8). */
export type Validation = { ok: true } | { ok: false; message: string }
