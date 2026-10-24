// PUDI-CC-16.1: pure rules of the signed-in voter's own vote shown on every device.
// The server vote fills an EMPTY draft only; a different draft is kept (rule of PUDI-CC-14.1 d).
import type { Brouillon } from './regles';

/** Own vote as kept on the device (pudi_mon_vote_cache): priorities, urgents and date only. */
export interface VoteResume {
  /** Account the copy belongs to (e-mail of the shared session), never shown. */
  compte: string;
  priorites: string[];
  urgents: string[];
  /** Last version of the vote (updated_at, else created_at). */
  date: string;
  /** Known only after an online read (never cached): compared when present. */
  manquant?: string | null;
}

export type ComparaisonVote = 'aucun' | 'identique' | 'modifie';

const trie = (l: string[]) => [...l].sort().join('|');

/** No vote, draft equal to the vote (order ignored), or draft changed since. */
export function comparerAuVote(b: Brouillon, v: VoteResume | null): ComparaisonVote {
  if (!v) return 'aucun';
  const meme =
    trie(b.priorites) === trie(v.priorites) &&
    trie(b.urgents) === trie(v.urgents) &&
    (v.manquant === undefined || b.manquant.trim() === (v.manquant ?? '').trim());
  return meme ? 'identique' : 'modifie';
}

/** Draft rebuilt from the server vote (used only when the local draft is empty). */
export function brouillonDuVote(v: { priorites: string[]; urgents: string[]; manquant?: string | null }): Brouillon {
  return { priorites: [...v.priorites], urgents: [...v.urgents], manquant: v.manquant ?? '' };
}

/**
 * The server vote fills the draft when it is empty, or when it only lacks the missing project
 * (draft taken from the device copy offline, which never keeps that text). Any other draft is kept.
 */
export function doitRemplirDepuisServeur(
  b: Brouillon,
  v: { priorites: string[]; urgents: string[]; manquant?: string | null }
): boolean {
  if (!b.priorites.length && !b.urgents.length && !b.manquant.trim()) return true;
  return !b.manquant.trim() && !!(v.manquant ?? '').trim() && trie(b.priorites) === trie(v.priorites) && trie(b.urgents) === trie(v.urgents);
}

/** Cached copy valid for this account only (another account signed in on the same device = ignored). */
export function voteDuCompte(v: VoteResume | null, email: string | null | undefined): VoteResume | null {
  if (!v || !email) return null;
  return v.compte.trim().toLowerCase() === email.trim().toLowerCase() ? v : null;
}

/** Short title for the reminder line (cut on a word, « … » added). */
export function titreCourt(nom: string, max = 28): string {
  const t = nom.trim();
  if (t.length <= max) return t;
  const coupe = t.slice(0, max);
  const espace = coupe.lastIndexOf(' ');
  return `${(espace > max * 0.6 ? coupe.slice(0, espace) : coupe).replace(/[\s,;:.–-]+$/, '')}…`;
}

/** PUDI-CC-17: own vote of 3 votes or fewer sent before the 12-vote rule (never modified since). */
export function voteAvantRegle(v: { priorites: string[]; date: string }, regleAt: string | null | undefined): boolean {
  return !!regleAt && v.priorites.length <= 3 && Date.parse(v.date) <= Date.parse(regleAt);
}
