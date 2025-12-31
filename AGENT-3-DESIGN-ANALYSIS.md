# AGENT 3 - ANALYSE ET DESIGN SYSTÈME SUGGESTIONS AUTOMATIQUES GOALS

**Date:** 2025-12-31  
**Projet:** BazarKELY  
**Objectif:** Analyser les patterns existants et concevoir un système de suggestions automatiques de goals basé sur le profil utilisateur  
**Session:** Multi-agent diagnostic - Agent 3

---

## 1. EXISTING SUGGESTION PATTERNS

### **1.1 Recommendation Engine Service** (`recommendationEngineService.ts`)

**Architecture de Génération:**

```
User Profile → Analysis → Candidate Generation → Scoring → Filtering → Final Recommendations
```

**Étapes de Génération** (`generateDailyRecommendations`):

1. **Analyse du Profil** (`analyzeUserProfile`):
   ```typescript
   {
     financialGoals: answers.financial_goals || 'unknown',
     spendingHabits: answers.spending_habits || 'unknown',
     incomeLevel: answers.income_level || 'unknown',
     familySize: answers.family_size || 'unknown',
     savingsPriority: answers.savings_priority || 'unknown',
     educationLevel: answers.education_level || 'unknown'
   }
   ```

2. **Analyse des Quiz** (`analyzeQuizResults`):
   - Score moyen
   - Zones faibles (< 70%)

3. **Analyse des Transactions** (`analyzeRecentTransactions`):
   - Top 3 catégories de dépenses (30 derniers jours)
   - Total dépenses

4. **Analyse des Déviations Budgétaires** (`analyzeBudgetDeviations`):
   - Nombre de déviations critiques
   - Catégories affectées

5. **Génération de Candidats** (`generateCandidateRecommendations`):
   - Basée sur profil (savingsPriority, spendingHabits)
   - Basée sur quiz (score moyen < 70 → éducation)
   - Basée sur transactions (topCategories)
   - Basée sur déviations (criticalCount > 0)

6. **Scoring de Pertinence** (`scoreRecommendation`):
   - **30%** - Alignement profil (`PROFILE_ALIGNMENT`)
   - **25%** - Performance quiz (`QUIZ_PERFORMANCE`)
   - **20%** - Comportement récent (`RECENT_BEHAVIOR`)
   - **15%** - Contexte temporel (`TEMPORAL_CONTEXT`)
   - **10%** - Diversification (`DIVERSIFICATION`)

7. **Filtrage et Tri**:
   - Score >= 60
   - Tri décroissant par score
   - Limite à 3 recommandations

**Templates Prédéfinis:**
- 4 templates `savings` (épargne automatique, fonds urgence, petites sommes, règle 50-30-20)
- 4 templates `expense_reduction` (alimentation, transport, achats impulsifs, abonnements)
- 4 templates `budget_optimization` (ajustement, enveloppes, dépenses saisonnières, paiements récurrents)
- 4 templates `education` (investissement, frais bancaires, culture financière, négociation)
- 4 templates `mobile_money` (Orange Money, Mvola, comparaison frais, sécurité)

**Déclencheurs Contextuels** (`detectContextualTriggers`):
- Budget dépassé (> 20%)
- Épargne faible (< 80% objectif)
- Quiz inactif (> 7 jours)
- Dépense importante (> 30% revenu mensuel)
- Premier jour du mois

### **1.2 Patterns Clés Identifiés:**

✅ **Personnalisation Multi-Sources:**
- Profil utilisateur (priorityAnswers)
- Historique transactions
- Performance quiz
- Déviations budgétaires

✅ **Scoring Pondéré:**
- Poids différents selon critères
- Score final 0-100

✅ **Filtrage Intelligent:**
- Seuil minimum (60)
- Diversification (éviter répétitions)
- Limite nombre (3 max)

✅ **Templates Réutilisables:**
- Bibliothèque de templates par thème
- Génération dynamique depuis templates

---

## 2. CHALLENGE GENERATION LOGIC

### **2.1 Génération Personnalisée** (`generatePersonalizedChallenges`)

**Processus:**

1. **Détermination Niveau Utilisateur** (`determineUserLevel`):
   ```typescript
   beginner: < 3 défis complétés OU < 100 points
   intermediate: < 10 défis complétés OU < 500 points
   advanced: >= 10 défis complétés ET >= 500 points
   ```

2. **Extraction Intérêts** (`extractUserInterests`):
   ```typescript
   savings_priority === 'high' → ['épargne']
   spending_habits === 'planned' → ['budget', 'planification']
   education_level === 'beginner' → ['apprentissage', 'éducation']
   family_size === 'large' → ['famille']
   ```

3. **Filtrage par Niveau:**
   - Beginner: défis `daily` + `beginner`
   - Intermediate: défis `daily`/`weekly` + `intermediate`
   - Advanced: défis `monthly`/`special` + `advanced`

4. **Filtrage par Intérêts:**
   - Match tags OU category avec intérêts

5. **Exclusion Défis Actifs:**
   - Ne pas suggérer défis déjà acceptés

6. **Filtrage Saisonnier** (`applySeasonalFiltering`):
   - Janvier-Février: rentrée scolaire, éducation, épargne
   - Décembre: fêtes, famille, budget

7. **Limite:**
   - Maximum 3 suggestions

### **2.2 Bibliothèque de Défis:**

**25+ défis prédéfinis** dans `CHALLENGE_LIBRARY`:
- 5 défis quotidiens (5-20 points)
- 6 défis hebdomadaires (30-80 points)
- 5 défis mensuels (100-300 points)
- 5 défis spéciaux (200-500 points)

**Catégories:**
- `tracking` - Suivi transactions
- `epargne` - Épargne
- `budget` - Respect budget
- `loisirs` - Réduction dépenses loisirs
- `alimentation` - Optimisation alimentation
- `transport` - Optimisation transport
- `education` - Apprentissage financier

### **2.3 Patterns Clés Identifiés:**

✅ **Niveau Adaptatif:**
- Défis adaptés à l'expérience utilisateur
- Progression graduelle

✅ **Personnalisation Contextuelle:**
- Intérêts extraits de priorityAnswers
- Filtrage saisonnier

✅ **Bibliothèque Prédéfinie:**
- Défis réutilisables
- Catégories structurées

---

## 3. USER DATA AVAILABLE

### **3.1 PriorityAnswers Structure**

**Format** (`types/index.ts`):
```typescript
priorityAnswers?: Record<string, string>
```

**Champs Disponibles** (d'après `BUDGET-EDUCATION-IMPLEMENTATION.md`):
```typescript
{
  "financial_goals_short": "emergency_fund" | "vacation" | "education" | "house_purchase" | ...
  "financial_goals_long": "house_purchase" | "retirement" | "business" | ...
  "spending_habits": "planned" | "impulsive" | "balanced"
  "income_type": "fixed_salary" | "variable" | "business" | "mixed"
  "monthly_income": "under_200k" | "200k_500k" | "500k_1m" | "1m_plus"
  "family_situation": "single" | "couple" | "small_family" | "large_family"
  "savings_priority": "low" | "medium" | "high" | "critical"
  "budget_flexibility": "low" | "moderate" | "high"
  "financial_education": "beginner" | "intermediate" | "advanced"
  "mobile_money_usage": "daily" | "weekly" | "monthly" | "rarely"
}
```

**Utilisation Actuelle:**
- `recommendationEngineService.ts`: Analyse profil pour scoring
- `challengeService.ts`: Extraction intérêts, détermination niveau
- `budgetIntelligenceService.ts`: Calcul budgets intelligents

### **3.2 Informations Famille**

**Sources:**
- `priorityAnswers.family_situation`: Situation familiale
- `priorityAnswers.family_size`: Taille famille (si disponible)
- Transactions: Patterns de dépenses familiaux

**Mapping Taille Famille** (`budgetIntelligenceService.ts:406-412`):
```typescript
const familySizeMap: Record<string, number> = {
  'one_person': 1,
  'two_people': 2,
  'three_people': 3,
  'four_people': 4,
  'five_plus': 5
};
```

### **3.3 Données Revenus**

**Sources:**
- `priorityAnswers.monthly_income`: Tranche de revenu
- `priorityAnswers.income_type`: Type de revenu
- Transactions type='income': Revenus réels

**Mapping Revenus** (`budgetIntelligenceService.ts`):
```typescript
const incomeMap: Record<string, number> = {
  'under_200k': 150000,
  '200k_500k': 350000,
  '500k_1m': 750000,
  '1m_plus': 1500000
};
```

### **3.4 Historique Transactions**

**Données Disponibles:**
- Transactions récentes (30 derniers jours)
- Catégories de dépenses
- Montants moyens
- Patterns temporels

**Utilisation:**
- Calcul dépenses essentielles
- Identification top catégories
- Détection patterns

### **3.5 Goals Existants**

**Données Disponibles:**
- Goals actifs (`db.goals.where('userId').equals(userId)`)
- Goals complétés
- Progrès actuel (`currentAmount` vs `targetAmount`)

**Gaps:**
- ❌ Pas de liaison avec comptes épargne
- ❌ Pas de catégorisation structurée

---

## 4. EMERGENCY FUND CALCULATION

### **4.1 Logique Actuelle** (`DashboardPage.tsx:39-66`)

**Calcul Dépenses Essentielles:**
```typescript
const calculateEssentialMonthlyExpenses = (transactions: Transaction[]): number => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const monthlyTransactions = transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    return transactionDate >= startOfMonth && transactionDate <= endOfMonth;
  });

  // Catégories essentielles définies dans ESSENTIAL_CATEGORIES
  const essentialExpenses = monthlyTransactions
    .filter(t => {
      const isExpense = t.type === 'expense';
      const categoryMatch = ESSENTIAL_CATEGORIES.some(essential => 
        essential.toLowerCase() === t.category?.toLowerCase()
      );
      return isExpense && categoryMatch;
    })
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return essentialExpenses;
};
```

**Calcul Objectif Fonds d'Urgence:**
```typescript
const calculateEmergencyFundGoal = (essentialMonthlyExpenses: number): number => {
  return essentialMonthlyExpenses * 6; // 6 mois de dépenses essentielles
};
```

**Calcul Progression:**
```typescript
const calculateEmergencyFundProgress = (currentSavings: number, goal: number): number => {
  if (goal === 0) return 0;
  return Math.min((currentSavings / goal) * 100, 100);
};
```

### **4.2 Catégories Essentielles**

**Définies dans `DashboardPage.tsx`** (ligne 8):
```typescript
const ESSENTIAL_CATEGORIES = [
  'alimentation',
  'logement',
  'transport',
  'sante',
  'education',
  'communication'
];
```

### **4.3 Utilisation Actuelle**

**Dans DashboardPage:**
- Calcul automatique chaque chargement
- Affichage dans stats
- Progression affichée

**Gaps:**
- ❌ Pas de goal créé automatiquement
- ❌ Pas de compte épargne dédié
- ❌ Calcul non persisté

---

## 5. GOAL SUGGESTION TYPES

### **5.1 Types de Goals à Suggérer**

#### **A. Emergency Fund (Fonds d'Urgence)** ⭐⭐⭐ PRIORITÉ HAUTE

**Déclencheurs:**
- Aucun goal "Fond d'urgence" existant
- `savings_priority === 'high'` ou `'critical'`
- Calcul `essentialMonthlyExpenses > 0`

**Calcul:**
```typescript
targetAmount = essentialMonthlyExpenses * 6 // 6 mois
deadline = new Date(Date.now() + 12 * 30 * 24 * 60 * 60 * 1000) // 12 mois
category = 'epargne'
priority = 'high'
```

**Personnalisation:**
- Famille nombreuse → 6-9 mois
- Revenus variables → 9-12 mois
- Revenus fixes → 3-6 mois

#### **B. Vacation (Vacances)** ⭐⭐ PRIORITÉ MOYENNE

**Déclencheurs:**
- `financial_goals_short === 'vacation'`
- Saison approche (Décembre, Juillet-Août)
- Pas de goal vacances actif

**Calcul:**
```typescript
// Basé sur revenu mensuel
targetAmount = monthlyIncome * 0.5 // 50% du revenu mensuel
deadline = calculateVacationDeadline() // Prochaine période vacances
category = 'loisirs'
priority = 'medium'
```

**Personnalisation:**
- Famille nombreuse → multiplier par nombre personnes
- Revenus élevés → montant plus élevé

#### **C. Education (Éducation)** ⭐⭐ PRIORITÉ MOYENNE

**Déclencheurs:**
- `financial_goals_short === 'education'` OU `financial_goals_long === 'education'`
- `family_situation` inclut enfants
- Mois Janvier-Février (rentrée scolaire)

**Calcul:**
```typescript
// Basé sur nombre enfants et niveau
targetAmount = calculateEducationCost(familySize, educationLevel)
deadline = new Date(année suivante, 0, 15) // 15 Janvier année suivante
category = 'education'
priority = 'high' // Si rentrée proche
```

**Personnalisation:**
- Nombre enfants → multiplier coût
- Niveau éducation → ajuster montant

#### **D. House Purchase (Achat Maison)** ⭐ PRIORITÉ BASSE

**Déclencheurs:**
- `financial_goals_long === 'house_purchase'`
- Revenus stables
- Pas de goal maison actif

**Calcul:**
```typescript
// Basé sur revenu annuel
targetAmount = monthlyIncome * 12 * 2 // 2 ans de revenus (approximation)
deadline = new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000) // 5 ans
category = 'epargne'
priority = 'low' // Long terme
```

#### **E. Custom Goals (Objectifs Personnalisés)** ⭐⭐ PRIORITÉ MOYENNE

**Déclencheurs:**
- Patterns de dépenses récurrentes importantes
- Catégories de dépenses saisonnières
- Déviations budgétaires fréquentes

**Exemples:**
- "Épargne pour fêtes de fin d'année" (Décembre)
- "Fonds réparation véhicule" (si dépenses transport élevées)
- "Épargne santé" (si dépenses santé irrégulières)

---

## 6. ACCEPTANCE/REJECTION FLOW

### **6.1 Pattern Recommandations** (`useRecommendations.ts`)

**Actions Disponibles:**

1. **Like** (`likeRecommendation`):
   ```typescript
   - Met à jour état local (liked: true)
   - Sauvegarde feedback dans user.preferences.recommendationFeedback
   - Incrémente themePreferences[theme]
   - Met à jour store utilisateur
   - Toast success
   ```

2. **Dislike** (`dislikeRecommendation`):
   ```typescript
   - Met à jour état local (disliked: true)
   - Sauvegarde feedback dans user.preferences.recommendationFeedback
   - Décrémente themePreferences[theme]
   - Met à jour store utilisateur
   - Toast success
   ```

3. **Dismiss** (`dismissRecommendation`):
   ```typescript
   - Met à jour état local (dismissed: true)
   - Sauvegarde dans recommendationHistory
   - Retire de la liste active
   - Toast info
   ```

**Structure Feedback:**
```typescript
interface RecommendationWithFeedback {
  recommendation: Recommendation;
  liked: boolean;
  disliked: boolean;
  dismissed: boolean;
  timestamp: Date;
}
```

**Stockage:**
- `user.preferences.recommendationFeedback`: Array de feedbacks
- `user.preferences.themePreferences`: Scores par thème (ML)
- `user.preferences.recommendationHistory`: Historique

### **6.2 Pattern Challenges** (`challengeService.ts`)

**Action Accept:**
```typescript
acceptChallenge(user, challengeId, startDate)
- Vérifie défi existe
- Vérifie limite 3 défis actifs
- Crée ActiveChallenge
- Retourne défi actif
```

**Stockage:**
- `user.preferences.activeChallenges`: Array ActiveChallenge[]
- Limite: 3 défis actifs maximum

### **6.3 Pattern à Appliquer pour Goals:**

**Actions Proposées:**

1. **Accept Goal** (`acceptGoalSuggestion`):
   ```typescript
   - Crée le goal dans db.goals
   - Crée compte épargne lié (si type='epargne')
   - Lie goal ↔ account
   - Sauvegarde dans user.preferences.acceptedGoalSuggestions
   - Retire de suggestions actives
   ```

2. **Reject Goal** (`rejectGoalSuggestion`):
   ```typescript
   - Sauvegarde feedback dans user.preferences.rejectedGoalSuggestions
   - Décrémente goalTypePreferences[type]
   - Retire de suggestions actives
   - Ne plus suggérer ce type (temporairement)
   ```

3. **Dismiss Goal** (`dismissGoalSuggestion`):
   ```typescript
   - Sauvegarde dans goalSuggestionHistory
   - Retire de suggestions actives
   - Peut être re-suggéré plus tard
   ```

4. **Modify Goal** (`modifyGoalSuggestion`):
   ```typescript
   - Ouvre modal modification
   - Permet ajuster targetAmount, deadline
   - Crée goal avec valeurs modifiées
   - Sauvegarde modifications dans feedback
   ```

**Structure Feedback Goals:**
```typescript
interface GoalSuggestionFeedback {
  suggestionId: string;
  goalType: 'emergency_fund' | 'vacation' | 'education' | 'house' | 'custom';
  action: 'accepted' | 'rejected' | 'dismissed' | 'modified';
  modifications?: {
    targetAmount?: number;
    deadline?: Date;
  };
  timestamp: Date;
}
```

---

## 7. SUGGESTED ARCHITECTURE

### **7.1 Service: `goalSuggestionService.ts`**

**Structure Proposée:**

```typescript
/**
 * Goal Suggestion Service - BazarKELY
 * Génère des suggestions automatiques de goals basées sur le profil utilisateur
 */

import type { User, Transaction, Goal, Account } from '../types';
import { db } from '../lib/database';
import accountService from './accountService';
import goalService from './goalService'; // À créer si n'existe pas

/**
 * Types de suggestions de goals
 */
export type GoalSuggestionType = 
  | 'emergency_fund'
  | 'vacation'
  | 'education'
  | 'house_purchase'
  | 'custom';

/**
 * Interface pour une suggestion de goal
 */
export interface GoalSuggestion {
  id: string;
  type: GoalSuggestionType;
  title: string;
  description: string;
  targetAmount: number;
  suggestedDeadline: Date;
  priority: 'low' | 'medium' | 'high';
  category: string;
  reasoning: string[]; // Raisons de la suggestion
  relevanceScore: number; // 0-100
  estimatedMonthlyContribution: number;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Contexte pour génération suggestions
 */
export interface GoalSuggestionContext {
  user: User;
  transactions: Transaction[];
  existingGoals: Goal[];
  accounts: Account[];
  essentialMonthlyExpenses: number;
  monthlyIncome: number;
}

/**
 * Génère des suggestions de goals personnalisées
 */
export const generateGoalSuggestions = (
  context: GoalSuggestionContext
): GoalSuggestion[] => {
  // 1. Analyser profil utilisateur
  // 2. Vérifier goals existants (éviter doublons)
  // 3. Générer candidats par type
  // 4. Scorer chaque candidat
  // 5. Filtrer et trier
  // 6. Retourner top 3-5 suggestions
};

/**
 * Accepte une suggestion et crée le goal + compte
 */
export const acceptGoalSuggestion = async (
  userId: string,
  suggestionId: string,
  modifications?: Partial<GoalSuggestion>
): Promise<{ goal: Goal; account?: Account }> => {
  // 1. Récupérer suggestion
  // 2. Appliquer modifications si fournies
  // 3. Créer goal
  // 4. Créer compte épargne si type='epargne'
  // 5. Lier goal ↔ account
  // 6. Sauvegarder feedback
  // 7. Retourner goal + account
};

/**
 * Rejette une suggestion
 */
export const rejectGoalSuggestion = (
  userId: string,
  suggestionId: string
): void => {
  // 1. Sauvegarder feedback rejection
  // 2. Décrémenter préférences type
  // 3. Ne plus suggérer ce type temporairement
};

/**
 * Ignore une suggestion (peut être re-suggéré)
 */
export const dismissGoalSuggestion = (
  userId: string,
  suggestionId: string
): void => {
  // 1. Sauvegarder dans historique
  // 2. Retirer de suggestions actives
};
```

### **7.2 Fonctions de Génération par Type**

#### **A. Emergency Fund Suggestion**

```typescript
const generateEmergencyFundSuggestion = (
  context: GoalSuggestionContext
): GoalSuggestion | null => {
  const { user, existingGoals, essentialMonthlyExpenses } = context;
  
  // Vérifier si goal fond d'urgence existe déjà
  const hasEmergencyFund = existingGoals.some(
    g => g.category === 'epargne' && 
    (g.name.toLowerCase().includes('urgence') || 
     g.name.toLowerCase().includes('emergency'))
  );
  
  if (hasEmergencyFund) return null;
  
  // Vérifier déclencheurs
  const savingsPriority = user.preferences?.priorityAnswers?.savings_priority;
  if (savingsPriority !== 'high' && savingsPriority !== 'critical') {
    return null; // Pas prioritaire
  }
  
  if (essentialMonthlyExpenses === 0) {
    return null; // Pas assez de données
  }
  
  // Calculer objectif
  const familySize = extractFamilySize(user);
  const months = familySize >= 4 ? 9 : 6; // Famille nombreuse → 9 mois
  const targetAmount = essentialMonthlyExpenses * months;
  
  // Calculer deadline (12 mois pour atteindre)
  const deadline = new Date(Date.now() + 12 * 30 * 24 * 60 * 60 * 1000);
  
  // Calculer contribution mensuelle suggérée
  const monthlyContribution = targetAmount / 12;
  
  // Calculer score de pertinence
  let relevanceScore = 70; // Base
  if (savingsPriority === 'critical') relevanceScore += 20;
  if (familySize >= 4) relevanceScore += 10;
  
  return {
    id: crypto.randomUUID(),
    type: 'emergency_fund',
    title: 'Fonds d\'Urgence',
    description: `Créez un fonds d'urgence de ${months} mois de dépenses essentielles pour faire face aux imprévus.`,
    targetAmount,
    suggestedDeadline: deadline,
    priority: 'high',
    category: 'epargne',
    reasoning: [
      `Vos dépenses essentielles mensuelles: ${formatAriary(essentialMonthlyExpenses)}`,
      `Recommandation: ${months} mois de dépenses (${formatAriary(targetAmount)})`,
      `Contribution mensuelle suggérée: ${formatAriary(monthlyContribution)}`,
      savingsPriority === 'critical' ? 'Priorité élevée selon vos préférences' : ''
    ],
    relevanceScore: Math.min(100, relevanceScore),
    estimatedMonthlyContribution: monthlyContribution,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 jours
  };
};
```

#### **B. Vacation Suggestion**

```typescript
const generateVacationSuggestion = (
  context: GoalSuggestionContext
): GoalSuggestion | null => {
  const { user, existingGoals, monthlyIncome } = context;
  
  // Vérifier si goal vacances existe
  const hasVacationGoal = existingGoals.some(
    g => g.category === 'loisirs' && 
    (g.name.toLowerCase().includes('vacance') || 
     g.name.toLowerCase().includes('voyage'))
  );
  
  if (hasVacationGoal) return null;
  
  // Vérifier déclencheurs
  const financialGoals = user.preferences?.priorityAnswers?.financial_goals_short;
  if (financialGoals !== 'vacation') {
    // Vérifier saisonnalité
    const month = new Date().getMonth() + 1;
    if (month !== 12 && month < 6 && month > 8) {
      return null; // Pas période vacances
    }
  }
  
  // Calculer objectif
  const familySize = extractFamilySize(user);
  const baseAmount = monthlyIncome * 0.5; // 50% revenu mensuel
  const targetAmount = baseAmount * Math.max(1, familySize * 0.7); // Ajustement famille
  
  // Calculer deadline (prochaine période vacances)
  const deadline = calculateNextVacationPeriod();
  
  // Calculer contribution mensuelle
  const monthsUntilDeadline = Math.ceil(
    (deadline.getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000)
  );
  const monthlyContribution = targetAmount / Math.max(1, monthsUntilDeadline);
  
  // Score de pertinence
  let relevanceScore = 50;
  if (financialGoals === 'vacation') relevanceScore += 30;
  if (isVacationSeason()) relevanceScore += 20;
  
  return {
    id: crypto.randomUUID(),
    type: 'vacation',
    title: 'Épargne Vacances',
    description: `Épargnez pour vos prochaines vacances en famille.`,
    targetAmount,
    suggestedDeadline: deadline,
    priority: 'medium',
    category: 'loisirs',
    reasoning: [
      `Montant suggéré: ${formatAriary(targetAmount)}`,
      `Contribution mensuelle: ${formatAriary(monthlyContribution)}`,
      `Objectif à atteindre avant ${formatDate(deadline)}`
    ],
    relevanceScore: Math.min(100, relevanceScore),
    estimatedMonthlyContribution: monthlyContribution,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 jours
  };
};
```

#### **C. Education Suggestion**

```typescript
const generateEducationSuggestion = (
  context: GoalSuggestionContext
): GoalSuggestion | null => {
  const { user, existingGoals } = context;
  
  // Vérifier si goal éducation existe
  const hasEducationGoal = existingGoals.some(
    g => g.category === 'education'
  );
  
  if (hasEducationGoal) return null;
  
  // Vérifier déclencheurs
  const financialGoals = user.preferences?.priorityAnswers?.financial_goals_short;
  const familySituation = user.preferences?.priorityAnswers?.family_situation;
  const month = new Date().getMonth() + 1;
  
  const shouldSuggest = 
    financialGoals === 'education' ||
    (familySituation?.includes('family') && (month === 1 || month === 2)); // Rentrée
  
  if (!shouldSuggest) return null;
  
  // Calculer coût éducation
  const familySize = extractFamilySize(user);
  const baseCost = 500000; // Coût moyen rentrée Madagascar
  const targetAmount = baseCost * familySize;
  
  // Deadline: 15 Janvier année suivante
  const nextYear = new Date().getFullYear() + 1;
  const deadline = new Date(nextYear, 0, 15);
  
  // Contribution mensuelle
  const monthsUntilDeadline = Math.ceil(
    (deadline.getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000)
  );
  const monthlyContribution = targetAmount / Math.max(1, monthsUntilDeadline);
  
  // Score
  let relevanceScore = 60;
  if (financialGoals === 'education') relevanceScore += 25;
  if (month === 1 || month === 2) relevanceScore += 15; // Rentrée proche
  
  return {
    id: crypto.randomUUID(),
    type: 'education',
    title: 'Épargne Rentrée Scolaire',
    description: `Préparez la rentrée scolaire de vos enfants.`,
    targetAmount,
    suggestedDeadline: deadline,
    priority: month <= 2 ? 'high' : 'medium',
    category: 'education',
    reasoning: [
      `Coût estimé: ${formatAriary(targetAmount)}`,
      `Contribution mensuelle: ${formatAriary(monthlyContribution)}`,
      `Objectif: ${formatDate(deadline)}`
    ],
    relevanceScore: Math.min(100, relevanceScore),
    estimatedMonthlyContribution: monthlyContribution,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 jours
  };
};
```

### **7.3 Scoring et Filtrage**

```typescript
const scoreGoalSuggestion = (
  suggestion: GoalSuggestion,
  context: GoalSuggestionContext
): number => {
  const { user } = context;
  let score = suggestion.relevanceScore; // Score de base
  
  // Bonus selon priorityAnswers
  const answers = user.preferences?.priorityAnswers || {};
  
  if (suggestion.type === 'emergency_fund' && answers.savings_priority === 'critical') {
    score += 15;
  }
  
  if (suggestion.type === 'vacation' && answers.financial_goals_short === 'vacation') {
    score += 20;
  }
  
  // Pénalité si goal similaire récemment rejeté
  const rejectedGoals = user.preferences?.rejectedGoalSuggestions || [];
  const recentlyRejected = rejectedGoals.some(
    r => r.goalType === suggestion.type && 
    daysSince(r.timestamp) < 30
  );
  if (recentlyRejected) {
    score -= 30;
  }
  
  return Math.min(100, Math.max(0, score));
};

const filterGoalSuggestions = (
  suggestions: GoalSuggestion[],
  context: GoalSuggestionContext
): GoalSuggestion[] => {
  // 1. Scorer toutes les suggestions
  const scored = suggestions.map(s => ({
    ...s,
    relevanceScore: scoreGoalSuggestion(s, context)
  }));
  
  // 2. Filtrer score >= 50
  const filtered = scored.filter(s => s.relevanceScore >= 50);
  
  // 3. Trier par score décroissant
  const sorted = filtered.sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  // 4. Limiter à 5 suggestions max
  return sorted.slice(0, 5);
};
```

---

## 8. INTEGRATION WITH ACCOUNTS

### **8.1 Création Compte Épargne Lié**

**Lors Accept Goal Suggestion:**

```typescript
const acceptGoalSuggestion = async (
  userId: string,
  suggestionId: string,
  modifications?: Partial<GoalSuggestion>
): Promise<{ goal: Goal; account?: Account }> => {
  // 1. Récupérer suggestion
  const suggestion = getSuggestionById(suggestionId);
  if (!suggestion) throw new Error('Suggestion non trouvée');
  
  // 2. Appliquer modifications
  const finalSuggestion = modifications 
    ? { ...suggestion, ...modifications }
    : suggestion;
  
  // 3. Créer goal
  const goal = await goalService.createGoal({
    userId,
    name: finalSuggestion.title,
    targetAmount: finalSuggestion.targetAmount,
    currentAmount: 0,
    deadline: finalSuggestion.suggestedDeadline,
    category: finalSuggestion.category,
    priority: finalSuggestion.priority === 'high' ? 'high' : 
              finalSuggestion.priority === 'medium' ? 'medium' : 'low'
  });
  
  // 4. Créer compte épargne si type='epargne' ou category='epargne'
  let account: Account | undefined;
  if (finalSuggestion.category === 'epargne' || 
      finalSuggestion.type === 'emergency_fund') {
    account = await accountService.createAccount(userId, {
      name: `Épargne ${goal.name}`,
      type: 'epargne',
      balance: 0,
      currency: 'MGA',
      isDefault: false
    });
    
    // 5. Lier goal ↔ account
    await goalService.updateGoal(goal.id, {
      accountId: account.id,
      autoSync: true
    });
    
    await accountService.updateAccount(account.id, userId, {
      goalId: goal.id,
      isGoalAccount: true
    });
  }
  
  // 6. Sauvegarder feedback
  const feedback: GoalSuggestionFeedback = {
    suggestionId,
    goalType: finalSuggestion.type,
    action: 'accepted',
    modifications: modifications ? {
      targetAmount: modifications.targetAmount,
      deadline: modifications.suggestedDeadline
    } : undefined,
    timestamp: new Date()
  };
  
  await saveGoalSuggestionFeedback(userId, feedback);
  
  // 7. Retirer de suggestions actives
  await removeFromActiveSuggestions(userId, suggestionId);
  
  return { goal, account };
};
```

### **8.2 Synchronisation Automatique**

**Service de Synchronisation:**

```typescript
const syncGoalWithAccount = async (goalId: string): Promise<void> => {
  const goal = await goalService.getGoal(goalId);
  if (!goal || !goal.accountId) return;
  
  const account = await accountService.getAccount(goal.accountId);
  if (!account || account.type !== 'epargne') return;
  
  // Synchroniser currentAmount avec balance
  if (goal.autoSync) {
    await goalService.updateGoal(goalId, {
      currentAmount: account.balance
    });
    
    // Vérifier complétion
    if (account.balance >= goal.targetAmount && !goal.isCompleted) {
      await goalService.completeGoal(goalId);
    }
  }
};
```

### **8.3 Affichage Unifié**

**Dans GoalsPage:**
- Afficher compte épargne lié
- Afficher solde réel du compte
- Bouton "Voir compte" → navigation vers AccountDetailPage

**Dans AccountsPage:**
- Badge "Goal Account" pour comptes liés
- Afficher goal associé
- Progression goal dans carte compte

---

## 9. IMPLÉMENTATION CHECKLIST

### **Phase 1: Extension Schéma** ⭐⭐⭐

- [ ] Ajouter `accountId` et `autoSync` dans Goal (IndexedDB + Supabase)
- [ ] Ajouter `goalId` et `isGoalAccount` dans Account (IndexedDB + Supabase)
- [ ] Créer table `goalSuggestions` dans IndexedDB (si nécessaire)
- [ ] Migration données existantes

### **Phase 2: Service Goal Suggestion** ⭐⭐⭐

- [ ] Créer `goalSuggestionService.ts`
- [ ] Implémenter `generateGoalSuggestions()`
- [ ] Implémenter générateurs par type (emergency_fund, vacation, education)
- [ ] Implémenter scoring et filtrage
- [ ] Implémenter `acceptGoalSuggestion()` avec création compte
- [ ] Implémenter `rejectGoalSuggestion()` et `dismissGoalSuggestion()`

### **Phase 3: Intégration UI** ⭐⭐

- [ ] Créer composant `GoalSuggestionCard.tsx`
- [ ] Créer modal `AcceptGoalSuggestionModal.tsx` (avec modifications)
- [ ] Intégrer dans GoalsPage (section suggestions)
- [ ] Intégrer dans DashboardPage (widget suggestions)
- [ ] Affichage compte lié dans GoalsPage

### **Phase 4: Synchronisation** ⭐⭐

- [ ] Implémenter `syncGoalWithAccount()`
- [ ] Déclencher sync lors mise à jour compte
- [ ] Déclencher sync périodique (daily)
- [ ] Notification complétion goal

### **Phase 5: Tests et Optimisation** ⭐

- [ ] Tests unitaires service
- [ ] Tests intégration UI
- [ ] Optimisation performance
- [ ] Documentation utilisateur

---

## 10. EXEMPLES D'UTILISATION

### **Scénario 1: Nouvel Utilisateur**

```
1. Utilisateur complète PriorityQuestionsPage
2. Système calcule essentialMonthlyExpenses depuis transactions
3. Génère suggestion "Fond d'Urgence" (score: 85)
4. Utilisateur accepte → Crée goal + compte épargne lié
5. Synchronisation automatique solde → currentAmount
```

### **Scénario 2: Utilisateur avec Famille**

```
1. Utilisateur a family_situation='large_family'
2. Mois Janvier → Génère suggestion "Rentrée Scolaire" (score: 90)
3. Utilisateur modifie montant → Accepte avec modifications
4. Crée goal éducation + compte épargne dédié
5. Suivi automatique progrès
```

### **Scénario 3: Rejet Temporaire**

```
1. Utilisateur rejette suggestion "Vacances" (score: 60)
2. Feedback sauvegardé → Décrémente préférences
3. Ne plus suggérer vacances pendant 30 jours
4. Après 30 jours → Peut être re-suggéré si contexte change
```

---

## CONCLUSION

### **Patterns Existants Réutilisables:**

✅ **Personnalisation Multi-Sources** (recommendationEngineService)
✅ **Scoring Pondéré** (relevance_score avec poids)
✅ **Templates Prédéfinis** (bibliothèque de suggestions)
✅ **Feedback Utilisateur** (like/dislike avec ML)
✅ **Filtrage Intelligent** (seuil + diversification)

### **Architecture Proposée:**

✅ **Service Unifié** (`goalSuggestionService.ts`)
✅ **Génération Contextuelle** (basée sur profil + transactions + saison)
✅ **Intégration Comptes** (création automatique compte épargne)
✅ **Synchronisation Automatique** (goal ↔ account)
✅ **Feedback Complet** (accept/reject/dismiss/modify)

### **Prochaines Étapes:**

1. Valider architecture avec équipe
2. Implémenter Phase 1 (extension schéma)
3. Créer goalSuggestionService.ts
4. Intégrer UI progressivement
5. Tests et optimisation

---

**AGENT-3-DESIGN-ANALYSIS-COMPLETE**

