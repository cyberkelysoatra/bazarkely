// Edge cases (PRD section 8, 6.3, 6.3 bis, 6.4, 6.9).
import { describe, expect, it } from 'vitest'
import {
  calculerStation,
  calerBornes,
  ecartAngulaire,
  messageAucuneLettre,
  moyenneCaps,
  normaliserCap,
  prochaineLettreLibre,
} from '../index'
import type { ResultatCote } from '../index'
import { BORNES, HI, HT, R, proche, viseeDepuis } from './donnees'

const cote = (d: number): ResultatCote => ({
  distanceRetenue: d,
  distanceAppareil: d,
  distanceDecametre: null,
  ecartDecaApp: null,
  biais: null,
  ecartAllerRetour: null,
  denivele: 0,
  couleur: 'vert',
})

describe('Cas limites', () => {
  it('côtés 50, 50 et 99 m : angle min 8,1°, calage rouge, « bornes presque alignées »', () => {
    const r = calerBornes({ ab: cote(50), bc: cote(50), ac: cote(99), plan: {}, coteC: 'gauche', reglages: R })
    proche(r.angleMin, 8.1, 0.1)
    expect(r.couleur).toBe('rouge')
    expect(r.messages).toContain('bornes presque alignées')
    expect(r.messageRouge).toBe('bornes presque alignées')
  })

  it('côtés 50, 10 et 70 m : ok false, « côtés incompatibles »', () => {
    const r = calerBornes({ ab: cote(50), bc: cote(10), ac: cote(70), plan: {}, coteC: 'gauche', reglages: R })
    expect(r.ok).toBe(false)
    expect(r.messages).toContain('côtés incompatibles')
    expect(r.couleur).toBe('rouge')
  })

  it('sans plan et coteC null : ok false, question du côté de C, jamais de côté par défaut', () => {
    const r = calerBornes({ ab: cote(52.468), bc: cote(45.457), ac: cote(71.31), plan: {}, coteC: null, reglages: R })
    expect(r.ok).toBe(false)
    expect(r.messages).toContain('C à gauche ou à droite en regardant de A vers B')
    expect(Number.isNaN(r.bornes.c.x)).toBe(true)
    expect(r.coteCUtilise).toBeNull()
  })

  it('lettres réelles dans la question et le message rouge', () => {
    const r = calerBornes({
      ab: cote(52.468),
      bc: { ...cote(45.457), couleur: 'rouge', ecartDecaApp: -0.4 },
      ac: cote(71.31),
      plan: {},
      coteC: 'droite',
      reglages: R,
      lettres: { a: 'K', b: 'L', c: 'M' },
    })
    expect(r.messageRouge).toBe('Calage hors tolérance : refaire les mesures du côté L vers M conseillé')
    const q = calerBornes({ ab: cote(52.468), bc: cote(45.457), ac: cote(71.31), plan: {}, reglages: R, lettres: { a: 'K', b: 'L', c: 'M' } })
    expect(q.messages).toContain('M à gauche ou à droite en regardant de K vers L')
  })

  it('station à 0,5 m de A (visées calculées depuis les positions du jeu B) : tropPres', () => {
    const p = { x: 0.3, y: 0.4, z: 38.0 }
    const r = calculerStation(BORNES, BORNES.map((b) => viseeDepuis(p, b)), HI, HT, R)
    expect(r.calculee).toBe(true)
    proche(r.x, 0.3)
    proche(r.y, 0.4)
    expect(r.tropPres).toBe(true)
    expect(r.messages).toContain('trop près de la borne, calcul fragile')
  })

  it('moyenneCaps([358, 2]) = 0,0 et ([10, 20]) = 15,0', () => {
    const a = moyenneCaps([358, 2])
    proche(a.moyenne, 0.0, 0.1)
    proche(a.dispersion, 2.0, 0.1)
    const b = moyenneCaps([10, 20])
    proche(b.moyenne, 15.0, 0.1)
    proche(b.dispersion, 5.0, 0.1)
  })

  it('normaliserCap(5 − 10) = 355,0 ; ecartAngulaire(359, 1) = 2,0', () => {
    proche(normaliserCap(5 - 10), 355.0, 0.1)
    proche(normaliserCap(360), 0, 0.1)
    proche(ecartAngulaire(359, 1), 2.0, 0.1)
    proche(ecartAngulaire(244.4, 64.39), 179.99, 0.1)
  })

  it('26 lettres actives : prochaineLettreLibre null, message « retirez une borne éphémère pour libérer un panneau »', () => {
    const toutes = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
    expect(prochaineLettreLibre(toutes)).toBeNull()
    expect(messageAucuneLettre(toutes)).toBe('retirez une borne éphémère pour libérer un panneau')
  })
})
