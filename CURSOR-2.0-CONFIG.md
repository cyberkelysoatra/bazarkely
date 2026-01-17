# CURSOR 2.0 CONFIGURATION - BazarKELY

**Date de création :** 31 octobre 2025  
**Dernière mise à jour :** 7 janvier 2026  
**Version Cursor :** 2.0  
**Projet :** BazarKELY - Application PWA Gestion Budget Familial  
**Utilisateur :** Joel Soatra (Rampolo Nosy - Pro Plan)  
**Phase actuelle :** Phase B Goals Deadline Sync (v2.5.0) - 2026-01-07

---

## ✅ VALIDATION CONFIGURATION

### **Status Global**
- ✅ **Cursor 2.0 Confirmé** : Interface Agent-Centric activée
- ✅ **Multi-Agent Interface** : 6 agents parallèles maximum
- ✅ **Composer Model** : Activé et opérationnel
- ✅ **Modèles Premium** : Claude Sonnet 4.5, GPT-5 disponibles
- ✅ **Configuration** : Optimale pour développement multi-agents

---

## 🤖 MODÈLES DISPONIBLES

### **Modèles Activés (Image Settings → Models)**

| Modèle | Status | Usage Recommandé |
|--------|--------|------------------|
| **Composer 1** | ✅ ON | **Défaut** - Agents rapides, tâches standard (4x plus rapide) |
| **Sonnet 4.5** | ✅ ON | Tâches complexes, architecture, refactoring majeur |
| **GPT-5 Codex** | ✅ ON | Génération code spécialisée, patterns complexes |
| **GPT-5** | ✅ ON | Tâches générales, documentation, analyse |
| **Haiku 4.5** | ✅ ON | Tâches simples ultra-rapides, corrections mineures |
| **Grok Code** | ✅ ON | Alternative expérimentale, cas spécifiques |
| **Sonnet 4.5** (2) | ❌ OFF | Désactivé (doublon) |
| **Sonnet 4** | ❌ OFF | Version antérieure, non nécessaire |
| **Sonnet 4** (2) | ❌ OFF | Version antérieure, non nécessaire |

### **Stratégie de Sélection Modèle**

**Par défaut : Composer 1** (optimal pour 90% des tâches)

```
Composer 1 → Tâches standard (diagnostic, implémentation simple/moyenne)
Sonnet 4.5 → Tâches complexes (architecture, refactoring majeur, multi-fichiers)
GPT-5 Codex → Patterns complexes spécifiques
Haiku 4.5 → Corrections ultra-rapides (<10 lignes)
```

---

## ∞ CONFIGURATION AGENTS

### **Paramètres Agents (Image Settings → Agents)**

| Paramètre | Valeur | Description |
|-----------|--------|-------------|
| **Default Mode** | Agent | Mode par défaut pour nouveaux agents |
| **Default Location** | Pane | Agents s'ouvrent dans panel latéral |
| **Text Size** | Default | Taille texte conversation |
| **Auto-Clear Chat** | ✅ ON | Nettoyage automatique après inactivité |
| **Max Tab Count** | 6 (Custom) | **Agents parallèles maximum** |
| **Queue Messages** | Send immediately | Messages envoyés immédiatement (pas de queue) |
| **Usage Summary** | Auto | Résumé usage affiché automatiquement |
| **Custom Modes** | ❌ OFF (BETA) | Modes personnalisés désactivés |

### **Agent Review**

| Paramètre | Valeur | Description |
|-----------|--------|-------------|
| **Start Agent Review on Commit** | ❌ OFF | Review manuelle (pas automatique) |
| **Include Submodules in Agent Review** | ✅ ON | Inclut sous-modules Git |
| **Include Untracked Files in Agent Review** | ❌ OFF | Fichiers non trackés exclus |

### **Limites et Recommandations**

```
Configuration Actuelle :
- Max 6 agents simultanés configurés
- Recommandation : 3-4 agents en pratique (équilibre perf/qualité)

Pour BazarKELY (tâches standard) :
- Diagnostic : 3 agents parallèles (Identification + Dependencies + Documentation)
- Implémentation : 3 agents parallèles (Conservative + Modular + Integrated)
- Clôture : 3 agents parallèles (Technical Docs + Feature Tracking + Structure)
- Tests : 3 agents parallèles (Unit + Integration + E2E)

Si machine puissante (32GB+ RAM, 8+ cores) :
- Possible d'aller jusqu'à 6 agents pour workflows complexes
```

---

## 🧪 BETA FEATURES

### **Features Expérimentales (Image Settings → Beta)**

| Feature | Status | Description |
|---------|--------|-------------|
| **Update Access** | Default | Notifications updates en Early Access |
| **Agent Autocomplete** | ✅ ON | Suggestions contextuelles pendant prompting |
| **Extension RPC Tracer** | ❌ OFF | Tracer extensions (pas nécessaire) |

---

## 🔧 FEATURES CURSOR 2.0 ACTIVÉES

### **Confirmées Disponibles**

- ✅ **Multi-Agent Parallel Execution** : 6 agents max simultanés
- ✅ **Composer Model** : Modèle propriétaire 4x plus rapide
- ✅ **Git Worktrees** : Isolation automatique entre agents (géré par Cursor)
- ✅ **Agent-Centric Interface** : Focus sur résultats vs fichiers
- ✅ **Agent Autocomplete** : Suggestions intelligentes prompts
- ✅ **Unified Diff View** : Revue multi-fichiers (accessible via interface)

### **Non Confirmées / Non Visibles**

- ❓ **Browser Tool** : Pas trouvé dans Settings (peut être activé par défaut ou non disponible sur Windows)
- ❓ **Sandboxed Terminals** : Spécifique macOS (Joel sur Windows)

---

## 🚀 WORKFLOWS MULTI-AGENTS VALIDÉS

### **Workflow Phase 2 : Diagnostic 3-Agents** ✅ VALIDÉ [12/11/2025]
**Usage :** Investigation complète avant implémentation (database + workflow + frontend)
**Agents :** AGENT01 Database Investigation + AGENT02 Workflow Analysis + AGENT03 Frontend Analysis
**Temps :** ~1-2 minutes (parallèle)
**Status :** ✅ VALIDÉ - Session Phase 2 réussie
**Métriques :**
- **Agents utilisés :** 3 agents parallèles
- **Taux succès :** 3/3 = 100%
- **Gain temps :** 60-75% vs séquentiel
- **Livrables :** Rapports d'investigation complets pour chaque domaine

**Détails :**
- **AGENT01 :** Investigation schéma database (tables, colonnes, contraintes, ENUMs)
- **AGENT02 :** Analyse workflow (validation logique, transitions, permissions)
- **AGENT03 :** Analyse frontend (composants impactés, UI conditionnelle)

### **Workflow Phase 2 : Implementation 3-Agents** ✅ VALIDÉ [12/11/2025]
**Usage :** Implémentation parallèle database + workflow + frontend
**Agents :** AGENT01 Database Modifications + AGENT02 Workflow Modifications + AGENT03 Frontend Modifications
**Temps :** ~30-45 minutes (parallèle, avec corrections itératives)
**Status :** ✅ VALIDÉ - Session Phase 2 réussie après corrections schéma
**Métriques :**
- **Agents utilisés :** 3 agents parallèles
- **Taux succès :** 3/3 = 100% (après corrections)
- **Gain temps :** 60-70% vs séquentiel
- **Fichiers créés/modifiés :** 4 fichiers database + 5 fichiers frontend + 1 fichier backend

**Détails :**
- **AGENT01 :** Scripts SQL (tables, colonnes, données, RLS)
- **AGENT02 :** Service workflow (helpers org_unit, validation conditionnelle)
- **AGENT03 :** Composants frontend (formulaires, listes, affichage conditionnel)

### **Workflow Phase 2 : Documentation 3-Agents** ✅ VALIDÉ [12/11/2025]
**Usage :** Mise à jour documentation complète en fin de session
**Agents :** AGENT01 Technical Docs + AGENT02 Feature Tracking + AGENT03 Structure & New Docs
**Temps :** ~5-10 minutes (parallèle)
**Status :** ✅ VALIDÉ - Session Phase 2 réussie
**Métriques :**
- **Agents utilisés :** 3 agents parallèles
- **Taux succès :** 3/3 = 100%
- **Gain temps :** 60-75% vs séquentiel
- **Fichiers mis à jour/créés :** 3 fichiers mis à jour + 2 nouveaux fichiers

**Détails :**
- **AGENT01 :** Documentation technique (ARCHITECTURE-POC-CONSTRUCTION.md, guides techniques)
- **AGENT02 :** Suivi fonctionnalités (FEATURE-MATRIX.md, CAHIER-DES-CHARGES.md)
- **AGENT03 :** Structure projet (PROJECT-STRUCTURE-TREE.md, CURSOR-2.0-CONFIG.md, MULTI-AGENT-WORKFLOWS.md, nouveaux documents Phase 2)

### **Workflow Phase 3 : Diagnostic 3-Agents Parallèles** ✅ VALIDÉ [12/11/2025]
**Usage :** Investigation complète avant implémentation (Service + Security + Frontend analysis)
**Agents :** AGENT01 Service Analysis + AGENT02 Security Analysis + AGENT03 Frontend Analysis
**Temps :** ~30s-1min (parallèle)
**Status :** ✅ VALIDÉ - Session Phase 3 réussie
**Métriques :**
- **Agents utilisés :** 3 agents parallèles
- **Taux succès :** 3/3 = 100%
- **Gain temps :** 65-70% vs séquentiel
- **Livrables :** Rapports d'investigation complets pour chaque domaine

**Détails :**
- **AGENT01 :** Analyse service pocPurchaseOrderService (orderType + orgUnitId support requis)
- **AGENT02 :** Analyse sécurité (RLS policies, price masking, threshold alerts)
- **AGENT03 :** Analyse frontend (composants impactés, UI conditionnelle, intégration)

### **Workflow Phase 3 : Backend Fix Single-Agent** ✅ VALIDÉ [12/11/2025]
**Usage :** Correction service pocPurchaseOrderService (orderType + orgUnitId support)
**Agents :** AGENT04 Backend Fix
**Temps :** ~2-3 minutes
**Status :** ✅ VALIDÉ - Service modifié avec succès
**Métriques :**
- **Agents utilisés :** 1 agent
- **Taux succès :** 1/1 = 100%
- **Fichiers modifiés :** 1 fichier (pocPurchaseOrderService.ts)

**Détails :**
- **AGENT04 :** Modification pocPurchaseOrderService.ts (ajout support orderType + orgUnitId dans fonctions CRUD)

### **Workflow Phase 3 : Fondations 4-Agents Parallèles** ✅ VALIDÉ [12/11/2025]
**Usage :** Implémentation parallèle database + 2 services + components
**Agents :** AGENT05 Database Migration + AGENT06 Price Threshold Service + AGENT07 Consumption Plan Service + AGENT08 Alert Service
**Temps :** ~5-10 minutes (parallèle)
**Status :** ✅ VALIDÉ - Session Phase 3 réussie
**Métriques :**
- **Agents utilisés :** 4 agents parallèles
- **Taux succès :** 4/4 = 100%
- **Gain temps :** 65-70% vs séquentiel
- **Fichiers créés :** 1 migration + 3 services + 3 components + 1 utilitaire

**Détails :**
- **AGENT05 :** Migration Supabase (RLS policies + tables security)
- **AGENT06 :** pocPriceThresholdService.ts (522 lignes)
- **AGENT07 :** pocConsumptionPlanService.ts (797 lignes)
- **AGENT08 :** pocAlertService.ts (687 lignes) + ThresholdAlert.tsx (101 lignes) + ConsumptionPlanCard.tsx (211 lignes) + PriceMaskingWrapper.tsx (139 lignes) + priceMasking.ts (116 lignes)

### **Workflow Phase 3 : Intégration UI 4-Agents Parallèles** ✅ VALIDÉ [12/11/2025]
**Usage :** Intégration UI parallèle (Form + List + Detail + Dashboard)
**Agents :** AGENT09 Form Integration + AGENT10 List Integration + AGENT11 Detail Integration + AGENT12 Dashboard Integration
**Temps :** ~3-5 minutes (parallèle)
**Status :** ✅ VALIDÉ - Session Phase 3 réussie
**Métriques :**
- **Agents utilisés :** 4 agents parallèles
- **Taux succès :** 4/4 = 100%
- **Gain temps :** 65-70% vs séquentiel
- **Fichiers modifiés :** 4 pages (PurchaseOrderForm, POCOrdersList, OrderDetailPage, POCDashboard) + 2 index.ts

**Détails :**
- **AGENT09 :** PurchaseOrderForm.tsx (threshold alerts + consumption)
- **AGENT10 :** POCOrdersList.tsx (price masking + alert badges)
- **AGENT11 :** OrderDetailPage.tsx (comprehensive masking + alerts)
- **AGENT12 :** POCDashboard.tsx (alerts + consumption widgets) + index.ts (exports)

### **Workflow Bug Diagnostic : Diagnostic 3-Agents Parallèles (Critical Bugs)** ✅ VALIDÉ [14/11/2025]
**Usage :** Diagnostic parallèle bugs runtime + erreurs database + analyse UX pour problèmes critiques
**Agents :** AGENT 1 - Code Bug Analysis + AGENT 2 - Database Schema + AGENT 3 - UX Analysis
**Temps :** ~2 minutes (parallèle) vs ~20 minutes séquentiel
**Status :** ✅ VALIDÉ - Session 2025-11-14 PM réussie
**Métriques :**
- **Agents utilisés :** 3 agents parallèles
- **Taux succès :** 3/3 = 100%
- **Gain temps :** 90% (2 min vs 20 min séquentiel)
- **Livrables :** 2 bugs identifiés et corrigés + 1 analyse UX complète

**Détails :**
- **AGENT 1 - Code Bug Analysis :** Analyse erreurs runtime TypeScript, identification patterns similaires dans codebase, recommandations corrections
- **AGENT 2 - Database Schema :** Vérification schéma database, identification colonnes manquantes, validation migrations SQL
- **AGENT 3 - UX Analysis :** Analyse complexité formulaire, identification sources friction, recommandations simplification priorisées

**Use Case :** Erreurs production avec logs console + erreurs database + feedback utilisateur nécessitant analyse UX

### **Workflow Diagnostic 3-Agents : Smart Defaults Implementation** ✅ VALIDÉ [15/11/2025]
**Usage :** Diagnostic parallèle analyse formulaire + sources données + préservation édition pour implémentation smart defaults
**Agents :** AGENT 1 - Form Structure Analysis + AGENT 2 - Data Sources Analysis + AGENT 3 - Edit Preservation Strategy
**Temps :** ~30 secondes (parallèle) vs ~5 minutes séquentiel
**Status :** ✅ VALIDÉ - Session 2025-11-15 réussie
**Métriques :**
- **Agents utilisés :** 3 agents parallèles
- **Taux succès :** 3/3 = 100%
- **Gain temps :** 83% (30s vs 5min séquentiel)
- **Livrables :** 8 injection points identifiés + mapping rôle complet + stratégie préservation édition

**Détails :**
- **AGENT 1 - Form Structure Analysis :** Analyse structure PurchaseOrderForm (state, useEffect, validation), identification points injection smart defaults
- **AGENT 2 - Data Sources Analysis :** Analyse ConstructionContext, rôles utilisateur, membreships, mapping logique rôle-based
- **AGENT 3 - Edit Preservation Strategy :** Analyse mode édition vs création, stratégie préservation données existantes, edge cases identifiés

**Use Case :** Implémentation fonctionnalité complexe nécessitant analyse multi-domaines (structure + données + UX) avant développement

### **Workflow VAGUE 1 - Quick Wins 3-Agents Parallel** ✅ VALIDÉ [15/11/2025]
**Usage :** Améliorations UX rapides + bug fix critique en parallèle
**Agents :** AGENT09 - Header Fix + AGENT11 - Form Reorganization + AGENT12 - Collapsibles/Badges
**Temps :** ~30-60 minutes (parallèle) vs ~90-120 minutes séquentiel
**Status :** ✅ VALIDÉ - Session 2025-11-15 VAGUE 1 réussie
**Métriques :**
- **Agents utilisés :** 3 agents parallèles
- **Taux succès :** 3/3 = 100%
- **Gain temps :** 60-70% (30-60 min vs 90-120 min séquentiel)
- **Livrables :** Bug Header résolu + Form réorganisé + 7 badges feedback + sections collapsibles

**Détails :**
- **AGENT09 - Header Fix :** Correction bug budget banner affiché en mode Construction (ligne 768 Header.tsx)
- **AGENT11 - Form Reorganization :** Réorganisation structure PurchaseOrderForm (sections, layout, hiérarchie)
- **AGENT12 - Collapsibles/Badges :** Implémentation sections collapsibles + 7 badges feedback utilisateur

**Résultats :**
- **Réduction hauteur :** -33% hauteur formulaire
- **Badges feedback :** 7 badges implémentés (smart defaults visuels)
- **Sections collapsibles :** Informations livraison + Notes (masquées par défaut)
- **Risque :** LOW (modifications isolées, pas de breaking changes)

**Use Case :** Améliorations UX rapides avec impact immédiat, bug fixes critiques en parallèle

### **Workflow VAGUE 2 - Alignement Traditionnel BCI 3-Agents Parallel** ✅ VALIDÉ [15/11/2025]
**Usage :** Transformation formulaire pour alignement modèle traditionnel BCI manuscrit
**Agents :** AGENT09 - Traditional Header + AGENT11 - Inline Search + AGENT12 - Single-Column Layout
**Temps :** ~90 minutes (parallèle) vs ~240 minutes séquentiel
**Status :** ✅ VALIDÉ - Session 2025-11-15 VAGUE 2 réussie
**Métriques :**
- **Agents utilisés :** 3 agents parallèles
- **Taux succès :** 3/3 = 100%
- **Gain temps :** 60-65% (90 min vs 240 min séquentiel)
- **Livrables :** Header style traditionnel + Inline search produits + Layout 1 colonne

**Détails :**
- **AGENT09 - Traditional Header :** Redesign header avec numéro BCI, date, "Bon Pour" (style traditionnel)
- **AGENT11 - Inline Search :** Remplacement modal recherche par inline search field avec dropdown
- **AGENT12 - Single-Column Layout :** Transformation layout 2 colonnes → 1 colonne (suppression sidebar)

**Résultats :**
- **Temps ajout article :** -75% (15-20s → 3-5s avec inline search)
- **Layout :** 1 colonne flow linéaire (aligné modèle traditionnel)
- **Modal supprimée :** Workflow continu sans interruption
- **Risque :** MEDIUM (changements structurels majeurs, tests nécessaires)

**Use Case :** Transformation UX majeure alignée avec modèle traditionnel, simplification workflow utilisateur

### **Workflow Critical Fix - AGENT10 Single-Agent** ✅ VALIDÉ [15/11/2025]
**Usage :** Correction erreur runtime critique (WorkflowAction import)
**Agent :** AGENT10 - List Integration
**Temps :** ~2-3 minutes
**Status :** ✅ VALIDÉ - Fix critique appliqué immédiatement
**Métriques :**
- **Agent utilisé :** 1 agent
- **Taux succès :** 100%
- **Temps résolution :** 2-3 minutes
- **Impact :** Bloqueur critique résolu

**Détails :**
- **Problème :** Import WorkflowAction avec "import type" alors qu'utilisé comme valeur runtime
- **Solution :** Séparation imports (enum en import normal, types en import type)
- **Fichier modifié :** POCOrdersList.tsx (ligne 14-15)
- **Risque :** LOW (correction isolée, pattern déjà validé session 2025-11-14)

**Use Case :** Fix critique bloquant nécessitant résolution immédiate

### **Workflow PM Session - AGENT09 Iterative Header Cleanup** ✅ VALIDÉ [15/11/2025 PM]
**Usage :** Nettoyage itératif Header Construction basé sur feedback utilisateur visuel
**Agent :** AGENT09 - Form Integration + Header Fix
**Temps :** ~2-3 heures (8 corrections successives avec cycles feedback)
**Status :** ✅ VALIDÉ - Session PM 2025-11-15 réussie (Header Construction clean)
**Métriques :**
- **Agent utilisé :** AGENT09 (8 corrections itératives)
- **Taux succès :** 100% (8/8 corrections appliquées)
- **Approche :** Fix → User test → Identify issue → Fix again (cycle répété 8 fois)
- **Fichier modifié :** Header.tsx uniquement
- **Résultat :** Header Construction complètement nettoyé (éléments Budget supprimés)

**Détails :**
- **Objectif :** Suppression complète éléments Budget du header Construction
- **Méthode :** Corrections itératives basées sur feedback utilisateur après chaque test visuel
- **Corrections :** 8 fixes successives dans Header.tsx
- **Pattern :** User feedback → Identification problème → Correction → Test → Répéter

**Résultats :**
- ✅ **Header Construction clean :** Tous éléments Budget supprimés
- ✅ **8 corrections appliquées :** Toutes corrections validées par tests utilisateur
- ✅ **Approche itérative validée :** Multiple petites corrections > une grande modification
- ⚠️ **User satisfaction :** Header OK mais utilisateur veut plus de corrections pages avant commit Git

**Leçons Apprises :**
- ✅ Approche itérative user-feedback efficace pour cleanup UI (8 corrections > 1 grande)
- ✅ Tests visuels après chaque correction identifient problèmes suivants rapidement
- ✅ Nettoyage single-file peut nécessiter plusieurs cycles (8 corrections)
- ⚠️ Satisfaction utilisateur nécessite tests toutes pages, pas seulement composant isolé
- ⚠️ Pas de commit Git si utilisateur veut plus de corrections avant validation complète

**Use Case :** Nettoyage UI itératif basé sur feedback utilisateur, corrections successives single-file

### **Workflow 1 : Implémentation 3-Features Parallèles** ✅ VALIDÉ [31/10/2025]
**Usage :** Développement de features indépendantes en parallèle
**Agents :** Agent 1 (fix-filter) + Agent 2 (loading) + Agent 3 (export)
**Temps :** ~15 minutes développement + ~15 minutes résolution conflits = ~30 minutes
**Status :** ✅ VALIDÉ - Première session réussie avec 3 features développées
**Métriques :**
- **Features développées :** 3 (Category Filter Fix + Loading Spinner + CSV Export)
- **Conflits résolus :** 3 via prompts Cursor
- **Tests :** 4/4 réussis
- **Gain temps :** 43% vs développement séquentiel (2h50 vs 5h)

**Détails Implémentation :**
- **Agent 1 (fix-filter) :** Fix category race condition - Branche `fix-category-filter-conservative`
- **Agent 2 (loading) :** Add Loader2 spinner - Branche `feature-loading-indicator`
- **Agent 3 (export) :** Add CSV export - Branche `feature-csv-export`
- **Scripts utilisés :** setup-multiagent-test.ps1 et cleanup-worktrees.ps1
- **Documentation :** Voir RESUME-SESSION-2025-10-31.md et MULTI-AGENT-WORKFLOWS.md

### **Workflow Step 2 - Workflow State Machine Implementation** ✅ VALIDÉ [08/11/2025]
**Usage :** Implémentation workflow 17 statuts + auth helpers + stock fulfillment
**Agents :** 6 agents parallèles (AGENT_2, AGENT_3, AGENT_13, AGENT_14, AGENT_15, AGENT_16)
**Temps :** ~10 minutes (vs 30-35 min séquentiel)
**Status :** ✅ VALIDÉ - Session réussie avec 6 agents, 100% succès
**Métriques :**
- **Agents utilisés :** 6 agents parallèles
- **Taux succès :** 6/6 = 100%
- **Gain temps :** 70% (10 min vs 30-35 min séquentiel)
- **Fichiers créés :** 6 fichiers (3 services, 3 tests)
- **Lignes code :** 3,378 lignes totales
- **Tests :** 81 tests (23 core + 33 permissions + 25 auth/stock)

**Détails Implémentation :**
- **AGENT_2 :** pocWorkflowService.ts (workflow core, 953 lignes, 8-10 min) - Spécialiste Purchase Orders
- **AGENT_13 :** authHelpers.ts (auth helpers, 200 lignes, 3-4 min) - Nouvel agent auth
- **AGENT_3 :** pocStockService.ts complement (fulfillFromStock, +125 lignes, 2-3 min) - Spécialiste Stock
- **AGENT_14 :** pocWorkflowService.core.test.ts (tests, 600 lignes, 4-5 min) - Tests workflow core
- **AGENT_15 :** pocWorkflowService.permissions.test.ts (tests, 800 lignes, 4-5 min) - Tests permissions
- **AGENT_16 :** authHelpers.test.ts (tests, 700 lignes, 3-4 min) - Tests auth et stock

**Stratégie :**
- **Analyse optimisation :** 6 agents justifiés pour complexité Step 2
- **Spécialisation domaines :** AGENT_2 et AGENT_3 continuité Step 1, nouveaux agents pour auth et tests
- **Petits fichiers tests :** Préférence fichiers <300 lignes pour tests (600/800/700 lignes acceptables)
- **Isolation Git worktree :** Utilisée automatiquement par Cursor 2.0

### **Workflow 2 : Diagnostic 3-Agents**
**Usage :** Identification problème avant toute modification
**Agents :** Identification + Dependencies + Documentation
**Temps :** ~30 secondes
**Status :** ⏳ À TESTER (workflow défini, non testé encore)

### **Workflow 3 : Implémentation 3-Approaches**
**Usage :** Tâches complexes avec incertitude architecturale
**Agents :** Conservative + Modular + Integrated
**Temps :** ~3-5 minutes
**Status :** ⏳ À TESTER

### **Workflow 4 : Clôture 3-Agents**
**Usage :** Mise à jour documentation en fin de session
**Agents :** Technical Docs + Feature Tracking + Project Structure
**Temps :** ~2-3 minutes
**Status :** ⏳ À TESTER

### **Workflow 5 : Tests Parallèles**
**Usage :** Validation qualité pré-déploiement
**Agents :** Unit Tests + Integration Tests + E2E Tests
**Temps :** ~5 minutes
**Status :** ⏳ À TESTER

---

## ⚙️ CONFIGURATION SYSTÈME

### **Machine de Joel**

```
OS : Windows 10/11
Cursor Version : 2.0
Workspace : D:/bazarkely-2
Plan : Pro Plan (Rampolo Nosy)
```

### **Recommandations Système**

```
RAM : 16GB minimum (32GB recommandé pour 6 agents)
CPU : 4 cores minimum (8+ cores recommandé)
Disque : 10-20GB libres pour Git worktrees
Connexion : Stable (Composer nécessite API calls)
```

---

## 📊 OPTIMISATION PERFORMANCE

### **Configuration Actuelle**

```
✅ Max agents : 6 (suffisant pour tous les workflows)
✅ Auto-Clear Chat : ON (évite surcharge mémoire)
✅ Queue Messages : Immediate (réactivité maximale)
✅ Composer 1 : Activé (vitesse optimale)
```

### **Stratégies d'Optimisation**

**1. Limiter agents actifs simultanés**
- Standard : 3 agents (optimal qualité/performance)
- Complexe : 4-5 agents (si nécessaire)
- Maximum : 6 agents (workflows exceptionnels)

**2. Choisir modèle adapté**
- Composer 1 : Tâches 90% (rapide)
- Sonnet 4.5 : 10% tâches complexes (précis)

**3. Nettoyer workspace régulièrement**
- Git worktrees cleanup automatique (Cursor 2.0)
- Vérifier espace disque disponible
- Fermer agents terminés

---

## 🐛 TROUBLESHOOTING

### **Problème 1 : Agents ne démarrent pas**

```
🔧 SOLUTION :
1. Vérifier Settings → Agents → Max Tab Count (doit être >1)
2. Redémarrer Cursor
3. Vérifier espace disque disponible
4. Consulter logs : Help → Show Logs
```

### **Problème 2 : Composer Model lent**

```
🔧 SOLUTION :
1. Vérifier connexion internet stable
2. Fallback temporaire sur Sonnet 4.5
3. Vérifier status.cursor.com pour incidents
4. Réduire taille contexte si codebase très large
```

### **Problème 3 : Max Tab Count dépassé**

```
🔧 SOLUTION :
1. Fermer agents terminés (X sur chaque agent)
2. Augmenter Max Tab Count dans Settings → Agents
3. Attendre qu'un agent termine avant d'en lancer un nouveau
```

### **Problème 4 : Git worktrees conflicts**

```
🔧 SOLUTION :
1. Nettoyer manuellement : git worktree prune (dans PowerShell)
2. Vérifier D:/bazarkely-2/.git/worktrees/ pour orphelins
3. Redémarrer Cursor pour réinitialisation
```

---

## 🔍 RÈGLES DE DÉBOGAGE POST-MODIFICATION (Session 2025-12-03)

### **Règle 1 : Toujours vérifier le cache navigateur**

Après toute modification Cursor, faire **Ctrl+Shift+R** (Hard Refresh) dans le navigateur pour éviter d'exécuter du code en cache.

**Symptôme :** Comportement inchangé malgré modifications confirmées par Cursor  
**Solution :** Hard Refresh navigateur (Ctrl+Shift+R) avant de diagnostiquer problème

### **Règle 2 : Vérifier que Cursor a RÉELLEMENT sauvegardé**

- **Symptôme :** Cursor dit "modification appliquée" mais comportement inchangé
- **Action :** Ouvrir le fichier dans Cursor → Ctrl+S → Vérifier visuellement le code
- **Note :** Cursor peut parfois signaler une modification réussie sans l'avoir écrite sur disque

**Pattern de vérification :**
```
1. Cursor indique "modification appliquée"
2. Ouvrir fichier dans Cursor
3. Ctrl+S (forcer sauvegarde)
4. Vérifier visuellement que le code correspond aux modifications attendues
5. Si code incorrect → Refaire modification
```

### **Règle 3 : Comparer numéros de lignes console vs code**

- Si console affiche "ligne X" mais code montre "ligne Y" avec écart >5 lignes
- **Cause probable :** Cache navigateur OU fichier non sauvegardé
- **Solution :** Redémarrer `npm run dev` + Hard Refresh navigateur

**Diagnostic :**
```
Console : "Erreur ligne 150"
Code actuel : Fonction à ligne 145
Écart : 5 lignes → Cache navigateur probable
Action : Redémarrer dev server + Hard Refresh
```

### **Règle 4 : Diagnostic fichiers multiples AVANT correction**

Pour tout composant partagé entre modules (Header, Footer, Layout, etc.):

```powershell
Get-ChildItem -Path "C:\bazarkely-2" -Recurse -Filter "NomComposant.tsx" -File
```

**Identifier QUEL fichier est importé par l'app principale avant de modifier.**

**Pattern de diagnostic :**
```
1. Rechercher tous fichiers avec même nom (Get-ChildItem)
2. Identifier fichier importé dans AppLayout.tsx ou index.tsx principal
3. Vérifier imports relatifs dans composants utilisant le composant
4. Modifier SEULEMENT le fichier correct
```

**Exemple Session 2025-12-03 :**
- Header.tsx trouvé dans `frontend/src/components/Layout/Header.tsx`
- Vérifié import dans AppLayout.tsx : `import Header from '../components/Layout/Header'`
- Modification appliquée au bon fichier

### **Règle 5 : Pattern de logging pour handlers de navigation**

```typescript
const handleNavigation = () => {
  console.log('🔧 [ComponentName] Navigation triggered to /path');
  handleMenuClose();
  navigate('/path');
};
```

**Permet de confirmer que le bon handler est exécuté.**

**Avantages :**
- Confirme exécution handler (vs handler non appelé)
- Identifie quel handler est exécuté (si plusieurs handlers similaires)
- Debug navigation issues rapidement
- Pattern réutilisable pour tous handlers navigation

**Exemple Session 2025-12-03 :**
```typescript
const handleSettingsClick = () => {
  console.log('🔧 [Header] Navigation triggered to /settings');
  handleMenuClose();
  navigate('/settings');
};
```

**Résultat :** Console confirme exécution → Navigation fonctionne → Problème résolu

---

## ⌨️ RACCOURCIS CLAVIER ESSENTIELS

### **Multi-Agents**

```
Ctrl + I : Ouvrir nouvel agent
Ctrl + Shift + I : Ouvrir agent en arrière-plan
Ctrl + K : Éditions ciblées (single-agent inline)
```

### **Navigation**

```
Ctrl + P : Recherche fichiers rapide
Ctrl + Shift + F : Recherche globale codebase
Ctrl + T : Recherche symboles
```

### **Agent Control**

```
Ctrl + . : Interrompre agent en cours
Ctrl + Enter : Forcer envoi message immédiat
Alt + Enter : Queue message pour plus tard (si activé)
```

### **Settings & Review**

```
Ctrl + , : Ouvrir Settings
Ctrl + Shift + D : Unified Diff View (si disponible)
```

---

## 📝 CONVENTIONS BAZARKELY

### **Sélection Modèle par Type de Tâche**

```
Composer 1 (Défaut) :
- Diagnostic multi-agents
- Implémentation features standard
- Corrections bugs simples/moyens
- Mise à jour documentation
- Tests automatisés

Sonnet 4.5 (Complexe) :
- Refactoring architectural majeur
- Implémentation features complexes (>200 lignes, 4+ fichiers)
- Décisions architecturales critiques
- Optimisations performance avancées
- Review sécurité complète

GPT-5 Codex (Spécialisé) :
- Patterns React avancés
- Optimisations algorithmes
- Intégrations API complexes

Haiku 4.5 (Ultra-rapide) :
- Typos et corrections <10 lignes
- Formatage code
- Ajustements CSS mineurs
```

### **Workflows Multi-Agents Recommandés**

```
3 agents = Standard (diagnostic, implémentation moyenne, clôture)
4 agents = Complexe (implémentation + review)
5 agents = Très complexe (implémentation + tests + review)
6 agents = Exceptionnel (pipeline complet avec exploration parallèle)
```

---

## 🔄 HISTORIQUE CONFIGURATION

### **2025-10-31 - Configuration Initiale + Première Session Multi-Agents**
- ✅ Cursor 2.0 installé et validé
- ✅ Multi-agents configuré (max 6)
- ✅ Tous modèles premium activés
- ✅ Agent Autocomplete activé
- ✅ Auto-Clear Chat activé
- ✅ Configuration optimale confirmée
- ✅ **Première session multi-agents réussie :** 3 features développées en parallèle
- ✅ **Workflow validé :** Implémentation 3-Features Parallèles
- ✅ **Scripts automation :** setup-multiagent-test.ps1 et cleanup-worktrees.ps1 créés
- ✅ **Documentation complète :** MULTI-AGENT-WORKFLOWS.md et RESUME-SESSION-2025-10-31.md créés

### **2025-11-08 - Step 2 Construction POC - Workflow State Machine Implementation**
- ✅ **Session multi-agents 6 agents :** 100% succès (6/6 agents)
- ✅ **Workflow validé :** Step 2 Workflow State Machine Implementation
- ✅ **Gain temps :** 70% (10 min vs 30-35 min séquentiel)
- ✅ **Fichiers créés :** 6 fichiers (3 services, 3 tests)
- ✅ **Lignes code :** 3,378 lignes totales
- ✅ **Tests :** 81 tests (23 core + 33 permissions + 25 auth/stock)
- ✅ **Spécialisation agents :** AGENT_2 et AGENT_3 continuité Step 1, nouveaux agents 13-14-15-16
- ✅ **Analyse optimisation :** 6 agents justifiés pour complexité Step 2

### **2025-11-12 - Phase 2 Construction POC - Organigramme Implementation**
- ✅ **Workflow 1 - Diagnostic 3-agents :** AGENT01 Database Investigation + AGENT02 Workflow Analysis + AGENT03 Frontend Analysis
- ✅ **Workflow 2 - Implementation 3-agents :** AGENT01 Database Modifications + AGENT02 Workflow Modifications + AGENT03 Frontend Modifications
- ✅ **Workflow 3 - Documentation 3-agents :** AGENT01 Technical Docs + AGENT02 Feature Tracking + AGENT03 Structure & New Docs
- ✅ **Total agents utilisés :** 9 agents (3 workflows × 3 agents)
- ✅ **Taux succès :** 100% (tous agents complétés après corrections schéma)
- ✅ **Gain temps estimé :** 60-70% vs approche séquentielle
- ✅ **Leçons apprises :** Investigation schéma obligatoire avant scripts SQL, approche step-by-step meilleure que scripts monolithiques
- ✅ **Git worktrees isolation :** Réussie sur tous les agents
- ✅ **Résultats :** 10 org_units créées, 27 Purchase Orders restaurées, fonctionnalité BCI/BCE implémentée

### **2025-11-12 - Phase 3 Construction POC - Security Foundations**
- ✅ **Workflow 1 - Diagnostic 3-agents parallèles :** AGENT01 Service Analysis + AGENT02 Security Analysis + AGENT03 Frontend Analysis
- ✅ **Workflow 2 - Backend fix single-agent :** AGENT04 Backend Fix (pocPurchaseOrderService)
- ✅ **Workflow 3 - Fondations 4-agents parallèles :** AGENT05 Database + AGENT06 Price Threshold + AGENT07 Consumption Plan + AGENT08 Alert Service
- ✅ **Workflow 4 - Intégration UI 4-agents parallèles :** AGENT09 Form + AGENT10 List + AGENT11 Detail + AGENT12 Dashboard
- ✅ **Total agents utilisés :** 9 agents (3 diag + 1 backend + 4 fondations + 4 intégration - AGENT12 est ce document)
- ✅ **Taux succès :** 100% (9/9 agents complétés)
- ✅ **Temps total :** ~4h (vs ~12h séquentiel estimé)
- ✅ **Gain temps :** 65-70% vs approche séquentielle
- ✅ **Isolation :** 100% (Git worktrees, 0 conflit)
- ✅ **Résultats :** 8 nouveaux fichiers créés (1 migration, 4 services, 3 components), 5 fichiers modifiés (pocPurchaseOrderService + 4 pages), 2 index.ts mis à jour

### **Métriques Performance Phase 3**
- **Agents lancés :** 9 (3 diag + 1 backend + 4 fondations + 4 intégration)
- **Taux succès :** 100% (9/9)
- **Temps total :** ~4h (vs ~12h séquentiel)
- **Gain temps :** 65-70%
- **Isolation :** 100% (Git worktrees, 0 conflit)

### **Métriques Performance Multi-Agents - Session 2025-11-14 PM**
- **Workflows lancés :** 1 (Diagnostic 3-agents parallèles)
- **Gain de temps :** 90% (2 minutes vs 20 minutes séquentiel)
- **Agents parallèles max :** 3 simultanés
- **Qualité sorties :** Excellent (3/3 agents successful, 2 bugs identifiés et corrigés + 1 analyse UX complète)
- **Taux succès :** 100% (3/3 agents complétés avec succès)
- **Isolation :** 100% (Git worktrees automatiques, 0 conflit)

### **Métriques Performance Multi-Agents - Session 2025-11-15**
- **Workflows lancés :** 4 (Diagnostic Smart Defaults + VAGUE 1 Quick Wins + VAGUE 2 Alignement Traditionnel + PM Iterative Cleanup)
- **Agents exécutions totales :** 8 (AGENT09: 3x, AGENT10: 1x, AGENT11: 2x, AGENT12: 2x)
- **Gain de temps VAGUE 1 :** 60-70% (30-60 min vs 90-120 min séquentiel)
- **Gain de temps VAGUE 2 :** 60-65% (90 min vs 240 min séquentiel)
- **PM Session :** 8 corrections itératives (~2-3h avec cycles feedback utilisateur)
- **Agents parallèles max :** 3 simultanés (VAGUE 1 et VAGUE 2)
- **Qualité sorties :** Excellent (8/8 agents successful, 100% succès)
- **Taux succès :** 100% (8/8 agents complétés avec succès)
- **Bugs résolus :** Header budget banner + WorkflowAction import + 19+ ServiceResult fixes + 8 Header cleanup corrections
- **UX améliorations :** -33% hauteur formulaire, -75% temps ajout article, 7 badges feedback, sections collapsibles, Header Construction clean
- **Isolation :** 100% (Git worktrees automatiques, 0 conflit)
- **Git commit :** ❌ Pas de commit (utilisateur veut plus de corrections pages avant validation)

### **Leçons Apprises Phase 3**
- ✅ **TOUJOURS diagnostic multi-agents AVANT implémentation** - Économise 65-70% temps vs séquentiel
- ✅ **TOUJOURS inclure Composer Model + Browser Tool + Unified Diff View dans prompts** - Accélère exécution et review
- ✅ **Multi-agents parallèles optimal pour >200 lignes ou >3 fichiers** - Justifie overhead coordination
- ✅ **Git worktrees isolation production-ready** - 0 conflit même avec 9 agents simultanés

### **Bonnes Pratiques Multi-Agents**

**1. Diagnostic Multi-Agents pour Bugs Critiques**
- ✅ **Pour erreurs runtime production avec logs console :** Utiliser workflow diagnostic 3-agents parallèles (Code Bug Analysis + Database Schema + UX Analysis)
- ✅ **Gain temps :** 90% vs approche séquentielle (2 min vs 20 min)
- ✅ **Agents spécialisés :** Chaque agent analyse domaine spécifique (code, database, UX) en parallèle

**2. Patterns de Code et Prévention Récurrence**
- ✅ **Lors correction bugs TypeScript/imports :** Rechercher patterns similaires dans autres fichiers pour prévenir récurrence
- ✅ **Agent Code Bug Analysis :** Peut identifier patterns problématiques dans codebase complète
- ✅ **Documentation patterns :** Documenter patterns identifiés pour référence future

**3. Workflow Diagnostic Optimal**
- ✅ **3 agents parallèles :** Optimal pour diagnostic bugs (Code + Database + UX)
- ✅ **Temps d'exécution :** ~2 minutes pour diagnostic complet vs ~20 minutes séquentiel
- ✅ **Qualité sorties :** Excellent avec spécialisation domaines

**4. Isolation et Conflits**
- ✅ **Git worktrees automatiques :** Cursor 2.0 gère isolation automatiquement
- ✅ **0 conflit :** Même avec 3+ agents simultanés sur fichiers différents
- ✅ **Production-ready :** Workflow validé pour bugs critiques production

**5. Diagnostic Multi-Agents MANDATORY Avant Implémentations Complexes**
- ✅ **Pour implémentations >200 lignes ou >3 fichiers :** TOUJOURS lancer diagnostic 3-agents parallèles AVANT développement
- ✅ **Gain temps :** 80-90% vs approche séquentielle
- ✅ **Qualité :** Identification complète injection points, dépendances, edge cases avant code
- ✅ **Exemple session 2025-11-15 :** Diagnostic 30s → Implémentation smart defaults 5-10min avec 0 régression

**6. SQL Migrations - AppBuildEXPERT Direct Creation**
- ✅ **Scripts SQL migrations :** TOUJOURS créés directement par AppBuildEXPERT, jamais délégués à Cursor
- ✅ **Raison :** Contrôle qualité, vérification syntaxe, tests avant exécution
- ✅ **Pattern :** Diagnostic agents → Recommandations → AppBuildEXPERT crée migration → Exécution manuelle
- ✅ **Exemple session 2025-11-15 :** Migration `20251115120000_make_supplier_company_id_nullable.sql` créée directement

**7. Workflows Multi-Vagues pour Transformations UX Majeures**
- ✅ **Pattern validé :** VAGUE 1 (Quick Wins) → VAGUE 2 (Transformation majeure)
- ✅ **VAGUE 1 :** Améliorations rapides, LOW risque, HIGH impact immédiat (60-70% gain temps)
- ✅ **VAGUE 2 :** Transformations structurelles, MEDIUM risque, HIGH impact long terme (60-65% gain temps)
- ✅ **Agents spécialisés :** AGENT09 (Form/Header), AGENT10 (List), AGENT11 (Detail/Form), AGENT12 (Dashboard/UX)
- ✅ **Exemple session 2025-11-15 :** VAGUE 1 (30-60 min) → VAGUE 2 (90 min) = Transformation complète en 2 heures vs 5-6 heures séquentiel

**8. Agent Specializations Validated**
- ✅ **AGENT09 - Form Integration + Header Fix :** Spécialisé intégration formulaire et corrections Header (validé: bug fix + 8 corrections itératives PM session)
- ✅ **AGENT10 - List Integration + Import Fix :** Spécialisé listes et corrections imports TypeScript
- ✅ **AGENT11 - Detail Integration + Inline Search :** Spécialisé pages détail et recherche inline
- ✅ **AGENT12 - Dashboard/UX + Layout Transformation :** Spécialisé dashboard, UX, transformations layout

**9. Iterative User-Feedback Workflow Pattern**
- ✅ **Pattern validé :** Corrections itératives basées sur feedback utilisateur visuel
- ✅ **Approche :** Fix → User test → Identify issue → Fix again (cycle répété)
- ✅ **Avantage :** Multiple petites corrections > une grande modification (meilleure détection problèmes)
- ✅ **Exemple PM session 2025-11-15 :** 8 corrections successives Header.tsx avec cycles feedback
- ⚠️ **Note :** Satisfaction utilisateur nécessite tests toutes pages, pas seulement composant isolé

**10. Session S37 - Phase B Goals Deadline Sync (2026-01-07)**
- ✅ **Workflow Multi-Agents Diagnostic:** 3 agents parallèles (Agent 1: Database Schema, Agent 2: Dependencies, Agent 3: UI Patterns)
- ✅ **Objectif:** Analyser et implémenter synchronisation automatique deadline ↔ requiredMonthlyContribution
- ✅ **Résultats:** 6 gaps identifiés et résolus, 6 fichiers modifiés, fonctionnalité complète déployée v2.5.0
- ✅ **Documentation:** 15 fichiers d'analyse organisés dans docs/agent-analysis/ (6 catégories)
- ✅ **Structure:** Organisation complète des analyses multi-agents par catégorie (architecture, calculations, data-models, lifecycle, services, ui)
- ✅ **Scripts:** archive-agent-files.ps1 créé pour archivage automatique des analyses
- ✅ **Gain temps:** Diagnostic complet en ~30 minutes vs ~2 heures séquentiel (75% gain)
- ✅ **Qualité:** Documentation complète avec analyses détaillées par domaine

### **Prochaines Mises à Jour**
- Optimisations workflows selon retours d'expérience Phase B
- Validation workflows implémentation 3-approaches
- Test workflow clôture 3-agents (mise à jour documentation)
- Test workflow tests parallèles (validation qualité)

---

## 📞 SUPPORT

### **Ressources Cursor**

- **Documentation officielle :** https://docs.cursor.com
- **Status page :** https://status.cursor.com
- **Changelog :** https://cursor.com/changelog
- **Features :** https://cursor.com/features

### **Ressources BazarKELY**

- **Instructions Prompts V2.0 :** /mnt/project/ (Instructions custom Claude)
- **README.md :** D:/bazarkely-2/README.md
- **Config Projet :** D:/bazarkely-2/CONFIG-PROJET.md
- **Workflows Multi-Agents :** D:/bazarkely-2/MULTI-AGENT-WORKFLOWS.md

---

## ✅ CHECKLIST VALIDATION COMPLÈTE

```
Configuration Cursor 2.0 :
✅ Version 2.0 confirmée
✅ Interface Agent-Centric activée
✅ Multi-agents parallèles : 6 max configurés
✅ Composer Model : Activé et disponible
✅ Claude Sonnet 4.5 : Activé et disponible
✅ Agent Autocomplete : Activé
✅ Auto-Clear Chat : Activé
✅ Queue Messages : Send immediately
✅ Settings accessibles et configurés

Prêt pour Production :
✅ Configuration validée et documentée
✅ Modèles premium disponibles
✅ Workflows multi-agents définis
✅ Premier workflow validé (Implémentation 3-Features Parallèles)
✅ Scripts automation créés
✅ Documentation workflows complète

Première Session Multi-Agents :
✅ 3 features développées en parallèle (fix-filter + loading + export)
✅ 3 conflits résolus avec succès
✅ 4/4 tests réussis
✅ Déploiement production réussi
✅ Gain temps : 43% vs séquentiel

Prochaines Étapes :
→ Test workflow diagnostic 3-agents (déjà défini)
→ Test workflow implémentation 3-approaches
→ Test workflow clôture 3-agents (mise à jour documentation)
→ Optimisations workflows selon retours d'expérience
```

---

**🎉 CONFIGURATION CURSOR 2.0 OPTIMALE - BAZARKELY AVEC PREMIÈRE SESSION MULTI-AGENTS RÉUSSIE !**

---

*Document généré le 31 octobre 2025 - BazarKELY v3.0*  
*Dernière mise à jour le 14 novembre 2025 - BazarKELY v3.5*  
*Configuration basée sur screenshots Settings fournis par Joel*  
*Première session multi-agents validée : 3 features en parallèle, 43% gain temps*  
*Workflow "Implémentation 3-Features Parallèles" validé et documenté*  
*Phase 2 Construction POC : 3 workflows validés (Diagnostic + Implementation + Documentation), 9 agents utilisés, 100% succès*  
*Phase 3 Construction POC : 4 workflows validés (Diagnostic + Backend Fix + Fondations + Intégration UI), 9 agents utilisés, 100% succès, 65-70% gain temps*  
*Session 2025-11-14 PM : Workflow "Bug Diagnostic 3-Agents Parallel" validé, 90% gain temps (2 min vs 20 min séquentiel), 3/3 agents successful*  
*Session 2025-11-15 : 4 workflows validés (Smart Defaults Diagnostic + VAGUE 1 Quick Wins + VAGUE 2 Alignement Traditionnel + PM Iterative Cleanup), 8 agents exécutés (100% succès), 60-70% gain temps, UX transformation complète + Header Construction clean (8 corrections itératives)*  
*Session S37 2026-01-07 : Phase B Goals Deadline Sync complétée, 3 agents parallèles diagnostic, 6 gaps résolus, 15 analyses documentées, structure docs/agent-analysis/ créée, v2.5.0 déployée*
