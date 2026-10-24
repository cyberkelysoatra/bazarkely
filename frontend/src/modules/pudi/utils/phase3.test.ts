// Phase 3: data v3 (full labels, pages), links to the PDF, proposals in the draft, opening date
// and late proposals in the synthesis (B2, B5, B9, B10).
import { describe, expect, it } from 'vitest';
import donneesBrutes from '../data/pudi-donnees.json';
import type { PudiDonnees } from '../data/types';
import { documentPudi, libellePages, urlPagePudi } from './documents';
import { retirerPropositionsAbsentes } from './regles';
import { estProposition } from '../appels/propositions';
import { METHODE, NON_PUBLIEE, csvSynthese, noteExposition, preparerSynthese, texteOuverture, type ResultatsSynthese } from './synthese';
import { dateJour, dateLongue } from './format';

const D = donneesBrutes as unknown as PudiDonnees;

describe('data v3 (B2)', () => {
  it('the 137 codes carry their official full label', () => {
    const codes = D.programmes.flatMap((p) => p.codes);
    expect(codes).toHaveLength(137);
    expect(codes.every((c) => typeof c.libelleComplet === 'string' && c.libelleComplet.length > 3)).toBe(true);
  });
  it('A1 shows « PUDi p. 66, 67, 68, 136, 140, 144 »', () => {
    const a1 = D.programmes.find((p) => p.id === 'A1')!;
    expect(libellePages(a1.pagesPudi ?? [])).toBe('PUDi p. 66, 67, 68, 136, 140, 144');
  });
  it('H1 has its precision (CHRD II, p. 34)', () => {
    const h1 = D.programmes.find((p) => p.id === 'H1')!;
    expect(h1.precision).toContain('CHRD II');
    expect(h1.precision).toContain('p. 34');
  });
  it('the link of PAM01 p. 66 opens the PDF at file page 74', () => {
    const pam01 = D.programmes.flatMap((p) => p.codes).find((c) => c.code === 'PAM01')!;
    expect(pam01.pagesPudi?.[0]).toBe(66);
    expect(urlPagePudi(documentPudi(D), 66)).toBe('/pudi/documents/pudi-nosy-be-2025-2040-v2.pdf#page=74');
  });
  it('two public documents with their exact sizes', () => {
    expect(D.meta.documents?.map((d) => [d.fichier, d.octets])).toEqual([
      ['pudi-nosy-be-2025-2040-v2.pdf', 14638893],
      ['reglements-urbanisme-pudi-nosy-be.pdf', 1175328]
    ]);
  });
});

describe('proposals in the draft (B5)', () => {
  it('a withdrawn proposal leaves the draft, programmes are kept', () => {
    const b = { priorites: ['A1', 'P2', 'H1'], urgents: ['P2', 'P5', 'W4'], manquant: 'x' };
    const r = retirerPropositionsAbsentes(b, ['P1', 'P3', 'P4', 'P5'], estProposition);
    expect(r.retires).toEqual(['P2']);
    expect(r.brouillon).toEqual({ priorites: ['A1', 'H1'], urgents: ['P5', 'W4'], manquant: 'x' });
  });
  it('nothing changes when every proposal is still listed', () => {
    const b = { priorites: ['A1', 'P1', 'H1'], urgents: [], manquant: '' };
    const r = retirerPropositionsAbsentes(b, ['P1'], estProposition);
    expect(r.retires).toEqual([]);
    expect(r.brouillon).toBe(b);
  });
  it('proposal ids are P1, P2... and never a programme id', () => {
    expect(estProposition('P12')).toBe(true);
    expect(D.programmes.some((p) => estProposition(p.id))).toBe(false);
  });
});

describe('opening date and late proposals (B9)', () => {
  it('formats publie_at in Madagascar time', () => {
    expect(texteOuverture('2026-10-22T06:14:00Z')).toBe('jeudi 22 octobre 2026 à 9 h 14');
    expect(dateLongue('2026-10-22T05:00:00Z')).toBe('jeudi 22 octobre 2026 à 8 h');
    expect(texteOuverture(null)).toBe(NON_PUBLIEE);
    expect(NON_PUBLIEE).toBe('Consultation non encore publiée');
  });
  it('« exposée x jours sur y » only for a proposal added more than 24 h after the publication', () => {
    const pub = '2026-10-22T06:14:00Z';
    const fin = '2026-10-26T17:00:00Z';
    expect(noteExposition('2026-10-24T09:00:00Z', pub, fin)).toBe('Ajoutée le 24 octobre 2026 : exposée 2 jours sur 4');
    expect(noteExposition('2026-10-26T09:00:00Z', pub, fin)).toBe('Ajoutée le 26 octobre 2026 : exposée 0 jour sur 4');
    expect(noteExposition('2026-10-22T20:00:00Z', pub, fin)).toBeUndefined();
    expect(noteExposition('2026-10-21T12:46:00Z', pub, fin)).toBeUndefined();
    expect(noteExposition('2026-10-24T09:00:00Z', null, fin)).toBeUndefined();
  });
  it('dateJour reads plain dates and timestamps', () => {
    expect(dateJour('2026-10-20')).toBe('20 octobre 2026');
    expect(dateJour('2026-10-21T22:30:00Z')).toBe('22 octobre 2026');
  });
});

describe('synthesis with proposals (B10)', () => {
  const base: ResultatsSynthese = {
    nb_votants: 2,
    cloture_at: '2026-10-26T17:00:00Z',
    calcule_at: '2026-10-27T08:00:00Z',
    priorites: D.programmes.map((p) => ({ id: p.id, n: 0, pct: 0 })),
    urgents: D.programmes.map((p) => ({ id: p.id, n: 0, pct: 0, tranche_pudi: 1, ecart: false })),
    par_profil: {},
    par_fokontany: {},
    reseaux: { dans_nos_reseaux: 0, hors_reseaux: 2 },
    manquants: [],
    publie_at: '2026-10-22T06:14:00Z',
    propositions: [
      { id: 'P1', intitule: 'Nouveau CHRD', ajoute_at: '2026-10-21T12:46:30Z', n_priorite: 2, pct_priorite: 100, n_urgent: 0, pct_urgent: 0 },
      { id: 'P6', intitule: 'Éclairage du port', ajoute_at: '2026-10-24T09:00:00Z', n_priorite: 1, pct_priorite: 50, n_urgent: 1, pct_urgent: 50 }
    ]
  };
  const s = preparerSynthese(base, D, {
    provisoire: false,
    propositions: [
      { id: 'P1', source: 'Réunion PIC3 du 20/10/2026' },
      { id: 'P6', source: "Ajout de l'administrateur" }
    ]
  });
  it('opening from publie_at, proposals with source, counts, date and late note', () => {
    expect(s.ouverture).toBe('jeudi 22 octobre 2026 à 9 h 14');
    expect(s.propositions).toEqual([
      { rang: 1, id: 'P1', intitule: 'Nouveau CHRD', source: 'Réunion PIC3 du 20/10/2026', ajoutee: '21 octobre 2026', nPriorite: 2, pctPriorite: '100 %', voix: 2, votants: 2, pctVoix: '100 %', pctVotants: '100 %', concentration: 0, nUrgent: 0, pctUrgent: '0 %', note: undefined },
      { rang: 2, id: 'P6', intitule: 'Éclairage du port', source: "Ajout de l'administrateur", ajoutee: '24 octobre 2026', nPriorite: 1, pctPriorite: '50 %', voix: 1, votants: 1, pctVoix: '50 %', pctVotants: '50 %', concentration: 0, nUrgent: 1, pctUrgent: '50 %', note: 'Ajoutée le 24 octobre 2026 : exposée 2 jours sur 4' }
    ]);
    expect(s.priorites.some((l) => l.id.startsWith('P'))).toBe(false);
  });
  it('not published: « Consultation non encore publiée », no late note', () => {
    const np = preparerSynthese({ ...base, publie_at: null }, D, { provisoire: true });
    expect(np.ouverture).toBe('Consultation non encore publiée');
    expect(np.propositions.every((l) => l.note === undefined)).toBe(true);
  });
  it('method sentence on proposals, no em dash, CSV section apart', () => {
    expect(METHODE).toContain(
      'Les propositions sont des demandes des parties prenantes absentes de la liste retenue dans le PUDi ; elles sont comptées à part et certaines ont été exposées moins longtemps que les programmes.'
    );
    const tout = JSON.stringify(s) + csvSynthese(s);
    expect(tout).not.toContain('\u2014');
    expect(csvSynthese(s).split('\r\n').filter((l) => l.startsWith('proposition_hors_pic;'))).toHaveLength(2);
  });
});
