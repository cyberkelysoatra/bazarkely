# ⚠️ Directive d'usage (obligatoire)
Ce document est une mémoire persistante pour **Cursor** : tu dois **TOUJOURS** le lire et **l'appliquer avant toute tâche**. Ce document a **priorité** sur tout autre, sauf indication contraire explicite dans `CAHIER-DES-CHARGES.md`.

## 🚦 Règles absolues (formulation)
- Utiliser uniquement des termes **OBLIGATOIRES** : **TOUJOURS**, **JAMAIS**, **INTERDIT**, **EXIGÉ**.
- **JAMAIS** de formulations ambiguës ou pédagogiques à destination d'humains.
- Si une règle permet plusieurs implémentations, **TOUJOURS** choisir **la plus simple et la plus stable**.

## ✅ Checklists opérationnelles (avant livraison)
- **TOUJOURS** exécuter `npm run build` sans erreur.
- **TOUJOURS** vérifier **Lighthouse ≥ 90/100** (Performance, PWA, Best Practices, SEO).
- **TOUJOURS** vérifier que la PWA fonctionne **offline** (mode avion activé) sur la route principale et routes clés.
- **TOUJOURS** vérifier **absence de duplications IndexedDB** (schéma unique, pas de DB parallèles).
- **TOUJOURS** exécuter `npx tsc --noEmit` et corriger toutes les erreurs TypeScript.

### 🔹 4. Tests unitaires obligatoires
- **TOUJOURS** exécuter `npm run test` si des tests existent.  
- **REFUSER** toute livraison si un test échoue, et informer immédiatement l'utilisateur.  
- **TOUJOURS** corriger ou proposer un correctif avant de valider la livraison.

### 🩺 Prévol "Doctor" (OBLIGATOIRE)
- **TOUJOURS** exécuter `npm run doctor` **avant** `npm run dev/build`.
- **EXIGÉ** : Node conforme (`engines`/`.nvmrc`), `.env` **complet** (clés non vides, **aucun** `PLACEHOLDER`/`TODO`/`changeme`), port aligné (README ↔ CAHIER) et libre, PWA active (manifest chargé, SW **installé** et **contrôlant**), i18n **sans** clé manquante pour la locale active.
- **REFUSER** dev/build si un check échoue (log clair dans `ETAT-TECHNIQUE.md`).

#### ✅ Contrôles supplémentaires (OBLIGATOIRE)
- **TOUJOURS** valider la **cohérence Dexie** : si le schéma IndexedDB est **versionné à la hausse**, **EXIGER** un `upgrade()` **présent et testé** (sinon **REFUSER** dev/build).
- **TOUJOURS** valider `.env.production` **complet** (mêmes règles que `.env`).
- **TOUJOURS** exiger **Accessibilité ≥ 90** (Lighthouse) en plus des seuils performance existants.  
- **REFUSER** `dev/build` si l'un de ces contrôles échoue (log clair dans `ETAT-TECHNIQUE.md`).

## 🌐 Contexte multi-projets (obligatoire)
- **TOUJOURS** vérifier que `CAHIER-DES-CHARGES.md` est **présent à la racine**.
  - Si **absent**, **EXIGER** immédiatement le fichier à l'utilisateur et **suspendre la tâche**.
- **TOUJOURS** initialiser les projets avec **Vite + React + TypeScript** (baseline standard).
- **TOUJOURS** adapter les **noms de pages et composants** à la **table de nomenclature** définie par le projet (ou en créer une si absente, après validation utilisateur).

## 📡 Offline-first (obligatoire)
- **TOUTE nouvelle fonctionnalité** doit fonctionner **OFFLINE par défaut**.
- **Pipeline de synchro exigé** :  
  `Action utilisateur → IndexedDB (pending) → Service Worker → Serveur (sync)`.  
- Si ce schéma n'est **pas** respecté, **CORRIGER immédiatement** avant livraison.

## 🧹 Sections obsolètes à supprimer (si présentes)
- **Contribution externe / PR externes** : **SUPPRIMER** toute section dédiée, Cursor ne traite pas de PR externes.

## 📊 Gestion Automatique des Documents Techniques (OBLIGATOIRE)

- **TOUJOURS** gérer ces 5 documents uniques à la racine (et **uniquement** ceux-ci) :
  1) `CAHIER-DES-CHARGES.md` = **Objectifs / Vision fonctionnelle**
  2) `DESIGN-SYSTEM-[PROJET].md` = **Spécifications visuelles et UI complètes**
  3) `README-TECHNIQUE.md` = **Règles / Mémoire persistante Cursor**
  4) `ETAT-TECHNIQUE.md` = **État réel livré**
  5) `GAP-TECHNIQUE.md` = **Écarts à traiter** (différence entre Vision et État)

### 🔄 ETAT/GAP — Création & Mise à jour (OBLIGATOIRE)
- **AVANT toute tâche** : **TOUJOURS** vérifier que `ETAT-TECHNIQUE.md` et `GAP-TECHNIQUE.md` existent et sont **à jour**.
- S'il en manque **un seul** ou s'il est **obsolète** :
  - **CRÉER/METTRE À JOUR IMMÉDIATEMENT** avant d'exécuter la moindre action.
- `ETAT-TECHNIQUE.md` = **état réel livré** (fonctionnel, compilé, testé, visible si applicable). **INTERDIT** d'y décrire des hypothèses.
- `GAP-TECHNIQUE.md` = **écarts restants** (différence `CAHIER-DES-CHARGES.md` ↔ `ETAT-TECHNIQUE.md`), en **liste de tâches priorisées**.
- **APRÈS chaque livraison** : **METTRE À JOUR** d'abord `ETAT-TECHNIQUE.md`, puis **recalculer** `GAP-TECHNIQUE.md`.

## ♻️ Boucle d'exécution guidée par GAP (OBLIGATOIRE)
- **TOUJOURS** exécuter les tâches de `GAP-TECHNIQUE.md` en **enchaînement automatique** (ordre de priorité décroissante) **jusqu'à ce que le GAP soit vide**, sauf **conditions d'arrêt** ci-dessous.
- **AVANT** chaque tâche :
  1) **Relire** `CAHIER-DES-CHARGES.md`, `DESIGN-SYSTEM-[PROJET].md`, `README-TECHNIQUE.md`, `ETAT-TECHNIQUE.md`, `GAP-TECHNIQUE.md`.
  2) **Vérifier/Créer/Mettre à jour** `ETAT-TECHNIQUE.md` et `GAP-TECHNIQUE.md` si **absents** ou **obsolètes**.
  3) **Sélectionner** la **tâche #1** du GAP (priorité la plus haute).
- **EXÉCUTER** la tâche #1, **TESTER** (compilation + comportement + gates), **METTRE À JOUR** `ETAT-TECHNIQUE.md`, puis **RECALCULER** `GAP-TECHNIQUE.md`.
- **REBOUCLER** automatiquement sur la nouvelle tâche #1, **sans redemander** l'utilisateur entre les tâches **non destructrices**.
- **OBJECTIF** : Le cycle se termine lorsque `GAP-TECHNIQUE.md` ne contient plus de tâches ou lorsqu'une **condition d'arrêt** survient.

### 🧾 Récapitulatif de fin de boucle (OBLIGATOIRE)
- Quand `GAP-TECHNIQUE.md` est **vide** : **AFFICHER** 3–5 lignes (modules livrés, tâches ignorées/bloquées + causes, next steps).
- **JOURNALISER** ce récap dans `ETAT-TECHNIQUE.md`.

#### Conditions d'arrêt (OBLIGATOIRES)
- a) Un **gate** échoue (build/tests/linters/types) → **ARRÊT**, **LOG** dans `ETAT-TECHNIQUE.md` (cause + prochain pas), **MARQUER** la tâche comme **bloquée** dans `GAP-TECHNIQUE.md`.
- b) Une **ressource/clé** manque → **ARRÊT**, **EXIGER** l'info, **LOG** + **MARQUER** bloqué.
- c) La tâche implique **migration IndexedDB**, **rupture de schéma**, **suppression de données**, **modification de scripts npm** ou **modification des règles du README** → **DEMANDER VALIDATION** utilisateur avant exécution.
- d) L'utilisateur écrit **STOP** → **ARRÊT** immédiat et **LOG**.

#### ⚠️ Précision — commandes dev/build/test
- L'exécution des commandes `npm run dev`, `npm run build`, `npm run test` **n'exige JAMAIS** de validation utilisateur.  
- En cas d'échec : **ARRÊTER + LOGUER** immédiatement (cause + sortie) dans `ETAT-TECHNIQUE.md`, **recalculer** `GAP-TECHNIQUE.md`, puis **reprendre** la boucle au prochain cycle si les prérequis sont rétablis.  
- **INTERDIT** de bloquer sur une question/confirmation pour ces commandes.

#### Reprise automatique (OBLIGATOIRE)
- Dès que les prérequis manquants sont fournis ou que la cause d'échec est corrigée, **REPRENDRE AUTOMATIQUEMENT** la boucle à partir de la tâche #1 du GAP, **sans** instruction supplémentaire.

### **Déclencheur Cahier (OBLIGATOIRE)**
- **TOUJOURS** surveiller les changements dans `CAHIER-DES-CHARGES.md` (diff Git local).
- Au **moindre changement** détecté :
  - **RECALCULER** immédiatement `GAP-TECHNIQUE.md`,
  - **REPRIORISER** la liste,
  - puis **REPRENDRE** la boucle sur la nouvelle tâche #1.

### **Exécution Séquentielle + Backoff (OBLIGATOIRE)**
- **UNE SEULE** tâche GAP à la fois (pas d'exécution parallèle).
- Si un même **gate échoue 2 fois** pour la même tâche :
  - **MARQUER** la tâche **bloquée** (cause + next steps) dans `GAP-TECHNIQUE.md`,
  - **PASSER** à la prochaine tâche si possible, sinon **PAUSE** (attente input).
- Dès que le prérequis est rétabli : **REPRENDRE AUTOMATIQUEMENT** la boucle.

### 🔁 Backoff Global (OBLIGATOIRE)
- **TOUJOURS** appliquer une stratégie de retry max = 2 tentatives sur toute tâche (pas uniquement migrations DB).  
- Après 2 échecs consécutifs → marquer la tâche `bloquée` dans `GAP-TECHNIQUE.md` avec la cause et next steps.  
- **INTERDIT** de boucler indéfiniment sur une tâche en échec.

### 🎚️ Seuils d'autonomie (Validation préalable)
- **SANS validation** (exécuter en autonomie) : modifications **locales non destructrices** (UI/composants, styles, docs, tests unitaires, hooks/services sans rupture), création de fichiers **internes** conformes aux règles, **refactors sûrs**.
- **AVEC validation** (proposer → attendre → appliquer) : **migrations IndexedDB/Dexie**, **ruptures de schéma** (rename clés/index), **suppression de données**, **modification des scripts npm**, **modification des règles** du `README-TECHNIQUE.md`.

#### 🔧 Commandes dev/build/test (OBLIGATOIRE)
- **npm run dev**, **npm run build**, **npm run test** sont classés **tâches non destructives**.  
- **TOUJOURS** les exécuter **automatiquement** sans demander validation.  
- Si un échec survient (gate bloquant ou erreur commande) : **ARRÊTER + LOGUER** la cause dans `ETAT-TECHNIQUE.md` et **recalculer** `GAP-TECHNIQUE.md` ; **JAMAIS** attendre une confirmation utilisateur pour relancer.  
- Cette règle **n'ouvre pas** de dérogation : elle ne bascule **JAMAIS** dans la liste des tâches nécessitant validation.

### 🌿 Stratégie de commits & branche (OBLIGATOIRE)
- **Branche d'exécution** : **TOUJOURS** créer et utiliser une branche dédiée `feature/<YYYY-MM-DD>-auto` pour la boucle GAP (sécurité + traçabilité).  
  - **INTERDIT** d'exécuter la boucle sur `main`.
- **Granularité** : **UN COMMIT PAR TÂCHE GAP**, message : `GAP: <id court|§source> <résumé>`.
- **Push** : **TOUJOURS** `git push` **en fin de lot** (à la fin de la boucle ou sur condition d'arrêt), **PAS** après chaque tâche.
- **Journalisation** : après chaque tâche, **METTRE À JOUR** `ETAT-TECHNIQUE.md` puis **RECALCULER** `GAP-TECHNIQUE.md`.
- **Merge** : **PROPOSER** un merge vers `main` quand le lot est prêt (tests OK, GAP réduit, aucune régression).

### 🧱 Scaffold minimal Front (OBLIGATOIRE)
- **EXIGÉ** avant exécution GAP : Vite + React + TypeScript, Tailwind, React Router, **PWA complète** (manifest + SW actif), **Dexie** (schéma versionné), **i18n** centralisé (FR par défaut).
- **INTERDIT** de lancer la boucle GAP si le socle est incomplet (log dans `ETAT-TECHNIQUE.md`, MAJ `GAP-TECHNIQUE.md`).

#### ♻️ Boucle GAP — Épuisement total (OBLIGATOIRE)
- **TOUJOURS** enchaîner toutes les tâches **non destructrices** jusqu'à `GAP-TECHNIQUE.md` **vide**.  
- Tâche en échec/val. requise → **SUSPENDRE**, marquer `bloquée` (cause + next steps), **continuer** le reste.

#### 🔁 Backoff Global (OBLIGATOIRE)
- **2 tentatives max** sur **toute** tâche ; après 2 échecs : **MARQUER** `bloquée` (cause + next steps) et **NE PAS** boucler à l'infini.

### 1) `ETAT-TECHNIQUE.md` (création & mise à jour automatiques)
- **TOUJOURS** vérifier sa présence à la racine.  
  - S'il est **absent** → **CRÉER immédiatement** avec la structure minimale :
    - `# ÉTAT TECHNIQUE — <Nom du projet>`
    - `## Résumé`
    - `## Modules livrés (fonctionnels)`
    - `## Dépendances & versions`
    - `## Limitations connues / TODO techniques`
- **TOUJOURS** mettre à jour **après chaque livraison fonctionnelle** (code compilé, testé, visible en UI si applicable).  
- **INTERDIT** de décrire des hypothèses non livrées : le contenu reflète **exclusivement** l'état **réel** et **testé**.

### 2) `GAP-TECHNIQUE.md` (création & mise à jour automatiques)
- **TOUJOURS** vérifier sa présence à la racine.  
- S'il est **absent** → **CRÉER immédiatement** à partir de la comparaison :
  - **Vision fonctionnelle** = sections pertinentes de `CAHIER-DES-CHARGES.md`
  - **Vision visuelle** = sections pertinentes de `DESIGN-SYSTEM-[PROJET].md`  
  - **Réalisé** = sections pertinentes de `ETAT-TECHNIQUE.md`
- **TOUJOURS** maintenir une **liste de tâches ordonnée** (priorisées) avec format minimal :
  - `[ ]` Tâche (source: *Cahier des Charges §X.Y*) → composant/module ciblé → critères d'acceptation
  - `[x]` quand terminé (et **répercuté** dans `ETAT-TECHNIQUE.md`)
- **TOUJOURS** mettre à jour `GAP-TECHNIQUE.md` **immédiatement après** chaque tâche livrée pour refléter les écarts restants.
- **OBJECTIF** : `GAP-TECHNIQUE.md` doit indiquer **à tout moment** ce que Cursor doit traiter **maintenant**.

### 3) Déclencheurs obligatoires de mise à jour
- Build **réussi** (`npm run build`) → **vérifier** si `ETAT-TECHNIQUE.md` et/ou `GAP-TECHNIQUE.md` doivent évoluer.  
- Nouvelle **page / module / hook / schéma DB** en production locale → **mettre à jour** ETAT + GAP.  
- Toute **décision d'architecture** validée → **journaliser** dans `ETAT-TECHNIQUE.md` (Résumé + Modules).
- **DÉTECTION DIFF CAHIER** : si `CAHIER-DES-CHARGES.md` **évolue** (ou diff détecté à la relecture), **RECALCULER IMMÉDIATEMENT** `GAP-TECHNIQUE.md` **au prochain cycle**, même si une autre tâche venait d'être sélectionnée.  
- **OBJECTIF** : `GAP-TECHNIQUE.md` reflète **toujours** la vérité opérationnelle **courante**.

### 4) Unicité & anti-duplication des documents de pilotage (INTERDIT)
- **JAMAIS** créer des fichiers alternatifs/synonymes pour ces rôles (exemples **INTERDITS** : `STATUS.md`, `STATE.md`, `PROGRESS.md`, `ROADMAP.md`, `TODO.md`, `BACKLOG.md`, `TASKS.md`, `TECH-STATE.md`, `GAP.md`, `PLAN.md`, etc.).  
- **TOUJOURS** utiliser **uniquement** : `CAHIER-DES-CHARGES.md`, `DESIGN-SYSTEM-[PROJET].md`, `README-TECHNIQUE.md`, `ETAT-TECHNIQUE.md`, `GAP-TECHNIQUE.md`.  
- Si de tels fichiers existent → **les supprimer** après **log clair** et migrer leurs contenus utiles vers le document **officiel** approprié.

### 5) Séquence d'exécution (exigée)
1. Lire `CAHIER-DES-CHARGES.md` + `DESIGN-SYSTEM-[PROJET].md` + `README-TECHNIQUE.md`.  
2. Vérifier/créer `ETAT-TECHNIQUE.md` et `GAP-TECHNIQUE.md`.  
3. Exécuter la tâche.  
4. Tester (compilation + comportement).  
5. Mettre à jour **ETAT** puis **GAP**.  
6. Si une amélioration de règle est détectée → suivre **Auto-Amélioration Cursor** (Proposition → Validation → Mise à jour).

### 🔹 1. Mise à jour systématique de ETAT + GAP
- **TOUJOURS** vérifier que `ETAT-TECHNIQUE.md` et `GAP-TECHNIQUE.md` existent et sont à jour **avant d'exécuter toute nouvelle tâche**.  
- Si l'un est absent ou obsolète, Cursor doit d'abord le créer/mettre à jour avant de commencer la moindre autre action.
- **TOUJOURS** consulter `DESIGN-SYSTEM-[PROJET].md` pour toute tâche impliquant l'interface utilisateur.

### 🔹 2. Isolation stricte multi-projets
- Si plusieurs projets sont présents en mémoire, **TOUJOURS** isoler le contexte au **root courant**.  
- **INTERDIT** de mélanger des règles ou fichiers d'un autre projet (ex. BazarKELY vs un autre).  
- Se référer uniquement aux fichiers présents dans le dossier actif.

### 🔹 3. Alignement README-TECHNIQUE avec ETAT + GAP
- **TOUJOURS** proposer une mise à jour du `README-TECHNIQUE.md` si Cursor applique une nouvelle règle ou constate une différence documentée dans `ETAT-TECHNIQUE.md` ou `GAP-TECHNIQUE.md`.  
- Le README doit rester la mémoire longue et centralisée de toutes les règles.
- **TOUJOURS** intégrer les spécifications du `DESIGN-SYSTEM-[PROJET].md` dans les règles de développement UI.

## 🔄 Auto-Amélioration Cursor (obligatoire)
- **TOUJOURS** considérer `README-TECHNIQUE.md` comme une **mémoire persistante à mettre à jour**.
- Quand Cursor détecte une **meilleure méthode**, un **workflow optimal**, ou une **correction** à capitaliser :
  1. **PROPOSER explicitement** à l'utilisateur la mise à jour avec :
     - Le **CONTENU EXACT** à **ajouter / modifier / supprimer**.
     - La **RAISON CLAIRE** (bug évité, optimisation, stabilité, conformité aux règles).
  2. **ATTENDRE la validation** de l'utilisateur.
  3. **APPLIQUER** la mise à jour dans `README-TECHNIQUE.md` après validation.
- **JAMAIS** modifier ce document **sans** la séquence : **Proposition → Validation → Mise à jour**.

### 🔄 Auto-Amélioration Cursor (OBLIGATOIRE)
- Si une méthode plus robuste est détectée :
  - **PROPOSER** explicitement la mise à jour (contenu exact + raison claire),
  - **ATTENDRE** validation utilisateur,
  - **APPLIQUER** la mise à jour dans README-TECHNIQUE.md,
  - **JOURNALISER** la décision dans ETAT-TECHNIQUE.md et recalculer GAP-TECHNIQUE.md.
- **INTERDIT** de modifier ce document sans la séquence Proposition → Validation → Application.
- **TOUJOURS** intégrer les évolutions du DESIGN-SYSTEM-[PROJET].md dans les règles de développement.

---

# 📋 README-TECHNIQUE - Règles de Développement Génériques
## Guide de Développement pour Projets React/TypeScript/PWA

[![TypeScript](https://img.shields.io/badge/TypeScript-5.2.2-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2.0-blue)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0.0-purple)](https://vitejs.dev/)

---

## 🚨 RÈGLE CRITIQUE #1 - MISE À JOUR OBLIGATOIRE DES FICHIERS EXISTANTS

### **DIRECTIVE IMMÉDIATE : QUAND L'UTILISATEUR DEMANDE DES AMÉLIORATIONS**

#### **1. PREMIÈRE ACTION OBLIGATOIRE** : Identifier le fichier existant à modifier
#### **2. DEUXIÈME ACTION OBLIGATOIRE** : REMPLACER le contenu entier du fichier existant
#### **3. INTERDICTION ABSOLUE** : Créer un nouveau fichier avec un nom différent

### **EXEMPLES CONCRETS OBLIGATOIRES :**

**Demande : "Améliorer le design du dashboard"**
- ❌ **INTERDIT** : Créer `ModernDashboardPage.tsx`
- ✅ **CORRECT** : REMPLACER le contenu de `src/pages/DashboardPage.tsx`

**Demande : "Ajouter des transferts"**
- ❌ **INTERDIT** : Créer `TransferPage.tsx`
- ✅ **CORRECT** : MODIFIER `src/pages/TransactionsPage.tsx` existant

**Demande : "Créer une interface moderne"**
- ❌ **INTERDIT** : Créer `ModernAccountsPage.tsx`
- ✅ **CORRECT** : REMPLACER le contenu de `src/pages/AccountsPage.tsx`

**Demande : "Ajouter des effets glassmorphisme"**
- ❌ **INTERDIT** : Créer `GlassmorphismDashboard.tsx`
- ✅ **CORRECT** : MODIFIER `src/pages/DashboardPage.tsx` existant

### **PROCÉDURE OBLIGATOIRE AVANT TOUTE ACTION :**

1. **Lister les fichiers existants** dans `src/pages/`
2. **Identifier LE fichier à modifier** (pas à dupliquer)
3. **OUVRIR ce fichier existant**
4. **REMPLACER son contenu** par le nouveau code
5. **TESTER que l'application fonctionne**

### **COMMANDES OBLIGATOIRES :**

```bash
# 1. Vérifier les fichiers existants
ls src/pages/

# 2. Identifier le fichier à modifier
# Exemple : DashboardPage.tsx pour améliorer le dashboard

# 3. Ouvrir et modifier le fichier existant
# NE PAS créer de nouveau fichier

# 4. Tester l'application
npm run dev
```

### **RÈGLES DE NOMENCLATURE STRICTES :**

| Fonctionnalité | Fichier à Modifier | ❌ Interdit |
|----------------|-------------------|-------------|
| Dashboard | `DashboardPage.tsx` | `ModernDashboardPage.tsx` |
| Comptes | `AccountsPage.tsx` | `ModernAccountsPage.tsx` |
| Transactions | `TransactionsPage.tsx` | `TransferPage.tsx` |
| Budgets | `BudgetsPage.tsx` | `ModernBudgetsPage.tsx` |
| Objectifs | `GoalsPage.tsx` | `ModernGoalsPage.tsx` |

### **VÉRIFICATIONS OBLIGATOIRES AVANT CHAQUE MODIFICATION :**

#### **ÉTAPE 1 : IDENTIFICATION DU FICHIER CIBLE**
```bash
# OBLIGATOIRE : Lister les fichiers existants
find src/pages/ -name "*.tsx" | sort

# RÉSULTAT ATTENDU : Liste des fichiers existants
```

#### **ÉTAPE 2 : CONFIRMATION DU FICHIER À MODIFIER**
```bash
# OBLIGATOIRE : Confirmer que le fichier existe
ls -la src/pages/DashboardPage.tsx

# RÉSULTAT ATTENDU : Le fichier doit exister
```

#### **ÉTAPE 3 : MODIFICATION DU FICHIER EXISTANT**
```bash
# OBLIGATOIRE : Modifier le fichier existant
# NE PAS créer de nouveau fichier
# NE PAS ajouter de préfixe (Modern, Glassmorphism, New)
# NE PAS ajouter de suffixe (V2, Updated, New)
```

#### **ÉTAPE 4 : VÉRIFICATION POST-MODIFICATION**
```bash
# OBLIGATOIRE : Vérifier qu'aucun nouveau fichier n'a été créé
find src/pages/ -name "*Modern*" -o -name "*Glassmorphism*" -o -name "*New*"

# RÉSULTAT ATTENDU : Aucun fichier trouvé
```

### **SANCTIONS EN CAS DE NON-RESPECT :**

1. **ARRÊT IMMÉDIAT** du développement
2. **SUPPRESSION OBLIGATOIRE** de tout fichier dupliqué créé
3. **RESTAURATION** du fichier original
4. **REFAIRE** la modification dans le bon fichier
5. **TEST** obligatoire de l'application

### **RAPPEL CONSTANT - À LIRE AVANT CHAQUE MODIFICATION :**

> **⚠️ ATTENTION : Cette règle est CRITIQUE et doit être respectée à 100%**
> 
> **AVANT de créer un nouveau fichier, TOUJOURS se demander :**
> 1. "Est-ce qu'un fichier similaire existe déjà ?"
> 2. "Puis-je modifier le fichier existant au lieu d'en créer un nouveau ?"
> 3. "Suis-je en train de dupliquer une fonctionnalité existante ?"
> 
> **Si la réponse est OUI à l'une de ces questions, MODIFIER le fichier existant !**

### **CHECKLIST OBLIGATOIRE AVANT CHAQUE COMMIT :**

- [ ] **Aucun fichier avec préfixe `Modern`, `Glassmorphism`, `New` créé**
- [ ] **Aucun fichier avec suffixe `V2`, `Updated`, `New` créé**
- [ ] **Tous les fichiers modifiés sont des fichiers existants**
- [ ] **Aucune route parallèle créée**
- [ ] **L'application fonctionne après modification**
- [ ] **Aucun import cassé**

### **COMMANDES DE VÉRIFICATION FINALE :**

```bash
# Vérifier qu'aucun fichier dupliqué n'existe
find src/ -name "*Modern*" -o -name "*Glassmorphism*" -o -name "*New*" -o -name "*V2*"

# Vérifier que l'application compile
npm run build

# Vérifier que l'application démarre
npm run dev
```

---

## 🚫 INTERDICTION ABSOLUE - CRÉATION DE FICHIERS DUPLIQUÉS

### **⚠️ RÈGLE FONDAMENTALE : NE JAMAIS CRÉER DE NOUVEAUX FICHIERS QUAND UN FICHIER EXISTANT DOIT ÊTRE MODIFIÉ**

#### **🚨 INTERDICTIONS STRICTES :**
- ❌ **INTERDIT** : Créer des fichiers avec préfixes `Modern`, `Glassmorphism`, `New`
- ❌ **INTERDIT** : Créer des routes parallèles `/modern-*`, `/glassmorphism-*`
- ❌ **INTERDIT** : Créer des composants dupliqués avec noms différents
- ❌ **INTERDIT** : Créer de nouveaux dossiers pour des fonctionnalités existantes
- ❌ **INTERDIT** : Dupliquer des services existants avec des noms différents

#### **✅ OBLIGATIONS STRICTES :**
- ✅ **OBLIGATOIRE** : Modifier le fichier existant
- ✅ **OBLIGATOIRE** : Vérifier l'existence avant toute création
- ✅ **OBLIGATOIRE** : Supprimer immédiatement tout doublon créé par erreur
- ✅ **OBLIGATOIRE** : Demander confirmation avant créer un nouveau fichier
- ✅ **OBLIGATOIRE** : Utiliser des composants existants et les étendre
- ✅ **OBLIGATOIRE** : Mettre à jour les routes existantes au lieu d'en créer de nouvelles

#### **🛑 PROCÉDURE DE NETTOYAGE IMMÉDIAT :**
```bash
SI un doublon a été créé par erreur :
1. STOP - Arrêter le développement immédiatement
2. COPIER le contenu utile vers le fichier original
3. SUPPRIMER immédiatement le fichier doublon
4. METTRE À JOUR les imports si nécessaire  
5. TESTER que l'application fonctionne
6. CONTINUER le développement dans le fichier original
```

---

## 🗄️ INTERDICTION ABSOLUE - MULTIPLES BASES DE DONNÉES

### **⚠️ RÈGLE CRITIQUE : UNE SEULE BASE DE DONNÉES PAR PROJET**

#### **🚨 INTERDICTIONS STRICTES :**
- ❌ **INTERDIT** : Créer plusieurs bases IndexedDB pour le même projet
- ❌ **INTERDIT** : Avoir des bases avec des noms similaires (majuscules/minuscules)
- ❌ **INTERDIT** : Dupliquer des schémas de base de données
- ❌ **INTERDIT** : Avoir des versions multiples de la même base

#### **✅ OBLIGATIONS STRICTES :**
- ✅ **OBLIGATOIRE** : Utiliser UNE SEULE base de données par projet
- ✅ **OBLIGATOIRE** : Nom de base cohérent et unique
- ✅ **OBLIGATOIRE** : Supprimer immédiatement toute base dupliquée détectée
- ✅ **OBLIGATOIRE** : Vérifier l'unicité avant toute création
- ✅ **OBLIGATOIRE** : Migrer les données vers la base unique si nécessaire

#### **🛑 PROCÉDURE DE NETTOYAGE IMMÉDIAT :**
```bash
SI plusieurs bases sont détectées :
1. STOP - Arrêter le développement immédiatement
2. IDENTIFIER la base principale
3. MIGRER toutes les données vers la base principale
4. SUPPRIMER immédiatement toutes les bases dupliquées
5. VÉRIFIER que seule la base principale existe
6. TESTER que l'application fonctionne avec la base unique
```

#### **🔍 VÉRIFICATIONS OBLIGATOIRES :**
```bash
# Vérifier les bases existantes
indexedDB.databases().then(dbs => console.log(dbs))

# RÉSULTAT ATTENDU : Une seule base
# RÉSULTAT INTERDIT : Plusieurs bases avec noms similaires
```

---

## 🎯 FRAMEWORK DE DOCUMENTATION STRICT

### **📋 RÈGLE OBLIGATOIRE : CONSULTER 4 DOCUMENTS AVANT CHAQUE ACTION**

Avant toute action de développement, **TOUJOURS** consulter ces 4 documents dans l'ordre :

1. **📋 [CAHIER-DES-CHARGES.md](./CAHIER-DES-CHARGES.md)** - Spécifications fonctionnelles intégrales
2. **🎨 [DESIGN-SYSTEM-[PROJET].md](./DESIGN-SYSTEM-[PROJET].md)** - Spécifications visuelles et UI complètes
3. **🔧 [ETAT-TECHNIQUE.md](./ETAT-TECHNIQUE.md)** - Statut technique actuel
4. **📊 [GAP-TECHNIQUE.md](./GAP-TECHNIQUE.md)** - Écarts restants vs spécifications

### **🎯 DOCUMENT DE RÉFÉRENCE TECHNIQUE PRINCIPAL**

**⚠️ IMPORTANT : Ce fichier `README-TECHNIQUE.md` est le document de référence technique principal du projet.**

- ✅ **Toutes les actions de développement doivent se conformer à ce document**
- ✅ **Ce document contient toutes les règles architecturales, guidelines et interdictions**

### **🚫 INTERDICTIONS STRICTES**
- ❌ **NE JAMAIS** modifier CAHIER-DES-CHARGES.md sans demande explicite utilisateur
- ❌ **NE JAMAIS** créer de documentation redondante
- ❌ **NE JAMAIS** agir sans consulter les 4 documents
- ❌ **NE JAMAIS** supprimer d'information unique sans transfert

### **✅ RÈGLES OBLIGATOIRES**
- ✅ **AVANT d'exécuter toute demande de l'utilisateur**, vérifier systématiquement le **contexte réel du projet** (tous les fichiers et l'état actuel du code)
- ✅ **TOUJOURS** préserver le contenu intégral lors des transferts
- ✅ **TOUJOURS** mettre à jour ETAT-TECHNIQUE.md après réalisations majeures
- ✅ **TOUJOURS** mettre à jour GAP-TECHNIQUE.md après chaque tâche importante
- ✅ **TOUJOURS** supprimer la documentation redondante sans confirmation

## 🎨 DESIGN-SYSTEM OBLIGATOIRE

### **📋 RÈGLE CRITIQUE : DESIGN-SYSTEM-[PROJET].md REQUIS**

**⚠️ IMPORTANT : Le fichier DESIGN-SYSTEM-[PROJET].md est OBLIGATOIRE pour tout développement UI/UX.**

- ✅ **Toutes les modifications visuelles doivent se conformer aux spécifications du DESIGN-SYSTEM**
- ✅ **Ce document contient wireframes, composants UI, design tokens et guidelines responsive**
- ✅ **Classes Tailwind exactes et composants React typés fournis**

### **🚫 INTERDICTIONS STRICTES - DÉVELOPPEMENT UI**
- ❌ **NE JAMAIS** créer de composants UI sans consulter DESIGN-SYSTEM-[PROJET].md
- ❌ **NE JAMAIS** utiliser des couleurs non définies dans les design tokens
- ❌ **NE JAMAIS** modifier un wireframe sans référence au design system
- ❌ **NE JAMAIS** créer des breakpoints différents de ceux spécifiés
- ❌ **NE JAMAIS** ignorer les spécifications d'accessibilité définies

### **✅ RÈGLES OBLIGATOIRES - IMPLÉMENTATION UI**
- ✅ **AVANT toute création/modification de composant**, vérifier les spécifications dans DESIGN-SYSTEM-[PROJET].md
- ✅ **TOUJOURS** utiliser les classes Tailwind exactes spécifiées
- ✅ **TOUJOURS** respecter les wireframes ASCII fournis
- ✅ **TOUJOURS** implémenter tous les états (hover, focus, active, disabled, loading)
- ✅ **TOUJOURS** suivre l'ordre d'implémentation recommandé dans le design system
- ✅ **TOUJOURS** tester le responsive selon les breakpoints définis

### **🔍 VÉRIFICATIONS OBLIGATOIRES UI**
```bash
# Vérifier l'existence du design system
ls -la DESIGN-SYSTEM-*.md

# Vérifier que les composants utilisent les classes spécifiées
grep -r "bg-primary-500" src/components/

# Vérifier le respect des breakpoints
grep -r "md:" src/components/
```

### **⚙️ INTÉGRATION DANS LE WORKFLOW GAP**
- **DESIGN-SYSTEM-[PROJET].md** doit être consulté lors du calcul de GAP-TECHNIQUE.md
- **Toute modification UI** dans GAP-TECHNIQUE.md doit référencer les spécifications du design system
- **Les wireframes du design system** servent de référence pour valider l'état livré dans ETAT-TECHNIQUE.md

---

## 🔒 Root-Only Policy (Mandatory)

### **📁 Définition du Root**
- **Si Git est présent** → root = dossier contenant `.git`
- **Sinon** → root = dossier contenant le `package.json` principal
- **Au tout début d'un projet** → le root peut ne contenir que `README-TECHNIQUE.md` et `CAHIER-DES-CHARGES.md`

### **❌ Interdictions Absolues**
- ❌ **Créer ou initialiser un sous-projet** dans n'importe quel sous-dossier
- ❌ **Créer un `package.json`** en dehors du root
- ❌ **Installer des dépendances** (`node_modules`) en dehors du root
- ❌ **Générer un `README.md`** en dehors du root (un seul `README.md` global autorisé au root)

### **🛑 Comportement Obligatoire en Cas de Violation**
- 🛑 **Abandonner immédiatement** la tâche en cours
- 🧹 **Supprimer immédiatement** les artefacts problématiques
- 📝 **Logger** : "ROOT POLICY VIOLATION"

### **⚙️ Règles d'Exécution**
- **Toutes les commandes npm** doivent s'exécuter uniquement au root
- **Avant d'écrire tout fichier** → vérifier que le chemin cible est le root, sinon abandonner + supprimer

### **📝 Règles de Documentation**
- **Mettre à jour uniquement** `README.md` et `README-TECHNIQUE.md` au root
- **Ne jamais générer** de README supplémentaires dans les sous-dossiers

---

## 🔌 GESTION AUTOMATIQUE DU PORT

### **⚠️ CRITIQUE : PORT FIXE OBLIGATOIRE POUR LA STABILITÉ**

**Le port fixe est MANDATORE pour le fonctionnement correct de l'application.** Cette configuration est essentielle pour assurer la connectivité avec la base de données et éviter les conflits de ports qui pourraient compromettre la stabilité de l'application.

### **🎯 Pourquoi un Port Fixe est Obligatoire**

#### **1. Connectivité Base de Données**
- ✅ **IndexedDB** : Le port fixe garantit l'accès correct aux bases de données locales
- ✅ **Service Worker** : Le cache et la synchronisation fonctionnent uniquement sur ce port
- ✅ **PWA Manifest** : L'installation PWA nécessite un port stable et prévisible
- ✅ **CORS Policy** : Évite les problèmes de politique de sécurité cross-origin

#### **2. Stabilité de l'Application**
- ✅ **Consistance** : Même port en développement et production
- ✅ **Debugging** : Outils de développement optimisés pour ce port
- ✅ **Cache** : Service Worker configuré spécifiquement pour ce port
- ✅ **Performance** : Optimisations Vite configurées pour ce port

### **🔧 Mécanisme de Gestion Automatique**

#### **Détection et Nettoyage Automatique**
```bash
# Le système détecte automatiquement les processus sur le port
# et les termine avant de démarrer l'application

# Processus de nettoyage automatique :
1. Scan du port
2. Identification des processus conflictuels
3. Arrêt gracieux des processus
4. Vérification de libération du port
5. Démarrage de l'application
```

### **⚙️ Configuration Technique**

#### **Port Management dans Vite**
```javascript
// vite.config.ts
export default defineConfig({
  server: {
    port: 3000,           // Port fixe obligatoire
    strictPort: true,     // Refuse de changer de port
    host: true,           // Accessible depuis le réseau
  },
  // ... autres configurations
})
```

### **🚨 Gestion des Conflits de Port**

#### **Détection Automatique**
- ✅ **Scan automatique** : Vérification du port au démarrage
- ✅ **Identification des processus** : Détection des applications conflictuelles
- ✅ **Nettoyage intelligent** : Arrêt sélectif des processus problématiques
- ✅ **Vérification post-nettoyage** : Confirmation de libération du port

### 🎯 Alignement Port (OBLIGATOIRE)
- **TOUJOURS** utiliser le port **défini dans `CAHIER-DES-CHARGES.md`**.  
- Si divergence README ↔ CAHIER : **PROPOSER** l'uniformisation (dev + scripts + docs), **ATTENDRE** validation, **APPLIQUER** puis **JOURNALISER** dans `ETAT-TECHNIQUE.md`.
- Si aucun port précisé : **utiliser 3000** par défaut et **PROPOSER** de l'officialiser.

### 🔌 Port & Démarrage Cross-Platform (OBLIGATOIRE)
- **TOUJOURS** libérer le port via solution **cross-platform** (ex. `kill-port`), `vite --strictPort`.
- **INTERDIT** toute commande OS-spécifique.

### **🔍 Dépannage et Résolution de Problèmes**

#### **Problèmes Courants**

##### **1. Port Occupé**
```bash
# Symptôme : "Port 3000 is already in use"
# Solution automatique : Le système nettoie automatiquement
# Si échec : Redémarrer avec npm run dev
```

##### **2. Conflit de Processus**
```bash
# Symptôme : Application ne démarre pas
# Solution : Le système tue automatiquement les processus conflictuels
# Vérification : npm run port:free
```

##### **3. Erreurs de Permissions**
```bash
# Symptôme : "Access denied" lors du nettoyage
# Solution : Exécuter en tant qu'administrateur
# Alternative : Fermer manuellement les applications conflictuelles
```

### **⚠️ Règles Critiques**

#### **Interdictions Absolues**
- ❌ **NE JAMAIS** utiliser un port aléatoire
- ❌ **NE JAMAIS** désactiver la gestion automatique du port
- ❌ **NE JAMAIS** modifier la configuration Vite sans validation
- ❌ **NE JAMAIS** ignorer les conflits de port

#### **Obligations**
- ✅ **TOUJOURS** utiliser `npm run dev` pour le développement
- ✅ **TOUJOURS** vérifier la connectivité après démarrage
- ✅ **TOUJOURS** redémarrer proprement en cas de problème
- ✅ **TOUJOURS** consulter les logs en cas d'erreur

---

## 🏗️ ARCHITECTURE TECHNIQUE GÉNÉRIQUE

### **Stack Technologique Recommandé**
- **Frontend** : React 18+ + TypeScript 5+
- **Build** : Vite 5+ + PWA Plugin
- **UI** : Tailwind CSS + Lucide React
- **State** : Zustand + React Query
- **Storage** : IndexedDB (offline-first)
- **Forms** : React Hook Form + Zod validation

### **Structure Projet Recommandée**
```
src/
├── components/           # Composants UI réutilisables
├── pages/               # Pages principales
├── services/            # Logique métier
├── stores/              # Gestion d'état
├── types/               # Définitions TypeScript
├── utils/               # Utilitaires
└── constants/           # Configuration
```

### **🔧 AJOUT #2 — Versionnage d'environnement (OBLIGATOIRE)**
- **TOUJOURS** définir engines (Node/NPM) et un fichier de version (.nvmrc ou .node-version).
- **REFUSER** build/dev si la version Node ne correspond pas.
- **INTERDIT** de builder avec une version différente de celle spécifiée.

---

## 🛡️ GUIDELINES DE DÉVELOPPEMENT

### **🏗️ RÈGLES ARCHITECTURALES (CRITIQUES)**

#### **1. Hiérarchie des Providers (OBLIGATOIRE)**
```typescript
// ✅ CORRECT - Ordre des Providers
  <QueryClient>
    <Router>
      <ThemeProvider>
        <ToastProvider>
          <OfflineProvider>
            <AuthProvider>
              <AppProvider>
                <App />
              </AppProvider>
            </AuthProvider>
          </OfflineProvider>
        </ToastProvider>
      </ThemeProvider>
    </Router>
  </QueryClient>
```

#### **2. Utilisation des Hooks**
```typescript
// ✅ CORRECT - Usage des hooks
const useData = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['data'],
    queryFn: fetchData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
  
  return { data, isLoading, error }
}
```

#### **3. Architecture des Composants**
```typescript
// ✅ CORRECT - Structure de composant
interface ComponentProps {
  data: DataType[]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export const Component: React.FC<ComponentProps> = ({
  data,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="component">
      {/* JSX here */}
    </div>
  )
}
```

### **📱 CHECKLIST ANTI-RÉGRESSION MOBILE**

#### **Performance**
- [ ] **Taille bundle** : < 250KB initial
- [ ] **Lazy Loading** : Code splitting par routes
- [ ] **Images** : Format WebP avec fallbacks
- [ ] **Mémoire** : Nettoyage event listeners et timers
- [ ] **Virtual Scrolling** : Pour listes 100+ éléments
- [ ] **Debouncing** : Recherche et formulaires (300ms)

#### **Touch & Interaction**
- [ ] **Touch Targets** : Minimum 44px
- [ ] **Swipe Gestures** : Navigation mobile
- [ ] **Pull to Refresh** : Mise à jour données
- [ ] **Safe Areas** : Gestion des encoches
- [ ] **Keyboard** : Ajustement viewport

### 📲 PWA Mobile Strict (OBLIGATOIRE)
- Manifest **complet** (`display: "standalone"`, `theme_color`, icônes **maskable**).
- Service Worker : **stale-while-revalidate** + **offline fallback** + **prompt de mise à jour non intrusif**.
- **TESTER** : installation Android, mode avion réel, cycle d'update SW.

---

## 🚀 Déploiement (Générique)

- TOUJOURS exécuter `npm run build` pour préparer la version production.  
- TOUJOURS vérifier que le dossier `dist/` contient tous les assets nécessaires (HTML, JS, CSS, images, manifest).  
- TOUJOURS livrer la build sur un hébergeur HTTPS.  
- TOUJOURS configurer le fallback SPA : toutes les routes doivent rediriger vers `index.html`.  
- TOUJOURS tester la PWA après déploiement :  
  - Installation sur mobile  
  - Mode offline activé  
  - Icônes et manifest disponibles  
- JAMAIS livrer une build contenant des erreurs ou warnings bloquants.  
- INTERDIT d'introduire des configurations spécifiques à un hébergeur dans ce fichier : elles doivent être définies dans `CAHIER-DES-CHARGES.md`.

### 📦 Livraison Mobile (OBLIGATOIRE)
- **EXIGÉ** : APK Android **signé** (Capacitor ou équivalent) installable sur **appareil réel**.
- **INTERDIT** de livrer un build **debug** à l'utilisateur final ; `appId` **immuable** après première release.
- Keystore : **JAMAIS** en repo. **Consigner** chemin + fingerprint dans `ETAT-TECHNIQUE.md`.

#### 🧾 Versionnage & À propos (OBLIGATOIRE)
- **TOUJOURS** incrémenter la **version** (SemVer) à chaque build de release.  
- **TOUJOURS** afficher dans l'app (écran "À propos") : **appId**, **version**, **date de build**.  
- **INTERDIT** de livrer une APK sans ces informations visibles.  

---

## 🧪 TESTS

### **Tests Unitaires**
```bash
npm run test
```

### **Tests de Type**
```bash
npm run type-check
```

### **Linting**
```bash
npm run lint
```

### **🔧 AJOUT #3 — Hooks Git (EXÉCUTION AUTOMATIQUE DES CONTRÔLES)**
- **TOUJOURS** exécuter avant commit : `npx tsc --noEmit && npm run lint` (si lint présent).
- **TOUJOURS** exécuter avant push : `npm run build && npm test` (si tests présents).
- **REFUSER** commit/push si un contrôle échoue (bloquant).

### 🛠️ CI Générique (OBLIGATOIRE)
- **TOUJOURS** répliquer en CI les gates locaux : `npx tsc --noEmit` → `npm run lint` → `npm run build` → `npm test` (si présents).
- **EXIGÉ** : artefact de build en sortie CI.
- **INTERDIT** de merger si la CI échoue (bloquant).

#### 🔒 CI – Durcissement (OBLIGATOIRE)
- **TOUJOURS** traiter les **warnings bloquants** (TS/ESLint) comme **échecs** CI.  
- **TOUJOURS** publier les **artefacts** de build et le **rapport Lighthouse** (perf + accessibilité).  
- **INTERDIT** de merger si un job CI échoue.

## 🧪 Gates de Qualité (OBLIGATOIRE)
- **pre-commit** : **TOUJOURS** exécuter `npx tsc --noEmit && npm run lint` (si lint configuré). **REFUSER** commit si échec.
- **pre-push** : **TOUJOURS** exécuter `npm run build && npm test` (si tests présents). **REFUSER** push si échec.
- **Version Node** : **TOUJOURS** imposer la version via `engines`/`.nvmrc` et **REFUSER** build/dev si non conforme.

---

## 📈 PERFORMANCE

### **Métriques Recommandées**
- **Lancement** : < 3 secondes sur smartphones bas de gamme
- **Taille** : < 5MB (gzippé: ~48KB)
- **PWA Score** : 100/100
- **Lighthouse** : Performance 95+

### **Optimisations**
- **Code splitting** par routes
- **Lazy loading** des composants
- **Service Worker** pour le cache
- **IndexedDB** pour le stockage local

### 📋 Matrix QA Mobile (OBLIGATOIRE)
- **TOUJOURS** valider sur Android bas/mid-range : 
  - Chrome Mobile, largeur ≤ 360dp, tactile + focus clavier, offline.
- **LOG** les résultats dans `ETAT-TECHNIQUE.md` (appareils, résolutions, statut).

---

## 🤝 WORKFLOW DE DÉVELOPPEMENT

### **Standards de Code**
- **TypeScript strict** : Types complets
- **ESLint** : Règles strictes
- **Prettier** : Formatage automatique
- **Tests** : Couverture minimale 80%

---

## 🔄 SYNCHRONISATION OFFLINE-FIRST

### **Architecture de Synchronisation**

**Local First** : Toutes actions stockées d'abord dans IndexedDB
**Queue de sync** : Actions non synchronisées en file d'attente
**Retry automatique** : Tentative de sync périodique (30 secondes)
**Résolution de conflits** : Dernière modification gagne (simple)

### **États de Synchronisation**

- **Synced** : Action confirmée sur serveur
- **Pending** : En attente de synchronisation
- **Failed** : Échec, retry programmé
- **Offline** : Mode hors ligne détecté

### 🗂️ Migrations IndexedDB/Dexie (OBLIGATOIRE)
- **TOUJOURS** versionner le schéma et fournir `upgrade()` **testé**.
- **AVANT** migration : **snapshot JSON complet**, stockage local, **rétention 7 jours**, option **téléchargement**.
- **BACKOFF global** : 2 tentatives max ; après 2 échecs, **STOP** + **MARQUER** la tâche `bloquée` (cause + next steps) dans `GAP-TECHNIQUE.md`, **ROLLBACK** à partir du snapshot.
- **INTERDIT** d'introduire des ruptures sans migration/rollback.

### **🔧 AJOUT #5 — Sauvegarde/Export (OBLIGATOIRE)**
- **TOUJOURS** fournir Export/Import JSON (sauvegarde locale offline).
- **TOUJOURS** tester la restauration cross-version (avant livraison).
- **INTERDIT** de livrer une fonctionnalité stockant des données sans mécanisme d'export minimal.

### 🧳 Résilience Stockage & Quotas (OBLIGATOIRE)
- Sur `QuotaExceededError` : 1) **Alerte UI** claire, 2) **Proposer export JSON immédiat**, 3) **Basculer read-only / nettoyage guidé**, 4) **LOGGER** dans `ETAT-TECHNIQUE.md`.
- **INTERDIT** toute perte silencieuse de données.

---

## 🔧 RÈGLES OPÉRATIONNELLES AJOUTÉES

### **🔧 AJOUT #6 — Sécurité & secrets (GÉNÉRIQUE)**
- **JAMAIS** committer de secrets / .env.
- **JAMAIS** logguer de PII en production.
- **TOUJOURS** chiffrer au repos les champs sensibles stockés en IndexedDB (si pertinents).
- **TOUJOURS** limiter les logs prod au strict nécessaire (pas de traces sensibles).

### 🔐 Données & Vie Privée (OBLIGATOIRE)
- **TOUJOURS** offrir **Export JSON** et **Suppression** des données via l'UI.
- **SI analytics** : **EXIGER** consentement préalable, opt-out disponible.
- **TOUJOURS** tester la **restauration cross-version** avant livraison (déjà requis).

### 🔐 Gestion des Secrets & Multi-Environnements (OBLIGATOIRE)
- **TOUJOURS** fournir `.env.example` listant **toutes** les clés attendues (sans secrets).
- **INTERDIT** d'exécuter/commiter/pusher/builder si `.env` est **absent/incomplet** ou contient des valeurs vides/`PLACEHOLDER`/`TODO`/`changeme`.
- **EXIGÉ** : séparation nette `development` / `test` / `production` ; sélection d'environnement documentée.
- **INTERDIT** d'exposer des secrets en repo, logs, bundle.

#### 🛡️ En-têtes & Logs (OBLIGATOIRE)
- **EXIGÉ** : définir une **CSP** et une **Permissions-Policy** adaptées (la mise en œuvre concrète par hébergeur se documente dans `CAHIER-DES-CHARGES.md`).  
- **INTERDIT** d'émettre des `console.log` en production ; **TOUJOURS** filtrer/masquer toute **PII** dans les logs.

### **🔧 AJOUT #7 — i18n & Accessibilité (MINIMUM OBLIGATOIRE)**
- **TOUJOURS** centraliser les chaînes (i18n) avec FR par défaut.
- **TOUJOURS** vérifier focus/contraste et erreurs ARIA (outil type axe-core) avant livraison.
- **INTERDIT** d'introduire du texte en dur quand une clé i18n existe.

### 🌐 i18n FR/MG — Garanties Minimales (OBLIGATOIRE)
- **EXIGÉ** : FR par défaut + MG activable dans l'UI ; préférence **persistée offline**.
- **FALLBACK** FR si clé MG manquante (UI non cassée).
- `npm run doctor` : **0** clé manquante pour la locale active.
- **INTERDIT** de hardcoder un texte quand une clé i18n existe.

#### ♿ Accessibilité opérationnelle (OBLIGATOIRE)
- **TOUJOURS** garantir **navigation clavier complète** et **0 erreur ARIA** avant livraison.

### **🔧 AJOUT #8 — Pré-vol ETAT/GAP avant TOUTE tâche (RENFORCÉ)**
- **AVANT** toute nouvelle tâche : vérifier/mettre à jour ETAT-TECHNIQUE.md puis recalculer GAP-TECHNIQUE.md.
- Si l'un est absent/obsolète : **CRÉER/METTRE À JOUR** immédiatement avant d'exécuter la moindre action.

### **🔧 AJOUT #9 — Processus d'exception (Override par Cahier des Charges)**
- Si CAHIER-DES-CHARGES.md contredit une règle générique :
  - **PROPOSER** la dérogation (contenu exact + justification),
  - **ATTENDRE** validation utilisateur,
  - **APPLIQUER** après validation,
  - **JOURNALISER** la dérogation dans ETAT-TECHNIQUE.md (Section "Décisions & Dérogations").
- **INTERDIT** d'appliquer un override sans traçabilité.

---

## 🔐 SÉCURITÉ D'AUTHENTIFICATION - GUIDELINES CRITIQUES

### **⚠️ RÈGLE FONDAMENTALE : AUTHENTIFICATION SÉCURISÉE OBLIGATOIRE**

**Toute application mobile PWA DOIT implémenter un système d'authentification sécurisé dès la conception initiale. Les vulnérabilités d'authentification sont CRITIQUES et peuvent compromettre l'intégrité de l'application et la sécurité des données utilisateur.**

---

### **🛡️ FRAMEWORK DE SÉCURITÉ D'AUTHENTIFICATION**

#### **1. HACHAGE SÉCURISÉ DES MOTS DE PASSE (OBLIGATOIRE)**

**❌ INTERDICTIONS ABSOLUES :**
- ❌ **JAMAIS** stocker les mots de passe en texte clair
- ❌ **JAMAIS** utiliser des algorithmes de hachage faibles (MD5, SHA1)
- ❌ **JAMAIS** utiliser des salts statiques ou prévisibles
- ❌ **JAMAIS** omettre la validation de la force des mots de passe

**✅ OBLIGATIONS STRICTES :**
- ✅ **TOUJOURS** utiliser Web Crypto API avec PBKDF2 + SHA-256
- ✅ **TOUJOURS** générer un salt aléatoire de 128 bits minimum
- ✅ **TOUJOURS** utiliser au minimum 100,000 itérations
- ✅ **TOUJOURS** valider la force des mots de passe (minimum 4 caractères)

```typescript
// ✅ IMPLÉMENTATION OBLIGATOIRE - Hachage sécurisé
const hashPassword = async (password: string, salt?: string) => {
  const saltBytes = salt ? base64ToArrayBuffer(salt) : generateSalt();
  const key = await crypto.subtle.importKey(
    'raw', password, 'PBKDF2', false, ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { 
      name: 'PBKDF2', 
      salt: saltBytes, 
      iterations: 100000, 
      hash: 'SHA-256' 
    },
    key, 256
  );
  return arrayBufferToBase64(saltBytes) + '$' + arrayBufferToBase64(derivedBits);
};
```

#### **2. SCHÉMA DE BASE DE DONNÉES SÉCURISÉ (OBLIGATOIRE)**

**✅ STRUCTURE OBLIGATOIRE :**
```typescript
interface User {
  id: string;
  username: string;
  email: string;
  phone: string;
  passwordHash: string;  // OBLIGATOIRE - Jamais en texte clair
  role: 'user' | 'admin';
  preferences: UserPreferences;
  createdAt: Date;
  lastSync: Date;
}
```

**✅ MIGRATION OBLIGATOIRE :**
- **TOUJOURS** versionner le schéma de base de données
- **TOUJOURS** fournir une migration pour les utilisateurs existants
- **TOUJOURS** marquer les utilisateurs sans mot de passe pour migration forcée

```typescript
// ✅ MIGRATION OBLIGATOIRE - Utilisateurs existants
this.version(4).stores({
  users: 'id, username, email, phone, passwordHash, lastSync'
}).upgrade(tx => {
  return tx.users.toCollection().modify(user => {
    if (!user.passwordHash) {
      user.passwordHash = `MIGRATION_REQUIRED_${Date.now()}`;
    }
  });
});
```

#### **3. SÉPARATION LOGIN/REGISTER (OBLIGATOIRE)**

**❌ INTERDICTIONS CRITIQUES :**
- ❌ **JAMAIS** créer des comptes automatiquement lors de la connexion
- ❌ **JAMAIS** mélanger les flux de connexion et d'inscription
- ❌ **JAMAIS** permettre la connexion sans vérification de mot de passe

**✅ OBLIGATIONS STRICTES :**
- ✅ **TOUJOURS** séparer clairement `login()` et `register()`
- ✅ **TOUJOURS** vérifier l'existence de l'utilisateur avant connexion
- ✅ **TOUJOURS** valider le mot de passe avec le hash stocké

```typescript
// ✅ IMPLÉMENTATION OBLIGATOIRE - Séparation des flux
const login = async (username: string, password: string) => {
  const user = await findUserByUsername(username);
  if (!user) {
    return { success: false, error: 'Utilisateur inexistant' };
  }
  
  if (user.passwordHash.startsWith('MIGRATION_REQUIRED_')) {
    return { success: false, error: 'Veuillez réinitialiser votre mot de passe' };
  }
  
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return { success: false, error: 'Mot de passe incorrect' };
  }
  
  return { success: true, user };
};
```

---

### **🚨 VULNÉRABILITÉS CRITIQUES À ÉVITER**

#### **1. VULNÉRABILITÉ #1 : Aucune validation de mot de passe**
**❌ PATTERN DANGEREUX :**
```typescript
// ❌ INTERDIT - Connexion sans vérification
const login = (username: string, password: string) => {
  const user = findUser(username);
  return { success: true, user }; // DANGEREUX !
};
```

**✅ CORRECTION OBLIGATOIRE :**
```typescript
// ✅ CORRECT - Vérification obligatoire
const login = async (username: string, password: string) => {
  const user = await findUserByUsername(username);
  if (!user) return { success: false, error: 'Utilisateur inexistant' };
  
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) return { success: false, error: 'Mot de passe incorrect' };
  
  return { success: true, user };
};
```

#### **2. VULNÉRABILITÉ #2 : Création automatique de comptes**
**❌ PATTERN DANGEREUX :**
```typescript
// ❌ INTERDIT - Création automatique
const login = (username: string, password: string) => {
  let user = findUser(username);
  if (!user) {
    user = createUser(username, password); // DANGEREUX !
  }
  return { success: true, user };
};
```

**✅ CORRECTION OBLIGATOIRE :**
```typescript
// ✅ CORRECT - Séparation stricte
const login = async (username: string, password: string) => {
  const user = await findUserByUsername(username);
  if (!user) {
    return { success: false, error: 'Utilisateur inexistant' };
  }
  // Vérification du mot de passe...
};

const register = async (username: string, email: string, phone: string, password: string) => {
  const existingUser = await findUserByUsername(username);
  if (existingUser) {
    return { success: false, error: 'Ce nom d\'utilisateur est déjà utilisé' };
  }
  // Création du compte...
};
```

#### **3. VULNÉRABILITÉ #3 : Stockage en texte clair**
**❌ PATTERN DANGEREUX :**
```typescript
// ❌ INTERDIT - Stockage en texte clair
interface User {
  id: string;
  username: string;
  password: string; // DANGEREUX !
}
```

**✅ CORRECTION OBLIGATOIRE :**
```typescript
// ✅ CORRECT - Hachage sécurisé
interface User {
  id: string;
  username: string;
  passwordHash: string; // SÉCURISÉ
}
```

#### **4. VULNÉRABILITÉ #4 : Validation côté client uniquement**
**❌ PATTERN DANGEREUX :**
```typescript
// ❌ INTERDIT - Validation côté client uniquement
const validatePassword = (password: string) => {
  if (password.length < 4) {
    alert('Mot de passe trop court'); // DANGEREUX !
    return false;
  }
  return true;
};
```

**✅ CORRECTION OBLIGATOIRE :**
```typescript
// ✅ CORRECT - Validation côté serveur
const validatePasswordStrength = (password: string) => {
  if (password.length < 4) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins 4 caractères' };
  }
  if (!/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/.test(password)) {
    return { valid: false, error: 'Le mot de passe contient des caractères non autorisés' };
  }
  return { valid: true };
};
```

---

### **🔄 MÉTHODOLOGIE DE CORRECTION PROGRESSIVE**

#### **PHASE 1 : Infrastructure de sécurité (OBLIGATOIRE)**
1. **Ajouter le champ `passwordHash`** au schéma de base de données
2. **Implémenter les fonctions de hachage** avec Web Crypto API
3. **Créer la migration** pour les utilisateurs existants
4. **Tester la migration** sans perte de données

#### **PHASE 2 : Séparation des flux (OBLIGATOIRE)**
1. **Séparer `login()` et `register()`** en méthodes distinctes
2. **Implémenter la vérification de mot de passe** dans `login()`
3. **Ajouter la validation de force** des mots de passe
4. **Tester les flux séparément**

#### **PHASE 3 : Tests de sécurité (OBLIGATOIRE)**
1. **Créer des tests de sécurité** automatisés
2. **Vérifier que les mots de passe incorrects sont rejetés**
3. **Vérifier que les utilisateurs inexistants ne peuvent pas se connecter**
4. **Valider la persistance des données** existantes

#### **PHASE 4 : Interface utilisateur (OBLIGATOIRE)**
1. **Mettre à jour l'interface** pour gérer les erreurs spécifiques
2. **Implémenter le flux de réinitialisation** pour les utilisateurs migrés
3. **Ajouter la validation en temps réel** des formulaires
4. **Tester l'expérience utilisateur** complète

---

### **📱 PATTERNS D'AUTHENTIFICATION PWA MOBILE**

#### **1. Web Crypto API pour le hachage (OBLIGATOIRE)**
```typescript
// ✅ PATTERN OBLIGATOIRE - Hachage sécurisé PWA
const generateSalt = (): Uint8Array => {
  return crypto.getRandomValues(new Uint8Array(16));
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};
```

#### **2. Stockage IndexedDB sécurisé (OBLIGATOIRE)**
```typescript
// ✅ PATTERN OBLIGATOIRE - Stockage sécurisé
interface SecureUser {
  id: string;
  username: string;
  email: string;
  phone: string;
  passwordHash: string; // Jamais en texte clair
  role: 'user' | 'admin';
  createdAt: Date;
  lastSync: Date;
}

// Migration obligatoire pour la sécurité
this.version(4).stores({
  users: 'id, username, email, phone, passwordHash, lastSync'
}).upgrade(tx => {
  return tx.users.toCollection().modify(user => {
    if (!user.passwordHash) {
      user.passwordHash = `MIGRATION_REQUIRED_${Date.now()}`;
    }
  });
});
```

#### **3. Gestion des erreurs spécifiques (OBLIGATOIRE)**
```typescript
// ✅ PATTERN OBLIGATOIRE - Messages d'erreur spécifiques
const AUTH_ERRORS = {
  USER_NOT_FOUND: 'Utilisateur inexistant',
  WRONG_PASSWORD: 'Mot de passe incorrect',
  USERNAME_TAKEN: 'Ce nom d\'utilisateur est déjà utilisé',
  WEAK_PASSWORD: 'Le mot de passe doit contenir au moins 4 caractères',
  MIGRATION_REQUIRED: 'Veuillez réinitialiser votre mot de passe',
  INVALID_INPUT: 'Veuillez remplir tous les champs'
} as const;
```

#### **4. Gestion des sessions offline-first (OBLIGATOIRE)**
```typescript
// ✅ PATTERN OBLIGATOIRE - Session sécurisée
const createSecureSession = (user: User) => {
  const sessionData = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    // JAMAIS stocker passwordHash en localStorage
  };
  
  localStorage.setItem('app-user', JSON.stringify(sessionData));
  return sessionData;
};
```

---

### **🧪 TESTS DE SÉCURITÉ OBLIGATOIRES**

#### **1. Tests critiques qui DOIVENT échouer (Sécurité)**
```typescript
// ✅ TESTS OBLIGATOIRES - Sécurité maintenue
describe('Sécurité Authentification', () => {
  test('Mot de passe incorrect doit être rejeté', async () => {
    const result = await authService.login('user', 'wrongpassword');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Mot de passe incorrect');
  });

  test('Utilisateur inexistant doit être rejeté', async () => {
    const result = await authService.login('nonexistent', 'password');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Utilisateur inexistant');
  });

  test('Nom d\'utilisateur dupliqué doit être rejeté', async () => {
    await authService.register('testuser', 'test@example.com', '+261 34 00 000 00', 'password');
    const result = await authService.register('testuser', 'test2@example.com', '+261 34 00 000 01', 'password2');
    expect(result.success).toBe(false);
    expect(result.error).toContain('déjà utilisé');
  });

  test('Mot de passe faible doit être rejeté', async () => {
    const result = await authService.register('testuser', 'test@example.com', '+261 34 00 000 00', '123');
    expect(result.success).toBe(false);
    expect(result.error).toContain('4 caractères');
  });
});
```

#### **2. Tests de fonctionnalité qui DOIVENT réussir**
```typescript
// ✅ TESTS OBLIGATOIRES - Fonctionnalité confirmée
describe('Fonctionnalité Authentification', () => {
  test('Connexion avec bonnes informations doit réussir', async () => {
    await authService.register('testuser', 'test@example.com', '+261 34 00 000 00', 'password123');
    const result = await authService.login('testuser', 'password123');
    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
  });

  test('Inscription valide doit réussir', async () => {
    const result = await authService.register('newuser', 'new@example.com', '+261 34 00 000 00', 'password123');
    expect(result.success).toBe(true);
    expect(result.user.username).toBe('newuser');
  });

  test('Hachage des mots de passe doit être sécurisé', async () => {
    await authService.register('testuser', 'test@example.com', '+261 34 00 000 00', 'password123');
    const user = await db.users.get('testuser');
    expect(user.passwordHash).toBeDefined();
    expect(user.passwordHash.length).toBeGreaterThan(50);
    expect(user.passwordHash).not.toContain('password123');
  });
});
```

#### **3. Tests de persistance des données (OBLIGATOIRE)**
```typescript
// ✅ TESTS OBLIGATOIRES - Persistance maintenue
describe('Persistance des Données', () => {
  test('Données existantes doivent être préservées après migration', async () => {
    const initialUsers = await db.users.toArray();
    const initialAccounts = await db.accounts.toArray();
    const initialTransactions = await db.transactions.toArray();
    
    // Effectuer la migration de sécurité
    await migrateToSecureAuth();
    
    const finalUsers = await db.users.toArray();
    const finalAccounts = await db.accounts.toArray();
    const finalTransactions = await db.transactions.toArray();
    
    expect(finalUsers.length).toBe(initialUsers.length);
    expect(finalAccounts.length).toBe(initialAccounts.length);
    expect(finalTransactions.length).toBe(initialTransactions.length);
  });
});
```

---

### **📋 CHECKLIST DE SÉCURITÉ OBLIGATOIRE**

#### **🔐 Avant la mise en production :**
- [ ] **Hachage sécurisé** : PBKDF2 + SHA-256 + 100,000 itérations
- [ ] **Salt aléatoire** : 128 bits minimum généré à chaque mot de passe
- [ ] **Validation côté serveur** : Toutes les entrées validées
- [ ] **Séparation login/register** : Flux distincts et sécurisés
- [ ] **Messages d'erreur spécifiques** : Pas de messages génériques
- [ ] **Migration des utilisateurs** : Aucune perte de données
- [ ] **Tests de sécurité** : Tous les tests critiques passent
- [ ] **Persistance des données** : Données existantes préservées
- [ ] **Interface utilisateur** : Gestion d'erreurs claire
- [ ] **Session sécurisée** : Pas de données sensibles en localStorage

#### **🧪 Tests de validation :**
- [ ] **Mot de passe incorrect** → Rejeté avec message spécifique
- [ ] **Utilisateur inexistant** → Rejeté avec message spécifique
- [ ] **Nom d'utilisateur dupliqué** → Rejeté avec message spécifique
- [ ] **Mot de passe faible** → Rejeté avec message spécifique
- [ ] **Hachage sécurisé** → Confirmé (longueur + complexité)
- [ ] **Persistance des données** → Confirmée (aucune perte)
- [ ] **Workflow utilisateur** → Complet et fonctionnel
- [ ] **Migration des utilisateurs** → Sans perte de données

---

### **⚠️ RÈGLES CRITIQUES DE SÉCURITÉ**

#### **🚨 INTERDICTIONS ABSOLUES :**
- ❌ **JAMAIS** implémenter d'authentification sans hachage de mot de passe
- ❌ **JAMAIS** créer des comptes automatiquement lors de la connexion
- ❌ **JAMAIS** stocker des mots de passe en texte clair
- ❌ **JAMAIS** se fier uniquement à la validation côté client
- ❌ **JAMAIS** ignorer les tests de sécurité avant la mise en production

#### **✅ OBLIGATIONS STRICTES :**
- ✅ **TOUJOURS** implémenter un système d'authentification sécurisé dès la conception
- ✅ **TOUJOURS** utiliser Web Crypto API pour le hachage des mots de passe
- ✅ **TOUJOURS** séparer clairement les flux de connexion et d'inscription
- ✅ **TOUJOURS** valider toutes les entrées côté serveur
- ✅ **TOUJOURS** tester la sécurité avant la mise en production
- ✅ **TOUJOURS** préserver les données existantes lors des migrations

---

## 📄 LICENCE

Ce document contient des règles de développement génériques applicables à tout projet React/TypeScript/PWA.

---


---

**📋 README-TECHNIQUE : Règles de développement génériques pour projets React/TypeScript/PWA**

**🎯 Objectif : Guide réutilisable pour maintenir la cohérence et la qualité du code**