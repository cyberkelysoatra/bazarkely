// PUDI-CC-11: JOEL's role preview, kept in sessionStorage only (ends when the tab closes).
import { useSyncExternalStore } from 'react';
import type { Apercu } from '../utils/apercu';

const CLE = 'pudi_apercu';
let memoire: Apercu | null = null;
let lu = false;
const abonnes = new Set<() => void>();

function lire(): Apercu | null {
  if (lu) return memoire;
  lu = true;
  try {
    const v = sessionStorage.getItem(CLE);
    memoire = v ? (JSON.parse(v) as Apercu) : null;
  } catch {
    memoire = null;
  }
  return memoire;
}

export function apercuCourant(): Apercu | null {
  return lire();
}

export function definirApercu(a: Apercu | null): void {
  memoire = a;
  lu = true;
  try {
    if (a) sessionStorage.setItem(CLE, JSON.stringify(a));
    else sessionStorage.removeItem(CLE);
  } catch {
    /* memory only */
  }
  abonnes.forEach((f) => f());
}

function abonner(f: () => void): () => void {
  abonnes.add(f);
  return () => abonnes.delete(f);
}

/** Stored preview (not yet checked against JOEL's rights: see PudiContexte). */
export function useApercuStocke(): Apercu | null {
  return useSyncExternalStore(abonner, lire, () => null);
}
