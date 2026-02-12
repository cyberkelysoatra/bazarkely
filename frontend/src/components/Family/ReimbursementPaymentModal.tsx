/**
 * ReimbursementPaymentModal Component - BazarKELY
 * Modal for recording payments against pending reimbursement debts
 * 
 * Features:
 * - Multi-debt support with FIFO allocation preview
 * - Real-time allocation calculation as user types amount
 * - Surplus detection with acompte indicator
 * - Payment history display
 * - Mobile-responsive design
 * 
 * @version 1.0
 * @date 2026-01-27
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, Clock, Info, CheckCircle, History, Loader2, DollarSign, X, ChevronDown 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import Button from '../UI/Button';
import { CurrencyDisplay } from '../Currency';
import { useCurrency } from '../../hooks/useCurrency';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { 
  recordReimbursementPayment, 
  getPaymentHistory,
  getMemberBalances,
  type PaymentHistoryEntry 
} from '../../services/reimbursementService';

/**
 * Interface for pending debt item
 */
export interface PendingDebt {
  reimbursementId: string;
  amount: number;
  currency: string;
  description: string;
  date: Date;
  transactionId: string;
}

/**
 * Interface for allocation preview item
 */
interface AllocationPreview {
  reimbursementId: string;
  description: string;
  date: Date;
  debtAmount: number;
  allocatedAmount: number;
  remainingBefore: number;
  percentage: number;
  isFullyPaid: boolean;
}

/**
 * Interface for payment history item
 */
interface PaymentHistoryItem {
  id: string;
  date: Date;
  amount: number;
  currency: string;
  notes: string | null;
  allocations: Array<{
    reimbursementId: string;
    amount: number;
    description: string;
    requestAmount: number;
    remainingAmount: number;
    isFullyPaid: boolean;
  }>;
  surplusAmount: number;
}

/**
 * Props interface for ReimbursementPaymentModal
 */
export interface ReimbursementPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  debtorMemberId: string; // Member ID of the debtor (who owes)
  creditorMemberId: string; // Member ID of the creditor (who receives) - current user
  debtorName: string;
  familyGroupId: string;
  pendingDebts: PendingDebt[];
  onPaymentRecorded?: () => void;
}

/**
 * ReimbursementPaymentModal Component
 */
const ReimbursementPaymentModal: React.FC<ReimbursementPaymentModalProps> = ({
  isOpen,
  onClose,
  debtorMemberId,
  debtorName,
  familyGroupId,
  pendingDebts,
  onPaymentRecorded
}) => {
  const { displayCurrency } = useCurrency();
  const { user } = useRequireAuth();
  
  // State for creditor member ID (current user's memberId)
  const [creditorMemberId, setCreditorMemberId] = useState<string | null>(null);

  // Form state
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    amount?: string;
  }>({});

  // Payment history state
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState<boolean>(false);
  const [expandedPaymentIds, setExpandedPaymentIds] = useState<Set<string>>(new Set());

  // Fetch current user's memberId when modal opens
  useEffect(() => {
    if (!isOpen || !user || !familyGroupId) return;

    const fetchCreditorMemberId = async () => {
      try {
        const memberBalances = await getMemberBalances(familyGroupId);
        const currentMember = memberBalances.find(b => b.userId === user.id);
        if (currentMember) {
          setCreditorMemberId(currentMember.memberId);
        }
      } catch (err) {
        // Error fetching member balances - silently fail
      }
    };

    fetchCreditorMemberId();
  }, [isOpen, user, familyGroupId]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPaymentAmount('');
      setNotes('');
      setError(null);
      setValidationErrors({});
      setIsHistoryExpanded(false);
      setExpandedPaymentIds(new Set());
      setCreditorMemberId(null);
    }
  }, [isOpen]);

  // Fetch payment history when modal opens
  useEffect(() => {
    if (!isOpen || !debtorMemberId || !creditorMemberId || !familyGroupId) return;

    const fetchPaymentHistory = async () => {
      setIsLoadingHistory(true);
      try {
        // Fetch payment history filtered by debtor and creditor
        const historyEntries = await getPaymentHistory(familyGroupId, {
          fromMemberId: debtorMemberId,
          toMemberId: creditorMemberId,
          limit: 20 // Limit to last 20 payments
        });

        // Transform PaymentHistoryEntry to PaymentHistoryItem format
        const transformedHistory: PaymentHistoryItem[] = historyEntries.map((entry) => ({
          id: entry.paymentId,
          date: entry.createdAt,
          amount: entry.totalAmount,
          currency: 'MGA', // Default currency
          notes: entry.notes || null,
          allocations: entry.allocations.map((alloc) => ({
            reimbursementId: alloc.reimbursementRequestId,
            amount: alloc.allocatedAmount,
            description: alloc.requestDescription
          })),
          surplusAmount: entry.surplusAmount
        }));

        setPaymentHistory(transformedHistory);
      } catch (err: any) {
        // Don't show error toast, just set empty array
        setPaymentHistory([]);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchPaymentHistory();
  }, [isOpen, debtorMemberId, creditorMemberId, familyGroupId]);

  // Calculate total debt amount
  const totalDebtAmount = useMemo(() => {
    return pendingDebts.reduce((sum, debt) => sum + debt.amount, 0);
  }, [pendingDebts]);

  // Calculate FIFO allocation preview
  const allocationPreview = useMemo<AllocationPreview[]>(() => {
    // Remove spaces from payment amount before parsing (handles "500 000" format)
    const cleanedAmount = paymentAmount ? paymentAmount.replace(/\s/g, '').replace(',', '.') : '';
    const parsedAmount = parseFloat(cleanedAmount);
    
    if (!paymentAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return [];
    }

    const paymentValue = parsedAmount;
    const allocations: AllocationPreview[] = [];
    let remainingPayment = paymentValue;

    // Sort debts by date (oldest first) for FIFO
    const sortedDebts = [...pendingDebts].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    for (const debt of sortedDebts) {
      if (remainingPayment <= 0) break;

      const debtAmount = debt.amount;
      const allocatedAmount = Math.min(remainingPayment, debtAmount);
      const remainingBefore = debtAmount - allocatedAmount;
      const percentage = debtAmount > 0 ? (allocatedAmount / debtAmount) * 100 : 0;

      allocations.push({
        reimbursementId: debt.reimbursementId,
        description: debt.description,
        date: debt.date,
        debtAmount,
        allocatedAmount,
        remainingBefore,
        percentage,
        isFullyPaid: remainingBefore === 0
      });

      remainingPayment -= allocatedAmount;
    }

    // Sort: partial payments first (priority), then fully paid
    // Partial payments have percentage < 100, fully paid have percentage >= 100
    return allocations.sort((a, b) => {
      // Partial payments come first
      if (a.percentage < 100 && b.percentage >= 100) return -1;
      if (a.percentage >= 100 && b.percentage < 100) return 1;
      // Within same category, sort by percentage (lower first for partial, higher first for full)
      if (a.percentage < 100 && b.percentage < 100) {
        return a.percentage - b.percentage; // Partial: lower percentage first
      }
      return b.percentage - a.percentage; // Fully paid: higher percentage first (should all be 100)
    });
  }, [paymentAmount, pendingDebts]);

  // Calculate surplus amount
  const surplusAmount = useMemo(() => {
    // Remove spaces from payment amount before parsing (handles "500 000" format)
    const cleanedAmount = paymentAmount ? paymentAmount.replace(/\s/g, '').replace(',', '.') : '';
    const parsedAmount = parseFloat(cleanedAmount);
    
    if (!paymentAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return 0;
    }
    const paymentValue = parsedAmount;
    return Math.max(0, paymentValue - totalDebtAmount);
  }, [paymentAmount, totalDebtAmount]);

  // Form validation
  const validateForm = (): boolean => {
    const errors: { amount?: string } = {};

    if (!paymentAmount || paymentAmount.trim() === '') {
      errors.amount = 'Le montant est requis';
    } else {
      const amountValue = parseFloat(paymentAmount.replace(/\s/g, '').replace(',', '.'));
      if (isNaN(amountValue) || amountValue <= 0) {
        errors.amount = 'Le montant doit être supérieur à 0';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Validate creditorMemberId is available
      if (!creditorMemberId) {
        throw new Error('Impossible de déterminer votre identité de membre. Veuillez réessayer.');
      }

      // Parse amount (remove spaces and handle decimal)
      const amountValue = parseFloat(paymentAmount.replace(/\s/g, '').replace(',', '.'));

      // Validate amount
      if (isNaN(amountValue) || amountValue <= 0) {
        throw new Error('Le montant doit être supérieur à 0');
      }

      // Call service function to record payment
      // The service handles FIFO allocation internally based on amount
      const result = await recordReimbursementPayment(
        debtorMemberId,      // fromMemberId (debtor who pays)
        creditorMemberId,    // toMemberId (creditor who receives)
        amountValue,         // amount
        notes.trim() || undefined, // notes (optional)
        familyGroupId        // groupId
      );

      toast.success('Paiement enregistré avec succès', {
        duration: 3000,
        icon: '✅'
      });

      // Call parent callback to refresh data
      if (onPaymentRecorded) {
        onPaymentRecorded();
      }

      // Close modal
      onClose();
    } catch (err: any) {
      const errorMessage = err?.message || 'Erreur lors de l\'enregistrement du paiement';
      setError(errorMessage);
      toast.error(errorMessage, {
        duration: 4000
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle close
  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Enregistrer un paiement - ${debtorName}`}
      size="lg"
      closeOnBackdropClick={!isLoading}
      closeOnEsc={!isLoading}
      className="sm:max-w-2xl"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={isLoading}
            disabled={
              isLoading ||
              !paymentAmount ||
              parseFloat(paymentAmount.replace(/\s/g, '').replace(',', '.')) <= 0
            }
          >
            Enregistrer le paiement
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Pending Debts List */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
            <Clock className="w-4 h-4 text-yellow-600" />
            <span>Dettes en attente ({pendingDebts.length})</span>
          </h3>
          
          {pendingDebts.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Aucune dette en attente pour ce membre
            </p>
          ) : (
            <>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {pendingDebts.map((debt) => (
                  <div
                    key={debt.reimbursementId}
                    className="card p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {debt.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {debt.date.toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="text-right ml-4 flex-shrink-0">
                        <CurrencyDisplay
                          amount={debt.amount}
                          originalCurrency={debt.currency || 'MGA'}
                          displayCurrency={displayCurrency}
                          showConversion={true}
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Total:</span>
                  <CurrencyDisplay
                    amount={totalDebtAmount}
                    originalCurrency="MGA"
                    displayCurrency={displayCurrency}
                    showConversion={true}
                    size="md"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Payment Amount Input */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Montant reçu <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            inputMode="decimal"
            value={paymentAmount}
            onChange={(e) => {
              // Format MGA currency (spaces for thousands)
              const value = e.target.value.replace(/\D/g, '');
              const formatted = value.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
              setPaymentAmount(formatted);
              setError(null);
              setValidationErrors({});
            }}
            placeholder="0"
            currency="MGA"
            leftIcon={DollarSign}
            error={validationErrors.amount}
            required
            disabled={isLoading}
            autoFocus
          />
          {paymentAmount && parseFloat(paymentAmount.replace(/\s/g, '')) > 0 && (
            <p className="text-xs text-gray-500">
              Montant saisi: {paymentAmount.replace(/\s/g, '').replace(/,/g, '.')} Ar
            </p>
          )}
        </div>

        {/* Real-Time Allocation Preview */}
        {paymentAmount && parseFloat(paymentAmount.replace(/\s/g, '')) > 0 && allocationPreview.length > 0 && (
          <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-900 flex items-center space-x-2">
              <Info className="w-4 h-4" />
              <span>Prévisualisation de l'allocation</span>
            </h4>
            <div className="space-y-3">
              {allocationPreview.map((allocation, index) => {
                const percentage = Math.min(allocation.percentage, 100);
                const isFullyPaid = allocation.isFullyPaid || percentage >= 100;
                
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {isFullyPaid ? (
                          <span className="text-green-500 text-sm flex-shrink-0">✅</span>
                        ) : (
                          <span className="text-blue-500 text-sm flex-shrink-0">🔵</span>
                        )}
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {allocation.description}
                        </span>
                      </div>
                      <div className="text-right ml-3 flex-shrink-0">
                        <span className="text-sm font-semibold text-gray-900">
                          {allocation.allocatedAmount.toLocaleString('fr-FR')} Ar
                        </span>
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isFullyPaid ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    
                    {/* Status text */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">
                        {isFullyPaid ? (
                          <span className="text-green-600 font-medium">Payé en entier</span>
                        ) : (
                          <span>
                            {percentage.toFixed(0)}% payé
                          </span>
                        )}
                      </span>
                      {!isFullyPaid && allocation.remainingBefore > 0 && (
                        <span className="text-gray-500 font-medium">
                          Reste: {allocation.remainingBefore.toLocaleString('fr-FR')} Ar
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Surplus Indicator */}
        {surplusAmount > 0 && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-900 mb-1">
                  Acompte détecté
                </p>
                <p className="text-sm text-green-700">
                  Le montant reçu ({paymentAmount.replace(/\s/g, '').replace(/,/g, '.')} Ar) dépasse
                  le total des dettes ({totalDebtAmount.toLocaleString('fr-FR')} Ar).
                </p>
                <p className="text-sm font-medium text-green-800 mt-2">
                  Acompte: {surplusAmount.toLocaleString('fr-FR')} Ar
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Cet acompte sera enregistré et pourra être utilisé pour de futures dettes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payment History Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
              <History className="w-4 h-4 text-gray-400" />
              <span>Historique des paiements</span>
            </h3>
            {paymentHistory.length > 0 && (
              <button
                type="button"
                onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                className="text-xs text-purple-600 hover:text-purple-700 font-medium transition-colors"
              >
                {isHistoryExpanded ? 'Masquer' : 'Afficher'}
              </button>
            )}
          </div>

          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          ) : paymentHistory.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Aucun paiement enregistré pour ce membre
            </p>
          ) : isHistoryExpanded ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {paymentHistory.map((payment) => {
                const isExpanded = expandedPaymentIds.has(payment.id);
                
                const toggleExpanded = () => {
                  setExpandedPaymentIds(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(payment.id)) {
                      newSet.delete(payment.id);
                    } else {
                      newSet.add(payment.id);
                    }
                    return newSet;
                  });
                };

                return (
                  <div key={payment.id} className="card p-3">
                    {/* Clickable header */}
                    <button
                      type="button"
                      onClick={toggleExpanded}
                      className="w-full flex items-center justify-between mb-2 hover:bg-gray-50 -m-1 p-1 rounded transition-colors"
                    >
                      <span className="text-xs text-gray-500">
                        {payment.date.toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <div className="flex items-center gap-2">
                        <CurrencyDisplay
                          amount={payment.amount}
                          originalCurrency={payment.currency || 'MGA'}
                          displayCurrency={displayCurrency}
                          showConversion={true}
                          size="sm"
                        />
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </button>
                    
                    {/* Collapsible content */}
                    {isExpanded && (
                      <div className="mt-2 space-y-2">
                        {payment.allocations.length > 0 && (
                          <div className="pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-600 mb-1 font-medium">Allocations:</p>
                            {payment.allocations.map((alloc, idx) => (
                              <div key={idx} className="text-xs text-gray-500">
                                • {alloc.description}: {alloc.amount.toLocaleString('fr-FR')} Ar
                              </div>
                            ))}
                          </div>
                        )}
                        {payment.surplusAmount > 0 && (
                          <div className="pt-2 border-t border-gray-100">
                            <p className="text-xs text-green-600 font-medium">
                              Acompte: {payment.surplusAmount.toLocaleString('fr-FR')} Ar
                            </p>
                          </div>
                        )}
                        {payment.notes && (
                          <p className="text-xs text-gray-500 pt-2 border-t border-gray-100 italic">
                            "{payment.notes}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Notes Textarea */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Notes (optionnel)
          </label>
          <textarea
            value={notes}
            onChange={(e) => {
              const value = e.target.value;
              if (value.length <= 500) {
                setNotes(value);
              }
            }}
            placeholder="Ajouter une note sur ce paiement..."
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500">
            {notes.length}/500 caractères
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
      </form>
    </Modal>
  );
};

export default ReimbursementPaymentModal;
