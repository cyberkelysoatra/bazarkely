/**
 * Page de gestion des plans de consommation
 * Affiche tous les plans avec filtres et permet la création/édition/suppression
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Filter, X, Edit, Trash2, RefreshCw } from 'lucide-react';
import { useConstruction } from '../context/ConstructionContext';
import pocConsumptionPlanService, {
  type ConsumptionPlan,
  type ConsumptionPlanCreate,
  type ConsumptionPlanUpdate,
  type ConsumptionSummary
} from '../services/pocConsumptionPlanService';
import pocProductService from '../services/pocProductService';
import type { Product } from '../types/construction';
import ConsumptionPlanCard, { type ConsumptionSummary as CardConsumptionSummary } from './ConsumptionPlanCard';
import { Modal } from '../../../components/UI';
import { toast } from 'react-hot-toast';
import { Button, Input, Alert } from '../../../components/UI';

/**
 * Labels des périodes en français
 */
const PERIOD_LABELS: Record<string, string> = {
  daily: 'Quotidien',
  weekly: 'Hebdomadaire',
  monthly: 'Mensuel',
  quarterly: 'Trimestriel',
  yearly: 'Annuel'
};

/**
 * Interface pour les filtres
 */
interface PlanFilters {
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | '';
  productId: string;
  status: 'all' | 'alert' | 'normal';
}

/**
 * Composant ConsumptionPlansPage
 */
const ConsumptionPlansPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeCompany } = useConstruction();

  // États
  const [plans, setPlans] = useState<ConsumptionPlan[]>([]);
  const [summaries, setSummaries] = useState<CardConsumptionSummary[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filters, setFilters] = useState<PlanFilters>({
    period: '',
    productId: '',
    status: 'all'
  });
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingPlan, setEditingPlan] = useState<ConsumptionPlan | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);

  // États du formulaire
  const [formData, setFormData] = useState<ConsumptionPlanCreate>({
    companyId: activeCompany?.id || '',
    productId: '',
    plannedQuantity: 0,
    plannedPeriod: 'monthly',
    alertThresholdPercentage: 80
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  /**
   * Charge les produits pour le filtre
   */
  const loadProducts = useCallback(async () => {
    if (!activeCompany?.id) return;

    try {
      const result = await pocProductService.getProducts();
      if (result.success && result.data) {
        setProducts(result.data || []);
      }
    } catch (error) {
      console.error('Erreur chargement produits:', error);
    }
  }, [activeCompany?.id]);

  /**
   * Charge les plans de consommation
   */
  const loadPlans = useCallback(async () => {
    if (!activeCompany?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Construire les filtres pour le service
      const serviceFilters: any = {};
      if (filters.period) {
        serviceFilters.plannedPeriod = filters.period;
      }
      if (filters.productId) {
        serviceFilters.productId = filters.productId;
      }

      // Récupérer les plans
      const plansResult = await pocConsumptionPlanService.getPlans(
        activeCompany.id,
        serviceFilters
      );

      if (!plansResult.success || !plansResult.data) {
        toast.error(plansResult.error || 'Erreur lors du chargement des plans');
        setPlans([]);
        setSummaries([]);
        setLoading(false);
        return;
      }

      const loadedPlans = plansResult.data;
      setPlans(loadedPlans);

      // Récupérer les résumés pour les cartes
      const summaryResult = await pocConsumptionPlanService.getConsumptionSummary(
        activeCompany.id,
        serviceFilters
      );

      if (summaryResult.success && summaryResult.data) {
        // Adapter les données du service au format attendu par ConsumptionPlanCard
        const adaptedSummaries: CardConsumptionSummary[] = summaryResult.data.map((summary: ConsumptionSummary) => {
          // Trouver le plan correspondant pour obtenir l'ID
          const plan = loadedPlans.find(p => p.productId === summary.productId && p.plannedPeriod === summary.period);
          
          return {
            id: plan?.id || summary.planId,
            productId: summary.productId,
            productName: summary.productName,
            plannedQuantity: summary.plannedQuantity,
            actualQuantity: summary.actualQuantity,
            period: summary.period,
            periodLabel: PERIOD_LABELS[summary.period] || summary.period,
            alertTriggered: summary.alertTriggered,
            alertMessage: summary.alertTriggered
              ? `Alerte: ${Math.round(summary.percentageUsed)}% de la quantité planifiée consommée`
              : undefined,
            unit: products.find(p => p.id === summary.productId)?.unit || 'unité'
          };
        });

        // Appliquer le filtre de statut (alerte/normal)
        let filteredSummaries = adaptedSummaries;
        if (filters.status === 'alert') {
          filteredSummaries = adaptedSummaries.filter(s => s.alertTriggered);
        } else if (filters.status === 'normal') {
          filteredSummaries = adaptedSummaries.filter(s => !s.alertTriggered);
        }

        setSummaries(filteredSummaries);
      } else {
        setSummaries([]);
      }
    } catch (error: any) {
      console.error('Erreur chargement plans:', error);
      toast.error('Erreur lors du chargement des plans de consommation');
      setPlans([]);
      setSummaries([]);
    } finally {
      setLoading(false);
    }
  }, [activeCompany?.id, filters, products]);

  /**
   * Charge les données au montage et quand les filtres changent
   */
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (products.length > 0 || filters.productId === '') {
      loadPlans();
    }
  }, [loadPlans, products.length]);

  /**
   * Ouvre le modal pour créer un nouveau plan
   */
  const handleCreateClick = () => {
    setEditingPlan(null);
    setFormData({
      companyId: activeCompany?.id || '',
      productId: '',
      plannedQuantity: 0,
      plannedPeriod: 'monthly',
      alertThresholdPercentage: 80
    });
    setFormErrors({});
    setShowModal(true);
  };

  /**
   * Ouvre le modal pour éditer un plan
   */
  const handleEditClick = (plan: ConsumptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      companyId: plan.companyId,
      productId: plan.productId,
      orgUnitId: plan.orgUnitId,
      projectId: plan.projectId,
      plannedQuantity: plan.plannedQuantity,
      plannedPeriod: plan.plannedPeriod,
      alertThresholdPercentage: plan.alertThresholdPercentage
    });
    setFormErrors({});
    setShowModal(true);
  };

  /**
   * Ferme le modal
   */
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPlan(null);
    setFormData({
      companyId: activeCompany?.id || '',
      productId: '',
      plannedQuantity: 0,
      plannedPeriod: 'monthly',
      alertThresholdPercentage: 80
    });
    setFormErrors({});
  };

  /**
   * Valide le formulaire
   */
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.productId) {
      errors.productId = 'Le produit est requis';
    }

    if (!formData.plannedQuantity || formData.plannedQuantity <= 0) {
      errors.plannedQuantity = 'La quantité planifiée doit être supérieure à 0';
    }

    if (!formData.plannedPeriod) {
      errors.plannedPeriod = 'La période est requise';
    }

    if (formData.alertThresholdPercentage !== undefined) {
      if (formData.alertThresholdPercentage < 1 || formData.alertThresholdPercentage > 100) {
        errors.alertThresholdPercentage = 'Le seuil d\'alerte doit être entre 1 et 100%';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Sauvegarde le plan (création ou édition)
   */
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    if (!activeCompany?.id) {
      toast.error('Aucune compagnie active');
      return;
    }

    try {
      let result;

      if (editingPlan) {
        // Mise à jour
        const updateData: ConsumptionPlanUpdate = {
          productId: formData.productId,
          plannedQuantity: formData.plannedQuantity,
          plannedPeriod: formData.plannedPeriod,
          alertThresholdPercentage: formData.alertThresholdPercentage
        };

        result = await pocConsumptionPlanService.updatePlan(editingPlan.id, updateData);
      } else {
        // Création
        const createData: ConsumptionPlanCreate = {
          companyId: activeCompany.id,
          productId: formData.productId,
          orgUnitId: formData.orgUnitId,
          projectId: formData.projectId,
          plannedQuantity: formData.plannedQuantity,
          plannedPeriod: formData.plannedPeriod,
          alertThresholdPercentage: formData.alertThresholdPercentage
        };

        result = await pocConsumptionPlanService.createPlan(createData);
      }

      if (result.success) {
        toast.success(editingPlan ? 'Plan mis à jour avec succès' : 'Plan créé avec succès');
        handleCloseModal();
        loadPlans();
      } else {
        toast.error(result.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error: any) {
      console.error('Erreur sauvegarde plan:', error);
      toast.error('Erreur lors de la sauvegarde du plan');
    }
  };

  /**
   * Supprime un plan
   */
  const handleDelete = async (planId: string) => {
    try {
      const result = await pocConsumptionPlanService.deletePlan(planId);

      if (result.success) {
        toast.success('Plan supprimé avec succès');
        setDeletingPlanId(null);
        loadPlans();
      } else {
        toast.error(result.error || 'Erreur lors de la suppression');
      }
    } catch (error: any) {
      console.error('Erreur suppression plan:', error);
      toast.error('Erreur lors de la suppression du plan');
    }
  };

  /**
   * Réinitialise les filtres
   */
  const handleResetFilters = () => {
    setFilters({
      period: '',
      productId: '',
      status: 'all'
    });
  };

  if (!activeCompany) {
    return (
      <div className="p-6">
        <Alert type="warning">
          Aucune compagnie active. Veuillez sélectionner une compagnie.
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-purple-600 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/construction/dashboard')}
                className="p-2 hover:bg-purple-700 rounded-lg transition-colors"
                aria-label="Retour au tableau de bord"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-2xl font-bold">📊 Plans de Consommation</h1>
            </div>
            <button
              onClick={handleCreateClick}
              className="flex items-center gap-2 px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-medium"
            >
              <Plus className="h-5 w-5" />
              Nouveau Plan
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filtres */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filtres:</span>
            </div>

            {/* Filtre période */}
            <select
              value={filters.period}
              onChange={(e) => setFilters({ ...filters, period: e.target.value as any })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Toutes les périodes</option>
              <option value="daily">Quotidien</option>
              <option value="weekly">Hebdomadaire</option>
              <option value="monthly">Mensuel</option>
              <option value="quarterly">Trimestriel</option>
              <option value="yearly">Annuel</option>
            </select>

            {/* Filtre produit */}
            <select
              value={filters.productId}
              onChange={(e) => setFilters({ ...filters, productId: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Tous les produits</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>

            {/* Filtre statut */}
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">Tous</option>
              <option value="alert">En alerte</option>
              <option value="normal">Normal</option>
            </select>

            {/* Bouton réinitialiser */}
            {(filters.period || filters.productId || filters.status !== 'all') && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                <X className="h-4 w-4" />
                Réinitialiser
              </button>
            )}

            {/* Bouton rafraîchir */}
            <button
              onClick={loadPlans}
              disabled={loading}
              className="ml-auto flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>
        </div>

        {/* Liste des plans */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-lg shadow-md p-4 animate-pulse"
              >
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-2 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-2 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : summaries.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-500 text-lg mb-4">
              Aucun plan de consommation.
            </p>
            <p className="text-gray-400 mb-6">
              Créez votre premier plan pour commencer le suivi de consommation.
            </p>
            <Button onClick={handleCreateClick} variant="primary">
              <Plus className="h-4 w-4 mr-2" />
              Créer un plan
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {summaries.map((summary) => {
              const plan = plans.find(p => p.id === summary.id);
              return (
                <div key={summary.id} className="relative">
                  <ConsumptionPlanCard
                    plan={summary}
                    className="h-full"
                  />
                  {plan && (
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button
                        onClick={() => handleEditClick(plan)}
                        className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
                        aria-label="Modifier le plan"
                      >
                        <Edit className="h-4 w-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => setDeletingPlanId(plan.id)}
                        className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
                        aria-label="Supprimer le plan"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal création/édition */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingPlan ? 'Modifier le plan' : 'Nouveau plan de consommation'}
        size="lg"
      >
        <div className="space-y-4">
          {/* Produit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Produit *
            </label>
            <select
              value={formData.productId}
              onChange={(e) => {
                setFormData({ ...formData, productId: e.target.value });
                setFormErrors({ ...formErrors, productId: '' });
              }}
              className={`w-full px-3 py-2 border rounded-lg ${
                formErrors.productId ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Sélectionner un produit</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            {formErrors.productId && (
              <p className="text-sm text-red-600 mt-1">{formErrors.productId}</p>
            )}
          </div>

          {/* Quantité planifiée */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantité planifiée *
            </label>
            <Input
              type="number"
              value={formData.plannedQuantity || ''}
              onChange={(e) => {
                setFormData({ ...formData, plannedQuantity: parseFloat(e.target.value) || 0 });
                setFormErrors({ ...formErrors, plannedQuantity: '' });
              }}
              min="0"
              step="0.01"
              error={formErrors.plannedQuantity}
            />
          </div>

          {/* Période */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Période *
            </label>
            <select
              value={formData.plannedPeriod}
              onChange={(e) => {
                setFormData({ ...formData, plannedPeriod: e.target.value as any });
                setFormErrors({ ...formErrors, plannedPeriod: '' });
              }}
              className={`w-full px-3 py-2 border rounded-lg ${
                formErrors.plannedPeriod ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="daily">Quotidien</option>
              <option value="weekly">Hebdomadaire</option>
              <option value="monthly">Mensuel</option>
              <option value="quarterly">Trimestriel</option>
              <option value="yearly">Annuel</option>
            </select>
            {formErrors.plannedPeriod && (
              <p className="text-sm text-red-600 mt-1">{formErrors.plannedPeriod}</p>
            )}
          </div>

          {/* Seuil d'alerte */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Seuil d'alerte (%)
            </label>
            <Input
              type="number"
              value={formData.alertThresholdPercentage || 80}
              onChange={(e) => {
                setFormData({ ...formData, alertThresholdPercentage: parseInt(e.target.value) || 80 });
                setFormErrors({ ...formErrors, alertThresholdPercentage: '' });
              }}
              min="1"
              max="100"
              error={formErrors.alertThresholdPercentage}
            />
            <p className="text-xs text-gray-500 mt-1">
              Alerte déclenchée lorsque {formData.alertThresholdPercentage || 80}% de la quantité planifiée est consommée
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={handleCloseModal}>
              Annuler
            </Button>
            <Button variant="primary" onClick={handleSave}>
              {editingPlan ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal confirmation suppression */}
      {deletingPlanId && (
        <Modal
          isOpen={!!deletingPlanId}
          onClose={() => setDeletingPlanId(null)}
          title="Confirmer la suppression"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Êtes-vous sûr de vouloir supprimer ce plan de consommation ? Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => setDeletingPlanId(null)}>
                Annuler
              </Button>
              <Button
                variant="danger"
                onClick={() => handleDelete(deletingPlanId)}
              >
                Supprimer
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ConsumptionPlansPage;

