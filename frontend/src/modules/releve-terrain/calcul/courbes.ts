// PRD 6.5: Delaunay triangulation, cut-off, covered zone, contour lines,
// altitude at any point.
import { Delaunay } from 'd3-delaunay'
import type { Courbe, PointCote, Triangulation } from './types'

/** Triangles with a side strictly longer than the cut-off are not kept. */
export function trianguler(points: PointCote[], coupure: number): Triangulation {
  const triangles: [number, number, number][] = []
  const gardes: boolean[] = []
  if (points.length < 3) return { points, triangles, gardes }
  const d = Delaunay.from(points.map((p) => [p.x, p.y] as const))
  const t = d.triangles
  for (let i = 0; i < t.length; i += 3) {
    const tri: [number, number, number] = [t[i], t[i + 1], t[i + 2]]
    triangles.push(tri)
    gardes.push(plusLongCote(points, tri) <= coupure)
  }
  return { points, triangles, gardes }
}

export function plusLongCote(points: PointCote[], tri: [number, number, number]): number {
  const [a, b, c] = tri.map((k) => points[k])
  return Math.max(Math.hypot(a.x - b.x, a.y - b.y), Math.hypot(b.x - c.x, b.y - c.y), Math.hypot(a.x - c.x, a.y - c.y))
}

/** Covered zone = union of the kept triangles (list of their corners). */
export function zoneCouverte(t: Triangulation): [[number, number], [number, number], [number, number]][] {
  const z: [[number, number], [number, number], [number, number]][] = []
  t.triangles.forEach((tri, i) => {
    if (!t.gardes[i]) return
    const [a, b, c] = tri.map((k) => t.points[k])
    z.push([
      [a.x, a.y],
      [b.x, b.y],
      [c.x, c.y],
    ])
  })
  return z
}

const estMajeure = (alt: number) => Math.abs(alt / 5 - Math.round(alt / 5)) < 1e-9

/** Contour lines every `intervalle` metres (0.5, 1, 2); every 5 m flagged major. */
export function courbesDeNiveau(t: Triangulation, intervalle: number): Courbe[] {
  const parNiveau = new Map<number, Courbe>()
  t.triangles.forEach((tri, i) => {
    if (!t.gardes[i]) return
    const p = tri.map((k) => t.points[k])
    const zmin = Math.min(p[0].z, p[1].z, p[2].z)
    const zmax = Math.max(p[0].z, p[1].z, p[2].z)
    for (let k = Math.ceil(zmin / intervalle); k * intervalle <= zmax; k++) {
      const alt = k * intervalle
      const pts: [number, number][] = []
      for (let e = 0; e < 3; e++) {
        const a = p[e]
        const b = p[(e + 1) % 3]
        // Vertex classed "above" when z >= alt: each crossing counted once.
        const aHaut = a.z >= alt
        const bHaut = b.z >= alt
        if (aHaut === bHaut) continue
        const f = (alt - a.z) / (b.z - a.z)
        pts.push([a.x + f * (b.x - a.x), a.y + f * (b.y - a.y)])
      }
      if (pts.length !== 2) continue
      if (pts[0][0] === pts[1][0] && pts[0][1] === pts[1][1]) continue
      let c = parNiveau.get(k)
      if (!c) {
        c = { altitude: alt, majeure: estMajeure(alt), segments: [] }
        parNiveau.set(k, c)
      }
      c.segments.push([pts[0], pts[1]])
    }
  })
  return [...parNiveau.entries()].sort((a, b) => a[0] - b[0]).map(([, c]) => c)
}

/** Linear interpolation in the kept triangle containing (x, y); null = « non couvert ». */
export function altitudeEn(t: Triangulation, x: number, y: number): number | null {
  const eps = 1e-9
  for (let i = 0; i < t.triangles.length; i++) {
    if (!t.gardes[i]) continue
    const [a, b, c] = t.triangles[i].map((k) => t.points[k])
    const det = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y)
    if (det === 0) continue
    const l1 = ((b.y - c.y) * (x - c.x) + (c.x - b.x) * (y - c.y)) / det
    const l2 = ((c.y - a.y) * (x - c.x) + (a.x - c.x) * (y - c.y)) / det
    const l3 = 1 - l1 - l2
    if (l1 >= -eps && l2 >= -eps && l3 >= -eps) return l1 * a.z + l2 * b.z + l3 * c.z
  }
  return null
}

/** Points where contour segments cross the horizontal line Y = y (sorted by X). */
export function croisementsLigneY(c: Courbe, y: number): number[] {
  const xs: number[] = []
  for (const [[x1, y1], [x2, y2]] of c.segments) {
    if ((y1 - y) * (y2 - y) > 0 || y1 === y2) continue
    xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1))
  }
  return xs.sort((a, b) => a - b)
}
