# RAPPORT — Correctif deep-link / refresh `/gestion-eau` → `/dashboard`

- **Date / heure (dernière action)** : 2026-06-07, ~06:20 UTC (08:20 Madagascar)
- **Version déployée** : **v3.29.1** (patch) — entry servi `index-DLaTE1uW.js` sur `https://1sakely.org`
- **Commit** : `3f7a5b2` — `fix(gestion-eau): deep-link/hard-reload sur /gestion-eau ne rebondit plus vers /dashboard v3.29.1`
- **Compte de test** : joelsoatra@gmail.com (admin eau), navigateur « CyberKELY SOATRA »
- **Statut** : ✅ Corrigé et vérifié en live (avant/après sur la même condition de démarrage à froid)

---

## 1. Étape A — Cause exacte CONFIRMÉE (l'hypothèse du prompt est INFIRMÉE)

> **L'hypothèse « course à l'hydratation du shell » (isAuthenticated transitoirement `false` → branche `!isAuthenticated` de `AppLayout` → `/auth` → `/dashboard`) est FAUSSE.**

Preuves mesurées en navigateur (RÈGLE #0ter) :

1. **`isAuthenticated: true` est persisté** dans `localStorage['bazarkely-app-store']`, et **zustand v5 + localStorage réhydrate de façon SYNCHRONE** → `isAuthenticated` vaut déjà `true` au tout premier rendu.
2. **Test décisif** : hard-reload sur des deep-links **hors module eau** — `/transactions` (×2) et `/family` — **restent en place**, aucun rebond. Or une vraie course shell sur `isAuthenticated` les ferait **tous** rebondir vers `/dashboard` (render 1 `false` → `Navigate /auth` → render 2 `true` → catch-all `*` → `Navigate /dashboard`). Ils ne rebondissent pas ⇒ pas de course shell.
3. Aucun log `🔍 OAuth Detection` lors du hard-load `/gestion-eau` ⇒ `AuthPage` / la branche `/auth` ne se montent pas.
4. Le rebond `/gestion-eau` → `/dashboard` est **intermittent** : 1er chargement de session **échoué**, suivants **réussis** — corrélé au **cache Dexie `eau_roles` froid (vide) vs chaud**.
5. Le **rôle admin est mis en cache** dans Dexie `eau_roles` (`admin:true`) → les chargements « chauds » réussissent immédiatement.

### Vraie cause (dans le module eau)

Le **seul** code qui navigue de `/gestion-eau` vers `/dashboard` est la garde [`GestionEauRoute.tsx`](../../frontend/src/modules/gestion-eau/components/GestionEauRoute.tsx) : elle faisait `Navigate to="/dashboard"` dès que `sessionStatus === 'valid' && !isLoading && !hasEauAccess`.

Au **démarrage à froid** (Dexie `eau_roles` vide, ex. 1er affichage sur un appareil après deep-link/refresh), `ensureRolesBootstrap()` dépend de `pullTable('eau_roles')` pour peupler le rôle admin. Or `pullTable` **avalait les erreurs** et renvoyait `{ pulled: 0 }` aussi bien pour « serveur OK, 0 ligne » que pour « erreur / timeout ». Si ce pull était lent ou échouait transitoirement, `getRolesForUser()` renvoyait **tous les rôles à `false`** → après bascule de `isLoading` à `false`, la garde concluait « aucun accès » et **rebondissait l'admin vers `/dashboard`**. En navigation in-app (ou au rechargement suivant), le rôle déjà en cache → tout fonctionne. D'où l'intermittence.

---

## 2. Correctif appliqué (additif, scopé au module eau)

> ⚠️ **`AppLayout.tsx` et `appStore.ts` (fichiers shell partagés) n'ont PAS été modifiés** — contrairement au plan du prompt — car la cause n'y était pas. Aucun risque introduit sur le shell ni les autres modules (bazarkely / construction / family).

Principe (validé avec JOEL) : **ne jamais rediriger vers `/dashboard` sur un état de rôle NON confirmé** (pull en cours / échoué / timeout). Ne rediriger que sur un **refus CONFIRMÉ** = le serveur a répondu et l'utilisateur n'a réellement aucun rôle eau.

| Fichier | Changement |
|---|---|
| `modules/gestion-eau/services/eauSync.ts` | `pullTable()` retourne désormais `{ pulled, ok }`. `ok` distingue « serveur a répondu » de « erreur/timeout ». **Additif** : tous les appelants existants ignoraient la valeur de retour → aucune régression. |
| `modules/gestion-eau/services/eauRoleService.ts` | `ensureRolesBootstrap()` retourne `{ roles, confirmed }` et **réessaie** le pull `eau_roles` (`ROLE_PULL_MAX_ATTEMPTS = 3`, ~500 ms). Hors-ligne : `confirmed` = présence d'un cache local (rôle ou compte client). |
| `modules/gestion-eau/context/GestionEauContext.tsx` | Nouvel état `rolesConfirmed` + action `retryAccess()` ; câblage de la résolution `{ roles, confirmed }`. |
| `modules/gestion-eau/components/GestionEauRoute.tsx` | Redirige vers `/dashboard` **UNIQUEMENT** sur refus confirmé (`rolesConfirmed && !hasEauAccess`). Sinon → écran d'attente `EauAccessPendingScreen` (« Vérification de votre accès… » + bouton **Réessayer**), **jamais** de rebond silencieux. Le toast « Accès refusé » est gardé sur `rolesConfirmed`. |
| `constants/appVersion.ts`, `package.json` | Bump 3.29.0 → **3.29.1** + historique. |

`npx tsc --noEmit` → **exit 0**. `npm run build` → **exit 0** (artefact v3.29.1).

---

## 3. Preuves de validation (navigateur connecté)

Procédure de bypass SW appliquée : `unregister` du Service Worker + `caches.delete()` (1 SW désinscrit, cache `workbox-precache-v2` vidé), puis navigations fraîches. Version 3.29.1 confirmée présente dans l'entry servi `index-DLaTE1uW.js`.

| # | Test | Résultat |
|---|---|---|
| 1 | Hard-load `/gestion-eau` (chaud) | ✅ Reste sur `/gestion-eau`, module rendu (nav + « STOCK ACTUEL 186,2 m³ »). |
| 1bis | **Démarrage à FROID reproduit** : `eau_roles` vidé puis hard-load `/gestion-eau` | ✅ **Reste sur `/gestion-eau`**, module entièrement rendu, **aucun rebond, aucun écran d'attente**. `eau_roles` repeuplé par le pull (admin:true restauré). **Avant le fix, ce même cold-load rebondissait vers `/dashboard`.** |
| 2 | URL directe `/gestion-eau` | ✅ Ouvre le module. |
| 3 | Hard-load sous-route `/gestion-eau/compteurs` | ✅ Reste sur `/gestion-eau/compteurs`. |
| 4a | Non-régression `/transactions` (×2), `/family` | ✅ Restent en place (et prouvent l'absence de course shell). |
| 4b | Non-régression `/dashboard` (module actif = bazarkely) | ✅ Reste sur `/dashboard`, rendu OK. |
| 4c | `/dashboard` quand module actif = `gestion-eau` → `/gestion-eau` | ℹ️ **Pas une régression** : reprise du dernier module par `ModuleSwitcherContext` (`bazarkely_active_module`), fonctionnalité shell **pré-existante**, hors de ce diff. |
| 4d | Vrai déconnecté → `/auth` | ✅ **Préservé par construction** : la branche `!isAuthenticated` de `AppLayout` n'est **pas modifiée** (non testée en live pour ne pas déconnecter JOEL). |
| 5 | Boucle / flash de redirection | ✅ Aucun ; le spinner couvre la fenêtre de retry. |

**`innerWidth` réellement mesuré** : **1312 px** (puis 984 px en début de session) — fenêtre **desktop** du navigateur de test. Aucune mesure mobile (412/528 px) atteignable sur ce poste : non revendiquée.

---

## 4. Écarts & surprises

- **Écart majeur** : le diagnostic du prompt (course à l'hydratation du shell) était **incorrect**. Le correctif prévu côté `AppLayout`/`appStore` n'aurait **rien corrigé**. JOEL a validé le repivotage vers le module eau et levé la contrainte « ne pas toucher au module eau ».
- **Limite de vérification** : le chemin « écran d'attente » (échec **durable** du pull, `confirmed:false`) est validé **par lecture de code**, pas forcé en live (impossible de provoquer proprement un échec réseau via l'outillage). Le chemin réellement déclencheur du bug rapporté — **démarrage à froid** — est, lui, vérifié en live (test 1bis).
- **Détail outillage** : le 1er essai de vidage du cache `eau_roles` a été bloqué par le classifieur de sécurité (boundary « ne pas toucher au module eau » encore actif) ; autorisé après que JOEL a explicitement levé la contrainte.
- **État laissé** : `bazarkely_active_module` remis à `bazarkely` lors du test 4b (se met à jour automatiquement à la prochaine navigation de JOEL).
