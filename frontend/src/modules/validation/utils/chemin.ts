// Path of a person through a questionnaire (VC-19, RM14), same rule as vc_chemin on the server:
// start at the first question by order; an answered question follows the chosen choice's
// « suivante », an unanswered one its recommended choice's, else the next by order; « FIN » stops,
// a missing target stops, no question twice. Gauge and counts as vc_etat (RM1, RM16).
// Pure functions, unit tested in chemin.test.ts.

export interface ChoixChemin {
  id: string;
  nature: string;
  conseille: boolean;
  suivante: string | null;
}

export interface QuestionChemin {
  id: string;
  numero: string;
  ordre: number;
  choix: ChoixChemin[];
}

export interface EtapeChemin<Q extends QuestionChemin = QuestionChemin> {
  /** Position on the path, 1-based (« Question n sur t »). */
  rang: number;
  question: Q;
  /** Chosen choice, null when the question has no answer. */
  choix: Q['choix'][number] | null;
}

/** question id → chosen choice id (latest answer). */
export type Reponses = Record<string, string | undefined>;

export function calculerChemin<Q extends QuestionChemin>(questions: Q[], reponses: Reponses): EtapeChemin<Q>[] {
  const ordre = [...questions].sort((a, b) => a.ordre - b.ordre);
  const chemin: EtapeChemin<Q>[] = [];
  const vus = new Set<string>();
  let q: Q | undefined = ordre[0];
  while (q && !vus.has(q.id) && chemin.length < 300) {
    vus.add(q.id);
    const courant: Q = q;
    const choix = courant.choix.find((c) => c.id === reponses[courant.id]) ?? null;
    chemin.push({ rang: chemin.length + 1, question: courant, choix });
    const suite = choix ? choix.suivante : (courant.choix.find((c) => c.conseille)?.suivante ?? null);
    if (suite === 'FIN') break;
    q = suite === null ? ordre.find((x) => x.ordre > courant.ordre) : ordre.find((x) => x.numero === suite);
  }
  return chemin;
}

export interface EtatChemin {
  total: number;
  repondues: number;
  /** Answered with anything but a refusal (a reservation counts, RM1). */
  acceptees: number;
  refus: number;
  reserves: number;
  /** Accepted answers / questions of the path, in percent (rounded as the server). */
  jauge: number;
  /** Every question of the path has an answer, even a refusal (RM16). */
  pret: boolean;
}

export function etatChemin(chemin: EtapeChemin[]): EtatChemin {
  const total = chemin.length;
  const repondues = chemin.filter((e) => e.choix).length;
  const refus = chemin.filter((e) => e.choix?.nature === 'refus').length;
  const reserves = chemin.filter((e) => e.choix?.nature === 'reserve').length;
  const acceptees = repondues - refus;
  return {
    total,
    repondues,
    acceptees,
    refus,
    reserves,
    jauge: total ? Math.round((100 * acceptees) / total) : 0,
    pret: total > 0 && repondues === total
  };
}

/** « 4 validées, 1 réserve, 1 refus » (validées = accepted answers without a reservation). */
export function texteComptes(e: Pick<EtatChemin, 'acceptees' | 'reserves' | 'refus'>): string {
  const pl = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;
  const validees = Math.max(0, e.acceptees - e.reserves);
  return [pl(validees, 'validée', 'validées'), pl(e.reserves, 'réserve', 'réserves'), pl(e.refus, 'refus', 'refus')].join(', ');
}

/** Counts line of screen 7: « 6 validées, 1 réserve, 1 refus. Joël reprendra le refus et la réserve dans la version suivante. » */
export function phraseRecapitulatif(e: EtatChemin): string {
  const parts = [`${texteComptes(e)}.`];
  const reprises: string[] = [];
  if (e.refus) reprises.push(e.refus > 1 ? 'les refus' : 'le refus');
  if (e.reserves) reprises.push(e.reserves > 1 ? 'les réserves' : 'la réserve');
  if (reprises.length) parts.push(`Joël reprendra ${reprises.join(' et ')} dans la version suivante.`);
  const reste = e.total - e.repondues;
  if (reste > 0) parts.push(`${reste} ${reste > 1 ? 'questions restent' : 'question reste'} à répondre.`);
  return parts.join(' ');
}
