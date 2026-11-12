// NEC-CC-22: post-test of the NEC 2026 camp (same 15 questions and 6 lines B as the pre-test, plus part C)
// and the trainer's evaluation (lot 2 story NEC-96). Pure functions: scores, gains, answer key, group
// indicators (U2 progress = gain A > 0, U3 complete plan, U4 gain "non calculable" without a pre-test).
import type { AutoPretest, Plan, Posttest, Pretest, ReponsePretest } from '../types';
import { AUTO, QUESTIONS, bonneReponse, explicationsQuestion, lirePretestDistant, pretestDe, score, type Lettre } from './pretest';

/** Part C, sheet v5 page 6. */
export const TITRE_C = 'Votre avis sur la formation';
export const SATISFACTION: string[] = [
  'La formation a répondu à mes attentes',
  "Les ateliers m'ont permis d'avancer sur mon projet",
  'Les explications étaient claires',
  'Le rythme était adapté',
  'Je repars avec un business plan utilisable'
];
export const QUESTION_SERVI = 'Ce qui m\'a le plus servi :';
export const QUESTION_AMELIORER = "Ce qu'il faudrait améliorer :";
export const POSTTEST_VERROUILLE = "Le formateur l'ouvrira en fin de formation.";
export const NON_CALCULABLE = 'non calculable';

export function posttestVide(): Posttest {
  return { reponses: {}, auto: [0, 0, 0, 0, 0, 0], satisfaction: [0, 0, 0, 0, 0], servi: '', ameliorer: '', termineLe: null };
}

function notes(x: unknown, n: number): AutoPretest[] {
  const out: AutoPretest[] = [];
  const brut = Array.isArray(x) ? x : [];
  for (let i = 0; i < n; i++) {
    const v = brut[i];
    out.push(v === 1 || v === 2 || v === 3 || v === 4 ? v : 0);
  }
  return out;
}

/** A post-test read from a plan or from the server, completed (null when absent or malformed). */
export function lirePosttest(x: unknown): Posttest | null {
  if (!x || typeof x !== 'object') return null;
  const b = x as Partial<Posttest>;
  const reponses = b.reponses && typeof b.reponses === 'object' && !Array.isArray(b.reponses) ? b.reponses : {};
  return {
    reponses,
    auto: notes(b.auto, AUTO.length),
    satisfaction: notes(b.satisfaction, SATISFACTION.length),
    servi: typeof b.servi === 'string' ? b.servi : '',
    ameliorer: typeof b.ameliorer === 'string' ? b.ameliorer : '',
    termineLe: typeof b.termineLe === 'string' ? b.termineLe : null
  };
}

/** The plan's post-test, or an empty one. */
export function posttestDe(plan: Plan): Posttest {
  return lirePosttest(plan.posttest) ?? posttestVide();
}

/** Open once seen open by the phone (never closed again), or already started. */
export function posttestOuvert(plan: Plan): boolean {
  return !plan.exemple && (!!plan.posttestOuvertLe || !!plan.posttest?.termineLe);
}

/** Sets posttestOuvertLe the first time the server says the post-test is open; null when nothing changes. */
export function marquerPosttestOuvert(plan: Plan, ouvert: unknown, maintenant: string): Plan | null {
  if (plan.exemple || ouvert !== true || plan.posttestOuvertLe) return null;
  return { ...plan, posttestOuvertLe: maintenant };
}

export function reponsePost(t: Posttest, n: number): ReponsePretest {
  return t.reponses[n] ?? '';
}

/** "Terminer" allowed: 15 answers ("Je ne sais pas" counts), 6 lines B, 5 lines C (free texts optional). */
export function posttestComplet(t: Posttest): boolean {
  return QUESTIONS.every((q) => reponsePost(t, q.n) !== '') && t.auto.every((v) => v > 0) && t.satisfaction.every((v) => v > 0);
}

/** Score A /15. */
export function scoreA(t: { reponses: Record<number, ReponsePretest> }): number {
  return score({ reponses: t.reponses, auto: [], valideLe: null });
}

/** Score B /24 (sum of the 6 self-assessment lines). */
export function scoreB(t: { auto: AutoPretest[] }): number {
  return t.auto.slice(0, AUTO.length).reduce<number>((s, v) => s + (Number(v) || 0), 0);
}

/** Reference pre-test: the plan's validated pre-test (app or paper received), otherwise none (U4). */
export function pretestReference(plan: Plan): Pretest | null {
  const t = plan.pretest ? pretestDe(plan) : null;
  return t?.valideLe ? t : null;
}

export interface Resultats {
  aPre: number | null;
  aPost: number | null;
  gainA: number | null;
  bPre: number | null;
  bPost: number | null;
  gainB: number | null;
}

/** Scores and gains; a gain is null ("non calculable") without a pre-test or a finished post-test. */
export function resultats(pre: { reponses: Record<number, ReponsePretest>; auto: AutoPretest[] } | null, post: Posttest | null): Resultats {
  const fini = post?.termineLe ? post : null;
  const aPre = pre ? scoreA(pre) : null;
  const bPre = pre ? scoreB(pre) : null;
  const aPost = fini ? scoreA(fini) : null;
  const bPost = fini ? scoreB(fini) : null;
  return {
    aPre,
    aPost,
    gainA: aPre !== null && aPost !== null ? aPost - aPre : null,
    bPre,
    bPost,
    gainB: bPre !== null && bPost !== null ? bPost - bPre : null
  };
}

export function resultatsPlan(plan: Plan): Resultats {
  return resultats(pretestReference(plan), plan.posttest ? posttestDe(plan) : null);
}

/** "+6", "0", "-2", or "non calculable". */
export function texteGain(g: number | null): string {
  if (g === null) return NON_CALCULABLE;
  return g > 0 ? `+${g}` : String(g);
}

export interface LigneCorrige {
  n: number;
  texte: string;
  pre: ReponsePretest | null;
  post: ReponsePretest;
  bonne: Lettre;
  /** Existing explanations of a missed question (post-test answer first, else pre-test answer). */
  explications: string[];
}

export function corrige(pre: Pretest | null, post: Posttest): LigneCorrige[] {
  return QUESTIONS.map((q) => {
    const rPre = pre ? pre.reponses[q.n] ?? '' : null;
    const rPost = reponsePost(post, q.n);
    const bonne = bonneReponse(q.n);
    let explications = explicationsQuestion(q.n, rPost);
    if (!explications.length && rPre !== null && rPre !== bonne) explications = explicationsQuestion(q.n, rPre);
    return { n: q.n, texte: q.texte, pre: rPre, post: rPost, bonne, explications };
  });
}

/** "b", or "Je ne sais pas", or "pas de réponse". */
export function texteReponse(r: ReponsePretest | null, choix?: Record<Lettre, string>): string {
  if (r === null) return 'pas de pré-test';
  if (r === '') return 'pas de réponse';
  if (r === 'jnsp') return 'Je ne sais pas';
  return choix ? `${r}) ${choix[r]}` : r;
}

// ---------------------------------------------------------------------------------------------------
// Trainer evaluation (NEC-96), from bp_admin_evaluation.

export interface LigneServeur {
  plan_id: string;
  prenom: string;
  nom_projet: string;
  progression: Record<string, number> | null;
  pretest: unknown;
  pretest_formateur: unknown;
  posttest: unknown;
}

/** U3: identity, modules 1 to 5, impact and summary all at 100 %. */
export const RUBRIQUES_COMPLETES = ['identite', 'm1', 'm2', 'm3', 'm4', 'm5', 'impact', 'synthese'];

export function planComplet(progression: Record<string, number> | null | undefined): boolean {
  return RUBRIQUES_COMPLETES.every((id) => (Number(progression?.[id]) || 0) >= 100);
}

/** Reference pre-test of a server row: the plan's validated one, else the paper one typed by the trainer. */
export function pretestDeLigne(l: LigneServeur): { reponses: Record<number, ReponsePretest>; auto: AutoPretest[] } | null {
  const p = l.pretest as Partial<Pretest> | null;
  if (p && typeof p === 'object' && p.valideLe && p.reponses && typeof p.reponses === 'object') {
    return { reponses: p.reponses, auto: notes(p.auto, AUTO.length) };
  }
  return lirePretestDistant(l.pretest_formateur);
}

export interface LigneEvaluation extends Resultats {
  planId: string;
  prenom: string;
  nomProjet: string;
  complet: boolean;
  pre: { reponses: Record<number, ReponsePretest>; auto: AutoPretest[] } | null;
  post: Posttest | null;
}

export interface Evaluation {
  lignes: LigneEvaluation[];
  moyenne: Resultats;
  /** Per question: % of correct answers before (pre-tests) and after (finished post-tests), null without data. */
  taux: { n: number; avant: number | null; apres: number | null }[];
  satisfaction: { texte: string; moyenne: number | null }[];
  satisfactionGenerale: number | null;
  commentaires: { prenom: string; servi: string; ameliorer: string }[];
  indicateurs: {
    participants: number;
    pretests: number;
    posttests: number;
    moyenneAPre: number | null;
    moyenneAPost: number | null;
    moyenneBPre: number | null;
    moyenneBPost: number | null;
    progressent: number;
    progressentB: number;
    calculables: number;
    satisfaction: number | null;
    complets: number;
  };
}

/** Mean rounded to the hundredth (null for an empty list). */
export function moyenne(valeurs: (number | null)[]): number | null {
  const v = valeurs.filter((x): x is number => x !== null && Number.isFinite(x));
  if (!v.length) return null;
  return Math.round((v.reduce((s, x) => s + x, 0) / v.length) * 100) / 100;
}

export function evaluer(serveur: LigneServeur[]): Evaluation {
  const lignes: LigneEvaluation[] = serveur.map((l) => {
    const pre = pretestDeLigne(l);
    const brut = lirePosttest(l.posttest);
    const post = brut?.termineLe ? brut : null;
    return { planId: l.plan_id, prenom: l.prenom, nomProjet: l.nom_projet, complet: planComplet(l.progression), pre, post, ...resultats(pre, post) };
  });
  const moy: Resultats = {
    aPre: moyenne(lignes.map((l) => l.aPre)),
    aPost: moyenne(lignes.map((l) => l.aPost)),
    gainA: moyenne(lignes.map((l) => l.gainA)),
    bPre: moyenne(lignes.map((l) => l.bPre)),
    bPost: moyenne(lignes.map((l) => l.bPost)),
    gainB: moyenne(lignes.map((l) => l.gainB))
  };
  const pct = (bons: number, total: number) => (total ? Math.round((bons / total) * 10000) / 100 : null);
  const avecPre = lignes.filter((l) => l.pre);
  const avecPost = lignes.filter((l) => l.post);
  const taux = QUESTIONS.map((q) => {
    const b = bonneReponse(q.n);
    return {
      n: q.n,
      avant: pct(avecPre.filter((l) => l.pre?.reponses[q.n] === b).length, avecPre.length),
      apres: pct(avecPost.filter((l) => l.post?.reponses[q.n] === b).length, avecPost.length)
    };
  });
  const satisfaction = SATISFACTION.map((texte, i) => ({
    texte,
    moyenne: moyenne(avecPost.map((l) => (l.post && l.post.satisfaction[i] > 0 ? l.post.satisfaction[i] : null)))
  }));
  const toutes: (number | null)[] = [];
  for (const l of avecPost) for (const v of l.post?.satisfaction ?? []) toutes.push(v > 0 ? v : null);
  const satisfactionGenerale = moyenne(toutes);
  const commentaires = avecPost
    .map((l) => ({ prenom: l.prenom || 'Sans prénom', servi: l.post?.servi.trim() ?? '', ameliorer: l.post?.ameliorer.trim() ?? '' }))
    .filter((c) => c.servi || c.ameliorer);
  return {
    lignes,
    moyenne: moy,
    taux,
    satisfaction,
    satisfactionGenerale,
    commentaires,
    indicateurs: {
      participants: lignes.length,
      pretests: avecPre.length,
      posttests: avecPost.length,
      moyenneAPre: moy.aPre,
      moyenneAPost: moy.aPost,
      moyenneBPre: moy.bPre,
      moyenneBPost: moy.bPost,
      progressent: lignes.filter((l) => l.gainA !== null && l.gainA > 0).length,
      progressentB: lignes.filter((l) => l.gainB !== null && l.gainB > 0).length,
      calculables: lignes.filter((l) => l.gainA !== null).length,
      satisfaction: satisfactionGenerale,
      complets: lignes.filter((l) => l.complet).length
    }
  };
}

/** "12,5" (French decimal comma, up to 2 decimals) or "pas de donnée". */
export function nombreFr(x: number | null): string {
  if (x === null) return 'pas de donnée';
  return String(Math.round(x * 100) / 100).replace('.', ',');
}

/** Short plain text for B-lossom (no em dash, no en dash, no middle dot). */
export function texteIndicateurs(e: Evaluation, code: string): string {
  const i = e.indicateurs;
  return [
    `Mon Business Plan, session ${code} : évaluation`,
    `Participants : ${i.participants} (pré-test : ${i.pretests}, post-test : ${i.posttests})`,
    `Connaissances (sur 15) : ${nombreFr(i.moyenneAPre)} avant, ${nombreFr(i.moyenneAPost)} après`,
    `Auto-évaluation (sur 24) : ${nombreFr(i.moyenneBPre)} avant, ${nombreFr(i.moyenneBPost)} après`,
    `Participants qui progressent : ${i.progressent} sur ${i.calculables} (gain en auto-évaluation : ${i.progressentB})`,
    `Satisfaction moyenne (sur 4) : ${nombreFr(i.satisfaction)}`,
    `Business plans complets : ${i.complets} sur ${i.participants}`
  ].join('\n');
}
