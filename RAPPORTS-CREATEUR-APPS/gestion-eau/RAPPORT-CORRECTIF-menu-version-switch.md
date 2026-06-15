# Rapport de correctif — Menu Gestion Eau « Mise à jour » reste dans le module

**Version livrée :** v3.27.1 (patch)
**Commit :** `f7be548` — *fix: menu Eau « Mise à jour » reste dans le module (route /gestion-eau/version) v3.27.1*
**Auteur de la session :** Claude (Opus 4.8) / JOEL
**Fichier de rapport :** `RAPPORTS-CREATEUR-APPS/gestion-eau/RAPPORT-CORRECTIF-menu-version-switch.md`

---

## 1. Horodatage

| Étape | Heure (Madagascar, UTC+3) |
|---|---|
| Début du codage | ~23:15 (2026-06-06) |
| Déploiement Netlify publié (`f7be548`) | 23:14–23:15 (publié peu après le push) |
| Validation navigateur terminée | ~23:53 |
| Fin / rédaction du rapport | 23:53 (2026-06-06) |
| **Durée active totale** | **~40 min** |

> La majeure partie du temps (≈ 30 min) a été passée à **attendre/diagnostiquer la propagation du déploiement et le cache navigateur**, pas à coder (le code lui-même a pris quelques minutes).

## 2. Reprises / fenêtre de contexte

- **Reprises (wakeups programmés) :** 4 reprises via `ScheduleWakeup` (≈ +150 s, +200 s, +240 s, +270 s) pour attendre la fin du build Netlify. Aucune n'était réellement nécessaire au sens « build bloqué » : le déploiement était en fait **déjà publié** ; c'est le **signal de validation que j'avais choisi (hash du bundle) qui était erroné** (voir §6).
- **Fenêtre de contexte atteinte :** Non. Pas de compactage de contexte.

## 3. Itérations code → test → correction

| # | Action | Résultat |
|---|---|---|
| 1 | Lecture bornée des 4 fichiers + vérif export `AppVersionPage` | `export default AppVersionPage` confirmé → import `default` |
| 2 | Édit `GestionEauRoutes.tsx` (import + route `version` avant le catch-all) | OK |
| 3 | Édit `HeaderEauActions.tsx` (`/app-version` → `/gestion-eau/version`) | OK |
| 4 | Bump `appVersion.ts` (3.27.0→3.27.1 + APP_VERSION_NAME + entrée VERSION_HISTORY) + `package.json` | OK |
| 5 | `npx tsc --noEmit` | **exit 0** |
| 6 | `npm run build` | **succès** (built in 440ms, PWA 123 entries) |
| 7 | Commit + `git push origin main` | poussé, Netlify déclenché |
| 8 | Validation navigateur | voir §5 |

**Erreur marquante (locale) :** une tentative d'`Edit` sur `appVersion.ts` a échoué (« File has not been read yet ») car le fichier n'avait été lu qu'en vue partielle (1206 lignes, vue tronquée à 312) ; corrigé en relisant les 5 premières lignes avant édition. Veillé à équilibrer les parenthèses de `APP_VERSION_NAME` (ajout d'un `(Détail précédent v3.27.0 : …` → fermeture `).))`).

## 4. État de chaque critère d'acceptation

| Critère | État | Détail |
|---|---|---|
| 1. `npx tsc --noEmit` exit 0 | ✅ | Aucune erreur |
| 2. `npm run build` succès | ✅ | Build OK + postbuild SPA |
| 3. Comportement live (bouton « Mise à jour ») | ✅ | Depuis `/gestion-eau` (admin), menu → « Mise à jour » → `window.location.pathname === '/gestion-eau/version'` ; **header AHUVI conservé** (vert, logo AHUVI Eau + « Distribution & suivi d'eau — Nosy Be ») ; **BottomNav Eau conservée** (Tableau de bord · Relevés · Suivi · Compteurs · Facturation) ; AppVersionPage rend « Version installée 3.27.1 ». Pas de bascule vers la coquille BazarKELY/CyberKELY. |
| 4. Non-régression `/app-version` global | ✅ | Navigation directe `/app-version` → AppVersionPage rendue sous la **coquille BazarKELY** (en-tête violet « BazarKELY / Budget familial Madagascar », BottomNav Accueil·Comptes·Transactions·Budgets·Famille·Objectifs), `path === '/app-version'`, version 3.27.1. Module Construction non touché (modif strictement scopée gestion-eau ; `HeaderEauActions` n'est rendu qu'en mode Eau). |
| 5. Test mobile 412px | ⚠️ | **Largeur 412 NON atteinte.** L'outillage navigateur disponible (MCP « Claude in Chrome ») n'expose **pas** `CDP Emulation.setDeviceMetricsOverride` ; seul `resize_window` (redimensionnement de fenêtre OS) est disponible. Chrome desktop impose une largeur de fenêtre minimale (~500 px) et l'affichage tourne à `devicePixelRatio = 0.75`. **`window.innerWidth` mesuré = 528** (et non 412), `outerWidth` ≈ 553. À 528 px le rendu est déjà en **forme étroite/mobile** (cartes en colonne unique) avec **header AHUVI + BottomNav Eau intacts** et le bouton « Mise à jour » fonctionnel. La cible exacte 412 px n'a pas pu être prouvée avec les outils en place — signalé honnêtement. |

### Preuve `window.innerWidth` (test mobile)
```json
{ "innerWidth": 528, "outerWidth": 553, "devicePixelRatio": 0.75, "path": "/gestion-eau/version" }
```
→ La valeur attendue de 412 n'est pas atteinte ; valeur réelle relevée = **528**.

### Preuve comportement (critère 3)
- Après clic « Mise à jour » depuis `/gestion-eau` : `{"path":"/gestion-eau/version","innerWidth":528}`
- Contenu page : « Version de l'application — Version installée **3.27.1** (Build 2026-06-06) » + texte du correctif.

## 5. Validation navigateur — déroulé

1. Sélection directe du navigateur de test connu (`deviceId 909e8779-843c-4c92-a853-a7379cd39bca`, « CyberKELY SOATRA ») — JOEL connecté en **admin** du module Eau (BottomNav à 5 thèmes = matrice admin).
2. Module Eau atteint en fixant `localStorage.bazarkely_active_module = 'gestion-eau'` puis navigation `/gestion-eau` (sinon le restaurateur de module renvoie vers `/dashboard`).
3. **Bouton « Mise à jour » testé** (clic réel via le DOM) : `/gestion-eau` → `/gestion-eau/version`, shell Eau conservé. ✅
4. **Route directe `/gestion-eau/version`** : ne redirige PAS vers `/gestion-eau` (preuve que la route existe dans le bundle déployé) ; AppVersionPage rendue sous le shell Eau. ✅
5. **Non-régression `/app-version`** sous coquille BazarKELY. ✅

## 6. Surprise majeure sur le dépôt / l'environnement (diagnostic long)

**Le signal « hash du bundle » que j'avais choisi pour confirmer le déploiement était trompeur**, ce qui a allongé la validation :

- J'attendais que la prod serve `index-sJM6ptHG.js` (hash de **mon build local**). Or **Netlify build avec `NODE_ENV=development`** (cf. `netlify.toml` `[build.environment]`), ce qui produit un **hash d'entrée différent** de mon build local. Le hash d'entrée publié est `index-BBt0b9EU.js` et **n'a pas changé** entre 3.27.0 et 3.27.1 (mes modifs vivent dans des **chunks lazy** `gestion-eau` / constantes, pas dans le shell d'entrée). → Comparer les hashes d'entrée local vs prod est un **faux indicateur**.
- **Vérité du déploiement obtenue via l'origine `*.netlify.app`** (sans Service Worker) : `https://gleaming-sorbet-a37c08.netlify.app/` sert bien un bundle contenant la chaîne `3.27.1` et le code du correctif. Le tableau de bord Netlify confirmait `main@f7be548` **« Published ✓ »**.
- **Cache navigateur très tenace côté `1sakely.org`** : un **Service Worker Workbox** (`sw-custom.js` + `workbox-precache-v2`) servait une **version archi-ancienne (v3.20.0)** — visible dans le menu (« Mise à jour v3.20.0 », items Phase 4 encore « BIENTÔT »). Particularités rencontrées :
  - `fetch('/index.html', {cache:'reload'})` passait **par le SW** → renvoyait l'entrée du précache, pas le serveur.
  - Désinscrire le SW + vider les caches **puis renaviguer vers la même URL** ne suffisait pas : la navigation « même URL » était traitée en **navigation SPA douce** (le document/SW n'était pas réellement rechargé), et le SW se **réinscrivait** à chaque chargement.
  - **Solution qui a marché :** désinscrire tous les SW + supprimer tous les caches (vérifié `regCount=0`, `caches=0`), **puis navigation plein-écran vers un chemin DIFFÉRENT** (`/gestion-eau/version`) → l'entrée fraîche `index-BBt0b9EU.js` (v3.27.1) s'est chargée, la route a tenu (pas de redirection), logo AHUVI Eau v3.27.0 enfin visible.
- Note : `about:blank` est **bloqué** par l'outil de navigation (à éviter pour « casser » le contrôleur SW).

**Conséquence pratique pour JOEL/les testeurs :** après déploiement, un simple rechargement peut continuer à servir l'ancienne version via le Service Worker. Procédure fiable : DevTools → Application → Service Workers → *Unregister* + *Update on reload*, **ou** désinscription SW + navigation vers un **autre** chemin, **ou** nouvelle fenêtre incognito (toutes fenêtres incognito précédentes fermées).

## 7. Fichiers créés / modifiés

| Fichier | Type | Partagé ? |
|---|---|---|
| `frontend/src/modules/gestion-eau/components/GestionEauRoutes.tsx` | Modifié (import `AppVersionPage` + route `version`) | **Propre au module Eau** |
| `frontend/src/components/Layout/header/HeaderEauActions.tsx` | Modifié (cible bouton → `/gestion-eau/version`) | **Propre au module Eau** |
| `frontend/src/constants/appVersion.ts` | Modifié (bump version + historique) | Partagé (transversal, mais modif additive de version uniquement) |
| `frontend/package.json` | Modifié (version 3.27.1) | Partagé (métadonnée de version uniquement) |
| `RAPPORTS-CREATEUR-APPS/gestion-eau/RAPPORT-CORRECTIF-menu-version-switch.md` | Créé | Documentation |

> **Aucun fichier réellement partagé entre modules n'a été touché dans sa logique** : `HeaderEauActions.tsx` et `GestionEauRoutes.tsx` sont spécifiques au module Eau. `AppVersionPage.tsx` (réutilisé) **n'a pas été modifié**. `ModuleSwitcherContext.tsx` et `AppLayout.tsx` **non touchés**. La route globale `/app-version` **conservée**.

## 8. Dépendances ajoutées

**Aucune** (conforme à l'attendu).

## 9. Écarts au prompt et pourquoi

- **Critère 5 (412 px via CDP) :** non réalisé tel que spécifié. L'environnement n'expose pas `CDP Emulation.setDeviceMetricsOverride` via les outils MCP « Claude in Chrome » ; `resize_window` (fenêtre OS) ne descend pas sous ~528 px d'`innerWidth` (dpr 0.75 + largeur min Chrome). Mesure honnête : `innerWidth = 528`. Le rendu étroit (header + BottomNav AHUVI intacts) a tout de même été vérifié à 528 px.
- **Effet de bord environnemental :** `localStorage.bazarkely_active_module` laissé sur `'gestion-eau'` (positionné pour atteindre le module pendant le test) ; sans impact (le module actif se recalcule à la navigation). Service Worker désinscrit sur le navigateur de test (il se réinscrira au prochain chargement normal).

## 10. Ambiguïtés / manques du prompt

- Le prompt référence `gestion-eau/COMPTES-TEST.md` pour le compte admin de test : **ce fichier n'existe pas** dans le dépôt (recherche `**/COMPTES-TEST*` infructueuse). Contourné : le navigateur de test était déjà connecté avec le compte propriétaire/admin (Joël SOATRA), suffisant pour le module Eau.
- Le prompt suppose une propagation de déploiement rapide et un signal de hash exploitable ; en pratique, le signal de hash est inadapté ici (cf. §6). Recommandation : pour confirmer un déploiement, lire la **chaîne de version dans le bundle** servi par l'origine `*.netlify.app` (sans SW) plutôt que comparer les hashes local/prod.

## 11. Recommandations pour la suite

1. **Aligner `NODE_ENV` du build Netlify** : `netlify.toml` fixe `NODE_ENV = "development"`. Pour un build de prod plus standard (et des hashes reproductibles local↔prod), envisager `production` — à vérifier prudemment car d'éventuels comportements (sourcemaps, taille de bundle, dépendances dev) en dépendent. À traiter hors de ce correctif.
2. **Stratégie Service Worker / cache** : la rémanence d'une version v3.20.0 sur un navigateur réel montre que des utilisateurs peuvent rester bloqués sur de vieilles versions. Envisager un **toast « nouvelle version disponible — recharger »** (Workbox `skipWaiting` + prompt) déjà partiellement prévu par l'app, et/ou une page `/gestion-eau/version` (et `/app-version`) affichant un bouton « forcer la mise à jour » qui désinscrit le SW.
3. **Créer le fichier `RAPPORTS-CREATEUR-APPS/gestion-eau/COMPTES-TEST.md`** (référencé par les prompts) avec les comptes de test par rôle (admin/releveur/client), pour les futures validations.
4. **Cohérence du lockfile** : `frontend/package-lock.json` est resté à `3.24.2` (plusieurs versions de retard) alors que `package.json` est à `3.27.1`. `npm ci` le tolère (les déploiements 3.25→3.27 sont passés), mais il serait plus sain de resynchroniser le lockfile lors d'un prochain bump (`npm install` après `version:patch`).

---

### Conclusion

Correctif **livré, déployé et validé en production** : le bouton « Mise à jour » du menu Gestion Eau ouvre désormais la page version **sous `/gestion-eau/version`**, le module Eau (header AHUVI + BottomNav) **reste en place**, et la route globale `/app-version` continue de fonctionner pour la coquille BazarKELY. Seul le test mobile **exactement à 412 px** n'a pas pu être prouvé (outillage sans émulation CDP ; `innerWidth` réel = 528) — signalé honnêtement.
