import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Target, Calendar, TrendingUp, CheckCircle, Clock, Edit3, Trash2, X, Check, Landmark, RefreshCw, Lightbulb, Shield, PiggyBank, GraduationCap, Plane, Home, ChevronDown, ChevronUp, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAppStore } from '../stores/appStore';
import { goalService } from '../services/goalService';
import { savingsService } from '../services/savingsService';
import { goalSuggestionService } from '../services/goalSuggestionService';
import accountService from '../services/accountService';
import { db } from '../lib/database';
import type { Goal, GoalFormData, Account } from '../types';
import type { GoalSuggestion, MilestoneType } from '../types/suggestions';
import { CurrencyDisplay } from '../components/Currency';
import type { Currency } from '../components/Currency';
import Modal from '../components/UI/Modal';
import { showConfirm } from '../utils/dialogUtils';
import GoalProgressionChart from '../components/Goals/GoalProgressionChart';
import MilestoneCelebrationModal from '../components/Goals/MilestoneCelebrationModal';
import MilestoneBadges from '../components/Goals/MilestoneBadges';
import celebrationService from '../services/celebrationService';
import type { PendingCelebration, MilestoneThreshold } from '../services/celebrationService';

const CURRENCY_STORAGE_KEY = 'bazarkely_display_currency';

const GoalsPage = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAppStore();
  
  // Modal management state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Savings accounts state
  const [savingsAccounts, setSavingsAccounts] = useState<Account[]>([]);
  const [syncingGoalId, setSyncingGoalId] = useState<string | null>(null);
  
  // New account creation state
  const [createNewAccount, setCreateNewAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  
  // Chart state
  const [selectedGoalForChart, setSelectedGoalForChart] = useState<Goal | null>(null);
  
  // Suggestions state
  const [suggestions, setSuggestions] = useState<GoalSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isRequestingSuggestions, setIsRequestingSuggestions] = useState(false);
  
  // Link account modal state
  const [showLinkAccountModal, setShowLinkAccountModal] = useState(false);
  const [goalToLink, setGoalToLink] = useState<Goal | null>(null);
  
  // Celebration state (new celebrationService integration)
  const [pendingCelebration, setPendingCelebration] = useState<PendingCelebration | null>(null);
  const [goalBadges, setGoalBadges] = useState<Record<string, MilestoneThreshold[]>>({});
  
  // Migration flag - one-time deadline recalculation per session
  const migrationExecutedRef = useRef(false);
  
  // Legacy celebration state (keep for backward compatibility)
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMilestone, setCelebrationMilestone] = useState<MilestoneType | null>(null);
  const [celebratedGoal, setCelebratedGoal] = useState<Goal | null>(null);
  
  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    deadline: '',
    category: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    description: '',
    linkedAccountId: '',
    autoSync: false
  });
  
  // Currency integration state
  // Read display currency preference from localStorage on mount
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

  // Refresh goals function
  const refreshGoals = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const userGoals = await goalService.getGoals(user.id);
      setGoals(userGoals);
    } catch (error) {
      console.error('Erreur lors du chargement des objectifs:', error);
      toast.error('Erreur lors du chargement des objectifs');
    } finally {
      setIsLoading(false);
    }
  };

  // Charger les suggestions
  const loadSuggestions = async () => {
    if (!user) return;
    try {
      setLoadingSuggestions(true);
      const userSuggestions = await goalSuggestionService.getSuggestionsForUser(user.id);
      setSuggestions(userSuggestions);
      setShowSuggestions(userSuggestions.length > 0);
    } catch (error) {
      console.error('Erreur lors du chargement des suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Vérifier les jalons atteints
  const checkMilestones = async () => {
    if (!user || goals.length === 0) return;
    
    for (const goal of goals) {
      const milestone = goalSuggestionService.checkMilestones(goal);
      if (!milestone) continue;

      // Vérifier si le jalon a déjà été célébré
      const milestones = goal.milestones || [];
      const existingMilestone = milestones.find((m: any) => m.milestoneType === milestone);
      
      if (!existingMilestone || !existingMilestone.celebrationShown) {
        setCelebrationMilestone(milestone);
        setCelebratedGoal(goal);
        setShowCelebration(true);
        break; // Ne montrer qu'un jalon à la fois
      }
    }
  };

  // One-time migration: Recalculate deadlines for goals with requiredMonthlyContribution
  // This migrates existing goals created before Phase B3.4
  const migrateGoalDeadlines = async () => {
    if (!user || migrationExecutedRef.current || goals.length === 0) {
      return;
    }

    migrationExecutedRef.current = true;
    console.log('🔄 [GoalsPage] Migration B3.4: Vérification des deadlines à recalculer...');

    try {
      // Filter goals that have requiredMonthlyContribution but potentially outdated deadline
      const goalsToMigrate = goals.filter(goal => {
        // Only migrate goals with requiredMonthlyContribution
        if (!goal.requiredMonthlyContribution || goal.requiredMonthlyContribution <= 0) {
          return false;
        }

        // Skip completed goals
        if (goal.isCompleted || goal.currentAmount >= goal.targetAmount) {
          return false;
        }

        // Calculate expected deadline using recalculateDeadline formula
        const expectedDeadline = goalService.recalculateDeadline(goal);
        if (!expectedDeadline) {
          return false; // Cannot recalculate (no valid contribution)
        }

        // Compare with current deadline (difference > 7 days)
        const currentDeadline = goal.deadline instanceof Date ? goal.deadline : new Date(goal.deadline);
        const diffDays = Math.abs((expectedDeadline.getTime() - currentDeadline.getTime()) / (1000 * 60 * 60 * 24));
        
        return diffDays > 7; // Only migrate if difference is significant (> 7 days)
      });

      if (goalsToMigrate.length === 0) {
        console.log('🔄 [GoalsPage] Migration B3.4: Aucun objectif nécessitant une mise à jour de deadline');
        return;
      }

      console.log(`🔄 [GoalsPage] Migration B3.4: ${goalsToMigrate.length} objectif(s) nécessitant une mise à jour de deadline`);

      // Update each goal in background (non-blocking)
      for (const goal of goalsToMigrate) {
        try {
          const expectedDeadline = goalService.recalculateDeadline(goal);
          if (!expectedDeadline) {
            console.warn(`🔄 [GoalsPage] Migration B3.4: Impossible de recalculer la deadline pour "${goal.name}"`);
            continue;
          }

          const currentDeadline = goal.deadline instanceof Date ? goal.deadline : new Date(goal.deadline);
          const diffDays = Math.abs((expectedDeadline.getTime() - currentDeadline.getTime()) / (1000 * 60 * 60 * 24));

          console.log(`🔄 [GoalsPage] Migration B3.4: Mise à jour deadline pour "${goal.name}":`, {
            currentDeadline: currentDeadline.toISOString().split('T')[0],
            expectedDeadline: expectedDeadline.toISOString().split('T')[0],
            diffDays: Math.round(diffDays),
            requiredMonthlyContribution: goal.requiredMonthlyContribution
          });

          // Call updateGoal to trigger recalculation
          // Passing deadline will trigger the recalculation logic in updateGoal
          await goalService.updateGoal(goal.id, goal.userId, {
            deadline: expectedDeadline
          });

          console.log(`✅ [GoalsPage] Migration B3.4: Deadline mise à jour pour "${goal.name}"`);
        } catch (error) {
          console.error(`❌ [GoalsPage] Migration B3.4: Erreur lors de la mise à jour de "${goal.name}":`, error);
          // Continue with other goals even if one fails
        }
      }

      // Refresh goals after migration to reflect updated deadlines
      if (goalsToMigrate.length > 0) {
        console.log(`✅ [GoalsPage] Migration B3.4: Migration terminée. ${goalsToMigrate.length} objectif(s) mis à jour`);
        // Reload goals to reflect changes
        await refreshGoals();
      }
    } catch (error) {
      console.error('❌ [GoalsPage] Migration B3.4: Erreur lors de la migration:', error);
      // Don't block UI - migration failure is non-critical
    }
  };

  // Charger les objectifs réels et les comptes d'épargne
  useEffect(() => {
    refreshGoals();
    loadSuggestions();
    
    // Charger les comptes d'épargne
    const loadSavingsAccounts = async () => {
      if (!user) return;
      try {
        const accounts = await savingsService.getSavingsAccounts(user.id);
        setSavingsAccounts(accounts);
      } catch (error) {
        console.error('Erreur lors du chargement des comptes d\'épargne:', error);
      }
    };
    
    loadSavingsAccounts();
  }, [user]);

  // Run migration after goals are loaded (one-time per session)
  useEffect(() => {
    if (!isLoading && goals.length > 0 && user && !migrationExecutedRef.current) {
      // Run migration in background (non-blocking)
      // eslint-disable-next-line react-hooks/exhaustive-deps
      migrateGoalDeadlines().catch(error => {
        console.error('❌ [GoalsPage] Migration B3.4: Erreur non-critique:', error);
      });
    }
  }, [goals, isLoading, user]);

  // Vérifier les jalons après le chargement des goals
  useEffect(() => {
    if (goals.length > 0 && !isLoading) {
      checkMilestones();
    }
  }, [goals, isLoading]);

  // Check for pending celebrations when goals change (new celebrationService)
  useEffect(() => {
    const checkCelebrations = async () => {
      console.log('🎉 [Celebrations] Starting celebration check...');
      console.log('🎉 [Celebrations] Goals count:', goals?.length);
      
      if (!goals || goals.length === 0) {
        console.log('🎉 [Celebrations] No goals, skipping celebration check');
        return;
      }
      
      // Load badges for all goals
      const badgesMap: Record<string, MilestoneThreshold[]> = {};
      for (const goal of goals) {
        console.log(`🎉 [Celebrations] Loading badges for goal: ${goal.name} (${goal.id})`);
        const celebrated = await celebrationService.getCelebratedMilestones(goal.id);
        console.log(`🎉 [Celebrations] Goal ${goal.name}: celebrated milestones =`, celebrated);
        badgesMap[goal.id] = celebrated;
      }
      setGoalBadges(badgesMap);
      
      // Check for first pending celebration (show one at a time)
      for (const goal of goals) {
        const percentage = (goal.currentAmount / goal.targetAmount) * 100;
        console.log(`🎉 [Celebrations] Checking goal: ${goal.name}`);
        console.log(`🎉 [Celebrations]   - currentAmount: ${goal.currentAmount} (type: ${typeof goal.currentAmount})`);
        console.log(`🎉 [Celebrations]   - targetAmount: ${goal.targetAmount} (type: ${typeof goal.targetAmount})`);
        console.log(`🎉 [Celebrations]   - percentage: ${percentage.toFixed(1)}%`);
        
        const pending = await celebrationService.checkForPendingCelebration(
          goal.id,
          goal.name,
          goal.currentAmount,
          goal.targetAmount
        );
        console.log(`🎉 [Celebrations] Goal ${goal.name}: pending celebration =`, pending);
        
        if (pending) {
          console.log('🎉 [Celebrations] ✅ Found pending celebration:', pending);
          console.log('🎉 [Celebrations] Setting pendingCelebration state...');
          setPendingCelebration(pending);
          break; // Show only one celebration at a time
        } else {
          console.log(`🎉 [Celebrations] No pending celebration for goal ${goal.name}`);
        }
      }
      
      console.log('🎉 [Celebrations] Celebration check complete');
    };
    
    checkCelebrations();
  }, [goals]);

  // Handlers
  const handleCreateGoal = () => {
    setEditingGoal(null);
    setCreateNewAccount(false);
    setNewAccountName('');
    setFormData({
      name: '',
      targetAmount: '',
      deadline: '',
      category: '',
      priority: 'medium',
      description: '',
      linkedAccountId: '',
      autoSync: false
    });
    setIsModalOpen(true);
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setCreateNewAccount(false);
    setNewAccountName('');
    setFormData({
      name: goal.name,
      targetAmount: goal.targetAmount.toString(),
      deadline: goal.deadline instanceof Date 
        ? goal.deadline.toISOString().split('T')[0]
        : new Date(goal.deadline).toISOString().split('T')[0],
      category: goal.category || '',
      priority: goal.priority,
      description: '',
      linkedAccountId: goal.linkedAccountId || '',
      autoSync: goal.autoSync || false
    });
    setIsModalOpen(true);
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!user) return;
    
    const goal = goals.find(g => g.id === goalId);
    const confirmed = await showConfirm(
      `Cette action est irréversible. Voulez-vous vraiment supprimer l'objectif "${goal?.name}" ?`,
      'Supprimer cet objectif ?',
      {
        confirmText: 'Supprimer',
        cancelText: 'Annuler',
        variant: 'danger'
      }
    );

    if (!confirmed) return;

    try {
      setIsDeleting(true);
      await goalService.deleteGoal(goalId, user.id);
      toast.success('Objectif supprimé avec succès');
      await refreshGoals();
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'objectif:', error);
      toast.error('Erreur lors de la suppression de l\'objectif');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddSavings = async (goal: Goal) => {
    // Check if goal has linked account
    if (!goal.linkedAccountId) {
      // Show modal asking to link account
      setGoalToLink(goal);
      setShowLinkAccountModal(true);
      return;
    }
    
    // Calculate suggested amount (monthly contribution)
    // Use targetAmount / 12 as default monthly contribution
    const suggestedAmount = Math.round(goal.targetAmount / 12);
    
    // Prepare navigation state
    const transferState = {
      destinationAccountId: goal.linkedAccountId,
      suggestedAmount: suggestedAmount,
      goalId: goal.id,
      goalName: goal.name,
      returnTo: '/goals'
    };
    
    console.log('🎯 [GoalsPage] Navigation vers /transfer avec state:', transferState);
    
    // Navigate to transfer page with state
    navigate('/transfer', { state: transferState });
  };

  const handleSyncGoal = async (goalId: string) => {
    if (!user) return;
    
    try {
      setSyncingGoalId(goalId);
      await savingsService.syncGoalWithAccount(goalId);
      toast.success('Objectif synchronisé');
      await refreshGoals();
    } catch (error) {
      console.error('Erreur lors de la synchronisation de l\'objectif:', error);
      toast.error('Erreur lors de la synchronisation de l\'objectif');
    } finally {
      setSyncingGoalId(null);
    }
  };

  // Handlers pour les suggestions
  const handleAcceptSuggestion = async (suggestion: GoalSuggestion) => {
    if (!user) return;
    
    try {
      await goalSuggestionService.acceptSuggestion(user.id, suggestion);
      await refreshGoals();
      await loadSuggestions();
      toast.success(`Objectif "${suggestion.title}" créé avec succès !`);
    } catch (error) {
      console.error('Erreur lors de l\'acceptation de la suggestion:', error);
      toast.error('Erreur lors de la création de l\'objectif');
    }
  };

  const handleDismissSuggestion = async (suggestion: GoalSuggestion) => {
    if (!user) return;
    
    try {
      await goalSuggestionService.dismissSuggestion(user.id, suggestion.type);
      setSuggestions(prev => prev.filter(s => s.type !== suggestion.type));
      toast.success('Suggestion ignorée');
    } catch (error) {
      console.error('Erreur lors du rejet de la suggestion:', error);
      toast.error('Erreur lors du rejet de la suggestion');
    }
  };

  const handleRequestSuggestions = async () => {
    if (!user?.id) return;
    
    setIsRequestingSuggestions(true);
    console.log('💡 [GoalsPage] Requesting new suggestions...');
    
    try {
      const newSuggestions = await goalSuggestionService.requestNewSuggestions(user.id);
      setSuggestions(newSuggestions);
      
      if (newSuggestions.length > 0) {
        toast.success(`${newSuggestions.length} suggestion(s) disponible(s) !`);
      } else {
        toast('Aucune nouvelle suggestion pour le moment. Continuez vos objectifs actuels !', {
          icon: 'ℹ️',
          duration: 4000
        });
      }
    } catch (error) {
      console.error('💡 [GoalsPage] Error requesting suggestions:', error);
      toast.error('Erreur lors de la génération des suggestions');
    } finally {
      setIsRequestingSuggestions(false);
    }
  };

  const handleCloseCelebration = async () => {
    if (celebratedGoal && celebrationMilestone) {
      await goalSuggestionService.markMilestoneCelebrated(celebratedGoal.id, celebrationMilestone);
    }
    setShowCelebration(false);
    setCelebrationMilestone(null);
    setCelebratedGoal(null);
    
    // Si c'est une célébration de complétion, recharger les suggestions
    if (celebrationMilestone === 'completed') {
      await loadSuggestions();
    }
  };

  // Handler for new celebrationService celebrations
  const handleCelebrationComplete = async () => {
    if (!pendingCelebration) return;
    
    await celebrationService.markMilestoneAsCelebrated(
      pendingCelebration.goalId,
      pendingCelebration.goalName,
      pendingCelebration.milestone
    );
    
    // Update badges
    setGoalBadges(prev => ({
      ...prev,
      [pendingCelebration.goalId]: [
        ...(prev[pendingCelebration.goalId] || []),
        pendingCelebration.milestone
      ].sort((a, b) => a - b)
    }));
    
    setPendingCelebration(null);
    
    // Check for more pending celebrations
    if (goals) {
      for (const goal of goals) {
        const pending = await celebrationService.checkForPendingCelebration(
          goal.id,
          goal.name,
          goal.currentAmount,
          goal.targetAmount
        );
        if (pending) {
          setTimeout(() => setPendingCelebration(pending), 500);
          break;
        }
      }
    }
  };

  const handleSaveGoal = async () => {
    if (!user) {
      toast.error('Utilisateur non connecté');
      return;
    }

    // Validation
    if (!formData.name.trim()) {
      toast.error('Veuillez saisir un nom pour l\'objectif');
      return;
    }

    if (!formData.targetAmount || parseFloat(formData.targetAmount) <= 0) {
      toast.error('Le montant cible doit être supérieur à 0');
      return;
    }

    if (!formData.deadline) {
      toast.error('Veuillez sélectionner une date d\'échéance');
      return;
    }

    // Validation pour création de nouveau compte
    if (createNewAccount && !newAccountName.trim()) {
      toast.error('Veuillez entrer un nom pour le compte épargne');
      return;
    }

    try {
      setIsLoading(true);
      
      const goalData: GoalFormData = {
        name: formData.name.trim(),
        targetAmount: parseFloat(formData.targetAmount),
        deadline: new Date(formData.deadline),
        category: formData.category || undefined,
        priority: formData.priority,
        linkedAccountId: formData.linkedAccountId || undefined
      };

      if (editingGoal) {
        // Update existing goal
        const previousLinkedAccountId = editingGoal.linkedAccountId;
        const newLinkedAccountId = formData.linkedAccountId || undefined;
        
        // Gérer la liaison/déliaison du compte
        if (previousLinkedAccountId !== newLinkedAccountId) {
          if (previousLinkedAccountId && !newLinkedAccountId) {
            // Délier le compte
            await savingsService.unlinkGoalFromAccount(editingGoal.id);
          } else if (!previousLinkedAccountId && newLinkedAccountId) {
            // Lier un nouveau compte
            await savingsService.linkGoalToAccount(editingGoal.id, newLinkedAccountId);
          } else if (previousLinkedAccountId && newLinkedAccountId && previousLinkedAccountId !== newLinkedAccountId) {
            // Changer de compte lié
            await savingsService.unlinkGoalFromAccount(editingGoal.id);
            await savingsService.linkGoalToAccount(editingGoal.id, newLinkedAccountId);
          }
        }
        
        // Mettre à jour l'objectif
        await goalService.updateGoal(editingGoal.id, user.id, goalData);
        
        // Mettre à jour autoSync et linkedAccountId dans IndexedDB directement
        const updatedGoal = await goalService.getGoal(editingGoal.id);
        if (updatedGoal) {
          const goalWithAutoSync: Goal = {
            ...updatedGoal,
            linkedAccountId: newLinkedAccountId || undefined,
            autoSync: newLinkedAccountId ? formData.autoSync : false
          };
          await db.goals.put(goalWithAutoSync);
          console.log('💾 [GoalsPage] Goal mis à jour dans IndexedDB avec linkedAccountId:', newLinkedAccountId);
        }
        
        toast.success('Objectif modifié avec succès');
      } else {
        // Create new goal
        if (createNewAccount && newAccountName.trim()) {
          // Créer un nouveau compte d'épargne avec l'objectif atomiquement
          const { goal, account } = await savingsService.createGoalWithAccount(
            user.id,
            goalData,
            newAccountName.trim()
          );
          
          // Recharger la liste des comptes d'épargne
          const accounts = await savingsService.getSavingsAccounts(user.id);
          setSavingsAccounts(accounts);
          
          toast.success('Objectif et compte épargne créés avec succès');
        } else {
          // Création normale sans compte ou avec compte existant
          const newGoal = await goalService.createGoal(user.id, goalData);
          
          // Si un compte est lié, utiliser savingsService pour la liaison complète
          if (formData.linkedAccountId) {
            await savingsService.linkGoalToAccount(newGoal.id, formData.linkedAccountId);
            
            // Récupérer l'objectif mis à jour pour s'assurer que linkedAccountId est bien présent
            const updatedNewGoal = await goalService.getGoal(newGoal.id);
            if (updatedNewGoal) {
              // Activer autoSync si demandé et s'assurer que linkedAccountId est présent
              const goalWithAutoSync: Goal = {
                ...updatedNewGoal,
                linkedAccountId: formData.linkedAccountId,
                autoSync: formData.autoSync || false
              };
              await db.goals.put(goalWithAutoSync);
              console.log('💾 [GoalsPage] Nouveau goal mis à jour dans IndexedDB avec linkedAccountId:', formData.linkedAccountId);
            }
          }
          
          toast.success('Objectif créé avec succès');
        }
      }

      setIsModalOpen(false);
      setCreateNewAccount(false);
      setNewAccountName('');
      await refreshGoals();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'objectif:', error);
      toast.error(editingGoal ? 'Erreur lors de la modification de l\'objectif' : 'Erreur lors de la création de l\'objectif');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelModal = () => {
    setIsModalOpen(false);
    setEditingGoal(null);
    setCreateNewAccount(false);
    setNewAccountName('');
    setFormData({
      name: '',
      targetAmount: '',
      deadline: '',
      category: '',
      priority: 'medium',
      description: '',
      linkedAccountId: '',
      autoSync: false
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Élevée';
      case 'medium': return 'Moyenne';
      case 'low': return 'Faible';
      default: return 'Non définie';
    }
  };

  const getDaysRemaining = (goal: Goal) => {
    // If goal is already achieved, return 0
    if (goal.currentAmount >= goal.targetAmount) {
      return 0;
    }
    
    // Calculate remaining amount needed
    const amountRemaining = goal.targetAmount - goal.currentAmount;
    
    // Calculate monthly contribution
    // Use requiredMonthlyContribution if available, otherwise calculate from targetAmount / 12
    const monthlyContribution = (goal as any).requiredMonthlyContribution || Math.ceil(goal.targetAmount / 12);
    
    // Calculate months needed based on monthly contribution
    let monthsNeeded = Math.ceil(amountRemaining / monthlyContribution);
    
    // Cap between 1 and 120 months (10 years max)
    monthsNeeded = Math.max(1, Math.min(monthsNeeded, 120));
    
    // Convert months to days (approximate: 30 days per month)
    const daysRemaining = monthsNeeded * 30;
    
    console.log(`📅 [GoalsPage] Calcul jours restants pour "${goal.name}":`, {
      currentAmount: goal.currentAmount,
      targetAmount: goal.targetAmount,
      amountRemaining,
      monthlyContribution,
      monthsNeeded,
      daysRemaining
    });
    
    return daysRemaining;
  };

  // Helper pour obtenir l'icône d'une suggestion
  const getSuggestionIcon = (iconName: string) => {
    const iconMap: Record<string, any> = {
      'Shield': Shield,
      'ShieldCheck': Shield,
      'PiggyBank': PiggyBank,
      'GraduationCap': GraduationCap,
      'Plane': Plane,
      'Palmtree': Plane,
      'Home': Home,
      'TrendingUp': TrendingUp,
      'Target': Target,
      'Lightbulb': Lightbulb,
      'CreditCard': TrendingUp
    };
    const IconComponent = iconMap[iconName] || Target;
    return <IconComponent className="w-5 h-5" />;
  };

  // Helper pour obtenir le message de célébration
  const getCelebrationMessage = (milestone: MilestoneType, goalName: string): string => {
    switch (milestone) {
      case 'quarter':
        return `Excellent départ ! 🚀 Vous avez atteint 25% de ${goalName}`;
      case 'half':
        return `À mi-chemin ! 💪 Continuez comme ça pour ${goalName}`;
      case 'three_quarters':
        return `Presque là ! 🔥 Plus que 25% pour ${goalName}`;
      case 'completed':
        return `Félicitations ! 🎉 Objectif ${goalName} atteint !`;
      default:
        return `Bravo ! Vous progressez vers ${goalName}`;
    }
  };

  // Helper pour obtenir les jalons d'un goal
  const getGoalMilestones = (goal: Goal) => {
    const percentage = (goal.currentAmount / goal.targetAmount) * 100;
    const milestones = goal.milestones || [];
    
    return {
      quarter: percentage >= 25 && milestones.some((m: any) => m.milestoneType === 'quarter' && m.celebrationShown),
      half: percentage >= 50 && milestones.some((m: any) => m.milestoneType === 'half' && m.celebrationShown),
      threeQuarters: percentage >= 75 && milestones.some((m: any) => m.milestoneType === 'three_quarters' && m.celebrationShown),
      completed: percentage >= 100 && milestones.some((m: any) => m.milestoneType === 'completed' && m.celebrationShown)
    };
  };

  const filteredGoals = goals.filter(goal => {
    if (filter === 'completed') return goal.isCompleted;
    if (filter === 'active') return !goal.isCompleted;
    return true;
  });

  if (isLoading && goals.length === 0) {
    return (
      <div className="p-4 pb-20">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="ml-3 text-gray-600">Chargement des objectifs...</p>
        </div>
      </div>
    );
  }

  const activeGoals = goals.filter(goal => !goal.isCompleted);
  const completedGoals = goals.filter(goal => goal.isCompleted);
  const totalTarget = activeGoals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const totalCurrent = activeGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  return (
    <div className="p-4 pb-20 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Objectifs d'épargne</h1>
          <p className="text-gray-600">Atteignez vos objectifs financiers</p>
        </div>
        <button 
          onClick={handleCreateGoal}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvel objectif</span>
        </button>
      </div>

      {/* Section Suggestions */}
      {suggestions.length > 0 && (
        <div className="card">
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="w-full flex items-center justify-between mb-4"
          >
            <div className="flex items-center space-x-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              <div className="text-left">
                <h2 className="text-lg font-semibold text-gray-900">💡 Suggestions personnalisées</h2>
                <p className="text-sm text-gray-600">Basées sur votre profil financier</p>
              </div>
            </div>
            {showSuggestions ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {showSuggestions && (
            <div className="space-y-3">
              {loadingSuggestions ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={`${suggestion.type}-${index}`}
                      className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 shadow-sm border border-blue-100"
                    >
                      <div className="flex items-start space-x-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                          {getSuggestionIcon(suggestion.icon)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm mb-1">{suggestion.title}</h3>
                          <p className="text-xs text-gray-600 line-clamp-2">{suggestion.description}</p>
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600">Montant cible</span>
                          <CurrencyDisplay
                            amount={suggestion.targetAmount}
                            originalCurrency="MGA"
                            displayCurrency={displayCurrency}
                            showConversion={true}
                            size="sm"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">Par mois</span>
                          <span className="text-sm font-medium text-gray-900">
                            {new Intl.NumberFormat('fr-FR', {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0
                            }).format(suggestion.requiredMonthlyContribution)} Ar
                          </span>
                        </div>
                      </div>

                      <details className="mb-3">
                        <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-700">
                          Pourquoi ?
                        </summary>
                        <p className="text-xs text-gray-600 mt-2 p-2 bg-white rounded border border-gray-200">
                          {suggestion.reasoning}
                        </p>
                      </details>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleAcceptSuggestion(suggestion)}
                          className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          Accepter
                        </button>
                        <button
                          onClick={() => handleDismissSuggestion(suggestion)}
                          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium rounded-lg transition-colors"
                        >
                          Plus tard
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {suggestions.length === 0 && !loadingSuggestions && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 text-center border border-purple-200">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
              <Lightbulb className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">
                Pas de suggestions pour le moment
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Cliquez ci-dessous pour obtenir des recommandations personnalisées basées sur votre profil financier.
              </p>
            </div>
            <button
              onClick={handleRequestSuggestions}
              disabled={isRequestingSuggestions}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRequestingSuggestions ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Suggérer objectifs
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Statistiques globales */}
      <div className="card-glass">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Progression globale</h3>
          <Target className="w-5 h-5 text-primary-600" />
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Objectifs actifs</span>
            <span className="font-semibold text-gray-900">{activeGoals.length}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Objectifs atteints</span>
            <span className="font-semibold text-green-600">{completedGoals.length}</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Progression totale</span>
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
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full"
                style={{ width: `${Math.min(overallProgress, 100)}%` }}
              ></div>
            </div>
            <p className="text-center text-sm text-gray-600">
              {overallProgress.toFixed(1)}% complété
            </p>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex space-x-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all' 
              ? 'bg-primary-600 text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Tous ({goals.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'active' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Actifs ({activeGoals.length})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'completed' 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Atteints ({completedGoals.length})
        </button>
      </div>

      {/* Liste des objectifs */}
      <div className="space-y-3">
        {filteredGoals.map((goal) => {
          const percentage = (goal.currentAmount / goal.targetAmount) * 100;
          const daysRemaining = getDaysRemaining(goal);
          const isOverdue = daysRemaining < 0 && !goal.isCompleted;

          return (
            <div key={goal.id} className={`card hover:shadow-lg transition-shadow ${
              goal.isCompleted ? 'opacity-75' : ''
            }`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start space-x-3 flex-1">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    goal.isCompleted ? 'bg-green-100' : 'bg-primary-100'
                  }`}>
                    {goal.isCompleted ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Target className="w-5 h-5 text-primary-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">{goal.name}</h4>
                      {!goal.isCompleted && (
                        <div className="flex items-center space-x-1 ml-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditGoal(goal);
                            }}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            aria-label="Modifier l'objectif"
                            title="Modifier"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGoal(goal.id);
                            }}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            aria-label="Supprimer l'objectif"
                            title="Supprimer"
                            disabled={isDeleting}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{goal.category}</p>
                    <div className="flex items-center space-x-2 mt-1 flex-wrap">
                      {goal.isSuggested && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 flex items-center space-x-1">
                          <Lightbulb className="w-3 h-3" />
                          <span>Suggéré</span>
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(goal.priority)}`}>
                        {getPriorityLabel(goal.priority)}
                      </span>
                      {goal.isCompleted && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600">
                          Atteint
                        </span>
                      )}
                      {goal.linkedAccountId && (() => {
                        const linkedAccount = savingsAccounts.find(acc => acc.id === goal.linkedAccountId);
                        return (
                          <>
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 flex items-center space-x-1">
                              <Landmark className="w-3 h-3" />
                              <span>{linkedAccount?.name || 'Compte lié'}</span>
                            </span>
                            {goal.autoSync && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                Auto-sync
                              </span>
                            )}
                          </>
                        );
                      })()}
                      {/* Milestone badges */}
                      {goalBadges[goal.id] && goalBadges[goal.id].length > 0 && (
                        <MilestoneBadges celebratedMilestones={goalBadges[goal.id]} />
                      )}
                    </div>
                    {/* Milestone dots */}
                    {!goal.isCompleted && (() => {
                      const milestones = getGoalMilestones(goal);
                      const percentage = (goal.currentAmount / goal.targetAmount) * 100;
                      const categoryColors: Record<string, string> = {
                        epargne: 'bg-blue-500',
                        vacances: 'bg-green-500',
                        education: 'bg-purple-500',
                        urgence: 'bg-red-500',
                        achat: 'bg-yellow-500',
                        autre: 'bg-gray-500'
                      };
                      const fillColor = categoryColors[goal.category || 'autre'] || 'bg-primary-500';
                      
                      return (
                        <div className="flex items-center space-x-1 mt-2">
                          <span className="text-xs text-gray-500 mr-2">Jalons:</span>
                          <div className="flex space-x-1">
                            <div className={`w-2 h-2 rounded-full ${percentage >= 25 ? fillColor : 'bg-gray-300'}`} title="25%"></div>
                            <div className={`w-2 h-2 rounded-full ${percentage >= 50 ? fillColor : 'bg-gray-300'}`} title="50%"></div>
                            <div className={`w-2 h-2 rounded-full ${percentage >= 75 ? fillColor : 'bg-gray-300'}`} title="75%"></div>
                            <div className={`w-2 h-2 rounded-full ${percentage >= 100 ? fillColor : 'bg-gray-300'}`} title="100%"></div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-semibold text-gray-900">
                    <CurrencyDisplay
                      amount={goal.currentAmount}
                      originalCurrency="MGA"
                      displayCurrency={displayCurrency}
                      showConversion={true}
                      size="sm"
                    />
                  </div>
                  <div className="text-sm text-gray-500 inline-flex items-center gap-1">
                    <span>/</span>
                    <CurrencyDisplay
                      amount={goal.targetAmount}
                      originalCurrency="MGA"
                      displayCurrency={displayCurrency}
                      showConversion={true}
                      size="sm"
                    />
                  </div>
                </div>
              </div>

              {!goal.isCompleted && (
                <div className="space-y-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        percentage >= 100 ? 'bg-green-500' :
                        percentage >= 75 ? 'bg-blue-500' :
                        percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {percentage.toFixed(1)}% complété
                    </span>
                    <div className="flex items-center space-x-1">
                      {isOverdue ? (
                        <>
                          <Clock className="w-4 h-4 text-red-500" />
                          <span className="text-red-600">En retard</span>
                        </>
                      ) : (
                        <>
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600">
                            {daysRemaining > 0 ? `${daysRemaining} jours restants` : 'Échéance aujourd\'hui'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Contribution mensuelle préconisée */}
                  {goal.requiredMonthlyContribution && goal.requiredMonthlyContribution > 0 && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span className="text-sm text-blue-700">
                        Contribution mensuelle préconisée :{' '}
                        <span className="font-semibold">
                          {new Intl.NumberFormat('fr-FR', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                          }).format(goal.requiredMonthlyContribution)} Ar/mois
                        </span>
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-end pt-2 space-x-2">
                    {goal.linkedAccountId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSyncGoal(goal.id);
                        }}
                        disabled={syncingGoalId === goal.id}
                        className="text-sm px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                      >
                        <RefreshCw className={`w-4 h-4 ${syncingGoalId === goal.id ? 'animate-spin' : ''}`} />
                        <span>Synchroniser</span>
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddSavings(goal);
                      }}
                      className="text-sm px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                    >
                      Ajouter épargne
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Évolution de l'épargne */}
      <div className="card bg-white rounded-lg shadow-sm p-3">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Évolution de l'épargne</h2>
          <select
            value={selectedGoalForChart?.id || ''}
            onChange={(e) => {
              const selectedId = e.target.value;
              const goal = goals.find(g => g.id === selectedId);
              setSelectedGoalForChart(goal || null);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          >
            <option value="">Sélectionnez un objectif</option>
            {goals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.name}
              </option>
            ))}
          </select>
        </div>
        
        {selectedGoalForChart ? (
          <GoalProgressionChart goal={selectedGoalForChart} />
        ) : (
          <div className="flex items-center justify-center py-12 text-center">
            <div>
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600">Sélectionnez un objectif pour voir son évolution</p>
            </div>
          </div>
        )}
      </div>

      {filteredGoals.length === 0 && (
        <div className="text-center py-8">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun objectif</h3>
          <p className="text-gray-600 mb-4">
            {filter === 'completed' 
              ? 'Aucun objectif atteint pour le moment'
              : filter === 'active'
              ? 'Aucun objectif actif'
              : 'Commencez par créer votre premier objectif d\'épargne'
            }
          </p>
          <button 
            onClick={handleCreateGoal}
            className="btn-primary"
          >
            Créer un objectif
          </button>
        </div>
      )}

      {/* Actions rapides */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={handleCreateGoal}
          className="card hover:shadow-lg transition-shadow text-center py-4 focus:outline-none focus:ring-2 focus:ring-blue-200"
          aria-label="Créer un nouvel objectif"
        >
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <Plus className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-sm font-medium text-gray-900">Nouvel objectif</p>
        </button>

        <button 
          onClick={() => {
            const firstActiveGoal = activeGoals[0];
            if (firstActiveGoal) {
              handleAddSavings(firstActiveGoal);
            } else {
              toast.error('Aucun objectif actif disponible');
            }
          }}
          className="card hover:shadow-lg transition-shadow text-center py-4 focus:outline-none focus:ring-2 focus:ring-green-200"
          aria-label="Ajouter de l'épargne"
        >
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-sm font-medium text-gray-900">Ajouter épargne</p>
        </button>
      </div>

      {/* Link Account Modal */}
      <Modal
        isOpen={showLinkAccountModal}
        onClose={() => {
          setShowLinkAccountModal(false);
          setGoalToLink(null);
        }}
        title="Compte épargne requis"
        size="sm"
      >
        <div className="p-4">
          <p className="text-gray-700 mb-6">
            Cet objectif n'a pas de compte épargne lié. Voulez-vous en lier un maintenant ?
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                setShowLinkAccountModal(false);
                if (goalToLink) {
                  handleEditGoal(goalToLink);
                }
                setGoalToLink(null);
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              Lier un compte
            </button>
            <button
              onClick={() => {
                setShowLinkAccountModal(false);
                setGoalToLink(null);
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Annuler
            </button>
          </div>
        </div>
      </Modal>

      {/* Milestone Celebration Modal (new celebrationService) */}
      {pendingCelebration && (
        <MilestoneCelebrationModal
          celebration={pendingCelebration}
          onClose={() => setPendingCelebration(null)}
          onCelebrated={handleCelebrationComplete}
        />
      )}

      {/* Modal de célébration de jalon (legacy - keep for backward compatibility) */}
      <Modal
        isOpen={showCelebration}
        onClose={handleCloseCelebration}
        title=""
        size="sm"
      >
        <div className="text-center py-6">
          <div className="mb-4 flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center animate-bounce">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <div className="absolute inset-0 rounded-full bg-yellow-400 animate-ping opacity-75"></div>
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {celebratedGoal && celebrationMilestone
              ? getCelebrationMessage(celebrationMilestone, celebratedGoal.name)
              : 'Félicitations !'}
          </h3>
          {celebratedGoal && (
            <div className="mt-4">
              <div className="text-sm text-gray-600 mb-4">
                <CurrencyDisplay
                  amount={celebratedGoal.currentAmount}
                  originalCurrency="MGA"
                  displayCurrency={displayCurrency}
                  showConversion={true}
                  size="md"
                />
                <span className="mx-2">/</span>
                <CurrencyDisplay
                  amount={celebratedGoal.targetAmount}
                  originalCurrency="MGA"
                  displayCurrency={displayCurrency}
                  showConversion={true}
                  size="md"
                />
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((celebratedGoal.currentAmount / celebratedGoal.targetAmount) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          )}
          <button
            onClick={handleCloseCelebration}
            className="mt-6 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            Continuer
          </button>
        </div>
      </Modal>

      {/* Modal pour créer/éditer un objectif */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCancelModal}
        title={editingGoal ? 'Modifier l\'objectif' : 'Nouvel objectif'}
        size="md"
      >
        <div className="space-y-4">
          {/* Nom */}
          <div>
            <label htmlFor="goal-name" className="block text-sm font-medium text-gray-700 mb-2">
              Nom de l'objectif <span className="text-red-500">*</span>
            </label>
            <input
              id="goal-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Ex: Voyage en Europe"
              required
            />
          </div>

          {/* Montant cible */}
          <div>
            <label htmlFor="goal-amount" className="block text-sm font-medium text-gray-700 mb-2">
              Montant cible (Ar) <span className="text-red-500">*</span>
            </label>
            <input
              id="goal-amount"
              type="number"
              value={formData.targetAmount}
              onChange={(e) => setFormData(prev => ({ ...prev, targetAmount: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              min="0"
              step="1000"
              placeholder="0"
              required
            />
          </div>

          {/* Date d'échéance */}
          <div>
            <label htmlFor="goal-deadline" className="block text-sm font-medium text-gray-700 mb-2">
              Date d'échéance <span className="text-red-500">*</span>
            </label>
            <input
              id="goal-deadline"
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          {/* Catégorie */}
          <div>
            <label htmlFor="goal-category" className="block text-sm font-medium text-gray-700 mb-2">
              Catégorie <span className="text-gray-400 text-xs">(optionnel)</span>
            </label>
            <input
              id="goal-category"
              type="text"
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Ex: Voyage, Maison, Éducation..."
            />
          </div>

          {/* Priorité */}
          <div>
            <label htmlFor="goal-priority" className="block text-sm font-medium text-gray-700 mb-2">
              Priorité
            </label>
            <select
              id="goal-priority"
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="low">Faible</option>
              <option value="medium">Moyenne</option>
              <option value="high">Élevée</option>
            </select>
          </div>

          {/* Compte épargne lié */}
          <div>
            <label htmlFor="goal-linkedAccountId" className="block text-sm font-medium text-gray-700 mb-2">
              Compte épargne lié <span className="text-gray-400 text-xs">(optionnel)</span>
            </label>
            <select
              id="goal-linkedAccountId"
              value={createNewAccount ? '__create_new__' : (formData.linkedAccountId || '')}
              onChange={(e) => {
                const value = e.target.value;
                console.log('🔗 [GoalsPage] linkedAccountId changed to:', value);
                
                if (value === '__create_new__') {
                  setCreateNewAccount(true);
                  setNewAccountName('');
                  setFormData(prev => {
                    console.log('🔗 [GoalsPage] Setting linkedAccountId to empty string (create new account)');
                    return { ...prev, linkedAccountId: '', autoSync: true };
                  });
                } else if (value === '') {
                  setCreateNewAccount(false);
                  setNewAccountName('');
                  setFormData(prev => {
                    console.log('🔗 [GoalsPage] Setting linkedAccountId to empty string (no account)');
                    return { ...prev, linkedAccountId: '', autoSync: false };
                  });
                } else {
                  setCreateNewAccount(false);
                  setNewAccountName('');
                  const accountId = value || ''; // Keep as string for form state
                  setFormData(prev => {
                    console.log('🔗 [GoalsPage] Setting linkedAccountId to:', accountId);
                    return { ...prev, linkedAccountId: accountId, autoSync: prev.autoSync };
                  });
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Aucun compte lié</option>
              {!editingGoal && (
                <option value="__create_new__">➕ Créer un nouveau compte épargne</option>
              )}
              {savingsAccounts.map((account) => {
                const formattedBalance = new Intl.NumberFormat('fr-FR', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(account.balance);
                return (
                  <option key={account.id} value={account.id}>
                    {account.name} - {formattedBalance} Ar
                  </option>
                );
              })}
            </select>
          </div>

          {/* Nom du nouveau compte épargne */}
          {createNewAccount && (
            <div>
              <label htmlFor="new-account-name" className="block text-sm font-medium text-gray-700 mb-2">
                Nom du compte épargne <span className="text-red-500">*</span>
              </label>
              <input
                id="new-account-name"
                type="text"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Ex: Épargne vacances, Fonds urgence..."
                required
              />
            </div>
          )}

          {/* Synchronisation automatique */}
          {(formData.linkedAccountId || createNewAccount) && (
            <div className="flex items-center space-x-2">
              <input
                id="goal-autoSync"
                type="checkbox"
                checked={formData.autoSync}
                onChange={(e) => setFormData(prev => ({ ...prev, autoSync: e.target.checked }))}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="goal-autoSync" className="text-sm font-medium text-gray-700">
                Synchroniser automatiquement
              </label>
            </div>
          )}
        </div>

        {/* Footer avec boutons */}
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
          <button
            onClick={handleCancelModal}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            disabled={isLoading}
          >
            Annuler
          </button>
          <button
            onClick={handleSaveGoal}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={
              isLoading || 
              !formData.name.trim() || 
              !formData.targetAmount || 
              !formData.deadline ||
              (createNewAccount && !newAccountName.trim())
            }
          >
            {isLoading ? 'Sauvegarde...' : editingGoal ? 'Modifier' : 'Créer'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default GoalsPage;
