// PUDI-CC-17: 12 votes to spread (rule B), results by votes and voters, closing from the server.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import donneesBrutes from '../data/pudi-donnees.json';
import type { PudiDonnees } from '../data/types';
import { frPages } from '../i18n/frPages';
import { CHANGEMENT_REGLE, csvSynthese, preparerSynthese, texteVotes3Voix, type ResultatsSynthese } from './synthese';
import { voteA3Voix } from './exports';
import { voteAvantRegle } from './monVote';
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
    urgents: [],
    par_profil: { habitant: 5 },
    par_fokontany: {},
    reseaux: { dans_nos_reseaux: 0, hors_reseaux: 5 },
    manquants: [],
    voix_placees: 40,
    repartition: { '1': 1, '3': 1, '12': 3 },
    concentration: { votes: 1, pct_votes: 20, voix: 12, pct_voix: 30 },
    nb_votes_3_voix: 1
  };
  const s = preparerSynthese(r, D, { provisoire: true });
  it('votes, voters, shares and concentration per programme (figures checked by hand)', () => {
    expect(s.priorites[0]).toMatchObject({ id: 'A4', voix: 17, votants: 2, pctVoix: '42,5 %', pctVotants: '40 %', concentration: 1 });
    expect(s.priorites[1]).toMatchObject({ id: 'T3', voix: 6, votants: 3, pctVoix: '15 %', pctVotants: '60 %' });
    expect(s.voixPlacees).toBe(40);
    expect(s.concentration).toBe('1 vote (20 % des votes) a placé 6 voix ou plus sur un seul programme.');
    expect(s.repartition.map((l) => l.n)).toEqual([1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 3]);
  });
  it('method: verbatim sentence of the specification v9 and the votes left at 3', () => {
    expect(CHANGEMENT_REGLE).toBe(
      'La règle a changé le 24/10/2026 à la demande des votants : 12 voix à répartir au lieu de 3 priorités. Les votes antérieurs comptent pour 3 voix, sauf si leur auteur les a complétés.'
    );
    expect(s.methode).toContain(CHANGEMENT_REGLE);
    expect(s.methode).toContain(texteVotes3Voix(1));
  });
  it('CSV columns voix, votants, % voix, % votants, concentration', () => {
    const l = csvSynthese(s).split('\r\n');
    expect(l[0].replace('﻿', '')).toMatch(/;voix;votants;pct_voix;pct_votants;concentration$/);
    expect(l[1]).toMatch(/^voix;1;A4;/);
    expect(l[1]).toMatch(/;17;2;42,5 %;40 %;1$/);
    expect(l.filter((x) => x.startsWith('voix_utilisees;'))).toHaveLength(12);
    expect(l.some((x) => x.startsWith('votes_restes_a_3_voix;') && x.includes(';1;'))).toBe(true);
  });
  it('no em dash in the new texts', () => {
    expect(JSON.stringify(frPages.voix) + JSON.stringify(frPages.resultats) + CHANGEMENT_REGLE).not.toContain('—');
  });
});

describe('votes sent before the rule', () => {
  it('a vote of 3 distinct programmes not modified since = « vote à 3 voix »', () => {
    expect(voteA3Voix({ priorites: ['T3', 'A1', 'W3'], modifie_le: '2026-10-23T10:00:00Z' }, REGLE)).toBe(true);
    expect(voteA3Voix({ priorites: ['T3', 'A1', 'W3'], modifie_le: '2026-10-25T10:00:00Z' }, REGLE)).toBe(false);
    expect(voteA3Voix({ priorites: ['T3', 'T3', 'W3'], modifie_le: '2026-10-23T10:00:00Z' }, REGLE)).toBe(false);
    expect(voteA3Voix({ priorites: ['T3', 'A1', 'W3'], modifie_le: '2026-10-23T10:00:00Z' }, null)).toBe(false);
  });
  it('banner: own vote of 3 votes or fewer sent before the rule, until sent again', () => {
    expect(voteAvantRegle({ priorites: ['T3', 'A1', 'W3'], date: '2026-10-23T10:00:00Z' }, REGLE)).toBe(true);
    expect(voteAvantRegle({ priorites: ['T3', 'A1', 'W3', 'A4'], date: '2026-10-23T10:00:00Z' }, REGLE)).toBe(false);
    expect(voteAvantRegle({ priorites: ['T3', 'A1', 'W3'], date: '2026-10-25T10:00:00Z' }, REGLE)).toBe(false);
    expect(frPages.voix.banniere(12 - 3)).toBe('Vous pouvez maintenant placer jusqu’à 9 voix de plus.');
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
