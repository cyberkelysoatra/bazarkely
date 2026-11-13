// NEC-CC-25 (NEC-174): sentence shown once in the page when this page's change was refused because the
// plan was saved meanwhile by another page. usePlan raises it, AvisPlanPlusRecent (App) shows it.
// Kept apart from usePlan so the home page does not load the plan code.
const abonnes = new Set<() => void>();
let compteur = 0;

export function annonceAvisPlanPlusRecent(): number {
  return compteur;
}

export function suivreAvisPlanPlusRecent(f: () => void): () => void {
  abonnes.add(f);
  return () => {
    abonnes.delete(f);
  };
}

export function montrerAvisPlanPlusRecent(): void {
  compteur += 1;
  abonnes.forEach((f) => f());
}
