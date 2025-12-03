import { useState, useEffect } from 'react';
import { Plus, Target, Calendar, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { db } from '../lib/database';
import type { Goal } from '../types';
import { CurrencyDisplay } from '../components/Currency';
import type { Currency } from '../components/Currency';

const CURRENCY_STORAGE_KEY = 'bazarkely_display_currency';

const GoalsPage = () => {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAppStore();
  
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

  // Charger les objectifs réels
  useEffect(() => {
    const loadGoals = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        const userGoals = await db.goals.where('userId').equals(user.id).toArray();
        setGoals(userGoals);
      } catch (error) {
        console.error('Erreur lors du chargement des objectifs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadGoals();
  }, [user]);


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
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredGoals = goals.filter(goal => {
    if (filter === 'completed') return goal.isCompleted;
    if (filter === 'active') return !goal.isCompleted;
    return true;
  });

  if (isLoading) {
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
        <button className="btn-primary flex items-center space-x-2">
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
                <div className="flex items-start space-x-3">
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
                    <h4 className="font-medium text-gray-900">{goal.name}</h4>
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
          <button className="btn-primary">
            Créer un objectif
          </button>
        </div>
      )}

      {/* Actions rapides */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => {
            console.log('Nouvel objectif');
            // TODO: Naviguer vers la page de création d'objectif
            // navigate('/add-goal');
          }}
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
            console.log('Ajouter épargne');
            // TODO: Naviguer vers la page d'ajout d'épargne
            // navigate('/add-savings');
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
    </div>
  );
};

export default GoalsPage;
