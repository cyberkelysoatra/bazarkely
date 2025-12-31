import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Target, Calendar, TrendingUp, CheckCircle, Clock, Edit3, Trash2, X, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAppStore } from '../stores/appStore';
import { goalService } from '../services/goalService';
import type { Goal, GoalFormData } from '../types';
import { CurrencyDisplay } from '../components/Currency';
import type { Currency } from '../components/Currency';
import Modal from '../components/UI/Modal';

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
  
  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    deadline: '',
    category: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    description: ''
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

  // Charger les objectifs réels
  useEffect(() => {
    refreshGoals();
  }, [user]);

  // Handlers
  const handleCreateGoal = () => {
    setEditingGoal(null);
    setFormData({
      name: '',
      targetAmount: '',
      deadline: '',
      category: '',
      priority: 'medium',
      description: ''
    });
    setIsModalOpen(true);
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      targetAmount: goal.targetAmount.toString(),
      deadline: goal.deadline instanceof Date 
        ? goal.deadline.toISOString().split('T')[0]
        : new Date(goal.deadline).toISOString().split('T')[0],
      category: goal.category || '',
      priority: goal.priority,
      description: ''
    });
    setIsModalOpen(true);
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!user) return;
    
    const goal = goals.find(g => g.id === goalId);
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer l'objectif "${goal?.name}" ?`
    );

    if (!confirmed) return;

    if (!user) return;

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

  const handleAddSavings = (goalId: string) => {
    navigate(`/add-transaction?type=expense&category=epargne&goalId=${goalId}`);
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

    try {
      setIsLoading(true);
      
      const goalData: GoalFormData = {
        name: formData.name.trim(),
        targetAmount: parseFloat(formData.targetAmount),
        deadline: new Date(formData.deadline),
        category: formData.category || undefined,
        priority: formData.priority
      };

      if (editingGoal) {
        // Update existing goal
        await goalService.updateGoal(editingGoal.id, user.id, goalData);
        toast.success('Objectif modifié avec succès');
      } else {
        // Create new goal
        await goalService.createGoal(user.id, goalData);
        toast.success('Objectif créé avec succès');
      }

      setIsModalOpen(false);
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
    setFormData({
      name: '',
      targetAmount: '',
      deadline: '',
      category: '',
      priority: 'medium',
      description: ''
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

  const getDaysRemaining = (deadline: Date) => {
    const now = new Date();
    const deadlineDate = deadline instanceof Date ? deadline : new Date(deadline);
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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
          const daysRemaining = getDaysRemaining(goal.deadline);
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
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(goal.priority)}`}>
                        {getPriorityLabel(goal.priority)}
                      </span>
                      {goal.isCompleted && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600">
                          Atteint
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    <CurrencyDisplay
                      amount={goal.currentAmount}
                      originalCurrency="MGA"
                      displayCurrency={displayCurrency}
                      showConversion={true}
                      size="sm"
                    />
                  </p>
                  <p className="text-sm text-gray-500 inline-flex items-center gap-1">
                    <span>/</span>
                    <CurrencyDisplay
                      amount={goal.targetAmount}
                      originalCurrency="MGA"
                      displayCurrency={displayCurrency}
                      showConversion={true}
                      size="sm"
                    />
                  </p>
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
                  
                  <div className="flex items-center justify-end pt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddSavings(goal.id);
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
              handleAddSavings(firstActiveGoal.id);
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
            disabled={isLoading || !formData.name.trim() || !formData.targetAmount || !formData.deadline}
          >
            {isLoading ? 'Sauvegarde...' : editingGoal ? 'Modifier' : 'Créer'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default GoalsPage;
