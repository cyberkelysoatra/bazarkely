// Function that feeds the map SVG, the results and the PDF (donneesCourbes, comparerPlan, zones), on the
// games D, D2, F of the PRD (section 11, tolerances of the PRD).
import { describe, expect, it } from 'vitest'
import { REGLAGES_DEFAUT, croisementsLigneY, indiceGeometrie, type Courbe } from '../../../calcul'
import type { Objet, SauvegardeReleve } from '../../../db/types'
import { jeuD, jeuD2, jeuF, jeuG } from '../../../etat/jeux'
import { calculerReleve } from '../../../etat/releveCalcule'
import {
  bornesDesZones,
  calculerZones,
  cheminSegments,
  comparerPlan,
  donneesCourbes,
  intervalleValide,
  libelleBorne,
  longueurEchelle,
  mentionCarte,
  versEcran,
  versMetres,
  vueAjustee,
  zonesFaibles,
  zoomer,
} from '../modele'

function proche(v: number | null | undefined, attendu: number, tol: number) {
  expect(v, `attendu ${attendu}`).toBeTypeOf('number')
  expect(Math.abs((v as number) - attendu), `valeur ${v}, attendu ${attendu} ± ${tol}`).toBeLessThanOrEqual(tol + 1e-9)
}

function objets(s: SauvegardeReleve): Objet[] {
  return s.objets.map((o) => ({ ...o, releve_id: s.releve.id, supprime: false, saisi_at: o.saisi_at ?? '2026-11-18T05:00:00.000Z', maj_at: o.saisi_at ?? '2026-11-18T05:00:00.000Z', apres_reprise: false, envoi: 'a_envoyer' }) as Objet)
}

const calc = (s: SauvegardeReleve) => calculerReleve(s.releve.entete, objets(s), REGLAGES_DEFAUT)

const PLAN = [
  { id: 'P1', donnees: { nom: 'P1', x: 30, y: 0, z: 30 } },
  { id: 'P2', donnees: { nom: 'P2', x: 40, y: 5, z: 28 } },
  { id: 'P3', donnees: { nom: 'P3', x: 20, y: -5, z: 33.9 } },
]

const courbe = (cs: Courbe[], alt: number) => cs.find((c) => Math.abs(c.altitude - alt) < 1e-9)

describe('jeu D (coupure 100 m, courbes à 1 m)', () => {
  const r = calc(jeuD())
  const d = donneesCourbes(r.pointsCourbes, r.reglages.coupure, 1)

  it('11 points, 17 triangles, tous gardés', () => {
    expect(r.reglages.coupure).toBe(100)
    expect(r.pointsCourbes).toHaveLength(11)
    expect(d.triangulation.triangles).toHaveLength(17)
    expect(d.gardes).toBe(17)
  })

  it('ligne Y = 0 : courbe 35 vers X = 12,86 ; 30 vers 33,61 ; 25 vers 54,34 (± 0,20)', () => {
    for (const [alt, x] of [
      [35, 12.86],
      [30, 33.61],
      [25, 54.34],
    ]) {
      const c = courbe(d.courbes, alt)
      expect(c, `courbe ${alt}`).toBeDefined()
      expect(c!.majeure).toBe(true)
      const xs = croisementsLigneY(c!, 0)
      expect(xs.length).toBeGreaterThan(0)
      proche(xs[0], x, 0.2)
    }
  })

  it('le chemin SVG d’une courbe reprend ses segments (Y retourné)', () => {
    const c = courbe(d.courbes, 30)!
    const chemin = cheminSegments(c)
    expect(chemin.split('M')).toHaveLength(c.segments.length + 1)
    const [[x1, y1]] = c.segments[0]
    expect(chemin.startsWith(`M${x1.toFixed(3)} ${(-y1).toFixed(3)}`)).toBe(true)
  })

  it('comparaison au plan : 30,872 ; 28,483 ; 33,257 (± 0,05), écart en rouge au-delà de 0,50 m', () => {
    const l = comparerPlan(d.triangulation, PLAN)
    proche(l[0].releve, 30.872, 0.05)
    proche(l[1].releve, 28.483, 0.05)
    proche(l[2].releve, 33.257, 0.05)
    proche(l[0].ecart, 0.872, 0.05)
    expect(l[0].rouge).toBe(true)
    expect(l[1].rouge).toBe(false)
    expect(l[2].rouge).toBe(true)
  })

  it('courbes mémorisées : même résultat (même objet) tant que points, coupure et intervalle ne changent pas', () => {
    const autre = donneesCourbes([...r.pointsCourbes.map((p) => ({ ...p }))], 100, 1)
    expect(autre.courbes).toBe(d.courbes)
    expect(donneesCourbes(r.pointsCourbes, 100, 2).courbes).not.toBe(d.courbes)
    expect(donneesCourbes(r.pointsCourbes, 100, 0).courbes).toHaveLength(0)
  })
})

describe('jeu D2 (coupure 20 m) et coupure 15 m', () => {
  const r = calc(jeuD2())
  const d = donneesCourbes(r.pointsCourbes, r.reglages.coupure, 1)
  const nomDe = new Map(r.pointsCourbes.map((p) => [p.id, p.id]))

  it('8 triangles gardés sur 17, ceux du PRD', () => {
    expect(r.reglages.coupure).toBe(20)
    expect(d.triangulation.triangles).toHaveLength(17)
    expect(d.gardes).toBe(8)
    const attendus = [
      ['S01', 'S07', 'S02'],
      ['S06', 'S08', 'B'],
      ['S06', 'S01', 'S02'],
      ['S05', 'S03', 'S04'],
      ['S08', 'S03', 'S05'],
      ['S07', 'S03', 'S02'],
      ['S03', 'S06', 'S02'],
      ['S06', 'S03', 'S08'],
    ].map((t) => [...t].sort().join(','))
    const gardes = d.triangulation.triangles.filter((_, i) => d.triangulation.gardes[i]).map((t) => t.map((k) => nomDe.get(d.triangulation.points[k].id)!).sort().join(','))
    expect(gardes.sort()).toEqual(attendus.sort())
  })

  it('(30 ; 0) 30,872, (40 ; 5) 28,483, (20 ; −5) non couvert ; pas de courbe 35 sur Y = 0', () => {
    const l = comparerPlan(d.triangulation, PLAN)
    proche(l[0].releve, 30.872, 0.05)
    proche(l[1].releve, 28.483, 0.05)
    expect(l[2].releve).toBeNull()
    expect(l[2].ecart).toBeNull()
    const c35 = courbe(d.courbes, 35)
    expect(c35 ? croisementsLigneY(c35, 0) : []).toHaveLength(0)
    proche(croisementsLigneY(courbe(d.courbes, 30)!, 0)[0], 33.61, 0.2)
    proche(croisementsLigneY(courbe(d.courbes, 25)!, 0)[0], 54.34, 0.2)
  })

  it('coupure 15 m : (25 ; 0) 32,076 ; les trois points de C1 non couverts', () => {
    const d15 = donneesCourbes(r.pointsCourbes, 15, 1)
    const l = comparerPlan(d15.triangulation, [...PLAN, { id: 'P4', donnees: { nom: 'P4', x: 25, y: 0, z: 32 } }])
    expect(l.slice(0, 3).map((x) => x.releve)).toEqual([null, null, null])
    proche(l[3].releve, 32.076, 0.05)
  })
})

describe('zones de géométrie faible (H12, H13)', () => {
  const f = calc(jeuF())

  it('normal : bornes actives (A, B, C et D), seuil 2,5', () => {
    const z = bornesDesZones(f, 'normal')
    expect(z.bornes).toHaveLength(4)
    expect(z.seuil).toBe(2.5)
  })

  it('?zones=ephemere : les 3 bornes principales seulement, seuil 2,0', () => {
    const z = bornesDesZones(f, 'ephemere')
    expect(z.bornes).toHaveLength(3)
    expect(z.seuil).toBe(2)
    const p = f.principales
    expect(z.bornes).toEqual([p.a, p.b, p.c].map((b) => ({ x: b!.position!.x, y: b!.position!.y })))
  })

  it('cellules de 2 m sur le cadre des bornes plus 20 m, grisées quand l’indice dépasse le seuil', () => {
    const { bornes, seuil } = bornesDesZones(f, 'ephemere')
    const rects = calculerZones(bornes, seuil)
    expect(rects.length).toBeGreaterThan(0)
    for (const r of rects.slice(0, 40)) {
      expect(r.hauteur).toBe(2)
      for (let x = r.x + 1; x < r.x + r.largeur; x += 2) expect(indiceGeometrie(x, r.y + 1, bornes)).toBeGreaterThan(seuil)
    }
    // A point in the middle of the triangle is never greyed.
    const centre = { x: (bornes[0].x + bornes[1].x + bornes[2].x) / 3, y: (bornes[0].y + bornes[1].y + bornes[2].y) / 3 }
    expect(rects.some((r) => centre.x >= r.x && centre.x < r.x + r.largeur && centre.y >= r.y && centre.y < r.y + r.hauteur)).toBe(false)
    const xmin = Math.min(...bornes.map((b) => b.x)) - 20
    expect(Math.min(...rects.map((r) => r.x))).toBeGreaterThanOrEqual(Math.floor(xmin / 2) * 2)
  })

  it('le seuil 2,0 grise plus que 2,5 avec les mêmes bornes ; cache gardé tant que les bornes ne changent pas', () => {
    const { bornes } = bornesDesZones(f, 'ephemere')
    const aire = (rs: { largeur: number; hauteur: number }[]) => rs.reduce((s, r) => s + r.largeur * r.hauteur, 0)
    expect(aire(calculerZones(bornes, 2))).toBeGreaterThan(aire(calculerZones(bornes, 2.5)))
    const a = zonesFaibles(f, 'ephemere')
    expect(zonesFaibles(calc(jeuF()), 'ephemere')).toBe(a)
    expect(zonesFaibles(f, 'normal')).not.toBe(a)
  })
})

describe('libellés et vue', () => {
  it('lettre seule pour une principale, « D (1) » pour une éphémère', () => {
    const g = calc(jeuG())
    expect(g.bornes.map((b) => libelleBorne(b.donnees))).toEqual(['A', 'B', 'C', 'D (1)', 'D (2)'])
  })

  it('mention de l’orientation', () => {
    expect(mentionCarte(calc(jeuD()))).toBe('Orienté par le plan')
  })

  it('intervalle : valeur stockée valide, sinon 1 m', () => {
    expect(intervalleValide(0.5)).toBe(0.5)
    expect(intervalleValide(0)).toBe(0)
    expect(intervalleValide(undefined)).toBe(1)
    expect(intervalleValide(3)).toBe(1)
  })

  it('pixels et mètres : aller-retour, zoom autour d’un point fixe, échelle de 70 à 175 px', () => {
    const v = vueAjustee({ xmin: 0, xmax: 70, ymin: -20, ymax: 25 }, 380, 400)
    const [px, py] = versEcran(v, 380, 400, 12, -3)
    const [x, y] = versMetres(v, 380, 400, px, py)
    expect(x).toBeCloseTo(12, 9)
    expect(y).toBeCloseTo(-3, 9)
    const z = zoomer(v, 380, 400, px, py, 2)
    expect(z.s).toBeCloseTo(v.s * 2, 9)
    const [px2, py2] = versEcran(z, 380, 400, 12, -3)
    expect(px2).toBeCloseTo(px, 6)
    expect(py2).toBeCloseTo(py, 6)
    for (const s of [0.5, 3, 4.7, 20, 90]) {
      const lg = longueurEchelle(s) * s
      expect(lg).toBeGreaterThanOrEqual(70)
      expect(lg).toBeLessThanOrEqual(175 + 1e-9)
    }
  })
})
