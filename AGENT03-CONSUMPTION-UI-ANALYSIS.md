# AGENT03 - ANALYSE UI PLANS DE CONSOMMATION
## ConsumptionPlanCard.tsx et Intégration Dashboard

**Date:** 2025-11-23  
**Agent:** Agent 03 - Consumption Plan UI Analysis  
**Objectif:** Analyser l'UI existante pour les plans de consommation et identifier les gaps

---

## 1. EXISTING COMPONENTS

### 1.1 ConsumptionPlanCard.tsx

**Fichier:** `frontend/src/modules/construction-poc/components/ConsumptionPlanCard.tsx`

**Statut:** ✅ **EXISTE** - Composant complet et fonctionnel

**Fonctionnalités:**
- ✅ Affiche carte avec métriques consommation vs planifiée
- ✅ Barre de progression avec couleurs (vert/jaune/orange/rouge)
- ✅ Affichage période (month/quarter/year)
- ✅ Badge alerte si `alertTriggered === true`
- ✅ Message d'alerte personnalisé
- ✅ Support clic pour voir détails (`onViewDetails` callback)
- ✅ Accessibilité (ARIA labels, keyboard navigation)

**Props:**
```typescript
interface ConsumptionPlanCardProps {
  plan: ConsumptionSummary;
  onViewDetails?: () => void;
  className?: string;
}
```

**Type ConsumptionSummary (local):**
```typescript
interface ConsumptionSummary {
  id: string;
  productId: string;
  productName: string;
  plannedQuantity: number;
  actualQuantity: number;
  period: 'month' | 'quarter' | 'year';  // ⚠️ Format différent du service
  periodLabel?: string;
  alertTriggered?: boolean;
  alertMessage?: string;
  unit?: string;
}
```

**Note:** ⚠️ Type local différent du type service (`monthly` vs `month`)

### 1.2 POCDashboard.tsx

**Fichier:** `frontend/src/modules/construction-poc/components/POCDashboard.tsx`

**Statut:** ✅ **INTÉGRÉ** - Section consommation plans présente

**Intégration:**
- ✅ Import `ConsumptionPlanCard` (ligne 26)
- ✅ Import `pocConsumptionPlanService` (ligne 25)
- ✅ État `consumptionSummary` (ligne 82)
- ✅ État `loadingConsumption` (ligne 84)
- ✅ Fonction `loadConsumptionSummary()` (lignes 361-408)
- ✅ Affichage section "Plans de consommation - Ce mois" (lignes 838-878)

**Affichage:**
- ✅ Grid responsive (1/2/3 colonnes selon écran)
- ✅ Loading state
- ✅ Empty state ("Aucun plan de consommation configuré")
- ✅ Bouton "Voir tous les plans" (placeholder avec `alert()`)

### 1.3 PurchaseOrderForm.tsx

**Fichier:** `frontend/src/modules/construction-poc/components/PurchaseOrderForm.tsx`

**Statut:** ⚠️ **IMPORTÉ MAIS NON AFFICHÉ**

**Intégration partielle:**
- ✅ Import `ConsumptionPlanCard` (ligne 19)
- ✅ Import `pocConsumptionPlanService` (ligne 15)
- ✅ Import type `ConsumptionSummary` (ligne 17)
- ✅ État `consumptionPlans` (ligne 169)
- ✅ Fonction `loadConsumptionPlans()` (lignes 492-555)
- ❌ **AUCUN AFFICHAGE** de `ConsumptionPlanCard` dans le JSX

**Note:** Les plans sont chargés mais jamais affichés dans le formulaire

### 1.4 OrderDetailPage.tsx

**Fichier:** `frontend/src/modules/construction-poc/components/OrderDetailPage.tsx`

**Statut:** ✅ **AFFICHÉ** - Section impact consommation présente

**Intégration:**
- ✅ Import `pocConsumptionPlanService` (ligne 32)
- ✅ Import type `ConsumptionSummary` (ligne 32)
- ✅ État `consumptionImpact` (ligne 138)
- ✅ Fonction `loadConsumptionImpact()` (lignes 191-294)
- ✅ Affichage section "Impact sur les plans de consommation" (lignes 998-1084)

**Affichage:**
- ✅ Liste des plans impactés par la commande
- ✅ Badge alerte si dépassement
- ✅ Barre de progression pourcentage utilisé
- ✅ Affichage contribution commande vs consommation actuelle
- ✅ Empty state si aucun impact

**Note:** Utilise un affichage custom (pas `ConsumptionPlanCard`)

---

## 2. PERIOD DISPLAY

### 2.1 Dans ConsumptionPlanCard

**Affichage période (lignes 153-158):**
```typescript
<div className="mb-3">
  <span className="text-xs text-gray-500 font-medium">
    {getPeriodLabel(plan.period, plan.periodLabel)}
  </span>
</div>
```

**Fonction getPeriodLabel (lignes 41-50):**
```typescript
const getPeriodLabel = (period: string, customLabel?: string): string => {
  if (customLabel) return customLabel;
  
  const labels: Record<string, string> = {
    month: 'Ce mois',
    quarter: 'Ce trimestre',
    year: 'Cette année'
  };
  return labels[period] || period;
};
```

**Format affiché:**
- ✅ Texte simple ("Ce mois", "Ce trimestre", "Cette année")
- ✅ Pas de dropdown ni radio buttons
- ✅ Affichage statique (lecture seule)

**Conclusion:** ✅ **Affichage texte simple** - Pas de sélection période dans la carte

### 2.2 Dans Service

**Type service (pocConsumptionPlanService.ts ligne 21):**
```typescript
plannedPeriod: 'monthly' | 'quarterly' | 'yearly';
```

**Mapping Dashboard (POCDashboard.tsx lignes 383-384):**
```typescript
period: summary.period === 'monthly' ? 'month' : summary.period === 'quarterly' ? 'quarter' : 'year',
periodLabel: summary.period === 'monthly' ? 'Ce mois' : summary.period === 'quarterly' ? 'Ce trimestre' : 'Cette année',
```

**Conclusion:** ⚠️ **Conversion nécessaire** - Service utilise `monthly/quarterly/yearly`, Card attend `month/quarter/year`

### 2.3 Dans Base de Données

**Colonne:** `planned_period` (TEXT)

**Valeurs possibles:** `'monthly' | 'quarterly' | 'yearly'`

**Note:** Pas de valeur `daily` ou `weekly` dans le schéma actuel

**Conclusion:** ✅ **3 périodes supportées** - monthly, quarterly, yearly (pas daily/weekly)

---

## 3. CREATE FORM

### 3.1 Formulaire de Création

**Statut:** ❌ **N'EXISTE PAS** - Aucun composant UI pour créer des plans

**Service disponible:**
- ✅ `pocConsumptionPlanService.createPlan()` (lignes 185-353)
- ✅ Interface `ConsumptionPlanCreate` définie (lignes 31-39)
- ✅ Validation complète dans service
- ❌ **Aucun formulaire UI** pour appeler ce service

**Champs requis pour création:**
```typescript
interface ConsumptionPlanCreate {
  companyId: string;                    // ✅ Disponible depuis context
  orgUnitId?: string;                  // ⚠️ Nécessite sélecteur org_unit
  projectId?: string;                  // ⚠️ Nécessite sélecteur projet
  productId: string;                   // ⚠️ Nécessite sélecteur produit
  plannedQuantity: number;             // ⚠️ Input nombre
  plannedPeriod: 'monthly' | 'quarterly' | 'yearly';  // ⚠️ Nécessite dropdown/radio
  alertThresholdPercentage?: number;   // ⚠️ Input nombre (défaut 80%)
}
```

**Conclusion:** ❌ **Formulaire manquant** - Service backend prêt, UI manquante

### 3.2 Sélection Période dans Service

**Validation service (lignes 229-234):**
```typescript
if (!planData.plannedPeriod) {
  return {
    success: false,
    error: 'La période de planification est requise'
  };
}
```

**Valeurs acceptées:** `'monthly' | 'quarterly' | 'yearly'`

**Conclusion:** ✅ **Validation présente** - Service valide la période

---

## 4. LIST VIEW

### 4.1 Liste dans Dashboard

**Statut:** ✅ **PARTIELLEMENT PRÉSENTE** - Grid de cartes dans Dashboard

**Affichage (POCDashboard.tsx lignes 850-862):**
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {consumptionSummary.map((plan) => (
    <ConsumptionPlanCard
      key={plan.id}
      plan={plan}
      onViewDetails={() => {
        alert(`Détails du plan ${plan.productName} à venir`);
      }}
    />
  ))}
</div>
```

**Limitations:**
- ⚠️ Affiche seulement période `monthly` (ligne 372)
- ⚠️ Pas de filtres (orgUnitId, projectId, productId)
- ⚠️ Pas de pagination
- ⚠️ Pas de tri
- ⚠️ Bouton "Voir tous les plans" non fonctionnel (alert placeholder)

**Conclusion:** ✅ **Liste basique présente** - Grid de cartes, mais limitée

### 4.2 Page Dédiée Liste Plans

**Statut:** ❌ **N'EXISTE PAS** - Pas de page dédiée

**Bouton Dashboard (lignes 864-872):**
```typescript
<button
  onClick={() => {
    alert('Page des plans de consommation à venir');
  }}
  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
>
  Voir tous les plans →
</button>
```

**Conclusion:** ❌ **Page manquante** - Bouton placeholder présent

### 4.3 Liste dans PurchaseOrderForm

**Statut:** ❌ **NON AFFICHÉE** - Plans chargés mais jamais rendus

**Code chargement (lignes 492-555):**
- ✅ Charge plans pour produits du panier
- ✅ Filtre selon orderType (BCI/BCE)
- ✅ Charge monthly, quarterly, yearly
- ❌ **Aucun rendu JSX** pour afficher ces plans

**Conclusion:** ❌ **Affichage manquant** - Données chargées mais non utilisées

---

## 5. DASHBOARD INTEGRATION

### 5.1 Section Dashboard

**Localisation:** `POCDashboard.tsx` lignes 838-878

**Structure:**
```typescript
<div className="bg-white rounded-lg shadow-md p-6">
  <div className="flex items-center gap-2 mb-4">
    <TrendingUp className="w-6 h-6 text-gray-700" />
    <h2 className="text-xl font-semibold text-gray-900">
      Plans de consommation - Ce mois
    </h2>
  </div>
  {/* Loading state */}
  {/* Grid de ConsumptionPlanCard */}
  {/* Bouton "Voir tous les plans" */}
</div>
```

**Fonctionnalités:**
- ✅ Chargement automatique au mount
- ✅ Loading state
- ✅ Empty state
- ✅ Grid responsive
- ⚠️ Période hardcodée à `monthly`
- ⚠️ Pas de sélecteur période
- ⚠️ Bouton "Voir tous" non fonctionnel

**Conclusion:** ✅ **Intégration basique** - Section présente mais limitée

### 5.2 Chargement Données

**Fonction loadConsumptionSummary (lignes 361-408):**

**Code:**
```typescript
const result = await pocConsumptionPlanService.getConsumptionSummary(
  activeCompany.id,
  'monthly'  // ⚠️ Hardcodé
);
```

**Adaptation données (lignes 377-390):**
```typescript
const adapted: CardConsumptionSummary[] = result.data.map((summary: ServiceConsumptionSummary) => ({
  id: summary.planId,
  productId: summary.productId,
  productName: summary.productName,
  plannedQuantity: summary.plannedQuantity,
  actualQuantity: summary.actualQuantity,
  period: summary.period === 'monthly' ? 'month' : summary.period === 'quarterly' ? 'quarter' : 'year',
  periodLabel: summary.period === 'monthly' ? 'Ce mois' : summary.period === 'quarterly' ? 'Ce trimestre' : 'Cette année',
  alertTriggered: summary.alertTriggered,
  alertMessage: summary.alertTriggered 
    ? `Alerte: ${Math.round(summary.percentageUsed)}% de la quantité planifiée consommée`
    : undefined,
  unit: 'unité' // ⚠️ Par défaut, peut être amélioré
}));
```

**Conclusion:** ✅ **Chargement fonctionnel** - Adaptation données service → card

---

## 6. UI GAPS

### 6.1 Gaps Critiques (P0)

**1. Formulaire Création Plan**
- ❌ **MANQUANT** - Aucun formulaire pour créer des plans
- **Champs nécessaires:**
  - Sélecteur produit (dropdown avec recherche)
  - Sélecteur org_unit OU projet (radio + dropdown conditionnel)
  - Input quantité planifiée (number)
  - Sélecteur période (dropdown: monthly/quarterly/yearly)
  - Input seuil alerte (number, défaut 80%)
- **Priorité:** P0 - Bloque création plans

**2. Page Liste Plans Dédiée**
- ❌ **MANQUANTE** - Pas de page pour voir tous les plans
- **Fonctionnalités nécessaires:**
  - Liste complète avec filtres (orgUnitId, projectId, productId, period)
  - Pagination
  - Tri (date création, quantité, période)
  - Actions (voir détails, modifier, supprimer)
- **Priorité:** P0 - Bouton Dashboard pointe vers rien

**3. Affichage Plans dans PurchaseOrderForm**
- ❌ **MANQUANT** - Plans chargés mais jamais affichés
- **Localisation suggérée:** Section collapsible après items
- **Affichage:** Grid de `ConsumptionPlanCard` pour produits du panier
- **Priorité:** P0 - Données chargées inutilement

### 6.2 Gaps Importants (P1)

**4. Sélecteur Période Dashboard**
- ⚠️ **MANQUANT** - Période hardcodée à `monthly`
- **Solution:** Ajouter dropdown/radio pour sélectionner monthly/quarterly/yearly
- **Impact:** Permet voir plans trimestriels/annuels
- **Priorité:** P1 - Améliore UX Dashboard

**5. Formulaire Modification Plan**
- ❌ **MANQUANT** - Service `updatePlan()` existe mais pas d'UI
- **Champs modifiables:**
  - Quantité planifiée
  - Période
  - Seuil alerte
- **Priorité:** P1 - Permet ajuster plans existants

**6. Page Détails Plan**
- ❌ **MANQUANTE** - Callback `onViewDetails` pointe vers `alert()`
- **Contenu suggéré:**
  - Historique consommation
  - Graphique évolution
  - Liste alertes déclenchées
  - Actions (modifier, supprimer)
- **Priorité:** P1 - Améliore navigation

### 6.3 Gaps Mineurs (P2)

**7. Filtres Liste Dashboard**
- ⚠️ **MANQUANTS** - Pas de filtres (orgUnitId, projectId, productId)
- **Solution:** Ajouter dropdowns filtres au-dessus du grid
- **Priorité:** P2 - Améliore navigation si beaucoup de plans

**8. Unité Produit dans Card**
- ⚠️ **HARDCODÉE** - `unit: 'unité'` par défaut (ligne 389 Dashboard)
- **Solution:** Récupérer unit depuis données produit
- **Priorité:** P2 - Améliore précision affichage

**9. Support Daily/Weekly Periods**
- ⚠️ **NON SUPPORTÉ** - Seulement monthly/quarterly/yearly
- **Impact:** Si besoin daily/weekly, nécessite modification schéma DB
- **Priorité:** P2 - Feature future si requis

**10. Export Plans**
- ❌ **MANQUANT** - Pas d'export CSV/PDF
- **Priorité:** P2 - Feature nice-to-have

---

## 7. SUMMARY

### 7.1 Composants Existants

| Composant | Statut | Utilisation |
|-----------|--------|-------------|
| `ConsumptionPlanCard.tsx` | ✅ Existe | Dashboard ✅, OrderDetailPage ❌ (custom), PurchaseOrderForm ❌ |
| `POCDashboard.tsx` section | ✅ Intégré | Affiche grid monthly plans |
| `OrderDetailPage.tsx` section | ✅ Intégré | Affiche impact consommation |
| `PurchaseOrderForm.tsx` import | ⚠️ Partiel | Charge données mais n'affiche pas |

### 7.2 Affichage Période

| Localisation | Format | Type UI |
|--------------|--------|---------|
| `ConsumptionPlanCard` | Texte ("Ce mois") | Lecture seule |
| `POCDashboard` | Texte hardcodé | Titre section |
| Service | `monthly/quarterly/yearly` | N/A |
| Base données | `planned_period` TEXT | N/A |

**Conclusion:** ✅ **Affichage texte simple** - Pas de sélection période dans UI existante

### 7.3 Formulaire Création

| Élément | Statut |
|---------|--------|
| Service backend | ✅ Existe (`createPlan()`) |
| Interface TypeScript | ✅ Existe (`ConsumptionPlanCreate`) |
| Validation backend | ✅ Complète |
| Formulaire UI | ❌ **MANQUANT** |

**Conclusion:** ❌ **Formulaire manquant** - Service prêt, UI à créer

### 7.4 Liste Plans

| Localisation | Statut | Limitations |
|--------------|--------|-------------|
| Dashboard grid | ✅ Existe | Période monthly hardcodée, pas de filtres |
| Page dédiée | ❌ Manquante | Bouton placeholder présent |
| PurchaseOrderForm | ❌ Non affichée | Données chargées mais non rendues |

**Conclusion:** ⚠️ **Liste basique** - Grid Dashboard présent, page dédiée manquante

### 7.5 Gaps Prioritaires

**P0 - Bloquants:**
1. ❌ Formulaire création plan
2. ❌ Page liste plans dédiée
3. ❌ Affichage plans dans PurchaseOrderForm

**P1 - Importants:**
4. ⚠️ Sélecteur période Dashboard
5. ❌ Formulaire modification plan
6. ❌ Page détails plan

**P2 - Mineurs:**
7. ⚠️ Filtres liste Dashboard
8. ⚠️ Unité produit dans Card
9. ⚠️ Support daily/weekly periods
10. ❌ Export plans

---

## 8. RECOMMENDATIONS

### 8.1 Composants à Créer

**1. ConsumptionPlanForm.tsx**
- Formulaire création/modification plan
- Champs: produit, org_unit/projet, quantité, période, seuil
- Validation client-side
- Appel service `createPlan()` ou `updatePlan()`

**2. ConsumptionPlansListPage.tsx**
- Page dédiée liste complète plans
- Filtres (orgUnitId, projectId, productId, period)
- Pagination
- Actions (voir, modifier, supprimer)
- Lien depuis Dashboard

**3. ConsumptionPlanDetailPage.tsx**
- Page détails plan individuel
- Historique consommation
- Graphique évolution
- Liste alertes
- Actions (modifier, supprimer)

### 8.2 Modifications Composants Existants

**1. POCDashboard.tsx**
- Ajouter sélecteur période (dropdown monthly/quarterly/yearly)
- Remplacer `alert()` par navigation vers `ConsumptionPlansListPage`
- Ajouter filtres optionnels

**2. PurchaseOrderForm.tsx**
- Ajouter section affichage `ConsumptionPlanCard` pour produits panier
- Section collapsible après items
- Afficher plans filtrés selon orderType

**3. ConsumptionPlanCard.tsx**
- Récupérer unit depuis données produit (au lieu de 'unité' hardcodé)
- Améliorer formatage période si nécessaire

---

**AGENT03-CONSUMPTION-UI-COMPLETE**

**Résumé:**
- ✅ `ConsumptionPlanCard.tsx` existe et fonctionne
- ✅ Dashboard intègre plans (grid monthly)
- ✅ OrderDetailPage affiche impact consommation
- ⚠️ PurchaseOrderForm charge mais n'affiche pas
- ❌ Formulaire création plan manquant (P0)
- ❌ Page liste plans dédiée manquante (P0)
- ⚠️ Période hardcodée monthly dans Dashboard (P1)
- ✅ Affichage période: texte simple ("Ce mois", "Ce trimestre", "Cette année")
- ✅ Service backend complet avec validation








