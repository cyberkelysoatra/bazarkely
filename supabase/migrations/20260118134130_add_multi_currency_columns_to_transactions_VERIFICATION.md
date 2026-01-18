# Migration: Add multi-currency columns to transactions table

**Date:** 2026-01-18  
**Fichier:** `20260118134130_add_multi_currency_columns_to_transactions.sql`  
**Agent:** AGENT05  
**Version:** BazarKELY v2.4.4

---

## 📋 Description

Cette migration ajoute 3 colonnes manquantes à la table `transactions` dans Supabase pour préserver les informations de devise originale. Ces colonnes existent déjà dans l'interface TypeScript mais manquaient dans le schéma Supabase, causant une perte de données lors de la synchronisation.

**Colonnes ajoutées :**
- `original_currency` (TEXT, nullable) - Code devise de la transaction originale
- `original_amount` (NUMERIC(15, 2), nullable) - Montant original avant conversion
- `exchange_rate_used` (NUMERIC(10, 4), nullable) - Taux de change utilisé pour la conversion

---

## ✅ Spécifications techniques

### Colonnes ajoutées

#### 1. `original_currency`
```sql
TEXT NULL
CHECK (original_currency IN ('MGA', 'EUR') OR original_currency IS NULL)
```

#### 2. `original_amount`
```sql
NUMERIC(15, 2) NULL
CHECK (original_amount > 0 OR original_amount IS NULL)
```

#### 3. `exchange_rate_used`
```sql
NUMERIC(10, 4) NULL
CHECK (exchange_rate_used > 0 OR exchange_rate_used IS NULL)
```

### Index créé

```sql
CREATE INDEX idx_transactions_original_currency 
ON transactions(original_currency) 
WHERE original_currency IS NOT NULL;
```

**Avantages de l'index partiel :**
- Taille réduite (indexe uniquement les valeurs non-NULL)
- Requêtes plus rapides lors du filtrage par devise originale
- Meilleure performance pour les transactions avec conversion de devise

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
   - Ouvrir le fichier `20260118134130_add_multi_currency_columns_to_transactions.sql`
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

### 1. Vérifier que les colonnes existent

```sql
SELECT 
  column_name, 
  data_type, 
  numeric_precision, 
  numeric_scale,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'transactions'
  AND column_name IN ('original_currency', 'original_amount', 'exchange_rate_used')
ORDER BY column_name;
```

**Résultat attendu :**
```
column_name           | data_type | numeric_precision | numeric_scale | is_nullable
----------------------|-----------|-------------------|---------------|------------
exchange_rate_used    | numeric   | 10                | 4             | YES
original_amount       | numeric   | 15                | 2             | YES
original_currency     | text      | NULL              | NULL          | YES
```

### 2. Vérifier que les contraintes CHECK existent

```sql
SELECT 
  constraint_name,
  constraint_type,
  check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'transactions'
  AND tc.constraint_type = 'CHECK'
  AND (tc.constraint_name LIKE '%original%' OR tc.constraint_name LIKE '%exchange%')
ORDER BY constraint_name;
```

**Résultat attendu :**
- 3 contraintes CHECK doivent exister
- `transactions_original_currency_check`
- `transactions_original_amount_check`
- `transactions_exchange_rate_used_check`

### 3. Vérifier que l'index existe

```sql
SELECT 
  indexname, 
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'transactions'
  AND indexname = 'idx_transactions_original_currency';
```

**Résultat attendu :**
- Index doit exister
- `indexdef` doit contenir `WHERE (original_currency IS NOT NULL)`

### 4. Vérifier la compatibilité avec les données existantes

```sql
SELECT 
  COUNT(*) as total_transactions,
  COUNT(original_currency) as transactions_with_currency,
  COUNT(original_amount) as transactions_with_original_amount,
  COUNT(exchange_rate_used) as transactions_with_rate,
  COUNT(*) - COUNT(original_currency) as transactions_without_currency
FROM public.transactions;
```

**Résultat attendu :**
- `total_transactions` : Nombre total de transactions
- `transactions_with_currency` : 0 (toutes les transactions existantes ont NULL)
- `transactions_without_currency` : Égal à `total_transactions` (compatibilité arrière)

---

## 🔄 Régénération des types TypeScript

### Option 1: Via Supabase CLI (Recommandé)

**Prérequis :**
- Supabase CLI installé : `npm install -g supabase`
- Instance Supabase locale en cours d'exécution OU accès à l'instance distante

**Commandes :**

```bash
# Depuis le répertoire racine du projet
cd frontend

# Régénérer les types depuis Supabase local
npx supabase gen types typescript --local > src/types/supabase.ts

# OU depuis Supabase distant (nécessite SUPABASE_URL et SUPABASE_ANON_KEY)
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts
```

**Note :** Si vous utilisez Supabase distant, vous devez d'abord vous connecter :
```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

### Option 2: Mise à jour manuelle

Si le CLI n'est pas disponible, mettez à jour manuellement `frontend/src/types/supabase.ts` :

**Fichier :** `frontend/src/types/supabase.ts`

**Section à modifier :** `transactions.Row`, `transactions.Insert`, `transactions.Update`

**Ajouter ces champs :**

```typescript
transactions: {
  Row: {
    // ... champs existants ...
    original_currency: string | null
    original_amount: number | null
    exchange_rate_used: number | null
  }
  Insert: {
    // ... champs existants ...
    original_currency?: string | null
    original_amount?: number | null
    exchange_rate_used?: number | null
  }
  Update: {
    // ... champs existants ...
    original_currency?: string | null
    original_amount?: number | null
    exchange_rate_used?: number | null
  }
}
```

**Emplacement exact :** Après la ligne `transferred_at: string | null` dans `Row`, et dans les sections `Insert` et `Update`.

---

## ✅ Vérification du mapping dans transactionService

### Mapping Supabase → Frontend

**Fichier :** `frontend/src/services/transactionService.ts`  
**Fonction :** `mapSupabaseToTransaction()`  
**Lignes :** 84-109

**✅ VÉRIFICATION :** Le mapping est **déjà correct** :

```typescript
private mapSupabaseToTransaction(supabaseTransaction: any): Transaction {
  return {
    // ... autres champs ...
    originalCurrency: supabaseTransaction.original_currency || undefined,
    originalAmount: supabaseTransaction.original_amount || undefined,
    exchangeRateUsed: supabaseTransaction.exchange_rate_used || undefined,
    // ... autres champs ...
  };
}
```

**✅ CONFIRMATION :** Aucune modification nécessaire dans `mapSupabaseToTransaction()`.

### Mapping Frontend → Supabase

**Fichier :** `frontend/src/services/transactionService.ts`  
**Fonction :** `createTransaction()`  
**Lignes :** 384-410

**✅ VÉRIFICATION :** Le mapping est **déjà correct** :

```typescript
const supabaseData = {
  // ... autres champs ...
  original_currency: transactionCurrency,
  original_amount: transactionData.amount,
  exchange_rate_used: exchangeRateUsed,
  // ... autres champs ...
};
```

**✅ CONFIRMATION :** Aucune modification nécessaire dans `createTransaction()`.

---

## 📊 Requêtes d'exemple

### 1. Récupérer toutes les transactions avec conversion de devise

```sql
SELECT 
  id,
  description,
  amount,
  original_currency,
  original_amount,
  exchange_rate_used,
  (amount / exchange_rate_used) as calculated_original_amount
FROM public.transactions
WHERE original_currency IS NOT NULL
ORDER BY created_at DESC;
```

### 2. Trouver les transactions EUR

```sql
SELECT 
  id,
  description,
  original_amount,
  original_currency,
  amount as converted_amount_mga
FROM public.transactions
WHERE original_currency = 'EUR'
ORDER BY created_at DESC;
```

### 3. Vérifier la précision de la conversion

```sql
SELECT 
  id,
  original_amount,
  amount,
  exchange_rate_used,
  (amount / exchange_rate_used) as calculated_original,
  ABS(original_amount - (amount / exchange_rate_used)) as difference
FROM public.transactions
WHERE original_currency IS NOT NULL
  AND exchange_rate_used IS NOT NULL
  AND original_amount IS NOT NULL;
```

### 4. Statistiques sur les conversions

```sql
SELECT 
  original_currency,
  COUNT(*) as transaction_count,
  AVG(exchange_rate_used) as avg_rate,
  MIN(exchange_rate_used) as min_rate,
  MAX(exchange_rate_used) as max_rate
FROM public.transactions
WHERE original_currency IS NOT NULL
GROUP BY original_currency;
```

---

## ⚠️ Notes de sécurité pour le déploiement en production

### ✅ Sécurité garantie

1. **Aucune perte de données**
   - La migration n'ajoute que des colonnes, ne modifie aucune donnée existante
   - Toutes les colonnes existantes sont préservées

2. **Compatibilité arrière**
   - Toutes les colonnes sont `NULL` par défaut
   - Les transactions existantes continuent de fonctionner sans modification
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
- [ ] Types TypeScript régénérés
- [ ] Vérification que l'application fonctionne avec les nouvelles colonnes

### 📝 Impact sur l'application

**Avant la migration :**
- Les colonnes `original_currency`, `original_amount`, `exchange_rate_used` sont perdues lors de la synchronisation Supabase
- Seul le montant converti (`amount`) est stocké

**Après la migration :**
- Les colonnes sont disponibles pour stockage
- Les informations de devise originale sont préservées
- Les transactions peuvent être reconstruites avec le montant original

---

## 🔙 Rollback (en cas d'urgence)

**ATTENTION:** Le rollback supprimera définitivement les colonnes et toutes leurs données.

### Procédure de rollback

1. **Créer un backup** (si vous avez des données importantes dans les colonnes)

2. **Exécuter le script de rollback :**

```sql
BEGIN;
DROP INDEX IF EXISTS public.idx_transactions_original_currency;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_exchange_rate_used_check;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_original_amount_check;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_original_currency_check;
ALTER TABLE public.transactions DROP COLUMN IF EXISTS exchange_rate_used;
ALTER TABLE public.transactions DROP COLUMN IF EXISTS original_amount;
ALTER TABLE public.transactions DROP COLUMN IF EXISTS original_currency;
COMMIT;
```

3. **Vérifier le rollback :**

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'transactions'
  AND column_name IN ('original_currency', 'original_amount', 'exchange_rate_used');
```

**Résultat attendu :** Aucune ligne retournée (colonnes supprimées)

---

## ✅ Checklist de vérification post-migration

- [ ] Migration exécutée sans erreurs
- [ ] Colonne `original_currency` existe
- [ ] Colonne `original_amount` existe
- [ ] Colonne `exchange_rate_used` existe
- [ ] Type de colonne `original_currency` est `TEXT`
- [ ] Type de colonne `original_amount` est `NUMERIC(15, 2)`
- [ ] Type de colonne `exchange_rate_used` est `NUMERIC(10, 4)`
- [ ] Toutes les colonnes sont nullable (`is_nullable = YES`)
- [ ] Contraintes CHECK existent (3 contraintes)
- [ ] Index `idx_transactions_original_currency` existe
- [ ] Index est partiel (WHERE NOT NULL)
- [ ] Commentaires de colonnes sont présents
- [ ] Toutes les transactions existantes ont `NULL` (compatibilité arrière)
- [ ] Aucune erreur dans les logs Supabase
- [ ] Types TypeScript régénérés
- [ ] Application fonctionne correctement

---

## 📈 Statistiques post-migration

Pour obtenir des statistiques sur l'utilisation des colonnes :

```sql
-- Statistiques générales
SELECT 
  COUNT(*) as total_transactions,
  COUNT(original_currency) as transactions_with_currency,
  ROUND(100.0 * COUNT(original_currency) / COUNT(*), 2) as percentage_with_currency,
  COUNT(DISTINCT original_currency) as distinct_currencies
FROM public.transactions;

-- Répartition par devise
SELECT 
  original_currency,
  COUNT(*) as count,
  AVG(original_amount) as avg_original_amount,
  AVG(exchange_rate_used) as avg_rate
FROM public.transactions
WHERE original_currency IS NOT NULL
GROUP BY original_currency;
```

---

## 🔗 Fichiers liés

- **Migration SQL :** `supabase/migrations/20260118134130_add_multi_currency_columns_to_transactions.sql`
- **Service de transactions :** `frontend/src/services/transactionService.ts`
- **Service API :** `frontend/src/services/apiService.ts`
- **Types TypeScript :** `frontend/src/types/supabase.ts`
- **Types locaux :** `frontend/src/types/index.ts`

---

**AGENT 05 SIGNATURE:** AGENT-05-MIGRATION-COMPLETE

**Date de complétion :** 2026-01-18  
**Statut :** ✅ Migration créée et prête pour déploiement
