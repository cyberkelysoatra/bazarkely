/**
 * Page de gestion des prêts familiaux
 * Affiche les prêts actifs (prêteur et emprunteur) avec actions CRUD
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HandCoins, ArrowLeft, Plus, Clock, CheckCircle, AlertTriangle, 
  ChevronRight, Users, Wallet, Loader2, ChevronDown
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { useCurrency } from '../hooks/useCurrency';
import { 
  getMyLoans, 
  createLoan, 
  getLastUsedInterestSettings,
  getUnpaidInterestPeriods,
  getUnlinkedRevenueTransactions,
  recordPayment,
  getRepaymentHistory
} from '../services/loanService';
import type { 
  Loan, 
  CreateLoanInput, 
  InterestFrequency,
  LoanRepayment,
  LoanInterestPeriod
} from '../services/loanService';
import { CurrencyDisplay } from '../components/Currency';
import Modal from '../components/UI/Modal';
import Input from '../components/UI/Input';
import Button from '../components/UI/Button';

interface CreateLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateLoanModal = ({ isOpen, onClose, onSuccess }: CreateLoanModalProps) => {
  // Form state
  const [isITheBorrower, setIsITheBorrower] = useState(false);
  const [borrowerName, setBorrowerName] = useState('');
  const [borrowerPhone, setBorrowerPhone] = useState('');
  const [amountInitial, setAmountInitial] = useState('');
  const [currency, setCurrency] = useState<'MGA' | 'EUR'>('MGA');
  const [formRate, setFormRate] = useState('0');
  const [formFrequency, setFormFrequency] = useState<InterestFrequency>('monthly');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadLastSettings();
    }
  }, [isOpen]);

  const loadLastSettings = async () => {
    try {
      const settings = await getLastUsedInterestSettings();
      if (settings) {
        setFormRate(settings.rate.toString());
        setFormFrequency(settings.frequency);
      }
    } catch (error) {
      // Ignore errors, use defaults
    }
  };

  const resetForm = () => {
    setIsITheBorrower(false);
    setBorrowerName('');
    setBorrowerPhone('');
    setAmountInitial('');
    setCurrency('MGA');
    setDueDate('');
    setDescription('');
    setFormRate('0');
    setFormFrequency('monthly');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isITheBorrower && !borrowerName.trim() && !borrowerPhone.trim()) {
      toast.error('Nom ou téléphone du bénéficiaire requis');
      return;
    }
    
    if (!amountInitial || parseFloat(amountInitial) <= 0) {
      toast.error('Montant initial requis');
      return;
    }

    try {
      const input: CreateLoanInput = {
        isITheBorrower,
        borrowerName: borrowerName.trim() || undefined,
        borrowerPhone: borrowerPhone.trim() || undefined,
        amountInitial: parseFloat(amountInitial),
        currency,
        interestRate: parseFloat(formRate) || 0,
        interestFrequency: formFrequency,
        dueDate: dueDate || null,
        description: description.trim() || null
      };
      
      await createLoan(input);
      toast.success('Prêt créé avec succès');
      resetForm();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la création du prêt');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nouveau prêt"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Toggle */}
        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
          <button
            type="button"
            onClick={() => setIsITheBorrower(false)}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              !isITheBorrower
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Je prête
          </button>
          <button
            type="button"
            onClick={() => setIsITheBorrower(true)}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              isITheBorrower
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            J'emprunte
          </button>
        </div>

        {/* Borrower/Lender Name */}
        {!isITheBorrower && (
          <Input
            label="Nom du bénéficiaire"
            value={borrowerName}
            onChange={(e) => setBorrowerName(e.target.value)}
            placeholder="Nom complet"
            required={!borrowerPhone.trim()}
          />
        )}
        {isITheBorrower && (
          <Input
            label="Nom du prêteur"
            value={borrowerName}
            onChange={(e) => setBorrowerName(e.target.value)}
            placeholder="Nom complet"
          />
        )}

        {/* Borrower Phone */}
        <Input
          label="Téléphone (optionnel)"
          value={borrowerPhone}
          onChange={(e) => setBorrowerPhone(e.target.value)}
          placeholder="+261 XX XX XXX XX"
          type="tel"
        />

        {/* Amount */}
        <Input
          label="Montant"
          value={amountInitial}
          onChange={(e) => setAmountInitial(e.target.value)}
          placeholder="0"
          type="number"
          min="1"
          currency={currency}
          required
        />

        {/* Currency */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Devise</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as 'MGA' | 'EUR')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="MGA">MGA (Ariary)</option>
            <option value="EUR">EUR (Euro)</option>
          </select>
        </div>

        {/* Interest Rate */}
        <Input
          label="Taux d'intérêt (%)"
          value={formRate}
          onChange={(e) => setFormRate(e.target.value)}
          placeholder="0"
          type="number"
          step="0.01"
        />

        {/* Interest Frequency */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Fréquence des intérêts</label>
          <select
            value={formFrequency}
            onChange={(e) => setFormFrequency(e.target.value as InterestFrequency)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="daily">Journalier</option>
            <option value="weekly">Hebdomadaire</option>
            <option value="monthly">Mensuel</option>
          </select>
        </div>

        {/* Due Date */}
        <Input
          label="Date d'échéance (optionnel)"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          type="date"
        />

        {/* Description */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Description (optionnel)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            placeholder="Notes sur ce prêt..."
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Annuler
          </Button>
          <Button type="submit" variant="primary">
            Créer le prêt
          </Button>
        </div>
      </form>
    </Modal>
  );
};

interface PaymentModalProps {
  loanId: string;
  loanName: string;
  remainingBalance: number;
  currency: string;
  onClose: () => void;
  onSuccess: () => void;
}

const PaymentModal = ({ loanId, loanName, remainingBalance, currency, onClose, onSuccess }: PaymentModalProps) => {
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amountPaid || parseFloat(amountPaid) <= 0) {
      toast.error('Montant requis');
      return;
    }

    try {
      setSubmitting(true);
      await recordPayment(
        loanId,
        parseFloat(amountPaid),
        paymentDate,
        notes.trim() || undefined,
        mode === 'link' ? selectedTransactionId : undefined
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
      onClose={onClose}
      title={`Enregistrer un paiement - ${loanName}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mode Toggle */}
        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
          <button
            type="button"
            onClick={() => {
              setMode('direct');
              setSelectedTransactionId(null);
              setAmountPaid('');
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

        {/* Accrued Interests Summary */}
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

        {/* Direct Payment Mode */}
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
          </>
        )}

        {/* Link Transaction Mode */}
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

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
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

interface RepaymentHistorySectionProps {
  loanId: string;
  currency: string;
}

const RepaymentHistorySection = ({ loanId, currency }: RepaymentHistorySectionProps) => {
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
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const LoansPage = () => {
  const navigate = useNavigate();
  const { isLoading: isAuthLoading, isAuthenticated } = useRequireAuth();
  const { displayCurrency } = useCurrency();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'lender' | 'borrower'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      loadLoans();
    }
  }, [isAuthLoading, isAuthenticated]);

  const loadLoans = async () => {
    try {
      setIsLoading(true);
      const data = await getMyLoans();
      setLoans(data);
    } catch (err) {
      console.error('[LoansPage] Error loading loans:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLoans = loans.filter(loan => {
    if (filter === 'lender') return !loan.isITheBorrower;
    if (filter === 'borrower') return loan.isITheBorrower;
    return true;
  });

  const activeLoans = loans.filter(l => l.status !== 'closed');
  const totalLent = loans
    .filter(l => !l.isITheBorrower && l.status !== 'closed')
    .reduce((sum, l) => sum + l.remainingBalance, 0);
  const totalBorrowed = loans
    .filter(l => l.isITheBorrower && l.status !== 'closed')
    .reduce((sum, l) => sum + l.remainingBalance, 0);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'late': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'closed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Actif';
      case 'late': return 'En retard';
      case 'closed': return 'Remboursé';
      case 'pending': return 'En attente';
      default: return status;
    }
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 pb-20">
        <div className="p-4">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement des prêts...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/family')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <HandCoins className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Prêts Familiaux</h1>
                <p className="text-sm text-gray-600">Gérez vos prêts entre membres</p>
              </div>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              variant="primary"
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouveau prêt
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 text-center">
            <p className="text-xs text-gray-600 mb-1">Actifs</p>
            <p className="text-lg font-bold text-gray-900">{activeLoans.length}</p>
          </div>
          <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200 text-center">
            <p className="text-xs text-gray-600 mb-1">Prêté</p>
            <p className="text-sm font-bold text-gray-900">
              <CurrencyDisplay
                amount={totalLent}
                originalCurrency="MGA"
                displayCurrency={displayCurrency}
                showConversion={false}
                size="sm"
              />
            </p>
          </div>
          <div className="card bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 text-center">
            <p className="text-xs text-gray-600 mb-1">Emprunté</p>
            <p className="text-sm font-bold text-gray-900">
              <CurrencyDisplay
                amount={totalBorrowed}
                originalCurrency="MGA"
                displayCurrency={displayCurrency}
                showConversion={false}
                size="sm"
              />
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {(['all', 'lender', 'borrower'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f 
                  ? 'bg-orange-600 text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {f === 'all' ? 'Tous' : f === 'lender' ? 'Prêtés' : 'Empruntés'}
            </button>
          ))}
        </div>

        {/* Loans List */}
        {filteredLoans.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <HandCoins className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun prêt</h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all' 
                ? "Vous n'avez pas encore de prêts enregistrés." 
                : filter === 'lender' 
                  ? "Vous n'avez pas de prêts en cours."
                  : "Vous n'avez pas d'emprunts en cours."
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLoans.map(loan => {
              const isExpanded = selectedLoanId === loan.id;
              const loanName = loan.isITheBorrower 
                ? `Emprunté à ${loan.lenderName}` 
                : `Prêté à ${loan.borrowerName}`;

              return (
                <div key={loan.id}>
                  <div
                    onClick={() => setSelectedLoanId(isExpanded ? null : loan.id)}
                    className="card hover:shadow-lg transition-shadow cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          loan.isITheBorrower ? 'bg-orange-100' : 'bg-green-100'
                        }`}>
                          <Users className={`w-5 h-5 ${
                            loan.isITheBorrower ? 'text-orange-600' : 'text-green-600'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {loanName}
                          </p>
                          <div className="flex items-center space-x-2 mt-0.5">
                            {getStatusIcon(loan.status)}
                            <span className="text-xs text-gray-500">{getStatusLabel(loan.status)}</span>
                            {loan.description && (
                              <>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs text-gray-500 truncate">{loan.description}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${
                            loan.status === 'late' ? 'text-red-600' : 'text-gray-900'
                          }`}>
                            <CurrencyDisplay
                              amount={loan.remainingBalance}
                              originalCurrency={loan.currency || 'MGA'}
                              displayCurrency={displayCurrency}
                              showConversion={false}
                              size="sm"
                            />
                          </p>
                          <p className="text-xs text-gray-400">restant</p>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Expanded Section */}
                  {isExpanded && (
                    <div className="mt-2 card bg-gray-50">
                      <div className="p-4 space-y-3">
                        <Button
                          onClick={() => {
                            setSelectedLoan(loan);
                            setShowPaymentModal(true);
                          }}
                          variant="primary"
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          <Wallet className="w-4 h-4 mr-2" />
                          Enregistrer un paiement
                        </Button>
                        <RepaymentHistorySection
                          loanId={loan.id}
                          currency={loan.currency || 'MGA'}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Loan Modal */}
      <CreateLoanModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          loadLoans();
        }}
      />

      {/* Payment Modal */}
      {showPaymentModal && selectedLoan && (
        <PaymentModal
          loanId={selectedLoan.id}
          loanName={selectedLoan.isITheBorrower 
            ? `Emprunté à ${selectedLoan.lenderName}` 
            : `Prêté à ${selectedLoan.borrowerName}`
          }
          remainingBalance={selectedLoan.remainingBalance}
          currency={selectedLoan.currency || 'MGA'}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedLoan(null);
          }}
          onSuccess={() => {
            setShowPaymentModal(false);
            setSelectedLoan(null);
            loadLoans();
          }}
        />
      )}
    </div>
  );
};

export default LoansPage;
