// PRD 11 game G: letters of the targets (6.9), after game F.
import { describe, expect, it } from 'vitest'
import {
  calculerStation,
  etiquetteBorne,
  ligneExportBorne,
  lettreLibre,
  peutDevenirBorneEphemere,
  prochainUsage,
  prochaineLettreLibre,
  verifierLettre,
} from '../index'
import { BORNES, HI, HT, JEU_B, R, proche, visees } from './donnees'

const ACTIVES = [
  { lettre: 'A', nom: 'Borne ouest' },
  { lettre: 'B', nom: 'Borne nord' },
  { lettre: 'C', nom: 'Borne sud-est' },
  { lettre: 'D', nom: 'Piquet du manguier' },
]

describe('Jeu G : lettres des bornes', () => {
  it('doublon refusé : la lettre B pendant que B est active', () => {
    expect(lettreLibre('B', ACTIVES.map((b) => b.lettre))).toBe(false)
    expect(verifierLettre('B', 'Nouveau piquet', ACTIVES)).toEqual({
      ok: false,
      message: 'La lettre B est déjà portée par Borne nord',
    })
  })

  it('prochain panneau libre avec A, B, C et D actives : E', () => {
    expect(prochaineLettreLibre(ACTIVES.map((b) => b.lettre))).toBe('E')
  })

  it('réemploi : D retirée, nouvelle borne depuis S01 : lettre D, usage 2, rang 1, en (19,993 ; 0,006 ; 33,274)', () => {
    const actives = ['A', 'B', 'C']
    const lettre = prochaineLettreLibre(actives)
    expect(lettre).toBe('D')
    expect(verifierLettre('D', 'Angle sud du parking', ACTIVES.slice(0, 3))).toEqual({ ok: true })
    expect(prochainUsage('D', [{ lettre: 'D', usage: 1 }])).toBe(2)
    const s01 = calculerStation(BORNES, visees(JEU_B[0].v), HI, HT, R)
    expect(s01.couleur).toBe('vert')
    proche(s01.indice, 1.55)
    expect(s01.rangMax).toBe(0)
    expect(peutDevenirBorneEphemere(s01, R)).toEqual({ ok: true, rang: 1 })
    proche(s01.x, 19.993)
    proche(s01.y, 0.006)
    proche(s01.z, 33.274)
  })

  it('écran Station : une seule ligne D, « Angle sud du parking »', () => {
    expect(etiquetteBorne({ lettre: 'D', usage: 2, nom: 'Angle sud du parking', etat: 'active' }, false)).toBe(
      'D, Angle sud du parking',
    )
  })

  it('historique et export : D (1) retirée, D (2) active', () => {
    const d1 = { lettre: 'D', usage: 1, nom: 'Piquet du manguier', etat: 'retiree' as const, rang: 1 as const }
    const d2 = { lettre: 'D', usage: 2, nom: 'Angle sud du parking', etat: 'active' as const, rang: 1 as const }
    expect(etiquetteBorne(d1, true)).toBe('D (1), Piquet du manguier, retirée')
    expect(etiquetteBorne(d2, true)).toBe('D (2), Angle sud du parking')
    expect(ligneExportBorne(d1)).toBe('D (1) ; Piquet du manguier ; borne éphémère ; 1 ; retirée')
    expect(ligneExportBorne(d2)).toBe('D (2) ; Angle sud du parking ; borne éphémère ; 1 ; active')
  })

  it('S10 à S13 gardent leurs résultats (calcul sur la borne D (1), indépendant de la lettre réemployée)', () => {
    const D1 = { id: 'D-1', lettre: 'D', x: 35.0, y: 11.999, z: 29.728, rang: 1 as const }
    const s10 = calculerStation(
      [...BORNES, D1],
      visees({ A: null, B: [13.3, 8.3], C: [32.75, -6.3], 'D-1': [20.57, 13.6] }),
      HI,
      HT,
      R,
    )
    proche(s10.x, 54.993)
    proche(s10.y, 11.995)
    proche(s10.z, 24.906)
  })
})
