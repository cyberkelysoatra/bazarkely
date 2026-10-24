// Pure helpers of the group managers' screen (PUDI-CC-07): display of the numbers, search,
// check of the form before sending, French messages of the server errors.
import { frPages } from '../i18n/frPages';
import { extraireCode } from './erreurs';
import { normaliserTelephone, normaliserTelephoneAffichage } from './regles';

export interface MembreAffichable {
  numeros: string[];
  email: string | null;
  etablissement: string | null;
  fokontany: string | null;
}

export const EMAIL_VALIDE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Stored number (261341234567 / 33612345678) → "034 12 345 67" / "+33612345678". */
export function afficherNumero(n: string): string {
  return n.startsWith('261') ? (normaliserTelephoneAffichage(n) ?? n) : `+${n}`;
}

/** Lower case, no accents, single spaces. */
function plat(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Search on the numbers (any spacing, local or international form), e-mail, establishment, fokontany. */
export function filtrerMembres<T extends MembreAffichable>(membres: T[], requete: string): T[] {
  const q = plat(requete);
  if (!q) return membres;
  const chiffres = q.replace(/\D/g, '');
  const local = chiffres.startsWith('0') ? chiffres.slice(1) : chiffres;
  return membres.filter((m) => {
    if (chiffres.length >= 3 && q.replace(/[\d\s+().-]/g, '') === '' && m.numeros.some((n) => n.includes(local))) return true;
    const texte = plat([m.email, m.etablissement, m.fokontany, ...m.numeros.map(afficherNumero)].filter(Boolean).join(' '));
    return q.split(' ').every((mot) => texte.includes(mot));
  });
}

export type FiltreVote = 'tous' | 'aVote' | 'pasEncore';

/** Participation of a list (v6): lines that voted, total, rounded percentage (0 for an empty list). */
export function participation(membres: { a_vote: boolean }[]): { votants: number; total: number; pct: number } {
  const total = membres.length;
  const votants = membres.filter((m) => m.a_vote).length;
  return { votants, total, pct: total ? Math.round((votants * 100) / total) : 0 };
}

export function filtrerParVote<T extends { a_vote: boolean }>(membres: T[], filtre: FiltreVote): T[] {
  return filtre === 'tous' ? membres : membres.filter((m) => m.a_vote === (filtre === 'aVote'));
}

/** Checks the form like the server does. Returns a PUDI_ code or null. */
export function verifierSaisie(numeros: string[], email: string): string | null {
  const remplis = numeros.map((n) => n.trim()).filter(Boolean);
  if (!remplis.length) return 'PUDI_NUMERO_REQUIS';
  if (remplis.length > 3 || remplis.some((n) => !normaliserTelephone(n))) return 'PUDI_NUMERO_INVALIDE';
  if (email.trim() && !EMAIL_VALIDE.test(email.trim().toLowerCase())) return 'PUDI_EMAIL_INVALIDE';
  return null;
}

export function messageGroupe(e: unknown): string {
  const code = extraireCode(e);
  const messages = frPages.groupe.erreurs as Record<string, string>;
  return (code && messages[code]) || messages.AUTRE;
}
