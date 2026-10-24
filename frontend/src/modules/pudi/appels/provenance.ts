// Provenance of the visitor (?c=<code> of channel links and QR codes). The most recent valid
// code is kept in localStorage pudi_canal (also across the Google sign-in) and sent as p_canal.
// Invalid codes are ignored silently; the code is never displayed.
import { codeCanalValide } from '../utils/regles';
import { decoderBrouillon } from '../utils/navigateurInterne';
import { brouillonVide, ecrireBrouillon, lireBrouillon } from './brouillon';

const CLE = 'pudi_canal';
let memoire: string | null = null;

export function capturerCanal(search: string = window.location.search): void {
  const code = new URLSearchParams(search).get('c');
  if (!codeCanalValide(code)) return;
  memoire = code;
  try {
    localStorage.setItem(CLE, code);
  } catch {
    /* memory only */
  }
}

/**
 * PUDI-CC-16.2 e: draft carried in the address (?b=) when a built-in browser hands the page to
 * Chrome. Read once at start (fills an empty draft only), then removed from the address.
 */
export function capturerBrouillonAdresse(): void {
  try {
    const u = new URL(window.location.href);
    const code = u.searchParams.get('b');
    if (code === null) return;
    const b = decoderBrouillon(code);
    if (b && brouillonVide(lireBrouillon())) ecrireBrouillon(b);
    u.searchParams.delete('b');
    window.history.replaceState(window.history.state, '', u.pathname + u.search + u.hash);
  } catch {
    /* old browser: the address keeps ?b=, harmless */
  }
}

export function lireCanal(): string | null {
  try {
    const v = localStorage.getItem(CLE);
    if (codeCanalValide(v)) return v;
  } catch {
    /* memory only */
  }
  return memoire;
}
