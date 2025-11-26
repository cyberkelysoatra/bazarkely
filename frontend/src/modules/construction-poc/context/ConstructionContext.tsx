/**
 * React Context pour la gestion d'état du module Construction POC
 * Gère les compagnies de l'utilisateur, le rôle actif, et les droits d'accès
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../../../lib/supabase';
import type {
  Company,
  CompanyMember
} from '../types/construction';
import {
  MemberRole,
  CompanyType,
  CompanyStatus,
  MemberStatus
} from '../types/construction';

/**
 * Interface pour une compagnie avec les informations du membre
 */
export interface UserCompany {
  id: string;
  name: string;
  type: CompanyType;
  status: CompanyStatus;
  role: MemberRole;
  memberId: string;
  memberStatus: MemberStatus;
  registrationNumber?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  country: string;
}

/**
 * Interface du contexte Construction
 */
interface ConstructionContextType {
  // État
  userCompanies: UserCompany[];
  activeCompany: UserCompany | null;
  userRole: MemberRole | null;
  hasConstructionAccess: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setActiveCompany: (companyId: string) => void;
  refreshCompanies: () => Promise<void>;
  
  // Role Simulation (Admin only)
  simulatedRole: MemberRole | null;
  setSimulatedRole: (role: MemberRole | null) => void;
  clearSimulation: () => void;
}

/**
 * Création du contexte
 */
export const ConstructionContext = createContext<ConstructionContextType | undefined>(undefined);

/**
 * Props du Provider
 */
interface ConstructionProviderProps {
  children: ReactNode;
}

/**
 * Provider du contexte Construction
 */
export const ConstructionProvider: React.FC<ConstructionProviderProps> = ({ children }) => {
  const [userCompanies, setUserCompanies] = useState<UserCompany[]>([]);
  const [activeCompany, setActiveCompanyState] = useState<UserCompany | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Role Simulation State (Admin only - frontend only)
  const [simulatedRole, setSimulatedRoleState] = useState<MemberRole | null>(null);

  /**
   * Récupère les compagnies de l'utilisateur depuis Supabase
   */
  const fetchUserCompanies = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Récupérer l'utilisateur authentifié
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        setError('Utilisateur non authentifié');
        setUserCompanies([]);
        setIsLoading(false);
        return;
      }

      // Requête avec jointure sur poc_companies
      const { data, error: queryError } = await supabase
        .from('poc_company_members')
        .select(`
          id,
          company_id,
          role,
          status,
          poc_companies!inner(
            id,
            name,
            type,
            status,
            registration_number,
            contact_email,
            contact_phone,
            address,
            city,
            country
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .eq('poc_companies.status', 'approved');

      if (queryError) {
        console.error('Erreur récupération compagnies:', queryError);
        setError('Erreur lors de la récupération des compagnies');
        setUserCompanies([]);
        setIsLoading(false);
        return;
      }

      // Mapper les données vers UserCompany
      const companies: UserCompany[] = (data || []).map((item: any) => {
        const company = Array.isArray(item.poc_companies)
          ? item.poc_companies[0]
          : item.poc_companies;

        return {
          id: company.id,
          name: company.name,
          type: company.type === 'supplier' ? CompanyType.SUPPLIER : CompanyType.BUILDER,
          status: mapCompanyStatus(company.status),
          role: mapMemberRole(item.role),
          memberId: item.id,
          memberStatus: mapMemberStatus(item.status),
          registrationNumber: company.registration_number || undefined,
          contactEmail: company.contact_email || undefined,
          contactPhone: company.contact_phone || undefined,
          address: company.address || undefined,
          city: company.city || undefined,
          country: company.country || 'Madagascar'
        };
      });

      setUserCompanies(companies);

      // Définir la compagnie active par défaut (première de la liste)
      if (companies.length > 0 && !activeCompany) {
        setActiveCompanyState(companies[0]);
      } else if (companies.length > 0 && activeCompany) {
        // Vérifier que la compagnie active existe toujours
        const activeExists = companies.find(c => c.id === activeCompany.id);
        if (!activeExists) {
          setActiveCompanyState(companies[0]);
        }
      } else {
        setActiveCompanyState(null);
      }

      setIsLoading(false);
    } catch (err: any) {
      console.error('Erreur inattendue:', err);
      setError(err.message || 'Une erreur inattendue s\'est produite');
      setUserCompanies([]);
      setIsLoading(false);
    }
  };

  /**
   * Définit la compagnie active
   */
  const setActiveCompany = (companyId: string) => {
    const company = userCompanies.find(c => c.id === companyId);
    if (company) {
      setActiveCompanyState(company);
    }
  };

  /**
   * Rafraîchit la liste des compagnies
   */
  const refreshCompanies = async () => {
    await fetchUserCompanies();
  };

  // Charger les compagnies au montage
  useEffect(() => {
    fetchUserCompanies();
  }, []);

  // Load simulated role from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('bk_simulated_role');
      if (stored) {
        const role = stored as MemberRole;
        // Validate role is a valid MemberRole enum value
        if (Object.values(MemberRole).includes(role)) {
          setSimulatedRoleState(role);
          console.log('🔄 [Role Simulation] Loaded from localStorage:', role);
        } else {
          console.warn('⚠️ [Role Simulation] Invalid role in localStorage, clearing:', stored);
          localStorage.removeItem('bk_simulated_role');
        }
      }
    } catch (error) {
      console.error('❌ [Role Simulation] Error loading from localStorage:', error);
    }
  }, []);

  // Save simulated role to localStorage when changed
  useEffect(() => {
    if (simulatedRole) {
      try {
        localStorage.setItem('bk_simulated_role', simulatedRole);
        console.log('💾 [Role Simulation] Saved to localStorage:', simulatedRole);
      } catch (error) {
        console.error('❌ [Role Simulation] Error saving to localStorage:', error);
      }
    } else {
      try {
        localStorage.removeItem('bk_simulated_role');
        console.log('🗑️ [Role Simulation] Cleared from localStorage');
      } catch (error) {
        console.error('❌ [Role Simulation] Error clearing localStorage:', error);
      }
    }
  }, [simulatedRole]);

  /**
   * Set simulated role (Admin only - frontend only)
   * Only allows simulation if real role is ADMIN
   */
  const setSimulatedRole = (role: MemberRole | null) => {
    // Verify real role is ADMIN before allowing simulation
    const realRole = activeCompany?.role;
    if (realRole !== MemberRole.ADMIN) {
      console.warn('⚠️ [Role Simulation] Only ADMIN users can simulate roles. Current role:', realRole);
      return;
    }
    
    setSimulatedRoleState(role);
    console.log('🎭 [Role Simulation] Set simulated role:', role);
  };

  /**
   * Clear role simulation and return to real ADMIN role
   */
  const clearSimulation = () => {
    setSimulatedRoleState(null);
    console.log('🔄 [Role Simulation] Cleared, returning to ADMIN');
  };

  // Calculer hasConstructionAccess
  const hasConstructionAccess = userCompanies.length > 0;

  // Calculer userRole: simulatedRole si présent, sinon realRole depuis activeCompany
  // Simulation only works if real role is ADMIN
  const realRole = activeCompany?.role || null;
  const userRole = (realRole === MemberRole.ADMIN && simulatedRole) 
    ? simulatedRole 
    : realRole;

  const contextValue: ConstructionContextType = {
    userCompanies,
    activeCompany,
    userRole,
    hasConstructionAccess,
    isLoading,
    error,
    setActiveCompany,
    refreshCompanies,
    simulatedRole,
    setSimulatedRole,
    clearSimulation
  };

  return (
    <ConstructionContext.Provider value={contextValue}>
      {children}
    </ConstructionContext.Provider>
  );
};

/**
 * Hook personnalisé pour utiliser le contexte Construction
 * @throws Error si utilisé en dehors du Provider
 */
export const useConstruction = (): ConstructionContextType => {
  const context = useContext(ConstructionContext);
  
  if (context === undefined) {
    throw new Error('useConstruction doit être utilisé à l\'intérieur d\'un ConstructionProvider');
  }
  
  return context;
};

/**
 * Helper: Mappe le statut de compagnie depuis la DB vers l'enum
 */
function mapCompanyStatus(status: string): CompanyStatus {
  switch (status) {
    case 'pending':
      return CompanyStatus.PENDING;
    case 'approved':
      return CompanyStatus.APPROVED;
    case 'rejected':
      return CompanyStatus.REJECTED;
    case 'suspended':
      return CompanyStatus.SUSPENDED;
    default:
      return CompanyStatus.PENDING;
  }
}

/**
 * Helper: Mappe le rôle membre depuis la DB vers l'enum
 */
function mapMemberRole(role: string): MemberRole {
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
      return MemberRole.CHEF_EQUIPE;
  }
}

/**
 * Helper: Mappe le statut membre depuis la DB vers l'enum
 */
function mapMemberStatus(status: string): MemberStatus {
  switch (status) {
    case 'active':
      return MemberStatus.ACTIVE;
    case 'inactive':
      return MemberStatus.INACTIVE;
    case 'pending':
      return MemberStatus.PENDING;
    default:
      return MemberStatus.PENDING;
  }
}

