// H17: text file of plan points, one per line « nom;x;y;altitude » (decimal comma or point, header
// line optional). Wrong lines are listed and skipped.
import type { DonneesPointPlan } from '../db/types'

export interface LigneRefusee {
  numero: number
  texte: string
  raison: string
}

export interface LecturePointsPlan {
  points: DonneesPointPlan[]
  refusees: LigneRefusee[]
}

/** « 12,5 », « 12.5 », « −3 », « -3 »; null when not a number. */
export function nombrePlan(t: string): number | null {
  const s = t.trim().replace(/\s/g, '').replace('−', '-').replace(',', '.')
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return null
  const v = Number(s)
  return Number.isFinite(v) ? v : null
}

const RAISON_COLONNES = 'il faut 4 valeurs : nom;x;y;altitude'
const RAISON_NOM = 'nom vide'
const RAISON_NOMBRE = 'x, y et altitude doivent être des nombres'

export function lirePointsPlan(texte: string): LecturePointsPlan {
  const points: DonneesPointPlan[] = []
  const refusees: LigneRefusee[] = []
  const lignes = texte.replace(/^﻿/, '').split(/\r\n|\r|\n/)
  let premiere = true
  lignes.forEach((brute, i) => {
    const t = brute.trim()
    if (!t) return
    const estPremiere = premiere
    premiere = false
    const c = t.split(';').map((x) => x.trim().replace(/^"(.*)"$/, '$1'))
    // Trailing empty cells (« P1;1;2;3; ») are tolerated.
    while (c.length > 4 && c[c.length - 1] === '') c.pop()
    if (c.length !== 4) {
      refusees.push({ numero: i + 1, texte: t, raison: RAISON_COLONNES })
      return
    }
    const [nom, xs, ys, zs] = c
    const x = nombrePlan(xs)
    const y = nombrePlan(ys)
    const z = nombrePlan(zs)
    if (x === null || y === null || z === null) {
      // Header: first line whose three values are all words.
      if (estPremiere && x === null && y === null && z === null) return
      refusees.push({ numero: i + 1, texte: t, raison: RAISON_NOMBRE })
      return
    }
    if (!nom) {
      refusees.push({ numero: i + 1, texte: t, raison: RAISON_NOM })
      return
    }
    points.push({ nom: nom.slice(0, 80), x, y, z })
  })
  return { points, refusees }
}
