import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, X, PieChart } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { db } from '../lib/database';
import { TRANSACTION_CATEGORIES } from '../constants';
import type { Budget, BudgetFormData, TransactionCategory } from '../types';

const AddBudgetPage = () => {
  const navigate = useNavigate();
  const { user } = useAppStore();
  
  const [formData, setFormData] = useState<BudgetFormData>({
    category: 'alimentation',
    amount: 0,
    alertThreshold: 80,
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
  });

  const [isLoading, setIsLoading] = useState(false);

  // Fonction utilitaire pour formater les montants en MGA
  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('fr-FR')} Ar`;
  };

  // Gestionnaire de changement d'input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' || name === 'alertThreshold' || name === 'year' || name === 'month' 
        ? Number(value) 
        : value
    }));
  };

  // Gestionnaire de soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      console.error('❌ Utilisateur non connecté');
      return;
    }

    // Validation des champs obligatoires
    if (!formData.amount || formData.amount <= 0) {
      console.error('❌ Le montant doit être un nombre positif');
      return;
    }

    if (!formData.category) {
      console.error('❌ Veuillez sélectionner une catégorie');
      return;
    }

    if (formData.alertThreshold < 1 || formData.alertThreshold > 100) {
      console.error('❌ Le seuil d\'alerte doit être entre 1 et 100');
      return;
    }

    if (formData.year < 2020 || formData.year > 2030) {
      console.error('❌ L\'année doit être entre 2020 et 2030');
      return;
    }

    if (formData.month < 1 || formData.month > 12) {
      console.error('❌ Le mois doit être entre 1 et 12');
      return;
    }

    setIsLoading(true);

    try {
      // Créer l'objet budget
      const budget: Budget = {
        id: crypto.randomUUID(),
        userId: user.id,
        category: formData.category as TransactionCategory,
        amount: formData.amount,
        spent: 0, // Initialiser à 0
        period: 'monthly',
        year: formData.year,
        month: formData.month,
        alertThreshold: formData.alertThreshold
      };

      // Sauvegarder en base de données
      await db.budgets.add(budget);

      // Succès
      console.log('✅ Budget créé avec succès !');
      navigate('/budgets'); // Rediriger vers la page des budgets
      
    } catch (error) {
      console.error('❌ Erreur lors de la création du budget:', error);
      console.error('❌ Erreur lors de la sauvegarde. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  // Gestionnaire d'annulation
  const handleCancel = () => {
    navigate('/budgets');
  };

  // Générer les options de mois en français
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const monthNumber = i + 1;
    const monthName = new Date(0, i).toLocaleString('fr-FR', { month: 'long' });
    return { value: monthNumber, label: monthName };
  });

  // Générer les options d'année (année actuelle ± 2 ans)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const year = currentYear - 2 + i;
    return { value: year, label: year.toString() };
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-yellow-100">
                <PieChart className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Ajouter un Budget
                </h1>
                <p className="text-sm text-gray-600">
                  Créez un budget mensuel
                </p>
              </div>
            </div>

            <button
              onClick={handleCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Formulaire */}
      <div className="p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Catégorie */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              Catégorie *
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Sélectionner une catégorie</option>
              {Object.entries(TRANSACTION_CATEGORIES).map(([key, category]) => (
                <option key={key} value={key}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Montant */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Montant *
            </label>
            <div className="relative">
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount || ''}
                onChange={handleInputChange}
                placeholder="0"
                min="0"
                step="0.01"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-semibold"
                required
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                Ar
              </div>
            </div>
          </div>

          {/* Mois */}
          <div>
            <label htmlFor="month" className="block text-sm font-medium text-gray-700 mb-2">
              Mois *
            </label>
            <select
              id="month"
              name="month"
              value={formData.month}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>

          {/* Année */}
          <div>
            <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-2">
              Année *
            </label>
            <select
              id="year"
              name="year"
              value={formData.year}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              {yearOptions.map((year) => (
                <option key={year.value} value={year.value}>
                  {year.label}
                </option>
              ))}
            </select>
          </div>

          {/* Seuil d'alerte */}
          <div>
            <label htmlFor="alertThreshold" className="block text-sm font-medium text-gray-700 mb-2">
              Seuil d'alerte (%) *
            </label>
            <div className="relative">
              <input
                type="number"
                id="alertThreshold"
                name="alertThreshold"
                value={formData.alertThreshold}
                onChange={handleInputChange}
                placeholder="80"
                min="1"
                max="100"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                %
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Vous recevrez une alerte quand {formData.alertThreshold}% du budget sera dépensé
            </p>
          </div>

          {/* Boutons d'action */}
          <div className="flex space-x-4 pt-6">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PieChart className="w-5 h-5" />
              <span>{isLoading ? 'Enregistrement...' : 'Enregistrer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBudgetPage;





