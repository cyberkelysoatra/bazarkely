/**
 * receiptParser — parsing PUR et testable d'un ticket de caisse (texte OCR brut → structure).
 *
 * Aucune dépendance externe : prend le texte renvoyé par l'OCR (Tesseract en Phase 1)
 * et en extrait fournisseur, lignes d'article et total, avec un score de confiance.
 *
 * Heuristiques (volontairement tolérantes — l'écran de revue corrige le reste) :
 *  - Fournisseur : 1ʳᵉ/2ᵉ ligne « textuelle » du haut.
 *  - Ligne d'article : ligne se terminant par un montant ; libellé = texte avant le prix ;
 *    quantité déduite d'un motif `2 x 1500` / `x2` ; lineTotal = montant final de la ligne.
 *  - Total : ligne contenant TOTAL / NET / À PAYER (hors « sous-total ») sinon Σ des lignes.
 *  - Lignes ignorées : TVA, rendu monnaie, dates/heures, n° ticket, moyens de paiement.
 *  - Confiance = combinaison (confiance OCR + cohérence Σ lignes vs total lu).
 */

import type { ParsedReceipt, ParsedReceiptItem } from '../types/receipt';

/** Devises / suffixes monétaires fréquents à Madagascar et en zone euro. */
const CURRENCY_SUFFIX = /(?:ar|mga|ariary|fmg|€|eur|f)\b/i;

/** Mots-clés des lignes à ne JAMAIS traiter comme article. */
const EXCLUDE_LINE =
  /\b(t\.?v\.?a|tva|sous[-\s]?total|s\/total|remise|rendu|monnaie|esp[eè]ces?|carte\s*bancaire|paiement|\bcb\b|date|heure|caisse|ticket|facture|siret|n\.?i\.?f|stat|t[eé]l[eé]?phone|\bt[eé]l\b|merci|au\s*revoir|client\b)\b/i;

/** Lignes de contact et mentions de service : jamais des articles. */
const CONTACT_LINE =
  /\b(port|mob(?:ile)?|cell?|contact|fax|whats\s*app|e-?mail|www|https?|facebook|page\s*fb|web|serveur|table|tpv|tick)\b/i;

/** Numéro malgache : 0[23]x suivi de 7 chiffres (espaces ou points permis), ou +261. */
const PHONE_MG = /(?:^|\D)0[23]\d(?:[\s.]*\d){7}(?!\d)|\+\s*261/;

/** Ligne « quantité + libellé » sans montant (ex. « 2  FLAN NATURE »). */
const QUANTITY_LABEL_LINE = /^(\d+(?:[.,]\d+)?)\s+([A-Za-zÀ-ÿ].*)$/;

/** Ligne de prix d'un article sur deux lignes (« Prix: 7300 => 14600 », « PU 7300 », « x 7300 »). */
const PRICE_LINE_START = /^\s*prix\b/i;
const PRICE_LINE = /^\s*(?:prix\b|p\.?\s?u\b|[xX×@]\s*\d)|=>|\d\s*[xX×@]\s*\d/i;

/** Mot-clé de la ligne de total final. */
const TOTAL_LINE =
  /\b(total\s*ttc|total\s*[àa]\s*payer|net\s*[àa]\s*payer|montant\s*(?:d[uû]|total|[àa]\s*payer)|total)\b/i;
const SUBTOTAL_LINE = /\b(sous[-\s]?total|s\/total)\b/i;

/** Date (12/05/2025, 12-05-25, 12.05.2025) ou heure (14:30, 14h30) en tête de ligne. */
const DATE_LINE = /^\s*\d{1,2}\s*[\/.\-]\s*\d{1,2}\s*[\/.\-]\s*\d{2,4}/;
const TIME_LINE = /^\s*\d{1,2}\s*[:hH]\s*\d{2}\b/;

/**
 * Convertit un nombre « tel qu'OCRisé » (séparateurs variés) en nombre JS.
 * Gère les espaces de milliers, le point et la virgule (MGA = sans décimale fréquent,
 * EUR = 2 décimales). Renvoie null si non interprétable.
 */
export function parseAmount(raw: string): number | null {
  if (raw == null) return null;
  let s = String(raw).replace(/[^\d.,]/g, ''); // retire espaces, devises, lettres
  if (!s) return null;

  const hasDot = s.includes('.');
  const hasComma = s.includes(',');

  if (hasDot && hasComma) {
    // Le dernier séparateur rencontré est le séparateur décimal.
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (hasComma) {
    const parts = s.split(',');
    if (parts.length === 2 && parts[1].length > 0 && parts[1].length <= 2) {
      s = parts[0].replace(/[.,]/g, '') + '.' + parts[1]; // virgule décimale
    } else {
      s = s.replace(/,/g, ''); // virgule = milliers
    }
  } else if (hasDot) {
    const parts = s.split('.');
    if (parts.length === 2 && parts[1].length > 0 && parts[1].length <= 2) {
      s = parts[0] + '.' + parts[1]; // point décimal
    } else {
      s = s.replace(/\./g, ''); // point = milliers
    }
  }

  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Jeton « nombre » bien formé : groupes de milliers de 3 chiffres séparés par
 * un SEUL espace/point (ex. « 1 500 », « 12.000 »), décimale optionnelle ; OU un
 * nombre simple avec décimale 1-2 chiffres (ex. « 15000 », « 3,50 »).
 * Le groupage strict évite de fusionner deux montants séparés par un gros blanc
 * (« 1 500   3 000 » → deux nombres, pas « 15003000 »).
 */
const NUMBER_TOKEN =
  '(?:\\d{1,3}(?:[ .\\u00a0]\\d{3})+(?:,\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?)';

const TRAILING_AMOUNT = new RegExp(
  `(${NUMBER_TOKEN})\\s*(?:ar|mga|ariary|fmg|€|eur|f)?\\.?\\s*$`,
  'i'
);

/** Capture le dernier montant d'une ligne (+ son index de départ). */
function matchTrailingAmount(line: string): { value: number; index: number } | null {
  const m = line.match(TRAILING_AMOUNT);
  if (!m || m.index === undefined) return null;
  const value = parseAmount(m[1]);
  if (value === null) return null;
  return { value, index: m.index };
}

/** Nettoie un libellé d'article (espaces multiples, ponctuation de bord, devise résiduelle). */
function cleanLabel(raw: string): string {
  return raw
    .replace(CURRENCY_SUFFIX, ' ')
    .replace(/[.\-–•·:*]+\s*$/g, ' ')
    .replace(/^[.\-–•·:*\s]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Nettoie une ligne fournisseur. */
function cleanSupplier(raw: string): string {
  return raw.replace(/\s{2,}/g, ' ').replace(/[*=_]+/g, '').trim();
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function isValidAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isIgnoredLine(line: string): boolean {
  return EXCLUDE_LINE.test(line) || CONTACT_LINE.test(line) || PHONE_MG.test(line);
}

/** Paliers de cohérence entre la somme des lignes et le total lu. */
function coherenceScore(sumLines: number, total: number): number {
  if (sumLines <= 0) return 0.3;
  const diff = Math.abs(sumLines - total) / Math.max(total, 1);
  return diff <= 0.001 ? 1 : diff <= 0.02 ? 0.9 : diff <= 0.05 ? 0.75 : diff <= 0.1 ? 0.5 : 0.3;
}

/**
 * Lit une ligne de prix : prix unitaire et, si elle est écrite, total de ligne.
 * Renvoie null si la ligne ne contient aucun montant exploitable.
 */
function parsePriceLine(
  line: string,
  quantity: number
): { unitPrice: number; lineTotal?: number } | null {
  const tokens = line.match(new RegExp(NUMBER_TOKEN, 'g')) || [];
  const numbers = tokens.map(parseAmount).filter((n): n is number => n !== null);
  if (numbers.length === 0) return null;
  if (numbers.length >= 3) {
    return { unitPrice: numbers[numbers.length - 2], lineTotal: numbers[numbers.length - 1] };
  }
  if (numbers.length === 2) {
    // « 2 x 7300 » : le premier nombre répète la quantité, le second est le prix unitaire.
    const repeatsQuantity = numbers[0] === quantity && /\d\s*[xX×@]\s*\d/.test(line);
    return repeatsQuantity ? { unitPrice: numbers[1] } : { unitPrice: numbers[0], lineTotal: numbers[1] };
  }
  return { unitPrice: numbers[0] };
}

/** Fusionne « quantité + libellé » et la ligne de prix suivante en un article, sinon null. */
function mergeTwoLineItem(line: string, nextLine: string | undefined): ParsedReceiptItem | null {
  if (nextLine === undefined || !PRICE_LINE.test(nextLine)) return null;
  if (TOTAL_LINE.test(nextLine) || isIgnoredLine(nextLine)) return null;

  const m = line.match(QUANTITY_LABEL_LINE);
  if (!m) return null;
  const quantity = parseFloat(m[1].replace(',', '.'));
  if (!Number.isFinite(quantity) || quantity <= 0) return null;

  const price = parsePriceLine(nextLine, quantity);
  if (!price) return null;

  // Total de ligne abîmé par l'OCR (ex. « 2 » au lieu de 14600) : quantité × prix unitaire.
  const expected = round2(quantity * price.unitPrice);
  const lineTotal =
    price.lineTotal !== undefined && Math.abs(price.lineTotal - expected) <= Math.max(1, expected * 0.01)
      ? price.lineTotal
      : expected;

  return {
    label: m[2].replace(/\s{2,}/g, ' ').trim(),
    quantity,
    unitPrice: price.unitPrice,
    lineTotal,
  };
}

/** Date AAAA-MM-JJ réelle, comprise dans les 60 derniers jours (jour local), sinon undefined. */
function recentReceiptDate(value: unknown, now: Date): string | undefined {
  if (typeof value !== 'string') return undefined;
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return undefined;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined;
  }
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ageInDays = Math.round((today.getTime() - date.getTime()) / 86_400_000);
  return ageInDays >= 0 && ageInDays <= 60 ? `${m[1]}-${m[2]}-${m[3]}` : undefined;
}

/**
 * Parse un ticket OCRisé.
 * @param text Texte brut renvoyé par l'OCR.
 * @param ocrConfidence Confiance OCR [0..1] (optionnelle). Si absente, neutre (0.5).
 */
export function parseReceipt(text: string, ocrConfidence?: number): ParsedReceipt {
  const rawLines = (text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // --- Fournisseur : 1ʳᵉ ligne « textuelle » (au moins 3 lettres, pas une ligne de prix). ---
  let supplier: string | undefined;
  for (let i = 0; i < Math.min(rawLines.length, 4); i++) {
    const letters = (rawLines[i].match(/[A-Za-zÀ-ÿ]/g) || []).length;
    if (letters >= 3 && !TOTAL_LINE.test(rawLines[i]) && !isIgnoredLine(rawLines[i])) {
      supplier = cleanSupplier(rawLines[i]);
      break;
    }
  }

  // --- Total lu : meilleure ligne « TOTAL » (hors sous-total). ---
  let total: number | undefined;
  for (const line of rawLines) {
    if (!TOTAL_LINE.test(line) || SUBTOTAL_LINE.test(line)) continue;
    const amt = matchTrailingAmount(line);
    if (amt && (total === undefined || amt.value >= total)) {
      total = amt.value;
    }
  }

  // --- Lignes d'article. ---
  const items: ParsedReceiptItem[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (TOTAL_LINE.test(line) || isIgnoredLine(line)) continue;
    if (DATE_LINE.test(line) || TIME_LINE.test(line)) continue;
    // Une ligne « Prix… » n'est jamais un article à elle seule.
    if (PRICE_LINE_START.test(line)) continue;

    const trailing = matchTrailingAmount(line);
    if (!trailing) {
      const merged = mergeTwoLineItem(line, rawLines[i + 1]);
      if (merged) {
        items.push(merged);
        i++; // la ligne de prix est consommée
      }
      continue;
    }
    const lineTotal = trailing.value;

    let rest = line.slice(0, trailing.index);
    let quantity = 1;
    let unitPrice: number | undefined;

    // Motif « 2 x 1500 » / « 2 × 1500 » / « 2 @ 1500 » → qté + prix unitaire.
    const qxFull = rest.match(/(\d+(?:[.,]\d+)?)\s*[xX×@]\s*([\d][\d .,]*)/);
    if (qxFull && qxFull.index !== undefined) {
      const q = parseFloat(qxFull[1].replace(',', '.'));
      if (Number.isFinite(q) && q > 0) quantity = q;
      const up = parseAmount(qxFull[2]);
      if (up !== null) unitPrice = up;
      rest = (rest.slice(0, qxFull.index) + ' ' + rest.slice(qxFull.index + qxFull[0].length)).trim();
    } else {
      // Motif simple « x2 » / « 2x ».
      const qxSimple =
        rest.match(/(?:^|\s)[xX×]\s*(\d+)(?=\s|$)/) || rest.match(/(?:^|\s)(\d+)\s*[xX×](?=\s|$)/);
      if (qxSimple && qxSimple.index !== undefined) {
        const q = parseInt(qxSimple[1], 10);
        if (Number.isFinite(q) && q > 0) quantity = q;
        rest = (rest.slice(0, qxSimple.index) + ' ' + rest.slice(qxSimple.index + qxSimple[0].length)).trim();
      }
    }

    const label = cleanLabel(rest);
    // Pas de libellé exploitable → probablement une ligne purement numérique (total partiel) : on ignore.
    if (!label || (label.match(/[A-Za-zÀ-ÿ]/g) || []).length < 2) continue;

    if (unitPrice === undefined) {
      unitPrice = quantity > 1 ? round2(lineTotal / quantity) : lineTotal;
    }

    items.push({ label, quantity, unitPrice, lineTotal });
  }

  // --- Total / cohérence / confiance. ---
  const sumLines = items.reduce((s, it) => s + (it.lineTotal || 0), 0);

  const totalRead = total !== undefined;
  let coherence: number;
  if (total === undefined) {
    // Pas de total lu : on déduit le total de la somme des lignes (la revue tranchera).
    if (items.length > 0) total = round2(sumLines);
    coherence = items.length > 0 ? 0.5 : 0;
  } else {
    coherence = coherenceScore(sumLines, total);
  }

  const ocr = ocrConfidence === undefined ? 0.5 : clamp01(ocrConfidence);
  const confidence = items.length === 0 ? 0 : clamp01(0.5 * ocr + 0.5 * coherence);

  return { supplier, items, total, totalRead, confidence };
}

/**
 * Construit un ticket à partir de la lecture structurée (Gemini), sans passer par `parseReceipt`.
 * Lignes à montant nul ou sans libellé écartées. Confiance = cohérence Σ lignes vs total
 * (total absent = 0,5). Renvoie null si le JSON est invalide.
 */
export function fromStructured(input: unknown, now: Date = new Date()): ParsedReceipt | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  if (!Array.isArray(raw.items)) return null;
  if (raw.total !== null && raw.total !== undefined && !isValidAmount(raw.total)) return null;

  const items: ParsedReceiptItem[] = [];
  for (const entry of raw.items) {
    if (!entry || typeof entry !== 'object') return null;
    const { label, quantity, unitPrice, lineTotal } = entry as Record<string, unknown>;
    if (typeof label !== 'string' || !isValidAmount(lineTotal)) return null;
    if (unitPrice !== null && unitPrice !== undefined && !isValidAmount(unitPrice)) return null;

    const cleanedLabel = label.replace(/\s{2,}/g, ' ').trim();
    if (!cleanedLabel || lineTotal === 0) continue;

    const qty = isValidAmount(quantity) && quantity > 0 ? quantity : 1;
    items.push({
      label: cleanedLabel,
      quantity: qty,
      unitPrice: isValidAmount(unitPrice) ? unitPrice : qty > 1 ? round2(lineTotal / qty) : lineTotal,
      lineTotal,
    });
  }

  const sumLines = items.reduce((s, it) => s + it.lineTotal, 0);
  const readTotal = isValidAmount(raw.total) && raw.total > 0 ? raw.total : undefined;
  const totalRead = readTotal !== undefined;
  const total = readTotal ?? (items.length > 0 ? round2(sumLines) : undefined);
  const confidence =
    items.length === 0 ? 0 : readTotal === undefined ? 0.5 : coherenceScore(sumLines, readTotal);

  return {
    supplier: typeof raw.supplier === 'string' ? raw.supplier.trim() || undefined : undefined,
    items,
    total,
    totalRead,
    date: recentReceiptDate(raw.date, now),
    confidence,
  };
}

/**
 * Total d'un ticket = Σ des montants de ligne (recalcul après toute édition).
 */
export function computeReceiptTotal(items: Array<{ lineTotal: number }>): number {
  return items.reduce((s, it) => s + (Number(it.lineTotal) || 0), 0);
}

/**
 * Montant SIGNÉ à porter sur la transaction selon son type
 * (dépense = négatif, revenu = positif). Garantit « débit total = somme des lignes ».
 */
export function signedReceiptAmount(
  type: 'income' | 'expense' | 'transfer',
  total: number
): number {
  const abs = Math.abs(total);
  return type === 'income' ? abs : -abs;
}

/**
 * Génère le markdown léger conservé comme seule trace du ticket (aucune image).
 */
export function buildReceiptMarkdown(
  supplier: string | undefined,
  items: ParsedReceiptItem[],
  total: number | undefined,
  dateLabel: string
): string {
  const title = `# ${supplier?.trim() || 'Ticket'} — ${dateLabel}`;
  const header = `| Article | Qté | Prix |\n| --- | ---: | ---: |`;
  const rows = items
    .map((it) => `| ${it.label} | ${it.quantity} | ${Math.round(it.lineTotal).toLocaleString('fr-FR')} |`)
    .join('\n');
  const sum =
    total !== undefined
      ? `\n\n**Total : ${Math.round(total).toLocaleString('fr-FR')}**`
      : '';
  return `${title}\n\n${header}\n${rows}${sum}\n`;
}
