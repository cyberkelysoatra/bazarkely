// PRD 11 game D2: same point set, cut-off 20 m then 15 m (H16, H17).
import { describe, expect, it } from 'vitest'
import { altitudeEn, trianguler } from '../index'
import { proche } from './donnees'
import { SEMIS, cleTriangle, croisements } from './semis'

const ATTENDUS = [
  ['S01', 'S07', 'S02'],
  ['S06', 'S08', 'B'],
  ['S06', 'S01', 'S02'],
  ['S05', 'S03', 'S04'],
  ['S08', 'S03', 'S05'],
  ['S07', 'S03', 'S02'],
  ['S03', 'S06', 'S02'],
  ['S06', 'S03', 'S08'],
].map((t) => [...t].sort().join(','))

describe('Jeu D2 : coupure 20 m', () => {
  const t = trianguler(SEMIS, 20)

  it('8 triangles gardés sur 17, ceux de la liste', () => {
    expect(t.triangles).toHaveLength(17)
    const gardes = t.triangles.map((_, i) => i).filter((i) => t.gardes[i])
    expect(gardes).toHaveLength(8)
    expect(gardes.map((i) => cleTriangle(t, i)).sort()).toEqual([...ATTENDUS].sort())
  })

  it('altitude en (30 ; 0) 30,872 ; en (40 ; 5) 28,483 ; (20 ; −5) non couvert', () => {
    proche(altitudeEn(t, 30, 0), 30.872, 0.05)
    proche(altitudeEn(t, 40, 5), 28.483, 0.05)
    expect(altitudeEn(t, 20, -5)).toBeNull()
  })

  it('sur Y = 0 : pas de courbe 35 ; courbe 30 vers X = 33,61 ; courbe 25 vers X = 54,34', () => {
    expect(croisements(t, 35)).toEqual([])
    const x30 = croisements(t, 30)
    expect(x30.length).toBeGreaterThan(0)
    for (const v of x30) proche(v, 33.61, 0.2)
    const x25 = croisements(t, 25)
    expect(x25.length).toBeGreaterThan(0)
    for (const v of x25) proche(v, 54.34, 0.2)
  })
})

describe('Jeu D2 : coupure par défaut 15 m', () => {
  const t = trianguler(SEMIS, 15)

  it('(30 ; 0), (40 ; 5) et (20 ; −5) non couverts ; (25 ; 0) vaut 32,076', () => {
    expect(altitudeEn(t, 30, 0)).toBeNull()
    expect(altitudeEn(t, 40, 5)).toBeNull()
    expect(altitudeEn(t, 20, -5)).toBeNull()
    proche(altitudeEn(t, 25, 0), 32.076, 0.05)
  })
})
