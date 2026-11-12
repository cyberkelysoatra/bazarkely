// NEC-CC-16: pre-test of the NEC 2026 camp (15 single-answer questions + 6 self-assessment lines)
// and the suggested path, module by module. Pure functions shared by the participant screen and the
// trainer screen. Module 5 explanations come from PIEGES (niveaux.tsx), never copied here.
import type { AutoPretest, NiveauChiffres, Plan, Pretest, ReponsePretest } from '../types';
import { PIEGES, type CodePiege } from '../ateliers/m5/niveaux';

export type Lettre = 'a' | 'b' | 'c' | 'd';

export interface QuestionPretest {
  n: number;
  texte: string;
  choix: Record<Lettre, string>;
}

export const QUESTIONS: QuestionPretest[] = [
  { n: 1, texte: 'Pour construire un projet solide, on commence par :', choix: { a: 'choisir le local', b: 'définir la solution', c: 'identifier le problème et le client', d: 'demander une subvention' } },
  {
    n: 2,
    texte: 'La proposition de valeur répond à la question :',
    choix: { a: 'combien vais-je vendre ?', b: "pourquoi le client choisira mon offre plutôt qu'une autre ?", c: 'quel est mon statut juridique ?', d: 'où se trouve mon local ?' }
  },
  {
    n: 3,
    texte: "Pour un projet de maison d'hôtes à Nosy Be, lequel de ces groupes est le segment de clients le plus précis ?",
    choix: { a: 'tous les touristes', b: 'les voyageurs à petit budget qui restent de 3 à 7 nuits et réservent en ligne', c: 'la population de Nosy Be', d: 'les personnes qui aiment la mer' }
  },
  {
    n: 4,
    texte: 'Un « segment de clients », c\'est :',
    choix: { a: 'un groupe précis de clients qui ont le même besoin', b: 'tous les habitants de la région', c: 'la liste des fournisseurs', d: 'la liste des concurrents' }
  },
  {
    n: 5,
    texte: "Un concurrent indirect, c'est :",
    choix: { a: 'une entreprise qui vend exactement le même produit', b: 'une autre façon de répondre au même besoin du client', c: 'un fournisseur', d: 'un partenaire financier' }
  },
  { n: 6, texte: 'Dans une analyse SWOT, les « menaces » sont des éléments :', choix: { a: 'internes et négatifs', b: 'externes et négatifs', c: 'internes et positifs', d: 'externes et positifs' } },
  {
    n: 7,
    texte: 'Les « 4 P » de la stratégie commerciale sont :',
    choix: { a: 'Produit, Prix, Place (distribution), Promotion', b: 'Projet, Plan, Partenaire, Profit', c: 'Personnel, Production, Publicité, Paiement', d: 'Prix, Profit, Prêt, Patrimoine' }
  },
  {
    n: 8,
    texte: 'Le fonds de roulement sert à :',
    choix: { a: 'acheter les machines', b: 'payer les dépenses courantes en attendant que les ventes rentrent', c: 'rembourser un prêt', d: 'payer uniquement les impôts' }
  },
  {
    n: 9,
    texte: 'La marge unitaire est égale à :',
    choix: { a: 'prix de vente + coût variable unitaire', b: 'prix de vente moins coût variable unitaire', c: "chiffre d'affaires moins impôt", d: 'charges fixes + quantités vendues' }
  },
  {
    n: 10,
    texte: 'Vos charges fixes sont de 600 000 Ar par mois et votre marge unitaire de 1 500 Ar. Votre seuil de rentabilité est de :',
    choix: { a: '200 unités par mois', b: '400 unités par mois', c: '900 unités par mois', d: '1 500 unités par mois' }
  },
  {
    n: 11,
    texte: 'Vous vendez 500 unités par mois à 2 000 Ar ; le coût variable est de 1 200 Ar par unité ; les charges fixes sont de 300 000 Ar par mois. Votre résultat mensuel est de :',
    choix: { a: '100 000 Ar', b: '400 000 Ar', c: '700 000 Ar', d: '1 000 000 Ar' }
  },
  {
    n: 12,
    texte: "Le résumé d'un business plan se rédige :",
    choix: { a: 'en premier, avant tout le reste', b: 'en dernier, une fois toutes les parties terminées', c: 'seulement si la banque le demande', d: "jamais, il n'est pas utile" }
  },
  {
    n: 13,
    texte: 'Parmi ces dépenses, laquelle est une charge fixe ?',
    choix: { a: 'les fruits achetés pour chaque bouteille', b: 'le loyer du local', c: "l'emballage de chaque produit vendu", d: "l'énergie utilisée pour chaque unité produite" }
  },
  {
    n: 14,
    texte: 'Pour exister légalement à Madagascar, une entreprise doit notamment obtenir :',
    choix: {
      a: 'une autorisation de la commune uniquement',
      b: 'un NIF et une carte statistique (STAT)',
      c: 'une attestation de la CNaPS avant toute activité',
      d: 'un agrément de la Chambre de commerce'
    }
  },
  {
    n: 15,
    texte: 'Lequel de ces objectifs est SMART ?',
    choix: {
      a: 'Augmenter nos ventes rapidement en 2027',
      b: "Livrer davantage d'hôtels chaque semaine",
      c: "Livrer 10 hôtels chaque semaine d'ici juin 2027",
      d: 'Être connu de tous les hôtels de Nosy Be'
    }
  }
];

/** Part B, "Je sais...", lines B1 to B6. */
export const AUTO: string[] = [
  'décrire précisément le problème que règle mon projet et mon client cible',
  'remplir un Business Model Canvas pour mon projet',
  'estimer la taille de mon marché et analyser mes concurrents',
  'définir ma stratégie commerciale (4 P) et choisir ma forme juridique',
  'calculer mon prix de revient, ma marge et mon seuil de rentabilité',
  'rédiger un business plan complet pour mon projet'
];
export const ECHELLE: { v: Exclude<AutoPretest, 0>; t: string }[] = [
  { v: 1, t: 'pas du tout' },
  { v: 2, t: 'un peu' },
  { v: 3, t: 'assez bien' },
  { v: 4, t: 'tout à fait' }
];

const CORRIGE: Record<number, Lettre> = { 1: 'c', 2: 'b', 3: 'b', 4: 'a', 5: 'b', 6: 'b', 7: 'a', 8: 'b', 9: 'b', 10: 'b', 11: 'a', 12: 'b', 13: 'b', 14: 'b', 15: 'c' };

/** Explanation of a missed question, outside module 5 (Q3 and Q4 share one). */
const EXPLICATIONS: Record<number, string> = {
  1: 'On commence toujours par le problème et le client, jamais par la solution ni par le local.',
  2: "La proposition de valeur dit pourquoi le client choisira ton offre plutôt qu'une autre.",
  3: "Un segment de clients, c'est un groupe précis qui a le même besoin (« voyageurs à petit budget qui restent 3 à 7 nuits »), pas « tous les touristes ».",
  5: "Un concurrent indirect répond au même besoin d'une autre façon (une chambre chez l'habitant face à un hôtel).",
  6: "Les menaces du SWOT viennent de l'extérieur et sont négatives (un concurrent qui arrive, une hausse des prix).",
  7: 'Les 4 P sont Produit, Prix, Place (distribution) et Promotion.',
  12: 'Le résumé se place en premier, mais s\'écrit en dernier, quand tout le reste est fini.',
  14: 'Pour exister légalement, il faut notamment un NIF et une carte statistique (STAT).',
  15: "Un objectif SMART a un chiffre et une date (« 10 hôtels par semaine d'ici juin 2027 »)."
};
EXPLICATIONS[4] = EXPLICATIONS[3];

/** Module 5: error code of a missed question (Q11: b = CF, c or d = CA, not known = both). */
function codesM5(n: number, r: ReponsePretest): CodePiege[] {
  if (n === 8) return ['FR'];
  if (n === 9) return ['MU'];
  if (n === 10) return ['SR'];
  if (n === 13) return ['FV'];
  if (n === 11) return r === 'b' ? ['CF'] : r === 'c' || r === 'd' ? ['CA'] : ['CF', 'CA'];
  return [];
}

export type IdParcours = 'm1' | 'm2' | 'm3' | 'm4' | 'm5' | 'synthese';

const MODULES: { id: IdParcours; titre: string; questions: number[]; auto: number }[] = [
  { id: 'm1', titre: 'Module 1. Structurer le projet', questions: [1, 2, 3, 4], auto: 0 },
  { id: 'm2', titre: 'Module 2. Le Business Model Canvas', questions: [], auto: 1 },
  { id: 'm3', titre: 'Module 3. Marché et concurrence', questions: [5, 6], auto: 2 },
  { id: 'm4', titre: 'Module 4. Stratégie commerciale', questions: [7, 14, 15], auto: 3 },
  { id: 'm5', titre: 'Module 5. Les chiffres clés', questions: [8, 9, 10, 11, 13], auto: 4 },
  { id: 'synthese', titre: 'Synthèse', questions: [12], auto: 5 }
];

export const NOM_NIVEAU: Record<NiveauChiffres, string> = { rapide: 'Rapide', cible: 'Ciblé', bases: 'Bases' };

export const ECART =
  'Tu t\'estimes à l\'aise ici, mais le test montre des hésitations : prends le temps de lire les explications.';

export interface LigneParcours {
  id: IdParcours;
  titre: string;
  /** Route segment of the section (same as the id). */
  chemin: string;
  niveau: NiveauChiffres;
  /** Module 2: level from the self-assessment line B2. */
  parAuto: boolean;
  /** Explanations of the missed questions ("**x**" = bold, module 5 texts). */
  explications: string[];
  /** Self-assessment 3 or 4 while the test says Bases. */
  ecart: boolean;
}
export interface Parcours {
  score: number;
  lignes: LigneParcours[];
}

export function pretestVide(): Pretest {
  return { reponses: {}, auto: [0, 0, 0, 0, 0, 0], valideLe: null };
}

/** The plan's pre-test, or an empty one (plans created before NEC-CC-16). */
export function pretestDe(plan: Plan): Pretest {
  const p = plan.pretest;
  if (!p) return pretestVide();
  const auto = Array.isArray(p.auto) ? p.auto.slice(0, 6) : [];
  while (auto.length < 6) auto.push(0);
  const t: Pretest = { reponses: p.reponses ?? {}, auto, valideLe: p.valideLe ?? null };
  if (p.source) t.source = p.source;
  if (p.recuLe) t.recuLe = p.recuLe;
  return t;
}

/** NEC-CC-20: shown above "Ton parcours" when the pre-test comes from the trainer's paper copy. */
export const PRETEST_PAPIER = 'Ton pré-test papier a été ajouté par le formateur';

const REPONSES_VALIDES: ReponsePretest[] = ['a', 'b', 'c', 'd', 'jnsp'];

/**
 * NEC-CC-20: the paper pre-test typed by the trainer (bp_lire_pretest), checked: the 15 answers and the
 * 6 self-assessment lines all filled. Anything else (null, malformed, incomplete) gives null.
 */
export function lirePretestDistant(x: unknown): { reponses: Record<number, ReponsePretest>; auto: AutoPretest[] } | null {
  if (!x || typeof x !== 'object') return null;
  const brut = x as { reponses?: unknown; auto?: unknown };
  if (!brut.reponses || typeof brut.reponses !== 'object' || Array.isArray(brut.reponses) || !Array.isArray(brut.auto)) return null;
  const sources = brut.reponses as Record<string, unknown>;
  const reponses: Record<number, ReponsePretest> = {};
  for (const q of QUESTIONS) {
    const r = sources[String(q.n)];
    if (typeof r !== 'string' || !REPONSES_VALIDES.includes(r as ReponsePretest)) return null;
    reponses[q.n] = r as ReponsePretest;
  }
  if (brut.auto.length !== AUTO.length) return null;
  const auto: AutoPretest[] = [];
  for (const v of brut.auto) {
    if (v !== 1 && v !== 2 && v !== 3 && v !== 4) return null;
    auto.push(v);
  }
  return { reponses, auto };
}

/** Strictly later server time (ISO strings from Postgres; plain string order when not a date). */
function plusRecent(a: string, b: string): boolean {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  return Number.isNaN(ta) || Number.isNaN(tb) ? a > b : ta > tb;
}

/**
 * NEC-CC-20, merge rule: the trainer's paper pre-test is adopted when the phone has no validated
 * pre-test (a pre-test validated on the phone is never replaced). Returns the updated copy, or null
 * when nothing changes. Same effect as "Voir mon parcours": module 5 opens at the computed level.
 * NEC-CC-21 (NEC-170): `le` = server time of the trainer's version. A pre-test already received from the
 * trainer (source 'formateur') is replaced by a later version (or when `recuLe` is missing, plans of
 * v3.145.0), and removed when the trainer cleared it (`distant` null) after the phone received it.
 * A pre-test done in the app (source 'app' or missing) is never touched.
 */
export function adopterPretest(plan: Plan, distant: unknown, maintenant: string, le?: string | null): Plan | null {
  if (plan.exemple) return null;
  const local = plan.pretest;
  const recu = !!local?.valideLe && local.source === 'formateur';
  if (local?.valideLe && !recu) return null;
  if (distant === null || distant === undefined) {
    if (!recu || !local?.recuLe) return null;
    const sans: Plan = { ...plan };
    delete sans.pretest;
    return sans;
  }
  if (recu) {
    if (!le) return null;
    if (local?.recuLe && !plusRecent(le, local.recuLe)) return null;
  }
  const lu = lirePretestDistant(distant);
  if (!lu) return null;
  const pretest: Pretest = { reponses: lu.reponses, auto: lu.auto, valideLe: maintenant, source: 'formateur' };
  if (le) pretest.recuLe = le;
  return { ...plan, pretest, niveauChiffres: calculerParcours(pretest).lignes.find((l) => l.id === 'm5')?.niveau ?? 'cible' };
}

export function reponse(p: Pretest, n: number): ReponsePretest {
  return p.reponses[n] ?? '';
}

/** The 15 questions have an answer ("Je ne sais pas" counts). */
export function pretestComplet(p: Pretest): boolean {
  return QUESTIONS.every((q) => reponse(p, q.n) !== '');
}

export function score(p: Pretest): number {
  return QUESTIONS.filter((q) => reponse(p, q.n) === CORRIGE[q.n]).length;
}

function niveauAuto(v: AutoPretest | undefined): NiveauChiffres {
  if (v === 1) return 'bases';
  if (v === 3 || v === 4) return 'rapide';
  return 'cible'; // 2, or not answered
}

export function calculerParcours(p: Pretest): Parcours {
  const lignes = MODULES.map((m): LigneParcours => {
    const reps = m.questions.map((n) => ({ n, r: reponse(p, n) }));
    const ratees = reps.filter((x) => x.r !== CORRIGE[x.n]);
    const niveau: NiveauChiffres = m.questions.length === 0 ? niveauAuto(p.auto[m.auto]) : ratees.length === 0 ? 'rapide' : ratees.some((x) => x.r === 'jnsp' || x.r === '') ? 'bases' : 'cible';
    let explications: string[];
    if (m.id === 'm5') {
      const codes: CodePiege[] = [];
      for (const x of ratees) for (const c of codesM5(x.n, x.r)) if (!codes.includes(c)) codes.push(c);
      explications = codes.map((c) => PIEGES[c]);
    } else {
      explications = [];
      for (const x of ratees) {
        const t = EXPLICATIONS[x.n];
        if (t && !explications.includes(t)) explications.push(t);
      }
    }
    const auto = p.auto[m.auto] ?? 0;
    return { id: m.id, titre: m.titre, chemin: m.id, niveau, parAuto: m.questions.length === 0, explications, ecart: m.questions.length > 0 && niveau === 'bases' && auto >= 3 };
  });
  return { score: score(p), lignes };
}

/** NEC-CC-22: correct answer of a question (answer key of the post-test results). */
export function bonneReponse(n: number): Lettre {
  return CORRIGE[n];
}

/**
 * NEC-CC-22: explanation of a missed question, the same texts as "Ton parcours" (module 5: PIEGES of the
 * error code of the answer given). Empty list when the answer is right.
 */
export function explicationsQuestion(n: number, r: ReponsePretest): string[] {
  if (r === CORRIGE[n]) return [];
  const codes = codesM5(n, r);
  if (codes.length) return codes.map((c) => PIEGES[c]);
  const t = EXPLICATIONS[n];
  return t ? [t] : [];
}

/** Module 5 codes of the missed questions (tests and trainer: "pièges FR et CA"). */
export function codesPieges(p: Pretest): CodePiege[] {
  const out: CodePiege[] = [];
  for (const n of [8, 9, 10, 11, 13]) {
    const r = reponse(p, n);
    if (r !== CORRIGE[n]) for (const c of codesM5(n, r)) if (!out.includes(c)) out.push(c);
  }
  return out;
}
