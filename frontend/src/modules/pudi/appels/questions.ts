// PUDI-CC-17: questions 2 (urgents) and 3 (missing project) are optional but each is shown once
// before any sending (« Envoyer mon vote » opens them, one tap skips). Kept for the visit in
// sessionStorage (survives the Google redirect in the same tab), in memory when unavailable.
const CLE = 'pudi_questions_vues';
let memoire: number[] = [];

function lire(): number[] {
  try {
    const v = JSON.parse(sessionStorage.getItem(CLE) || '[]') as unknown;
    if (Array.isArray(v)) memoire = v.filter((x): x is number => x === 2 || x === 3);
  } catch {
    /* private mode: memory only */
  }
  return memoire;
}

export function questionVue(q: 2 | 3): boolean {
  return lire().includes(q);
}

export function noterQuestionVue(q: 2 | 3): void {
  if (lire().includes(q)) return;
  memoire = [...memoire, q];
  try {
    sessionStorage.setItem(CLE, JSON.stringify(memoire));
  } catch {
    /* memory only */
  }
}

/** Next screen of the path once at least one vote is placed: the first unseen question, else the summary. */
export function etapeSuivante(): '2' | '3' | 'resume' {
  if (!questionVue(2)) return '2';
  if (!questionVue(3)) return '3';
  return 'resume';
}
