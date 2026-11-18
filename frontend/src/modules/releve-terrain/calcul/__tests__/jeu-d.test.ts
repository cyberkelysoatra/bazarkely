// PRD 11 game D: contour lines without effective cut-off (H16), cut-off 100 m.
import { describe, expect, it } from 'vitest'
import { altitudeEn, courbesDeNiveau, plusLongCote, trianguler } from '../index'
import { dureeMediane, proche } from './donnees'
import { SEMIS, croisements } from './semis'

describe('Jeu D : courbes de niveau, coupure 100 m', () => {
  const t = trianguler(SEMIS, 100)

  it('11 points, 17 triangles, tous gardés ; plus long côté A–C 71,29 m', () => {
    expect(t.points).toHaveLength(11)
    expect(t.triangles).toHaveLength(17)
    expect(t.gardes.every(Boolean)).toBe(true)
    const max = Math.max(...t.triangles.map((tri) => plusLongCote(t.points, tri)))
    proche(max, 71.29)
  })

  it.each([
    [35, 12.86],
    [30, 33.61],
    [25, 54.34],
  ])('sur Y = 0, la courbe %d passe vers X = %d (± 0,20 m)', (alt, x) => {
    const xs = croisements(t, alt)
    expect(xs.length).toBeGreaterThan(0)
    for (const v of xs) proche(v, x, 0.2)
  })

  it.each([
    [30, 0, 30.872],
    [40, 5, 28.483],
    [20, -5, 33.257],
  ])('altitude interpolée en (%d ; %d) : %d (± 0,05 m)', (x, y, z) => {
    proche(altitudeEn(t, x, y), z, 0.05)
  })

  it('courbes tous les 5 m marquées majeures', () => {
    const c = courbesDeNiveau(t, 1)
    expect(c.find((k) => k.altitude === 30)?.majeure).toBe(true)
    expect(c.find((k) => k.altitude === 31)?.majeure).toBe(false)
  })

  it('C3 : courbes du jeu D en moins de 50 ms (médiane de 20)', () => {
    const ms = dureeMediane(() => courbesDeNiveau(trianguler(SEMIS, 100), 1))
    console.info(`[C3] courbes jeu D : médiane ${ms.toFixed(4)} ms`)
    expect(ms).toBeLessThan(50)
  })
})
