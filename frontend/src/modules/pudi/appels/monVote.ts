// PUDI-CC-16.1: own vote of the signed-in voter, read once from the server (plain fetch, no
// supabase-js on the home page) and kept on the device for offline display
// (localStorage pudi_mon_vote_cache: votes, date, « converted » flag; cleared on sign-out).
import { jetonLocal, rpcFetch, type MonVote } from './api';
import type { VoteResume } from '../utils/monVote';

const CLE = 'pudi_mon_vote_cache';

export function lireVoteCache(): VoteResume | null {
  try {
    const raw = localStorage.getItem(CLE);
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<VoteResume>;
    const liste = (l: unknown) => (Array.isArray(l) ? l.filter((x): x is string => typeof x === 'string') : []);
    if (typeof o.compte !== 'string' || typeof o.date !== 'string') return null;
    return { compte: o.compte, priorites: liste(o.priorites).slice(0, 12), converti: o.converti === true, date: o.date };
  } catch {
    return null;
  }
}

export function ecrireVoteCache(v: VoteResume): void {
  try {
    localStorage.setItem(CLE, JSON.stringify({ compte: v.compte, priorites: v.priorites, converti: !!v.converti, date: v.date }));
  } catch {
    /* no storage: memory only */
  }
}

export function effacerVoteCache(): void {
  try {
    localStorage.removeItem(CLE);
  } catch {
    /* no storage */
  }
}

/** Server vote as a summary (with the missing project, never cached). */
export function resumeDuVote(v: MonVote, compte: string): VoteResume {
  return { compte, priorites: v.priorites ?? [], converti: !!v.converti_4x, date: v.updated_at ?? v.created_at, manquant: v.manquant ?? null };
}

/** pudi_mon_vote with the stored session. Throws offline or when the session is refused. */
export async function lireMonVoteServeur(): Promise<MonVote | null> {
  const jeton = jetonLocal();
  if (!jeton) throw new Error('session');
  const r = await rpcFetch('pudi_mon_vote', jeton);
  if (!r.ok) throw new Error(`pudi_mon_vote ${r.status}`);
  return (await r.json()) as MonVote | null;
}
