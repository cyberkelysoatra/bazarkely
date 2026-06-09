/**
 * Conversion d'un montant en toutes lettres (français), sans dépendance externe.
 * Arrondit à l'entier le plus proche et gère 0 → milliards. Règles d'orthographe :
 *  - « et » : vingt et un … soixante et un, soixante et onze (mais pas quatre-vingt-un).
 *  - « cents » : pluriel uniquement si multiplié et rien ne suit (deux cents / deux cent un).
 *  - « mille » invariable et sans « un » (mille, et non « un mille »).
 *  - « million(s) » / « milliard(s) » : pluriel quand > 1, prennent « un million ».
 *
 * Cohérence (vérifiée) :
 *   montantEnLettres(0)        → "Zéro Ariary"
 *   montantEnLettres(145500)   → "Cent quarante-cinq mille cinq cents Ariary"
 *   montantEnLettres(575055)   → "Cinq cent soixante-quinze mille cinquante-cinq Ariary"
 *   montantEnLettres(575054.7) → arrondi à 575055 → identique à la ligne ci-dessus
 *   montantEnLettres(80)       → "Quatre-vingts Ariary"
 *   montantEnLettres(81)       → "Quatre-vingt-un Ariary"
 *   montantEnLettres(1000000)  → "Un million Ariary"
 */

const UNITES = [
  '', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
  'dix-sept', 'dix-huit', 'dix-neuf',
];

// Dizaines (index = chiffre des dizaines). 70 et 90 réutilisent soixante / quatre-vingt.
const DIZAINES = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

/** Nombre 0..99 en lettres (chaîne vide pour 0). */
function below100(n: number): string {
  if (n < 20) return UNITES[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  const base = DIZAINES[t];

  if (t === 7 || t === 9) {
    // 70-79 = soixante + (dix..dix-neuf) ; 90-99 = quatre-vingt + (dix..dix-neuf)
    const reste = below100(10 + u); // dix..dix-neuf
    // 71 = soixante et onze (« et » seulement à 71, pas à 91)
    if (t === 7 && u === 1) return `${base} et ${reste}`;
    return `${base}-${reste}`;
  }

  if (u === 0) {
    // 80 = quatre-vingts (pluriel), 20/30/…/60 invariables
    return t === 8 ? `${base}s` : base;
  }
  // vingt et un … soixante et un (mais quatre-vingt-un sans « et »)
  if (u === 1 && t !== 8) return `${base} et un`;
  return `${base}-${UNITES[u]}`;
}

/** Nombre 0..999 en lettres (chaîne vide pour 0). */
function below1000(n: number): string {
  if (n === 0) return '';
  const c = Math.floor(n / 100);
  const reste = n % 100;
  let s = '';
  if (c > 0) {
    s = c === 1 ? 'cent' : `${UNITES[c]} cent`;
    // « cents » pluriel uniquement si multiplié ET rien ne suit
    if (c > 1 && reste === 0) s += 's';
  }
  if (reste > 0) s = s ? `${s} ${below100(reste)}` : below100(reste);
  return s;
}

/** Convertit un montant en toutes lettres, suffixé par la devise (ex. « Ariary »). */
export function montantEnLettres(n: number, devise = 'Ariary'): string {
  const r = Math.round(Math.abs(n));
  if (r === 0) return `Zéro ${devise}`;

  const milliards = Math.floor(r / 1_000_000_000);
  const millions = Math.floor((r % 1_000_000_000) / 1_000_000);
  const milliers = Math.floor((r % 1_000_000) / 1000);
  const reste = r % 1000;

  const parts: string[] = [];
  if (milliards > 0) parts.push(`${below1000(milliards)} milliard${milliards > 1 ? 's' : ''}`);
  if (millions > 0) parts.push(`${below1000(millions)} million${millions > 1 ? 's' : ''}`);
  if (milliers > 0) parts.push(milliers === 1 ? 'mille' : `${below1000(milliers)} mille`);
  if (reste > 0) parts.push(below1000(reste));

  const phrase = parts.join(' ').trim();
  const capitalized = phrase.charAt(0).toUpperCase() + phrase.slice(1);
  return `${capitalized} ${devise}`;
}
