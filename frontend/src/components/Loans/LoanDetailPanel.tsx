import LoanLiveTrio from './LoanLiveTrio';
import LoanDueCountdown from './LoanDueCountdown';
import RepaymentHistorySection from './RepaymentHistorySection';
import { computeLoanLiveState } from '../../services/loanInterest';

export interface LoanDetailPanelProps {
  /** Prêt complet (LoanWithDetails). */
  loan: any;
  /** Notes libres à afficher (transaction.notes ou loan.description). */
  notes?: string;
}

/**
 * Panneau de détail d'un prêt, IDENTIQUE sur la page Prêts (Famille) et la page
 * Transactions : Montant (remboursé + trio "en direct") + ligne d'échéance (jauge
 * + compte à rebours + montant à percevoir/à payer) + Notes + Informations + Historique.
 * Les boutons d'action restent propres à chaque page.
 */
const LoanDetailPanel = ({ loan, notes }: LoanDetailPanelProps) => {
  const currency = loan.currency || 'MGA';
  const money = (n: number) =>
    currency === 'EUR'
      ? `${(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
      : `${Math.round(n || 0).toLocaleString('fr-FR')} Ar`;

  const amountInitial = loan.amountInitial || 0;
  const totalRepaid = loan.totalRepaid || 0;
  const repaidPct = amountInitial > 0 ? Math.min((totalRepaid / amountInitial) * 100, 100) : 0;

  const repayments = (loan.repayments || []).map((r: any) => ({
    amountPaid: r.amountPaid,
    paymentDate: r.paymentDate,
  }));

  const cleanedNotes = (notes || '')
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s && !/^Taux\s*:/i.test(s))
    .join(' | ');

  const dueWord = loan.isITheBorrower ? 'À payer' : 'À percevoir';

  return (
    <div className="space-y-2 text-sm">
      {/* Montant */}
      <div className="bg-white/80 rounded-lg p-2">
        <p className="text-gray-500 text-xs">Montant</p>
        <div className="mt-0">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Remboursé: {money(totalRepaid)}</span>
            <span className="font-semibold text-green-700">{repaidPct.toFixed(1)}% remboursé</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-green-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${repaidPct}%` }}
            />
          </div>

          <LoanLiveTrio
            amountInitial={amountInitial}
            interestRate={loan.interestRate}
            interestFrequency={loan.interestFrequency}
            dueDate={loan.dueDate}
            createdAt={loan.createdAt}
            currency={currency}
            repayments={repayments}
          />

          {loan.dueDate && (() => {
            const atDue = computeLoanLiveState(
              {
                amountInitial,
                interestRate: loan.interestRate,
                interestFrequency: loan.interestFrequency,
                dueDate: loan.dueDate,
                createdAt: loan.createdAt,
              },
              repayments,
              new Date(loan.dueDate)
            ).totalOwed;
            return (
              <div className="flex justify-between items-end text-[11px] text-gray-600 mt-3 px-1 gap-2">
                <span className="flex-shrink-0 flex flex-col items-start leading-tight">
                  <span>Échéance</span>
                  <span>{new Date(loan.dueDate).toLocaleDateString('fr-FR')}</span>
                </span>
                <LoanDueCountdown createdAt={loan.createdAt} dueDate={loan.dueDate} />
                <span className="font-semibold text-gray-800 flex-shrink-0 flex flex-col items-end leading-tight">
                  <span>{dueWord}</span>
                  <span>{money(atDue)}</span>
                </span>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Notes (uniquement si présentes) */}
      {cleanedNotes && (
        <div className="bg-white/80 rounded-lg p-2">
          <p className="text-gray-500 text-xs">Notes</p>
          <p className="text-gray-800">{cleanedNotes}</p>
        </div>
      )}

      {/* Informations prêt */}
      <div className="bg-purple-100/70 rounded-lg p-2 border border-purple-200">
        <p className="text-purple-700 text-xs font-medium">Informations prêt</p>
        <p className="text-purple-800 text-xs">Catégorie: {loan.isITheBorrower ? 'emprunt' : 'prêt'}</p>
        <p className="text-purple-800 text-xs">Devise: {currency}</p>
      </div>

      {/* Historique des remboursements */}
      <RepaymentHistorySection
        loanId={loan.id}
        currency={currency}
        lenderUserId={loan.lenderUserId}
        amountInitial={amountInitial}
        interestRate={loan.interestRate}
        interestFrequency={loan.interestFrequency}
        dueDate={loan.dueDate}
        createdAt={loan.createdAt}
      />
    </div>
  );
};

export default LoanDetailPanel;
