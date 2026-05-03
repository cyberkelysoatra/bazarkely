/**
 * Page de gestion des prêts familiaux
 * Affiche les prêts actifs (prêteur et emprunteur) avec actions CRUD
 * Prêts regroupés par bénéficiaire avec présentation de détail alignée sur TransactionsPage
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HandCoins, ArrowLeft, Plus, Clock, CheckCircle, AlertTriangle,
  Users, ChevronDown, Trash2, X, Edit, Link2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useCurrency } from '../hooks/useCurrency';
import { useFormatBalance } from '../hooks/useFormatBalance';
import { useAppStore } from '../stores/appStore';
import {
  getMyLoans,
  deleteLoan,
  getTotalUnpaidInterestByLoan,
  isPendingBorrowerConfirmation,
  confirmLoanAsBorrower,
  mergeBeneficiaryGroups
} from '../services/loanService';
import type {
  LoanWithDetails as Loan,
  UnpaidInterestSummary,
  LoanStatus
} from '../services/loanService';
import { getExchangeRate } from '../services/exchangeRateService';
import { CurrencyDisplay } from '../components/Currency';
import Button from '../components/UI/Button';
import ConfirmDialog from '../components/UI/ConfirmDialog';
import PaymentModal from '../components/Loans/PaymentModal';
import RepaymentHistorySection from '../components/Loans/RepaymentHistorySection';
import MergeBeneficiariesDialog from '../components/Loans/MergeBeneficiariesDialog';

interface LoanGroup {
  key: string;
  beneficiaryName: string;
  isITheBorrower: boolean;
  worstStatus: LoanStatus;
  totalRemainingMGA: number;
  loans: Loan[];
}

const STATUS_PRIORITY: Record<LoanStatus, number> = {
  late: 4,
  pending: 3,
  active: 2,
  closed: 1
};

function groupLoansByBeneficiary(loans: Loan[], eurToMgaRate: number): LoanGroup[] {
  const groups = new Map<string, LoanGroup>();

  for (const loan of loans) {
    const otherUserId = loan.isITheBorrower ? loan.lenderUserId : loan.borrowerUserId;
    const otherName = loan.isITheBorrower
      ? (loan.lenderName || 'Prêteur')
      : loan.borrowerName;
    const otherPhone = loan.isITheBorrower ? '' : (loan.borrowerPhone || '');
    const direction = loan.isITheBorrower ? 'b' : 'l';
    const key = otherUserId
      ? `${direction}|uid|${otherUserId}`
      : `${direction}|name|${otherName}|${otherPhone}`;

    const remainingInMGA = loan.currency === 'EUR'
      ? loan.remainingBalance * eurToMgaRate
      : loan.remainingBalance;

    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        key,
        beneficiaryName: otherName,
        isITheBorrower: loan.isITheBorrower,
        worstStatus: loan.status,
        totalRemainingMGA: remainingInMGA,
        loans: [loan]
      });
    } else {
      existing.loans.push(loan);
      existing.totalRemainingMGA += remainingInMGA;
      if (STATUS_PRIORITY[loan.status] > STATUS_PRIORITY[existing.worstStatus]) {
        existing.worstStatus = loan.status;
      }
    }
  }

  return Array.from(groups.values());
}

const LoansPage = () => {
  const navigate = useNavigate();
  const { user } = useAppStore();
  const { displayCurrency } = useCurrency();
  const { formatBalance } = useFormatBalance();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [unpaidInterestSummaries, setUnpaidInterestSummaries] = useState<UnpaidInterestSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'lender' | 'borrower'>('all');
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [loanToDelete, setLoanToDelete] = useState<string | null>(null);
  const [eurToMgaRate, setEurToMgaRate] = useState<number>(4950);
  const [anchorKey, setAnchorKey] = useState<string | null>(null);
  const [selectedTargetKey, setSelectedTargetKey] = useState<string | null>(null);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadLoans();
  }, []);

  useEffect(() => {
    getExchangeRate('EUR', 'MGA')
      .then(r => setEurToMgaRate(r.rate))
      .catch(() => setEurToMgaRate(4950));
  }, []);

  useEffect(() => {
    const loadUnpaidInterestSummary = async () => {
      if (!user?.id) {
        return;
      }
      try {
        const summaries = await getTotalUnpaidInterestByLoan(user.id);
        setUnpaidInterestSummaries(summaries || []);
      } catch {
        setUnpaidInterestSummaries([]);
      }
    };

    loadUnpaidInterestSummary();
  }, [user?.id]);

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

  const handleDeleteLoan = async (id: string) => {
    const loan = loans.find(l => l.id === id);
    if (loan?.isITheBorrower === true) {
      toast('Seul le prêteur peut supprimer ce prêt', { icon: '🚫' });
      setLoanToDelete(null);
      return;
    }
    try {
      await deleteLoan(id);
      setLoans(prev => prev.filter(l => l.id !== id));
      toast.success('Prêt supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setLoanToDelete(null);
    }
  };

  const handleEditLoan = (loan: Loan) => {
    if (loan.transactionId) {
      navigate(`/transaction/${loan.transactionId}`, { state: { autoEdit: true } });
    } else {
      toast('Cette opération de prêt n\'a pas de transaction liée à éditer', { icon: 'ℹ️' });
    }
  };

  const exitAnchorMode = () => {
    setAnchorKey(null);
    setSelectedTargetKey(null);
  };

  const handleConfirmMerge = async () => {
    const anchorGroup = loanGroups.find(g => g.key === anchorKey);
    const targetGroup = loanGroups.find(g => g.key === selectedTargetKey);
    if (!anchorGroup || !targetGroup) return;

    const anchorLoan = anchorGroup.loans[0];
    const targetLoanIds = targetGroup.loans.map(l => l.id);
    const userIsBorrower = anchorGroup.isITheBorrower;

    const canonical = userIsBorrower
      ? {
          name: anchorLoan.lenderName || anchorGroup.beneficiaryName,
          userId: anchorLoan.lenderUserId || null,
          phone: '',
        }
      : {
          name: anchorLoan.borrowerName || anchorGroup.beneficiaryName,
          userId: anchorLoan.borrowerUserId || null,
          phone: anchorLoan.borrowerPhone || '',
        };

    try {
      await mergeBeneficiaryGroups(targetLoanIds, canonical, userIsBorrower);
      toast.success('Prêts fusionnés');
      exitAnchorMode();
      setShowMergeDialog(false);
      await loadLoans();
    } catch (error) {
      console.error('[LoansPage] Erreur fusion:', error);
      toast.error('Erreur lors de la fusion');
    }
  };

  const filteredLoans = loans.filter(loan => {
    if (filter === 'lender') return !loan.isITheBorrower;
    if (filter === 'borrower') return loan.isITheBorrower;
    return true;
  });

  const loanGroups = useMemo(
    () => groupLoansByBeneficiary(filteredLoans, eurToMgaRate),
    [filteredLoans, eurToMgaRate]
  );

  const activeLoans = loans.filter(l => l.status !== 'closed');
  const totalLent = loans
    .filter(l => !l.isITheBorrower && l.status !== 'closed')
    .reduce((sum, l) => sum + (l.currency === 'EUR' ? l.remainingBalance * eurToMgaRate : l.remainingBalance), 0);
  const totalBorrowed = loans
    .filter(l => l.isITheBorrower && l.status !== 'closed')
    .reduce((sum, l) => sum + (l.currency === 'EUR' ? l.remainingBalance * eurToMgaRate : l.remainingBalance), 0);

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

  if (isLoading) {
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
              onClick={() => navigate('/add-transaction?type=expense&category=loan')}
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

        {unpaidInterestSummaries.length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  {unpaidInterestSummaries.length} prêt(s) ont des intérêts dus ce mois
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Vérifiez les prêts concernés pour régulariser les périodes d&apos;intérêts impayées.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Anchor mode instructions banner */}
        {anchorKey !== null && (
          <div className="p-3 bg-purple-50 border border-purple-300 rounded-lg flex items-start gap-2">
            <Link2 className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-sm text-purple-900">
              {selectedTargetKey === null
                ? "Cochez le bénéficiaire à fusionner avec l'ancre, ou retoquez sur l'ancre pour annuler."
                : "Cliquez sur « Fusionner » pour confirmer."
              }
            </div>
            <button
              type="button"
              onClick={exitAnchorMode}
              className="text-xs px-2 py-1 rounded bg-white border border-purple-300 text-purple-700 hover:bg-purple-100 transition-colors flex-shrink-0"
            >
              Annuler
            </button>
          </div>
        )}

        {/* Discoverability hint when 2+ groups (only when not in anchor mode) */}
        {anchorKey === null && loanGroups.length >= 2 && (
          <p className="text-xs text-gray-500 italic">
            Astuce&nbsp;: appui long sur l'avatar d'un bénéficiaire pour fusionner deux groupes.
          </p>
        )}

        {/* Grouped Loans List */}
        {loanGroups.length === 0 ? (
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
            {loanGroups.map(group => {
              const isExpanded = expandedGroupKey === group.key && anchorKey === null;
              const groupLabel = group.isITheBorrower
                ? `Emprunté à ${group.beneficiaryName}`
                : `Prêté à ${group.beneficiaryName}`;
              const loanCountSuffix = group.loans.length > 1 ? ` (${group.loans.length})` : '';
              const isAnchor = anchorKey === group.key;
              const isInAnchorMode = anchorKey !== null;
              const isCheckable = isInAnchorMode && !isAnchor;
              const isSelectedTarget = selectedTargetKey === group.key;
              // Disable other checkboxes once one is selected (single-select)
              const checkboxDisabled = isCheckable && selectedTargetKey !== null && !isSelectedTarget;

              return (
                <div key={group.key}>
                  {/* Group Header */}
                  <div
                    onClick={() => {
                      // In anchor mode, body click does nothing
                      if (isInAnchorMode) return;
                      setExpandedGroupKey(isExpanded ? null : group.key);
                    }}
                    className={`card transition-shadow ${
                      isInAnchorMode ? '' : 'hover:shadow-lg cursor-pointer'
                    } ${isAnchor ? 'ring-2 ring-purple-500' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {isCheckable ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (checkboxDisabled) return;
                              setSelectedTargetKey(isSelectedTarget ? null : group.key);
                            }}
                            disabled={checkboxDisabled}
                            className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors ${
                              isSelectedTarget
                                ? 'bg-purple-600 border-purple-600'
                                : checkboxDisabled
                                  ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-50'
                                  : 'bg-white border-purple-400 hover:bg-purple-50'
                            }`}
                            aria-label={isSelectedTarget ? 'Décocher' : 'Cocher pour fusionner'}
                          >
                            {isSelectedTarget && <CheckCircle className="w-5 h-5 text-white" />}
                          </button>
                        ) : (
                          <div
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              // Need at least 2 groups to merge
                              if (loanGroups.length < 2) return;
                              if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
                              longPressTimerRef.current = setTimeout(() => {
                                setAnchorKey(group.key);
                                setSelectedTargetKey(null);
                                setExpandedGroupKey(null);
                              }, 500);
                            }}
                            onPointerUp={(e) => {
                              e.stopPropagation();
                              if (longPressTimerRef.current) {
                                clearTimeout(longPressTimerRef.current);
                                longPressTimerRef.current = null;
                              }
                              // Tap on anchor avatar exits anchor mode
                              if (isAnchor) {
                                setAnchorKey(null);
                                setSelectedTargetKey(null);
                              }
                            }}
                            onPointerCancel={() => {
                              if (longPressTimerRef.current) {
                                clearTimeout(longPressTimerRef.current);
                                longPressTimerRef.current = null;
                              }
                            }}
                            onPointerLeave={() => {
                              if (longPressTimerRef.current) {
                                clearTimeout(longPressTimerRef.current);
                                longPressTimerRef.current = null;
                              }
                            }}
                            onContextMenu={(e) => e.preventDefault()}
                            className={`w-10 h-10 rounded-full flex items-center justify-center select-none ${
                              group.isITheBorrower ? 'bg-orange-100' : 'bg-green-100'
                            } ${isAnchor ? 'ring-2 ring-purple-500 ring-offset-2 animate-pulse' : ''}`}
                            style={{ touchAction: 'none' }}
                          >
                            <Users className={`w-5 h-5 ${
                              group.isITheBorrower ? 'text-orange-600' : 'text-green-600'
                            }`} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {groupLabel}{loanCountSuffix}
                          </p>
                          <div className="flex items-center space-x-2 mt-0.5">
                            {getStatusIcon(group.worstStatus)}
                            <span className="text-xs text-gray-500">{getStatusLabel(group.worstStatus)}</span>
                            {isAnchor && (
                              <>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs text-purple-600 font-medium">Ancre</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {isSelectedTarget ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMergeDialog(true);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                          >
                            <Link2 className="w-3.5 h-3.5" />
                            Fusionner
                          </button>
                        ) : (
                          <>
                            <div className="text-right">
                              <p className={`text-sm font-semibold ${
                                group.worstStatus === 'late' ? 'text-red-600' : 'text-gray-900'
                              }`}>
                                <CurrencyDisplay
                                  amount={group.totalRemainingMGA}
                                  originalCurrency="MGA"
                                  displayCurrency={displayCurrency}
                                  showConversion={false}
                                  size="sm"
                                />
                              </p>
                              <p className="text-xs text-gray-400">restant</p>
                            </div>
                            {!isInAnchorMode && (
                              <ChevronDown
                                className={`w-4 h-4 text-gray-400 transition-transform ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                              />
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Section: detail panel per loan */}
                  {isExpanded && (
                    <div className="mt-2 space-y-2">
                      {group.loans.map(loan => {
                        const loanLabel = loan.isITheBorrower
                          ? `Emprunté à ${loan.lenderName || 'Prêteur'}`
                          : `Prêté à ${loan.borrowerName}`;
                        const unpaidInterestSummary = unpaidInterestSummaries.find(s => s.loanId === loan.id);
                        const totalRepaidInLoanCurrency = loan.totalRepaid;
                        const remainingInLoanCurrency = loan.remainingBalance;
                        const initialAmount = loan.amountInitial;
                        const repaidPct = initialAmount > 0
                          ? Math.min((totalRepaidInLoanCurrency / initialAmount) * 100, 100)
                          : 0;
                        const formatLoanAmount = (amount: number) => {
                          if (loan.currency === 'EUR') {
                            return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
                          }
                          return formatBalance(amount);
                        };

                        return (
                          <div
                            key={loan.id}
                            className="card bg-gradient-to-br from-purple-50/80 to-white border-purple-100 backdrop-blur-sm"
                          >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <h5 className="text-sm font-semibold text-purple-700 truncate">
                                  {loanLabel}
                                </h5>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {getStatusIcon(loan.status)}
                                  <span className="text-xs text-gray-500">{getStatusLabel(loan.status)}</span>
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedGroupKey(null);
                                }}
                                className="p-1 rounded hover:bg-purple-100 transition-colors flex-shrink-0"
                                title="Fermer"
                              >
                                <X className="w-4 h-4 text-purple-600" />
                              </button>
                            </div>

                            {/* Pending borrower confirmation actions */}
                            {isPendingBorrowerConfirmation(loan) && user?.id === loan.borrowerUserId && (
                              <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-medium animate-pulse">
                                    ATTENTE CONFIRMATION
                                  </span>
                                  <button
                                    type="button"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        await confirmLoanAsBorrower(loan.id);
                                        toast.success('Prêt confirmé');
                                        loadLoans();
                                      } catch {
                                        toast.error('Erreur lors de la confirmation');
                                      }
                                    }}
                                    className="bg-green-600 text-white text-xs px-3 py-1 rounded-full font-medium"
                                  >
                                    Confirmer ce prêt
                                  </button>
                                </div>
                              </div>
                            )}
                            {isPendingBorrowerConfirmation(loan) && user?.id !== loan.borrowerUserId && (
                              <div className="mb-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                                <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-medium">
                                  En attente de confirmation emprunteur
                                </span>
                              </div>
                            )}

                            {/* Montant card with progress bar */}
                            <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                              <div className="bg-white/80 rounded-lg p-2 col-span-2">
                                <p className="text-gray-500 text-xs">Montant</p>
                                <div className="mt-1">
                                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                                    <span>Remboursé: {formatLoanAmount(totalRepaidInLoanCurrency)}</span>
                                    <span>Restant: {formatLoanAmount(remainingInLoanCurrency)}</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                      className="bg-green-500 h-3 rounded-full transition-all duration-500"
                                      style={{ width: `${repaidPct}%` }}
                                    />
                                  </div>
                                  <div className="text-center text-xs font-semibold text-green-700 mt-1">
                                    {repaidPct.toFixed(1)}% remboursé
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Notes card */}
                            <div className="space-y-2 text-sm">
                              <div className="bg-white/80 rounded-lg p-2">
                                <p className="text-gray-500 text-xs">Notes</p>
                                <p className="text-gray-800">{loan.description || 'Aucune note'}</p>
                              </div>

                              {/* Informations prêt + Intérêts dus */}
                              <div className="bg-purple-100/70 rounded-lg p-2 border border-purple-200">
                                <div className="flex justify-between items-start gap-4">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-purple-700 text-xs font-medium">Informations prêt</p>
                                    <p className="text-purple-800 text-xs">
                                      Catégorie: {loan.isITheBorrower ? 'emprunt' : 'prêt'}
                                    </p>
                                    <p className="text-purple-800 text-xs">
                                      Devise: {loan.currency}
                                    </p>
                                    {loan.dueDate && (
                                      <p className="text-purple-800 text-xs">
                                        Échéance: {new Date(loan.dueDate).toLocaleDateString('fr-FR')}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex-1 text-right">
                                    {unpaidInterestSummary ? (
                                      <>
                                        <p className="text-amber-700 text-xs font-medium">Intérêts dus</p>
                                        <p className="text-amber-800 text-xs font-semibold">
                                          ⚠️ {unpaidInterestSummary.totalUnpaid.toLocaleString('fr-FR')} {unpaidInterestSummary.currency === 'EUR' ? '€' : 'Ar'}
                                        </p>
                                      </>
                                    ) : (
                                      <>
                                        <p className="text-purple-700 text-xs font-medium">Taux</p>
                                        <p className="text-purple-800 text-xs">
                                          {loan.interestRate}% / {loan.interestFrequency === 'monthly' ? 'mois' : loan.interestFrequency === 'weekly' ? 'sem.' : 'jour'}
                                        </p>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Repayment history (collapsible) */}
                            <RepaymentHistorySection
                              loanId={loan.id}
                              currency={loan.currency || 'MGA'}
                              lenderUserId={loan.lenderUserId}
                            />

                            {/* Actions row */}
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-purple-100 gap-2 flex-wrap">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLoan(loan);
                                  setShowPaymentModal(true);
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                              >
                                💸 Rembourser
                              </button>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditLoan(loan);
                                  }}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  Modifier
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLoanToDelete(loan.id);
                                  }}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Supprimer
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedLoan && (
        <PaymentModal
          loanId={selectedLoan.id}
          loanName={selectedLoan.isITheBorrower
            ? `Emprunté à ${selectedLoan.lenderName || 'Prêteur'}`
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

      <ConfirmDialog
        isOpen={loanToDelete !== null}
        onClose={() => setLoanToDelete(null)}
        onConfirm={() => { if (loanToDelete) handleDeleteLoan(loanToDelete); }}
        title="Supprimer ce prêt ?"
        message="Cette action est irréversible. Le prêt et tout son historique de remboursements seront définitivement supprimés."
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="danger"
      />

      {/* Merge dialog */}
      {showMergeDialog && anchorKey && selectedTargetKey && (() => {
        const anchorGroup = loanGroups.find(g => g.key === anchorKey);
        const targetGroup = loanGroups.find(g => g.key === selectedTargetKey);
        if (!anchorGroup || !targetGroup) return null;
        const anchorLoan = anchorGroup.loans[0];
        const targetLoan = targetGroup.loans[0];
        const userIsBorrower = anchorGroup.isITheBorrower;
        const anchorIdentity = userIsBorrower
          ? {
              name: anchorLoan.lenderName || anchorGroup.beneficiaryName,
              userId: anchorLoan.lenderUserId || null,
              phone: '',
            }
          : {
              name: anchorLoan.borrowerName || anchorGroup.beneficiaryName,
              userId: anchorLoan.borrowerUserId || null,
              phone: anchorLoan.borrowerPhone || '',
            };
        const targetIdentity = userIsBorrower
          ? {
              name: targetLoan.lenderName || targetGroup.beneficiaryName,
              userId: targetLoan.lenderUserId || null,
              phone: '',
              loanCount: targetGroup.loans.length,
            }
          : {
              name: targetLoan.borrowerName || targetGroup.beneficiaryName,
              userId: targetLoan.borrowerUserId || null,
              phone: targetLoan.borrowerPhone || '',
              loanCount: targetGroup.loans.length,
            };
        return (
          <MergeBeneficiariesDialog
            isOpen={showMergeDialog}
            anchor={anchorIdentity}
            target={targetIdentity}
            onClose={() => setShowMergeDialog(false)}
            onConfirm={handleConfirmMerge}
          />
        );
      })()}
    </div>
  );
};

export default LoansPage;
