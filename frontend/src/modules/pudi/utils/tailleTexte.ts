// PUDI-CC-14.4: « Taille du texte » (A / A+ / A++ = 100 / 115 / 130 % of the root font size), kept
// in localStorage pudi_taille_texte. The same value is applied before the first paint by the small
// inline script of pudi/index.html (no flash); keep both in step.
export const TAILLES = [
  { cle: 'a', libelle: 'A', pct: 100 },
  { cle: 'a+', libelle: 'A+', pct: 115 },
  { cle: 'a++', libelle: 'A++', pct: 130 }
] as const;
export type CleTaille = (typeof TAILLES)[number]['cle'];
const CLE = 'pudi_taille_texte';

export function lireTaille(): CleTaille {
  try {
    const v = localStorage.getItem(CLE);
    if (TAILLES.some((t) => t.cle === v)) return v as CleTaille;
  } catch {
    /* default size */
  }
  return 'a';
}

export function appliquerTaille(cle: CleTaille): void {
  const t = TAILLES.find((x) => x.cle === cle) ?? TAILLES[0];
  document.documentElement.style.fontSize = t.pct === 100 ? '' : `${t.pct}%`;
  try {
    if (t.cle === 'a') localStorage.removeItem(CLE);
    else localStorage.setItem(CLE, t.cle);
  } catch {
    /* applied for this page only */
  }
}
