// Number of refused attempts an administrator has already seen on the Refus screen (this device).
const CLE = 'pudi_refus_vus';

export function refusVus(): number {
  try {
    const n = Number(localStorage.getItem(CLE));
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function marquerRefusVus(n: number): void {
  try {
    localStorage.setItem(CLE, String(Math.max(0, n)));
  } catch {
    /* no storage: the badge comes back next time */
  }
}
