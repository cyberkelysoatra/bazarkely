/**
 * Formulaire de création de bon de commande
 * Formulaire en une seule page avec toutes les sections
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Search, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { Button, Input, Card, Alert } from '../../../components/UI';
import { supabase } from '../../../lib/supabase';
import pocPurchaseOrderService from '../services/pocPurchaseOrderService';
import pocWorkflowService from '../services/pocWorkflowService';
import pocProductService from '../services/pocProductService';
import pocPriceThresholdService from '../services/pocPriceThresholdService';
import pocConsumptionPlanService from '../services/pocConsumptionPlanService';
import type { ThresholdCheckResult } from '../services/pocPriceThresholdService';
import type { ConsumptionSummary } from '../services/pocConsumptionPlanService';
import ThresholdAlert from './ThresholdAlert';
import ConsumptionPlanCard from './ConsumptionPlanCard';
import { useConstruction } from '../context/ConstructionContext';
import type { PurchaseOrderItem, Product, OrgUnit } from '../types/construction';
import { Warehouse, Truck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { canViewBCIPrices } from '../utils/rolePermissions';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Project {
  id: string;
  name: string;
  location?: string;
}

interface Supplier {
  id: string;
  name: string;
  location?: string;
}

interface FormItem extends Omit<PurchaseOrderItem, 'id' | 'purchaseOrderId' | 'createdAt' | 'updatedAt'> {
  tempId?: string;
}

// Sortable row component for drag and drop
interface SortableRowProps {
  id: string;
  children: React.ReactNode;
  index: number;
  showDragHandle?: boolean;
}

const SortableRow = ({ id, children, index, showDragHandle = true }: SortableRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isDragging ? '#f3f4f6' : 'transparent',
  };

  return (
    <tr ref={setNodeRef} style={style} className="relative">
      {/* Drag handle cell - only show on filled rows */}
      <td className="p-0 text-center" style={index === 0 ? { paddingTop: '4px' } : {}}>
        {showDragHandle ? (
          <div
            {...attributes}
            {...listeners}
            className="cursor-move hover:text-blue-600 transition-colors flex items-center justify-start pl-0 pr-0 py-1"
            title="Glisser pour réorganiser"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </div>
        ) : (
          <div className="pl-0 pr-0 py-1" style={{ width: '20px' }}></div>
        )}
      </td>
      {children}
    </tr>
  );
};

const PurchaseOrderForm: React.FC = () => {
  const navigate = useNavigate();
  const { activeCompany, userRole } = useConstruction();
  
  // Flag pour préparer le mode EDIT (actuellement toujours CREATE)
  // TODO: Will be !!orderId when edit mode is implemented
  const isEditMode = false;
  
  // États du formulaire
  const [orderType, setOrderType] = useState<'BCI' | 'BCE'>('BCE'); // Type de commande: BCI (interne) ou BCE (externe)
  const [projectId, setProjectId] = useState('');
  const [orgUnitId, setOrgUnitId] = useState(''); // Unité organisationnelle pour BCI
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState<FormItem[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  
  // État pour utilisateur actuel (pour affichage statique du contact)
  const [currentUser, setCurrentUser] = useState<{ name?: string; phone?: string } | null>(null);
  
  // États de chargement
  const [loading, setLoading] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingOrgUnits, setLoadingOrgUnits] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  
  // Données
  const [projects, setProjects] = useState<Project[]>([]);
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  // Inline Product Search (AGENT 11 - Replaced Modal)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLDivElement>(null);
  const headerDropdownRef = useRef<HTMLDivElement>(null);
  
  // Erreurs de validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // États pour Phase 3 Security - Threshold et Consumption Plans
  const [thresholdCheck, setThresholdCheck] = useState<ThresholdCheckResult | null>(null);
  const [showThresholdAlert, setShowThresholdAlert] = useState(false);
  const [consumptionPlans, setConsumptionPlans] = useState<ConsumptionSummary[]>([]);
  const [loadingThreshold, setLoadingThreshold] = useState(false);
  
  // États pour sections collapsibles (par défaut collapsed pour réduire complexité visuelle)
  const [isNotesCollapsed, setIsNotesCollapsed] = useState(true);
  
  // État pour dropdown du header
  const [isHeaderDropdownOpen, setIsHeaderDropdownOpen] = useState(false);
  
  // États pour dropdown de destination (construction sites)
  const [isDestinationDropdownOpen, setIsDestinationDropdownOpen] = useState(false);
  const [selectedConstructionSite, setSelectedConstructionSite] = useState<string | null>(null);
  const [constructionSites, setConstructionSites] = useState<any[]>([]);
  const [loadingConstructionSites, setLoadingConstructionSites] = useState(false);
  const destinationDropdownRef = useRef<HTMLDivElement>(null);
  
  // État pour contrôle de visibilité de la dernière ligne vide
  const [isTableFocused, setIsTableFocused] = useState(true);
  
  // Refs for empty row visibility system
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const itemsRef = useRef(items);
  
  // États pour cascade selector (project + org unit)
  const [cascadeStep, setCascadeStep] = useState<'project' | 'orgunit' | 'complete'>('project');
  const [selectedProjectForCascade, setSelectedProjectForCascade] = useState<any | null>(null);
  const [projectSearchTerm, setProjectSearchTerm] = useState<string>('');
  const [orgUnitSearchTerm, setOrgUnitSearchTerm] = useState<string>('');
  
  // États pour création de projet (modal)
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectLocation, setNewProjectLocation] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  
  // États pour création d'unité organisationnelle (modal)
  const [isCreateOrgUnitModalOpen, setIsCreateOrgUnitModalOpen] = useState(false);
  const [newOrgUnitName, setNewOrgUnitName] = useState('');
  const [creatingOrgUnit, setCreatingOrgUnit] = useState(false);
  
  // États pour dropdown Phase
  const [phases, setPhases] = useState<Array<{ id: string; name: string; category?: string; order_index?: number }>>([]);
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [loadingPhases, setLoadingPhases] = useState(false);
  const [isPhaseDropdownOpen, setIsPhaseDropdownOpen] = useState(false);
  const [phaseSearchTerm, setPhaseSearchTerm] = useState<string>('');
  const phaseDropdownRef = useRef<HTMLDivElement>(null);
  
  // États pour dropdown d'édition des informations utilisateur
  const [isUserInfoDropdownOpen, setIsUserInfoDropdownOpen] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const userInfoDropdownRef = useRef<HTMLDivElement>(null);
  
  // États pour tracker les champs auto-remplis (pour feedback visuel)
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());

  // PHASE 1: États pour création de produit (modal)
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductUnit, setNewProductUnit] = useState('unité');
  const [newProductPrice, setNewProductPrice] = useState<number | ''>('');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [creatingProductForRowIndex, setCreatingProductForRowIndex] = useState<number | null>(null);

  // PHASE 1: États pour données supplémentaires (org_unit, project)
  const [selectedOrgUnit, setSelectedOrgUnit] = useState<OrgUnit | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [userFullName, setUserFullName] = useState('');

  // PHASE 1: BCI/BCE Number format (temporaire - TODO: utiliser séquence DB)
  const [orderNumber, setOrderNumber] = useState<string>('NOUVEAU');

  // Smart Default: orderType basé sur le rôle utilisateur
  useEffect(() => {
    // Appliquer uniquement en mode CREATE et si userRole est défini
    if (isEditMode || !userRole) return;
    
    // Chef équipe et magasinier -> BCI (commande interne)
    if (userRole === 'chef_equipe' || userRole === 'magasinier') {
      setOrderType('BCI');
      setAutoFilledFields(prev => new Set(prev).add('orderType'));
    }
    // Direction, admin, chef_chantier, logistique, resp_finance -> BCE (commande externe)
    // BCE est déjà la valeur par défaut, donc pas besoin de changer
  }, [userRole, isEditMode]);

  // Charger les projets
  useEffect(() => {
    const loadProjects = async () => {
      if (!activeCompany?.id) return;
      
      try {
        setLoadingProjects(true);
        const { data, error } = await supabase
          .from('poc_projects')
          .select('id, name, location')
          .eq('company_id', activeCompany.id)
          .eq('status', 'active')
          .order('name');
        
        if (error) throw error;
        const projectsData = data || [];
        setProjects(projectsData);
        
        // Smart Default: Auto-sélection si un seul projet disponible
        if (!isEditMode && !projectId && projectsData.length === 1) {
          setProjectId(projectsData[0].id);
          setAutoFilledFields(prev => new Set(prev).add('projectId'));
        }
      } catch (error: any) {
        console.error('Erreur chargement projets:', error);
        toast.error('Erreur lors du chargement des projets');
      } finally {
        setLoadingProjects(false);
      }
    };
    
    loadProjects();
  }, [activeCompany, isEditMode, projectId]);

  // Charger les unités organisationnelles (pour BCI)
  useEffect(() => {
    const loadOrgUnits = async () => {
      if (!activeCompany?.id || orderType !== 'BCI') {
        setLoadingOrgUnits(false);
        return;
      }
      
      try {
        setLoadingOrgUnits(true);
        const { data, error } = await supabase
          .from('poc_org_units')
          .select('id, name, code, type, company_id, parent_id, description, created_at, updated_at')
          .eq('company_id', activeCompany.id)
          .order('type', { ascending: true })
          .order('name', { ascending: true });
        
        if (error) throw error;
        const orgUnitsData = (data || []).map(ou => ({
          id: ou.id,
          name: ou.name,
          code: ou.code || undefined,
          type: ou.type as 'department' | 'team',
          companyId: ou.company_id,
          parentId: ou.parent_id || undefined,
          description: ou.description || undefined,
          createdAt: new Date(ou.created_at),
          updatedAt: new Date(ou.updated_at)
        }));
        setOrgUnits(orgUnitsData);
        
        // Smart Default: Auto-sélection orgUnitId pour BCI
        if (!isEditMode && !orgUnitId && orderType === 'BCI') {
          // Cas 1: Une seule unité disponible -> auto-sélection
          if (orgUnitsData.length === 1) {
            setOrgUnitId(orgUnitsData[0].id);
            setAutoFilledFields(prev => new Set(prev).add('orgUnitId'));
          } 
          // Cas 2: Chef équipe ou magasinier membre d'une seule unité
          else if (userRole === 'chef_equipe' || userRole === 'magasinier') {
            (async () => {
              try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user?.id) {
                  console.error('No authenticated user found for orgUnitId auto-selection');
                  return;
                }
                
                // Vérifier que user.id est une string valide
                const userId = user.id;
                if (typeof userId !== 'string' || !userId.trim()) {
                  console.error('Invalid user.id format:', userId);
                  return;
                }
                
                // Récupérer les unités où l'utilisateur est membre actif
                const { data: memberships, error: membersError } = await supabase
                  .from('poc_org_unit_members')
                  .select('org_unit_id')
                  .eq('user_id', userId)
                  .eq('status', 'active')
                  .eq('company_id', activeCompany.id);
                
                if (membersError) {
                  console.error('Erreur récupération membres org_unit:', membersError);
                  return;
                }
                
                // Si l'utilisateur est membre d'exactement une unité, auto-sélectionner
                if (memberships && memberships.length === 1) {
                  const userOrgUnitId = memberships[0].org_unit_id;
                  // Vérifier que cette unité est dans la liste disponible
                  if (orgUnitsData.some(ou => ou.id === userOrgUnitId)) {
                    setOrgUnitId(userOrgUnitId);
                    setAutoFilledFields(prev => new Set(prev).add('orgUnitId'));
                  }
                }
              } catch (err: any) {
                console.error('Erreur auto-sélection org_unit:', err);
                // Graceful degradation: continuer sans auto-sélection
              }
            })();
          }
        }
      } catch (error: any) {
        console.error('Erreur chargement unités organisationnelles:', error);
        toast.error('Erreur lors du chargement des unités organisationnelles');
      } finally {
        setLoadingOrgUnits(false);
      }
    };
    
    loadOrgUnits();
  }, [activeCompany, orderType, isEditMode, orgUnitId, userRole]);

  // Charger les fournisseurs
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        setLoadingSuppliers(true);
        const { data, error } = await supabase
          .from('poc_companies')
          .select('id, name, address')
          .eq('type', 'supplier')
          .eq('status', 'approved')
          .order('name');
        
        if (error) throw error;
        const suppliersData = (data || []).map(s => ({
          id: s.id,
          name: s.name,
          location: s.address
        }));
        setSuppliers(suppliersData);
        
        // Smart Default: Auto-sélection si un seul fournisseur disponible
        if (!isEditMode && !supplierId && suppliersData.length === 1) {
          setSupplierId(suppliersData[0].id);
          setAutoFilledFields(prev => new Set(prev).add('supplierId'));
        }
      } catch (error: any) {
        console.error('Erreur chargement fournisseurs:', error);
        toast.error('Erreur lors du chargement des fournisseurs');
      } finally {
        setLoadingSuppliers(false);
      }
    };
    
    loadSuppliers();
  }, [isEditMode, supplierId]);

  // Calculer les totaux
  const calculateTotals = () => {
    // Exclude empty rows (quantity: 1 with no unit/itemName)
    const subtotal = items
      .filter(item => item.unit && item.itemName && item.unit.trim() !== '' && item.itemName.trim() !== '')
      .reduce((sum, item) => sum + item.totalPrice, 0);
    return {
      subtotal,
      total: subtotal // Pas de taxes pour l'instant
    };
  };

  // Phase 3 Security - Vérifier les seuils quand le total change
  useEffect(() => {
    const checkThreshold = async () => {
      const currentTotals = calculateTotals();
      
      // Ne vérifier que si total > 0 et company existe
      if (currentTotals.total <= 0 || !activeCompany?.id) {
        setThresholdCheck(null);
        setShowThresholdAlert(false);
        return;
      }

      try {
        setLoadingThreshold(true);
        
        // Déterminer orgUnitId selon le type de commande
        // FIX: Convert undefined or "undefined" string to null to prevent UUID syntax errors
        let validOrgUnitId: string | undefined;
        if (orderType === 'BCI' && orgUnitId) {
          // Validate orgUnitId: must be non-empty string and not "undefined"
          validOrgUnitId = (orgUnitId && orgUnitId !== 'undefined' && orgUnitId.trim() !== '') 
            ? orgUnitId 
            : undefined;
        } else {
          validOrgUnitId = undefined;
        }
        
        const result = await pocPriceThresholdService.checkThresholdExceeded(
          currentTotals.total,
          activeCompany.id,
          validOrgUnitId
        );

        if (result.success && result.data) {
          setThresholdCheck(result.data);
          setShowThresholdAlert(result.data.exceeded);
        } else {
          // En cas d'erreur, ne pas bloquer le formulaire (graceful degradation)
          console.warn('Erreur vérification seuil:', result.error);
          setThresholdCheck(null);
          setShowThresholdAlert(false);
        }
      } catch (error: any) {
        console.error('Erreur vérification seuil:', error);
        // Graceful degradation: ne pas bloquer le formulaire
        setThresholdCheck(null);
        setShowThresholdAlert(false);
      } finally {
        setLoadingThreshold(false);
      }
    };

    checkThreshold();
  }, [items, activeCompany?.id, orderType, orgUnitId]);

  // Phase 3 Security - Charger les plans de consommation pour les produits du panier
  useEffect(() => {
    const loadConsumptionPlans = async () => {
      // Ne charger que si items existent et company existe
      if (items.length === 0 || !activeCompany?.id) {
        setConsumptionPlans([]);
        return;
      }

      try {
        // Extraire les productIds uniques depuis les items
        const productIds = items
          .map(item => item.catalogItemId)
          .filter((id): id is string => !!id);

        if (productIds.length === 0) {
          setConsumptionPlans([]);
          return;
        }

        // Charger tous les résumés de consommation pour toutes les périodes
        // On charge monthly, quarterly et yearly pour être complet
        const allSummaries: ConsumptionSummary[] = [];
        
        for (const period of ['monthly', 'quarterly', 'yearly'] as const) {
          const summaryResult = await pocConsumptionPlanService.getConsumptionSummary(
            activeCompany.id,
            period
          );

          if (summaryResult.success && summaryResult.data) {
            // Filtrer pour ne garder que les plans des produits dans le panier
            const relevantSummaries = summaryResult.data.filter(summary => 
              productIds.includes(summary.productId)
            );
            
            // Filtrer aussi selon le type de commande (orgUnitId ou projectId)
            const filteredSummaries = relevantSummaries.filter(summary => {
              if (orderType === 'BCI' && orgUnitId) {
                return summary.orgUnitId === orgUnitId;
              } else if (orderType === 'BCE' && projectId) {
                return summary.projectId === projectId;
              }
              // Si pas de filtre spécifique, inclure tous les plans
              return true;
            });
            
            allSummaries.push(...filteredSummaries);
          }
        }

        // Dédupliquer par planId (au cas où un plan apparaîtrait dans plusieurs périodes)
        const uniquePlans = Array.from(
          new Map(allSummaries.map(plan => [plan.planId, plan])).values()
        );

        setConsumptionPlans(uniquePlans);
      } catch (error: any) {
        console.error('Erreur chargement plans consommation:', error);
        // Graceful degradation: ne pas bloquer le formulaire
        setConsumptionPlans([]);
      }
    };

    loadConsumptionPlans();
  }, [items, activeCompany?.id, orderType, orgUnitId, projectId]);

  // Smart Default: Auto-remplir deliveryAddress depuis activeCompany
  useEffect(() => {
    if (isEditMode || !activeCompany || deliveryAddress) return;
    
    // Construire l'adresse complète depuis les données de la compagnie
    const addressParts: string[] = [];
    if (activeCompany.address) {
      addressParts.push(activeCompany.address);
    }
    if (activeCompany.city) {
      addressParts.push(activeCompany.city);
    }
    
    if (addressParts.length > 0) {
      setDeliveryAddress(addressParts.join(', '));
      setAutoFilledFields(prev => new Set(prev).add('deliveryAddress'));
    }
  }, [activeCompany, deliveryAddress, isEditMode]);

  // Smart Default: Auto-remplir contact info (nom et téléphone)
  useEffect(() => {
    if (isEditMode) return;
    
    // Auto-remplir contactName depuis user metadata
    if (!contactName) {
      (async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.user_metadata) {
            const firstName = user.user_metadata.first_name;
            const fullName = user.user_metadata.full_name;
            const nameToUse = firstName || fullName;
            if (nameToUse) {
              setContactName(nameToUse);
              setAutoFilledFields(prev => new Set(prev).add('contactName'));
            }
          }
        } catch (err: any) {
          console.error('Erreur récupération user metadata:', err);
          // Graceful degradation: continuer sans auto-remplissage
        }
      })();
    }
    
    // Auto-remplir contactPhone depuis activeCompany
    if (!contactPhone && activeCompany?.contactPhone) {
      setContactPhone(activeCompany.contactPhone);
      setAutoFilledFields(prev => new Set(prev).add('contactPhone'));
    }
  }, [isEditMode, contactName, contactPhone, activeCompany]);

  // Inline Product Search Handler (AGENT 11 - Debounced)
  const performSearch = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    
    try {
      setSearchingProducts(true);
      const result = await pocProductService.searchProducts({
        searchText: query
      });
      
      if (result.success && result.data) {
        setSearchResults(result.data.data || []);
        setShowDropdown(true);
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    } catch (error: any) {
      console.error('Erreur recherche produits:', error);
      setSearchResults([]);
      setShowDropdown(false);
    } finally {
      setSearchingProducts(false);
    }
  };

  // Handle search input change with debounce (AGENT 11)
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Trigger search after 2-3 characters with 300ms debounce
    if (value.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(value);
      }, 300);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  };

  // Close dropdown when clicking outside (AGENT 11)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Check if click is inside search input
      const isInsideSearchInput = searchInputRef.current?.contains(target as Node) ?? false;
      
      // Check if click is on dropdown (z-[9999] class)
      const isOnDropdown = target.closest('[class*="z-[9999]"]') !== null;
      
      // Only close dropdown if click is OUTSIDE both search input AND dropdown
      if (!isInsideSearchInput && !isOnDropdown) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDropdown]);

  // Close header dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerDropdownRef.current && !headerDropdownRef.current.contains(event.target as Node)) {
        setIsHeaderDropdownOpen(false);
      }
    };

    if (isHeaderDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isHeaderDropdownOpen]);

  // Load construction sites for destination dropdown (using poc_projects table)
  useEffect(() => {
    const loadConstructionSites = async () => {
      if (!activeCompany?.id) return;

      setLoadingConstructionSites(true);
      try {
        const { data: sites, error } = await supabase
          .from('poc_projects')
          .select('id, name, location, company_id')
          .eq('company_id', activeCompany.id)
          .eq('status', 'active')
          .order('name', { ascending: true });

        if (error) {
          console.error('Error loading construction sites:', error);
          setConstructionSites([]);
        } else {
          setConstructionSites(sites || []);
        }
      } catch (error) {
        console.error('Error loading construction sites:', error);
        setConstructionSites([]);
      } finally {
        setLoadingConstructionSites(false);
      }
    };

    loadConstructionSites();
  }, [activeCompany?.id]);

  // Filter projects by search term
  const filteredProjects = useMemo(() => {
    if (!projectSearchTerm.trim()) return constructionSites;
    return constructionSites.filter(site =>
      site.name.toLowerCase().includes(projectSearchTerm.toLowerCase())
    );
  }, [constructionSites, projectSearchTerm]);

  // Filter org units by selected project's company_id and search term
  const filteredOrgUnits = useMemo(() => {
    if (!selectedProjectForCascade || !selectedProjectForCascade.company_id) return [];
    const unitsByCompany = orgUnits.filter(unit => unit.companyId === selectedProjectForCascade.company_id);
    if (!orgUnitSearchTerm.trim()) return unitsByCompany;
    return unitsByCompany.filter(unit =>
      unit.name.toLowerCase().includes(orgUnitSearchTerm.toLowerCase())
    );
  }, [selectedProjectForCascade, orgUnits, orgUnitSearchTerm]);

  // Close destination dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (destinationDropdownRef.current && !destinationDropdownRef.current.contains(event.target as Node)) {
        setIsDestinationDropdownOpen(false);
        // Reset cascade if not complete AND no creation modals are open
        if (cascadeStep !== 'complete' && !isCreateOrgUnitModalOpen && !isCreateProjectModalOpen) {
          setCascadeStep('project');
          setSelectedProjectForCascade(null);
          setProjectSearchTerm(''); // Reset searches
          setOrgUnitSearchTerm('');
        }
      }
    };

    if (isDestinationDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isDestinationDropdownOpen, cascadeStep, isCreateOrgUnitModalOpen, isCreateProjectModalOpen]);

  // Close user info dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userInfoDropdownRef.current && !userInfoDropdownRef.current.contains(event.target as Node)) {
        setIsUserInfoDropdownOpen(false);
      }
    };

    if (isUserInfoDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isUserInfoDropdownOpen]);

  // Load phases for Phase dropdown (only for BCI orders)
  useEffect(() => {
    console.log('🔄 useEffect loadPhases triggered - activeCompany:', activeCompany?.id, 'orderType:', orderType);
    
    const loadPhases = async () => {
      if (!activeCompany?.id || orderType !== 'BCI') {
        setPhases([]);
        return;
      }

      console.log('🔍 Loading phases for company:', activeCompany?.id);
      console.log('🔍 Order type:', orderType);

      setLoadingPhases(true);
      try {
        const { data: phasesData, error } = await supabase
          .from('poc_phases')
          .select('id, name, category, order_index')
          .eq('company_id', activeCompany.id)
          .eq('is_active', true)
          .order('order_index', { ascending: true });

        console.log('📦 Phases query result - error:', error);
        console.log('📦 Phases query result - data:', phasesData);
        console.log('📦 Phases data type:', Array.isArray(phasesData) ? 'Array' : typeof phasesData);
        console.log('📦 Phases data length:', phasesData?.length);

        if (error) {
          console.error('Error loading phases:', error);
          setPhases([]);
        } else {
          setPhases(phasesData || []);
          console.log('✅ Phases set to state:', phasesData?.length || 0, 'phases');
        }
      } catch (error) {
        console.error('Error loading phases:', error);
        setPhases([]);
      } finally {
        setLoadingPhases(false);
      }
    };

    loadPhases();
  }, [activeCompany?.id, orderType]);

  // Close phase dropdown when clicking outside
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
      if (phaseDropdownRef.current && !phaseDropdownRef.current.contains(event.target as Node)) {
        setIsPhaseDropdownOpen(false);
        setPhaseSearchTerm('');
      }
    };

    if (isPhaseDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isPhaseDropdownOpen]);

  // Load current user info for static contact display
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          setCurrentUser(null);
          return;
        }

        // Extract name from user metadata or email
        const firstName = user.user_metadata?.first_name || '';
        const lastName = user.user_metadata?.last_name || '';
        const name = firstName && lastName 
          ? `${firstName} ${lastName}` 
          : firstName || lastName || user.email?.split('@')[0] || 'Non renseigné';

        // Extract phone from user metadata
        const phone = user.user_metadata?.phone || user.phone || '';

        setCurrentUser({ name, phone: phone || undefined });
      } catch (error) {
        console.error('Error loading current user:', error);
        setCurrentUser(null);
      }
    };

    loadCurrentUser();
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // PHASE 1 - PRIORITY 0: Fonction manquante handleAddProductFromSearch
  // Ajoute un produit sélectionné depuis la recherche au panier
  const handleAddProductFromSearch = (product: Product) => {
    const newItem: FormItem = {
      tempId: `temp-${Date.now()}`,
      catalogItemId: product.id,
      itemName: product.name,
      description: product.description,
      quantity: 1,
      unit: product.unit || 'unité',
      unitPrice: product.currentPrice || 0,
      totalPrice: product.currentPrice || 0
    };
    
    setItems([...items, newItem]);
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
    toast.success(`Produit "${product.name}" ajouté au panier`);
    console.log('✅ [Product Search] Product added to cart:', product.name);
  };

  // PHASE 1: Charger données utilisateur pour signature
  useEffect(() => {
    const loadUserFullName = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata) {
          const firstName = user.user_metadata.first_name || '';
          const lastName = user.user_metadata.last_name || '';
          if (firstName || lastName) {
            setUserFullName(`${firstName} ${lastName}`.trim());
          } else if (user.user_metadata.full_name) {
            setUserFullName(user.user_metadata.full_name);
          }
        }
      } catch (error) {
        console.error('Erreur chargement nom utilisateur:', error);
      }
    };
    loadUserFullName();
  }, []);

  // PHASE 1: Mettre à jour selectedOrgUnit quand orgUnitId change
  useEffect(() => {
    if (orgUnitId && orgUnits.length > 0) {
      const orgUnit = orgUnits.find(ou => ou.id === orgUnitId);
      setSelectedOrgUnit(orgUnit || null);
    } else {
      setSelectedOrgUnit(null);
    }
  }, [orgUnitId, orgUnits]);

  // PHASE 1: Mettre à jour selectedProject quand projectId change
  useEffect(() => {
    if (projectId && projects.length > 0) {
      const project = projects.find(p => p.id === projectId);
      setSelectedProject(project || null);
    } else {
      setSelectedProject(null);
    }
  }, [projectId, projects]);

  // PHASE 1: Calculer date minimum selon orderType (BCI: +12h, BCE: +72h)
  const getMinDeliveryDate = (): string => {
    const now = new Date();
    const minDate = new Date(now);
    
    if (orderType === 'BCI') {
      // BCI: minimum aujourd'hui + 12 heures
      minDate.setHours(minDate.getHours() + 12);
    } else {
      // BCE: minimum aujourd'hui + 72 heures (3 jours)
      minDate.setHours(minDate.getHours() + 72);
    }
    
    // Format YYYY-MM-DD pour input type="date"
    const year = minDate.getFullYear();
    const month = String(minDate.getMonth() + 1).padStart(2, '0');
    const day = String(minDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // PHASE 1: Calculer date par défaut selon orderType
  const getDefaultDeliveryDate = (): string => {
    return getMinDeliveryDate();
  };

  // PHASE 1: Initialiser requestedDeliveryDate avec valeur par défaut
  useEffect(() => {
    if (!requestedDeliveryDate && !isEditMode) {
      setRequestedDeliveryDate(getDefaultDeliveryDate());
    }
  }, [orderType, isEditMode]);

  // Ensure one empty row exists on initial load only
  useEffect(() => {
    if (!isEditMode && items.length === 0) {
      // Initial state only - add one empty row
      const newEmptyItem: FormItem = {
        tempId: `temp-${Date.now()}-${Math.random()}`,
      itemName: '',
      quantity: 1,
        unit: '',
      unitPrice: 0,
        totalPrice: 0,
        description: '',
        catalogItemId: undefined
      };
      setItems([newEmptyItem]);
    }
  }, [items, isEditMode]);

  // Automatically remove duplicate empty rows, keep only first
  // Empty = no itemName (regardless of unit)
  useEffect(() => {
    if (!isEditMode) {
      // Count empty rows (no itemName, regardless of unit)
      const emptyRowsCount = items.filter(item => 
        !item.itemName || item.itemName.trim() === ''
      ).length;
      
      // If more than 1 empty row, remove duplicates
      if (emptyRowsCount > 1) {
        removeAllEmptyRowsExceptFirst();
      }
    }
  }, [items, isEditMode]);

  // PHASE 1: Validation date livraison
  const validateDeliveryDate = (date: string): boolean => {
    if (!date) return true; // Optionnel
    
    const selectedDate = new Date(date);
    const minDate = new Date(getMinDeliveryDate());
    
    // Comparer seulement les dates (ignorer heures)
    selectedDate.setHours(0, 0, 0, 0);
    minDate.setHours(0, 0, 0, 0);
    
    return selectedDate >= minDate;
  };

  // PHASE 1: Handler création produit
  const handleCreateProduct = async () => {
    // Validation
    if (!newProductName.trim()) {
      toast.error('Le nom du produit est requis');
      return;
    }
    if (!newProductUnit.trim()) {
      toast.error('L\'unité est requise');
      return;
    }

    if (!activeCompany?.id) {
      toast.error('Compagnie non sélectionnée');
      return;
    }

    try {
      setCreatingProduct(true);

      // Créer le produit via le service
      // Note: Le service attend supplierId, mais pour Magasinier on peut utiliser activeCompany.id
      // TODO: Vérifier si Magasinier peut créer produits ou si besoin supplierId
      const productData = {
        supplierId: activeCompany.id, // Utiliser company comme supplier temporairement
        name: newProductName.trim(),
        unit: newProductUnit.trim(),
        currentPrice: newProductPrice === '' ? 0 : Number(newProductPrice),
        description: newProductDescription.trim() || undefined,
        currency: 'MGA',
        stockAvailable: 0,
        minOrderQuantity: 1,
        imagesUrls: [],
        specifications: {},
        isActive: true
      };

      const result = await pocProductService.create(productData);

      if (result.success && result.data) {
        // Check if we should update current row or add new row
        if (creatingProductForRowIndex !== null && creatingProductForRowIndex >= 0 && creatingProductForRowIndex < items.length) {
          // Update current row with new product data, preserving existing quantity
          const newItems = [...items];
          const existingQuantity = newItems[creatingProductForRowIndex].quantity > 0 
            ? newItems[creatingProductForRowIndex].quantity 
            : 1;
          const unitPrice = result.data.currentPrice || 0;
          
          newItems[creatingProductForRowIndex] = {
            ...newItems[creatingProductForRowIndex],
            catalogItemId: result.data.id,
            itemName: result.data.name,
            description: result.data.description,
            unit: result.data.unit,
            unitPrice: unitPrice,
            totalPrice: unitPrice * existingQuantity,
            quantity: existingQuantity
          };
          
          // Auto-create new empty row after updated row
          const newEmptyItem: FormItem = {
            tempId: `temp-${Date.now()}-${Math.random()}`,
            itemName: '',
            quantity: 1,
            unit: '',
            unitPrice: 0,
            totalPrice: 0,
            description: '',
            catalogItemId: undefined
          };
          
          setItems([...newItems, newEmptyItem]);
          
          // Clear blur timeout and ensure table stays focused
          if (blurTimeoutRef.current) {
            clearTimeout(blurTimeoutRef.current);
            blurTimeoutRef.current = null;
          }
          setIsTableFocused(true);
        } else {
          // Fallback: Add to end (backward compatibility)
          const newItem: FormItem = {
            tempId: `temp-${Date.now()}`,
            catalogItemId: result.data.id,
            itemName: result.data.name,
            description: result.data.description,
            quantity: 1,
            unit: result.data.unit,
            unitPrice: result.data.currentPrice || 0,
            totalPrice: result.data.currentPrice || 0
          };
          
          setItems([...items, newItem]);
        }
        
        // Réinitialiser le formulaire
        setNewProductName('');
        setNewProductUnit('unité');
        setNewProductPrice('');
        setNewProductDescription('');
        setShowCreateProductModal(false);
        setCreatingProductForRowIndex(null);
        setSearchQuery('');
        
        toast.success('Produit créé et ajouté au panier');
        console.log('✅ [Product Creation] Product created and added:', result.data.name);
      } else {
        toast.error(result.error || 'Erreur lors de la création du produit');
      }
    } catch (error: any) {
      console.error('Erreur création produit:', error);
      toast.error(error.message || 'Erreur lors de la création du produit');
    } finally {
      setCreatingProduct(false);
    }
  };

  // Handler création projet
  const handleCreateProject = async () => {
    // Validation
    if (!newProjectName.trim()) {
      toast.error('Le nom du projet est requis');
      return;
    }

    if (!activeCompany?.id) {
      toast.error('Compagnie non sélectionnée');
      return;
    }

    try {
      setCreatingProject(true);

      // Obtenir l'ID de l'utilisateur actuel
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        toast.error('Utilisateur non authentifié');
        return;
      }

      // Insérer le projet dans la base de données
      const { data, error } = await supabase
        .from('poc_projects')
        .insert({
          name: newProjectName.trim(),
          location: newProjectLocation.trim() || null,
          company_id: activeCompany.id,
          created_by: user.id,
          status: 'active'
        } as any)
        .select()
        .single();

      if (error) {
        console.error('Error creating project:', error);
        toast.error(error.message || 'Erreur lors de la création du projet');
        return;
      }

      if (data) {
        // 1. Rafraîchir la liste des projets (ajouter le nouveau projet)
        const updatedSites = [...constructionSites, data].sort((a, b) => 
          a.name.localeCompare(b.name)
        );
        setConstructionSites(updatedSites);

        // 2. Sélectionner automatiquement le nouveau projet
        setSelectedProjectForCascade(data);
        setSelectedConstructionSite(data.id);

        // 3. Progresser automatiquement vers l'étape orgunit
        setCascadeStep('orgunit');

        // 4. Réinitialiser le champ de recherche
        setProjectSearchTerm('');

        // 5. Fermer le modal
        setIsCreateProjectModalOpen(false);

        // Réinitialiser le formulaire
        setNewProjectName('');
        setNewProjectLocation('');

        toast.success('Projet créé avec succès');
        console.log('✅ [Project Creation] Project created:', data.name);
      }
    } catch (error: any) {
      console.error('Erreur création projet:', error);
      toast.error(error.message || 'Erreur lors de la création du projet');
    } finally {
      setCreatingProject(false);
    }
  };

  // Handler création unité organisationnelle
  const handleCreateOrgUnit = async () => {
    // Debug logging
    console.log('🔍 [DEBUG] handleCreateOrgUnit called');
    console.log('🔍 [DEBUG] selectedProjectForCascade:', selectedProjectForCascade);
    console.log('🔍 [DEBUG] isCreateOrgUnitModalOpen:', isCreateOrgUnitModalOpen);
    
    // Validation: Vérifier que le projet est sélectionné AVANT toute autre validation
    if (!selectedProjectForCascade) {
      console.error('❌ [DEBUG] Validation failed: selectedProjectForCascade is null');
      toast.error('Veuillez d\'abord sélectionner un projet');
      return;
    }

    // Validation: Nom requis
    if (!newOrgUnitName.trim()) {
      toast.error('Le nom de l\'unité organisationnelle est requis');
      return;
    }

    // Validation: Compagnie requise
    if (!activeCompany?.id) {
      toast.error('Compagnie non sélectionnée');
      return;
    }

    try {
      setCreatingOrgUnit(true);

      // Obtenir l'ID de l'utilisateur actuel
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        toast.error('Utilisateur non authentifié');
        return;
      }

      // Insérer l'unité organisationnelle dans la base de données
      const { data, error } = await supabase
        .from('poc_org_units')
        .insert({
          name: newOrgUnitName.trim(),
          company_id: activeCompany.id,
          created_by: user.id,
          parent_id: null,
          type: 'department',
          code: null,
          description: null
        } as any)
        .select()
        .single();

      if (error) {
        console.error('Error creating org unit:', error);
        toast.error(error.message || 'Erreur lors de la création de l\'unité organisationnelle');
        return;
      }

      if (data) {
        // 1. Rafraîchir la liste des unités organisationnelles (ajouter la nouvelle unité)
        const newOrgUnit = {
          id: data.id,
          name: data.name,
          code: data.code || undefined,
          type: data.type as 'department' | 'team',
          companyId: data.company_id,
          parentId: data.parent_id || undefined,
          description: data.description || undefined,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at)
        };
        const updatedOrgUnits = [...orgUnits, newOrgUnit].sort((a, b) => 
          a.name.localeCompare(b.name)
        );
        setOrgUnits(updatedOrgUnits);

        // 2. Sélectionner automatiquement la nouvelle unité
        setOrgUnitId(newOrgUnit.id);
        setSelectedOrgUnit(newOrgUnit);

        // 3. Fermer le cascade (étape finale complétée)
        setCascadeStep('complete');
        setIsDestinationDropdownOpen(false);

        // 4. Réinitialiser le champ de recherche
        setOrgUnitSearchTerm('');

        // 5. Fermer le modal
        setIsCreateOrgUnitModalOpen(false);

        // Réinitialiser le formulaire
        setNewOrgUnitName('');

        // Effacer les erreurs de validation
        setErrors({ ...errors, orgUnitId: '' });

        toast.success('Unité organisationnelle créée avec succès');
        console.log('✅ [Org Unit Creation] Org unit created:', newOrgUnit.name);
      }
    } catch (error: any) {
      console.error('Erreur création unité organisationnelle:', error);
      toast.error(error.message || 'Erreur lors de la création de l\'unité organisationnelle');
    } finally {
      setCreatingOrgUnit(false);
    }
  };

  // Ajouter un item manuel
  // Setup sensors for drag and drop (desktop and mobile support)
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10, // 10px movement required before drag starts
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250, // 250ms press before drag starts (prevents accidental drags)
      tolerance: 5, // 5px movement tolerance during delay
    },
  });

  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });

  const sensors = useSensors(mouseSensor, touchSensor, keyboardSensor);

  // Handler for drag end event
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        // Ensure all items have tempId for stable identification
        const itemsWithIds = items.map((item, idx) => ({
          ...item,
          tempId: item.tempId || `item-${idx}-${Date.now()}`
        }));

        const oldIndex = itemsWithIds.findIndex((item) => item.tempId === active.id);
        const newIndex = itemsWithIds.findIndex((item) => item.tempId === over.id);

        if (oldIndex === -1 || newIndex === -1) {
          console.warn('⚠️ [Drag Drop] Could not find item indices', { activeId: active.id, overId: over.id });
          return items;
        }

        const reorderedItems = arrayMove(itemsWithIds, oldIndex, newIndex);
        
        console.log('🔄 Items reordered:', {
          from: oldIndex,
          to: newIndex,
          itemMoved: itemsWithIds[oldIndex]?.itemName || 'Unknown',
        });

        return reorderedItems;
      });
    }
  };

  // Mettre à jour un item
  const handleUpdateItem = (index: number, field: keyof FormItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    
    // Recalculer totalPrice si quantity ou unitPrice change
    if (field === 'quantity' || field === 'unitPrice') {
      updated[index].totalPrice = updated[index].quantity * updated[index].unitPrice;
    }
    
    setItems(updated);
  };

  // Supprimer un item
  const handleRemoveItem = (index: number) => {
    // Don't allow removing the last row if it's the only empty row
    if (items.length === 1) {
      const item = items[0];
      const isEmptyRow = item.quantity === 1 && !item.unit && !item.itemName;
      if (isEmptyRow) {
        return; // Cannot delete the last empty row
      }
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Find first empty row index (empty = no itemName, regardless of unit)
  const getFirstEmptyRowIndex = () => {
    return items.findIndex(item => 
      !item.itemName || item.itemName.trim() === ''
    );
  };

  // Remove all empty rows except the first one
  // Empty = no itemName (regardless of unit)
  // Filled = has itemName (regardless of unit)
  const removeAllEmptyRowsExceptFirst = () => {
    const firstEmptyIndex = items.findIndex(item => 
      !item.itemName || item.itemName.trim() === ''
    );
    
    // If no empty rows or only one, nothing to do
    if (firstEmptyIndex === -1) return;
    
    // Keep filled rows and first empty row only
    const newItems = items.filter((item, idx) => {
      // Keep filled rows (has itemName, regardless of unit)
      if (item.itemName && item.itemName.trim() !== '') return true;
      // Keep first empty row (no itemName)
      if (idx === firstEmptyIndex) return true;
      // Remove other empty rows (no itemName, below first empty)
      return false;
    });
    
    // Only update if we actually removed something
    if (newItems.length !== items.length) {
      setItems(newItems);
    }
  };

  // Valider le formulaire
  // Cascade selector handlers
  const handleProjectSelect = (project: any) => {
    setSelectedProjectForCascade(project);
    setSelectedConstructionSite(project.id); // Keep existing state
    setCascadeStep('orgunit');
    setProjectSearchTerm(''); // Reset project search
    setOrgUnitSearchTerm(''); // Reset org unit search for fresh start
    // Do NOT close dropdown, move to Step 2
  };

  const handleOrgUnitSelect = (orgUnit: any) => {
    setOrgUnitId(orgUnit.id); // Set existing state
    setCascadeStep('complete');
    setIsDestinationDropdownOpen(false); // Close dropdown
    setErrors({ ...errors, orgUnitId: '' }); // Clear error
  };

  const handleBackToProjects = () => {
    setCascadeStep('project');
    // Only reset selectedProjectForCascade if no creation modals are open
    if (!isCreateOrgUnitModalOpen && !isCreateProjectModalOpen) {
      setSelectedProjectForCascade(null);
    }
    setOrgUnitId('');
    setOrgUnitSearchTerm(''); // Reset org unit search
  };

  const handleDropdownToggle = () => {
    if (isDestinationDropdownOpen) {
      setIsDestinationDropdownOpen(false);
      // Reset cascade if not complete AND no creation modals are open
      if (cascadeStep !== 'complete' && !isCreateOrgUnitModalOpen && !isCreateProjectModalOpen) {
        setCascadeStep('project');
        setSelectedProjectForCascade(null);
        setProjectSearchTerm(''); // Reset searches
        setOrgUnitSearchTerm('');
      }
    } else {
      setIsDestinationDropdownOpen(true);
      // Reset to project step if opening fresh
      if (cascadeStep === 'complete') {
        // Keep current selection, allow changing
        if (selectedConstructionSite) {
          const currentProject = constructionSites.find(s => s.id === selectedConstructionSite);
          if (currentProject) {
            setSelectedProjectForCascade(currentProject);
            setCascadeStep('orgunit');
          } else {
            setCascadeStep('project');
            setProjectSearchTerm(''); // Reset searches
            setOrgUnitSearchTerm('');
          }
        } else {
          setCascadeStep('project');
          setProjectSearchTerm(''); // Reset searches
          setOrgUnitSearchTerm('');
        }
      } else {
        setCascadeStep('project');
        setProjectSearchTerm(''); // Reset searches
        setOrgUnitSearchTerm('');
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // PHASE 1: Validation date livraison
    if (requestedDeliveryDate && !validateDeliveryDate(requestedDeliveryDate)) {
      const minDateLabel = orderType === 'BCI' ? 'aujourd\'hui + 12h' : 'aujourd\'hui + 72h';
      newErrors.requestedDeliveryDate = `La date de livraison doit être au minimum ${minDateLabel}`;
    }
    
    // Validation conditionnelle selon le type de commande
    if (orderType === 'BCI') {
      // Pour BCI: unité organisationnelle et phase requises, fournisseur non requis
      if (!orgUnitId) {
        newErrors.orgUnitId = 'Veuillez sélectionner une unité organisationnelle';
      }
      if (!selectedPhase) {
        newErrors.phaseId = 'Veuillez sélectionner une phase';
      }
    } else if (orderType === 'BCE') {
      // Pour BCE: projet et fournisseur requis
      if (!projectId) {
        newErrors.projectId = 'Veuillez sélectionner un projet';
      }
      if (!supplierId) {
        newErrors.supplierId = 'Le fournisseur est requis';
      }
    }
    
    // Count only non-empty items (same logic as calculateTotals)
    const nonEmptyItems = items.filter(item => item.itemName && item.itemName.trim() !== '');
    if (nonEmptyItems.length === 0) {
      newErrors.items = 'Ajoutez au moins un article à la commande';
    }
    
    items.forEach((item, index) => {
      // Skip empty placeholder rows (rows with no itemName and default values)
      const isEmptyRow = !item.itemName || item.itemName.trim() === '';
      if (isEmptyRow && item.quantity === 1 && item.unitPrice === 0) {
        return; // Skip validation for this empty row
      }
      
      if (!item.itemName) {
        newErrors[`item_${index}_name`] = 'Le nom de l\'article est requis';
      }
      if (item.quantity <= 0) {
        newErrors[`item_${index}_quantity`] = 'La quantité doit être supérieure à 0';
      }
      if (item.unitPrice < 0) {
        newErrors[`item_${index}_price`] = 'Le prix unitaire doit être positif';
      }
    });
    
    if (notes.length > 500) {
      newErrors.notes = 'Les notes ne peuvent pas dépasser 500 caractères';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Annuler et retourner à la liste
  const handleCancel = () => {
    navigate('/construction/orders');
  };

  // Sauvegarder comme brouillon
  const handleSaveDraft = async () => {
    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs du formulaire');
      return;
    }
    
    try {
      setLoading(true);
      
      const orderItems = items.map(item => ({
        catalogItemId: item.catalogItemId,
        itemName: item.itemName,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice
      }));
      
      // Préparer les données selon le type de commande
      const orderData: any = {
        orderType,
        items: orderItems
      };
      
      if (orderType === 'BCI') {
        orderData.orgUnitId = orgUnitId;
        orderData.phaseId = selectedPhase || undefined;
      } else if (orderType === 'BCE') {
        orderData.projectId = projectId;
        orderData.supplierCompanyId = supplierId;
      }
      
      // Note: Le service createDraft devra être mis à jour pour accepter ces nouveaux champs
      const result = await pocPurchaseOrderService.createDraft(
        orderType === 'BCE' ? projectId : undefined,
        orderItems,
        orderData
      );
      
      if (result.success) {
        toast.success('Brouillon sauvegardé avec succès');
        navigate('/construction/orders');
      } else {
        toast.error(result.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error: any) {
      console.error('Erreur sauvegarde brouillon:', error);
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  // Soumettre pour approbation
  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs du formulaire');
      return;
    }
    
    // Phase 3 Security - Vérifier si un seuil est dépassé et demander confirmation
    if (thresholdCheck?.exceeded && thresholdCheck.applicableThreshold) {
      const approvalLevelLabel = {
        chef_chantier: 'Chef de Chantier',
        direction: 'Direction',
        admin: 'Administrateur'
      };
      
      const approvalLevel = approvalLevelLabel[thresholdCheck.applicableThreshold.approvalLevel] || thresholdCheck.applicableThreshold.approvalLevel;
      const confirmMessage = `Ce bon de commande dépasse le seuil configuré (${thresholdCheck.applicableThreshold.thresholdAmount.toLocaleString('fr-FR')} MGA). Approbation ${approvalLevel} requise. Continuer ?`;
      
      if (!window.confirm(confirmMessage)) {
        return; // L'utilisateur a annulé
      }
    }
    
    try {
      setLoading(true);
      
      const orderItems = items.map(item => ({
        catalogItemId: item.catalogItemId,
        itemName: item.itemName,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice
      }));
      
      // Préparer les données selon le type de commande
      const orderData: any = {
        orderType,
        items: orderItems
      };
      
      if (orderType === 'BCI') {
        orderData.orgUnitId = orgUnitId;
        orderData.phaseId = selectedPhase || undefined;
      } else if (orderType === 'BCE') {
        orderData.projectId = projectId;
        orderData.supplierCompanyId = supplierId;
      }
      
      // Créer le brouillon
      // Note: Le service createDraft devra être mis à jour pour accepter ces nouveaux champs
      const createResult = await pocPurchaseOrderService.createDraft(
        orderType === 'BCE' ? projectId : undefined,
        orderItems,
        orderData
      );
      
      if (!createResult.success || !createResult.data) {
        toast.error(createResult.error || 'Erreur lors de la création');
        return;
      }
      
      // Transitions vers pending_site_manager
      const submitResult = await pocPurchaseOrderService.submitForApproval(createResult.data.id);
      
      if (submitResult.success) {
        toast.success('Bon de commande soumis avec succès');
        navigate('/construction/orders');
      } else {
        toast.error(submitResult.error || 'Erreur lors de la soumission');
      }
    } catch (error: any) {
      console.error('Erreur soumission:', error);
      toast.error(error.message || 'Erreur lors de la soumission');
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  // Get selected supplier name for traditional BCI header
  const selectedSupplier = suppliers.find(s => s.id === supplierId);
  const supplierName = selectedSupplier?.name || (orderType === 'BCE' ? 'Sélectionnez un fournisseur' : 'N/A');
  
  // PHASE 1: Format date pour affichage (DD/MM/YY pour Date Edition)
  const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };
  
  // PHASE 1: Format date courte (DD/MM/YY) pour Date Edition
  const formatDateShort = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };
  
  const currentDate = formatDate(new Date());
  const currentDateShort = formatDateShort(new Date());
  const displayDate = requestedDeliveryDate ? formatDate(new Date(requestedDeliveryDate)) : currentDate;

  // PHASE 1: Récupérer DESTINATION (org_unit.address pour BCI, project.address pour BCE)
  // TODO: Vérifier si poc_org_units.address existe, sinon utiliser activeCompany.address
  const getDestination = (): string => {
    if (orderType === 'BCI' && selectedOrgUnit) {
      // TODO: Vérifier si org_unit a une colonne address
      // Pour l'instant, utiliser activeCompany.address comme fallback
      return activeCompany?.address || 'Adresse non disponible';
    } else if (orderType === 'BCE' && selectedProject) {
      // TODO: Vérifier si project a une colonne address
      return selectedProject.location || activeCompany?.address || 'Adresse non disponible';
    }
    return activeCompany?.address || 'Sélectionnez une unité/projet';
  };

  // PHASE 1: Récupérer Description (project.description pour BCE, caché pour BCI)
  const getDescription = (): string => {
    if (orderType === 'BCE' && selectedProject) {
      // TODO: Vérifier si project.description existe dans la DB
      // Pour l'instant, utiliser project.name comme fallback
      return selectedProject.name || 'N/A';
    }
    return '';
  };

  // Helper to check if row is filled
  const isRowFilled = (item: FormItem) => {
    return Boolean(item.itemName || item.catalogItemId);
  };

  // Helper to check if this is the last empty row
  const isLastEmptyRow = (index: number) => {
    const hasProducts = items.some(item => item.itemName || item.catalogItemId);
    const isLast = index === items.length - 1;
    const isEmpty = !items[index].itemName && !items[index].catalogItemId;
    return hasProducts && isLast && isEmpty;
  };

  // Handle table focus - show empty row
  const handleTableFocus = () => {
    // Clear any pending blur timeout
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setIsTableFocused(true);
  };

  // Handle table blur - hide empty row after delay (only if products exist)
  const handleTableBlur = () => {
    // Delay hiding to allow focus to move between cells
    blurTimeoutRef.current = setTimeout(() => {
      setIsTableFocused(false);
    }, 200); // 200ms delay to handle focus transitions
  };

  // Update itemsRef when items change (for document click listener)
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Detect clicks inside/outside table to control empty row visibility
  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Exclude dropdown from click detection
      const clickedOnDropdown = (target as Element)?.closest('[class*="z-[9999]"]') !== null;
      if (clickedOnDropdown) {
        return; // Ignore clicks on dropdown
      }
      
      // Check if click is inside or outside table container
      const clickedInside = tableContainerRef.current?.contains(target) ?? false;
      
      if (clickedInside) {
        // Clicked inside table → show empty row (if products exist)
        setIsTableFocused(true);
        // Clear any pending blur timeout
        if (blurTimeoutRef.current) {
          clearTimeout(blurTimeoutRef.current);
          blurTimeoutRef.current = null;
        }
      } else {
        // Clicked outside table → hide empty row (if products exist)
        // But keep visible if no products (first empty row case)
        // Use itemsRef to access current value without re-running effect
        const hasProducts = itemsRef.current.some(item => item.itemName || item.catalogItemId);
        if (hasProducts) {
          setIsTableFocused(false);
        }
        // If !hasProducts, don't change isTableFocused (keep empty row visible)
      }
    };

    // Attach listener to document
    document.addEventListener('click', handleDocumentClick);
    
    // Cleanup on unmount
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []); // Empty dependency array - effect runs once, uses itemsRef for current items value

  // Cleanup blur timeout on unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-[#F5F3F0] p-4 sm:p-6 pb-4">
      <div className="max-w-7xl mx-auto">
        {/* PHASE 1: BCI-style Header conforme PDF */}
        <Card className="mb-6 border-2 rounded-lg p-1" style={{ backgroundColor: '#E8EDE7', borderColor: '#A8B8A0' }}>
          <div className="p-1">
            {/* Header section - PDF Layout: Left (DESTINATION) | Right (Date Edition/BCI N°) */}
            <div className="flex justify-between items-stretch pb-4 border-b" style={{ borderColor: '#A8B8A0' }}>
              {/* Left side */}
              <div>
                <div className="flex items-center gap-1 sm:gap-2 max-w-full sm:max-w-[75%] md:max-w-[50%] whitespace-nowrap">
                  <span className="text-[10px] sm:text-xs font-semibold text-[#6B7C5E]">DESTINATION :</span>
                  <div className="relative flex-1" ref={destinationDropdownRef}>
                    {orderType === 'BCI' ? (
                      <>
                        <button
                          type="button"
                          onClick={handleDropdownToggle}
                          className="text-xs sm:text-sm text-[#2C3E2E] cursor-pointer hover:bg-[#F0F3EF] transition-colors px-1 sm:px-2 py-0 rounded border border-[#A8B8A0] text-left max-w-full"
                          disabled={loadingConstructionSites}
                        >
                          <span className="block whitespace-nowrap overflow-hidden text-ellipsis">
                            {cascadeStep === 'complete' && selectedProjectForCascade && orgUnitId
                              ? `[${selectedProjectForCascade.name}, ${orgUnits.find(u => u.id === orgUnitId)?.name || ''}]`
                              : cascadeStep === 'orgunit' && selectedProjectForCascade
                              ? `[${selectedProjectForCascade.name}, Sélectionner Unité...]`
                              : 'Sélectionner Projet + Unité Org'}
                          </span>
                        </button>

                        {isDestinationDropdownOpen && (
                          <div className="absolute left-0 top-full mt-1 bg-white border border-[#A8B8A0] rounded shadow-lg z-50 w-[280px] max-h-[300px] overflow-y-auto overflow-x-hidden">
                            {cascadeStep === 'project' ? (
                              <>
                                <div className="w-full px-4 py-2 bg-[#6B7C5E] text-white text-xs font-semibold break-words">
                                  🏗️ SÉLECTIONNER PROJET
                                </div>
                                {/* Search Input */}
                                <div className="sticky top-0 bg-white p-2 border-b border-[#A8B8A0] z-10">
                                  <div className="flex items-center">
                                    <svg className="w-4 h-4 text-[#6B7C5E] mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                      type="text"
                                      value={projectSearchTerm}
                                      onChange={(e) => setProjectSearchTerm(e.target.value)}
                                      placeholder="Rechercher un projet..."
                                      className="flex-1 text-xs sm:text-sm focus:outline-none"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    {projectSearchTerm && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setProjectSearchTerm('');
                                        }}
                                        className="ml-2 text-[#6B7C5E] hover:text-[#4A5A3E] text-sm"
                                      >
                                        ✕
                                      </button>
                                    )}
                                    {/* Create Project Button - Only for authorized roles */}
                                    {(userRole === 'magasinier' || userRole === 'direction' || (userRole as any) === 'super_administrateur') && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setIsCreateProjectModalOpen(true);
                                        }}
                                        className="ml-2 text-[#6B7C5E] hover:text-[#4A5A3E] text-sm font-semibold"
                                        title="Créer un nouveau projet"
                                      >
                                        +
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {filteredProjects.length > 0 ? (
                                  <div className="flex flex-col">
                                    {filteredProjects.map((site) => (
                                      <button
                                        key={site.id}
                                        type="button"
                                        onClick={() => handleProjectSelect(site)}
                                        className={`block w-full text-left px-4 py-2 hover:bg-[#F0F3EF] transition-colors text-xs sm:text-sm min-h-[44px] sm:min-h-0 break-words ${
                                          selectedConstructionSite === site.id ? 'bg-[#E8EDE7] font-semibold' : ''
                                        }`}
                                      >
                                        {site.name}
                                        {site.location && <span className="text-xs text-[#6B7C5E] ml-2">({site.location})</span>}
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="px-4 py-2 text-xs sm:text-sm text-[#6B7C5E] break-words">
                                    {projectSearchTerm ? 'Aucun projet trouvé' : (loadingConstructionSites ? 'Chargement...' : 'Aucun projet disponible')}
                                  </div>
                                )}
                              </>
                            ) : cascadeStep === 'orgunit' && selectedProjectForCascade ? (
                              <>
                                <div className="w-full px-4 py-2 bg-[#6B7C5E] text-white text-xs font-semibold break-words">
                                  🏗️ {selectedProjectForCascade.name}
                                </div>
                                <div className="w-full text-left px-4 py-2 bg-gray-100 text-gray-700 text-xs hover:bg-gray-200 cursor-pointer break-words" onClick={handleBackToProjects}>
                                  ← Retour aux projets
                                </div>
                                <div className="w-full px-4 py-2 bg-[#6B7C5E] text-white text-xs font-semibold break-words">
                                  👷 SÉLECTIONNER UNITÉ ORG
                                </div>
                                {/* Search Input */}
                                <div className="sticky top-0 bg-white p-2 border-b border-[#A8B8A0] z-10">
                                  <div className="flex items-center">
                                    <svg className="w-4 h-4 text-[#6B7C5E] mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                      type="text"
                                      value={orgUnitSearchTerm}
                                      onChange={(e) => setOrgUnitSearchTerm(e.target.value)}
                                      placeholder="Rechercher une unité..."
                                      className="flex-1 text-xs sm:text-sm focus:outline-none"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    {orgUnitSearchTerm && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOrgUnitSearchTerm('');
                                        }}
                                        className="ml-2 text-[#6B7C5E] hover:text-[#4A5A3E] text-sm"
                                      >
                                        ✕
                                      </button>
                                    )}
                                    {/* Create Org Unit Button - Only for authorized roles and when project is selected */}
                                    {selectedProjectForCascade && (userRole === 'magasinier' || userRole === 'direction' || (userRole as any) === 'super_administrateur') && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setIsCreateOrgUnitModalOpen(true);
                                        }}
                                        className="ml-2 text-[#6B7C5E] hover:text-[#4A5A3E] text-sm font-semibold"
                                        title="Créer une nouvelle unité organisationnelle"
                                      >
                                        +
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {filteredOrgUnits.length > 0 ? (
                                  <div className="flex flex-col">
                                    {filteredOrgUnits.map((unit) => (
                                      <button
                                        key={unit.id}
                                        type="button"
                                        onClick={() => handleOrgUnitSelect(unit)}
                                        className={`block w-full text-left px-4 py-2 hover:bg-[#F0F3EF] transition-colors text-xs sm:text-sm min-h-[44px] sm:min-h-0 break-words ${
                                          orgUnitId === unit.id ? 'bg-[#E8EDE7] font-semibold' : ''
                                        }`}
                                      >
                                        {unit.name}
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="px-4 py-2 text-xs sm:text-sm text-[#6B7C5E] break-words">
                                    {orgUnitSearchTerm ? 'Aucune unité trouvée' : 'Aucune unité organisationnelle disponible pour ce projet'}
                                  </div>
                                )}
                              </>
                            ) : null}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsDestinationDropdownOpen(!isDestinationDropdownOpen)}
                          className="text-xs sm:text-sm text-[#2C3E2E] cursor-pointer hover:bg-[#F0F3EF] transition-colors px-1 sm:px-2 py-0 rounded border border-[#A8B8A0] text-left max-w-full"
                          disabled={loadingConstructionSites}
                        >
                          <span className="block whitespace-nowrap overflow-hidden text-ellipsis">
                            {selectedConstructionSite
                              ? constructionSites.find(s => s.id === selectedConstructionSite)?.name || 'Chantier'
                              : 'Chantier'}
                          </span>
                        </button>

                        {isDestinationDropdownOpen && (
                          <div className="absolute left-0 top-full mt-1 bg-white border border-[#A8B8A0] rounded shadow-lg z-50 w-[280px] max-h-[300px] overflow-y-auto overflow-x-hidden">
                            {constructionSites.length > 0 ? (
                              constructionSites.map((site) => (
                                <button
                                  key={site.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedConstructionSite(site.id);
                                    setIsDestinationDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-4 py-2 hover:bg-[#F0F3EF] transition-colors text-xs sm:text-sm min-h-[44px] sm:min-h-0 break-words ${
                                    selectedConstructionSite === site.id ? 'bg-[#E8EDE7] font-semibold' : ''
                                  }`}
                                >
                                  {site.name}
                                  {site.location && <span className="text-xs text-[#6B7C5E] ml-2">({site.location})</span>}
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-2 text-xs sm:text-sm text-[#6B7C5E] break-words">
                                {loadingConstructionSites ? 'Chargement...' : 'Aucun chantier disponible'}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {orderType === 'BCI' && (
                  <div className="flex items-center gap-1 sm:gap-2 max-w-full sm:max-w-[75%] md:max-w-[50%] mt-0.5 whitespace-nowrap">
                    <span className="text-[10px] sm:text-xs font-semibold text-[#6B7C5E]">PHASE :</span>
                    <div className="relative flex-1" ref={phaseDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsPhaseDropdownOpen(!isPhaseDropdownOpen)}
                        className="text-xs sm:text-sm text-[#2C3E2E] cursor-pointer hover:bg-[#F0F3EF] transition-colors px-1 sm:px-2 py-0 rounded border border-[#A8B8A0] text-left max-w-full bg-transparent"
                        disabled={loadingPhases}
                      >
                        <span className="block whitespace-nowrap overflow-hidden text-ellipsis">
                          {selectedPhase
                            ? phases.find(p => p.id === selectedPhase)?.name || 'Sélectionner une phase'
                            : loadingPhases
                            ? 'Chargement...'
                            : 'Sélectionner une phase'}
                        </span>
                      </button>

                      {isPhaseDropdownOpen && phases.length > 0 && (
                        <div className="absolute left-0 top-full mt-1 bg-white border border-[#A8B8A0] rounded shadow-lg z-[9999] w-64 max-w-[90vw] max-h-[300px] overflow-y-auto overflow-x-hidden">
                          {(() => {
                            // Category configuration - supports dynamic categories from database
                            const phaseCategories = {
                              MATERIEL: {
                                title: '🔧 MATÉRIEL',
                                phases: [] as typeof phases,
                                color: 'purple-600',
                                bgColor: '#faf5ff',
                                hoverColor: 'purple-100'
                              },
                              GROS_OEUVRE: {
                                title: '🏗️ GROS ŒUVRE',
                                phases: [] as typeof phases,
                                color: 'green-600',
                                bgColor: '#f0fdf4',
                                hoverColor: 'green-100'
                              },
                              SECOND_OEUVRE: {
                                title: '🔧 SECOND ŒUVRE',
                                phases: [] as typeof phases,
                                color: 'blue-600',
                                bgColor: '#eff6ff',
                                hoverColor: 'blue-100'
                              },
                              FINITIONS: {
                                title: '🎨 FINITIONS',
                                phases: [] as typeof phases,
                                color: 'yellow-600',
                                bgColor: '#fefce8',
                                hoverColor: 'yellow-100'
                              },
                              EXTERIEURS: {
                                title: '🌳 EXTÉRIEURS',
                                phases: [] as typeof phases,
                                color: 'orange-600',
                                bgColor: '#fff7ed',
                                hoverColor: 'orange-100'
                              }
                            };

                            // Filter phases by search term
                            const searchFilteredPhases = phases.filter(phase =>
                              phase.name.toLowerCase().includes(phaseSearchTerm.toLowerCase())
                            );

                            console.log('🔍 === CATEGORIZATION DEBUG START ===');
                            console.log('🔍 Total phases to categorize:', searchFilteredPhases.length);
                            console.log('🔍 All phases:', searchFilteredPhases.map(p => `"${p.name}" (category: ${p.category || 'N/A'})`));

                            // Group filtered phases by category using database category field
                            searchFilteredPhases.forEach(phase => {
                              const category = phase.category as keyof typeof phaseCategories;
                              
                              if (category && phaseCategories[category]) {
                                phaseCategories[category].phases.push(phase);
                                console.log(`   ✅ ${category}: "${phase.name}"`);
                              } else {
                                console.warn(`   ⚠️ Unknown category "${category}" for phase "${phase.name}"`);
                              }
                            });

                            console.log('\n📊 === CATEGORIZATION RESULTS ===');
                            Object.entries(phaseCategories).forEach(([key, categoryData]) => {
                              console.log(`${key}: ${categoryData.phases.length} phases -`, categoryData.phases.map(p => p.name));
                            });
                            console.log('🔍 === CATEGORIZATION DEBUG END ===\n');

                            return (
                              <>
                                {/* Search Input */}
                                <div className="sticky top-0 bg-white p-2 border-b border-[#A8B8A0] z-10">
                                  <input
                                    type="text"
                                    placeholder="Rechercher une phase..."
                                    value={phaseSearchTerm}
                                    onChange={(e) => setPhaseSearchTerm(e.target.value)}
                                    className="w-full px-3 py-2 border border-[#A8B8A0] rounded text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#6B7C5E]"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>

                                {/* Dynamic category rendering - supports any number of categories including MATERIEL */}
                                {Object.entries(phaseCategories).map(([categoryKey, categoryData]) => {
                                  if (categoryData.phases.length === 0) return null;
                                  
                                  // Map color names to actual Tailwind classes
                                  const headerColorMap: Record<string, string> = {
                                    'purple-600': 'bg-purple-600',
                                    'green-600': 'bg-green-600',
                                    'blue-600': 'bg-blue-600',
                                    'yellow-600': 'bg-yellow-600',
                                    'orange-600': 'bg-orange-600'
                                  };
                                  
                                  const hoverColorMap: Record<string, string> = {
                                    'purple-100': 'hover:bg-purple-100',
                                    'green-100': 'hover:bg-green-100',
                                    'blue-100': 'hover:bg-blue-100',
                                    'yellow-100': 'hover:bg-yellow-100',
                                    'orange-100': 'hover:bg-orange-100'
                                  };
                                  
                                  return (
                                    <React.Fragment key={categoryKey}>
                                      {/* Category Header */}
                                      <div className={`px-4 py-2 ${headerColorMap[categoryData.color] || 'bg-gray-600'} text-white text-xs font-semibold`}>
                                        {categoryData.title}
                                      </div>
                                      {/* Phase Items */}
                                      <div className="flex flex-col">
                                        {categoryData.phases.map((phase) => {
                                          console.log(`🎨 Rendering phase ${phase.name} in ${categoryKey}`);
                                          return (
                                            <button
                                              key={phase.id}
                                              type="button"
                                              onClick={() => {
                                                setSelectedPhase(phase.id);
                                                setIsPhaseDropdownOpen(false);
                                                setPhaseSearchTerm('');
                                                setErrors({ ...errors, phaseId: '' });
                                              }}
                                              style={{ backgroundColor: categoryData.bgColor }}
                                              className={`block w-full text-left px-4 py-2 ${hoverColorMap[categoryData.hoverColor] || 'hover:bg-gray-100'} transition-colors text-xs sm:text-sm break-words ${
                                                selectedPhase === phase.id ? 'font-semibold ring-2 ring-inset ring-[#6B7C5E]' : ''
                                              }`}
                                            >
                                              {phase.name}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </React.Fragment>
                                  );
                                })}

                                {/* Empty State */}
                                {searchFilteredPhases.length === 0 && phases.length > 0 && !loadingPhases && (
                                  <div className="px-4 py-2 text-xs sm:text-sm text-[#6B7C5E]">
                                    Aucune phase trouvée
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                      {isPhaseDropdownOpen && phases.length === 0 && !loadingPhases && (
                        <div className="absolute left-0 top-full mt-1 bg-white border border-[#A8B8A0] rounded shadow-lg z-[9999] w-64 max-w-[90vw] px-4 py-2 text-xs sm:text-sm text-[#6B7C5E]">
                          Aucune phase disponible
                        </div>
                      )}
                      {isPhaseDropdownOpen && loadingPhases && (
                        <div className="absolute left-0 top-full mt-1 bg-white border border-[#A8B8A0] rounded shadow-lg z-[9999] w-64 max-w-[90vw] px-4 py-2 text-xs sm:text-sm text-[#6B7C5E]">
                          Chargement...
                        </div>
                      )}
                      {errors.phaseId && (
                        <p className="absolute left-0 top-full mt-1 text-xs sm:text-sm text-red-600 whitespace-nowrap">
                          {errors.phaseId}
                  </p>
                )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Right side */}
              <div className="text-right flex flex-col justify-end items-end">
                <p className="text-xs sm:text-sm mb-1">
                  <span className="font-semibold">Date Edition :</span> {currentDateShort}
                </p>
                <p className="text-xl md:text-2xl font-bold whitespace-nowrap leading-tight overflow-hidden text-ellipsis ml-2 sm:ml-4">
                  <span className="font-bold">{orderType === 'BCI' ? 'BCI' : 'BCE'} _ N°</span> {orderNumber || 'NOUVEAU'}
                </p>
              </div>
            </div>

            {/* Section Articles - Moved inside blue header card */}
            <div className="pt-4 border-t" style={{ borderColor: '#A8B8A0' }}>
              {/* BCI/BCE Dropdown Button - original style, new location */}
              <div className="text-center py-4 relative mb-4" ref={headerDropdownRef}>
                <button
                  type="button"
                  className="w-full cursor-pointer hover:bg-[#F0F3EF] transition-colors rounded-lg p-2"
                  onClick={() => setIsHeaderDropdownOpen(!isHeaderDropdownOpen)}
                >
                  <h2 className="text-2xl font-bold text-[#2C3E2E] whitespace-nowrap">
                    {orderType === 'BCI' ? (
                      <>
                        <span>Bon de Commande Interne </span>
                        <span className="text-purple-600">(BCI)</span>
                      </>
                    ) : (
                      <>
                        <span>Bon de Commande Externe </span>
                        <span className="text-purple-600">(BCE)</span>
                      </>
                    )}
                  </h2>
                  <div className="flex items-center justify-center gap-1 text-xs text-[#6B7C5E] mt-2">
                    {orderType === 'BCI' ? (
                      <>
                        <Warehouse className="w-3 h-3" />
                        <span>Commande interne pour utilisation du stock existant</span>
                      </>
                    ) : (
                      <>
                        <Truck className="w-3 h-3" />
                        <span>Commande externe auprès d'un fournisseur</span>
                      </>
                    )}
                  </div>
                  {orderType === 'BCE' && getDescription() && (
                    <p className="text-sm text-[#6B7C5E] mt-2">{getDescription()}</p>
                  )}
                </button>

                {/* Dropdown menu - original style */}
                {isHeaderDropdownOpen && (
                  <div className="absolute left-1/2 transform -translate-x-1/2 top-full mt-2 bg-white border border-[#A8B8A0] rounded-lg shadow-lg z-50 min-w-[400px]">
                    <button
                      type="button"
                      onClick={() => {
                        const newOrderType = 'BCI';
                        setOrderType(newOrderType);
                        // Réinitialiser les champs selon le type
                        setProjectId('');
                        setSupplierId('');
                        setErrors({ ...errors, projectId: '', supplierId: '' });
                        setIsHeaderDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-[#F0F3EF] transition-colors"
                    >
                      Commande Interne (BCI) - Stock interne
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (userRole !== 'magasinier') {
                          const newOrderType = 'BCE';
                          setOrderType(newOrderType);
                          // Réinitialiser les champs selon le type
                          setOrgUnitId('');
                          setErrors({ ...errors, orgUnitId: '' });
                          setIsHeaderDropdownOpen(false);
                        }
                      }}
                      disabled={userRole === 'magasinier'}
                      className={`w-full text-left px-4 py-2 transition-colors border-t border-[#A8B8A0] ${
                        userRole === 'magasinier'
                          ? 'opacity-50 cursor-not-allowed bg-[#F0F3EF]'
                          : 'hover:bg-[#F0F3EF]'
                      }`}
                      title={userRole === 'magasinier' ? 'Les magasiniers ne peuvent créer que des BCI' : ''}
                    >
                      Commande Externe (BCE) - Fournisseur
                    </button>
                </div>
                )}
              </div>
              {errors.items && (
                <Alert type="error" className="mb-4">{errors.items}</Alert>
              )}

              {/* PDF Layout: Simple 3-column table with drag and drop */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <div 
                  ref={tableContainerRef}
                  className={showDropdown ? 'overflow-visible' : 'overflow-x-auto'}
                  onFocus={handleTableFocus}
                  onBlur={handleTableBlur}
                >
                  <table 
                    className="w-full border-separate mb-4"
                    style={{ borderSpacing: '0' }}
                  >
                    <thead>
                      <tr className="bg-[#F0F3EF]">
                        {/* Drag handle column header - hidden for cleaner look */}
                        <th className="bg-[#E8EDE7] p-0 w-6 sm:w-8">
                          <span className="sr-only">Drag handle</span>
                        </th>
                        <th className="border border-[#A8B8A0] p-2 text-center font-semibold w-16 sm:w-20 md:w-24">Qté</th>
                        <th className="border border-[#A8B8A0] p-2 text-center font-semibold w-16 sm:w-20 md:w-24">UNITE</th>
                        <th className="border border-[#A8B8A0] p-2 text-center font-semibold min-w-32 sm:min-w-48 md:min-w-0">DESIGNATION</th>
                        <th className="bg-[#E8EDE7] p-0 w-4 sm:w-5 md:w-6"></th>
                      </tr>
                    </thead>
                    <SortableContext
                      items={items.map((item, index) => item.tempId || `item-${index}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      <tbody>
                      {items.map((item, index) => {
                        const itemId = item.tempId || `item-${index}`;
                        
                        // Determine row type
                        const isFilled = isRowFilled(item);
                        const isLast = isLastEmptyRow(index);
                        
                        // Visibility logic for last empty row
                        if (isLast && !isTableFocused) {
                          return null; // Hide last empty row when not focused
                        }
                        
                        return (
                          <SortableRow key={itemId} id={itemId} index={index} showDragHandle={isFilled}>
                        <td className="p-0" style={index === 0 ? { paddingTop: '4px' } : {}}>
                        <input
                          type="number"
                            min="0"
                            className={`w-full px-2 py-1 border rounded focus:ring-2 focus:ring-purple-500 ${
                            errors[`item_${index}_quantity`] ? 'border-red-500' : 'border-[#A8B8A0]'
                          }`}
                          value={item.quantity}
                          onChange={(e) => {
                            const qty = parseFloat(e.target.value) || 0;
                            handleUpdateItem(index, 'quantity', qty);
                            setErrors({ ...errors, [`item_${index}_quantity`]: '' });
                          }}
                        />
                        {errors[`item_${index}_quantity`] && (
                          <p className="mt-1 text-xs text-red-600">{errors[`item_${index}_quantity`]}</p>
                        )}
                        </td>
                        <td className="p-0" style={index === 0 ? { paddingTop: '4px' } : {}}>
                        <input
                          type="text"
                            className={`w-full px-2 py-1 border rounded focus:ring-2 focus:ring-purple-500 ${
                              item.catalogItemId 
                                ? 'border-green-500 text-green-600 bg-green-50' 
                                : 'border-[#A8B8A0]'
                            }`}
                          value={item.unit}
                          onChange={(e) => handleUpdateItem(index, 'unit', e.target.value)}
                            placeholder="unité"
                          />
                        </td>
                        <td className="p-0 relative" style={index === 0 ? { paddingTop: '4px' } : {}}>
                          {/* Check if this is the FIRST empty row */}
                          {(!item.itemName || item.itemName.trim() === '') && index === getFirstEmptyRowIndex() ? (
                            // FIRST EMPTY ROW: Show search field
                            <div ref={searchInputRef} className="relative">
                        <input
                                type="text"
                                className={`w-full px-2 py-1 border rounded focus:ring-2 focus:ring-purple-500 text-sm ${
                                  errors[`item_${index}_name`] ? 'border-red-500' : 'border-[#A8B8A0]'
                                }`}
                                placeholder="Rechercher un produit... (tapez au moins 2 caractères)"
                                value={searchQuery}
                          onChange={(e) => {
                                  handleSearchChange(e.target.value);
                                  setShowDropdown(true);
                                }}
                                onFocus={() => {
                                  // Remove all empty rows except first
                                  removeAllEmptyRowsExceptFirst();
                                  if (searchResults.length > 0) {
                                    setShowDropdown(true);
                                  }
                                }}
                              />
                              {searchingProducts && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                                </div>
                              )}

                              {/* Search dropdown */}
                              {showDropdown && searchResults.length > 0 && (
                                <div className="absolute z-[9999] mt-1 w-full bg-white border border-[#A8B8A0] rounded-lg shadow-xl max-h-60 overflow-auto left-0">
                                  {searchResults.map((product) => {
                                    const canViewPrice = canViewBCIPrices(userRole);
                                    return (
                                      <div
                                        key={product.id}
                                        onClick={(e) => {
                                          // FIX: Stop event propagation to prevent document click listener from firing
                                          e.stopPropagation();
                                          
                                          // Fill current row with selected product
                                          const newItems = [...items];
                                          newItems[index] = {
                                            ...newItems[index],
                                            catalogItemId: product.id,
                                            itemName: product.name,
                                            description: product.description,
                                            unit: product.unit || 'unité',
                                            unitPrice: product.currentPrice || 0,
                                            totalPrice: (product.currentPrice || 0) * newItems[index].quantity
                                          };
                                          
                                          // Auto-create new empty row
                                          const newEmptyItem: FormItem = {
                                            tempId: `temp-${Date.now()}-${Math.random()}`,
                                            itemName: '',
                                            quantity: 1,
                                            unit: '',
                                            unitPrice: 0,
                                            totalPrice: 0,
                                            description: '',
                                            catalogItemId: undefined
                                          };
                                          
                                          setItems([...newItems, newEmptyItem]);
                                          setSearchQuery('');
                                          setSearchResults([]);
                                          setShowDropdown(false);
                                          
                                          // FIX 1: Clear any pending blur timeout to prevent it from overwriting isTableFocused
                                          if (blurTimeoutRef.current) {
                                            clearTimeout(blurTimeoutRef.current);
                                            blurTimeoutRef.current = null;
                                          }
                                          
                                          // FIX 2: Ensure table stays focused after selection so empty row remains visible
                                          setIsTableFocused(true);
                                        }}
                                        className="p-3 hover:bg-[#F0F3EF] cursor-pointer border-b border-[#E8EDE7] last:border-b-0 transition-colors"
                                      >
                                        <div className="flex justify-between items-start">
                                          <div className="flex-1">
                                            <div className="font-semibold text-[#2C3E2E]">{product.name}</div>
                                            {product.description && (
                                              <div className="text-sm text-[#6B7C5E] mt-1 line-clamp-1">
                                                {product.description}
                      </div>
                                            )}
                                            <div className="text-sm text-[#6B7C5E] mt-1">
                                              {product.unit}
                                              {canViewPrice && (
                                                <span className="ml-2 font-medium text-purple-600">
                                                  • {product.currentPrice.toLocaleString('fr-FR')} MGA
                                                </span>
                                              )}
                                              {!canViewPrice && (
                                                <span className="ml-2 text-[#6B7C5E] italic">
                                                  • Prix masqué
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <div className="ml-2">
                                            <Plus className="w-5 h-5 text-purple-600" />
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  
                                  {/* Separator */}
                                  <div className="border-t border-[#A8B8A0] my-1"></div>
                                  
                                  {/* New Product button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (searchQuery.trim()) {
                                        setNewProductName(searchQuery.trim());
                                      }
                                      setCreatingProductForRowIndex(index);
                                      setShowCreateProductModal(true);
                                      setShowDropdown(false);
                                    }}
                                    className="w-full flex items-center gap-2 px-4 py-3 text-purple-600 hover:bg-purple-50 transition-colors text-sm font-medium"
                                  >
                                    <Plus className="w-4 h-4" />
                                    Nouveau produit
                                  </button>
                      </div>
                              )}

                              {/* No Results Message */}
                              {showDropdown && !searchingProducts && searchQuery.length >= 2 && searchResults.length === 0 && (
                                <div className="absolute z-[9999] mt-1 w-full bg-white border border-[#A8B8A0] rounded-lg shadow-xl max-h-60 overflow-auto left-0">
                                  <div className="px-4 py-3 text-sm text-[#6B7C5E] text-center">
                                    Aucun produit trouvé
                    </div>
                                  
                                  {/* Separator */}
                                  <div className="border-t border-[#A8B8A0] my-1"></div>
                                  
                                  {/* New Product button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (searchQuery.trim()) {
                                        setNewProductName(searchQuery.trim());
                                      }
                                      setCreatingProductForRowIndex(index);
                                      setShowCreateProductModal(true);
                                      setShowDropdown(false);
                                    }}
                                    className="w-full flex items-center gap-2 px-4 py-3 text-purple-600 hover:bg-purple-50 transition-colors text-sm font-medium"
                                  >
                                    <Plus className="w-4 h-4" />
                                    Nouveau produit
                                  </button>
                    </div>
                              )}
                  </div>
                          ) : (
                            // FILLED ROW: Show simple input
                            <>
                              <input
                                type="text"
                                className={`w-full px-2 py-1 border rounded focus:ring-2 focus:ring-purple-500 ${
                                  errors[`item_${index}_name`] 
                                    ? 'border-red-500' 
                                    : item.catalogItemId 
                                      ? 'border-green-500 text-green-600 bg-green-50' 
                                      : 'border-[#A8B8A0]'
                                }`}
                                value={item.itemName}
                                onChange={(e) => {
                                  handleUpdateItem(index, 'itemName', e.target.value);
                                  setErrors({ ...errors, [`item_${index}_name`]: '' });
                                }}
                                onBlur={() => {
                                  // Check if itemName was cleared
                                  if (!item.itemName || item.itemName.trim() === '') {
                                    // Remove all empty rows except first
                                    removeAllEmptyRowsExceptFirst();
                                  }
                                  
                                  // Check if current row is fully filled
                                  const isRowComplete = 
                                    item.quantity > 0 && 
                                    item.unit && 
                                    item.unit.trim() !== '' &&
                                    item.itemName && 
                                    item.itemName.trim() !== '';
                                  
                                  // Check if this is the last row
                                  const isLastRow = index === items.length - 1;
                                  
                                  // If complete and last row, add new empty row
                                  if (isRowComplete && isLastRow) {
                                    const newEmptyItem: FormItem = {
                                      tempId: `temp-${Date.now()}-${Math.random()}`,
                                      itemName: '',
                                      quantity: 1,
                                      unit: '',
                                      unitPrice: 0,
                                      totalPrice: 0,
                                      description: '',
                                      catalogItemId: undefined
                                    };
                                    setItems([...items, newEmptyItem]);
                                  }
                                }}
                                placeholder="Nom de l'article"
                              />
                              {errors[`item_${index}_name`] && (
                                <p className="mt-1 text-xs text-red-600">{errors[`item_${index}_name`]}</p>
                              )}
                            </>
                          )}
                        </td>
                        <td className="p-0 pr-1" style={index === 0 ? { paddingTop: '4px' } : {}}>
                          {isFilled && items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-600 hover:text-red-700 transition-colors flex items-center justify-end"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                          </SortableRow>
                        );
                      })}
                      </tbody>
                    </SortableContext>
                  </table>
                </div>
              </DndContext>

              {/* Sous-total */}
              {items.length > 0 && (
                <div className="text-right -mt-1 mb-2">
                  <div className="flex items-center justify-end gap-2 text-sm">
                    <span className="font-medium">Sous-total:</span>
                    <span className="font-semibold">
                      {totals.subtotal.toLocaleString('fr-FR')} MGA
                    </span>
                  </div>
                </div>
              )}

              {/* Note/Commentaire - moved inside blue card */}
              <div className="mt-4 pt-4 border-t" style={{ borderColor: '#A8B8A0' }}>
                  <textarea
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-sm ${
                    errors.notes ? 'border-red-500' : 'border-[#A8B8A0]'
                  }`}
                    rows={3}
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    setErrors({ ...errors, notes: '' });
                  }}
                  placeholder="Ajouter une note ou un commentaire... (max 500 caractères)"
                  maxLength={500}
                />
                <div className="mt-1 flex justify-between text-xs text-[#6B7C5E]">
                  <span>{errors.notes && <span className="text-red-600">{errors.notes}</span>}</span>
                  <span>{notes.length}/500</span>
                </div>
              </div>

              {/* Delivery date and contact name - 50/50 layout */}
              {items.length > 0 && (
                <div className="mt-4 pt-4 border-t" style={{ borderColor: '#A8B8A0' }}>
                  <div className="flex justify-between items-start gap-4">
                    {/* Left side - Delivery date */}
                    <div className="text-left flex-1">
                <div>
                        <label className="text-sm font-semibold mr-2">
                          LIVRAISON SOUHAITE :
                  </label>
                  <input
                    type="date"
                    value={requestedDeliveryDate}
                          onChange={(e) => {
                            setRequestedDeliveryDate(e.target.value);
                            setErrors({ ...errors, requestedDeliveryDate: '' });
                          }}
                          min={getMinDeliveryDate()}
                          className="border border-[#A8B8A0] rounded px-2 py-1 text-sm"
                        />
                        {errors.requestedDeliveryDate && (
                          <p className="text-red-500 text-xs mt-1">{errors.requestedDeliveryDate}</p>
                        )}
                </div>
                    </div>

                    {/* Right side - User info (centered, handwriting font, clickable dropdown) */}
                    <div className="text-center flex-1 pt-2 relative" ref={userInfoDropdownRef}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditedName(currentUser?.name || '');
                          setEditedPhone(currentUser?.phone || '');
                          setIsUserInfoDropdownOpen(true);
                        }}
                        className="cursor-pointer hover:opacity-70 transition-opacity w-full"
                      >
                        <div 
                          className="text-base font-semibold text-gray-900 italic"
                          style={{ fontFamily: 'cursive' }}
                        >
                          {currentUser?.name || 'Chargement...'}
                        </div>
                        {currentUser?.phone && (
                          <div className="text-[#6B7C5E] text-xs mt-1">
                            {currentUser.phone}
                          </div>
                        )}
                      </button>

                      {/* Dropdown pour modification */}
                      {isUserInfoDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#A8B8A0] rounded-lg shadow-lg z-50 p-4">
                          <div className="space-y-3">
                  <div>
                              <label className="text-xs font-medium text-[#2C3E2E] block mb-1">
                                Nom complet
                    </label>
                    <input
                      type="text"
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                className="w-full px-3 py-2 border border-[#A8B8A0] rounded text-sm"
                                placeholder="Nom complet"
                    />
                  </div>
                  <div>
                              <label className="text-xs font-medium text-[#2C3E2E] block mb-1">
                                Téléphone
                    </label>
                    <input
                                type="text"
                                value={editedPhone}
                                onChange={(e) => setEditedPhone(e.target.value)}
                                className="w-full px-3 py-2 border border-[#A8B8A0] rounded text-sm"
                                placeholder="Numéro de téléphone"
                    />
                  </div>
                            <div className="flex gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => setIsUserInfoDropdownOpen(false)}
                                className="px-3 py-1.5 text-sm border border-[#A8B8A0] rounded hover:bg-[#F0F3EF]"
                              >
                                Annuler
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const { data: { user } } = await supabase.auth.getUser();
                                    if (!user) return;

                                    const { error } = await supabase.auth.updateUser({
                                      data: {
                                        full_name: editedName,
                                        phone: editedPhone
                                      }
                                    });

                                    if (error) {
                                      console.error('Error updating user:', error);
                                      alert('Erreur lors de la mise à jour');
                                      return;
                                    }

                                    setCurrentUser({ name: editedName, phone: editedPhone });
                                    setIsUserInfoDropdownOpen(false);
                                  } catch (error) {
                                    console.error('Error updating user:', error);
                                    alert('Erreur lors de la mise à jour');
                                  }
                                }}
                                className="px-3 py-1.5 text-sm bg-[#8B9E8A] text-white rounded hover:bg-[#6B7C5E]"
                              >
                                Enregistrer
                              </button>
              </div>
          </div>
                </div>
                      )}
                  </div>
                    </div>
                  </div>
              )}

                </div>
              </div>
            </Card>

        {/* Phase 3 Security - Threshold Alert */}
        {showThresholdAlert && thresholdCheck?.exceeded && thresholdCheck.applicableThreshold && (
          <div className="mb-4">
            <ThresholdAlert
              threshold={{
                exceeded: thresholdCheck.exceeded,
                applicableThreshold: {
                  thresholdAmount: thresholdCheck.applicableThreshold.thresholdAmount,
                  approvalLevel: thresholdCheck.applicableThreshold.approvalLevel === 'chef_chantier' 
                    ? 'site_manager' 
                    : thresholdCheck.applicableThreshold.approvalLevel === 'direction'
                    ? 'direction'
                    : 'management',
                  severity: thresholdCheck.applicableThreshold.approvalLevel === 'admin' ? 'critical' : 'warning'
                },
                exceededBy: calculateTotals().total - thresholdCheck.applicableThreshold.thresholdAmount,
                percentage: thresholdCheck.applicableThreshold.thresholdAmount > 0
                  ? ((calculateTotals().total / thresholdCheck.applicableThreshold.thresholdAmount) * 100) - 100
                  : undefined
              }}
              purchaseOrderTotal={calculateTotals().total}
              onDismiss={() => setShowThresholdAlert(false)}
              className="mb-4"
            />
                      </div>
                    )}

        {/* Action buttons - Outside blue card, above org unit section */}
        <div className="mt-6 mb-4">
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
              className="text-sm px-4 py-2"
            >
              Annuler
            </Button>
            <Button
              variant="secondary"
              onClick={handleSaveDraft}
              disabled={loading}
              className="text-sm px-4 py-2 bg-[#F0F3EF] hover:bg-[#E8EDE7] text-[#2C3E2E]"
            >
              Sauvegarder brouillon
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={loading}
              className="text-sm px-4 py-2 bg-[#8B9E8A] hover:bg-[#6B7C5E] text-white"
            >
              {loading ? 'Envoi...' : 'Soumettre pour approbation'}
            </Button>
                  </div>
                  </div>

        {/* Single-column layout - Traditional BCI style (linear, top-to-bottom) */}
        <div className="space-y-6">
          {/* Formulaire principal - Single column flow */}
          <div className="space-y-6">
            {/* Rendu conditionnel: Projet (BCE) */}
            {orderType === 'BCE' && (
              /* Sélection Projet - BCE (code existant préservé) */
            <Card className="p-6">
                <label className="block text-sm font-medium text-[#2C3E2E] mb-2 flex items-center gap-2">
                  Projet *
                  {autoFilledFields.has('projectId') && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full" style={{ backgroundColor: 'rgba(212, 175, 55, 0.2)', color: '#D4AF37' }}>
                      <CheckCircle2 className="w-3 h-3" />
                      Auto-rempli
                    </span>
                  )}
              </label>
                <select
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${
                    errors.projectId ? 'border-red-500' : 'border-[#A8B8A0]'
                }`}
                  value={projectId}
                onChange={(e) => {
                    setProjectId(e.target.value);
                    setErrors({ ...errors, projectId: '' });
                  }}
                  disabled={loadingProjects}
                >
                  <option value="">Sélectionner un projet</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name} {project.location ? `- ${project.location}` : ''}
                    </option>
                  ))}
                </select>
                {errors.projectId && (
                  <p className="mt-1 text-sm text-red-600">{errors.projectId}</p>
                )}
            </Card>
            )}

            {/* Sélection Fournisseur - Uniquement pour BCE */}
            {orderType === 'BCE' && (
              <Card className="p-6">
                <label className="block text-sm font-medium text-[#2C3E2E] mb-2 flex items-center gap-2">
                  Fournisseur *
                  {autoFilledFields.has('supplierId') && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full" style={{ backgroundColor: 'rgba(212, 175, 55, 0.2)', color: '#D4AF37' }}>
                      <CheckCircle2 className="w-3 h-3" />
                      Auto-rempli
                    </span>
                  )}
                </label>
                <select
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${
                    errors.supplierId ? 'border-red-500' : 'border-[#A8B8A0]'
                  }`}
                  value={supplierId}
                  onChange={(e) => {
                    setSupplierId(e.target.value);
                    setErrors({ ...errors, supplierId: '' });
                  }}
                  disabled={loadingSuppliers}
                >
                  <option value="">Sélectionner un fournisseur</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name} {supplier.location ? `- ${supplier.location}` : ''}
                    </option>
                  ))}
                </select>
                {errors.supplierId && (
                  <p className="mt-1 text-sm text-red-600">{errors.supplierId}</p>
                )}
              </Card>
            )}



          </div>
        </div>

      </div>

      {/* PHASE 1: Modal création produit */}
      {showCreateProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Créer un nouveau produit</h2>
              
        <div className="space-y-4">
                {/* Nom du produit */}
                <div>
                  <label className="block text-sm font-medium text-[#2C3E2E] mb-1">
                    Nom du produit *
                  </label>
                  <Input
              type="text"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    placeholder="Ex: Ciment Test"
                    required
                  />
          </div>

                {/* Unité */}
                <div>
                  <label className="block text-sm font-medium text-[#2C3E2E] mb-1">
                    Unité *
                  </label>
                  <Input
                    type="text"
                    value={newProductUnit}
                    onChange={(e) => setNewProductUnit(e.target.value)}
                    placeholder="Ex: Sac de 50kg, Pièce, m², m³, kg, L, m, Lot..."
                    required
                    list="unit-suggestions"
                  />
                  <datalist id="unit-suggestions">
                    <option value="unité" />
                    <option value="Sac de 50kg" />
                    <option value="Pièce" />
                    <option value="m²" />
                    <option value="m³" />
                    <option value="kg" />
                    <option value="L" />
                    <option value="m" />
                    <option value="Lot" />
                  </datalist>
                  <p className="mt-1 text-xs text-gray-500">Saisissez ou choisissez une unité</p>
                </div>

                {/* Prix unitaire (optionnel) */}
                    <div>
                  <label className="block text-sm font-medium text-[#2C3E2E] mb-1">
                    Prix unitaire (optionnel)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newProductPrice}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewProductPrice(val === '' ? '' : parseFloat(val) || '');
                    }}
                    placeholder="0.00"
                  />
                  <p className="mt-1 text-xs text-gray-500">Laisser vide si non disponible</p>
                    </div>

                {/* Description (optionnelle) */}
                <div>
                  <label className="block text-sm font-medium text-[#2C3E2E] mb-1">
                    Description (optionnelle)
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-[#A8B8A0] rounded-lg focus:ring-2 focus:ring-purple-500"
                    rows={3}
                    value={newProductDescription}
                    onChange={(e) => setNewProductDescription(e.target.value)}
                    placeholder="Description du produit (max 500 caractères)"
                    maxLength={500}
                  />
                  <p className="mt-1 text-xs text-gray-500">{newProductDescription.length}/500</p>
                  </div>
                </div>

              {/* Boutons */}
              <div className="flex gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateProductModal(false);
                    setNewProductName('');
                    setNewProductUnit('unité');
                    setNewProductPrice('');
                    setNewProductDescription('');
                    setCreatingProductForRowIndex(null);
                  }}
                  className="flex-1"
                  disabled={creatingProduct}
                >
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  onClick={handleCreateProduct}
                  disabled={creatingProduct || !newProductName.trim() || !newProductUnit.trim()}
                  className="flex-1"
                >
                  {creatingProduct ? 'Création...' : 'Créer et ajouter'}
                </Button>
            </div>
        </div>
          </Card>
        </div>
      )}

      {/* Modal de création de projet */}
      {isCreateProjectModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setIsCreateProjectModalOpen(false)}>
          <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Créer un nouveau projet</h2>
              
              <div className="space-y-4">
                {/* Nom du projet */}
                <div>
                  <label className="block text-sm font-medium text-[#2C3E2E] mb-1">
                    Nom du projet *
                  </label>
                  <Input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Ex: Projet Construction Maison"
                    required
                  />
                </div>

                {/* Localisation du projet */}
                <div>
                  <label className="block text-sm font-medium text-[#2C3E2E] mb-1">
                    Localisation (optionnel)
                  </label>
                  <Input
                    type="text"
                    value={newProjectLocation}
                    onChange={(e) => setNewProjectLocation(e.target.value)}
                    placeholder="Ex: Antananarivo, Madagascar"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateProjectModalOpen(false);
                    setNewProjectName('');
                    setNewProjectLocation('');
                  }}
                  className="flex-1"
                  disabled={creatingProject}
                >
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  onClick={handleCreateProject}
                  disabled={creatingProject || !newProjectName.trim()}
                  className="flex-1"
                >
                  {creatingProject ? 'Création...' : 'Créer'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Modal de création d'unité organisationnelle */}
      {isCreateOrgUnitModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setIsCreateOrgUnitModalOpen(false)}>
          <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Créer une nouvelle unité organisationnelle</h2>
              
              <div className="space-y-4">
                {/* Nom de l'unité organisationnelle */}
                <div>
                  <label className="block text-sm font-medium text-[#2C3E2E] mb-1">
                    Nom de l'unité organisationnelle *
                  </label>
                  <Input
                    type="text"
                    value={newOrgUnitName}
                    onChange={(e) => setNewOrgUnitName(e.target.value)}
                    placeholder="Ex: Direction Générale"
                    required
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateOrgUnitModalOpen(false);
                    setNewOrgUnitName('');
                  }}
                  className="flex-1"
                  disabled={creatingOrgUnit}
                >
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  onClick={handleCreateOrgUnit}
                  disabled={creatingOrgUnit || !newOrgUnitName.trim()}
                  className="flex-1"
                >
                  {creatingOrgUnit ? 'Création...' : 'Créer'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrderForm;

// AGENT-4-FORM-COMPLETE
