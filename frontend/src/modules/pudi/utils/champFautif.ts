// Rule 11 of the specification (v8): any blocked action scrolls to the first faulty field,
// highlights it, puts the cursor in it; the caller shows the one-sentence message next to it.
// Shared by every PUDi form (sending, discussion, group lines, admin dialogs).

const CLASSE = 'pudi-fautif';
const DUREE_MS = 2000;

/** Element, id, or CSS selector; the first focusable element inside a group gets the cursor. */
export type CibleChamp = HTMLElement | string | null | undefined;

function trouver(cible: CibleChamp): HTMLElement | null {
  if (!cible) return null;
  if (typeof cible !== 'string') return cible;
  return document.getElementById(cible) ?? document.querySelector<HTMLElement>(cible);
}

const FOCALISABLE = 'input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href]';

/** Scroll, highlight for 2 s, focus. Returns false when the field is not on the page. */
export function allerAuChamp(cible: CibleChamp, surligner: HTMLElement | null = null): boolean {
  const el = trouver(cible);
  if (!el) return false;
  const zone = surligner ?? el;
  const reduit = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  zone.scrollIntoView({ block: 'center', behavior: reduit ? 'auto' : 'smooth' });
  zone.classList.remove(CLASSE);
  // Restart the animation when the same field is pointed at twice in a row.
  void zone.offsetWidth;
  zone.classList.add(CLASSE);
  window.setTimeout(() => zone.classList.remove(CLASSE), DUREE_MS);
  const focus = el.matches(FOCALISABLE) ? el : el.querySelector<HTMLElement>(FOCALISABLE);
  focus?.focus({ preventScroll: true });
  return true;
}
