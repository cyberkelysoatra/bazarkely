// H18: table of the points (CSV for Excel in French): separator « ; », decimal comma, UTF-8 with BOM,
// one line per borne (principal ones first, then ephemeral ones) and per station (number order).
// A text cell starting with =, +, @, or - followed by a letter is prefixed with ' (spreadsheet
// injection); numbers never are.
import { estReportee } from '../calcul'
import type { ReleveCalcule, StationCalculee } from '../etat/releveCalcule'
import { heureMadagascar } from '../etat/navigation'
import { libelleBorne, positionStation } from '../ecrans/carte/modele'
import { propre } from './fichiers'

export const COLONNES_CSV = [
  'Point',
  'Endroit',
  'Type',
  'Rang',
  'État',
  'X',
  'Y',
  'Altitude',
  'Couleur',
  'Écart altitude',
  'Écart position',
  'Indice géométrie',
  'Bornes visées',
  'Heure',
  'Note',
] as const

type Cellule = string | number | null | undefined

/** Number with a decimal comma (ASCII minus, read as a number by Excel). */
export function nombreCsv(v: number | null | undefined, decimales = 3): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return ''
  const s = v.toFixed(decimales)
  return (Number(s) === 0 ? (0).toFixed(decimales) : s).replace('.', ',')
}

/** Text cell: injection guard, quoted when it holds « ; », a quote or a line break. */
export function texteCsv(t: string | null | undefined): string {
  if (t === null || t === undefined) return ''
  let s = propre(String(t))
  if (/^[=+@\t\r]/.test(s) || /^-\p{L}/u.test(s)) s = `'${s}`
  if (/[;"\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`
  return s
}

function ligne(cellules: Cellule[]): string {
  return cellules.map((c) => (typeof c === 'number' ? String(c) : (c ?? ''))).join(';')
}

/** État of a station (H18, 6.7): « normale », « en attente », « gardée », « écartée », then « , reportée ». */
export function etatStation(s: StationCalculee): string {
  const base = s.donnees.etat === 'ecartee' ? 'écartée' : s.incomplete ? 'en attente' : s.donnees.etat === 'gardee' ? 'gardée' : 'normale'
  return estReportee(s.resultat) ? `${base}, reportée` : base
}

/** Labels of the sighted bornes, in the order of the bornes: « B, C, D (1) ». */
export function bornesVisees(calcule: ReleveCalcule, s: StationCalculee): string {
  const visees = new Set((s.donnees.visees ?? []).filter((v) => !v.pas_visible && v.distance !== null && v.pente !== null).map((v) => v.borne_id))
  return calcule.bornes
    .filter((b) => visees.has(b.id))
    .map((b) => libelleBorne(b.donnees))
    .join(', ')
}

export function lignesCsv(calcule: ReleveCalcule): string[] {
  const out = [COLONNES_CSV.map((c) => texteCsv(c)).join(';')]
  for (const b of calcule.bornes) {
    const p = b.position
    out.push(
      ligne([
        texteCsv(libelleBorne(b.donnees)),
        texteCsv(b.donnees.nom),
        texteCsv(b.donnees.type === 'principale' ? 'borne principale' : 'borne éphémère'),
        String(b.donnees.rang),
        texteCsv(b.donnees.etat === 'retiree' ? 'retirée' : 'active'),
        nombreCsv(p?.x),
        nombreCsv(p?.y),
        nombreCsv(p?.z),
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ]),
    )
  }
  for (const s of calcule.stations) {
    const p = positionStation(s)
    const r = s.retenu
    out.push(
      ligne([
        texteCsv(s.numero),
        '',
        texteCsv('station'),
        '',
        texteCsv(etatStation(s)),
        nombreCsv(p?.x),
        nombreCsv(p?.y),
        nombreCsv(p?.z),
        texteCsv(s.couleur ?? ''),
        nombreCsv(r?.ecartAltitude),
        nombreCsv(r?.ecartPosition),
        nombreCsv(r?.indice, 2),
        texteCsv(bornesVisees(calcule, s)),
        texteCsv(heureMadagascar(s.donnees.heure)),
        texteCsv(noteStation(s.donnees.note, s.apresReprise)),
      ]),
    )
  }
  return out
}

/** Whole file text: BOM, lines separated by CRLF. */
export function texteCsvReleve(calcule: ReleveCalcule): string {
  return '﻿' + lignesCsv(calcule).join('\r\n') + '\r\n'
}

export function fichierCsv(calcule: ReleveCalcule, base: string): File {
  return new File([texteCsvReleve(calcule)], `${base}_points.csv`, { type: 'text/csv;charset=utf-8' })
}

/** CSV « Note »: a station arrived after the take-over starts with « arrivé après reprise » (6.10). */
export function noteStation(note: string | null | undefined, apresReprise: boolean): string | null {
  if (!apresReprise) return note ?? null
  return note ? `arrivé après reprise ; ${note}` : 'arrivé après reprise'
}
