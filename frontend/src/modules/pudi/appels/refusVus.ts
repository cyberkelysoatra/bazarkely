// Number of refused attempts (and, since PUDI-CC-09, of restored automatic maskings) an
// administrator has already seen on the Refus screen (this device).
const CLE = 'pudi_refus_vus';
const CLE_RETABLIS = 'pudi_retablissements_vus';

function lireNombre(cle: string): number {
  try {
    const n = Number(localStorage.getItem(cle));
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function ecrireNombre(cle: string, n: number): void {
  try {
    localStorage.setItem(cle, String(Math.max(0, n)));
  } catch {
    /* no storage: the badge comes back next time */
  }
}

export const refusVus = (): number => lireNombre(CLE);
export const marquerRefusVus = (n: number): void => ecrireNombre(CLE, n);
export const retablisVus = (): number => lireNombre(CLE_RETABLIS);
export const marquerRetablisVus = (n: number): void => ecrireNombre(CLE_RETABLIS, n);
