# MULTI-AGENT WORKFLOWS - BazarKELY

**Date de création :** 31 octobre 2025  
**Dernière mise à jour :** 31 octobre 2025  
**Projet :** BazarKELY - Application PWA Gestion Budget Familial  
**Cursor Version :** 2.0  
**Max Agents Parallèles :** 6

---

## 📋 TABLE DES MATIÈRES

- [Introduction](#introduction)
- [Workflows Validés](#workflows-validés)
- [Workflows En Test](#workflows-en-test)
- [Workflows Planifiés](#workflows-planifiés)
- [Métriques Performance](#métriques-performance)
- [Best Practices](#best-practices)
- [Historique Sessions](#historique-sessions)

---

## 🎯 INTRODUCTION

Ce document maintient l'historique complet de tous les workflows multi-agents testés, validés et optimisés pour le projet BazarKELY. Chaque workflow documenté inclut :

- **Description** : Objectif et cas d'usage
- **Agents** : Rôles et responsabilités de chaque agent
- **Prompts** : Templates prompts validés
- **Métriques** : Temps d'exécution, qualité résultats
- **Retour d'expérience** : Leçons apprises, optimisations

### **Conventions Notation**

```
✅ VALIDÉ : Workflow testé avec succès, production-ready
⏳ EN TEST : Workflow en cours de validation
🔄 EN RÉVISION : Workflow validé mais nécessite optimisations
❌ ABANDONNÉ : Workflow testé mais non retenu
📋 PLANIFIÉ : Workflow défini mais pas encore testé
```

---

## ✅ WORKFLOWS VALIDÉS

### **Aucun workflow validé pour l'instant**

Les workflows seront ajoutés ici après tests et validation réussie.

**Premier test prévu :** Workflow Diagnostic 3-Agents sur bug filtrage transactions (2025-10-31)

---

## ⏳ WORKFLOWS EN TEST

### **WORKFLOW 1 : DIAGNOSTIC 3-AGENTS**

**Status :** ⏳ EN TEST  
**Date test prévu :** 31 octobre 2025  
**Objectif :** Diagnostic complet problème avant toute modification  
**Complexité :** Moyenne  
**Temps estimé :** 30 secondes - 1 minute

#### **Description**

Lancement de 3 agents parallèles pour analyser un problème sous 3 angles complémentaires : identification composant, analyse dépendances, vérification documentation. Permet diagnostic exhaustif en <1 minute vs 3-5 minutes en séquentiel.

#### **Composition Agents**

| Agent | Rôle | Modèle | Temps |
|-------|------|--------|-------|
| **Agent 1** | Component Identification | Composer 1 | ~20s |
| **Agent 2** | Dependency & Impact Analysis | Composer 1 | ~25s |
| **Agent 3** | Documentation Verification | Composer 1 | ~20s |

#### **Workflow Détaillé**

```
1. Clarification avec utilisateur (3-5 questions OUI/NON)
2. Lancement simultané des 3 agents
3. Attente résultats (~30 secondes)
4. Synthèse et analyse consolidée
5. Recommandation stratégie implémentation
```

#### **Templates Prompts**

**Agent 1 - Component Identification** :
```
CONTEXT: User reported issue with [DESCRIPTION]. Project: BazarKELY (React + TypeScript + Supabase). Multi-agent diagnostic session - Agent 1 focuses on component identification.

OBJECTIVE: IDENTIFY PRECISELY the component in question. Search for [SPECIFIC_IDENTIFIERS]. Locate exact file path, component name, all dependencies.

CONSTRAINTS:
- Work in isolated Git worktree (automatic in Cursor 2.0)
- READ-ONLY analysis, DO NOT modify files
- Search directories: frontend/src/components/, frontend/src/pages/, frontend/src/services/
- Use Composer model for fast semantic search

OUTPUT FORMAT:
1. COMPONENT IDENTIFICATION: File path + component name
2. CODE LOCATION: Line numbers
3. CURRENT IMPLEMENTATION: Code snippets (max 20 lines)
4. DEPENDENCIES: Imported modules + related files
5. STATE MANAGEMENT: State handling code
6. RELATED COMPONENTS: Connected functionality

TESTING: Verify codebase searched thoroughly, actual code found, dependencies identified.

AGENT 1 SIGNATURE: Report "AGENT-1-IDENTIFICATION-COMPLETE" at end.
```

**Agent 2 - Dependency & Impact Analysis** :
```
CONTEXT: User reported issue with [DESCRIPTION]. Project: BazarKELY. Multi-agent diagnostic session - Agent 2 focuses on dependency mapping.

OBJECTIVE: MAP comprehensive dependency tree. Identify all files importing target component. Analyze state flows, props drilling, context usage. Determine modification blast radius.

CONSTRAINTS:
- Work in isolated Git worktree (automatic)
- READ-ONLY analysis
- Codebase-wide semantic search for all references
- Analyze direct + indirect dependencies + runtime dependencies

OUTPUT FORMAT:
1. DIRECT DEPENDENCIES: Files directly importing target
2. INDIRECT DEPENDENCIES: Files depending on direct dependencies
3. STATE MANAGEMENT FLOW: How state flows through components
4. SHARED UTILITIES: Common utilities used
5. IMPACT ZONES: Areas affected by modifications
6. RISK ASSESSMENT: Low/Medium/High risk per dependency

TESTING: Verify codebase-wide search performed, all imports identified, state flows traced, indirect dependencies found.

AGENT 2 SIGNATURE: Report "AGENT-2-DEPENDENCIES-COMPLETE" at end.
```

**Agent 3 - Documentation Verification** :
```
CONTEXT: User reported issue with [DESCRIPTION]. Project: BazarKELY. Multi-agent diagnostic session - Agent 3 focuses on documentation verification.

OBJECTIVE: COMPARE actual code vs project documentation. Verify README.md, FEATURE-MATRIX.md, ETAT-TECHNIQUE-COMPLET.md, GAP-TECHNIQUE-COMPLET.md accuracy. Identify discrepancies. Find outdated docs.

CONSTRAINTS:
- Work in isolated Git worktree (automatic)
- READ-ONLY analysis
- Check docs in D:/bazarkely-2/
- Compare documented architecture vs actual code
- Identify missing documentation + documented but not implemented features

OUTPUT FORMAT:
1. DOCUMENTATION ACCURACY: What matches vs what doesn't
2. MISSING DOCUMENTATION: Features in code but not documented
3. PLANNED NOT IMPLEMENTED: Features in docs but not in code
4. OUTDATED INFORMATION: Documentation needing updates
5. ARCHITECTURE GAPS: Discrepancies in descriptions
6. RECOMMENDATIONS: Priority documentation updates

TESTING: Verify all relevant docs read, compared to actual code, specific gaps identified, recommendations prioritized.

AGENT 3 SIGNATURE: Report "AGENT-3-DOCUMENTATION-COMPLETE" at end.
```

#### **Cas d'Usage BazarKELY**

- Bug filtrage transactions par catégorie
- Problème identification utilisateur
- Interface admin non responsive
- Erreurs navigation entre pages
- Tout problème nécessitant analyse complète avant modification

#### **Métriques Attendues**

```
Temps total : ~30 secondes - 1 minute
Gain vs séquentiel : 60-75%
Qualité diagnostic : Exhaustif (3 angles couverts)
Risque régression : Minimisé (analyse dépendances complète)
```

#### **Notes**

- Premier test prévu sur bug filtrage transactions (session 2025-01-19)
- Résultats à documenter après test
- Optimisations à identifier

---

## 📋 WORKFLOWS PLANIFIÉS

### **WORKFLOW 2 : IMPLÉMENTATION 3-APPROACHES**

**Status :** 📋 PLANIFIÉ  
**Objectif :** Tester 3 stratégies d'implémentation simultanément  
**Agents :** Conservative + Modular + Integrated  
**Temps estimé :** 3-5 minutes  
**Complexité :** Élevée

#### **Description**

Pour tâches complexes avec incertitude architecturale, lancer 3 agents qui implémentent la même fonctionnalité avec 3 approches différentes. L'utilisateur choisit ensuite la meilleure solution après revue.

#### **Composition Agents**

| Agent | Approche | Philosophie |
|-------|----------|-------------|
| **Agent A** | Conservative | Modifications minimales, préservation existant |
| **Agent B** | Modular | Nouveaux composants réutilisables |
| **Agent C** | Integrated | Refactoring structure existante |

#### **Cas d'Usage**

- Nouvelles fonctionnalités majeures (>200 lignes, 4+ fichiers)
- Décisions architecturales critiques
- Refactoring avec plusieurs approches valides
- Incertitude sur meilleure stratégie technique

---

### **WORKFLOW 3 : CLÔTURE 3-AGENTS**

**Status :** 📋 PLANIFIÉ  
**Objectif :** Mise à jour documentation en fin de session  
**Agents :** Technical Docs + Feature Tracking + Project Structure  
**Temps estimé :** 2-3 minutes  
**Complexité :** Moyenne

#### **Description**

Quand >5 fichiers documentation à mettre à jour en fin de session, utiliser 3 agents parallèles pour accélérer clôture de 60-75%.

#### **Composition Agents**

| Agent | Responsabilité | Fichiers |
|-------|---------------|----------|
| **Agent 1** | Technical Docs | README.md, ETAT-TECHNIQUE, GAP-TECHNIQUE |
| **Agent 2** | Feature Tracking | FEATURE-MATRIX, CAHIER-DES-CHARGES |
| **Agent 3** | Project Structure | PROJECT-STRUCTURE-TREE, CURSOR-2.0-CONFIG |

---

### **WORKFLOW 4 : TESTS PARALLÈLES**

**Status :** 📋 PLANIFIÉ  
**Objectif :** Validation qualité complète pré-déploiement  
**Agents :** Unit + Integration + E2E  
**Temps estimé :** 5 minutes  
**Complexité :** Élevée

#### **Description**

Lancer 3 types de tests en parallèle pour validation exhaustive avant déploiement production.

#### **Composition Agents**

| Agent | Type Tests | Outils |
|-------|-----------|--------|
| **Agent A** | Unit Tests | Jest + React Testing Library |
| **Agent B** | Integration Tests | API endpoints + Supabase |
| **Agent C** | E2E Tests | Playwright + scenarios utilisateurs |

---

### **WORKFLOW 5 : REVIEW PARALLÈLE**

**Status :** 📋 PLANIFIÉ  
**Objectif :** Audit qualité multi-axes  
**Agents :** Security + Performance + Code Quality  
**Temps estimé :** 2-3 minutes  
**Complexité :** Moyenne

#### **Description**

Review complète d'un composant ou service existant sous 3 angles : sécurité, performance, qualité code.

#### **Composition Agents**

| Agent | Focus | Analyse |
|-------|-------|---------|
| **Agent A** | Security | XSS, injection, auth, CORS |
| **Agent B** | Performance | Caching, queries, bundles, memoization |
| **Agent C** | Code Quality | Patterns, naming, documentation, DRY |

---

## 📊 MÉTRIQUES PERFORMANCE

### **Statistiques Globales**

```
Workflows testés : 0
Workflows validés : 0
Workflows en révision : 0
Workflows abandonnés : 0

Temps total économisé : 0 minutes
Gain moyen vs séquentiel : N/A
```

### **Métriques par Workflow**

| Workflow | Tests | Succès | Échecs | Temps Moyen | Gain % |
|----------|-------|--------|--------|-------------|--------|
| Diagnostic 3-Agents | 0 | 0 | 0 | N/A | N/A |
| Implémentation 3-Approaches | 0 | 0 | 0 | N/A | N/A |
| Clôture 3-Agents | 0 | 0 | 0 | N/A | N/A |
| Tests Parallèles | 0 | 0 | 0 | N/A | N/A |
| Review Parallèle | 0 | 0 | 0 | N/A | N/A |

---

## 🎓 BEST PRACTICES

### **Général**

- ✅ Toujours clarifier besoin avec 3-5 questions OUI/NON avant diagnostic
- ✅ Limiter à 3-4 agents en pratique (équilibre performance/qualité)
- ✅ Utiliser Composer 1 par défaut (rapide pour 90% tâches)
- ✅ Vérifier espace disque avant workflows complexes (Git worktrees)
- ✅ Documenter résultats immédiatement après test

### **Lancement Agents**

- ✅ Copier-coller chaque prompt dans un agent séparé (Ctrl+I)
- ✅ Lancer tous les agents simultanément (pas séquentiellement)
- ✅ Attendre que TOUS les agents terminent avant synthèse
- ✅ Vérifier signatures agents ("AGENT-X-COMPLETE") en fin de sortie

### **Revue Résultats**

- ✅ Lire sorties des 3 agents avant de choisir une approche
- ✅ Comparer qualité, complétude, cohérence des 3 sorties
- ✅ Identifier zones de consensus et divergences
- ✅ Documenter choix final et justification

### **Optimisation**

- ✅ Fermer agents terminés pour libérer ressources
- ✅ Réutiliser templates prompts validés
- ✅ Adapter complexité workflow à la tâche (pas de sur-engineering)
- ✅ Monitorer temps exécution et ajuster si trop long

---

## 📅 HISTORIQUE SESSIONS

### **2025-10-31 - Configuration Initiale**

**Activités :**
- ✅ Instructions Prompts V2.0 créées et intégrées
- ✅ CURSOR-2.0-CONFIG.md généré avec config réelle
- ✅ MULTI-AGENT-WORKFLOWS.md créé (ce fichier)
- ⏳ Premier test workflow diagnostic 3-agents à venir

**Workflows créés :** 5 workflows définis  
**Workflows testés :** 0  
**Workflows validés :** 0

**Prochaine étape :**
→ Test workflow diagnostic 3-agents sur bug filtrage transactions

---

### **Template Session Future**

```
### **YYYY-MM-DD - [Nom Session]**

**Activités :**
- [Liste activités]

**Workflows testés :**
- Workflow X : [Résultat]
- Workflow Y : [Résultat]

**Workflows validés :**
- Workflow X : ✅ VALIDÉ / ❌ ABANDONNÉ / 🔄 EN RÉVISION

**Métriques :**
- Temps total : X minutes
- Gain vs séquentiel : XX%
- Bugs détectés : X
- Régressions : X (objectif 0)

**Leçons apprises :**
- [Points clés]

**Optimisations identifiées :**
- [Améliorations à apporter]

**Prochaine étape :**
- [Action suivante]
```

---

## 🔄 ÉVOLUTION WORKFLOWS

### **Versioning**

Chaque workflow validé reçoit un numéro de version :

```
v1.0 : Version initiale testée et validée
v1.1 : Optimisations mineures
v1.2 : Ajustements prompts
v2.0 : Refonte majeure workflow
```

### **Cycles d'Amélioration**

```
1. Définition workflow (📋 PLANIFIÉ)
2. Premier test (⏳ EN TEST)
3. Validation ou révision (✅ VALIDÉ / 🔄 EN RÉVISION)
4. Optimisations continues
5. Documentation best practices
```

---

## ✅ CHECKLIST NOUVEAU WORKFLOW

Avant d'ajouter un nouveau workflow dans ce registre :

```
□ Objectif clairement défini
□ Cas d'usage BazarKELY identifiés
□ Composition agents définie (rôles distincts)
□ Templates prompts rédigés
□ Métriques attendues estimées
□ Complexité évaluée (Simple/Moyenne/Élevée)
□ Temps estimé calculé
□ Status initial défini (📋 PLANIFIÉ)
```

Après test réussi d'un workflow :

```
□ Résultats documentés
□ Métriques réelles enregistrées
□ Captures d'écran sauvegardées (si pertinent)
□ Leçons apprises notées
□ Optimisations identifiées
□ Status mis à jour (✅ VALIDÉ)
□ Best practices extraites
□ Template prompt finalisé
```

---

## 📞 NOTES

### **Maintenance Document**

Ce document doit être mis à jour :
- **Après chaque test workflow** : Résultats, métriques
- **Après chaque session multi-agents** : Historique
- **Après optimisations** : Versions workflows
- **Après découvertes** : Best practices

### **Structure Évolutive**

La structure de ce document évoluera avec :
- Nouveaux patterns multi-agents découverts
- Workflows spécifiques BazarKELY validés
- Retours d'expérience accumulés
- Optimisations identifiées

---

**🚀 REGISTRE MULTI-AGENT WORKFLOWS - BAZARKELY**

*Prêt à documenter les premiers workflows validés !*

---

*Document créé le 31 octobre 2025 - BazarKELY v2.9*  
*Prochaine mise à jour après premier test workflow diagnostic 3-agents*  
*Workflows : 0 validés, 1 en test, 4 planifiés*
