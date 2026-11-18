// PRD 11 game B: normal stations (H08, 6.4), targets at the coordinates of the table.
import { describe, expect, it } from 'vitest'
import { calculerStation } from '../index'
import { BORNES, HI, HT, JEU_B, R, dureeMediane, proche, visees } from './donnees'

describe('Jeu B : stations normales', () => {
  for (const s of JEU_B) {
    it(`${s.nom} : X ${s.x} ; Y ${s.y} ; altitude ${s.z} ; écart ${s.ecartAltitude} ; indice ${s.indice} ; vert`, () => {
      const r = calculerStation(BORNES, visees(s.v), HI, HT, R)
      expect(r.calculee).toBe(true)
      proche(r.x, s.x)
      proche(r.y, s.y)
      proche(r.z, s.z)
      proche(r.ecartAltitude, s.ecartAltitude)
      proche(r.indice, s.indice)
      expect(r.couleur).toBe('vert')
      expect(r.viseeSuspecte ?? null).toBeNull()
      expect(r.tropPres).toBe(false)
      expect(r.reportee).toBe(false)
    })
  }

  it('C3 : une station du jeu B se calcule en moins de 5 ms (médiane de 20)', () => {
    const v = visees(JEU_B[1].v)
    const ms = dureeMediane(() => calculerStation(BORNES, v, HI, HT, R))
    console.info(`[C3] station S02 : médiane ${ms.toFixed(4)} ms`)
    expect(ms).toBeLessThan(5)
  })
})
