# Phase 2: Implémentation Structure Organisationnelle

## 📋 Vue d'ensemble

Ce document décrit l'implémentation de la Phase 2 du module Construction POC, qui ajoute la gestion de la structure organisationnelle avec des unités (départements et équipes) et permet de distinguer les commandes internes (BCI) des commandes externes (BCE).

## 🎯 Objectifs

1. ✅ Créer la table `poc_org_units` pour les unités organisationnelles
2. ✅ Créer la table `poc_org_unit_members` (jonction user ↔ org_unit)
3. ✅ Ajouter `order_type` et `org_unit_id` à `poc_purchase_orders`
4. ✅ Peupler 10 unités organisationnelles (Direction + 3 Services + 7 Équipes)
5. ✅ Migrer les 27 commandes existantes vers type BCE
6. ✅ Créer les politiques RLS pour l'isolation multi-tenant

## 📊 Structure Organisationnelle

### Hiérarchie à 3 niveaux

```
Direction Générale (DG)
├── Service Achats (ACHAT)
│   ├── Équipe Approvisionnement (APPRO)
│   └── Équipe Logistique (LOGI)
├── Service Technique (TECH)
│   ├── Équipe Chantier Site A (SITE-A)
│   ├── Équipe Chantier Site B (SITE-B)
│   └── Équipe Maintenance (MAINT)
└── Service Administratif (ADMIN)
    ├── Équipe Comptabilité (COMPTA)
    └── Équipe RH (RH)
```

**Total: 10 unités** (1 Direction + 3 Services + 7 Équipes)

## 📁 Fichiers SQL

### 1. `phase2-org-structure-implementation.sql`
Script principal contenant toutes les modifications:
- Investigation du schéma actuel
- Création des tables `poc_org_units` et `poc_org_unit_members`
- Modification de `poc_purchase_orders`
- Peuplement des 10 unités
- Migration des 27 commandes
- Création des politiques RLS
- Vérifications post-implémentation

### 2. `phase2-rollback.sql`
Script de rollback pour annuler toutes les modifications en cas de problème.

## 🚀 Instructions d'exécution

### Étape 1: Vérification préalable

Exécuter les requêtes d'investigation au début du script pour vérifier:
- L'état actuel de `poc_purchase_orders`
- L'existence des tables
- Le nombre de commandes existantes
- La présence de la compagnie BTP Construction Mada

### Étape 2: Exécution du script principal

1. Ouvrir Supabase SQL Editor
2. Copier-coller le contenu de `phase2-org-structure-implementation.sql`
3. Exécuter le script complet
4. Vérifier qu'il n'y a pas d'erreurs

### Étape 3: Vérifications post-implémentation

Le script inclut des requêtes de vérification automatiques. Vérifier:

```sql
-- 10 unités créées
SELECT COUNT(*) FROM poc_org_units WHERE company_id = 'c0000002-0002-0002-0002-000000000002';
-- Résultat attendu: 10

-- 27 commandes migrées en BCE
SELECT COUNT(*) FROM poc_purchase_orders WHERE order_type = 'BCE';
-- Résultat attendu: 27

-- Colonnes ajoutées
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'poc_purchase_orders' 
AND column_name IN ('order_type', 'org_unit_id');
-- Résultat attendu: 2 lignes
```

## 📝 Détails techniques

### Table `poc_org_units`

**Colonnes principales:**
- `id`: UUID (clé primaire)
- `company_id`: UUID (référence à `poc_companies`)
- `name`: TEXT (nom de l'unité)
- `type`: TEXT CHECK ('department' | 'team')
- `code`: TEXT (code unique: DG, ACHAT, TECH, etc.)
- `parent_id`: UUID (référence à `poc_org_units` pour hiérarchie)
- `is_active`: BOOLEAN

**Contraintes:**
- Unicité du code par compagnie: `UNIQUE (company_id, code)`
- Vérification que la compagnie est un builder
- Pas de boucle dans la hiérarchie: `CHECK (id != parent_id)`

### Table `poc_org_unit_members`

**Colonnes principales:**
- `id`: UUID (clé primaire)
- `org_unit_id`: UUID (référence à `poc_org_units`)
- `user_id`: UUID (référence à `auth.users`)
- `role`: TEXT CHECK ('chef_equipe' | 'chef_chantier' | 'direction')
- `status`: TEXT CHECK ('active' | 'inactive' | 'pending')
- `assigned_by`: UUID (qui a assigné le membre)
- `assigned_at`: TIMESTAMPTZ

**Contraintes:**
- Unicité: un utilisateur ne peut être membre qu'une seule fois par unité
- `UNIQUE (org_unit_id, user_id)`

### Modifications `poc_purchase_orders`

**Nouvelles colonnes:**
- `order_type`: TEXT CHECK ('BCI' | 'BCE')
  - **BCI** (Bon de Commande Interne): commande interne avec `org_unit_id`
  - **BCE** (Bon de Commande Externe): commande externe avec `project_id` uniquement
- `org_unit_id`: UUID (référence à `poc_org_units`, NULL pour BCE)

**Indexes ajoutés:**
- `idx_poc_purchase_orders_order_type`
- `idx_poc_purchase_orders_org_unit_id`

### Migration des commandes existantes

Les 27 commandes existantes sont marquées comme **BCE** avec:
- `order_type = 'BCE'`
- `org_unit_id = NULL`
- `project_id` conservé (traçabilité préservée)

## 🔒 Politiques RLS

### `poc_org_units`

- **SELECT**: Membres de la compagnie peuvent voir les unités de leur compagnie
- **INSERT/UPDATE/DELETE**: Seuls admin/direction peuvent modifier

### `poc_org_unit_members`

- **SELECT**: 
  - Membres de l'unité peuvent voir les autres membres
  - Admin/direction de la compagnie peuvent voir tous les membres
- **INSERT/UPDATE/DELETE**: Seuls admin/direction de la compagnie peuvent modifier

**Isolation multi-tenant:** Les politiques vérifient toujours `company_id` via la jointure avec `poc_org_units` pour garantir l'isolation entre compagnies.

## ⚠️ Points d'attention

1. **UUID de created_by**: Le script utilise une logique de fallback pour trouver un utilisateur admin. Si aucun admin n'existe, il utilise l'UUID de Joel par défaut (`5020b356-7281-4007-bec6-30a956b8a347`).

2. **Rollback**: En cas de problème, utiliser `phase2-rollback.sql` pour annuler toutes les modifications.

3. **Données existantes**: Les 27 commandes existantes sont préservées et migrées vers BCE. Aucune donnée n'est supprimée.

4. **Compatibilité**: Les modifications sont rétrocompatibles. Les requêtes existantes continuent de fonctionner.

## ✅ Checklist de validation

- [ ] Script exécuté sans erreur
- [ ] 10 unités organisationnelles créées
- [ ] Hiérarchie correcte (1 Direction → 3 Services → 7 Équipes)
- [ ] 27 commandes migrées en BCE
- [ ] Colonnes `order_type` et `org_unit_id` ajoutées
- [ ] Indexes créés
- [ ] Politiques RLS créées et testées
- [ ] Table `poc_org_unit_members` vide (prête pour les assignations)
- [ ] Aucune régression sur les fonctionnalités existantes

## 📞 Support

En cas de problème:
1. Vérifier les logs d'erreur dans Supabase
2. Exécuter les requêtes de vérification du script
3. Utiliser `phase2-rollback.sql` si nécessaire
4. Contacter l'équipe technique

---

**Date de création:** 2025-11-09  
**Agent:** Agent 01 - Database Implementation  
**Version:** 1.0.0









