/**
 * Page de gestion des prêts familiaux
 * Affiche les prêts actifs (prêteur et emprunteur) avec actions CRUD
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HandCoins, ArrowLeft, Plus, Clock, CheckCircle, AlertTriangle, 
  Users, Wallet, ChevronDown, Trash2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useCurrency } from '../hooks/useCurrency';
import { useAppStore } from '../stores/appStore';
import { 
  getMyLoans, 
  deleteLoan,
  getTotalUnpaidInterestByLoan,
  isPendingBorrowerConfirmation,
  confirmLoanAsBorrower
} from '../services/loanService';
import type { 
  Loan, 
  UnpaidInterestSummary
} from '../services/loanService';
import { CurrencyDisplay } from '../components/Currency';
import Button from '../components/UI/Button';
import ConfirmDialog from '../components/UI/ConfirmDialog';
import CreateLoanModal from '../components/Loans/CreateLoanModal';
import PaymentModal from '../components/Loans/PaymentModal';
import RepaymentHistorySection from '../components/Loans/RepaymentHistorySection';

const LoansPage = () => {
  const navigate = useNavigate();
  const { user } = useAppStore();
  const { displayCurrency } = useCurrency();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [unpaidInterestSummaries, setUnpaidInterestSummaries] = useState<UnpaidInterestSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'lender' | 'borrower'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [loanToDelete, setLoanToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadLoans();
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
              const unpaidInterestSummary = unpaidInterestSummaries.find(summary => summary.loanId === loan.id);

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
                            {isPendingBorrowerConfirmation(loan) && user?.id === loan.borrowerUserId && (
                              <>
                                <span className="text-xs text-gray-400">•</span>
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
                                  className="bg-green-600 text-white text-xs px-3 py-1 rounded-full font-medium mt-1"
                                >
                                  Confirmer ce prêt
                                </button>
                              </>
                            )}
                            {isPendingBorrowerConfirmation(loan) && user?.id !== loan.borrowerUserId && (
                              <>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-medium">
                                  En attente de confirmation emprunteur
                                </span>
                              </>
                            )}
                            {unpaidInterestSummary && (
                              <>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-medium whitespace-nowrap">
                                  ⚠️ Intérêts dus: {unpaidInterestSummary.totalUnpaid.toLocaleString('fr-FR')} {unpaidInterestSummary.currency === 'EUR' ? '€' : 'Ar'}
                                </span>
                              </>
                            )}
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
                          lenderUserId={loan.lenderUserId}
                        />
                        <button
                          onClick={() => setLoanToDelete(loan.id)}
                          className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors text-sm font-medium"
                        >
                          <Trash2 className="w-4 h-4" />
                          Supprimer ce prêt
                        </button>
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

      <ConfirmDialog
        isOpen={loanToDelete !== null}
        onClose={() => setLoanToDelete(null)}
        onConfirm={() => loanToDelete && handleDeleteLoan(loanToDelete)}
        title="Supprimer ce prêt ?"
        message="Cette action est irréversible. Le prêt et tout son historique de remboursements seront définitivement supprimés."
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="danger"
      />
    </div>
  );
};

export default LoansPage;
