// Module switcher of the B-lossom logo (NEC-CC-06), copy of src/modules/validation/appels/commutateur.ts
// without the account menu. One history entry while it is open, so Back closes it; Escape and a
// tap outside close it too (the closing tap does nothing else).
import { useEffect, useSyncExternalStore, type RefObject } from 'react';

let ouvert = false;
let entreeHistorique = false;
const abonnes = new Set<() => void>();
const notifier = () => abonnes.forEach((f) => f());

function surRetour() {
  if (!ouvert) return;
  entreeHistorique = false;
  ouvert = false;
  window.removeEventListener('popstate', surRetour);
  notifier();
}

export function ouvrirCommutateur(): void {
  if (ouvert) return;
  ouvert = true;
  try {
    history.pushState({ ...(history.state ?? {}), necCommutateur: true }, '');
    entreeHistorique = true;
    window.addEventListener('popstate', surRetour);
  } catch {
    entreeHistorique = false;
  }
  notifier();
}

/** Closes the bar (pops its history entry). */
export function fermerCommutateur(): void {
  if (!ouvert) return;
  ouvert = false;
  window.removeEventListener('popstate', surRetour);
  if (entreeHistorique) {
    entreeHistorique = false;
    history.back();
  }
  notifier();
}

/** Leaves the page for another module: the pushed entry must not be popped first. */
export function oublierCommutateur(): void {
  window.removeEventListener('popstate', surRetour);
  entreeHistorique = false;
}

/** Closes the bar without popping its entry (a new page of the plan replaces it). */
export function quitterCommutateur(): void {
  if (!ouvert) return;
  ouvert = false;
  window.removeEventListener('popstate', surRetour);
  entreeHistorique = false;
  notifier();
}

export function basculerCommutateur(): void {
  if (ouvert) fermerCommutateur();
  else ouvrirCommutateur();
}

export function useCommutateurOuvert(): boolean {
  return useSyncExternalStore(
    (f) => {
      abonnes.add(f);
      return () => abonnes.delete(f);
    },
    () => ouvert,
    () => false
  );
}

/** Escape and a tap outside the bar close it (the logo toggles). The closing tap's click is swallowed. */
export function useFermetureCommutateur(nav: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    let avalerJusqua = 0;
    const touche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fermerCommutateur();
    };
    const dehors = (e: Event) => {
      const t = e.target as Element | null;
      if (!t || nav.current?.contains(t) || t.closest?.('[data-bp-logo]')) return;
      avalerJusqua = Date.now() + 800;
      fermerCommutateur();
    };
    const clic = (e: MouseEvent) => {
      if (Date.now() > avalerJusqua) return;
      avalerJusqua = 0;
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener('keydown', touche);
    document.addEventListener('click', clic, true);
    const id = window.setTimeout(() => {
      document.addEventListener('mousedown', dehors);
      document.addEventListener('touchstart', dehors);
    }, 100);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('keydown', touche);
      document.removeEventListener('mousedown', dehors);
      document.removeEventListener('touchstart', dehors);
      // Removed a little later so the click of the closing tap is still swallowed.
      window.setTimeout(() => document.removeEventListener('click', clic, true), 800);
    };
  }, [nav]);
}
