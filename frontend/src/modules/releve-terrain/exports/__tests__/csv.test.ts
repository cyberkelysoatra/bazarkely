// H18: CSV of the points on game G (letters reused, D (1) withdrawn, D (2) active), État « , reportée »
// (6.7), header, BOM, decimal comma, spreadsheet injection guard.
import { describe, expect, it } from 'vitest'
import { REGLAGES_DEFAUT } from '../../calcul'
import type { Objet, SauvegardeReleve } from '../../db/types'
import { jeuF, jeuG } from '../../etat/jeux'
import { calculerReleve, type StationCalculee } from '../../etat/releveCalcule'
import { COLONNES_CSV, etatStation, lignesCsv, nombreCsv, texteCsv, texteCsvReleve } from '../csv'

function objets(s: SauvegardeReleve): Objet[] {
  return s.objets.map((o) => ({ ...o, releve_id: s.releve.id, supprime: false, saisi_at: o.saisi_at ?? '2026-11-18T05:00:00.000Z', maj_at: o.saisi_at ?? '2026-11-18T05:00:00.000Z', apres_reprise: false, envoi: 'a_envoyer' }) as Objet)
}
const calc = (s: SauvegardeReleve) => calculerReleve(s.releve.entete, objets(s), REGLAGES_DEFAUT)

describe('CSV du jeu G', () => {
  const g = calc(jeuG())
  const texte = texteCsvReleve(g)
  const lignes = lignesCsv(g)

  it('BOM, fin de ligne CRLF, en-tête exactement comme H18', () => {
    expect(texte.charCodeAt(0)).toBe(0xfeff)
    expect(texte.includes('\r\n')).toBe(true)
    expect(lignes[0]).toBe('Point;Endroit;Type;Rang;État;X;Y;Altitude;Couleur;Écart altitude;Écart position;Indice géométrie;Bornes visées;Heure;Note')
    expect(COLONNES_CSV).toHaveLength(15)
  })

  it('D (1) retirée et D (2) active', () => {
    expect(lignes.some((l) => l.startsWith('D (1);Piquet du manguier;borne éphémère;1;retirée'))).toBe(true)
    expect(lignes.some((l) => l.startsWith('D (2);Angle sud du parking;borne éphémère;1;active'))).toBe(true)
    expect(lignes.some((l) => l.startsWith('A;'))).toBe(true)
  })

  it('S10 vise « B, C, D (1) » ; virgule décimale ; heure HH:MM ; aucun tiret long ni point médian', () => {
    const s10 = lignes.find((l) => l.startsWith('S10;'))!
    const c = s10.split(';')
    expect(c[12]).toBe('B, C, D (1)')
    expect(c[2]).toBe('station')
    expect(c[4]).toBe('normale')
    expect(c[8]).toBe('vert')
    expect(c[5]).toMatch(/^54,99\d$/)
    expect(c[6]).toMatch(/^11,99\d$/)
    expect(c[7]).toMatch(/^24,9\d\d$/)
    expect(c[13]).toMatch(/^\d\d:\d\d$/)
    expect(/[\u2014\u2013\u00b7]/.test(texte)).toBe(false)
    // D (2) at the position of S01 (19,993 ; 0,006 ; 33,274).
    const d2 = lignes.find((l) => l.startsWith('D (2);'))!.split(';')
    expect(d2.slice(5, 8)).toEqual(['19,993', '0,006', '33,274'])
  })

  it('une ligne par borne puis par station', () => {
    expect(lignes).toHaveLength(1 + g.bornes.length + g.stations.length)
  })
})

describe('État d’une station', () => {
  const f = calc(jeuF())
  const base = f.stations.find((s) => s.numero === 'S10')!

  it('« , reportée » quand la station vise une borne de rang 2 (6.7)', () => {
    const reportee: StationCalculee = { ...base, resultat: { ...base.resultat, rangMax: 2, reportee: true } }
    expect(etatStation(reportee)).toBe('normale, reportée')
    expect(etatStation({ ...reportee, donnees: { ...reportee.donnees, etat: 'gardee' } })).toBe('gardée, reportée')
    expect(etatStation(base)).toBe('normale')
  })

  it('écartée, en attente, gardée', () => {
    expect(etatStation({ ...base, donnees: { ...base.donnees, etat: 'ecartee' } })).toBe('écartée')
    expect(etatStation({ ...base, incomplete: true })).toBe('en attente')
    expect(etatStation({ ...base, donnees: { ...base.donnees, etat: 'gardee' } })).toBe('gardée')
  })
})

describe('cellules', () => {
  it('injection : préfixe « \' » pour =, +, @ et « - » suivi d’une lettre, jamais pour un nombre', () => {
    expect(texteCsv('=SOMME(A1)')).toBe("'=SOMME(A1)")
    expect(texteCsv('+33 6')).toBe("'+33 6")
    expect(texteCsv('@cmd')).toBe("'@cmd")
    expect(texteCsv('-Note')).toBe("'-Note")
    expect(texteCsv('-12')).toBe('-12')
    expect(nombreCsv(-3.5)).toBe('-3,500')
    expect(nombreCsv(-0.0001)).toBe('0,000')
    expect(texteCsv('a;b')).toBe('"a;b"')
    expect(texteCsv('dit "oui"')).toBe('"dit ""oui"""')
    expect(texteCsv('a — b')).toBe('a - b')
  })
})
