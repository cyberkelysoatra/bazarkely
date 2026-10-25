// PUDI-CC-19: automatic saving after the first vote, quick transfer, synthesis without voter counts.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import donneesBrutes from '../data/pudi-donnees.json';
import type { PudiDonnees } from '../data/types';
import { CHANGEMENT_REGLE, METHODE, csvSynthese, preparerSynthese, type ResultatsSynthese } from './synthese';
import { ajouterVoix, retirerVoix } from './regles';

const api = vi.hoisted(() => ({
  soumettreVote: vi.fn(),
  lireMonVote: vi.fn(),
  jetonLocal: vi.fn(() => 'jeton')
}));
vi.mock('../appels/api', () => api);
vi.mock('../appels/session', () => ({ renouvelerSessionExpiree: vi.fn(async () => false) }));
vi.mock('../appels/provenance', () => ({ lireCanal: () => null }));

import { ecrireBrouillon } from '../appels/brouillon';
import {
  DELAI_TEXTE,
  DELAI_VOIX,
  conditionsAuto,
  configurerAuto,
  enregistrerMaintenant,
  lireEtatAuto,
  memeQueServeur,
  signalerGeste
} from '../appels/autoEnregistrement';

const D = donneesBrutes as unknown as PudiDonnees;
const SERVEUR = ['A1', 'A1', 'A1', 'A1', 'T3', 'T3', 'T3', 'T3', 'W3', 'W3', 'W3', 'W3'];
const MON_VOTE = {
  fokontany: 'X',
  fokontany_autre: null,
  profil: 'habitant',
  priorites: SERVEUR,
  manquant: null,
  canal_code: null,
  created_at: '2026-10-23T10:00:00Z',
  updated_at: '2026-10-25T10:00:00Z',
  nb_modifications: 1,
  est_test: false,
  masque: false
};
const etatReel = {
  publie: true,
  cloture_at: '2026-10-27T05:00:00Z',
  maintenant: '2026-10-25T11:00:00Z',
  clos: false,
  connecte: true,
  a_vote: true,
  est_admin: false
};

describe('who gets the automatic saving', () => {
  const base = { etatReel, apercu: null, monVote: { priorites: SERVEUR }, envoiOuvert: true };
  it('a signed-in voter whose vote is on the server', () => expect(conditionsAuto(base)).toBe(true));
  it('never before the first vote, in « Voir comme », once closed, or without the server vote', () => {
    expect(conditionsAuto({ ...base, etatReel: { ...etatReel, a_vote: false } })).toBe(false);
    expect(conditionsAuto({ ...base, apercu: { role: 'votant' } })).toBe(false);
    expect(conditionsAuto({ ...base, etatReel: { ...etatReel, clos: true } })).toBe(false);
    expect(conditionsAuto({ ...base, monVote: null })).toBe(false);
    expect(conditionsAuto({ ...base, envoiOuvert: false })).toBe(false);
    expect(conditionsAuto({ ...base, etatReel: null })).toBe(false);
  });
  it('the draft equal to the server vote (order ignored, text compared only when known)', () => {
    expect(memeQueServeur({ priorites: [...SERVEUR].reverse(), manquant: '' }, { priorites: SERVEUR })).toBe(true);
    expect(memeQueServeur({ priorites: SERVEUR, manquant: 'école' }, { priorites: SERVEUR })).toBe(true);
    expect(memeQueServeur({ priorites: SERVEUR, manquant: 'école' }, { priorites: SERVEUR, manquant: null })).toBe(false);
    expect(memeQueServeur({ priorites: SERVEUR.slice(1), manquant: '' }, { priorites: SERVEUR })).toBe(false);
  });
});

describe('automatic saving (WhatsApp poll style)', () => {
  let noter: ReturnType<typeof vi.fn>;
  const geste = (b: string[], type: 'voix' | 'texte' = 'voix', manquant = '') => {
    ecrireBrouillon({ priorites: b, manquant });
    signalerGeste(type);
  };
  beforeEach(() => {
    vi.useFakeTimers();
    api.soumettreVote.mockReset().mockImplementation(async (b: { priorites: string[]; manquant: string }) => ({
      ...MON_VOTE,
      priorites: b.priorites,
      manquant: b.manquant || null,
      updated_at: '2026-10-25T11:00:05Z'
    }));
    api.lireMonVote.mockReset().mockResolvedValue({ ...MON_VOTE });
    noter = vi.fn();
    configurerAuto({ actif: false, serveur: null, noter, surMasque: () => undefined });
    configurerAuto({ actif: true, serveur: { priorites: SERVEUR, manquant: null }, noter, surMasque: () => undefined });
    ecrireBrouillon({ priorites: SERVEUR, manquant: '' });
    (navigator as unknown as { onLine: boolean }).onLine = true;
    (navigator as unknown as { onLine: boolean }).onLine = true;
  });
  afterEach(() => {
    configurerAuto({ actif: false, serveur: null, noter, surMasque: () => undefined });
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('+1 then −1 inside the pause: no request at all (draft back to the server vote)', async () => {
    const plus = ajouterVoix({ priorites: SERVEUR.slice(0, 11), manquant: '' }, 'A4');
    geste(plus.priorites);
    geste(retirerVoix(plus, 'A4').priorites.concat('W3'));
    await vi.advanceTimersByTimeAsync(DELAI_VOIX + 50);
    expect(api.soumettreVote).not.toHaveBeenCalled();
    expect(lireEtatAuto().statut).toBe('enregistre');
    // Nothing at all on the network: not even the read of the server vote.
    expect(api.lireMonVote).not.toHaveBeenCalled();
  });

  it('one change: a single send after 1.2 s, with the server details and no phone', async () => {
    const nouveau = [...SERVEUR.slice(0, 11), 'A4'];
    geste(nouveau);
    expect(lireEtatAuto().statut).toBe('attente');
    await vi.advanceTimersByTimeAsync(DELAI_VOIX - 100);
    expect(api.soumettreVote).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);
    expect(api.soumettreVote).toHaveBeenCalledTimes(1);
    const [b, f] = api.soumettreVote.mock.calls[0];
    expect(b.priorites).toEqual(nouveau);
    expect(f).toEqual({ fokontany: 'X', fokontanyAutre: '', profil: 'habitant', telephone: '', resident: true });
    expect(noter).toHaveBeenCalled();
    expect(lireEtatAuto().statut).toBe('enregistre');
    expect(lireEtatAuto().at).toBe('2026-10-25T11:00:05Z');
  });

  it('several quick gestures: one send with the latest draft', async () => {
    geste([...SERVEUR.slice(0, 11), 'A4']);
    await vi.advanceTimersByTimeAsync(500);
    geste([...SERVEUR.slice(0, 10), 'A4', 'A4']);
    await vi.advanceTimersByTimeAsync(500);
    geste([...SERVEUR.slice(0, 9), 'A4', 'A4', 'A4']);
    await vi.advanceTimersByTimeAsync(DELAI_VOIX + 50);
    expect(api.soumettreVote).toHaveBeenCalledTimes(1);
    expect(api.soumettreVote.mock.calls[0][0].priorites.filter((x: string) => x === 'A4')).toHaveLength(3);
  });

  it('the missing-project text waits 2 s', async () => {
    geste(SERVEUR, 'texte', 'Un marché couvert');
    await vi.advanceTimersByTimeAsync(DELAI_VOIX + 100);
    expect(api.soumettreVote).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(DELAI_TEXTE - DELAI_VOIX);
    expect(api.soumettreVote).toHaveBeenCalledTimes(1);
    expect(api.soumettreVote.mock.calls[0][0].manquant).toBe('Un marché couvert');
  });

  it('0 vote: nothing sent, message state', async () => {
    geste([]);
    expect(lireEtatAuto().statut).toBe('zero');
    await vi.advanceTimersByTimeAsync(DELAI_VOIX * 3);
    await enregistrerMaintenant();
    expect(api.soumettreVote).not.toHaveBeenCalled();
    expect(lireEtatAuto().statut).toBe('zero');
  });

  it('offline: kept pending, sent when the connection comes back', async () => {
    (navigator as unknown as { onLine: boolean }).onLine = false;
    geste([...SERVEUR.slice(0, 11), 'A4']);
    await vi.advanceTimersByTimeAsync(DELAI_VOIX + 50);
    expect(api.soumettreVote).not.toHaveBeenCalled();
    expect(lireEtatAuto().statut).toBe('horsLigne');
    (navigator as unknown as { onLine: boolean }).onLine = true;
    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(10);
    expect(api.soumettreVote).toHaveBeenCalledTimes(1);
    expect(lireEtatAuto().statut).toBe('enregistre');
  });

  it('a network failure during the send is kept pending too', async () => {
    api.soumettreVote.mockRejectedValueOnce(new Error('Failed to fetch'));
    geste([...SERVEUR.slice(0, 11), 'A4']);
    await vi.advanceTimersByTimeAsync(DELAI_VOIX + 50);
    expect(lireEtatAuto().statut).toBe('horsLigne');
    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(10);
    expect(api.soumettreVote).toHaveBeenCalledTimes(2);
    expect(lireEtatAuto().statut).toBe('enregistre');
  });

  it('server refusal (masked vote): message, no retry loop', async () => {
    api.soumettreVote.mockRejectedValueOnce({ erreur: 'PUDI_VOTE_MASQUE' });
    geste([...SERVEUR.slice(0, 11), 'A4']);
    await vi.advanceTimersByTimeAsync(DELAI_VOIX + 50);
    expect(lireEtatAuto().statut).toBe('erreur');
    expect(lireEtatAuto().erreur?.code).toBe('VOTE_MASQUE');
    expect(api.soumettreVote).toHaveBeenCalledTimes(1);
  });

  it('masked vote (PUDI-CC-09): never sent, the masked message at once', async () => {
    configurerAuto({ actif: true, serveur: { priorites: SERVEUR, manquant: null }, masque: true, noter, surMasque: () => undefined });
    geste([...SERVEUR.slice(0, 11), 'A4']);
    await vi.advanceTimersByTimeAsync(DELAI_VOIX + 50);
    expect(api.soumettreVote).not.toHaveBeenCalled();
    expect(api.lireMonVote).not.toHaveBeenCalled();
    expect(lireEtatAuto().erreur?.code).toBe('VOTE_MASQUE');
  });

  it('expired session that cannot be renewed: « Reconnectez-vous », draft kept', async () => {
    api.jetonLocal.mockReturnValueOnce(null as unknown as string);
    const nouveau = [...SERVEUR.slice(0, 11), 'A4'];
    geste(nouveau);
    await vi.advanceTimersByTimeAsync(DELAI_VOIX + 50);
    expect(lireEtatAuto().statut).toBe('reconnexion');
    expect(api.soumettreVote).not.toHaveBeenCalled();
  });

  it('inactive (before the first vote, « Voir comme »): a gesture sends nothing', async () => {
    configurerAuto({ actif: false, serveur: null, noter, surMasque: () => undefined });
    geste([...SERVEUR.slice(0, 11), 'A4']);
    await vi.advanceTimersByTimeAsync(DELAI_VOIX * 3);
    expect(api.soumettreVote).not.toHaveBeenCalled();
    expect(lireEtatAuto().statut).toBe('inactif');
  });

  it('a gesture during a send: the latest draft is sent right after', async () => {
    let fin: () => void = () => undefined;
    api.soumettreVote.mockImplementationOnce(
      (b: { priorites: string[] }) =>
        new Promise((r) => {
          fin = () => r({ ...MON_VOTE, priorites: b.priorites });
        })
    );
    geste([...SERVEUR.slice(0, 11), 'A4']);
    await vi.advanceTimersByTimeAsync(DELAI_VOIX + 50);
    geste([...SERVEUR.slice(0, 10), 'A4', 'A4']);
    await vi.advanceTimersByTimeAsync(DELAI_VOIX + 50);
    expect(api.soumettreVote).toHaveBeenCalledTimes(1);
    fin();
    await vi.advanceTimersByTimeAsync(10);
    expect(api.soumettreVote).toHaveBeenCalledTimes(2);
    expect(api.soumettreVote.mock.calls[1][0].priorites.filter((x: string) => x === 'A4')).toHaveLength(2);
  });
});

describe('quick transfer', () => {
  it('moving one vote keeps the total at 12: 11 + 1 on the new card', () => {
    const b = { priorites: SERVEUR, manquant: '' };
    const apres = ajouterVoix(retirerVoix(b, 'A1'), 'A4');
    expect(apres.priorites).toHaveLength(12);
    expect(apres.priorites.filter((x) => x === 'A1')).toHaveLength(3);
    expect(apres.priorites.filter((x) => x === 'A4')).toHaveLength(1);
  });
});

describe('synthesis without voter counts (public, switch off)', () => {
  const reduit: ResultatsSynthese = {
    complet: false,
    cloture_at: '2026-10-27T05:00:00Z',
    calcule_at: '2026-10-27T06:00:00Z',
    publie_at: '2026-10-22T06:14:00Z',
    priorites: [
      { id: 'W1', voix: 30, pct_voix: 9.3, tranche_pudi: 1, ecart_pudi: false },
      { id: 'A5', voix: 20, pct_voix: 6.2, tranche_pudi: 3, ecart_pudi: true }
    ],
    propositions: [{ id: 'P1', intitule: 'Hôpital', ajoute_at: '2026-10-21T12:46:30Z', voix: 12, pct_voix: 3.7 }],
    par_profil: { habitant: 51.9, autre: 48.1 },
    par_fokontany: { AUTRE: 20, X: 80 },
    reseaux: { dans_nos_reseaux: 51.9, hors_reseaux: 48.1 },
    manquants: [],
    voix_placees: 323
  };
  const s = preparerSynthese(reduit, D, { provisoire: false });
  it('no voter count anywhere', () => {
    expect(s.complet).toBe(false);
    expect(s.nbVotants).toBeNull();
    expect(s.priorites[0].votants).toBeUndefined();
    expect(s.priorites[0].concentration).toBeUndefined();
    expect(s.propositions[0].votants).toBeNull();
    expect(s.repartition).toEqual([]);
    expect(s.concentration).toBe('');
    expect(s.methode).toEqual([...METHODE, CHANGEMENT_REGLE]);
    expect(s.reseaux.dans).toBeNull();
  });
  it('votes and shares kept; breakdowns as percentages only', () => {
    expect(s.priorites[0]).toMatchObject({ voix: 30, pctVoix: '9,3 %' });
    expect(s.priorites[1].ecart).toBe('Avancé par les votants (PUDi : 2036-2040)');
    expect(s.voixPlacees).toBe(323);
    expect(s.profils.find((p) => p.pct === '51,9 %')?.n).toBeNull();
    expect(s.fokontany[0]).toMatchObject({ n: null, pct: '80 %' });
    expect(s.reseaux.pctDans).toBe('51,9 %');
  });
  it('the complete content (organisers) is unchanged', () => {
    const complet = preparerSynthese(
      { ...reduit, complet: true, nb_votants: 27, priorites: [{ id: 'W1', n: 9, pct: 33.3, voix: 30, votants: 9, pct_voix: 9.3, pct_votants: 33.3, concentration: 0 }], par_profil: { habitant: 14 }, reseaux: { dans_nos_reseaux: 14, hors_reseaux: 13 } },
      D,
      { provisoire: false }
    );
    expect(complet.nbVotants).toBe(27);
    expect(complet.priorites[0]).toMatchObject({ votants: 9, pctVotants: '33,3 %' });
    expect(complet.repartition).toHaveLength(12);
    expect(complet.reseaux).toMatchObject({ dans: 14, hors: 13 });
    expect(csvSynthese(complet)).toContain('votants');
  });
});

describe('device copy without the server text', () => {
  it('+1 then −1: at most one read, never a send', async () => {
    vi.useFakeTimers();
    api.soumettreVote.mockReset();
    api.lireMonVote.mockReset().mockResolvedValue({ ...MON_VOTE });
    configurerAuto({ actif: true, serveur: { priorites: SERVEUR }, noter: () => undefined, surMasque: () => undefined });
    ecrireBrouillon({ priorites: [...SERVEUR.slice(0, 11), 'A4'], manquant: '' });
    signalerGeste('voix');
    ecrireBrouillon({ priorites: SERVEUR, manquant: '' });
    signalerGeste('voix');
    await vi.advanceTimersByTimeAsync(DELAI_VOIX + 50);
    expect(api.lireMonVote.mock.calls.length).toBeLessThanOrEqual(1);
    expect(api.soumettreVote).not.toHaveBeenCalled();
    expect(lireEtatAuto().statut).toBe('enregistre');
    configurerAuto({ actif: false, serveur: null, noter: () => undefined, surMasque: () => undefined });
    vi.useRealTimers();
  });
});
