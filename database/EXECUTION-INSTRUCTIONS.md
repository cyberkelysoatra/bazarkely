# 📋 INSTRUCTIONS D'EXÉCUTION - SCHÉMA POC CONSTRUCTION CORRIGÉ

**Fichier à exécuter:** `poc-construction-marketplace-schema-fixed.sql`  
**Plateforme:** Supabase SQL Editor  
**Date:** 2025-01-21

---

## 🚀 ÉTAPE 1: EXÉCUTION DU SCHÉMA

### **Méthode 1: Via Supabase Dashboard (Recommandé)**

1. Ouvrir le **Supabase Dashboard**
2. Aller dans **SQL Editor** (menu de gauche)
3. Cliquer sur **New Query**
4. Ouvrir le fichier `database/poc-construction-marketplace-schema-fixed.sql`
5. Copier tout le contenu (Ctrl+A, Ctrl+C)
6. Coller dans l'éditeur SQL (Ctrl+V)
7. Cliquer sur **Run** ou appuyer sur **Ctrl+Enter**

### **Méthode 2: Via CLI Supabase (Alternative)**

```bash
# Si vous utilisez Supabase CLI
supabase db reset
psql -h [your-supabase-host] -U postgres -d postgres -f database/poc-construction-marketplace-schema-fixed.sql
```

---

## ✅ ÉTAPE 2: VÉRIFICATION DE L'EXÉCUTION

### **Vérification rapide**

Après exécution, vous devriez voir :
- ✅ **Success** dans le résultat
- ✅ Aucune erreur dans les logs
- ✅ Message de confirmation

### **Vérification détaillée**

Exécuter ces requêtes dans l'ordre :

#### **Test 1: Vérifier les tables créées**

```sql
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = t.table_name AND table_schema = 'public') AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name LIKE 'poc_%'
ORDER BY table_name;
```

**Résultat attendu:** 10 tables avec leurs colonnes

---

#### **Test 2: Vérifier qu'aucun CHECK constraint invalide n'existe**

```sql
SELECT 
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE contype = 'c' 
  AND conrelid::regclass::text LIKE 'poc_%'
  AND (
    pg_get_constraintdef(oid) LIKE '%EXISTS%' OR
    pg_get_constraintdef(oid) LIKE '%IN (SELECT%' OR
    (pg_get_constraintdef(oid) LIKE '%SELECT%' 
     AND pg_get_constraintdef(oid) NOT LIKE '%CHECK (quantity > 0)%')
  );
```

**Résultat attendu:** **0 lignes** (aucun CHECK constraint avec subquery)

---

#### **Test 3: Vérifier les triggers de validation**

```sql
SELECT 
  trigger_name,
  event_object_table AS table_name,
  action_timing,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE 'validate_%'
ORDER BY trigger_name;
```

**Résultat attendu:** 6 triggers de validation

---

#### **Test 4: Vérifier les fonctions de validation**

```sql
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'validate_%'
ORDER BY routine_name;
```

**Résultat attendu:** 6 fonctions de validation

---

#### **Test 5: Test d'intégrité des données**

```sql
-- Créer des données de test
DO $$
DECLARE
  supplier_id_val UUID;
  builder_id_val UUID;
BEGIN
  -- Créer un supplier
  INSERT INTO public.poc_companies (name, type, status, created_by)
  VALUES ('Test Supplier Company', 'supplier', 'approved', auth.uid())
  RETURNING id INTO supplier_id_val;
  
  -- Créer un builder
  INSERT INTO public.poc_companies (name, type, status, created_by)
  VALUES ('Test Builder Company', 'builder', 'approved', auth.uid())
  RETURNING id INTO builder_id_val;
  
  -- Test: Créer un produit avec supplier_id valide (devrait réussir)
  INSERT INTO public.poc_products (
    supplier_id, 
    name, 
    current_price, 
    created_by
  )
  VALUES (
    supplier_id_val,
    'Test Product Valid',
    1000.00,
    auth.uid()
  );
  
  RAISE NOTICE 'Test réussi: Produit créé avec supplier_id valide';
  
  -- Test: Essayer de créer un produit avec builder_id (devrait échouer)
  BEGIN
    INSERT INTO public.poc_products (
      supplier_id, 
      name, 
      current_price, 
      created_by
    )
    VALUES (
      builder_id_val,
      'Test Product Invalid',
      1000.00,
      auth.uid()
    );
    RAISE EXCEPTION 'ERREUR: Le trigger n a pas fonctionné - produit invalide créé';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%supplier_id must reference a company of type ''supplier''%' THEN
        RAISE NOTICE 'Test réussi: Trigger a rejeté le produit invalide';
      ELSE
        RAISE;
      END IF;
  END;
  
END $$;
```

**Résultat attendu:** 
- ✅ Produit valide créé avec succès
- ✅ Produit invalide rejeté par le trigger

---

## 🔍 VÉRIFICATIONS SUPPLÉMENTAIRES

### **Vérifier les CHECK constraints valides**

```sql
SELECT 
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE contype = 'c' 
  AND conrelid::regclass::text LIKE 'poc_%'
ORDER BY conrelid::regclass, conname;
```

**Résultat attendu:** 6 CHECK constraints (tous sans subqueries)

---

### **Vérifier les FOREIGN KEY constraints**

```sql
SELECT 
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE contype = 'f' 
  AND conrelid::regclass::text LIKE 'poc_%'
ORDER BY conrelid::regclass, conname;
```

**Résultat attendu:** Tous les FOREIGN KEY constraints présents

---

### **Vérifier les RLS policies**

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 'poc_%'
ORDER BY tablename, policyname;
```

**Résultat attendu:** Toutes les RLS policies présentes

---

## ⚠️ DÉPANNAGE

### **Erreur: "type already exists"**

Si vous obtenez une erreur indiquant qu'un type ENUM existe déjà :

```sql
-- Option 1: Supprimer et recréer (ATTENTION: Perte de données)
DROP TYPE IF EXISTS poc_company_type CASCADE;
-- Puis réexécuter le schéma

-- Option 2: Utiliser IF NOT EXISTS (déjà dans le schéma corrigé)
-- Le schéma utilise CREATE TYPE IF NOT EXISTS, donc cette erreur ne devrait pas survenir
```

### **Erreur: "table already exists"**

Le schéma utilise `CREATE TABLE IF NOT EXISTS`, donc les tables existantes ne seront pas recréées. Si vous voulez forcer la recréation :

```sql
-- ATTENTION: Cela supprimera toutes les données
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
-- Puis réexécuter le schéma
```

### **Erreur: "trigger already exists"**

Le schéma utilise `DROP TRIGGER IF EXISTS` avant de créer les triggers, donc cette erreur ne devrait pas survenir.

---

## 📊 RÉSULTAT ATTENDU

Après exécution réussie, vous devriez avoir :

- ✅ **10 tables** créées avec toutes leurs colonnes
- ✅ **6 triggers de validation** actifs
- ✅ **6 fonctions de validation** créées
- ✅ **6 CHECK constraints valides** (sans subqueries)
- ✅ **0 CHECK constraints invalides** (avec subqueries)
- ✅ **Toutes les RLS policies** activées
- ✅ **Tous les indexes** créés
- ✅ **Tous les ENUMs** créés

---

## 🎯 PROCHAINES ÉTAPES

Une fois le schéma exécuté avec succès :

1. ✅ Vérifier que les services POC peuvent se connecter
2. ✅ Tester les opérations CRUD de base
3. ✅ Vérifier que les triggers de validation fonctionnent
4. ✅ Tester les RLS policies avec différents utilisateurs
5. ✅ Intégrer avec les composants React UI créés

---

**Statut:** ✅ Prêt pour exécution  
**Compatibilité:** PostgreSQL 15+ (Supabase)  
**Version:** 1.0.1 (Fixed)





