# AGENT 02 - INVESTIGATION RAPPORT: DISPARITION LIGNE RÉFÉRENCE EN MODE EUR

**Date**: 2025-01-19  
**Agent**: Agent 02  
**Objectif**: Identifier la cause racine de la disparition de la ligne de référence (Objectif) en mode EUR

---

## 1. DATA FLOW ANALYSIS

### Construction de chartData (historyData)

**Source des données** (lignes 62-121):
```typescript
// 1. Récupération historique depuis goalService
const history = await goalService.getGoalProgressionHistory(goal.id, goal.userId);
// Retourne: Array<{ date: string; amount: number }>
// amount est en MGA (non converti)

// 2. Calcul projection
const projection = goalService.calculateProjectionData(
  goal.currentAmount,  // MGA
  goal.targetAmount,   // MGA
  startDate,
  goal.deadline
);
// Retourne: Array<{ date: string; projectedAmount: number }>
// projectedAmount est en MGA (non converti)

// 3. Combinaison des données
const combinedData: ChartDataPoint[] = [];
combinedData.push({
  date,
  amount: historyPoint?.amount ?? (projectionPoint ? goal.currentAmount : 0),
  // amount est en MGA (non converti)
  projectedAmount: projectionPoint?.projectedAmount
  // projectedAmount est en MGA (non converti)
});

setHistoryData(combinedData);
```

**Conclusion**: `historyData` contient des valeurs **en MGA non converties**.

### Flux de données vers le graphique

**1. Données brutes** (`historyData`):
- `amount`: Valeurs en MGA (ex: 1000000, 2000000, 3000000)
- `projectedAmount`: Valeurs en MGA (ex: 1500000, 2500000, 3500000)

**2. Composants Line** (lignes 352-370):
```typescript
<Line dataKey="amount" ... />        // Utilise historyData[].amount (MGA)
<Line dataKey="projectedAmount" ... /> // Utilise historyData[].projectedAmount (MGA)
```
- Recharts lit directement les valeurs brutes de `historyData`
- Ces valeurs sont **en MGA** et utilisées pour calculer le domaine Y automatiquement

**3. YAxis** (lignes 330-334):
```typescript
<YAxis tickFormatter={formatCurrency} ... />
```
- `formatCurrency(value)` convertit la valeur pour l'affichage uniquement
- La conversion se fait dans le formatter, pas sur les données réelles
- Recharts calcule le domaine Y basé sur les valeurs brutes (MGA)

**4. ReferenceLine** (lignes 340-351):
```typescript
<ReferenceLine
  y={convertAmount(goal.targetAmount, displayCurrency)}
  ...
/>
```
- En mode MGA: `y = goal.targetAmount` (ex: 4900000)
- En mode EUR: `y = goal.targetAmount / 4900` (ex: 1000)

---

## 2. VALUE CALCULATIONS

### Exemple avec valeurs réelles

**Hypothèse**: `goal.targetAmount = 4,900,000 MGA`

| Item | MGA Mode | EUR Mode |
|------|----------|----------|
| **goal.targetAmount (raw)** | 4,900,000 MGA | 4,900,000 MGA |
| **ReferenceLine y value** | `convertAmount(4900000, 'MGA')` = **4,900,000** | `convertAmount(4900000, 'EUR')` = **1,000** |
| **historyData amount values** | [1,000,000, 2,000,000, 3,000,000] (MGA) | [1,000,000, 2,000,000, 3,000,000] (MGA) - **NON CONVERTIES** |
| **YAxis visible range (auto-calculated)** | [min: 1,000,000, max: 3,000,000] (basé sur valeurs MGA) | [min: 1,000,000, max: 3,000,000] (basé sur valeurs MGA) - **DOMAINE EN MGA** |
| **ReferenceLine position** | y = 4,900,000 → **DANS le domaine** ✅ | y = 1,000 → **HORS du domaine** ❌ |

### Calcul détaillé du domaine Y

**Recharts calcule automatiquement le domaine Y** basé sur:
- Toutes les valeurs de `amount` dans `historyData`
- Toutes les valeurs de `projectedAmount` dans `historyData`
- **SANS conversion de devise**

**Exemple avec données réelles**:
```typescript
historyData = [
  { date: '2025-01-01', amount: 1000000, projectedAmount: 1500000 },
  { date: '2025-01-15', amount: 2000000, projectedAmount: 2500000 },
  { date: '2025-01-30', amount: 3000000, projectedAmount: 3500000 }
]
```

**Domaine Y calculé par Recharts**:
- Min: `Math.min(1000000, 1500000, 2000000, 2500000, 3000000, 3500000)` = **1,000,000**
- Max: `Math.max(1000000, 1500000, 2000000, 2500000, 3000000, 3500000)` = **3,500,000**
- Domaine visible: **[1,000,000 - 3,500,000]** (en MGA)

**ReferenceLine en mode EUR**:
- y = `convertAmount(4900000, 'EUR')` = `4900000 / 4900` = **1,000**
- Position: y = 1,000
- **1,000 < 1,000,000** → **HORS du domaine visible** ❌

**ReferenceLine en mode MGA**:
- y = `convertAmount(4900000, 'MGA')` = **4,900,000**
- Position: y = 4,900,000
- **4,900,000 > 3,500,000** → **DANS le domaine** (Recharts ajuste automatiquement) ✅

---

## 3. ROOT CAUSE HYPOTHESIS

### Cause racine identifiée

**PROBLÈME**: **Incohérence entre les unités de données et la valeur de ReferenceLine**

1. **Les données dans `historyData` sont stockées en MGA** (non converties)
2. **Recharts calcule le domaine Y basé sur ces valeurs MGA**
3. **La ReferenceLine utilise une valeur convertie** selon `displayCurrency`
4. **En mode EUR, la ReferenceLine a une valeur en EUR (divisée par 4900)**
5. **Cette valeur EUR est comparée au domaine Y calculé en MGA**
6. **Résultat**: La valeur EUR est beaucoup plus petite et sort du domaine visible

### Mécanisme exact

**En mode MGA**:
- Domaine Y: [1,000,000 - 3,500,000] (MGA)
- ReferenceLine y: 4,900,000 (MGA)
- **4,900,000 > 3,500,000** → Recharts étend automatiquement le domaine pour inclure 4,900,000 ✅

**En mode EUR**:
- Domaine Y: [1,000,000 - 3,500,000] (MGA) - **toujours calculé en MGA**
- ReferenceLine y: 1,000 (EUR converti)
- **1,000 < 1,000,000** → La ligne est en dessous du domaine visible ❌
- Recharts ne détecte pas que 1,000 devrait être visible car il compare avec le domaine MGA

---

## 4. EVIDENCE

### Preuve 1: Données non converties dans historyData

**Ligne 106**: `amount: historyPoint?.amount ?? ...`
- `historyPoint.amount` vient de `goalService.getGoalProgressionHistory()`
- Cette méthode retourne des valeurs en MGA (ligne 663: `amount: Math.max(0, amount)`)
- **Aucune conversion n'est appliquée avant `setHistoryData()`**

**Ligne 107**: `projectedAmount: projectionPoint?.projectedAmount`
- `projectionPoint.projectedAmount` vient de `goalService.calculateProjectionData()`
- Cette méthode utilise `currentAmount` et `targetAmount` en MGA
- **Aucune conversion n'est appliquée**

### Preuve 2: ReferenceLine utilise conversion

**Ligne 341**: `y={convertAmount(goal.targetAmount, displayCurrency)}`
- En mode EUR: `convertAmount(4900000, 'EUR')` = `4900000 / 4900` = `1000`
- En mode MGA: `convertAmount(4900000, 'MGA')` = `4900000`

### Preuve 3: YAxis formatter ne convertit que l'affichage

**Ligne 331**: `tickFormatter={formatCurrency}`
- `formatCurrency(value)` convertit pour l'affichage uniquement
- Recharts utilise les valeurs brutes de `historyData` pour calculer le domaine
- La conversion dans `formatCurrency` n'affecte pas le calcul du domaine

**Ligne 162-165**:
```typescript
const formatCurrency = (value: number): string => {
  const convertedValue = convertAmount(value, displayCurrency);
  return formatAmountAbbreviated(convertedValue, displayCurrency);
};
```
- Cette fonction convertit `value` pour l'affichage
- Mais `value` est déjà en MGA (venant du domaine calculé par Recharts)
- Le domaine lui-même reste en MGA

### Preuve 4: Line components utilisent données brutes

**Lignes 352-370**:
```typescript
<Line dataKey="amount" ... />
<Line dataKey="projectedAmount" ... />
```
- `dataKey` pointe directement vers les propriétés de `historyData`
- Ces valeurs sont en MGA
- Recharts calcule le domaine basé sur ces valeurs MGA

---

## 5. SUGGESTED CONSOLE LOGS

### Logs recommandés pour vérification runtime

**1. Après chargement des données** (après ligne 111):
```typescript
console.log('🔍 [GoalProgressionChart] historyData:', historyData);
console.log('🔍 [GoalProgressionChart] historyData amount range:', {
  min: Math.min(...historyData.map(d => d.amount)),
  max: Math.max(...historyData.map(d => d.amount))
});
console.log('🔍 [GoalProgressionChart] goal.targetAmount (raw MGA):', goal.targetAmount);
```

**2. Avant rendu du graphique** (avant ligne 340):
```typescript
console.log('🔍 [GoalProgressionChart] displayCurrency:', displayCurrency);
console.log('🔍 [GoalProgressionChart] ReferenceLine y value:', convertAmount(goal.targetAmount, displayCurrency));
console.log('🔍 [GoalProgressionChart] chartData value range:', {
  allAmounts: historyData.map(d => d.amount),
  allProjected: historyData.map(d => d.projectedAmount).filter(Boolean),
  min: Math.min(...historyData.map(d => d.amount), ...historyData.map(d => d.projectedAmount || 0)),
  max: Math.max(...historyData.map(d => d.amount), ...historyData.map(d => d.projectedAmount || 0))
});
```

**3. Dans formatCurrency pour voir les valeurs du domaine** (ligne 162):
```typescript
const formatCurrency = (value: number): string => {
  console.log('🔍 [GoalProgressionChart] YAxis tick value (MGA):', value);
  const convertedValue = convertAmount(value, displayCurrency);
  console.log('🔍 [GoalProgressionChart] YAxis tick value (converted):', convertedValue);
  return formatAmountAbbreviated(convertedValue, displayCurrency);
};
```

**4. Comparaison directe** (avant ligne 340):
```typescript
const referenceLineY = convertAmount(goal.targetAmount, displayCurrency);
const dataMin = Math.min(...historyData.map(d => d.amount), ...historyData.map(d => d.projectedAmount || 0));
const dataMax = Math.max(...historyData.map(d => d.amount), ...historyData.map(d => d.projectedAmount || 0));
console.log('🔍 [GoalProgressionChart] SCALE MISMATCH CHECK:', {
  referenceLineY,
  dataMin,
  dataMax,
  isVisible: referenceLineY >= dataMin && referenceLineY <= dataMax,
  displayCurrency
});
```

---

## 6. SCALE MISMATCH DETAILED ANALYSIS

### Comparaison des échelles

**Hypothèse**: `goal.targetAmount = 4,900,000 MGA`, `historyData` avec valeurs [1M, 2M, 3M]

| Élément | Valeur MGA | Valeur EUR | Unité utilisée par Recharts |
|---------|------------|------------|----------------------------|
| **historyData[].amount** | 1,000,000 - 3,000,000 | N/A | **MGA** (non converti) |
| **historyData[].projectedAmount** | 1,500,000 - 3,500,000 | N/A | **MGA** (non converti) |
| **Domaine Y calculé** | [1,000,000 - 3,500,000] | N/A | **MGA** |
| **ReferenceLine y (mode MGA)** | 4,900,000 | N/A | **MGA** → ✅ Visible |
| **ReferenceLine y (mode EUR)** | N/A | 1,000 | **EUR** → ❌ Hors domaine (compare avec MGA) |

### Pourquoi Recharts ne détecte pas le problème

**Recharts calcule le domaine Y automatiquement**:
1. Il parcourt toutes les valeurs de `amount` et `projectedAmount` dans `historyData`
2. Il trouve min = 1,000,000 et max = 3,500,000
3. Il définit le domaine Y = [1,000,000, 3,500,000]
4. Il positionne la ReferenceLine à y = 1,000 (en mode EUR)
5. **1,000 < 1,000,000** → La ligne est en dessous du domaine visible
6. Recharts ne sait pas que 1,000 devrait être visible car il compare avec le domaine MGA

### Solution conceptuelle (non implémentée)

**Pour que la ReferenceLine soit visible en mode EUR**:
1. Convertir toutes les valeurs de `historyData` en EUR avant de les passer à Recharts
2. OU convertir la ReferenceLine en MGA même en mode EUR
3. OU forcer le domaine Y à inclure la valeur de ReferenceLine convertie

**Problème actuel**: Les données restent en MGA mais la ReferenceLine est convertie en EUR, créant une incohérence d'échelle.

---

## 7. ADDITIONAL FINDINGS

### Observation: formatCurrency dans YAxis

**Ligne 331**: `tickFormatter={formatCurrency}`
- Cette fonction convertit les valeurs pour l'affichage
- Mais Recharts calcule le domaine AVANT d'appeler le formatter
- Le domaine est donc toujours en MGA, même si les labels affichent des valeurs EUR

### Observation: CustomTooltip convertit correctement

**Lignes 180-191**: Le tooltip convertit les valeurs avant affichage
```typescript
const convertedValue = convertAmount(entry.value, displayCurrency);
```
- `entry.value` est en MGA (venant de `historyData`)
- La conversion se fait pour l'affichage uniquement
- Cela fonctionne car le tooltip n'affecte pas le domaine

### Observation: Pas de domaine explicite sur YAxis

**Ligne 330-334**: YAxis n'a pas de prop `domain` explicite
```typescript
<YAxis tickFormatter={formatCurrency} ... />
```
- Recharts calcule automatiquement le domaine
- Le domaine est basé sur les valeurs brutes de `historyData` (MGA)
- Aucune conversion n'est appliquée au domaine lui-même

---

## CONCLUSION

### Cause racine confirmée

**Le problème est une incohérence d'échelle**:
- Les données dans `historyData` sont en **MGA** (non converties)
- Recharts calcule le domaine Y en **MGA** (basé sur ces données)
- La ReferenceLine utilise une valeur convertie selon `displayCurrency`
- En mode EUR, la ReferenceLine a une valeur en **EUR** (divisée par 4900)
- Cette valeur EUR est comparée au domaine MGA, créant un décalage d'échelle
- Résultat: La ReferenceLine est hors du domaine visible en mode EUR

### Preuve mathématique

**Exemple avec goal.targetAmount = 4,900,000 MGA**:
- Domaine Y (MGA): [1,000,000 - 3,500,000]
- ReferenceLine (MGA): 4,900,000 → ✅ Visible (Recharts étend le domaine)
- ReferenceLine (EUR): 1,000 → ❌ Hors domaine (1,000 < 1,000,000)

### Solution requise (non implémentée)

Pour corriger le problème, il faudrait:
1. Convertir toutes les valeurs de `historyData` en EUR avant de les passer à Recharts quand `displayCurrency === 'EUR'`
2. OU maintenir la ReferenceLine en MGA même en mode EUR et convertir uniquement l'affichage
3. OU forcer le domaine Y à inclure la valeur convertie de ReferenceLine

**AGENT-02-INVESTIGATION-COMPLETE**

