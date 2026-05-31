import {
  computeDailyRatePct,
  daysBetweenDates,
  formatDurationLabel,
  type InterestMode,
  type InterestPeriod,
} from '../../services/loanTerms';

export interface LoanTermsFieldsProps {
  /** Date du prêt (base de calcul de la durée). 'YYYY-MM-DD'. */
  loanDate: string;
  /** Capital prêté (pour convertir un montant d'intérêt en %). */
  amount: number;
  currency?: string;
  /** Date d'échéance ('YYYY-MM-DD' ou ''). */
  dueDate: string;
  onDueDateChange: (v: string) => void;
  /** Valeur d'intérêt saisie (brute) — % ou Ar selon le mode. */
  interestValue: string;
  onInterestValueChange: (v: string) => void;
  interestMode: InterestMode;
  onInterestModeChange: (m: InterestMode) => void;
  interestPeriod: InterestPeriod;
  onInterestPeriodChange: (p: InterestPeriod) => void;
}

/** Petit interrupteur 2 options (segmenté). */
function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden text-xs">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 font-medium transition-colors ${
            value === opt.value ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-blue-50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Saisie des termes d'un prêt : date d'échéance + intérêt (avec 2 toggles
 * % / Ar et par jour / sur la durée). Affiche en direct la durée équivalente
 * et le taux journalier effectif.
 */
const LoanTermsFields = ({
  loanDate,
  amount,
  currency = 'MGA',
  dueDate,
  onDueDateChange,
  interestValue,
  onInterestValueChange,
  interestMode,
  onInterestModeChange,
  interestPeriod,
  onInterestPeriodChange,
}: LoanTermsFieldsProps) => {
  const durationDays = dueDate ? daysBetweenDates(loanDate, dueDate) : 0;
  const dailyRatePct = computeDailyRatePct(interestValue, interestMode, interestPeriod, amount, durationDays);
  const unit = currency === 'EUR' ? '€' : 'Ar';
  const needsDueDate = interestPeriod === 'duration' && !dueDate && !!interestValue;

  return (
    <>
      {/* Date d'échéance */}
      <div>
        <label htmlFor="dueDateInput" className="block text-sm font-medium text-gray-700 mb-2">
          Date d'échéance (optionnel)
        </label>
        <input
          type="date"
          id="dueDateInput"
          value={dueDate}
          min={loanDate || undefined}
          onChange={(e) => onDueDateChange(e.target.value)}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {dueDate && durationDays > 0 && (
          <p className="text-xs text-gray-500 mt-1">Durée : {formatDurationLabel(durationDays)} ({durationDays} jours)</p>
        )}
      </div>

      {/* Intérêt */}
      <div>
        <label htmlFor="interestValue" className="block text-sm font-medium text-gray-700 mb-2">
          Intérêt (optionnel)
        </label>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Segmented
            value={interestMode}
            onChange={onInterestModeChange}
            options={[
              { value: 'amount', label: unit },
              { value: 'percent', label: '%' },
            ]}
          />
          <Segmented
            value={interestPeriod}
            onChange={onInterestPeriodChange}
            options={[
              { value: 'duration', label: 'sur la durée' },
              { value: 'day', label: 'par jour' },
            ]}
          />
        </div>
        <input
          type="number"
          id="interestValue"
          value={interestValue}
          onChange={(e) => onInterestValueChange(e.target.value)}
          placeholder={interestMode === 'amount' ? `Ex: 20000 (${unit})` : 'Ex: 1 (%)'}
          min="0"
          step="any"
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {needsDueDate ? (
          <p className="text-xs text-amber-600 mt-1">
            Définissez une date d'échéance pour calculer l'intérêt « sur la durée ».
          </p>
        ) : (
          dailyRatePct > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Équivaut à <span className="font-semibold text-blue-700">{dailyRatePct.toLocaleString('fr-FR', { maximumFractionDigits: 4 })}% / jour</span>
              {interestMode === 'amount' && interestPeriod === 'duration' && (
                <> — soit {Math.round(parseFloat((interestValue || '0').toString().replace(',', '.')) || 0).toLocaleString('fr-FR')} {unit} sur toute la durée</>
              )}
            </p>
          )
        )}
      </div>
    </>
  );
};

export default LoanTermsFields;
