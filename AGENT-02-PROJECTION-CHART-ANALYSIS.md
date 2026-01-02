# AGENT 02 - ANALYSE GRAPHIQUE PROJECTION ÉVOLUTION ÉPARGNE

**Date**: 2025-01-19  
**Agent**: Agent 02  
**Objectif**: Analyser pourquoi le graphique d'évolution montre une date cible de janvier 2031 (~60 mois) alors qu'un montant mensuel suggéré de 775,393 Ar indiquerait ~12 mois

---

## 1. CHART COMPONENT

### Fichier exact

**Chemin**: `frontend/src/components/Goals/GoalProgressionChart.tsx`  
**Composant**: `GoalProgressionChart`  
**Lignes**: 1-393

### Utilisation dans GoalsPage.tsx

**Ligne 1154**: Le graphique est rendu conditionnellement:
```typescript
{selectedGoalForChart ? (
  <GoalProgressionChart goal={selectedGoalForChart} />
) : (
  // Message de sélection
)}
```

**Section**: "Évolution de l'épargne" (ligne 1131-1163)

### Props reçues

**Interface**: `GoalProgressionChartProps` (lignes 20-23)
```typescript
interface GoalProgressionChartProps {
  goal: Goal;
  className?: string;
}
```

**Props utilisées**:
- `goal`: Objet Goal complet avec `currentAmount`, `targetAmount`, `deadline`, `linkedAccountId`, etc.

---

## 2. PROJECTION LOGIC

### Calcul de la projection

**Ligne 79-84**: Appel à `goalService.calculateProjectionData()`:
```typescript
const projection = goalService.calculateProjectionData(
  goal.currentAmount,
  goal.targetAmount,
  startDate,
  goal.deadline instanceof Date ? goal.deadline : new Date(goal.deadline)
);
```

**Paramètres**:
- `currentAmount`: Montant actuel du goal
- `targetAmount`: Montant cible du goal
- `startDate`: Date de début (première transaction ou aujourd'hui)
- `deadline`: **Date limite du goal** (utilisée pour calculer la projection)

### Logique dans goalService.calculateProjectionData()

**Fichier**: `frontend/src/services/goalService.ts`  
**Lignes**: 706-794

**Algorithme** (lignes 742-782):

1. **Calcul de la différence de jours**:
```typescript
const daysDiff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
```
- `end` = `goal.deadline` (date limite)
- `today` = date actuelle
- Calcule le nombre de jours jusqu'à la deadline

2. **Calcul du montant à épargner**:
```typescript
const amountToSave = targetAmount - currentAmount;
```

3. **Calcul de l'incrément quotidien**:
```typescript
const dailyIncrement = amountToSave / daysDiff;
```

4. **Calcul de l'incrément mensuel** (si > 30 jours):
```typescript
const monthsDiff = Math.ceil(daysDiff / 30);
const monthlyIncrement = amountToSave / monthsDiff;
```

5. **Génération des points de projection**:
```typescript
for (let i = 1; i < monthsDiff; i++) {
  const intermediateDate = new Date(today);
  intermediateDate.setMonth(intermediateDate.getMonth() + i);
  
  const projectedAmount = currentAmount + (monthlyIncrement * i);
  projectionData.push({
    date: intermediateDate.toISOString().split('T')[0],
    projectedAmount: Math.min(projectedAmount, targetAmount)
  });
}
```

**Point final**:
```typescript
projectionData.push({
  date: deadlineStr, // goal.deadline
  projectedAmount: targetAmount
});
```

### Problème identifié

**La projection est calculée uniquement basée sur `goal.deadline`**, pas sur un montant mensuel suggéré.

**Exemple**:
- `goal.deadline` = janvier 2031 (~60 mois)
- `amountToSave` = 9,304,716 Ar (targetAmount - currentAmount)
- `monthsDiff` = 60 mois
- `monthlyIncrement` = 9,304,716 / 60 = **155,078 Ar/mois**

**Mais si le montant mensuel suggéré est 775,393 Ar**:
- Temps nécessaire = 9,304,716 / 775,393 = **~12 mois**
- La projection devrait aller jusqu'à janvier 2026, pas janvier 2031

---

## 3. TARGET DATE SOURCE

### Source de la date cible (2031)

**Source**: `goal.deadline` (propriété du Goal)

**Où est définie**:
- Lors de la création du goal (utilisateur définit la deadline)
- Lors de l'acceptation d'une suggestion (deadline calculée par `goalSuggestionService`)

**Utilisation dans le graphique**:
- **Ligne 83**: `goal.deadline` est passé à `calculateProjectionData()`
- **Ligne 716**: `const end = new Date(deadline);` - utilisé comme date finale
- **Ligne 777-780**: Le point final de la projection utilise `goal.deadline`

**Pas de recalcul**: La date limite n'est jamais recalculée basée sur un montant mensuel suggéré

---

## 4. MONTHLY AMOUNT USAGE

### Montant mensuel suggéré dans GoalsPage.tsx

**Ligne 304-306**: Calcul du montant mensuel suggéré:
```typescript
// Calculate suggested amount (monthly contribution)
// Use targetAmount / 12 as default monthly contribution
const suggestedAmount = Math.round(goal.targetAmount / 12);
```

**Utilisation**: Utilisé uniquement pour la navigation vers la page de transfert (ligne 311)

**Pas utilisé dans le graphique**: Ce montant n'est jamais passé au graphique ou utilisé pour recalculer la projection

### Montant mensuel dans les suggestions

**Dans `goalSuggestionService.ts`**: Les suggestions incluent `requiredMonthlyContribution`:
```typescript
requiredMonthlyContribution: Math.round(monthlyContribution)
```

**Affichage**: Ligne 766 dans GoalsPage.tsx:
```typescript
{new Intl.NumberFormat('fr-FR').format(suggestion.requiredMonthlyContribution)} Ar
```

**Pas utilisé pour la projection**: Ce montant n'est pas stocké dans le Goal et n'est pas utilisé pour calculer la projection

---

## 5. DATA PROPS

### Props reçues par GoalProgressionChart

**Props**: `{ goal: Goal }`

**Champs du Goal utilisés**:
- `goal.id`: Pour récupérer l'historique
- `goal.userId`: Pour récupérer l'historique
- `goal.linkedAccountId`: Vérification si compte lié
- `goal.currentAmount`: Montant actuel (ligne 80)
- `goal.targetAmount`: Montant cible (ligne 81)
- `goal.deadline`: **Date limite utilisée pour la projection** (ligne 83)

**Champs NON utilisés**:
- ❌ Aucun champ pour montant mensuel suggéré
- ❌ Aucun champ pour contribution mensuelle requise
- ❌ Aucun prop pour override la date limite

### Données calculées dans le composant

**historyData** (ligne 33): Tableau de `ChartDataPoint[]`
```typescript
interface ChartDataPoint {
  date: string;
  amount: number;
  projectedAmount?: number;
}
```

**Sources**:
- `amount`: Depuis `goalService.getGoalProgressionHistory()` (historique réel)
- `projectedAmount`: Depuis `goalService.calculateProjectionData()` (projection basée sur deadline)

---

## 6. IDENTIFIED BUG

### Bug principal: Incohérence entre montant mensuel suggéré et date limite

**Problème**:
1. Le graphique calcule la projection basée uniquement sur `goal.deadline`
2. Le montant mensuel suggéré (775,393 Ar) n'est pas utilisé pour la projection
3. Si le montant mensuel suggéré indique 12 mois mais la deadline est à 60 mois, la projection sera incorrecte

**Exemple concret**:
- Goal avec `targetAmount` = 9,304,716 Ar
- `currentAmount` = 0 Ar (hypothétique)
- `deadline` = janvier 2031 (~60 mois)
- Montant mensuel suggéré = 775,393 Ar

**Calcul actuel**:
- `amountToSave` = 9,304,716 Ar
- `monthsDiff` = 60 mois
- `monthlyIncrement` = 9,304,716 / 60 = **155,078 Ar/mois**
- Projection jusqu'à janvier 2031

**Calcul attendu avec montant mensuel suggéré**:
- `amountToSave` = 9,304,716 Ar
- `monthlyContribution` = 775,393 Ar
- `monthsNeeded` = 9,304,716 / 775,393 = **~12 mois**
- Projection jusqu'à janvier 2026

### Pourquoi le bug existe

**1. Séparation des responsabilités**:
- Le montant mensuel suggéré est calculé dans GoalsPage.tsx pour la navigation
- La projection est calculée dans goalService.ts basée uniquement sur deadline
- Aucun lien entre les deux

**2. Goal.deadline est fixe**:
- Une fois définie, la deadline ne change pas
- Aucun mécanisme pour recalculer la deadline basée sur un montant mensuel

**3. Pas de prop pour override**:
- GoalProgressionChart ne reçoit pas de montant mensuel suggéré
- `calculateProjectionData()` ne prend pas de montant mensuel en paramètre

### Impact utilisateur

**Confusion**:
- L'utilisateur voit un montant mensuel suggéré de 775,393 Ar
- Le graphique montre une projection jusqu'à janvier 2031
- L'utilisateur s'attend à voir la projection jusqu'à ~12 mois avec ce montant mensuel

**Incohérence visuelle**:
- La ligne de projection va jusqu'à janvier 2031
- Mais avec le montant mensuel suggéré, l'objectif serait atteint en ~12 mois
- L'utilisateur ne comprend pas pourquoi la projection est si longue

---

## 7. ROOT CAUSE ANALYSIS

### Cause racine

**Le graphique utilise `goal.deadline` comme source unique de vérité pour la date finale de projection**, sans tenir compte d'un montant mensuel suggéré ou requis.

**Architecture actuelle**:
```
Goal.deadline (fixe)
    ↓
calculateProjectionData(deadline)
    ↓
Projection jusqu'à deadline
```

**Architecture attendue**:
```
Goal.deadline OU monthlyContribution
    ↓
calculateProjectionData(deadline OU monthlyContribution)
    ↓
Projection jusqu'à deadline OU jusqu'à date calculée
```

### Pourquoi deadline est utilisée

**Ligne 698-704** dans goalService.ts:
```typescript
/**
 * Calculer les données de projection pour un objectif
 * Calcule la progression linéaire depuis l'état actuel jusqu'à l'objectif à la date limite
 * 
 * @param deadline - Date limite
 */
```

**Commentaire**: "Calcule la progression linéaire depuis l'état actuel jusqu'à l'objectif **à la date limite**"

**Intention originale**: La projection montre comment atteindre l'objectif **à la date limite définie**, pas comment atteindre l'objectif avec un montant mensuel spécifique.

### Conflit de logique métier

**Deux logiques différentes**:
1. **Logique basée sur deadline**: "Je veux atteindre l'objectif à cette date → combien dois-je épargner par mois?"
2. **Logique basée sur montant mensuel**: "Je peux épargner X par mois → quand atteindrai-je l'objectif?"

**Problème**: Le système utilise uniquement la logique #1, mais affiche aussi un montant mensuel suggéré qui correspond à la logique #2.

---

## 8. SOLUTION CONCEPTUELLE

### Option 1: Utiliser montant mensuel suggéré pour projection

**Modification requise**:
- Passer `monthlyContribution` à `calculateProjectionData()`
- Si `monthlyContribution` est fourni, calculer la date finale basée sur ce montant
- Utiliser cette date calculée au lieu de `deadline` pour la projection

**Code conceptuel**:
```typescript
calculateProjectionData(
  currentAmount: number,
  targetAmount: number,
  startDate: string,
  deadline: Date,
  monthlyContribution?: number // NOUVEAU
): Array<{ date: string; projectedAmount: number }> {
  let endDate = deadline;
  
  // Si monthlyContribution fourni, calculer date finale
  if (monthlyContribution && monthlyContribution > 0) {
    const amountToSave = targetAmount - currentAmount;
    const monthsNeeded = Math.ceil(amountToSave / monthlyContribution);
    endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + monthsNeeded);
  }
  
  // Utiliser endDate pour projection
  // ...
}
```

### Option 2: Afficher deux projections

**Modification requise**:
- Projection basée sur deadline (ligne actuelle)
- Projection basée sur montant mensuel suggéré (nouvelle ligne)

**Avantage**: Montre les deux scénarios à l'utilisateur

### Option 3: Recalculer deadline basée sur montant mensuel

**Modification requise**:
- Quand un montant mensuel suggéré est affiché, recalculer la deadline du goal
- Mettre à jour `goal.deadline` avec la date calculée

**Inconvénient**: Modifie les données du goal, peut ne pas être souhaité

---

## CONCLUSION

### Résumé du problème

**Bug identifié**: Le graphique d'évolution calcule la projection basée uniquement sur `goal.deadline`, ignorant le montant mensuel suggéré de 775,393 Ar.

**Cause racine**: 
- `calculateProjectionData()` utilise uniquement `deadline` comme paramètre
- Aucun mécanisme pour utiliser un montant mensuel suggéré
- Le montant mensuel suggéré est calculé mais jamais utilisé pour la projection

**Impact**:
- Projection jusqu'à janvier 2031 (~60 mois) au lieu de ~12 mois
- Incohérence entre montant mensuel suggéré et projection affichée
- Confusion pour l'utilisateur

**Solution recommandée**: Modifier `calculateProjectionData()` pour accepter un paramètre `monthlyContribution` optionnel et calculer la date finale basée sur ce montant si fourni.

**AGENT-02-PROJECTION-CHART-COMPLETE**

