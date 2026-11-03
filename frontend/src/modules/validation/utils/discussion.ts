// Pure rules of the project thread (VC-39, VC-40, section 7 « Commentaire très long »), unit tested
// in discussion.test.ts. No storage and no network here: appels/messages.ts keeps the queue.
import type { MessageFil, ResultatMessage } from './types';
import { fonctionEnLigne, sansCivilite } from './regles';

/** 2 000 characters at most per message; the counter shows from 1 800 (same rule as a comment). */
export const MAX_MESSAGE = 2000;
export const COMPTEUR_MESSAGE_DES = 1800;
/** Own message withdrawable during 5 minutes (vc_message_retirer). */
export const DELAI_RETRAIT_MS = 5 * 60 * 1000;
/** Thread re-read every 15 s while the screen is visible and online. */
export const RELECTURE_FIL_MS = 15000;

export const LIGNE_FIXE =
  'Joël répond en général dans la journée. Vos échanges sont conservés et lus par l’équipe CyberKELY, y compris son assistant d’intelligence artificielle, pour préparer votre projet.';
export const FIL_VIDE = 'Posez ici vos questions sur le projet : Joël vous répond.';

/** Typing stops at 2 000 characters. */
export function couperMessage(texte: string): string {
  return texte.length > MAX_MESSAGE ? texte.slice(0, MAX_MESSAGE) : texte;
}

/** « 1800 / 2000 » from 1 800 characters, nothing below. */
export function compteurMessage(n: number): string | null {
  return n >= COMPTEUR_MESSAGE_DES ? `${n} / ${MAX_MESSAGE}` : null;
}

/** Own, not withdrawn, written less than 5 minutes ago (by the phone clock, the server decides). */
export function retirable(m: Pick<MessageFil, 'moi' | 'retire' | 'cree_at'>, maintenant: number = Date.now()): boolean {
  if (!m.moi || m.retire) return false;
  const age = maintenant - Date.parse(m.cree_at);
  return Number.isFinite(age) && age < DELAI_RETRAIT_MS;
}

/** « À propos de la question 3 : le budget », same text as vc_messages_lister. */
export function libelleQuestion(numero: string, sujet: string): string {
  return `À propos de la question ${numero} : ${sujet.trim()}`;
}

// ---------------------------------------------------------------- offline queue

/** A message written on this phone, not yet recorded by the server. */
export interface MessageEnAttente {
  id: string;
  client: string;
  texte: string;
  question: string | null;
  questionLibelle: string | null;
  cree_at: string;
  /** Server refusal kept on the bubble (TROP_LONG, MESSAGE_VIDE, VC_ACCES_REFUSE...); never resent. */
  refus?: string | null;
}

/** Server refusals that a resend will never change. */
export function refusDefinitif(message: string): boolean {
  return /^VC_|permission denied|JWT|violates/i.test(message);
}

export type Envoyeur = (m: MessageEnAttente) => Promise<ResultatMessage>;

/**
 * Sends the waiting messages in order, one at a time. A message recorded (or already known: same id)
 * leaves the queue; a server refusal stays in it, marked, and the next ones still go; a network
 * failure stops the run and keeps everything from that message on, in order.
 */
export async function traiterFile(
  file: MessageEnAttente[],
  envoyer: Envoyeur
): Promise<{ file: MessageEnAttente[]; envoyes: string[]; reseau: boolean }> {
  const reste: MessageEnAttente[] = [];
  const envoyes: string[] = [];
  let reseau = false;
  for (let i = 0; i < file.length; i++) {
    const m = file[i];
    if (reseau || m.refus) {
      reste.push(m);
      continue;
    }
    try {
      const r = await envoyer(m);
      if (r?.ok) envoyes.push(m.id);
      else reste.push({ ...m, refus: r?.code ?? 'REFUSE' });
    } catch (e) {
      const t = e instanceof Error ? e.message : String(e);
      if (refusDefinitif(t)) reste.push({ ...m, refus: t.match(/VC_[A-Z_]+/)?.[0] ?? 'REFUSE' });
      else {
        reseau = true;
        reste.push(m);
      }
    }
  }
  return { file: reste, envoyes, reseau };
}

/** Bubble of the thread: a server message, or a message of the queue (clock, or its refusal). */
export interface Bulle extends MessageFil {
  attente: boolean;
  refus: string | null;
}

/**
 * Thread shown: the server list in its order, then the queued messages of this project that the
 * server does not know yet (same id = already recorded, the server copy wins).
 */
export function fusionnerFil(serveur: MessageFil[], file: MessageEnAttente[], client: string, auteur: { nom: string; fonction: string | null }): Bulle[] {
  const connus = new Set(serveur.map((m) => m.id));
  const locaux: Bulle[] = file
    .filter((m) => m.client === client && !connus.has(m.id))
    .map((m) => ({
      id: m.id,
      moi: true,
      auteur: auteur.nom,
      fonction: auteur.fonction,
      texte: m.texte,
      retire: false,
      cree_at: m.cree_at,
      question_id: m.question,
      question: m.questionLibelle,
      attente: !m.refus,
      refus: m.refus ?? null
    }));
  return [...serveur.map((m) => ({ ...m, attente: false, refus: null })), ...locaux];
}

/** Server code on a bubble or a withdrawal → client text. */
export const TEXTES_MESSAGE: Record<string, string> = {
  TROP_LONG: 'Message trop long : 2 000 caractères au plus. Il n’est pas parti.',
  MESSAGE_VIDE: 'Message vide : il n’est pas parti.',
  DELAI_DEPASSE: 'Plus de 5 minutes ont passé : ce message ne peut plus être retiré.',
  VC_ACCES_REFUSE: 'Vous n’avez plus accès à ce projet : ce message n’est pas parti.',
  REFUSE: 'Le serveur a refusé ce message : il n’est pas parti.'
};

/** « Monsieur Hery Rakoto, associé » → « Hery Rakoto, associé »; Joël stays « Joël SOATRA, CyberKELY ». */
export function signature(m: Pick<MessageFil, 'auteur' | 'fonction'>): string {
  const f = (m.fonction ?? '').trim();
  return [sansCivilite(m.auteur), f ? (f === 'CyberKELY' ? f : fonctionEnLigne(f)) : ''].filter(Boolean).join(', ');
}

/** « 02/11 à 21 h 17 » of a bubble (Madagascar time), same format as the mockup. */
export { jourHeure as heureBulle } from './regles';
