-- ============================================================================
-- PHASE 2: IMPLÉMENTATION STRUCTURE ORGANISATIONNELLE
-- BazarKELY Construction POC - Agent 01 Database Implementation
-- Date: 2025-11-09
-- ============================================================================
-- Description:
-- - Création de la table poc_org_units (unités organisationnelles)
-- - Création de la table poc_org_unit_members (jonction user ↔ org_unit)
-- - Ajout de order_type et org_unit_id à poc_purchase_orders
-- - Peuplement de 10 unités organisationnelles (Direction + 3 Services + 7 Équipes)
-- - Migration des 27 commandes existantes vers type BCE
-- - Création des politiques RLS pour poc_org_unit_members
-- ============================================================================

-- ============================================================================
-- SCRIPT 1: INVESTIGATION DU SCHÉMA ACTUEL
-- ============================================================================
-- Vérifier l'état actuel des tables avant modifications
-- ============================================================================

-- Vérifier les colonnes de poc_purchase_orders
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'poc_purchase_orders'
ORDER BY ordinal_position;

-- Vérifier si poc_org_units existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'poc_org_units'
) AS poc_org_units_exists;

-- Vérifier si poc_org_unit_members existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'poc_org_unit_members'
) AS poc_org_unit_members_exists;

-- Compter les commandes existantes
SELECT COUNT(*) AS existing_orders_count 
FROM public.poc_purchase_orders;

-- Vérifier la compagnie BTP Construction Mada
SELECT id, name, type 
FROM public.poc_companies 
WHERE id = 'c0000002-0002-0002-0002-000000000002';

-- ============================================================================
-- SCRIPT 2A: CRÉATION DE LA TABLE poc_org_units (si elle n'existe pas)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.poc_org_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.poc_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('department', 'team')),
  code TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.poc_org_units(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Contrainte: le company_id doit être un builder
  CONSTRAINT check_org_unit_builder_type CHECK (
    EXISTS (
      SELECT 1 FROM public.poc_companies
      WHERE id = company_id AND type = 'builder'
    )
  ),
  -- Contrainte: éviter les boucles dans la hiérarchie
  CONSTRAINT check_no_self_parent CHECK (id != parent_id),
  -- Unicité du code par compagnie
  CONSTRAINT unique_company_code UNIQUE (company_id, code)
);

COMMENT ON TABLE public.poc_org_units IS 'Unités organisationnelles (départements et équipes) des builders';
COMMENT ON COLUMN public.poc_org_units.type IS 'Type: department (Service) ou team (Équipe)';
COMMENT ON COLUMN public.poc_org_units.code IS 'Code unique de l''unité (ex: DG, ACHAT, TECH, etc.)';
COMMENT ON COLUMN public.poc_org_units.parent_id IS 'Référence à l''unité parent (NULL pour Direction Générale)';

-- Indexes pour poc_org_units
CREATE INDEX IF NOT EXISTS idx_poc_org_units_company_id ON public.poc_org_units(company_id);
CREATE INDEX IF NOT EXISTS idx_poc_org_units_parent_id ON public.poc_org_units(parent_id);
CREATE INDEX IF NOT EXISTS idx_poc_org_units_type ON public.poc_org_units(type);
CREATE INDEX IF NOT EXISTS idx_poc_org_units_code ON public.poc_org_units(code);
CREATE INDEX IF NOT EXISTS idx_poc_org_units_active ON public.poc_org_units(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_poc_org_units_company_active ON public.poc_org_units(company_id, is_active) WHERE is_active = true;

-- ============================================================================
-- SCRIPT 2B: CRÉATION DE LA TABLE poc_org_unit_members (jonction)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.poc_org_unit_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_unit_id UUID NOT NULL REFERENCES public.poc_org_units(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('chef_equipe', 'chef_chantier', 'direction')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Unicité: un utilisateur ne peut être membre qu'une seule fois par unité
  CONSTRAINT unique_org_unit_user UNIQUE (org_unit_id, user_id)
);

COMMENT ON TABLE public.poc_org_unit_members IS 'Membres des unités organisationnelles (jonction user ↔ org_unit)';
COMMENT ON COLUMN public.poc_org_unit_members.role IS 'Rôle dans l''unité: chef_equipe, chef_chantier, ou direction';
COMMENT ON COLUMN public.poc_org_unit_members.status IS 'Statut: active, inactive, pending';

-- Indexes pour poc_org_unit_members
CREATE INDEX IF NOT EXISTS idx_poc_org_unit_members_org_unit_id ON public.poc_org_unit_members(org_unit_id);
CREATE INDEX IF NOT EXISTS idx_poc_org_unit_members_user_id ON public.poc_org_unit_members(user_id);
CREATE INDEX IF NOT EXISTS idx_poc_org_unit_members_role ON public.poc_org_unit_members(role);
CREATE INDEX IF NOT EXISTS idx_poc_org_unit_members_status ON public.poc_org_unit_members(status);
CREATE INDEX IF NOT EXISTS idx_poc_org_unit_members_org_unit_status ON public.poc_org_unit_members(org_unit_id, status) WHERE status = 'active';

-- Trigger pour updated_at
CREATE TRIGGER update_poc_org_unit_members_updated_at
  BEFORE UPDATE ON public.poc_org_unit_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_poc_org_units_updated_at
  BEFORE UPDATE ON public.poc_org_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- SCRIPT 2C: MODIFICATION DE poc_purchase_orders
-- ============================================================================

-- Ajouter la colonne order_type
ALTER TABLE public.poc_purchase_orders 
ADD COLUMN IF NOT EXISTS order_type TEXT CHECK (order_type IN ('BCI', 'BCE'));

-- Ajouter la colonne org_unit_id
ALTER TABLE public.poc_purchase_orders 
ADD COLUMN IF NOT EXISTS org_unit_id UUID REFERENCES public.poc_org_units(id) ON DELETE SET NULL;

-- Ajouter des indexes
CREATE INDEX IF NOT EXISTS idx_poc_purchase_orders_order_type ON public.poc_purchase_orders(order_type);
CREATE INDEX IF NOT EXISTS idx_poc_purchase_orders_org_unit_id ON public.poc_purchase_orders(org_unit_id) WHERE org_unit_id IS NOT NULL;

-- Ajouter un commentaire explicatif
COMMENT ON COLUMN public.poc_purchase_orders.order_type IS 'Type de commande: BCI (Bon de Commande Interne) avec org_unit_id, BCE (Bon de Commande Externe) avec project_id uniquement';
COMMENT ON COLUMN public.poc_purchase_orders.org_unit_id IS 'Unité organisationnelle pour les commandes BCI (NULL pour les commandes BCE)';

-- ============================================================================
-- SCRIPT 3: PEUPLEMENT DES UNITÉS ORGANISATIONNELLES
-- ============================================================================
-- Structure: Direction Générale → 3 Services → 7 Équipes
-- Company: BTP Construction Mada (c0000002-0002-0002-0002-000000000002)
-- ============================================================================

-- UUID de la compagnie BTP Construction Mada
DO $$
DECLARE
  v_company_id UUID := 'c0000002-0002-0002-0002-000000000002';
  v_created_by UUID; -- Sera défini avec auth.uid() ou un utilisateur admin
  v_dg_id UUID;
  v_achat_id UUID;
  v_tech_id UUID;
  v_admin_id UUID;
BEGIN
  -- Récupérer un utilisateur admin pour created_by (ou utiliser auth.uid() si disponible)
  SELECT id INTO v_created_by 
  FROM public.users 
  WHERE role = 'admin' 
  LIMIT 1;
  
  -- Si aucun admin trouvé, utiliser le premier utilisateur de la compagnie
  IF v_created_by IS NULL THEN
    SELECT user_id INTO v_created_by
    FROM public.poc_company_members
    WHERE company_id = v_company_id
    LIMIT 1;
  END IF;
  
  -- Si toujours NULL, utiliser un UUID par défaut (à remplacer manuellement)
  IF v_created_by IS NULL THEN
    v_created_by := '5020b356-7281-4007-bec6-30a956b8a347'; -- Joel UUID par défaut
  END IF;

  -- Niveau 1: Direction Générale
  INSERT INTO public.poc_org_units (
    id, company_id, name, type, code, description, parent_id, is_active, created_by
  ) VALUES (
    gen_random_uuid(),
    v_company_id,
    'Direction Générale',
    'department',
    'DG',
    'Direction Générale de BTP Construction Mada',
    NULL,
    true,
    v_created_by
  ) RETURNING id INTO v_dg_id;

  -- Niveau 2: Service Achats
  INSERT INTO public.poc_org_units (
    id, company_id, name, type, code, description, parent_id, is_active, created_by
  ) VALUES (
    gen_random_uuid(),
    v_company_id,
    'Service Achats',
    'department',
    'ACHAT',
    'Service des Achats et Approvisionnements',
    v_dg_id,
    true,
    v_created_by
  ) RETURNING id INTO v_achat_id;

  -- Niveau 2: Service Technique
  INSERT INTO public.poc_org_units (
    id, company_id, name, type, code, description, parent_id, is_active, created_by
  ) VALUES (
    gen_random_uuid(),
    v_company_id,
    'Service Technique',
    'department',
    'TECH',
    'Service Technique et Chantiers',
    v_dg_id,
    true,
    v_created_by
  ) RETURNING id INTO v_tech_id;

  -- Niveau 2: Service Administratif
  INSERT INTO public.poc_org_units (
    id, company_id, name, type, code, description, parent_id, is_active, created_by
  ) VALUES (
    gen_random_uuid(),
    v_company_id,
    'Service Administratif',
    'department',
    'ADMIN',
    'Service Administratif et Support',
    v_dg_id,
    true,
    v_created_by
  ) RETURNING id INTO v_admin_id;

  -- Niveau 3: Équipe Approvisionnement (sous Service Achats)
  INSERT INTO public.poc_org_units (
    id, company_id, name, type, code, description, parent_id, is_active, created_by
  ) VALUES (
    gen_random_uuid(),
    v_company_id,
    'Équipe Approvisionnement',
    'team',
    'APPRO',
    'Équipe chargée de l''approvisionnement en matériaux',
    v_achat_id,
    true,
    v_created_by
  );

  -- Niveau 3: Équipe Logistique (sous Service Achats)
  INSERT INTO public.poc_org_units (
    id, company_id, name, type, code, description, parent_id, is_active, created_by
  ) VALUES (
    gen_random_uuid(),
    v_company_id,
    'Équipe Logistique',
    'team',
    'LOGI',
    'Équipe chargée de la logistique et du transport',
    v_achat_id,
    true,
    v_created_by
  );

  -- Niveau 3: Équipe Chantier Site A (sous Service Technique)
  INSERT INTO public.poc_org_units (
    id, company_id, name, type, code, description, parent_id, is_active, created_by
  ) VALUES (
    gen_random_uuid(),
    v_company_id,
    'Équipe Chantier Site A',
    'team',
    'SITE-A',
    'Équipe de chantier pour le Site A',
    v_tech_id,
    true,
    v_created_by
  );

  -- Niveau 3: Équipe Chantier Site B (sous Service Technique)
  INSERT INTO public.poc_org_units (
    id, company_id, name, type, code, description, parent_id, is_active, created_by
  ) VALUES (
    gen_random_uuid(),
    v_company_id,
    'Équipe Chantier Site B',
    'team',
    'SITE-B',
    'Équipe de chantier pour le Site B',
    v_tech_id,
    true,
    v_created_by
  );

  -- Niveau 3: Équipe Maintenance (sous Service Technique)
  INSERT INTO public.poc_org_units (
    id, company_id, name, type, code, description, parent_id, is_active, created_by
  ) VALUES (
    gen_random_uuid(),
    v_company_id,
    'Équipe Maintenance',
    'team',
    'MAINT',
    'Équipe chargée de la maintenance des équipements',
    v_tech_id,
    true,
    v_created_by
  );

  -- Niveau 3: Équipe Comptabilité (sous Service Administratif)
  INSERT INTO public.poc_org_units (
    id, company_id, name, type, code, description, parent_id, is_active, created_by
  ) VALUES (
    gen_random_uuid(),
    v_company_id,
    'Équipe Comptabilité',
    'team',
    'COMPTA',
    'Équipe chargée de la comptabilité et finances',
    v_admin_id,
    true,
    v_created_by
  );

  -- Niveau 3: Équipe RH (sous Service Administratif)
  INSERT INTO public.poc_org_units (
    id, company_id, name, type, code, description, parent_id, is_active, created_by
  ) VALUES (
    gen_random_uuid(),
    v_company_id,
    'Équipe RH',
    'team',
    'RH',
    'Équipe chargée des ressources humaines',
    v_admin_id,
    true,
    v_created_by
  );

  RAISE NOTICE '10 unités organisationnelles créées avec succès';
END $$;

-- ============================================================================
-- SCRIPT 4: MIGRATION DES 27 COMMANDES EXISTANTES
-- ============================================================================
-- Marquer toutes les commandes existantes comme BCE (Bon de Commande Externe)
-- avec org_unit_id = NULL (elles utilisent project_id pour la traçabilité)
-- ============================================================================

UPDATE public.poc_purchase_orders
SET 
  order_type = 'BCE',
  org_unit_id = NULL
WHERE order_type IS NULL;

-- Vérification: compter les commandes migrées
SELECT 
  order_type,
  COUNT(*) AS count,
  COUNT(CASE WHEN org_unit_id IS NULL THEN 1 END) AS with_null_org_unit,
  COUNT(CASE WHEN project_id IS NOT NULL THEN 1 END) AS with_project_id
FROM public.poc_purchase_orders
GROUP BY order_type;

-- ============================================================================
-- SCRIPT 5: POLITIQUES RLS POUR poc_org_unit_members
-- ============================================================================

-- Activer RLS sur poc_org_units et poc_org_unit_members
ALTER TABLE public.poc_org_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poc_org_unit_members ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- RLS Policies pour poc_org_units
-- ----------------------------------------------------------------------------

-- SELECT: Les membres de la compagnie peuvent voir les unités de leur compagnie
CREATE POLICY "poc_org_units_select_company_member"
  ON public.poc_org_units FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.poc_company_members
      WHERE company_id = poc_org_units.company_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- INSERT: Seuls les membres admin/direction peuvent créer des unités
CREATE POLICY "poc_org_units_insert_admin_direction"
  ON public.poc_org_units FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.poc_company_members
      WHERE company_id = poc_org_units.company_id
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

-- UPDATE: Seuls les membres admin/direction peuvent modifier
CREATE POLICY "poc_org_units_update_admin_direction"
  ON public.poc_org_units FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.poc_company_members
      WHERE company_id = poc_org_units.company_id
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

-- DELETE: Seuls les membres admin/direction peuvent supprimer
CREATE POLICY "poc_org_units_delete_admin_direction"
  ON public.poc_org_units FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.poc_company_members
      WHERE company_id = poc_org_units.company_id
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
-- RLS Policies pour poc_org_unit_members
-- ----------------------------------------------------------------------------

-- SELECT: Les utilisateurs peuvent voir les membres des unités où ils sont membres
-- ou les membres des unités de leur compagnie s'ils sont admin/direction
CREATE POLICY "poc_org_unit_members_select_member_or_admin"
  ON public.poc_org_unit_members FOR SELECT
  USING (
    -- Membre de l'unité
    EXISTS (
      SELECT 1 FROM public.poc_org_unit_members oum2
      WHERE oum2.org_unit_id = poc_org_unit_members.org_unit_id
        AND oum2.user_id = auth.uid()
        AND oum2.status = 'active'
    )
    OR
    -- Admin ou direction de la compagnie
    EXISTS (
      SELECT 1 FROM public.poc_org_units ou
      JOIN public.poc_company_members pcm ON pcm.company_id = ou.company_id
      WHERE ou.id = poc_org_unit_members.org_unit_id
        AND pcm.user_id = auth.uid()
        AND pcm.status = 'active'
        AND pcm.role IN ('admin', 'direction')
    )
    OR
    -- Admin Joel
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- INSERT: Seuls les admin/direction de la compagnie peuvent assigner des membres
CREATE POLICY "poc_org_unit_members_insert_admin_direction"
  ON public.poc_org_unit_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.poc_org_units ou
      JOIN public.poc_company_members pcm ON pcm.company_id = ou.company_id
      WHERE ou.id = poc_org_unit_members.org_unit_id
        AND pcm.user_id = auth.uid()
        AND pcm.status = 'active'
        AND pcm.role IN ('admin', 'direction')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- UPDATE: Seuls les admin/direction de la compagnie peuvent modifier
CREATE POLICY "poc_org_unit_members_update_admin_direction"
  ON public.poc_org_unit_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.poc_org_units ou
      JOIN public.poc_company_members pcm ON pcm.company_id = ou.company_id
      WHERE ou.id = poc_org_unit_members.org_unit_id
        AND pcm.user_id = auth.uid()
        AND pcm.status = 'active'
        AND pcm.role IN ('admin', 'direction')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- DELETE: Seuls les admin/direction de la compagnie peuvent supprimer
CREATE POLICY "poc_org_unit_members_delete_admin_direction"
  ON public.poc_org_unit_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.poc_org_units ou
      JOIN public.poc_company_members pcm ON pcm.company_id = ou.company_id
      WHERE ou.id = poc_org_unit_members.org_unit_id
        AND pcm.user_id = auth.uid()
        AND pcm.status = 'active'
        AND pcm.role IN ('admin', 'direction')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- SCRIPT 6: VÉRIFICATIONS POST-IMPLÉMENTATION
-- ============================================================================

-- Vérifier que les 10 unités ont été créées
SELECT 
  COUNT(*) AS total_units,
  COUNT(CASE WHEN type = 'department' THEN 1 END) AS departments,
  COUNT(CASE WHEN type = 'team' THEN 1 END) AS teams,
  COUNT(CASE WHEN parent_id IS NULL THEN 1 END) AS root_units
FROM public.poc_org_units
WHERE company_id = 'c0000002-0002-0002-0002-000000000002';

-- Vérifier la hiérarchie
SELECT 
  ou1.name AS unit_name,
  ou1.type,
  ou1.code,
  ou2.name AS parent_name,
  ou2.code AS parent_code
FROM public.poc_org_units ou1
LEFT JOIN public.poc_org_units ou2 ON ou1.parent_id = ou2.id
WHERE ou1.company_id = 'c0000002-0002-0002-0002-000000000002'
ORDER BY ou1.type DESC, ou2.code NULLS FIRST, ou1.code;

-- Vérifier que toutes les commandes sont migrées
SELECT 
  COUNT(*) AS total_orders,
  COUNT(CASE WHEN order_type = 'BCE' THEN 1 END) AS bce_orders,
  COUNT(CASE WHEN order_type = 'BCI' THEN 1 END) AS bci_orders,
  COUNT(CASE WHEN order_type IS NULL THEN 1 END) AS unmigrated_orders,
  COUNT(CASE WHEN org_unit_id IS NULL THEN 1 END) AS orders_with_null_org_unit
FROM public.poc_purchase_orders;

-- Vérifier les colonnes ajoutées à poc_purchase_orders
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'poc_purchase_orders'
  AND column_name IN ('order_type', 'org_unit_id');

-- Vérifier que la table poc_org_unit_members existe et est vide
SELECT 
  COUNT(*) AS total_members
FROM public.poc_org_unit_members;

-- Vérifier les politiques RLS créées
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('poc_org_units', 'poc_org_unit_members')
ORDER BY tablename, policyname;

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================









