# AGENT-3 - DATABASE SCHEMA ANALYSIS FOR ACCOUNTS ORDERING
## Documentation READ-ONLY - Analyse du schéma de base de données pour l'ordre des comptes

**Date:** 2025-11-23  
**Agent:** Agent 3 - Database Schema Analysis  
**Mission:** READ-ONLY - Analyse et documentation uniquement  
**Objectif:** Analyser le schéma de la table `accounts` pour vérifier l'existence d'une colonne d'ordre/position pour persister l'ordre après drag-and-drop

---

## ⛔ CONFIRMATION READ-ONLY

**STATUT:** ✅ **READ-ONLY CONFIRMÉ**  
**FICHIERS MODIFIÉS:** 0  
**OPÉRATIONS:** Lecture et analyse uniquement  
**MODIFICATIONS SUGGÉRÉES:** Recommandations uniquement

---

## 1. ACCOUNTS TABLE - COLUMNS IDENTIFIED

### 1.1 TypeScript Interface (types/index.ts)

**Fichier:** `frontend/src/types/index.ts`  
**Lignes:** 70-79

**Interface Account Complète:**
```typescript
export interface Account {
  id: string;
  userId: string;
  name: string;
  type: 'especes' | 'courant' | 'epargne' | 'orange_money' | 'mvola' | 'airtel_money';
  balance: number;
  currency: 'MGA' | 'EUR';
  isDefault: boolean;
  createdAt: Date;
}
```

**Colonnes Identifiées:**
- ✅ `id` - Identifiant unique
- ✅ `userId` - Référence utilisateur
- ✅ `name` - Nom du compte
- ✅ `type` - Type de compte (enum)
- ✅ `balance` - Solde
- ✅ `currency` - Devise (MGA/EUR)
- ✅ `isDefault` - Compte par défaut (boolean)
- ✅ `createdAt` - Date de création
- ❌ **`order` / `position` / `sort_order` / `display_order` - ABSENT**

### 1.2 Supabase Type Definition (types/supabase.ts)

**Fichier:** `frontend/src/types/supabase.ts`  
**Lignes:** 59-96

**Structure Supabase Account Row:**
```typescript
accounts: {
  Row: {
    id: string
    user_id: string
    name: string
    type: string
    balance: number
    currency: string
    is_default: boolean
    is_active: boolean
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    user_id: string
    name: string
    type: string
    balance?: number
    currency?: string
    is_default?: boolean
    is_active?: boolean
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    user_id?: string
    name?: string
    type?: string
    balance?: number
    currency?: string
    is_default?: boolean
    is_active?: boolean
    created_at?: string
    updated_at?: string
  }
}
```

**Colonnes Identifiées dans Supabase:**
- ✅ `id` - Identifiant unique
- ✅ `user_id` - Référence utilisateur
- ✅ `name` - Nom du compte
- ✅ `type` - Type de compte
- ✅ `balance` - Solde
- ✅ `currency` - Devise
- ✅ `is_default` - Compte par défaut (boolean)
- ✅ `is_active` - Compte actif (boolean)
- ✅ `created_at` - Date de création
- ✅ `updated_at` - Date de mise à jour
- ❌ **`display_order` / `sort_order` / `position` / `order` - ABSENT**

### 1.3 Database Schema (init.sql)

**Fichier:** `database/init.sql`  
**Lignes:** 18-29

**Structure SQL Table:**
```sql
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    balance REAL DEFAULT 0,
    currency TEXT DEFAULT 'MGA',
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Colonnes Identifiées dans SQL:**
- ✅ `id` - PRIMARY KEY
- ✅ `user_id` - NOT NULL, FOREIGN KEY
- ✅ `name` - NOT NULL
- ✅ `type` - NOT NULL
- ✅ `balance` - REAL DEFAULT 0
- ✅ `currency` - TEXT DEFAULT 'MGA'
- ✅ `is_active` - BOOLEAN DEFAULT 1
- ✅ `created_at` - DATETIME DEFAULT CURRENT_TIMESTAMP
- ✅ `updated_at` - DATETIME DEFAULT CURRENT_TIMESTAMP
- ❌ **`display_order` / `sort_order` / `position` / `order` - ABSENT**

---

## 2. ORDER COLUMN EXISTS

### 2.1 Résultat de l'Analyse

**RÉSULTAT:** ❌ **NON - AUCUNE COLONNE D'ORDRE N'EXISTE**

**Preuve:**
1. ✅ Interface TypeScript `Account` ne contient pas de champ order
2. ✅ Type Supabase `accounts.Row` ne contient pas de champ order
3. ✅ Schéma SQL `init.sql` ne contient pas de colonne order
4. ✅ Aucune migration SQL trouvée ajoutant une colonne order

### 2.2 Recherche dans le Code

**Recherche Effectuée:**
- ✅ Recherche de `order`, `position`, `sort_order`, `display_order` dans fichiers account
- ✅ Aucune référence trouvée dans les fichiers accountService.ts, AccountsPage.tsx
- ✅ Aucune requête Supabase utilisant `.order()` sur un champ order personnalisé

**Conclusion:** La colonne d'ordre n'existe pas dans le schéma actuel.

---

## 3. ACCOUNT INTERFACE

### 3.1 Interface TypeScript Complète

**Fichier:** `frontend/src/types/index.ts`  
**Lignes:** 70-79

```typescript
export interface Account {
  id: string;
  userId: string;
  name: string;
  type: 'especes' | 'courant' | 'epargne' | 'orange_money' | 'mvola' | 'airtel_money';
  balance: number;
  currency: 'MGA' | 'EUR';
  isDefault: boolean;
  createdAt: Date;
}
```

**Note:** L'interface TypeScript ne correspond pas exactement au schéma Supabase:
- TypeScript: `userId` (camelCase)
- Supabase: `user_id` (snake_case)
- TypeScript: `isDefault` (camelCase)
- Supabase: `is_default` (snake_case)
- TypeScript: `createdAt` (camelCase)
- Supabase: `created_at` (snake_case)

**Champ Manquant:** `isActive` existe dans Supabase mais pas dans l'interface TypeScript locale.

### 3.2 Mapping TypeScript ↔ Supabase

**Fichier:** `frontend/src/services/accountService.ts`  
**Lignes:** 74-85 (createAccount), 118-128 (updateAccount)

**Conversion Effectuée:**
```typescript
// Supabase → TypeScript
const account: Account = {
  id: supabaseAccount.id,
  userId: supabaseAccount.user_id,        // snake_case → camelCase
  name: supabaseAccount.name,
  type: supabaseAccount.type,
  balance: supabaseAccount.balance,
  currency: supabaseAccount.currency,
  isDefault: supabaseAccount.is_default,   // snake_case → camelCase
  isActive: supabaseAccount.is_active,     // ⚠️ Non mappé dans interface Account
  createdAt: new Date(supabaseAccount.created_at) // snake_case → camelCase
};
```

---

## 4. SUPABASE SERVICE

### 4.1 Service File Path

**Fichier Principal:** `frontend/src/services/accountService.ts`  
**Fichier API:** `frontend/src/services/apiService.ts`

### 4.2 Functions Available

**accountService.ts Functions:**

1. **`getAccounts()`** - Ligne 15-30
   - Récupère tous les comptes via `apiService.getAccounts()`
   - Retourne: `Promise<Account[]>`

2. **`getUserAccounts(userId: string)`** - Ligne 32-34
   - Alias pour `getAccounts()`
   - Retourne: `Promise<Account[]>`

3. **`getAccount(id: string, userId?: string)`** - Ligne 39-48
   - Récupère un compte par ID
   - Retourne: `Promise<Account | null>`

4. **`createAccount(userId, accountData)`** - Ligne 53-92
   - Crée un nouveau compte
   - Convertit TypeScript → Supabase format
   - Retourne: `Promise<Account | null>`

5. **`updateAccount(id, userId, accountData)`** - Ligne 97-135 ⭐
   - Met à jour un compte existant
   - Convertit TypeScript → Supabase format
   - Retourne: `Promise<Account | null>`
   - **Note:** Peut être utilisé pour mettre à jour l'ordre si colonne ajoutée

6. **`deleteAccount(id, userId?)`** - Ligne 140-154
   - Supprime un compte
   - Retourne: `Promise<boolean>`

7. **`setDefaultAccount(accountId, userId?)`** - Ligne 159-182
   - Définit un compte comme par défaut
   - Retourne: `Promise<boolean>`

8. **`getDefaultAccount()`** - Ligne 187-195
   - Récupère le compte par défaut
   - Retourne: `Promise<Account | null>`

9. **`getAccountsByType(type)`** - Ligne 200-208
   - Filtre les comptes par type
   - Retourne: `Promise<Account[]>`

10. **`getTotalBalance()`** - Ligne 214-222
    - Calcule le solde total
    - Retourne: `Promise<number>`

### 4.3 API Service Functions

**apiService.ts Functions (pertinentes):**

**`getAccounts()`** - Ligne ~140-160 (non visible dans extrait)
- Requête Supabase: `db.accounts().select('*').eq('user_id', userId)`
- **Note:** Pas de `.order()` sur un champ order personnalisé

**`updateAccount(id, accountData)`** - Ligne ~100-120 (non visible dans extrait)
- Requête Supabase: `db.accounts().update(accountData).eq('id', id)`
- **Note:** Peut être utilisé pour mettre à jour l'ordre si colonne ajoutée

---

## 5. UPDATE FUNCTION

### 5.1 Existing Update Function

**Fichier:** `frontend/src/services/accountService.ts`  
**Function:** `updateAccount(id, userId, accountData)`  
**Lignes:** 97-135

**Code Complet:**
```typescript
async updateAccount(
  id: string, 
  _userId: string, 
  accountData: Partial<Omit<Account, 'id' | 'createdAt' | 'userId'>>
): Promise<Account | null> {
  try {
    // Convertir les données vers le format Supabase
    const supabaseData: AccountUpdate = {};
    if (accountData.name !== undefined) supabaseData.name = accountData.name;
    if (accountData.type !== undefined) supabaseData.type = accountData.type;
    if (accountData.balance !== undefined) supabaseData.balance = accountData.balance;
    if (accountData.currency !== undefined) supabaseData.currency = accountData.currency;
    if (accountData.isDefault !== undefined) supabaseData.is_default = accountData.isDefault;
    if (accountData.isActive !== undefined) supabaseData.is_active = accountData.isActive;

    const response = await apiService.updateAccount(id, supabaseData);
    if (!response.success || response.error) {
      console.error('❌ Erreur lors de la mise à jour du compte:', response.error);
      return null;
    }

    console.log('✅ Compte mis à jour avec succès');
    
    // Convertir la réponse Supabase vers le format local
    const supabaseAccount = response.data as SupabaseAccount;
    const account: Account = {
      id: supabaseAccount.id,
      userId: supabaseAccount.user_id,
      name: supabaseAccount.name,
      type: supabaseAccount.type,
      balance: supabaseAccount.balance,
      currency: supabaseAccount.currency,
      isDefault: supabaseAccount.is_default,
      isActive: supabaseAccount.is_active,
      createdAt: new Date(supabaseAccount.created_at)
    };
    
    return account;
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du compte:', error);
    return null;
  }
}
```

**Capacité Actuelle:**
- ✅ Peut mettre à jour: `name`, `type`, `balance`, `currency`, `isDefault`, `isActive`
- ❌ **Ne peut PAS mettre à jour `displayOrder` (colonne n'existe pas)**

### 5.2 Modification Requise

**Pour supporter l'ordre, il faudra:**

1. **Ajouter le champ dans l'interface TypeScript:**
```typescript
export interface Account {
  // ... champs existants
  displayOrder?: number; // Nouveau champ
}
```

2. **Ajouter le mapping dans updateAccount:**
```typescript
if (accountData.displayOrder !== undefined) {
  supabaseData.display_order = accountData.displayOrder;
}
```

3. **Ajouter le mapping dans la conversion Supabase → TypeScript:**
```typescript
const account: Account = {
  // ... champs existants
  displayOrder: supabaseAccount.display_order || 0
};
```

---

## 6. SCHEMA RECOMMENDATION

### 6.1 Colonne Recommandée

**Nom de Colonne:** `display_order`  
**Type:** `INTEGER`  
**Nullable:** `YES` (pour compatibilité avec données existantes)  
**Default:** `NULL` ou `0`

**Justification:**
- Nom standard utilisé dans d'autres tables (ex: `transaction_categories.sort_order` ligne 367 de supabase.ts)
- Type INTEGER pour performance et simplicité
- Nullable pour migration progressive

### 6.2 Migration SQL Recommandée

**Fichier à Créer:** `supabase/migrations/YYYYMMDDHHMMSS_add_display_order_to_accounts.sql`

**Contenu Recommandé:**
```sql
-- Migration: Ajouter colonne display_order à la table accounts
-- Date: 2025-11-23
-- Description: Permet de persister l'ordre d'affichage des comptes après drag-and-drop

-- 1. Ajouter la colonne display_order
ALTER TABLE accounts 
ADD COLUMN display_order INTEGER DEFAULT NULL;

-- 2. Initialiser les valeurs existantes avec un ordre basé sur created_at
-- Les comptes les plus anciens auront un ordre plus bas
UPDATE accounts
SET display_order = subquery.row_number
FROM (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) as row_number
  FROM accounts
) AS subquery
WHERE accounts.id = subquery.id;

-- 3. Créer un index pour améliorer les performances des requêtes triées
CREATE INDEX IF NOT EXISTS idx_accounts_user_id_display_order 
ON accounts(user_id, display_order);

-- 4. Optionnel: Ajouter une contrainte pour garantir l'unicité de l'ordre par utilisateur
-- Note: Cette contrainte peut être ajoutée plus tard si nécessaire
-- ALTER TABLE accounts ADD CONSTRAINT unique_user_display_order 
-- UNIQUE (user_id, display_order) DEFERRABLE INITIALLY DEFERRED;
```

### 6.3 Mise à Jour TypeScript Recommandée

**1. Interface Account (types/index.ts):**
```typescript
export interface Account {
  id: string;
  userId: string;
  name: string;
  type: 'especes' | 'courant' | 'epargne' | 'orange_money' | 'mvola' | 'airtel_money';
  balance: number;
  currency: 'MGA' | 'EUR';
  isDefault: boolean;
  displayOrder?: number; // ← NOUVEAU CHAMP
  createdAt: Date;
}
```

**2. Type Supabase (types/supabase.ts):**
```typescript
accounts: {
  Row: {
    // ... champs existants
    display_order: number | null // ← NOUVEAU CHAMP
  }
  Insert: {
    // ... champs existants
    display_order?: number | null // ← NOUVEAU CHAMP
  }
  Update: {
    // ... champs existants
    display_order?: number | null // ← NOUVEAU CHAMP
  }
}
```

**3. Service accountService.ts - updateAccount:**
```typescript
if (accountData.displayOrder !== undefined) {
  supabaseData.display_order = accountData.displayOrder;
}
```

**4. Service accountService.ts - Conversion Supabase → TypeScript:**
```typescript
const account: Account = {
  // ... champs existants
  displayOrder: supabaseAccount.display_order ?? 0
};
```

**5. Service accountService.ts - getAccounts (ajouter tri):**
```typescript
// Dans apiService.getAccounts(), ajouter:
.order('display_order', { ascending: true, nullsFirst: false })
// ou
.order('display_order', { ascending: true })
```

### 6.4 Fonction Helper Recommandée

**Nouvelle Fonction dans accountService.ts:**
```typescript
/**
 * Met à jour l'ordre d'affichage de plusieurs comptes
 * Utilisé après un drag-and-drop pour persister le nouvel ordre
 */
async updateAccountsOrder(
  userId: string,
  accountOrders: Array<{ id: string; displayOrder: number }>
): Promise<boolean> {
  try {
    // Mettre à jour chaque compte avec son nouvel ordre
    const updatePromises = accountOrders.map(({ id, displayOrder }) =>
      this.updateAccount(id, userId, { displayOrder })
    );
    
    await Promise.all(updatePromises);
    console.log('✅ Ordre des comptes mis à jour avec succès');
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour de l\'ordre des comptes:', error);
    return false;
  }
}
```

---

## 7. COMPARISON WITH EXISTING PATTERNS

### 7.1 Pattern Existant: transaction_categories.sort_order

**Fichier:** `frontend/src/types/supabase.ts`  
**Lignes:** 358-398

**Exemple de Table avec Colonne d'Ordre:**
```typescript
transaction_categories: {
  Row: {
    // ... autres champs
    sort_order: number  // ← Colonne d'ordre existante
  }
}
```

**Pattern à Répliquer:**
- ✅ Nom de colonne: `sort_order` (snake_case)
- ✅ Type: `number` (INTEGER en SQL)
- ✅ Utilisé pour trier les catégories

**Recommandation:** Utiliser `display_order` au lieu de `sort_order` pour être plus explicite sur l'usage (affichage vs tri général).

---

## 8. SUMMARY

### 8.1 Réponses aux Questions

**1. ACCOUNTS TABLE - Colonnes identifiées:**
- ✅ `id`, `user_id`, `name`, `type`, `balance`, `currency`, `is_default`, `is_active`, `created_at`, `updated_at`
- ❌ **`display_order` / `sort_order` / `position` / `order` - ABSENT**

**2. ORDER COLUMN EXISTS:**
- ❌ **NON** - Aucune colonne d'ordre n'existe actuellement

**3. ACCOUNT INTERFACE:**
- ✅ Interface TypeScript: `Account` (types/index.ts lignes 70-79)
- ✅ Type Supabase: `accounts.Row` (types/supabase.ts lignes 59-96)
- ⚠️ Mapping incomplet: `isActive` existe en Supabase mais pas dans interface TypeScript

**4. SUPABASE SERVICE:**
- ✅ Fichier: `frontend/src/services/accountService.ts`
- ✅ Fonction update: `updateAccount()` existe (lignes 97-135)
- ⚠️ Ne supporte pas encore `displayOrder` (colonne n'existe pas)

**5. UPDATE FUNCTION:**
- ✅ Fonction `updateAccount()` existe et fonctionne
- ❌ Ne peut pas mettre à jour l'ordre (colonne absente)
- ✅ Peut être étendue facilement une fois la colonne ajoutée

**6. SCHEMA RECOMMENDATION:**
- ✅ Colonne: `display_order INTEGER DEFAULT NULL`
- ✅ Migration SQL fournie
- ✅ Mises à jour TypeScript recommandées
- ✅ Fonction helper `updateAccountsOrder()` recommandée

### 8.2 Actions Requises

**Pour implémenter l'ordre des comptes:**

1. **Migration Base de Données:**
   - Créer migration SQL pour ajouter `display_order`
   - Initialiser les valeurs existantes
   - Créer index pour performance

2. **Mise à Jour TypeScript:**
   - Ajouter `displayOrder?` à interface `Account`
   - Ajouter `display_order` aux types Supabase
   - Mettre à jour `updateAccount()` pour mapper `displayOrder`
   - Mettre à jour conversion Supabase → TypeScript

3. **Mise à Jour Service:**
   - Ajouter tri par `display_order` dans `getAccounts()`
   - Créer fonction `updateAccountsOrder()` pour batch updates

4. **Mise à Jour UI:**
   - Modifier `AccountsPage.tsx` pour utiliser `displayOrder` dans le tri
   - Implémenter drag-and-drop avec sauvegarde de l'ordre
   - Appeler `updateAccountsOrder()` après chaque réorganisation

---

**AGENT-3-DATABASE-SCHEMA-COMPLETE**

**Résumé:**
- ✅ Schéma actuel analysé (TypeScript, Supabase, SQL)
- ✅ Colonne d'ordre absente confirmée
- ✅ Fonction update existante identifiée
- ✅ Recommandations complètes fournies (migration SQL, TypeScript, service)
- ✅ Pattern existant (`transaction_categories.sort_order`) référencé

**FICHIERS LUS:** 6  
**FICHIERS MODIFIÉS:** 0  
**OPÉRATIONS:** Lecture et analyse uniquement






