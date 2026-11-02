// Device storage of the module (D6): one IndexedDB store « vc-validation / kv » through idb-keyval.
// Keys: `q:<questionnaire>` (vc_questionnaire), `d:<document>` (vc_document), `file` (answers not
// sent yet), `espace:<user>` (vc_mon_espace, to open the pages without network).
// A storage failure (private mode, quota) never breaks the page: reads give undefined.
import { createStore, get, set } from 'idb-keyval';

let magasin: ReturnType<typeof createStore> | null = null;

function lieu() {
  if (!magasin) magasin = createStore('vc-validation', 'kv');
  return magasin;
}

export async function lireLocal<T>(cle: string): Promise<T | undefined> {
  try {
    return await get<T>(cle, lieu());
  } catch {
    return undefined;
  }
}

export async function ecrireLocal(cle: string, valeur: unknown): Promise<void> {
  try {
    await set(cle, valeur, lieu());
  } catch {
    // Storage refused: the page keeps working from memory.
  }
}

/** « Android, Chrome »: short device text sent with each answer (vc_reponses.appareil). */
export function appareil(ua: string = typeof navigator === 'undefined' ? '' : navigator.userAgent): string {
  const systeme = /Android/i.test(ua)
    ? 'Android'
    : /iPhone|iPad|iPod/i.test(ua)
      ? 'iOS'
      : /Windows/i.test(ua)
        ? 'Windows'
        : /Mac OS X|Macintosh/i.test(ua)
          ? 'Mac'
          : /Linux/i.test(ua)
            ? 'Linux'
            : 'Autre';
  const navigateur = /SamsungBrowser/i.test(ua)
    ? 'Samsung Internet'
    : /Edg\//i.test(ua)
      ? 'Edge'
      : /OPR\/|Opera/i.test(ua)
        ? 'Opera'
        : /Firefox|FxiOS/i.test(ua)
          ? 'Firefox'
          : /Chrome|CriOS/i.test(ua)
            ? 'Chrome'
            : /Safari/i.test(ua)
              ? 'Safari'
              : 'navigateur';
  return `${systeme}, ${navigateur}`;
}
