# ANALYSE DES DÉPENDANCES - Transactions Récurrentes pour Transferts

## 📋 RÉSUMÉ EXÉCUTIF

**Date:** $(date)  
**Objectif:** Mapper la structure de la table `recurring_transactions`, les services/hooks existants, et identifier les opérations nécessaires pour ajouter le support des transferts récurrents.

**Résultat:** La table `recurring_transactions` supporte déjà le type 'transfer' dans le schéma, mais **il manque un champ pour le compte de destination** (`target_account_id`). Le service et les types sont prêts, mais nécessitent une extension pour gérer les transferts.

---

## 1. SCHÉMA DE BASE DE DONNÉES

### Table `recurring_transactions`

**Fichier de référence:** `frontend/docs/RECURRING_TRANSACTIONS_DB_MIGRATION.md`

#### Colonnes existantes:

| Colonne | Type | Description | Contraintes |
|---------|------|-------------|-------------|
| `id` | UUID | Identifiant unique (PK) | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `user_id` | UUID | Référence vers auth.users | NOT NULL, FK ON DELETE CASCADE |
| `account_id` | UUID | Compte source | NOT NULL, FK vers accounts(id) |
| `type` | TEXT | Type: 'income', 'expense', **'transfer'** | NOT NULL, CHECK IN ('income', 'expense', 'transfer') |
| `amount` | NUMERIC(15,2) | Montant (toujours positif) | NOT NULL, CHECK (amount > 0) |
| `description` | TEXT | Description | NOT NULL |
| `category` | TEXT | Catégorie | NOT NULL |
| `frequency` | TEXT | Fréquence | NOT NULL, CHECK IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly') |
| `start_date` | TIMESTAMPTZ | Date de début | NOT NULL |
| `end_date` | TIMESTAMPTZ | Date de fin (NULL = sans fin) | CHECK (end_date IS NULL OR end_date > start_date) |
| `day_of_month` | INTEGER | Jour du mois (1-31) | CHECK (day_of_month IS NULL OR (day_of_month >= 1 AND day_of_month <= 31)) |
| `day_of_week` | INTEGER | Jour de la semaine (0-6) | CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)) |
| `notify_before_days` | INTEGER | Jours avant notification | NOT NULL, DEFAULT 1, CHECK (>= 0) |
| `auto_create` | BOOLEAN | Création automatique | NOT NULL, DEFAULT false |
| `linked_budget_id` | UUID | Budget lié (optionnel) | FK vers budgets(id) ON DELETE SET NULL |
| `is_active` | BOOLEAN | Transaction active | NOT NULL, DEFAULT true |
| `last_generated_date` | TIMESTAMPTZ | Dernière génération | NULL |
| `next_generation_date` | TIMESTAMPTZ | Prochaine génération | NOT NULL, CHECK (>= start_date) |
| `created_at` | TIMESTAMPTZ | Date de création | NOT NULL, DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | Date de mise à jour | NOT NULL, DEFAULT NOW() |

#### ⚠️ CHAMP MANQUANT POUR LES TRANSFERTS:

**`target_account_id`** (UUID) - Compte de destination pour les transferts
- **Nécessaire pour:** Type 'transfer'
- **Type:** UUID, FK vers accounts(id)
- **Contrainte:** NULL pour income/expense, NOT NULL pour transfer
- **Action requise:** Migration SQL pour ajouter cette colonne

#### Index existants:

1. `idx_recurring_transactions_user_id` - Sur `user_id`
2. `idx_recurring_transactions_next_generation_date` - Sur `next_generation_date` WHERE `is_active = true`
3. `idx_recurring_transactions_linked_budget_id` - Sur `linked_budget_id` WHERE `linked_budget_id IS NOT NULL`
4. `idx_recurring_transactions_user_active` - Sur `(user_id, is_active)` WHERE `is_active = true`

#### Politiques RLS (Row Level Security):

- **SELECT:** Users can view their own recurring transactions (`auth.uid() = user_id`)
- **INSERT:** Users can create their own recurring transactions (`auth.uid() = user_id`)
- **UPDATE:** Users can update their own recurring transactions (`auth.uid() = user_id`)
- **DELETE:** Users can delete their own recurring transactions (`auth.uid() = user_id`)

---

## 2. TYPES TYPESCRIPT

### Interface `RecurringTransaction`

**Fichier:** `frontend/src/types/recurring.ts`

```typescript
export interface RecurringTransaction {
  id: string;
  userId: string;
  accountId: string;  // Compte source
  type: 'income' | 'expense' | 'transfer';  // ✅ 'transfer' déjà supporté
  amount: number;
  description: string;
  category: string;
  frequency: RecurrenceFrequency;
  startDate: Date;
  endDate: Date | null;
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  notifyBeforeDays: number;
  autoCreate: boolean;
  linkedBudgetId: string | null;
  isActive: boolean;
  lastGeneratedDate: Date | null;
  nextGenerationDate: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

#### ⚠️ CHAMP MANQUANT:

**`targetAccountId?: string`** - Compte de destination pour les transferts
- **Action requise:** Ajouter ce champ optionnel à l'interface

### Type `RecurringTransactionCreate`

```typescript
export type RecurringTransactionCreate = Omit<
  RecurringTransaction,
  'id' | 'createdAt' | 'updatedAt' | 'lastGeneratedDate' | 'nextGenerationDate'
>;
```

### Type `RecurringTransactionUpdate`

```typescript
export type RecurringTransactionUpdate = Partial<
  Omit<RecurringTransaction, 'id' | 'createdAt' | 'userId'>
> & {
  id: string;
};
```

### Interface Supabase `SupabaseRecurringTransaction`

**Fichier:** `frontend/src/types/supabase-recurring.ts`

```typescript
export interface SupabaseRecurringTransaction {
  id: string;
  user_id: string;
  account_id: string;  // Compte source
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  description: string;
  category: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  start_date: string;  // ISO date string
  end_date: string | null;
  day_of_month: number | null;
  day_of_week: number | null;
  notify_before_days: number;
  auto_create: boolean;
  linked_budget_id: string | null;
  is_active: boolean;
  last_generated_date: string | null;
  next_generation_date: string;
  created_at: string;
  updated_at: string;
}
```

#### ⚠️ CHAMP MANQUANT:

**`target_account_id?: string | null`** - Compte de destination (snake_case)

---

## 3. SERVICES EXISTANTS

### `recurringTransactionService`

**Fichier:** `frontend/src/services/recurringTransactionService.ts`

#### Fonctions principales:

1. **`create(data: RecurringTransactionCreate): Promise<RecurringTransaction>`**
   - Crée une transaction récurrente
   - Dual storage: IndexedDB (offline-first) + Supabase (sync)
   - Calcule automatiquement `nextGenerationDate`
   - **Ligne 57-121**

2. **`getAll(userId: string): Promise<RecurringTransaction[]>`**
   - Récupère toutes les transactions récurrentes d'un utilisateur
   - Synchronise IndexedDB avec Supabase
   - **Ligne 126-169**

3. **`getById(id: string): Promise<RecurringTransaction | null>`**
   - Récupère une transaction récurrente par ID
   - **Ligne 174-182**

4. **`update(id: string, data: RecurringTransactionUpdate): Promise<RecurringTransaction>`**
   - Met à jour une transaction récurrente
   - Recalcule `nextGenerationDate` si nécessaire
   - **Ligne 187-242**

5. **`delete(id: string): Promise<void>`**
   - Supprime une transaction récurrente
   - **Ligne 247-271**

6. **`generateTransaction(recurringId: string): Promise<Transaction | null>`**
   - Génère une transaction à partir d'une transaction récurrente
   - **⚠️ PROBLÈME:** Ne gère pas les transferts (ligne 380-408)
   - Appelle `transactionService.createTransaction()` avec `accountId` uniquement
   - **Action requise:** Ajouter la logique pour créer 2 transactions (débit + crédit) pour les transferts

#### Fonctions utilitaires:

- `toggleActive(id: string, isActive: boolean)`
- `calculateNextDate(recurring: RecurringTransaction): Date`
- `isDateDue(recurring: RecurringTransaction): boolean`
- `getDueTransactions(userId: string)`
- `getUpcomingInDays(userId: string, days: number)`
- `generatePendingTransactions(userId: string)`
- `getByFrequency(userId: string, frequency: RecurrenceFrequency)`
- `getByCategory(userId: string, category: TransactionCategory)`
- `getLinkedToBudget(budgetId: string)`
- `getActive(userId: string)`

#### Appels Supabase:

**INSERT (ligne 97-101):**
```typescript
const { data: supabaseResult, error } = await supabase
  .from('recurring_transactions')
  .insert(supabaseData)
  .select()
  .single();
```

**SELECT (ligne 136-139):**
```typescript
const { data: supabaseRecurring, error } = await supabase
  .from('recurring_transactions')
  .select('*')
  .eq('user_id', userId);
```

**UPDATE (ligne 224-227):**
```typescript
const { error } = await supabase
  .from('recurring_transactions')
  .update(supabaseData)
  .eq('id', id);
```

**DELETE (ligne 254-257):**
```typescript
const { error } = await supabase
  .from('recurring_transactions')
  .delete()
  .eq('id', id);
```

---

## 4. HOOKS REACT

**Aucun hook React dédié trouvé** pour les transactions récurrentes. Les pages utilisent directement `recurringTransactionService`.

**Fichiers utilisant le service:**
- `AddTransactionPage.tsx` (ligne 210)
- `RecurringTransactionsPage.tsx`
- `RecurringTransactionDetailPage.tsx`
- `RecurringTransactionsList.tsx`
- `RecurringTransactionsWidget.tsx`

---

## 5. INTÉGRATION DANS AddTransactionPage

**Fichier:** `frontend/src/pages/AddTransactionPage.tsx`

### Flux de création (lignes 208-226):

```typescript
if (isRecurring) {
  await recurringTransactionService.create({
    userId: user.id,
    accountId: formData.accountId,
    type: transactionType as 'income' | 'expense',  // ⚠️ Ne supporte pas 'transfer'
    amount: Math.abs(amount),
    description: formData.description,
    category: formData.category,
    frequency: recurringConfig.frequency,
    startDate: recurringConfig.startDate,
    endDate: recurringConfig.endDate,
    dayOfMonth: recurringConfig.dayOfMonth,
    dayOfWeek: recurringConfig.dayOfWeek,
    notifyBeforeDays: recurringConfig.notifyBeforeDays,
    autoCreate: recurringConfig.autoCreate,
    linkedBudgetId: recurringConfig.linkedBudgetId,
    isActive: true
  });
}
```

### Validation (lignes 170-186):

```typescript
const validation = validateRecurringData({
  userId: user.id,
  accountId: formData.accountId,
  type: transactionType as 'income' | 'expense',  // ⚠️ Ne supporte pas 'transfer'
  // ... autres champs
});
```

**⚠️ PROBLÈMES IDENTIFIÉS:**

1. Le type est casté en `'income' | 'expense'` - ne supporte pas 'transfer'
2. Pas de champ `targetAccountId` dans les données créées
3. La validation `validateRecurringData` ne vérifie pas les transferts

---

## 6. CHAMPS SPÉCIFIQUES AUX TRANSFERTS

### Comparaison Income/Expense vs Transfer:

| Champ | Income/Expense | Transfer | Notes |
|-------|----------------|----------|-------|
| `accountId` | ✅ Compte source | ✅ Compte source | Existant |
| `targetAccountId` | ❌ N/A | ✅ **REQUIS** | **À ajouter** |
| `type` | 'income' ou 'expense' | 'transfer' | ✅ Déjà supporté dans le type |
| `amount` | Montant positif | Montant positif | ✅ Existant |
| `category` | Catégorie requise | Catégorie requise | ✅ Existant |
| `description` | Description | Description | ✅ Existant |

### Logique de génération pour les transferts:

**Actuellement (ligne 380-393):**
```typescript
const transaction = await transactionService.createTransaction(
  recurring.userId,
  {
    type: recurring.type,
    amount: recurring.amount,
    // ... autres champs
    accountId: recurring.accountId,  // ⚠️ Un seul compte
    // ⚠️ Pas de targetAccountId
  }
);
```

**Nécessaire pour les transferts:**
```typescript
// Pour un transfert, créer 2 transactions:
// 1. Transaction de débit (compte source)
const debitTransaction = await transactionService.createTransaction(
  recurring.userId,
  {
    type: 'transfer',
    amount: -recurring.amount,  // Négatif pour débit
    accountId: recurring.accountId,
    targetAccountId: recurring.targetAccountId,  // ✅ Nouveau champ
    // ... autres champs
  }
);

// 2. Transaction de crédit (compte destination)
const creditTransaction = await transactionService.createTransaction(
  recurring.userId,
  {
    type: 'transfer',
    amount: recurring.amount,  // Positif pour crédit
    accountId: recurring.targetAccountId,
    targetAccountId: recurring.accountId,
    // ... autres champs
  }
);
```

---

## 7. APPELS API SUPABASE

### Requêtes existantes:

#### INSERT (Création)
```typescript
const { data, error } = await supabase
  .from('recurring_transactions')
  .insert({
    user_id: userId,
    account_id: accountId,
    type: 'transfer',  // ✅ Supporté
    amount: amount,
    description: description,
    category: category,
    frequency: frequency,
    start_date: startDate.toISOString(),
    end_date: endDate?.toISOString() || null,
    day_of_month: dayOfMonth,
    day_of_week: dayOfWeek,
    notify_before_days: notifyBeforeDays,
    auto_create: autoCreate,
    linked_budget_id: linkedBudgetId,
    is_active: isActive,
    next_generation_date: nextGenerationDate.toISOString()
    // ⚠️ target_account_id: manquant
  })
  .select()
  .single();
```

#### SELECT (Lecture)
```typescript
const { data, error } = await supabase
  .from('recurring_transactions')
  .select('*')
  .eq('user_id', userId);
```

#### UPDATE (Mise à jour)
```typescript
const { error } = await supabase
  .from('recurring_transactions')
  .update({
    // ... champs à mettre à jour
    // ⚠️ target_account_id: manquant
  })
  .eq('id', id);
```

#### DELETE (Suppression)
```typescript
const { error } = await supabase
  .from('recurring_transactions')
  .delete()
  .eq('id', id);
```

---

## 8. FONCTIONS DE CONVERSION SUPABASE

**Fichier:** `frontend/src/types/supabase-recurring.ts`

### Fonctions existantes:

1. **`toRecurringTransaction(supabaseRecurringTransaction): RecurringTransaction`**
   - Convertit snake_case → camelCase
   - Convertit ISO strings → Date objects
   - **Ligne 59-86**
   - **⚠️ Ne gère pas `target_account_id`**

2. **`fromRecurringTransaction(recurringTransaction): SupabaseRecurringTransaction`**
   - Convertit camelCase → snake_case
   - Convertit Date objects → ISO strings
   - **Ligne 94-121**
   - **⚠️ Ne gère pas `targetAccountId`**

3. **`fromRecurringTransactionCreate(recurringTransactionCreate): SupabaseRecurringTransactionInsert`**
   - Convertit pour INSERT
   - **Ligne 129-154**
   - **⚠️ Ne gère pas `targetAccountId`**

4. **`fromRecurringTransactionUpdate(recurringTransactionUpdate): SupabaseRecurringTransactionUpdate`**
   - Convertit pour UPDATE
   - **Ligne 162-227**
   - **⚠️ Ne gère pas `targetAccountId`**

---

## 9. VALIDATION

**Fichier:** `frontend/src/utils/recurringUtils.ts`

### Fonction `validateRecurringData`

**Ligne 102-166**

**Validations actuelles:**
- ✅ Montant > 0
- ✅ Description requise
- ✅ Catégorie requise
- ✅ Date de début valide
- ✅ Date de fin > date de début
- ✅ Jour du mois (1-31)
- ✅ Jour de la semaine (0-6)
- ✅ Cohérence fréquence/jour

**⚠️ VALIDATIONS MANQUANTES POUR TRANSFERTS:**
- `targetAccountId` requis si `type === 'transfer'`
- `targetAccountId` doit être différent de `accountId`
- `targetAccountId` doit référencer un compte valide

---

## 10. GÉNÉRATION DE TRANSACTIONS

**Fichier:** `frontend/src/services/recurringTransactionService.ts`

### Fonction `generateTransaction`

**Ligne 344-408**

**Logique actuelle:**
1. Vérifie si la transaction récurrente est active et due
2. Vérifie si une transaction n'a pas déjà été générée pour cette date
3. Crée **une seule transaction** via `transactionService.createTransaction()`
4. Met à jour `nextGenerationDate`

**⚠️ PROBLÈME POUR TRANSFERTS:**
- Crée seulement 1 transaction au lieu de 2 (débit + crédit)
- N'utilise pas `targetAccountId`
- Ne gère pas les frais de transfert

**Action requise:**
- Détecter si `type === 'transfer'`
- Créer 2 transactions (débit + crédit)
- Gérer les frais de transfert si nécessaire
- Utiliser `transactionService.createTransfer()` si disponible

---

## 11. CHECKLIST DES MODIFICATIONS NÉCESSAIRES

### Base de données:
- [ ] Ajouter colonne `target_account_id UUID` à `recurring_transactions`
- [ ] Ajouter FK vers `accounts(id)`
- [ ] Ajouter contrainte CHECK: `target_account_id IS NOT NULL` si `type = 'transfer'`
- [ ] Ajouter contrainte CHECK: `target_account_id IS NULL` si `type != 'transfer'`
- [ ] Ajouter contrainte CHECK: `target_account_id != account_id` si `type = 'transfer'`
- [ ] Créer index sur `target_account_id` si nécessaire

### Types TypeScript:
- [ ] Ajouter `targetAccountId?: string` à `RecurringTransaction`
- [ ] Ajouter `target_account_id?: string | null` à `SupabaseRecurringTransaction`
- [ ] Mettre à jour `toRecurringTransaction()` pour mapper `target_account_id`
- [ ] Mettre à jour `fromRecurringTransaction()` pour mapper `targetAccountId`
- [ ] Mettre à jour `fromRecurringTransactionCreate()` pour mapper `targetAccountId`
- [ ] Mettre à jour `fromRecurringTransactionUpdate()` pour mapper `targetAccountId`

### Services:
- [ ] Mettre à jour `recurringTransactionService.create()` pour accepter `targetAccountId`
- [ ] Mettre à jour `recurringTransactionService.generateTransaction()` pour créer 2 transactions pour les transferts
- [ ] Ajouter validation `targetAccountId` dans le service

### Validation:
- [ ] Mettre à jour `validateRecurringData()` pour valider `targetAccountId` pour les transferts
- [ ] Vérifier que `targetAccountId !== accountId`
- [ ] Vérifier que `targetAccountId` référence un compte valide

### Pages/Composants:
- [ ] Mettre à jour `AddTransactionPage.tsx` pour supporter `type: 'transfer'` dans les récurrentes
- [ ] Ajouter champ `targetAccountId` dans le formulaire de transaction récurrente
- [ ] Mettre à jour `TransferPage.tsx` pour ajouter option "Récurrent" (si nécessaire)
- [ ] Mettre à jour les composants d'affichage pour montrer le compte de destination

---

## 12. RÉSUMÉ DES DÉPENDANCES

### ✅ Déjà en place:
- Table `recurring_transactions` avec type 'transfer' supporté
- Service `recurringTransactionService` avec CRUD complet
- Types TypeScript avec `type: 'transfer'`
- Fonctions de conversion Supabase
- Validation de base
- Génération automatique de transactions

### ⚠️ À ajouter/modifier:
- Colonne `target_account_id` dans la base de données
- Champ `targetAccountId` dans les types TypeScript
- Logique de génération de 2 transactions pour les transferts
- Validation spécifique aux transferts
- Support dans `AddTransactionPage` pour créer des transferts récurrents
- Support dans `TransferPage` pour option récurrente (optionnel)

---

**AGENT-2-RECURRING-DEPENDENCIES-COMPLETE**



