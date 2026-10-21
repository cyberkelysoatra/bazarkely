// Public proposals (projects asked by the stakeholders, outside the PIC list). Plain fetch of
// rpc/pudi_propositions_publiques (no supabase-js on public pages), kept in localStorage
// pudi_propositions_v1 for offline display and refreshed on each online visit.
import { useSyncExternalStore } from 'react';
import { rpcFetch } from './api';

export interface Proposition {
  id: string;
  intitule: string;
  lieu: string | null;
  source: string;
  date_source: string | null;
  precision: string | null;
  ajoute_at: string;
}

const CLE = 'pudi_propositions_v1';

/** Proposal ids are P1, P2... (no programme id starts with P). */
export function estProposition(id: string): boolean {
  return /^P[0-9]{1,3}$/.test(id);
}

function valide(v: unknown): Proposition[] | null {
  if (!Array.isArray(v)) return null;
  return v.filter(
    (x): x is Proposition =>
      !!x && typeof x === 'object' && typeof (x as Proposition).id === 'string' && typeof (x as Proposition).intitule === 'string'
  );
}

function lireCache(): Proposition[] | null {
  try {
    const raw = localStorage.getItem(CLE);
    return raw ? valide(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function ecrireCache(l: Proposition[]): void {
  try {
    localStorage.setItem(CLE, JSON.stringify(l));
  } catch {
    /* storage unavailable: memory only */
  }
}

interface Etat {
  liste: Proposition[] | null;
  /** True once the list of this visit came from the server. */
  serveur: boolean;
}

let etat: Etat = { liste: lireCache(), serveur: false };
const abonnes = new Set<() => void>();
let enCours: Promise<{ liste: Proposition[]; avant: Proposition[] | null }> | null = null;

function publier(e: Etat) {
  etat = e;
  abonnes.forEach((f) => f());
}

/** Reads the server list; resolves with the new list and the one known before (cache). */
export function rafraichirPropositions(): Promise<{ liste: Proposition[]; avant: Proposition[] | null }> {
  if (!enCours) {
    enCours = (async () => {
      const r = await rpcFetch('pudi_propositions_publiques', null);
      if (!r.ok) throw new Error(`pudi_propositions_publiques ${r.status}`);
      const liste = valide(await r.json());
      if (!liste) throw new Error('pudi_propositions_publiques: bad answer');
      const avant = etat.liste;
      ecrireCache(liste);
      publier({ liste, serveur: true });
      return { liste, avant };
    })().finally(() => {
      enCours = null;
    });
  }
  return enCours;
}

export function propositionsConnues(): Proposition[] | null {
  return etat.liste;
}

export function usePropositions(): Etat {
  return useSyncExternalStore(
    (f) => {
      abonnes.add(f);
      return () => abonnes.delete(f);
    },
    () => etat,
    () => etat
  );
}

export function propositionParId(liste: Proposition[] | null, id: string): Proposition | undefined {
  return liste?.find((p) => p.id === id);
}
