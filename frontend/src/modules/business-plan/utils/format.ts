// Formats of the module: ariary amounts (narrow no-break spaces), percents, French dates.
export const ESPACE = ' ';

/** 1200000 -> "1 200 000" (narrow no-break spaces). */
export function grouper(n: number): string {
  const signe = n < 0 ? '-' : '';
  const chiffres = Math.abs(Math.round(n)).toString();
  return signe + chiffres.replace(/\B(?=(\d{3})+(?!\d))/g, ESPACE);
}

/** 1200000 -> "1 200 000 Ar"; null -> "". */
export function ariary(n: number | null | undefined): string {
  return n === null || n === undefined || !Number.isFinite(n) ? '' : grouper(n) + ESPACE + 'Ar';
}

export function pourcent(n: number | null | undefined): string {
  return n === null || n === undefined || !Number.isFinite(n) ? '' : grouper(n) + ESPACE + '%';
}

/** Digits typed by the person -> integer or null (anything else is ignored). */
export function lireEntier(texte: string): number | null {
  const chiffres = texte.replace(/\D/g, '');
  if (!chiffres) return null;
  const n = Number(chiffres.slice(0, 15));
  return Number.isFinite(n) ? n : null;
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** "10 novembre 2026 à 14 h 05" */
export function dateFr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const h = d.getHours().toString();
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()} à ${h} h ${m}`;
}

/** Plural of a sale unit typed by the person: "bouteille de 50 cl" -> "bouteilles de 50 cl". */
export function pluriel(unite: string, n: number): string {
  const u = unite.trim().replace(/^(une?|la|le|l'|l’)\s*/i, '');
  if (!u) return n > 1 ? 'unités' : 'unité';
  if (n <= 1) return u;
  const [premier, ...reste] = u.split(' ');
  const p = /[sxz]$/i.test(premier) || /^(kg|g|l|cl|ml|m|km|m2|m3|t|h)$/i.test(premier) ? premier : /(au|eau|eu)$/i.test(premier) ? premier + 'x' : premier + 's';
  return [p, ...reste].join(' ');
}
