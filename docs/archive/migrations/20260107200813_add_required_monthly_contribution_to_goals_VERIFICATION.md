# Migration: Add required_monthly_contribution to goals table

**Date:** 2026-01-07  
**Fichier:** `20260107200813_add_required_monthly_contribution_to_goals.sql`  
**Agent:** AGENT05  
**Version:** BazarKELY v2.4.3 - Phase B1

---

## 📋 Description

Cette migration ajoute la colonne `required_monthly_contribution` à la table `goals` dans Supabase. Cette colonne stocke le montant de contribution mensuelle calculé nécessaire pour atteindre l'objectif à la date limite.

**Caractéristiques de la colonne :**
- **Type:** `NUMERIC(10, 2)` - Permet des montants jusqu'à 99,999,999.99
- **Nullable:** `NULL` - Compatible avec les objectifs existants
- **Index:** Index partiel (WHERE NOT NULL) pour performance optimale

---

## ✅ Spécifications techniques

### Colonne ajoutée

```sql
required_monthly_contribution NUMERIC(10, 2) NULL
```

### Index créé

```sql
CREATE INDEX idx_goals_required_monthly_contribution 
ON goals(required_monthly_contribution) 
WHERE required_monthly_contribution IS NOT NULL;
```

**Avantages de l'index partiel :**
- Taille réduite (indexe uniquement les valeurs non-NULL)
- Requêtes plus rapides lors du filtrage/tri par contribution
- Meilleure performance pour les objectifs avec données de contribution

---

## 🚀 Instructions d'exécution

### Option 1: Via Supabase Dashboard (Recommandé)

1. **Ouvrir Supabase Dashboard**
   - Aller sur https://app.supabase.com
   - Sélectionner votre projet BazarKELY

2. **Accéder à SQL Editor**
   - Cliquer sur "SQL Editor" dans le menu de gauche
   - Cliquer sur "New query"

3. **Copier le contenu de la migration**
   - Ouvrir le fichier `20260107200813_add_required_monthly_contribution_to_goals.sql`
   - Copier tout le contenu (Ctrl+A, Ctrl+C)

4. **Exécuter la migration**
   - Coller le contenu dans l'éditeur SQL
   - Cliquer sur "Run" ou appuyer sur Ctrl+Enter
   - Vérifier qu'il n'y a pas d'erreurs

5. **Vérifier les résultats**
   - Exécuter les requêtes de vérification (voir ci-dessous)

### Option 2: Via Supabase CLI

```bash
# Depuis le répertoire racine du projet
cd supabase

# Appliquer la migration
supabase db push

# Ou si vous utilisez la migration locale
supabase migration up
```

---

## 🔍 Requêtes de vérification

### 1. Vérifier que la colonne existe

```sql
SELECT 
  column_name, 
  data_type, 
  numeric_precision, 
  numeric_scale,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'goals'
  AND column_name = 'required_monthly_contribution';
```

**Résultat attendu :**
```
column_name                        | data_type | numeric_precision | numeric_scale | is_nullable
-----------------------------------|-----------|-------------------|---------------|------------
required_monthly_contribution      | numeric   | 10                | 2             | YES
```

### 2. Vérifier que l'index existe

```sql
SELECT 
  indexname, 
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'goals'
  AND indexname = 'idx_goals_required_monthly_contribution';
```

**Résultat attendu :**
- Index doit exister
- `indexdef` doit contenir `WHERE (required_monthly_contribution IS NOT NULL)`

### 3. Vérifier le commentaire de la colonne

```sql
SELECT 
  col_description(
    'public.goals'::regclass::oid, 
    (SELECT attnum 
     FROM pg_attribute 
     WHERE attrelid = 'public.goals'::regclass 
     AND attname = 'required_monthly_contribution')
  ) as column_comment;
```

**Résultat attendu :**
- Commentaire descriptif présent expliquant le but de la colonne

### 4. Vérifier la compatibilité avec les données existantes

```sql
SELECT 
  COUNT(*) as total_goals,
  COUNT(required_monthly_contribution) as goals_with_contribution,
  COUNT(*) - COUNT(required_monthly_contribution) as goals_without_contribution
FROM public.goals;
```

**Résultat attendu :**
- `total_goals` : Nombre total d'objectifs
- `goals_with_contribution` : 0 (tous les objectifs existants ont NULL)
- `goals_without_contribution` : Égal à `total_goals` (compatibilité arrière)

---

## 📊 Requêtes d'exemple

### 1. Récupérer tous les objectifs avec contribution mensuelle requise

```sql
SELECT 
  id,
  name,
  target_amount,
  current_amount,
  target_date,
  required_monthly_contribution
FROM public.goals
WHERE required_monthly_contribution IS NOT NULL
ORDER BY required_monthly_contribution ASC;
```

### 2. Trouver les objectifs nécessitant plus de 100,000 MGA par mois

```sql
SELECT 
  id,
  name,
  required_monthly_contribution
FROM public.goals
WHERE required_monthly_contribution > 100000
ORDER BY required_monthly_contribution DESC;
```

### 3. Mettre à jour la contribution mensuelle requise pour un objectif

```sql
UPDATE public.goals
SET required_monthly_contribution = 50000.00
WHERE id = 'goal-uuid-here';
```

### 4. Calculer et mettre à jour la contribution pour tous les objectifs avec deadline

```sql
UPDATE public.goals
SET required_monthly_contribution = 
  CASE 
    WHEN target_date IS NOT NULL 
      AND target_date > CURRENT_DATE
      AND EXTRACT(EPOCH FROM (target_date::date - CURRENT_DATE)) > 0
    THEN 
      (target_amount - current_amount) / 
      GREATEST(
        EXTRACT(EPOCH FROM (target_date::date - CURRENT_DATE)) / 2592000, -- seconds to months
        1
      )
    ELSE NULL
  END
WHERE target_date IS NOT NULL;
```

---

## ⚠️ Notes de sécurité pour le déploiement en production

### ✅ Sécurité garantie

1. **Aucune perte de données**
   - La migration n'ajoute qu'une colonne, ne modifie aucune donnée existante
   - Toutes les colonnes existantes sont préservées

2. **Compatibilité arrière**
   - La colonne est `NULL` par défaut
   - Les objectifs existants continuent de fonctionner sans modification
   - L'application peut gérer les valeurs NULL

3. **Idempotence**
   - Utilise `IF NOT EXISTS` pour éviter les erreurs en cas de ré-exécution
   - Peut être exécutée plusieurs fois en toute sécurité

4. **Transaction atomique**
   - Utilise `BEGIN/COMMIT` pour garantir l'atomicité
   - En cas d'erreur, toutes les modifications sont annulées

### 🔒 Vérifications pré-déploiement

- [ ] Migration testée en environnement de développement
- [ ] Requêtes de vérification exécutées avec succès
- [ ] Aucune erreur dans les logs Supabase
- [ ] Backup de la base de données créé (recommandé)
- [ ] Vérification que l'application fonctionne avec la nouvelle colonne

### 📝 Impact sur l'application

**Avant la migration :**
- L'application fonctionne normalement
- Aucune référence à `required_monthly_contribution` dans le code

**Après la migration :**
- La colonne est disponible pour utilisation
- L'application peut commencer à calculer et stocker les contributions
- Les requêtes peuvent filtrer/trier par contribution mensuelle

---

## 🔙 Rollback (en cas d'urgence)

**ATTENTION:** Le rollback supprimera définitivement la colonne et toutes ses données.

### Procédure de rollback

1. **Créer un backup** (si vous avez des données importantes dans la colonne)

2. **Exécuter le script de rollback :**

```sql
BEGIN;
DROP INDEX IF EXISTS public.idx_goals_required_monthly_contribution;
ALTER TABLE public.goals DROP COLUMN IF EXISTS required_monthly_contribution;
COMMIT;
```

3. **Vérifier le rollback :**

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'goals'
  AND column_name = 'required_monthly_contribution';
```

**Résultat attendu :** Aucune ligne retournée (colonne supprimée)

---

## ✅ Checklist de vérification post-migration

- [ ] Migration exécutée sans erreurs
- [ ] Colonne `required_monthly_contribution` existe
- [ ] Type de colonne est `NUMERIC(10, 2)`
- [ ] Colonne est nullable (`is_nullable = YES`)
- [ ] Index `idx_goals_required_monthly_contribution` existe
- [ ] Index est partiel (WHERE NOT NULL)
- [ ] Commentaire de colonne est présent
- [ ] Tous les objectifs existants ont `NULL` (compatibilité arrière)
- [ ] Aucune erreur dans les logs Supabase
- [ ] Application fonctionne correctement

---

## 📈 Statistiques post-migration

Pour obtenir des statistiques sur l'utilisation de la colonne :

```sql
-- Statistiques générales
SELECT 
  COUNT(*) as total_goals,
  COUNT(required_monthly_contribution) as goals_with_contribution,
  ROUND(100.0 * COUNT(required_monthly_contribution) / COUNT(*), 2) as percentage_with_contribution,
  AVG(required_monthly_contribution) as avg_monthly_contribution,
  MIN(required_monthly_contribution) as min_monthly_contribution,
  MAX(required_monthly_contribution) as max_monthly_contribution
FROM public.goals
WHERE required_monthly_contribution IS NOT NULL;
```

---

**AGENT 05 SIGNATURE:** AGENT-05-MIGRATION-COMPLETE



