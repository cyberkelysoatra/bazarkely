# Correspondance ancien CLAUDE.md → nouvelle place (ALLEG-CC-01)

Ancien fichier = `git show 5913b80:CLAUDE.md` (38 397 octets sur disque). Légende : **C** = nouveau `CLAUDE.md` (condensé), **P** = `PIEGES-DETAILLES.md` (récit mot pour mot), **O** = `PROCEDURES-OUTILS.md` (déjà présent, non modifié), **corrigée** = fait périmé remplacé.

## En-tête

| Ancienne règle | Nouvelle place |
|---|---|
| Projet, stack, racine, frontend | C, en-tête (stack sans « (Netlify) ») |
| « Production : 1sakely.org (Netlify, auto-deploy depuis GitHub `main`) » | **corrigée** : « Cloudflare Pages, branche `cloudflare-migration` ; Netlify = secours dormant (déploiement auto en pause) ; `main` n'est plus la branche de prod » |
| « Déploiement : `DEPLOYER.ps1` → TypeScript check → build → git commit → push » | **corrigée** : C #5 dit que `DEPLOYER.ps1` est périmé (pousse vers `main`, `tsc` inopérant) |
| Consulter `PROCEDURES-OUTILS.md` à chaque session ; y consigner tout nouveau blocage résolu, pas dans CLAUDE.md | C, encadré d'en-tête (+ O) |

## Règles

| Ancienne règle | Nouvelle place |
|---|---|
| #0ter JOEL ne fournit pas le SQL ; Claude le produit (specs, prompts, schéma, alignement sur SQL de référence ex. `SUPABASE-SQL.md`) | C #0ter |
| #0ter Claude l'exécute via le navigateur de JOEL (Claude in Chrome), puis vérifie via l'API REST (source de vérité), JOEL ne copie rien | C #0ter (+ O procédure standard) |
| #0ter SQL idempotent, re-vérifier après (crash UI ≠ échec serveur, crash Translate « removeChild » cosmétique), ne jamais moissonner de jeton | C #0ter (+ O P1, P4, P11) |
| #0 Français avec JOEL ; code, commits, commentaires en anglais | C #0 |
| #0bis Doute non trivial → pas de code/analyse direct, questions fermées par séries | C #0bis |
| #0bis Série 1 = 2 à 4 questions fermées sur les fondamentaux ; attendre ; série 2 ajustée ; continuer jusqu'au cadrage net ; ensuite seulement état des lieux / proposition / code | C #0bis |
| #0bis Toujours fermées, jamais ouvertes ; annoncer la série ; demander format court | C #0bis |
| #0bis Pas de procédure pour le trivial ; « Pourquoi » (élaguer des branches, éviter les fausses pistes) | C #0bis |
| #1 Lire, tracer, point exact, dépendances, correction minimale | C #1 |
| #1 Questions : requête qui pend → timeout ; état async non résolu dans catch/else ; processus parallèles ; SW ancienne version | C #1 |
| #2 Importeurs ; signatures ; pas de suppression sans vérification ; re-tester l'existant | C #2 |
| #3 Fix déclaré résolu seulement si logs prod ou code simple et isolé ; sinon décrire les logs attendus et demander à JOEL | C #3 |
| #4 2 échecs : relire, chercher ailleurs, demander logs console ; 3 échecs : admettre, repartir de zéro | C #4 |
| #5 Workflow `npm run build` → `git add` → `git commit` → **`git push origin main` → Netlify** | **corrigée** : `git push origin cloudflare-migration` → Cloudflare Pages déploie (+ contrôle de types par compteur ajouté à la séquence) |
| #5 Types de commits `fix: feat: chore: refactor: docs:` | C #5 |
| #5 Bumper `appVersion.ts` + `package.json` ; `npm run version:patch/minor/major` | C #5 |
| #5 Le SW met en cache ; recharger / fenêtre incognito pour tester | C, piège « Service Worker et tests en production » (« Après déploiement, le SW sert l'ancien cache : recharger… ») |

## Accès aux modules (v3.80.0)

| Ancienne règle | Nouvelle place |
|---|---|
| Quatre modules + tableau (navy-ay, bazarkely, gestion-eau, construction, pudi, admin) | C, tableau repris intégralement (libellés raccourcis sans perte) |
| `moduleAccess.ts` (fonctions testées) ; `modulePrefsSync.ts` seul écrivain, patch idempotent, file `bazarkely_prefs_pending`, relecture + fusion, ne jamais écraser `moduleOrder` | C |
| `preferences.modules` = affichage, jamais une sécurité | C |
| Démarrage à froid « non résolue », accès laissé ouvert, refus seulement sur liste confirmée | C |
| Eau / Construction ajoutés sur accès confirmé, retirés sur refus confirmé | C |
| Nouvelle route budget dans `BudgetAccessRoute` | C |
| Stockage `navy-documents` sensible : jamais public, titulaire + opératrices, liens signés courts, rien gardé sur l'appareil | C |

## Pièges connus (17 sections)

Chaque piège : titre identique dans C et P (seul changement : le tiret cadratin des titres remplacé par « : »), règle courte dans C, récit complet mot pour mot dans P, renvoi commun en tête de la section des pièges de C.

| Ancien piège | C (règle courte) | P (récit) | Remarque |
|---|---|---|---|
| `npm run build` ne contrôle PAS les types | oui | oui | grep `x` ET `setX` conservé |
| ⛔ CORRECTION `npx tsc --noEmit` SEUL NE VÉRIFIE RIEN | oui (commandes de comptage complètes) | oui | « 1983 erreurs », méthode de comptage qui fait foi, deux conditions de fin : dans C. Dette d'assainissement : P |
| Encodage presse-papiers | oui | oui | |
| Colonnes de `users` modifiables | oui | oui | listes INSERT `authenticated`, `anon` refusé, migrations, `navy_find_user_by_email` : P |
| `getUser()` plante en offline | oui | oui | extrait de code `getCurrentUserSafe` : P |
| Méthodes de solde no-op | oui | oui | `updateAccountBalanceAfterTransaction` (ancien chemin) : P ; règle actuelle = `applyBalanceMovement` (C) |
| Suppression massive par identifiants | oui | oui | |
| DB queries sans timeout | oui | oui | extrait `withTimeout` : P |
| Doublons synchro | oui | oui | marqueur de log de l'ancien bug, chemins purement en ligne non concernés : P |
| Soldes = mouvement | oui | oui | table `account_balance_movements`, verrou, somme des mouvements en vol, corollaire refresh comptes/budgets : P |
| Synchro descendante (suppressions serveur) | oui | oui | détail des 5 protections, `restoreFromQuarantine` : P |
| Drift Dexie ↔ Supabase | oui | oui | |
| Flux OAuth Google | oui | oui | |
| Service Worker et tests en prod | oui | oui | procédure en 6 étapes, comparaison de hash : P |
| Chaîne offline-first | oui | oui | 5 étapes de traçage, exemple S69 : P |
| Snapshots dénormalisés | oui | oui | |
| `setAuthenticated(false)` intempestif | oui | oui | |

## Sections finales

| Ancienne règle | Nouvelle place |
|---|---|
| Architecture fichiers clés (9 fichiers) | C, en ligne |
| Workflow de session « quand JOEL signale un bug » (6 étapes) | C « SESSION » |
| Format de log utile (4 éléments) | C « SESSION » |
| Métriques : « TypeScript compile sans erreur (`npm run typecheck`) » | **corrigée** : C #5 (qui vaut métriques de qualité) : « types par compteur (pièges ; pas `npm run typecheck` (`tsc -b`) ni `npm run type-check` (`tsc --noEmit`)) » |
| Métriques : build OK, version bumpée, requêtes DB critiques avec timeout | C #5 (section fusionnée dans la règle #5) |
| Clôture : 3 conditions, dont « push sur `main`, Netlify a déployé » | **corrigée** : « version poussée sur `cloudflare-migration` et déployée » |
| Clôture : processus en 5 étapes, annonce, paragraphe de lancement (chat + presse-papiers, `---`, titre, bloc `>`, test de pertinence, contenu, coupes, pas de reco inventée, jamais à redemander) | C « CLÔTURE DE SESSION » (+ mémoire `feedback_session_handoff.md`) |
| Gabarit « Paragraphe de lancement [SXX+1] » | C, décrit dans l'étape (5) |
| Documentation projet (6 fichiers) | C « DOCUMENTATION » (+ `PIEGES-DETAILLES.md`, `PROCEDURES-OUTILS.md` dans l'en-tête) |
