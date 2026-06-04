/**
 * Génération et normalisation des codes d'enrôlement / QR client (logique PURE).
 * Le code d'enrôlement est court et lisible (à transmettre oralement / sur papier) :
 * alphabet sans caractères ambigus (pas de 0/O, 1/I/L).
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Génère un code aléatoire de `len` caractères dans l'alphabet non ambigu. */
export function genCode(len = 6): string {
  let out = '';
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buf = new Uint32Array(len);
    crypto.getRandomValues(buf);
    for (let i = 0; i < len; i++) out += ALPHABET[buf[i] % ALPHABET.length];
    return out;
  }
  for (let i = 0; i < len; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return out;
}

/** Code d'enrôlement lisible (6 caractères, ex : "K7QM4P"). */
export function genCodeEnrolement(): string {
  return genCode(6);
}

/** Code QR (plus long, peu de risque de collision). */
export function genCodeQr(): string {
  return `CLT-${genCode(4)}-${genCode(4)}`;
}

/**
 * Normalise un code saisi : majuscules, sans espaces/tirets, O→0? Non —
 * l'alphabet exclut déjà les ambigus, on retire juste séparateurs et casse.
 */
export function normalizeCode(raw: string): string {
  return (raw ?? '').toUpperCase().replace(/[\s-]/g, '').trim();
}
