import { useEffect, useState } from 'react';
import { computeLoanLiveState } from '../../services/loanInterest';

export interface LoanLiveTrioProps {
  amountInitial: number;
  /** Taux saisi (interprété via interestFrequency). */
  interestRate: number;
  interestFrequency?: string | null;
  dueDate: string | null;
  createdAt: string;
  currency?: string;
  repayments?: { amountPaid: number; paymentDate: string }[];
}

/**
 * Affiche le trio "en direct" Capital · Intérêts courus · Total dû d'un prêt,
 * recalculé CHAQUE SECONDE (les intérêts montent visiblement). Utilisé à la fois
 * sur la page Prêts et sur la page Transactions pour un affichage identique.
 */
const LoanLiveTrio = ({
  amountInitial,
  interestRate,
  interestFrequency,
  dueDate,
  createdAt,
  currency = 'MGA',
  repayments = [],
}: LoanLiveTrioProps) => {
  const [, setTick] = useState(0);
  const hasInterest = (interestRate || 0) > 0;

  // Rafraîchissement chaque seconde tant que le prêt porte intérêt
  useEffect(() => {
    if (!hasInterest) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [hasInterest]);

  const live = computeLoanLiveState(
    { amountInitial, interestRate, interestFrequency, dueDate, createdAt },
    repayments,
    new Date()
  );

  const money = (n: number, decimals: number) =>
    currency === 'EUR'
      ? `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
      : `${n.toLocaleString('fr-FR', { maximumFractionDigits: decimals })} Ar`;

  const rateStr = live.dailyRatePct.toLocaleString('fr-FR', { maximumFractionDigits: 3 });

  return (
    <div className="grid grid-cols-3 gap-2 text-center mt-2">
      <div>
        <p className="text-[10px] text-gray-500 leading-tight">Capital</p>
        <p className="text-xs font-semibold text-gray-800">{money(live.capitalOutstanding, 0)}</p>
      </div>
      <div>
        <p className="text-[10px] text-gray-500 leading-tight">
          ⏱️ Intérêts courus{hasInterest ? ` · ${rateStr}%/j` : ''}
        </p>
        <p className="text-xs font-semibold text-amber-700">{money(live.accruedInterest, 3)}</p>
      </div>
      <div>
        <p className="text-[10px] text-gray-500 leading-tight">Total dû</p>
        <p className="text-xs font-bold text-gray-900">{money(live.totalOwed, 3)}</p>
      </div>
    </div>
  );
};

export default LoanLiveTrio;
