// Pure helpers of screen 10 « Borne éphémère » (H13, H14, rules 6.7, 6.9): control of the station (step 3),
// letter and name checks (step 4), objects written at the creation and at the withdrawal.
import { MESSAGES, peutDevenirBorneEphemere, prochainUsage, prochaineLettreLibre, verifierLettre, ALPHABET, type Reglages } from '../../calcul'
import type { DonneesBorne, DonneesJournal } from '../../db/types'
import type { ObjetAEcrire } from '../../db/depot'
import type { BorneCalculee, StationCalculee } from '../../etat/releveCalcule'

export type Controle = { ok: true; rang: 1 | 2 } | { ok: false; raison: string; motif: 'rang' | 'fragile' | 'incomplete' | 'ecartee' | 'deja' }

export const MESSAGE_INCOMPLETE = 'Station incomplète : visez au moins 3 bornes depuis le piquet.'
export const MESSAGE_ECARTEE = 'Station écartée : elle ne peut pas devenir une borne.'

/** Step 3 (H13, 6.7): the rank is checked first (rank 3 refused), then green station with index <= 2,0. */
export function controlerStation(station: StationCalculee, reglages: Reglages, bornes: BorneCalculee[]): Controle {
  const res = station.resultat
  if (res.rangMax === 2) return { ok: false, raison: MESSAGES.tropDeReports, motif: 'rang' }
  if (!res.calculee) return { ok: false, raison: MESSAGE_INCOMPLETE, motif: 'incomplete' }
  if (station.donnees.etat === 'ecartee') return { ok: false, raison: MESSAGE_ECARTEE, motif: 'ecartee' }
  const deja = bornes.find((b) => b.active && b.donnees.station_origine === station.id)
  if (deja) return { ok: false, raison: `Cette station porte déjà la borne ${deja.donnees.lettre}, ${deja.donnees.nom}.`, motif: 'deja' }
  const p = peutDevenirBorneEphemere(res, reglages)
  if (!p.ok) return { ok: false, raison: p.raison, motif: p.raison === MESSAGES.tropDeReports ? 'rang' : 'fragile' }
  return p
}

export function lettresActives(bornes: BorneCalculee[]): string[] {
  return bornes.filter((b) => b.active).map((b) => b.donnees.lettre)
}

/** Free letters (A to Z carried by no active target), alphabet order. */
export function lettresLibres(bornes: BorneCalculee[]): string[] {
  const prises = new Set(lettresActives(bornes))
  return ALPHABET.filter((l) => !prises.has(l))
}

export function lettreProposee(bornes: BorneCalculee[]): string | null {
  return prochaineLettreLibre(lettresActives(bornes))
}

/** Step 4: letter check (6.9: one active target per letter), then the name (mandatory). */
export function verifierCreation(lettre: string, nom: string, bornes: BorneCalculee[]): { lettre: string | null; nom: string | null } {
  const l = lettre.trim().toUpperCase()
  let erreurLettre: string | null = null
  if (!ALPHABET.includes(l)) erreurLettre = 'Choisissez une lettre de A à Z.'
  else {
    const v = verifierLettre(l, 'x', bornes.filter((b) => b.active).map((b) => ({ lettre: b.donnees.lettre, nom: b.donnees.nom })))
    if (!v.ok) erreurLettre = v.message
  }
  const erreurNom = nom.trim() === '' ? MESSAGES.nomVide : null
  return { lettre: erreurLettre, nom: erreurNom }
}

/** Target object and journal line of a new ephemeral target (H13 step 4). */
export function objetsCreation(p: { id: string; lettre: string; nom: string; rang: 1 | 2; station: StationCalculee; bornes: BorneCalculee[]; le: string }): ObjetAEcrire[] {
  const lettre = p.lettre.trim().toUpperCase()
  const usage = prochainUsage(lettre, p.bornes.map((b) => ({ lettre: b.donnees.lettre, usage: b.donnees.usage })))
  const borne: DonneesBorne = {
    lettre,
    usage,
    nom: p.nom.trim(),
    type: 'ephemere',
    ordre: null,
    rang: p.rang,
    plan: null,
    verifiee: false,
    station_origine: p.station.id,
    etat: 'active',
    retiree_le: null,
  }
  const journal: DonneesJournal = { action: 'borne_ephemere_creee', detail: { borne: p.id, station: p.station.id, numero: p.station.numero, lettre, usage, rang: p.rang, nom: borne.nom }, le: p.le }
  return [
    { id: p.id, type: 'borne', donnees: borne },
    { type: 'journal', donnees: journal },
  ]
}

/** H14: the target leaves the rows, stays (grey) on the map and in the exports; its panel becomes free. */
export function objetsRetrait(b: BorneCalculee, le: string): ObjetAEcrire[] {
  return [
    { id: b.id, type: 'borne', donnees: { ...b.donnees, etat: 'retiree', retiree_le: le } },
    { type: 'journal', donnees: { action: 'borne_ephemere_retiree', detail: { borne: b.id, lettre: b.donnees.lettre, usage: b.donnees.usage, nom: b.donnees.nom }, le } },
  ]
}

/** Stations that sight a target (shown before a withdrawal). */
export function stationsQuiVisent(stations: StationCalculee[], borneId: string): StationCalculee[] {
  return stations.filter((s) => s.donnees.visees.some((v) => v.borne_id === borneId && !v.pas_visible && v.distance !== null))
}
