// Provenance of the visitor (?c=<code> of channel links and QR codes). The most recent valid
// code is kept in localStorage pudi_canal (also across the Google sign-in) and sent as p_canal.
// Invalid codes are ignored silently; the code is never displayed.
import { codeCanalValide } from '../utils/regles';

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

export function lireCanal(): string | null {
  try {
    const v = localStorage.getItem(CLE);
    if (codeCanalValide(v)) return v;
  } catch {
    /* memory only */
  }
  return memoire;
}
