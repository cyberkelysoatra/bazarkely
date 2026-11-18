// PRD 11 game F: ephemeral target (H13, 6.4, 6.7), targets of the table.
import { describe, expect, it } from 'vitest'
import { calculerStation, peutDevenirBorneEphemere } from '../index'
import type { BorneConnue, ResultatStation } from '../index'
import { BORNES, HI, HT, JEU_B, R, proche, viseeDepuis, visees } from './donnees'

const S06 = JEU_B.find((s) => s.nom === 'S06')!

function borneDepuis(s: ResultatStation, id: string, rang: 1 | 2): BorneConnue {
  return { id, lettre: id, x: s.x!, y: s.y!, z: s.z!, rang }
}

describe('Jeu F : borne éphémère', () => {
  const s06 = calculerStation(BORNES, visees(S06.v), HI, HT, R)
  const creation = peutDevenirBorneEphemere(s06, R)
  const D = borneDepuis(s06, 'D', 1)
  const BORNES_D = [...BORNES, D]

  it('création : S06 (verte, indice 1,27) devient D, rang 1, en (35,000 ; 11,999 ; 29,728)', () => {
    expect(s06.couleur).toBe('vert')
    proche(s06.indice, 1.27)
    expect(creation).toEqual({ ok: true, rang: 1 })
    proche(D.x, 35.0)
    proche(D.y, 11.999)
    proche(D.z, 29.728)
  })

  it('refus : E4 (indice 3,38) ne peut pas devenir borne éphémère (message de H13, étape 3)', () => {
    const e4 = calculerStation(BORNES, visees({ A: [154.3, 13.6], B: [108.09, 13.3], C: [84.93, 13.2] }), HI, HT, R)
    proche(e4.indice, 3.38)
    expect(peutDevenirBorneEphemere(e4, R)).toEqual({
      ok: false,
      raison: 'Position trop fragile : choisissez un endroit plus au centre des bornes',
    })
  })

  const s10 = calculerStation(BORNES_D, visees({ A: null, B: [13.3, 8.3], C: [32.75, -6.3], D: [20.57, 13.6] }), HI, HT, R)

  it('S10 (A caché) : X 54,993 ; Y 11,995 ; altitude 24,906 ; écart 0,033 ; indice 1,41 ; vert', () => {
    expect(s10.calculee).toBe(true)
    proche(s10.x, 54.993)
    proche(s10.y, 11.995)
    proche(s10.z, 24.906)
    proche(s10.ecartAltitude, 0.033)
    proche(s10.indice, 1.41)
    expect(s10.couleur).toBe('vert')
    expect(s10.bornesManquantes).toEqual(['A'])
  })

  it('S11 (A caché) : X 45,001 ; Y 14,998 ; altitude 27,335 ; écart 0,026 ; indice 1,16 ; vert', () => {
    const r = calculerStation(BORNES_D, visees({ A: null, B: [8.02, -3.6], C: [40.79, -8.5], D: [10.71, 12.9] }), HI, HT, R)
    proche(r.x, 45.001)
    proche(r.y, 14.998)
    proche(r.z, 27.335)
    proche(r.ecartAltitude, 0.026)
    proche(r.indice, 1.16)
    expect(r.couleur).toBe('vert')
  })

  it('S12 (4 bornes) : X 54,996 ; Y 11,998 ; altitude 24,906 ; écart 0,033 ; indice 1,10 ; vert', () => {
    const r = calculerStation(
      BORNES_D,
      visees({ A: [57.82, 13.2], B: [13.3, 8.3], C: [32.75, -6.3], D: [20.57, 13.6] }),
      HI,
      HT,
      R,
    )
    proche(r.x, 54.996)
    proche(r.y, 11.998)
    proche(r.z, 24.906)
    proche(r.ecartAltitude, 0.033)
    proche(r.indice, 1.1)
    expect(r.couleur).toBe('vert')
  })

  it('S13 (4 bornes, distance vers C fausse de 2 m) : rouge, visée suspecte C, résultat sans C', () => {
    const r = calculerStation(
      BORNES_D,
      visees({ A: [57.82, 13.2], B: [13.3, 8.3], C: [34.75, -6.3], D: [20.57, 13.6] }),
      HI,
      HT,
      R,
    )
    proche(r.x, 54.964)
    proche(r.y, 13.194)
    proche(r.z, 24.926)
    expect(r.couleur).toBe('rouge')
    expect(r.viseeSuspecte).toBe('C')
    proche(r.retraits?.C.ecartPosition, 0.003)
    proche(r.retraits?.A.ecartPosition, 0.953)
    proche(r.retraits?.B.ecartPosition, 0.186)
    proche(r.retraits?.D.ecartPosition, 0.966)
    proche(r.sansSuspecte?.x, 54.996)
    proche(r.sansSuspecte?.y, 12.002)
    proche(r.sansSuspecte?.z, 24.904)
  })

  // S14: station at (60 ; 5), ground altitude 25.000 m, sights computed towards the rank-2 target, B and C.
  const E = borneDepuis(s10, 'E', 2)
  const p = { x: 60, y: 5, z: 25.0 }
  const B = BORNES.find((b) => b.id === 'B')!
  const C = BORNES.find((b) => b.id === 'C')!
  const s14 = calculerStation([...BORNES_D, E], [viseeDepuis(p, E), viseeDepuis(p, B), viseeDepuis(p, C)], HI, HT, R)

  it('S14 : une borne créée depuis S10 est de rang 2 ; une station qui la vise est refusée (rang 3)', () => {
    expect(peutDevenirBorneEphemere(s10, R)).toEqual({ ok: true, rang: 2 })
    expect(s14.calculee).toBe(true)
    proche(s14.x, 60)
    proche(s14.y, 5)
    proche(s14.z, 25)
    expect(s14.rangMax).toBe(2)
    expect(s14.reportee).toBe(true)
    proche(s14.indice, 5.3) // matches the independent calculation below
    expect(s14.couleur).toBe('rouge')
    // Rank is checked first: refused with the rank message whatever its colour.
    expect(peutDevenirBorneEphemere(s14, R)).toEqual({ ok: false, raison: 'trop de reports, précision insuffisante' })
  })

  // The prompt RELEVE-CC-02 states this station is green. Proof it is not (independent calculation,
  // Python, report RAPPORT-RELEVE-CC-02.md): from (60 ; 5) the bearings are E 324.41°, B 324.27°,
  // C 157.71° (the three targets almost on one line through the station);
  // index = sqrt(3 / sum sin²(ai − aj)) = 5.30 > 4 => red (6.6). Not a PRD expected value.
  it.fails('S14 : la station visant la borne de rang 2 est verte (affirmation du prompt, fausse : indice 5,30)', () => {
    expect(s14.couleur).toBe('vert')
  })
})
