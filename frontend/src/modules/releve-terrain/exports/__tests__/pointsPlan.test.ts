// H17: import of a text file of plan points « nom;x;y;altitude ».
import { describe, expect, it } from 'vitest'
import { lirePointsPlan } from '../pointsPlan'

describe('lirePointsPlan', () => {
  it('virgule ou point décimal, en-tête facultatif, lignes fausses listées et ignorées', () => {
    const r = lirePointsPlan('﻿nom;x;y;altitude\r\nP1;30;0;30\r\nP2;40,5;5.25;28,1\n\nP3;20;-5\nP4;abc;1;2\n;1;2;3\nP5; 12 ; −3 ; 31 ;\n')
    expect(r.points).toEqual([
      { nom: 'P1', x: 30, y: 0, z: 30 },
      { nom: 'P2', x: 40.5, y: 5.25, z: 28.1 },
      { nom: 'P5', x: 12, y: -3, z: 31 },
    ])
    expect(r.refusees.map((l) => l.numero)).toEqual([5, 6, 7])
    expect(r.refusees[0].raison).toContain('4 valeurs')
    expect(r.refusees[1].raison).toContain('nombres')
    expect(r.refusees[2].raison).toBe('nom vide')
  })

  it('sans en-tête : la première ligne est un point', () => {
    expect(lirePointsPlan('P1;1;2;3').points).toHaveLength(1)
  })

  it('une première ligne à moitié chiffrée n’est pas un en-tête', () => {
    expect(lirePointsPlan('P1;x;2;3\nP2;1;2;3').refusees).toHaveLength(1)
  })
})
