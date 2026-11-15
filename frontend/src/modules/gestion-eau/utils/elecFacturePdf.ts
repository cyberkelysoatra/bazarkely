/**
 * PDF de la facture d'énergie RTB (ELEC-CC-04) : A4 portrait, une page, modèle du cahier
 * métier 6.1 (charte verte RTB). Une facture émise est dessinée UNIQUEMENT depuis la facture,
 * ses lignes et ses instantanés (`client_snapshot`, `emetteur_snapshot`, tarif, forfait,
 * TVA, cours BCM copiés à l'émission) : jamais depuis les réglages ou la fiche client
 * courants. Un brouillon (aucun instantané) prend client et réglages courants en aperçu,
 * filigrané « BROUILLON ».
 *
 * jsPDF chargé dynamiquement (pdfLoader). Police Helvetica intégrée (la plus proche d'Arial) :
 * elle ne dessine ni l'espace fine insécable (U+202F) ni l'insécable (U+00A0) que produit
 * `toLocaleString('fr-FR')`, ni « ≈ » : les nombres passent par `nombrePdf` (espace normale)
 * et « ≈ » est tracé en vectoriel. Aucun tiret cadratin, demi-cadratin ni point médian.
 */
import type jsPDF from 'jspdf';
import { loadJsPDF } from '../../../services/pdfLoader';
import { nombreEnLettres } from './montantLettres';
import { contreValeurEur, type FactureAvecLignes } from './elecFacture';
import type {
  ElecClientLocal,
  ElecFactureLigneLocal,
  ElecFactureLocal,
  ElecReglagesLocal,
} from '../types/gestionEau';

type Rgb = [number, number, number];
const VERT: Rgb = [63, 88, 56]; // #3F5838
const OR: Rgb = [211, 162, 70]; // #D3A246
const GRIS: Rgb = [89, 89, 89]; // #595959
const GRIS_CLAIR: Rgb = [242, 242, 242]; // #F2F2F2
const FILET: Rgb = [204, 204, 204]; // #CCCCCC
const GRIS_EURO: Rgb = [128, 128, 128]; // #808080
const NOIR: Rgb = [33, 33, 33];

const G = 15; // marge gauche (mm)
const D = 195; // bord droit (mm)
const LARGEUR = D - G;

export const LOGO_RTB_URL = '/rtb/logo-rtb-monochrome-vert.png';

// ───────────────────────────── Formats (purs, testés) ─────────────────────────────
/**
 * Nombre à la française pour le PDF : espace NORMALE des milliers, virgule décimale,
 * exactement `decimales` chiffres après la virgule (arrondi demi vers le haut).
 * Jamais U+202F ni U+00A0 (Helvetica de jsPDF ne les dessine pas).
 */
export function nombrePdf(v: number | null | undefined, decimales = 0): string {
  if (v == null || !Number.isFinite(v)) return '';
  const neg = v < 0;
  const facteur = 10 ** decimales;
  // Demi vers le haut sur la valeur absolue, corrigé des erreurs binaires (1,005 → 1,01).
  const n = Math.round(Math.abs(v) * facteur + 1e-7);
  const ent = Math.floor(n / facteur).toString();
  const dec = decimales > 0 ? (n % facteur).toString().padStart(decimales, '0') : '';
  const groupes = ent.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${neg && n !== 0 ? '-' : ''}${groupes}${dec ? `,${dec}` : ''}`;
}

/** Prix unitaire : sans décimale s'il est entier (895), sinon jusqu'à 4. */
export function prixPdf(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '';
  if (Number.isInteger(v)) return nombrePdf(v, 0);
  const s = nombrePdf(v, 4).replace(/0+$/, '');
  return s.endsWith(',') ? s.slice(0, -1) : s;
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** `AAAA-MM-JJ` → « 01 octobre 2026 » (dates en toutes lettres sur les documents). */
export function dateLongue(jour: string | null | undefined): string {
  if (!jour) return '';
  const [y, m, d] = jour.slice(0, 10).split('-');
  const mi = Number(m) - 1;
  if (!y || !(mi >= 0 && mi < 12) || !d) return '';
  return `${d} ${MOIS[mi]} ${y}`;
}

/** `AAAA-MM-JJ` → `JJ/MM/AAAA`. */
export function dateCourte(jour: string | null | undefined): string {
  if (!jour) return '';
  const [y, m, d] = jour.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/** `AAAA-MM` → « octobre 2026 ». */
export function moisLong(cycle: string): string {
  const [y, m] = cycle.split('-');
  const mi = Number(m) - 1;
  return mi >= 0 && mi < 12 ? `${MOIS[mi]} ${y}` : cycle;
}

/** Retire de tout texte imprimé les tirets longs, le point médian et les espaces spéciales. */
export function textePdf(s: string): string {
  return s
    .replace(/[–—]/g, ',')
    .replace(/·/g, ',')
    .replace(/[   ]/g, ' ')
    .replace(/[‘’]/g, "'");
}

/**
 * Lot d'une facture : `bien` pour une facture par bien ; pour une facture groupée, les codes
 * de ses lignes, plages continues resserrées (« Lots L1 à L11, PISC »).
 */
export function libelleLot(bien: string | null, codes: string[]): string {
  if (bien) return `Lot ${bien}`;
  const propres = codes.filter((c) => !!c);
  if (propres.length === 0) return '';
  const parPrefixe = new Map<string, number[]>();
  const autres: string[] = [];
  const ordre: string[] = [];
  for (const c of propres) {
    const m = c.match(/^([A-Za-z]+)(\d+)$/);
    if (m) {
      if (!parPrefixe.has(m[1])) {
        parPrefixe.set(m[1], []);
        ordre.push(`#${m[1]}`);
      }
      parPrefixe.get(m[1])!.push(Number(m[2]));
    } else {
      autres.push(c);
      ordre.push(c);
    }
  }
  const morceaux: string[] = [];
  for (const o of ordre) {
    if (!o.startsWith('#')) {
      morceaux.push(o);
      continue;
    }
    const p = o.slice(1);
    const nums = Array.from(new Set(parPrefixe.get(p)!)).sort((a, b) => a - b);
    let i = 0;
    while (i < nums.length) {
      let j = i;
      while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
      if (j - i >= 2) morceaux.push(`${p}${nums[i]} à ${p}${nums[j]}`);
      else for (let k = i; k <= j; k++) morceaux.push(`${p}${nums[k]}`);
      i = j + 1;
    }
  }
  return `${propres.length > 1 ? 'Lots' : 'Lot'} ${morceaux.join(', ')}`;
}

/** Nombre de décimales d'un index tel qu'il est stocké (repli quand l'échelle est inconnue). */
function decimalesDe(v: number | null | undefined): number {
  if (v == null || !Number.isFinite(v)) return 0;
  const s = String(v);
  const i = s.indexOf('.');
  return i < 0 ? 0 : Math.min(3, s.length - i - 1);
}

/** Nom du fichier : `<numero>_<code client>.pdf` ; brouillon : `BROUILLON_<cycle>_<code client>.pdf`. */
export function nomFichierFacture(f: Pick<ElecFactureLocal, 'numero' | 'cycle'>, codeClient: string): string {
  const code = (codeClient || 'client').replace(/[^\w.-]+/g, '-');
  return f.numero ? `${f.numero}_${code}.pdf` : `BROUILLON_${f.cycle}_${code}.pdf`;
}

function s(o: Record<string, unknown> | null | undefined, k: string): string {
  const v = o?.[k];
  return v == null ? '' : String(v).trim();
}

// ───────────────────────────── Logo ─────────────────────────────
export interface LogoPdf {
  dataUrl: string;
}

let logoCache: Promise<LogoPdf | null> | null = null;

/**
 * Logo RTB réduit (≈ 300 dpi pour 30 mm) : PDF léger. Absent, illisible ou page HTML de
 * repli : null (le PDF se fait sans logo, sans erreur). Mis en cache (service worker et mémoire).
 */
export function chargerLogoRtb(url: string = LOGO_RTB_URL): Promise<LogoPdf | null> {
  if (url === LOGO_RTB_URL && logoCache) return logoCache;
  const p = (async () => {
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) return null;
      const blob = await res.blob();
      if (!blob.type.startsWith('image/')) return null;
      const bitmapUrl = URL.createObjectURL(blob);
      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const i = new Image();
          i.onload = () => resolve(i);
          i.onerror = () => reject(new Error('decode'));
          i.src = bitmapUrl;
        });
        const cote = 360;
        const canvas = document.createElement('canvas');
        canvas.width = cote;
        canvas.height = cote;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(img, 0, 0, cote, cote);
        return { dataUrl: canvas.toDataURL('image/png') };
      } finally {
        URL.revokeObjectURL(bitmapUrl);
      }
    } catch {
      return null;
    }
  })();
  if (url === LOGO_RTB_URL) {
    logoCache = p.then((r) => {
      if (!r) logoCache = null; // nouvel essai au prochain PDF
      return r;
    });
    return logoCache;
  }
  return p;
}

// ───────────────────────────── Dessin ─────────────────────────────
export interface OptionsPdfFacture {
  /** Échelle (décimales) des compteurs par id ; à défaut, déduite des index stockés. */
  decimales?: Map<string, number>;
  /** Brouillon seulement (aucun instantané) : client et réglages courants pour l'aperçu. */
  apercu?: { client?: ElecClientLocal | null; reglages?: ElecReglagesLocal | null };
  /** Logo préchargé (undefined = chargé ici ; null = sans logo). */
  logo?: LogoPdf | null;
  /** Compression des flux (vrai par défaut ; faux pour lire le texte en test). */
  compresser?: boolean;
}

const fill = (doc: jsPDF, c: Rgb) => doc.setFillColor(c[0], c[1], c[2]);
const draw = (doc: jsPDF, c: Rgb) => doc.setDrawColor(c[0], c[1], c[2]);
const ink = (doc: jsPDF, c: Rgb) => doc.setTextColor(c[0], c[1], c[2]);
const font = (doc: jsPDF, style: 'normal' | 'bold' | 'italic' | 'bolditalic', size: number) => {
  doc.setFont('helvetica', style);
  doc.setFontSize(size);
};
const txt = (doc: jsPDF, t: string, x: number, y: number, o?: Parameters<jsPDF['text']>[3]) =>
  doc.text(textePdf(t), x, y, o);

/** Pointillés (méthode de jsPDF absente du vieux paquet de types @types/jspdf). */
function pointilles(doc: jsPDF, motif: number[]): void {
  (doc as unknown as { setLineDashPattern: (a: number[], p: number) => unknown }).setLineDashPattern(motif, 0);
}

/** « ≈ » tracé en vectoriel (absent d'Helvetica) ; renvoie sa largeur (mm). */
function environEgal(doc: jsPDF, xDroite: number, yBase: number, taillePt: number): number {
  const h = taillePt * 0.3528; // hauteur du corps en mm
  const w = h * 0.55;
  const a = h * 0.09;
  const x = xDroite - w;
  doc.setLineWidth(h * 0.07);
  for (const dy of [0.28, 0.5]) {
    const y = yBase - h * dy;
    doc.lines([[w / 3, -a * 2, (2 * w) / 3, a * 2, w, 0]], x, y, [1, 1], 'S', false);
  }
  doc.setLineWidth(0.2);
  return w;
}

/** Filigrane diagonal clair au centre de la page courante. */
function filigrane(doc: jsPDF, texte: string): void {
  const anyDoc = doc as unknown as { GState?: new (o: { opacity: number }) => unknown; setGState?: (g: unknown) => void };
  let transparent = false;
  try {
    if (anyDoc.GState && anyDoc.setGState) {
      anyDoc.setGState(new anyDoc.GState({ opacity: 0.13 }));
      transparent = true;
    }
  } catch {
    transparent = false;
  }
  font(doc, 'bold', texte.length > 12 ? 48 : 70);
  ink(doc, transparent ? VERT : [225, 225, 225]);
  txt(doc, texte, 105, 168, { angle: 35, align: 'center' });
  if (transparent && anyDoc.GState && anyDoc.setGState) anyDoc.setGState(new anyDoc.GState({ opacity: 1 }));
  ink(doc, NOIR);
}

interface Donnees {
  emetteur: Record<string, unknown>;
  client: Record<string, unknown>;
  brouillon: boolean;
  coursBcm: number | null;
  dateCoursBcm: string | null;
  contreValeur: number | null;
  echeanceJours: number;
}

function donneesFacture(f: ElecFactureLocal, opts: OptionsPdfFacture): Donnees {
  const brouillon = !f.numero;
  const r = opts.apercu?.reglages ?? null;
  const c = opts.apercu?.client ?? null;
  // Facture émise : instantanés SEULS. Brouillon : aperçu courant.
  const emetteur = f.emetteur_snapshot ?? (brouillon && r ? (r as unknown as Record<string, unknown>) : {});
  const client = f.client_snapshot ?? (brouillon && c ? (c as unknown as Record<string, unknown>) : {});
  const coursBcm = f.cours_bcm ?? (brouillon ? r?.cours_bcm ?? null : null);
  const dateCoursBcm = f.date_cours_bcm ?? (brouillon ? r?.date_cours_bcm ?? null : null);
  const contreValeur = f.contre_valeur_eur ?? contreValeurEur(f.montant_ttc, coursBcm);
  const ech = Number(s(emetteur, 'echeance_jours')) || 15;
  return { emetteur, client, brouillon, coursBcm, dateCoursBcm, contreValeur, echeanceJours: ech };
}

/**
 * Dessine une facture sur la page COURANTE du document. Renvoie l'ordonnée du dernier
 * élément (mm) : la page tient si elle reste sous 287 mm.
 */
export function dessinerFacture(
  doc: jsPDF,
  facture: ElecFactureLocal,
  lignesBrutes: ElecFactureLigneLocal[],
  opts: OptionsPdfFacture = {}
): number {
  const f = facture;
  const d = donneesFacture(f, opts);
  const lignes = lignesBrutes.slice().sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
  const em = d.emetteur;
  const cl = d.client;
  doc.setLineWidth(0.2);
  ink(doc, NOIR);

  // ── Émetteur : logo, raison sociale, siège ──
  let yG = 12;
  if (opts.logo) {
    try {
      doc.addImage(opts.logo.dataUrl, 'PNG', G, yG, 30, 30);
    } catch {
      /* logo illisible : ignoré */
    }
  }
  yG += 34;
  const raison = [s(em, 'raison_sociale'), s(em, 'forme_juridique')].filter(Boolean).join(' ');
  if (raison) {
    font(doc, 'bold', 9.5);
    ink(doc, VERT);
    txt(doc, raison, G, yG);
    yG += 4;
  }
  ink(doc, GRIS);
  font(doc, 'normal', 7.5);
  const siege = doc.splitTextToSize(textePdf(`Siège : ${s(em, 'siege')}`), 88) as string[];
  doc.text(siege, G, yG);
  yG += siege.length * 3.3;

  // ── Destinataire (encadré à droite) ──
  const bx = 112;
  const bw = D - bx;
  const lignesClient: Array<{ t: string; style: 'normal' | 'bold'; size: number }> = [];
  const nom = s(cl, 'nom');
  const rsClient = s(cl, 'raison_sociale');
  lignesClient.push({ t: nom || ' ', style: 'bold', size: 11 });
  if (rsClient && rsClient !== nom) lignesClient.push({ t: rsClient, style: 'normal', size: 8.5 });
  const lot = libelleLot(f.bien, lignes.map((l) => l.code_compteur ?? ''));
  if (lot) lignesClient.push({ t: lot, style: 'normal', size: 8.5 });
  if (s(cl, 'adresse')) lignesClient.push({ t: s(cl, 'adresse'), style: 'normal', size: 8.5 });
  if (s(cl, 'nif')) lignesClient.push({ t: `NIF : ${s(cl, 'nif')}`, style: 'normal', size: 8.5 });
  if (s(cl, 'stat')) lignesClient.push({ t: `STAT : ${s(cl, 'stat')}`, style: 'normal', size: 8.5 });
  const rendus = lignesClient.map((l) => {
    font(doc, l.style, l.size);
    return { ...l, parts: doc.splitTextToSize(textePdf(l.t), bw - 4) as string[] };
  });
  const hBox = 9 + rendus.reduce((acc, l) => acc + l.parts.length * (l.size * 0.3528 * 1.35), 0) + 1;
  fill(doc, GRIS_CLAIR);
  draw(doc, FILET);
  doc.rect(bx, 12, bw, Math.max(hBox, 32), 'FD');
  font(doc, 'bold', 7.5);
  ink(doc, VERT);
  txt(doc, 'DESTINATAIRE / FACTURÉ À', bx + 2, 16.5);
  let yB = 22;
  for (const l of rendus) {
    font(doc, l.style, l.size);
    ink(doc, NOIR);
    doc.text(l.parts, bx + 2, yB);
    yB += l.parts.length * (l.size * 0.3528 * 1.35);
  }
  let y = Math.max(yG, 12 + Math.max(hBox, 32)) + 3;

  // ── Bandeau d'identité (une ligne) ──
  const ident = [
    s(em, 'nif') && `NIF : ${s(em, 'nif')}`,
    s(em, 'stat') && `STAT : ${s(em, 'stat')}`,
    s(em, 'rcs') && `RCS : ${s(em, 'rcs')}`,
    s(em, 'telephone') && `Tél. : ${s(em, 'telephone')}`,
    s(em, 'email'),
  ].filter(Boolean) as string[];
  draw(doc, FILET);
  doc.line(G, y, D, y);
  let taille = 7.5;
  font(doc, 'normal', taille);
  const ligneIdent = textePdf(ident.join('   |   '));
  while (taille > 5.5 && doc.getTextWidth(ligneIdent) > LARGEUR) {
    taille -= 0.25;
    font(doc, 'normal', taille);
  }
  ink(doc, GRIS);
  doc.text(ligneIdent || ' ', 105, y + 3.8, { align: 'center' });
  doc.line(G, y + 5.6, D, y + 5.6);
  y += 9.5;

  // ── Bandeau titre ──
  fill(doc, VERT);
  doc.rect(G, y, LARGEUR, 11, 'F');
  ink(doc, [255, 255, 255]);
  font(doc, 'bold', 15);
  txt(doc, "FACTURE D'ÉNERGIE", G + 4, y + 7.4);
  font(doc, 'bold', 9.5);
  const numero = f.numero ? `N° : ${f.numero}` : "N° à attribuer à l'émission";
  const date = f.date_emission ? `Date : le ${dateLongue(f.date_emission)}` : 'Date : à l’émission';
  txt(doc, `${numero}      ${date}`, D - 3, y + 7, { align: 'right' });
  y += 17;

  // ── Période ──
  ink(doc, NOIR);
  font(doc, 'bold', 9.5);
  txt(doc, `Période de consommation : du ${dateLongue(f.periode_debut)} au ${dateLongue(f.periode_fin)}`, G + 1, y);
  y += 5;

  // ── Tableau ──
  const cols = [
    { t: 'DÉSIGNATION DE LA PRESTATION', w: 62, a: 'left' as const },
    { t: 'INDEX\nPRÉCÉDENT', w: 24, a: 'center' as const },
    { t: 'INDEX\nNOUVEAU', w: 24, a: 'center' as const },
    { t: 'VOLUME\n(KWH)', w: 22, a: 'center' as const },
    { t: 'P.U. (MGA)', w: 20, a: 'center' as const },
    { t: 'MONTANT HT\n(MGA)', w: 28, a: 'right' as const },
  ];
  const xs: number[] = [];
  let cx = G;
  for (const c of cols) {
    xs.push(cx);
    cx += c.w;
  }
  const xDe = (i: number) => {
    const c = cols[i];
    if (c.a === 'left') return xs[i] + 1.5;
    if (c.a === 'right') return xs[i] + c.w - 1.5;
    return xs[i] + c.w / 2;
  };
  fill(doc, VERT);
  draw(doc, FILET);
  doc.rect(G, y, LARGEUR, 9, 'FD');
  ink(doc, [255, 255, 255]);
  font(doc, 'bold', 7.2);
  cols.forEach((c, i) => {
    const parts = textePdf(c.t).split('\n');
    const y0 = parts.length > 1 ? y + 3.9 : y + 5.6;
    parts.forEach((p, k) => doc.text(p, xDe(i), y0 + k * 2.9, { align: c.a }));
    if (i > 0) doc.line(xs[i], y, xs[i], y + 9);
  });
  y += 9;

  // Désignation (ligne pleine largeur) : énergie active, centrale solaire, site, puissance.
  const site = s(em, 'site');
  const kwc = Number(s(em, 'puissance_kwc'));
  const designation =
    'Énergie active injectée, centrale solaire PV' +
    (site ? `, ${site}` : '') +
    (kwc > 0 ? ` (${nombrePdf(kwc, Number.isInteger(kwc) ? 0 : 2)} kWc)` : '');
  font(doc, 'bold', 8.5);
  ink(doc, NOIR);
  const desParts = doc.splitTextToSize(textePdf(designation), LARGEUR - 3) as string[];
  const hDes = 2.2 + desParts.length * 3.9;
  draw(doc, FILET);
  doc.rect(G, y, LARGEUR, hDes, 'S');
  doc.text(desParts, G + 1.5, y + 4.3);
  y += hDes;

  const rowH = lignes.length > 8 ? 5.7 : 6.6;
  const tarif = f.tarif_kwh ?? 0;
  font(doc, 'normal', 8.5);
  for (const l of lignes) {
    const dec = opts.decimales?.get(l.compteur_id) ?? Math.max(decimalesDe(l.index_debut), decimalesDe(l.index_fin));
    const montant = l.montant ?? (l.kwh != null ? l.kwh * tarif : null);
    const vals = [
      `Compteur ${l.code_compteur ?? ''}`,
      nombrePdf(l.index_debut, dec),
      nombrePdf(l.index_fin, dec),
      nombrePdf(l.kwh, dec),
      prixPdf(f.tarif_kwh),
      nombrePdf(montant, 0),
    ];
    draw(doc, FILET);
    doc.rect(G, y, LARGEUR, rowH, 'S');
    vals.forEach((v, i) => {
      font(doc, i === 3 || i === 5 ? 'bold' : 'normal', 8.5);
      txt(doc, v, xDe(i), y + rowH / 2 + 1.2, { align: cols[i].a });
      if (i > 0) doc.line(xs[i], y, xs[i], y + rowH);
    });
    y += rowH;
  }
  // Abonnement (absent d'une facture sans abonnement).
  const forfait = f.forfait_ht ?? 0;
  if (f.avec_abonnement !== false && forfait > 0) {
    font(doc, 'normal', 8.5);
    const lib = `Abonnement contrat Énergie (${nombrePdf(forfait, 0)} Ar HT / mois)`;
    const parts = doc.splitTextToSize(textePdf(lib), cols[0].w - 3) as string[];
    const h = Math.max(rowH, 2 + parts.length * 3.7);
    doc.rect(G, y, LARGEUR, h, 'S');
    doc.text(parts, G + 1.5, y + (h - (parts.length - 1) * 3.7) / 2 + 1.2);
    for (let i = 1; i < cols.length; i++) doc.line(xs[i], y, xs[i], y + h);
    font(doc, 'bold', 8.5);
    txt(doc, nombrePdf(forfait, 0), xDe(5), y + h / 2 + 1.2, { align: 'right' });
    y += h;
  }
  y += 5;

  // ── Totaux ──
  const tx = 118;
  const tv = 160;
  const tw = D - tx;
  const totaux: Array<[string, string, boolean]> = [
    ['Total Hors Taxes', `${nombrePdf(f.montant_ht, 0)} MGA`, false],
    [`TVA (${prixPdf(f.tva_pct)}%)`, `${nombrePdf(f.montant_tva, 0)} MGA`, false],
    ['NET À PAYER TTC', `${nombrePdf(f.montant_ttc, 0)} MGA`, true],
  ];
  for (const [lib, val, fort] of totaux) {
    fill(doc, fort ? VERT : GRIS_CLAIR);
    draw(doc, FILET);
    doc.rect(tx, y, tv - tx, 7, 'FD');
    if (fort) fill(doc, VERT);
    else fill(doc, [255, 255, 255]);
    doc.rect(tv, y, D - tv, 7, 'FD');
    ink(doc, fort ? [255, 255, 255] : NOIR);
    font(doc, 'bold', fort ? 10 : 9);
    txt(doc, lib, tx + 1.5, y + 4.8);
    font(doc, fort ? 'bold' : 'normal', fort ? 10 : 9);
    txt(doc, val, D - 1.5, y + 4.8, { align: 'right' });
    y += 7;
  }
  void tw;
  y += 2;

  // ── Contre-valeur en euros (indicative) ──
  fill(doc, GRIS_CLAIR);
  doc.rect(G, y, LARGEUR, 7, 'F');
  ink(doc, GRIS_EURO);
  if (d.coursBcm && d.dateCoursBcm) {
    font(doc, 'italic', 8);
    txt(
      doc,
      `Équivalent en euros à titre indicatif. Cours de référence BCM du ${dateCourte(d.dateCoursBcm)} : 1 € = ${nombrePdf(d.coursBcm, 2)} Ar`,
      G + 1,
      y + 4.6
    );
    font(doc, 'bold', 9);
    const eur = `${nombrePdf(d.contreValeur, 2)} €`;
    txt(doc, eur, D - 1.5, y + 4.7, { align: 'right' });
    draw(doc, GRIS_EURO);
    environEgal(doc, D - 1.5 - doc.getTextWidth(eur) - 1.2, y + 4.7, 9);
  } else {
    font(doc, 'italic', 8);
    txt(doc, 'Équivalent en euros à titre indicatif : cours de référence BCM non saisi.', G + 1, y + 4.6);
  }
  y += 10;

  // ── Montant en lettres (accent or) ──
  ink(doc, NOIR);
  font(doc, 'italic', 9);
  const phrase = `Arrêtée la présente facture à la somme de : ${f.montant_ttc != null ? nombreEnLettres(f.montant_ttc) : ''} Ariary TTC.`;
  const pParts = doc.splitTextToSize(textePdf(phrase), LARGEUR - 5) as string[];
  const hP = 3 + pParts.length * 4;
  fill(doc, OR);
  doc.rect(G, y - 1, 1, hP, 'F');
  doc.text(pParts, G + 3, y + 3.2);
  y += hP + 4;

  // ── Règlement (encadré pointillé) ──
  const ech = f.date_echeance
    ? `Date limite de paiement : ${dateLongue(f.date_echeance)} (Net à ${d.echeanceJours} jours)`
    : `Date limite de paiement : à l'émission + ${d.echeanceJours} jours (Net à ${d.echeanceJours} jours)`;
  const reglement = [
    ech,
    'Règlement par virement bancaire uniquement',
    `Banque : ${s(em, 'banque')}`,
    `Titulaire du compte : ${s(em, 'titulaire_compte')}`,
    `IBAN : ${s(em, 'iban')}   |   BIC : ${s(em, 'bic')}`,
  ];
  const hR = 7 + reglement.length * 4.4;
  draw(doc, GRIS_EURO);
  pointilles(doc, [1, 0.8]);
  doc.rect(G, y, LARGEUR, hR, 'S');
  pointilles(doc, []);
  font(doc, 'bold', 9);
  ink(doc, VERT);
  txt(doc, 'MODALITÉS DE RÈGLEMENT', G + 1.5, y + 4.5);
  font(doc, 'normal', 8.5);
  ink(doc, NOIR);
  reglement.forEach((t, i) => txt(doc, t, G + 1.5, y + 9.2 + i * 4.4));
  y += hR + 6;

  // ── Pied : raison sociale, contrat (seulement s'il est signé), site ──
  const contratSigne = cl.contrat_signe === true;
  const contrat = s(em, 'contrat_ref');
  const pied = [
    s(em, 'raison_sociale'),
    contratSigne ? `Contrat de vente d'énergie${contrat ? ` (${contrat})` : ''}` : '',
    site,
  ]
    .filter(Boolean)
    .join(', ');
  font(doc, 'normal', 7.2);
  ink(doc, GRIS);
  const piedParts = doc.splitTextToSize(textePdf(pied), LARGEUR) as string[];
  const yPied = Math.max(y, 284 - (piedParts.length - 1) * 3);
  doc.text(piedParts, 105, yPied, { align: 'center' });
  const fin = yPied + (piedParts.length - 1) * 3;

  // ── Filigranes ──
  if (d.brouillon) filigrane(doc, 'BROUILLON');
  else if (f.essai) filigrane(doc, 'ESSAI, SANS VALEUR');
  ink(doc, NOIR);
  return fin;
}

async function nouveauDocument(compresser = true): Promise<jsPDF> {
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: compresser });
  doc.setProperties({ title: 'Facture RTB', creator: '1sakely.org' });
  return doc;
}

/** PDF d'une facture (émise ou brouillon). */
export async function buildElecFacturePdf(
  facture: ElecFactureLocal,
  lignes: ElecFactureLigneLocal[],
  opts: OptionsPdfFacture = {}
): Promise<jsPDF> {
  const logo = opts.logo === undefined ? await chargerLogoRtb() : opts.logo;
  const doc = await nouveauDocument(opts.compresser ?? true);
  doc.setProperties({ title: facture.numero ?? `Brouillon ${facture.cycle}` });
  dessinerFacture(doc, facture, lignes, { ...opts, logo });
  return doc;
}

// ───────────────────────────── PDF de validation du cycle ─────────────────────────────
export interface CyclePdfEntree {
  cycle: string;
  /** Factures émises du cycle (numérotées), dans l'ordre des numéros. */
  factures: FactureAvecLignes[];
  decimales?: Map<string, number>;
  logo?: LogoPdf | null;
  compresser?: boolean;
}

export interface LigneRecap {
  numero: string;
  client: string;
  lot: string;
  periode: string;
  kwh: number;
  ht: number;
  tva: number;
  ttc: number;
  eur: number | null;
}

/** Lignes du récapitulatif et totaux (purs, testés : total = somme des factures). */
export function recapCycle(factures: FactureAvecLignes[]): { lignes: LigneRecap[]; totalTtc: number; totalEur: number } {
  const lignes = factures.map(({ facture: f, lignes: ls }) => {
    const code = s(f.client_snapshot, 'code');
    const lot = libelleLot(
      f.bien,
      ls
        .slice()
        .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
        .map((l) => l.code_compteur ?? '')
    ).replace(/^Lots? /, '');
    return {
      numero: f.numero ?? '',
      client: code,
      lot,
      periode: `${dateCourte(f.periode_debut)} au ${dateCourte(f.periode_fin)}`,
      kwh: f.total_kwh ?? 0,
      ht: f.montant_ht ?? 0,
      tva: f.montant_tva ?? 0,
      ttc: f.montant_ttc ?? 0,
      eur: f.contre_valeur_eur ?? contreValeurEur(f.montant_ttc, f.cours_bcm) ?? null,
    };
  });
  const totalTtc = lignes.reduce((a, l) => a + l.ttc, 0);
  // Somme en centimes : aucun écart de virgule flottante.
  const totalEur = lignes.reduce((a, l) => a + Math.round((l.eur ?? 0) * 100), 0) / 100;
  return { lignes, totalTtc, totalEur };
}

/** Page(s) récapitulative(s) puis une page par facture. */
export async function buildElecCyclePdf(entree: CyclePdfEntree): Promise<jsPDF> {
  const logo = entree.logo === undefined ? await chargerLogoRtb() : entree.logo;
  const doc = await nouveauDocument(entree.compresser ?? true);
  doc.setProperties({ title: `Validation du cycle ${moisLong(entree.cycle)}` });
  const { lignes, totalTtc, totalEur } = recapCycle(entree.factures);
  const essai = entree.factures.some((x) => x.facture.essai);

  const cols = [
    { t: 'Numéro', w: 30, a: 'left' as const },
    { t: 'Client', w: 16, a: 'left' as const },
    { t: 'Lot', w: 30, a: 'left' as const },
    { t: 'Période', w: 34, a: 'left' as const },
    { t: 'kWh', w: 16, a: 'right' as const },
    { t: 'HT', w: 18, a: 'right' as const },
    { t: 'TVA', w: 16, a: 'right' as const },
    { t: 'TTC', w: 20, a: 'right' as const },
  ];
  const xs: number[] = [];
  let cx = G;
  for (const c of cols) {
    xs.push(cx);
    cx += c.w;
  }
  const xDe = (i: number) => (cols[i].a === 'left' ? xs[i] + 1.2 : xs[i] + cols[i].w - 1.2);

  const entete = (y: number): number => {
    fill(doc, VERT);
    doc.rect(G, y, LARGEUR, 7, 'F');
    ink(doc, [255, 255, 255]);
    font(doc, 'bold', 8);
    cols.forEach((c, i) => txt(doc, c.t, xDe(i), y + 4.7, { align: c.a }));
    return y + 7;
  };
  const titre = (suite: boolean): number => {
    if (logo) {
      try {
        doc.addImage(logo.dataUrl, 'PNG', G, 10, 18, 18);
      } catch {
        /* ignoré */
      }
    }
    font(doc, 'bold', 15);
    ink(doc, VERT);
    txt(doc, `Validation du cycle ${moisLong(entree.cycle)}${suite ? ' (suite)' : ''}`, logo ? G + 22 : G, 19);
    font(doc, 'normal', 8.5);
    ink(doc, GRIS);
    txt(doc, `${lignes.length} facture${lignes.length > 1 ? 's' : ''} émise${lignes.length > 1 ? 's' : ''}`, logo ? G + 22 : G, 25);
    return 34;
  };

  let y = entete(titre(false));
  const bas = 270;
  lignes.forEach((l, idx) => {
    font(doc, 'normal', 8);
    const lotParts = doc.splitTextToSize(textePdf(l.lot), cols[2].w - 2.4) as string[];
    const h = Math.max(6.2, 2.6 + lotParts.length * 3.4);
    // Jamais de ligne coupée entre deux pages : en-tête répété sur la page suivante.
    if (y + h > bas) {
      if (essai) filigrane(doc, 'ESSAI, SANS VALEUR');
      doc.addPage();
      y = entete(titre(true));
    }
    if (idx % 2 === 1) {
      fill(doc, GRIS_CLAIR);
      doc.rect(G, y, LARGEUR, h, 'F');
    }
    ink(doc, NOIR);
    const vals = [
      l.numero,
      l.client,
      '',
      l.periode,
      prixPdf(l.kwh),
      nombrePdf(l.ht, 0),
      nombrePdf(l.tva, 0),
      nombrePdf(l.ttc, 0),
    ];
    vals.forEach((v, i) => {
      font(doc, i === 7 ? 'bold' : 'normal', 8);
      if (i === 2) doc.text(lotParts, xDe(i), y + 4.1);
      else txt(doc, v, xDe(i), y + 4.1, { align: cols[i].a });
    });
    draw(doc, FILET);
    doc.line(G, y + h, D, y + h);
    y += h;
  });
  if (y + 18 > bas) {
    if (essai) filigrane(doc, 'ESSAI, SANS VALEUR');
    doc.addPage();
    y = titre(true);
  }
  y += 2;
  fill(doc, VERT);
  doc.rect(G, y, LARGEUR, 8, 'F');
  ink(doc, [255, 255, 255]);
  font(doc, 'bold', 10);
  txt(doc, 'Total à encaisser', G + 2, y + 5.4);
  txt(doc, `${nombrePdf(totalTtc, 0)} MGA`, D - 1.5, y + 5.4, { align: 'right' });
  y += 8;
  fill(doc, GRIS_CLAIR);
  doc.rect(G, y, LARGEUR, 7, 'F');
  ink(doc, GRIS_EURO);
  font(doc, 'italic', 8.5);
  txt(doc, 'Équivalent en euros à titre indicatif (somme des contre-valeurs des factures)', G + 2, y + 4.7);
  font(doc, 'bold', 9);
  const eur = `${nombrePdf(totalEur, 2)} €`;
  txt(doc, eur, D - 1.5, y + 4.7, { align: 'right' });
  draw(doc, GRIS_EURO);
  environEgal(doc, D - 1.5 - doc.getTextWidth(eur) - 1.2, y + 4.7, 9);
  if (essai) filigrane(doc, 'ESSAI, SANS VALEUR');

  for (const { facture, lignes: ls } of entree.factures) {
    doc.addPage();
    dessinerFacture(doc, facture, ls, { decimales: entree.decimales, logo });
  }
  return doc;
}

/** Nom du PDF du cycle. */
export function nomFichierCycle(cycle: string, essai: boolean): string {
  return `VALIDATION_${cycle}${essai ? '_ESSAI' : ''}.pdf`;
}
