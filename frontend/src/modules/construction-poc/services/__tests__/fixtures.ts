/**
 * Fixtures de test pour le module Construction POC
 * Données de test réutilisables pour les tests unitaires
 */

import type { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from '../../types/construction';

/**
 * Génère un ID UUID mocké
 */
function generateId(): string {
  return `mock-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
}

/**
 * Génère une date ISO
 */
function generateDate(daysOffset: number = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString();
}

/**
 * Produits mockés (5 produits)
 */
export const mockProducts = [
  {
    id: 'product-1',
    supplier_id: 'supplier-1',
    name: 'Ciment Portland',
    description: 'Ciment de qualité supérieure',
    sku: 'CEM-001',
    category: 'Matériaux de construction',
    unit: 'sac',
    price: 15000,
    image_url: null,
    available: true,
    stock_quantity: 500,
    min_order_quantity: 10,
    created_at: generateDate(-30),
    updated_at: generateDate(-1)
  },
  {
    id: 'product-2',
    supplier_id: 'supplier-1',
    name: 'Fer à béton 10mm',
    description: 'Barres d\'armature pour béton armé',
    sku: 'FER-010',
    category: 'Matériaux de construction',
    unit: 'barre',
    price: 12000,
    image_url: null,
    available: true,
    stock_quantity: 200,
    min_order_quantity: 5,
    created_at: generateDate(-25),
    updated_at: generateDate(-2)
  },
  {
    id: 'product-3',
    supplier_id: 'supplier-1',
    name: 'Gravier 5/15',
    description: 'Gravier pour béton',
    sku: 'GRA-515',
    category: 'Matériaux de construction',
    unit: 'm3',
    price: 45000,
    image_url: null,
    available: true,
    stock_quantity: 100,
    min_order_quantity: 1,
    created_at: generateDate(-20),
    updated_at: generateDate(-3)
  },
  {
    id: 'product-4',
    supplier_id: 'supplier-2',
    name: 'Tôle ondulée',
    description: 'Tôle galvanisée pour toiture',
    sku: 'TOL-001',
    category: 'Couverture',
    unit: 'feuille',
    price: 25000,
    image_url: null,
    available: true,
    stock_quantity: 150,
    min_order_quantity: 10,
    created_at: generateDate(-15),
    updated_at: generateDate(-4)
  },
  {
    id: 'product-5',
    supplier_id: 'supplier-2',
    name: 'Peinture blanche',
    description: 'Peinture acrylique blanche',
    sku: 'PEI-001',
    category: 'Finitions',
    unit: 'litre',
    price: 8000,
    image_url: null,
    available: true,
    stock_quantity: 300,
    min_order_quantity: 5,
    created_at: generateDate(-10),
    updated_at: generateDate(-5)
  }
];

/**
 * Entreprises mockées (2 entreprises)
 */
export const mockCompanies = [
  {
    id: 'company-1',
    name: 'Fournisseur ABC',
    type: 'supplier',
    status: 'approved',
    created_at: generateDate(-100),
    updated_at: generateDate(-10)
  },
  {
    id: 'company-2',
    name: 'Constructeur XYZ',
    type: 'builder',
    status: 'approved',
    created_at: generateDate(-90),
    updated_at: generateDate(-5)
  }
];

/**
 * Projets mockés (2 projets)
 */
export const mockProjects = [
  {
    id: 'project-1',
    company_id: 'company-2',
    name: 'Construction Immeuble Résidentiel',
    description: 'Immeuble de 5 étages',
    status: 'active',
    created_at: generateDate(-60),
    updated_at: generateDate(-1)
  },
  {
    id: 'project-2',
    company_id: 'company-2',
    name: 'Rénovation École Primaire',
    description: 'Rénovation complète',
    status: 'active',
    created_at: generateDate(-45),
    updated_at: generateDate(-2)
  }
];

/**
 * Bons de commande mockés (3 commandes)
 */
export const mockPurchaseOrders = [
  {
    id: 'order-1',
    buyer_company_id: 'company-2',
    project_id: 'project-1',
    created_by: 'user-123',
    site_manager_id: 'user-456',
    supplier_id: 'company-1',
    order_number: 'BC-2025-001',
    title: 'Commande Matériaux Phase 1',
    description: 'Matériaux pour fondations',
    status: 'pending_site_manager' as PurchaseOrderStatus,
    priority: 'high' as const,
    created_at: generateDate(-5),
    updated_at: generateDate(-5),
    submitted_at: generateDate(-5)
  },
  {
    id: 'order-2',
    buyer_company_id: 'company-2',
    project_id: 'project-1',
    created_by: 'user-123',
    site_manager_id: 'user-456',
    supplier_id: 'company-1',
    order_number: 'BC-2025-002',
    title: 'Commande Matériaux Phase 2',
    description: 'Matériaux pour élévation',
    status: 'approved_site_manager' as PurchaseOrderStatus,
    priority: 'medium' as const,
    created_at: generateDate(-3),
    updated_at: generateDate(-2),
    submitted_at: generateDate(-3),
    approved_site_manager_at: generateDate(-2)
  },
  {
    id: 'order-3',
    buyer_company_id: 'company-2',
    project_id: 'project-2',
    created_by: 'user-789',
    site_manager_id: 'user-456',
    supplier_id: 'company-1',
    order_number: 'BC-2025-003',
    title: 'Commande Finitions',
    description: 'Peinture et finitions',
    status: 'delivered' as PurchaseOrderStatus,
    priority: 'low' as const,
    created_at: generateDate(-10),
    updated_at: generateDate(-1),
    submitted_at: generateDate(-9),
    approved_site_manager_at: generateDate(-8),
    delivered_at: generateDate(-1)
  }
];

/**
 * Enregistrements de stock mockés (5 items)
 */
export const mockStockRecords = [
  {
    id: 'stock-1',
    company_id: 'company-2',
    product_id: 'product-1',
    item_name: 'Ciment Portland',
    quantity: 150.0,
    unit: 'sac',
    location: 'Entrepôt A - Zone 1',
    min_threshold: 50.0,
    last_count_date: generateDate(-7),
    notes: 'Stock principal',
    created_at: generateDate(-30),
    updated_at: generateDate(-1),
    created_by: 'user-123'
  },
  {
    id: 'stock-2',
    company_id: 'company-2',
    product_id: 'product-2',
    item_name: 'Fer à béton 10mm',
    quantity: 80.0,
    unit: 'barre',
    location: 'Entrepôt A - Zone 2',
    min_threshold: 30.0,
    last_count_date: generateDate(-5),
    notes: null,
    created_at: generateDate(-25),
    updated_at: generateDate(-2),
    created_by: 'user-123'
  },
  {
    id: 'stock-3',
    company_id: 'company-2',
    product_id: 'product-3',
    item_name: 'Gravier 5/15',
    quantity: 25.0,
    unit: 'm3',
    location: 'Entrepôt B - Zone 1',
    min_threshold: 20.0,
    last_count_date: generateDate(-3),
    notes: 'Stock faible',
    created_at: generateDate(-20),
    updated_at: generateDate(-3),
    created_by: 'user-123'
  },
  {
    id: 'stock-4',
    company_id: 'company-2',
    product_id: 'product-4',
    item_name: 'Tôle ondulée',
    quantity: 45.0,
    unit: 'feuille',
    location: 'Entrepôt B - Zone 2',
    min_threshold: 20.0,
    last_count_date: generateDate(-2),
    notes: null,
    created_at: generateDate(-15),
    updated_at: generateDate(-2),
    created_by: 'user-123'
  },
  {
    id: 'stock-5',
    company_id: 'company-2',
    product_id: null,
    item_name: 'Sable fin',
    quantity: 10.0,
    unit: 'm3',
    location: 'Entrepôt C - Zone 1',
    min_threshold: 15.0,
    last_count_date: generateDate(-1),
    notes: 'Stock en dessous du seuil',
    created_at: generateDate(-10),
    updated_at: generateDate(-1),
    created_by: 'user-123'
  }
];

/**
 * Transactions de stock mockées (10 transactions)
 */
export const mockStockTransactions = [
  {
    id: 'trans-1',
    company_id: 'company-2',
    internal_stock_id: 'stock-1',
    transaction_type: 'entry',
    quantity: 100.0,
    unit: 'sac',
    reference_type: 'purchase_order',
    reference_id: 'order-1',
    from_location: null,
    to_location: 'Entrepôt A - Zone 1',
    notes: 'Réception commande BC-2025-001',
    created_at: generateDate(-20),
    created_by: 'user-123'
  },
  {
    id: 'trans-2',
    company_id: 'company-2',
    internal_stock_id: 'stock-1',
    transaction_type: 'exit',
    quantity: 50.0,
    unit: 'sac',
    reference_type: 'purchase_order',
    reference_id: 'order-2',
    from_location: 'Entrepôt A - Zone 1',
    to_location: null,
    notes: 'Sortie pour commande BC-2025-002',
    created_at: generateDate(-15),
    created_by: 'user-456'
  },
  {
    id: 'trans-3',
    company_id: 'company-2',
    internal_stock_id: 'stock-2',
    transaction_type: 'entry',
    quantity: 50.0,
    unit: 'barre',
    reference_type: 'purchase_order',
    reference_id: 'order-1',
    from_location: null,
    to_location: 'Entrepôt A - Zone 2',
    notes: 'Réception commande BC-2025-001',
    created_at: generateDate(-18),
    created_by: 'user-123'
  },
  {
    id: 'trans-4',
    company_id: 'company-2',
    internal_stock_id: 'stock-2',
    transaction_type: 'exit',
    quantity: 20.0,
    unit: 'barre',
    reference_type: 'purchase_order',
    reference_id: 'order-2',
    from_location: 'Entrepôt A - Zone 2',
    to_location: null,
    notes: 'Sortie pour commande BC-2025-002',
    created_at: generateDate(-12),
    created_by: 'user-456'
  },
  {
    id: 'trans-5',
    company_id: 'company-2',
    internal_stock_id: 'stock-3',
    transaction_type: 'adjustment',
    quantity: 5.0,
    unit: 'm3',
    reference_type: 'adjustment',
    reference_id: null,
    from_location: null,
    to_location: null,
    notes: 'Ajustement inventaire - perte',
    created_at: generateDate(-10),
    created_by: 'user-123'
  },
  {
    id: 'trans-6',
    company_id: 'company-2',
    internal_stock_id: 'stock-4',
    transaction_type: 'entry',
    quantity: 30.0,
    unit: 'feuille',
    reference_type: 'purchase_order',
    reference_id: 'order-3',
    from_location: null,
    to_location: 'Entrepôt B - Zone 2',
    notes: 'Réception commande BC-2025-003',
    created_at: generateDate(-8),
    created_by: 'user-123'
  },
  {
    id: 'trans-7',
    company_id: 'company-2',
    internal_stock_id: 'stock-4',
    transaction_type: 'exit',
    quantity: 15.0,
    unit: 'feuille',
    reference_type: 'purchase_order',
    reference_id: 'order-3',
    from_location: 'Entrepôt B - Zone 2',
    to_location: null,
    notes: 'Sortie pour commande BC-2025-003',
    created_at: generateDate(-5),
    created_by: 'user-456'
  },
  {
    id: 'trans-8',
    company_id: 'company-2',
    internal_stock_id: 'stock-5',
    transaction_type: 'entry',
    quantity: 20.0,
    unit: 'm3',
    reference_type: 'manual',
    reference_id: null,
    from_location: null,
    to_location: 'Entrepôt C - Zone 1',
    notes: 'Entrée manuelle',
    created_at: generateDate(-7),
    created_by: 'user-123'
  },
  {
    id: 'trans-9',
    company_id: 'company-2',
    internal_stock_id: 'stock-5',
    transaction_type: 'exit',
    quantity: 10.0,
    unit: 'm3',
    reference_type: 'purchase_order',
    reference_id: 'order-2',
    from_location: 'Entrepôt C - Zone 1',
    to_location: null,
    notes: 'Sortie pour commande BC-2025-002',
    created_at: generateDate(-4),
    created_by: 'user-456'
  },
  {
    id: 'trans-10',
    company_id: 'company-2',
    internal_stock_id: 'stock-1',
    transaction_type: 'transfer',
    quantity: 10.0,
    unit: 'sac',
    reference_type: 'transfer',
    reference_id: 'stock-2',
    from_location: 'Entrepôt A - Zone 1',
    to_location: 'Entrepôt B - Zone 1',
    notes: 'Transfert entre entrepôts',
    created_at: generateDate(-2),
    created_by: 'user-123'
  }
];

/**
 * Générateurs de données mockées
 */
export const createMockProduct = (overrides?: Partial<typeof mockProducts[0]>) => ({
  ...mockProducts[0],
  id: generateId(),
  ...overrides
});

export const createMockCompany = (overrides?: Partial<typeof mockCompanies[0]>) => ({
  ...mockCompanies[0],
  id: generateId(),
  ...overrides
});

export const createMockProject = (overrides?: Partial<typeof mockProjects[0]>) => ({
  ...mockProjects[0],
  id: generateId(),
  ...overrides
});

export const createMockOrder = (overrides?: Partial<typeof mockPurchaseOrders[0]>) => ({
  ...mockPurchaseOrders[0],
  id: generateId(),
  order_number: `BC-2025-${Math.floor(Math.random() * 1000)}`,
  ...overrides
});

export const createMockStockRecord = (overrides?: Partial<typeof mockStockRecords[0]>) => ({
  ...mockStockRecords[0],
  id: generateId(),
  ...overrides
});

export const createMockStockTransaction = (overrides?: Partial<typeof mockStockTransactions[0]>) => ({
  ...mockStockTransactions[0],
  id: generateId(),
  ...overrides
});

