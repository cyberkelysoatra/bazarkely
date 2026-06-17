/**
 * Fait glisser un élément pour que son bord HAUT vienne se placer juste sous le Header
 * partagé (sticky). Réplique le patron de TransactionsPage.toggleTransactionDrawer :
 * une seule animation maison (requestAnimationFrame + ease-in-out cubique) avec cible
 * recalculée à chaque image (suit la barre d'adresse mobile / les changements de hauteur),
 * et respect de `prefers-reduced-motion`.
 *
 * ⚠️ Le shell Gestion Eau pose `scroll-behavior: smooth` sur <html> : un `window.scrollTo`
 * sans option héritant de ce smooth, chaque image relancerait une animation native →
 * mouvement net nul. On force donc `behavior: 'instant'` (on anime nous-mêmes l'easing).
 *
 * Factorisé (v3.55.0) depuis EauCompteursReleves pour être réutilisé par EauCompteursPage
 * (ouverture du formulaire « Nouveau compteur » + tiroir d'édition inline) — logique
 * strictement iso-comportement.
 */

/**
 * Offset de calage, en px depuis le haut du viewport (v3.64.0).
 * Depuis que la barre d'onglets `EauTabs` est collante SOUS le Header, une carte calée
 * « sous le Header » se retrouve masquée derrière les onglets. On vise donc le BAS de la
 * barre d'onglets collante `[data-eau-sticky-tabs]` si elle est présente et visible — son
 * `getBoundingClientRect().bottom` vaut déjà Header + onglets (elle est collée sous le
 * Header) — sinon repli sur le bas du Header (pages sans onglets). `margin` ≈ 8 px.
 */
export function getEauCalageOffset(margin = 8): number {
  const tabs = document.querySelector('[data-eau-sticky-tabs]') as HTMLElement | null;
  if (tabs) {
    const r = tabs.getBoundingClientRect();
    if (r.height > 0 && r.bottom > 0) return r.bottom + margin;
  }
  const header = document.querySelector('header');
  return header ? header.getBoundingClientRect().height + margin : 72;
}

export function scrollElementUnderHeader(el: HTMLElement) {
  const getHeaderOffset = () => getEauCalageOffset(8);
  const getTargetY = () => window.scrollY + el.getBoundingClientRect().top - getHeaderOffset();
  const scrollInstant = (top: number) => window.scrollTo({ top, behavior: 'instant' as ScrollBehavior });

  const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    scrollInstant(getTargetY());
    return;
  }

  const startY = window.scrollY;
  if (Math.abs(getTargetY() - startY) < 2) return; // déjà aligné

  const DURATION = 500;
  const GRACE = 250; // suit une bascule tardive (barre d'adresse mobile)
  const easeInOutCubic = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const startTime = performance.now();

  const frame = (now: number) => {
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / DURATION);
    const targetY = getTargetY(); // recalcul continu → auto-correction
    scrollInstant(startY + (targetY - startY) * easeInOutCubic(t));
    const settled = Math.abs(targetY - window.scrollY) < 1;
    if (t < 1 || (!settled && elapsed < DURATION + GRACE)) {
      requestAnimationFrame(frame);
    }
  };
  requestAnimationFrame(frame);
}
