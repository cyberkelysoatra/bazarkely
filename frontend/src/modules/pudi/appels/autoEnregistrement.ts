// PUDI-CC-19 (specification v11, 4.4): after the first vote, every change is saved by itself, like
// a WhatsApp poll. Only for a signed-in person whose vote is on the server (a_vote), outside
// « Voir comme », while the vote is open. A gesture (+, −, tap on a card, transfer, missing-project
// text) schedules one send after 1.2 s (2 s for the text) of calm; one request at a time, the
// latest draft wins, nothing is sent when the draft equals the server vote or has 0 vote. The
// details already on the server (fokontany, profile) are sent again, the phone is omitted (the
// server keeps the stored one) and the residence stays declared. Offline: kept pending, sent when
// the connection comes back. Module state (not React) so a send survives a page change.
import { jetonLocal, lireMonVote, soumettreVote, type EtatConsultation, type MonVote } from './api';
import { lireBrouillon } from './brouillon';
import { lireCanal } from './provenance';
import { renouvelerSessionExpiree } from './session';
import { extraireCode, messageErreur, type ErreurAffichee } from '../utils/erreurs';
import type { Brouillon } from '../utils/regles';

export type StatutAuto = 'inactif' | 'pret' | 'attente' | 'envoi' | 'enregistre' | 'horsLigne' | 'zero' | 'reconnexion' | 'erreur';

export interface EtatAuto {
  statut: StatutAuto;
  /** Time of the last version saved on the server (shown on tap). */
  at: string | null;
  erreur: ErreurAffichee | null;
}

/** Server vote the draft is compared with (manquant undefined = unknown, not compared). */
interface Reference {
  priorites: string[];
  manquant?: string | null;
}

interface Contexte {
  actif: boolean;
  serveur: Reference | null;
  /** Vote masked automatically (PUDI-CC-09): never sent, the server would refuse it. */
  masque?: boolean;
  noter: (v: MonVote) => void;
  surMasque: () => void;
}

export const DELAI_VOIX = 1200;
export const DELAI_TEXTE = 2000;

let ctx: Contexte = { actif: false, serveur: null, noter: () => undefined, surMasque: () => undefined };
let etat: EtatAuto = { statut: 'inactif', at: null, erreur: null };
const abonnes = new Set<() => void>();
let minuterie: number | undefined;
let enCours = false;
let aRefaire = false;
let attendReseau = false;
/** Last full server vote (details included), read once then kept from each answer. */
let details: MonVote | null = null;

function maj(e: Partial<EtatAuto>): void {
  etat = { ...etat, ...e };
  abonnes.forEach((f) => f());
}

export function lireEtatAuto(): EtatAuto {
  return etat;
}

export function abonnerAuto(f: () => void): () => void {
  abonnes.add(f);
  return () => abonnes.delete(f);
}

/** Who gets the automatic saving (pure, also used by the sending page to step aside). */
export function conditionsAuto(v: {
  etatReel: EtatConsultation | null;
  apercu: unknown;
  monVote: unknown;
  envoiOuvert: boolean;
}): boolean {
  return !!v.etatReel?.connecte && !!v.etatReel.a_vote && !v.etatReel.clos && !v.apercu && !!v.monVote && v.envoiOuvert;
}

const trie = (l: readonly string[]) => [...l].sort().join('|');

/** Draft equal to the server vote (order ignored; the text only when it is known). */
export function memeQueServeur(b: Brouillon, ref: Reference | null): boolean {
  if (!ref) return false;
  return trie(b.priorites) === trie(ref.priorites) && (ref.manquant === undefined || b.manquant.trim() === (ref.manquant ?? '').trim());
}

const reference = (): Reference | null => details ?? ctx.serveur;

function annuler(): void {
  if (minuterie !== undefined) window.clearTimeout(minuterie);
  minuterie = undefined;
}

export function configurerAuto(c: Contexte): void {
  const avant = ctx.actif;
  ctx = c;
  if (!c.actif) {
    annuler();
    details = null;
    aRefaire = false;
    if (etat.statut !== 'inactif') maj({ statut: 'inactif', erreur: null });
    return;
  }
  if (!avant) maj({ statut: 'pret', erreur: null });
}

/** A gesture changed the draft (call after the draft was written). */
export function signalerGeste(type: 'voix' | 'texte'): void {
  if (!ctx.actif) return;
  annuler();
  if (!lireBrouillon().priorites.length) {
    maj({ statut: 'zero', erreur: null });
    return;
  }
  maj({ statut: 'attente', erreur: null });
  minuterie = window.setTimeout(() => {
    minuterie = undefined;
    void enregistrerMaintenant();
  }, type === 'texte' ? DELAI_TEXTE : DELAI_VOIX);
}

function horsLigne(): void {
  maj({ statut: 'horsLigne', erreur: null });
  if (attendReseau) return;
  attendReseau = true;
  window.addEventListener(
    'online',
    () => {
      attendReseau = false;
      void enregistrerMaintenant();
    },
    { once: true }
  );
}

/** Details changed from « Modifier mes renseignements »: the next sends reuse them. */
export function noterDetailsAuto(v: MonVote): void {
  details = v;
}

/** Sends the current draft now (end of the pause, back online, or « Enregistrer mes changements »). */
export async function enregistrerMaintenant(): Promise<void> {
  annuler();
  if (!ctx.actif) return;
  if (enCours) {
    aRefaire = true;
    return;
  }
  const b = lireBrouillon();
  if (!b.priorites.length) return maj({ statut: 'zero', erreur: null });
  if (ctx.masque) return maj({ statut: 'erreur', erreur: messageErreur('PUDI_VOTE_MASQUE') });
  // Shortcut without any request only when the server text is known (the device copy never keeps it).
  const ref = reference();
  if (ref && ref.manquant !== undefined && memeQueServeur(b, ref)) return maj({ statut: 'enregistre', erreur: null });
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return horsLigne();
  enCours = true;
  maj({ statut: 'envoi', erreur: null });
  try {
    // PUDI-CC-16.1: pages without supabase-js never renew the token; renew it once first.
    if (!jetonLocal() && !(await renouvelerSessionExpiree())) {
      maj({ statut: 'reconnexion', erreur: null });
      return;
    }
    if (!details) details = await lireMonVote();
    if (!details) {
      maj({ statut: 'erreur', erreur: messageErreur('AUTRE') });
      return;
    }
    if (memeQueServeur(b, details)) {
      ctx.noter(details);
      maj({ statut: 'enregistre', at: details.updated_at ?? details.created_at, erreur: null });
      return;
    }
    const v = await soumettreVote(
      b,
      { fokontany: details.fokontany, fokontanyAutre: details.fokontany_autre ?? '', profil: details.profil, telephone: '', resident: true },
      lireCanal()
    );
    details = v;
    ctx.noter(v);
    maj({ statut: minuterie !== undefined ? 'attente' : 'enregistre', at: v.updated_at ?? v.created_at, erreur: null });
  } catch (e) {
    const code = extraireCode(e);
    const texte = String((e as { message?: unknown } | null)?.message ?? '');
    if (code === 'RESEAU' || (typeof navigator !== 'undefined' && navigator.onLine === false)) horsLigne();
    else if (code === 'NON_CONNECTE' || /jwt|session/i.test(texte)) maj({ statut: 'reconnexion', erreur: null });
    else {
      if (code === 'VOTE_MASQUE') ctx.surMasque();
      maj({ statut: 'erreur', erreur: messageErreur(e) });
    }
  } finally {
    enCours = false;
    if (aRefaire) {
      aRefaire = false;
      void enregistrerMaintenant();
    }
  }
}
