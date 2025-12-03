# Guide de Migration - POC Construction Marketplace

**Agent 1: Database Architecture Design**  
**Date:** 2025-01-XX  
**Version:** 1.0.0

## 📋 Vue d'ensemble

Ce guide décrit la procédure complète pour appliquer le schéma de base de données du module POC Construction Marketplace dans Supabase.

## ⚠️ Précautions Importantes

1. **Isolation complète**: Toutes les tables utilisent le préfixe `poc_` pour éviter tout conflit avec les tables existantes de BazarKELY.
2. **Aucune modification des tables existantes**: Ce schéma n'affecte PAS les tables `users`, `accounts`, `transactions`, `budgets`, `goals`, etc.
3. **Backup recommandé**: Avant d'appliquer, effectuer un backup complet de la base de données Supabase.

## 📦 Structure du Schéma

### Tables créées (10 tables)

1. `poc_companies` - Compagnies (Suppliers + Builders)
2. `poc_company_members` - Membres des compagnies avec 7 rôles
3. `poc_product_categories` - Catégories de produits (hiérarchique)
4. `poc_products` - Catalogue de produits (créés par suppliers)
5. `poc_projects` - Projets de construction (créés par builders)
6. `poc_purchase_orders` - Commandes d'achat avec workflow à 3 niveaux
7. `poc_purchase_order_items` - Items des commandes (avec snapshot produits)
8. `poc_purchase_order_workflow_history` - Historique des transitions de workflow
9. `poc_inventory_items` - Inventaire des builders (stock manuel)
10. `poc_stock_movements` - Mouvements de stock (entrées/sorties/ajustements)

### Types énumérés créés (8 types)

- `poc_company_type`: 'supplier' | 'builder'
- `poc_company_status`: 'pending' | 'approved' | 'rejected' | 'suspended'
- `poc_member_role`: 'admin' | 'direction' | 'resp_finance' | 'magasinier' | 'logistique' | 'chef_chantier' | 'chef_equipe'
- `poc_member_status`: 'active' | 'inactive' | 'pending'
- `poc_project_status`: 'active' | 'completed' | 'on_hold' | 'cancelled'
- `poc_order_status`: 17 statuts du workflow
- `poc_stock_movement_type`: 'entry' | 'exit' | 'adjustment'
- `poc_stock_reference_type`: 'purchase_order' | 'manual_entry' | 'inventory_adjustment' | 'delivery' | 'other'

### Indexes créés (30+ indexes)

Indexes sur toutes les clés étrangères et champs fréquemment interrogés pour optimiser les performances.

### Politiques RLS créées (30+ policies)

Politiques Row Level Security complètes pour garantir l'isolation multi-tenant et la sécurité des données.

## 🚀 Procédure d'Application

### Option 1: Via Supabase Dashboard (Recommandé)

1. **Accéder à Supabase Dashboard**
   - Ouvrir le projet BazarKELY dans Supabase
   - Aller dans l'onglet "SQL Editor"

2. **Exécuter le schéma**
   - Copier le contenu de `database/poc-construction-marketplace-schema.sql`
   - Coller dans l'éditeur SQL
   - Exécuter le script (bouton "Run" ou `Ctrl+Enter`)

3. **Vérifier l'application**
   - Aller dans l'onglet "Table Editor"
   - Vérifier que les 10 tables `poc_*` sont présentes
   - Vérifier que les types énumérés sont créés

### Option 2: Via CLI Supabase

```bash
# Installer Supabase CLI (si nécessaire)
npm install -g supabase

# Se connecter au projet
supabase login

# Lier le projet local au projet Supabase distant
supabase link --project-ref <your-project-ref>

# Appliquer la migration
supabase db push --file database/poc-construction-marketplace-schema.sql
```

### Option 3: Via Script SQL Direct

```bash
# Utiliser psql ou un client PostgreSQL
psql -h <supabase-host> -U postgres -d postgres -f database/poc-construction-marketplace-schema.sql
```

## ✅ Vérification Post-Migration

### 1. Vérifier les tables

```sql
-- Lister toutes les tables poc_
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'poc_%'
ORDER BY table_name;
```

**Résultat attendu:** 10 tables listées.

### 2. Vérifier les types énumérés

```sql
-- Lister tous les types poc_
SELECT typname 
FROM pg_type 
WHERE typname LIKE 'poc_%'
ORDER BY typname;
```

**Résultat attendu:** 8 types listés.

### 3. Vérifier les indexes

```sql
-- Lister les indexes sur les tables poc_
SELECT 
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 'poc_%'
ORDER BY tablename, indexname;
```

**Résultat attendu:** 30+ indexes listés.

### 4. Vérifier les politiques RLS

```sql
-- Lister les politiques RLS
SELECT 
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 'poc_%'
ORDER BY tablename, policyname;
```

**Résultat attendu:** 30+ politiques listées.

### 5. Vérifier les triggers

```sql
-- Lister les triggers
SELECT 
  trigger_name,
  event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table LIKE 'poc_%'
ORDER BY event_object_table, trigger_name;
```

**Résultat attendu:** 8 triggers listés.

### 6. Test de création de données

```sql
-- Test 1: Créer une compagnie (supplier)
INSERT INTO public.poc_companies (
  name, type, status, created_by
) VALUES (
  'Test Supplier',
  'supplier',
  'pending',
  auth.uid()
);

-- Test 2: Vérifier que la compagnie est créée
SELECT * FROM public.poc_companies WHERE name = 'Test Supplier';

-- Nettoyer le test
DELETE FROM public.poc_companies WHERE name = 'Test Supplier';
```

## 🔄 Rollback (Si nécessaire)

En cas de problème, utiliser le script de rollback:

```sql
-- Via Supabase Dashboard SQL Editor
-- Copier/coller le contenu de database/poc-construction-marketplace-rollback.sql
-- Exécuter le script
```

**⚠️ ATTENTION:** Le rollback supprime TOUTES les données du module POC.

## 📊 Statistiques du Schéma

- **Tables:** 10
- **Types énumérés:** 8
- **Indexes:** 30+
- **Politiques RLS:** 30+
- **Triggers:** 8
- **Fonctions:** 2
- **Complexité estimée:** **Moyenne à Haute**

## 🔐 Sécurité Multi-Tenant

Le schéma implémente une sécurité multi-tenant complète via RLS:

- **Isolation par compagnie:** Chaque compagnie ne voit que ses propres données
- **Rôles et permissions:** 7 rôles avec permissions granulaires
- **Admin Joel:** Accès complet pour approbation et gestion
- **Workflow sécurisé:** Validation à 3 niveaux avec audit trail complet

## 🎯 Workflow de Validation

Le workflow de commande d'achat suit ce flux:

1. **Chef Equipe** crée la commande (draft)
2. **Chef Chantier** valide (pending_site_manager → approved_site_manager)
3. **Direction** valide (pending_management → approved_management)
4. **Supplier** reçoit et traite (submitted_to_supplier → accepted_supplier)
5. Livraison (in_transit → delivered → completed)

**15+ statuts** supportés avec transitions enregistrées dans l'historique.

## 📝 Notes Techniques

### Contraintes de validation

- Les compagnies doivent être de type 'supplier' ou 'builder'
- Les produits ne peuvent être créés que par des suppliers
- Les projets ne peuvent être créés que par des builders
- Les commandes nécessitent un buyer (builder) et un supplier
- Les stocks sont gérés uniquement par les builders

### Performance

- Indexes sur toutes les clés étrangères
- Indexes composites pour les requêtes fréquentes
- Indexes partiels pour les colonnes actives/inactives

### Historique et Audit

- Toutes les transitions de workflow sont enregistrées
- Timestamps automatiques via triggers
- Snapshot des produits dans les commandes (pour historique)

## 🐛 Dépannage

### Erreur: "type already exists"

Certains types peuvent déjà exister. Solution: Supprimer les types existants avant de réappliquer.

```sql
DROP TYPE IF EXISTS poc_company_type CASCADE;
-- Répéter pour tous les types
```

### Erreur: "permission denied"

Vérifier que l'utilisateur a les permissions nécessaires:
- `CREATE TABLE`
- `CREATE TYPE`
- `CREATE TRIGGER`
- `CREATE FUNCTION`

### Erreur: "foreign key constraint"

Vérifier que la table `users` existe et est accessible. Le schéma référence `auth.users` et `public.users`.

## 📞 Support

En cas de problème lors de la migration:
1. Vérifier les logs Supabase
2. Consulter la section "Dépannage" ci-dessus
3. Vérifier que toutes les dépendances sont présentes

---

**AGENT-1-DATABASE-ARCHITECTURE-COMPLETE**

**Tables créées:** 10  
**Complexité estimée:** Moyenne à Haute  
**Statut:** ✅ Prêt pour déploiement





