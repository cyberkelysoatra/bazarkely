// PRD 11 game A3: control of the site plan on the ground (6.3 ter).
import { describe, expect, it } from 'vitest'
import { calerBornes } from '../index'
import { PLAN, R, cotesJeuA, proche } from './donnees'

function positionsJeuA(res: ReturnType<typeof calerBornes>) {
  proche(res.bornes.b.x, 47.312)
  proche(res.bornes.b.y, 22.681)
  proche(res.bornes.b.z, 26.865)
  proche(res.bornes.c.x, 69.217)
  proche(res.bornes.c.y, -17.15)
  proche(res.bornes.c.z, 21.382)
}

describe('Jeu A3 : contrôle du plan sur le terrain', () => {
  it('cap lu 254,4°, corrigé 244,4° : écart de cap 180,0° (rouge), message, calage rouge', () => {
    const res = calerBornes({ ...cotesJeuA(), plan: PLAN, capLu: 254.4, reglages: R })
    proche(res.capCorrige, 244.4, 0.1)
    proche(res.controle.ecartCap, 180.0, 0.1)
    expect(res.controle.couleurs.cap).toBe('rouge')
    expect(res.messages).toContain('Le plan et le terrain ne concordent pas')
    expect(res.controle.messages).toContain('Le plan et le terrain ne concordent pas')
    positionsJeuA(res)
    expect(res.couleur).toBe('rouge')
    expect(res.messageRouge).toBe('Le plan et le terrain ne concordent pas : vérifier la borne A ou B ou le plan')
  })

  it('altitude du plan de C 22,33 : écart −0,948 (rouge), calage rouge, altitudes identiques au jeu A', () => {
    const res = calerBornes({ ...cotesJeuA(), plan: { ...PLAN, c: { ...PLAN.c, z: 22.33 } }, capLu: 74.4, reglages: R })
    proche(res.controle.altitudeC, -0.948)
    expect(res.controle.couleurs.altitudeC).toBe('rouge')
    expect(res.couleur).toBe('rouge')
    positionsJeuA(res)
    expect(res.messageRouge).toBe('Le plan et le terrain ne concordent pas : vérifier la borne C ou le plan')
  })

  it('cap non lu ni saisi : « cap non contrôlé », couleur du calage orange comme au jeu A', () => {
    const res = calerBornes({ ...cotesJeuA(), plan: PLAN, capLu: null, reglages: R })
    expect(res.controle.messages).toContain('cap non contrôlé')
    expect(res.messages).toContain('cap non contrôlé')
    expect(res.controle.ecartCap).toBeNull()
    expect(res.couleur).toBe('orange')
    positionsJeuA(res)
  })
})
