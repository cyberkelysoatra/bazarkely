/**
 * Formulaire de création/édition de plan de consommation
 * Permet de créer ou modifier un plan de consommation pour un produit
 */

import React, { useState, useEffect } from 'react';
import { Button, Input, Card, Alert } from '../../../components/UI';
import { useConstruction } from '../context/ConstructionContext';
import pocConsumptionPlanService, { type ConsumptionPlan, type ConsumptionPlanCreate, type ConsumptionPlanUpdate } from '../services/pocConsumptionPlanService';
import pocProductService from '../services/pocProductService';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import type { Product, OrgUnit } from '../types/construction';

/**
 * Props du composant ConsumptionPlanForm
 */
export interface ConsumptionPlanFormProps {
  /** Mode du formulaire: création ou édition */
  mode: 'create' | 'edit';
  /** Plan existant (requis en mode edit) */
  plan?: ConsumptionPlan;
  /** Fonction appelée après succès */
  onSuccess: () => void;
  /** Fonction appelée pour annuler */
  onCancel: () => void;
}

/**
 * Périodes disponibles pour les plans de consommation
 */
const PERIODS = [
  { value: 'daily', label: 'Quotidien' },
  { value: 'weekly', label: 'Hebdomadaire' },
  { value: 'monthly', label: 'Mensuel' },
  { value: 'quarterly', label: 'Trimestriel' },
  { value: 'yearly', label: 'Annuel' }
] as const;

/**
 * Composant ConsumptionPlanForm
 */
const ConsumptionPlanForm: React.FC<ConsumptionPlanFormProps> = ({
  mode,
  plan,
  onSuccess,
  onCancel
}) => {
  const { activeCompany } = useConstruction();

  // États du formulaire
  const [productId, setProductId] = useState<string>(plan?.productId || '');
  const [orgUnitId, setOrgUnitId] = useState<string>(plan?.orgUnitId || '');
  const [projectId, setProjectId] = useState<string>(plan?.projectId || '');
  const [plannedQuantity, setPlannedQuantity] = useState<number>(plan?.plannedQuantity || 0);
  const [plannedPeriod, setPlannedPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>(
    plan?.plannedPeriod || 'monthly'
  );
  const [alertThreshold, setAlertThreshold] = useState<number>(plan?.alertThresholdPercentage || 80);

  // États pour les données chargées
  const [products, setProducts] = useState<Product[]>([]);
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingOrgUnits, setLoadingOrgUnits] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // États pour la soumission
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Charger les produits
  useEffect(() => {
    const loadProducts = async () => {
      if (!activeCompany?.id) return;

      setLoadingProducts(true);
      try {
        const result = await pocProductService.getProducts({
          isActive: true
        });

        if (result.success && result.data) {
          setProducts(result.data);
        } else {
          toast.error(result.error || 'Erreur lors du chargement des produits');
        }
      } catch (error: any) {
        console.error('Erreur chargement produits:', error);
        toast.error('Erreur lors du chargement des produits');
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, [activeCompany?.id]);

  // Charger les unités organisationnelles
  useEffect(() => {
    const loadOrgUnits = async () => {
      if (!activeCompany?.id) return;

      setLoadingOrgUnits(true);
      try {
        const { data, error } = await supabase
          .from('poc_org_units')
          .select('id, name, code, type, company_id, parent_id, description, created_at, updated_at')
          .eq('company_id', activeCompany.id)
          .order('name', { ascending: true });

        if (error) {
          console.error('Erreur chargement unités organisationnelles:', error);
          toast.error('Erreur lors du chargement des unités organisationnelles');
        } else {
          const orgUnitsData: OrgUnit[] = (data || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            code: item.code,
            type: item.type,
            companyId: item.company_id,
            parentId: item.parent_id,
            description: item.description,
            createdAt: new Date(item.created_at),
            updatedAt: new Date(item.updated_at)
          }));
          setOrgUnits(orgUnitsData);
        }
      } catch (error: any) {
        console.error('Erreur chargement unités organisationnelles:', error);
        toast.error('Erreur lors du chargement des unités organisationnelles');
      } finally {
        setLoadingOrgUnits(false);
      }
    };

    loadOrgUnits();
  }, [activeCompany?.id]);

  // Charger les projets
  useEffect(() => {
    const loadProjects = async () => {
      if (!activeCompany?.id) return;

      setLoadingProjects(true);
      try {
        const { data, error } = await supabase
          .from('poc_projects')
          .select('id, name')
          .eq('company_id', activeCompany.id)
          .order('name', { ascending: true });

        if (error) {
          console.error('Erreur chargement projets:', error);
          toast.error('Erreur lors du chargement des projets');
        } else {
          setProjects(data || []);
        }
      } catch (error: any) {
        console.error('Erreur chargement projets:', error);
        toast.error('Erreur lors du chargement des projets');
      } finally {
        setLoadingProjects(false);
      }
    };

    loadProjects();
  }, [activeCompany?.id]);

  // Validation du formulaire
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!productId) {
      newErrors.productId = 'Le produit est requis';
    }

    if (!orgUnitId && !projectId) {
      newErrors.destination = 'Veuillez sélectionner une unité organisationnelle ou un projet';
    }

    if (orgUnitId && projectId) {
      newErrors.destination = 'Veuillez sélectionner uniquement une unité organisationnelle OU un projet, pas les deux';
    }

    if (!plannedQuantity || plannedQuantity <= 0) {
      newErrors.plannedQuantity = 'La quantité planifiée doit être supérieure à 0';
    }

    if (!plannedPeriod) {
      newErrors.plannedPeriod = 'La période est requise';
    }

    if (alertThreshold < 1 || alertThreshold > 100) {
      newErrors.alertThreshold = 'Le seuil d\'alerte doit être entre 1 et 100%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Gestion de la soumission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs du formulaire');
      return;
    }

    if (!activeCompany?.id) {
      toast.error('Aucune compagnie active');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'create') {
        const planData: ConsumptionPlanCreate = {
          companyId: activeCompany.id,
          productId,
          orgUnitId: orgUnitId || undefined,
          projectId: projectId || undefined,
          plannedQuantity,
          plannedPeriod,
          alertThresholdPercentage: alertThreshold
        };

        const result = await pocConsumptionPlanService.createPlan(planData);

        if (result.success) {
          toast.success('Plan de consommation créé avec succès');
          onSuccess();
        } else {
          toast.error(result.error || 'Erreur lors de la création du plan');
        }
      } else {
        // Mode édition
        if (!plan?.id) {
          toast.error('Plan introuvable');
          setLoading(false);
          return;
        }

        const updates: ConsumptionPlanUpdate = {
          productId,
          orgUnitId: orgUnitId || null,
          projectId: projectId || null,
          plannedQuantity,
          plannedPeriod,
          alertThresholdPercentage: alertThreshold
        };

        const result = await pocConsumptionPlanService.updatePlan(plan.id, updates);

        if (result.success) {
          toast.success('Plan de consommation mis à jour avec succès');
          onSuccess();
        } else {
          toast.error(result.error || 'Erreur lors de la mise à jour du plan');
        }
      }
    } catch (error: any) {
      console.error('Erreur soumission formulaire:', error);
      toast.error(error.message || 'Erreur lors de la soumission');
    } finally {
      setLoading(false);
    }
  };

  // Gestion du changement d'unité organisationnelle
  const handleOrgUnitChange = (value: string) => {
    setOrgUnitId(value);
    if (value) {
      setProjectId(''); // Désélectionner le projet si une unité est sélectionnée
    }
    setErrors({ ...errors, destination: '' });
  };

  // Gestion du changement de projet
  const handleProjectChange = (value: string) => {
    setProjectId(value);
    if (value) {
      setOrgUnitId(''); // Désélectionner l'unité si un projet est sélectionné
    }
    setErrors({ ...errors, destination: '' });
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold text-[#2C3E2E] mb-6">
        {mode === 'create' ? 'Créer un plan de consommation' : 'Modifier le plan de consommation'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Produit */}
        <div>
          <label htmlFor="productId" className="block text-sm font-medium text-[#2C3E2E] mb-2">
            Produit <span className="text-red-500">*</span>
          </label>
          <select
            id="productId"
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              setErrors({ ...errors, productId: '' });
            }}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${
              errors.productId ? 'border-red-500' : 'border-[#A8B8A0]'
            }`}
            disabled={loadingProducts || loading}
          >
            <option value="">Sélectionnez un produit</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} {product.unit && `(${product.unit})`}
              </option>
            ))}
          </select>
          {errors.productId && (
            <p className="mt-1 text-sm text-red-600">{errors.productId}</p>
          )}
          {loadingProducts && (
            <p className="mt-1 text-sm text-[#6B7C5E]">Chargement des produits...</p>
          )}
        </div>

        {/* Unité organisationnelle OU Projet */}
        <div>
          <label className="block text-sm font-medium text-[#2C3E2E] mb-2">
            Destination <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Unité organisationnelle */}
            <div>
              <label htmlFor="orgUnitId" className="block text-xs text-[#6B7C5E] mb-1">
                Unité organisationnelle
              </label>
              <select
                id="orgUnitId"
                value={orgUnitId}
                onChange={(e) => handleOrgUnitChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${
                  errors.destination ? 'border-red-500' : 'border-[#A8B8A0]'
                }`}
                disabled={loadingOrgUnits || loading}
              >
                <option value="">Sélectionnez une unité</option>
                {orgUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name} {unit.code && `(${unit.code})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Projet */}
            <div>
              <label htmlFor="projectId" className="block text-xs text-[#6B7C5E] mb-1">
                Projet
              </label>
              <select
                id="projectId"
                value={projectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${
                  errors.destination ? 'border-red-500' : 'border-[#A8B8A0]'
                }`}
                disabled={loadingProjects || loading}
              >
                <option value="">Sélectionnez un projet</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {errors.destination && (
            <p className="mt-1 text-sm text-red-600">{errors.destination}</p>
          )}
          <p className="mt-1 text-xs text-[#6B7C5E]">
            Sélectionnez soit une unité organisationnelle, soit un projet (pas les deux)
          </p>
        </div>

        {/* Quantité planifiée */}
        <div>
          <label htmlFor="plannedQuantity" className="block text-sm font-medium text-[#2C3E2E] mb-2">
            Quantité planifiée <span className="text-red-500">*</span>
          </label>
          <Input
            id="plannedQuantity"
            type="number"
            min="0.01"
            step="0.01"
            value={plannedQuantity || ''}
            onChange={(e) => {
              const value = parseFloat(e.target.value) || 0;
              setPlannedQuantity(value);
              setErrors({ ...errors, plannedQuantity: '' });
            }}
            className={errors.plannedQuantity ? 'border-red-500' : ''}
            disabled={loading}
            placeholder="Ex: 100"
          />
          {errors.plannedQuantity && (
            <p className="mt-1 text-sm text-red-600">{errors.plannedQuantity}</p>
          )}
        </div>

        {/* Période */}
        <div>
          <label className="block text-sm font-medium text-[#2C3E2E] mb-2">
            Période <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {PERIODS.map((period) => (
              <button
                key={period.value}
                type="button"
                onClick={() => {
                  setPlannedPeriod(period.value);
                  setErrors({ ...errors, plannedPeriod: '' });
                }}
                className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                  plannedPeriod === period.value
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-[#2C3E2E] border-[#A8B8A0] hover:border-purple-500'
                } ${errors.plannedPeriod ? 'border-red-500' : ''}`}
                disabled={loading}
              >
                {period.label}
              </button>
            ))}
          </div>
          {errors.plannedPeriod && (
            <p className="mt-1 text-sm text-red-600">{errors.plannedPeriod}</p>
          )}
        </div>

        {/* Seuil d'alerte */}
        <div>
          <label htmlFor="alertThreshold" className="block text-sm font-medium text-[#2C3E2E] mb-2">
            Seuil d'alerte (%)
          </label>
          <div className="flex items-center gap-4">
            <Input
              id="alertThreshold"
              type="number"
              min="1"
              max="100"
              value={alertThreshold}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 80;
                setAlertThreshold(Math.min(Math.max(value, 1), 100));
                setErrors({ ...errors, alertThreshold: '' });
              }}
              className={`w-24 ${errors.alertThreshold ? 'border-red-500' : ''}`}
              disabled={loading}
            />
            <span className="text-sm text-[#6B7C5E]">
              Alerte déclenchée à {alertThreshold}% de la quantité planifiée
            </span>
          </div>
          {errors.alertThreshold && (
            <p className="mt-1 text-sm text-red-600">{errors.alertThreshold}</p>
          )}
          <p className="mt-1 text-xs text-[#6B7C5E]">
            Valeur par défaut: 80%. L'alerte sera déclenchée lorsque la consommation réelle atteindra {alertThreshold}% de la quantité planifiée.
          </p>
        </div>

        {/* Messages d'erreur généraux */}
        {Object.keys(errors).length > 0 && (
          <Alert type="error">
            <p>Veuillez corriger les erreurs ci-dessus avant de soumettre le formulaire.</p>
          </Alert>
        )}

        {/* Boutons d'action */}
        <div className="flex gap-3 justify-end pt-4 border-t border-[#A8B8A0]">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {loading ? 'Enregistrement...' : mode === 'create' ? 'Créer le plan' : 'Enregistrer les modifications'}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default ConsumptionPlanForm;



