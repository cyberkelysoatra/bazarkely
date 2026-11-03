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

/** Opens the menu; `reprendre` reuses the history entry of the module bar that just closed. */
export function ouvrirMenu(reprendre = false): void {
  if (ouvert) return;
  ouvert = true;
  try {
    const etat = { ...(history.state ?? {}), vcMenu: true };
    delete (etat as { vcCommutateur?: boolean }).vcCommutateur;
    if (reprendre) history.replaceState(etat, '');
    else history.pushState(etat, '');
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
 * so a later Back leaves the new page instead of reopening nothing. Also used to hand the entry
 * over to the module bar: returns true when an entry is left for the caller to reuse.
 */
export function quitterMenu(): boolean {
  if (!ouvert) return false;
  const entree = entreeHistorique;
  ouvert = false;
  window.removeEventListener('popstate', surRetour);
  entreeHistorique = false;
  notifier();
  return entree;
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
