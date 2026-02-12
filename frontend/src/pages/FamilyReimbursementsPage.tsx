/**
 * Page des remboursements en attente pour l'Espace Famille
 * Affiche les remboursements où l'utilisateur est créancier ou débiteur
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, RefreshCw, CheckCircle, Clock, User, ArrowRight, 
  TrendingUp, TrendingDown, Settings, Wallet
} from 'lucide-react';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { useFamily } from '../contexts/FamilyContext';
import { 
  getMemberBalances, 
  getPendingReimbursements, 
  markAsReimbursed,
  type FamilyMemberBalance,
  type ReimbursementWithDetails
} from '../services/reimbursementService';
import { CurrencyDisplay } from '../components/Currency';
import { useCurrency } from '../hooks/useCurrency';
import ConfirmDialog from '../components/UI/ConfirmDialog';
import { toast } from 'react-hot-toast';
import { useFamilyRealtime } from '../hooks/useFamilyRealtime';
import ReimbursementPaymentModal, { type PendingDebt } from '../components/Family/ReimbursementPaymentModal';

const FamilyReimbursementsPage = () => {
  const navigate = useNavigate();
  const { isLoading: isAuthLoading, isAuthenticated, user } = useRequireAuth();
  const { activeFamilyGroup, loading: familyLoading } = useFamily();
  const { displayCurrency } = useCurrency();
  const { subscribeToReimbursements } = useFamilyRealtime();

  const [balances, setBalances] = useState<FamilyMemberBalance[]>([]);
  const [pendingReimbursements, setPendingReimbursements] = useState<ReimbursementWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    reimbursementId: string | null;
  }>({ isOpen: false, reimbursementId: null });

  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    debtorMemberId: string | null;
    debtorName: string;
  }>({ isOpen: false, debtorMemberId: null, debtorName: '' });

  // Fonction pour charger les données
  const loadData = useCallback(async () => {
    if (!isAuthenticated || !user || !activeFamilyGroup || familyLoading) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Charger les soldes des membres
      const memberBalances = await getMemberBalances(activeFamilyGroup.id);
      setBalances(memberBalances);

      // Trouver le member_id de l'utilisateur actuel
      const currentMember = memberBalances.find(b => b.userId === user.id);
      if (currentMember) {
        setCurrentMemberId(currentMember.memberId);
      }

      console.log('[REIMBURSEMENTS DEBUG]', {
        userId: user?.id,
        memberBalancesCount: memberBalances.length,
        memberBalances: memberBalances.map(b => ({ userId: b.userId, memberId: b.memberId, name: b.displayName })),
        currentMemberFound: currentMember ? { userId: currentMember.userId, memberId: currentMember.memberId } : null,
        currentMemberIdSet: currentMember?.memberId || null
      });

      // Charger les remboursements en attente
      const reimbursements = await getPendingReimbursements(activeFamilyGroup.id);
      setPendingReimbursements(reimbursements);
    } catch (err: any) {
      console.error('Erreur lors du chargement des remboursements:', err);
      setError(err.message || 'Erreur lors du chargement des remboursements');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, activeFamilyGroup, familyLoading]);

  // Charger les données au montage
  useEffect(() => {
    loadData();
  }, [isAuthenticated, user, activeFamilyGroup, familyLoading]);

  // Abonnement realtime pour les demandes de remboursement
  useEffect(() => {
    if (!activeFamilyGroup?.id) {
      return;
    }

    const unsubscribe = subscribeToReimbursements(
      activeFamilyGroup.id,
      (payload) => {
        const eventType = payload.eventType;
        console.log('[Reimbursements] Realtime event:', eventType);
        
        // Refetch les données pour refléter les changements
        loadData();
      }
    );

    // Cleanup: se désabonner quand le groupe change ou le composant se démonte
    return () => {
      unsubscribe();
    };
  }, [activeFamilyGroup?.id, subscribeToReimbursements, loadData]);

  // Calculer les totaux
  const currentMemberBalance = balances.find(b => b.memberId === currentMemberId);
  const totalPendingToReceive = currentMemberBalance?.pendingToReceive || 0;
  const totalPendingToPay = currentMemberBalance?.pendingToPay || 0;

  console.log('[FILTER DEBUG]', {
    currentMemberId,
    pendingReimbursementsCount: pendingReimbursements.length,
    sampleItems: pendingReimbursements.slice(0, 3).map(r => ({
      id: r.id,
      requestedBy: r.requestedBy,
      requestedFrom: r.requestedFrom,
      toMemberName: r.toMemberName,
      fromMemberName: r.fromMemberName
    }))
  });

  // Filtrer les remboursements avec useMemo pour éviter les problèmes de timing
  // "On me doit" = je suis le créancier (to_member_id mappé vers requestedBy)
  const reimbursementsOwedToMe = useMemo(() => {
    if (!currentMemberId) {
      console.log('[FILTER OwedToMe] No currentMemberId, returning empty array');
      return [];
    }
    const filtered = pendingReimbursements.filter(
      r => r.toMemberName && r.requestedBy === currentMemberId
    );
    console.log('[FILTER OwedToMe] currentMemberId:', currentMemberId, '| Found:', filtered.length, 'items');
    return filtered;
  }, [pendingReimbursements, currentMemberId]);

  // "Je dois" = je suis le débiteur (from_member_id mappé vers requestedFrom)
  const reimbursementsIOwe = useMemo(() => {
    if (!currentMemberId) {
      console.log('[FILTER IOwe] No currentMemberId, returning empty array');
      return [];
    }
    const filtered = pendingReimbursements.filter(
      r => r.fromMemberName && r.requestedFrom === currentMemberId
    );
    console.log('[FILTER IOwe] currentMemberId:', currentMemberId, '| Found:', filtered.length, 'items');
    return filtered;
  }, [pendingReimbursements, currentMemberId]);

  // Unique debtors in "On me doit" (group by requestedFrom) for one payment button per debtor
  const uniqueDebtorsOwedToMe = useMemo(() => {
    const byDebtor = new Map<string, { debtorMemberId: string; debtorName: string; items: ReimbursementWithDetails[] }>();
    for (const r of reimbursementsOwedToMe) {
      const id = r.requestedFrom;
      if (!id) continue;
      const existing = byDebtor.get(id);
      if (existing) {
        existing.items.push(r);
      } else {
        byDebtor.set(id, {
          debtorMemberId: id,
          debtorName: r.fromMemberName || 'Membre',
          items: [r]
        });
      }
    }
    return Array.from(byDebtor.values());
  }, [reimbursementsOwedToMe]);

  // Convert ReimbursementWithDetails to PendingDebt for the payment modal
  const toPendingDebts = (items: ReimbursementWithDetails[]): PendingDebt[] =>
    items.map((r) => {
      const row = r as ReimbursementWithDetails & { currency?: string; description?: string; familySharedTransactionId?: string };
      return {
        reimbursementId: r.id,
        amount: r.amount,
        currency: row.currency || 'MGA',
        description: r.transactionDescription || row.description || 'Transaction sans description',
        date: r.transactionDate ? new Date(r.transactionDate) : new Date(),
        transactionId: row.familySharedTransactionId || r.id
      };
    });

  const handleOpenPaymentModal = (debtorMemberId: string, debtorName: string) => {
    const debtorGroup = uniqueDebtorsOwedToMe.find((d) => d.debtorMemberId === debtorMemberId);
    if (!debtorGroup || debtorGroup.items.length === 0) return;
    setPaymentModal({
      isOpen: true,
      debtorMemberId,
      debtorName
    });
  };

  const handleClosePaymentModal = () => {
    setPaymentModal({ isOpen: false, debtorMemberId: null, debtorName: '' });
  };

  const handlePaymentRecorded = () => {
    loadData();
    toast.success('Paiement enregistré');
    handleClosePaymentModal();
  };

  // Gérer le marquage comme remboursé
  const handleMarkAsReimbursed = async () => {
    if (!confirmDialog.reimbursementId || !user) {
      return;
    }

    try {
      await markAsReimbursed(confirmDialog.reimbursementId, user.id);
      toast.success('Remboursement marqué comme réglé');
      
      // Recharger les données
      if (activeFamilyGroup) {
        const memberBalances = await getMemberBalances(activeFamilyGroup.id);
        setBalances(memberBalances);
        
        const reimbursements = await getPendingReimbursements(activeFamilyGroup.id);
        setPendingReimbursements(reimbursements);
      }

      setConfirmDialog({ isOpen: false, reimbursementId: null });
    } catch (err: any) {
      console.error('Erreur lors du marquage comme remboursé:', err);
      toast.error(err.message || 'Erreur lors du marquage comme remboursé');
    }
  };

  // État de chargement de l'authentification
  if (isAuthLoading || familyLoading) {
    return (
      <div className="min-h-screen bg-slate-50 pb-20">
        <div className="p-4">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // État d'erreur
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 pb-20">
        <div className="p-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800 mb-4">{error}</p>
            <button
              onClick={loadData}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Réessayer</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // État vide - pas de groupe
  if (!activeFamilyGroup) {
    return (
      <div className="min-h-screen bg-slate-50 pb-20">
        <div className="p-4">
          <div className="max-w-md mx-auto mt-12 text-center">
            <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-12 h-12 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Aucun groupe familial
            </h2>
            <p className="text-gray-600 mb-8">
              Vous devez être membre d'un groupe familial pour voir les remboursements.
            </p>
            <button
              onClick={() => navigate('/family')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            >
              Retour au tableau de bord
            </button>
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
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/family')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Remboursements en attente</h1>
              <p className="text-sm text-gray-600">Gérez vos remboursements familiaux</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">On me doit</p>
                <div className="text-lg font-bold text-green-600">
                  <CurrencyDisplay
                    amount={totalPendingToReceive}
                    originalCurrency="MGA"
                    displayCurrency={displayCurrency}
                    showConversion={true}
                    size="lg"
                  />
                </div>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="card bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">Je dois</p>
                <div className="text-lg font-bold text-red-600">
                  <CurrencyDisplay
                    amount={totalPendingToPay}
                    originalCurrency="MGA"
                    displayCurrency={displayCurrency}
                    showConversion={true}
                    size="lg"
                  />
                </div>
              </div>
              <TrendingDown className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement des remboursements...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && reimbursementsOwedToMe.length === 0 && reimbursementsIOwe.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-purple-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun remboursement en attente</h3>
            <p className="text-gray-600 mb-4">
              Tous vos remboursements sont à jour.
            </p>
            <button
              onClick={() => navigate('/family')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            >
              Retour au tableau de bord
            </button>
          </div>
        )}

        {/* Section 1: On me doit */}
        {!isLoading && reimbursementsOwedToMe.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span>On me doit</span>
            </h2>
            {uniqueDebtorsOwedToMe.map(({ debtorMemberId, debtorName, items }) => (
              <div key={debtorMemberId} className="space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="font-medium text-gray-700">{debtorName}</p>
                  <button
                    type="button"
                    onClick={() => handleOpenPaymentModal(debtorMemberId, debtorName)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>Enregistrer paiement</span>
                  </button>
                </div>
                <div className="space-y-3">
                  {items.map((reimbursement) => (
                <div
                  key={reimbursement.id}
                  className="card hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <p className="font-medium text-gray-900">
                          {reimbursement.fromMemberName}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        {reimbursement.transactionDescription || 'Transaction sans description'}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>
                          {reimbursement.transactionDate
                            ? new Date(reimbursement.transactionDate).toLocaleDateString('fr-FR')
                            : 'Date inconnue'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-lg font-bold text-green-600 mb-1">
                        <CurrencyDisplay
                          amount={reimbursement.amount}
                          originalCurrency={reimbursement.currency || 'MGA'}
                          displayCurrency={displayCurrency}
                          showConversion={true}
                          size="md"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mb-2">
                        Taux: {(reimbursement.reimbursementRate ?? 100)}%
                      </p>
                      <button
                        onClick={() => setConfirmDialog({ isOpen: true, reimbursementId: reimbursement.id })}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Marquer remboursé</span>
                      </button>
                    </div>
                  </div>
                </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Section 2: Je dois */}
        {!isLoading && reimbursementsIOwe.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              <span>Je dois</span>
            </h2>
            <div className="space-y-3">
              {reimbursementsIOwe.map((reimbursement) => (
                <div
                  key={reimbursement.id}
                  className="card hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <p className="font-medium text-gray-900">
                          {reimbursement.toMemberName}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        {reimbursement.transactionDescription || 'Transaction sans description'}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>
                          {reimbursement.transactionDate
                            ? new Date(reimbursement.transactionDate).toLocaleDateString('fr-FR')
                            : 'Date inconnue'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-lg font-bold text-red-600 mb-1">
                        <CurrencyDisplay
                          amount={reimbursement.amount}
                          originalCurrency={reimbursement.currency || 'MGA'}
                          displayCurrency={displayCurrency}
                          showConversion={true}
                          size="md"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mb-2">
                        Taux: {(reimbursement.reimbursementRate ?? 100)}%
                      </p>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>En attente de confirmation</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Link */}
        <div className="mt-8 mb-4 flex justify-center">
          <button
            onClick={() => navigate('/family/settings')}
            className="flex items-center gap-2 text-purple-600 hover:text-purple-800 transition-colors px-4 py-2 rounded-lg hover:bg-purple-50"
          >
            <Settings className="w-5 h-5" />
            <span className="text-sm font-medium">Paramètres de remboursement</span>
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {paymentModal.debtorMemberId && activeFamilyGroup && (
        <ReimbursementPaymentModal
          isOpen={paymentModal.isOpen}
          onClose={handleClosePaymentModal}
          debtorMemberId={paymentModal.debtorMemberId}
          debtorName={paymentModal.debtorName}
          familyGroupId={activeFamilyGroup.id}
          pendingDebts={toPendingDebts(
            uniqueDebtorsOwedToMe.find((d) => d.debtorMemberId === paymentModal.debtorMemberId)?.items ?? []
          )}
          onPaymentRecorded={handlePaymentRecorded}
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, reimbursementId: null })}
        onConfirm={handleMarkAsReimbursed}
        title="Marquer comme remboursé"
        message="Êtes-vous sûr de vouloir marquer ce remboursement comme réglé ? Cette action est irréversible."
        confirmText="Confirmer"
        cancelText="Annuler"
        variant="success"
      />
    </div>
  );
};

export default FamilyReimbursementsPage;

