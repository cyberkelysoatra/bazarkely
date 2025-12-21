# 🚨 RÈGLE CRITIQUE - ASSIGNATION AGENTS BAZARKELY

**Date création :** 2025-11-15  
**Priorité :** ABSOLUE - À CONSULTER AVANT TOUT WORKFLOW MULTI-AGENTS  
**Status :** RÈGLE PERMANENTE NON-NÉGOCIABLE

---

## ⚠️ RÈGLE ABSOLUE

### ❌ INTERDIT

**JAMAIS inventer des agents arbitraires comme "AGENT A", "AGENT B", "AGENT C"**

Ces labels sont génériques et ne correspondent PAS à l'architecture agents établie dans BazarKELY.

### ✅ OBLIGATOIRE

**TOUJOURS utiliser les agents existants numérotés : AGENT01, AGENT02, AGENT03, ... AGENT12+**

Ces agents sont documentés dans `CURSOR-2.0-CONFIG.md` et `MULTI-AGENT-WORKFLOWS.md` avec leurs spécialisations précises.

---

## 📚 PROCÉDURE OBLIGATOIRE

### AVANT TOUTE ASSIGNATION D'AGENTS :

```
1. ✅ Consulter project_knowledge_search avec requête : "AGENT01 AGENT02 agents coordination"
2. ✅ Lire CURSOR-2.0-CONFIG.md section "Workflows Multi-Agents Validés"
3. ✅ Identifier spécialisation de chaque agent existant
4. ✅ Assigner agents selon expertise documentée
5. ✅ Utiliser numérotation existante (AGENT01-12+)
```

### SI NOUVEL AGENT NÉCESSAIRE :

```
1. ✅ Identifier le prochain numéro disponible (ex: AGENT13)
2. ✅ Documenter la spécialisation du nouvel agent
3. ✅ Ajouter dans CURSOR-2.0-CONFIG.md
4. ✅ Utiliser ce numéro de manière cohérente dans la session
```

---

## 🗂️ AGENTS EXISTANTS BAZARKELY

### **BACKEND/DATABASE (AGENT01-04)**

#### **AGENT01 - Database Investigation/Modifications**
- **Spécialisation :** Schéma database, tables, colonnes, contraintes, ENUMs
- **Usage typique :** Investigation schéma, création tables, migrations SQL
- **Fichiers :** Scripts SQL, schémas database
- **Sessions validées :** Phase 2 Organigramme (Diagnostic + Implementation)

#### **AGENT02 - Workflow Analysis/Modifications**
- **Spécialisation :** Logique workflow, transitions états, validation conditionnelle
- **Usage typique :** Analyse workflow, implémentation state machine
- **Fichiers :** Services workflow, validation business logic
- **Sessions validées :** Phase 2 Organigramme, Step 2 Workflow State Machine

#### **AGENT03 - Frontend Analysis**
- **Spécialisation :** Composants impactés, UI conditionnelle, intégration frontend
- **Usage typique :** Analyse impact UI, identification composants à modifier
- **Fichiers :** Composants React, pages frontend
- **Sessions validées :** Phase 2 Organigramme (Diagnostic)

#### **AGENT04 - Backend Fix**
- **Spécialisation :** Corrections services backend
- **Usage typique :** Fix bugs services, ajout support features
- **Fichiers :** Services TypeScript backend
- **Sessions validées :** Phase 3 Security (Backend Fix Single-Agent)

---

### **SQL (AGENT05)**

#### **AGENT05 - SQL Scripts**
- **Spécialisation :** Scripts SQL purs (tables, fonctions, vues, RLS, data)
- **Usage typique :** Création scripts migration, insertion données test
- **Fichiers :** Fichiers .sql
- **Sessions validées :** Multiples sessions migrations

---

### **SERVICES (AGENT06-08)**

#### **AGENT06 - Service Integration**
- **Spécialisation :** Intégration services, orchestration
- **Usage typique :** Intégration nouveaux services, coordination multi-services
- **Fichiers :** Services TypeScript, index.ts exports
- **Sessions validées :** Phase 3 Security

#### **AGENT07 - Service Implementation**
- **Spécialisation :** Implémentation logique métier services
- **Usage typique :** Création nouveaux services, logique business complexe
- **Fichiers :** Services TypeScript
- **Sessions validées :** Step 2 Workflow Implementation

#### **AGENT08 - Service Testing**
- **Spécialisation :** Tests services, test coverage
- **Usage typique :** Création suites tests, validation comportement services
- **Fichiers :** Fichiers .test.ts
- **Sessions validées :** Step 2 Workflow Implementation

---

### **FRONTEND/UI (AGENT09-12)**

#### **AGENT09 - Form Integration**
- **Spécialisation :** Formulaires, PurchaseOrderForm.tsx
- **Usage typique :** Intégration features dans formulaires, validation UI
- **Fichiers :** PurchaseOrderForm.tsx, composants formulaires
- **Sessions validées :** Phase 3 Security (4-Agents Frontend Integration)

#### **AGENT10 - List Integration**
- **Spécialisation :** Listes, POCOrdersList.tsx
- **Usage typique :** Affichage listes, filtres, price masking
- **Fichiers :** POCOrdersList.tsx, composants listes
- **Sessions validées :** Phase 3 Security (4-Agents Frontend Integration)

#### **AGENT11 - Detail Integration**
- **Spécialisation :** Pages détail, OrderDetailPage.tsx
- **Usage typique :** Affichage détails entités, comprehensive masking
- **Fichiers :** OrderDetailPage.tsx, pages détail
- **Sessions validées :** Phase 3 Security (4-Agents Frontend Integration)

#### **AGENT12 - Dashboard Integration**
- **Spécialisation :** Dashboards, POCDashboard.tsx, widgets UX
- **Usage typique :** Intégration dashboards, widgets, alertes
- **Fichiers :** POCDashboard.tsx, composants dashboard
- **Sessions validées :** Phase 3 Security (4-Agents Frontend Integration)

---

### **AUTRES (AGENT13+)**

#### **AGENT13-16** (Step 2 Workflow Implementation)
- **AGENT13 :** Workflow Core Service
- **AGENT14 :** Workflow Permission Service  
- **AGENT15 :** Workflow Authentication Service
- **AGENT16 :** Stock Validation Service

**Note :** Numéros 13+ disponibles pour nouvelles spécialisations selon besoins futurs

---

## 🎯 MATRICE DE DÉCISION RAPIDE

### Besoin = Fix Header Bug
→ **AGENT09** (Form/UI Integration)

### Besoin = Réorganiser formulaire
→ **AGENT11** (Detail Integration / Structure)

### Besoin = Collapsibles + UX
→ **AGENT12** (Dashboard/UX Integration)

### Besoin = Investigation database
→ **AGENT01** (Database Investigation)

### Besoin = Analyse workflow
→ **AGENT02** (Workflow Analysis)

### Besoin = Scripts SQL
→ **AGENT05** (SQL Scripts)

### Besoin = Nouveau service
→ **AGENT07** (Service Implementation)

### Besoin = Tests services
→ **AGENT08** (Service Testing)

---

## 🚨 RAPPEL CRITIQUE

### Quand AppBuildEXPERT propose un workflow multi-agents :

```
✅ BON EXEMPLE :
"Lance ces 3 prompts en parallèle :
- AGENT09 : Fix Header Bug
- AGENT11 : Réorganiser PurchaseOrderForm  
- AGENT12 : Collapsibles + Visual Feedback"

❌ MAUVAIS EXEMPLE :
"Lance ces 3 prompts en parallèle :
- AGENT A : Fix Header Bug
- AGENT B : Réorganiser PurchaseOrderForm
- AGENT C : Collapsibles + Visual Feedback"
```

### Si AppBuildEXPERT utilise AGENT A/B/C :

```
Joel doit IMMÉDIATEMENT corriger :
"Tu as utilisé AGENT A/B/C. Nous avons des agents numérotés existants. 
Utilise AGENT09/11/12 selon leurs spécialisations documentées."
```

---

## 📖 SOURCES DE VÉRITÉ

### Documents de référence (dans C:\bazarkely-2\) :

1. **CURSOR-2.0-CONFIG.md** - Configuration agents, workflows validés
2. **MULTI-AGENT-WORKFLOWS.md** - Historique sessions multi-agents
3. **IP11-COORDINATION-MULTI-AGENTS.md** - Coordination inter-agents

### Consultation systématique via :

```
project_knowledge_search avec requêtes :
- "AGENT01 AGENT02 agents"
- "CURSOR-2.0-CONFIG workflows"
- "MULTI-AGENT-WORKFLOWS sessions"
```

---

## ✅ CHECKLIST VALIDATION

Avant de proposer un workflow multi-agents à Joel :

```
▢ J'ai consulté project_knowledge pour identifier agents existants
▢ J'ai lu CURSOR-2.0-CONFIG.md section workflows
▢ J'ai assigné agents selon leurs spécialisations documentées
▢ J'utilise AGENT01-12+ (pas AGENT A/B/C)
▢ J'ai justifié le choix de chaque agent
▢ Si nouvel agent, j'ai documenté sa spécialisation
```

---

## 🎓 EXEMPLES CONCRETS

### **VAGUE 1 - Quick Wins (Session actuelle)**

```
✅ CORRECT :
AGENT09 : Fix Header Bug (spécialisation Form/UI Integration)
AGENT11 : Réorganiser PurchaseOrderForm (spécialisation Detail/Structure)
AGENT12 : Collapsibles + Visual Feedback (spécialisation Dashboard/UX)

❌ INCORRECT :
AGENT A : Fix Header Bug
AGENT B : Réorganiser PurchaseOrderForm
AGENT C : Collapsibles + Visual Feedback
```

### **Phase 2 - Organigramme Implementation**

```
✅ CORRECT (réel, validé) :
AGENT01 : Database Modifications (tables, colonnes, données)
AGENT02 : Workflow Modifications (helpers org_unit, validation)
AGENT03 : Frontend Modifications (formulaires, listes, affichage)

❌ INCORRECT :
AGENT X : Database Modifications
AGENT Y : Workflow Modifications
AGENT Z : Frontend Modifications
```

---

## 🔒 ENGAGEMENT

**AppBuildEXPERT s'engage à :**

1. ✅ Consulter systématiquement `project_knowledge_search` avant assignation agents
2. ✅ Utiliser UNIQUEMENT agents numérotés existants (AGENT01-12+)
3. ✅ Documenter tout nouvel agent créé avec numéro suivant disponible
4. ✅ Justifier choix agents basé sur spécialisations documentées
5. ✅ JAMAIS utiliser labels arbitraires (AGENT A/B/C)

**Cette règle est ABSOLUE et NON-NÉGOCIABLE.**

---

**Document créé le :** 2025-11-15  
**Dernière mise à jour :** 2025-12-21  
**Version :** 1.1  
**Statut :** RÈGLE PERMANENTE ACTIVE

---

## 📞 SI CETTE RÈGLE EST VIOLÉE

Joel peut immédiatement interrompre AppBuildEXPERT avec :

```
"STOP - Tu as violé la règle AGENT-ASSIGNMENT-REFERENCE. 
Consulte le document et corrige avec agents existants."
```

AppBuildEXPERT doit alors :
1. S'excuser
2. Consulter project_knowledge_search
3. Ré-assigner avec agents corrects numérotés
4. Fournir prompts corrigés
