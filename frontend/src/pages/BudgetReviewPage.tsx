/**
 * BudgetReviewPage Component - BazarKELY
 * Page de révision et personnalisation des budgets intelligents
 * 
 * @version 1.0
 * @date 2025-01-11
 * @author BazarKELY Team
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Save, RotateCcw, TrendingUp, PieChart } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import useBudgetIntelligence from '../hooks/useBudgetIntelligence';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Alert from '../components/UI/Alert';
import type { CategoryBudgets } from '../services/budgetIntelligenceService';

/**
 * Mapping des catégories vers leurs emojis correspondants
 */
const CATEGORY_EMOJIS: Record<keyof CategoryBudgets, string> = {
  Alimentation: '🍚',
  Logement: '🏠',
  Transport: '🚗',
  Communication: '📱',
  Habillement: '👕',
  Santé: '🏥',
  Éducation: '📚',
  Loisirs: '🎉',
  Épargne: '💰',
  Autres: '🔧'
};

/**
 * Couleurs pour la visualisation des budgets
 */
const CATEGORY_COLORS: Record<keyof CategoryBudgets, string> = {
  Alimentation: 'bg-orange-500',
  Logement: 'bg-blue-500',
  Transport: 'bg-green-500',
  Communication: 'bg-purple-500',
  Habillement: 'bg-pink-500',
  Santé: 'bg-red-500',
  Éducation: 'bg-indigo-500',
  Loisirs: 'bg-yellow-500',
  Épargne: 'bg-emerald-500',
  Autres: 'bg-gray-500'
};

/**
 * Formate un montant en Ariary avec les séparateurs de milliers
 * @param amount - Montant à formater
 * @returns Montant formaté en Ariary
 */
const formatAriary = (amount: number): string => {
  return new Intl.NumberFormat('fr-MG', {
    style: 'currency',
    currency: 'MGA',
    minimumFractionDigits: 0
  }).format(amount);
};

/**
 * Calcule le pourcentage d'une catégorie par rapport au total
 * @param amount - Montant de la catégorie
 * @param total - Total du budget
 * @returns Pourcentage arrondi
 */
const calculatePercentage = (amount: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((amount / total) * 100);
};

/**
 * Composant de la page de révision des budgets
 */
const BudgetReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAppStore();
  const { 
    intelligentBudgets, 
    budgetAnalysis, 
    customizeBudget 
  } = useBudgetIntelligence();

  // États locaux
  const [editableBudgets, setEditableBudgets] = useState<CategoryBudgets | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Budget total constant (calculé une seule fois)
  const totalBudget = React.useMemo(() => {
    if (!intelligentBudgets) return 0;
    return Object.values(intelligentBudgets).reduce((sum: number, amount: number) => sum + amount, 0);
  }, [intelligentBudgets]);

  // Initialisation des budgets éditables
  useEffect(() => {
    if (intelligentBudgets) {
      setEditableBudgets({ ...intelligentBudgets });
      setIsDirty(false);
    }
    setIsLoading(false);
  }, [intelligentBudgets]);

  /**
   * Gère le changement d'une catégorie de budget
   * @param category - Catégorie modifiée
   * @param newAmount - Nouveau montant
   */
  const handleCategoryChange = (category: keyof CategoryBudgets, newAmount: number): void => {
    if (!editableBudgets) return;

    // Validation des montants
    if (newAmount < 0) {
      toast.error('Le montant ne peut pas être négatif');
      return;
    }

    if (newAmount > totalBudget) {
      toast.error('Le montant ne peut pas dépasser le budget total');
      return;
    }

    // Mise à jour du budget de la catégorie
    const updatedBudgets = {
      ...editableBudgets,
      [category]: newAmount
    };

    // Calcul du nouveau total
    const newTotal = Object.values(updatedBudgets).reduce((sum: number, amount: number) => sum + amount, 0);
    const difference = newTotal - totalBudget;

    // Ajustement automatique pour maintenir le total
    if (Math.abs(difference) > 0) {
      if (difference > 0) {
        // Total trop élevé : réduire la catégorie "Autres"
        const currentAutres = updatedBudgets.Autres;
        const reduction = Math.min(difference, currentAutres);
        updatedBudgets.Autres = Math.max(0, currentAutres - reduction);
      } else {
        // Total trop bas : augmenter la catégorie "Épargne"
        updatedBudgets.Épargne = updatedBudgets.Épargne + Math.abs(difference);
      }
    }

    setEditableBudgets(updatedBudgets);
    setIsDirty(true);
  };

  /**
   * Sauvegarde les budgets personnalisés
   */
  const handleSave = async (): Promise<void> => {
    if (!editableBudgets || !user) return;

    try {
      // Sauvegarde dans le store
      setUser({
        ...user,
        preferences: {
          ...user.preferences,
          activeBudgets: editableBudgets
        }
      });

      // Sauvegarde des budgets intelligents mis à jour
      setUser({
        ...user,
        preferences: {
          ...user.preferences,
          intelligentBudgets: editableBudgets
        }
      });

      toast.success('Budgets personnalisés enregistrés avec succès !', {
        duration: 3000,
        icon: '✅'
      });

      setIsDirty(false);

      // Navigation vers le tableau de bord après 2 secondes
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Erreur lors de la sauvegarde des budgets:', error);
      toast.error('Erreur lors de la sauvegarde des budgets');
    }
  };

  /**
   * Réinitialise les budgets aux valeurs originales
   */
  const handleReset = (): void => {
    if (intelligentBudgets) {
      setEditableBudgets({ ...intelligentBudgets });
      setIsDirty(false);
      toast('Budgets réinitialisés aux valeurs originales', {
        icon: 'ℹ️',
        duration: 2000
      });
    }
  };

  /**
   * Calcule la différence entre budget actuel et édition
   */
  const calculateDifference = (category: keyof CategoryBudgets): number => {
    if (!editableBudgets || !intelligentBudgets) return 0;
    return editableBudgets[category] - intelligentBudgets[category];
  };

  // Affichage de chargement
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de vos budgets intelligents...</p>
        </div>
      </div>
    );
  }

  // Vérification si l'utilisateur a complété les questions prioritaires
  if (!intelligentBudgets) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <div className="p-8">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Questions Prioritaires Requises
            </h2>
            <p className="text-gray-600 mb-6">
              Veuillez d'abord répondre aux questions prioritaires pour générer vos budgets intelligents personnalisés.
            </p>
            <Button
              onClick={() => navigate('/priority-questions')}
              className="w-full"
            >
              Répondre aux Questions
            </Button>
            <Button
              onClick={() => navigate('/dashboard')}
              variant="secondary"
              className="w-full mt-3"
            >
              Retour au Tableau de Bord
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Retour au tableau de bord"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <PieChart className="w-6 h-6" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">
            Révision de Vos Budgets Intelligents
          </h1>
          <p className="text-blue-100 text-lg">
            Personnalisez vos budgets selon vos préférences tout en maintenant votre budget mensuel total
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Résumé du budget total */}
        <div className="mb-8">
          <Card className="bg-white border-2 border-blue-200">
            <div className="p-6 text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Budget Mensuel Total
              </h2>
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {formatAriary(totalBudget)}
              </div>
              <p className="text-gray-600">
                Ce montant reste constant - seules les répartitions par catégorie changent
              </p>
            </div>
          </Card>
        </div>

        {/* Comparaison des budgets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Budgets actuels */}
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-blue-600 font-bold">A</span>
              </div>
              Budgets Actuels
            </h3>
            <div className="space-y-4">
              {Object.entries(intelligentBudgets).map(([category, amount]) => (
                <Card key={category} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{CATEGORY_EMOJIS[category as keyof CategoryBudgets]}</span>
                      <div>
                        <div className="font-medium text-gray-800">{category}</div>
                        <div className="text-sm text-gray-500">
                          {calculatePercentage(amount, totalBudget)}% du total
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-800">
                        {formatAriary(amount)}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Budgets éditables */}
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-green-600 font-bold">B</span>
              </div>
              Budgets Personnalisés
            </h3>
            <div className="space-y-4">
              {editableBudgets && Object.entries(editableBudgets).map(([category, amount]) => {
                const difference = calculateDifference(category as keyof CategoryBudgets);
                const isIncrease = difference > 0;
                const isDecrease = difference < 0;

                return (
                  <Card key={category} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{CATEGORY_EMOJIS[category as keyof CategoryBudgets]}</span>
                        <div className="flex-1">
                          <div className="font-medium text-gray-800">{category}</div>
                          <div className="text-sm text-gray-500">
                            {calculatePercentage(amount, totalBudget)}% du total
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={amount}
                          onChange={(e) => handleCategoryChange(
                            category as keyof CategoryBudgets, 
                            parseInt(e.target.value) || 0
                          )}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="text-right min-w-[120px]">
                          <div className="font-semibold text-gray-800">
                            {formatAriary(amount)}
                          </div>
                          {difference !== 0 && (
                            <div className={`text-sm font-medium ${
                              isIncrease ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {isIncrease ? '+' : ''}{formatAriary(difference)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>

        {/* Visualisation de la distribution */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Distribution des Budgets
          </h3>
          <Card className="p-6">
            <div className="space-y-3">
              {editableBudgets && Object.entries(editableBudgets).map(([category, amount]) => {
                const percentage = calculatePercentage(amount, totalBudget);
                return (
                  <div key={category} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{CATEGORY_EMOJIS[category as keyof CategoryBudgets]}</span>
                        <span className="font-medium text-gray-700">{category}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatAriary(amount)} ({percentage}%)
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${CATEGORY_COLORS[category as keyof CategoryBudgets]}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Recommandations */}
        {budgetAnalysis?.recommendations && budgetAnalysis.recommendations.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Recommandations d'Ajustement
            </h3>
            <Alert type="info">
              <div className="space-y-2">
                {budgetAnalysis.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <div className="text-sm">
                      <span className="font-medium">{recommendation.category} :</span>{' '}
                      {recommendation.reason}
                    </div>
                  </div>
                ))}
              </div>
            </Alert>
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={handleSave}
            disabled={!isDirty}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <Save className="w-5 h-5" />
            <span>Enregistrer les Modifications</span>
          </Button>
          
          <Button
            onClick={handleReset}
            variant="secondary"
            className="flex-1 bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Réinitialiser</span>
          </Button>
          
          <Button
            onClick={() => navigate('/dashboard')}
            variant="secondary"
            className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium py-3 px-6 rounded-lg transition-all duration-200"
          >
            Retour au Tableau de Bord
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BudgetReviewPage;
