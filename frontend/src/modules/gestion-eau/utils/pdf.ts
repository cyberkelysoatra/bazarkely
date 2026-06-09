/**
 * Génération PDF d'une facture d'eau (jsPDF, chargé dynamiquement pour ne pas
 * alourdir le bundle initial — réutilise le loader partagé pdfLoader.ts).
 * Mise en page A4 portrait, en-tête copropriété + logo optionnel, montants en MGA.
 */
import { loadJsPDF } from '../../../services/pdfLoader';
import { fmtMontant, fmtM3, fmtDate } from './format';
import { montantEnLettres } from './montantLettres';
import { getCoutByMois } from '../services/eauElecCoutService';
import type { FactureLocal, ConfigLocal, CompteurLocal } from '../types/gestionEau';

export interface FacturePdfContext {
  facture: FactureLocal;
  config: ConfigLocal | null;
  compteur: CompteurLocal | null;
}

/** Construit le document PDF d'une facture et le retourne (jsPDF). */
export async function buildFacturePdf(ctx: FacturePdfContext): Promise<any> {
  const { facture, config, compteur } = ctx;
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const left = 18;
  const right = 192;
  let y = 20;

  // ── Logo optionnel (data URL ou URL image) ──
  if (config?.logo_url) {
    try {
      doc.addImage(config.logo_url, 'PNG', left, y - 6, 26, 26);
    } catch {
      /* logo illisible → ignoré */
    }
  }

  // ── En-tête copropriété ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(config?.copro_nom || 'Copropriété', config?.logo_url ? left + 30 : left, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (config?.copro_contact) {
    doc.text(String(config.copro_contact), config?.logo_url ? left + 30 : left, y + 6);
  }

  // ── Titre facture ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('FACTURE D’EAU', right, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`N° ${facture.numero ?? '—'}`, right, y + 7, { align: 'right' });
  doc.text(`Émise le ${fmtDate(facture.generated_at)}`, right, y + 13, { align: 'right' });

  y += 28;
  doc.setDrawColor(180);
  doc.line(left, y, right, y);
  y += 10;

  // ── Compteur / client ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Compteur', left, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  y += 6;
  doc.text(`${compteur?.nom ?? 'Compteur inconnu'}`, left, y);
  if (compteur?.proprietaire) {
    y += 5;
    doc.text(`Propriétaire : ${compteur.proprietaire}`, left, y);
  }
  if (compteur?.zone) {
    y += 5;
    doc.text(`Zone : ${compteur.zone}`, left, y);
  }

  // ── Période ──
  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.text('Période de facturation', left, y);
  doc.setFont('helvetica', 'normal');
  y += 6;
  doc.text(`Du ${fmtDate(facture.periode_start)} au ${fmtDate(facture.periode_end)}`, left, y);

  // ── Tableau détail ──
  y += 14;
  const rows: [string, string][] = [
    ['Index de début', facture.index_debut != null ? String(facture.index_debut) : '—'],
    ['Index de fin', facture.index_fin != null ? String(facture.index_fin) : '—'],
    ['Consommation', fmtM3(facture.conso_m3)],
    ['Tarif unitaire', fmtMontant(facture.tarif, facture.devise) + ' / m³'],
  ];
  doc.setDrawColor(210);
  for (const [label, value] of rows) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(label, left, y);
    doc.text(value, right, y, { align: 'right' });
    y += 7;
    doc.line(left, y - 3, right, y - 3);
  }

  // ── Montant total ──
  y += 4;
  doc.setFillColor(14, 116, 144); // sky-700
  doc.rect(left, y, right - left, 14, 'F');
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('MONTANT À PAYER', left + 4, y + 9);
  doc.text(fmtMontant(facture.montant, facture.devise), right - 4, y + 9, { align: 'right' });
  doc.setTextColor(0);

  // ── Statut + échéance ──
  y += 24;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  const paye = facture.statut === 'paye';
  doc.setTextColor(paye ? 16 : 190, paye ? 122 : 30, paye ? 87 : 30);
  doc.text(paye ? 'STATUT : PAYÉE' : 'STATUT : IMPAYÉE', left, y);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (facture.date_echeance) {
    doc.text(`Échéance : ${fmtDate(facture.date_echeance)}`, right, y, { align: 'right' });
  }
  if (paye && facture.paye_at) {
    y += 6;
    doc.text(`Payée le ${fmtDate(facture.paye_at)}`, left, y);
  }
  if (!paye && facture.relance_count > 0) {
    y += 6;
    doc.setTextColor(190, 30, 30);
    doc.text(`Relances envoyées : ${facture.relance_count}`, left, y);
    doc.setTextColor(0);
  }

  // ── Pied de page ──
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Document généré par BazarKELY — Gestion Eau', left, 285);

  return doc;
}

/** Génère et télécharge la facture PDF. */
export async function downloadFacturePdf(ctx: FacturePdfContext): Promise<void> {
  const doc = await buildFacturePdf(ctx);
  const name = `facture-${ctx.facture.numero ?? ctx.facture.id}.pdf`;
  doc.save(name);
}

// ════════════════════════════════════════════════════════════════════════════
//  FACTURE COMBINÉE eau + électricité — PDF modernisé (modèle SCI RÊVE D'OR / AHUVI)
// ════════════════════════════════════════════════════════════════════════════

/** Chemin du logo AHUVI (paysage ~3:1) servi par Netlify ; absent → repli texte. */
const AHUVI_LOGO_URL = '/ahuvi-logo.png';

/** Nombre fr-FR avec un nombre de décimales fixe (séparateurs français). */
function fmtNb(v: number | null | undefined, digits = 2): string {
  if (v == null || Number.isNaN(v)) return '—';
  return v.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Montant fr-FR + devise avec décimales (PU / totaux de ligne lisibles). */
function fmtAr(v: number | null | undefined, devise: string, digits = 2): string {
  if (v == null || Number.isNaN(v)) return '—';
  return `${v.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${devise}`;
}

/** « V04 » / « LODGE_V01 » → « VILLA N°4 » ; sinon le nom brut. */
function villaLabel(nom?: string | null): string {
  if (!nom) return '';
  const m = nom.match(/V\s*0*(\d+)/i);
  return m ? `VILLA N°${m[1]}` : nom;
}

/**
 * Charge une image (fetch → dataURL) avec ses dimensions naturelles, pour un
 * `addImage` qui respecte le ratio. Retourne null si absente/illisible (repli texte).
 */
async function loadImage(
  url: string
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) return null; // 404 SPA renvoie du HTML → ignorer
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = () => reject(new Error('read'));
      fr.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => reject(new Error('decode'));
      img.src = dataUrl;
    });
    return { dataUrl, width: dims.w, height: dims.h };
  } catch {
    return null;
  }
}

interface TableCol {
  header: string;
  width: number;
  align?: 'left' | 'right';
}

/** Dessine un tableau bordé (en-tête grisé + lignes) et retourne le nouveau y. */
function drawTable(
  doc: any,
  x: number,
  y: number,
  cols: TableCol[],
  rows: string[][],
  accent: [number, number, number]
): number {
  const rowH = 8;
  const totalW = cols.reduce((s, c) => s + c.width, 0);

  // En-tête
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.rect(x, y, totalW, rowH, 'F');
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  let cx = x;
  for (const c of cols) {
    const align = c.align ?? 'left';
    const tx = align === 'right' ? cx + c.width - 2 : cx + 2;
    doc.text(c.header, tx, y + 5.4, { align });
    cx += c.width;
  }
  y += rowH;

  // Lignes
  doc.setTextColor(40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setDrawColor(210);
  for (const row of rows) {
    cx = x;
    for (let i = 0; i < cols.length; i++) {
      const c = cols[i];
      const align = c.align ?? 'left';
      const tx = align === 'right' ? cx + c.width - 2 : cx + 2;
      doc.text(row[i] ?? '', tx, y + 5.4, { align });
      cx += c.width;
    }
    doc.rect(x, y, totalW, rowH); // bordure de ligne
    y += rowH;
  }
  doc.setTextColor(0);
  return y;
}

/**
 * Construit le PDF d'une facture COMBINÉE (eau + électricité). Présentation inspirée
 * du modèle SCI RÊVE D'OR / AHUVI, modernisée : logo, 2 tableaux (élec + eau),
 * encadré de transparence A/B/C/D du coût élec, grand total + montant en toutes lettres.
 * Dégradation propre : facture eau-seule ou élec-seule → un seul tableau.
 */
export async function buildFactureCombineePdf(ctx: FacturePdfContext): Promise<any> {
  const { facture, config, compteur } = ctx;
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const left = 18;
  const right = 192;
  const width = right - left; // 174mm
  const accentSky: [number, number, number] = [14, 116, 144]; // sky-700
  const devise = facture.devise || config?.devise || 'MGA';
  const hasElec = facture.conso_kwh != null;
  const hasEau = facture.conso_m3 != null;

  let y = 16;

  // ── En-tête : logo AHUVI (ou repli texte) à gauche ──
  const logo = await loadImage(AHUVI_LOGO_URL);
  if (logo) {
    const logoW = 42;
    const logoH = Math.min(18, (logoW * logo.height) / logo.width); // respecte le ratio
    try {
      doc.addImage(logo.dataUrl, 'PNG', left, y, logoW, logoH);
    } catch {
      /* addImage refuse le format → repli texte ci-dessous */
    }
  }
  if (!logo) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(accentSky[0], accentSky[1], accentSky[2]);
    doc.text('RÊVE D’OR / AHUVI', left, y + 8);
    doc.setTextColor(0);
  }

  // ── Titre + métadonnées facture (à droite) ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('FACTURE', right, y + 4, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`N° ${facture.numero ?? '—'}`, right, y + 11, { align: 'right' });
  doc.text(`Émise le ${fmtDate(facture.generated_at)}`, right, y + 16, { align: 'right' });

  y += 24;
  doc.setDrawColor(accentSky[0], accentSky[1], accentSky[2]);
  doc.setLineWidth(0.6);
  doc.line(left, y, right, y);
  doc.setLineWidth(0.2);
  y += 8;

  // ── Bloc émetteur / propriétaire ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(config?.copro_nom || 'RÊVE D’OR', left, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  let yL = y + 5;
  if (config?.copro_contact) {
    doc.text(String(config.copro_contact), left, yL);
    yL += 5;
  }
  doc.setTextColor(90);
  doc.text(`Le propriétaire doit à la SCI ${config?.copro_nom || 'RÊVE D’OR'} la somme de :`, left, yL);
  doc.setTextColor(0);

  // Colonne droite : propriétaire + villa + période
  let yR = y;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(villaLabel(compteur?.nom), right, yR, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  yR += 5;
  if (compteur?.proprietaire) {
    doc.text(`Propriétaire : ${compteur.proprietaire}`, right, yR, { align: 'right' });
    yR += 5;
  }
  doc.text(
    `Période : ${fmtDate(facture.periode_start)} → ${fmtDate(facture.periode_end)}`,
    right,
    yR,
    { align: 'right' }
  );

  y = Math.max(yL, yR) + 10;

  // ── Tableaux : devise dans l'en-tête des colonnes monétaires (pas dans les
  //    cellules) pour éviter tout chevauchement P.U./Total sur les gros montants ──
  const cols: TableCol[] = [
    { header: 'Désignation', width: 40 },
    { header: 'Index init.', width: 24, align: 'right' },
    { header: 'Index final', width: 24, align: 'right' },
    { header: 'Conso', width: 26, align: 'right' },
    { header: `P.U. (${devise})`, width: 28, align: 'right' },
    { header: `Total (${devise})`, width: 32, align: 'right' },
  ];

  if (hasElec) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(accentSky[0], accentSky[1], accentSky[2]);
    doc.text('ÉLECTRICITÉ', left, y);
    doc.setTextColor(0);
    y += 3;
    y = drawTable(
      doc,
      left,
      y,
      cols,
      [
        [
          'Électricité (kWh)',
          fmtNb(facture.index_debut_elec),
          fmtNb(facture.index_fin_elec),
          `${fmtNb(facture.conso_kwh)} kWh`,
          fmtNb(facture.prix_kwh),
          fmtNb(facture.montant_elec),
        ],
      ],
      accentSky
    );
    y += 8;
  }

  // ── Tableau EAU ──
  if (hasEau) {
    const accentEau: [number, number, number] = [76, 109, 64]; // ahuvi-forest
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(accentEau[0], accentEau[1], accentEau[2]);
    doc.text('EAU', left, y);
    doc.setTextColor(0);
    y += 3;
    y = drawTable(
      doc,
      left,
      y,
      cols,
      [
        [
          'Eau (m³)',
          fmtNb(facture.index_debut),
          fmtNb(facture.index_fin),
          `${fmtNb(facture.conso_m3)} m³`,
          fmtNb(facture.tarif),
          fmtNb(facture.montant),
        ],
      ],
      accentEau
    );
    y += 8;
  }

  // ── Encadré de transparence A/B/C/D (prix du kWh) ──
  if (hasElec && facture.cout_mois) {
    let cout: any = null;
    try {
      cout = await getCoutByMois(facture.cout_mois);
    } catch {
      /* indisponible hors-ligne → encadré omis */
    }
    if (cout) {
      const boxH = 33;
      doc.setDrawColor(accentSky[0], accentSky[1], accentSky[2]);
      doc.setFillColor(240, 248, 252);
      doc.roundedRect(left, y, width, boxH, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(accentSky[0], accentSky[1], accentSky[2]);
      doc.text(`Calcul du prix du kWh — mois ${facture.cout_mois}`, left + 4, y + 6);
      doc.setTextColor(40);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      // 4 lignes empilées pleine largeur → aucun chevauchement horizontal.
      const lh = 5;
      let by = y + 12;
      doc.text(`A · Facture JIRAMA : ${fmtAr(cout.total_jirama, devise)}`, left + 4, by);
      by += lh;
      doc.text(`B · Gasoil groupe électrogène : ${fmtAr(cout.total_gasoil, devise)}`, left + 4, by);
      by += lh;
      doc.text(`C · Production totale : ${fmtNb(cout.total_kwh, 0)} kWh`, left + 4, by);
      by += lh;
      doc.setFont('helvetica', 'bold');
      doc.text(`D · Prix du kWh = (A + B) / C = ${fmtAr(cout.prix_kwh, devise)}`, left + 4, by);
      doc.setTextColor(0);
      y += boxH + 8;
    }
  }

  // ── GRAND TOTAL ──
  const total = facture.montant_total ?? (facture.montant ?? 0) + (facture.montant_elec ?? 0);
  doc.setFillColor(accentSky[0], accentSky[1], accentSky[2]);
  doc.rect(left, y, width, 14, 'F');
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('TOTAL À PAYER', left + 4, y + 9);
  doc.text(fmtMontant(total, devise), right - 4, y + 9, { align: 'right' });
  doc.setTextColor(0);
  y += 18;

  // ── Montant en toutes lettres ──
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9.5);
  doc.setTextColor(70);
  const lettres = montantEnLettres(total, 'Ariary');
  const lignesLettres = doc.splitTextToSize(`Soit : ${lettres}`, width);
  doc.text(lignesLettres, left, y);
  doc.setTextColor(0);
  y += lignesLettres.length * 5 + 6;

  // ── Statut + échéance ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const paye = facture.statut === 'paye';
  doc.setTextColor(paye ? 16 : 190, paye ? 122 : 30, paye ? 87 : 30);
  doc.text(paye ? 'STATUT : PAYÉE' : 'STATUT : IMPAYÉE', left, y);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  if (facture.date_echeance) {
    doc.text(`Échéance : ${fmtDate(facture.date_echeance)}`, right, y, { align: 'right' });
  }
  if (paye && facture.paye_at) {
    y += 6;
    doc.text(`Payée le ${fmtDate(facture.paye_at)}`, left, y);
  }

  // ── Pied de page ──
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Document généré par BazarKELY — Gestion Eau', left, 287);
  doc.setTextColor(0);

  return doc;
}

/** Génère et télécharge la facture combinée (eau + électricité) en PDF. */
export async function downloadFactureCombineePdf(ctx: FacturePdfContext): Promise<void> {
  const doc = await buildFactureCombineePdf(ctx);
  const name = `facture-${ctx.facture.numero ?? ctx.facture.id}.pdf`;
  doc.save(name);
}
