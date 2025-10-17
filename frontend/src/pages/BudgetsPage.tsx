import { useState, useEffect } from 'react';
import { Plus, AlertTriangle, CheckCircle, PieChart, Lightbulb, Check, Edit3 } from 'lucide-react';
import { TRANSACTION_CATEGORIES } from '../constants';
import { useAppStore } from '../stores/appStore';
import useBudgetIntelligence from '../hooks/useBudgetIntelligence';
import { usePracticeTracking } from '../hooks/usePracticeTracking';
import apiService from '../services/apiService';
import { toast } from 'react-hot-toast';
import type { Budget } from '../types';

const BudgetsPage = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingBudgets, setIsCreatingBudgets] = useState(false);
  const [customizingBudget, setCustomizingBudget] = useState<string | null>(null);
  const [customAmounts, setCustomAmounts] = useState<Record<string, number>>({});
  const [isLoadingBudgets, setIsLoadingBudgets] = useState(false);
  const { user } = useAppStore();
  const { trackBudgetUsage } = usePracticeTracking();

  // Hook d'intelligence budgétaire pour les budgets suggérés
  const {
    intelligentBudgets
  } = useBudgetIntelligence();

  // Fonction pour calculer les montants dépensés par catégorie
  const calculateSpentAmounts = async (budgets: any[]) => {
    if (!user) return budgets;

    try {
      console.log('🔍 DEBUG: Calculating spent amounts from transactions...');
      console.log('📊 DEBUG STEP 1 - Input budgets parameter:', budgets.map(b => ({
        id: b.id,
        category: b.category,
        amount: b.amount,
        spent: b.spent,
        month: b.month,
        year: b.year
      })));
      
      // Charger les transactions du mois sélectionné
      const transactionsResponse = await apiService.getTransactions();
      if (!transactionsResponse.success || !transactionsResponse.data) {
        console.warn('⚠️ DEBUG: Could not load transactions for spent calculation');
        return budgets;
      }

      const transactions = transactionsResponse.data;
      console.log('🔍 DEBUG: Loaded transactions for spent calculation:', transactions.length);

      // Filtrer les transactions du mois sélectionné et de type expense
      const currentMonthTransactions = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate.getMonth() + 1 === selectedMonth && 
               transactionDate.getFullYear() === selectedYear &&
               transaction.type === 'expense';
      });

      console.log('🔍 DEBUG: Current month expense transactions:', currentMonthTransactions.length);

      // Calculer les montants dépensés par catégorie
      const spentByCategory: Record<string, number> = {};
      currentMonthTransactions.forEach(transaction => {
        const category = transaction.category;
        spentByCategory[category] = (spentByCategory[category] || 0) + Math.abs(transaction.amount);
      });

      console.log('🔍 DEBUG: Spent amounts by category:', spentByCategory);
      console.log('💰 DEBUG STEP 2 - Complete spentByCategory object:', Object.entries(spentByCategory).map(([category, amount]) => ({
        category,
        amount,
        formatted: `${amount.toLocaleString('fr-FR')} Ar`
      })));

      // Mettre à jour les budgets avec les montants dépensés calculés
      const updatedBudgets = budgets.map(budget => {
        const normalizedCategory = budget.category.toLowerCase();
        const spentAmount = spentByCategory[normalizedCategory] || 0;
        
        // DEBUG: Log category normalization
        console.log(`🔍 DEBUG - Category normalization: "${budget.category}" -> "${normalizedCategory}" -> spent: ${spentAmount} Ar`);
        
        return {
          ...budget,
          spent: spentAmount
        };
      });

      console.log('🔍 DEBUG: Updated budgets with spent amounts:', updatedBudgets);
      console.log('✅ DEBUG STEP 3 - Updated budgets with spent values:', updatedBudgets.map(b => ({
        id: b.id,
        category: b.category,
        amount: b.amount,
        spent: b.spent,
        spentFormatted: `${b.spent.toLocaleString('fr-FR')} Ar`,
        percentage: b.amount > 0 ? ((b.spent / b.amount) * 100).toFixed(1) + '%' : '0%'
      })));
      
      // Sauvegarder les montants dépensés calculés dans Supabase
      try {
        await saveSpentAmountsToDatabase(updatedBudgets);
      } catch (saveError) {
        console.error('❌ DEBUG: Error in saveSpentAmountsToDatabase, but continuing with return:', saveError);
      }
      
      // Log what we're about to return
      console.log('🔄 DEBUG - About to return from calculateSpentAmounts:', updatedBudgets.map(b => ({
        id: b.id,
        category: b.category,
        amount: b.amount,
        spent: b.spent,
        spentFormatted: `${b.spent.toLocaleString('fr-FR')} Ar`
      })));
      
      return updatedBudgets;

    } catch (error) {
      console.error('❌ DEBUG: Error calculating spent amounts:', error);
      console.log('❌ DEBUG - Returning original budgets due to error:', budgets.map(b => ({
        id: b.id,
        category: b.category,
        amount: b.amount,
        spent: b.spent,
        spentFormatted: `${b.spent.toLocaleString('fr-FR')} Ar`
      })));
      return budgets;
    }
  };

  // Fonction pour sauvegarder les montants dépensés dans la base de données
  const saveSpentAmountsToDatabase = async (budgets: any[]) => {
    if (!user) return;

    try {
      console.log('🔍 DEBUG: Saving calculated spent amounts to Supabase...');
      console.log('🔍 DEBUG: saveSpentAmountsToDatabase received budgets:', budgets.map(b => ({
        id: b.id,
        category: b.category,
        amount: b.amount,
        spent: b.spent,
        spentFormatted: `${b.spent.toLocaleString('fr-FR')} Ar`
      })));
      
      // Pour l'instant, on garde les montants dépensés en mémoire seulement
      // TODO: Implémenter la mise à jour des montants dépensés dans Supabase
      // quand l'API sera disponible
      console.log('🔍 DEBUG: Spent amounts kept in memory (database update not implemented yet)');
      
      budgets.forEach(budget => {
        console.log(`✅ DEBUG: Budget ${budget.category} spent: ${budget.spent} Ar (in memory)`);
      });
      
    } catch (error) {
      console.error('❌ DEBUG: Error saving spent amounts to database:', error);
    }
  };

  // Fonction pour charger les budgets
  const loadBudgets = async () => {
    console.log('🔍 DEBUG: loadBudgets called');
    console.log('🔍 DEBUG: user:', user);
    console.log('🔍 DEBUG: selectedMonth:', selectedMonth, 'selectedYear:', selectedYear);
    console.log('🔍 DEBUG: isLoadingBudgets:', isLoadingBudgets);
    
    // Guard: Prevent concurrent calls
    if (isLoadingBudgets) {
      console.log('⚠️ DEBUG: loadBudgets already in progress, skipping');
      return;
    }
    
    if (!user) {
      console.log('❌ DEBUG: No user, returning early from loadBudgets');
      return;
    }

    setIsLoadingBudgets(true);

    try {
      setIsLoading(true);
      console.log('🔍 DEBUG: Loading budgets from Supabase...');
      const response = await apiService.getBudgets();
      console.log('🔍 DEBUG: Supabase getBudgets response:', response);
      
      if (response.success && response.data) {
        // Filtrer les budgets par mois et année et convertir le format
        const filteredBudgets = response.data
          .filter(budget => budget.month === selectedMonth && budget.year === selectedYear)
          .map(budget => ({
            id: budget.id,
            userId: budget.user_id,
            category: budget.category as any, // Convert to TransactionCategory
            amount: budget.amount,
            spent: budget.spent,
            period: budget.period as 'monthly',
            year: budget.year,
            month: budget.month,
            alertThreshold: budget.alert_threshold
          }));
        console.log('🔍 DEBUG: Filtered budgets for current month/year:', filteredBudgets);
        
        // Calculer les montants dépensés à partir des transactions
        const budgetsWithSpent = await calculateSpentAmounts(filteredBudgets);
        console.log('🔄 DEBUG STEP 4 - budgetsWithSpent before setBudgets:', budgetsWithSpent.map(b => ({
          id: b.id,
          category: b.category,
          amount: b.amount,
          spent: b.spent,
          spentFormatted: `${b.spent.toLocaleString('fr-FR')} Ar`
        })));
        
        console.log('🎯 DEBUG - About to call setBudgets with:', {
          budgetsCount: budgetsWithSpent.length,
          budgetsWithSpent: budgetsWithSpent.length > 0,
          currentBudgetsState: budgets.length
        });
        
        // Log what we're passing to setBudgets immediately
        console.log('🎯 DEBUG - setBudgets parameter (budgetsWithSpent):', budgetsWithSpent.map(b => ({
          id: b.id,
          category: b.category,
          amount: b.amount,
          spent: b.spent,
          spentFormatted: `${b.spent.toLocaleString('fr-FR')} Ar`
        })));
        
        setBudgets(budgetsWithSpent);
      } else {
        console.error('❌ DEBUG: Failed to load budgets:', response.error);
        setBudgets([]);
      }
    } catch (error) {
      console.error('❌ DEBUG: Error loading budgets:', error);
      setBudgets([]);
    } finally {
      setIsLoading(false);
      setIsLoadingBudgets(false);
    }
  };

  // Charger les budgets réels
  useEffect(() => {
    console.log('🔄 DEBUG useEffect - loadBudgets triggered by:', { user: user?.id, selectedMonth, selectedYear });
    loadBudgets();
  }, [user, selectedMonth, selectedYear]);

  // Monitor budgets state changes
  useEffect(() => {
    console.log('📊 DEBUG useEffect - budgets state changed:', {
      budgetsCount: budgets.length,
      budgetsWithSpent: budgets.filter(b => b.spent > 0).length,
      totalSpent: budgets.reduce((sum, b) => sum + (b.spent || 0), 0)
    });
    
    if (budgets.length > 0) {
      console.log('🎯 DEBUG STEP 5 - budgets state after setBudgets (via useEffect):', budgets.map(b => ({
        id: b.id,
        category: b.category,
        amount: b.amount,
        spent: b.spent,
        spentFormatted: `${b.spent.toLocaleString('fr-FR')} Ar`
      })));
    }
  }, [budgets]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount).replace('MGA', 'Ar');
  };

  // Vérifier si des budgets suggérés doivent être affichés
  const shouldShowSuggestions = () => {
    return (
      user?.preferences?.priorityAnswers && 
      Object.keys(user.preferences.priorityAnswers).length > 0 &&
      intelligentBudgets && 
      Object.keys(intelligentBudgets).length > 0 &&
      budgets.length === 0
    );
  };

  // Accepter tous les budgets suggérés
  const handleAcceptSuggestions = async () => {
    console.log('🔍 DEBUG: handleAcceptSuggestions called');
    console.log('🔍 DEBUG: intelligentBudgets:', intelligentBudgets);
    console.log('🔍 DEBUG: user:', user);
    console.log('🔍 DEBUG: Current budgets count before creation:', budgets.length);
    console.log('🔍 DEBUG: Current budgets:', budgets.map(b => ({ category: b.category, amount: b.amount })));
    
    if (!intelligentBudgets || !user) {
      console.log('❌ DEBUG: Missing intelligentBudgets or user, returning early');
      return;
    }

    try {
      setIsCreatingBudgets(true);
      console.log('🔍 DEBUG: Starting budget creation process');
      
      // Vérifier les budgets existants pour éviter les doublons
      const existingCategories = new Set(budgets.map(b => b.category));
      console.log('🔍 DEBUG: Existing budget categories:', Array.from(existingCategories));
      
      // Convertir les intelligentBudgets en budgets Supabase
      const budgetPromises = Object.entries(intelligentBudgets).map(async ([category, amount]) => {
        // Vérifier si un budget existe déjà pour cette catégorie
        if (existingCategories.has(category)) {
          console.warn('⚠️ DEBUG: Budget already exists for category:', category, 'Skipping creation');
          return { success: true, data: null, message: 'Budget already exists' };
        }
        
        const budgetData = {
          name: `Budget ${category}`,
          category: category,
          amount: amount,
          spent: 0,
          period: 'monthly' as const,
          year: selectedYear,
          month: selectedMonth,
          alert_threshold: 80, // 80%
          is_active: true,
          user_id: user.id
        };

        console.log('🔍 DEBUG: Creating budget for category:', category, 'with data:', budgetData);
        return apiService.createBudget(budgetData);
      });

      console.log('🔍 DEBUG: Waiting for all budget creation promises...');
      const results = await Promise.all(budgetPromises);
      console.log('🔍 DEBUG: Budget creation results:', results);
      
      // Vérifier que tous les budgets ont été créés avec succès
      const failedBudgets = results.filter(result => !result.success);
      console.log('🔍 DEBUG: Failed budgets count:', failedBudgets.length);
      console.log('🔍 DEBUG: Failed budgets details:', failedBudgets);
      
      if (failedBudgets.length > 0) {
        throw new Error(`${failedBudgets.length} budget(s) n'ont pas pu être créés`);
      }

      console.log('🔍 DEBUG: All budgets created successfully, reloading budgets...');
      trackBudgetUsage();
      // Recharger les budgets
      await loadBudgets();
      
      toast.success('Budgets intelligents créés avec succès !', {
        duration: 4000,
        icon: '✅'
      });

    } catch (error) {
      console.error('❌ DEBUG: Error during budget creation:', error);
      toast.error('Erreur lors de la création des budgets suggérés');
    } finally {
      setIsCreatingBudgets(false);
    }
  };

  // Personnaliser un budget suggéré
  const handleCustomizeSuggestion = (category: string, newAmount: number) => {
    setCustomAmounts(prev => ({
      ...prev,
      [category]: newAmount
    }));
  };

  // Sauvegarder les budgets personnalisés
  const handleSaveCustomizedBudgets = async () => {
    if (!intelligentBudgets || !user) return;

    try {
      setIsCreatingBudgets(true);
      
      const budgetsToCreate = Object.entries(intelligentBudgets).map(([category, originalAmount]) => {
        const customAmount = customAmounts[category] || originalAmount;
        return {
          name: `Budget ${category}`,
          category: category,
          amount: customAmount,
          spent: 0,
          period: 'monthly' as const,
          year: selectedYear,
          month: selectedMonth,
          alert_threshold: 80,
          is_active: true,
          user_id: user.id
        };
      });

      const budgetPromises = budgetsToCreate.map(budgetData => 
        apiService.createBudget(budgetData)
      );

      const results = await Promise.all(budgetPromises);
      
      const failedBudgets = results.filter(result => !result.success);
      if (failedBudgets.length > 0) {
        throw new Error(`${failedBudgets.length} budget(s) n'ont pas pu être créés`);
      }

      await loadBudgets();
      
      toast.success('Budgets personnalisés créés avec succès !', {
        duration: 4000,
        icon: '✏️'
      });

      // Réinitialiser l'état de personnalisation
      setCustomAmounts({});
      setCustomizingBudget(null);

    } catch (error) {
      console.error('Erreur lors de la création des budgets personnalisés:', error);
      toast.error('Erreur lors de la création des budgets personnalisés');
    } finally {
      setIsCreatingBudgets(false);
    }
  };

  // Créer un budget manuel
  const handleCreateManualBudget = () => {
    // TODO: Implémenter la navigation vers la page de création de budget
    toast('Fonctionnalité de création manuelle en cours de développement', {
      duration: 3000,
      icon: 'ℹ️'
    });
  };

  const getBudgetStatus = (budget: Budget) => {
    const percentage = ((budget.spent || 0) / budget.amount) * 100;
    
    if (percentage >= 100) {
      return { status: 'exceeded', color: 'text-red-600', bgColor: 'bg-red-100' };
    } else if (percentage >= 80) {
      return { status: 'warning', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    } else {
      return { status: 'good', color: 'text-green-600', bgColor: 'bg-green-100' };
    }
  };

  const totalBudget = budgets.reduce((sum, budget) => sum + budget.amount, 0);
  const totalSpent = budgets.reduce((sum, budget) => sum + (budget.spent || 0), 0);
  const totalRemaining = totalBudget - totalSpent;
  
  // DEBUG: Log total calculations
  console.log('📊 DEBUG TOTALS - Budget calculations:', {
    totalBudget: totalBudget.toLocaleString('fr-FR') + ' Ar',
    totalSpent: totalSpent.toLocaleString('fr-FR') + ' Ar',
    totalRemaining: totalRemaining.toLocaleString('fr-FR') + ' Ar',
    budgetsCount: budgets.length,
    budgetsWithSpent: budgets.filter(b => b.spent > 0).length
  });
  
  // DEBUG: Comprehensive budget analysis
  console.log('🔍 DEBUG: Budget Analysis');
  console.log('📊 Total budgets loaded:', budgets.length);
  console.log('💰 Total budget amount:', totalBudget);
  console.log('💸 Total spent amount:', totalSpent);
  console.log('📈 Total remaining:', totalRemaining);
  console.log('📋 Budget details:', budgets.map(b => ({
    id: b.id,
    category: b.category,
    amount: b.amount,
    spent: b.spent,
    month: b.month,
    year: b.year
  })));
  
  // DEBUG: Check for duplicates
  const categoryCounts = budgets.reduce((acc, budget) => {
    acc[budget.category] = (acc[budget.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log('🔄 Category counts (duplicates check):', categoryCounts);
  const duplicates = Object.entries(categoryCounts).filter(([_, count]) => count > 1);
  if (duplicates.length > 0) {
    console.warn('⚠️ DUPLICATE BUDGETS DETECTED:', duplicates);
  }

  if (isLoading) {
    return (
      <div className="p-4 pb-20">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="ml-3 text-gray-600">Chargement des budgets...</p>
        </div>
      </div>
    );
  }
  const overallPercentage = (totalSpent / totalBudget) * 100;

  return (
    <div className="p-4 pb-20 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>
          <p className="text-gray-600">Gérez vos budgets mensuels</p>
        </div>
        <button 
          onClick={handleCreateManualBudget}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau budget</span>
        </button>
      </div>

      {/* Sélecteur de mois */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mois</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="input-field"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString('fr-FR', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="input-field"
            >
              {Array.from({ length: 3 }, (_, i) => {
                const year = new Date().getFullYear() - 1 + i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Vue d'ensemble */}
      <div className="card-glass">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Vue d'ensemble</h3>
          <PieChart className="w-5 h-5 text-primary-600" />
        </div>
        
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalBudget)}</p>
            <p className="text-sm text-gray-600">Budget total</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalSpent)}</p>
            <p className="text-sm text-gray-600">Dépensé</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold ${totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(Math.abs(totalRemaining))}
            </p>
            <p className="text-sm text-gray-600">
              {totalRemaining >= 0 ? 'Restant' : 'Dépassé'}
            </p>
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full ${
              overallPercentage >= 100 ? 'bg-red-500' : 
              overallPercentage >= 80 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(overallPercentage, 100)}%` }}
          ></div>
        </div>
        <p className="text-center text-sm text-gray-600 mt-2">
          {overallPercentage.toFixed(1)}% du budget utilisé
        </p>
      </div>

      {/* Section des budgets suggérés */}
      {shouldShowSuggestions() && (
        <div className="card-glass border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Lightbulb className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Budgets Intelligents Suggérés</h3>
            </div>
            <div className="text-sm text-gray-600">
              Basés sur vos réponses au questionnaire
            </div>
          </div>
          
          <p className="text-gray-700 mb-4">
            Nous avons analysé vos réponses et généré des budgets personnalisés pour {selectedMonth}/{selectedYear}. 
            Vous pouvez les accepter tels quels ou les personnaliser avant de les sauvegarder.
          </p>

          {/* Liste des budgets suggérés */}
          <div className="space-y-3 mb-6">
            {intelligentBudgets && Object.entries(intelligentBudgets).map(([category, amount]) => {
              const categoryInfo = TRANSACTION_CATEGORIES[category as keyof typeof TRANSACTION_CATEGORIES] || {
                name: category,
                icon: 'MoreHorizontal',
                color: 'text-gray-500',
                bgColor: 'bg-gray-100'
              };
              const customAmount = customAmounts[category] || amount;
              const isCustomizing = customizingBudget === category;
              
              return (
                <div key={category} className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${categoryInfo?.bgColor || 'bg-gray-100'}`}>
                        <span className={`text-sm font-medium ${categoryInfo?.color || 'text-gray-600'}`}>
                          {categoryInfo?.name?.charAt(0) || category.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{categoryInfo?.name || category}</h4>
                        <p className="text-sm text-gray-500">
                          {formatCurrency(customAmount)} / mois
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {isCustomizing ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            value={customAmount}
                            onChange={(e) => handleCustomizeSuggestion(category, Number(e.target.value))}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                            min="0"
                            step="1000"
                          />
                          <button
                            onClick={() => setCustomizingBudget(null)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setCustomizingBudget(category)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {Object.keys(intelligentBudgets || {}).length} budget(s) suggéré(s)
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleAcceptSuggestions}
                disabled={isCreatingBudgets}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>
                  {isCreatingBudgets ? 'Création...' : 'Accepter tout'}
                </span>
              </button>
              
              {Object.keys(customAmounts).length > 0 && (
                <button
                  onClick={handleSaveCustomizedBudgets}
                  disabled={isCreatingBudgets}
                  className="btn-secondary flex items-center space-x-2 disabled:opacity-50"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>
                    {isCreatingBudgets ? 'Sauvegarde...' : 'Sauvegarder personnalisés'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Liste des budgets */}
      <div className="space-y-3">
        {budgets.map((budget) => {
          const category = TRANSACTION_CATEGORIES[budget.category] || {
            name: budget.category,
            icon: 'MoreHorizontal',
            color: 'text-gray-500',
            bgColor: 'bg-gray-100'
          };
          const status = getBudgetStatus(budget);
          const percentage = ((budget.spent || 0) / budget.amount) * 100;
          const remaining = budget.amount - (budget.spent || 0);

          return (
            <div key={budget.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${category.bgColor}`}>
                    <span className={`text-sm font-medium ${category.color}`}>
                      {category.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{category.name}</h4>
                    <p className="text-sm text-gray-500">
                      {formatCurrency(budget.amount)} / mois
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className={`font-semibold ${status.color}`}>
                    {formatCurrency(budget.spent || 0)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {percentage.toFixed(1)}%
                  </p>
                  {/* DEBUG: Log budget.spent for each rendered budget */}
                  {(() => {
                    console.log(`🎨 DEBUG STEP 6 - Budget card render for ${budget.category}:`, {
                      id: budget.id,
                      category: budget.category,
                      amount: budget.amount,
                      spent: budget.spent,
                      spentFormatted: formatCurrency(budget.spent || 0),
                      percentage: percentage.toFixed(1) + '%'
                    });
                    return null;
                  })()}
                </div>
              </div>

              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      status.status === 'exceeded' ? 'bg-red-500' :
                      status.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  ></div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    Restant: {formatCurrency(Math.max(0, remaining))}
                  </span>
                  <div className="flex items-center space-x-1">
                    {status.status === 'exceeded' && (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                    {status.status === 'good' && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    <span className={status.color}>
                      {status.status === 'exceeded' ? 'Dépassé' :
                       status.status === 'warning' ? 'Attention' : 'Bon'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {budgets.length === 0 && (
        <div className="text-center py-8">
          <PieChart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun budget</h3>
          <p className="text-gray-600 mb-4">
            Commencez par créer votre premier budget pour {selectedMonth}/{selectedYear}.
          </p>
          <button 
            onClick={handleCreateManualBudget}
            className="btn-primary inline-flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Créer un budget</span>
          </button>
        </div>
      )}

      {/* Actions rapides */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={handleCreateManualBudget}
          className="card hover:shadow-lg transition-shadow text-center py-4 focus:outline-none focus:ring-2 focus:ring-blue-200"
          aria-label="Créer un nouveau budget"
        >
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <Plus className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-sm font-medium text-gray-900">Nouveau budget</p>
        </button>

        <button 
          onClick={() => {
            console.log('Analyses');
            // TODO: Naviguer vers la page des analyses
            // navigate('/analyses');
          }}
          className="card hover:shadow-lg transition-shadow text-center py-4 focus:outline-none focus:ring-2 focus:ring-purple-200"
          aria-label="Voir les analyses de budget"
        >
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <PieChart className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-sm font-medium text-gray-900">Analyses</p>
        </button>
      </div>
    </div>
  );
};

export default BudgetsPage;
