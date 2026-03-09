import { useState, useEffect } from 'react';
import { Loader2, Paperclip } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAppStore } from '../../stores/appStore';
import {
  getUnpaidInterestPeriods,
  getUnlinkedRevenueTransactions,
  recordPayment,
  uploadLoanReceipt
} from '../../services/loanService';
import type { LoanInterestPeriod } from '../../services/loanService';
import { CurrencyDisplay } from '../Currency';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import Button from '../UI/Button';

export interface PaymentModalProps {
  loanId: string;
  loanName: string;
  remainingBalance: number;
  currency: string;
  onClose: () => void;
  onSuccess: () => void;
}

const PaymentModal = ({ loanId, loanName, remainingBalance, currency, onClose, onSuccess }: PaymentModalProps) => {
  const { user } = useAppStore();
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'direct' | 'link'>('direct');
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [availableTransactions, setAvailableTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [unpaidInterests, setUnpaidInterests] = useState<LoanInterestPeriod[]>([]);
  const [loadingInterests, setLoadingInterests] = useState(false);

  useEffect(() => {
    loadUnpaidInterests();
    if (mode === 'link') {
      loadUnlinkedTransactions();
    }
  }, [loanId, mode]);

  const loadUnpaidInterests = async () => {
    try {
      setLoadingInterests(true);
      const periods = await getUnpaidInterestPeriods(loanId);
      setUnpaidInterests(periods);
    } catch (error) {
      console.error('Error loading unpaid interests:', error);
      setUnpaidInterests([]);
    } finally {
      setLoadingInterests(false);
    }
  };

  const loadUnlinkedTransactions = async () => {
    try {
      setLoadingTransactions(true);
      const transactions = await getUnlinkedRevenueTransactions();
      setAvailableTransactions(transactions);
    } catch (error) {
      console.error('Error loading unlinked transactions:', error);
      setAvailableTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const totalUnpaidInterest = unpaidInterests.reduce((sum, p) => sum + p.interestAmount, 0);

  const handleTransactionSelect = (transaction: any) => {
    setSelectedTransactionId(transaction.id);
    setAmountPaid(Math.abs(transaction.amount).toString());
  };

  const handleClose = () => {
    setReceiptFile(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amountPaid || parseFloat(amountPaid) <= 0) {
      toast.error('Montant requis');
      return;
    }

    try {
      setSubmitting(true);
      let receiptUrl: string | null = null;
      if (receiptFile && user?.id) {
        receiptUrl = await uploadLoanReceipt(user.id, receiptFile);
      }
      await recordPayment(
        loanId,
        parseFloat(amountPaid),
        paymentDate,
        notes.trim() || undefined,
        mode === 'link' ? selectedTransactionId : undefined,
        receiptUrl
      );
      toast.success('Paiement enregistré avec succès');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'enregistrement du paiement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={handleClose}
      title={`Enregistrer un paiement - ${loanName}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
          <button
            type="button"
            onClick={() => {
              setMode('direct');
              setSelectedTransactionId(null);
              setAmountPaid('');
              setReceiptFile(null);
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              mode === 'direct'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Paiement direct 💵
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('link');
              setReceiptFile(null);
              loadUnlinkedTransactions();
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              mode === 'link'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Lier une transaction 🔗
          </button>
        </div>

        {loadingInterests ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          </div>
        ) : totalUnpaidInterest > 0 && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-800 font-medium">
              Intérêts dus: {totalUnpaidInterest.toLocaleString('fr-FR')} {currency === 'MGA' ? 'Ar' : '€'}
            </p>
            <p className="text-xs text-orange-600 mt-1">
              Ce paiement couvrira d'abord les intérêts
            </p>
          </div>
        )}

        {mode === 'direct' && (
          <>
            <Input
              label="Montant payé"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              placeholder="0"
              type="number"
              min="1"
              currency={currency}
              required
            />
            <Input
              label="Date du paiement"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              type="date"
              required
            />
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Notes (optionnel)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Notes sur ce paiement..."
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-gray-500" />
                Justificatif (optionnel)
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <p className="text-xs text-gray-500">
                {receiptFile ? receiptFile.name : 'Aucun fichier'}
              </p>
            </div>
          </>
        )}

        {mode === 'link' && (
          <>
            {loadingTransactions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : availableTransactions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                Aucune transaction de revenu disponible à lier
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    onClick={() => handleTransactionSelect(transaction)}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedTransactionId === transaction.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {transaction.description || 'Transaction sans description'}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(transaction.date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div className="text-right">
                        <CurrencyDisplay
                          amount={Math.abs(transaction.amount)}
                          originalCurrency={transaction.currency || 'MGA'}
                          displayCurrency={transaction.currency || 'MGA'}
                          showConversion={false}
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {selectedTransactionId && (
              <div className="space-y-2">
                <Input
                  label="Montant (pré-rempli)"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="0"
                  type="number"
                  min="1"
                  currency={currency}
                  required
                />
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Notes (optionnel)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Notes sur ce paiement..."
                  />
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={submitting}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={submitting || !amountPaid || parseFloat(amountPaid) <= 0}
            loading={submitting}
          >
            Enregistrer le paiement
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default PaymentModal;
