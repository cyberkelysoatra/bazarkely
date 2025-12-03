-- ============================================================================
-- SCHEMA POC CONSTRUCTION MARKETPLACE - BazarKELY
-- ============================================================================
-- Agent 1: Database Architecture Design
-- Date: 2025-01-XX
-- Version: 1.0.0
--
-- Description complète:
-- Schéma de base de données isolé (préfixe poc_) pour le module POC
-- Construction Marketplace. Support multi-tenant (Suppliers + Builders),
-- workflow de validation à 3 niveaux, gestion de stocks manuelle,
-- suivi de livraison simplifié.
--
-- IMPORTANT: Ce schéma est ISOLÉ et ne modifie AUCUNE table existante.
-- Toutes les tables utilisent le préfixe poc_ pour éviter les conflits.
-- ============================================================================

-- ============================================================================
-- SECTION 1: ENUMS (Types énumérés)
-- ============================================================================

-- Type de compagnie (Supplier ou Builder)
CREATE TYPE poc_company_type AS ENUM ('supplier', 'builder');

-- Statut de compagnie (pending/approved/rejected/suspended)
CREATE TYPE poc_company_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- Rôles des membres de compagnie (7 rôles)
CREATE TYPE poc_member_role AS ENUM (
  'admin',
  'direction',
  'resp_finance',
  'magasinier',
  'logistique',
  'chef_chantier',
  'chef_equipe'
);

-- Statut des membres de compagnie
CREATE TYPE poc_member_status AS ENUM ('active', 'inactive', 'pending');

-- Statut des projets
CREATE TYPE poc_project_status AS ENUM ('active', 'completed', 'on_hold', 'cancelled');

-- Statuts du workflow de commande (15+ statuts)
CREATE TYPE poc_order_status AS ENUM (
  'draft',
  'pending_site_manager',
  'approved_site_manager',
  'checking_stock',
  'fulfilled_internal',
  'needs_external_order',
  'pending_management',
  'rejected_management',
  'approved_management',
  'submitted_to_supplier',
  'pending_supplier',
  'accepted_supplier',
  'rejected_supplier',
  'in_transit',
  'delivered',
  'completed',
  'cancelled'
);

-- Type de mouvement de stock
CREATE TYPE poc_stock_movement_type AS ENUM ('entry', 'exit', 'adjustment');

-- Type de référence pour les mouvements de stock
CREATE TYPE poc_stock_reference_type AS ENUM (
  'purchase_order',
  'manual_entry',
  'inventory_adjustment',
  'delivery',
  'other'
);

-- ============================================================================
-- SECTION 2: TABLES PRINCIPALES
-- ============================================================================

-- Table 1: poc_companies
-- Compagnies (Suppliers et Builders)
CREATE TABLE IF NOT EXISTS public.poc_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type poc_company_type NOT NULL,
  registration_number TEXT UNIQUE,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'Madagascar',
  status poc_company_status NOT NULL DEFAULT 'pending',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  suspended_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Contraintes
  CONSTRAINT check_approved_by_when_approved CHECK (
    (status = 'approved' AND approved_by IS NOT NULL) OR
    (status != 'approved')
  ),
  CONSTRAINT check_rejection_reason_when_rejected CHECK (
    (status = 'rejected' AND rejection_reason IS NOT NULL) OR
    (status != 'rejected')
  )
);

COMMENT ON TABLE public.poc_companies IS 'Compagnies (Suppliers et Builders) du marketplace construction';
COMMENT ON COLUMN public.poc_companies.type IS 'Type: supplier (fournisseur) ou builder (constructeur)';
COMMENT ON COLUMN public.poc_companies.status IS 'Statut: pending (en attente approbation Joel), approved, rejected, suspended';
COMMENT ON COLUMN public.poc_companies.approved_by IS 'Admin Joel qui approuve la compagnie';
COMMENT ON COLUMN public.poc_companies.metadata IS 'Métadonnées flexibles en JSONB';

-- Table 2: poc_company_members
-- Membres des compagnies avec leurs rôles
CREATE TABLE IF NOT EXISTS public.poc_company_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.poc_companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role poc_member_role NOT NULL,
  status poc_member_status NOT NULL DEFAULT 'pending',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  joined_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Contrainte d'unicité: un utilisateur ne peut être membre qu'une seule fois par compagnie
  CONSTRAINT unique_company_user UNIQUE (company_id, user_id)
);

COMMENT ON TABLE public.poc_company_members IS 'Membres des compagnies avec leurs 7 rôles possibles';
COMMENT ON COLUMN public.poc_company_members.role IS '7 rôles: admin, direction, resp_finance, magasinier, logistique, chef_chantier, chef_equipe';
COMMENT ON COLUMN public.poc_company_members.status IS 'Statut: active, inactive, pending (invitation en attente)';

-- Table 3: poc_product_categories
-- Catégories de produits (hiérarchique)
CREATE TABLE IF NOT EXISTS public.poc_product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  parent_category_id UUID REFERENCES public.poc_product_categories(id) ON DELETE SET NULL,
  icon_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Contrainte pour éviter les boucles dans la hiérarchie
  CONSTRAINT check_no_self_parent CHECK (id != parent_category_id)
);

COMMENT ON TABLE public.poc_product_categories IS 'Catégories de produits avec support hiérarchique (parent/enfant)';
COMMENT ON COLUMN public.poc_product_categories.parent_category_id IS 'Référence à la catégorie parent (NULL pour catégorie racine)';

-- Table 4: poc_products
-- Catalogue de produits (créés par les suppliers)
CREATE TABLE IF NOT EXISTS public.poc_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.poc_companies(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.poc_product_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT,
  unit TEXT NOT NULL DEFAULT 'unité',
  current_price NUMERIC(15, 2) NOT NULL CHECK (current_price >= 0),
  currency TEXT DEFAULT 'MGA',
  stock_available INTEGER DEFAULT 0 CHECK (stock_available >= 0),
  min_order_quantity INTEGER DEFAULT 1 CHECK (min_order_quantity > 0),
  images_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  specifications JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Contrainte: le supplier_id doit être une compagnie de type 'supplier'
  CONSTRAINT check_supplier_type CHECK (
    EXISTS (
      SELECT 1 FROM public.poc_companies
      WHERE id = supplier_id AND type = 'supplier'
    )
  )
);

COMMENT ON TABLE public.poc_products IS 'Catalogue de produits créés par les suppliers';
COMMENT ON COLUMN public.poc_products.supplier_id IS 'Supplier (compagnie) qui crée le produit';
COMMENT ON COLUMN public.poc_products.images_urls IS 'Array de URLs d images du produit';
COMMENT ON COLUMN public.poc_products.specifications IS 'Spécifications techniques flexibles en JSONB';

-- Table 5: poc_projects
-- Projets de construction (créés par les builders)
CREATE TABLE IF NOT EXISTS public.poc_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.poc_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  client_name TEXT,
  location TEXT,
  start_date DATE,
  estimated_end_date DATE,
  status poc_project_status NOT NULL DEFAULT 'active',
  total_budget NUMERIC(15, 2) CHECK (total_budget >= 0),
  currency TEXT DEFAULT 'MGA',
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Contrainte: le company_id doit être une compagnie de type 'builder'
  CONSTRAINT check_builder_type CHECK (
    EXISTS (
      SELECT 1 FROM public.poc_companies
      WHERE id = company_id AND type = 'builder'
    )
  ),
  -- Contrainte: estimated_end_date doit être après start_date
  CONSTRAINT check_dates_valid CHECK (
    estimated_end_date IS NULL OR start_date IS NULL OR estimated_end_date >= start_date
  )
);

COMMENT ON TABLE public.poc_projects IS 'Projets de construction créés par les builders';
COMMENT ON COLUMN public.poc_projects.company_id IS 'Builder (compagnie) qui gère le projet';

-- Table 6: poc_purchase_orders
-- Commandes d'achat avec workflow de validation à 3 niveaux
CREATE TABLE IF NOT EXISTS public.poc_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL,
  buyer_company_id UUID NOT NULL REFERENCES public.poc_companies(id) ON DELETE RESTRICT,
  supplier_company_id UUID NOT NULL REFERENCES public.poc_companies(id) ON DELETE RESTRICT,
  project_id UUID REFERENCES public.poc_projects(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  
  -- Workflow status
  status poc_order_status NOT NULL DEFAULT 'draft',
  site_manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Validation timestamps
  submitted_at TIMESTAMP WITH TIME ZONE,
  site_manager_approved_at TIMESTAMP WITH TIME ZONE,
  site_manager_rejected_at TIMESTAMP WITH TIME ZONE,
  site_manager_rejection_reason TEXT,
  management_approved_at TIMESTAMP WITH TIME ZONE,
  management_rejected_at TIMESTAMP WITH TIME ZONE,
  management_rejection_reason TEXT,
  supplier_submitted_at TIMESTAMP WITH TIME ZONE,
  supplier_accepted_at TIMESTAMP WITH TIME ZONE,
  supplier_rejected_at TIMESTAMP WITH TIME ZONE,
  supplier_rejection_reason TEXT,
  
  -- Stock check result
  stock_check_result JSONB DEFAULT '{}'::jsonb,
  stock_check_performed_at TIMESTAMP WITH TIME ZONE,
  stock_check_performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Amounts
  subtotal NUMERIC(15, 2) DEFAULT 0 CHECK (subtotal >= 0),
  tax NUMERIC(15, 2) DEFAULT 0 CHECK (tax >= 0),
  delivery_fee NUMERIC(15, 2) DEFAULT 0 CHECK (delivery_fee >= 0),
  total NUMERIC(15, 2) DEFAULT 0 CHECK (total >= 0),
  currency TEXT DEFAULT 'MGA',
  
  -- Delivery info
  delivery_address TEXT,
  delivery_notes TEXT,
  estimated_delivery_date DATE,
  actual_delivery_date DATE,
  
  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Contraintes
  CONSTRAINT unique_buyer_order_number UNIQUE (buyer_company_id, order_number),
  CONSTRAINT check_buyer_is_builder CHECK (
    EXISTS (
      SELECT 1 FROM public.poc_companies
      WHERE id = buyer_company_id AND type = 'builder'
    )
  ),
  CONSTRAINT check_supplier_is_supplier CHECK (
    EXISTS (
      SELECT 1 FROM public.poc_companies
      WHERE id = supplier_company_id AND type = 'supplier'
    )
  ),
  CONSTRAINT check_total_equals_sum CHECK (
    total = subtotal + tax + delivery_fee
  )
);

COMMENT ON TABLE public.poc_purchase_orders IS 'Commandes d achat avec workflow de validation à 3 niveaux: Chef Equipe → Chef Chantier → Direction → Supplier';
COMMENT ON COLUMN public.poc_purchase_orders.status IS '15+ statuts du workflow: draft → pending_site_manager → ... → delivered → completed';
COMMENT ON COLUMN public.poc_purchase_orders.site_manager_id IS 'Chef Chantier assigné pour validation';
COMMENT ON COLUMN public.poc_purchase_orders.stock_check_result IS 'Résultat du contrôle de stock en JSONB (fulfilled_internal, needs_external_order, etc.)';

-- Table 7: poc_purchase_order_items
-- Items des commandes d'achat (avec snapshot des produits)
CREATE TABLE IF NOT EXISTS public.poc_purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.poc_purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.poc_products(id) ON DELETE SET NULL,
  
  -- Snapshot du produit au moment de la commande (pour historique)
  item_name TEXT NOT NULL,
  item_description TEXT,
  item_sku TEXT,
  item_unit TEXT NOT NULL,
  
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(15, 2) NOT NULL CHECK (unit_price >= 0),
  total_price NUMERIC(15, 2) NOT NULL CHECK (total_price >= 0),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Contrainte: total_price = quantity * unit_price
  CONSTRAINT check_total_price_calculation CHECK (
    total_price = quantity * unit_price
  )
);

COMMENT ON TABLE public.poc_purchase_order_items IS 'Items des commandes avec snapshot des produits (pour historique même si produit supprimé)';
COMMENT ON COLUMN public.poc_purchase_order_items.product_id IS 'Référence au produit (nullable pour entrées manuelles)';
COMMENT ON COLUMN public.poc_purchase_order_items.item_name IS 'Snapshot du nom du produit au moment de la commande';

-- Table 8: poc_purchase_order_workflow_history
-- Historique des transitions de statut du workflow
CREATE TABLE IF NOT EXISTS public.poc_purchase_order_workflow_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.poc_purchase_orders(id) ON DELETE CASCADE,
  from_status poc_order_status,
  to_status poc_order_status NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.poc_purchase_order_workflow_history IS 'Historique complet des transitions de statut du workflow des commandes';
COMMENT ON COLUMN public.poc_purchase_order_workflow_history.from_status IS 'Statut précédent (NULL pour création)';
COMMENT ON COLUMN public.poc_purchase_order_workflow_history.metadata IS 'Métadonnées supplémentaires de la transition en JSONB';

-- Table 9: poc_inventory_items
-- Items d'inventaire (stock des builders)
CREATE TABLE IF NOT EXISTS public.poc_inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.poc_companies(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.poc_products(id) ON DELETE SET NULL,
  
  -- Snapshot du produit (pour historique même si produit supprimé)
  product_name TEXT NOT NULL,
  sku TEXT,
  unit TEXT NOT NULL,
  
  quantity_available INTEGER NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
  minimum_quantity INTEGER DEFAULT 0 CHECK (minimum_quantity >= 0),
  location TEXT,
  notes TEXT,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Contrainte: le company_id doit être un builder
  CONSTRAINT check_inventory_builder_type CHECK (
    EXISTS (
      SELECT 1 FROM public.poc_companies
      WHERE id = company_id AND type = 'builder'
    )
  )
);

COMMENT ON TABLE public.poc_inventory_items IS 'Inventaire (stock) des builders avec gestion manuelle';
COMMENT ON COLUMN public.poc_inventory_items.company_id IS 'Builder qui possède cet inventaire';
COMMENT ON COLUMN public.poc_inventory_items.product_name IS 'Snapshot du nom du produit (pour historique)';

-- Table 10: poc_stock_movements
-- Mouvements de stock (entrées, sorties, ajustements)
CREATE TABLE IF NOT EXISTS public.poc_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.poc_companies(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.poc_inventory_items(id) ON DELETE CASCADE,
  type poc_stock_movement_type NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reference_type poc_stock_reference_type,
  reference_id UUID,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Contrainte: le company_id doit être un builder
  CONSTRAINT check_stock_movement_builder_type CHECK (
    EXISTS (
      SELECT 1 FROM public.poc_companies
      WHERE id = company_id AND type = 'builder'
    )
  )
);

COMMENT ON TABLE public.poc_stock_movements IS 'Mouvements de stock manuels (entry/exit/adjustment)';
COMMENT ON COLUMN public.poc_stock_movements.type IS 'Type: entry (entrée), exit (sortie), adjustment (ajustement)';
COMMENT ON COLUMN public.poc_stock_movements.reference_type IS 'Type de référence: purchase_order, manual_entry, inventory_adjustment, delivery, other';
COMMENT ON COLUMN public.poc_stock_movements.reference_id IS 'ID de la référence (ex: purchase_order_id)';

-- ============================================================================
-- SECTION 3: INDEXES (Performance)
-- ============================================================================

-- Indexes pour poc_companies
CREATE INDEX IF NOT EXISTS idx_poc_companies_type ON public.poc_companies(type);
CREATE INDEX IF NOT EXISTS idx_poc_companies_status ON public.poc_companies(status);
CREATE INDEX IF NOT EXISTS idx_poc_companies_created_by ON public.poc_companies(created_by);
CREATE INDEX IF NOT EXISTS idx_poc_companies_approved_by ON public.poc_companies(approved_by);

-- Indexes pour poc_company_members
CREATE INDEX IF NOT EXISTS idx_poc_company_members_company_id ON public.poc_company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_poc_company_members_user_id ON public.poc_company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_poc_company_members_role ON public.poc_company_members(role);
CREATE INDEX IF NOT EXISTS idx_poc_company_members_status ON public.poc_company_members(status);
CREATE INDEX IF NOT EXISTS idx_poc_company_members_company_role ON public.poc_company_members(company_id, role);

-- Indexes pour poc_product_categories
CREATE INDEX IF NOT EXISTS idx_poc_product_categories_parent ON public.poc_product_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_poc_product_categories_active ON public.poc_product_categories(is_active) WHERE is_active = true;

-- Indexes pour poc_products
CREATE INDEX IF NOT EXISTS idx_poc_products_supplier_id ON public.poc_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_poc_products_category_id ON public.poc_products(category_id);
CREATE INDEX IF NOT EXISTS idx_poc_products_sku ON public.poc_products(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_poc_products_active ON public.poc_products(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_poc_products_supplier_active ON public.poc_products(supplier_id, is_active) WHERE is_active = true;

-- Indexes pour poc_projects
CREATE INDEX IF NOT EXISTS idx_poc_projects_company_id ON public.poc_projects(company_id);
CREATE INDEX IF NOT EXISTS idx_poc_projects_status ON public.poc_projects(status);
CREATE INDEX IF NOT EXISTS idx_poc_projects_created_by ON public.poc_projects(created_by);
CREATE INDEX IF NOT EXISTS idx_poc_projects_company_status ON public.poc_projects(company_id, status);

-- Indexes pour poc_purchase_orders
CREATE INDEX IF NOT EXISTS idx_poc_purchase_orders_buyer_company ON public.poc_purchase_orders(buyer_company_id);
CREATE INDEX IF NOT EXISTS idx_poc_purchase_orders_supplier_company ON public.poc_purchase_orders(supplier_company_id);
CREATE INDEX IF NOT EXISTS idx_poc_purchase_orders_project_id ON public.poc_purchase_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_poc_purchase_orders_status ON public.poc_purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_poc_purchase_orders_created_by ON public.poc_purchase_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_poc_purchase_orders_site_manager ON public.poc_purchase_orders(site_manager_id) WHERE site_manager_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_poc_purchase_orders_buyer_status ON public.poc_purchase_orders(buyer_company_id, status);
CREATE INDEX IF NOT EXISTS idx_poc_purchase_orders_order_number ON public.poc_purchase_orders(order_number);

-- Indexes pour poc_purchase_order_items
CREATE INDEX IF NOT EXISTS idx_poc_purchase_order_items_order_id ON public.poc_purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_poc_purchase_order_items_product_id ON public.poc_purchase_order_items(product_id) WHERE product_id IS NOT NULL;

-- Indexes pour poc_purchase_order_workflow_history
CREATE INDEX IF NOT EXISTS idx_poc_workflow_history_order_id ON public.poc_purchase_order_workflow_history(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_poc_workflow_history_changed_by ON public.poc_purchase_order_workflow_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_poc_workflow_history_changed_at ON public.poc_purchase_order_workflow_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_poc_workflow_history_to_status ON public.poc_purchase_order_workflow_history(to_status);

-- Indexes pour poc_inventory_items
CREATE INDEX IF NOT EXISTS idx_poc_inventory_items_company_id ON public.poc_inventory_items(company_id);
CREATE INDEX IF NOT EXISTS idx_poc_inventory_items_product_id ON public.poc_inventory_items(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_poc_inventory_items_sku ON public.poc_inventory_items(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_poc_inventory_items_company_product ON public.poc_inventory_items(company_id, product_id) WHERE product_id IS NOT NULL;

-- Indexes pour poc_stock_movements
CREATE INDEX IF NOT EXISTS idx_poc_stock_movements_company_id ON public.poc_stock_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_poc_stock_movements_inventory_item_id ON public.poc_stock_movements(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_poc_stock_movements_type ON public.poc_stock_movements(type);
CREATE INDEX IF NOT EXISTS idx_poc_stock_movements_reference ON public.poc_stock_movements(reference_type, reference_id) WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_poc_stock_movements_created_at ON public.poc_stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_poc_stock_movements_company_created ON public.poc_stock_movements(company_id, created_at);

-- ============================================================================
-- SECTION 4: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Activer RLS sur toutes les tables
ALTER TABLE public.poc_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poc_company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poc_product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poc_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poc_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poc_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poc_purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poc_purchase_order_workflow_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poc_inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poc_stock_movements ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- RLS Policies pour poc_companies
-- ----------------------------------------------------------------------------

-- SELECT: Les utilisateurs peuvent voir les compagnies où ils sont membres ou toutes les compagnies approuvées
CREATE POLICY "poc_companies_select_member_or_approved"
  ON public.poc_companies FOR SELECT
  USING (
    -- Membre de la compagnie
    EXISTS (
      SELECT 1 FROM public.poc_company_members
      WHERE company_id = poc_companies.id
        AND user_id = auth.uid()
        AND status = 'active'
    )
    OR
    -- Ou compagnie approuvée (visibilité publique)
    status = 'approved'
    OR
    -- Admin Joel peut tout voir
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- INSERT: Seuls les utilisateurs authentifiés peuvent créer des compagnies
CREATE POLICY "poc_companies_insert_authenticated"
  ON public.poc_companies FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Seuls les membres actifs de la compagnie ou admin Joel peuvent modifier
CREATE POLICY "poc_companies_update_member_or_admin"
  ON public.poc_companies FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.poc_company_members
      WHERE company_id = poc_companies.id
        AND user_id = auth.uid()
        AND status = 'active'
        AND role IN ('admin', 'direction')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- DELETE: Seul admin Joel peut supprimer
CREATE POLICY "poc_companies_delete_admin_only"
  ON public.poc_companies FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- RLS Policies pour poc_company_members
-- ----------------------------------------------------------------------------

-- SELECT: Les membres peuvent voir les membres de leurs compagnies
CREATE POLICY "poc_company_members_select_member"
  ON public.poc_company_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.poc_company_members pcm2
      WHERE pcm2.company_id = poc_company_members.company_id
        AND pcm2.user_id = auth.uid()
        AND pcm2.status = 'active'
    )
    OR
    -- Admin Joel peut tout voir
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- INSERT: Les membres admin/direction peuvent inviter, ou admin Joel
CREATE POLICY "poc_company_members_insert_admin_direction"
  ON public.poc_company_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.poc_company_members
      WHERE company_id = poc_company_members.company_id
        AND user_id = auth.uid()
        AND status = 'active'
        AND role IN ('admin', 'direction')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- UPDATE: Les membres admin/direction peuvent modifier, ou admin Joel
CREATE POLICY "poc_company_members_update_admin_direction"
  ON public.poc_company_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.poc_company_members pcm2
      WHERE pcm2.company_id = poc_company_members.company_id
        AND pcm2.user_id = auth.uid()
        AND pcm2.status = 'active'
        AND pcm2.role IN ('admin', 'direction')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- DELETE: Les membres admin/direction peuvent supprimer, ou admin Joel
CREATE POLICY "poc_company_members_delete_admin_direction"
  ON public.poc_company_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.poc_company_members pcm2
      WHERE pcm2.company_id = poc_company_members.company_id
        AND pcm2.user_id = auth.uid()
        AND pcm2.status = 'active'
        AND pcm2.role IN ('admin', 'direction')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- RLS Policies pour poc_product_categories
-- ----------------------------------------------------------------------------

-- SELECT: Tout le monde peut voir les catégories actives
CREATE POLICY "poc_product_categories_select_public"
  ON public.poc_product_categories FOR SELECT
  USING (is_active = true OR auth.uid() IS NOT NULL);

-- INSERT/UPDATE/DELETE: Seul admin Joel peut modifier
CREATE POLICY "poc_product_categories_modify_admin_only"
  ON public.poc_product_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- RLS Policies pour poc_products
-- ----------------------------------------------------------------------------

-- SELECT: Les produits actifs sont visibles par tous, ou membres de la compagnie supplier
CREATE POLICY "poc_products_select_public_or_member"
  ON public.poc_products FOR SELECT
  USING (
    is_active = true
    OR
    EXISTS (
      SELECT 1 FROM public.poc_company_members
      WHERE company_id = poc_products.supplier_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- INSERT: Les membres actifs du supplier peuvent créer des produits
CREATE POLICY "poc_products_insert_supplier_member"
  ON public.poc_products FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.poc_company_members
      WHERE company_id = poc_products.supplier_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- UPDATE: Les membres actifs du supplier peuvent modifier leurs produits
CREATE POLICY "poc_products_update_supplier_member"
  ON public.poc_products FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.poc_company_members
      WHERE company_id = poc_products.supplier_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- DELETE: Les membres actifs du supplier peuvent supprimer leurs produits
CREATE POLICY "poc_products_delete_supplier_member"
  ON public.poc_products FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.poc_company_members
      WHERE company_id = poc_products.supplier_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- RLS Policies pour poc_projects
-- ----------------------------------------------------------------------------

-- SELECT: Les membres du builder peuvent voir leurs projets
CREATE POLICY "poc_projects_select_builder_member"
  ON public.poc_projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.poc_company_members
      WHERE company_id = poc_projects.company_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- INSERT: Les membres actifs du builder peuvent créer des projets
CREATE POLICY "poc_projects_insert_builder_member"
  ON public.poc_projects FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.poc_company_members
      WHERE company_id = poc_projects.company_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- UPDATE: Les membres actifs du builder peuvent modifier leurs projets
CREATE POLICY "poc_projects_update_builder_member"
  ON public.poc_projects FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.poc_company_members
      WHERE company_id = poc_projects.company_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- DELETE: Les membres actifs du builder peuvent supprimer leurs projets
CREATE POLICY "poc_projects_delete_builder_member"
  ON public.poc_projects FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.poc_company_members
      WHERE company_id = poc_projects.company_id
        AND user_id = auth.uid()
        AND status = 'active'
        AND role IN ('admin', 'direction')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- RLS Policies pour poc_purchase_orders
-- ----------------------------------------------------------------------------

-- SELECT: Les membres du buyer ou supplier peuvent voir les commandes
CREATE POLICY "poc_purchase_orders_select_buyer_supplier"
  ON public.poc_purchase_orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.poc_company_members
      WHERE (company_id = poc_purchase_orders.buyer_company_id OR company_id = poc_purchase_orders.supplier_company_id)
        AND user_id = auth.uid()
        AND status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- INSERT: Les membres actifs du buyer (Chef Equipe) peuvent créer des commandes
CREATE POLICY "poc_purchase_orders_insert_buyer_member"
  ON public.poc_purchase_orders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.poc_company_members
      WHERE company_id = poc_purchase_orders.buyer_company_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- UPDATE: Les membres actifs du buyer ou supplier peuvent modifier selon leur rôle
CREATE POLICY "poc_purchase_orders_update_buyer_supplier"
  ON public.poc_purchase_orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.poc_company_members
      WHERE (company_id = poc_purchase_orders.buyer_company_id OR company_id = poc_purchase_orders.supplier_company_id)
        AND user_id = auth.uid()
        AND status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- DELETE: Seuls les membres admin/direction du buyer ou admin Joel peuvent supprimer
CREATE POLICY "poc_purchase_orders_delete_admin_direction"
  ON public.poc_purchase_orders FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.poc_company_members
      WHERE company_id = poc_purchase_orders.buyer_company_id
        AND user_id = auth.uid()
        AND status = 'active'
        AND role IN ('admin', 'direction')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- RLS Policies pour poc_purchase_order_items
-- ----------------------------------------------------------------------------

-- SELECT: Même logique que purchase_orders
CREATE POLICY "poc_purchase_order_items_select_buyer_supplier"
  ON public.poc_purchase_order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.poc_purchase_orders po
      JOIN public.poc_company_members pcm ON (
        pcm.company_id = po.buyer_company_id OR pcm.company_id = po.supplier_company_id
      )
      WHERE po.id = poc_purchase_order_items.purchase_order_id
        AND pcm.user_id = auth.uid()
        AND pcm.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- INSERT/UPDATE/DELETE: Même logique que purchase_orders
CREATE POLICY "poc_purchase_order_items_modify_buyer_supplier"
  ON public.poc_purchase_order_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.poc_purchase_orders po
      JOIN public.poc_company_members pcm ON (
        pcm.company_id = po.buyer_company_id OR pcm.company_id = po.supplier_company_id
      )
      WHERE po.id = poc_purchase_order_items.purchase_order_id
        AND pcm.user_id = auth.uid()
        AND pcm.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- RLS Policies pour poc_purchase_order_workflow_history
-- ----------------------------------------------------------------------------

-- SELECT: Même logique que purchase_orders
CREATE POLICY "poc_workflow_history_select_buyer_supplier"
  ON public.poc_purchase_order_workflow_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.poc_purchase_orders po
      JOIN public.poc_company_members pcm ON (
        pcm.company_id = po.buyer_company_id OR pcm.company_id = po.supplier_company_id
      )
      WHERE po.id = poc_purchase_order_workflow_history.purchase_order_id
        AND pcm.user_id = auth.uid()
        AND pcm.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- INSERT: Automatique lors des transitions de statut (via triggers ou application)
CREATE POLICY "poc_workflow_history_insert_authenticated"
  ON public.poc_purchase_order_workflow_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ----------------------------------------------------------------------------
-- RLS Policies pour poc_inventory_items
-- ----------------------------------------------------------------------------

-- SELECT: Les membres du builder peuvent voir leur inventaire
CREATE POLICY "poc_inventory_items_select_builder_member"
  ON public.poc_inventory_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.poc_company_members
      WHERE company_id = poc_inventory_items.company_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- INSERT/UPDATE/DELETE: Les membres actifs du builder (magasinier, admin, direction) peuvent gérer l'inventaire
CREATE POLICY "poc_inventory_items_modify_builder_member"
  ON public.poc_inventory_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.poc_company_members
      WHERE company_id = poc_inventory_items.company_id
        AND user_id = auth.uid()
        AND status = 'active'
        AND role IN ('admin', 'direction', 'magasinier')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- RLS Policies pour poc_stock_movements
-- ----------------------------------------------------------------------------

-- SELECT: Les membres du builder peuvent voir les mouvements de stock
CREATE POLICY "poc_stock_movements_select_builder_member"
  ON public.poc_stock_movements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.poc_company_members
      WHERE company_id = poc_stock_movements.company_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- INSERT: Les membres actifs du builder (magasinier, admin, direction) peuvent créer des mouvements
CREATE POLICY "poc_stock_movements_insert_builder_member"
  ON public.poc_stock_movements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.poc_company_members
      WHERE company_id = poc_stock_movements.company_id
        AND user_id = auth.uid()
        AND status = 'active'
        AND role IN ('admin', 'direction', 'magasinier')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- UPDATE/DELETE: Les membres actifs du builder (admin, direction) peuvent modifier/supprimer
CREATE POLICY "poc_stock_movements_modify_builder_admin"
  ON public.poc_stock_movements FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.poc_company_members
      WHERE company_id = poc_stock_movements.company_id
        AND user_id = auth.uid()
        AND status = 'active'
        AND role IN ('admin', 'direction')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "poc_stock_movements_delete_builder_admin"
  ON public.poc_stock_movements FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.poc_company_members
      WHERE company_id = poc_stock_movements.company_id
        AND user_id = auth.uid()
        AND status = 'active'
        AND role IN ('admin', 'direction')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- SECTION 5: TRIGGERS (Automatisation)
-- ============================================================================

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at sur toutes les tables
CREATE TRIGGER update_poc_companies_updated_at
  BEFORE UPDATE ON public.poc_companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_poc_company_members_updated_at
  BEFORE UPDATE ON public.poc_company_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_poc_product_categories_updated_at
  BEFORE UPDATE ON public.poc_product_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_poc_products_updated_at
  BEFORE UPDATE ON public.poc_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_poc_projects_updated_at
  BEFORE UPDATE ON public.poc_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_poc_purchase_orders_updated_at
  BEFORE UPDATE ON public.poc_purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_poc_inventory_items_last_updated
  BEFORE UPDATE ON public.poc_inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fonction pour enregistrer automatiquement les transitions de workflow
CREATE OR REPLACE FUNCTION public.log_poc_workflow_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.poc_purchase_order_workflow_history (
      purchase_order_id,
      from_status,
      to_status,
      changed_by,
      notes
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(),
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour enregistrer automatiquement les transitions de workflow
CREATE TRIGGER log_poc_purchase_order_workflow
  AFTER UPDATE OF status ON public.poc_purchase_orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.log_poc_workflow_transition();

-- ============================================================================
-- SECTION 6: GRANTS (Permissions)
-- ============================================================================

-- Accorder les permissions nécessaires aux utilisateurs authentifiés
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Permissions spécifiques pour les types énumérés
GRANT USAGE ON TYPE poc_company_type TO authenticated;
GRANT USAGE ON TYPE poc_company_status TO authenticated;
GRANT USAGE ON TYPE poc_member_role TO authenticated;
GRANT USAGE ON TYPE poc_member_status TO authenticated;
GRANT USAGE ON TYPE poc_project_status TO authenticated;
GRANT USAGE ON TYPE poc_order_status TO authenticated;
GRANT USAGE ON TYPE poc_stock_movement_type TO authenticated;
GRANT USAGE ON TYPE poc_stock_reference_type TO authenticated;

-- ============================================================================
-- FIN DU SCHÉMA
-- ============================================================================

COMMENT ON SCHEMA public IS 'Schema POC Construction Marketplace - Tables isolées avec préfixe poc_';





