// Account menu layer (screen 3 quater). One history entry is pushed while it is open, so the
// phone Back button closes it (pattern of src/modules/pudi/appels/commutateur.ts).
import { useSyncExternalStore } from 'react';

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

export function ouvrirMenu(): void {
  if (ouvert) return;
  ouvert = true;
  try {
    history.pushState({ ...(history.state ?? {}), vcMenu: true }, '');
    entreeHistorique = true;
    window.addEventListener('popstate', surRetour);
  } catch {
    entreeHistorique = false;
  }
  notifier();
}

/** Closes the menu (pops its history entry). */
export function fermerMenu(): void {
  if (!ouvert) return;
  ouvert = false;
  window.removeEventListener('popstate', surRetour);
  if (entreeHistorique) {
    entreeHistorique = false;
    history.back();
  }
  notifier();
}

/**
 * Closes the menu before going to another page: the pushed entry is replaced by the navigation,
 * so a later Back leaves the new page instead of reopening nothing.
 */
export function quitterMenu(): void {
  if (!ouvert) return;
  ouvert = false;
  window.removeEventListener('popstate', surRetour);
  entreeHistorique = false;
  notifier();
}

export function useMenuOuvert(): boolean {
  return useSyncExternalStore(
    (f) => {
      abonnes.add(f);
      return () => abonnes.delete(f);
    },
    () => ouvert,
    () => false
  );
}
