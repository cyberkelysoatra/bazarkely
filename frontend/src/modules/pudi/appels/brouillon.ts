// Draft of the choice, kept on the device (localStorage pudi_brouillon_v1), in memory when
// storage is unavailable. Every storage access is wrapped in try/catch.
import { BROUILLON_VIDE, MAX_MANQUANT, VOIX, type Brouillon } from '../utils/regles';

const CLE = 'pudi_brouillon_v1';
let memoire: Brouillon = BROUILLON_VIDE;

function nettoyer(v: unknown): Brouillon {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<Brouillon>;
  const liste = (l: unknown) => (Array.isArray(l) ? l.filter((x): x is string => typeof x === 'string') : []);
  return {
    // PUDI-CC-17: one element per vote (repeats = stacked votes); an old draft of 3 reads as is.
    priorites: liste(o.priorites).slice(0, VOIX),
    urgents: [...new Set(liste(o.urgents))].slice(0, 10),
    manquant: typeof o.manquant === 'string' ? o.manquant.slice(0, MAX_MANQUANT) : ''
  };
}

export function lireBrouillon(): Brouillon {
  try {
    const raw = localStorage.getItem(CLE);
    if (raw) memoire = nettoyer(JSON.parse(raw));
  } catch {
    /* private mode or corrupt value: keep the in-memory copy */
  }
  return memoire;
}

export function ecrireBrouillon(b: Brouillon): void {
  memoire = nettoyer(b);
  try {
    localStorage.setItem(CLE, JSON.stringify(memoire));
  } catch {
    /* storage unavailable: memory only */
  }
}

export function brouillonVide(b: Brouillon): boolean {
  return !b.priorites.length && !b.urgents.length && !b.manquant.trim();
}
