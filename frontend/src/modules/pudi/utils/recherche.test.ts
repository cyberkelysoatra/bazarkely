// « Trouver un projet » (B6): queries of the acceptance criteria on the real data file.
import { describe, expect, it } from 'vitest';
import donneesBrutes from '../data/pudi-donnees.json';
import type { PudiDonnees } from '../data/types';
import { MAX_RESULTATS, construireIndex, normaliser, premiers, rechercher, type PropositionIndexable } from './recherche';

const D = donneesBrutes as unknown as PudiDonnees;
const PROPOSITIONS: PropositionIndexable[] = [
  { id: 'P1', intitule: 'Hôpital de niveau régional à Nosy Be', lieu: null, source: 'Réunion PIC3 du 20/10/2026', precision: "Demande exprimée en réunion PIC3 : soigner sur place les malades aujourd'hui évacués vers Antsiranana." },
  { id: 'P2', intitule: 'Projets pour Nosy Sakatia', lieu: 'Nosy Sakatia', source: 'Réunion PIC3 du 20/10/2026', precision: null },
  { id: 'P3', intitule: 'Sécurité de la bande littorale des 300 m', lieu: 'Littoral', source: 'Sondage des opérateurs des 18 et 19/10/2026', precision: null },
  { id: 'P4', intitule: 'Lutte contre les nuisances sonores nocturnes', lieu: null, source: 'Sondage des opérateurs des 18 et 19/10/2026', precision: null },
  { id: 'P5', intitule: 'Gestion des animaux errants', lieu: null, source: 'Sondage des opérateurs des 18 et 19/10/2026', precision: null }
];
const index = construireIndex(D, PROPOSITIONS);
const ids = (q: string) => premiers(rechercher(index, q));

describe('normaliser', () => {
  it('lower case, no accents, apostrophes and hyphens as spaces, spaces collapsed', () => {
    expect(normaliser("  Djabala-Bé,   l'Île  ")).toBe('djabala be l ile');
    expect(normaliser('Dar-es-Salam')).toBe('dar es salam');
    expect(normaliser('Hôpital ŒUVRE')).toBe('hopital oeuvre');
  });
});

describe('rechercher (B6)', () => {
  it('« Nosy Komba » gives R4 first (direct match)', () => {
    const r = rechercher(index, 'Nosy Komba');
    expect(r.directs[0].id).toBe('R4');
    expect(ids('Nosy Komba')[0]).toBe('R4');
  });

  it('« toilettes » gives W4', () => {
    expect(ids('toilettes')[0]).toBe('W4');
  });

  it('« CHRD », « CHRR », « hôpital », « évacuation sanitaire » give P1, then A6, then H1 (v6)', () => {
    for (const q of ['CHRD', 'chrd', 'CHRR', 'hôpital', 'hopital', 'Hôpital', 'évacuation sanitaire', 'Evacuation Sanitaire']) {
      const r = rechercher(index, q);
      expect(r.directs.map((x) => x.id)).toEqual(['P1', 'A6', 'H1']);
      expect(ids(q).slice(0, 3)).toEqual(['P1', 'A6', 'H1']);
    }
  });

  it('« csb » gives H2 first, then H1', () => {
    expect(rechercher(index, 'csb').directs.map((x) => x.id)).toEqual(['H2', 'H1']);
    expect(ids('CSB')[0]).toBe('H2');
  });

  it('« eau » gives W1 first', () => {
    expect(ids('eau')[0]).toBe('W1');
    expect(ids('Eau')[0]).toBe('W1');
  });

  it('« bruit » gives P4', () => {
    expect(ids('bruit')[0]).toBe('P4');
  });

  it('« djab » (prefix) finds H1, D2 and Q3 among the results, the matched word in bold', () => {
    const r = rechercher(index, 'djab');
    expect(premiers(r)).toEqual(expect.arrayContaining(['H1', 'D2', 'Q3']));
    for (const x of [...r.directs, ...r.autres]) {
      const [a, b] = x.explication.surlignes[0];
      expect(normaliser(x.explication.texte.slice(a, b)).startsWith('djab')).toBe(true);
    }
    const d2 = r.autres.find((x) => x.id === 'D2')!;
    expect(d2.explication).toMatchObject({ champ: 'sites', texte: 'Djabala Be', surlignes: [[0, 7]] });
  });

  it('a fokontany spelling (Djabalabe) also finds the PUDi spelling (Djabala Be)', () => {
    const r = rechercher(index, 'Djabalabe');
    const h1 = r.autres.find((x) => x.id === 'H1');
    expect(h1?.explication.fokontany).toBe('Djabalabe');
  });

  it('« Ambatoloaka » finds the programmes that cite it', () => {
    const attendus = D.programmes
      .filter((p) => JSON.stringify(p).toLowerCase().includes('ambatoloaka'))
      .map((p) => p.id);
    expect(attendus.length).toBeGreaterThan(0);
    expect(ids('Ambatoloaka')).toEqual(expect.arrayContaining(attendus));
  });

  it('several words: all must match (AND)', () => {
    const r = rechercher(index, 'djab sante').autres.map((x) => x.id);
    expect(r.length).toBeGreaterThan(0);
    for (const id of r) {
      const p = D.programmes.find((x) => x.id === id);
      const texte = normaliser(JSON.stringify(p));
      expect(texte).toContain('djab');
    }
    expect(premiers(rechercher(index, 'djabala zzz'))).toEqual([]);
  });

  it('« zzz » and an empty query give no result', () => {
    expect(rechercher(index, 'zzz').total).toBe(0);
    expect(rechercher(index, '   ').total).toBe(0);
  });

  it('a withdrawn proposal is never a direct match', () => {
    const sansP1 = construireIndex(D, PROPOSITIONS.filter((p) => p.id !== 'P1'));
    expect(rechercher(sansP1, 'sakatia').directs.map((x) => x.id)).toEqual(['P2']);
    const sansP2 = construireIndex(D, PROPOSITIONS.filter((p) => p.id !== 'P2'));
    expect(rechercher(sansP2, 'sakatia').directs).toEqual([]);
  });

  it('at most 30 results shown, the count is the full number', () => {
    const r = rechercher(index, 'a');
    expect(r.directs.length + r.autres.length).toBeLessThanOrEqual(MAX_RESULTATS);
    expect(r.total).toBeGreaterThan(MAX_RESULTATS);
  });

  it('long texts are cut around the match, highlight kept on the matched word', () => {
    const r = rechercher(index, 'adjacentes');
    const ex = [...r.directs, ...r.autres][0].explication;
    const [a, b] = ex.surlignes[0];
    expect(normaliser(ex.texte.slice(a, b))).toBe('adjacentes');
    expect(ex.texte.length).toBeLessThan(140);
  });
});
