# AGENT 3 - VÉRIFICATION SCHÉMA BASE DE DONNÉES GOALS-ACCOUNTS

**Date:** 2025-12-31  
**Projet:** BazarKELY  
**Objectif:** Vérifier les extensions du schéma de base de données pour la liaison goals-accounts (Session S30)  
**Session:** Multi-agent diagnostic - Agent 3

---

## 1. INDEXEDDB VERSION

### **Version Actuelle: 9** ✅

**Fichier:** `frontend/src/lib/database.ts`

**Version 9 - Unified Savings System** (lignes 370-438):
```typescript
// Version 9 - Unified Savings System: Ajout de linkedAccountId dans goals et linkedGoalId/isSavingsAccount dans accounts
this.version(9).stores({
  users: 'id, username, email, phone, passwordHash, lastSync, createdAt, updatedAt',
  accounts: 'id, userId, name, type, balance, currency, createdAt, updatedAt, linkedGoalId, isSavingsAccount, [userId+linkedGoalId], [userId+isSavingsAccount]',
  transactions: 'id, userId, accountId, type, amount, category, date, createdAt, updatedAt, [userId+date], [accountId+date], isRecurring, recurringTransactionId',
  budgets: 'id, userId, category, amount, period, year, month, spent, createdAt, updatedAt, [userId+year+month]',
  goals: 'id, userId, name, targetAmount, currentAmount, deadline, createdAt, updatedAt, linkedAccountId, [userId+deadline], [userId+linkedAccountId]',
  // ... autres tables
})
```

**Migration Version 9:**
- ✅ Initialise `linkedGoalId = null` pour tous les comptes existants
- ✅ Initialise `isSavingsAccount` basé sur `type === 'epargne'` pour comptes existants
- ✅ Initialise `linkedAccountId = null` pour tous les goals existants
- ✅ Logs de migration détaillés

**Indexes Ajoutés:**
- `[userId+linkedGoalId]` - Recherche comptes par utilisateur et goal lié
- `[userId+isSavingsAccount]` - Recherche comptes épargne par utilisateur
- `[userId+linkedAccountId]` - Recherche goals par utilisateur et compte lié

---

## 2. GOALS TABLE SCHEMA

### **Champs Complets** (Version 9)

**IndexedDB Schema** (`database.ts:376`):
```
goals: 'id, userId, name, targetAmount, currentAmount, deadline, createdAt, updatedAt, linkedAccountId, [userId+deadline], [userId+linkedAccountId]'
```

**TypeScript Interface** (`types/index.ts:133-146`):
```typescript
export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: Date;
  category?: string;
  priority: 'low' | 'medium' | 'high';
  isCompleted?: boolean;
  // Goals ↔ Accounts linking
  linkedAccountId?: string; // UUID of linked savings account
  autoSync?: boolean; // Auto-sync balance to currentAmount
}
```

### **Nouveaux Champs Session S30:**

1. **`linkedAccountId?: string`** ✅
   - UUID du compte épargne lié
   - Optionnel (peut être `undefined` ou `null`)
   - Index: `[userId+linkedAccountId]` pour recherche rapide

2. **`autoSync?: boolean`** ✅
   - Synchronisation automatique balance → currentAmount
   - Optionnel (peut être `undefined` ou `false`)
   - Non indexé (champ de configuration)

### **Champs Existants:**
- `id` - Identifiant unique
- `userId` - Propriétaire
- `name` - Nom de l'objectif
- `targetAmount` - Montant cible
- `currentAmount` - Montant actuel
- `deadline` - Date limite
- `category` - Catégorie (optionnel)
- `priority` - Priorité ('low' | 'medium' | 'high')
- `isCompleted` - Statut complétion (optionnel)
- `createdAt` - Date création
- `updatedAt` - Date mise à jour

---

## 3. ACCOUNTS TABLE SCHEMA

### **Champs Complets** (Version 9)

**IndexedDB Schema** (`database.ts:373`):
```
accounts: 'id, userId, name, type, balance, currency, createdAt, updatedAt, linkedGoalId, isSavingsAccount, [userId+linkedGoalId], [userId+isSavingsAccount]'
```

**TypeScript Interface** (`types/index.ts:70-84`):
```typescript
export interface Account {
  id: string;
  userId: string;
  name: string;
  type: 'especes' | 'courant' | 'epargne' | 'orange_money' | 'mvola' | 'airtel_money';
  balance: number;
  currency: 'MGA' | 'EUR';
  isDefault: boolean;
  displayOrder?: number;
  createdAt: Date;
  // Goals ↔ Accounts linking
  linkedGoalId?: string; // UUID of linked goal
  interestRate?: number; // Simulated annual interest rate (e.g., 2.5 for 2.5%)
  isSavingsAccount?: boolean; // Explicit flag for savings accounts
}
```

### **Nouveaux Champs Session S30:**

1. **`linkedGoalId?: string`** ✅
   - UUID du goal lié
   - Optionnel (peut être `undefined` ou `null`)
   - Index: `[userId+linkedGoalId]` pour recherche rapide

2. **`interestRate?: number`** ✅
   - Taux d'intérêt annuel simulé (ex: 2.5 pour 2.5%)
   - Optionnel (peut être `undefined`)
   - Non indexé (champ de configuration)

3. **`isSavingsAccount?: boolean`** ✅
   - Flag explicite pour comptes épargne
   - Optionnel (peut être `undefined` ou `false`)
   - Index: `[userId+isSavingsAccount]` pour recherche rapide
   - Migration: Initialisé automatiquement à `true` si `type === 'epargne'`

### **Champs Existants:**
- `id` - Identifiant unique
- `userId` - Propriétaire
- `name` - Nom du compte
- `type` - Type de compte
- `balance` - Solde actuel
- `currency` - Devise ('MGA' | 'EUR')
- `isDefault` - Compte par défaut
- `displayOrder` - Ordre d'affichage (optionnel)
- `createdAt` - Date création

### **Migration Version 9 pour Accounts:**

```typescript
// Initialiser les nouveaux champs pour accounts
for (const account of records) {
  const updates: any = {};
  // Initialiser linkedGoalId si non défini
  if ((account as any).linkedGoalId === undefined) {
    updates.linkedGoalId = null;
  }
  // Initialiser isSavingsAccount basé sur type='epargne'
  if ((account as any).isSavingsAccount === undefined) {
    updates.isSavingsAccount = (account as any).type === 'epargne';
  }
  
  if (Object.keys(updates).length > 0) {
    await table.update(account.id, updates);
  }
}
```

**Note:** `interestRate` n'est PAS initialisé dans la migration (reste `undefined` jusqu'à assignation explicite)

---

## 4. ACCOUNT TYPES

### **Types Supportés** (`types/index.ts:74`)

```typescript
type: 'especes' | 'courant' | 'epargne' | 'orange_money' | 'mvola' | 'airtel_money'
```

**Détails par Type:**

1. **`especes`** - Espèces
   - Icon: Wallet
   - Couleur: text-green-600, bg-green-50
   - `allowNegative: false`
   - Compte par défaut créé automatiquement

2. **`courant`** - Compte Courant
   - Icon: CreditCard
   - Couleur: text-blue-600, bg-blue-50
   - `allowNegative: true`

3. **`epargne`** - Épargne ⭐ **TYPE CIBLE**
   - Icon: PiggyBank
   - Couleur: text-purple-600, bg-purple-50
   - `allowNegative: false`
   - Migration v9: `isSavingsAccount = true` automatiquement

4. **`orange_money`** - Orange Money
   - Icon: Smartphone
   - Couleur: text-orange-600, bg-orange-50
   - `allowNegative: false`

5. **`mvola`** - Mvola
   - Icon: Smartphone
   - Couleur: text-red-600, bg-red-50
   - `allowNegative: false`

6. **`airtel_money`** - Airtel Money
   - Icon: Smartphone
   - Couleur: text-yellow-600, bg-yellow-50
   - `allowNegative: false`

**Constantes** (`constants/index.ts:4-48`):
- `ACCOUNT_TYPES` - Objet avec métadonnées pour chaque type
- Inclut: `name`, `icon`, `allowNegative`, `color`, `bgColor`

---

## 5. ACCOUNT CREATION

### **Service AccountService** (`accountService.ts`)

**Méthode `createAccount`** (lignes 210-286):
```typescript
async createAccount(
  userId: string, 
  accountData: Omit<Account, 'id' | 'createdAt' | 'userId'>
): Promise<Account | null>
```

**Processus:**
1. Génère UUID pour le compte
2. Crée objet Account complet
3. Sauvegarde dans IndexedDB immédiatement (offline-first)
4. Si online, sync vers Supabase
5. Si offline, queue pour sync ultérieure

**Paramètres `accountData`:**
- `name: string` - Nom du compte
- `type: Account['type']` - Type de compte
- `balance: number` - Solde initial
- `currency: 'MGA' | 'EUR'` - Devise
- `isDefault?: boolean` - Compte par défaut
- `displayOrder?: number` - Ordre d'affichage

**⚠️ GAP IDENTIFIÉ:**
- Les nouveaux champs `linkedGoalId`, `interestRate`, `isSavingsAccount` ne sont PAS gérés dans `createAccount()`
- Pas de paramètre pour définir ces champs lors création
- Pas de logique pour initialiser `isSavingsAccount` basé sur `type`

---

## 6. SAVINGS ACCOUNT FLOW

### **6.1 Création Compte Épargne - État Actuel**

**Dans AccountsPage.tsx:**
- ✅ Bouton "Ajouter un compte" présent
- ❌ Pas de modal/formulaire visible dans le code analysé
- ❌ Pas de distinction UI pour création compte épargne

**Dans accountService.ts:**
- ✅ Méthode `createAccount()` existe
- ✅ Support type='epargne'
- ❌ Pas de logique spéciale pour comptes épargne
- ❌ Pas de création automatique compte épargne

### **6.2 Flux Utilisateur Actuel**

**Scénario 1: Création Manuelle**
1. Utilisateur clique "Ajouter un compte"
2. Formulaire (non trouvé dans code analysé)
3. Sélection type compte (inclut 'epargne')
4. Création via `accountService.createAccount()`
5. Compte créé avec `type='epargne'`
6. Migration v9: `isSavingsAccount` sera `true` automatiquement

**Scénario 2: Création depuis Goal**
- ❌ **NON IMPLÉMENTÉ** - Pas de flux pour créer compte épargne depuis goal
- Pas de méthode `createGoalWithAccount()` dans accountService
- Pas de liaison automatique goal ↔ account

### **6.3 Gaps Identifiés**

**Création Compte Épargne:**
- ❌ Pas de modal/formulaire dédié pour comptes épargne
- ❌ Pas de champ `interestRate` dans formulaire création
- ❌ Pas de liaison avec goal lors création
- ❌ Pas de création automatique depuis goal suggestion

**Gestion Champs Nouveaux:**
- ❌ `accountService.createAccount()` ne gère pas `linkedGoalId`
- ❌ `accountService.createAccount()` ne gère pas `interestRate`
- ❌ `accountService.createAccount()` ne gère pas `isSavingsAccount` (rely sur migration)
- ❌ Pas de méthode pour lier un compte à un goal

**Synchronisation:**
- ❌ Pas de logique `autoSync` implémentée
- ❌ Pas de service pour synchroniser `currentAmount` ↔ `balance`
- ❌ Pas de déclenchement automatique lors mise à jour compte

---

## 7. RÉSUMÉ DES EXTENSIONS SESSION S30

### **7.1 Champs Ajoutés (5 nouveaux champs)**

**Dans Goals (2 champs):**
1. ✅ `linkedAccountId?: string` - UUID compte épargne lié
2. ✅ `autoSync?: boolean` - Synchronisation automatique

**Dans Accounts (3 champs):**
1. ✅ `linkedGoalId?: string` - UUID goal lié
2. ✅ `interestRate?: number` - Taux d'intérêt annuel
3. ✅ `isSavingsAccount?: boolean` - Flag compte épargne

### **7.2 Indexes Ajoutés**

**Indexes Goals:**
- ✅ `[userId+linkedAccountId]` - Recherche goals par compte lié

**Indexes Accounts:**
- ✅ `[userId+linkedGoalId]` - Recherche comptes par goal lié
- ✅ `[userId+isSavingsAccount]` - Recherche comptes épargne

### **7.3 Migration Version 9**

**Comptes Existants:**
- ✅ `linkedGoalId` initialisé à `null`
- ✅ `isSavingsAccount` initialisé basé sur `type === 'epargne'`
- ⚠️ `interestRate` NON initialisé (reste `undefined`)

**Goals Existants:**
- ✅ `linkedAccountId` initialisé à `null`
- ⚠️ `autoSync` NON initialisé (reste `undefined`)

---

## 8. VÉRIFICATIONS COMPLÉMENTAIRES

### **8.1 TypeScript Types**

**Goal Interface** (`types/index.ts:133-146`): ✅
- `linkedAccountId?: string` présent
- `autoSync?: boolean` présent
- Commentaires explicatifs présents

**Account Interface** (`types/index.ts:70-84`): ✅
- `linkedGoalId?: string` présent
- `interestRate?: number` présent
- `isSavingsAccount?: boolean` présent
- Commentaires explicatifs présents

**GoalFormData Interface** (`types/index.ts:305-312`): ✅
- `linkedAccountId?: string` présent dans formulaire

### **8.2 IndexedDB Schema**

**Version 9 Stores:** ✅
- Champs ajoutés dans définition stores
- Indexes ajoutés correctement
- Migration avec initialisation valeurs par défaut

### **8.3 Compatibilité Supabase**

**⚠️ NON VÉRIFIÉ:**
- Schéma Supabase non analysé dans cette session
- Nécessite vérification séparée pour synchronisation

---

## 9. RECOMMANDATIONS

### **9.1 Corrections Nécessaires**

1. **Mettre à jour `accountService.createAccount()`:**
   ```typescript
   async createAccount(
     userId: string, 
     accountData: Omit<Account, 'id' | 'createdAt' | 'userId'> & {
       linkedGoalId?: string;
       interestRate?: number;
       isSavingsAccount?: boolean;
     }
   ): Promise<Account | null>
   ```
   - Gérer les nouveaux champs lors création
   - Initialiser `isSavingsAccount` si `type === 'epargne'`

2. **Ajouter méthode liaison:**
   ```typescript
   async linkAccountToGoal(
     accountId: string,
     goalId: string,
     userId: string
   ): Promise<boolean>
   ```
   - Mettre à jour `account.linkedGoalId`
   - Mettre à jour `goal.linkedAccountId`
   - Activer `goal.autoSync = true`

3. **Implémenter synchronisation:**
   ```typescript
   async syncGoalWithAccount(goalId: string): Promise<void>
   ```
   - Récupérer goal et compte lié
   - Si `autoSync === true`, mettre à jour `currentAmount = account.balance`
   - Vérifier complétion si `currentAmount >= targetAmount`

### **9.2 Améliorations UI**

1. **Modal Création Compte Épargne:**
   - Champ `interestRate` (optionnel)
   - Option "Lier à un goal existant"
   - Checkbox "Compte épargne" (auto-checked si type='epargne')

2. **Affichage Liaison:**
   - Badge "Goal Account" sur comptes liés
   - Lien vers goal dans AccountDetailPage
   - Affichage solde réel dans GoalsPage

---

## CONCLUSION

### **✅ Extensions Schéma Validées:**

- ✅ **Version IndexedDB:** 9 (Unified Savings System)
- ✅ **Goals:** `linkedAccountId`, `autoSync` ajoutés
- ✅ **Accounts:** `linkedGoalId`, `interestRate`, `isSavingsAccount` ajoutés
- ✅ **Indexes:** 3 nouveaux indexes pour recherche rapide
- ✅ **Migration:** Initialisation valeurs par défaut correcte

### **⚠️ Gaps Identifiés:**

- ❌ `accountService.createAccount()` ne gère pas nouveaux champs
- ❌ Pas de méthode liaison goal ↔ account
- ❌ Pas de synchronisation automatique implémentée
- ❌ Pas de flux UI création compte épargne depuis goal
- ❌ `interestRate` et `autoSync` non initialisés dans migration

### **📋 Prochaines Étapes:**

1. Mettre à jour `accountService.createAccount()` pour nouveaux champs
2. Créer méthode `linkAccountToGoal()`
3. Implémenter `syncGoalWithAccount()`
4. Créer modal création compte épargne avec champs nouveaux
5. Ajouter UI affichage liaison dans GoalsPage et AccountsPage

---

**AGENT-3-DATABASE-SCHEMA-COMPLETE**

