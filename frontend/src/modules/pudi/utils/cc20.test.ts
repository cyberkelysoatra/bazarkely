// PUDI-CC-20: reactions counted on the device, easing of the scrolls, reduced results without the
// total of the votes placed and with whole-number percentages.
import { describe, expect, it } from 'vitest';
import donneesBrutes from '../data/pudi-donnees.json';
import type { PudiDonnees } from '../data/types';
import { EMOJIS, appliquerReaction, type MessageDiscussion } from '../appels/discussion';
import { adoucir } from './defilement';
import { preparerSynthese, type ResultatsSynthese } from './synthese';

const D = donneesBrutes as unknown as PudiDonnees;
const message = (reactions: Record<string, number> | null, ma: string | null): MessageDiscussion => ({
  id: 'm',
  auteur_nom: 'Test T.',
  texte: 'bonjour',
  supprime: false,
  supprime_role: null,
  cree_at: '2026-10-25T10:00:00Z',
  reponse_a: null,
  est_moi: false,
  peut_supprimer: false,
  auteur_suspendu: null,
  reactions,
  ma_reaction: ma
});
const [POUCE, COEUR, RIRE] = EMOJIS;

describe('reactions (one per person and message)', () => {
  it('six emojis, same list as the server check', () => {
    expect(EMOJIS).toEqual(['\u{1F44D}', '❤️', '\u{1F602}', '\u{1F62E}', '\u{1F622}', '\u{1F64F}']);
  });
  it('add', () => {
    expect(appliquerReaction(message({ [POUCE]: 2 }, null), POUCE)).toMatchObject({ reactions: { [POUCE]: 3 }, ma_reaction: POUCE });
  });
  it('replace: the old emoji loses one, the new one gains one', () => {
    expect(appliquerReaction(message({ [POUCE]: 3, [COEUR]: 1 }, POUCE), COEUR)).toMatchObject({ reactions: { [POUCE]: 2, [COEUR]: 2 }, ma_reaction: COEUR });
  });
  it('remove: an emoji at 0 disappears', () => {
    const r = appliquerReaction(message({ [RIRE]: 1 }, RIRE), null);
    expect(r.reactions).toEqual({});
    expect(r.ma_reaction).toBeNull();
  });
  it('older server answer without reactions', () => {
    expect(appliquerReaction(message(null, null), POUCE).reactions).toEqual({ [POUCE]: 1 });
  });
});

describe('ease-in-out of the scrolls', () => {
  it('starts and ends slowly, symmetric, monotonic', () => {
    expect(adoucir(0)).toBe(0);
    expect(adoucir(1)).toBe(1);
    expect(adoucir(0.5)).toBeCloseTo(0.5);
    expect(adoucir(0.1)).toBeLessThan(0.1);
    expect(adoucir(0.9)).toBeGreaterThan(0.9);
    let avant = -1;
    for (let i = 0; i <= 100; i++) {
      const v = adoucir(i / 100);
      expect(v).toBeGreaterThanOrEqual(avant);
      avant = v;
    }
  });
});

describe('reduced results (public)', () => {
  // Shape of pudi_resultats_reduits after the migration 20261025200000: no voix_placees, whole numbers.
  const reduit: ResultatsSynthese = {
    complet: false,
    cloture_at: '2026-10-27T05:00:00Z',
    calcule_at: '2026-10-27T06:00:00Z',
    publie_at: '2026-10-22T06:14:00Z',
    priorites: [
      { id: 'W1', voix: 32, pct_voix: 9, tranche_pudi: 1, ecart_pudi: false },
      { id: 'A5', voix: 20, pct_voix: 6, tranche_pudi: 3, ecart_pudi: true }
    ],
    propositions: [{ id: 'P1', intitule: 'Hôpital', ajoute_at: '2026-10-21T12:46:30Z', voix: 12, pct_voix: 4 }],
    par_profil: { habitant: 28, autre: 21 },
    par_fokontany: { AUTRE: 20, X: 80 },
    reseaux: { dans_nos_reseaux: 55, hors_reseaux: 45 },
    manquants: ['Pollution sonore']
  };
  const s = preparerSynthese(reduit, D, { provisoire: false });
  it('no total of the votes placed', () => {
    expect(s.voixPlacees).toBeNull();
  });
  it('percentages shown without decimals', () => {
    expect(s.priorites[0].pctVoix).toBe('9 %');
    expect(s.propositions[0].pctVoix).toBe('4 %');
    expect(s.reseaux.pctDans).toBe('55 %');
    expect(s.profils.every((p) => !p.pct.includes(','))).toBe(true);
  });
  it('missing projects kept, without any count', () => {
    expect(s.manquants).toEqual(['Pollution sonore']);
  });
  it('complete content (organisers) unchanged: total kept', () => {
    const c = preparerSynthese({ ...reduit, complet: true, nb_votants: 29, voix_placees: 338, reseaux: { dans_nos_reseaux: 16, hors_reseaux: 13 } }, D, { provisoire: false });
    expect(c.voixPlacees).toBe(338);
    expect(c.nbVotants).toBe(29);
  });
});
