// Switcher mode of the PUDi bottom bar (tap on the PUDi logo, like the host header logo).
// One history entry is pushed while it is open, so the Back button closes it.
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

export function ouvrirCommutateur(): void {
  if (ouvert) return;
  ouvert = true;
  try {
    history.pushState({ ...(history.state ?? {}), pudiCommutateur: true }, '');
    entreeHistorique = true;
    window.addEventListener('popstate', surRetour);
  } catch {
    entreeHistorique = false;
  }
  notifier();
}

/** Closes the switcher; `parRetour` when the history entry is already gone. */
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
