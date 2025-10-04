import { useState, useEffect } from 'react';
import { Plus, AlertTriangle, CheckCircle, PieChart } from 'lucide-react';
import { TRANSACTION_CATEGORIES } from '../constants';
import { useAppStore } from '../stores/appStore';
import { db } from '../lib/database';
import type { Budget } from '../types';

const BudgetsPage = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAppStore();

  // Charger les budgets réels
  useEffect(() => {
    const loadBudgets = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        const userBudgets = await db.budgets
          .where('userId').equals(user.id)
          .and(budget => budget.month === selectedMonth && budget.year === selectedYear)
          .toArray();
        setBudgets(userBudgets);
      } catch (error) {
        console.error('Erreur lors du chargement des budgets:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBudgets();
  }, [user, selectedMonth, selectedYear]);

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('fr-FR')} Ar`;
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
        <button className="btn-primary flex items-center space-x-2">
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

      {/* Liste des budgets */}
      <div className="space-y-3">
        {budgets.map((budget) => {
          const category = TRANSACTION_CATEGORIES[budget.category];
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
          <button className="btn-primary inline-flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Créer un budget</span>
          </button>
        </div>
      )}

      {/* Actions rapides */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => {
            console.log('Nouveau budget');
            // TODO: Naviguer vers la page de création de budget
            // navigate('/add-budget');
          }}
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
