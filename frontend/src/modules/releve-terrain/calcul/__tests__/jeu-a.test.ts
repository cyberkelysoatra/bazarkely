// PRD 11 game A: calibration (H05, 6.2, 6.3, 6.3 bis, 6.3 ter).
import { describe, expect, it } from 'vitest'
import { calerBornes, calerCote, modeAffichageSuspect } from '../index'
import { COTE_AB, COTE_AC, COTE_BC, PLAN, R, cotesJeuA, proche } from './donnees'

describe('Jeu A : calage', () => {
  it('côté A vers B : 52,468 ; +0,016 ; −0,017 ; −11,245 ; vert', () => {
    const c = calerCote(COTE_AB, R)
    proche(c.distanceRetenue, 52.468)
    proche(c.ecartDecaApp, 0.016)
    proche(c.biais, -0.017)
    proche(c.denivele, -11.245)
    expect(c.couleur).toBe('vert')
  })

  it('côté B vers C : 45,457 ; −0,124 ; +0,125 ; −5,489 ; orange', () => {
    const c = calerCote(COTE_BC, R)
    proche(c.distanceRetenue, 45.457)
    proche(c.ecartDecaApp, -0.124)
    proche(c.biais, 0.125)
    proche(c.denivele, -5.489)
    expect(c.couleur).toBe('orange')
  })

  it('côté A vers C : 71,310 ; +0,011 ; −0,012 ; −16,723 ; vert', () => {
    const c = calerCote(COTE_AC, R)
    proche(c.distanceRetenue, 71.31)
    proche(c.ecartDecaApp, 0.011)
    proche(c.biais, -0.012)
    proche(c.denivele, -16.723)
    expect(c.couleur).toBe('vert')
  })

  const res = calerBornes({ ...cotesJeuA(), plan: PLAN, capLu: 74.4, reglages: R })

  it('fermeture −0,011 (vert)', () => {
    expect(res.ok).toBe(true)
    proche(res.fermeture, -0.011)
    expect(res.couleurFermeture).toBe('vert')
  })

  it('bornes calées A (0 ; 0 ; 38,110), B (47,312 ; 22,681 ; 26,865), C (69,217 ; −17,150 ; 21,382)', () => {
    proche(res.bornes.a.x, 0)
    proche(res.bornes.a.y, 0)
    proche(res.bornes.a.z, 38.11)
    proche(res.bornes.b.x, 47.312)
    proche(res.bornes.b.y, 22.681)
    proche(res.bornes.b.z, 26.865)
    proche(res.bornes.c.x, 69.217)
    proche(res.bornes.c.y, -17.15)
    proche(res.bornes.c.z, 21.382)
  })

  it('écart au plan : B 0,025 (vert), C 0,182 (orange)', () => {
    proche(res.controle.positionB, 0.025)
    expect(res.controle.couleurs.positionB).toBe('vert')
    proche(res.controle.positionC, 0.182)
    expect(res.controle.couleurs.positionC).toBe('orange')
  })

  it("écart d'altitude au plan : B +0,035 (vert), C +0,052 (vert)", () => {
    proche(res.controle.altitudeB, 0.035)
    expect(res.controle.couleurs.altitudeB).toBe('vert')
    proche(res.controle.altitudeC, 0.052)
    expect(res.controle.couleurs.altitudeC).toBe('vert')
  })

  it('cap lu 74,4°, corrigé 64,4°, direction du plan 64,39°, écart 0,0° (vert)', () => {
    expect(res.orientation).toBe('plan')
    proche(res.capLu, 74.4, 0.1)
    expect(res.declinaison).toBe(10)
    proche(res.capCorrige, 64.4, 0.1)
    proche(res.controle.directionPlan, 64.39, 0.1)
    proche(res.controle.ecartCap, 0.0, 0.1)
    expect(res.controle.couleurs.cap).toBe('vert')
  })

  it('couleur du calage orange (côté B vers C), pas de message rouge', () => {
    expect(res.couleur).toBe('orange')
    expect(res.messageRouge).toBeNull()
    expect(res.messages).not.toContain('Le plan et le terrain ne concordent pas')
  })

  it("pas de message sur le mode d'affichage", () => {
    expect(modeAffichageSuspect([COTE_AB, COTE_BC, COTE_AC])).toBe(false)
  })
})
