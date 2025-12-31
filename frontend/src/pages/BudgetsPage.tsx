import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, AlertTriangle, CheckCircle, PieChart, Lightbulb, Check, Edit3, Trash2, X, BarChart3,
  Utensils, Home, Car, Heart, GraduationCap, Phone, Shirt, Gamepad2, Users, HandHeart, MoreHorizontal,
  PiggyBank
} from 'lucide-react';
import { TRANSACTION_CATEGORIES } from '../constants';
import { useAppStore } from '../stores/appStore';
import useBudgetIntelligence from '../hooks/useBudgetIntelligence';
import { usePracticeTracking } from '../hooks/usePracticeTracking';
import apiService from '../services/apiService';
import { toast } from 'react-hot-toast';
import type { Budget, TransactionCategory } from '../types';
import { CurrencyDisplay } from '../components/Currency';
import type { Currency } from '../components/Currency/CurrencyToggle';
import { supabase } from '../lib/supabase';
import Modal from '../components/UI/Modal';
import useYearlyBudgetData from '../hooks/useYearlyBudgetData';
import { YearlyBudgetChart } from '../components/Budget/YearlyBudgetChart';

const CURRENCY_STORAGE_KEY = 'bazarkely_display_currency';

// Mapping des catégories de budgets vers les catégories de transactions
// Permet de faire correspondre les catégories équivalentes (ex: habillement → vetements)
const CATEGORY_MAPPING: Record<string, string> = {
  'habillement': 'vetements',
  'solidarité': 'solidarite',
  'épargne': 'epargne', // Si jamais utilisé
  // Ajouter d'autres mappings si nécessaire
};

// Helper pour mapper les noms d'icônes aux composants Lucide React
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Utensils,
  Home,
  Car,
  Heart,
  GraduationCap,
  Phone,
  Shirt,
  Gamepad2,
  Users,
  HandHeart,
  MoreHorizontal,
  PiggyBank
};

// Fonction helper pour obtenir le composant d'icône
const getCategoryIcon = (iconName: string | undefined) => {
  if (!iconName) return MoreHorizontal;
  return iconMap[iconName] || MoreHorizontal;
};

const BudgetsPage = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingBudgets, setIsCreatingBudgets] = useState(false);
  const [customizingBudget, setCustomizingBudget] = useState<string | null>(null);
  const [customAmounts, setCustomAmounts] = useState<Record<string, number>>({});
  const [isLoadingBudgets, setIsLoadingBudgets] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState<number>(0);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBudget, setNewBudget] = useState<{
    category: string;
    amount: number;
    name: string;
  }>({
    category: '',
    amount: 0,
    name: ''
  });
  const { user } = useAppStore();
  const { trackBudgetUsage } = usePracticeTracking();
  const navigate = useNavigate();
  
  // Hook pour les données annuelles (appelé uniquement en mode annuel)
  const yearlyBudgetData = useYearlyBudgetData(viewMode === 'yearly' ? selectedYear : undefined);

  // Currency integration state
  const [displayCurrency, setDisplayCurrency] = useState<Currency>(() => {
    const saved = localStorage.getItem(CURRENCY_STORAGE_KEY);
    return (saved === 'EUR' || saved === 'MGA') ? saved : 'MGA';
  });

  // Listen for currency changes from Settings page
  useEffect(() => {
    const handleCurrencyChange = (event: CustomEvent<{ currency: Currency }>) => {
      setDisplayCurrency(event.detail.currency);
    };

    window.addEventListener('currencyChanged', handleCurrencyChange as EventListener);

    return () => {
      window.removeEventListener('currencyChanged', handleCurrencyChange as EventListener);
    };
  }, []);

  // Hook d'intelligence budgétaire pour les budgets suggérés
  const {
    intelligentBudgets
  } = useBudgetIntelligence();

  // Handle budget card click to navigate to transactions with category filter
  const handleBudgetClick = (category: TransactionCategory) => {
    navigate(`/transactions?category=${category}`);
  };

  // Handle yearly budget card click to navigate with year date range
  const handleYearlyBudgetClick = (category: TransactionCategory) => {
    const startDate = `${selectedYear}-01-01`;
    const endDate = `${selectedYear}-12-31`;
    navigate(`/transactions?category=${category}&startDate=${startDate}&endDate=${endDate}`);
  };

  // Format number with French locale (spaces as thousand separators)
  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

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
      // Normaliser les catégories de transactions en lowercase pour le matching
      const spentByCategory: Record<string, number> = {};
      currentMonthTransactions.forEach(transaction => {
        const normalizedCategory = transaction.category.toLowerCase();
        spentByCategory[normalizedCategory] = (spentByCategory[normalizedCategory] || 0) + Math.abs(transaction.amount);
      });

      console.log('🔍 DEBUG: Spent amounts by category:', spentByCategory);
      console.log('💰 DEBUG STEP 2 - Complete spentByCategory object:', Object.entries(spentByCategory).map(([category, amount]) => ({
        category,
        amount,
        formatted: `${amount.toLocaleString('fr-FR')} Ar`
      })));

      // Mettre à jour les budgets avec les montants dépensés calculés
      const updatedBudgets = budgets.map(budget => {
        const normalizedBudgetCategory = budget.category.toLowerCase();
        
        // Utiliser CATEGORY_MAPPING pour convertir la catégorie du budget en catégorie de transaction
        // Si pas de mapping, utiliser la catégorie normalisée directement
        const transactionCategory = CATEGORY_MAPPING[normalizedBudgetCategory] || normalizedBudgetCategory;
        const spentAmount = spentByCategory[transactionCategory] || 0;
        
        // DEBUG: Log category normalization and mapping
        console.log(`🔍 DEBUG - Category normalization: "${budget.category}" -> "${normalizedBudgetCategory}" -> mapped to "${transactionCategory}" -> spent: ${spentAmount} Ar`);
        
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
        if (existingCategories.has(category as TransactionCategory)) {
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
    setNewBudget({
      category: '',
      amount: 0,
      name: ''
    });
    setShowCreateForm(true);
  };

  // Annuler la création
  const handleCancelCreate = () => {
    setShowCreateForm(false);
    setNewBudget({
      category: '',
      amount: 0,
      name: ''
    });
  };

  // Sauvegarder le nouveau budget
  const handleSaveNewBudget = async () => {
    if (!user) {
      toast.error('Utilisateur non connecté');
      return;
    }

    // Validation
    if (!newBudget.category) {
      toast.error('Veuillez sélectionner une catégorie');
      return;
    }

    if (newBudget.amount <= 0) {
      toast.error('Le montant doit être supérieur à 0');
      return;
    }

    // Vérifier si un budget existe déjà pour cette catégorie ce mois-ci
    // Normaliser la catégorie pour la comparaison
    const normalizedNewCategory = newBudget.category.toLowerCase();
    const existingBudget = budgets.find(
      budget => {
        const normalizedBudgetCategory = budget.category.toLowerCase();
        // Vérifier aussi avec le mapping de catégories
        const mappedCategory = CATEGORY_MAPPING[normalizedBudgetCategory] || normalizedBudgetCategory;
        return (normalizedBudgetCategory === normalizedNewCategory || mappedCategory === normalizedNewCategory) &&
               budget.month === selectedMonth &&
               budget.year === selectedYear;
      }
    );

    if (existingBudget) {
      toast.error('Un budget pour cette catégorie existe déjà ce mois-ci');
      return;
    }

    try {
      setIsLoadingBudgets(true);

      // Générer le nom si vide
      const categoryDisplayName = TRANSACTION_CATEGORIES[newBudget.category as TransactionCategory]?.name || newBudget.category;
      const budgetName = newBudget.name.trim() || `Budget ${categoryDisplayName}`;

      // Créer le budget via apiService
      const budgetData = {
        name: budgetName,
        category: newBudget.category.toLowerCase(),
        amount: newBudget.amount,
        spent: 0,
        period: 'monthly' as const,
        year: selectedYear,
        month: selectedMonth,
        alert_threshold: 80,
        is_active: true
      };

      const response = await apiService.createBudget(budgetData);

      if (!response.success) {
        throw new Error(response.error || 'Erreur lors de la création du budget');
      }

      toast.success('Budget créé avec succès');
      setShowCreateForm(false);
      setNewBudget({
        category: '',
        amount: 0,
        name: ''
      });

      // Recharger les budgets
      await loadBudgets();
    } catch (error) {
      console.error('Erreur lors de la création du budget:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la création du budget');
    } finally {
      setIsLoadingBudgets(false);
    }
  };

  // Éditer un budget existant
  const handleEditBudget = (budgetId: string, currentAmount: number) => {
    setEditingBudgetId(budgetId);
    setEditingAmount(currentAmount);
  };

  // Sauvegarder les modifications d'un budget
  const handleSaveEdit = async (budgetId: string) => {
    if (!user || editingAmount <= 0) {
      toast.error('Montant invalide');
      return;
    }

    try {
      setIsLoadingBudgets(true);
      
      // Utiliser directement Supabase pour la mise à jour
      const { error } = await supabase
        .from('budgets')
        .update({ amount: editingAmount, updated_at: new Date().toISOString() })
        .eq('id', budgetId);

      if (error) throw error;

      toast.success('Budget modifié avec succès');
      setEditingBudgetId(null);
      setEditingAmount(0);
      
      // Recharger les budgets
      await loadBudgets();
    } catch (error) {
      console.error('Erreur lors de la modification du budget:', error);
      toast.error('Erreur lors de la modification du budget');
    } finally {
      setIsLoadingBudgets(false);
    }
  };

  // Annuler l'édition
  const handleCancelEdit = () => {
    setEditingBudgetId(null);
    setEditingAmount(0);
  };

  // Supprimer un budget
  const handleDeleteBudget = async (budgetId: string, categoryName: string) => {
    if (!user) return;

    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer le budget "${categoryName}" ?`
    );

    if (!confirmed) return;

    try {
      setIsLoadingBudgets(true);
      
      // Utiliser directement Supabase pour la suppression
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', budgetId);

      if (error) throw error;

      toast.success('Budget supprimé avec succès');
      
      // Recharger les budgets
      await loadBudgets();
    } catch (error) {
      console.error('Erreur lors de la suppression du budget:', error);
      toast.error('Erreur lors de la suppression du budget');
    } finally {
      setIsLoadingBudgets(false);
    }
  };

  const getBudgetStatus = (budget: Budget) => {
    // Protection contre division par zéro
    const percentage = budget.amount > 0 
      ? ((budget.spent || 0) / budget.amount) * 100 
      : 0;
    
    // Logique spéciale pour la catégorie Épargne (inversée)
    const isEpargne = budget.category.toLowerCase() === 'epargne';
    
    if (isEpargne) {
      // Pour l'épargne : dépenser plus (épargner plus) est bon
      if (percentage === 0) {
        return { status: 'exceeded', color: 'text-red-600', bgColor: 'bg-red-100', label: 'À faire' };
      } else if (percentage < 100) {
        return { status: 'warning', color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: 'Attention' };
      } else {
        return { status: 'good', color: 'text-green-600', bgColor: 'bg-green-100', label: 'Bon' };
      }
    }
    
    // Logique normale pour les autres catégories
    if (percentage >= 100) {
      return { status: 'exceeded', color: 'text-red-600', bgColor: 'bg-red-100', label: 'Dépassé' };
    } else if (percentage >= 80) {
      return { status: 'warning', color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: 'Attention' };
    } else {
      return { status: 'good', color: 'text-green-600', bgColor: 'bg-green-100', label: 'Bon' };
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
  // Protection contre division par zéro pour le pourcentage global
  const overallPercentage = totalBudget > 0 
    ? (totalSpent / totalBudget) * 100 
    : 0;

  return (
    <div className="p-4 pb-20 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>
          <p className="text-gray-600">Gérez vos budgets mensuels</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/budgets/statistics')}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            aria-label="Voir les statistiques des budgets"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="hidden md:inline">Statistiques</span>
          </button>
          <button 
            onClick={handleCreateManualBudget}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau</span>
          </button>
        </div>
      </div>

      {/* Sélecteur de mois et année avec toggle */}
      <div className="card">
        <div className="flex items-center justify-between w-full">
          {/* Left side - selectors */}
          <div className="flex items-center space-x-4">
            <div className={`transition-all duration-300 ${viewMode === 'yearly' ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'}`}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mois</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="select-no-arrow input-field"
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
                className="select-no-arrow input-field"
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
          
          {/* Right side - toggle */}
          <div className="flex items-end">
            <div className="p-1 bg-gray-100 rounded-full inline-flex">
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  viewMode === 'monthly'
                    ? 'bg-purple-600 text-white'
                    : 'bg-transparent text-gray-600 hover:bg-gray-200'
                }`}
                aria-pressed={viewMode === 'monthly'}
                aria-label="Vue mensuelle"
              >
                Mensuel
              </button>
              <button
                onClick={() => setViewMode('yearly')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  viewMode === 'yearly'
                    ? 'bg-purple-600 text-white'
                    : 'bg-transparent text-gray-600 hover:bg-gray-200'
                }`}
                aria-pressed={viewMode === 'yearly'}
                aria-label="Vue annuelle"
              >
                Annuel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Vue d'ensemble */}
      <div className="card-glass">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {viewMode === 'yearly' ? `Vue d'ensemble ${selectedYear}` : "Vue d'ensemble"}
          </h3>
          <PieChart className="w-5 h-5 text-primary-600" />
        </div>
        
        {viewMode === 'yearly' ? (
          <>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  <CurrencyDisplay
                    amount={yearlyBudgetData.yearlyTotalBudget}
                    originalCurrency="MGA"
                    displayCurrency={displayCurrency}
                    showConversion={true}
                    size="lg"
                  />
                </div>
                <p className="text-sm text-gray-600">Budget annuel</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  <CurrencyDisplay
                    amount={yearlyBudgetData.yearlyTotalSpent}
                    originalCurrency="MGA"
                    displayCurrency={displayCurrency}
                    showConversion={true}
                    size="lg"
                  />
                </div>
                <p className="text-sm text-gray-600">Dépensé annuel</p>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${yearlyBudgetData.yearlyOverrun > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  <CurrencyDisplay
                    amount={Math.abs(yearlyBudgetData.yearlyOverrun)}
                    originalCurrency="MGA"
                    displayCurrency={displayCurrency}
                    showConversion={true}
                    size="lg"
                  />
                </div>
                <p className="text-sm text-gray-600">
                  {yearlyBudgetData.yearlyOverrun > 0 ? 'Dépassement' : 'Sous-budget'}
                </p>
              </div>
            </div>
            {yearlyBudgetData.yearlyTotalBudget > 0 && (
              <>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${
                      yearlyBudgetData.overrunPercentage > 0 ? 'bg-red-500' : 
                      (yearlyBudgetData.yearlyTotalSpent / yearlyBudgetData.yearlyTotalBudget) >= 0.8 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ 
                      width: `${Math.min((yearlyBudgetData.yearlyTotalSpent / yearlyBudgetData.yearlyTotalBudget) * 100, 100)}%` 
                    }}
                  ></div>
                </div>
                <p className="text-center text-sm text-gray-600 mt-2">
                  {yearlyBudgetData.overrunPercentage > 0 
                    ? `${yearlyBudgetData.overrunPercentage.toFixed(1)}% de dépassement`
                    : `${((yearlyBudgetData.yearlyTotalSpent / yearlyBudgetData.yearlyTotalBudget) * 100).toFixed(1)}% du budget utilisé`
                  }
                </p>
              </>
            )}
            {yearlyBudgetData.isLoading && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                <p className="ml-3 text-sm text-gray-600">Chargement des données annuelles...</p>
              </div>
            )}
            {yearlyBudgetData.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
                <p className="text-sm text-red-600">{yearlyBudgetData.error}</p>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  <CurrencyDisplay
                    amount={totalBudget}
                    originalCurrency="MGA"
                    displayCurrency={displayCurrency}
                    showConversion={true}
                    size="lg"
                  />
                </div>
                <p className="text-sm text-gray-600">Budget total</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  <CurrencyDisplay
                    amount={totalSpent}
                    originalCurrency="MGA"
                    displayCurrency={displayCurrency}
                    showConversion={true}
                    size="lg"
                  />
                </div>
                <p className="text-sm text-gray-600">Dépensé</p>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <CurrencyDisplay
                    amount={Math.abs(totalRemaining)}
                    originalCurrency="MGA"
                    displayCurrency={displayCurrency}
                    showConversion={true}
                    size="lg"
                  />
                </div>
                <p className={`text-sm ${totalRemaining >= 0 ? 'text-gray-600' : 'text-red-600'}`}>
                  {totalRemaining >= 0 ? 'Restant' : 'Dépassé'}
                </p>
              </div>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              {totalSpent > totalBudget ? (
                // Bicolor bar for overspent budgets
                <div className="flex h-full">
                  <div 
                    className="bg-green-500 h-full"
                    style={{ width: `${(totalBudget / totalSpent) * 100}%` }}
                  />
                  <div 
                    className="bg-red-500 h-full"
                    style={{ width: `${((totalSpent - totalBudget) / totalSpent) * 100}%` }}
                  />
                </div>
              ) : (
                // Single color bar for normal budgets
                <div
                  className={`h-3 rounded-full ${
                    overallPercentage >= 80 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(overallPercentage, 100)}%` }}
                ></div>
              )}
            </div>
            <p className="text-center text-sm text-gray-600 mt-2">
              {overallPercentage.toFixed(1)}% du budget utilisé
            </p>
          </>
        )}
      </div>

      {/* Graphique annuel - affiché uniquement en mode annuel */}
      {viewMode === 'yearly' && !yearlyBudgetData.isLoading && !yearlyBudgetData.error && (
        <YearlyBudgetChart monthlyData={yearlyBudgetData.monthlyData} />
      )}

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
                        {(() => {
                          const IconComponent = getCategoryIcon(categoryInfo?.icon);
                          return <IconComponent className={`w-5 h-5 ${categoryInfo?.color || 'text-gray-600'}`} />;
                        })()}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{categoryInfo?.name || category}</h4>
                        <p className="text-sm text-gray-500">
                          <CurrencyDisplay
                            amount={customAmount}
                            originalCurrency="MGA"
                            displayCurrency={displayCurrency}
                            showConversion={true}
                            size="sm"
                          /> / mois
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
        {viewMode === 'monthly' ? (
          // Mode mensuel - cartes existantes
          budgets.map((budget) => {
          const category = TRANSACTION_CATEGORIES[budget.category] || {
            name: budget.category,
            icon: 'MoreHorizontal',
            color: 'text-gray-500',
            bgColor: 'bg-gray-100'
          };
          const status = getBudgetStatus(budget);
          // Protection contre division par zéro
          const percentage = budget.amount > 0 
            ? ((budget.spent || 0) / budget.amount) * 100 
            : 0;
          const remaining = budget.amount - (budget.spent || 0);

          const isEditing = editingBudgetId === budget.id;

          return (
            <div 
              key={budget.id} 
              className={`card hover:shadow-lg transition-shadow ${!isEditing ? 'cursor-pointer' : ''}`}
              onClick={!isEditing ? () => handleBudgetClick(budget.category as TransactionCategory) : undefined}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3 flex-1">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${category.bgColor}`}>
                    {(() => {
                      const IconComponent = getCategoryIcon(category.icon);
                      return <IconComponent className={`w-5 h-5 ${category.color}`} />;
                    })()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">{category.name}</h4>
                      {!isEditing && (
                        <div className="flex items-center space-x-1 ml-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditBudget(budget.id, budget.amount);
                            }}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            aria-label="Modifier le budget"
                            title="Modifier"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                e.stopPropagation();
                                handleEditBudget(budget.id, budget.amount);
                              }
                            }}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBudget(budget.id, category.name);
                            }}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            aria-label="Supprimer le budget"
                            title="Supprimer"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteBudget(budget.id, category.name);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="flex items-center space-x-2 mt-2">
                        <input
                          type="number"
                          value={editingAmount}
                          onChange={(e) => setEditingAmount(Number(e.target.value))}
                          className="w-32 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          min="0"
                          step="1000"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                              handleSaveEdit(budget.id);
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              e.stopPropagation();
                              handleCancelEdit();
                            }
                          }}
                          aria-label="Montant du budget"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveEdit(budget.id);
                          }}
                          className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                          aria-label="Sauvegarder"
                          disabled={isLoadingBudgets}
                          tabIndex={0}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelEdit();
                          }}
                          className="p-1.5 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
                          aria-label="Annuler"
                          tabIndex={0}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        <CurrencyDisplay
                          amount={budget.amount}
                          originalCurrency="MGA"
                          displayCurrency={displayCurrency}
                          showConversion={true}
                          size="sm"
                        /> / mois
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="text-right ml-4">
                  <p className={`font-semibold ${status.color}`}>
                    <CurrencyDisplay
                      amount={budget.spent || 0}
                      originalCurrency="MGA"
                      displayCurrency={displayCurrency}
                      showConversion={true}
                      size="md"
                    />
                  </p>
                  <p className="text-sm text-gray-500">
                    {isFinite(percentage) && !isNaN(percentage) ? percentage.toFixed(1) + '%' : 'N/A'}
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

              {!isEditing && (
                <div className="space-y-2">
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    {(budget.spent || 0) > budget.amount ? (
                      // Bicolor bar for overspent budgets
                      <div className="flex h-full">
                        <div 
                          className="bg-green-500 h-full"
                          style={{ width: `${(budget.amount / budget.spent) * 100}%` }}
                        />
                        <div 
                          className="bg-red-500 h-full"
                          style={{ width: `${((budget.spent - budget.amount) / budget.spent) * 100}%` }}
                        />
                      </div>
                    ) : (
                      // Single color bar for normal budgets
                      <div
                        className={`h-2 rounded-full ${
                          status.status === 'exceeded' ? 'bg-red-500' :
                          status.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      ></div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    {(budget.spent || 0) > budget.amount ? (
                      <span className="text-red-600">
                        Dépassé: -<CurrencyDisplay
                          amount={(budget.spent || 0) - budget.amount}
                          originalCurrency="MGA"
                          displayCurrency={displayCurrency}
                          showConversion={true}
                          size="sm"
                        />
                      </span>
                    ) : (
                      <span className="text-gray-600">
                        Restant: <CurrencyDisplay
                          amount={Math.max(0, remaining)}
                          originalCurrency="MGA"
                          displayCurrency={displayCurrency}
                          showConversion={true}
                          size="sm"
                        />
                      </span>
                    )}
                    <div className="flex items-center space-x-1">
                      {status.status === 'exceeded' && (
                        <>
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          <span className={status.color}>{status.label || 'Dépassé'}</span>
                        </>
                      )}
                      {status.status === 'warning' && (
                        <>
                          <AlertTriangle className="w-4 h-4 text-yellow-500" />
                          <span className={status.color}>{status.label || 'Attention'}</span>
                        </>
                      )}
                      {status.status === 'good' && (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className={status.color}>{status.label || 'Bon'}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })
        ) : (
          // Mode annuel - cartes avec données agrégées
          yearlyBudgetData.categoryBreakdown.length > 0 ? (
            yearlyBudgetData.categoryBreakdown.map((categoryData) => {
              const category = TRANSACTION_CATEGORIES[categoryData.category] || {
                name: categoryData.categoryName,
                icon: 'MoreHorizontal',
                color: 'text-gray-500',
                bgColor: 'bg-gray-100'
              };

              // Calculer les valeurs pour l'affichage
              const yearlyBudget = categoryData.yearlyBudget;
              const yearlySpent = categoryData.yearlySpent;
              const monthlyAverage = yearlyBudget / 12;
              const overrun = yearlySpent - yearlyBudget;
              const remaining = yearlyBudget - yearlySpent;

              // Calculer le pourcentage de dépense (spent/budget * 100)
              const spentPercentage = yearlyBudget > 0 
                ? (yearlySpent / yearlyBudget) * 100
                : 0;

              // Vérifier si c'est la catégorie Épargne
              const isEpargne = categoryData.category.toLowerCase() === 'epargne';

              // Déterminer le statut basé sur le pourcentage de dépense
              let statusColor = 'text-green-600';
              let statusBgColor = 'bg-green-100';
              let statusText = 'Bon';
              let statusIcon = <CheckCircle className="w-4 h-4 text-green-500" />;
              let progressBarColor = 'bg-green-500';

              if (isEpargne) {
                // Logique inversée pour l'épargne : dépenser plus (épargner plus) est bon
                if (spentPercentage === 0) {
                  // À faire (0%)
                  statusColor = 'text-red-600';
                  statusBgColor = 'bg-red-100';
                  statusText = 'À faire';
                  statusIcon = <AlertTriangle className="w-4 h-4 text-red-500" />;
                  progressBarColor = 'bg-red-500';
                } else if (spentPercentage < 100) {
                  // Attention (1-99%)
                  statusColor = 'text-yellow-600';
                  statusBgColor = 'bg-yellow-100';
                  statusText = 'Attention';
                  statusIcon = <AlertTriangle className="w-4 h-4 text-yellow-500" />;
                  progressBarColor = 'bg-yellow-500';
                } else {
                  // Bon (100%+)
                  statusColor = 'text-green-600';
                  statusBgColor = 'bg-green-100';
                  statusText = 'Bon';
                  statusIcon = <CheckCircle className="w-4 h-4 text-green-500" />;
                  progressBarColor = 'bg-green-500';
                }
              } else {
                // Logique normale pour les autres catégories
                if (spentPercentage > 115) {
                  // Dépassé (> 115%)
                  statusColor = 'text-red-600';
                  statusBgColor = 'bg-red-100';
                  statusText = 'Dépassé';
                  statusIcon = <AlertTriangle className="w-4 h-4 text-red-500" />;
                  progressBarColor = 'bg-red-500';
                } else if (spentPercentage >= 100) {
                  // Attention (100-115%)
                  statusColor = 'text-yellow-600';
                  statusBgColor = 'bg-yellow-100';
                  statusText = 'Attention';
                  statusIcon = <AlertTriangle className="w-4 h-4 text-yellow-500" />;
                  progressBarColor = 'bg-yellow-500';
                }
              }

              // Pourcentage pour la barre de progression (capped à 100% visuellement)
              const progressPercentage = Math.min(spentPercentage, 100);

              return (
                <div 
                  key={categoryData.category} 
                  className="card hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleYearlyBudgetClick(categoryData.category)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${category.bgColor}`}>
                        {(() => {
                          const IconComponent = getCategoryIcon(category.icon);
                          return <IconComponent className={`w-5 h-5 ${category.color}`} />;
                        })()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900">{category.name}</h4>
                          {/* Info text au lieu des boutons edit/delete */}
                          <div className="flex items-center space-x-1 ml-2">
                            <span className="text-xs text-gray-400" title="Modifiez les budgets mois par mois">
                              <AlertTriangle className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                        <div className="mt-1">
                          <p className="text-sm font-medium text-gray-900">
                            {formatNumber(yearlyBudget)} Ar/an
                          </p>
                          <p className="text-xs text-gray-500">
                            ≈ {formatNumber(Math.round(monthlyAverage))} Ar/mois
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right ml-4">
                      <p className="font-semibold text-red-600">
                        {formatNumber(yearlySpent)} Ar
                      </p>
                      <p className="text-sm text-gray-500">
                        {spentPercentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      {yearlySpent > yearlyBudget ? (
                        // Bicolor bar for overspent budgets
                        <div className="flex h-full">
                          <div 
                            className="bg-green-500 h-full transition-all duration-300"
                            style={{ width: `${(yearlyBudget / yearlySpent) * 100}%` }}
                          />
                          <div 
                            className="bg-red-500 h-full transition-all duration-300"
                            style={{ width: `${((yearlySpent - yearlyBudget) / yearlySpent) * 100}%` }}
                          />
                        </div>
                      ) : (
                        // Single color bar for normal budgets
                        <div
                          className={`h-2 rounded-full ${progressBarColor} transition-all duration-300`}
                          style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                        ></div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      {overrun > 0 ? (
                        <span className="text-red-600">
                          Dépassé: -<span className="font-medium">
                            {formatNumber(overrun)} Ar
                          </span>
                        </span>
                      ) : (
                        <span className="text-gray-600">
                          Restant: <span className="text-green-600 font-medium">
                            {formatNumber(remaining)} Ar
                          </span>
                        </span>
                      )}
                      <div className="flex items-center space-x-1">
                        {statusIcon}
                        {(statusText !== 'Dépassé' || isEpargne) && (
                          <span className={statusColor}>
                            {statusText}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            // État vide pour le mode annuel
            <div className="card text-center py-8">
              <PieChart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">Aucun budget pour cette année</p>
              <p className="text-sm text-gray-500 mt-1">
                Créez des budgets mensuels pour voir les données annuelles agrégées
              </p>
            </div>
          )
        )}
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

      {/* Modal de création de budget */}
      <Modal
        isOpen={showCreateForm}
        onClose={handleCancelCreate}
        title="Créer un nouveau budget"
        size="md"
      >
        <div className="space-y-4">
          {/* Catégorie */}
          <div>
            <label htmlFor="budget-category" className="block text-sm font-medium text-gray-700 mb-2">
              Catégorie <span className="text-red-500">*</span>
            </label>
            <select
              id="budget-category"
              value={newBudget.category}
              onChange={(e) => {
                const selectedCategory = e.target.value;
                setNewBudget(prev => ({
                  ...prev,
                  category: selectedCategory,
                  name: prev.name || (selectedCategory ? TRANSACTION_CATEGORIES[selectedCategory as TransactionCategory]?.name || selectedCategory : '')
                }));
              }}
              className="select-no-arrow w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            >
              <option value="">Sélectionner une catégorie</option>
              {Object.entries(TRANSACTION_CATEGORIES)
                .filter(([key]) => {
                  // Filtrer les catégories qui ont déjà un budget ce mois-ci
                  const hasBudget = budgets.some(
                    budget => budget.category.toLowerCase() === key.toLowerCase() &&
                              budget.month === selectedMonth &&
                              budget.year === selectedYear
                  );
                  return !hasBudget;
                })
                .map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.name}
                  </option>
                ))}
            </select>
            {budgets.some(
              budget => budget.category.toLowerCase() === newBudget.category.toLowerCase() &&
                        budget.month === selectedMonth &&
                        budget.year === selectedYear
            ) && (
              <p className="mt-1 text-sm text-red-600">
                Un budget existe déjà pour cette catégorie ce mois-ci
              </p>
            )}
          </div>

          {/* Montant */}
          <div>
            <label htmlFor="budget-amount" className="block text-sm font-medium text-gray-700 mb-2">
              Montant (Ar) <span className="text-red-500">*</span>
            </label>
            <input
              id="budget-amount"
              type="number"
              value={newBudget.amount || ''}
              onChange={(e) => setNewBudget(prev => ({ ...prev, amount: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              min="0"
              step="1000"
              placeholder="0"
              required
            />
            {newBudget.amount <= 0 && newBudget.amount !== 0 && (
              <p className="mt-1 text-sm text-red-600">
                Le montant doit être supérieur à 0
              </p>
            )}
          </div>

          {/* Nom (optionnel) */}
          <div>
            <label htmlFor="budget-name" className="block text-sm font-medium text-gray-700 mb-2">
              Nom du budget <span className="text-gray-400 text-xs">(optionnel)</span>
            </label>
            <input
              id="budget-name"
              type="text"
              value={newBudget.name}
              onChange={(e) => setNewBudget(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder={newBudget.category ? `Budget ${TRANSACTION_CATEGORIES[newBudget.category as TransactionCategory]?.name || newBudget.category}` : 'Nom du budget'}
            />
            <p className="mt-1 text-xs text-gray-500">
              Si vide, le nom sera généré automatiquement à partir de la catégorie
            </p>
          </div>

          {/* Informations */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Période :</strong> {new Date(selectedYear, selectedMonth - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Le budget sera créé pour le mois sélectionné
            </p>
          </div>
        </div>

        {/* Footer avec boutons */}
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
          <button
            onClick={handleCancelCreate}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            disabled={isLoadingBudgets}
          >
            Annuler
          </button>
          <button
            onClick={handleSaveNewBudget}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoadingBudgets || !newBudget.category || newBudget.amount <= 0}
          >
            {isLoadingBudgets ? 'Création...' : 'Créer le budget'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default BudgetsPage;
