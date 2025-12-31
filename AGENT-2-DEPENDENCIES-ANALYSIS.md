# AGENT 2 - ANALYSE DES DÉPENDANCES SYSTÈME ÉPARGNE UNIFIÉ

**Date:** 2025-12-31  
**Projet:** BazarKELY  
**Objectif:** Cartographier les dépendances entre goals, accounts (type='epargne'), challenges et recommendations pour un système d'épargne unifié  
**Session:** Multi-agent diagnostic - Agent 2

---

## 1. ACCOUNTS SERVICE

### **Structure et Types**

**Types de comptes supportés** (`frontend/src/types/index.ts`):
- `especes` - Espèces (Wallet icon)
- `courant` - Compte Courant (CreditCard icon)
- `epargne` - Épargne (PiggyBank icon) ⭐ **TYPE CIBLE**
- `orange_money` - Orange Money (Smartphone icon)
- `mvola` - Mvola (Smartphone icon)
- `airtel_money` - Airtel Money (Smartphone icon)

**Interface Account** (`frontend/src/types/index.ts:70-80`):
```typescript
interface Account {
  id: string;
  userId: string;
  name: string;
  type: 'especes' | 'courant' | 'epargne' | 'orange_money' | 'mvola' | 'airtel_money';
  balance: number;
  currency: 'MGA' | 'EUR';
  isDefault: boolean;
  displayOrder?: number;
  createdAt: Date;
}
```

### **CRUD Operations** (`frontend/src/services/accountService.ts`)

**✅ Opérations disponibles:**
- `getAccounts()` - Récupère tous les comptes (offline-first pattern)
- `getUserAccounts(userId)` - Comptes triés par displayOrder
- `getAccount(id)` - Récupère un compte par ID
- `createAccount(userId, accountData)` - Crée un compte (IndexedDB + Supabase sync)
- `updateAccount(id, userId, accountData)` - Met à jour un compte
- `deleteAccount(id, userId)` - Supprime un compte
- `setDefaultAccount(accountId, userId)` - Définit le compte par défaut
- `getDefaultAccount()` - Récupère le compte par défaut
- `getAccountsByType(type)` - Filtre par type (ex: 'epargne')
- `getTotalBalance()` - Calcule le solde total
- `updateAccountsOrder(userId, orderedAccountIds)` - Met à jour l'ordre d'affichage

**Caractéristiques:**
- ✅ Pattern offline-first (IndexedDB → Supabase)
- ✅ Synchronisation automatique via syncQueue
- ✅ Support PWA Phase 3 (priority, syncTag, expiresAt)
- ✅ Gestion multi-devises (MGA/EUR)

### **Gaps Identifiés:**
- ❌ **AUCUNE liaison avec goals** - Les comptes épargne ne sont pas liés aux objectifs
- ❌ **Pas de champ accountId dans Goal** - Impossible de savoir quel compte sert pour quel goal
- ❌ **Pas de méthode pour lier un compte à un goal**

---

## 2. CHALLENGE SERVICE

### **Structure des Challenges** (`frontend/src/services/challengeService.ts`)

**Types de défis:**
- `daily` - Défis quotidiens (5-20 points)
- `weekly` - Défis hebdomadaires (30-80 points)
- `monthly` - Défis mensuels (100-300 points)
- `special` - Défis spéciaux (200-500 points)

**Types d'exigences:**
- `no_expense_category` - Éviter une catégorie de dépenses
- `save_amount` - Épargner un montant spécifique ⭐ **CONNEXION ÉPARGNE**
- `complete_quiz` - Compléter des quiz
- `track_daily` - Suivi quotidien
- `follow_budget` - Respecter le budget

**Interface Challenge:**
```typescript
interface Challenge {
  id: string;
  type: ChallengeType;
  title: string;
  description: string;
  requirements: ChallengeRequirement[];
  duration_days: number;
  points_reward: number;
  badge_reward?: string;
  category?: string; // Peut être 'epargne'
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
}
```

### **Défis liés à l'épargne** (23 occurrences trouvées):

1. **daily_save_1000** - Épargner 1,000 Ar (8 points, category: 'epargne')
2. **weekly_save_10000** - Épargner 10,000 Ar (40 points, category: 'epargne')
3. **monthly_save_50000** - Épargner 50,000 Ar (150 points, category: 'epargne')
4. **special_rentree_scolaire** - Épargner 100,000 Ar pour rentrée (300 points, category: 'epargne')
5. **special_emergency_fund** - Épargner 300,000 Ar (400 points, category: 'epargne')
6. **special_financial_freedom** - Épargner 500,000 Ar (500 points, category: 'epargne')
7. **special_independence_day** - Épargner 19,600 Ar (200 points, category: 'epargne')

### **Calcul du Progrès Épargne** (`challengeService.ts:835-851`)

**Méthode actuelle:**
```typescript
const calculateSaveAmountProgress = (
  requirement: ChallengeRequirement,
  transactions: readonly Transaction[]
): number => {
  const totalSaved = transactions
    .filter(tx => tx.type === 'income' && tx.description.toLowerCase().includes('épargne'))
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const target = typeof requirement.target_value === 'number' 
    ? requirement.target_value 
    : parseInt(requirement.target_value);
  
  return Math.min(100, Math.round((totalSaved / target) * 100));
};
```

**⚠️ PROBLÈME CRITIQUE:**
- Utilise uniquement les transactions avec description contenant "épargne"
- **N'utilise PAS les comptes type='epargne'**
- **N'utilise PAS les goals**
- Détection fragile basée sur texte libre

### **Gaps Identifiés:**
- ❌ **Aucune référence aux accounts type='epargne'** - Les défis ne vérifient pas les comptes épargne
- ❌ **Aucune référence aux goals** - Les défis ne sont pas liés aux objectifs utilisateur
- ❌ **Détection épargne fragile** - Basée sur texte libre dans description
- ❌ **Pas de synchronisation** - Les défis ne mettent pas à jour les goals automatiquement

---

## 3. RECOMMENDATION SERVICE

### **Structure des Recommandations** (`frontend/src/services/recommendationEngineService.ts`)

**Types de recommandations:**
- `daily` - Recommandations quotidiennes
- `contextual` - Recommandations contextuelles

**Thèmes disponibles:**
- `savings` - Épargne ⭐
- `expense_reduction` - Réduction dépenses
- `budget_optimization` - Optimisation budget
- `education` - Éducation financière
- `mobile_money` - Mobile money

**Templates d'épargne** (4 templates):
1. "Épargnez automatiquement avec Orange Money"
2. "Créez un fonds d'urgence de 3 mois"
3. "Épargnez les petites sommes quotidiennes"
4. "Utilisez la règle 50-30-20"

### **Détection Contextuelle** (`recommendationEngineService.ts:411-432`)

**Déclencheur: Épargne faible**
```typescript
// Déclencheur: Épargne faible
const savingsPriority = user.preferences?.priorityAnswers?.savings_priority;
if (savingsPriority === 'high' || savingsPriority === 'medium') {
  const currentSavings = calculateCurrentSavings(recentTransactions);
  const targetSavings = calculateTargetSavings(user);
  
  if (currentSavings < (targetSavings * TRIGGER_THRESHOLDS.SAVINGS_LOW / 100)) {
    triggeredRecommendations.push(createContextualRecommendation(...));
  }
}
```

**Calcul de l'épargne actuelle** (`recommendationEngineService.ts:897-912`):
```typescript
const calculateCurrentSavings = (transactions: readonly Transaction[]): number => {
  const last30Days = transactions.filter(tx => 
    new Date(tx.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );
  
  // Calculer l'épargne comme la différence entre revenus et dépenses
  const totalIncome = last30Days
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const totalExpenses = last30Days
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  return Math.max(0, totalIncome - totalExpenses);
};
```

### **Gaps Identifiés:**
- ❌ **N'utilise PAS les comptes type='epargne'** - Calcul basé sur transactions uniquement
- ❌ **N'utilise PAS les goals** - Pas de référence aux objectifs d'épargne
- ❌ **Calcul approximatif** - Différence revenus/dépenses ≠ épargne réelle
- ❌ **Pas de recommandations basées sur goals** - Ne suggère pas de goals spécifiques

---

## 4. CURRENT INTEGRATIONS

### **Connexions Existantes:**

#### ✅ **Accounts ↔ Transactions**
- Les transactions ont un `accountId` qui référence un compte
- Les comptes peuvent être filtrés par type (`getAccountsByType('epargne')`)

#### ✅ **Challenges ↔ Transactions**
- Les défis analysent les transactions pour calculer le progrès
- Utilisation de `calculateSaveAmountProgress()` avec filtrage transactions

#### ✅ **Recommendations ↔ User Preferences**
- Les recommandations utilisent `user.preferences.priorityAnswers`
- Détection basée sur `savings_priority`

### **Connexions MANQUANTES:**

#### ❌ **Goals ↔ Accounts**
- **AUCUNE connexion** - Les goals n'ont pas de champ `accountId`
- Impossible de savoir quel compte épargne sert pour quel goal
- Les goals ont `currentAmount` mais pas de lien avec le solde réel du compte

#### ❌ **Goals ↔ Challenges**
- **AUCUNE connexion** - Les défis ne référencent pas les goals
- Les défis calculent l'épargne indépendamment des goals
- Complétion d'un défi n'actualise pas les goals

#### ❌ **Goals ↔ Recommendations**
- **AUCUNE connexion** - Les recommandations ne suggèrent pas de goals
- Pas de recommandations basées sur les goals existants
- Pas de création automatique de goals depuis les recommandations

#### ❌ **Challenges ↔ Accounts**
- **AUCUNE connexion** - Les défis ne vérifient pas les comptes épargne
- Calcul basé uniquement sur transactions texte libre
- Pas de vérification du solde réel des comptes type='epargne'

#### ❌ **Recommendations ↔ Accounts**
- **AUCUNE connexion** - Les recommandations n'utilisent pas les comptes épargne
- Calcul approximatif basé sur transactions uniquement
- Pas de recommandations pour créer/utiliser des comptes épargne

---

## 5. DATA FLOW GAPS

### **Flux de Données Actuel:**

```
User → Goals (isolé)
User → Accounts (isolé)
User → Challenges → Transactions (partiel)
User → Recommendations → User Preferences (partiel)
```

### **Flux de Données Manquant:**

```
User → Goals ←→ Accounts (type='epargne') ❌ MANQUANT
User → Goals ←→ Challenges ❌ MANQUANT
User → Goals ←→ Recommendations ❌ MANQUANT
Challenges → Accounts (type='epargne') ❌ MANQUANT
Recommendations → Accounts (type='epargne') ❌ MANQUANT
```

### **Scénarios Non Supportés:**

1. **Créer un goal lié à un compte épargne spécifique** ❌
2. **Suivre automatiquement le progrès d'un goal via le solde du compte** ❌
3. **Compléter un challenge qui met à jour automatiquement un goal** ❌
4. **Recevoir une recommandation pour créer un goal avec compte épargne** ❌
5. **Vérifier le progrès d'un challenge via les comptes épargne** ❌
6. **Synchroniser currentAmount d'un goal avec le solde du compte lié** ❌

---

## 6. INDEXEDDB SCHEMA

### **Tables Existantes** (`frontend/src/lib/database.ts`)

**Version 7 (actuelle):**

```typescript
accounts: 'id, userId, name, type, balance, currency, createdAt, updatedAt'
goals: 'id, userId, name, targetAmount, currentAmount, deadline, createdAt, updatedAt, [userId+deadline]'
transactions: 'id, userId, accountId, type, amount, category, date, createdAt, updatedAt, [userId+date], [accountId+date]'
```

### **Champs Goals:**
- `id` - Identifiant unique
- `userId` - Propriétaire
- `name` - Nom de l'objectif
- `targetAmount` - Montant cible
- `currentAmount` - Montant actuel ⚠️ **Non synchronisé avec accounts**
- `deadline` - Date limite
- `createdAt` - Date création
- `updatedAt` - Date mise à jour

### **Champs Accounts:**
- `id` - Identifiant unique
- `userId` - Propriétaire
- `name` - Nom du compte
- `type` - Type (peut être 'epargne')
- `balance` - Solde actuel ⚠️ **Non lié à goals**
- `currency` - Devise
- `createdAt` - Date création
- `updatedAt` - Date mise à jour

### **Champs Manquants:**

**Dans Goals:**
- ❌ `accountId` - Référence au compte épargne lié
- ❌ `linkedAccountBalance` - Solde synchronisé du compte
- ❌ `autoSync` - Synchronisation automatique avec compte

**Dans Accounts:**
- ❌ `goalId` - Référence au goal lié (si applicable)
- ❌ `isGoalAccount` - Flag pour compte dédié à un goal

---

## 7. SUPABASE SCHEMA

### **Table Goals** (`frontend/src/types/supabase.ts:218-261`)

```typescript
goals: {
  Row: {
    id: string
    user_id: string
    name: string
    target_amount: number
    current_amount: number
    target_date: string | null
    category: string | null
    description: string | null
    priority: string
    is_completed: boolean
    created_at: string
    updated_at: string
  }
}
```

**Champs Supabase:**
- ✅ `category` - Catégorie (peut être utilisée pour 'epargne')
- ✅ `priority` - Priorité
- ✅ `is_completed` - Statut complétion
- ❌ **PAS de `account_id`** - Aucune référence aux comptes

### **Table Accounts** (`database/setup-mysql-ovh.sql:33-47`)

```sql
CREATE TABLE IF NOT EXISTS accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    type ENUM('courant', 'epargne', 'orange_money', 'airtel_money', 'mvola') NOT NULL,
    balance DECIMAL(15,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'MGA',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_type (type)
);
```

**Champs Supabase:**
- ✅ `type` - Type de compte (inclut 'epargne')
- ✅ `balance` - Solde
- ❌ **PAS de `goal_id`** - Aucune référence aux goals

---

## 8. INTEGRATION OPPORTUNITIES

### **Opportunité 1: Lier Goals ↔ Accounts**

**Changements nécessaires:**

1. **Ajouter `accountId` dans Goal:**
   ```typescript
   interface Goal {
     // ... champs existants
     accountId?: string; // ID du compte épargne lié
     autoSync?: boolean; // Synchronisation automatique avec compte
   }
   ```

2. **Ajouter `goalId` dans Account (optionnel):**
   ```typescript
   interface Account {
     // ... champs existants
     goalId?: string; // ID du goal lié (si compte dédié)
     isGoalAccount?: boolean; // Flag compte dédié à un goal
   }
   ```

3. **Service de synchronisation:**
   ```typescript
   async syncGoalWithAccount(goalId: string): Promise<void> {
     const goal = await getGoal(goalId);
     if (goal.accountId) {
       const account = await accountService.getAccount(goal.accountId);
       if (account && account.type === 'epargne') {
         await updateGoal(goalId, { currentAmount: account.balance });
       }
     }
   }
   ```

**Bénéfices:**
- ✅ Suivi automatique du progrès via solde réel
- ✅ Visualisation unifiée goal/compte
- ✅ Synchronisation bidirectionnelle

---

### **Opportunité 2: Lier Challenges ↔ Goals**

**Changements nécessaires:**

1. **Ajouter `goalId` dans ChallengeRequirement:**
   ```typescript
   interface ChallengeRequirement {
     type: ChallengeRequirementType;
     target_value: number | string;
     target_category?: string;
     goalId?: string; // ID du goal lié pour save_amount
     description: string;
   }
   ```

2. **Modifier `calculateSaveAmountProgress`:**
   ```typescript
   const calculateSaveAmountProgress = (
     requirement: ChallengeRequirement,
     transactions: readonly Transaction[],
     accounts: Account[] // Ajouter accounts
   ): number => {
     // Option 1: Via goal si lié
     if (requirement.goalId) {
       const goal = await getGoal(requirement.goalId);
       if (goal.accountId) {
         const account = accounts.find(a => a.id === goal.accountId);
         if (account) {
           return Math.min(100, Math.round((account.balance / goal.targetAmount) * 100));
         }
       }
     }
     
     // Option 2: Via comptes épargne
     const savingsAccounts = accounts.filter(a => a.type === 'epargne');
     const totalSavings = savingsAccounts.reduce((sum, acc) => sum + acc.balance, 0);
     
     // Option 3: Fallback transactions (méthode actuelle)
     // ...
   };
   ```

3. **Mettre à jour goal lors complétion challenge:**
   ```typescript
   if (challengeProgress >= 100) {
     // Mettre à jour le goal lié
     if (requirement.goalId) {
       await syncGoalWithAccount(requirement.goalId);
     }
   }
   ```

**Bénéfices:**
- ✅ Défis basés sur goals réels
- ✅ Mise à jour automatique goals lors complétion défis
- ✅ Suivi précis via comptes épargne

---

### **Opportunité 3: Lier Recommendations ↔ Goals**

**Changements nécessaires:**

1. **Recommandations basées sur goals:**
   ```typescript
   const generateGoalBasedRecommendations = (
     goals: Goal[],
     accounts: Account[]
   ): Recommendation[] => {
     const recommendations: Recommendation[] = [];
     
     // Recommandation pour goals sans compte
     const goalsWithoutAccount = goals.filter(g => !g.accountId && !g.isCompleted);
     if (goalsWithoutAccount.length > 0) {
       recommendations.push({
         theme: 'savings',
         title: 'Créez un compte épargne pour vos objectifs',
         description: `Vous avez ${goalsWithoutAccount.length} objectif(s) sans compte dédié.`,
         actionable_steps: [
           'Créez un compte épargne',
           'Liez-le à votre objectif',
           'Configurez un virement automatique'
         ]
       });
     }
     
     // Recommandation pour goals en retard
     const overdueGoals = goals.filter(g => 
       new Date(g.deadline) < new Date() && !g.isCompleted
     );
     // ...
     
     return recommendations;
   };
   ```

2. **Création automatique de goals depuis recommandations:**
   ```typescript
   const createGoalFromRecommendation = async (
     recommendation: Recommendation,
     userId: string
   ): Promise<Goal> => {
     // Extraire montant cible de la recommandation
     const targetAmount = extractAmountFromRecommendation(recommendation);
     
     // Créer le goal
     const goal = await createGoal({
       userId,
       name: recommendation.title,
       targetAmount,
       deadline: calculateDeadline(recommendation),
       category: 'epargne'
     });
     
     // Créer compte épargne dédié
     const account = await accountService.createAccount(userId, {
       name: `Épargne ${goal.name}`,
       type: 'epargne',
       balance: 0,
       currency: 'MGA'
     });
     
     // Lier goal et compte
     await linkGoalToAccount(goal.id, account.id);
     
     return goal;
   };
   ```

**Bénéfices:**
- ✅ Recommandations contextuelles basées sur goals
- ✅ Création automatique goals + comptes
- ✅ Suggestions personnalisées selon progrès

---

### **Opportunité 4: Service Unifié Épargne**

**Créer `savingsService.ts`:**

```typescript
class SavingsService {
  /**
   * Crée un goal avec compte épargne dédié
   */
  async createGoalWithAccount(
    userId: string,
    goalData: Omit<Goal, 'id' | 'accountId'>,
    accountName?: string
  ): Promise<{ goal: Goal; account: Account }> {
    // 1. Créer le compte épargne
    const account = await accountService.createAccount(userId, {
      name: accountName || `Épargne ${goalData.name}`,
      type: 'epargne',
      balance: 0,
      currency: 'MGA'
    });
    
    // 2. Créer le goal avec accountId
    const goal = await goalService.createGoal({
      ...goalData,
      accountId: account.id,
      autoSync: true
    });
    
    // 3. Lier le compte au goal
    await accountService.updateAccount(account.id, userId, {
      goalId: goal.id,
      isGoalAccount: true
    });
    
    return { goal, account };
  }
  
  /**
   * Synchronise tous les goals avec leurs comptes
   */
  async syncAllGoalsWithAccounts(userId: string): Promise<void> {
    const goals = await goalService.getGoals(userId);
    const accounts = await accountService.getAccounts();
    
    for (const goal of goals) {
      if (goal.accountId && goal.autoSync) {
        const account = accounts.find(a => a.id === goal.accountId);
        if (account && account.type === 'epargne') {
          await goalService.updateGoal(goal.id, {
            currentAmount: account.balance
          });
          
          // Vérifier complétion
          if (account.balance >= goal.targetAmount && !goal.isCompleted) {
            await goalService.completeGoal(goal.id);
          }
        }
      }
    }
  }
  
  /**
   * Calcule l'épargne totale depuis comptes
   */
  async getTotalSavings(userId: string): Promise<number> {
    const accounts = await accountService.getAccountsByType('epargne');
    return accounts.reduce((sum, acc) => sum + acc.balance, 0);
  }
  
  /**
   * Vérifie le progrès d'un challenge via comptes/goals
   */
  async checkChallengeProgressViaSavings(
    challengeId: string,
    userId: string
  ): Promise<number> {
    const challenge = getChallengeLibrary().find(c => c.id === challengeId);
    if (!challenge) return 0;
    
    const saveRequirement = challenge.requirements.find(
      r => r.type === 'save_amount'
    );
    if (!saveRequirement) return 0;
    
    // Option 1: Via goals si lié
    if (saveRequirement.goalId) {
      const goal = await goalService.getGoal(saveRequirement.goalId);
      if (goal) {
        return Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
      }
    }
    
    // Option 2: Via comptes épargne
    const totalSavings = await this.getTotalSavings(userId);
    const target = typeof saveRequirement.target_value === 'number'
      ? saveRequirement.target_value
      : parseInt(saveRequirement.target_value);
    
    return Math.min(100, Math.round((totalSavings / target) * 100));
  }
}
```

**Bénéfices:**
- ✅ Point d'entrée unique pour épargne
- ✅ Synchronisation automatique goals/comptes
- ✅ Calcul précis via comptes réels
- ✅ Intégration challenges/goals/recommendations

---

## 9. PRIORISATION DES INTÉGRATIONS

### **Priorité HAUTE:**

1. **Lier Goals ↔ Accounts** ⭐⭐⭐
   - Impact: Élevé
   - Complexité: Moyenne
   - Bénéfice: Suivi automatique progrès

2. **Service Unifié Épargne** ⭐⭐⭐
   - Impact: Élevé
   - Complexité: Moyenne
   - Bénéfice: Point d'entrée unique

### **Priorité MOYENNE:**

3. **Lier Challenges ↔ Goals** ⭐⭐
   - Impact: Moyen
   - Complexité: Moyenne
   - Bénéfice: Défis basés sur goals réels

4. **Améliorer calculateSaveAmountProgress** ⭐⭐
   - Impact: Moyen
   - Complexité: Faible
   - Bénéfice: Calcul précis via comptes

### **Priorité BASSE:**

5. **Lier Recommendations ↔ Goals** ⭐
   - Impact: Faible
   - Complexité: Faible
   - Bénéfice: Recommandations contextuelles

---

## 10. SCHÉMA DE MIGRATION PROPOSÉ

### **Phase 1: Extension Schéma**

1. Ajouter `accountId` et `autoSync` dans Goal (IndexedDB + Supabase)
2. Ajouter `goalId` et `isGoalAccount` dans Account (IndexedDB + Supabase)
3. Migration données existantes (lier goals/comptes manuellement)

### **Phase 2: Service Unifié**

1. Créer `savingsService.ts`
2. Implémenter `createGoalWithAccount()`
3. Implémenter `syncAllGoalsWithAccounts()`
4. Implémenter `getTotalSavings()`

### **Phase 3: Intégration Challenges**

1. Modifier `calculateSaveAmountProgress()` pour utiliser comptes/goals
2. Ajouter `goalId` dans ChallengeRequirement
3. Mettre à jour goals lors complétion challenges

### **Phase 4: Intégration Recommendations**

1. Ajouter recommandations basées sur goals
2. Création automatique goals depuis recommandations
3. Suggestions personnalisées selon progrès

---

## CONCLUSION

### **État Actuel:**
- ✅ Systèmes isolés fonctionnels
- ❌ Aucune connexion entre goals, accounts, challenges, recommendations
- ❌ Calculs approximatifs basés sur transactions texte libre
- ❌ Pas de synchronisation automatique

### **État Cible:**
- ✅ Système d'épargne unifié
- ✅ Goals liés aux comptes épargne
- ✅ Challenges basés sur goals/comptes réels
- ✅ Recommendations contextuelles
- ✅ Synchronisation automatique bidirectionnelle

### **Prochaines Étapes:**
1. Valider le schéma de migration avec l'équipe
2. Implémenter Phase 1 (extension schéma)
3. Créer savingsService.ts
4. Intégrer progressivement challenges et recommendations

---

**AGENT-2-DEPENDENCIES-COMPLETE**

