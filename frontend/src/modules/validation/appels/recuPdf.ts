// PDF receipt (VC-12), built in the browser with jsPDF: dynamic import, own chunk loaded on the
// first tap on « Partager le reçu », never in the receipt page bundle. A4 portrait, built-in
// Helvetica (Latin-1, copy of `pourPdf` of src/modules/pudi/appels/pdf.ts), colours of the client
// charter. Content: utils/recu.ts (pure, unit tested).
import type { ModeleRecu } from '../utils/recu';

type Rgb = [number, number, number];

const CIEL: Rgb = [3, 105, 161];
const NUIT: Rgb = [12, 74, 110];
const TEXTE: Rgb = [15, 23, 42];
const DOUX: Rgb = [71, 85, 105];
const FILET: Rgb = [214, 228, 239];
const FOND: Rgb = [240, 249, 255];
const REFUS: Rgb = [185, 28, 28];
const RESERVE: Rgb = [146, 64, 14];
const L = 210;
const H = 297;
const M = 18;
const UTILE = L - 2 * M;
const BAS = H - 24;

/** Built-in Helvetica only knows Latin-1: typographic signs outside it are replaced. */
export function pourPdf(t: string): string {
  return t
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/…/g, '...')
    .replace(/\u0153/g, 'oe')
    .replace(/\u0152/g, 'OE')
    .replace(/[\u202F\u2009\u2007]/g, ' ')
    .replace(/[^\u0000-\u00FF]/g, '');
}

/** Builds the receipt and returns it as a PDF file. */
export async function genererRecuPdf(m: ModeleRecu): Promise<File> {
  const jsPDF = (await import('jspdf')).default;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  doc.setProperties({ title: pourPdf(`${m.titre} ${m.lignes[0]?.[1] ?? ''}`.trim()), subject: pourPdf(m.titre), creator: '1saKELY, CyberKELY' });
  let y = 0;
  const couleur = (c: Rgb) => doc.setTextColor(c[0], c[1], c[2]);
  const police = (taille: number, gras = false, c: Rgb = TEXTE) => {
    doc.setFont('helvetica', gras ? 'bold' : 'normal');
    doc.setFontSize(taille);
    couleur(c);
  };
  const place = (h: number) => {
    if (y + h > BAS) {
      doc.addPage();
      y = M;
    }
  };
  const paragraphe = (t: string, taille: number, gras = false, c: Rgb = TEXTE, x = M, largeur = UTILE) => {
    police(taille, gras, c);
    const lignes = doc.splitTextToSize(pourPdf(t), largeur) as string[];
    const hl = taille * 0.45;
    for (const l of lignes) {
      place(hl);
      doc.text(l, x, y + hl * 0.8);
      y += hl;
    }
  };

  // Header band in the client blue.
  doc.setFillColor(CIEL[0], CIEL[1], CIEL[2]);
  doc.rect(0, 0, L, 30, 'F');
  police(11, true, [255, 255, 255]);
  doc.text('1saKELY', M, 12);
  police(20, true, [255, 255, 255]);
  doc.text(pourPdf(m.titre), M, 23);
  y = 40;

  // Lines of the receipt screen.
  const etiquette = 42;
  for (const [lib, val] of m.lignes) {
    police(10.5);
    const valeurs = doc.splitTextToSize(pourPdf(val), UTILE - etiquette) as string[];
    const h = Math.max(1, valeurs.length) * 5 + 3.4;
    place(h);
    police(10, false, DOUX);
    doc.text(pourPdf(lib), M, y + 5);
    police(10.5, lib === 'Reçu n°', TEXTE);
    valeurs.forEach((v, i) => doc.text(v, M + etiquette, y + 5 + i * 5));
    y += h;
    doc.setDrawColor(FILET[0], FILET[1], FILET[2]);
    doc.setLineWidth(0.25);
    doc.line(M, y - 0.8, M + UTILE, y - 0.8);
  }
  y += 6;

  // Every refusal and every reservation with its reason.
  place(14);
  paragraphe(m.points.length ? 'Refus et réserves' : 'Aucun refus ni réserve', 13, true, NUIT);
  y += 2;
  for (const pt of m.points) {
    police(10);
    const motif = doc.splitTextToSize(pourPdf(`Motif : ${pt.motif || '(non précisé)'}`), UTILE - 10) as string[];
    const titre = doc.splitTextToSize(pourPdf(pt.titre), UTILE - 10) as string[];
    const h = (titre.length + motif.length) * 4.8 + 7;
    place(h);
    doc.setFillColor(FOND[0], FOND[1], FOND[2]);
    doc.setDrawColor(FILET[0], FILET[1], FILET[2]);
    doc.setLineWidth(0.25);
    doc.roundedRect(M, y, UTILE, h - 2, 2, 2, 'FD');
    const c = pt.nature === 'refus' ? REFUS : RESERVE;
    doc.setFillColor(c[0], c[1], c[2]);
    doc.rect(M, y, 1.6, h - 2, 'F');
    police(10.5, true, c);
    titre.forEach((t, i) => doc.text(t, M + 6, y + 6 + i * 4.8));
    police(10, false, TEXTE);
    motif.forEach((t, i) => doc.text(t, M + 6, y + 6 + (titre.length + i) * 4.8));
    y += h + 1;
  }
  y += 4;

  // Follow-up line.
  place(12);
  paragraphe(m.suite, 10.5, true, CIEL);

  // Footer on every page.
  const n = (doc as unknown as { getNumberOfPages(): number }).getNumberOfPages();
  for (let p = 1; p <= n; p++) {
    doc.setPage(p);
    doc.setDrawColor(FILET[0], FILET[1], FILET[2]);
    doc.setLineWidth(0.25);
    doc.line(M, H - 18, L - M, H - 18);
    police(8.5, false, DOUX);
    doc.text(pourPdf(m.pied), M, H - 12);
    if (n > 1) doc.text(`Page ${p} / ${n}`, L - M, H - 12, { align: 'right' });
  }
  const octets = doc.output('arraybuffer');
  return new File([octets], m.nomFichier, { type: 'application/pdf' });
}

/**
 * « Partager le reçu »: the phone's share menu with the PDF when it can share files; otherwise the
 * PDF downloads. 'annule' when the person closed the menu.
 */
export async function partagerRecu(m: ModeleRecu): Promise<'partage' | 'telecharge' | 'annule'> {
  const fichier = await genererRecuPdf(m);
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (typeof nav.share === 'function' && typeof nav.canShare === 'function' && nav.canShare({ files: [fichier] })) {
    try {
      await nav.share({ files: [fichier], title: m.titre, text: `${m.titre}, ${m.lignes[0]?.[1] ?? ''}` });
      return 'partage';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'annule';
      // Share refused (no activation left after building the PDF...): download instead.
    }
  }
  const url = URL.createObjectURL(fichier);
  const a = document.createElement('a');
  a.href = url;
  a.download = m.nomFichier;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  return 'telecharge';
}
