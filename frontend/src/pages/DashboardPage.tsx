import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, Target, PieChart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';
import accountService from '../services/accountService';
import transactionService from '../services/transactionService';
import type { Transaction } from '../types';
import NotificationPermissionRequest from '../components/NotificationPermissionRequest';
import useNotifications from '../hooks/useNotifications';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAppStore();
  const { checkBudgetAlerts, checkGoalReminders, checkMadagascarNotifications } = useNotifications();
  const [stats, setStats] = useState({
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    budgetUtilization: 0,
    goalsProgress: 0
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [userAccounts, setUserAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Charger les données réelles
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) {
        console.log('⚠️ Aucun utilisateur connecté');
        return;
      }

      console.log('🔍 User object:', user);
      console.log('🔍 User ID:', user?.id);

      // Vérifier les notifications
      if (user?.id) {
        checkBudgetAlerts(user.id);
        checkGoalReminders(user.id);
        checkMadagascarNotifications(user.id);
      }

      try {
        setIsLoading(true);

        // Charger les comptes depuis Supabase
        console.log('🔍 Chargement des comptes depuis Supabase...');
        const userAccounts = await accountService.getAccounts();
        console.log('📊 Comptes récupérés:', userAccounts);
        setUserAccounts(userAccounts);

        // Calculer le solde total
        const totalBalance = userAccounts.reduce((sum, account) => sum + account.balance, 0);
        console.log('💰 Solde total calculé:', totalBalance);

        // Charger les transactions récentes
        console.log('🔍 Chargement des transactions depuis Supabase...');
        const allTransactions = await transactionService.getTransactions();
        console.log('📊 Transactions récupérées:', allTransactions.length);
        const sortedTransactions = allTransactions
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 4);
        setRecentTransactions(sortedTransactions);

        // Calculer les revenus et dépenses du mois
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const monthlyTransactions = allTransactions.filter(transaction => {
          const transactionDate = new Date(transaction.date);
          return transactionDate >= startOfMonth && transactionDate <= endOfMonth;
        });

        const monthlyIncome = monthlyTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);

        const monthlyExpenses = Math.abs(monthlyTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0));

        console.log('📈 Revenus mensuels:', monthlyIncome);
        console.log('📉 Dépenses mensuelles:', monthlyExpenses);

        // Calculer l'utilisation du budget (simulation)
        const budgetUtilization = monthlyExpenses > 0 ? Math.min((monthlyExpenses / (monthlyIncome || 1)) * 100, 100) : 0;

        const finalStats = {
          totalBalance,
          monthlyIncome,
          monthlyExpenses,
          budgetUtilization: Math.round(budgetUtilization),
          goalsProgress: 45 // Simulation pour l'instant
        };

        console.log('📊 Statistiques finales:', finalStats);
        setStats(finalStats);

      } catch (error) {
        console.error('Erreur lors du chargement des données du dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('fr-FR')} Ar`;
  };

  // Gestionnaires d'événements pour les boutons
  const handleAddIncome = () => {
    console.log('Ajouter revenu');
    navigate('/add-transaction?type=income');
  };

  const handleAddExpense = () => {
    console.log('Ajouter dépense');
    navigate('/add-transaction?type=expense');
  };

  const handleViewAllTransactions = () => {
    console.log('Voir toutes les transactions');
    navigate('/transactions');
  };

  return (
    <div className="p-4 pb-20 space-y-4">
      {/* Demande de permission pour les notifications */}
      <NotificationPermissionRequest />
      
      {/* Statistiques principales */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-blue-100">Solde total</h3>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Wallet className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">
            {formatCurrency(stats.totalBalance)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-green-100">Revenus</h3>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">
            {formatCurrency(stats.monthlyIncome)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-red-100">Dépenses</h3>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <TrendingDown className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">
            {formatCurrency(stats.monthlyExpenses)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-yellow-100">Budget</h3>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <PieChart className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">
            {stats.budgetUtilization}%
          </p>
        </div>
      </div>

      {/* Graphique de progression des objectifs */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Objectifs d'épargne</h3>
          <Target className="w-5 h-5 text-primary-600" />
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Fond d'urgence</span>
            <span className="text-sm font-medium text-gray-900">45%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary-600 h-2 rounded-full" 
              style={{ width: '45%' }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{formatCurrency(stats.monthlyExpenses)}</span>
            <span>{formatCurrency(stats.monthlyIncome)}</span>
          </div>
        </div>
      </div>

      {/* Transactions récentes */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Transactions récentes</h3>
          <button 
            onClick={handleViewAllTransactions}
            className="text-blue-600 text-sm font-medium hover:text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-200 rounded px-2 py-1"
            aria-label="Voir toutes les transactions"
          >
            Voir tout
          </button>
        </div>
        
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Chargement...</p>
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">Aucune transaction récente</p>
              <button
                onClick={() => navigate('/add-transaction')}
                className="text-blue-600 text-sm font-medium hover:text-blue-700 hover:underline mt-2"
              >
                Ajouter une transaction
              </button>
            </div>
          ) : (
            recentTransactions.map((transaction) => {
              const isIncome = transaction.type === 'income';
              const isTransfer = transaction.type === 'transfer';
              const isDebit = transaction.amount < 0;
              
              return (
                <div key={transaction.id} className="flex items-center justify-between py-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {isTransfer ? (isDebit ? `Sortie: ${transaction.description}` : `Entrée: ${transaction.description}`) : transaction.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(transaction.date).toLocaleDateString('fr-FR')}
                      {isTransfer && (
                        <span className={`ml-2 ${isDebit ? 'text-red-600' : 'text-green-600'}`}>
                          • {isDebit ? 'Débit' : 'Crédit'}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${
                      isIncome || (isTransfer && !isDebit) ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {isIncome || (isTransfer && !isDebit) ? '+' : ''}{formatCurrency(Math.abs(transaction.amount))}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={handleAddIncome}
          className="card-interactive text-center py-6 focus:outline-none focus:ring-2 focus:ring-green-200"
          aria-label="Ajouter un revenu"
        >
          <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-sm font-semibold text-gray-900">Ajouter revenu</p>
        </button>

        <button 
          onClick={handleAddExpense}
          className="card-interactive text-center py-6 focus:outline-none focus:ring-2 focus:ring-red-200"
          aria-label="Ajouter une dépense"
        >
          <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <TrendingDown className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-sm font-semibold text-gray-900">Ajouter dépense</p>
        </button>
      </div>
    </div>
  );
};

export default DashboardPage;
