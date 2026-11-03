// Module switcher bar (tap on the header logo, VALIDCLIENT-CC-11), copy of
// src/modules/pudi/appels/commutateur.ts. One history entry while it is open, so Back closes it.
// The account menu and the bar hand the same history entry over (`reprendre`), never both open.
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

/** Opens the bar; `reprendre` reuses the history entry of the account menu that just closed. */
export function ouvrirCommutateur(reprendre = false): void {
  if (ouvert) return;
  ouvert = true;
  try {
    const etat = { ...(history.state ?? {}), vcCommutateur: true };
    delete (etat as { vcMenu?: boolean }).vcMenu;
    if (reprendre) history.replaceState(etat, '');
    else history.pushState(etat, '');
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

/**
 * Closes the bar without popping its entry (the account menu takes it over, or a new page replaces
 * it). Returns true when an entry is left for the caller to reuse.
 */
export function quitterCommutateur(): boolean {
  if (!ouvert) return false;
  const entree = entreeHistorique;
  ouvert = false;
  window.removeEventListener('popstate', surRetour);
  entreeHistorique = false;
  notifier();
  return entree;
}

export function basculerCommutateur(reprendre = false): void {
  if (ouvert) fermerCommutateur();
  else ouvrirCommutateur(reprendre);
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

/**
 * Escape and a tap outside the bar close it (the logo toggles, the account circle hands over).
 * The tap that closes it does nothing else: its click is swallowed.
 */
export function useFermetureCommutateur(nav: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    let avalerJusqua = 0;
    const touche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fermerCommutateur();
    };
    const dehors = (e: Event) => {
      const t = e.target as Element | null;
      if (!t || nav.current?.contains(t) || t.closest?.('[data-vc-logo], [data-rond-compte]')) return;
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
