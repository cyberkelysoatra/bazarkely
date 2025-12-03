-- ============================================================================
-- PHASE 2: SCRIPT DE ROLLBACK
-- BazarKELY Construction POC - Agent 01 Database Rollback
-- Date: 2025-11-09
-- ============================================================================
-- ATTENTION: Ce script supprime toutes les modifications de la Phase 2
-- Utiliser uniquement en cas de problème nécessitant un retour en arrière
-- ============================================================================

-- Désactiver RLS temporairement pour permettre la suppression
ALTER TABLE public.poc_org_unit_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.poc_org_units DISABLE ROW LEVEL SECURITY;

-- Supprimer les politiques RLS
DROP POLICY IF EXISTS "poc_org_unit_members_delete_admin_direction" ON public.poc_org_unit_members;
DROP POLICY IF EXISTS "poc_org_unit_members_update_admin_direction" ON public.poc_org_unit_members;
DROP POLICY IF EXISTS "poc_org_unit_members_insert_admin_direction" ON public.poc_org_unit_members;
DROP POLICY IF EXISTS "poc_org_unit_members_select_member_or_admin" ON public.poc_org_unit_members;

DROP POLICY IF EXISTS "poc_org_units_delete_admin_direction" ON public.poc_org_units;
DROP POLICY IF EXISTS "poc_org_units_update_admin_direction" ON public.poc_org_units;
DROP POLICY IF EXISTS "poc_org_units_insert_admin_direction" ON public.poc_org_units;
DROP POLICY IF EXISTS "poc_org_units_select_company_member" ON public.poc_org_units;

-- Supprimer les triggers
DROP TRIGGER IF EXISTS update_poc_org_unit_members_updated_at ON public.poc_org_unit_members;
DROP TRIGGER IF EXISTS update_poc_org_units_updated_at ON public.poc_org_units;

-- Supprimer les données (dans l'ordre des dépendances)
DELETE FROM public.poc_org_unit_members;
DELETE FROM public.poc_org_units;

-- Supprimer les colonnes ajoutées à poc_purchase_orders
ALTER TABLE public.poc_purchase_orders DROP COLUMN IF EXISTS org_unit_id;
ALTER TABLE public.poc_purchase_orders DROP COLUMN IF EXISTS order_type;

-- Supprimer les indexes
DROP INDEX IF EXISTS idx_poc_purchase_orders_org_unit_id;
DROP INDEX IF EXISTS idx_poc_purchase_orders_order_type;
DROP INDEX IF EXISTS idx_poc_org_unit_members_org_unit_status;
DROP INDEX IF EXISTS idx_poc_org_unit_members_status;
DROP INDEX IF EXISTS idx_poc_org_unit_members_role;
DROP INDEX IF EXISTS idx_poc_org_unit_members_user_id;
DROP INDEX IF EXISTS idx_poc_org_unit_members_org_unit_id;
DROP INDEX IF EXISTS idx_poc_org_units_company_active;
DROP INDEX IF EXISTS idx_poc_org_units_active;
DROP INDEX IF EXISTS idx_poc_org_units_code;
DROP INDEX IF EXISTS idx_poc_org_units_type;
DROP INDEX IF EXISTS idx_poc_org_units_parent_id;
DROP INDEX IF EXISTS idx_poc_org_units_company_id;

-- Supprimer les tables
DROP TABLE IF EXISTS public.poc_org_unit_members;
DROP TABLE IF EXISTS public.poc_org_units;

-- ============================================================================
-- VÉRIFICATION POST-ROLLBACK
-- ============================================================================

-- Vérifier que les tables n'existent plus
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'poc_org_units'
) AS poc_org_units_still_exists;

SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'poc_org_unit_members'
) AS poc_org_unit_members_still_exists;

-- Vérifier que les colonnes ont été supprimées
SELECT 
    column_name
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'poc_purchase_orders'
  AND column_name IN ('order_type', 'org_unit_id');

-- ============================================================================
-- FIN DU ROLLBACK
-- ============================================================================









