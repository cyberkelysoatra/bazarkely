# AGENT 05 - ANALYSE DU SCHÉMA DE BASE DE DONNÉES
## Problème : Incohérence entre catégories de transactions et budgets

**Date:** 2025-12-26  
**Agent:** AGENT 05  
**Contexte:** BazarKELY Budget Familial - Analyse READ-ONLY du schéma de base de données

---

## 1. SCHÉMA DE LA TABLE `budgets`

### Colonnes identifiées (d'après `frontend/src/types/supabase.ts`)

```typescript
budgets: {
  Row: {
    id: string                    // UUID, PRIMARY KEY
    user_id: string               // UUID, FOREIGN KEY vers users
    name: string                  // Nom d'affichage (ex: "Budget Habillement")
    category: string              // Clé de catégorie (ex: "habillement", "vetements")
    amount: number                // Montant budgétaire en Ariary
    spent: number                 // Montant dépensé (calculé dynamiquement)
    period: string                // Période: 'monthly', 'weekly', 'yearly'
    year: number                  // Année du budget
    month: number                 // Mois du budget (1-12)
    alert_threshold: number       // Seuil d'alerte en pourcentage (ex: 80)
    is_active: boolean            // Budget actif ou non
    created_at: string            // Date de création (ISO)
    updated_at: string            // Date de mise à jour (ISO)
  }
}
```

### Observations importantes:
- **Pas de contrainte FOREIGN KEY** vers une table de catégories
- **Pas de table `categories`** dans Supabase
- Le champ `category` est un **VARCHAR libre** (pas d'énumération)
- Le champ `name` est distinct de `category` (nom d'affichage vs clé technique)

---

## 2. SCHÉMA DE LA TABLE `transactions`

### Colonnes identifiées (d'après `frontend/src/types/supabase.ts`)

```typescript
transactions: {
  Row: {
    id: string                    // UUID, PRIMARY KEY
    user_id: string               // UUID, FOREIGN KEY vers users
    account_id: string            // UUID, FOREIGN KEY vers accounts
    amount: number                // Montant de la transaction
    type: string                  // 'income' | 'expense' | 'transfer'
    category: string             // Clé de catégorie (ex: "vetements")
    description: string | null    // Description libre
    date: string                  // Date de la transaction (ISO)
    target_account_id: string | null  // Pour les transferts
    transfer_fee: number          // Frais de transfert
    tags: Json                    // Tags JSON
    location: string | null       // Localisation
    status: string               // Statut de la transaction
    notes: string | null         // Notes
    created_at: string           // Date de création
    updated_at: string           // Date de mise à jour
    current_owner_id: string     // Propriétaire actuel (pour partage familial)
    original_owner_id: string | null  // Propriétaire original
    transferred_at: string | null    // Date de transfert
  }
}
```

### Observations importantes:
- **Pas de contrainte FOREIGN KEY** vers une table de catégories
- Le champ `category` est un **VARCHAR libre**
- Type TypeScript: `TransactionCategory` = `'vetements'` (minuscules)

---

## 3. TABLE `categories` - N'EXISTE PAS

### Résultat de l'analyse:
- **Aucune table `categories` ou `transaction_categories` dans Supabase**
- Les catégories sont définies dans le code TypeScript uniquement
- Fichier de définition: `frontend/src/constants/index.ts` → `TRANSACTION_CATEGORIES`

### Catégories définies dans le code:

```typescript
export const TRANSACTION_CATEGORIES = {
  vetements: { 
    name: 'Vêtements',    // Nom d'affichage avec accent
    icon: 'Shirt', 
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-50'
  },
  // ... autres catégories
  'Habillement': {        // ⚠️ ENTRÉE DUPLIQUÉE avec majuscule
    name: 'Habillement',
    icon: 'Shirt',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-50'
  }
}
```

### Type TypeScript:
```typescript
export type TransactionCategory = 
  | 'alimentation' | 'logement' | 'transport' | 'sante' 
  | 'education' | 'communication' | 'vetements' | 'loisirs' 
  | 'famille' | 'solidarite' | 'autres';
```

**Note:** Le type `TransactionCategory` ne contient **PAS** `'Habillement'` (avec majuscule), seulement `'vetements'` (minuscules).

---

## 4. RELATIONS ENTRE TABLES (FOREIGN KEYS)

### Relations identifiées:

1. **`budgets.user_id` → `users.id`**
   - Relation: Un utilisateur peut avoir plusieurs budgets
   - Pas de contrainte CASCADE identifiée dans le code

2. **`transactions.user_id` → `users.id`**
   - Relation: Un utilisateur peut avoir plusieurs transactions

3. **`transactions.account_id` → `accounts.id`**
   - Relation: Une transaction appartient à un compte

### Relations MANQUANTES:
- **Aucune relation entre `budgets.category` et `transactions.category`**
- **Pas de table de référence pour les catégories**
- Le matching se fait par **comparaison de chaînes** dans le code frontend

---

## 5. ORIGINE DES DONNÉES "habillement"

### Source identifiée: `budgetIntelligenceService.ts`

**Fichier:** `frontend/src/services/budgetIntelligenceService.ts`

**Interface `CategoryBudgets`:**
```typescript
export interface CategoryBudgets {
  readonly Alimentation: number;
  readonly Logement: number;
  readonly Transport: number;
  readonly Communication: number;
  readonly Habillement: number;    // ⚠️ AVEC MAJUSCULE
  readonly Santé: number;
  readonly Éducation: number;
  readonly Loisirs: number;
  readonly Solidarité: number;
  readonly Épargne: number;
  readonly Autres: number;
}
```

**Allocation standard:**
```typescript
const STANDARD_BUDGET_ALLOCATION = {
  // ...
  Habillement: 0.02,     // 2% (maintenu)
  // ...
}
```

### Processus de création des budgets:

**Fichier:** `frontend/src/hooks/useBudgetIntelligence.ts` (ligne 495-498)

```typescript
const budgetPromises = Object.entries(intelligentBudgets).map(async ([category, amount]) => {
  const budgetData = {
    name: `Budget ${category}`,      // "Budget Habillement"
    category: category.toLowerCase(), // "habillement" (minuscules)
    // ...
  };
});
```

**Résultat:**
- Les budgets sont créés avec `category: "habillement"` (minuscules)
- Mais la clé dans `intelligentBudgets` est `"Habillement"` (avec majuscule)

**Fichier:** `frontend/src/pages/BudgetsPage.tsx` (ligne 339-348)

```typescript
const budgetPromises = Object.entries(intelligentBudgets).map(async ([category, amount]) => {
  const budgetData = {
    name: `Budget ${category}`,  // "Budget Habillement"
    category: category,           // ⚠️ PAS DE .toLowerCase() ICI
    // ...
  };
});
```

**Résultat:**
- Dans `BudgetsPage.tsx`, la catégorie est sauvegardée **telle quelle** (avec majuscule si présente)
- Donc `category: "Habillement"` peut être sauvegardé en base

---

## 6. CAUSE RACINE DU PROBLÈME

### Problème identifié:

1. **Transactions utilisent:** `category: "vetements"` (minuscules, sans accent)
   - Défini dans `TransactionCategory` type
   - Utilisé dans `TRANSACTION_CATEGORIES['vetements']`

2. **Budgets utilisent:** `category: "habillement"` ou `category: "Habillement"`
   - Créés depuis `CategoryBudgets` interface qui utilise `"Habillement"` (majuscule)
   - Transformé en `"habillement"` (minuscules) dans `useBudgetIntelligence.ts`
   - Mais peut être sauvegardé comme `"Habillement"` dans `BudgetsPage.tsx`

3. **Matching dans `calculateSpentAmounts`:** (ligne 94-110 de `BudgetsPage.tsx`)

```typescript
// Calculer les montants dépensés par catégorie
const spentByCategory: Record<string, number> = {};
currentMonthTransactions.forEach(transaction => {
  const category = transaction.category;  // "vetements"
  spentByCategory[category] = (spentByCategory[category] || 0) + Math.abs(transaction.amount);
});

// Mettre à jour les budgets
const updatedBudgets = budgets.map(budget => {
  const normalizedCategory = budget.category.toLowerCase();  // "habillement" ou "habillement"
  const spentAmount = spentByCategory[normalizedCategory] || 0;  // Cherche "habillement" dans spentByCategory
  // ...
});
```

**Le problème:**
- `spentByCategory` contient la clé `"vetements"` (depuis les transactions)
- `normalizedCategory` est `"habillement"` (depuis les budgets)
- **`"vetements" !== "habillement"`** → Le matching échoue !

### Résultat:
- Budget "habillement" avec 54188 Ar budget, 0 Ar dépensé
- Transaction "Vêtements" avec 6000 Ar dépensé, mais non comptabilisé dans le budget

---

## 7. DONNÉES DE SEED / MIGRATIONS

### Migrations Supabase analysées:
- `supabase/migrations/20251112215308_phase3_security_foundations.sql`
- `supabase/migrations/20251114124405_add_alert_type_to_poc_alerts.sql`
- `supabase/migrations/20251115120000_make_supplier_company_id_nullable.sql`
- `supabase/migrations/20251115130000_add_company_id_to_org_unit_members.sql`
- `supabase/migrations/20251128_add_daily_weekly_periods.sql`
- `supabase/migrations/fix_family_members_rls.sql`

**Résultat:** Aucune migration ne crée ou modifie les tables `budgets` ou `transactions`.

### Fichiers SQL de seed identifiés:
- `database/init.sql` (SQLite, pour PWA offline)
- `database/setup-mysql-ovh.sql` (MySQL, pour OVH)

**Contenu de `database/init.sql` (ligne 110):**
```sql
INSERT OR IGNORE INTO transaction_categories (id, name, icon, color, bg_color) VALUES
('vetements', 'Vêtements', 'Shirt', 'text-indigo-600', 'bg-indigo-50');
```

**Note:** Ces fichiers SQL sont pour les bases de données SQLite/MySQL, **PAS pour Supabase**.

---

## 8. RÉSUMÉ ET RECOMMANDATIONS

### Problème identifié:
**Incohérence de nommage des catégories entre transactions et budgets:**
- Transactions: `"vetements"` (minuscules, sans accent)
- Budgets: `"habillement"` ou `"Habillement"` (selon le code qui crée le budget)

### Causes:
1. **Double définition dans `TRANSACTION_CATEGORIES`:**
   - `vetements` (clé standard)
   - `Habillement` (clé avec majuscule, ajoutée pour "compatibilité")

2. **Interface `CategoryBudgets` utilise `"Habillement"`** (majuscule)

3. **Transformation incohérente:**
   - `useBudgetIntelligence.ts` utilise `.toLowerCase()` → `"habillement"`
   - `BudgetsPage.tsx` sauvegarde tel quel → peut être `"Habillement"`

4. **Pas de normalisation lors du matching:**
   - Le matching compare `"vetements"` vs `"habillement"` → échec

### Recommandations:

1. **Normaliser les clés de catégories:**
   - Utiliser UNE SEULE clé: `"vetements"` (minuscules, sans accent)
   - Supprimer l'entrée `'Habillement'` de `TRANSACTION_CATEGORIES`

2. **Corriger l'interface `CategoryBudgets`:**
   - Remplacer `Habillement` par `Vetements` (ou mapper lors de la création)

3. **Normaliser lors de la création de budgets:**
   - Toujours utiliser `.toLowerCase()` et mapper `"Habillement"` → `"vetements"`

4. **Améliorer le matching:**
   - Ajouter un mapping de normalisation dans `calculateSpentAmounts`
   - Ou créer une fonction utilitaire de normalisation de catégories

5. **Migration de données:**
   - Mettre à jour les budgets existants avec `category = "habillement"` → `category = "vetements"`

---

## 9. FICHIERS CLÉS IDENTIFIÉS

### Schéma et types:
- `frontend/src/types/supabase.ts` - Types Supabase générés
- `frontend/src/types/index.ts` - Types TypeScript (TransactionCategory)

### Constantes:
- `frontend/src/constants/index.ts` - TRANSACTION_CATEGORIES (définition des catégories)

### Services:
- `frontend/src/services/budgetIntelligenceService.ts` - Interface CategoryBudgets avec "Habillement"
- `frontend/src/services/recurringTransactionService.ts` - Matching de budgets par catégorie

### Hooks et pages:
- `frontend/src/hooks/useBudgetIntelligence.ts` - Création automatique de budgets (ligne 495-498)
- `frontend/src/pages/BudgetsPage.tsx` - Calcul des montants dépensés (ligne 94-119) et création manuelle (ligne 339-348)

---

**AGENT 05 SIGNATURE:** AGENT-05-DATABASE-COMPLETE



