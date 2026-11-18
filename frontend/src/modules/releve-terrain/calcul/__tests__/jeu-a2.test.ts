// PRD 11 game A2: calibration without site plan, orientation by the heading (6.3 bis).
import { describe, expect, it } from 'vitest'
import { calerBornes } from '../index'
import { R, cotesJeuA, proche } from './donnees'

// Targets entered without X nor Y (altitudes kept, as in game A).
const PLAN_SANS_XY = { a: { z: 38.11 }, b: { z: 26.83 }, c: { z: 21.33 } }

describe('Jeu A2 : calage sans plan de masse', () => {
  const avecCap = calerBornes({ ...cotesJeuA(), plan: PLAN_SANS_XY, capLu: 74.4, coteC: 'droite', reglages: R })

  it('cap lu 74,4°, corrigé 64,4°, orientation « nord approximatif »', () => {
    expect(avecCap.ok).toBe(true)
    expect(avecCap.orientation).toBe('nord_approximatif')
    proche(avecCap.capLu, 74.4, 0.1)
    proche(avecCap.capCorrige, 64.4, 0.1)
    expect(avecCap.mentionOrientation).toBe('nord approximatif')
    expect(avecCap.messages).toContain('nord approximatif')
  })

  it('B (47,317 ; 22,671), C (69,213 ; −17,165)', () => {
    proche(avecCap.bornes.b.x, 47.317)
    proche(avecCap.bornes.b.y, 22.671)
    proche(avecCap.bornes.c.x, 69.213)
    proche(avecCap.bornes.c.y, -17.165)
  })

  it('C du côté sud de la droite A vers B', () => {
    const { a, b, c } = avecCap.bornes
    const yDroite = a.y + ((b.y - a.y) / (b.x - a.x)) * (c.x - a.x)
    expect(c.y).toBeLessThan(yDroite)
  })

  it('distances, dénivelés, fermeture et couleurs identiques au jeu A', () => {
    proche(avecCap.fermeture, -0.011)
    expect(avecCap.couleurFermeture).toBe('vert')
    proche(avecCap.bornes.a.z, 38.11)
    proche(avecCap.bornes.b.z, 26.865)
    proche(avecCap.bornes.c.z, 21.382)
    proche(Math.hypot(avecCap.bornes.b.x, avecCap.bornes.b.y), 52.468)
    proche(Math.hypot(avecCap.bornes.c.x, avecCap.bornes.c.y), 71.31)
    proche(Math.hypot(avecCap.bornes.c.x - avecCap.bornes.b.x, avecCap.bornes.c.y - avecCap.bornes.b.y), 45.457)
    expect(avecCap.couleur).toBe('orange')
  })

  const sansCap = calerBornes({ ...cotesJeuA(), plan: PLAN_SANS_XY, capLu: null, coteC: 'droite', reglages: R })

  it('sans cap : B (52,468 ; 0,000), « orientation libre (axe A vers B) », pas de flèche du nord', () => {
    expect(sansCap.ok).toBe(true)
    proche(sansCap.bornes.b.x, 52.468)
    proche(sansCap.bornes.b.y, 0)
    expect(sansCap.orientation).toBe('libre')
    expect(sansCap.mentionOrientation).toBe('orientation libre (axe A vers B)')
    expect(sansCap.capCorrige).toBeNull()
  })
})
