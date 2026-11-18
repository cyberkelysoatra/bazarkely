// Point set of games D and D2: the 3 targets of the table and S01 to S08
// at the expected values of game B.
import { courbesDeNiveau, croisementsLigneY } from '../index'
import type { PointCote, Triangulation } from '../index'
import { JEU_B, PLAN } from './donnees'

export const SEMIS: PointCote[] = [
  { id: 'A', ...PLAN.a },
  { id: 'B', ...PLAN.b },
  { id: 'C', ...PLAN.c },
  ...JEU_B.map((s) => ({ id: s.nom, x: s.x, y: s.y, z: s.z })),
]

/** Crossings with the line Y = 0 of the contour at `altitude` (1 m interval). */
export function croisements(t: Triangulation, altitude: number): number[] {
  const c = courbesDeNiveau(t, 1).find((k) => Math.abs(k.altitude - altitude) < 1e-9)
  return c ? croisementsLigneY(c, 0) : []
}

/** Identifiers of a triangle, sorted, joined: 'S01,S02,S07'. */
export function cleTriangle(t: Triangulation, i: number): string {
  return t.triangles[i]
    .map((k) => t.points[k].id)
    .sort()
    .join(',')
}
