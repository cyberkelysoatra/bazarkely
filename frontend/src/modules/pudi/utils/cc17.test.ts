// PUDI-CC-17: 12 votes to spread (rule B), results by votes and voters, closing from the server.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import donneesBrutes from '../data/pudi-donnees.json';
import type { PudiDonnees } from '../data/types';
import { frPages } from '../i18n/frPages';
import { CHANGEMENT_REGLE, csvSynthese, preparerSynthese, texteVotesConvertis, type ResultatsSynthese } from './synthese';
import { classementUrgentsArchive, voteConverti } from './exports';
import { CLOTURE_PAR_DEFAUT, ecrireDatesCache, lireDatesCache } from './format';
import { dateGel } from './masquage';

const D = donneesBrutes as unknown as PudiDonnees;
const REGLE = '2026-10-24T18:00:00Z';

describe('synthesis by votes', () => {
  const ligne = (id: string, voix: number, votants: number, conc = 0) => ({
    id,
    n: votants,
    pct: (100 * votants) / 5,
    voix,
    votants,
    pct_voix: Math.round((1000 * voix) / 40) / 10,
    pct_votants: (100 * votants) / 5,
    concentration: conc
  });
  const r: ResultatsSynthese = {
    nb_votants: 5,
    cloture_at: '2026-10-27T05:00:00Z',
    calcule_at: '2026-10-25T08:00:00Z',
    priorites: [ligne('A4', 17, 2, 1), ligne('T3', 6, 3), ligne('A1', 2, 2)],
    par_profil: { habitant: 5 },
    par_fokontany: {},
    reseaux: { dans_nos_reseaux: 0, hors_reseaux: 5 },
    manquants: [],
    voix_placees: 40,
    repartition: { '1': 1, '3': 1, '12': 3 },
    concentration: { votes: 1, pct_votes: 20, voix: 12, pct_voix: 30 },
    nb_votes_convertis: 1
  };
  const s = preparerSynthese(r, D, { provisoire: true });
  it('votes, voters, shares and concentration per programme (figures checked by hand)', () => {
    expect(s.priorites[0]).toMatchObject({ id: 'A4', voix: 17, votants: 2, pctVoix: '42,5 %', pctVotants: '40 %', concentration: 1 });
    expect(s.priorites[1]).toMatchObject({ id: 'T3', voix: 6, votants: 3, pctVoix: '15 %', pctVotants: '60 %' });
    expect(s.voixPlacees).toBe(40);
    expect(s.concentration).toBe('1 vote (20 % des votes) a placé 6 voix ou plus sur un seul programme.');
    expect(s.repartition.map((l) => l.n)).toEqual([1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 3]);
  });
  it('method: verbatim sentence of PUDI-CC-18 and the converted votes kept as they are', () => {
    expect(CHANGEMENT_REGLE).toBe(
      "La règle a changé le 24/10/2026 à la demande des votants : 12 voix à répartir au lieu de 3 priorités, sans question séparée sur l'urgence. Les votes antérieurs ont été convertis en 4 voix sur chacun de leurs 3 programmes, sauf si leur auteur les a modifiés."
    );
    expect(s.methode).toContain(CHANGEMENT_REGLE);
    expect(s.methode).toContain(texteVotesConvertis(1));
  });
  it('CSV columns voix, votants, % voix, % votants, concentration', () => {
    const l = csvSynthese(s).split('\r\n');
    expect(l[0].replace('﻿', '')).toMatch(/;voix;votants;pct_voix;pct_votants;concentration$/);
    expect(l[1]).toMatch(/^note;/);
    expect(l[2]).toMatch(/^voix;1;A4;/);
    expect(l[2]).toMatch(/;17;2;42,5 %;40 %;1$/);
    expect(l.filter((x) => x.startsWith('voix_utilisees;'))).toHaveLength(12);
    expect(l.some((x) => x.startsWith('votes_convertis_4_4_4;') && x.includes(';1;'))).toBe(true);
  });
  it('no em dash in the new texts', () => {
    expect(JSON.stringify(frPages.voix) + JSON.stringify(frPages.resultats) + CHANGEMENT_REGLE).not.toContain('—');
  });
});

describe('votes sent before the rule', () => {
  it('PUDI-CC-18: an old vote converted to 4 + 4 + 4 and not sent again = « converti 4 + 4 + 4 »', () => {
    const c = ['A1', 'A1', 'A1', 'A1', 'T3', 'T3', 'T3', 'T3', 'W3', 'W3', 'W3', 'W3'];
    expect(voteConverti({ priorites: c, modifie_le: '2026-10-23T10:00:00Z' }, REGLE)).toBe(true);
    expect(voteConverti({ priorites: c, modifie_le: '2026-10-25T10:00:00Z' }, REGLE)).toBe(false);
    expect(voteConverti({ priorites: ['T3', 'A1', 'W3'], modifie_le: '2026-10-23T10:00:00Z' }, REGLE)).toBe(false);
    expect(voteConverti({ priorites: [...c.slice(0, 11), 'A1'], modifie_le: '2026-10-23T10:00:00Z' }, REGLE)).toBe(false);
    expect(voteConverti({ priorites: c, modifie_le: '2026-10-23T10:00:00Z' }, null)).toBe(false);
  });
  it('PUDI-CC-18: archive of the old urgents, votes kept only', () => {
    expect(
      classementUrgentsArchive([
        { urgents: ['A6', 'N2'], masque: false, est_test: false },
        { urgents: ['N2'], masque: false, est_test: false },
        { urgents: ['A1'], masque: true, est_test: false },
        { urgents: ['A2'], masque: false, est_test: true },
        { urgents: [], masque: false, est_test: false }
      ])
    ).toEqual([
      { id: 'N2', n: 2 },
      { id: 'A6', n: 1 }
    ]);
  });
});

describe('closing and freeze from the server', () => {
  beforeEach(() => {
    const m = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
      removeItem: (k: string) => void m.delete(k),
      clear: () => m.clear()
    });
  });
  it('fallback only when nothing was ever received', () => {
    expect(lireDatesCache().cloture_at).toBe(CLOTURE_PAR_DEFAUT);
    expect(dateGel(lireDatesCache().gel_listes_at)).toBe('mardi 27/10/2026 à 18 h');
  });
  it('the last server dates win (closing moved to 31/10 without a new version)', () => {
    ecrireDatesCache({ cloture_at: '2026-10-31T05:00:00Z', gel_listes_at: '2026-10-31T15:00:00Z' });
    expect(lireDatesCache()).toEqual({ cloture_at: '2026-10-31T05:00:00Z', gel_listes_at: '2026-10-31T15:00:00Z' });
    ecrireDatesCache({ cloture_at: '2026-10-31T05:00:00Z' });
    expect(lireDatesCache().gel_listes_at).toBe('2026-10-31T15:00:00Z');
    expect(dateGel(lireDatesCache().gel_listes_at)).toBe('samedi 31/10/2026 à 18 h');
  });
});
