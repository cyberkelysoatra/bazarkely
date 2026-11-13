// NEC-CC-25 (NEC-174): an old page never saves over a newer plan (store, safety copy, page hook).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { Plan } from '../types';
import { planVide } from '../etat/vide';

// In-memory stand-in for the Dexie database (Dexie itself is mocked by the test setup).
const memoire = vi.hoisted(() => new Map<string, unknown>());
vi.mock('./base', () => {
  const plans = {
    get: async (id: string) => (memoire.has(id) ? JSON.parse(JSON.stringify(memoire.get(id))) : undefined),
    put: async (p: { id: string }) => {
      memoire.set(p.id, JSON.parse(JSON.stringify(p)));
    },
    delete: async (id: string) => {
      memoire.delete(id);
    },
    orderBy: () => ({ reverse: () => ({ toArray: async () => Array.from(memoire.values()) }) }),
  };
  return { db: { plans, transaction: (_m: string, _t: unknown, f: () => Promise<unknown>) => f() } };
});
vi.mock('../sync', () => ({ abonnerPretest: () => () => undefined, signalerModification: () => undefined }));

import { ConflitPlan, annoncerPlan, ecouterPlans, ecrireSecours, enregistrerPlan, lirePlan, peutEnregistrer } from './plans';
import { usePlan } from '../etat/usePlan';
import { annonceAvisPlanPlusRecent } from '../etat/avisPlan';

function plan(rev: number, nomProjet: string, id = 'p1'): Plan {
  const p = planVide();
  p.id = id;
  p.rev = rev;
  p.identite.nomProjet = nomProjet;
  return p;
}
const stocke = (id = 'p1') => memoire.get(id) as Plan;

// Working localStorage (the test setup only stubs it): keys are own enumerable properties, as in a browser.
function stockageReel(): Storage {
  const s = {} as Record<string, string>;
  const m = (f: unknown) => ({ value: f, enumerable: false });
  Object.defineProperties(s, {
    getItem: m((k: string) => (Object.prototype.hasOwnProperty.call(s, k) ? s[k] : null)),
    setItem: m((k: string, v: string) => void (s[k] = String(v))),
    removeItem: m((k: string) => void delete s[k]),
    clear: m(() => Object.keys(s).forEach((k) => delete s[k])),
    key: m((i: number) => Object.keys(s)[i] ?? null),
    length: { get: () => Object.keys(s).length, enumerable: false },
  });
  return s as unknown as Storage;
}

beforeEach(() => {
  memoire.clear();
  Object.defineProperty(window, 'localStorage', { value: stockageReel(), writable: true, configurable: true });
});

describe('peutEnregistrer', () => {
  it('refuses a base rev lower than the stored one, accepts equal or higher, accepts a new plan', () => {
    expect(peutEnregistrer(1995, 10)).toBe(false);
    expect(peutEnregistrer(11, 10)).toBe(false);
    expect(peutEnregistrer(10, 10)).toBe(true);
    expect(peutEnregistrer(9, 10)).toBe(true);
    expect(peutEnregistrer(undefined, 0)).toBe(true);
    expect(peutEnregistrer(null, 3)).toBe(true);
  });
});

describe('enregistrerPlan', () => {
  it('lower base rev: refused with ConflitPlan carrying the stored plan, nothing written', async () => {
    memoire.set('p1', plan(1995, 'COMPLET'));
    const err = await enregistrerPlan(plan(10, 'ANCIEN')).catch((e) => e);
    expect(err).toBeInstanceOf(ConflitPlan);
    expect((err as ConflitPlan).plan.rev).toBe(1995);
    expect((err as ConflitPlan).plan.identite.nomProjet).toBe('COMPLET');
    expect(stocke().rev).toBe(1995);
    expect(stocke().identite.nomProjet).toBe('COMPLET');
  });

  it('equal or higher base rev: saved with rev + 1', async () => {
    memoire.set('p1', plan(5, 'X'));
    expect((await enregistrerPlan(plan(5, 'EGAL'))).rev).toBe(6);
    expect(stocke().identite.nomProjet).toBe('EGAL');
    expect((await enregistrerPlan(plan(9, 'PLUS'))).rev).toBe(10);
    expect(stocke().rev).toBe(10);
    expect((await enregistrerPlan(plan(0, 'NEUF', 'p2'))).rev).toBe(1);
  });

  it('announces { id, rev } only (never the plan contents) to the other pages', async () => {
    const recu: unknown[] = [];
    const autre = new BroadcastChannel('bp-plans');
    autre.onmessage = (e) => recu.push(e.data);
    await enregistrerPlan(plan(0, 'SECRET'));
    await waitFor(() => expect(recu.length).toBe(1));
    const m = recu[0] as Record<string, unknown>;
    expect(Object.keys(m).sort()).toEqual(['id', 'rev', 'source']);
    expect(m.id).toBe('p1');
    expect(m.rev).toBe(1);
    expect(JSON.stringify(m)).not.toContain('SECRET');
    autre.close();
  });

  it("ecouterPlans ignores this page's own announcements, receives the other pages' ones", async () => {
    const recu: unknown[] = [];
    const stop = ecouterPlans((a) => recu.push(a));
    annoncerPlan('p1', 3);
    const autre = new BroadcastChannel('bp-plans');
    autre.postMessage({ id: 'p1', rev: 7, source: 'autre-page' });
    await waitFor(() => expect(recu).toEqual([{ id: 'p1', rev: 7 }]));
    stop();
    autre.close();
  });
});

describe('safety copy replay', () => {
  it('a copy from a stale page (base rev + 1 below the stored rev) is rejected', async () => {
    memoire.set('p1', plan(1995, 'COMPLET'));
    ecrireSecours(plan(11, 'ANCIEN')); // stale page at rev 10
    const lu = await lirePlan('p1');
    expect(lu?.rev).toBe(1995);
    expect(lu?.identite.nomProjet).toBe('COMPLET');
    expect(localStorage.getItem('nec.secours.p1')).toBeNull();
  });

  it('a copy of the same rev as the stored one (written by another page) is rejected too', async () => {
    memoire.set('p1', plan(1995, 'COMPLET'));
    ecrireSecours(plan(1995, 'ANCIEN')); // stale page at rev 1994
    expect((await lirePlan('p1'))?.identite.nomProjet).toBe('COMPLET');
  });

  it("a copy from the up-to-date page (its save did not finish) still wins", async () => {
    memoire.set('p1', plan(20, 'AVANT'));
    ecrireSecours(plan(21, 'APRES'));
    const lu = await lirePlan('p1');
    expect(lu?.rev).toBe(21);
    expect(lu?.identite.nomProjet).toBe('APRES');
  });
});

describe('usePlan (page holding the plan in memory)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  async function ouvrir() {
    const h = renderHook(() => usePlan('p1'));
    await waitFor(() => expect(h.result.current.etat.statut).toBe('pret'));
    return h;
  }
  const affiche = (h: Awaited<ReturnType<typeof ouvrir>>) =>
    h.result.current.etat.statut === 'pret' ? h.result.current.etat.plan : null;

  it('single page: each save raises the stored rev by 1, no sentence', async () => {
    memoire.set('p1', plan(3, ''));
    const avant = annonceAvisPlanPlusRecent();
    const h = await ouvrir();
    act(() => h.result.current.modifier((p) => void (p.identite.nomProjet = 'UN')));
    await waitFor(() => expect(stocke().rev).toBe(4));
    act(() => h.result.current.modifier((p) => void (p.identite.nomProjet = 'DEUX')));
    await waitFor(() => expect(stocke().rev).toBe(5));
    expect(stocke().identite.nomProjet).toBe('DEUX');
    // Urgent save when the page is hidden: one more rev.
    act(() => h.result.current.modifier((p) => void (p.identite.nomProjet = 'TROIS')));
    await act(async () => {
      await h.result.current.sauverMaintenant(true);
    });
    expect(stocke().rev).toBe(6);
    expect(stocke().identite.nomProjet).toBe('TROIS');
    expect(localStorage.getItem('nec.secours.p1')).toBeNull();
    expect(annonceAvisPlanPlusRecent()).toBe(avant);
    h.unmount();
  });

  it('stale page typing over a newer plan: its change is dropped, the newer plan shown, sentence once', async () => {
    memoire.set('p1', plan(10, 'ANCIEN'));
    const avant = annonceAvisPlanPlusRecent();
    const h = await ouvrir();
    // Another page saves meanwhile (this page missed the announcement, as a frozen background tab).
    memoire.set('p1', { ...plan(11, 'TEXTE B'), posttestOuvertLe: undefined });
    act(() => h.result.current.modifier((p) => void (p.identite.secteur = 'TEXTE A')));
    await waitFor(() => expect(affiche(h)?.identite.nomProjet).toBe('TEXTE B'));
    expect(affiche(h)?.rev).toBe(11);
    expect(stocke().rev).toBe(11);
    expect(stocke().identite.nomProjet).toBe('TEXTE B');
    expect(annonceAvisPlanPlusRecent()).toBe(avant + 1);
    // Typing again now saves from the newer plan.
    act(() => h.result.current.modifier((p) => void (p.identite.secteur = 'TEXTE A')));
    await waitFor(() => expect(stocke().rev).toBe(12));
    expect(stocke().identite.nomProjet).toBe('TEXTE B');
    expect(stocke().identite.secteur).toBe('TEXTE A');
    expect(annonceAvisPlanPlusRecent()).toBe(avant + 1);
    h.unmount();
  });

  it('page back to the front with nothing pending: reloaded silently', async () => {
    memoire.set('p1', plan(10, 'ANCIEN'));
    const avant = annonceAvisPlanPlusRecent();
    const h = await ouvrir();
    memoire.set('p1', plan(11, 'TEXTE B'));
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    await waitFor(() => expect(affiche(h)?.identite.nomProjet).toBe('TEXTE B'));
    expect(annonceAvisPlanPlusRecent()).toBe(avant);
    h.unmount();
  });

  it("another page's announcement reloads this page", async () => {
    memoire.set('p1', plan(10, 'ANCIEN'));
    const h = await ouvrir();
    memoire.set('p1', plan(11, 'TEXTE B'));
    const autre = new BroadcastChannel('bp-plans');
    autre.postMessage({ id: 'p1', rev: 11, source: 'autre-page' });
    await waitFor(() => expect(affiche(h)?.identite.nomProjet).toBe('TEXTE B'));
    autre.close();
    h.unmount();
  });

  it('stale page hidden right after typing: its safety copy never wins at the next opening', async () => {
    memoire.set('p1', plan(10, 'ANCIEN'));
    const h = await ouvrir();
    memoire.set('p1', plan(11, 'TEXTE B'));
    act(() => h.result.current.modifier((p) => void (p.identite.nomProjet = 'TEXTE A')));
    await act(async () => {
      await h.result.current.sauverMaintenant(true);
    });
    expect(stocke().identite.nomProjet).toBe('TEXTE B');
    expect((await lirePlan('p1'))?.identite.nomProjet).toBe('TEXTE B');
    h.unmount();
  });
});
