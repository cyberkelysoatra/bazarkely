// PUDI-CC-11: role preview rules, results on return, anonymous funnel (each step once, nothing in
// preview or before publication, failures and offline tolerated).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EtatConsultation } from '../appels/api';
import {
  EMAIL_JOEL,
  REFERENCE_APERCU,
  doitAllerAuxResultats,
  etapesDuChoix,
  etatEffectif,
  masquageApercu,
  pctVisites,
  peutApercu
} from './apercu';

const ETAT: EtatConsultation = {
  publie: true,
  cloture_at: '2026-10-27T05:00:00Z',
  maintenant: '2026-10-23T05:00:00Z',
  clos: false,
  connecte: true,
  a_vote: true,
  est_admin: true,
  est_responsable: false
};

describe('preview « Voir comme »', () => {
  it('only JOEL (admin on the server AND his address)', () => {
    expect(peutApercu(ETAT, EMAIL_JOEL)).toBe(true);
    expect(peutApercu(ETAT, 'JoelSoatra@gmail.com ')).toBe(true);
    expect(peutApercu(ETAT, 'autre.admin@gmail.com')).toBe(false);
    expect(peutApercu({ ...ETAT, est_admin: false }, EMAIL_JOEL)).toBe(false);
    expect(peutApercu(ETAT, null)).toBe(false);
  });
  it('Votant = signed in, not voted, no admin, no group', () => {
    const e = etatEffectif(ETAT, { role: 'votant', masque: false, voteFictif: false })!;
    expect([e.a_vote, e.est_admin, e.est_responsable, e.connecte]).toEqual([false, false, false, true]);
    expect(etatEffectif(ETAT, { role: 'votant', masque: false, voteFictif: true })!.a_vote).toBe(true);
  });
  it('Responsable = group manager without admin rights; Super admin = unchanged', () => {
    const e = etatEffectif(ETAT, { role: 'responsable', canal: 'wa-gihtnb', nom: 'GIHTNB' })!;
    expect([e.est_admin, e.est_responsable]).toEqual([false, true]);
    expect(etatEffectif(ETAT, null)).toBe(ETAT);
    expect(etatEffectif(null, { role: 'votant', masque: false, voteFictif: false })).toBeNull();
  });
  it('fake masking M-APERCU', () => {
    const m = masquageApercu();
    expect(m.id).toBe(REFERENCE_APERCU);
    expect(m.gel_listes_at).toBe('2026-10-27T18:00:00+03:00');
  });
});

describe('results on return', () => {
  const base = { entreeAccueil: true, etat: ETAT, masquagesLus: true, nbMasquages: 0, apercu: false };
  it('home of a new visit, voted, not masked -> results', () => {
    expect(doitAllerAuxResultats(base)).toBe(true);
  });
  it('unchanged otherwise', () => {
    expect(doitAllerAuxResultats({ ...base, entreeAccueil: false })).toBe(false);
    expect(doitAllerAuxResultats({ ...base, etat: null })).toBe(false);
    expect(doitAllerAuxResultats({ ...base, etat: { ...ETAT, a_vote: false } })).toBe(false);
    expect(doitAllerAuxResultats({ ...base, etat: { ...ETAT, connecte: false } })).toBe(false);
    expect(doitAllerAuxResultats({ ...base, etat: { ...ETAT, clos: true } })).toBe(false);
    expect(doitAllerAuxResultats({ ...base, nbMasquages: 1 })).toBe(false);
    expect(doitAllerAuxResultats({ ...base, masquagesLus: false })).toBe(false);
    expect(doitAllerAuxResultats({ ...base, apercu: true })).toBe(false);
  });
});

describe('funnel helpers', () => {
  it('steps of the choice and share of visits', () => {
    expect(etapesDuChoix(0)).toEqual([]);
    expect(etapesDuChoix(1)).toEqual(['choix_commence']);
    expect(etapesDuChoix(3)).toEqual(['choix_commence', 'choix_complet']);
    expect(pctVisites(25, 100)).toBe(25);
    expect(pctVisites(1, 3)).toBe(33);
    expect(pctVisites(4, 0)).toBe(0);
  });
});

describe('noterEtape (fire-and-forget)', () => {
  let appels: { etape: string; visiteur: string }[];
  let reponse: () => Promise<Response>;
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    appels = [];
    reponse = () => Promise.resolve(new Response(null, { status: 204 }));
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init: RequestInit) => {
        const b = JSON.parse(String(init.body)) as { p_etape: string; p_visiteur: string };
        expect(url).toContain('/rpc/pudi_noter_etape');
        appels.push({ etape: b.p_etape, visiteur: b.p_visiteur });
        return reponse();
      })
    );
  });
  afterEach(() => vi.unstubAllGlobals());
  const attendre = () => new Promise((r) => setTimeout(r, 0));

  it('waits for the state, then sends each step once, in order, with one visitor id', async () => {
    const p = await import('../appels/parcours');
    p.noterEtape('fiche');
    p.noterEtape('visite');
    expect(appels).toEqual([]);
    p.activerParcours(true);
    await attendre();
    for (const e of ['visite', 'fiche', 'choix_commence', 'choix_complet', 'envoyer', 'connecte', 'vote'] as const) p.noterEtape(e);
    p.noterEtape('visite');
    await attendre();
    p.noterEtape('vote');
    await attendre();
    expect(appels.map((a) => a.etape)).toEqual(['visite', 'fiche', 'choix_commence', 'choix_complet', 'envoyer', 'connecte', 'vote']);
    expect(new Set(appels.map((a) => a.visiteur)).size).toBe(1);
    expect(appels[0].visiteur).toMatch(/^[0-9a-z-]{8,}/);
  });

  it('nothing in preview or before publication (pending steps dropped)', async () => {
    const p = await import('../appels/parcours');
    p.noterEtape('visite');
    p.activerParcours(false);
    p.noterEtape('fiche');
    await attendre();
    expect(appels).toEqual([]);
  });

  it('a failing server or no network never throws, and the step can be retried', async () => {
    const p = await import('../appels/parcours');
    p.activerParcours(true);
    reponse = () => Promise.reject(new Error('reseau'));
    expect(() => p.noterEtape('visite')).not.toThrow();
    await attendre();
    reponse = () => Promise.resolve(new Response(null, { status: 204 }));
    const vrai = globalThis.navigator;
    vi.stubGlobal('navigator', { onLine: false });
    p.noterEtape('visite');
    vi.stubGlobal('navigator', vrai);
    p.noterEtape('visite');
    await attendre();
    expect(appels.map((a) => a.etape)).toEqual(['visite', 'visite']);
  });
});
