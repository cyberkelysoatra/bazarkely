// The 3 trap questions of the jury (step 9c, S27): first the weak points detected in the plan, in the
// order of the workbook table, then the general list. Pure functions, no React here.
import type { Plan } from '../../types';
import { chiffresCles, nettoyer } from '../synthese/brouillons';

export interface QuestionPiege {
  id: string;
  texte: string;
  /** Why the app chose it ("" for the general list). */
  raison: string;
}

/** Above this share of the total need, the grant is a weak point (step 8, V13). */
export const SEUIL_SUBVENTION = 70;
/** Above this market share in year 1, the target is a weak point (step 4, V2). */
export const SEUIL_PART = 20;

const GENERALES: QuestionPiege[] = [
  { id: 'pourquoi-toi', texte: '« Pourquoi toi ? »', raison: '' },
  { id: 'concurrent', texte: '« Qui est ton concurrent le plus dangereux ? »', raison: '' },
  { id: 'premiere-unite', texte: '« Quand vendras-tu ta première unité ? »', raison: '' }
];

/** Share of the total need covered by the grant, in percent (null when not computable). */
export function partSubvention(plan: Plan): number | null {
  const k = chiffresCles(plan);
  if (!k.subvention || !k.besoinTotal) return null;
  return Math.round((k.subvention / k.besoinTotal) * 100);
}

/** A figure of module 3 typed with no source, or with a source that says it is only estimated. */
export function chiffresEstimes(plan: Plan): string[] {
  const m3 = plan.m3;
  const lignes: [number | null, string, string][] = [
    [m3.nbClients, m3.nbClientsSource, 'le nombre de clients'],
    [m3.qteParAchat, m3.qteSource, 'la quantité par achat'],
    [m3.achatsParMois, m3.achatsSource, "le nombre d'achats par mois"]
  ];
  return lignes.filter(([n, source]) => n !== null && (!source.trim() || /estim/i.test(source))).map(([, , nom]) => nom);
}

/** "Fruits rares ou chers hors saison, coupures..." -> "fruits rares ou chers hors saison". */
export function menacePrincipale(plan: Plan): string {
  const premiere = plan.m3.swot.menaces.split(/[.;,\n]|\s:\s/)[0] ?? '';
  const t = nettoyer(premiere).split(/\s+/).slice(0, 8).join(' ');
  return t ? t.charAt(0).toLowerCase() + t.slice(1) : '';
}

/** Threats typed without any answer ("Réponse :", "parade", "je ferai"...). */
export function menacesSansParade(plan: Plan): boolean {
  const m = plan.m3.swot.menaces.trim();
  return !!m && !/réponse|reponse|parade|je ferai|nous ferons|pour y faire face|solution/i.test(m);
}

/** The 3 questions of this plan. */
export function questionsPieges(plan: Plan): QuestionPiege[] {
  const faibles: QuestionPiege[] = [];
  const part = partSubvention(plan);
  if (part !== null && part > SEUIL_SUBVENTION) {
    faibles.push({ id: 'subvention', texte: "« Et si tu n'obtiens pas la subvention ? »", raison: `La subvention couvre ${part} % de tes besoins.` });
  }
  const estimes = chiffresEstimes(plan);
  if (estimes.length) {
    faibles.push({ id: 'source', texte: "« D'où vient ce chiffre ? »", raison: `Sans vérification dans ton module 3 : ${estimes.join(', ')}.` });
  }
  if (plan.m3.partVisee !== null && plan.m3.partVisee > SEUIL_PART) {
    faibles.push({ id: 'part', texte: '« Comment peux-tu prendre autant de clients si vite ? »', raison: `Tu vises ${plan.m3.partVisee} % du marché dès l'année 1.` });
  }
  const menace = menacePrincipale(plan);
  if (menace && menacesSansParade(plan)) {
    faibles.push({ id: 'menace', texte: `« Que fais-tu si ${menace} arrive ? »`, raison: 'Ta SWOT cite cette menace sans dire ce que tu feras.' });
  }
  return [...faibles, ...GENERALES].slice(0, 3);
}
