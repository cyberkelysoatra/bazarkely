import { useState, useEffect } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAppStore } from '../../stores/appStore';
import { getRepaymentHistory, confirmRepaymentAsLender, isPendingLenderRepaymentConfirmation } from '../../services/loanService';
import type { LoanRepayment } from '../../services/loanService';
import { CurrencyDisplay } from '../Currency';

export interface RepaymentHistorySectionProps {
  loanId: string;
  currency: string;
  lenderUserId: string;
}

const RepaymentHistorySection = ({ loanId, currency, lenderUserId }: RepaymentHistorySectionProps) => {
  const { user } = useAppStore();
  const [repayments, setRepayments] = useState<LoanRepayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (isExpanded) {
      loadHistory();
    }
  }, [loanId, isExpanded]);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const history = await getRepaymentHistory(loanId);
      setRepayments(history);
    } catch (error) {
      console.error('Error loading repayment history:', error);
      setRepayments([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-3 border-t border-gray-200 pt-3">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
      >
        <span>Historique des remboursements</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {isExpanded && (
        <div className="mt-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          ) : repayments.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Aucun remboursement enregistré
            </p>
          ) : (
            <div className="space-y-2">
              {repayments.map((repayment) => (
                <div
                  key={repayment.id}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(repayment.paymentDate).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                    <CurrencyDisplay
                      amount={repayment.amountPaid}
                      originalCurrency={currency}
                      displayCurrency={currency}
                      showConversion={false}
                      size="sm"
                    />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-600 mt-1">
                    <span>Intérêts: {repayment.interestPortion.toLocaleString('fr-FR')} {currency === 'MGA' ? 'Ar' : '€'}</span>
                    <span>•</span>
                    <span>Capital: {repayment.capitalPortion.toLocaleString('fr-FR')} {currency === 'MGA' ? 'Ar' : '€'}</span>
                  </div>
                  {repayment.notes && (
                    <p className="text-xs text-gray-500 italic mt-1">"{repayment.notes}"</p>
                  )}
                  {isPendingLenderRepaymentConfirmation(repayment) && (
                    <div className="mt-2">
                      {user?.id === lenderUserId ? (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await confirmRepaymentAsLender(repayment.id);
                              toast.success('Remboursement confirmé');
                              loadHistory();
                            } catch {
                              toast.error('Erreur lors de la confirmation');
                            }
                          }}
                          className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium"
                        >
                          Confirmer réception
                        </button>
                      ) : (
                        <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-medium">
                          En attente de confirmation
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RepaymentHistorySection;
