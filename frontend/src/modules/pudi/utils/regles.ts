// Pure choice rules of the PUDi consultation (mirrors of the server checks in
// pudi_soumettre_vote). No side effects, no imports: unit tested in regles.test.ts.

export const MAX_PRIORITES = 3;
export const MAX_URGENTS = 10;
export const MAX_MANQUANT = 300;
export const TRANCHE_URGENTE = '2026-2030';

export interface Brouillon {
  priorites: string[];
  urgents: string[];
  manquant: string;
}

export const BROUILLON_VIDE: Brouillon = { priorites: [], urgents: [], manquant: '' };

/** A 4th priority (or a duplicate) is refused. */
export function peutAjouterPriorite(b: Brouillon, id: string): boolean {
  return !b.priorites.includes(id) && b.priorites.length < MAX_PRIORITES;
}

/** An 11th urgent (or a duplicate) is refused. A programme may be both priority and urgent. */
export function peutAjouterUrgent(b: Brouillon, id: string): boolean {
  return !b.urgents.includes(id) && b.urgents.length < MAX_URGENTS;
}

/** Ready to send: exactly 3 distinct priorities, at most 10 distinct urgents, text within 300 characters. */
export function brouillonValide(b: Brouillon, idsConnus?: readonly string[]): boolean {
  const distinct = (l: string[]) => new Set(l).size === l.length;
  const connus = (l: string[]) => !idsConnus || l.every((id) => idsConnus.includes(id));
  return (
    b.priorites.length === MAX_PRIORITES &&
    distinct(b.priorites) &&
    connus(b.priorites) &&
    b.urgents.length <= MAX_URGENTS &&
    distinct(b.urgents) &&
    connus(b.urgents) &&
    b.manquant.length <= MAX_MANQUANT
  );
}

/** Toggle helpers returning a new draft (unchanged when the rule refuses). */
export function basculerPriorite(b: Brouillon, id: string): Brouillon {
  if (b.priorites.includes(id)) return { ...b, priorites: b.priorites.filter((x) => x !== id) };
  return peutAjouterPriorite(b, id) ? { ...b, priorites: [...b.priorites, id] } : b;
}

export function basculerUrgent(b: Brouillon, id: string): Brouillon {
  if (b.urgents.includes(id)) return { ...b, urgents: b.urgents.filter((x) => x !== id) };
  return peutAjouterUrgent(b, id) ? { ...b, urgents: [...b.urgents, id] } : b;
}

/** Text of the "missing project" field cut at 300 characters (the 301st is impossible). */
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

/** True when marking the programme urgent moves it ahead of the PUDi (tranche 2031-2035 or 2036-2040). */
export function ecartPudi(trancheAffichee: string): boolean {
  return trancheAffichee !== TRANCHE_URGENTE;
}

/** Valid provenance code (?c=), same pattern as the server. */
export function codeCanalValide(code: string | null | undefined): code is string {
  return typeof code === 'string' && /^[a-z0-9-]{1,24}$/.test(code);
}
