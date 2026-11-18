// Data contract of the "Relevé terrain" module, schema 1 (SCHEMA-STRUCTURE.md section 5, D30).
// Raw inputs only: every result (positions, altitudes, colours, contour lines) is recalculated on the
// phone with calcul/. Same shape on the phone (Dexie) and on the server (rt_releves.entete,
// rt_objets.donnees).
import type { Reglages } from '../calcul'

/** D32: every row carries its sending state. */
export type Envoi = 'a_envoyer' | 'envoye'

export interface Domaine {
  id: string
  nom: string
  /** 'local' before the account (phase 3), then the account id. */
  proprietaire: string
  a_moi: boolean
  cree_at: string
  maj_at: string
  supprime_at: string | null
  envoi: Envoi
}

export interface Chantier {
  id: string
  domaine_id: string
  nom: string
  cree_at: string
  maj_at: string
  supprime_at: string | null
  envoi: Envoi
}

export type EtatCalage = 'a_faire' | 'valide' | 'force' | 'saute'

export interface EnteteReleve {
  schema: 1
  nom: string
  /** AAAA-MM-JJ, day in Madagascar time. */
  date: string
  operateurs: string
  /** Height of the instrument (m). */
  hi: number
  /** Height of the targets (m). */
  ht: number
  /** Modified thresholds, cut-off, declination: keys of Reglages from calcul/. */
  reglages: Partial<Reglages>
  orientation: {
    cap_lu: number | null
    source: 'boussole' | 'saisi' | null
    /** Declination applied when the heading was read (6.3 bis). */
    declinaison: number | null
  }
  cote_c: 'gauche' | 'droite' | null
  calage: { etat: EtatCalage; le: string | null }
}

/** Phase 3 states of the input lock. */
export type Saisie = 'ici' | 'ailleurs' | 'libre' | 'fin_en_attente' | 'reprise' | 'lecture'

export interface Releve {
  id: string
  chantier_id: string
  nom: string
  entete: EnteteReleve
  /** 'local' before the account, then the account id. */
  cree_par: string
  cree_at: string
  maj_at: string
  ouvert_at: string | null
  /** +1 at every write from a screen. */
  rev: number
  supprime_at: string | null
  envoi: Envoi
  /** Phase 3. */
  saisie: Saisie | null
  /** Phase 3. */
  terminer_demande: boolean | null
  /** Phase 3: relevé accepted by the server. */
  serveur_connu: boolean
}

export interface ValeursPlanBorne {
  x: number | null
  y: number | null
  z: number | null
}

export interface DonneesBorne {
  lettre: string
  usage: number
  nom: string
  type: 'principale' | 'ephemere'
  /** Role of the principal targets: 1 = A of the rules (the origin), 2 = B, 3 = C; null for an ephemeral one. */
  ordre: 1 | 2 | 3 | null
  rang: 0 | 1 | 2
  /** Values copied from the site plan, each number may be null. */
  plan: ValeursPlanBorne | null
  verifiee: boolean
  station_origine: string | null
  etat: 'active' | 'retiree'
  retiree_le: string | null
}

export interface LectureCote {
  /** null while the reading is being typed (distance typed, slope not yet). */
  distance: number | null
  pente: number | null
  sens: 'aller' | 'retour'
}

export interface DonneesCote {
  /** Target id. */
  de: string
  /** Target id. */
  vers: string
  lectures: LectureCote[]
  decametre: { aller: number | null; retour: number | null } | null
}

export interface HistoriqueVisee {
  distance: number | null
  pente: number | null
  remplace_le: string
}

export interface ViseeStation {
  borne_id: string
  distance: number | null
  pente: number | null
  pas_visible: boolean
  historique: HistoriqueVisee[]
}

export interface DonneesStation {
  /** 'S01', 'S02'... numbered by the app. */
  numero: string
  heure: string
  visees: ViseeStation[]
  etat: 'normale' | 'gardee' | 'ecartee'
  note: string | null
  /** Target whose sight is set aside (result without the suspect sight). */
  sans_visee: string | null
}

export interface DonneesPointPlan {
  nom: string
  x: number | null
  y: number | null
  z: number | null
}

export type ActionJournal =
  | 'calage_force'
  | 'calage_saute'
  | 'station_gardee'
  | 'station_ecartee'
  | 'borne_ephemere_creee'
  | 'borne_ephemere_retiree'
  | 'hauteurs_modifiees'
  | 'reglages_modifies'
  | 'saisie_prise'
  | 'saisie_terminee'

export interface DonneesJournal {
  action: ActionJournal
  detail: Record<string, unknown>
  le: string
}

export interface DonneesParType {
  borne: DonneesBorne
  cote: DonneesCote
  station: DonneesStation
  point_plan: DonneesPointPlan
  journal: DonneesJournal
}

export type TypeObjet = keyof DonneesParType

interface ObjetBase<T extends TypeObjet> {
  id: string
  releve_id: string
  type: T
  donnees: DonneesParType[T]
  supprime: boolean
  saisi_at: string
  maj_at: string
  /** Phase 3. */
  apres_reprise: boolean
  envoi: Envoi
}

export type ObjetBorne = ObjetBase<'borne'>
export type ObjetCote = ObjetBase<'cote'>
export type ObjetStation = ObjetBase<'station'>
export type ObjetPointPlan = ObjetBase<'point_plan'>
export type ObjetJournal = ObjetBase<'journal'>
export type Objet = ObjetBorne | ObjetCote | ObjetStation | ObjetPointPlan | ObjetJournal
export type ObjetDe<T extends TypeObjet> = ObjetBase<T>

/** Keys of the `cles` table. */
export interface ValeursCles {
  appareil: { id: string; libelle: string }
  dernier_releve: { releve_id: string; le: string }
  reglages_defaut: Partial<Reglages>
  /** Interval of the contour lines chosen on this phone (display preference, never sent). */
  vue_intervalle: number
}
export type NomCle = keyof ValeursCles

export interface LigneCle {
  cle: NomCle
  valeur: unknown
}

/** An object as written in a backup file (the local-only fields are optional). */
export type ObjetSauvegarde = {
  [T in TypeObjet]: { id: string; type: T; donnees: DonneesParType[T]; supprime?: boolean; saisi_at?: string; maj_at?: string }
}[TypeObjet]

/** Backup file `.releve.json`. */
export interface SauvegardeReleve {
  format: 'releve-terrain'
  schema: 1
  domaine: { nom: string }
  chantier: { nom: string }
  releve: { id: string; nom: string; entete: EnteteReleve; cree_at: string }
  objets: ObjetSauvegarde[]
}
