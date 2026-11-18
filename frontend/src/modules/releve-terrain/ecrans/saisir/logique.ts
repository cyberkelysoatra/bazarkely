// Pure helpers of screen 8 (Saisir une station) and screen 9: rows of a station, writing a value with
// its history (H09), the « pas visible » repeated on 2 stations (H15), texts. No calculation here: every
// result comes from useReleve (calcule).
import { formaterNombre } from '../../composants/ChampNombre'
import type { BorneCalculee, StationCalculee } from '../../etat/releveCalcule'
import type { DonneesStation, ViseeStation } from '../../db/types'

/** Section 8: limits of a sight (screen texts). */
export const LIMITES_DISTANCE = { min: 0, minExclu: true, max: 1000, messageHorsLimites: 'Distance entre 0 et 1 000 m.', autoriserVide: true }
export const LIMITES_PENTE = { min: -90, max: 90, messageHorsLimites: 'Pente entre −90° et +90°.', autoriserVide: true }

export interface LigneVisee {
  borne: BorneCalculee
  visee: ViseeStation | null
  /** Label of the row: « A, Borne ouest » (usage number only when two rows share a letter). */
  libelle: string
}

/**
 * Rows of a station: every active target (principal and ephemeral), plus the withdrawn targets this
 * station sights (its readings stay attached to them), in letter order.
 */
export function lignesStation(bornes: BorneCalculee[], donnees: DonneesStation | null): LigneVisee[] {
  const parBorne = new Map((donnees?.visees ?? []).map((v) => [v.borne_id, v]))
  const retenues = bornes.filter((b) => b.active || parBorne.has(b.id))
  retenues.sort((a, b) => a.donnees.lettre.localeCompare(b.donnees.lettre) || a.donnees.usage - b.donnees.usage)
  const compte = new Map<string, number>()
  for (const b of retenues) compte.set(b.donnees.lettre, (compte.get(b.donnees.lettre) ?? 0) + 1)
  return retenues.map((b) => {
    const double = (compte.get(b.donnees.lettre) ?? 0) > 1
    const tete = double ? `${b.donnees.lettre} (${b.donnees.usage})` : b.donnees.lettre
    return { borne: b, visee: parBorne.get(b.id) ?? null, libelle: `${tete}, ${b.donnees.nom}${b.active ? '' : ', retirée'}` }
  })
}

/** A new station (created at the first value typed, never before). */
export function nouvelleStation(numero: string, heure: string): DonneesStation {
  return { numero, heure, visees: [], etat: 'normale', note: null, sans_visee: null }
}

const viseeVide = (borneId: string): ViseeStation => ({ borne_id: borneId, distance: null, pente: null, pas_visible: false, historique: [] })

/** True when the sight has a reading to keep (a number typed). */
export function viseeSaisie(v: ViseeStation | null | undefined): boolean {
  return !!v && (v.distance !== null || v.pente !== null)
}

/** The sight can serve the calculation (both numbers, not « pas visible »). */
export function viseeUtilisable(v: ViseeStation | null | undefined): boolean {
  return !!v && !v.pas_visible && v.distance !== null && v.pente !== null
}

export type Modification =
  | { champ: 'distance' | 'pente'; valeur: number | null }
  | { champ: 'pas_visible'; valeur: boolean }

/**
 * Applies one change to the sight towards a target. With `remplacement`, the old reading (distance and
 * slope) is first copied into `historique` (H09): it is never lost.
 */
export function modifierVisee(donnees: DonneesStation, borneId: string, m: Modification, remplacement: { le: string } | null): DonneesStation {
  const visees = [...donnees.visees]
  let i = visees.findIndex((v) => v.borne_id === borneId)
  if (i < 0) {
    visees.push(viseeVide(borneId))
    i = visees.length - 1
  }
  const ancienne = visees[i]
  const historique = remplacement && viseeSaisie(ancienne) ? [...ancienne.historique, { distance: ancienne.distance, pente: ancienne.pente, remplace_le: remplacement.le }] : [...ancienne.historique]
  let neuve: ViseeStation
  if (m.champ === 'pas_visible') {
    neuve = m.valeur ? { ...ancienne, historique, pas_visible: true, distance: null, pente: null } : { ...ancienne, historique, pas_visible: false }
  } else {
    neuve = { ...ancienne, historique, pas_visible: false, [m.champ]: m.valeur }
  }
  visees[i] = neuve
  return { ...donnees, visees }
}

/**
 * H09 / section 8: a complete reading (distance and slope) of a computed station is replaced only after
 * confirmation. Completing a half-typed sight, or a sight typed during the same input, asks nothing (the
 * caller keeps the targets typed since the station was opened).
 */
export function demandeRemplacement(station: StationCalculee | null, borneId: string): ViseeStation | null {
  if (!station || !station.resultat.calculee) return null
  const v = station.donnees.visees.find((x) => x.borne_id === borneId)
  return v && viseeUtilisable(v) ? v : null
}

/** « 35,40 m ; −8,7° » (a missing value: « vide »). */
export function texteLecture(v: { distance: number | null; pente: number | null }): string {
  const d = v.distance === null ? 'vide' : `${formaterNombre(v.distance, 2)} m`
  const p = v.pente === null ? 'vide' : `${formaterNombre(v.pente, 1)}°`
  return `${d} ; ${p}`
}

/** « Remplacer la visée vers B (35,40 m ; −8,7°) ? L'ancienne valeur reste dans l'historique. » */
export function texteRemplacement(lettre: string, v: ViseeStation): string {
  return `Remplacer la visée vers ${lettre} (${texteLecture(v)}) ? L'ancienne valeur reste dans l'historique.`
}

/** « Station incomplète : il manque la borne C. » / « ... il manque les bornes B et C. » */
export function texteManquantes(lettres: string[]): string {
  if (lettres.length === 0) return 'Station incomplète : il manque une visée.'
  if (lettres.length === 1) return `Station incomplète : il manque la borne ${lettres[0]}.`
  return `Station incomplète : il manque les bornes ${lettres.slice(0, -1).join(', ')} et ${lettres[lettres.length - 1]}.`
}

/** Letters of the rows that cannot serve the calculation (empty, half typed or « pas visible »). */
export function lettresManquantes(lignes: LigneVisee[]): string[] {
  return lignes.filter((l) => l.borne.active && !viseeUtilisable(l.visee)).map((l) => l.borne.donnees.lettre)
}

/**
 * H15: targets marked « pas visible » on this station AND on the station just before it (number order),
 * still active. Empty when none.
 */
export function pasVisiblesRepetes(stations: StationCalculee[], stationId: string, bornes: BorneCalculee[]): BorneCalculee[] {
  const i = stations.findIndex((s) => s.id === stationId)
  if (i <= 0) return []
  const cachees = (s: StationCalculee) => new Set(s.donnees.visees.filter((v) => v.pas_visible).map((v) => v.borne_id))
  const ici = cachees(stations[i])
  const avant = cachees(stations[i - 1])
  return bornes.filter((b) => b.active && ici.has(b.id) && avant.has(b.id))
}

/** « 19,993 » (3 decimals), « vide » never shown: null gives « ? ». */
export function m3(v: number | null | undefined): string {
  return v === null || v === undefined || !Number.isFinite(v) ? '?' : formaterNombre(v, 3)
}

/** Index with 2 decimals (« 1,55 »). */
export function i2(v: number | null | undefined): string {
  return v === null || v === undefined || !Number.isFinite(v) ? '?' : formaterNombre(v, 2)
}

/** Lettre of a target id among the computed targets. */
export function lettreDe(bornes: BorneCalculee[], id: string | null | undefined): string {
  return bornes.find((b) => b.id === id)?.donnees.lettre ?? '?'
}
