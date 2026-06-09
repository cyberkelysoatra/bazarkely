/** Formatage d'affichage (m³, %, devise) pour le module gestion-eau. */

export function fmtM3(v: number | null | undefined, digits = 1): string {
  if (v == null || Number.isNaN(v)) return '—';
  return `${v.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: digits })} m³`;
}

export function fmtKwh(v: number | null | undefined, digits = 0): string {
  if (v == null || Number.isNaN(v)) return '—';
  return `${v.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: digits })} kWh`;
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
