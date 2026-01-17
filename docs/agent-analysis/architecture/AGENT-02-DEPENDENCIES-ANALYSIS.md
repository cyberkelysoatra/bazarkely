# AGENT 02 - ANALYSE DES DÉPENDANCES SYSTÈME ÉPARGNE UNIFIÉ

**Date**: 2025-01-19  
**Agent**: Agent 02  
**Objectif**: Mapper les dépendances entre goals, accounts (type='epargne'), challenges et recommendations pour identifier les opportunités d'intégration

---

## 1. ACCOUNTS SERVICE

### Structure du Service

**Fichier**: `frontend/src/services/accountService.ts`

**Types de comptes supportés**:
```typescript
type AccountType = 'especes' | 'courant' | 'epargne' | 'orange_money' | 'mvola' | 'airtel_money'
```

**Structure Account**:
```70:80:frontend/src/types/index.ts
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
}
```

### Opérations CRUD

**Méthodes principales**:
- `getAccounts()`: Récupération offline-first (IndexedDB → Supabase)
- `getAccountsByType(type: string)`: Filtrage par type
- `createAccount()`: Création avec sync queue
- `updateAccount()`: Mise à jour avec sync queue
- `deleteAccount()`: Suppression avec sync queue
- `setDefaultAccount()`: Définir compte par défaut
- `getTotalBalance()`: Calcul solde total

**Pattern Offline-First**:
- Sauvegarde immédiate dans IndexedDB
- Sync vers Supabase si online
- Queue de synchronisation pour mode offline

### Comptes Type 'epargne'

**Caractéristiques**:
- Type identifié: `'epargne'`
- Pas de distinction spéciale dans le service
- Traité comme un type de compte standard
- Pas de lien automatique avec les goals

**Utilisation actuelle**:
- Création manuelle par utilisateur
- Affichage dans AccountsPage avec icône PiggyBank
- Pas de logique métier spécifique pour l'épargne

---

## 2. CHALLENGE SERVICE

### Structure du Service

**Fichier**: `frontend/src/services/challengeService.ts`

**Types de défis**:
```16:16:frontend/src/services/challengeService.ts
export type ChallengeType = 'daily' | 'weekly' | 'monthly' | 'special';
```

**Types d'exigences**:
```21:26:frontend/src/services/challengeService.ts
export type ChallengeRequirementType = 
  | 'no_expense_category' 
  | 'save_amount' 
  | 'complete_quiz' 
  | 'track_daily' 
  | 'follow_budget';
```

**Structure Challenge**:
```46:58:frontend/src/services/challengeService.ts
export interface Challenge {
  readonly id: string;
  readonly type: ChallengeType;
  readonly title: string;
  readonly description: string;
  readonly requirements: readonly ChallengeRequirement[];
  readonly duration_days: number;
  readonly points_reward: number;
  readonly badge_reward?: string;
  readonly category?: string;
  readonly difficulty: 'beginner' | 'intermediate' | 'advanced';
  readonly tags: readonly string[];
}
```

### Défis liés à l'épargne

**Défis avec category='epargne'**:
1. `daily_save_1000`: Épargne quotidienne (1,000 Ar)
2. `weekly_save_10000`: Épargne hebdomadaire (10,000 Ar)
3. `monthly_save_50000`: Épargne mensuelle (50,000 Ar)
4. `special_rentree_scolaire`: Rentrée scolaire (100,000 Ar)
5. `special_emergency_fund`: Fonds d'urgence (300,000 Ar)
6. `special_financial_freedom`: Liberté financière (500,000 Ar)
7. `special_independence_day`: Jour indépendance (19,600 Ar)

**Calcul de progression**:
```838:851:frontend/src/services/challengeService.ts
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

**Problème identifié**: 
- Le calcul se base sur les transactions avec description contenant "épargne"
- Pas de vérification du solde des comptes type='epargne'
- Pas de lien avec les goals

### Système de récompenses

**Points**:
- Daily: 5-20 points
- Weekly: 30-80 points
- Monthly: 100-300 points
- Special: 200-500 points

**Badges**:
- 'Champion de l\'Épargne': 100,000 Ar épargnés (calculé approximativement)

---

## 3. RECOMMENDATION SERVICE

### Structure du Service

**Fichier**: `frontend/src/services/recommendationEngineService.ts`

**Thèmes de recommandations**:
```21:26:frontend/src/services/recommendationEngineService.ts
export type RecommendationTheme = 
  | 'savings' 
  | 'expense_reduction' 
  | 'budget_optimization' 
  | 'education' 
  | 'mobile_money';
```

**Déclencheurs contextuels**:
```76:81:frontend/src/services/recommendationEngineService.ts
const TRIGGER_THRESHOLDS = {
  BUDGET_OVERSHOT: 20,        // 20% de dépassement budgétaire
  SAVINGS_LOW: 80,            // 80% de l'objectif d'épargne
  QUIZ_INACTIVE_DAYS: 7,      // 7 jours sans quiz
  LARGE_EXPENSE_PERCENT: 30,  // 30% du revenu mensuel
} as const;
```

### Calcul de l'épargne actuelle

**Méthode actuelle**:
```897:912:frontend/src/services/recommendationEngineService.ts
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

**Problème identifié**:
- Calcul basé sur transactions (revenus - dépenses)
- Pas de vérification du solde réel des comptes type='epargne'
- Pas de lien avec les goals

### Recommandations d'épargne

**Templates disponibles**:
- Épargne automatique Orange Money
- Fonds d'urgence 3 mois
- Épargne quotidienne petites sommes
- Règle 50-30-20

**Déclencheur épargne faible**:
```412:431:frontend/src/services/recommendationEngineService.ts
    const savingsPriority = user.preferences?.priorityAnswers?.savings_priority;
    if (savingsPriority === 'high' || savingsPriority === 'medium') {
      const currentSavings = calculateCurrentSavings(recentTransactions);
      const targetSavings = calculateTargetSavings(user);
      
      if (currentSavings < (targetSavings * TRIGGER_THRESHOLDS.SAVINGS_LOW / 100)) {
        triggeredRecommendations.push(createContextualRecommendation(
          'savings',
          'medium',
          'Augmentez votre épargne mensuelle',
          `Votre épargne actuelle (${formatAriary(currentSavings)}) est en dessous de votre objectif.`,
          [
            "Augmentez votre virement automatique d'épargne",
            "Réduisez une catégorie de dépenses non essentielle",
            "Vendez des objets non utilisés",
            "Cherchez des revenus complémentaires"
          ],
          `Atteignez ${formatAriary(targetSavings)} d'épargne mensuelle`
        ));
      }
    }
```

---

## 4. CURRENT INTEGRATIONS

### Connexions existantes

**Aucune connexion directe identifiée**:
- ❌ Challenges ne référencent pas les goals
- ❌ Accounts (type='epargne') ne sont pas liés aux goals
- ❌ Challenges ne vérifient pas les comptes type='epargne'
- ❌ Recommendations ne consultent pas les comptes type='epargne'
- ❌ Recommendations ne référencent pas les goals

### Connexions indirectes

**Via transactions**:
- Challenges calculent l'épargne via transactions avec description "épargne"
- Recommendations calculent l'épargne via différence revenus/dépenses

**Via User.preferences**:
- Challenges utilisent `user.preferences.priorityAnswers.savings_priority`
- Recommendations utilisent `user.preferences.priorityAnswers.savings_priority`
- Challenges stockent `activeChallenges` et `challengeHistory` dans preferences

---

## 5. DATA FLOW GAPS

### Gaps identifiés

**1. Goals ↔ Accounts (type='epargne')**
- ❌ Pas de champ `linkedAccountId` dans Goal
- ❌ Pas de champ `linkedGoalId` dans Account
- ❌ Pas de service pour lier un goal à un compte épargne
- ❌ Pas de synchronisation automatique `goal.currentAmount` ↔ `account.balance`

**2. Goals ↔ Challenges**
- ❌ Pas de champ `linkedGoalId` dans Challenge
- ❌ Pas de champ `linkedChallengeId` dans Goal
- ❌ Challenges ne vérifient pas la progression des goals
- ❌ Pas de défi automatique créé lors de création d'un goal

**3. Accounts (type='epargne') ↔ Challenges**
- ❌ Challenges ne vérifient pas le solde réel des comptes épargne
- ❌ Pas de défi suggéré basé sur les comptes épargne existants
- ❌ Pas de création automatique de compte épargne lors d'un défi

**4. Goals ↔ Recommendations**
- ❌ Recommendations ne référencent pas les goals actifs
- ❌ Pas de recommandation générée pour atteindre un goal spécifique
- ❌ Pas de calcul de progression goal dans les recommendations

**5. Accounts (type='epargne') ↔ Recommendations**
- ❌ Recommendations ne consultent pas les comptes type='epargne'
- ❌ Pas de recommandation basée sur le solde réel des comptes
- ❌ Pas de suggestion de création de compte épargne

---

## 6. INDEXEDDB SCHEMA

### Tables existantes

**Table `accounts`**:
```294:294:frontend/src/lib/database.ts
      accounts: 'id, userId, name, type, balance, currency, createdAt, updatedAt',
```

**Champs**:
- `id`: string (PK)
- `userId`: string (index)
- `name`: string
- `type`: string (pas d'index spécifique pour 'epargne')
- `balance`: number
- `currency`: string
- `createdAt`: Date
- `updatedAt`: Date

**Table `goals`**:
```297:297:frontend/src/lib/database.ts
      goals: 'id, userId, name, targetAmount, currentAmount, deadline, createdAt, updatedAt, [userId+deadline]',
```

**Champs**:
- `id`: string (PK)
- `userId`: string (index)
- `name`: string
- `targetAmount`: number
- `currentAmount`: number
- `deadline`: Date (index composite avec userId)
- `createdAt`: Date
- `updatedAt`: Date

**Table `recurringTransactions`**:
```307:307:frontend/src/lib/database.ts
      recurringTransactions: 'id, userId, accountId, frequency, isActive, nextGenerationDate, linkedBudgetId, [userId+isActive], [userId+nextGenerationDate]'
```

**Note**: `linkedBudgetId` existe mais pas de `linkedGoalId` ou `linkedAccountId` pour épargne

### Tables manquantes pour intégration

**Pas de table de liaison**:
- ❌ Pas de table `goal_accounts` pour lier goals ↔ accounts
- ❌ Pas de table `challenge_goals` pour lier challenges ↔ goals
- ❌ Pas de table `challenge_accounts` pour lier challenges ↔ accounts

---

## 7. SUPABASE SCHEMA

### Table `goals` (Supabase)

**Structure**:
```218:261:frontend/src/types/supabase.ts
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
        Insert: {
          id?: string
          user_id: string
          name: string
          target_amount: number
          current_amount?: number
          target_date?: string | null
          category?: string | null
          description?: string | null
          priority?: string
          is_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          target_amount?: number
          current_amount?: number
          target_date?: string | null
          category?: string | null
          description?: string | null
          priority?: string
          is_completed?: boolean
          created_at?: string
          updated_at?: string
        }
      }
```

**Champs manquants pour intégration**:
- ❌ Pas de `linked_account_id` (référence vers accounts)
- ❌ Pas de `linked_challenge_id` (référence vers challenges)

### Table `accounts` (Supabase)

**Structure référencée dans code**:
- `id`, `user_id`, `name`, `type`, `balance`, `currency`, `is_default`, `display_order`

**Champs manquants pour intégration**:
- ❌ Pas de `linked_goal_id` (référence vers goals)
- ❌ Pas de `is_savings_account` (flag explicite)
- ❌ Pas de `savings_goal_id` (goal associé)

---

## 8. INTEGRATION OPPORTUNITIES

### Opportunité 1: Goals ↔ Accounts (type='epargne')

**Problème actuel**:
- Les goals ont un `currentAmount` qui n'est pas synchronisé avec le solde réel des comptes épargne
- L'utilisateur doit mettre à jour manuellement le goal quand il épargne

**Solution proposée**:
1. Ajouter `linkedAccountId` dans Goal (référence vers Account type='epargne')
2. Ajouter `linkedGoalId` dans Account (optionnel, pour comptes épargne)
3. Créer un service `goalAccountSyncService.ts`:
   - Synchroniser automatiquement `goal.currentAmount` = `account.balance`
   - Déclencher lors de modifications de compte épargne
   - Déclencher lors de modifications de goal

**Avantages**:
- Synchronisation automatique
- Vue unifiée de l'épargne
- Pas de double saisie

### Opportunité 2: Goals ↔ Challenges

**Problème actuel**:
- Les challenges d'épargne calculent la progression via transactions
- Pas de lien avec les goals réels de l'utilisateur

**Solution proposée**:
1. Ajouter `linkedGoalId` dans Challenge (optionnel)
2. Modifier `calculateSaveAmountProgress()` pour vérifier `goal.currentAmount` si `linkedGoalId` existe
3. Créer des défis automatiques lors de création d'un goal:
   - "Atteignez votre goal [nom]" avec target = `goal.targetAmount`
   - Points basés sur la difficulté du goal

**Avantages**:
- Défis personnalisés basés sur les goals réels
- Progression visible dans les deux systèmes
- Motivation accrue

### Opportunité 3: Accounts (type='epargne') ↔ Challenges

**Problème actuel**:
- Challenges vérifient les transactions, pas le solde réel des comptes

**Solution proposée**:
1. Modifier `calculateSaveAmountProgress()` pour:
   - D'abord vérifier si un compte type='epargne' existe
   - Utiliser le solde réel du compte si disponible
   - Fallback sur transactions si pas de compte
2. Créer un défi automatique lors de création d'un compte épargne:
   - "Épargnez dans votre nouveau compte"
   - Target basé sur le solde initial

**Avantages**:
- Calcul précis basé sur solde réel
- Défis contextuels lors de création compte
- Meilleure traçabilité

### Opportunité 4: Goals ↔ Recommendations

**Problème actuel**:
- Recommendations calculent l'épargne via transactions
- Pas de référence aux goals actifs

**Solution proposée**:
1. Modifier `calculateCurrentSavings()` pour:
   - Vérifier les goals actifs avec `linkedAccountId`
   - Utiliser `goal.currentAmount` si disponible
   - Fallback sur transactions
2. Générer des recommendations spécifiques aux goals:
   - "Vous êtes à X% de votre goal [nom]"
   - "Il vous reste Y jours pour atteindre votre goal"
   - "Épargnez Z Ar/jour pour atteindre votre goal à temps"

**Avantages**:
- Recommendations personnalisées
- Motivation basée sur goals réels
- Calculs précis

### Opportunité 5: Accounts (type='epargne') ↔ Recommendations

**Problème actuel**:
- Recommendations ne consultent pas les comptes type='epargne'

**Solution proposée**:
1. Modifier `calculateCurrentSavings()` pour:
   - Récupérer tous les comptes type='epargne'
   - Sommer les soldes réels
   - Utiliser comme source de vérité principale
2. Générer des recommendations basées sur les comptes:
   - "Vous avez X comptes épargne avec un total de Y Ar"
   - "Créez un compte épargne dédié pour votre goal [nom]"
   - "Répartissez votre épargne entre plusieurs comptes"

**Avantages**:
- Vue précise de l'épargne réelle
- Recommendations basées sur données réelles
- Suggestions de création de comptes

### Opportunité 6: Système unifié d'épargne

**Vision globale**:
Créer un service `unifiedSavingsService.ts` qui:
1. **Gère les liens**:
   - Goals ↔ Accounts (type='epargne')
   - Goals ↔ Challenges
   - Accounts ↔ Challenges

2. **Synchronisation automatique**:
   - `goal.currentAmount` ↔ `account.balance`
   - Progression challenges basée sur goals/comptes réels
   - Recommendations basées sur données unifiées

3. **Création automatique**:
   - Compte épargne lors de création d'un goal (optionnel)
   - Challenge lors de création d'un goal (optionnel)
   - Goal suggéré lors de création d'un compte épargne

4. **Vue unifiée**:
   - Dashboard montrant: Goals → Comptes → Challenges → Recommendations
   - Progression visible dans tous les systèmes
   - Actions suggérées basées sur l'état global

---

## 9. RECOMMANDATIONS PRIORITAIRES

### Priorité P0 (Critique)

1. **Ajouter `linkedAccountId` dans Goal**
   - Permet de lier un goal à un compte épargne spécifique
   - Synchronisation automatique `currentAmount` ↔ `balance`

2. **Modifier `calculateSaveAmountProgress()` pour utiliser comptes réels**
   - Vérifier comptes type='epargne' en premier
   - Fallback sur transactions si pas de compte

3. **Modifier `calculateCurrentSavings()` dans recommendations**
   - Utiliser soldes réels des comptes type='epargne'
   - Fallback sur transactions

### Priorité P1 (Important)

4. **Créer `goalAccountSyncService.ts`**
   - Service de synchronisation automatique
   - Écoute modifications comptes et goals

5. **Ajouter `linkedGoalId` dans Challenge**
   - Permet de créer des défis liés à des goals spécifiques
   - Calcul de progression basé sur goal

6. **Générer recommendations basées sur goals actifs**
   - Recommendations personnalisées par goal
   - Calculs de progression et temps restant

### Priorité P2 (Amélioration)

7. **Créer défis automatiques lors de création goal**
   - Défi "Atteignez votre goal [nom]"
   - Points et badges associés

8. **Créer compte épargne suggéré lors de création goal**
   - Option "Créer un compte épargne dédié"
   - Lien automatique goal ↔ compte

9. **Dashboard unifié épargne**
   - Vue consolidée: Goals + Comptes + Challenges + Recommendations
   - Progression visible dans tous les systèmes

---

## 10. SCHÉMA DE DONNÉES PROPOSÉ

### Modifications Goal

```typescript
interface Goal {
  // ... champs existants
  linkedAccountId?: string; // ID du compte épargne lié
  linkedChallengeId?: string; // ID du challenge lié (optionnel)
}
```

### Modifications Account

```typescript
interface Account {
  // ... champs existants
  linkedGoalId?: string; // ID du goal lié (pour comptes type='epargne')
  isSavingsAccount?: boolean; // Flag explicite (dérivé de type='epargne')
}
```

### Modifications Challenge

```typescript
interface Challenge {
  // ... champs existants
  linkedGoalId?: string; // ID du goal lié (optionnel)
}

interface ActiveChallenge {
  // ... champs existants
  linkedGoalId?: string; // ID du goal lié
  linkedAccountId?: string; // ID du compte épargne lié
}
```

### Nouveau Service

```typescript
// unifiedSavingsService.ts
class UnifiedSavingsService {
  // Lier un goal à un compte épargne
  linkGoalToAccount(goalId: string, accountId: string): Promise<void>
  
  // Synchroniser goal.currentAmount avec account.balance
  syncGoalWithAccount(goalId: string): Promise<void>
  
  // Créer un challenge automatique pour un goal
  createChallengeForGoal(goalId: string): Promise<ActiveChallenge>
  
  // Créer un compte épargne pour un goal
  createAccountForGoal(goalId: string): Promise<Account>
  
  // Calculer la progression d'un goal
  calculateGoalProgress(goalId: string): Promise<number>
  
  // Obtenir vue unifiée épargne
  getUnifiedSavingsView(userId: string): Promise<UnifiedSavingsView>
}
```

---

## CONCLUSION

**État actuel**: Les systèmes goals, accounts (type='epargne'), challenges et recommendations fonctionnent de manière isolée sans connexions directes.

**Opportunité principale**: Créer un système unifié d'épargne qui synchronise automatiquement les données entre ces systèmes et génère des défis et recommendations personnalisées basées sur les goals et comptes réels.

**Impact attendu**:
- ✅ Synchronisation automatique (pas de double saisie)
- ✅ Vue unifiée de l'épargne
- ✅ Défis et recommendations personnalisées
- ✅ Motivation accrue via gamification liée aux goals réels
- ✅ Calculs précis basés sur données réelles

**AGENT-2-DEPENDENCIES-COMPLETE**
