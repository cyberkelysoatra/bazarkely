/** Formatage d'affichage (m³, %, devise) pour le module gestion-eau. */

export function fmtM3(v: number | null | undefined, digits = 1): string {
  if (v == null || Number.isNaN(v)) return '—';
  return `${v.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: digits })} m³`;
}

export function fmtKwh(v: number | null | undefined, digits = 0): string {
  if (v == null || Number.isNaN(v)) return '—';
  return `${v.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: digits })} kWh`;
}

/** Débit en m³ par heure (échelle horaire du tableau de bord). */
export function fmtM3h(v: number | null | undefined, digits = 1): string {
  if (v == null || Number.isNaN(v) || !Number.isFinite(v)) return '—';
  return `${v.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: digits })} m³/h`;
}

/** Puissance moyenne en kW (= kWh/h). */
export function fmtKw(v: number | null | undefined, digits = 1): string {
  if (v == null || Number.isNaN(v) || !Number.isFinite(v)) return '—';
  return `${v.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: digits })} kW`;
}

export function fmtPct(ratioOrPct: number | null | undefined, opts?: { isRatio?: boolean; digits?: number }): string {
  if (ratioOrPct == null || Number.isNaN(ratioOrPct)) return '—';
  const pct = opts?.isRatio ? ratioOrPct * 100 : ratioOrPct;
  const digits = opts?.digits ?? 1;
  return `${pct.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: digits })} %`;
}

export function fmtMontant(v: number | null | undefined, devise = 'MGA'): string {
  if (v == null || Number.isNaN(v)) return '—';
  return `${v.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} ${devise}`;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

/**
 * Formate une autonomie en heures → « 2 j 4 h » (≥ 24 h) ou « 5,0 h » (< 24 h),
 * « — » si indéfinie ou ≤ 0. Source unique (tableau de bord + espace propriétaire).
 */
export function fmtAutonomie(heures: number | null | undefined): string {
  if (heures == null || !Number.isFinite(heures) || heures <= 0) return '—';
  if (heures < 24) return `${heures.toFixed(1)} h`;
  const j = Math.floor(heures / 24);
  const h = Math.round(heures - j * 24);
  return `${j} j ${h} h`;
}

/** Libellé lisible d'un mois `YYYY-MM` (ex. « juin 2025 ») ; renvoie l'entrée si invalide. */
export function fmtMois(mois: string): string {
  const [y, m] = mois.split('-').map(Number);
  if (!y || !m) return mois;
  return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}
