-- ============================================================================
-- PHASE 3: SECURITY FOUNDATIONS - BazarKELY Construction POC
-- Agent 02 - Database Implementation
-- Date: 2025-11-12
-- ============================================================================
-- Description:
-- - Création de la table poc_price_thresholds (seuils d'approbation configurables)
-- - Création de la table poc_consumption_plans (plans de consommation)
-- - Création de la table poc_alerts (alertes système)
-- - Création de la fonction helper get_user_role_in_company
-- - Création de la vue poc_purchase_orders_masked (masquage prix pour chef_equipe)
-- - Peuplement de poc_org_unit_members avec données de test (Joel)
-- - Insertion de seuils de prix d'exemple
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: CRÉATION DE LA TABLE poc_price_thresholds
-- ============================================================================
-- Table pour les seuils d'approbation configurables par compagnie ou org_unit
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.poc_price_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.poc_companies(id) ON DELETE CASCADE,
  org_unit_id UUID REFERENCES public.poc_org_units(id) ON DELETE CASCADE,
  threshold_amount NUMERIC(15, 2) NOT NULL CHECK (threshold_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'MGA',
  approval_level TEXT NOT NULL CHECK (approval_level IN ('site_manager', 'management', 'direction')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Contrainte: org_unit_id doit appartenir à company_id si fourni
  CONSTRAINT check_org_unit_company_match CHECK (
    org_unit_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.poc_org_units
      WHERE id = org_unit_id AND company_id = poc_price_thresholds.company_id
    )
  ),
  -- Unicité: un seul seuil par niveau d'approbation par compagnie/org_unit
  CONSTRAINT unique_threshold_level UNIQUE (company_id, org_unit_id, approval_level)
);

COMMENT ON TABLE public.poc_price_thresholds IS 'Seuils d''approbation configurables pour les bons de commande';
COMMENT ON COLUMN public.poc_price_thresholds.org_unit_id IS 'NULL pour seuil au niveau compagnie, UUID pour seuil spécifique à une unité';
COMMENT ON COLUMN public.poc_price_thresholds.threshold_amount IS 'Montant seuil en MGA (ou autre devise)';
COMMENT ON COLUMN public.poc_price_thresholds.approval_level IS 'Niveau d''approbation requis: site_manager, management, ou direction';

-- Indexes pour poc_price_thresholds
CREATE INDEX IF NOT EXISTS idx_poc_price_thresholds_company_id 
  ON public.poc_price_thresholds(company_id);
CREATE INDEX IF NOT EXISTS idx_poc_price_thresholds_org_unit_id 
  ON public.poc_price_thresholds(org_unit_id) WHERE org_unit_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_poc_price_thresholds_approval_level 
  ON public.poc_price_thresholds(approval_level);
CREATE INDEX IF NOT EXISTS idx_poc_price_thresholds_company_approval 
  ON public.poc_price_thresholds(company_id, approval_level);

-- Trigger pour updated_at
CREATE TRIGGER update_poc_price_thresholds_updated_at
  BEFORE UPDATE ON public.poc_price_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- SECTION 2: CRÉATION DE LA TABLE poc_consumption_plans
-- ============================================================================
-- Table pour les plans de consommation (quantités planifiées vs réelles)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.poc_consumption_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.poc_companies(id) ON DELETE CASCADE,
  org_unit_id UUID REFERENCES public.poc_org_units(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.poc_projects(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.poc_products(id) ON DELETE CASCADE,
  planned_quantity NUMERIC(15, 3) NOT NULL CHECK (planned_quantity > 0),
  planned_period TEXT NOT NULL CHECK (planned_period IN ('monthly', 'quarterly', 'yearly')),
  alert_threshold_percentage INTEGER NOT NULL DEFAULT 80 CHECK (alert_threshold_percentage >= 1 AND alert_threshold_percentage <= 100),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Contrainte: org_unit_id doit appartenir à company_id si fourni
  CONSTRAINT check_consumption_org_unit_company_match CHECK (
    org_unit_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.poc_org_units
      WHERE id = org_unit_id AND company_id = poc_consumption_plans.company_id
    )
  ),
  -- Contrainte: project_id doit appartenir à company_id si fourni
  CONSTRAINT check_consumption_project_company_match CHECK (
    project_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.poc_projects
      WHERE id = project_id AND company_id = poc_consumption_plans.company_id
    )
  )
);

COMMENT ON TABLE public.poc_consumption_plans IS 'Plans de consommation pour suivi quantités planifiées vs réelles';
COMMENT ON COLUMN public.poc_consumption_plans.org_unit_id IS 'NULL si plan au niveau compagnie, UUID pour plan spécifique à une unité';
COMMENT ON COLUMN public.poc_consumption_plans.planned_quantity IS 'Quantité planifiée pour la période';
COMMENT ON COLUMN public.poc_consumption_plans.planned_period IS 'Période: monthly (mensuel), quarterly (trimestriel), yearly (annuel)';
COMMENT ON COLUMN public.poc_consumption_plans.alert_threshold_percentage IS 'Pourcentage de consommation déclenchant une alerte (1-100)';

-- Indexes pour poc_consumption_plans
CREATE INDEX IF NOT EXISTS idx_poc_consumption_plans_company_id 
  ON public.poc_consumption_plans(company_id);
CREATE INDEX IF NOT EXISTS idx_poc_consumption_plans_org_unit_id 
  ON public.poc_consumption_plans(org_unit_id) WHERE org_unit_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_poc_consumption_plans_project_id 
  ON public.poc_consumption_plans(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_poc_consumption_plans_product_id 
  ON public.poc_consumption_plans(product_id);
CREATE INDEX IF NOT EXISTS idx_poc_consumption_plans_period 
  ON public.poc_consumption_plans(planned_period);

-- Trigger pour updated_at
CREATE TRIGGER update_poc_consumption_plans_updated_at
  BEFORE UPDATE ON public.poc_consumption_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- SECTION 3: CRÉATION DE LA TABLE poc_alerts
-- ============================================================================
-- Table pour les alertes système (seuils dépassés, consommation, stock)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.poc_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.poc_companies(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('threshold_exceeded', 'consumption_warning', 'stock_low')),
  purchase_order_id UUID REFERENCES public.poc_purchase_orders(id) ON DELETE SET NULL,
  consumption_plan_id UUID REFERENCES public.poc_consumption_plans(id) ON DELETE SET NULL,
  threshold_exceeded_amount NUMERIC(15, 2),
  message TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  notified_users UUID[] DEFAULT ARRAY[]::UUID[],
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Contrainte: purchase_order_id doit appartenir à company_id si fourni
  CONSTRAINT check_alert_purchase_order_company_match CHECK (
    purchase_order_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.poc_purchase_orders
      WHERE id = purchase_order_id AND buyer_company_id = poc_alerts.company_id
    )
  ),
  -- Contrainte: consumption_plan_id doit appartenir à company_id si fourni
  CONSTRAINT check_alert_consumption_plan_company_match CHECK (
    consumption_plan_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.poc_consumption_plans
      WHERE id = consumption_plan_id AND company_id = poc_alerts.company_id
    )
  )
);

COMMENT ON TABLE public.poc_alerts IS 'Alertes système pour seuils dépassés, consommation, stock faible';
COMMENT ON COLUMN public.poc_alerts.alert_type IS 'Type: threshold_exceeded, consumption_warning, stock_low';
COMMENT ON COLUMN public.poc_alerts.notified_users IS 'Array d''UUIDs des utilisateurs notifiés';
COMMENT ON COLUMN public.poc_alerts.is_read IS 'Indique si l''alerte a été lue';

-- Indexes pour poc_alerts
CREATE INDEX IF NOT EXISTS idx_poc_alerts_company_id 
  ON public.poc_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_poc_alerts_alert_type 
  ON public.poc_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_poc_alerts_severity 
  ON public.poc_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_poc_alerts_is_read 
  ON public.poc_alerts(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_poc_alerts_created_at 
  ON public.poc_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_poc_alerts_purchase_order_id 
  ON public.poc_alerts(purchase_order_id) WHERE purchase_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_poc_alerts_consumption_plan_id 
  ON public.poc_alerts(consumption_plan_id) WHERE consumption_plan_id IS NOT NULL;

-- ============================================================================
-- SECTION 4: FONCTION HELPER get_user_role_in_company
-- ============================================================================
-- Fonction pour récupérer le rôle d'un utilisateur dans une compagnie
-- Utilisée dans les politiques RLS et la vue de masquage des prix
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_role_in_company(
  p_user_id UUID,
  p_company_id UUID
)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM public.poc_company_members
  WHERE user_id = p_user_id
    AND company_id = p_company_id
    AND status = 'active'
  LIMIT 1;
  
  RETURN COALESCE(v_role, 'none');
END;
$$;

COMMENT ON FUNCTION public.get_user_role_in_company IS 'Retourne le rôle d''un utilisateur dans une compagnie, ou ''none'' si non membre ou inactif';

-- ============================================================================
-- SECTION 5: VUE poc_purchase_orders_masked
-- ============================================================================
-- Vue masquant les prix pour le rôle chef_equipe
-- Les colonnes subtotal, tax, delivery_fee, total retournent NULL pour chef_equipe
-- ============================================================================

CREATE OR REPLACE VIEW public.poc_purchase_orders_masked AS
SELECT 
  id,
  order_number,
  buyer_company_id,
  supplier_company_id,
  project_id,
  created_by,
  status,
  site_manager_id,
  submitted_at,
  site_manager_approved_at,
  site_manager_rejected_at,
  site_manager_rejection_reason,
  management_approved_at,
  management_rejected_at,
  management_rejection_reason,
  supplier_submitted_at,
  supplier_accepted_at,
  supplier_rejected_at,
  supplier_rejection_reason,
  stock_check_result,
  stock_check_performed_at,
  stock_check_performed_by,
  -- Masquage des prix pour chef_equipe
  CASE 
    WHEN public.get_user_role_in_company(auth.uid(), buyer_company_id) = 'chef_equipe'
    THEN NULL
    ELSE subtotal
  END AS subtotal,
  CASE 
    WHEN public.get_user_role_in_company(auth.uid(), buyer_company_id) = 'chef_equipe'
    THEN NULL
    ELSE tax
  END AS tax,
  CASE 
    WHEN public.get_user_role_in_company(auth.uid(), buyer_company_id) = 'chef_equipe'
    THEN NULL
    ELSE delivery_fee
  END AS delivery_fee,
  CASE 
    WHEN public.get_user_role_in_company(auth.uid(), buyer_company_id) = 'chef_equipe'
    THEN NULL
    ELSE total
  END AS total,
  currency,
  delivery_address,
  delivery_notes,
  estimated_delivery_date,
  actual_delivery_date,
  notes,
  metadata,
  created_at,
  updated_at,
  order_type,
  org_unit_id
FROM public.poc_purchase_orders;

COMMENT ON VIEW public.poc_purchase_orders_masked IS 'Vue masquant les prix (subtotal, tax, delivery_fee, total) pour le rôle chef_equipe. Retourne NULL au lieu des valeurs réelles.';

-- ============================================================================
-- SECTION 6: POLITIQUES RLS POUR LES NOUVELLES TABLES
-- ============================================================================

-- Activer RLS sur les nouvelles tables
ALTER TABLE public.poc_price_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poc_consumption_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poc_alerts ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- RLS Policies pour poc_price_thresholds
-- ----------------------------------------------------------------------------

-- SELECT: Les membres de la compagnie peuvent voir les seuils
CREATE POLICY "poc_price_thresholds_select_company_member"
  ON public.poc_price_thresholds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.poc_company_members
      WHERE company_id = poc_price_thresholds.company_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- INSERT: Seuls admin et direction peuvent créer des seuils
CREATE POLICY "poc_price_thresholds_insert_admin_direction"
  ON public.poc_price_thresholds FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.poc_company_members
      WHERE company_id = poc_price_thresholds.company_id
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

-- UPDATE: Seuls admin et direction peuvent modifier
CREATE POLICY "poc_price_thresholds_update_admin_direction"
  ON public.poc_price_thresholds FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.poc_company_members
      WHERE company_id = poc_price_thresholds.company_id
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

-- DELETE: Seuls admin et direction peuvent supprimer
CREATE POLICY "poc_price_thresholds_delete_admin_direction"
  ON public.poc_price_thresholds FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.poc_company_members
      WHERE company_id = poc_price_thresholds.company_id
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
-- RLS Policies pour poc_consumption_plans
-- ----------------------------------------------------------------------------

-- SELECT: Les membres de la compagnie peuvent voir les plans
CREATE POLICY "poc_consumption_plans_select_company_member"
  ON public.poc_consumption_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.poc_company_members
      WHERE company_id = poc_consumption_plans.company_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- INSERT: Seuls admin et direction peuvent créer des plans
CREATE POLICY "poc_consumption_plans_insert_admin_direction"
  ON public.poc_consumption_plans FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.poc_company_members
      WHERE company_id = poc_consumption_plans.company_id
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

-- UPDATE: Seuls admin et direction peuvent modifier
CREATE POLICY "poc_consumption_plans_update_admin_direction"
  ON public.poc_consumption_plans FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.poc_company_members
      WHERE company_id = poc_consumption_plans.company_id
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

-- DELETE: Seuls admin et direction peuvent supprimer
CREATE POLICY "poc_consumption_plans_delete_admin_direction"
  ON public.poc_consumption_plans FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.poc_company_members
      WHERE company_id = poc_consumption_plans.company_id
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
-- RLS Policies pour poc_alerts
-- ----------------------------------------------------------------------------

-- SELECT: Les membres peuvent voir les alertes où ils sont notifiés ou s'ils sont admin/direction
CREATE POLICY "poc_alerts_select_notified_or_admin"
  ON public.poc_alerts FOR SELECT
  USING (
    -- Utilisateur dans la liste notified_users
    auth.uid() = ANY(notified_users)
    OR
    -- Admin ou direction de la compagnie
    EXISTS (
      SELECT 1 FROM public.poc_company_members
      WHERE company_id = poc_alerts.company_id
        AND user_id = auth.uid()
        AND status = 'active'
        AND role IN ('admin', 'direction')
    )
    OR
    -- Admin Joel
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- INSERT: Système uniquement (via SECURITY DEFINER functions)
-- Les utilisateurs ne peuvent pas insérer directement
CREATE POLICY "poc_alerts_insert_system_only"
  ON public.poc_alerts FOR INSERT
  WITH CHECK (false); -- Empêche insertion directe, doit passer par fonction SECURITY DEFINER

-- UPDATE: Seuls admin et direction peuvent marquer comme lues
CREATE POLICY "poc_alerts_update_admin_direction"
  ON public.poc_alerts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.poc_company_members
      WHERE company_id = poc_alerts.company_id
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

-- DELETE: Seuls admin et direction peuvent supprimer
CREATE POLICY "poc_alerts_delete_admin_direction"
  ON public.poc_alerts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.poc_company_members
      WHERE company_id = poc_alerts.company_id
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
-- SECTION 7: PEUPLEMENT poc_org_unit_members AVEC DONNÉES DE TEST
-- ============================================================================
-- Assignation de Joel à 3 org_units avec différents rôles
-- ============================================================================

-- Variables pour les IDs
DO $$
DECLARE
  v_joel_user_id UUID := '5020b356-7281-4007-bec6-30a956b8a347';
  v_company_id UUID := 'c0000002-0002-0002-0002-000000000002';
  v_site_a_id UUID;
  v_site_b_id UUID;
  v_dg_id UUID;
BEGIN
  -- Récupérer les IDs des org_units par code
  SELECT id INTO v_site_a_id
  FROM public.poc_org_units
  WHERE company_id = v_company_id
    AND code = 'SITE-A'
  LIMIT 1;
  
  SELECT id INTO v_site_b_id
  FROM public.poc_org_units
  WHERE company_id = v_company_id
    AND code = 'SITE-B'
  LIMIT 1;
  
  SELECT id INTO v_dg_id
  FROM public.poc_org_units
  WHERE company_id = v_company_id
    AND code = 'DG'
  LIMIT 1;
  
  -- Vérifier que les org_units existent
  IF v_site_a_id IS NULL THEN
    RAISE EXCEPTION 'Org unit SITE-A not found';
  END IF;
  
  IF v_site_b_id IS NULL THEN
    RAISE EXCEPTION 'Org unit SITE-B not found';
  END IF;
  
  IF v_dg_id IS NULL THEN
    RAISE EXCEPTION 'Org unit DG not found';
  END IF;
  
  -- Insertion 1: Joel comme Chef Equipe dans SITE-A
  INSERT INTO public.poc_org_unit_members (
    org_unit_id,
    user_id,
    role,
    status,
    assigned_by,
    assigned_at
  ) VALUES (
    v_site_a_id,
    v_joel_user_id,
    'chef_equipe',
    'active',
    v_joel_user_id,
    NOW()
  )
  ON CONFLICT (org_unit_id, user_id) DO NOTHING;
  
  -- Insertion 2: Joel comme Chef Chantier dans SITE-B
  INSERT INTO public.poc_org_unit_members (
    org_unit_id,
    user_id,
    role,
    status,
    assigned_by,
    assigned_at
  ) VALUES (
    v_site_b_id,
    v_joel_user_id,
    'chef_chantier',
    'active',
    v_joel_user_id,
    NOW()
  )
  ON CONFLICT (org_unit_id, user_id) DO NOTHING;
  
  -- Insertion 3: Joel comme Direction dans DG
  INSERT INTO public.poc_org_unit_members (
    org_unit_id,
    user_id,
    role,
    status,
    assigned_by,
    assigned_at
  ) VALUES (
    v_dg_id,
    v_joel_user_id,
    'direction',
    'active',
    v_joel_user_id,
    NOW()
  )
  ON CONFLICT (org_unit_id, user_id) DO NOTHING;
  
  RAISE NOTICE '3 assignations org_unit créées pour Joel (chef_equipe SITE-A, chef_chantier SITE-B, direction DG)';
END $$;

-- ============================================================================
-- SECTION 8: INSERTION DE SEUILS DE PRIX D'EXEMPLE
-- ============================================================================
-- Création de 3 seuils: compagnie-wide, org_unit SITE-A, direction
-- ============================================================================

DO $$
DECLARE
  v_company_id UUID := 'c0000002-0002-0002-0002-000000000002';
  v_joel_user_id UUID := '5020b356-7281-4007-bec6-30a956b8a347';
  v_site_a_id UUID;
  v_dg_id UUID;
BEGIN
  -- Récupérer les IDs des org_units
  SELECT id INTO v_site_a_id
  FROM public.poc_org_units
  WHERE company_id = v_company_id
    AND code = 'SITE-A'
  LIMIT 1;
  
  SELECT id INTO v_dg_id
  FROM public.poc_org_units
  WHERE company_id = v_company_id
    AND code = 'DG'
  LIMIT 1;
  
  -- Seuil 1: Compagnie-wide - 5M MGA pour approbation management (règle métier existante)
  INSERT INTO public.poc_price_thresholds (
    company_id,
    org_unit_id,
    threshold_amount,
    currency,
    approval_level,
    created_by
  ) VALUES (
    v_company_id,
    NULL, -- NULL = seuil au niveau compagnie
    5000000.00,
    'MGA',
    'management',
    v_joel_user_id
  )
  ON CONFLICT (company_id, org_unit_id, approval_level) DO NOTHING;
  
  -- Seuil 2: Org-unit SITE-A - 1M MGA pour approbation site_manager
  IF v_site_a_id IS NOT NULL THEN
    INSERT INTO public.poc_price_thresholds (
      company_id,
      org_unit_id,
      threshold_amount,
      currency,
      approval_level,
      created_by
    ) VALUES (
      v_company_id,
      v_site_a_id,
      1000000.00,
      'MGA',
      'site_manager',
      v_joel_user_id
    )
    ON CONFLICT (company_id, org_unit_id, approval_level) DO NOTHING;
  END IF;
  
  -- Seuil 3: Direction - 10M MGA pour approbation direction
  IF v_dg_id IS NOT NULL THEN
    INSERT INTO public.poc_price_thresholds (
      company_id,
      org_unit_id,
      threshold_amount,
      currency,
      approval_level,
      created_by
    ) VALUES (
      v_company_id,
      v_dg_id,
      10000000.00,
      'MGA',
      'direction',
      v_joel_user_id
    )
    ON CONFLICT (company_id, org_unit_id, approval_level) DO NOTHING;
  END IF;
  
  RAISE NOTICE '3 seuils de prix créés (compagnie 5M management, SITE-A 1M site_manager, DG 10M direction)';
END $$;

COMMIT;

-- ============================================================================
-- SECTION 9: VÉRIFICATIONS POST-MIGRATION
-- ============================================================================
-- Requêtes de vérification (commentées, à exécuter manuellement si besoin)
-- ============================================================================

-- Vérifier les assignations org_unit de Joel
-- SELECT * FROM poc_org_unit_members WHERE user_id = '5020b356-7281-4007-bec6-30a956b8a347';

-- Tester la fonction get_user_role_in_company
-- SELECT get_user_role_in_company('5020b356-7281-4007-bec6-30a956b8a347', 'c0000002-0002-0002-0002-000000000002');

-- Tester la vue masquée (doit retourner NULL pour subtotal/total si chef_equipe)
-- SELECT id, order_number, subtotal, total FROM poc_purchase_orders_masked LIMIT 5;

-- Vérifier les seuils créés
-- SELECT * FROM poc_price_thresholds;

-- Vérifier les tables créées
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'poc_%' ORDER BY table_name;









