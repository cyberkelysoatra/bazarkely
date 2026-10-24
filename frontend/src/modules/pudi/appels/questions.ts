// PUDI-CC-17/18: the optional question « Un projet manque au PUDi ? » is shown once before any
// sending (« Envoyer mon vote » opens it, one tap skips). Kept for the visit in sessionStorage
// (survives the Google redirect in the same tab), in memory when unavailable.
// PUDI-CC-18: the urgents question is gone; the missing-project question keeps its number 3 in
// storage, so a visit that only saw the old question 2 still sees it.
const CLE = 'pudi_questions_vues';
const MANQUANT = 3;
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

export function questionVue(): boolean {
  return lire().includes(MANQUANT);
}

export function noterQuestionVue(): void {
  if (lire().includes(MANQUANT)) return;
  memoire = [...memoire, MANQUANT];
  try {
    sessionStorage.setItem(CLE, JSON.stringify(memoire));
  } catch {
    /* memory only */
  }
}

/** Next screen of the path once at least one vote is placed: question 2 if unseen, else the summary. */
export function etapeSuivante(): '2' | 'resume' {
  return questionVue() ? 'resume' : '2';
}
