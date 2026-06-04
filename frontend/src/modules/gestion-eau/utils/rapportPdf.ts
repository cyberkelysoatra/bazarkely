/**
 * Rapport mensuel PDF (jsPDF, chargé dynamiquement via le loader partagé).
 * Synthèse de pilotage : entrées, conso, pertes/NRW, anomalies, factures.
 * Charte AHUVI : accent vert forêt sur le bandeau de titre + total.
 */
import { loadJsPDF } from '../../../services/pdfLoader';
import { fmtMontant, fmtM3, fmtPct, fmtDate } from './format';
import type { RapportMensuel } from '../services/eauRapportService';

// Vert forêt AHUVI #364E30 en RGB.
const FOREST: [number, number, number] = [54, 78, 48];

export async function buildRapportMensuelPdf(rapport: RapportMensuel): Promise<any> {
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const cfg = rapport.config;
  const devise = cfg?.devise ?? 'MGA';

  const left = 18;
  const right = 192;
  let y = 20;

  // En-tête copropriété + titre
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(cfg?.copro_nom || 'Copropriété', left, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (cfg?.copro_contact) doc.text(String(cfg.copro_contact), left, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('RAPPORT MENSUEL', right, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(rapport.periodeLabel, right, y + 7, { align: 'right' });

  y += 18;
  doc.setDrawColor(180);
  doc.line(left, y, right, y);
  y += 12;

  // Bandeau « Bilan hydraulique »
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...FOREST);
  doc.text('Bilan hydraulique', left, y);
  doc.setTextColor(0);
  y += 8;

  const rows: [string, string][] = [
    ['Entrées d’eau (bassin)', fmtM3(rapport.entreesM3)],
    ['Consommation métrée', fmtM3(rapport.consoM3)],
    ['Pertes (NRW)', `${fmtM3(rapport.pertesM3)} (${fmtPct(rapport.nrwPct)})`],
    ['Bilans calculés', String(rapport.nbBilans)],
    ['Anomalies détectées', String(rapport.nbAnomalies)],
  ];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setDrawColor(215);
  for (const [label, value] of rows) {
    doc.text(label, left, y);
    doc.text(value, right, y, { align: 'right' });
    y += 7;
    doc.line(left, y - 3, right, y - 3);
  }

  // Section facturation
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...FOREST);
  doc.text('Facturation', left, y);
  doc.setTextColor(0);
  y += 8;
  const facRows: [string, string][] = [
    ['Factures émises', String(rapport.nbFactures)],
    ['Montant total facturé', fmtMontant(rapport.montantFactureTotal, devise)],
    ['Dont impayé', fmtMontant(rapport.montantImpaye, devise)],
  ];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  for (const [label, value] of facRows) {
    doc.text(label, left, y);
    doc.text(value, right, y, { align: 'right' });
    y += 7;
    doc.line(left, y - 3, right, y - 3);
  }

  // Bandeau total facturé
  y += 4;
  doc.setFillColor(...FOREST);
  doc.rect(left, y, right - left, 14, 'F');
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('TOTAL FACTURÉ', left + 4, y + 9);
  doc.text(fmtMontant(rapport.montantFactureTotal, devise), right - 4, y + 9, { align: 'right' });
  doc.setTextColor(0);
  y += 22;

  // Détail des anomalies (si présentes)
  if (rapport.anomalies.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Anomalies du mois', left, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    y += 6;
    for (const b of rapport.anomalies.slice(0, 12)) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(
        `• ${fmtDate(b.timestamp)} — écart ${fmtM3(b.ecart_m3)} (${fmtPct(b.ecart_pct)})${b.traitee ? ' [traitée]' : ''}`,
        left,
        y
      );
      y += 5;
    }
  }

  // Pied de page
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Généré le ${fmtDate(new Date().toISOString())} — BazarKELY / Gestion Eau (AHUVI)`, left, 287);

  return doc;
}

export async function downloadRapportMensuelPdf(rapport: RapportMensuel): Promise<void> {
  const doc = await buildRapportMensuelPdf(rapport);
  doc.save(`rapport-eau-${rapport.year}-${String(rapport.month + 1).padStart(2, '0')}.pdf`);
}
