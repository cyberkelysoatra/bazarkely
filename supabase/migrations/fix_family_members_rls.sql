-- ============================================================================
-- FIX: RLS Policy pour family_members - Permettre de voir TOUS les membres
-- ============================================================================
-- 
-- PROBLÈME IDENTIFIÉ:
-- Les utilisateurs ne voient que les AUTRES membres, pas eux-mêmes.
-- Cela suggère que la politique RLS SELECT actuelle filtre incorrectement.
--
-- HYPOTHÈSE:
-- La politique actuelle est probablement: "user_id = auth.uid()" 
-- (ne voit que sa propre ligne)
--
-- SOLUTION:
-- La politique doit permettre de voir TOUS les membres des groupes 
-- où l'utilisateur est membre actif.
-- ============================================================================

-- ÉTAPE 1: Vérifier les politiques RLS actuelles sur family_members
-- Exécuter cette requête dans Supabase SQL Editor pour voir les politiques existantes:
/*
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'family_members'
ORDER BY policyname;
*/

-- ÉTAPE 2: Supprimer les politiques SELECT existantes (si elles existent)
-- ATTENTION: Adaptez les noms de politiques selon ce que vous trouvez à l'étape 1
DROP POLICY IF EXISTS "family_members_select_own" ON public.family_members;
DROP POLICY IF EXISTS "family_members_select_member" ON public.family_members;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.family_members;
DROP POLICY IF EXISTS "Users can view their own family members" ON public.family_members;

-- ÉTAPE 3: Activer RLS sur family_members (si pas déjà activé)
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- ÉTAPE 4: Créer la politique SELECT CORRECTE
-- Cette politique permet à un utilisateur de voir TOUS les membres actifs
-- des groupes familiaux où il est lui-même membre actif
CREATE POLICY "family_members_select_group_members"
ON public.family_members
FOR SELECT
TO authenticated
USING (
    -- L'utilisateur peut voir tous les membres des groupes où il est membre
    EXISTS (
        SELECT 1
        FROM public.family_members AS user_membership
        WHERE user_membership.user_id = auth.uid()
          AND user_membership.family_group_id = family_members.family_group_id
          AND user_membership.is_active = true
    )
    AND is_active = true  -- Seulement les membres actifs
);

-- ÉTAPE 5: Vérifier que la politique fonctionne
-- Testez avec cette requête (remplacez 'GROUP_ID' par un ID réel):
/*
-- En tant qu'utilisateur authentifié, cette requête devrait retourner
-- TOUS les membres actifs du groupe, y compris l'utilisateur actuel
SELECT 
    id,
    family_group_id,
    user_id,
    display_name,
    role,
    is_active,
    CASE 
        WHEN user_id = auth.uid() THEN '(Vous)'
        ELSE ''
    END AS is_current_user
FROM public.family_members
WHERE family_group_id = 'GROUP_ID'
  AND is_active = true
ORDER BY 
    CASE WHEN role = 'admin' THEN 0 ELSE 1 END,
    joined_at;
*/

-- ============================================================================
-- NOTES IMPORTANTES:
-- ============================================================================
-- 1. Cette politique permet à un utilisateur de voir TOUS les membres
--    des groupes où il est membre, y compris lui-même.
--
-- 2. La condition EXISTS vérifie que l'utilisateur est membre actif
--    du même groupe (family_group_id) que les membres qu'il veut voir.
--
-- 3. La condition is_active = true garantit qu'on ne voit que les
--    membres actifs (pas ceux qui ont quitté le groupe).
--
-- 4. Si vous avez d'autres politiques pour INSERT/UPDATE/DELETE, gardez-les
--    et ajoutez seulement cette politique SELECT.
-- ============================================================================


