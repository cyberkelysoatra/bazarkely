# AGENT 03 - ANALYSE MODÈLE DE DONNÉES GOAL

**Date:** 2025-12-31  
**Projet:** BazarKELY  
**Objectif:** Analyser le modèle de données Goal pour identifier l'origine de la date cible par défaut (~5 ans)  
**Session:** Multi-agent diagnostic - Agent 03

---

## 1. GOAL TYPE DEFINITION

### **Interface Goal Complète**

**Fichier:** `frontend/src/types/index.ts` (lignes 133-152)

```typescript
export interface Goal {
  id: string;
  userId: string;
  createdAt?: string; // ISO date string when goal was created
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: Date;  // ⚠️ CHAMP PRINCIPAL POUR DATE CIBLE
  category?: string;
  priority: 'low' | 'medium' | 'high';
  isCompleted?: boolean;
  // Goals ↔ Accounts linking
  linkedAccountId?: string; // UUID of linked savings account
  autoSync?: boolean; // Auto-sync balance to currentAmount
  // Goal suggestions system
  isSuggested?: boolean; // Whether this goal was suggested by the system
  suggestionType?: string; // Type of suggestion (e.g., 'emergency_fund', 'debt_payoff')
  suggestionAcceptedAt?: string; // ISO date string when suggestion was accepted
  suggestionDismissedAt?: string; // ISO date string when suggestion was dismissed
  // Milestones tracking
  milestones?: GoalMilestone[];
}
```

**Caractéristiques:**
- ✅ **`deadline`:** Type `Date` (non nullable, requis)
- ✅ **Pas de valeur par défaut** dans l'interface TypeScript
- ✅ **Mapping Supabase:** `target_date` (snake_case) → `deadline` (camelCase)

### **Interface GoalFormData**

**Fichier:** `frontend/src/types/index.ts` (lignes 305-312)

```typescript
export interface GoalFormData {
  name: string;
  targetAmount: number;
  deadline: Date;
  category?: string;
  priority: 'low' | 'medium' | 'high';
  linkedAccountId?: string; // UUID of linked savings account
}
```

**Caractéristiques:**
- ✅ **`deadline`:** Type `Date` (requis, non optionnel)
- ✅ **Pas de valeur par défaut** dans l'interface

---

## 2. DATABASE SCHEMA

### **IndexedDB Schema**

**Fichier:** `frontend/src/lib/database.ts` (ligne 313)

```typescript
goals: 'id, userId, name, targetAmount, currentAmount, deadline, createdAt, updatedAt, linkedAccountId, [userId+deadline], [userId+linkedAccountId]'
```

**Caractéristiques:**
- ✅ **Champ:** `deadline` (pas de valeur par défaut dans schéma IndexedDB)
- ✅ **Index:** `[userId+deadline]` pour recherche par utilisateur et deadline

### **Supabase Schema**

**Fichier:** `frontend/src/types/supabase.ts` (lignes 485-487)

```typescript
export type Goal = Database['public']['Tables']['goals']['Row']
export type GoalInsert = Database['public']['Tables']['goals']['Insert']
export type GoalUpdate = Database['public']['Tables']['goals']['Update']
```

**Mapping Supabase → Frontend** (`goalService.ts:74-93`):
```typescript
private mapSupabaseToGoal(supabaseGoal: any): Goal {
  return {
    // ...
    deadline: supabaseGoal.target_date ? new Date(supabaseGoal.target_date) : new Date(),
    // ...
  };
}
```

**⚠️ PROBLÈME IDENTIFIÉ:**
- Si `target_date` est `null` ou `undefined` dans Supabase, la valeur par défaut est `new Date()` (date actuelle)
- **Mais ce n'est pas la source du problème de 5 ans**

**Mapping Frontend → Supabase** (`goalService.ts:98-109`):
```typescript
private mapGoalToSupabase(goal: Partial<Goal> | GoalFormData): any {
  // ...
  if ('deadline' in goal && goal.deadline) {
    result.target_date = goal.deadline instanceof Date 
      ? goal.deadline.toISOString().split('T')[0] 
      : goal.deadline;
  }
  // ...
}
```

---

## 3. TARGET DATE FIELD

### **Type et Nullabilité**

**Type:** `Date` (non nullable dans interface TypeScript)  
**Nom Supabase:** `target_date` (snake_case)  
**Nom Frontend:** `deadline` (camelCase)

### **Valeurs par Défaut**

**Dans l'Interface TypeScript:**
- ❌ **Aucune valeur par défaut** définie dans `Goal` ou `GoalFormData`

**Dans le Mapping Supabase:**
- ✅ **Fallback:** `new Date()` si `target_date` est null/undefined (date actuelle)
- ⚠️ **Mais ce n'est pas utilisé** car les suggestions génèrent toujours une deadline

**Dans le Code:**
- ✅ **Toujours fournie** par le service de suggestions ou le formulaire utilisateur

---

## 4. GOAL CREATION FLOW

### **Flux de Création Standard**

**1. Création via `goalService.createGoal()`**

**Fichier:** `frontend/src/services/goalService.ts` (lignes 226-293)

```typescript
async createGoal(userId: string, goalData: GoalFormData): Promise<Goal> {
  const goalId = crypto.randomUUID();
  const now = new Date();

  const goal: Goal = {
    id: goalId,
    userId,
    createdAt: now.toISOString(),
    name: goalData.name,
    targetAmount: goalData.targetAmount,
    currentAmount: 0,
    deadline: goalData.deadline instanceof Date 
      ? goalData.deadline 
      : new Date(goalData.deadline),  // ⚠️ Conversion depuis GoalFormData
    category: goalData.category,
    priority: goalData.priority,
    isCompleted: false,
    linkedAccountId: goalData.linkedAccountId
  };

  await db.goals.add(goal);
  // ... sync Supabase
}
```

**Caractéristiques:**
- ✅ **`deadline` provient directement de `goalData.deadline`**
- ✅ **Pas de valeur par défaut** dans `createGoal()`
- ✅ **Conversion:** String → Date si nécessaire

### **Flux de Création depuis Suggestion**

**Fichier:** `frontend/src/services/goalSuggestionService.ts` (lignes 447-497)

```typescript
async acceptSuggestion(userId: string, suggestion: GoalSuggestion): Promise<Goal> {
  // Créer les données de l'objectif
  const goalData: GoalFormData = {
    name: suggestion.title,
    targetAmount: suggestion.targetAmount,
    deadline: suggestion.deadline ? new Date(suggestion.deadline) : new Date(),  // ⚠️ FALLBACK
    category: suggestion.category,
    priority: suggestion.priority
  };
  
  // Créer l'objectif via goalService
  const goal = await goalService.createGoal(userId, goalData);
  // ...
}
```

**⚠️ PROBLÈME IDENTIFIÉ:**
- Si `suggestion.deadline` est `null` ou `undefined`, fallback à `new Date()` (date actuelle)
- **Mais les suggestions génèrent toujours une deadline**, donc ce fallback n'est jamais utilisé

---

## 5. DEFAULT VALUES FOUND

### **⚠️ VALEUR PAR DÉFAUT DE 60 MOIS (5 ANS) TROUVÉE**

**Fichier:** `frontend/src/services/goalSuggestionService.ts` (lignes 169-182)

```typescript
private calculateAdaptiveDeadline(targetAmount: number, maxMonthlyContribution: number): number {
  if (maxMonthlyContribution <= 0) {
    return 60; // ⚠️ RETOURNE 60 MOIS SI PAS DE CAPACITÉ D'ÉPARGNE
  }
  
  // Calculer les mois nécessaires
  const monthsNeeded = Math.ceil(targetAmount / maxMonthlyContribution);
  
  // Ajouter 20% de buffer pour la sécurité
  const monthsWithBuffer = Math.ceil(monthsNeeded * 1.2);
  
  // Limiter à 60 mois (5 ans) maximum pour rester réaliste
  return Math.min(monthsWithBuffer, 60);
}
```

**⚠️ PROBLÈME IDENTIFIÉ:**

**Scénario déclencheur:**
1. `disposableIncome = monthlyIncome - monthlyExpenses`
2. Si `disposableIncome <= 0` (revenus ≤ dépenses), alors:
   - `maxMonthlyContribution = disposableIncome * 0.3 = 0` ou négatif
3. `calculateAdaptiveDeadline()` retourne **60 mois** (5 ans)
4. Deadline calculée: `new Date()` + 60 mois = **~Janvier 2031**

**Utilisation dans Suggestions:**

**Fichier:** `frontend/src/services/goalSuggestionService.ts` (lignes 198-227)

```typescript
// PRIORITÉ 1: Fonds d'urgence 3 mois
if (profile.emergencyFundMonths < 3) {
  const targetAmount = profile.monthlyExpenses * 3;
  
  // Calculer l'échéance adaptative
  const adaptiveMonths = this.calculateAdaptiveDeadline(targetAmount, maxMonthlyContribution);
  
  // Ne suggérer que si l'échéance adaptative est réaliste (<= 60 mois)
  if (adaptiveMonths <= 60) {  // ⚠️ TOUJOURS VRAI SI maxMonthlyContribution <= 0
    const deadline = new Date();
    deadline.setMonth(deadline.getMonth() + adaptiveMonths);  // ⚠️ +60 MOIS
    
    suggestions.push({
      type: 'savings_3months',
      title: "Fonds d'urgence - 3 mois",
      deadline: deadline.toISOString(),  // ⚠️ DATE EN 2031
      // ...
    });
  }
}
```

**Problème Logique:**
- ✅ Si `maxMonthlyContribution <= 0`, `calculateAdaptiveDeadline()` retourne **60**
- ✅ La condition `if (adaptiveMonths <= 60)` est **toujours vraie** (60 <= 60)
- ✅ La suggestion est créée avec deadline = **date actuelle + 60 mois**

### **Autres Valeurs par Défaut Trouvées**

**1. Fallback dans Mapping Supabase** (`goalService.ts:82`):
```typescript
deadline: supabaseGoal.target_date ? new Date(supabaseGoal.target_date) : new Date()
```
- ✅ Utilisé uniquement si `target_date` est null dans Supabase
- ⚠️ **Pas la source du problème** (les suggestions génèrent toujours une deadline)

**2. Fallback dans acceptSuggestion** (`goalSuggestionService.ts:455`):
```typescript
deadline: suggestion.deadline ? new Date(suggestion.deadline) : new Date()
```
- ✅ Utilisé uniquement si `suggestion.deadline` est null
- ⚠️ **Pas la source du problème** (les suggestions génèrent toujours une deadline)

---

## 6. SUGGESTION TO CREATION

### **Flux Complet: Suggestion → Création**

**Étape 1: Génération de Suggestion**

**Fichier:** `frontend/src/services/goalSuggestionService.ts` (lignes 190-227)

```typescript
generateSuggestions(profile: FinancialProfile): GoalSuggestion[] {
  const disposableIncome = profile.monthlyIncome - profile.monthlyExpenses;
  const maxMonthlyContribution = disposableIncome * 0.3; // Max 30% du revenu disponible
  
  // PRIORITÉ 1: Fonds d'urgence 3 mois
  if (profile.emergencyFundMonths < 3) {
    const targetAmount = profile.monthlyExpenses * 3;
    
    // ⚠️ CALCUL ADAPTATIF
    const adaptiveMonths = this.calculateAdaptiveDeadline(targetAmount, maxMonthlyContribution);
    
    if (adaptiveMonths <= 60) {
      const deadline = new Date();
      deadline.setMonth(deadline.getMonth() + adaptiveMonths);  // ⚠️ +60 MOIS SI maxMonthlyContribution <= 0
      
      suggestions.push({
        type: 'savings_3months',
        title: "Fonds d'urgence - 3 mois",
        targetAmount: Math.round(targetAmount),
        deadline: deadline.toISOString(),  // ⚠️ DATE EN 2031
        // ...
      });
    }
  }
}
```

**Étape 2: Acceptation de Suggestion**

**Fichier:** `frontend/src/services/goalSuggestionService.ts` (lignes 447-497)

```typescript
async acceptSuggestion(userId: string, suggestion: GoalSuggestion): Promise<Goal> {
  const goalData: GoalFormData = {
    name: suggestion.title,
    targetAmount: suggestion.targetAmount,
    deadline: suggestion.deadline ? new Date(suggestion.deadline) : new Date(),
    // ...
  };
  
  const goal = await goalService.createGoal(userId, goalData);
  // ...
}
```

**Étape 3: Création du Goal**

**Fichier:** `frontend/src/services/goalService.ts` (lignes 226-293)

```typescript
async createGoal(userId: string, goalData: GoalFormData): Promise<Goal> {
  const goal: Goal = {
    // ...
    deadline: goalData.deadline instanceof Date 
      ? goalData.deadline 
      : new Date(goalData.deadline),
    // ...
  };
  
  await db.goals.add(goal);
  // ...
}
```

### **Résumé du Flux**

```
generateSuggestions()
  ↓
calculateAdaptiveDeadline(targetAmount, maxMonthlyContribution)
  ↓ (si maxMonthlyContribution <= 0)
return 60  // ⚠️ 60 MOIS
  ↓
deadline = new Date() + 60 mois  // ⚠️ ~2031
  ↓
suggestion.deadline = deadline.toISOString()
  ↓
acceptSuggestion()
  ↓
goalData.deadline = new Date(suggestion.deadline)  // ⚠️ DATE EN 2031
  ↓
createGoal()
  ↓
goal.deadline = goalData.deadline  // ⚠️ DATE EN 2031
```

---

## CONCLUSION

### **Source du Problème Identifiée**

**✅ PROBLÈME PRINCIPAL:**

**Fichier:** `frontend/src/services/goalSuggestionService.ts` (ligne 170-171)

```typescript
if (maxMonthlyContribution <= 0) {
  return 60; // ⚠️ RETOURNE 60 MOIS SI PAS DE CAPACITÉ D'ÉPARGNE
}
```

**Scénario:**
1. **Utilisateur avec revenus ≤ dépenses** → `disposableIncome <= 0`
2. **`maxMonthlyContribution = disposableIncome * 0.3 = 0`**
3. **`calculateAdaptiveDeadline()` retourne 60 mois** (5 ans)
4. **Deadline calculée:** Date actuelle + 60 mois = **~Janvier 2031**

**Impact:**
- ✅ Tous les objectifs suggérés pour utilisateurs sans capacité d'épargne ont deadline = **5 ans**
- ✅ Même pour "Fonds d'urgence - 3 mois" qui devrait être atteignable rapidement

### **Recommandations**

**1. Améliorer la Logique `calculateAdaptiveDeadline()`:**

```typescript
private calculateAdaptiveDeadline(targetAmount: number, maxMonthlyContribution: number): number {
  if (maxMonthlyContribution <= 0) {
    // ⚠️ PROBLÈME: Retourne 60 mois par défaut
    // ✅ SOLUTION: Ne pas suggérer l'objectif ou utiliser un délai raisonnable
    // Option 1: Retourner null et ne pas créer la suggestion
    // Option 2: Utiliser un délai minimum raisonnable (ex: 12 mois)
    return 12; // Au lieu de 60
  }
  
  const monthsNeeded = Math.ceil(targetAmount / maxMonthlyContribution);
  const monthsWithBuffer = Math.ceil(monthsNeeded * 1.2);
  return Math.min(monthsWithBuffer, 60);
}
```

**2. Filtrer les Suggestions Irréalistes:**

```typescript
// Ne suggérer que si l'échéance adaptative est réaliste ET si capacité d'épargne > 0
if (adaptiveMonths <= 60 && maxMonthlyContribution > 0) {
  // Créer la suggestion
}
```

**3. Ajouter Validation dans `acceptSuggestion()`:**

```typescript
async acceptSuggestion(userId: string, suggestion: GoalSuggestion): Promise<Goal> {
  // Valider que la deadline est raisonnable
  const deadlineDate = suggestion.deadline ? new Date(suggestion.deadline) : new Date();
  const yearsFromNow = (deadlineDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 365);
  
  if (yearsFromNow > 3) {
    console.warn(`⚠️ Deadline très éloignée (${yearsFromNow.toFixed(1)} ans). Vérifier la suggestion.`);
  }
  
  // ...
}
```

---

**AGENT-03-GOAL-DATA-MODEL-COMPLETE**




