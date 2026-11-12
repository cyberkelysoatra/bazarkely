// NEC-CC-18: "Ma journée", the 12 steps of the training day (local time of the phone), the participant's
// progress through them, and the ahead / late gap. Pure: every function takes `now`, never reads the clock.
import type { Plan } from '../types';
import { RUBRIQUES, type IdRubrique } from '../rubriques/registre';

export interface EtapeJournee {
  n: number;
  label: string;
  /** Minutes since midnight, local time. */
  debut: number;
  fin: number;
  /** Sections whose progress makes the step (empty for step 12, never auto-checked). */
  rubriques: IdRubrique[];
  /** Route segment under /p/:id/ opened by the step. */
  chemin: string;
  /** Grid points line of the celebration (null for step 12). */
  points: string | null;
  /** What to do first when late (null for step 12). */
  priorite: string | null;
}

const h = (heure: number, minute: number) => heure * 60 + minute;

export const ETAPES: EtapeJournee[] = [
  { n: 1, label: "Accueil et fiche d'identité", debut: h(8, 30), fin: h(9, 0), rubriques: ['identite'], chemin: 'identite', points: 'Ta fiche règle tout ton parcours.', priorite: 'le nom du projet, le secteur et ta phrase' },
  { n: 2, label: 'Problème, client, proposition de valeur', debut: h(9, 0), fin: h(9, 40), rubriques: ['m1'], chemin: 'm1', points: '5 points sur 20 de la grille du jury sont posés.', priorite: '1b (ton client) et 1c (ta proposition de valeur)' },
  { n: 3, label: 'Business Model Canvas', debut: h(9, 40), fin: h(10, 20), rubriques: ['m2'], chemin: 'm2', points: '2 points sur 20 de la grille du jury sont posés.', priorite: 'les blocs Clients, Proposition de valeur, Revenus et Coûts' },
  { n: 4, label: 'Marché et concurrence', debut: h(10, 30), fin: h(11, 10), rubriques: ['m3'], chemin: 'm3', points: '3 points sur 20 de la grille du jury sont posés.', priorite: '3b (tes concurrents et leurs prix)' },
  { n: 5, label: 'Stratégie commerciale et formalisation', debut: h(11, 10), fin: h(11, 50), rubriques: ['m4'], chemin: 'm4', points: '4 points sur 20 de la grille du jury sont posés.', priorite: '4a (tes 4 P) et 4d (ta forme juridique)' },
  { n: 6, label: 'Impact et emplois', debut: h(11, 50), fin: h(12, 5), rubriques: ['impact'], chemin: 'impact', points: 'Hors note : ce que ton projet apporte aux autres est posé.', priorite: "les emplois de l'année 1 et ta phrase d'impact" },
  { n: 7, label: 'Mission de terrain', debut: h(12, 50), fin: h(14, 0), rubriques: ['mission'], chemin: 'mission', points: 'Tes vrais chiffres nourrissent 3 critères du jury.', priorite: 'tes 3 entretiens et ta décision' },
  { n: 8, label: 'Les chiffres clés', debut: h(14, 0), fin: h(15, 20), rubriques: ['m5'], chemin: 'm5', points: '5 points sur 20, le plus gros critère du jury, sont posés.', priorite: 'ton prix, tes coûts et tes ventes par mois' },
  { n: 9, label: 'Synthèse et pitch', debut: h(15, 30), fin: h(16, 10), rubriques: ['synthese', 'pitch'], chemin: 'synthese', points: 'Ton résumé et ton pitch sont prêts pour le jury.', priorite: 'ta trame de pitch' },
  { n: 10, label: 'Relecture en binôme', debut: h(16, 10), fin: h(16, 30), rubriques: ['relecture'], chemin: 'relecture', points: 'Un regard extérieur a vérifié ton plan.', priorite: 'les points signalés par ton camarade' },
  { n: 11, label: 'Note sur 20 et après', debut: h(16, 30), fin: h(17, 0), rubriques: ['apres'], chemin: 'apres', points: 'Tes trois prochaines actions sont fixées.', priorite: 'tes trois prochaines actions' },
  { n: 12, label: 'Mon PDF', debut: h(17, 0), fin: h(17, 10), rubriques: [], chemin: 'exporter', points: null, priorite: null }
];

/** Steps counted in the day gauge and in "Il te reste N étapes" (step 12 is shown, not counted). */
export const NB_ETAPES_COMPTEES = 11;

/** Window in which the schedule applies (08:15 to 17:30). */
const OUVERTURE = h(8, 15);
const FERMETURE = h(17, 30);

export interface EtatEtape extends EtapeJournee {
  fait: boolean;
  pct: number;
}

function pctRubrique(plan: Plan, id: IdRubrique): number {
  const r = RUBRIQUES.find((x) => x.id === id);
  return r ? Math.max(0, Math.min(100, r.progression(plan))) : 0;
}

/** The 12 steps with their state (step 9 = mean of the synthesis and the pitch, done when both are). */
export function etapesDuPlan(plan: Plan): EtatEtape[] {
  return ETAPES.map((e) => {
    if (e.rubriques.length === 0) return { ...e, fait: false, pct: 0 };
    const pcts = e.rubriques.map((id) => pctRubrique(plan, id));
    return { ...e, fait: pcts.every((p) => p >= 100), pct: Math.round(pcts.reduce((t, p) => t + p, 0) / pcts.length) };
  });
}

/** Day gauge: mean of steps 1 to 11, rounded. */
export function progressionJournee(plan: Plan): number {
  const comptees = etapesDuPlan(plan).slice(0, NB_ETAPES_COMPTEES);
  return Math.round(comptees.reduce((t, e) => t + e.pct, 0) / comptees.length);
}

/** Number of steps 1 to 11 not done yet. */
export function etapesRestantes(plan: Plan): number {
  return etapesDuPlan(plan).slice(0, NB_ETAPES_COMPTEES).filter((e) => !e.fait).length;
}

/** The participant's current step: first step 1 to 11 not done, else step 12 (the PDF). */
export function etapeCourante(plan: Plan): number {
  return etapesDuPlan(plan).slice(0, NB_ETAPES_COMPTEES).find((e) => !e.fait)?.n ?? 12;
}

/** Step a section belongs to (synthesis and pitch: step 9); null for the optional sections. */
export function etapeDeRubrique(id: IdRubrique): number | null {
  return ETAPES.find((e) => e.rubriques.includes(id))?.n ?? null;
}

export function etape(n: number): EtapeJournee | undefined {
  return ETAPES.find((e) => e.n === n);
}

function minutes(now: Date): number {
  return now.getHours() * 60 + now.getMinutes();
}

function dansLaFenetre(m: number): boolean {
  return m >= OUVERTURE && m <= FERMETURE;
}

/** Scheduled step at `now` (during a pause: the next step); null outside 08:15 to 17:30. */
export function etapePrevue(now: Date): number | null {
  const m = minutes(now);
  if (!dansLaFenetre(m)) return null;
  const enCours = ETAPES.find((e) => m >= e.debut && m < e.fin);
  if (enCours) return enCours.n;
  return ETAPES.find((e) => e.debut > m)?.n ?? 12;
}

export type SorteEcart = 'avance' | 'heure' | 'retard';
export interface Ecart {
  sorte: SorteEcart;
  /** Raw gap in minutes (0 when on time). */
  minutes: number;
  /** Participant's step compared with the schedule. */
  etape: number;
}

/** Ahead shown from 10 min, late from 15 min. */
export const SEUIL_AVANCE = 10;
export const SEUIL_RETARD = 15;

/** Gap between the participant's first step not done and the schedule; null outside the window or for an example. */
export function ecart(plan: Plan, now: Date): Ecart | null {
  if (plan.exemple) return null;
  const m = minutes(now);
  if (!dansLaFenetre(m)) return null;
  const n = etapeCourante(plan);
  const e = etape(n)!;
  if (m < e.debut && e.debut - m >= SEUIL_AVANCE) return { sorte: 'avance', minutes: e.debut - m, etape: n };
  if (m > e.fin && m - e.fin >= SEUIL_RETARD && n <= NB_ETAPES_COMPTEES) return { sorte: 'retard', minutes: m - e.fin, etape: n };
  return { sorte: 'heure', minutes: 0, etape: n };
}

/** "10 min", "plus d'une heure" (minutes rounded to 5). */
function duree(min: number): string {
  if (min > 60) return "plus d'une heure";
  return `${Math.max(5, Math.round(min / 5) * 5)} min`;
}

/** Text of the badge: no reproach and no score when late. */
export function texteEcart(e: Ecart): string {
  if (e.sorte === 'avance') return `En avance de ${duree(e.minutes)} : tu peux soigner les parties facultatives.`;
  if (e.sorte === 'retard') return `Décalage de ${duree(e.minutes)} : fais d'abord ${etape(e.etape)?.priorite ?? 'ton étape en cours'}, le reste peut attendre ce soir.`;
  return "À l'heure.";
}

/** "Il te reste 3 étapes", "Il te reste 1 étape", "Toutes tes étapes sont faites". */
export function texteRestantes(n: number): string {
  if (n === 0) return 'Toutes tes étapes sont faites';
  return `Il te reste ${n} étape${n > 1 ? 's' : ''}`;
}

// ---- Steps already celebrated, per plan (localStorage `nec.fetes.<planId>`, never sent anywhere). ----

const cleFetes = (planId: string) => `nec.fetes.${planId}`;

export function lireFetes(planId: string): number[] {
  try {
    const brut = localStorage.getItem(cleFetes(planId));
    const v: unknown = brut ? JSON.parse(brut) : [];
    return Array.isArray(v) ? v.filter((x): x is number => typeof x === 'number') : [];
  } catch {
    return [];
  }
}

export function noterFete(planId: string, n: number): void {
  try {
    const actuelles = lireFetes(planId);
    if (!actuelles.includes(n)) localStorage.setItem(cleFetes(planId), JSON.stringify([...actuelles, n]));
  } catch {
    /* storage blocked: the celebration may show again, nothing else breaks */
  }
}
