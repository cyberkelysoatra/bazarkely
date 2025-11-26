/**
 * Service de gestion des seuils de prix (Price Thresholds)
 * Gestion des seuils configurables pour validation approbation selon montant
 * Phase 3 Security Implementation
 */

import { supabase } from '../../../lib/supabase';
import { getAuthenticatedUserId, getUserCompany } from './authHelpers';
import type { ServiceResult } from '../types/construction';

/**
 * Interface pour un seuil de prix
 */
export interface PriceThreshold {
  id: string;
  companyId: string;
  orgUnitId?: string;              // Optionnel: seuil spécifique à une unité organisationnelle
  thresholdAmount: number;         // Montant seuil en MGA
  currency: string;               // Devise (par défaut 'MGA')
  approvalLevel: 'chef_chantier' | 'direction' | 'admin'; // Niveau d'approbation requis
  createdBy: string;               // UUID utilisateur créateur
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface pour résultat de vérification seuil
 */
export interface ThresholdCheckResult {
  exceeded: boolean;               // True si montant dépasse le seuil
  applicableThreshold: PriceThreshold | null; // Seuil applicable (null si aucun dépassement)
  message: string;                 // Message descriptif en français
}

/**
 * Interface pour création/mise à jour seuil
 */
export interface PriceThresholdCreate {
  companyId: string;
  orgUnitId?: string;
  thresholdAmount: number;
  currency?: string;
  approvalLevel: 'chef_chantier' | 'direction' | 'admin';
}

/**
 * Interface pour mise à jour partielle
 */
export interface PriceThresholdUpdate {
  orgUnitId?: string | null;
  thresholdAmount?: number;
  currency?: string;
  approvalLevel?: 'chef_chantier' | 'direction' | 'admin';
}

/**
 * Service de gestion des seuils de prix
 */
class POCPriceThresholdService {
  /**
   * Récupère tous les seuils pour une compagnie ou une unité organisationnelle spécifique
   * @param companyId - ID de la compagnie
   * @param orgUnitId - ID optionnel de l'unité organisationnelle (filtre)
   * @returns ServiceResult avec liste de PriceThreshold
   */
  async getThresholds(
    companyId: string,
    orgUnitId?: string
  ): Promise<ServiceResult<PriceThreshold[]>> {
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
        .from('poc_price_thresholds')
        .select('*')
        .eq('company_id', companyId)
        .order('threshold_amount', { ascending: true });

      // Filtrer par org_unit_id si fourni et valide
      // FIX: Validate orgUnitId to prevent "undefined" string or empty string from being used as UUID
      const validOrgUnitId = orgUnitId && 
                             orgUnitId !== 'undefined' && 
                             orgUnitId.trim() !== '' 
                             ? orgUnitId 
                             : null;
      
      if (validOrgUnitId) {
        query = query.eq('org_unit_id', validOrgUnitId);
      } else {
        // Si pas d'orgUnitId valide, récupérer les seuils company-wide (org_unit_id IS NULL)
        query = query.is('org_unit_id', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erreur récupération seuils:', error);
        return {
          success: false,
          error: `Erreur lors de la récupération des seuils: ${error.message}`
        };
      }

      // Mapper les données vers PriceThreshold
      const thresholds: PriceThreshold[] = (data || []).map((item: any) => ({
        id: item.id,
        companyId: item.company_id,
        orgUnitId: item.org_unit_id || undefined,
        thresholdAmount: parseFloat(item.threshold_amount),
        currency: item.currency || 'MGA',
        approvalLevel: item.approval_level,
        createdBy: item.created_by,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at)
      }));

      return {
        success: true,
        data: thresholds
      };
    } catch (error: any) {
      console.error('Erreur getThresholds:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération des seuils'
      };
    }
  }

  /**
   * Trouve le seuil applicable pour un montant donné
   * Priorité: seuil spécifique org_unit > seuil company-wide
   * Retourne le seuil le plus élevé (highest priority match) qui est dépassé
   * @param companyId - ID de la compagnie
   * @param orgUnitId - ID optionnel de l'unité organisationnelle
   * @param amount - Montant à vérifier
   * @returns ServiceResult avec PriceThreshold applicable ou null
   */
  async getApplicableThreshold(
    companyId: string,
    orgUnitId: string | undefined,
    amount: number
  ): Promise<ServiceResult<PriceThreshold | null>> {
    try {
      // Récupérer tous les seuils pertinents
      const thresholdsResult = await this.getThresholds(companyId, orgUnitId);
      
      if (!thresholdsResult.success || !thresholdsResult.data) {
        return {
          success: false,
          error: thresholdsResult.error || 'Erreur lors de la récupération des seuils'
        };
      }

      // Filtrer les seuils dépassés
      const exceededThresholds = thresholdsResult.data.filter(
        threshold => amount >= threshold.thresholdAmount
      );

      if (exceededThresholds.length === 0) {
        return {
          success: true,
          data: null
        };
      }

      // Prioriser: seuil org_unit spécifique > seuil company-wide
      // Si plusieurs seuils dépassés, prendre celui avec le montant le plus élevé (plus restrictif)
      const applicableThreshold = exceededThresholds.reduce((highest, current) => {
        // Priorité 1: Seuil org_unit spécifique
        if (current.orgUnitId && !highest.orgUnitId) {
          return current;
        }
        // Priorité 2: Seuil org_unit avec montant plus élevé
        if (current.orgUnitId && highest.orgUnitId) {
          return current.thresholdAmount > highest.thresholdAmount ? current : highest;
        }
        // Priorité 3: Seuil company-wide avec montant plus élevé
        if (!current.orgUnitId && !highest.orgUnitId) {
          return current.thresholdAmount > highest.thresholdAmount ? current : highest;
        }
        return highest;
      });

      return {
        success: true,
        data: applicableThreshold
      };
    } catch (error: any) {
      console.error('Erreur getApplicableThreshold:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la recherche du seuil applicable'
      };
    }
  }

  /**
   * Crée un nouveau seuil de prix
   * @param thresholdData - Données du seuil à créer
   * @returns ServiceResult avec PriceThreshold créé
   */
  async createThreshold(
    thresholdData: PriceThresholdCreate
  ): Promise<ServiceResult<PriceThreshold>> {
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
      if (companyResult.companyId !== thresholdData.companyId) {
        return {
          success: false,
          error: 'Vous n\'êtes pas membre de cette compagnie'
        };
      }

      // Validation des champs requis
      if (!thresholdData.companyId) {
        return {
          success: false,
          error: 'L\'ID de la compagnie est requis'
        };
      }

      if (!thresholdData.thresholdAmount || thresholdData.thresholdAmount <= 0) {
        return {
          success: false,
          error: 'Le montant seuil doit être supérieur à 0'
        };
      }

      if (!thresholdData.approvalLevel) {
        return {
          success: false,
          error: 'Le niveau d\'approbation est requis'
        };
      }

      // Validation: soit orgUnitId soit company-wide (pas les deux)
      // Si orgUnitId fourni, vérifier qu'il existe
      if (thresholdData.orgUnitId) {
        const { data: orgUnit, error: orgUnitError } = await supabase
          .from('poc_org_units')
          .select('id')
          .eq('id', thresholdData.orgUnitId)
          .eq('company_id', thresholdData.companyId)
          .single();

        if (orgUnitError || !orgUnit) {
          return {
            success: false,
            error: 'Unité organisationnelle introuvable ou non membre de cette compagnie'
          };
        }
      }

      // Préparer les données pour insertion
      const insertData = {
        company_id: thresholdData.companyId,
        org_unit_id: thresholdData.orgUnitId || null,
        threshold_amount: thresholdData.thresholdAmount,
        currency: thresholdData.currency || 'MGA',
        approval_level: thresholdData.approvalLevel,
        created_by: userIdResult.data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('poc_price_thresholds')
        .insert(insertData)
        .select()
        .single();

      if (error || !data) {
        console.error('Erreur création seuil:', error);
        return {
          success: false,
          error: `Erreur lors de la création du seuil: ${error?.message || 'Inconnu'}`
        };
      }

      // Mapper vers PriceThreshold
      const threshold: PriceThreshold = {
        id: data.id,
        companyId: data.company_id,
        orgUnitId: data.org_unit_id || undefined,
        thresholdAmount: parseFloat(data.threshold_amount),
        currency: data.currency || 'MGA',
        approvalLevel: data.approval_level,
        createdBy: data.created_by,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      return {
        success: true,
        data: threshold
      };
    } catch (error: any) {
      console.error('Erreur createThreshold:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la création du seuil'
      };
    }
  }

  /**
   * Met à jour un seuil existant
   * @param thresholdId - ID du seuil à mettre à jour
   * @param updates - Données de mise à jour
   * @returns ServiceResult avec PriceThreshold mis à jour
   */
  async updateThreshold(
    thresholdId: string,
    updates: PriceThresholdUpdate
  ): Promise<ServiceResult<PriceThreshold>> {
    try {
      // Vérifier authentification
      const userIdResult = await getAuthenticatedUserId();
      if (!userIdResult.success || !userIdResult.data) {
        return {
          success: false,
          error: 'Utilisateur non authentifié'
        };
      }

      // Récupérer le seuil existant pour vérifier les permissions
      const { data: existingThreshold, error: fetchError } = await supabase
        .from('poc_price_thresholds')
        .select('company_id')
        .eq('id', thresholdId)
        .single();

      if (fetchError || !existingThreshold) {
        return {
          success: false,
          error: 'Seuil introuvable'
        };
      }

      // Vérifier que l'utilisateur est membre de la compagnie
      const companyResult = await getUserCompany(userIdResult.data, 'builder');
      if (companyResult.companyId !== existingThreshold.company_id) {
        return {
          success: false,
          error: 'Vous n\'êtes pas autorisé à modifier ce seuil'
        };
      }

      // Validation: si thresholdAmount fourni, doit être > 0
      if (updates.thresholdAmount !== undefined && updates.thresholdAmount <= 0) {
        return {
          success: false,
          error: 'Le montant seuil doit être supérieur à 0'
        };
      }

      // Validation: si orgUnitId fourni, vérifier qu'il existe
      if (updates.orgUnitId !== undefined && updates.orgUnitId !== null) {
        const { data: orgUnit, error: orgUnitError } = await supabase
          .from('poc_org_units')
          .select('id')
          .eq('id', updates.orgUnitId)
          .eq('company_id', existingThreshold.company_id)
          .single();

        if (orgUnitError || !orgUnit) {
          return {
            success: false,
            error: 'Unité organisationnelle introuvable ou non membre de cette compagnie'
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
      if (updates.thresholdAmount !== undefined) {
        updateData.threshold_amount = updates.thresholdAmount;
      }
      if (updates.currency !== undefined) {
        updateData.currency = updates.currency;
      }
      if (updates.approvalLevel !== undefined) {
        updateData.approval_level = updates.approvalLevel;
      }

      const { data, error } = await supabase
        .from('poc_price_thresholds')
        .update(updateData)
        .eq('id', thresholdId)
        .select()
        .single();

      if (error || !data) {
        console.error('Erreur mise à jour seuil:', error);
        return {
          success: false,
          error: `Erreur lors de la mise à jour du seuil: ${error?.message || 'Inconnu'}`
        };
      }

      // Mapper vers PriceThreshold
      const threshold: PriceThreshold = {
        id: data.id,
        companyId: data.company_id,
        orgUnitId: data.org_unit_id || undefined,
        thresholdAmount: parseFloat(data.threshold_amount),
        currency: data.currency || 'MGA',
        approvalLevel: data.approval_level,
        createdBy: data.created_by,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      return {
        success: true,
        data: threshold
      };
    } catch (error: any) {
      console.error('Erreur updateThreshold:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la mise à jour du seuil'
      };
    }
  }

  /**
   * Supprime un seuil
   * @param thresholdId - ID du seuil à supprimer
   * @returns ServiceResult avec succès/erreur
   */
  async deleteThreshold(thresholdId: string): Promise<ServiceResult<void>> {
    try {
      // Vérifier authentification
      const userIdResult = await getAuthenticatedUserId();
      if (!userIdResult.success || !userIdResult.data) {
        return {
          success: false,
          error: 'Utilisateur non authentifié'
        };
      }

      // Récupérer le seuil existant pour vérifier les permissions
      const { data: existingThreshold, error: fetchError } = await supabase
        .from('poc_price_thresholds')
        .select('company_id')
        .eq('id', thresholdId)
        .single();

      if (fetchError || !existingThreshold) {
        return {
          success: false,
          error: 'Seuil introuvable'
        };
      }

      // Vérifier que l'utilisateur est membre de la compagnie
      const companyResult = await getUserCompany(userIdResult.data, 'builder');
      if (companyResult.companyId !== existingThreshold.company_id) {
        return {
          success: false,
          error: 'Vous n\'êtes pas autorisé à supprimer ce seuil'
        };
      }

      const { error } = await supabase
        .from('poc_price_thresholds')
        .delete()
        .eq('id', thresholdId);

      if (error) {
        console.error('Erreur suppression seuil:', error);
        return {
          success: false,
          error: `Erreur lors de la suppression du seuil: ${error.message}`
        };
      }

      return {
        success: true
      };
    } catch (error: any) {
      console.error('Erreur deleteThreshold:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la suppression du seuil'
      };
    }
  }

  /**
   * Vérifie si le montant total d'un bon de commande dépasse un seuil
   * Retourne le premier seuil dépassé (highest priority)
   * @param purchaseOrderTotal - Montant total du bon de commande
   * @param companyId - ID de la compagnie
   * @param orgUnitId - ID optionnel de l'unité organisationnelle (pour BCI)
   * @returns ServiceResult avec ThresholdCheckResult
   */
  async checkThresholdExceeded(
    purchaseOrderTotal: number,
    companyId: string,
    orgUnitId?: string
  ): Promise<ServiceResult<ThresholdCheckResult>> {
    try {
      // Récupérer le seuil applicable
      const thresholdResult = await this.getApplicableThreshold(
        companyId,
        orgUnitId,
        purchaseOrderTotal
      );

      if (!thresholdResult.success) {
        return {
          success: false,
          error: thresholdResult.error || 'Erreur lors de la vérification du seuil'
        };
      }

      const applicableThreshold = thresholdResult.data;

      if (!applicableThreshold) {
        // Aucun seuil dépassé
        return {
          success: true,
          data: {
            exceeded: false,
            applicableThreshold: null,
            message: 'Le montant de la commande ne dépasse aucun seuil configuré'
          }
        };
      }

      // Seuil dépassé
      const approvalLevelLabel = {
        chef_chantier: 'Chef de Chantier',
        direction: 'Direction',
        admin: 'Administrateur'
      };

      const message = `Le montant total (${purchaseOrderTotal.toLocaleString('fr-FR')} MGA) dépasse le seuil de ${applicableThreshold.thresholdAmount.toLocaleString('fr-FR')} MGA. Validation ${approvalLevelLabel[applicableThreshold.approvalLevel]} requise.`;

      return {
        success: true,
        data: {
          exceeded: true,
          applicableThreshold,
          message
        }
      };
    } catch (error: any) {
      console.error('Erreur checkThresholdExceeded:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la vérification du seuil'
      };
    }
  }
}

// Exporter une instance singleton
export default new POCPriceThresholdService();







