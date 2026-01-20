# INVESTIGATION SCHÉMA SUPABASE - Goals Table
**Date:** 2026-01-07  
**Contexte:** Déploiement v2.5.0 - Incohérences détectées dans le schéma Supabase  
**Objectif:** Comparer schéma réel vs schéma documenté et identifier les écarts

---

## 🔍 PROBLÈMES DÉTECTÉS

1. ❌ Table `schema_migrations` n'existe pas
2. ❌ Colonne `deadline` manquante de la table `goals` (⚠️ NORMAL: Supabase utilise `target_date`)
3. ✅ Colonne `required_monthly_contribution` ajoutée avec succès dans Supabase
4. ⚠️ **CRITIQUE:** `required_monthly_contribution` manquant dans `frontend/src/types/supabase.ts`
5. ⚠️ Schéma réel différent du schéma documenté

---

## 📋 REQUÊTES SQL À EXÉCUTER DANS SUPABASE

### Query 1 - Schéma réel de la table goals

```sql
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length,
  numeric_precision,
  numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'goals'
ORDER BY ordinal_position;
```

**Résultat attendu:** Liste complète de toutes les colonnes avec leurs types

---

### Query 2 - Vérification des tables existantes

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

**Résultat attendu:** Liste de toutes les tables pour vérifier si `schema_migrations` existe

---

### Query 3 - Contraintes de la table goals

```sql
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
  AND tc.table_schema = ccu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'goals'
ORDER BY tc.constraint_type, tc.constraint_name;
```

**Résultat attendu:** Toutes les contraintes (PRIMARY KEY, FOREIGN KEY, UNIQUE, CHECK)

---

### Query 4 - Indexes de la table goals

```sql
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'goals'
ORDER BY indexname;
```

**Résultat attendu:** Tous les index créés sur la table goals

---

### Query 5 - Vérification colonne required_monthly_contribution

```sql
SELECT 
  column_name, 
  data_type, 
  numeric_precision, 
  numeric_scale,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'goals'
  AND column_name = 'required_monthly_contribution';
```

**Résultat attendu:** Confirmation que la colonne existe avec les bons paramètres

---

## 📊 SCHÉMA ATTENDU (d'après documentation)

### D'après `frontend/src/types/supabase.ts` (lignes 218-261)

```typescript
goals: {
  Row: {
    id: string                    // UUID PRIMARY KEY
    user_id: string               // UUID NOT NULL, FOREIGN KEY → auth.users(id)
    name: string                  // TEXT NOT NULL
    target_amount: number        // NUMERIC NOT NULL
    current_amount: number       // NUMERIC DEFAULT 0
    target_date: string | null   // DATE NULLABLE (⚠️ PAS "deadline")
    category: string | null       // TEXT NULLABLE
    description: string | null    // TEXT NULLABLE
    priority: string             // TEXT NOT NULL
    is_completed: boolean        // BOOLEAN DEFAULT false
    created_at: string           // TIMESTAMP DEFAULT NOW()
    updated_at: string           // TIMESTAMP DEFAULT NOW()
    // ❌ required_monthly_contribution MANQUANT (doit être ajouté après migration)
  }
}
```

**⚠️ PROBLÈME CRITIQUE:** Les types Supabase générés (`frontend/src/types/supabase.ts`) ne contiennent PAS `required_monthly_contribution` même si la colonne existe dans la base de données. Ces types doivent être régénérés après la migration.

### D'après `frontend/src/types/index.ts` (interface Goal)

```typescript
export interface Goal {
  id: string;
  userId: string;
  createdAt?: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  requiredMonthlyContribution?: number;  // ⭐ AJOUTÉ Phase B1
  deadline: Date;                        // ⚠️ TypeScript utilise "deadline"
  category?: string;
  priority: 'low' | 'medium' | 'high';
  isCompleted?: boolean;
  linkedAccountId?: string;
  autoSync?: boolean;
  isSuggested?: boolean;
  suggestionType?: string;
  suggestionAcceptedAt?: string;
  suggestionDismissedAt?: string;
  milestones?: any[];
}
```

### D'après migration `20260107200813_add_required_monthly_contribution_to_goals.sql`

**Colonne ajoutée:**
- `required_monthly_contribution NUMERIC(10, 2) NULL`
- Index partiel: `idx_goals_required_monthly_contribution WHERE NOT NULL`

---

## 🔄 MAPPING FRONTEND ↔ SUPABASE

### Mapping Supabase → Frontend (`goalService.ts`)

```typescript
private mapSupabaseToGoal(supabaseGoal: any): Goal {
  return {
    id: supabaseGoal.id,
    userId: supabaseGoal.user_id,
    name: supabaseGoal.name,
    targetAmount: supabaseGoal.target_amount,
    currentAmount: supabaseGoal.current_amount,
    requiredMonthlyContribution: supabaseGoal.required_monthly_contribution, // ⭐ Phase B1
    deadline: supabaseGoal.target_date ? new Date(supabaseGoal.target_date) : new Date(), // ⚠️ Mapping target_date → deadline
    category: supabaseGoal.category,
    priority: supabaseGoal.priority,
    isCompleted: supabaseGoal.is_completed,
    // ...
  };
}
```

**⚠️ IMPORTANT:** 
- Supabase utilise `target_date` (snake_case, nullable)
- Frontend TypeScript utilise `deadline` (camelCase, non-nullable)
- Le mapping convertit `target_date` → `deadline`

### Mapping Frontend → Supabase (`goalService.ts`)

```typescript
private mapGoalToSupabase(goal: Partial<Goal> | GoalFormData): any {
  const result: any = {
    user_id: goal.userId,
    name: goal.name,
    target_amount: goal.targetAmount,
    current_amount: goal.currentAmount,
    required_monthly_contribution: goal.requiredMonthlyContribution, // ⭐ Phase B1
    // ...
  };
  
  if ('deadline' in goal && goal.deadline) {
    result.target_date = goal.deadline instanceof Date 
      ? goal.deadline.toISOString().split('T')[0] 
      : goal.deadline; // ⚠️ Mapping deadline → target_date
  }
  
  return result;
}
```

---

## 📝 SCHÉMA ATTENDU COMPLET (après Phase B1)

### Colonnes attendues dans Supabase:

| Colonne | Type Supabase | Type TypeScript | Nullable | Description |
|---------|---------------|-----------------|----------|-------------|
| `id` | UUID | string | NO | PRIMARY KEY |
| `user_id` | UUID | string | NO | FOREIGN KEY → auth.users(id) |
| `name` | TEXT | string | NO | Nom de l'objectif |
| `target_amount` | NUMERIC | number | NO | Montant cible |
| `current_amount` | NUMERIC | number | NO | Montant actuel (défaut: 0) |
| `target_date` | DATE | Date (via deadline) | YES | ⚠️ Date limite (nullable) |
| `category` | TEXT | string | YES | Catégorie |
| `description` | TEXT | string | YES | Description |
| `priority` | TEXT | 'low'\|'medium'\|'high' | NO | Priorité |
| `is_completed` | BOOLEAN | boolean | NO | Statut complétion (défaut: false) |
| `created_at` | TIMESTAMP | string | NO | Date création (défaut: NOW()) |
| `updated_at` | TIMESTAMP | string | NO | Date mise à jour (défaut: NOW()) |
| `required_monthly_contribution` | NUMERIC(10,2) | number | YES | ⭐ Phase B1 - Contribution mensuelle (⚠️ Manquant dans supabase.ts) |

### Colonnes manquantes dans Supabase (mais présentes dans TypeScript):

| Colonne TypeScript | Mapping Supabase | Status |
|-------------------|------------------|--------|
| `linkedAccountId` | `linked_account_id` | ❌ Manquant |
| `autoSync` | `auto_sync` | ❌ Manquant |
| `isSuggested` | `is_suggested` | ❌ Manquant |
| `suggestionType` | `suggestion_type` | ❌ Manquant |
| `suggestionAcceptedAt` | `suggestion_accepted_at` | ❌ Manquant |
| `suggestionDismissedAt` | `suggestion_dismissed_at` | ❌ Manquant |

**⚠️ NOTE:** Ces colonnes peuvent être stockées uniquement dans IndexedDB (offline-first) et non synchronisées avec Supabase.

---

## 🔍 ANALYSE DES ÉCARTS

### Problème 1: Colonne "deadline" manquante

**Symptôme:** L'utilisateur signale que la colonne `deadline` est manquante.

**Cause probable:**
- ✅ **NORMAL:** Supabase utilise `target_date`, pas `deadline`
- Le mapping frontend convertit `target_date` ↔ `deadline`
- Si `target_date` est NULL dans Supabase, le frontend utilise `new Date()` par défaut

**Vérification nécessaire:**
- Exécuter Query 1 pour confirmer que `target_date` existe
- Vérifier si `target_date` est nullable (devrait être YES)

### Problème 2: Table schema_migrations n'existe pas

**Symptôme:** Table `schema_migrations` absente.

**Cause probable:**
- Supabase ne crée pas automatiquement cette table
- Les migrations sont exécutées manuellement via SQL Editor
- Pas de système de tracking automatique des migrations

**Impact:**
- Pas de traçabilité des migrations exécutées
- Risque d'exécuter plusieurs fois la même migration
- Difficile de savoir quelles migrations ont été appliquées

**Solution recommandée:**
- Créer manuellement la table `schema_migrations` pour tracking
- Ou utiliser Supabase CLI pour gérer les migrations

### Problème 3: Colonnes manquantes (linkedAccountId, etc.)

**Symptôme:** Colonnes présentes dans TypeScript mais absentes de Supabase.

**Cause probable:**
- Architecture offline-first: certaines données uniquement dans IndexedDB
- Pas de synchronisation Supabase pour ces champs
- Migration non créée pour ces colonnes

**Impact:**
- Données perdues si IndexedDB effacé
- Pas de synchronisation multi-appareils pour ces champs
- Cohérence partielle entre frontend et backend

---

## ✅ ACTIONS RECOMMANDÉES

### Action 1: Exécuter les requêtes SQL

1. **Exécuter Query 1** pour obtenir le schéma réel
2. **Exécuter Query 2** pour vérifier les tables existantes
3. **Exécuter Query 3** pour vérifier les contraintes
4. **Exécuter Query 4** pour vérifier les index
5. **Exécuter Query 5** pour confirmer `required_monthly_contribution`

### Action 2: Documenter le schéma réel

Après exécution des requêtes, mettre à jour ce document avec:
- **ACTUAL SCHEMA:** Résultats de Query 1
- **ACTUAL CONSTRAINTS:** Résultats de Query 3
- **ACTUAL INDEXES:** Résultats de Query 4

### Action 3: Comparer et identifier les écarts

Créer une section "GAPS IDENTIFIED" avec:
- Colonnes manquantes
- Contraintes manquantes
- Index manquants
- Types incorrects

### Action 4: Créer script de correction

Si des écarts sont identifiés:
- Créer migration SQL pour ajouter colonnes manquantes
- Créer migration SQL pour ajouter contraintes manquantes
- Créer migration SQL pour ajouter index manquants

### Action 5: Régénérer les types Supabase

**CRITIQUE:** Après confirmation que `required_monthly_contribution` existe dans Supabase:
- Régénérer les types TypeScript depuis Supabase
- Commande: `npx supabase gen types typescript --project-id <project-id> > frontend/src/types/supabase.ts`
- Ou utiliser Supabase CLI: `supabase gen types typescript --local > frontend/src/types/supabase.ts`

---

## 📋 TEMPLATE POUR RÉSULTATS

### ACTUAL SCHEMA (à remplir après Query 1)

```
| Column Name | Data Type | Nullable | Default | Description |
|-------------|-----------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PRIMARY KEY |
| ... | ... | ... | ... | ... |
```

### ACTUAL CONSTRAINTS (à remplir après Query 3)

```
| Constraint Name | Type | Column | Foreign Table | Foreign Column |
|-----------------|------|--------|---------------|----------------|
| goals_pkey | PRIMARY KEY | id | - | - |
| ... | ... | ... | ... | ... |
```

### ACTUAL INDEXES (à remplir après Query 4)

```
| Index Name | Definition |
|------------|-------------|
| idx_goals_user_id | CREATE INDEX ... |
| ... | ... |
```

### GAPS IDENTIFIED

```
| Gap Type | Expected | Actual | Impact | Priority |
|----------|----------|--------|--------|----------|
| Column | target_date | ❌ Missing | HIGH | P1 |
| ... | ... | ... | ... | ... |
```

---

## 🚨 ROOT CAUSE ANALYSIS

### Hypothèse 1: Migrations non exécutées

**Symptômes:**
- Colonnes manquantes
- Table `schema_migrations` absente
- Schéma différent de la documentation

**Cause:** Migrations SQL non exécutées dans Supabase production

**Solution:** Exécuter toutes les migrations manuellement via SQL Editor

### Hypothèse 2: Schéma créé manuellement

**Symptômes:**
- Schéma partiel (certaines colonnes présentes, d'autres non)
- Pas de contraintes cohérentes
- Table `schema_migrations` absente

**Cause:** Table créée manuellement sans suivre les migrations

**Solution:** Recréer la table avec le bon schéma ou ajouter les colonnes manquantes

### Hypothèse 3: Architecture offline-first

**Symptômes:**
- Colonnes TypeScript présentes mais absentes de Supabase
- Données uniquement dans IndexedDB

**Cause:** Architecture intentionnelle - certaines données non synchronisées

**Solution:** Documenter quelles colonnes sont offline-only

---

## 📝 NOTES IMPORTANTES

1. **Mapping target_date ↔ deadline:**
   - Supabase utilise `target_date` (snake_case)
   - Frontend utilise `deadline` (camelCase)
   - Le mapping est géré dans `goalService.ts`

2. **Colonne required_monthly_contribution:**
   - ✅ Ajoutée avec succès (Phase B1)
   - Type: NUMERIC(10, 2) NULL
   - Index partiel créé

3. **Architecture offline-first:**
   - Certaines colonnes peuvent être uniquement dans IndexedDB
   - Vérifier `goalService.ts` pour voir quels champs sont synchronisés

4. **Table schema_migrations:**
   - Supabase ne crée pas automatiquement cette table
   - Nécessaire pour tracking des migrations
   - Peut être créée manuellement si besoin

---

## 🔄 PROCHAINES ÉTAPES

1. ✅ Créer ce document d'investigation
2. ⏳ Exécuter les 5 requêtes SQL dans Supabase
3. ⏳ Documenter les résultats réels
4. ⏳ Comparer avec le schéma attendu
5. ⏳ Identifier tous les écarts
6. ⏳ Créer script de correction si nécessaire
7. ⏳ Mettre à jour la documentation

---

**Document créé le:** 2026-01-07  
**Agent:** AGENT 01 - Schema Investigation  
**Status:** En attente exécution requêtes SQL
