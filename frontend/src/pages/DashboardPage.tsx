import { useState, useEffect, useMemo } from 'react';
import { Wallet, TrendingUp, TrendingDown, Target, PieChart, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';
import accountService, { getTotalBalanceInCurrency } from '../services/accountService';
import transactionService from '../services/transactionService';
import notificationService from '../services/notificationService';
import { goalService } from '../services/goalService';
// Essential expense categories for emergency fund calculation
const ESSENTIAL_CATEGORIES = ['Alimentation', 'Logement', 'Transport', 'Santé', 'Éducation'] as const;
import type { Transaction, Goal } from '../types';
import { TRANSACTION_CATEGORIES } from '../constants';
import NotificationPermissionRequest from '../components/NotificationPermissionRequest';
import NotificationSettings from '../components/NotificationSettings';
import RecurringTransactionsWidget from '../components/Dashboard/RecurringTransactionsWidget';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import useNotifications from '../hooks/useNotifications';
import { CurrencyDisplay } from '../components/Currency';
import MonthlySummaryCard from '../components/Dashboard/MonthlySummaryCard';

const CURRENCY_STORAGE_KEY = 'bazarkely_display_currency';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAppStore();
  const { checkBudgetAlerts, checkGoalReminders, checkMadagascarNotifications } = useNotifications();
  const [stats, setStats] = useState({
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    budgetUtilization: 0,
    goalsProgress: 0,
    essentialMonthlyExpenses: 0,
    emergencyFundGoal: 0
  });

  // Helper function to calculate essential monthly expenses
  // Filters transactions by essential categories and sums expense amounts
  const calculateEssentialMonthlyExpenses = (transactions: Transaction[]): number => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const monthlyTransactions = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate >= startOfMonth && transactionDate <= endOfMonth;
    });

    // Use case-insensitive comparison for category matching
    const essentialExpenses = monthlyTransactions
      .filter(t => {
        const isExpense = t.type === 'expense';
        const categoryMatch = ESSENTIAL_CATEGORIES.some(essential => 
          essential.toLowerCase() === t.category?.toLowerCase()
        );
        return isExpense && categoryMatch;
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return essentialExpenses;
  };

  // Helper function to calculate emergency fund goal (6 months of essential expenses)
  const calculateEmergencyFundGoal = (essentialMonthlyExpenses: number): number => {
    return essentialMonthlyExpenses * 6;
  };

  // Helper function to calculate emergency fund progress percentage
  // Compares current savings balance to emergency fund goal
  const calculateEmergencyFundProgress = (currentSavings: number, goal: number): number => {
    if (goal === 0) return 0; // Handle division by zero case
    return Math.min((currentSavings / goal) * 100, 100);
  };
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [userAccounts, setUserAccounts] = useState<any[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotificationBannerDismissed, setIsNotificationBannerDismissed] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Create account map for efficient account name lookup
  const accountMap = useMemo(() => {
    const map = new Map<string, string>();
    userAccounts.forEach(account => {
      map.set(account.id, account.name);
    });
    return map;
  }, [userAccounts]);
  
  // Currency integration states
  // Read display currency preference from localStorage on mount
  const [displayCurrency, setDisplayCurrency] = useState<'MGA' | 'EUR'>(() => {
    const saved = localStorage.getItem(CURRENCY_STORAGE_KEY);
    return (saved === 'EUR' || saved === 'MGA') ? saved : 'MGA';
  });
  const [_totalInPreferredCurrency, setTotalInPreferredCurrency] = useState<number>(0);

  // Listen for currency changes from Settings page
  useEffect(() => {
    const handleCurrencyChange = (event: CustomEvent<{ currency: 'MGA' | 'EUR' }>) => {
      setDisplayCurrency(event.detail.currency);
    };

    window.addEventListener('currencyChanged', handleCurrencyChange as EventListener);

    return () => {
      window.removeEventListener('currencyChanged', handleCurrencyChange as EventListener);
    };
  }, []);

  // Vérifier si l'utilisateur a déjà fermé le banner de notifications
  useEffect(() => {
    const checkBannerDismissed = () => {
      const dismissed = localStorage.getItem('bazarkely-notification-banner-dismissed');
      if (dismissed) {
        setIsNotificationBannerDismissed(true);
        console.log('🔔 Banner de notifications déjà fermé par l\'utilisateur');
      }
    };
    
    checkBannerDismissed();
  }, []);

  // Gérer la fermeture du banner de notifications
  const handleNotificationBannerDismiss = () => {
    const timestamp = new Date().toISOString();
    localStorage.setItem('bazarkely-notification-banner-dismissed', timestamp);
    setIsNotificationBannerDismissed(true);
    console.log('🔔 Banner de notifications fermé par l\'utilisateur:', timestamp);
  };

  // Pour les tests : réinitialiser l'état du banner
  // localStorage.removeItem('bazarkely-notification-banner-dismissed');
  // setIsNotificationBannerDismissed(false);

  // Initialiser le système de notifications
  useEffect(() => {
    const initializeNotifications = async () => {
      if (!user) return;

      try {
        // Initialiser le service de notifications
        await notificationService.initialize();
        
        // Vérifier la permission actuelle
        const permission = notificationService.isPermissionGranted() ? 'granted' : Notification.permission;
        setNotificationPermission(permission);

        // Démarrer les vérifications périodiques
        if (permission === 'granted') {
          // Vérifier les budgets toutes les heures
          setInterval(() => {
            if (user?.id) {
              notificationService.scheduleBudgetCheck(user.id);
            }
          }, 60 * 60 * 1000); // 1 heure

          // Vérifier les objectifs quotidiennement à 9h
          setInterval(() => {
            const now = new Date();
            if (now.getHours() === 9 && user?.id) {
              notificationService.scheduleGoalCheck(user.id);
            }
          }, 60 * 60 * 1000); // 1 heure

          // Résumé quotidien à 20h
          setInterval(() => {
            const now = new Date();
            if (now.getHours() === 20 && user?.id) {
              notificationService.scheduleDailySummary(user.id);
            }
          }, 60 * 60 * 1000); // 1 heure
        }
      } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation des notifications:', error);
      }
    };

    initializeNotifications();
  }, [user]);

  // Charger les données réelles
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) {
        console.log('⚠️ Aucun utilisateur connecté');
        return;
      }

      console.log('🔍 User object:', user);
      console.log('🔍 User ID:', user?.id);

      // Vérifier les notifications (ancien système)
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
        console.log('📅 Recent transactions sorted (newest first):', sortedTransactions.map(t => ({
          id: t.id,
          description: t.description,
          date: t.date,
          amount: t.amount
        })));
        setRecentTransactions(sortedTransactions);

        // Surveiller les transactions importantes pour les notifications
        if (user?.id) {
          for (const transaction of sortedTransactions) {
            if (transaction.amount > 100000) {
              await notificationService.scheduleTransactionWatch(user.id, transaction);
            }
          }
        }

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

        // Calculate essential monthly expenses for emergency fund calculation
        const essentialMonthlyExpenses = calculateEssentialMonthlyExpenses(allTransactions);
        const emergencyFundGoal = calculateEmergencyFundGoal(essentialMonthlyExpenses);
        const emergencyFundProgress = calculateEmergencyFundProgress(totalBalance, emergencyFundGoal);

        // Load goals from goalService
        let userGoals: Goal[] = [];
        try {
          if (user?.id) {
            console.log('🎯 Chargement des objectifs depuis goalService...');
            userGoals = await goalService.getGoals(user.id);
            console.log('📊 Objectifs récupérés:', userGoals.length);
            setGoals(userGoals);
          }
        } catch (error) {
          console.error('Erreur lors du chargement des objectifs:', error);
          // Continue without goals - fallback to emergency fund widget
        }

        console.log('📈 Revenus mensuels:', monthlyIncome);
        console.log('📉 Dépenses mensuelles:', monthlyExpenses);
        console.log('🏠 Dépenses essentielles mensuelles:', essentialMonthlyExpenses);
        console.log('🎯 Objectif fond d\'urgence (6 mois):', emergencyFundGoal);
        console.log('📊 Progression fond d\'urgence:', emergencyFundProgress.toFixed(1) + '%');

        // Calculer l'utilisation du budget (simulation)
        const budgetUtilization = monthlyExpenses > 0 ? Math.min((monthlyExpenses / (monthlyIncome || 1)) * 100, 100) : 0;

        const finalStats = {
          totalBalance,
          monthlyIncome,
          monthlyExpenses,
          budgetUtilization: Math.round(budgetUtilization),
          goalsProgress: Math.round(emergencyFundProgress), // Use calculated emergency fund progress
          essentialMonthlyExpenses, // Add essential expenses to stats
          emergencyFundGoal // Add emergency fund goal to stats
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

  // Fetch balance in preferred currency
  useEffect(() => {
    async function fetchConvertedBalance() {
      if (!userAccounts || userAccounts.length === 0) return;
      const total = await getTotalBalanceInCurrency(displayCurrency);
      setTotalInPreferredCurrency(total);
    }
    fetchConvertedBalance();
  }, [displayCurrency, userAccounts]);

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
      {!isNotificationBannerDismissed && (
        <NotificationPermissionRequest 
          onDismiss={handleNotificationBannerDismiss}
          onPermissionGranted={() => setNotificationPermission('granted')}
          onPermissionDenied={() => setNotificationPermission('denied')}
        />
      )}

      {/* Bouton de paramètres de notifications */}
      {notificationPermission === 'granted' && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => setShowNotificationSettings(true)}
            className="flex items-center space-x-2"
          >
            <Bell className="h-4 w-4" />
            <span>Paramètres Notifications</span>
          </Button>
        </div>
      )}
      
      {/* Statistiques principales */}
      <div className="grid grid-cols-2 gap-6">
        <div 
          onClick={() => navigate('/transactions?filter=transfer')}
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-blue-100">Solde total</h3>
            <div 
              onClick={(e) => {
                e.stopPropagation();
                navigate('/transfer');
              }}
              className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm cursor-pointer hover:bg-white/30 transition-colors"
            >
              <Wallet className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white whitespace-nowrap">
            <CurrencyDisplay
              amount={stats.totalBalance}
              originalCurrency="MGA"
              displayCurrency={displayCurrency}
              showConversion={true}
              size="xl"
              className="text-white"
            />
          </div>
        </div>

        <div 
          onClick={() => navigate('/transactions?filter=income')}
          className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-green-100">Revenus</h3>
            <div 
              onClick={(e) => {
                e.stopPropagation();
                navigate('/add-transaction?type=income');
              }}
              className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm cursor-pointer hover:bg-white/30 transition-colors"
            >
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white whitespace-nowrap">
            <CurrencyDisplay
              amount={stats.monthlyIncome}
              originalCurrency="MGA"
              displayCurrency={displayCurrency}
              showConversion={true}
              size="xl"
              className="text-white"
            />
          </div>
        </div>

        <div 
          onClick={() => navigate('/transactions?filter=expense')}
          className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-red-100">Dépenses</h3>
            <div 
              onClick={(e) => {
                e.stopPropagation();
                navigate('/add-transaction');
              }}
              className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm cursor-pointer hover:bg-white/30 transition-colors"
            >
              <TrendingDown className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white whitespace-nowrap">
            <CurrencyDisplay
              amount={stats.monthlyExpenses}
              originalCurrency="MGA"
              displayCurrency={displayCurrency}
              showConversion={true}
              size="xl"
              className="text-white"
            />
          </div>
        </div>

        <div 
          onClick={() => navigate('/budgets')}
          className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-yellow-100">Budget</h3>
            <div 
              onClick={(e) => {
                e.stopPropagation();
                navigate('/add-budget');
              }}
              className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm cursor-pointer hover:bg-white/30 transition-colors"
            >
              <PieChart className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">
            {stats.budgetUtilization}%
          </p>
        </div>
      </div>

      {/* Graphique de progression des objectifs */}
      <div 
        className="card cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => navigate('/goals')}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Progression globale</h3>
          <Target className="w-5 h-5 text-primary-600" />
        </div>
        
        {(() => {
          // Calculate goals statistics
          const activeGoals = goals.filter(goal => !goal.isCompleted);
          const totalTarget = activeGoals.reduce((sum, goal) => sum + goal.targetAmount, 0);
          const totalCurrent = activeGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);
          const overallProgress = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;
          const top3Goals = activeGoals
            .sort((a, b) => {
              const aProgress = (a.currentAmount / a.targetAmount) * 100;
              const bProgress = (b.currentAmount / b.targetAmount) * 100;
              return bProgress - aProgress;
            })
            .slice(0, 3);

          if (activeGoals.length > 0) {
            return (
              <div className="space-y-4">
                {/* Stats row */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{activeGoals.length} objectif{activeGoals.length > 1 ? 's' : ''} actif{activeGoals.length > 1 ? 's' : ''}</span>
                  <span className="text-sm font-semibold text-gray-900">{overallProgress}%</span>
                </div>

                {/* Total amounts row */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-medium text-gray-900 inline-flex items-center gap-2">
                    <CurrencyDisplay
                      amount={totalCurrent}
                      originalCurrency="MGA"
                      displayCurrency={displayCurrency}
                      showConversion={true}
                      size="sm"
                    />
                    <span>/</span>
                    <CurrencyDisplay
                      amount={totalTarget}
                      originalCurrency="MGA"
                      displayCurrency={displayCurrency}
                      showConversion={true}
                      size="sm"
                    />
                  </span>
                </div>

                {/* Main progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-300" 
                    style={{ width: `${Math.min(overallProgress, 100)}%` }}
                  ></div>
                </div>

                {/* Top 3 goals list */}
                {top3Goals.length > 0 && (
                  <>
                    <div className="border-t border-gray-200 pt-3 space-y-2">
                      {top3Goals.map((goal) => {
                        const goalProgress = goal.targetAmount > 0 
                          ? Math.round((goal.currentAmount / goal.targetAmount) * 100) 
                          : 0;
                        return (
                          <div key={goal.id} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-700 font-medium truncate flex-1 mr-2">{goal.name}</span>
                              <span className="text-gray-600 flex-shrink-0">{goalProgress}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div 
                                className="bg-primary-500 h-1.5 rounded-full transition-all duration-300" 
                                style={{ width: `${Math.min(goalProgress, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          } else {
            // Fallback: Show emergency fund suggestion
            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Fond d'urgence</span>
                  <span className="text-sm font-medium text-gray-900">{stats.goalsProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full" 
                    style={{ width: `${stats.goalsProgress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>
                    <CurrencyDisplay
                      amount={stats.totalBalance}
                      originalCurrency="MGA"
                      displayCurrency={displayCurrency}
                      showConversion={true}
                      size="sm"
                      className="text-gray-500"
                    />
                  </span>
                  <span>
                    <CurrencyDisplay
                      amount={stats.emergencyFundGoal}
                      originalCurrency="MGA"
                      displayCurrency={displayCurrency}
                      showConversion={true}
                      size="sm"
                      className="text-gray-500"
                    />
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/goals')}
                  className="w-full mt-3 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                >
                  Créer un objectif
                </button>
              </div>
            );
          }
        })()}
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
              const accountName = accountMap.get(transaction.accountId) || 'Compte inconnu';
              const category = TRANSACTION_CATEGORIES[transaction.category] || { name: transaction.category };
              
              return (
                <div 
                  key={transaction.id} 
                  onClick={() => navigate(`/transaction/${transaction.id}`)}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/transaction/${transaction.id}`)}
                  className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-50 transition-colors rounded-lg px-2 -mx-2"
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {isTransfer ? (isDebit ? `Sortie: ${transaction.description}` : `Entrée: ${transaction.description}`) : transaction.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {accountName} • {category.name} • {new Date(transaction.date).toLocaleDateString('fr-FR')}
                      {isTransfer && (
                        <span className={`ml-2 ${isDebit ? 'text-red-600' : 'text-green-600'}`}>
                          • {isDebit ? 'Débit' : 'Crédit'}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium inline-flex items-center gap-1 ${
                      isIncome || (isTransfer && !isDebit) ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {isIncome || (isTransfer && !isDebit) ? '+' : ''}
                      <CurrencyDisplay
                        amount={Math.abs(transaction.originalAmount ?? transaction.amount)}
                        originalCurrency={transaction.originalCurrency || 'MGA'}
                        displayCurrency={displayCurrency}
                        showConversion={true}
                        size="sm"
                        exchangeRateUsed={transaction.exchangeRateUsed}
                        className={isIncome || (isTransfer && !isDebit) ? 'text-green-600' : 'text-red-600'}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Widget Transactions récurrentes */}
      {user && <RecurringTransactionsWidget userId={user.id} />}

      {/* Résumé mensuel pour familles diaspora */}
      <MonthlySummaryCard 
        className="mt-6" 
        displayCurrency={displayCurrency}
        monthlyIncome={stats.monthlyIncome}
        monthlyExpenses={stats.monthlyExpenses}
      />

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

      {/* Modal des paramètres de notifications */}
      <Modal
        isOpen={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
        title="Paramètres de Notifications"
        size="lg"
      >
        <NotificationSettings onClose={() => setShowNotificationSettings(false)} />
      </Modal>
    </div>
  );
};

export default DashboardPage;
