/**
 * Génération PDF d'une facture d'eau (jsPDF, chargé dynamiquement pour ne pas
 * alourdir le bundle initial — réutilise le loader partagé pdfLoader.ts).
 * Mise en page A4 portrait, en-tête copropriété + logo optionnel, montants en MGA.
 */
import { loadJsPDF } from '../../../services/pdfLoader';
import { fmtMontant, fmtM3, fmtDate } from './format';
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
