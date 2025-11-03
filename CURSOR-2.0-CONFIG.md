# CURSOR 2.0 CONFIGURATION - BazarKELY

**Date de création :** 31 octobre 2025  
**Dernière mise à jour :** 31 octobre 2025  
**Version Cursor :** 2.0  
**Projet :** BazarKELY - Application PWA Gestion Budget Familial  
**Utilisateur :** Joel Soatra (Rampolo Nosy - Pro Plan)

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

### **Prochaines Mises à Jour**
- Test workflow diagnostic 3-agents (déjà défini dans MULTI-AGENT-WORKFLOWS.md)
- Validation workflows implémentation 3-approaches
- Test workflow clôture 3-agents (mise à jour documentation)
- Test workflow tests parallèles (validation qualité)
- Optimisations workflows selon retours d'expérience

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
*Configuration basée sur screenshots Settings fournis par Joel*  
*Première session multi-agents validée : 3 features en parallèle, 43% gain temps*  
*Workflow "Implémentation 3-Features Parallèles" validé et documenté*
