// PUDI-CC-20: smooth « iPhone-like » scrolling of the voting pages (custom requestAnimationFrame
// easing rather than the browser default), the visible area between the sticky header and the
// bottom bars measured at run time, the short highlight of a card, and the « centre this card »
// requests sent to the « Mon choix » list. Reduced motion: same final positions, no animation.

/** Soft spring-like easing of the panels (CSS) and its duration. */
export const EASING_PANNEAU = 'cubic-bezier(0.32, 0.72, 0, 1)';
export const DUREE_PANNEAU = 400;
export const DUREE_DEFILEMENT = 600;

export const mouvementReduit = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Ease-in-out (cubic): slow start, fast middle, slow end. */
export const adoucir = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Visible area in viewport coordinates: under the sticky header, above the bottom bars. */
export function zoneVisible(): { haut: number; bas: number } {
  const h = window.innerHeight;
  const entete = document.querySelector('#pudi-root > header');
  const haut = entete ? Math.max(0, entete.getBoundingClientRect().bottom) : 0;
  let bas = h;
  document.querySelectorAll<HTMLElement>('[data-barre-vote] > div, nav').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.height <= 0 || r.top < h * 0.4 || r.top >= h) return;
    const fixe = getComputedStyle(el.closest<HTMLElement>('[data-barre-vote]') ?? el).position === 'fixed';
    if (fixe) bas = Math.min(bas, r.top);
  });
  return { haut, bas: Math.max(bas, haut + 1) };
}

let animation = 0;
let finCourante: (() => void) | null = null;

/** Scrolls the page to `y` with the ease-in-out curve (instant in reduced motion). */
export function defilerVers(y: number, options: { duree?: number; doux?: boolean } = {}): Promise<void> {
  if (animation) cancelAnimationFrame(animation);
  animation = 0;
  finCourante?.();
  finCourante = null;
  const max = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const cible = Math.max(0, y);
  const instant = () => window.scrollTo({ top: Math.min(cible, max()), behavior: 'instant' as ScrollBehavior });
  const duree = options.duree ?? DUREE_DEFILEMENT;
  const depart = window.scrollY;
  if (options.doux === false || mouvementReduit() || Math.abs(cible - depart) < 1) {
    instant();
    return Promise.resolve();
  }
  return new Promise((ok) => {
    finCourante = ok;
    let t0 = 0;
    const pas = (t: number) => {
      if (!t0) t0 = t;
      const k = Math.min(1, (t - t0) / duree);
      // The page may grow during the scroll (a panel unfolding): the target is clamped every frame.
      window.scrollTo({ top: Math.min(depart + (cible - depart) * adoucir(k), max()), behavior: 'instant' as ScrollBehavior });
      if (k < 1) {
        animation = requestAnimationFrame(pas);
        return;
      }
      animation = 0;
      instant();
      finCourante = null;
      ok();
    };
    animation = requestAnimationFrame(pas);
  });
}

/** Centre of `el` on the centre of the visible area. */
export function centrer(el: Element, doux = true): Promise<void> {
  const z = zoneVisible();
  const r = el.getBoundingClientRect();
  return defilerVers(window.scrollY + r.top + r.height / 2 - (z.haut + z.bas) / 2, { doux });
}

/**
 * Brings a block (top `haut`, final height `hauteur`, viewport coordinates) entirely into the visible
 * area; when it is taller than the area its top is shown first, never under the header.
 */
export function montrerBloc(haut: number, hauteur: number, doux = true): Promise<void> {
  const z = zoneVisible();
  const marge = 8;
  let d = 0;
  if (haut + hauteur > z.bas - marge) d = haut + hauteur - (z.bas - marge);
  if (haut - d < z.haut + marge) d = haut - (z.haut + marge);
  return defilerVers(window.scrollY + d, { doux });
}

/** Short soft light around a card, fading out in about 1 s, then the card looks normal again. */
export function surligner(el: HTMLElement): void {
  el.setAttribute('data-surligne-carte', '1');
  const fin = () => el.removeAttribute('data-surligne-carte');
  if (mouvementReduit() || !el.animate) {
    el.style.boxShadow = '0 0 0 4px rgba(245, 179, 1, 0.9)';
    window.setTimeout(() => {
      el.style.boxShadow = '';
      fin();
    }, 1000);
    return;
  }
  const a = el.animate(
    [
      { boxShadow: '0 0 0 4px rgba(245, 179, 1, 0.95), 0 0 18px 4px rgba(245, 179, 1, 0.55)' },
      { boxShadow: '0 0 0 4px rgba(245, 179, 1, 0.95), 0 0 18px 4px rgba(245, 179, 1, 0.55)', offset: 0.25 },
      { boxShadow: '0 0 0 0 rgba(245, 179, 1, 0), 0 0 0 0 rgba(245, 179, 1, 0)' }
    ],
    { duration: 1100, easing: 'ease-out' }
  );
  a.onfinish = fin;
  a.oncancel = fin;
}

// « Centre this card » requests for the « Mon choix » list (from a summary line or a transfer panel).
type Demande = { id: string; doux: boolean; n: number };
let demande: Demande | null = null;
let compteur = 0;
const abonnes = new Set<() => void>();
export function demanderCentrage(id: string, doux: boolean): void {
  demande = { id, doux, n: ++compteur };
  abonnes.forEach((f) => f());
}
export const lireDemande = (): Demande | null => demande;
export function abonnerDemande(f: () => void): () => void {
  abonnes.add(f);
  return () => abonnes.delete(f);
}
export function terminerDemande(n: number): void {
  if (demande?.n === n) demande = null;
}

/** Card of the « Mon choix » list, centred then lit up (true when it was on the page). */
export function centrerCarte(id: string, doux: boolean): boolean {
  const li = document.querySelector<HTMLElement>(`[data-liste-choix] [data-carte-choix="${CSS.escape(id)}"]`);
  const carte = li?.firstElementChild as HTMLElement | null;
  if (!carte) return false;
  void centrer(carte, doux).then(() => surligner(carte));
  return true;
}
