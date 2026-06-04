/**
 * Encodage / décodage des liens de scan QR du module gestion-eau (logique PURE).
 *
 * Un QR encode une URL absolue vers la route de résolution `/gestion-eau/scan` :
 *   - QR compteur : `…/gestion-eau/scan?t=c&k=<code QR compteur>`
 *   - QR client   : `…/gestion-eau/scan?t=cl&k=<code QR client>`
 *
 * Le paramètre `t` (type) est volontairement court (c / cl) pour réduire la densité du QR.
 * Le décodage accepte aussi bien une URL absolue (caméra) qu'une simple query (`?t=…&k=…`).
 */

export type ScanType = 'compteur' | 'client';

export interface ScanParams {
  type: ScanType;
  code: string;
}

/** Origine de production (utilisée pour générer des QR scannables hors de l'app). */
export const SCAN_BASE_URL = 'https://1sakely.org';
export const SCAN_PATH = '/gestion-eau/scan';

function typeToParam(type: ScanType): 'c' | 'cl' {
  return type === 'client' ? 'cl' : 'c';
}

function paramToType(raw: string | null): ScanType | null {
  if (raw === 'c') return 'compteur';
  if (raw === 'cl') return 'client';
  return null;
}

/** Construit l'URL absolue encodée dans le QR (pour la génération d'image). */
export function buildScanUrl(type: ScanType, code: string, base: string = SCAN_BASE_URL): string {
  const t = typeToParam(type);
  return `${base}${SCAN_PATH}?t=${t}&k=${encodeURIComponent(code)}`;
}

/** URL interne (relative) vers le résolveur — pour navigate() après un scan caméra. */
export function buildInternalScanPath(type: ScanType, code: string): string {
  const t = typeToParam(type);
  return `${SCAN_PATH}?t=${t}&k=${encodeURIComponent(code)}`;
}

/**
 * Extrait { type, code } depuis un texte décodé (URL absolue, chemin relatif, ou query
 * brute). Retourne null si le texte ne correspond pas à un lien de scan valide.
 */
export function parseScanText(decoded: string): ScanParams | null {
  if (!decoded) return null;
  const text = decoded.trim();

  // Cas 1 : query string exploitable directement (URLSearchParams sur la partie après '?').
  const qIndex = text.indexOf('?');
  const query = qIndex >= 0 ? text.slice(qIndex + 1) : text;
  try {
    const params = new URLSearchParams(query);
    const type = paramToType(params.get('t'));
    const code = params.get('k');
    if (type && code) return { type, code: decodeURIComponent(code) };
  } catch {
    /* ignore */
  }
  return null;
}

/** Variante prenant directement les valeurs de useSearchParams (résolveur). */
export function parseScanQuery(t: string | null, k: string | null): ScanParams | null {
  const type = paramToType(t);
  if (type && k) return { type, code: k };
  return null;
}
