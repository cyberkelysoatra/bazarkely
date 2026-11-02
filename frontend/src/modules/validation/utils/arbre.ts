// Question tree of a consultation (RM14), same rule as vc_arbre / vc_chemin on the server:
// a choice goes to its « suivante » question, to the next question in order when it has none,
// and ends the path on « FIN ». Pure functions, unit tested in import.test.ts.

export interface NoeudArbre {
  numero: string;
  choix: { suivante: string | null }[];
}

/** Question reached after `numero` with a choice going to `suivante` (null = end of the path). */
export function questionSuivante(questions: NoeudArbre[], numero: string, suivante: string | null): string | null {
  if (suivante === 'FIN') return null;
  if (suivante) return questions.some((q) => q.numero === suivante) ? suivante : null;
  const i = questions.findIndex((q) => q.numero === numero);
  return i >= 0 && i + 1 < questions.length ? questions[i + 1].numero : null;
}

export interface Verification {
  /** True when a path can come back to a question already seen. */
  boucle: boolean;
  /** Numbers of the questions no path reaches from the first one. */
  inatteignables: string[];
  /** Fewest and most questions on a path from the first question to the end (0 with a loop). */
  cheminMin: number;
  cheminMax: number;
}

export function verifierArbre(questions: NoeudArbre[]): Verification {
  if (!questions.length) return { boucle: false, inatteignables: [], cheminMin: 0, cheminMax: 0 };
  const suites = new Map<string, (string | null)[]>();
  for (const q of questions) {
    const s = q.choix.map((c) => questionSuivante(questions, q.numero, c.suivante));
    suites.set(q.numero, s.length ? s : [questionSuivante(questions, q.numero, null)]);
  }
  const vus = new Set<string>();
  const pile = [questions[0].numero];
  while (pile.length) {
    const n = pile.pop()!;
    if (vus.has(n)) continue;
    vus.add(n);
    for (const s of suites.get(n) ?? []) if (s && !vus.has(s)) pile.push(s);
  }
  // Loop detection and path lengths by depth-first search (0 = unseen, 1 = on the stack, 2 = done).
  const etat = new Map<string, number>();
  const min = new Map<string, number>();
  const max = new Map<string, number>();
  let boucle = false;
  const visiter = (n: string): void => {
    etat.set(n, 1);
    let lo = Infinity;
    let hi = 0;
    for (const s of suites.get(n) ?? []) {
      if (!s) {
        lo = Math.min(lo, 0);
        continue;
      }
      const e = etat.get(s) ?? 0;
      if (e === 1) {
        boucle = true;
        continue;
      }
      if (e === 0) visiter(s);
      lo = Math.min(lo, min.get(s) ?? 0);
      hi = Math.max(hi, max.get(s) ?? 0);
    }
    min.set(n, 1 + (Number.isFinite(lo) ? lo : 0));
    max.set(n, 1 + hi);
    etat.set(n, 2);
  };
  visiter(questions[0].numero);
  return {
    boucle,
    inatteignables: questions.map((q) => q.numero).filter((n) => !vus.has(n)),
    cheminMin: boucle ? 0 : (min.get(questions[0].numero) ?? 0),
    cheminMax: boucle ? 0 : (max.get(questions[0].numero) ?? 0)
  };
}
