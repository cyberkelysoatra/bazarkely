// CSV exports of the administration (pure). Rule of the consultation: an export never contains
// an e-mail or a phone number (the « Numéro connu » of the Votes screen is never exported). The
// rows of pudi_admin_votes() carry none, and every free text cell is still cleaned (a voter may
// type a number in « projet manquant »).
import { texteVoix } from './regles';

/** One row of pudi_admin_votes() (server API contract, phase 2). */
export interface VoteAdmin {
  id_anonyme: string;
  fokontany: string;
  fokontany_autre: string | null;
  profil: string;
  canal_code: string | null;
  dans_nos_reseaux: boolean;
  groupes: string[];
  hors_liste_du_canal: boolean;
  priorites: string[];
  urgents: string[];
  manquant: string | null;
  cree_le: string;
  modifie_le: string;
  nb_modifications: number;
  masque: boolean;
  masque_motif: string | null;
  est_test: boolean;
  groupe_ip: string | null;
}

export const ENTETE_VOTES = [
  'id_anonyme', 'cree_le', 'modifie_le', 'nb_modifications', 'fokontany', 'fokontany_autre', 'profil', 'canal',
  'dans_nos_reseaux', 'groupes', 'hors_liste_du_canal', 'nb_voix', 'voix', 'urgents',
  'manquant', 'masque', 'motif', 'test', 'groupe_ip'
] as const;

/** PUDI-CC-17: a vote still exactly as sent before the 12-vote rule (3 distinct programmes, not modified since). */
export function voteA3Voix(v: Pick<VoteAdmin, 'priorites' | 'modifie_le'>, regleAt: string | null | undefined): boolean {
  const p = v.priorites ?? [];
  return !!regleAt && p.length === 3 && new Set(p).size === 3 && Date.parse(v.modifie_le) <= Date.parse(regleAt);
}

const MADA_MS = 3 * 3600 * 1000;
const deux = (n: number) => String(n).padStart(2, '0');

/** "2026-10-21 14:05" in Madagascar time (UTC+3, no daylight saving). */
export function dateHeureMada(iso: string | null | undefined): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const d = new Date(t + MADA_MS);
  return `${d.getUTCFullYear()}-${deux(d.getUTCMonth() + 1)}-${deux(d.getUTCDate())} ${deux(d.getUTCHours())}:${deux(d.getUTCMinutes())}`;
}

/** "20261021-1405" (Madagascar time), for file names. */
export function horodatage(maintenant: Date = new Date()): string {
  const d = new Date(maintenant.getTime() + MADA_MS);
  return `${d.getUTCFullYear()}${deux(d.getUTCMonth() + 1)}${deux(d.getUTCDate())}-${deux(d.getUTCHours())}${deux(d.getUTCMinutes())}`;
}

const EMAIL = /[^\s;,<>"']+@[^\s;,<>"']+\.[a-z]{2,}/gi;
// 9 digits or more, spaces, dots, dashes or a leading + allowed between them (phone numbers).
const NUMERO = /\+?\d(?:[\s.\-/]?\d){8,}/g;

/** Removes e-mails and phone-like numbers from a free text. */
export function nettoyerTexteLibre(texte: string | null | undefined): string {
  return (texte ?? '').replace(EMAIL, '[e-mail masqué]').replace(NUMERO, '[numéro masqué]');
}

function cellule(v: string | number | boolean | null | undefined): string {
  const s = typeof v === 'boolean' ? (v ? 'oui' : 'non') : v === null || v === undefined ? '' : String(v);
  // A cell starting with = + - @ would be read as a formula by Excel: prefixed with a quote.
  const propre = s.replace(/\r\n|\r|\n/g, ' ').replace(/^([=+\-@\t])/, "'$1");
  return /[;"]/.test(propre) || propre !== propre.trim() ? `"${propre.replace(/"/g, '""')}"` : propre;
}

/** UTF-8 BOM + `;` separated lines (free text cells must be cleaned by the caller) (opens correctly in Excel with French settings). */
export function construireCsv(entete: readonly string[], lignes: readonly (readonly (string | number | boolean | null | undefined)[])[]): string {
  return '\uFEFF' + [entete.map(cellule).join(';'), ...lignes.map((l) => l.map(cellule).join(';'))].join('\r\n') + '\r\n';
}

export function csvVotes(votes: readonly VoteAdmin[]): string {
  return construireCsv(
    ENTETE_VOTES,
    votes.map((v) => [
      v.id_anonyme,
      dateHeureMada(v.cree_le),
      dateHeureMada(v.modifie_le),
      v.nb_modifications,
      v.fokontany,
      nettoyerTexteLibre(v.fokontany_autre),
      v.profil,
      v.canal_code,
      v.dans_nos_reseaux,
      (v.groupes ?? []).join(', '),
      v.hors_liste_du_canal,
      (v.priorites ?? []).length,
      texteVoix(v.priorites ?? []),
      (v.urgents ?? []).join(' '),
      nettoyerTexteLibre(v.manquant),
      v.masque,
      nettoyerTexteLibre(v.masque_motif),
      v.est_test,
      v.groupe_ip
    ])
  );
}

export const nomFichierVotes = (d: Date = new Date()) => `PUDi_votes_${horodatage(d)}.csv`;
export const nomFichierSyntheseCsv = (d: Date = new Date()) => `PUDi_synthese_${horodatage(d)}.csv`;
export const nomFichierSynthesePdf = (d: Date = new Date()) => `PUDi_synthese_${horodatage(d).slice(0, 8)}.pdf`;

/** Saves a text or binary content as a file (no server, no storage). */
export function telechargerFichier(contenu: BlobPart, nom: string, type: string): void {
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
