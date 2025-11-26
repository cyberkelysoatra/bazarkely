/**
 * Service de gestion des alertes POC Construction
 * CRUD complet + logique de notification pour alertes (seuil dépassé, consommation, stock bas)
 */

import { supabase } from '../../../lib/supabase';
import { getAuthenticatedUserId, getUserCompany } from './authHelpers';
import type { ServiceResult } from '../types/construction';

/**
 * Types d'alertes disponibles
 */
export type AlertType = 'threshold_exceeded' | 'consumption_warning' | 'stock_low';

/**
 * Niveaux de sévérité des alertes
 */
export type AlertSeverity = 'info' | 'warning' | 'critical';

/**
 * Interface pour une alerte complète
 */
export interface Alert {
  id: string;
  companyId: string;
  alertType: AlertType;
  purchaseOrderId: string | null;
  consumptionPlanId: string | null;
  thresholdExceededAmount: number | null;
  message: string;
  severity: AlertSeverity;
  notifiedUsers: string[]; // Array d'UUIDs
  isRead: boolean;
  createdAt: string;
}

/**
 * Interface pour créer une nouvelle alerte (sans id et createdAt)
 */
export type AlertCreate = Omit<Alert, 'id' | 'createdAt'>;

/**
 * Interface pour filtrer les alertes
 */
export interface AlertFilters {
  alertType?: AlertType;
  severity?: AlertSeverity;
  isRead?: boolean;
}

/**
 * Interface pour les données brutes retournées par Supabase (snake_case)
 */
interface AlertRow {
  id: string;
  company_id: string;
  alert_type: AlertType;
  purchase_order_id: string | null;
  consumption_plan_id: string | null;
  threshold_exceeded_amount: number | null;
  message: string;
  severity: AlertSeverity;
  notified_users: string[];
  is_read: boolean;
  created_at: string;
}

/**
 * Service de gestion des alertes
 */
class POCAlertService {
  /**
   * Récupère les alertes d'une compagnie avec filtres optionnels
   * @param companyId - ID de la compagnie
   * @param filters - Filtres optionnels (type, sévérité, lu/non lu)
   * @returns ServiceResult avec la liste des alertes
   */
  async getAlerts(
    companyId: string,
    filters?: AlertFilters
  ): Promise<ServiceResult<Alert[]>> {
    try {
      // Vérifier authentification
      const userIdResult = await getAuthenticatedUserId();
      if (!userIdResult.success) {
        return {
          success: false,
          error: userIdResult.error || 'Utilisateur non authentifié'
        };
      }

      // Vérifier que l'utilisateur est membre de la compagnie
      const companyResult = await getUserCompany(userIdResult.data);
      if (!companyResult.success || companyResult.data.companyId !== companyId) {
        return {
          success: false,
          error: 'Vous n\'avez pas accès aux alertes de cette compagnie'
        };
      }

      // Construire la requête avec filtres
      let query = supabase
        .from('poc_alerts')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      // Appliquer les filtres
      if (filters?.alertType) {
        query = query.eq('alert_type', filters.alertType);
      }
      if (filters?.severity) {
        query = query.eq('severity', filters.severity);
      }
      if (filters?.isRead !== undefined) {
        query = query.eq('is_read', filters.isRead);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erreur récupération alertes:', error);
        return {
          success: false,
          error: `Erreur lors de la récupération des alertes: ${error.message}`
        };
      }

      // Transformer les données pour correspondre à l'interface Alert
      const alerts: Alert[] = (data || []).map((row: AlertRow) => ({
        id: row.id,
        companyId: row.company_id,
        alertType: row.alert_type,
        purchaseOrderId: row.purchase_order_id,
        consumptionPlanId: row.consumption_plan_id,
        thresholdExceededAmount: row.threshold_exceeded_amount,
        message: row.message,
        severity: row.severity,
        notifiedUsers: row.notified_users || [],
        isRead: row.is_read || false,
        createdAt: row.created_at
      }));

      return {
        success: true,
        data: alerts
      };
    } catch (error: any) {
      console.error('Erreur getAlerts:', error);
      return {
        success: false,
        error: `Erreur inattendue lors de la récupération des alertes: ${error.message}`
      };
    }
  }

  /**
   * Compte les alertes non lues pour un utilisateur spécifique
   * @param companyId - ID de la compagnie
   * @param userId - ID de l'utilisateur
   * @returns ServiceResult avec le nombre d'alertes non lues
   */
  async getUnreadAlertsCount(
    companyId: string,
    userId: string
  ): Promise<ServiceResult<number>> {
    try {
      // Vérifier authentification
      const userIdResult = await getAuthenticatedUserId();
      if (!userIdResult.success) {
        return {
          success: false,
          error: userIdResult.error || 'Utilisateur non authentifié'
        };
      }

      // Récupérer les alertes où l'utilisateur est dans notifiedUsers et isRead = false
      const { data, error, count } = await supabase
        .from('poc_alerts')
        .select('*', { count: 'exact', head: false })
        .eq('company_id', companyId)
        .eq('is_read', false)
        .contains('notified_users', [userId]);

      if (error) {
        console.error('Erreur comptage alertes non lues:', error);
        return {
          success: false,
          error: `Erreur lors du comptage des alertes: ${error.message}`
        };
      }

      // Compter manuellement les alertes où userId est dans notifiedUsers
      const unreadCount = (data || []).filter((alert: any) => {
        const notifiedUsers = alert.notified_users || [];
        return notifiedUsers.includes(userId);
      }).length;

      return {
        success: true,
        data: unreadCount
      };
    } catch (error: any) {
      console.error('Erreur getUnreadAlertsCount:', error);
      return {
        success: false,
        error: `Erreur inattendue lors du comptage: ${error.message}`
      };
    }
  }

  /**
   * Crée une nouvelle alerte
   * @param alertData - Données de l'alerte à créer
   * @returns ServiceResult avec l'alerte créée
   */
  async createAlert(alertData: AlertCreate): Promise<ServiceResult<Alert>> {
    try {
      // Vérifier authentification
      const userIdResult = await getAuthenticatedUserId();
      if (!userIdResult.success) {
        return {
          success: false,
          error: userIdResult.error || 'Utilisateur non authentifié'
        };
      }

      // Validation des champs requis
      if (!alertData.companyId) {
        return {
          success: false,
          error: 'L\'ID de la compagnie est requis'
        };
      }
      if (!alertData.alertType) {
        return {
          success: false,
          error: 'Le type d\'alerte est requis'
        };
      }
      if (!alertData.message) {
        return {
          success: false,
          error: 'Le message de l\'alerte est requis'
        };
      }
      if (!alertData.severity) {
        return {
          success: false,
          error: 'La sévérité de l\'alerte est requise'
        };
      }
      if (!alertData.notifiedUsers || alertData.notifiedUsers.length === 0) {
        return {
          success: false,
          error: 'Au moins un utilisateur doit être notifié'
        };
      }

      // Vérifier que l'utilisateur est membre de la compagnie
      const companyResult = await getUserCompany(userIdResult.data);
      if (!companyResult.success || companyResult.data.companyId !== alertData.companyId) {
        return {
          success: false,
          error: 'Vous n\'avez pas la permission de créer des alertes pour cette compagnie'
        };
      }

      // Préparer les données pour l'insertion
      const insertData: any = {
        company_id: alertData.companyId,
        alert_type: alertData.alertType,
        purchase_order_id: alertData.purchaseOrderId || null,
        consumption_plan_id: alertData.consumptionPlanId || null,
        threshold_exceeded_amount: alertData.thresholdExceededAmount || null,
        message: alertData.message,
        severity: alertData.severity,
        notified_users: alertData.notifiedUsers,
        is_read: false,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('poc_alerts')
        .insert(insertData)
        .select()
        .single();

      if (error || !data) {
        console.error('Erreur création alerte:', error);
        return {
          success: false,
          error: `Erreur lors de la création de l'alerte: ${error?.message || 'Inconnu'}`
        };
      }

      // Transformer la réponse
      const alertRow = data as AlertRow;
      const alert: Alert = {
        id: alertRow.id,
        companyId: alertRow.company_id,
        alertType: alertRow.alert_type,
        purchaseOrderId: alertRow.purchase_order_id,
        consumptionPlanId: alertRow.consumption_plan_id,
        thresholdExceededAmount: alertRow.threshold_exceeded_amount,
        message: alertRow.message,
        severity: alertRow.severity,
        notifiedUsers: alertRow.notified_users || [],
        isRead: alertRow.is_read || false,
        createdAt: alertRow.created_at
      };

      return {
        success: true,
        data: alert
      };
    } catch (error: any) {
      console.error('Erreur createAlert:', error);
      return {
        success: false,
        error: `Erreur inattendue lors de la création: ${error.message}`
      };
    }
  }

  /**
   * Marque une alerte comme lue pour l'utilisateur actuel
   * Note: isRead est global (pas par utilisateur), donc marquer comme lu affecte tous les utilisateurs
   * @param alertId - ID de l'alerte
   * @param userId - ID de l'utilisateur (pour vérification)
   * @returns ServiceResult avec l'alerte mise à jour
   */
  async markAsRead(alertId: string, userId: string): Promise<ServiceResult<Alert>> {
    try {
      // Vérifier authentification
      const userIdResult = await getAuthenticatedUserId();
      if (!userIdResult.success || userIdResult.data !== userId) {
        return {
          success: false,
          error: 'Utilisateur non authentifié ou non autorisé'
        };
      }

      // Vérifier que l'alerte existe et que l'utilisateur est dans notifiedUsers
      const { data: alert, error: fetchError } = await supabase
        .from('poc_alerts')
        .select('*')
        .eq('id', alertId)
        .single();

      if (fetchError || !alert) {
        return {
          success: false,
          error: 'Alerte introuvable'
        };
      }

      // Vérifier que l'utilisateur est dans la liste des utilisateurs notifiés
      const alertRow = alert as AlertRow;
      const notifiedUsers = alertRow.notified_users || [];
      if (!notifiedUsers.includes(userId)) {
        return {
          success: false,
          error: 'Vous n\'avez pas accès à cette alerte'
        };
      }

      // Marquer comme lue (globalement)
      const { data: updatedAlert, error: updateError } = await (supabase
        .from('poc_alerts') as any)
        .update({ is_read: true })
        .eq('id', alertId)
        .select()
        .single();

      if (updateError || !updatedAlert) {
        console.error('Erreur mise à jour alerte:', updateError);
        return {
          success: false,
          error: `Erreur lors de la mise à jour: ${updateError?.message || 'Inconnu'}`
        };
      }

      // Transformer la réponse
      const updatedAlertRow = updatedAlert as AlertRow;
      const result: Alert = {
        id: updatedAlertRow.id,
        companyId: updatedAlertRow.company_id,
        alertType: updatedAlertRow.alert_type,
        purchaseOrderId: updatedAlertRow.purchase_order_id,
        consumptionPlanId: updatedAlertRow.consumption_plan_id,
        thresholdExceededAmount: updatedAlertRow.threshold_exceeded_amount,
        message: updatedAlertRow.message,
        severity: updatedAlertRow.severity,
        notifiedUsers: updatedAlertRow.notified_users || [],
        isRead: updatedAlertRow.is_read || false,
        createdAt: updatedAlertRow.created_at
      };

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      console.error('Erreur markAsRead:', error);
      return {
        success: false,
        error: `Erreur inattendue: ${error.message}`
      };
    }
  }

  /**
   * Marque toutes les alertes d'une compagnie comme lues pour un utilisateur
   * @param companyId - ID de la compagnie
   * @param userId - ID de l'utilisateur
   * @returns ServiceResult avec le nombre d'alertes mises à jour
   */
  async markAllAsRead(
    companyId: string,
    userId: string
  ): Promise<ServiceResult<number>> {
    try {
      // Vérifier authentification
      const userIdResult = await getAuthenticatedUserId();
      if (!userIdResult.success || userIdResult.data !== userId) {
        return {
          success: false,
          error: 'Utilisateur non authentifié ou non autorisé'
        };
      }

      // Récupérer toutes les alertes non lues où l'utilisateur est dans notifiedUsers
      const { data: alerts, error: fetchError } = await supabase
        .from('poc_alerts')
        .select('id, notified_users')
        .eq('company_id', companyId)
        .eq('is_read', false)
        .contains('notified_users', [userId]);

      if (fetchError) {
        console.error('Erreur récupération alertes:', fetchError);
        return {
          success: false,
          error: `Erreur lors de la récupération: ${fetchError.message}`
        };
      }

      // Filtrer pour ne garder que celles où userId est vraiment dans notifiedUsers
      const alertIds = (alerts || [])
        .filter((alert: { id: string; notified_users?: string[] }) => {
          const notifiedUsers = alert.notified_users || [];
          return notifiedUsers.includes(userId);
        })
        .map((alert: { id: string }) => alert.id);

      if (alertIds.length === 0) {
        return {
          success: true,
          data: 0
        };
      }

      // Mettre à jour toutes les alertes
      const { error: updateError } = await (supabase
        .from('poc_alerts') as any)
        .update({ is_read: true })
        .in('id', alertIds);

      if (updateError) {
        console.error('Erreur mise à jour alertes:', updateError);
        return {
          success: false,
          error: `Erreur lors de la mise à jour: ${updateError.message}`
        };
      }

      return {
        success: true,
        data: alertIds.length
      };
    } catch (error: any) {
      console.error('Erreur markAllAsRead:', error);
      return {
        success: false,
        error: `Erreur inattendue: ${error.message}`
      };
    }
  }

  /**
   * Supprime une alerte (admin/direction uniquement)
   * @param alertId - ID de l'alerte à supprimer
   * @returns ServiceResult vide en cas de succès
   */
  async deleteAlert(alertId: string): Promise<ServiceResult<void>> {
    try {
      // Vérifier authentification
      const userIdResult = await getAuthenticatedUserId();
      if (!userIdResult.success) {
        return {
          success: false,
          error: userIdResult.error || 'Utilisateur non authentifié'
        };
      }

      // Récupérer l'alerte pour vérifier la compagnie
      const { data: alert, error: fetchError } = await supabase
        .from('poc_alerts')
        .select('company_id')
        .eq('id', alertId)
        .single();

      if (fetchError || !alert) {
        return {
          success: false,
          error: 'Alerte introuvable'
        };
      }

      // Vérifier que l'utilisateur est membre de la compagnie avec rôle admin ou direction
      const companyResult = await getUserCompany(userIdResult.data);
      const alertRow = alert as { company_id: string };
      if (!companyResult.success || companyResult.data.companyId !== alertRow.company_id) {
        return {
          success: false,
          error: 'Vous n\'avez pas accès à cette alerte'
        };
      }

      const userRole = companyResult.data.memberRole;
      if (userRole !== 'admin' && userRole !== 'direction') {
        return {
          success: false,
          error: 'Seuls les administrateurs et la direction peuvent supprimer des alertes'
        };
      }

      // Supprimer l'alerte
      const { error: deleteError } = await supabase
        .from('poc_alerts')
        .delete()
        .eq('id', alertId);

      if (deleteError) {
        console.error('Erreur suppression alerte:', deleteError);
        return {
          success: false,
          error: `Erreur lors de la suppression: ${deleteError.message}`
        };
      }

      return {
        success: true
      };
    } catch (error: any) {
      console.error('Erreur deleteAlert:', error);
      return {
        success: false,
        error: `Erreur inattendue: ${error.message}`
      };
    }
  }

  /**
   * Crée une alerte pour un seuil dépassé sur un bon de commande
   * Notifie automatiquement les utilisateurs avec les rôles spécifiés
   * @param purchaseOrderId - ID du bon de commande
   * @param thresholdExceeded - Montant dépassé
   * @param approvalLevel - Niveau d'approbation requis ('management', 'direction', etc.)
   * @param notifyRoles - Tableau des rôles à notifier (ex: ['direction', 'admin'])
   * @returns ServiceResult avec l'alerte créée
   */
  async createThresholdAlert(
    purchaseOrderId: string,
    thresholdExceeded: number,
    approvalLevel: string,
    notifyRoles: string[]
  ): Promise<ServiceResult<Alert>> {
    try {
      // Vérifier authentification
      const userIdResult = await getAuthenticatedUserId();
      if (!userIdResult.success) {
        return {
          success: false,
          error: userIdResult.error || 'Utilisateur non authentifié'
        };
      }

      // Récupérer le bon de commande pour obtenir companyId
      const { data: purchaseOrder, error: poError } = await supabase
        .from('poc_purchase_orders')
        .select('buyer_company_id, order_number')
        .eq('id', purchaseOrderId)
        .single();

      if (poError || !purchaseOrder) {
        return {
          success: false,
          error: 'Bon de commande introuvable'
        };
      }

      const poRow = purchaseOrder as { buyer_company_id: string; order_number: string };
      const companyId = poRow.buyer_company_id;

      // Récupérer les utilisateurs avec les rôles spécifiés dans la compagnie
      const { data: members, error: membersError } = await supabase
        .from('poc_company_members')
        .select('user_id')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .in('role', notifyRoles);

      if (membersError) {
        console.error('Erreur récupération membres:', membersError);
        return {
          success: false,
          error: `Erreur lors de la récupération des membres: ${membersError.message}`
        };
      }

      // Extraire les user_ids
      const notifiedUsers = (members || []).map((member: any) => member.user_id);

      if (notifiedUsers.length === 0) {
        return {
          success: false,
          error: 'Aucun utilisateur trouvé avec les rôles spécifiés'
        };
      }

      // Créer le message d'alerte
      const message = `Le bon de commande ${poRow.order_number} a dépassé le seuil d'approbation de ${approvalLevel}. Montant dépassé: ${thresholdExceeded.toLocaleString('fr-MG')} MGA`;

      // Créer l'alerte
      const alertData: AlertCreate = {
        companyId,
        alertType: 'threshold_exceeded',
        purchaseOrderId,
        consumptionPlanId: null,
        thresholdExceededAmount: thresholdExceeded,
        message,
        severity: thresholdExceeded > 10000000 ? 'critical' : 'warning', // > 10M = critical
        notifiedUsers,
        isRead: false
      };

      return await this.createAlert(alertData);
    } catch (error: any) {
      console.error('Erreur createThresholdAlert:', error);
      return {
        success: false,
        error: `Erreur inattendue: ${error.message}`
      };
    }
  }

  /**
   * Crée une alerte pour un plan de consommation qui a dépassé un seuil
   * Notifie automatiquement les utilisateurs avec les rôles spécifiés
   * @param consumptionPlanId - ID du plan de consommation
   * @param productName - Nom du produit
   * @param percentageUsed - Pourcentage utilisé (0-100)
   * @param notifyRoles - Tableau des rôles à notifier (ex: ['magasinier', 'direction'])
   * @returns ServiceResult avec l'alerte créée
   */
  async createConsumptionAlert(
    consumptionPlanId: string,
    productName: string,
    percentageUsed: number,
    notifyRoles: string[]
  ): Promise<ServiceResult<Alert>> {
    try {
      // Vérifier authentification
      const userIdResult = await getAuthenticatedUserId();
      if (!userIdResult.success) {
        return {
          success: false,
          error: userIdResult.error || 'Utilisateur non authentifié'
        };
      }

      // Récupérer le plan de consommation pour obtenir companyId
      const { data: consumptionPlan, error: planError } = await supabase
        .from('poc_consumption_plans')
        .select('company_id')
        .eq('id', consumptionPlanId)
        .single();

      if (planError || !consumptionPlan) {
        return {
          success: false,
          error: 'Plan de consommation introuvable'
        };
      }

      const planRow = consumptionPlan as { company_id: string };
      const companyId = planRow.company_id;

      // Récupérer les utilisateurs avec les rôles spécifiés dans la compagnie
      const { data: members, error: membersError } = await supabase
        .from('poc_company_members')
        .select('user_id')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .in('role', notifyRoles);

      if (membersError) {
        console.error('Erreur récupération membres:', membersError);
        return {
          success: false,
          error: `Erreur lors de la récupération des membres: ${membersError.message}`
        };
      }

      // Extraire les user_ids
      const notifiedUsers = (members || []).map((member: any) => member.user_id);

      if (notifiedUsers.length === 0) {
        return {
          success: false,
          error: 'Aucun utilisateur trouvé avec les rôles spécifiés'
        };
      }

      // Déterminer la sévérité selon le pourcentage
      let severity: AlertSeverity = 'info';
      if (percentageUsed >= 90) {
        severity = 'critical';
      } else if (percentageUsed >= 75) {
        severity = 'warning';
      }

      // Créer le message d'alerte
      const message = `Le plan de consommation pour "${productName}" a atteint ${percentageUsed.toFixed(1)}% de sa capacité. Action requise.`;

      // Créer l'alerte
      const alertData: AlertCreate = {
        companyId,
        alertType: 'consumption_warning',
        purchaseOrderId: null,
        consumptionPlanId,
        thresholdExceededAmount: null,
        message,
        severity,
        notifiedUsers,
        isRead: false
      };

      return await this.createAlert(alertData);
    } catch (error: any) {
      console.error('Erreur createConsumptionAlert:', error);
      return {
        success: false,
        error: `Erreur inattendue: ${error.message}`
      };
    }
  }
}

// Export singleton instance
export default new POCAlertService();

