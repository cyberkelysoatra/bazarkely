# AGENT 02 - ANALYSE pocConsumptionPlanService

**Agent:** Agent 02 - Service Analysis  
**Date:** 2025-11-23  
**Objectif:** Analyser l'implémentation actuelle de pocConsumptionPlanService.ts

---

## 1. FUNCTIONS LIST (Liste des fonctions)

### 1.1 Fonctions exportées

**Service:** `POCConsumptionPlanService` (classe singleton)

**Fichier:** `frontend/src/modules/construction-poc/services/pocConsumptionPlanService.ts`

**Fonctions disponibles:**

#### 1. `getPlans`
- **Localisation:** Lignes 106-177
- **Signature:**
  ```tsx
  async getPlans(
    companyId: string,
    filters?: ConsumptionPlanFilters
  ): Promise<ServiceResult<ConsumptionPlan[]>>
  ```
- **Description:** Récupère les plans de consommation avec filtres optionnels
- **Paramètres:**
  - `companyId` (string, requis) - ID de la compagnie
  - `filters` (ConsumptionPlanFilters, optionnel) - Filtres (orgUnitId, projectId, productId, plannedPeriod)
- **Type de retour:** `ServiceResult<ConsumptionPlan[]>`
- **Opération:** READ (Query avec filtres)

#### 2. `createPlan`
- **Localisation:** Lignes 185-353
- **Signature:**
  ```tsx
  async createPlan(
    planData: ConsumptionPlanCreate
  ): Promise<ServiceResult<ConsumptionPlan>>
  ```
- **Description:** Crée un nouveau plan de consommation avec validation complète
- **Paramètres:**
  - `planData` (ConsumptionPlanCreate, requis) - Données du plan à créer
- **Type de retour:** `ServiceResult<ConsumptionPlan>`
- **Opération:** CREATE
- **Validations:**
  - Authentification utilisateur
  - Vérification appartenance compagnie
  - Validation champs requis (companyId, productId, plannedQuantity > 0, plannedPeriod)
  - Validation: soit orgUnitId soit projectId requis (pas les deux, pas aucun)
  - Vérification existence orgUnitId, projectId, productId

#### 3. `updatePlan`
- **Localisation:** Lignes 361-531
- **Signature:**
  ```tsx
  async updatePlan(
    planId: string,
    updates: ConsumptionPlanUpdate
  ): Promise<ServiceResult<ConsumptionPlan>>
  ```
- **Description:** Met à jour un plan de consommation existant
- **Paramètres:**
  - `planId` (string, requis) - ID du plan à mettre à jour
  - `updates` (ConsumptionPlanUpdate, requis) - Données de mise à jour (tous les champs optionnels)
- **Type de retour:** `ServiceResult<ConsumptionPlan>`
- **Opération:** UPDATE
- **Validations:**
  - Authentification utilisateur
  - Vérification existence plan
  - Vérification permissions (membre de la compagnie)
  - Validation plannedQuantity > 0 si fourni
  - Validation: soit orgUnitId soit projectId (pas les deux)
  - Vérification existence orgUnitId, projectId, productId si fournis

#### 4. `deletePlan`
- **Localisation:** Lignes 538-595
- **Signature:**
  ```tsx
  async deletePlan(planId: string): Promise<ServiceResult<void>>
  ```
- **Description:** Supprime un plan de consommation
- **Paramètres:**
  - `planId` (string, requis) - ID du plan à supprimer
- **Type de retour:** `ServiceResult<void>`
- **Opération:** DELETE
- **Validations:**
  - Authentification utilisateur
  - Vérification existence plan
  - Vérification permissions (membre de la compagnie)

#### 5. `getActualConsumption`
- **Localisation:** Lignes 603-698
- **Signature:**
  ```tsx
  async getActualConsumption(planId: string): Promise<ServiceResult<number>>
  ```
- **Description:** Calcule la consommation réelle à partir des bons de commande pour un plan donné. Filtre les commandes selon la période planifiée (mois/trimestre/année en cours)
- **Paramètres:**
  - `planId` (string, requis) - ID du plan de consommation
- **Type de retour:** `ServiceResult<number>` - Quantité réelle consommée
- **Opération:** READ (Calcul)
- **Logique:**
  - Récupère le plan avec product_id, planned_period, org_unit_id, project_id
  - Calcule la date de début selon la période (monthly/quarterly/yearly)
  - Filtre les commandes par: product_id, date >= startDate, statut non annulé
  - Filtre par org_unit_id ou project_id selon le plan
  - Somme les quantités des items

#### 6. `checkConsumptionAlert`
- **Localisation:** Lignes 706-784
- **Signature:**
  ```tsx
  async checkConsumptionAlert(planId: string): Promise<ServiceResult<ConsumptionAlert>>
  ```
- **Description:** Vérifie si une alerte de consommation doit être déclenchée. Compare consommation réelle vs planifiée et seuil d'alerte
- **Paramètres:**
  - `planId` (string, requis) - ID du plan de consommation
- **Type de retour:** `ServiceResult<ConsumptionAlert>`
- **Opération:** READ (Calcul + Alerte)
- **Logique:**
  - Récupère le plan avec produit
  - Calcule consommation réelle via `getActualConsumption()`
  - Calcule pourcentage utilisé: (actualQuantity / plannedQuantity) * 100
  - Vérifie si alerte déclenchée: percentageUsed >= thresholdPercentage
  - Génère message descriptif en français

#### 7. `getConsumptionSummary`
- **Localisation:** Lignes 793-883
- **Signature:**
  ```tsx
  async getConsumptionSummary(
    companyId: string,
    period: 'monthly' | 'quarterly' | 'yearly'
  ): Promise<ServiceResult<ConsumptionSummary[]>>
  ```
- **Description:** Récupère un résumé de consommation pour le dashboard. Retourne tous les plans avec consommation réelle vs planifiée pour une période donnée
- **Paramètres:**
  - `companyId` (string, requis) - ID de la compagnie
  - `period` ('monthly' | 'quarterly' | 'yearly', requis) - Période pour le résumé
- **Type de retour:** `ServiceResult<ConsumptionSummary[]>`
- **Opération:** READ (Résumé avec calculs)
- **Logique:**
  - Récupère tous les plans pour la période via `getPlans()`
  - Pour chaque plan:
    - Calcule consommation réelle via `getActualConsumption()`
    - Calcule pourcentage utilisé
    - Vérifie si alerte déclenchée
    - Récupère noms produit, org_unit, project
    - Crée ConsumptionSummary

---

## 2. PERIOD SUPPORT (Support des périodes)

### 2.1 Périodes actuellement supportées

**Périodes implémentées:**
- ✅ `'monthly'` - Mensuel
- ✅ `'quarterly'` - Trimestriel
- ✅ `'yearly'` - Annuel

**Périodes NON supportées:**
- ❌ `'daily'` - Quotidien
- ❌ `'weekly'` - Hebdomadaire

### 2.2 Utilisation de planned_period dans le service

#### Dans les interfaces TypeScript:

**ConsumptionPlan (ligne 21):**
```tsx
plannedPeriod: 'monthly' | 'quarterly' | 'yearly';
```

**ConsumptionPlanCreate (ligne 37):**
```tsx
plannedPeriod: 'monthly' | 'quarterly' | 'yearly';
```

**ConsumptionPlanUpdate (ligne 49):**
```tsx
plannedPeriod?: 'monthly' | 'quarterly' | 'yearly';
```

**ConsumptionPlanFilters (ligne 93):**
```tsx
plannedPeriod?: 'monthly' | 'quarterly' | 'yearly';
```

**ConsumptionSummary (ligne 68):**
```tsx
period: 'monthly' | 'quarterly' | 'yearly';
```

#### Dans les fonctions:

**1. getPlans (ligne 137-139):**
```tsx
if (filters?.plannedPeriod) {
  query = query.eq('planned_period', filters.plannedPeriod);
}
```
✅ **Support:** Filtre par planned_period

**2. createPlan (ligne 229-234, 306):**
```tsx
if (!planData.plannedPeriod) {
  return {
    success: false,
    error: 'La période de planification est requise'
  };
}
// ...
planned_period: planData.plannedPeriod,
```
✅ **Support:** Validation et sauvegarde de planned_period

**3. updatePlan (ligne 483-485):**
```tsx
if (updates.plannedPeriod !== undefined) {
  updateData.planned_period = updates.plannedPeriod;
}
```
✅ **Support:** Mise à jour de planned_period

**4. getActualConsumption (lignes 623-642):**
```tsx
switch (plan.planned_period) {
  case 'monthly':
    // Mois en cours
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    break;
  case 'quarterly':
    // Trimestre en cours
    const currentQuarter = Math.floor(now.getMonth() / 3);
    startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
    break;
  case 'yearly':
    // Année en cours
    startDate = new Date(now.getFullYear(), 0, 1);
    break;
  default:
    return {
      success: false,
      error: 'Période de planification invalide'
    };
}
```
✅ **Support:** Calcul de date de début selon période (monthly/quarterly/yearly uniquement)

**5. checkConsumptionAlert (ligne 753):**
```tsx
message = `Consommation dépassée: ${actualQuantity.toLocaleString('fr-FR')} ${plan.planned_period === 'monthly' ? 'unité(s)' : plan.planned_period === 'quarterly' ? 'unité(s)' : 'unité(s)'} consommées...`;
```
✅ **Support:** Utilisation dans message (mais logique identique pour toutes les périodes)

**6. getConsumptionSummary (lignes 795, 799):**
```tsx
period: 'monthly' | 'quarterly' | 'yearly'
// ...
const plansResult = await this.getPlans(companyId, { plannedPeriod: period });
```
✅ **Support:** Filtre par période et retour dans résumé

### 2.3 Conclusion sur le support des périodes

**Statut actuel:** ✅ **Support PARTIEL**

**Supporté:**
- ✅ `'monthly'` - Complètement implémenté
- ✅ `'quarterly'` - Complètement implémenté
- ✅ `'yearly'` - Complètement implémenté

**Non supporté:**
- ❌ `'daily'` - Non implémenté
- ❌ `'weekly'` - Non implémenté

**Détails:**
- Les types TypeScript limitent aux 3 périodes (monthly/quarterly/yearly)
- La logique de calcul dans `getActualConsumption()` ne gère que ces 3 périodes
- Aucun code pour calculer la date de début pour daily/weekly

---

## 3. CRUD OPERATIONS (Opérations CRUD)

### 3.1 Opérations implémentées

**✅ CREATE:** `createPlan()` - Ligne 185
- Création complète avec validation
- Vérification existence références (orgUnit, project, product)
- Validation règles métier (soit orgUnit soit project)

**✅ READ:** `getPlans()` - Ligne 106
- Lecture avec filtres optionnels
- Support filtres: orgUnitId, projectId, productId, plannedPeriod
- Tri par date de création (desc)

**✅ UPDATE:** `updatePlan()` - Ligne 361
- Mise à jour partielle (tous les champs optionnels)
- Validation des champs modifiés
- Vérification permissions

**✅ DELETE:** `deletePlan()` - Ligne 538
- Suppression avec vérification permissions
- Vérification existence plan

### 3.2 Opérations de calcul (non-CRUD)

**✅ Calcul consommation réelle:** `getActualConsumption()` - Ligne 603
- Calcule consommation à partir des commandes
- Filtre par période planifiée
- Filtre par orgUnit ou project

**✅ Vérification alerte:** `checkConsumptionAlert()` - Ligne 706
- Compare consommation réelle vs planifiée
- Déclenche alerte si seuil dépassé
- Génère message descriptif

**✅ Résumé dashboard:** `getConsumptionSummary()` - Ligne 793
- Résumé tous les plans pour une période
- Inclut calculs consommation et alertes
- Récupère noms produits, org_units, projects

### 3.3 Statut CRUD

**✅ CRUD COMPLET:** Toutes les opérations CRUD de base sont implémentées

**✅ Opérations avancées:** Calculs et alertes également implémentés

---

## 4. MISSING FEATURES (Fonctionnalités manquantes)

### 4.1 Support daily/weekly

**Fonctionnalité manquante:** Support des périodes `'daily'` et `'weekly'`

**Modifications requises:**

1. **Mettre à jour les types TypeScript:**
   - `ConsumptionPlan.plannedPeriod`: Ajouter `'daily' | 'weekly'`
   - `ConsumptionPlanCreate.plannedPeriod`: Ajouter `'daily' | 'weekly'`
   - `ConsumptionPlanUpdate.plannedPeriod`: Ajouter `'daily' | 'weekly'`
   - `ConsumptionPlanFilters.plannedPeriod`: Ajouter `'daily' | 'weekly'`
   - `ConsumptionSummary.period`: Ajouter `'daily' | 'weekly'`
   - `getConsumptionSummary.period`: Ajouter `'daily' | 'weekly'`

2. **Mettre à jour `getActualConsumption()` (lignes 623-642):**
   ```tsx
   switch (plan.planned_period) {
     case 'daily':
       // Jour en cours
       startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
       break;
     case 'weekly':
       // Semaine en cours (lundi)
       const dayOfWeek = now.getDay();
       const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Ajuster pour lundi
       startDate = new Date(now.getFullYear(), now.getMonth(), diff);
       break;
     case 'monthly':
       // ... existing code
     // ... rest of cases
   }
   ```

3. **Mettre à jour `getConsumptionSummary()` (ligne 795):**
   - Ajouter `'daily' | 'weekly'` au type du paramètre `period`

### 4.2 Autres fonctionnalités potentielles

**Aucun TODO identifié dans le code** - Le service semble complet pour les fonctionnalités de base

**Améliorations possibles (non critiques):**
- Pagination pour `getPlans()` si beaucoup de plans
- Cache pour `getActualConsumption()` pour éviter recalculs fréquents
- Batch operations pour créer/mettre à jour plusieurs plans
- Historique des consommations (pas seulement période en cours)

---

## 5. TYPES USED (Types utilisés)

### 5.1 Interfaces exportées

**1. ConsumptionPlan (lignes 14-26)**
```tsx
export interface ConsumptionPlan {
  id: string;
  companyId: string;
  orgUnitId?: string;
  projectId?: string;
  productId: string;
  plannedQuantity: number;
  plannedPeriod: 'monthly' | 'quarterly' | 'yearly';
  alertThresholdPercentage: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**2. ConsumptionPlanCreate (lignes 31-39)**
```tsx
export interface ConsumptionPlanCreate {
  companyId: string;
  orgUnitId?: string;
  projectId?: string;
  productId: string;
  plannedQuantity: number;
  plannedPeriod: 'monthly' | 'quarterly' | 'yearly';
  alertThresholdPercentage?: number;
}
```

**3. ConsumptionPlanUpdate (lignes 44-51)**
```tsx
export interface ConsumptionPlanUpdate {
  orgUnitId?: string | null;
  projectId?: string | null;
  productId?: string;
  plannedQuantity?: number;
  plannedPeriod?: 'monthly' | 'quarterly' | 'yearly';
  alertThresholdPercentage?: number;
}
```

**4. ConsumptionSummary (lignes 56-69)**
```tsx
export interface ConsumptionSummary {
  planId: string;
  productId: string;
  productName: string;
  orgUnitId?: string;
  orgUnitName?: string;
  projectId?: string;
  projectName?: string;
  plannedQuantity: number;
  actualQuantity: number;
  percentageUsed: number;
  alertTriggered: boolean;
  period: 'monthly' | 'quarterly' | 'yearly';
}
```

**5. ConsumptionAlert (lignes 74-84)**
```tsx
export interface ConsumptionAlert {
  planId: string;
  productId: string;
  productName: string;
  plannedQuantity: number;
  actualQuantity: number;
  thresholdPercentage: number;
  percentageUsed: number;
  message: string;
  alertTriggered: boolean;
}
```

**6. ConsumptionPlanFilters (lignes 89-94)**
```tsx
export interface ConsumptionPlanFilters {
  orgUnitId?: string;
  projectId?: string;
  productId?: string;
  plannedPeriod?: 'monthly' | 'quarterly' | 'yearly';
}
```

### 5.2 Types importés

**ServiceResult (ligne 9):**
```tsx
import type { ServiceResult } from '../types/construction';
```
- Type générique pour résultats de service
- Utilisé dans tous les retours de fonctions

### 5.3 Types utilisés dans les fonctions

**Tous les types sont TypeScript strict:**
- ✅ Pas de `any` sauf pour mapping données Supabase (lignes 152, 725)
- ✅ Types explicites pour tous les paramètres
- ✅ Types explicites pour tous les retours
- ✅ Union types pour plannedPeriod

---

## 6. RÉSUMÉ

### 6.1 Fonctions disponibles

**7 fonctions exportées:**
1. `getPlans()` - READ avec filtres
2. `createPlan()` - CREATE avec validation
3. `updatePlan()` - UPDATE partiel
4. `deletePlan()` - DELETE
5. `getActualConsumption()` - Calcul consommation réelle
6. `checkConsumptionAlert()` - Vérification alerte
7. `getConsumptionSummary()` - Résumé dashboard

### 6.2 Support des périodes

**✅ Supporté:** `'monthly'`, `'quarterly'`, `'yearly'`  
**❌ Non supporté:** `'daily'`, `'weekly'`

**Pour ajouter daily/weekly:**
- Mettre à jour 6 interfaces TypeScript
- Ajouter 2 cases dans switch de `getActualConsumption()`
- Mettre à jour paramètre `period` de `getConsumptionSummary()`

### 6.3 Opérations CRUD

**✅ CRUD complet:** Create, Read, Update, Delete tous implémentés  
**✅ Opérations avancées:** Calculs, alertes, résumés implémentés

### 6.4 Fonctionnalités manquantes

**Critique:**
- ❌ Support `'daily'` et `'weekly'` pour planned_period

**Non critique (améliorations):**
- Pagination
- Cache
- Batch operations
- Historique

### 6.5 Types TypeScript

**6 interfaces exportées:**
- `ConsumptionPlan` - Plan complet
- `ConsumptionPlanCreate` - Création
- `ConsumptionPlanUpdate` - Mise à jour
- `ConsumptionSummary` - Résumé dashboard
- `ConsumptionAlert` - Alerte consommation
- `ConsumptionPlanFilters` - Filtres requêtes

**Qualité du code:**
- ✅ Types stricts (pas de `any` sauf mapping Supabase)
- ✅ Documentation JSDoc complète
- ✅ Validation complète des données

---

**AGENT02-CONSUMPTION-SERVICE-COMPLETE**



















