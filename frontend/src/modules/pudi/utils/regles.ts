// Pure choice rules of the PUDi consultation (mirrors of the server checks in
// pudi_soumettre_vote, PUDI-CC-17: 12 votes; PUDI-CC-18: no urgents question). No side effects, no imports:
// unit tested in regles.test.ts.

/** PUDI-CC-17 (specification v9 4.5): 12 votes to spread, several on one programme allowed. */
export const VOIX = 12;
export const MAX_MANQUANT = 1000;
/** First tranche of the PUDi: a programme planned later and ranked in the top 15 is « avancé par les votants ». */
export const PREMIERE_TRANCHE = '2026-2030';

export interface Brouillon {
  priorites: string[];
  manquant: string;
}

export const BROUILLON_VIDE: Brouillon = { priorites: [], manquant: '' };

/** Votes placed (one element of `priorites` per vote, the same id repeated for stacked votes). */
export function voixUtilisees(b: Brouillon): number {
  return b.priorites.length;
}

/** Votes placed on one programme or proposal. */
export function voixPour(b: Brouillon, id: string): number {
  return b.priorites.reduce((n, x) => (x === id ? n + 1 : n), 0);
}

/** A 13th vote is refused. */
export function peutAjouterVoix(b: Brouillon): boolean {
  return b.priorites.length < VOIX;
}

/** One more vote on `id` (unchanged when the 12 votes are used). */
export function ajouterVoix(b: Brouillon, id: string): Brouillon {
  return peutAjouterVoix(b) ? { ...b, priorites: [...b.priorites, id] } : b;
}

/** One vote less on `id` (the last one placed; unchanged when it has none). */
export function retirerVoix(b: Brouillon, id: string): Brouillon {
  const i = b.priorites.lastIndexOf(id);
  return i < 0 ? b : { ...b, priorites: [...b.priorites.slice(0, i), ...b.priorites.slice(i + 1)] };
}

/** Votes grouped by programme, most votes first, then in the order they were first placed. */
export function regrouperVoix(priorites: readonly string[]): { id: string; n: number }[] {
  const ordre: string[] = [];
  const n = new Map<string, number>();
  for (const id of priorites) {
    if (!n.has(id)) ordre.push(id);
    n.set(id, (n.get(id) ?? 0) + 1);
  }
  return ordre.map((id, i) => ({ id, n: n.get(id)!, i })).sort((a, b) => b.n - a.n || a.i - b.i).map(({ id, n: k }) => ({ id, n: k }));
}

/** "A4 ×5, T3 ×4, P1 ×3" (names given by `nom`, ids by default). */
export function texteVoix(priorites: readonly string[], nom: (id: string) => string = (id) => id): string {
  return regrouperVoix(priorites).map((l) => `${nom(l.id)} ×${l.n}`).join(', ');
}

/** Ready to send: 1 to 12 votes on known ids (repeats allowed), text within 1000 characters. */
export function brouillonValide(b: Brouillon, idsConnus?: readonly string[]): boolean {
  const connus = (l: string[]) => !idsConnus || l.every((id) => idsConnus.includes(id));
  return b.priorites.length >= 1 && b.priorites.length <= VOIX && connus(b.priorites) && b.manquant.length <= MAX_MANQUANT;
}

/** Text of the "missing project" field cut at 1000 characters (the 1001st is impossible). */
export function limiterManquant(texte: string): string {
  return texte.slice(0, MAX_MANQUANT);
}

/**
 * Client mirror of pudi_normaliser_numero: international digits (no '+'), or null.
 * Malagasy mobiles 03x xx xxx xx (with or without +261 / 00261); foreign numbers only with + or 00.
 */
export function normaliserTelephone(saisie: string): string | null {
  const brut = (saisie ?? '').trim();
  let plus = brut.startsWith('+');
  let d = brut.replace(/\D/g, '');
  if (d.startsWith('00')) {
    d = d.slice(2);
    plus = true;
  }
  if (d.length === 10 && d.startsWith('03')) d = '261' + d.slice(1);
  else if (d.length === 9 && d.startsWith('3')) d = '261' + d;
  if (/^2613[2-9][0-9]{7}$/.test(d)) return d;
  if (d.startsWith('261')) return null;
  if (plus && d.length >= 8 && d.length <= 15) return d;
  return null;
}

/** Display form: "034 12 345 67" for a Malagasy mobile, "+<digits>" otherwise, null when invalid. */
export function normaliserTelephoneAffichage(saisie: string): string | null {
  const n = normaliserTelephone(saisie);
  if (!n) return null;
  if (n.startsWith('261')) {
    const l = '0' + n.slice(3);
    return `${l.slice(0, 3)} ${l.slice(3, 5)} ${l.slice(5, 8)} ${l.slice(8, 10)}`;
  }
  return '+' + n;
}

/** True when the PUDi plans the programme after 2030 (tranche 2031-2035 or 2036-2040). */
export function ecartPudi(trancheAffichee: string): boolean {
  return trancheAffichee !== PREMIERE_TRANCHE;
}

/** Valid provenance code (?c=), same pattern as the server. */
export function codeCanalValide(code: string | null | undefined): code is string {
  return typeof code === 'string' && /^[a-z0-9-]{1,24}$/.test(code);
}

/**
 * Removes from the draft the proposal ids that are no longer in the public list (withdrawn).
 * Programme ids are never touched. Returns the cleaned draft and the removed ids (in order).
 */
export function retirerPropositionsAbsentes(
  b: Brouillon,
  actives: readonly string[],
  estProposition: (id: string) => boolean
): { brouillon: Brouillon; retires: string[] } {
  const garder = (id: string) => !estProposition(id) || actives.includes(id);
  const retires = [...new Set(b.priorites.filter((id) => !garder(id)))];
  if (!retires.length) return { brouillon: b, retires };
  return { brouillon: { ...b, priorites: b.priorites.filter(garder) }, retires };
}
