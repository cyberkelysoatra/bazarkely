/**
 * Service de gestion des plans de consommation (Consumption Plans)
 * Suivi consommation planifiée vs consommation réelle avec alertes
 * Phase 3 Security Implementation
 */

import { supabase } from '../../../lib/supabase';
import { getAuthenticatedUserId, getUserCompany } from './authHelpers';
import type { ServiceResult } from '../types/construction';

/**
 * Interface pour un plan de consommation
 */
export interface ConsumptionPlan {
  id: string;
  companyId: string;
  orgUnitId?: string;                    // Optionnel: plan pour unité organisationnelle (BCI)
  projectId?: string;                    // Optionnel: plan pour projet (BCE)
  productId: string;                     // ID produit du catalogue
  plannedQuantity: number;                // Quantité planifiée
  plannedPeriod: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'; // Période de planification
  alertThresholdPercentage: number;      // Seuil d'alerte en pourcentage (ex: 80 = alerte à 80%)
  createdBy: string;                     // UUID utilisateur créateur
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface pour création plan de consommation
 */
export interface ConsumptionPlanCreate {
  companyId: string;
  orgUnitId?: string;                     // Requis si projectId non fourni
  projectId?: string;                     // Requis si orgUnitId non fourni
  productId: string;
  plannedQuantity: number;
  plannedPeriod: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  alertThresholdPercentage?: number;      // Par défaut 80%
}

/**
 * Interface pour mise à jour plan
 */
export interface ConsumptionPlanUpdate {
  orgUnitId?: string | null;
  projectId?: string | null;
  productId?: string;
  plannedQuantity?: number;
  plannedPeriod?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  alertThresholdPercentage?: number;
}

/**
 * Interface pour résumé consommation
 */
export interface ConsumptionSummary {
  planId: string;
  productId: string;
  productName: string;
  orgUnitId?: string;
  orgUnitName?: string;
  projectId?: string;
  projectName?: string;
  plannedQuantity: number;
  actualQuantity: number;
  percentageUsed: number;                 // (actualQuantity / plannedQuantity) * 100
  alertTriggered: boolean;                // True si percentageUsed >= alertThresholdPercentage
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
}

/**
 * Interface pour alerte consommation
 */
export interface ConsumptionAlert {
  planId: string;
  productId: string;
  productName: string;
  plannedQuantity: number;
  actualQuantity: number;
  thresholdPercentage: number;
  percentageUsed: number;
  message: string;                        // Message descriptif en français
  alertTriggered: boolean;
}

/**
 * Interface pour filtres récupération plans
 */
export interface ConsumptionPlanFilters {
  orgUnitId?: string;
  projectId?: string;
  productId?: string;
  plannedPeriod?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
}

/**
 * Service de gestion des plans de consommation
 */
class POCConsumptionPlanService {
  /**
   * Récupère les plans de consommation avec filtres optionnels
   * @param companyId - ID de la compagnie
   * @param filters - Filtres optionnels (orgUnitId, projectId, productId, plannedPeriod)
   * @returns ServiceResult avec liste de ConsumptionPlan
   */
  async getPlans(
    companyId: string,
    filters?: ConsumptionPlanFilters
  ): Promise<ServiceResult<ConsumptionPlan[]>> {
    try {
      // Vérifier authentification
      const userIdResult = await getAuthenticatedUserId();
      if (!userIdResult.success || !userIdResult.data) {
        return {
          success: false,
          error: 'Utilisateur non authentifié'
        };
      }

      // Construire la requête
      let query = supabase
        .from('poc_consumption_plans')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      // Appliquer les filtres
      if (filters?.orgUnitId) {
        query = query.eq('org_unit_id', filters.orgUnitId);
      }
      if (filters?.projectId) {
        query = query.eq('project_id', filters.projectId);
      }
      if (filters?.productId) {
        query = query.eq('product_id', filters.productId);
      }
      if (filters?.plannedPeriod) {
        query = query.eq('planned_period', filters.plannedPeriod);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erreur récupération plans consommation:', error);
        return {
          success: false,
          error: `Erreur lors de la récupération des plans: ${error.message}`
        };
      }

      // Mapper les données vers ConsumptionPlan
      const plans: ConsumptionPlan[] = (data || []).map((item: any) => ({
        id: item.id,
        companyId: item.company_id,
        orgUnitId: item.org_unit_id || undefined,
        projectId: item.project_id || undefined,
        productId: item.product_id,
        plannedQuantity: parseFloat(item.planned_quantity),
        plannedPeriod: item.planned_period,
        alertThresholdPercentage: parseFloat(item.alert_threshold_percentage || '80'),
        createdBy: item.created_by,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at)
      }));

      return {
        success: true,
        data: plans
      };
    } catch (error: any) {
      console.error('Erreur getPlans:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération des plans'
      };
    }
  }

  /**
   * Crée un nouveau plan de consommation
   * Validation: soit orgUnitId soit projectId requis (pas les deux, pas aucun)
   * @param planData - Données du plan à créer
   * @returns ServiceResult avec ConsumptionPlan créé
   */
  async createPlan(
    planData: ConsumptionPlanCreate
  ): Promise<ServiceResult<ConsumptionPlan>> {
    try {
      // Vérifier authentification
      const userIdResult = await getAuthenticatedUserId();
      if (!userIdResult.success || !userIdResult.data) {
        return {
          success: false,
          error: 'Utilisateur non authentifié'
        };
      }

      // Vérifier que l'utilisateur est membre de la compagnie
      const companyResult = await getUserCompany(userIdResult.data, 'builder');
      if (companyResult.companyId !== planData.companyId) {
        return {
          success: false,
          error: 'Vous n\'êtes pas membre de cette compagnie'
        };
      }

      // Validation des champs requis
      if (!planData.companyId) {
        return {
          success: false,
          error: 'L\'ID de la compagnie est requis'
        };
      }

      if (!planData.productId) {
        return {
          success: false,
          error: 'L\'ID du produit est requis'
        };
      }

      if (!planData.plannedQuantity || planData.plannedQuantity <= 0) {
        return {
          success: false,
          error: 'La quantité planifiée doit être supérieure à 0'
        };
      }

      if (!planData.plannedPeriod) {
        return {
          success: false,
          error: 'La période de planification est requise'
        };
      }

      // Validation: soit orgUnitId soit projectId requis (pas les deux, pas aucun)
      if (!planData.orgUnitId && !planData.projectId) {
        return {
          success: false,
          error: 'Soit l\'unité organisationnelle soit le projet doit être spécifié'
        };
      }

      if (planData.orgUnitId && planData.projectId) {
        return {
          success: false,
          error: 'Uniquement l\'unité organisationnelle OU le projet doit être spécifié, pas les deux'
        };
      }

      // Vérifier que orgUnitId existe si fourni
      if (planData.orgUnitId) {
        const { data: orgUnit, error: orgUnitError } = await supabase
          .from('poc_org_units')
          .select('id')
          .eq('id', planData.orgUnitId)
          .eq('company_id', planData.companyId)
          .single();

        if (orgUnitError || !orgUnit) {
          return {
            success: false,
            error: 'Unité organisationnelle introuvable ou non membre de cette compagnie'
          };
        }
      }

      // Vérifier que projectId existe si fourni
      if (planData.projectId) {
        const { data: project, error: projectError } = await supabase
          .from('poc_projects')
          .select('id')
          .eq('id', planData.projectId)
          .eq('company_id', planData.companyId)
          .single();

        if (projectError || !project) {
          return {
            success: false,
            error: 'Projet introuvable ou non membre de cette compagnie'
          };
        }
      }

      // Vérifier que productId existe
      const { data: product, error: productError } = await supabase
        .from('poc_products')
        .select('id')
        .eq('id', planData.productId)
        .single();

      if (productError || !product) {
        return {
          success: false,
          error: 'Produit introuvable dans le catalogue'
        };
      }

      // Préparer les données pour insertion
      const insertData = {
        company_id: planData.companyId,
        org_unit_id: planData.orgUnitId || null,
        project_id: planData.projectId || null,
        product_id: planData.productId,
        planned_quantity: planData.plannedQuantity,
        planned_period: planData.plannedPeriod,
        alert_threshold_percentage: planData.alertThresholdPercentage || 80,
        created_by: userIdResult.data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('poc_consumption_plans')
        .insert(insertData)
        .select()
        .single();

      if (error || !data) {
        console.error('Erreur création plan consommation:', error);
        return {
          success: false,
          error: `Erreur lors de la création du plan: ${error?.message || 'Inconnu'}`
        };
      }

      // Mapper vers ConsumptionPlan
      const plan: ConsumptionPlan = {
        id: data.id,
        companyId: data.company_id,
        orgUnitId: data.org_unit_id || undefined,
        projectId: data.project_id || undefined,
        productId: data.product_id,
        plannedQuantity: parseFloat(data.planned_quantity),
        plannedPeriod: data.planned_period,
        alertThresholdPercentage: parseFloat(data.alert_threshold_percentage || '80'),
        createdBy: data.created_by,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      return {
        success: true,
        data: plan
      };
    } catch (error: any) {
      console.error('Erreur createPlan:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la création du plan'
      };
    }
  }

  /**
   * Met à jour un plan de consommation existant
   * @param planId - ID du plan à mettre à jour
   * @param updates - Données de mise à jour
   * @returns ServiceResult avec ConsumptionPlan mis à jour
   */
  async updatePlan(
    planId: string,
    updates: ConsumptionPlanUpdate
  ): Promise<ServiceResult<ConsumptionPlan>> {
    try {
      // Vérifier authentification
      const userIdResult = await getAuthenticatedUserId();
      if (!userIdResult.success || !userIdResult.data) {
        return {
          success: false,
          error: 'Utilisateur non authentifié'
        };
      }

      // Récupérer le plan existant pour vérifier les permissions
      const { data: existingPlan, error: fetchError } = await supabase
        .from('poc_consumption_plans')
        .select('company_id')
        .eq('id', planId)
        .single();

      if (fetchError || !existingPlan) {
        return {
          success: false,
          error: 'Plan introuvable'
        };
      }

      // Vérifier que l'utilisateur est membre de la compagnie
      const companyResult = await getUserCompany(userIdResult.data, 'builder');
      if (companyResult.companyId !== existingPlan.company_id) {
        return {
          success: false,
          error: 'Vous n\'êtes pas autorisé à modifier ce plan'
        };
      }

      // Validation: si plannedQuantity fourni, doit être > 0
      if (updates.plannedQuantity !== undefined && updates.plannedQuantity <= 0) {
        return {
          success: false,
          error: 'La quantité planifiée doit être supérieure à 0'
        };
      }

      // Validation: soit orgUnitId soit projectId (pas les deux)
      if (updates.orgUnitId !== undefined && updates.projectId !== undefined) {
        if (updates.orgUnitId && updates.projectId) {
          return {
            success: false,
            error: 'Uniquement l\'unité organisationnelle OU le projet doit être spécifié, pas les deux'
          };
        }
      }

      // Vérifier que orgUnitId existe si fourni
      if (updates.orgUnitId !== undefined && updates.orgUnitId !== null) {
        const { data: orgUnit, error: orgUnitError } = await supabase
          .from('poc_org_units')
          .select('id')
          .eq('id', updates.orgUnitId)
          .eq('company_id', existingPlan.company_id)
          .single();

        if (orgUnitError || !orgUnit) {
          return {
            success: false,
            error: 'Unité organisationnelle introuvable ou non membre de cette compagnie'
          };
        }
      }

      // Vérifier que projectId existe si fourni
      if (updates.projectId !== undefined && updates.projectId !== null) {
        const { data: project, error: projectError } = await supabase
          .from('poc_projects')
          .select('id')
          .eq('id', updates.projectId)
          .eq('company_id', existingPlan.company_id)
          .single();

        if (projectError || !project) {
          return {
            success: false,
            error: 'Projet introuvable ou non membre de cette compagnie'
          };
        }
      }

      // Vérifier que productId existe si fourni
      if (updates.productId) {
        const { data: product, error: productError } = await supabase
          .from('poc_products')
          .select('id')
          .eq('id', updates.productId)
          .single();

        if (productError || !product) {
          return {
            success: false,
            error: 'Produit introuvable dans le catalogue'
          };
        }
      }

      // Préparer les données de mise à jour
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.orgUnitId !== undefined) {
        updateData.org_unit_id = updates.orgUnitId;
      }
      if (updates.projectId !== undefined) {
        updateData.project_id = updates.projectId;
      }
      if (updates.productId !== undefined) {
        updateData.product_id = updates.productId;
      }
      if (updates.plannedQuantity !== undefined) {
        updateData.planned_quantity = updates.plannedQuantity;
      }
      if (updates.plannedPeriod !== undefined) {
        updateData.planned_period = updates.plannedPeriod;
      }
      if (updates.alertThresholdPercentage !== undefined) {
        updateData.alert_threshold_percentage = updates.alertThresholdPercentage;
      }

      const { data, error } = await supabase
        .from('poc_consumption_plans')
        .update(updateData)
        .eq('id', planId)
        .select()
        .single();

      if (error || !data) {
        console.error('Erreur mise à jour plan:', error);
        return {
          success: false,
          error: `Erreur lors de la mise à jour du plan: ${error?.message || 'Inconnu'}`
        };
      }

      // Mapper vers ConsumptionPlan
      const plan: ConsumptionPlan = {
        id: data.id,
        companyId: data.company_id,
        orgUnitId: data.org_unit_id || undefined,
        projectId: data.project_id || undefined,
        productId: data.product_id,
        plannedQuantity: parseFloat(data.planned_quantity),
        plannedPeriod: data.planned_period,
        alertThresholdPercentage: parseFloat(data.alert_threshold_percentage || '80'),
        createdBy: data.created_by,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      return {
        success: true,
        data: plan
      };
    } catch (error: any) {
      console.error('Erreur updatePlan:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la mise à jour du plan'
      };
    }
  }

  /**
   * Supprime un plan de consommation
   * @param planId - ID du plan à supprimer
   * @returns ServiceResult avec succès/erreur
   */
  async deletePlan(planId: string): Promise<ServiceResult<void>> {
    try {
      // Vérifier authentification
      const userIdResult = await getAuthenticatedUserId();
      if (!userIdResult.success || !userIdResult.data) {
        return {
          success: false,
          error: 'Utilisateur non authentifié'
        };
      }

      // Récupérer le plan existant pour vérifier les permissions
      const { data: existingPlan, error: fetchError } = await supabase
        .from('poc_consumption_plans')
        .select('company_id')
        .eq('id', planId)
        .single();

      if (fetchError || !existingPlan) {
        return {
          success: false,
          error: 'Plan introuvable'
        };
      }

      // Vérifier que l'utilisateur est membre de la compagnie
      const companyResult = await getUserCompany(userIdResult.data, 'builder');
      if (companyResult.companyId !== existingPlan.company_id) {
        return {
          success: false,
          error: 'Vous n\'êtes pas autorisé à supprimer ce plan'
        };
      }

      const { error } = await supabase
        .from('poc_consumption_plans')
        .delete()
        .eq('id', planId);

      if (error) {
        console.error('Erreur suppression plan:', error);
        return {
          success: false,
          error: `Erreur lors de la suppression du plan: ${error.message}`
        };
      }

      return {
        success: true
      };
    } catch (error: any) {
      console.error('Erreur deletePlan:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la suppression du plan'
      };
    }
  }

  /**
   * Calcule la consommation réelle à partir des bons de commande pour un plan donné
   * Filtre les commandes selon la période planifiée (mois/trimestre/année en cours)
   * @param planId - ID du plan de consommation
   * @returns ServiceResult avec quantité réelle consommée
   */
  async getActualConsumption(planId: string): Promise<ServiceResult<number>> {
    try {
      // Récupérer le plan
      const { data: plan, error: planError } = await supabase
        .from('poc_consumption_plans')
        .select('product_id, planned_period, org_unit_id, project_id, company_id')
        .eq('id', planId)
        .single();

      if (planError || !plan) {
        return {
          success: false,
          error: 'Plan de consommation introuvable'
        };
      }

      // Calculer la date de début selon la période
      const now = new Date();
      let startDate: Date;

      switch (plan.planned_period) {
        case 'daily':
          // Jour en cours
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'weekly':
          // Semaine en cours (lundi)
          startDate = new Date();
          const dayOfWeek = startDate.getDay();
          const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          startDate.setDate(startDate.getDate() - diffToMonday);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'monthly':
          // Mois en cours
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarterly':
          // Trimestre en cours
          const currentQuarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
          break;
        case 'yearly':
          // Année en cours
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          return {
            success: false,
            error: 'Période de planification invalide'
          };
      }

      // Construire la requête pour récupérer les items de commandes
      // Filtrer par: product_id, date création >= startDate, statut non annulé
      // Joindre avec poc_purchase_orders pour filtrer par org_unit_id ou project_id
      let query = supabase
        .from('poc_purchase_order_items')
        .select(`
          quantity,
          poc_purchase_orders!inner (
            id,
            company_id,
            org_unit_id,
            project_id,
            status,
            created_at
          )
        `)
        .eq('product_id', plan.product_id)
        .gte('poc_purchase_orders.created_at', startDate.toISOString())
        .neq('poc_purchase_orders.status', 'cancelled')
        .eq('poc_purchase_orders.buyer_company_id', plan.company_id);

      // Filtrer par org_unit_id ou project_id selon le plan
      if (plan.org_unit_id) {
        query = query.eq('poc_purchase_orders.org_unit_id', plan.org_unit_id);
      } else if (plan.project_id) {
        query = query.eq('poc_purchase_orders.project_id', plan.project_id);
      }

      const { data: items, error: itemsError } = await query;

      if (itemsError) {
        console.error('Erreur récupération consommation réelle:', itemsError);
        return {
          success: false,
          error: `Erreur lors du calcul de la consommation réelle: ${itemsError.message}`
        };
      }

      // Somme des quantités
      const actualQuantity = (items || []).reduce((sum: number, item: any) => {
        return sum + parseFloat(item.quantity || 0);
      }, 0);

      return {
        success: true,
        data: actualQuantity
      };
    } catch (error: any) {
      console.error('Erreur getActualConsumption:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors du calcul de la consommation réelle'
      };
    }
  }

  /**
   * Vérifie si une alerte de consommation doit être déclenchée
   * Compare consommation réelle vs planifiée et seuil d'alerte
   * @param planId - ID du plan de consommation
   * @returns ServiceResult avec ConsumptionAlert
   */
  async checkConsumptionAlert(planId: string): Promise<ServiceResult<ConsumptionAlert>> {
    try {
      // Récupérer le plan
      const { data: planData, error: planError } = await supabase
        .from('poc_consumption_plans')
        .select(`
          *,
          poc_products!inner (id, name)
        `)
        .eq('id', planId)
        .single();

      if (planError || !planData) {
        return {
          success: false,
          error: 'Plan de consommation introuvable'
        };
      }

      const plan = planData as any;
      const product = plan.poc_products;

      // Calculer la consommation réelle
      const actualResult = await this.getActualConsumption(planId);
      if (!actualResult.success || actualResult.data === undefined) {
        return {
          success: false,
          error: actualResult.error || 'Erreur lors du calcul de la consommation réelle'
        };
      }

      const actualQuantity = actualResult.data;
      const plannedQuantity = parseFloat(plan.planned_quantity);
      const thresholdPercentage = parseFloat(plan.alert_threshold_percentage || '80');

      // Calculer le pourcentage utilisé
      const percentageUsed = plannedQuantity > 0
        ? (actualQuantity / plannedQuantity) * 100
        : 0;

      // Vérifier si l'alerte doit être déclenchée
      const alertTriggered = percentageUsed >= thresholdPercentage;

      // Générer le message
      let message = '';
      if (alertTriggered) {
        if (percentageUsed >= 100) {
          message = `Consommation dépassée: ${actualQuantity.toLocaleString('fr-FR')} ${plan.planned_period === 'monthly' ? 'unité(s)' : plan.planned_period === 'quarterly' ? 'unité(s)' : 'unité(s)'} consommées sur ${plannedQuantity.toLocaleString('fr-FR')} planifiées (${Math.round(percentageUsed)}%).`;
        } else {
          message = `Alerte consommation: ${Math.round(percentageUsed)}% de la quantité planifiée consommée (${actualQuantity.toLocaleString('fr-FR')}/${plannedQuantity.toLocaleString('fr-FR')}). Seuil d'alerte: ${thresholdPercentage}%.`;
        }
      } else {
        message = `Consommation normale: ${actualQuantity.toLocaleString('fr-FR')}/${plannedQuantity.toLocaleString('fr-FR')} (${Math.round(percentageUsed)}%).`;
      }

      const alert: ConsumptionAlert = {
        planId: plan.id,
        productId: plan.product_id,
        productName: product?.name || 'Produit inconnu',
        plannedQuantity,
        actualQuantity,
        thresholdPercentage,
        percentageUsed,
        message,
        alertTriggered
      };

      return {
        success: true,
        data: alert
      };
    } catch (error: any) {
      console.error('Erreur checkConsumptionAlert:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la vérification de l\'alerte de consommation'
      };
    }
  }

  /**
   * Récupère un résumé de consommation pour le dashboard
   * Retourne tous les plans avec consommation réelle vs planifiée pour une période donnée
   * @param companyId - ID de la compagnie
   * @param period - Période pour le résumé ('daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly')
   * @returns ServiceResult avec liste de ConsumptionSummary
   */
  async getConsumptionSummary(
    companyId: string,
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  ): Promise<ServiceResult<ConsumptionSummary[]>> {
    try {
      // Récupérer tous les plans pour la période donnée
      const plansResult = await this.getPlans(companyId, { plannedPeriod: period });

      if (!plansResult.success || !plansResult.data) {
        return {
          success: false,
          error: plansResult.error || 'Erreur lors de la récupération des plans'
        };
      }

      const plans = plansResult.data;
      const summaries: ConsumptionSummary[] = [];

      // Pour chaque plan, calculer la consommation réelle et créer le résumé
      for (const plan of plans) {
        // Récupérer la consommation réelle
        const actualResult = await this.getActualConsumption(plan.id);
        const actualQuantity = actualResult.success && actualResult.data !== undefined
          ? actualResult.data
          : 0;

        // Calculer le pourcentage utilisé
        const percentageUsed = plan.plannedQuantity > 0
          ? (actualQuantity / plan.plannedQuantity) * 100
          : 0;

        // Vérifier si l'alerte est déclenchée
        const alertTriggered = percentageUsed >= plan.alertThresholdPercentage;

        // Récupérer le nom du produit
        const { data: product } = await supabase
          .from('poc_products')
          .select('name')
          .eq('id', plan.productId)
          .single();

        // Récupérer le nom de l'org_unit si applicable
        let orgUnitName: string | undefined;
        if (plan.orgUnitId) {
          const { data: orgUnit } = await supabase
            .from('poc_org_units')
            .select('name')
            .eq('id', plan.orgUnitId)
            .single();
          orgUnitName = orgUnit?.name;
        }

        // Récupérer le nom du projet si applicable
        let projectName: string | undefined;
        if (plan.projectId) {
          const { data: project } = await supabase
            .from('poc_projects')
            .select('name')
            .eq('id', plan.projectId)
            .single();
          projectName = project?.name;
        }

        summaries.push({
          planId: plan.id,
          productId: plan.productId,
          productName: product?.name || 'Produit inconnu',
          orgUnitId: plan.orgUnitId,
          orgUnitName,
          projectId: plan.projectId,
          projectName,
          plannedQuantity: plan.plannedQuantity,
          actualQuantity,
          percentageUsed,
          alertTriggered,
          period: plan.plannedPeriod
        });
      }

      return {
        success: true,
        data: summaries
      };
    } catch (error: any) {
      console.error('Erreur getConsumptionSummary:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération du résumé de consommation'
      };
    }
  }
}

// Exporter une instance singleton
export default new POCConsumptionPlanService();




