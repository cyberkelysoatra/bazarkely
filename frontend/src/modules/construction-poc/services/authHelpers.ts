/**
 * Helpers d'authentification pour le module POC Construction
 * Fonctions utilitaires pour la gestion de l'authentification et des membres de compagnie
 * Utilisées par pocWorkflowService, pocPurchaseOrderService, pocStockService
 */

import { supabase } from '../../../lib/supabase';
import type { ServiceResult } from '../types/construction';
import {
  CompanyType,
  CompanyStatus,
  MemberRole
} from '../types/construction';

/**
 * Interface pour les informations de compagnie d'un utilisateur
 */
export interface UserCompanyInfo {
  companyId: string;
  companyType: CompanyType;
  companyStatus: CompanyStatus;
  memberRole: MemberRole;
  companyName: string;
}

/**
 * Fonction 1: Récupère l'ID de l'utilisateur authentifié depuis la session Supabase
 * 
 * @returns Promise<ServiceResult<string>> - ID utilisateur (UUID) ou erreur
 * 
 * @example
 * ```typescript
 * const result = await getAuthenticatedUserId();
 * if (result.success) {
 *   const userId = result.data; // UUID de l'utilisateur
 * } else {
 *   console.error(result.error); // Message d'erreur en français
 * }
 * ```
 */
export async function getAuthenticatedUserId(): Promise<ServiceResult<string>> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      return {
        success: false,
        error: 'Erreur lors de la récupération de l\'utilisateur'
      };
    }
    
    if (!user || !user.id) {
      return {
        success: false,
        error: 'Utilisateur non authentifié'
      };
    }
    
    return {
      success: true,
      data: user.id
    };
  } catch (error: any) {
    return {
      success: false,
      error: 'Erreur lors de la récupération de l\'utilisateur'
    };
  }
}

/**
 * Fonction 2: Récupère les détails de l'entreprise de l'utilisateur
 * Inclut l'ID de l'entreprise, le type, le statut, le rôle de l'utilisateur et le nom
 * 
 * @param userId - ID de l'utilisateur (UUID)
 * @param companyType - Filtre optionnel par type d'entreprise (supplier, builder, ou les deux)
 * @returns Promise<ServiceResult<UserCompanyInfo>> - Informations de l'entreprise ou erreur
 * 
 * @example
 * ```typescript
 * // Récupérer n'importe quelle entreprise active
 * const result = await getUserCompany(userId);
 * 
 * // Filtrer par type d'entreprise
 * const builderResult = await getUserCompany(userId, CompanyType.BUILDER);
 * const supplierResult = await getUserCompany(userId, CompanyType.SUPPLIER);
 * 
 * if (result.success) {
 *   const { companyId, companyType, memberRole } = result.data;
 * }
 * ```
 */
export async function getUserCompany(
  userId: string,
  companyType?: CompanyType
): Promise<ServiceResult<UserCompanyInfo>> {
  try {
    // Construction de la requête avec jointure sur poc_companies
    let query = supabase
      .from('poc_company_members')
      .select(`
        company_id,
        role,
        poc_companies!inner(
          id,
          name,
          type,
          status
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1);
    
    // Ajout du filtre par type d'entreprise si fourni
    if (companyType) {
      query = query.eq('poc_companies.type', companyType);
    }
    
    const { data, error } = await query.maybeSingle();
    
    if (error) {
      // Erreur de base de données
      return {
        success: false,
        error: 'Erreur lors de la récupération de l\'entreprise'
      };
    }
    
    // Type assertion pour les données de la requête Supabase
    type QueryResult = {
      company_id: string;
      role: string;
      poc_companies: {
        id: string;
        name: string;
        type: string;
        status: string;
      };
    };
    
    const queryData = data as QueryResult | null;
    
    if (!queryData || !queryData.poc_companies) {
      // Aucune entreprise trouvée
      const typeMsg = companyType 
        ? ` d'entreprise ${companyType === CompanyType.SUPPLIER ? 'fournisseur' : 'constructeur'}`
        : '';
      return {
        success: false,
        error: `Utilisateur ne fait partie d'aucune entreprise${typeMsg} active`
      };
    }
    
    // Vérification que l'entreprise existe
    const company = Array.isArray(queryData.poc_companies) 
      ? queryData.poc_companies[0] 
      : queryData.poc_companies;
    
    if (!company) {
      return {
        success: false,
        error: 'Entreprise introuvable'
      };
    }
    
    // Mapping des valeurs enum
    const mappedCompanyType = company.type === 'supplier' 
      ? CompanyType.SUPPLIER 
      : CompanyType.BUILDER;
    
    const mappedCompanyStatus = company.status === 'pending'
      ? CompanyStatus.PENDING
      : company.status === 'approved'
      ? CompanyStatus.APPROVED
      : company.status === 'rejected'
      ? CompanyStatus.REJECTED
      : CompanyStatus.SUSPENDED;
    
    const mappedMemberRole = mapRoleToEnum(queryData.role);
    if (!mappedMemberRole) {
      return {
        success: false,
        error: 'Rôle invalide dans l\'entreprise'
      };
    }
    
    return {
      success: true,
      data: {
        companyId: queryData.company_id,
        companyType: mappedCompanyType,
        companyStatus: mappedCompanyStatus,
        memberRole: mappedMemberRole,
        companyName: company.name
      }
    };
  } catch (error: any) {
    return {
      success: false,
      error: 'Erreur lors de la récupération de l\'entreprise'
    };
  }
}

/**
 * Fonction 3: Vérifie si l'utilisateur est membre actif d'une entreprise spécifique
 * Fonction simple retournant un boolean (pas de ServiceResult pour faciliter les vérifications)
 * 
 * @param userId - ID de l'utilisateur (UUID)
 * @param companyId - ID de l'entreprise (UUID)
 * @returns Promise<boolean> - true si membre actif, false sinon
 * 
 * @example
 * ```typescript
 * const isMember = await isUserMemberOfCompany(userId, companyId);
 * if (isMember) {
 *   // L'utilisateur est membre actif
 * }
 * ```
 */
export async function isUserMemberOfCompany(
  userId: string,
  companyId: string
): Promise<boolean> {
  try {
    // Utilisation de EXISTS pour une requête optimisée
    const { data, error } = await supabase
      .from('poc_company_members')
      .select('id')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();
    
    if (error || !data) {
      return false;
    }
    
    return true;
  } catch (error) {
    // En cas d'erreur, retourner false pour sécurité
    return false;
  }
}

/**
 * Fonction 4: Récupère le rôle de l'utilisateur dans une entreprise spécifique
 * Retourne null si l'utilisateur n'est pas membre ou en cas d'erreur
 * (pas de ServiceResult pour faciliter les vérifications optionnelles)
 * 
 * @param userId - ID de l'utilisateur (UUID)
 * @param companyId - ID de l'entreprise (UUID)
 * @returns Promise<MemberRole | null> - Rôle de l'utilisateur ou null
 * 
 * @example
 * ```typescript
 * const role = await getUserRole(userId, companyId);
 * if (role === null) {
 *   // L'utilisateur n'est pas membre ou erreur
 *   return; // Accès refusé
 * }
 * 
 * if (role === MemberRole.CHEF_CHANTIER) {
 *   // L'utilisateur peut approuver les bons de commande
 * }
 * ```
 */
export async function getUserRole(
  userId: string,
  companyId: string
): Promise<MemberRole | null> {
  try {
    const { data, error } = await supabase
      .from('poc_company_members')
      .select('role')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();
    
    // Type assertion pour les données de la requête
    type RoleQueryResult = {
      role: string;
    } | null;
    
    const roleData = data as RoleQueryResult;
    
    if (error || !roleData || !roleData.role) {
      return null;
    }
    
    // Mapping du rôle string vers l'enum MemberRole
    const mappedRole = mapRoleToEnum(roleData.role);
    return mappedRole;
  } catch (error) {
    // En cas d'erreur, retourner null
    return null;
  }
}

/**
 * Helper interne: Mappe un rôle string de la base de données vers l'enum MemberRole
 * 
 * @param role - Rôle depuis la base de données (string)
 * @returns MemberRole | null - Rôle mappé ou null si invalide
 */
function mapRoleToEnum(role: string): MemberRole | null {
  switch (role) {
    case 'admin':
      return MemberRole.ADMIN;
    case 'direction':
      return MemberRole.DIRECTION;
    case 'resp_finance':
      return MemberRole.RESP_FINANCE;
    case 'magasinier':
      return MemberRole.MAGASINIER;
    case 'logistique':
      return MemberRole.LOGISTIQUE;
    case 'chef_chantier':
      return MemberRole.CHEF_CHANTIER;
    case 'chef_equipe':
      return MemberRole.CHEF_EQUIPE;
    default:
      return null;
  }
}
