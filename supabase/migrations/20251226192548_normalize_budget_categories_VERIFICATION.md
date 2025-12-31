# Migration: Normalize Budget Categories

**Date:** 2025-12-26  
**Fichier:** `20251226192548_normalize_budget_categories.sql`  
**Agent:** AGENT05

---

## 📋 Description

Cette migration normalise toutes les valeurs de catégories dans la table `budgets` pour correspondre au type `TransactionCategory` :
- Toutes les catégories en minuscules
- Suppression des accents
- Mapping de "habillement" → "vetements"

---

## ✅ Catégories valides après migration

- `alimentation`
- `logement`
- `transport`
- `sante`
- `education`
- `communication`
- `vetements`
- `loisirs`
- `famille`
- `solidarite`
- `autres`

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
   - Ouvrir le fichier `20251226192548_normalize_budget_categories.sql`
   - Copier tout le contenu (Ctrl+A, Ctrl+C)

4. **Exécuter la migration**
   - Coller le contenu dans l'éditeur SQL
   - Cliquer sur "Run" ou appuyer sur Ctrl+Enter
   - Vérifier qu'il n'y a pas d'erreurs

5. **Vérifier les résultats**
   - Exécuter la requête de vérification (voir ci-dessous)

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

## 🔍 Requête de vérification

Exécutez cette requête **après** la migration pour vérifier le succès :

```sql
SELECT 
  category, 
  COUNT(*) as count,
  CASE 
    WHEN category IN ('alimentation', 'logement', 'transport', 'sante', 
                      'education', 'communication', 'vetements', 'loisirs', 
                      'famille', 'solidarite', 'autres') 
    THEN '✅ Valid'
    ELSE '⚠️ Invalid'
  END as status
FROM public.budgets
GROUP BY category
ORDER BY category;
```

### Résultat attendu

Toutes les catégories doivent avoir le statut `✅ Valid` et être en minuscules sans accents.

**Exemple de résultat attendu :**
```
category       | count | status
---------------|-------|--------
alimentation   | 15    | ✅ Valid
communication  | 8     | ✅ Valid
education      | 12    | ✅ Valid
famille        | 5     | ✅ Valid
logement       | 20    | ✅ Valid
loisirs        | 10    | ✅ Valid
sante          | 18    | ✅ Valid
solidarite      | 7     | ✅ Valid
transport      | 14    | ✅ Valid
vetements      | 9     | ✅ Valid
autres         | 3     | ✅ Valid
```

---

## ⚠️ Vérifications pré-migration (optionnel)

Avant d'exécuter la migration, vous pouvez vérifier l'état actuel :

```sql
-- Voir toutes les catégories actuelles avec leurs variantes
SELECT 
  category, 
  COUNT(*) as count
FROM public.budgets
GROUP BY category
ORDER BY category;
```

Cela vous permettra de voir quelles catégories seront affectées.

---

## 🔄 Migration idempotente

Cette migration est **idempotente**, ce qui signifie qu'elle peut être exécutée plusieurs fois en toute sécurité. Les conditions `WHERE category != 'target_value'` garantissent qu'aucune ligne n'est mise à jour inutilement.

---

## ⚠️ Note importante sur "epargne"

La migration normalise également "épargne" → "epargne", mais **"epargne" n'est PAS dans le type `TransactionCategory`**. 

Si vous avez des budgets avec la catégorie "epargne" après la migration, vous devrez :
1. Soit les mapper manuellement vers "autres"
2. Soit ajouter "epargne" au type `TransactionCategory` dans le code frontend
3. Soit créer une migration supplémentaire pour mapper "epargne" → "autres"

Pour vérifier si vous avez des budgets "epargne" :

```sql
SELECT COUNT(*) as epargne_budgets
FROM public.budgets
WHERE category = 'epargne';
```

---

## 🔙 Rollback

**ATTENTION:** Cette migration ne stocke pas les valeurs originales. Pour annuler cette migration, vous devrez restaurer depuis une sauvegarde.

**Recommandation:** Faire une sauvegarde avant d'exécuter la migration :

```sql
-- Créer une table de sauvegarde (optionnel)
CREATE TABLE budgets_category_backup AS
SELECT id, category, updated_at
FROM public.budgets;
```

---

## ✅ Checklist de vérification

- [ ] Migration exécutée sans erreurs
- [ ] Requête de vérification exécutée
- [ ] Toutes les catégories sont en minuscules
- [ ] Toutes les catégories sont valides (pas d'accents)
- [ ] "habillement" a été mappé vers "vetements"
- [ ] Aucune perte de données (vérifier le nombre total de budgets)
- [ ] Vérifier s'il y a des budgets "epargne" et décider de l'action

---

## 📊 Statistiques post-migration

Pour obtenir des statistiques détaillées :

```sql
-- Statistiques par catégorie
SELECT 
  category,
  COUNT(*) as budget_count,
  SUM(amount) as total_budget_amount,
  SUM(spent) as total_spent,
  AVG(amount) as avg_budget_amount
FROM public.budgets
GROUP BY category
ORDER BY budget_count DESC;
```

---

**AGENT 05 SIGNATURE:** AGENT-05-MIGRATION-COMPLETE



