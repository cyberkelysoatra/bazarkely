# RÉSUMÉ DE SESSION — S87 (2026-06-07)

## Objectif
Corriger le rebond `/gestion-eau` → `/dashboard` au **deep-link / hard-refresh** (constaté en prod, rapport Phase 1 §5.1), avant la Phase 2 de l'isolation eau.

## Résultat : ✅ Corrigé & déployé — v3.29.1 (commit `3f7a5b2`)

### Diagnostic (le point clé de la session)
L'hypothèse du prompt — **« course à l'hydratation du shell » (isAuthenticated) — était FAUSSE**, infirmée en navigateur :
- `isAuthenticated:true` est persisté ; **zustand v5 + localStorage = hydratation synchrone** → `true` dès le 1er rendu.
- Test décisif : hard-reload sur `/transactions` et `/family` **reste stable** (une course shell les ferait aussi rebondir). Le rebond est **spécifique à `/gestion-eau`** et **intermittent** (froid vs chaud).

**Vraie cause (module eau)** : au démarrage à froid (Dexie `eau_roles` vide), si `pullTable('eau_roles')` est lent/échoue/timeout, `getRolesForUser` renvoie tout à `false` → `GestionEauRoute` (valid + !loading + !hasEauAccess) faisait `Navigate /dashboard` alors que l'user est admin. `pullTable` ne distinguait pas « serveur OK 0 ligne » de « échec ».

JOEL a levé la contrainte « ne pas toucher au module eau » (basée sur le diagnostic faux) et validé le repivotage.

### Correctif (additif, scopé eau ; shell NON modifié)
- `eauSync.ts` : `pullTable()` → `{ pulled, ok }` (`ok` = serveur a répondu).
- `eauRoleService.ts` : `ensureRolesBootstrap()` → `{ roles, confirmed }` + retry pull (3×).
- `GestionEauContext.tsx` : état `rolesConfirmed` + action `retryAccess()`.
- `GestionEauRoute.tsx` : redirige `/dashboard` **uniquement** sur refus confirmé ; sinon écran `EauAccessPendingScreen` (« Vérification de votre accès… » + Réessayer).
- Bump 3.29.0 → 3.29.1.

`tsc --noEmit` OK + build OK.

### Vérification live (navigateur, bundle `index-DLaTE1uW.js`)
- Cold-start reproduit (vidage `eau_roles`) → hard-load `/gestion-eau` **reste sur le module** (avant : rebondissait). ✅
- Sous-route `/gestion-eau/compteurs` hard-load OK. ✅
- Non-régression `/transactions`, `/family`, `/dashboard` OK. ✅
- `/dashboard`→`/gestion-eau` quand module actif=eau = reprise `ModuleSwitcher` (pré-existant, pas une régression).
- `innerWidth` mesuré : 1312 px (desktop ; aucune mesure mobile revendiquée).
- Limite : chemin « écran d'attente » (échec **durable** du pull) validé par lecture de code, pas forcé en live.

Rapport complet : `RAPPORTS-CREATEUR-APPS/gestion-eau/RAPPORT-CORRECTIF-deeplink.md`.

## Suite
- **Phase 2 isolation eau** (verrouillage RLS par rôle) — voir [[project_isolation_eau_phases]] / `RAPPORT-SECU-PHASE-1.md`. Le deep-link étant corrigé, on peut désormais tester proprement en rechargeant l'URL du module.
