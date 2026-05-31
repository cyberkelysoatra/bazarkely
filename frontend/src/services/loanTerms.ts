/**
 * Helpers de saisie des "termes" d'un prêt (échéance + intérêt), partagés entre
 * la création (AddTransactionPage) et la modification (TransactionDetailPage).
 *
 * L'intérêt peut être saisi de 4 façons (2 toggles), toutes converties vers le
 * TAUX JOURNALIER en % stocké sur le prêt (le moteur loanInterest reste inchangé) :
 *   - %  · par jour      → taux tel quel
 *   - %  · sur la durée  → taux ÷ nb de jours
 *   - Ar · par jour      → (montant ÷ capital) × 100
 *   - Ar · sur la durée  → (montant ÷ capital ÷ nb de jours) × 100
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type InterestMode = 'percent' | 'amount';
export type InterestPeriod = 'day' | 'duration';

/** Nombre de jours entiers entre deux dates ('YYYY-MM-DD' ou ISO). */
export function daysBetweenDates(fromStr: string, toStr: string): number {
  const a = new Date(fromStr).getTime();
  const b = new Date(toStr).getTime();
  if (isNaN(a) || isNaN(b)) return 0;
  return Math.max(0, Math.round((b - a) / MS_PER_DAY));
}

function parseNum(raw: string | number): number {
  if (typeof raw === 'number') return raw;
  return parseFloat((raw || '').toString().replace(',', '.'));
}

/** Convertit la saisie (valeur + 2 toggles) en taux JOURNALIER en %. */
export function computeDailyRatePct(
  rawValue: string | number,
  mode: InterestMode,
  period: InterestPeriod,
  capital: number,
  durationDays: number
): number {
  const v = parseNum(rawValue);
  if (!isFinite(v) || v <= 0) return 0;
  if (mode === 'percent') {
    return period === 'day' ? v : durationDays > 0 ? v / durationDays : 0;
  }
  // mode 'amount' (Ar)
  if (!(capital > 0)) return 0;
  const perDayAr = period === 'day' ? v : durationDays > 0 ? v / durationDays : 0;
  return (perDayAr / capital) * 100;
}

/** Libellé lisible d'une durée en jours : "1 an 2 mois 5 j". */
export function formatDurationLabel(days: number): string {
  if (!days || days <= 0) return '';
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const d = days - years * 365 - months * 30;
  const parts: string[] = [];
  if (years) parts.push(`${years} an${years > 1 ? 's' : ''}`);
  if (months) parts.push(`${months} mois`);
  if (d) parts.push(`${d} j`);
  return parts.join(' ') || `${days} j`;
}
