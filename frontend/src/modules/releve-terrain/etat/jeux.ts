// Games of the PRD section 11 (v0.10) as contract objects (entete and objets of a backup file).
// Used by the tests and by the development page /__essai?jeu=<lettre> (D29), never in production.
// Station numbers (the app numbers stations itself):
//   A, A3 relevé « Calage A » ; A2 « Calage A2 » (no X nor Y, cote_c « droite »)
//   B « Stations B » : S01 to S08 (targets « vérifiées », calibration skipped) ; D « Courbes D » (cut-off
//   100 m) and D2 « Courbes D2 » (cut-off 20 m) : same stations
//   C « Défauts C » : E1 = S01, E2 = S02, E4 = S03, E5 = S04
//   F « Stations B F G » : S01 to S08, E4 as S09, D created from S06, S10 to S13
//   G « Stations B F G » : state after F, D (1) withdrawn, D (2) « Angle sud du parking » created from S01
import type { DonneesBorne, DonneesStation, EnteteReleve, ObjetSauvegarde, SauvegardeReleve, ViseeStation } from '../db/types'

export type LettreJeu = 'A' | 'A2' | 'A3' | 'B' | 'C' | 'D' | 'D2' | 'F' | 'G'
export const LETTRES_JEUX: LettreJeu[] = ['A', 'A2', 'A3', 'B', 'C', 'D', 'D2', 'F', 'G']

/** Station numbers of each game, by name in the PRD. */
export const NUMEROS = {
  B: { S01: 'S01', S02: 'S02', S03: 'S03', S04: 'S04', S05: 'S05', S06: 'S06', S07: 'S07', S08: 'S08' },
  C: { E1: 'S01', E2: 'S02', E4: 'S03', E5: 'S04' },
  F: { E4: 'S09', S10: 'S10', S11: 'S11', S12: 'S12', S13: 'S13', origineD: 'S06' },
  G: { origineD2: 'S01' },
} as const

const JOUR = '2026-11-18'
const heure = (minute: number) => new Date(Date.UTC(2026, 10, 18, 5, minute)).toISOString()

/** Table of the targets (plan): origin A, X east, Y north. */
export const PLAN_BORNES = {
  A: { x: 0, y: 0, z: 38.11, nom: 'Borne ouest' },
  B: { x: 47.29, y: 22.67, z: 26.83, nom: 'Borne nord' },
  C: { x: 69.15, y: -17.32, z: 21.33, nom: 'Borne sud-est' },
}

function entete(nom: string, p: Partial<EnteteReleve> = {}): EnteteReleve {
  return {
    schema: 1,
    nom,
    date: JOUR,
    operateurs: 'Essai',
    hi: 1.5,
    ht: 1.5,
    reglages: {},
    orientation: { cap_lu: null, source: null, declinaison: null },
    cote_c: null,
    calage: { etat: 'a_faire', le: null },
    ...p,
  }
}

type Plan = 'complet' | 'sans_xy' | 'aucun'

function principale(lettre: 'A' | 'B' | 'C', ordre: 1 | 2 | 3, plan: Plan, verifiee: boolean, zC?: number): ObjetSauvegarde {
  const t = PLAN_BORNES[lettre]
  const z = lettre === 'C' && zC !== undefined ? zC : t.z
  const d: DonneesBorne = {
    lettre,
    usage: 1,
    nom: t.nom,
    type: 'principale',
    ordre,
    rang: 0,
    plan: plan === 'aucun' ? null : plan === 'sans_xy' ? { x: null, y: null, z } : { x: t.x, y: t.y, z },
    verifiee,
    station_origine: null,
    etat: 'active',
    retiree_le: null,
  }
  return { id: lettre, type: 'borne', donnees: d, saisi_at: heure(0) }
}

function bornesPrincipales(plan: Plan, verifiee: boolean, zC?: number): ObjetSauvegarde[] {
  return [principale('A', 1, plan, verifiee, zC), principale('B', 2, plan, verifiee, zC), principale('C', 3, plan, verifiee, zC)]
}

const aller = (distance: number, pente: number) => ({ distance, pente, sens: 'aller' as const })

/** Readings of game A: A vers B, B vers C, A vers C, then the measuring tape both ways. */
function cotesJeuA(): ObjetSauvegarde[] {
  return [
    { id: 'AB', type: 'cote', saisi_at: heure(1), donnees: { de: 'A', vers: 'B', lectures: [aller(53.64, -12.1), aller(53.67, -12.0), aller(53.62, -12.2)], decametre: { aller: 53.64, retour: 53.68 } } },
    { id: 'BC', type: 'cote', saisi_at: heure(2), donnees: { de: 'B', vers: 'C', lectures: [aller(45.93, -6.9), aller(45.88, -6.8), aller(45.92, -6.9)], decametre: { aller: 45.8, retour: 45.77 } } },
    { id: 'AC', type: 'cote', saisi_at: heure(3), donnees: { de: 'A', vers: 'C', lectures: [aller(73.28, -13.1), aller(73.23, -13.2), aller(73.19, -13.3)], decametre: { aller: 73.27, retour: 73.22 } } },
  ]
}

type Mesure = [number, number] | null

function station(numero: string, minute: number, v: Record<string, Mesure>, p: Partial<DonneesStation> = {}): ObjetSauvegarde {
  const visees: ViseeStation[] = Object.entries(v).map(([borne_id, m]) =>
    m === null ? { borne_id, distance: null, pente: null, pas_visible: true, historique: [] } : { borne_id, distance: m[0], pente: m[1], pas_visible: false, historique: [] },
  )
  return { id: numero, type: 'station', saisi_at: heure(minute), donnees: { numero, heure: heure(minute), visees, etat: 'normale', note: null, sans_visee: null, ...p } }
}

/** Game B: S01 to S08. */
const MESURES_B: Record<string, Record<string, Mesure>> = {
  S01: { A: [20.57, 13.6], B: [36.06, -10.3], C: [53.47, -12.9] },
  S02: { A: [31.26, 13.3], B: [25.05, -9.4], C: [46.07, -12.0] },
  S03: { A: [41.15, 13.6], B: [23.87, -3.9], C: [34.65, -11.9] },
  S04: { A: [46.99, 13.4], B: [30.76, -0.7], C: [26.55, -12.8] },
  S05: { A: [56.58, 13.6], B: [24.03, 4.7], C: [22.64, -8.9] },
  S06: { A: [37.94, 12.8], B: [16.53, -10.1], C: [45.79, -10.6] },
  S07: { A: [25.9, 13.5], B: [34.4, -8.7], C: [47.64, -13.0] },
  S08: { A: [52.04, 13.4], B: [14.94, 2.8], C: [32.1, -8.5] },
}

function stationsB(): ObjetSauvegarde[] {
  return Object.entries(MESURES_B).map(([n, v], i) => station(n, 10 + i, v))
}

const saute = (nom: string, reglages: EnteteReleve['reglages'] = {}) => entete(nom, { calage: { etat: 'saute', le: heure(5) }, reglages })

function journal(id: string, minute: number, action: 'calage_saute' | 'borne_ephemere_creee' | 'borne_ephemere_retiree', detail: Record<string, unknown>): ObjetSauvegarde {
  return { id, type: 'journal', saisi_at: heure(minute), donnees: { action, detail, le: heure(minute) } }
}

function sauvegarde(e: EnteteReleve, objets: ObjetSauvegarde[]): SauvegardeReleve {
  return {
    format: 'releve-terrain',
    schema: 1,
    domaine: { nom: 'Essai' },
    chantier: { nom: 'Jeux du PRD' },
    releve: { id: `jeu-${e.nom.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, nom: e.nom, entete: e, cree_at: heure(0) },
    objets,
  }
}

export function jeuA(): SauvegardeReleve {
  return sauvegarde(entete('Calage A', { orientation: { cap_lu: 74.4, source: 'saisi', declinaison: 10 } }), [...bornesPrincipales('complet', false), ...cotesJeuA()])
}

/** A2: no X nor Y, C on the right looking from A to B; `sans_cap`: no heading. */
export function jeuA2(variante: 'avec_cap' | 'sans_cap' = 'avec_cap'): SauvegardeReleve {
  const orientation: EnteteReleve['orientation'] = variante === 'sans_cap' ? { cap_lu: null, source: null, declinaison: null } : { cap_lu: 74.4, source: 'saisi', declinaison: 10 }
  return sauvegarde(entete('Calage A2', { orientation, cote_c: 'droite' }), [...bornesPrincipales('sans_xy', false), ...cotesJeuA()])
}

/** A3: heading 254,4 (plan and ground disagree), altitude of C on the plan 22,33, or no heading. */
export function jeuA3(variante: 'cap_inverse' | 'altitude_c' | 'sans_cap' = 'cap_inverse'): SauvegardeReleve {
  const cap = variante === 'cap_inverse' ? 254.4 : variante === 'altitude_c' ? 74.4 : null
  const orientation: EnteteReleve['orientation'] = cap === null ? { cap_lu: null, source: null, declinaison: null } : { cap_lu: cap, source: 'saisi', declinaison: 10 }
  return sauvegarde(entete('Calage A', { orientation }), [...bornesPrincipales('complet', false, variante === 'altitude_c' ? 22.33 : undefined), ...cotesJeuA()])
}

export function jeuB(): SauvegardeReleve {
  return sauvegarde(saute('Stations B'), [...bornesPrincipales('complet', true), journal('J1', 5, 'calage_saute', {}), ...stationsB()])
}

export function jeuD(): SauvegardeReleve {
  return sauvegarde(saute('Courbes D', { coupure: 100 }), [...bornesPrincipales('complet', true), journal('J1', 5, 'calage_saute', {}), ...stationsB()])
}

export function jeuD2(): SauvegardeReleve {
  return sauvegarde(saute('Courbes D2', { coupure: 20 }), [...bornesPrincipales('complet', true), journal('J1', 5, 'calage_saute', {}), ...stationsB()])
}

const MESURE_E4: Record<string, Mesure> = { A: [154.3, 13.6], B: [108.09, 13.3], C: [84.93, 13.2] }

export function jeuC(): SauvegardeReleve {
  return sauvegarde(saute('Défauts C'), [
    ...bornesPrincipales('complet', true),
    journal('J1', 5, 'calage_saute', {}),
    station('S01', 10, { A: [31.26, 13.3], B: [27.05, -9.4], C: [46.07, -12.0] }),
    station('S02', 11, { A: [31.26, 13.3], B: [25.05, -9.4], C: [46.07, -9.0] }),
    station('S03', 12, MESURE_E4),
    station('S04', 13, { A: [31.26, 13.3], B: [25.05, -9.4], C: null }),
  ])
}

function ephemere(id: string, usage: number, nom: string, origine: string, minute: number, etat: 'active' | 'retiree' = 'active', retireeLe: string | null = null): ObjetSauvegarde {
  const d: DonneesBorne = { lettre: 'D', usage, nom, type: 'ephemere', ordre: null, rang: 1, plan: null, verifiee: false, station_origine: origine, etat, retiree_le: retireeLe }
  return { id, type: 'borne', saisi_at: heure(minute), donnees: d }
}

function objetsF(): ObjetSauvegarde[] {
  return [
    ...bornesPrincipales('complet', true),
    journal('J1', 5, 'calage_saute', {}),
    ...stationsB(),
    station('S09', 20, MESURE_E4),
    ephemere('D1', 1, 'Piquet du manguier', 'S06', 21),
    journal('J2', 21, 'borne_ephemere_creee', { borne: 'D1', station: 'S06' }),
    station('S10', 22, { A: null, B: [13.3, 8.3], C: [32.75, -6.3], D1: [20.57, 13.6] }),
    station('S11', 23, { A: null, B: [8.02, -3.6], C: [40.79, -8.5], D1: [10.71, 12.9] }),
    station('S12', 24, { A: [57.82, 13.2], B: [13.3, 8.3], C: [32.75, -6.3], D1: [20.57, 13.6] }),
    station('S13', 25, { A: [57.82, 13.2], B: [13.3, 8.3], C: [34.75, -6.3], D1: [20.57, 13.6] }),
  ]
}

export function jeuF(): SauvegardeReleve {
  return sauvegarde(saute('Stations B F G'), objetsF())
}

export function jeuG(): SauvegardeReleve {
  const objets = objetsF().map((o) =>
    o.id === 'D1' && o.type === 'borne' ? { ...o, donnees: { ...o.donnees, etat: 'retiree' as const, retiree_le: heure(30) } } : o,
  )
  return sauvegarde(saute('Stations B F G'), [
    ...objets,
    journal('J3', 30, 'borne_ephemere_retiree', { borne: 'D1' }),
    ephemere('D2', 2, 'Angle sud du parking', 'S01', 31),
    journal('J4', 31, 'borne_ephemere_creee', { borne: 'D2', station: 'S01' }),
  ])
}

/** A game by its letter (« A », « A2 »...), with an optional variant (A2 : sans_cap ; A3 : cap_inverse, altitude_c, sans_cap). */
export function jeu(lettre: string, variante?: string | null): SauvegardeReleve | null {
  switch (lettre.toUpperCase()) {
    case 'A':
      return jeuA()
    case 'A2':
      return jeuA2(variante === 'sans_cap' ? 'sans_cap' : 'avec_cap')
    case 'A3':
      return jeuA3(variante === 'altitude_c' || variante === 'sans_cap' ? variante : 'cap_inverse')
    case 'B':
      return jeuB()
    case 'C':
      return jeuC()
    case 'D':
      return jeuD()
    case 'D2':
      return jeuD2()
    case 'F':
      return jeuF()
    case 'G':
      return jeuG()
    default:
      return null
  }
}
