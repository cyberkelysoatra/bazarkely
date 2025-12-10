/**
 * Page de tableau de bord de l'Espace Famille
 * Affiche l'aperçu du groupe familial, les membres, et les transactions récentes
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Plus, Copy, Share2, Receipt, ArrowRightLeft, UserPlus, Crown,
  TrendingDown, Calendar, Clock, CheckCircle, XCircle, RefreshCw, Wallet
} from 'lucide-react';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { useCurrency } from '../hooks/useCurrency';
import { useSyncStore } from '../stores/appStore';
import { supabase } from '../lib/supabase';
import * as familyGroupService from '../services/familyGroupService';
import * as familySharingService from '../services/familySharingService';
import type { 
  FamilyGroup, 
  FamilyMember, 
  FamilySharedTransaction,
  FamilyDashboardStats
} from '../types/family';
import { CurrencyDisplay } from '../components/Currency';
import { CreateFamilyModal, JoinFamilyModal } from '../components/Family';
import { OfflineAlert } from '../components/UI/Alert';

const FamilyDashboardPage = () => {
  const navigate = useNavigate();
  const { isLoading: isAuthLoading, isAuthenticated, user } = useRequireAuth();
  const { displayCurrency } = useCurrency();
  const { isOnline } = useSyncStore();
  const currencySymbol = displayCurrency === 'EUR' ? '€' : 'Ar';

  const [familyGroups, setFamilyGroups] = useState<Array<FamilyGroup & { memberCount: number; inviteCode: string }>>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<FamilySharedTransaction[]>([]);
  const [stats, setStats] = useState({
    totalExpensesThisMonth: 0,
    memberCount: 0,
    pendingRequestsCount: 0,
    pendingAmount: 0,
    netBalance: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  // Fonction pour charger les groupes familiaux
  const loadFamilyGroups = async () => {
    if (!isAuthenticated || !user) return;

    try {
      setIsLoading(true);
      setError(null);
      const groups = await familyGroupService.getUserFamilyGroups();
      setFamilyGroups(groups);
      
      if (groups.length > 0 && !selectedGroupId) {
        setSelectedGroupId(groups[0].id);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des groupes:', err);
      setError('Erreur lors du chargement des groupes familiaux');
    } finally {
      setIsLoading(false);
    }
  };

  // Charger les groupes familiaux - attendre que l'auth soit vérifiée
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      loadFamilyGroups();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading, isAuthenticated, user]);

  // Charger les données du groupe sélectionné - attendre que l'auth soit vérifiée
  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) return;
    
    const loadGroupData = async () => {
      if (!selectedGroupId || !user) return;

      try {
        // Charger les membres
        const groupMembers = await familyGroupService.getFamilyGroupMembers(selectedGroupId);
        setMembers(groupMembers);

        // Charger les transactions récentes (10 dernières pour l'affichage)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const sharedTransactions = await familySharingService.getFamilySharedTransactions(
          selectedGroupId,
          { limit: 10 }
        );
        setRecentTransactions(sharedTransactions);

        // Charger toutes les transactions pour le calcul des dépenses (sans limite)
        // Note: Le service filtre par shared_at, mais nous filtrons ensuite par date de transaction
        const allTransactions = await familySharingService.getFamilySharedTransactions(
          selectedGroupId
        );

        // Calculer les statistiques - filtrer par mois/année et utiliser Math.abs
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        // Calculer le total des dépenses pour le mois en cours
        const totalExpenses = allTransactions
          .filter(t => {
            const txDate = new Date(t.date);
            const isExpense = t.transaction?.type === 'expense' || (!t.transaction?.type && (t.amount || 0) < 0);
            return txDate.getMonth() === currentMonth && 
                   txDate.getFullYear() === currentYear && 
                   isExpense;
          })
          .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

        // Calculer le total des revenus pour le mois en cours
        const totalIncome = allTransactions
          .filter(t => {
            const txDate = new Date(t.date);
            const isIncome = t.transaction?.type === 'income' || (!t.transaction?.type && (t.amount || 0) > 0);
            return txDate.getMonth() === currentMonth && 
                   txDate.getFullYear() === currentYear && 
                   isIncome;
          })
          .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

        // Calculer les demandes de remboursement en attente depuis les transactions partagées
        // Le montant est dans la table transactions liée
        const { data: rawTransactions, error: rawError } = await supabase
          .from('family_shared_transactions')
          .select(`
            id,
            has_reimbursement_request,
            transactions (
              amount
            )
          `)
          .eq('family_group_id', selectedGroupId)
          .eq('has_reimbursement_request', true);

        if (rawError) {
          console.error('Erreur lors de la récupération des transactions avec demande:', rawError);
        }

        // Calculer le nombre et le montant total des demandes en attente
        const pendingCount = rawTransactions?.length || 0;
        const pendingAmount = rawTransactions?.reduce((sum: number, t: any) => {
          const amount = t.transactions?.amount || 0;
          return sum + Math.abs(amount);
        }, 0) || 0;

        // Calculer le solde net = revenus - dépenses
        const netBalance = totalIncome - totalExpenses;

        setStats({
          totalExpensesThisMonth: totalExpenses,
          memberCount: groupMembers.length,
          pendingRequestsCount: pendingCount,
          pendingAmount: pendingAmount,
          netBalance
        });
      } catch (err) {
        console.error('Erreur lors du chargement des données du groupe:', err);
        setError('Erreur lors du chargement des données');
      }
    };

    loadGroupData();
  }, [isAuthLoading, isAuthenticated, selectedGroupId, user]);

  const handleCopyInviteCode = async () => {
    const selectedGroup = familyGroups.find(g => g.id === selectedGroupId);
    if (!selectedGroup?.inviteCode) return;

    try {
      await navigator.clipboard.writeText(selectedGroup.inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
    }
  };

  const selectedGroup = familyGroups.find(g => g.id === selectedGroupId);

  // État de chargement de l'authentification
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 pb-20">
        <div className="p-4">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Vérification de l'authentification...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // État de chargement des données
  if (isLoading) {
    return (
      <>
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
        {/* Create Family Modal - Always rendered */}
        <CreateFamilyModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={async () => {
            await loadFamilyGroups();
            setIsCreateModalOpen(false);
          }}
        />
        {/* Join Family Modal - Always rendered */}
        <JoinFamilyModal
          isOpen={isJoinModalOpen}
          onClose={() => setIsJoinModalOpen(false)}
          onSuccess={async () => {
            await loadFamilyGroups();
            setIsJoinModalOpen(false);
          }}
        />
      </>
    );
  }

  // État d'erreur
  if (error) {
    return (
      <>
        <div className="min-h-screen bg-slate-50 pb-20">
          <div className="p-4">
            {!isOnline ? (
              <OfflineAlert onRetry={() => loadFamilyGroups()} />
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 mb-4">Impossible de charger vos groupes familiaux</p>
                <button
                  onClick={() => loadFamilyGroups()}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Réessayer</span>
                </button>
              </div>
            )}
          </div>
        </div>
        {/* Create Family Modal - Always rendered */}
        <CreateFamilyModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={async () => {
            await loadFamilyGroups();
            setIsCreateModalOpen(false);
          }}
        />
        {/* Join Family Modal - Always rendered */}
        <JoinFamilyModal
          isOpen={isJoinModalOpen}
          onClose={() => setIsJoinModalOpen(false)}
          onSuccess={async () => {
            await loadFamilyGroups();
            setIsJoinModalOpen(false);
          }}
        />
      </>
    );
  }

  // État vide - pas de groupes
  if (familyGroups.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 pb-20">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Espace Famille</h1>
                  <p className="text-sm text-gray-600">Gérez vos dépenses partagées</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="p-4">
          <div className="max-w-md mx-auto mt-12 text-center">
            <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-12 h-12 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Créez votre premier groupe familial
            </h2>
            <p className="text-gray-600 mb-8">
              Partagez vos dépenses avec votre famille et suivez les remboursements facilement.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-primary flex items-center justify-center space-x-2 mx-auto mb-4"
            >
              <Plus className="w-5 h-5" />
              <span>Créer un groupe</span>
            </button>
            <div className="mt-8 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-4">Ou rejoignez un groupe existant</p>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Code d'invitation"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                <button
                  onClick={() => setIsJoinModalOpen(true)}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Rejoindre</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* Create Family Modal - Always rendered */}
        <CreateFamilyModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={async () => {
            await loadFamilyGroups();
            setIsCreateModalOpen(false);
          }}
        />
        {/* Join Family Modal - Always rendered */}
        <JoinFamilyModal
          isOpen={isJoinModalOpen}
          onClose={() => setIsJoinModalOpen(false)}
          onSuccess={async () => {
            await loadFamilyGroups();
            setIsJoinModalOpen(false);
          }}
        />
      </div>
    );
  }

  // Dashboard avec groupe sélectionné
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Espace Famille</h1>
                <p className="text-sm text-gray-600">Gérez vos dépenses partagées</p>
              </div>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-primary flex items-center space-x-2 text-sm px-3 py-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Créer un groupe</span>
            </button>
          </div>

          {/* Sélecteur de groupe */}
          {familyGroups.length > 1 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Groupe sélectionné
              </label>
              <select
                value={selectedGroupId || ''}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                {familyGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} ({group.memberCount} membre{group.memberCount > 1 ? 's' : ''})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Code d'invitation */}
          {selectedGroup && (
            <div className="flex items-center space-x-2">
              <div className="flex-1 flex items-center space-x-2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
                <Share2 className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-gray-600">Code d'invitation:</span>
                <code className="flex-1 text-sm font-mono font-semibold text-purple-700">
                  {selectedGroup.inviteCode}
                </code>
                <button
                  onClick={handleCopyInviteCode}
                  className="p-1 hover:bg-purple-100 rounded transition-colors"
                  title="Copier le code"
                >
                  <Copy className={`w-4 h-4 ${copiedCode ? 'text-green-600' : 'text-purple-600'}`} />
                </button>
              </div>
              {copiedCode && (
                <span className="text-sm text-green-600 font-medium">Copié !</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Cartes de statistiques */}
        <div className="grid grid-cols-2 gap-4">
          {/* Total dépenses ce mois */}
          <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">Dépenses ce mois</p>
                <p className="text-lg font-bold text-gray-900">
                  {stats.totalExpensesThisMonth.toLocaleString('fr-FR')} {currencySymbol}
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          {/* Nombre de membres */}
          <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">Membres</p>
                <p className="text-lg font-bold text-gray-900">{stats.memberCount}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          {/* Demandes en attente */}
          <button
            onClick={() => navigate('/family/reimbursements')}
            className="card bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">En attente</p>
                <p className="text-lg font-bold text-gray-900">
                  {stats.pendingAmount.toLocaleString('fr-FR')} {currencySymbol}
                </p>
                {stats.pendingRequestsCount > 0 && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {stats.pendingRequestsCount} demande{stats.pendingRequestsCount > 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </button>

          {/* Solde net */}
          <div className={`card bg-gradient-to-br ${
            stats.netBalance >= 0 
              ? 'from-green-50 to-green-100 border-green-200' 
              : 'from-red-50 to-red-100 border-red-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">Solde net</p>
                <p className={`text-lg font-bold ${
                  stats.netBalance >= 0 ? 'text-green-700' : 'text-red-700'
                }`}>
                  {stats.netBalance >= 0 ? '+' : ''}
                  {stats.netBalance.toLocaleString('fr-FR')} {currencySymbol}
                </p>
              </div>
              <ArrowRightLeft className={`w-8 h-8 ${
                stats.netBalance >= 0 ? 'text-green-600' : 'text-red-600'
              }`} />
            </div>
          </div>
        </div>

        {/* Section Membres */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Membres</h2>
            <button
              onClick={() => navigate(`/family/${selectedGroupId}/members`)}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              Voir tout
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {members.slice(0, 4).map((member) => {
              const initials = (member.displayName || '')
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
              
              return (
                <div
                  key={member.id}
                  className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors w-full"
                >
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-purple-700">{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-1.5">
                      {member.role === 'admin' && (
                        <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                      )}
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {member.displayName || 'Membre sans nom'}
                        {user && user.id && (member.userId === user.id || (member as any).user_id === user.id) && (
                          <span className="text-purple-600 font-semibold ml-1">(Vous)</span>
                        )}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {member.role === 'admin' ? 'Administrateur' : 'Membre'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transactions récentes */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Transactions récentes</h2>
            <button
              onClick={() => navigate(`/family/${selectedGroupId}/transactions`)}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              Voir tout
            </button>
          </div>
          {recentTransactions.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              Aucune transaction partagée ce mois
            </p>
          ) : (
            <div className="space-y-3">
              {recentTransactions.slice(0, 10).map((transaction) => {
                const payerId = transaction.paidBy || transaction.sharedBy;
                const paidByMember = payerId ? members.find(m => m.userId === payerId) : null;
                const safeAmount = transaction.amount ?? 0;
                const safeDescription = transaction.description ?? 'Transaction sans description';
                const safeCategory = transaction.category ?? 'autre';
                const safeDate = transaction.date ? new Date(transaction.date) : new Date();
                
                // Déterminer si c'est un revenu ou une dépense
                const isIncome = transaction.transaction?.type === 'income' || 
                                (!transaction.transaction?.type && safeAmount > 0);
                const displayAmount = Math.abs(safeAmount);
                const colorClass = isIncome ? 'text-green-600' : 'text-red-600';
                const sign = isIncome ? '+' : '-';
                
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => navigate(`/family/transaction/${transaction.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {safeDescription}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {paidByMember?.displayName || 'Inconnu'}
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">{safeCategory}</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">
                          {safeDate.toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${colorClass}`}>
                        {sign}{displayAmount.toLocaleString('fr-FR')} {currencySymbol}
                      </p>
                      {transaction.isSettled && (
                        <CheckCircle className="w-4 h-4 text-green-500 mt-1" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions rapides */}
        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => navigate(`/family/${selectedGroupId}/share-expense`)}
            className="card hover:shadow-lg transition-shadow flex items-center justify-center space-x-2 py-4 bg-purple-50 border-purple-200 text-purple-700"
          >
            <Share2 className="w-5 h-5" />
            <span>Partager une dépense</span>
          </button>
          <button
            onClick={() => navigate(`/family/${selectedGroupId}/request-reimbursement`)}
            className="card hover:shadow-lg transition-shadow flex items-center justify-center space-x-2 py-4 bg-blue-50 border-blue-200 text-blue-700"
          >
            <Receipt className="w-5 h-5" />
            <span>Demander remboursement</span>
          </button>
          <button
            onClick={() => navigate('/family/reimbursements')}
            className="card hover:shadow-lg transition-shadow flex items-center justify-center space-x-2 py-4 bg-yellow-50 border-yellow-200 text-yellow-700"
          >
            <Wallet className="w-5 h-5" />
            <span>Remboursements</span>
          </button>
          <button
            onClick={() => navigate(`/family/${selectedGroupId}/balances`)}
            className="card hover:shadow-lg transition-shadow flex items-center justify-center space-x-2 py-4 bg-green-50 border-green-200 text-green-700"
          >
            <ArrowRightLeft className="w-5 h-5" />
            <span>Voir équilibrage</span>
          </button>
        </div>
      </div>

      {/* Create Family Modal */}
      <CreateFamilyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={async () => {
          await loadFamilyGroups();
          setIsCreateModalOpen(false);
        }}
      />
      {/* Join Family Modal */}
      <JoinFamilyModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onSuccess={async () => {
          await loadFamilyGroups();
          setIsJoinModalOpen(false);
        }}
      />
    </div>
  );
};

export default FamilyDashboardPage;

