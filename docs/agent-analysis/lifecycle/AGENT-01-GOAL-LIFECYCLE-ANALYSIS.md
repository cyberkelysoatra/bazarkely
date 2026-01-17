# AGENT 01 - ANALYSE CYCLE DE VIE DES OBJECTIFS
## BazarKELY v2.4.3 - Phase B: Sync goal.deadline avec calculated monthly contribution

**Date:** 2026-01-02  
**Agent:** Agent 01 - Backend/Config  
**Objectif:** Identifier tous les points de déclenchement où `goal.deadline` devrait être recalculé et persisté

---

## 1. GOAL CREATION FLOWS

### 1.1 Création manuelle via GoalsPage
**Fichier:** `frontend/src/pages/GoalsPage.tsx`  
**Lignes:** 445-572 (`handleSaveGoal`)  
**Chemin de code:**
- Utilisateur remplit formulaire modal (lignes 1357-1554)
- `handleSaveGoal()` appelé (ligne 1541)
- Si `editingGoal === null` → création
- Deux sous-chemins:
  - **Avec nouveau compte:** `savingsService.createGoalWithAccount()` (ligne 525)
  - **Sans compte ou compte existant:** `goalService.createGoal()` (ligne 538)

**Deadline source:** Saisie manuelle utilisateur dans champ `<input type="date">` (ligne 1397-1405)

**Gap identifié:** ❌ Deadline non recalculée si `requiredMonthlyContribution` existe

---

### 1.2 Création via goalService.createGoal()
**Fichier:** `frontend/src/services/goalService.ts`  
**Lignes:** 226-293  
**Méthode:** `createGoal(userId: string, goalData: GoalFormData): Promise<Goal>`

**Flux:**
1. Génère UUID (ligne 229)
2. Crée objet Goal avec `deadline` depuis `goalData.deadline` (ligne 240)
3. Sauvegarde IndexedDB (ligne 249)
4. Sync Supabase si online (ligne 253-282)
5. Queue sync si offline (ligne 284-287)

**Deadline source:** `goalData.deadline` passé en paramètre (pas de calcul)

**Gap identifié:** ❌ Pas de calcul de deadline basé sur `requiredMonthlyContribution`

---

### 1.3 Création via goalSuggestionService.acceptSuggestion()
**Fichier:** `frontend/src/services/goalSuggestionService.ts`  
**Lignes:** 526-576  
**Méthode:** `acceptSuggestion(userId: string, suggestion: GoalSuggestion): Promise<Goal>`

**Flux:**
1. Crée `goalData` depuis `suggestion` (lignes 531-537)
2. `deadline` vient de `suggestion.deadline` (ligne 534)
3. Appelle `goalService.createGoal()` (ligne 540)
4. Met à jour métadonnées suggestion (lignes 543-548)
5. Sauvegarde IndexedDB (ligne 551)
6. Sync Supabase (lignes 554-567)

**Deadline source:** `suggestion.deadline` calculé par `generateSuggestions()` via `calculateAdaptiveDeadline()`

**Gap identifié:** ✅ Deadline calculée correctement lors de la création, mais pas mise à jour si `requiredMonthlyContribution` change après

---

### 1.4 Création atomique via savingsService.createGoalWithAccount()
**Fichier:** `frontend/src/services/savingsService.ts`  
**Lignes:** 26-95  
**Méthode:** `createGoalWithAccount(userId: string, goalData: GoalFormData, accountName?: string)`

**Flux:**
1. Crée compte épargne (ligne 45)
2. Crée goal avec `linkedAccountId` (lignes 53-58)
3. Appelle `goalService.createGoal()` (ligne 58)
4. Met à jour compte avec `linkedGoalId` (lignes 62-66)
5. Active `autoSync` sur goal (lignes 73-83)

**Deadline source:** `goalData.deadline` passé en paramètre

**Gap identifié:** ❌ Deadline non recalculée si `requiredMonthlyContribution` existe

---

## 2. GOAL UPDATE FLOWS

### 2.1 Mise à jour manuelle via GoalsPage
**Fichier:** `frontend/src/pages/GoalsPage.tsx`  
**Lignes:** 445-572 (`handleSaveGoal`)  
**Chemin de code:**
- Si `editingGoal !== null` → édition (ligne 485)
- Gère liaison/déliaison compte (lignes 491-503)
- Appelle `goalService.updateGoal()` (ligne 506)
- Met à jour `autoSync` dans IndexedDB (lignes 508-518)

**Deadline source:** Saisie manuelle utilisateur (ligne 1397-1405)

**Gap identifié:** ❌ Deadline non recalculée si `requiredMonthlyContribution` change

---

### 2.2 Mise à jour via goalService.updateGoal()
**Fichier:** `frontend/src/services/goalService.ts`  
**Lignes:** 301-386  
**Méthode:** `updateGoal(id: string, userId: string, goalData: Partial<GoalFormData>): Promise<Goal>`

**Flux:**
1. Récupère goal existant depuis IndexedDB (ligne 304)
2. Merge avec `goalData` (lignes 322-330)
3. Gère conversion `deadline` si présent (lignes 333-337)
4. Sauvegarde IndexedDB (ligne 340)
5. Sync Supabase si online (lignes 344-375)
6. Queue sync si offline (ligne 378-380)

**Deadline source:** `goalData.deadline` si présent dans les données de mise à jour

**Gap identifié:** ❌ Pas de recalcul automatique de deadline basé sur `requiredMonthlyContribution`

---

### 2.3 Synchronisation goal ↔ compte via savingsService.syncGoalWithAccount()
**Fichier:** `frontend/src/services/savingsService.ts`  
**Lignes:** 212-277  
**Méthode:** `syncGoalWithAccount(goalId: string): Promise<Goal>`

**Flux:**
1. Récupère goal et compte lié (lignes 217-230)
2. Met à jour `currentAmount` avec `account.balance` (lignes 233-236)
3. Vérifie complétion (lignes 239-244)
4. Sauvegarde IndexedDB (ligne 247)
5. Sync Supabase (lignes 250-268)

**Deadline source:** Non modifiée (seul `currentAmount` change)

**Gap identifié:** ⚠️ Si `currentAmount` change significativement, deadline pourrait être recalculée pour rester réaliste

---

### 2.4 Liaison goal ↔ compte via savingsService.linkGoalToAccount()
**Fichier:** `frontend/src/services/savingsService.ts`  
**Lignes:** 103-146  
**Méthode:** `linkGoalToAccount(goalId: string, accountId: string): Promise<void>`

**Flux:**
1. Récupère goal et compte (lignes 108-116)
2. Met à jour goal avec `linkedAccountId` (lignes 119-126)
3. Active `autoSync` (lignes 129-134)
4. Met à jour compte avec `linkedGoalId` (lignes 137-139)

**Deadline source:** Non modifiée

**Gap identifié:** ⚠️ Pas de recalcul de deadline lors de la liaison (pourrait être utile si compte a un `interestRate`)

---

### 2.5 Déliaison goal ↔ compte via savingsService.unlinkGoalFromAccount()
**Fichier:** `frontend/src/services/savingsService.ts`  
**Lignes:** 153-203  
**Méthode:** `unlinkGoalFromAccount(goalId: string): Promise<void>`

**Flux:**
1. Récupère goal (ligne 158)
2. Supprime `linkedGoalId` du compte (lignes 175-177)
3. Supprime `linkedAccountId` du goal et désactive `autoSync` (lignes 181-196)

**Deadline source:** Non modifiée

**Gap identifié:** ⚠️ Pas de recalcul de deadline lors de la déliaison

---

## 3. DEADLINE CALCULATION LOGIC

### 3.1 Calcul adaptatif dans goalSuggestionService
**Fichier:** `frontend/src/services/goalSuggestionService.ts`  
**Lignes:** 209-230  
**Méthode:** `calculateAdaptiveDeadline(targetAmount: number, maxMonthlyContribution: number): number | null`

**Logique:**
- Calcule mois nécessaires: `Math.ceil(targetAmount / maxMonthlyContribution)`
- Ajoute buffer 20%: `monthsNeeded * 1.2`
- Limite à 60 mois max
- Retourne `null` si `maxMonthlyContribution <= 0`

**Utilisation:** Uniquement dans `generateSuggestions()` pour créer des suggestions

**Gap identifié:** ❌ Cette logique n'est pas réutilisée pour recalculer deadline des goals existants

---

### 3.2 Calcul de projection dans goalService
**Fichier:** `frontend/src/services/goalService.ts`  
**Lignes:** 707-846  
**Méthode:** `calculateProjectionData(currentAmount, targetAmount, startDate, deadline, monthlyContribution?)`

**Logique:**
- Si `monthlyContribution` fourni, recalcule deadline (lignes 731-749)
- Calcule: `monthsNeeded = Math.ceil(amountToSave / monthlyContribution)`
- Limite entre 1 et 120 mois
- Recalcule `end` date: `today + cappedMonths`

**Utilisation:** Uniquement pour générer données de graphique (pas persisté)

**Gap identifié:** ❌ Deadline recalculée mais non persistée en base de données

---

### 3.3 Calcul jours restants dans GoalsPage
**Fichier:** `frontend/src/pages/GoalsPage.tsx`  
**Lignes:** 609-641  
**Méthode:** `getDaysRemaining(goal: Goal)`

**Logique:**
- Utilise `(goal as any).requiredMonthlyContribution` ou fallback `targetAmount / 12`
- Calcule: `monthsNeeded = Math.ceil(amountRemaining / monthlyContribution)`
- Limite entre 1 et 120 mois
- Convertit en jours: `monthsNeeded * 30`

**Utilisation:** Affichage UI uniquement (ligne 1118)

**Gap identifié:** ❌ Calcule deadline dynamique mais n'utilise pas `goal.deadline` stockée

---

## 4. SYNCHRONIZATION POINTS

### 4.1 IndexedDB ↔ Supabase Sync
**Fichier:** `frontend/src/services/goalService.ts`

**Points de sync:**
- `createGoal()`: Ligne 253-282 (CREATE)
- `updateGoal()`: Lignes 344-375 (UPDATE)
- `deleteGoal()`: Lignes 419-438 (DELETE)
- `syncGoalsFromSupabase()`: Lignes 536-566 (READ)

**Mapping deadline:**
- IndexedDB: `goal.deadline` (Date)
- Supabase: `target_date` (string ISO date)
- Conversion: `mapGoalToSupabase()` ligne 105-109
- Conversion: `mapSupabaseToGoal()` ligne 82

**Gap identifié:** ✅ Mapping correct, mais deadline non recalculée avant sync

---

### 4.2 Sync Queue (Offline-first)
**Fichier:** `frontend/src/services/goalService.ts`  
**Lignes:** 37-69 (`queueSyncOperation`)

**Points de queue:**
- `createGoal()`: Lignes 274, 280, 286
- `updateGoal()`: Lignes 367, 373, 379
- `deleteGoal()`: Lignes 432, 437

**Gap identifié:** ⚠️ Deadline devrait être recalculée avant d'être mise en queue

---

## 5. TRIGGER POINTS IDENTIFIED

### 5.1 Points où deadline DEVRAIT être recalculée

#### ✅ TRIGGER 1: Création goal depuis suggestion
**Fichier:** `goalSuggestionService.acceptSuggestion()`  
**Ligne:** 540  
**Condition:** Goal créé avec `requiredMonthlyContribution` depuis suggestion  
**Action requise:** Deadline déjà calculée ✅ (via `suggestion.deadline`)

---

#### ❌ TRIGGER 2: Mise à jour targetAmount
**Fichier:** `goalService.updateGoal()`  
**Ligne:** 301  
**Condition:** `goalData.targetAmount` modifié  
**Action requise:** Recalculer deadline si `requiredMonthlyContribution` existe

---

#### ❌ TRIGGER 3: Mise à jour requiredMonthlyContribution
**Fichier:** N/A (champ n'existe pas dans Goal interface)  
**Condition:** Si champ ajouté et modifié  
**Action requise:** Recalculer deadline avec nouvelle contribution

---

#### ⚠️ TRIGGER 4: Changement currentAmount significatif
**Fichier:** `savingsService.syncGoalWithAccount()`  
**Ligne:** 233  
**Condition:** `currentAmount` change de > 10%  
**Action requise:** Optionnel - recalculer deadline pour rester réaliste

---

#### ⚠️ TRIGGER 5: Liaison compte avec interestRate
**Fichier:** `savingsService.linkGoalToAccount()`  
**Ligne:** 119  
**Condition:** Compte lié a `interestRate > 0`  
**Action requise:** Optionnel - recalculer deadline avec intérêts composés

---

#### ⚠️ TRIGGER 6: Déliaison compte
**Fichier:** `savingsService.unlinkGoalFromAccount()`  
**Ligne:** 181  
**Condition:** Compte délié (perte d'intérêts)  
**Action requise:** Optionnel - recalculer deadline sans intérêts

---

## 6. CURRENT GAPS

### 6.1 Gap principal: requiredMonthlyContribution non persisté

**Problème:** `requiredMonthlyContribution` existe dans `GoalSuggestion` mais n'est pas stocké dans `Goal` après création.

**Preuve:**
- `GoalSuggestion` interface (types/suggestions.ts) a `requiredMonthlyContribution: number`
- `Goal` interface (types/index.ts) n'a PAS ce champ
- `acceptSuggestion()` crée goal sans `requiredMonthlyContribution` (ligne 531-537)

**Impact:** Impossible de recalculer deadline après création car contribution mensuelle perdue.

---

### 6.2 Gap: Deadline calculée dynamiquement mais non persistée

**Problème:** `calculateProjectionData()` recalcule deadline (lignes 731-749) mais ne la persiste pas.

**Preuve:**
- `calculateProjectionData()` recalcule `end` date si `monthlyContribution` fourni
- Mais retourne seulement données pour graphique
- `goal.deadline` dans IndexedDB reste inchangée

**Impact:** Deadline affichée dans UI (`getDaysRemaining`) ne correspond pas à `goal.deadline` stockée.

---

### 6.3 Gap: Pas de fonction utilitaire pour recalcul deadline

**Problème:** Logique de calcul deadline dispersée dans plusieurs fichiers.

**Preuve:**
- `calculateAdaptiveDeadline()` dans `goalSuggestionService.ts`
- `calculateProjectionData()` dans `goalService.ts`
- `getDaysRemaining()` dans `GoalsPage.tsx`

**Impact:** Code dupliqué, logique incohérente, difficile à maintenir.

---

### 6.4 Gap: Deadline non recalculée lors update targetAmount

**Problème:** Si utilisateur modifie `targetAmount` dans modal, deadline reste inchangée.

**Preuve:**
- `handleSaveGoal()` dans GoalsPage.tsx (ligne 506) appelle `updateGoal()` avec `goalData`
- `goalData.deadline` vient du formulaire (saisie manuelle)
- Pas de recalcul automatique basé sur `targetAmount` et contribution mensuelle

**Impact:** Deadline peut devenir irréaliste si `targetAmount` augmente.

---

## 7. RECOMMANDATIONS

### 7.1 Actions immédiates (Phase B)

#### ✅ ACTION 1: Ajouter `requiredMonthlyContribution` à Goal interface
**Fichier:** `frontend/src/types/index.ts`  
**Action:** Ajouter champ optionnel `requiredMonthlyContribution?: number`

---

#### ✅ ACTION 2: Persister `requiredMonthlyContribution` lors création
**Fichier:** `goalSuggestionService.acceptSuggestion()`  
**Ligne:** 531-537  
**Action:** Ajouter `requiredMonthlyContribution: suggestion.requiredMonthlyContribution` à `goalData`

---

#### ✅ ACTION 3: Créer fonction utilitaire `recalculateDeadline()`
**Fichier:** `goalService.ts`  
**Action:** Créer méthode publique:
```typescript
recalculateDeadline(
  goalId: string,
  monthlyContribution: number
): Promise<Goal>
```
- Utilise logique de `calculateAdaptiveDeadline()`
- Met à jour `goal.deadline` dans IndexedDB
- Sync Supabase si online

---

#### ✅ ACTION 4: Appeler `recalculateDeadline()` lors update targetAmount
**Fichier:** `goalService.updateGoal()`  
**Ligne:** 301  
**Action:** Si `goalData.targetAmount` modifié ET `requiredMonthlyContribution` existe, appeler `recalculateDeadline()`

---

#### ✅ ACTION 5: Appeler `recalculateDeadline()` lors sync goal
**Fichier:** `savingsService.syncGoalWithAccount()`  
**Ligne:** 233  
**Action:** Si `currentAmount` change significativement (> 10%), recalculer deadline

---

### 7.2 Actions futures (Phase C)

- Ajouter champ `requiredMonthlyContribution` dans formulaire modal
- Permettre modification contribution mensuelle avec recalcul automatique deadline
- Ajouter validation deadline réaliste (max 60 mois)
- Calculer deadline avec intérêts composés si compte a `interestRate`

---

## 8. FICHIERS À MODIFIER (Phase B)

1. ✅ `frontend/src/types/index.ts` - Ajouter `requiredMonthlyContribution` à Goal
2. ✅ `frontend/src/services/goalSuggestionService.ts` - Persister `requiredMonthlyContribution` dans `acceptSuggestion()`
3. ✅ `frontend/src/services/goalService.ts` - Créer `recalculateDeadline()` et appeler dans `updateGoal()`
4. ✅ `frontend/src/services/savingsService.ts` - Appeler `recalculateDeadline()` dans `syncGoalWithAccount()` si nécessaire
5. ✅ `frontend/src/lib/database.ts` - Ajouter index pour `requiredMonthlyContribution` si recherche nécessaire

---

## 9. TESTING CHECKLIST

- [ ] Créer goal depuis suggestion → vérifier `requiredMonthlyContribution` persisté
- [ ] Modifier `targetAmount` → vérifier deadline recalculée
- [ ] Sync goal avec compte → vérifier deadline reste cohérente
- [ ] Créer goal manuel → vérifier deadline saisie manuellement préservée
- [ ] Modifier goal sans `requiredMonthlyContribution` → vérifier deadline inchangée
- [ ] Vérifier sync IndexedDB ↔ Supabase pour `requiredMonthlyContribution`
- [ ] Vérifier `getDaysRemaining()` utilise deadline recalculée

---

**AGENT-1-GOAL-LIFECYCLE-COMPLETE**



