# 🔍 Diagnostic et Correction RLS pour family_members

## 📋 Problème Identifié

**Symptôme:** Chaque utilisateur ne voit que les **AUTRES** membres du groupe, pas lui-même.
- Admin voit seulement "Ivana (Membre)" = 1 membre
- Ivana voit seulement "Admin (Administrateur)" = 1 membre
- **Attendu:** Chaque utilisateur devrait voir **TOUS** les membres, y compris lui-même (2 membres)

## 🔎 Analyse

### Code Frontend ✅
Le code TypeScript dans `familyGroupService.ts` est **correct**:
```typescript
// Ligne 420-426: Récupère TOUS les membres actifs
const { data: members, error: membersError } = await supabase
  .from('family_members')
  .select('*')
  .eq('family_group_id', groupId)
  .eq('is_active', true)
  .order('joined_at', { ascending: true });
```

**Aucun filtre** n'exclut l'utilisateur actuel dans le code frontend.

### Politique RLS ❌ (Hypothèse)
Le problème vient probablement d'une **politique RLS (Row Level Security)** incorrecte dans Supabase.

**Politique INCORRECTE (probable):**
```sql
-- ❌ MAUVAISE: Ne voit que sa propre ligne
CREATE POLICY "family_members_select_own"
ON public.family_members
FOR SELECT
USING (user_id = auth.uid());
```

Cette politique limite les résultats à `user_id = auth.uid()`, donc l'utilisateur ne voit que sa propre ligne, pas les autres membres du groupe.

## ✅ Solution

### Politique RLS CORRECTE

La politique doit permettre à un utilisateur de voir **TOUS les membres actifs** des groupes où il est membre:

```sql
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
```

### Explication de la Politique

1. **Condition EXISTS**: Vérifie que l'utilisateur actuel (`auth.uid()`) est membre actif du même groupe (`family_group_id`) que les membres qu'il veut voir.

2. **Condition is_active = true**: Garantit qu'on ne voit que les membres actifs (pas ceux qui ont quitté le groupe).

3. **Résultat**: L'utilisateur voit **TOUS** les membres actifs des groupes où il est membre, **y compris lui-même**.

## 🛠️ Instructions de Correction

### Étape 1: Vérifier les Politiques Actuelles

Exécutez cette requête dans **Supabase SQL Editor**:

```sql
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
```

Cela vous montrera toutes les politiques RLS existantes sur `family_members`.

### Étape 2: Appliquer la Correction

Utilisez le script SQL fourni: `supabase/migrations/fix_family_members_rls.sql`

Ce script:
1. ✅ Supprime les politiques SELECT incorrectes
2. ✅ Active RLS sur `family_members` (si pas déjà activé)
3. ✅ Crée la politique SELECT correcte

### Étape 3: Tester

Après avoir appliqué la correction, testez avec cette requête:

```sql
-- Remplacez 'GROUP_ID' par un ID réel de groupe
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
```

**Résultat attendu:**
- Admin devrait voir: "Admin (Vous)" + "Ivana (Membre)" = 2 membres
- Ivana devrait voir: "Admin (Administrateur)" + "Ivana (Vous)" = 2 membres

## 📝 Notes Importantes

1. **Ne supprimez PAS** les politiques INSERT/UPDATE/DELETE si elles existent. Seule la politique SELECT doit être corrigée.

2. **Vérifiez** que RLS est activé sur `family_members`:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename = 'family_members';
   ```

3. **Si vous avez plusieurs politiques SELECT**, supprimez-les toutes avant de créer la nouvelle.

## 🔗 Fichiers Créés

- `supabase/migrations/fix_family_members_rls.sql` - Script de correction complet
- `FAMILY-MEMBERS-RLS-FIX.md` - Ce document

## ✅ Résultat Final

Après correction:
- ✅ Chaque utilisateur voit **TOUS** les membres de ses groupes
- ✅ L'utilisateur actuel est marqué "(Vous)" dans l'interface
- ✅ Le compteur de membres affiche le bon nombre (2 au lieu de 1)
- ✅ Les admins voient tous les membres, y compris eux-mêmes



