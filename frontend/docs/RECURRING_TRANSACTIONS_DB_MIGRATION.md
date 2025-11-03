# Migration Base de Données - Transactions Récurrentes

**Version:** 1.0.0  
**Date:** 2024  
**Phase:** Phase 1 - Infrastructure et types

## 📋 Vue d'ensemble

Cette migration ajoute le support des transactions récurrentes au système BazarKELY. Elle crée une nouvelle table `recurring_transactions` dans Supabase et étend la table `transactions` existante avec des champs optionnels pour référencer les transactions récurrentes.

## 🗄️ Schéma SQL

### 1. Création de la table `recurring_transactions`

```sql
-- Table pour les transactions récurrentes
CREATE TABLE IF NOT EXISTS public.recurring_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    day_of_month INTEGER CHECK (day_of_month IS NULL OR (day_of_month >= 1 AND day_of_month <= 31)),
    day_of_week INTEGER CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)),
    notify_before_days INTEGER NOT NULL DEFAULT 1 CHECK (notify_before_days >= 0),
    auto_create BOOLEAN NOT NULL DEFAULT false,
    linked_budget_id UUID REFERENCES public.budgets(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_generated_date TIMESTAMP WITH TIME ZONE,
    next_generation_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Contraintes de validation
    CONSTRAINT check_day_of_month_valid CHECK (
        (frequency IN ('monthly', 'quarterly', 'yearly') AND day_of_month IS NOT NULL) OR
        (frequency NOT IN ('monthly', 'quarterly', 'yearly') AND day_of_month IS NULL)
    ),
    CONSTRAINT check_day_of_week_valid CHECK (
        (frequency = 'weekly' AND day_of_week IS NOT NULL) OR
        (frequency != 'weekly' AND day_of_week IS NULL)
    ),
    CONSTRAINT check_end_date_valid CHECK (
        end_date IS NULL OR end_date > start_date
    ),
    CONSTRAINT check_next_generation_date_valid CHECK (
        next_generation_date >= start_date
    )
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_user_id 
    ON public.recurring_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_recurring_transactions_next_generation_date 
    ON public.recurring_transactions(next_generation_date) 
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_recurring_transactions_linked_budget_id 
    ON public.recurring_transactions(linked_budget_id) 
    WHERE linked_budget_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recurring_transactions_user_active 
    ON public.recurring_transactions(user_id, is_active) 
    WHERE is_active = true;

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_recurring_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_recurring_transactions_updated_at
    BEFORE UPDATE ON public.recurring_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_recurring_transactions_updated_at();
```

### 2. Extension de la table `transactions`

```sql
-- Ajouter les champs pour référencer les transactions récurrentes
ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS recurring_transaction_id UUID REFERENCES public.recurring_transactions(id) ON DELETE SET NULL;

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_transactions_recurring_transaction_id 
    ON public.transactions(recurring_transaction_id) 
    WHERE recurring_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_is_recurring 
    ON public.transactions(user_id, is_recurring) 
    WHERE is_recurring = true;
```

### 3. Politiques RLS (Row Level Security)

```sql
-- Activer RLS sur recurring_transactions
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs peuvent voir uniquement leurs propres transactions récurrentes
CREATE POLICY "Users can view their own recurring transactions"
    ON public.recurring_transactions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Politique: Les utilisateurs peuvent créer leurs propres transactions récurrentes
CREATE POLICY "Users can create their own recurring transactions"
    ON public.recurring_transactions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Politique: Les utilisateurs peuvent modifier leurs propres transactions récurrentes
CREATE POLICY "Users can update their own recurring transactions"
    ON public.recurring_transactions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Politique: Les utilisateurs peuvent supprimer leurs propres transactions récurrentes
CREATE POLICY "Users can delete their own recurring transactions"
    ON public.recurring_transactions
    FOR DELETE
    USING (auth.uid() = user_id);
```

## 📝 Script de Migration Complet (Idempotent)

```sql
-- ============================================
-- Migration: Transactions Récurrentes (Phase 1)
-- Version: 1.0.0
-- Date: 2024
-- ============================================

BEGIN;

-- 1. Créer la table recurring_transactions
CREATE TABLE IF NOT EXISTS public.recurring_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    day_of_month INTEGER CHECK (day_of_month IS NULL OR (day_of_month >= 1 AND day_of_month <= 31)),
    day_of_week INTEGER CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)),
    notify_before_days INTEGER NOT NULL DEFAULT 1 CHECK (notify_before_days >= 0),
    auto_create BOOLEAN NOT NULL DEFAULT false,
    linked_budget_id UUID REFERENCES public.budgets(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_generated_date TIMESTAMP WITH TIME ZONE,
    next_generation_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT check_day_of_month_valid CHECK (
        (frequency IN ('monthly', 'quarterly', 'yearly') AND day_of_month IS NOT NULL) OR
        (frequency NOT IN ('monthly', 'quarterly', 'yearly') AND day_of_month IS NULL)
    ),
    CONSTRAINT check_day_of_week_valid CHECK (
        (frequency = 'weekly' AND day_of_week IS NOT NULL) OR
        (frequency != 'weekly' AND day_of_week IS NULL)
    ),
    CONSTRAINT check_end_date_valid CHECK (
        end_date IS NULL OR end_date > start_date
    ),
    CONSTRAINT check_next_generation_date_valid CHECK (
        next_generation_date >= start_date
    )
);

-- 2. Créer les index
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_user_id 
    ON public.recurring_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_recurring_transactions_next_generation_date 
    ON public.recurring_transactions(next_generation_date) 
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_recurring_transactions_linked_budget_id 
    ON public.recurring_transactions(linked_budget_id) 
    WHERE linked_budget_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recurring_transactions_user_active 
    ON public.recurring_transactions(user_id, is_active) 
    WHERE is_active = true;

-- 3. Créer le trigger pour updated_at
CREATE OR REPLACE FUNCTION update_recurring_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_recurring_transactions_updated_at ON public.recurring_transactions;
CREATE TRIGGER trigger_update_recurring_transactions_updated_at
    BEFORE UPDATE ON public.recurring_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_recurring_transactions_updated_at();

-- 4. Étendre la table transactions
ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS recurring_transaction_id UUID REFERENCES public.recurring_transactions(id) ON DELETE SET NULL;

-- 5. Créer les index sur transactions
CREATE INDEX IF NOT EXISTS idx_transactions_recurring_transaction_id 
    ON public.transactions(recurring_transaction_id) 
    WHERE recurring_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_is_recurring 
    ON public.transactions(user_id, is_recurring) 
    WHERE is_recurring = true;

-- 6. Configurer RLS
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Users can view their own recurring transactions" ON public.recurring_transactions;
DROP POLICY IF EXISTS "Users can create their own recurring transactions" ON public.recurring_transactions;
DROP POLICY IF EXISTS "Users can update their own recurring transactions" ON public.recurring_transactions;
DROP POLICY IF EXISTS "Users can delete their own recurring transactions" ON public.recurring_transactions;

-- Créer les politiques RLS
CREATE POLICY "Users can view their own recurring transactions"
    ON public.recurring_transactions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recurring transactions"
    ON public.recurring_transactions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring transactions"
    ON public.recurring_transactions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring transactions"
    ON public.recurring_transactions
    FOR DELETE
    USING (auth.uid() = user_id);

COMMIT;
```

## 🔄 Script de Rollback

```sql
-- ============================================
-- Rollback: Transactions Récurrentes (Phase 1)
-- Version: 1.0.0
-- Date: 2024
-- ============================================

BEGIN;

-- 1. Supprimer les index sur transactions
DROP INDEX IF EXISTS public.idx_transactions_is_recurring;
DROP INDEX IF EXISTS public.idx_transactions_recurring_transaction_id;

-- 2. Supprimer les colonnes de transactions
ALTER TABLE public.transactions
    DROP COLUMN IF EXISTS recurring_transaction_id,
    DROP COLUMN IF EXISTS is_recurring;

-- 3. Supprimer les politiques RLS
DROP POLICY IF EXISTS "Users can view their own recurring transactions" ON public.recurring_transactions;
DROP POLICY IF EXISTS "Users can create their own recurring transactions" ON public.recurring_transactions;
DROP POLICY IF EXISTS "Users can update their own recurring transactions" ON public.recurring_transactions;
DROP POLICY IF EXISTS "Users can delete their own recurring transactions" ON public.recurring_transactions;

-- 4. Supprimer le trigger
DROP TRIGGER IF EXISTS trigger_update_recurring_transactions_updated_at ON public.recurring_transactions;
DROP FUNCTION IF EXISTS update_recurring_transactions_updated_at();

-- 5. Supprimer les index
DROP INDEX IF EXISTS public.idx_recurring_transactions_user_active;
DROP INDEX IF EXISTS public.idx_recurring_transactions_linked_budget_id;
DROP INDEX IF EXISTS public.idx_recurring_transactions_next_generation_date;
DROP INDEX IF EXISTS public.idx_recurring_transactions_user_id;

-- 6. Supprimer la table
DROP TABLE IF EXISTS public.recurring_transactions;

COMMIT;
```

## 📊 Description des Champs

### Table `recurring_transactions`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID | Identifiant unique (clé primaire) |
| `user_id` | UUID | Référence vers l'utilisateur propriétaire |
| `account_id` | UUID | Compte source de la transaction |
| `type` | TEXT | Type: 'income', 'expense', ou 'transfer' |
| `amount` | NUMERIC(15,2) | Montant de la transaction (toujours positif) |
| `description` | TEXT | Description de la transaction |
| `category` | TEXT | Catégorie de la transaction |
| `frequency` | TEXT | Fréquence: 'daily', 'weekly', 'monthly', 'quarterly', 'yearly' |
| `start_date` | TIMESTAMP | Date de début de la récurrence |
| `end_date` | TIMESTAMP | Date de fin (NULL = sans fin) |
| `day_of_month` | INTEGER | Jour du mois (1-31, NULL pour daily/weekly) |
| `day_of_week` | INTEGER | Jour de la semaine (0-6, NULL sauf weekly) |
| `notify_before_days` | INTEGER | Nombre de jours avant génération pour notification |
| `auto_create` | BOOLEAN | Créer automatiquement ou demander confirmation |
| `linked_budget_id` | UUID | Budget lié (optionnel) |
| `is_active` | BOOLEAN | Transaction récurrente active ou suspendue |
| `last_generated_date` | TIMESTAMP | Date de dernière génération |
| `next_generation_date` | TIMESTAMP | Prochaine date de génération calculée |
| `created_at` | TIMESTAMP | Date de création |
| `updated_at` | TIMESTAMP | Date de dernière mise à jour |

### Extension `transactions`

| Champ | Type | Description |
|-------|------|-------------|
| `is_recurring` | BOOLEAN | Indique si cette transaction provient d'une récurrence |
| `recurring_transaction_id` | UUID | Référence vers la transaction récurrente source |

## ✅ Checklist de Migration

- [ ] Sauvegarder la base de données avant migration
- [ ] Exécuter le script de migration en environnement de test
- [ ] Vérifier que toutes les contraintes sont appliquées
- [ ] Vérifier que les index sont créés
- [ ] Vérifier que les politiques RLS fonctionnent
- [ ] Tester la création de transactions récurrentes
- [ ] Tester la création de transactions liées
- [ ] Vérifier la compatibilité avec le code existant
- [ ] Documenter les changements dans ETAT-TECHNIQUE.md

## 🔒 Sécurité

- **RLS activé** : Les utilisateurs ne peuvent accéder qu'à leurs propres transactions récurrentes
- **Contraintes de validation** : Toutes les valeurs sont validées au niveau de la base de données
- **Foreign keys** : Toutes les références sont protégées par des contraintes de clés étrangères
- **Cascade delete** : Suppression en cascade des transactions récurrentes si l'utilisateur est supprimé

## 📝 Notes Importantes

1. **Idempotence** : Le script de migration utilise `IF NOT EXISTS` et `IF EXISTS` pour être sûr de s'exécuter plusieurs fois sans erreur.

2. **Compatibilité** : Les nouveaux champs ajoutés à `transactions` sont optionnels avec des valeurs par défaut, garantissant la compatibilité avec le code existant.

3. **Performance** : Les index sont créés pour optimiser les requêtes courantes :
   - Recherche par utilisateur
   - Recherche par date de génération (pour les tâches de génération automatique)
   - Recherche par budget lié

4. **RLS** : Les politiques RLS garantissent que chaque utilisateur ne peut voir/modifier que ses propres transactions récurrentes.

