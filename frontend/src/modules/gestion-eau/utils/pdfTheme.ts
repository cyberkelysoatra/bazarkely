/**
 * Couleurs des PDF du module gestion-eau, en triplets RGB (jsPDF travaille en RGB).
 * SOURCE UNIQUE : dérivées des hex de la charte `EAU_CHART` (cf. components/EauUi).
 * Décision charte AHUVI : « zéro bleu / teal = eau » → les factures n'emploient plus
 * l'ancien accent sky-700. L'accent principal des PDF est le VERT FORÊT.
 */
import { EAU_CHART } from '../components/EauUi';

export type Rgb = [number, number, number];

/** '#364E30' → [54, 78, 48]. */
function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Accent principal des PDF (titres, filets, en-têtes de tableau, total). */
export const PDF_FOREST: Rgb = hexToRgb(EAU_CHART.forest); // [54, 78, 48]
/** Accent secondaire (en-tête du tableau EAU). */
export const PDF_OLIVE: Rgb = hexToRgb(EAU_CHART.olive); // [76, 109, 64]
/** Accent or (réservé électricité si besoin). */
export const PDF_GOLD: Rgb = hexToRgb(EAU_CHART.gold); // [157, 155, 75]
