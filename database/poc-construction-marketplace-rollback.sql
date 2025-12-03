-- ============================================================================
-- ROLLBACK SCRIPT - POC CONSTRUCTION MARKETPLACE
-- ============================================================================
-- Agent 1: Database Architecture Design
-- Date: 2025-01-XX
-- Version: 1.0.0
--
-- Description:
-- Script de rollback complet pour supprimer toutes les tables, types,
-- triggers, fonctions et politiques RLS du module POC Construction Marketplace.
--
-- ⚠️ ATTENTION: Ce script supprime TOUTES les données du module POC.
-- Utiliser uniquement en cas de nécessité absolue.
-- ============================================================================

-- ============================================================================
-- SECTION 1: SUPPRESSION DES TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS update_poc_companies_updated_at ON public.poc_companies;
DROP TRIGGER IF EXISTS update_poc_company_members_updated_at ON public.poc_company_members;
DROP TRIGGER IF EXISTS update_poc_product_categories_updated_at ON public.poc_product_categories;
DROP TRIGGER IF EXISTS update_poc_products_updated_at ON public.poc_products;
DROP TRIGGER IF EXISTS update_poc_projects_updated_at ON public.poc_projects;
DROP TRIGGER IF EXISTS update_poc_purchase_orders_updated_at ON public.poc_purchase_orders;
DROP TRIGGER IF EXISTS update_poc_inventory_items_last_updated ON public.poc_inventory_items;
DROP TRIGGER IF EXISTS log_poc_purchase_order_workflow ON public.poc_purchase_orders;

-- ============================================================================
-- SECTION 2: SUPPRESSION DES FONCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS public.log_poc_workflow_transition();
-- Note: update_updated_at_column() peut être partagée avec d'autres tables
-- Ne pas supprimer si utilisée ailleurs

-- ============================================================================
-- SECTION 3: SUPPRESSION DES POLITIQUES RLS
-- ============================================================================

-- poc_companies
DROP POLICY IF EXISTS "poc_companies_select_member_or_approved" ON public.poc_companies;
DROP POLICY IF EXISTS "poc_companies_insert_authenticated" ON public.poc_companies;
DROP POLICY IF EXISTS "poc_companies_update_member_or_admin" ON public.poc_companies;
DROP POLICY IF EXISTS "poc_companies_delete_admin_only" ON public.poc_companies;

-- poc_company_members
DROP POLICY IF EXISTS "poc_company_members_select_member" ON public.poc_company_members;
DROP POLICY IF EXISTS "poc_company_members_insert_admin_direction" ON public.poc_company_members;
DROP POLICY IF EXISTS "poc_company_members_update_admin_direction" ON public.poc_company_members;
DROP POLICY IF EXISTS "poc_company_members_delete_admin_direction" ON public.poc_company_members;

-- poc_product_categories
DROP POLICY IF EXISTS "poc_product_categories_select_public" ON public.poc_product_categories;
DROP POLICY IF EXISTS "poc_product_categories_modify_admin_only" ON public.poc_product_categories;

-- poc_products
DROP POLICY IF EXISTS "poc_products_select_public_or_member" ON public.poc_products;
DROP POLICY IF EXISTS "poc_products_insert_supplier_member" ON public.poc_products;
DROP POLICY IF EXISTS "poc_products_update_supplier_member" ON public.poc_products;
DROP POLICY IF EXISTS "poc_products_delete_supplier_member" ON public.poc_products;

-- poc_projects
DROP POLICY IF EXISTS "poc_projects_select_builder_member" ON public.poc_projects;
DROP POLICY IF EXISTS "poc_projects_insert_builder_member" ON public.poc_projects;
DROP POLICY IF EXISTS "poc_projects_update_builder_member" ON public.poc_projects;
DROP POLICY IF EXISTS "poc_projects_delete_builder_member" ON public.poc_projects;

-- poc_purchase_orders
DROP POLICY IF EXISTS "poc_purchase_orders_select_buyer_supplier" ON public.poc_purchase_orders;
DROP POLICY IF EXISTS "poc_purchase_orders_insert_buyer_member" ON public.poc_purchase_orders;
DROP POLICY IF EXISTS "poc_purchase_orders_update_buyer_supplier" ON public.poc_purchase_orders;
DROP POLICY IF EXISTS "poc_purchase_orders_delete_admin_direction" ON public.poc_purchase_orders;

-- poc_purchase_order_items
DROP POLICY IF EXISTS "poc_purchase_order_items_select_buyer_supplier" ON public.poc_purchase_order_items;
DROP POLICY IF EXISTS "poc_purchase_order_items_modify_buyer_supplier" ON public.poc_purchase_order_items;

-- poc_purchase_order_workflow_history
DROP POLICY IF EXISTS "poc_workflow_history_select_buyer_supplier" ON public.poc_purchase_order_workflow_history;
DROP POLICY IF EXISTS "poc_workflow_history_insert_authenticated" ON public.poc_purchase_order_workflow_history;

-- poc_inventory_items
DROP POLICY IF EXISTS "poc_inventory_items_select_builder_member" ON public.poc_inventory_items;
DROP POLICY IF EXISTS "poc_inventory_items_modify_builder_member" ON public.poc_inventory_items;

-- poc_stock_movements
DROP POLICY IF EXISTS "poc_stock_movements_select_builder_member" ON public.poc_stock_movements;
DROP POLICY IF EXISTS "poc_stock_movements_insert_builder_member" ON public.poc_stock_movements;
DROP POLICY IF EXISTS "poc_stock_movements_modify_builder_admin" ON public.poc_stock_movements;
DROP POLICY IF EXISTS "poc_stock_movements_delete_builder_admin" ON public.poc_stock_movements;

-- ============================================================================
-- SECTION 4: DÉSACTIVATION RLS (avant suppression des tables)
-- ============================================================================

ALTER TABLE IF EXISTS public.poc_companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.poc_company_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.poc_product_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.poc_products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.poc_projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.poc_purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.poc_purchase_order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.poc_purchase_order_workflow_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.poc_inventory_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.poc_stock_movements DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 5: SUPPRESSION DES TABLES (ordre inverse des dépendances)
-- ============================================================================

-- Supprimer les tables dans l'ordre inverse de création pour respecter les dépendances
DROP TABLE IF EXISTS public.poc_stock_movements CASCADE;
DROP TABLE IF EXISTS public.poc_inventory_items CASCADE;
DROP TABLE IF EXISTS public.poc_purchase_order_workflow_history CASCADE;
DROP TABLE IF EXISTS public.poc_purchase_order_items CASCADE;
DROP TABLE IF EXISTS public.poc_purchase_orders CASCADE;
DROP TABLE IF EXISTS public.poc_projects CASCADE;
DROP TABLE IF EXISTS public.poc_products CASCADE;
DROP TABLE IF EXISTS public.poc_product_categories CASCADE;
DROP TABLE IF EXISTS public.poc_company_members CASCADE;
DROP TABLE IF EXISTS public.poc_companies CASCADE;

-- ============================================================================
-- SECTION 6: SUPPRESSION DES TYPES ÉNUMÉRÉS
-- ============================================================================

DROP TYPE IF EXISTS poc_stock_reference_type CASCADE;
DROP TYPE IF EXISTS poc_stock_movement_type CASCADE;
DROP TYPE IF EXISTS poc_order_status CASCADE;
DROP TYPE IF EXISTS poc_project_status CASCADE;
DROP TYPE IF EXISTS poc_member_status CASCADE;
DROP TYPE IF EXISTS poc_member_role CASCADE;
DROP TYPE IF EXISTS poc_company_status CASCADE;
DROP TYPE IF EXISTS poc_company_type CASCADE;

-- ============================================================================
-- SECTION 7: RÉVOCATION DES PERMISSIONS
-- ============================================================================

-- Révoquer les permissions (si nécessaire)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated WHERE table_name LIKE 'poc_%';
REVOKE USAGE ON TYPE poc_company_type FROM authenticated;
REVOKE USAGE ON TYPE poc_company_status FROM authenticated;
REVOKE USAGE ON TYPE poc_member_role FROM authenticated;
REVOKE USAGE ON TYPE poc_member_status FROM authenticated;
REVOKE USAGE ON TYPE poc_project_status FROM authenticated;
REVOKE USAGE ON TYPE poc_order_status FROM authenticated;
REVOKE USAGE ON TYPE poc_stock_movement_type FROM authenticated;
REVOKE USAGE ON TYPE poc_stock_reference_type FROM authenticated;

-- ============================================================================
-- FIN DU ROLLBACK
-- ============================================================================

-- Vérification finale: lister les tables poc_ restantes (devrait être vide)
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
--   AND table_name LIKE 'poc_%';





