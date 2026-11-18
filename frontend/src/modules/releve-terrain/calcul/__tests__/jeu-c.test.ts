// PRD 11 game C: faulty stations (H08, H11, 6.4).
import { describe, expect, it } from 'vitest'
import { calculerStation } from '../index'
import { BORNES, HI, HT, R, proche, visees } from './donnees'

describe('Jeu C : stations à défaut', () => {
  it('E1 : distance vers B fausse de 2 m', () => {
    const r = calculerStation(BORNES, visees({ A: [31.26, 13.3], B: [27.05, -9.4], C: [46.07, -12.0] }), HI, HT, R)
    proche(r.x, 29.569)
    proche(r.y, 3.238)
    proche(r.z, 31.072)
    proche(r.altitudesParBorne?.A, 30.919)
    proche(r.altitudesParBorne?.B, 31.248)
    proche(r.altitudesParBorne?.C, 30.908)
    proche(r.ecartAltitude, 0.339)
    expect(r.couleurs?.ecartAltitude).toBe('orange')
    proche(r.ecartPosition, 0.676)
    expect(r.couleurs?.ecartPosition).toBe('rouge')
    expect(r.viseeSuspecte).toBe('B')
    expect(r.couleur).toBe('rouge')
  })

  it('E2 : pente vers C fausse de 3°', () => {
    const r = calculerStation(BORNES, visees({ A: [31.26, 13.3], B: [25.05, -9.4], C: [46.07, -9.0] }), HI, HT, R)
    proche(r.x, 29.797)
    proche(r.y, 5.352)
    proche(r.z, 30.561)
    proche(r.altitudesParBorne?.A, 30.919)
    proche(r.altitudesParBorne?.B, 30.921)
    proche(r.altitudesParBorne?.C, 28.537)
    proche(r.ecartAltitude, 2.384)
    expect(r.couleurs?.ecartAltitude).toBe('rouge')
    proche(r.ecartPosition, 0.147)
    expect(r.couleurs?.ecartPosition).toBe('vert')
    expect(r.viseeSuspecte).toBe('C')
    expect(r.couleur).toBe('rouge')
  })

  it('E4 : station loin, hors du triangle', () => {
    const r = calculerStation(BORNES, visees({ A: [154.3, 13.6], B: [108.09, 13.3], C: [84.93, 13.2] }), HI, HT, R)
    proche(r.x, 149.994)
    proche(r.y, -0.017)
    proche(r.z, 1.928)
    proche(r.indice, 3.38)
    expect(r.couleurs?.indice).toBe('orange')
    expect(r.couleurs?.distance).toBe('orange')
    expect(r.viseesLongues.sort()).toEqual(['A', 'B', 'C'])
    expect(r.couleur).toBe('orange')
  })

  it('E5 : C « pas visible » : pas de calcul, station en attente, proposition de borne éphémère', () => {
    const r = calculerStation(BORNES, visees({ A: [31.26, 13.3], B: [25.05, -9.4], C: null }), HI, HT, R)
    expect(r.calculee).toBe(false)
    expect(r.incomplete).toBe(true)
    expect(r.bornesManquantes).toEqual(['C'])
    expect(r.propositionEphemere).toBe(true)
    expect(r.messages).toContain('Ajouter une borne éphémère')
    expect(r.x).toBeUndefined()
  })
})
