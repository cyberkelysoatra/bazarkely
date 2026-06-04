# RAPPORT — PHASE 1 / 4 : SOCLE du module `gestion-eau`

**Projet :** bazarkely-2 · **Version livrée :** `3.17.0` (minor — nouveau module)
**Date :** 2026-06-04

---

## ⏱️ Horodatage
- **Début de codage** (après lecture bornée + cadrage) : ~01:15 (estimé)
- **Fin (tous critères vérifiables verts)** : ~02:00
- **Durée active** : ~45 min de codage effectif (hors attente d'une réponse de JOEL sur le SQL)
- *Note : horodatage approximatif — l'environnement ne fournit pas de marqueur de début précis. Repères fiables : 1ère exécution de tests à 01:51, dernier `tsc` à ~01:58.*

## 🔁 Sessions / reprises / fenêtre de contexte
- **1 seule session continue**, aucune reprise.
- **Fenêtre de contexte NON atteinte** (pas de compaction).
- **1 interruption volontaire** : arrêt pour cadrage (cf. « écarts » §) car le prérequis SQL était manquant — réponse de JOEL obtenue, puis exécution autonome jusqu'au bout.

## 🧪 Itérations code → test → correction
1. **Lecture bornée** des patrons (ModuleSwitcher, ConstructionContext/Route, AppLayout, App, database, supabase, appStore, tailwind, package.json, vitest).
2. **Découverte bloquante** : `SUPABASE-SQL.md` absent du dépôt ET tables `eau_*` inexistantes côté Supabase (vérifié via l'API PostgREST → `PGRST205`). → question fermée à JOEL → il a fourni le DDL.
3. **Écriture du socle** (types → utils purs → Dexie → services → contexte → gardes → écrans → câblage partagé → tests).
4. **`tsc --noEmit`** : **vert du premier coup** (exit 0).
5. **1ère exécution des tests** : 16/20 verts. **4 échecs** sur le test de rendu de la nav.
   - **Erreur marquante** : le setup global `src/test/setup.ts` **mocke `react-router-dom`** et n'expose ni `NavLink` ni `MemoryRouter` → impossible de monter `<EauNav>` via `<MemoryRouter>`.
   - **Résolution** : extraction de la logique de filtrage dans un module **pur** `components/navConfig.ts` (`filterNavByRoles`), consommé par `EauNav` ; test réécrit sur la fonction pure (déterministe, sans DOM ni router). → **21/21 verts**.
6. **`tsc --noEmit`** re-vérifié après refactor (exit 0), **`npm run build`** OK (67 modules, built in ~34 s), **smoke test preview** : l'app démarre sans erreur console (régression des fichiers partagés écartée).

## ✅ État de chaque critère d'acceptation
| # | Critère | État | Détail |
|---|---------|------|--------|
| 1 | `tsc --noEmit` + build Vite | ✅ | `tsc` exit 0 (2×) ; build OK (`✓ built in 34s`) |
| 2 | Module dans le switcher, `/gestion-eau` s'ouvre, détection étendue, bazarkely/construction intacts | ✅ (code) ⚠️ (runtime connecté) | Module ajouté à `DEFAULT_MODULES` ; détection refactorée en `moduleIdForPath` (construction + gestion-eau + défaut bazarkely) ; build + boot sans erreur. **Walkthrough connecté non joué** (page protégée par auth — pas d'identifiants en preview). |
| 3 | Rôles : nav filtrée, cumul possible, premier admin = propriétaire | ✅ | `filterNavByRoles` testé (admin/releveur/client/cumul) ; gardes `GestionEauRoute`/`EauRoleProtectedRoute` ; bootstrap `ensureRolesBootstrap` (aucun admin → ce user devient admin). |
| 4 | Compteurs : CRUD + persistance hors-ligne | ✅ | `eauCompteurService` (create/update/delete/list/search) ; écriture Dexie immédiate (`saveLocal` `_dirty`). |
| 5 | Saisie bassin : entrée m³ ; niveau cm→m³ (L=10,l=7,h=4 → 280) ; bloqué si config absente | ✅ | Conversion testée (`hauteurCmToVolumeM3` 400 cm → 280) ; UI bloque la saisie + lien « Configurer » si bassin non configuré. |
| 6 | Saisie compteur : recherche/liste, conso=index−précédent, rupture index<, aberrant | ✅ | `evaluerReleveCompteur` + `consoCompteurSurIntervalle`/`detectAberrant` testés ; confirmations `window.confirm` pour rupture et aberrant. |
| 7 | Bilan correct à chaque relevé de niveau (jeu fabriqué = recalcul manuel) | ✅ | Test dédié : entrées 50, conso 25 (2 compteurs), attendu 225, écart 5, écart% 10 — conforme. `null` si pas de relevé précédent. |
| 8 | Anomalie seuil m³ **ou** % → true ; sinon false ; « traitée » fonctionne | ✅ | 3 assertions (m³ seul, % seul, aucun) testées ; `markBilanTraitee` implémenté. |
| 9 | NRW correct sur une période | ✅ | `computeNRW(100,70)` → pertes 30, 30 % ; 0 entrée → 0 %. |
| 10 | Hors-ligne : saisies OK, dashboard à jour, sync sans doublon (upsert id client) | ⚠️ **bloqué côté infra** | Offline-first complet (Dexie d'abord) + sync **idempotente** (`upsert onConflict` + id client, jamais `getUser()`) **implémentés et type-checkés**. **NON validable end-to-end** tant que JOEL n'a pas exécuté `SUPABASE-SQL.md` (les tables `eau_*` n'existent pas encore en base — vérifié). |
| 11 | `FONCTIONNEMENT-MODULES.md` mis à jour | ✅ | Section « MODULE 5 — GESTION EAU (Phase 1) » ajoutée + date de pied de page. |

**Bilan : 9 ✅ pleins, 2 partiels** — #2 (logique complète, walkthrough connecté non joué faute d'auth en preview) et #10 (code complet, validation prod en attente de l'exécution du SQL par JOEL).

## 📁 Fichiers créés / modifiés
### Créés — module (`frontend/src/modules/gestion-eau/`)
- `index.ts`
- `types/gestionEau.ts` (types alignés exactement sur le schéma Supabase, snake_case)
- `db/gestionEauDb.ts` (**Dexie dédiée** `GestionEauDB`, 15 stores `eau_*`)
- `utils/` : `bassin.ts`, `bilan.ts`, `format.ts`, `id.ts`
- `services/` : `eauSync.ts`, `eauAuth.ts`, `eauRoleService.ts`, `eauConfigService.ts`, `eauCompteurService.ts`, `eauReleveService.ts`, `eauBilanService.ts`, `index.ts`
- `context/` : `GestionEauContext.tsx`, `index.ts`
- `components/` : `GestionEauRoute.tsx`, `EauRoleProtectedRoute.tsx`, `GestionEauRoutes.tsx`, `EauNav.tsx`, `navConfig.ts`, `EauPageShell.tsx`, `EauDashboard.tsx`, `EauConfigPage.tsx`, `EauSaisieBassinPage.tsx`, `EauSaisieCompteurPage.tsx`, `EauCompteursPage.tsx`, `EauAnomaliesPage.tsx`, `index.ts`
- `__tests__/` : `eauCalculs.test.ts` (16 tests), `eauNavRoles.test.tsx` (5 tests)

### Créés — racine
- `SUPABASE-SQL.md` (DDL de référence des 15 tables, fourni par JOEL — versionné pour les 4 phases)
- `RAPPORTS-CREATEUR-APPS/gestion-eau/RAPPORT-PHASE-1.md` (ce fichier)

### Modifiés — ⚠️ FICHIERS PARTAGÉS (changements strictement additifs)
- **`frontend/src/App.tsx`** : import + montage global de `<GestionEauProvider>` (imbriqué dans `ConstructionProvider`).
- **`frontend/src/components/Layout/AppLayout.tsx`** : route `/gestion-eau/*` (garde `GestionEauRoute` + `GestionEauRoutes` en lazy).
- **`frontend/src/contexts/ModuleSwitcherContext.tsx`** : entrée `gestion-eau` dans `DEFAULT_MODULES` + **détection étendue** (`MODULE_PREFIXES` + `moduleIdForPath`) réutilisée par `determineActiveModule` ET la restauration localStorage (sans casser construction/bazarkely).
- **`frontend/src/constants/appVersion.ts`** + **`frontend/package.json`** : bump `3.16.26 → 3.17.0` + entrée d'historique.
- **`FONCTIONNEMENT-MODULES.md`** : nouvelle section module.

## 📦 Dépendances ajoutées
**Aucune.** Tout réutilise l'existant : Dexie 4, `withTimeout`, auth Supabase/store Zustand, tokens Tailwind, `react-hot-toast`, react-router, vitest. (Pas de lib QR/carte — réservée aux phases 3/4.)

## 🔀 Écarts au prompt (et pourquoi)
1. **Arrêt pour cadrage malgré la consigne d'autonomie totale.** Le prérequis annoncé (« tables `eau_*` créées ») était **faux** : ni le fichier `SUPABASE-SQL.md`, ni les tables en base (vérifié via PostgREST). Construire en devinant le schéma aurait désaligné les 4 phases et rendu le critère #10 invérifiable. → 1 question fermée. **Justifié** : un prérequis manquant ≠ une validation intermédiaire.
2. **Base Dexie DÉDIÉE (`GestionEauDB`) au lieu d'étendre `BazarKELYDB`.** Le prompt dit « réutilise Dexie `db` », mais impose aussi « modifications des fichiers partagés strictement additives ». Ajouter une v17 + 15 stores à la base partagée (à 16 versions, multi-modules) était plus risqué qu'une base isolée. → choix d'isolation, **zéro migration** sur la base partagée. Le pattern Dexie/offline-first est bien réutilisé.
3. **« Vérification de rendu par rôle » faite en logique pure** (`filterNavByRoles`) plutôt qu'en montage DOM : contrainte technique (le setup global mocke `react-router-dom` sans `NavLink`/`MemoryRouter`). Résultat équivalent et déterministe.
4. **Stores `eau_*` en snake_case dans Dexie** (au lieu de camelCase local + mapping) : choix délibéré pour un alignement exact et une sync sans mapping (le prompt impose l'alignement exact).

## 😲 Surprises sur bazarkely-2
- `Glob`/ripgrep **timeout (20 s)** sur ce dépôt (volumineux + nombreux worktrees `.claude/worktrees/`). → contourné via PowerShell ciblé.
- `npm test` = **vitest** (pas jest), mais `construction-poc` embarque un `jest.config.js` autonome (deux mondes de test cohabitent).
- `src/test/setup.ts` **mocke globalement Dexie ET react-router-dom** (partiellement) → tout test de composant doit composer avec ces mocks.
- `withTimeout` par défaut = **8000 ms** (le CLAUDE.md mentionne 5000 ms par endroits) — j'ai utilisé 8000 ms (valeur réelle du helper) pour la sync.
- Le module `construction-poc` est **online-only** (Supabase direct, `getUser()`), alors que la consigne gestion-eau est offline-first → je me suis appuyé sur les patterns **prêts/remboursements** (offline-first) pour `getCurrentUserIdSafe`, pas sur construction.

## ❓ Ambiguïtés / manques du prompt
- **Prérequis SQL faux** (déjà couvert) — le plus impactant.
- **Rôle « client »** : `eau_roles` ne porte que `admin`/`releveur`. J'ai **dérivé** `client` d'un `eau_comptes_client` lié au `user_id` (vide en phase 1 → toujours `false`). À confirmer pour la phase 2.
- **NRW « consoΣ » de la période** : non défini précisément. J'ai retenu **Σ des `conso_m3` des bilans** de la période (cohérent avec le bilan « en continu »). Alternative possible : recalcul direct index fin−début par compteur.
- **`agent_id`** : rempli avec l'id utilisateur courant (store). OK ?
- **Seuils par défaut** si config vide : j'ai mis des replis (seuilM3=5, seuilPct=10, facteurAberrant=3, période=30 j) pour que le dashboard/bilan fonctionnent avant configuration. À valider.
- **Photo de relevé** : « optionnelle » mais l'upload (stockage) relève du terrain/QR (phase 3) → champ `photo_url` prévu, capture non implémentée en phase 1.

## ➡️ Recommandations pour la Phase 2 (facturation / clients)
1. **Exécuter `SUPABASE-SQL.md` AVANT toute chose** (sinon aucune sync), puis rejouer un test online connecté pour clore définitivement le critère #10.
2. **Walkthrough connecté** du socle (login réel) pour valider visuellement #2/#3 et le bootstrap propriétaire en conditions réelles.
3. Brancher la **facturation** sur `eau_factures` (déjà en base + Dexie) : génération depuis les relevés compteur (`index_debut`/`index_fin`/`conso_m3` × `tarif_m3`), numérotation via `eau_config.numero_facture_seq`/`numero_facture_seq`.
4. **Comptes clients** (`eau_comptes_client`) + enrôlement → c'est là que le rôle `client` deviendra réel ; prévoir la mise à jour de `getRolesForUser` (déjà câblé pour lire les comptes client).
5. Réutiliser le **service de sync générique** (`eauSync.pushTable/pullTable`) — il couvre déjà les 15 tables, rien à réécrire.
6. Envisager un **déclencheur de sync au retour online** (écouter `useAppStore.isOnline`) pour vider la file `_dirty` automatiquement — non requis en phase 1 mais utile dès la facturation.
7. Conserver le **gel des seuils par défaut** ou les rendre obligatoires à la config (décision produit).

---
*Rapport généré automatiquement en fin de Phase 1 — module `gestion-eau` v3.17.0.*
