/**
 * Types pour le module Construction POC - Workflow de validation des bons de commande
 * Machine à états avec 3 niveaux de validation obligatoires
 */

/**
 * Statuts possibles pour un bon de commande (16 statuts)
 */
export enum PurchaseOrderStatus {
  // Niveau 1 - Création
  DRAFT = 'draft',
  
  // Niveau 2 - Validation Chef Chantier
  PENDING_SITE_MANAGER = 'pending_site_manager',
  APPROVED_SITE_MANAGER = 'approved_site_manager',
  
  // Niveau 3 - Vérification stock (automatique)
  CHECKING_STOCK = 'checking_stock',
  FULFILLED_INTERNAL = 'fulfilled_internal',
  NEEDS_EXTERNAL_ORDER = 'needs_external_order',
  
  // Niveau 4 - Validation Direction (conditionnelle)
  PENDING_MANAGEMENT = 'pending_management',
  REJECTED_MANAGEMENT = 'rejected_management',
  APPROVED_MANAGEMENT = 'approved_management',
  
  // Niveau 5 - Validation Fournisseur
  SUBMITTED_TO_SUPPLIER = 'submitted_to_supplier',
  PENDING_SUPPLIER = 'pending_supplier',
  ACCEPTED_SUPPLIER = 'accepted_supplier',
  REJECTED_SUPPLIER = 'rejected_supplier',
  
  // États finaux
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  
  // État d'annulation
  CANCELLED = 'cancelled'
}

/**
 * Actions possibles dans le workflow
 */
export enum WorkflowAction {
  SUBMIT = 'submit',                           // Chef Equipe → pending_site_manager
  APPROVE_SITE = 'approve_site',               // Chef Chantier → approved_site_manager
  REJECT_SITE = 'reject_site',                 // Chef Chantier → draft
  APPROVE_MGMT = 'approve_mgmt',               // Direction → approved_management
  REJECT_MGMT = 'reject_mgmt',                 // Direction → rejected_management
  ACCEPT_SUPPLIER = 'accept_supplier',         // Fournisseur → accepted_supplier
  REJECT_SUPPLIER = 'reject_supplier',         // Fournisseur → rejected_supplier
  DELIVER = 'deliver',                         // Marquer comme livré → delivered
  COMPLETE = 'complete',                       // Finaliser → completed
  CANCEL = 'cancel'                            // Annuler à n'importe quel stade
}

/**
 * Résultat de la vérification de stock
 */
export interface StockCheckResult {
  available: boolean;
  itemResults: StockItemResult[];
  totalRequested: number;
  totalAvailable: number;
  missingItems: StockItemResult[];
}

/**
 * Résultat de vérification pour un item spécifique
 */
export interface StockItemResult {
  itemId: string;
  itemName?: string;
  requested: number;
  available: number;
  sufficient: boolean;
}

/**
 * Historique des transitions de workflow
 */
export interface WorkflowHistory {
  id: string;
  purchaseOrderId: string;
  fromStatus: PurchaseOrderStatus;
  toStatus: PurchaseOrderStatus;
  changedBy: string;
  changedAt: Date;
  notes?: string;
  action: WorkflowAction;
}

/**
 * Item d'un bon de commande
 */
export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  catalogItemId?: string;      // Optionnel: référence au catalogue
  itemName: string;             // Nom de l'item
  description?: string;
  quantity: number;
  unit: string;                 // Unité (kg, m, pièce, etc.)
  unitPrice: number;
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Unité organisationnelle (département ou équipe)
 */
export interface OrgUnit {
  id: string;
  name: string;
  code?: string;
  type: 'department' | 'team';
  companyId: string;
  parentId?: string;
  description?: string;
  isActive?: boolean; // Optionnel car la colonne n'existe pas dans la base de données
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Bon de commande (interface principale)
 */
export interface PurchaseOrder {
  id: string;
  companyId: string;
  projectId?: string;           // Optionnel: requis pour BCE (commandes externes)
  orgUnitId?: string;            // Optionnel: requis pour BCI (commandes internes)
  orderType?: 'BCI' | 'BCE';    // Type de commande: BCI (interne) ou BCE (externe)
  creatorId: string;            // Chef Equipe
  siteManagerId?: string;       // Chef Chantier assigné
  supplierId?: string;          // Fournisseur assigné (requis pour BCE)
  managementId?: string;        // Direction (pour validation niveau 4)
  
  // Informations du bon de commande
  orderNumber: string;          // Numéro unique
  title: string;
  description?: string;
  status: PurchaseOrderStatus;
  
  // Dates
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
  approvedSiteManagerAt?: Date;
  approvedManagementAt?: Date;
  submittedToSupplierAt?: Date;
  acceptedSupplierAt?: Date;
  deliveredAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  
  // Raisons de rejet/annulation
  rejectionReason?: string;
  cancellationReason?: string;
  
  // Métadonnées
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  
  // Relations
  items: PurchaseOrderItem[];
}

/**
 * Type pour créer un nouveau bon de commande
 */
export type PurchaseOrderCreate = Omit<
  PurchaseOrder,
  'id' | 'createdAt' | 'updatedAt' | 'status' | 'items' | 
  'submittedAt' | 'approvedSiteManagerAt' | 'approvedManagementAt' |
  'submittedToSupplierAt' | 'acceptedSupplierAt' | 'deliveredAt' |
  'completedAt' | 'cancelledAt' | 'rejectionReason' | 'cancellationReason'
> & {
  items: Omit<PurchaseOrderItem, 'id' | 'purchaseOrderId' | 'createdAt' | 'updatedAt'>[];
};

/**
 * Type pour mettre à jour un bon de commande
 */
export type PurchaseOrderUpdate = Partial<
  Omit<PurchaseOrder, 'id' | 'createdAt' | 'companyId' | 'projectId' | 'creatorId'>
> & {
  id: string;
};

/**
 * Item d'inventaire
 */
export interface InventoryItem {
  id: string;
  companyId: string;
  itemName: string;
  description?: string;
  category?: string;
  unit: string;
  quantity: number;
  minStockLevel?: number;        // Seuil minimum d'alerte
  maxStockLevel?: number;        // Seuil maximum
  location?: string;             // Emplacement dans l'entrepôt
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mouvement de stock (entrée/sortie)
 */
export interface StockMovement {
  id: string;
  companyId: string;
  inventoryItemId: string;
  movementType: 'entry' | 'exit' | 'adjustment';
  quantity: number;
  referenceId?: string;          // ID du bon de commande ou autre référence
  referenceType?: 'purchase_order' | 'manual' | 'adjustment';
  reason?: string;
  performedBy: string;
  performedAt: Date;
  notes?: string;
}

/**
 * Rôle utilisateur pour validation
 */
export type UserRole = 
  | 'chef_equipe'      // Chef d'équipe (niveau 1)
  | 'chef_chantier'    // Chef de chantier (niveau 2)
  | 'direction'        // Direction (niveau 4)
  | 'supplier'         // Fournisseur (niveau 5)
  | 'admin'            // Administrateur
  | 'user';            // Utilisateur standard

/**
 * Résultat d'une opération de service
 */
export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string>;
}

/**
 * Options pour la transition de statut
 */
export interface TransitionOptions {
  userId: string;
  notes?: string;
  reason?: string;
  skipValidation?: boolean;      // À utiliser uniquement pour les opérations système
}

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Type de compagnie (Supplier ou Builder)
 */
export enum CompanyType {
  SUPPLIER = 'supplier',
  BUILDER = 'builder'
}

/**
 * Statut de compagnie
 */
export enum CompanyStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended'
}

/**
 * Rôles des membres de compagnie (7 rôles)
 */
export enum MemberRole {
  ADMIN = 'admin',
  DIRECTION = 'direction',
  RESP_FINANCE = 'resp_finance',
  MAGASINIER = 'magasinier',
  LOGISTIQUE = 'logistique',
  CHEF_CHANTIER = 'chef_chantier',
  CHEF_EQUIPE = 'chef_equipe'
}

/**
 * Statut des membres de compagnie
 */
export enum MemberStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending'
}

/**
 * Statut des projets
 */
export enum ProjectStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ON_HOLD = 'on_hold',
  CANCELLED = 'cancelled'
}

/**
 * Type de mouvement de stock
 */
export enum StockTransactionType {
  ENTRY = 'entry',
  EXIT = 'exit',
  ADJUSTMENT = 'adjustment'
}

/**
 * Type de référence pour les mouvements de stock
 */
export enum StockReferenceType {
  PURCHASE_ORDER = 'purchase_order',
  MANUAL_ENTRY = 'manual_entry',
  INVENTORY_ADJUSTMENT = 'inventory_adjustment',
  DELIVERY = 'delivery',
  OTHER = 'other'
}

// ============================================================================
// PRODUCT TYPES
// ============================================================================

/**
 * Catégorie de produit avec support hiérarchique
 */
export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  parentCategoryId?: string;
  iconUrl?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Produit du catalogue (créé par les suppliers)
 * Correspond exactement au schéma poc_products (17 colonnes)
 */
export interface Product {
  id: string;
  supplierId: string;                    // supplier_id (FK → poc_companies)
  categoryId?: string;                    // category_id (FK → poc_product_categories)
  name: string;                           // name
  description?: string;                   // description
  sku?: string;                           // sku
  unit: string;                           // unit (default: 'unité')
  currentPrice: number;                   // current_price (NUMERIC(15,2))
  currency: string;                       // currency (default: 'MGA')
  stockAvailable: number;                 // stock_available (INTEGER, default: 0)
  minOrderQuantity: number;               // min_order_quantity (INTEGER, default: 1)
  imagesUrls: string[];                   // images_urls (TEXT[])
  specifications: Record<string, any>;   // specifications (JSONB)
  isActive: boolean;                      // is_active (BOOLEAN, default: true)
  createdBy: string;                      // created_by (FK → auth.users)
  createdAt: Date;                        // created_at
  updatedAt: Date;                        // updated_at
}

/**
 * Type pour créer un nouveau produit
 */
export type CreateProduct = Omit<
  Product,
  'id' | 'createdAt' | 'updatedAt' | 'createdBy'
> & {
  createdBy?: string;  // Optionnel, sera rempli par le service depuis l'auth
};

/**
 * Type pour mettre à jour un produit
 */
export type UpdateProduct = Partial<
  Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'supplierId' | 'createdBy'>
> & {
  id: string;
};

/**
 * Filtres pour la recherche de produits
 */
export interface ProductFilters {
  categoryId?: string;
  supplierId?: string;
  minPrice?: number;
  maxPrice?: number;
  stockAvailable?: boolean;  // true = seulement produits en stock, false = seulement produits hors stock
  searchText?: string;       // Recherche dans name, description, sku
  isActive?: boolean;
}

/**
 * Options de pagination
 */
export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

/**
 * Résultat paginé
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// ============================================================================
// COMPANY TYPES
// ============================================================================

/**
 * Compagnie (Supplier ou Builder)
 */
export interface Company {
  id: string;
  name: string;
  type: CompanyType;
  registrationNumber?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  country: string;
  status: CompanyStatus;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  suspendedAt?: Date;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Membre d'une compagnie
 */
export interface CompanyMember {
  id: string;
  companyId: string;
  userId: string;
  role: MemberRole;
  status: MemberStatus;
  invitedBy?: string;
  invitedAt?: Date;
  joinedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// PROJECT TYPES
// ============================================================================

/**
 * Projet de construction (créé par les builders)
 */
export interface Project {
  id: string;
  companyId: string;
  name: string;
  clientName?: string;
  location?: string;
  startDate?: Date;
  estimatedEndDate?: Date;
  status: ProjectStatus;
  totalBudget?: number;
  currency: string;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// STOCK TYPES
// ============================================================================

/**
 * Item d'inventaire (stock des builders)
 * Correspond à poc_inventory_items
 */
export interface InternalStock {
  id: string;
  companyId: string;
  productId?: string;
  productName: string;
  sku?: string;
  unit: string;
  quantityAvailable: number;
  minimumQuantity: number;
  location?: string;
  notes?: string;
  lastUpdated: Date;
  updatedBy: string;
  createdAt: Date;
}

/**
 * Mouvement de stock (entrée/sortie/ajustement)
 * Correspond à poc_stock_movements
 */
export interface StockTransaction {
  id: string;
  companyId: string;
  inventoryItemId: string;
  type: StockTransactionType;
  quantity: number;
  referenceType?: StockReferenceType;
  referenceId?: string;
  notes?: string;
  createdBy: string;
  createdAt: Date;
}

// ============================================================================
// PURCHASE ORDER ITEM (extended from existing)
// ============================================================================

/**
 * Item de bon de commande (étendu avec les colonnes exactes de la DB)
 */
export interface PurchaseOrderItemExtended extends PurchaseOrderItem {
  productId?: string;           // product_id (FK → poc_products)
  itemDescription?: string;      // item_description
  itemSku?: string;             // item_sku
  itemUnit: string;             // item_unit
  notes?: string;               // notes
}

