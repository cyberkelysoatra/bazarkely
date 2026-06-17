# RAPPORT DE PHASE 1 — Optimisation & durcissement du module `gestion-eau`

**Projet :** bazarkely-2 · **Module :** `frontend/src/modules/gestion-eau/`
**Branche / déploiement :** `cloudflare-migration` (commit `7dc9c14`, poussé)
**Version :** `3.60.2` → **`3.61.0`** (minor)

---

## 1. Horodatage & exécution

- **Fin de session :** 2026-06-16 ~02:56 (UTC+3, Madagascar).
- **Durée active :** session unique, en continu (≈ une session de travail soutenue).
- **Sessions / reprises :** 1 session, aucune reprise.
- **Fenêtre de contexte atteinte :** ~70–75 % au moment du déploiement (raison principale du **report assumé du LOT D-1/D-2**, cf. §4 — conformément à la consigne « ne jamais livrer un refactor à moitié fait »).
- **Boucle code→test→correction :** 4 checkpoints `tsc --noEmit` (après A+B, après C-1/C-2, après C, final) tous à **exit 0** ; 1 build prod OK ; suite de tests passée à chaque ajout.

### Erreurs marquantes rencontrées (et corrigées seul)
1. **`vi.mock` + variables hoistées** (test tombstones) : la factory référençait des variables top-level → `ReferenceError: Cannot access 'eauDbFake' before initialization`. Corrigé en passant par `vi.hoisted()`.
2. **`navigator.onLine` non reconfigurable** dans les tests : `Object.defineProperty(... configurable)` jetait `Cannot redefine property`. `src/test/setup.ts` le définit `writable:true` → corrigé par **assignation directe** `(navigator as any).onLine = v`.
3. **`crypto.randomUUID` mocké en constante** dans le setup de test : le `_id` des contacts importés n'était plus unique. Corrigé en ajoutant un **compteur monotone** à `newRowId()` (unicité garantie même hors `crypto`).
4. **Re-export `FRACTION_POMPE` retiré** → 2 tests importaient la constante via `utils/projection`. Imports redirigés vers la source unique `utils/bilan`.

---

## 2. Skills mobilisés

- **web-pwa-offline-first** : *non installé dans cette session* → patterns offline-first appliqués manuellement d'après `CLAUDE.md` (tombstones idempotents, `withTimeout`, upsert + id client, jamais `getUser()` en chemin offline).
- **testing-react** : *non installé* → tests écrits manuellement (vitest, mocks `vi.hoisted`).
- **impeccable** : *disponible* mais non invoqué — la finition charte (LOT C-1) était mécanique (remplacement d'un accent bleu codé en dur par le vert forêt dérivé d'`EAU_CHART`), sans décision de design ouverte. Signalé ici comme écart mineur assumé.

---

## 3. État de CHAQUE item

### LOT A — Corrections de bugs
| Item | État | Détail |
|------|------|--------|
| A-1 Fuseau — courbe conso métrée | ✅ | `eauTendanceService` : `bucketByDay` → `bucketByLocalDay` pour la série métrée (alignée sur la série estimée). `bucketByDay` conservé + `@deprecated`. Test ajouté (point à 01:00 locale tombe sur le bon jour). |
| A-2 Fuseau — clés d'alerte | ✅ | `utils/alertes` : `dayKey`/`monthKey` calculées en **local** (`getFullYear/getMonth/getDate`), format `YYYY-MM-DD`/`YYYY-MM` inchangé → `ref_id` compatibles. Tests ajoutés. |
| A-3 Rules of Hooks | ✅ | `EauRoleProtectedRoute` : les 2 `useEffect` remontés **au-dessus** de tous les `return` conditionnels ; comportement identique. |
| A-4 `key={index}` import lot | ✅ | `contactImport` : champ `_id` stable (compteur + `randomUUID`/fallback) ; `EauDemandesPage` `key={c._id}`. Tests : unicité du `_id`. |
| A-5 Spinners `try/finally` | ✅ | Enveloppés : `EauTendancesPage`, `EauAnomaliesPage`, `EauScanResolverPage` (cités) + `EauAuditPage`, `EauClientPage`, `EauClientQrPage`, `EauDashboard`, `EauRapportsPage`. `loading` repasse toujours à `false` (catch + `console.warn`). |

### LOT B — Robustesse offline-first / synchro
| Item | État | Détail |
|------|------|--------|
| B-1 Tombstones de suppression | ✅ | Nouveau store Dexie **`eau_deletions`** (v8, local-only, hors `EAU_TABLES`). `deleteLocal` écrit un tombstone + **await** du DELETE serveur (succès → purge ; échec/offline → conservé). `flushTombstones()` rejoué dans `syncAll`/`pullAll` (retour online). `pullTable` **ne ressuscite pas** une PK tombstonée. 5 tests (online confirmé, offline conservé, rejeu idempotent, timeout puis purge, anti-résurrection). |
| B-2 `recomputeAllBilans` sans doublon | ✅ | Id de bilan **déterministe** `deterministicUuid('bilan:'+ms)` (forme UUID acceptée par Postgres) → l'upsert réécrit toujours la même ligne. Re-run ⇒ id identiques, zéro doublon. Tests `deterministicUuid` (stabilité, unicité, forme). |
| B-3 Double pull `eau_roles` au boot | ✅ | **Deux** garde-fous : (1) verrou in-flight par table dans `pullTable` (un seul aller-retour si appels concurrents) ; (2) `pullAll(['eau_roles','eau_comptes_client'])` au boot — ces tables restent gérées par `ensureRolesBootstrap`. |
| B-4 `saveLocal` O(N) | ✅ | Nouveau `pushOne(table, pk)` ciblé (push de la seule ligne écrite) utilisé par `saveLocal` au lieu de `pushTable` (plus de `toArray()` complet par saisie). `pushTable` conservé pour le flush global. Idempotence préservée. |
| B-5 Erreurs non-rejouables avalées | ✅ | `logPushError()` distingue **schéma/colonne (`PGRST204`/`42703`)** — `console.error` explicite (table + nature, drift Dexie↔Supabase) — des timeouts réseau (`console.warn`, rejouable). |

### LOT C — Factorisation, charte & nettoyage
| Item | État | Détail |
|------|------|--------|
| C-1 Charte factures PDF | ✅ | Nouveau `utils/pdfTheme.ts` dérivant les RGB des hex `EAU_CHART` (source unique). `utils/pdf.ts` : tous les accents **sky-700 `[14,116,144]`** → **vert forêt `PDF_FOREST`** ; en-tête EAU → `PDF_OLIVE` ; fond d'encadré bleu clair `[240,248,252]` → vert clair `[240,245,238]`. Texte blanc sur forêt foncé = contraste OK. |
| C-2 Helpers dupliqués | ✅ | `fmtAutonomie` (format unifié : `—` si ≤0, 1 décimale <24 h, sinon `j j h h`) + `fmtMois` ajoutés à `utils/format` ; consommés par `EauDashboard`, `EauProprietaireBassinPage`, `EauElecCoutsPage`, `EauFacturationPage`. Débit m³/h via `fmtM3h` (`EauDashboard`, `EauBassinReleves`). |
| C-3 `navigator.onLine` éparse | ✅ | Nouveau `utils/online.ts` (`eauIsOnline()` impératif **toujours à jour** via `appStore.isOnline` + `useEauOnline()` réactif). Remplacé dans 9 composants (`EauAnomaliesPage`, `EauApportsReleves`, `EauCartePage`, `EauCompteursReleves`, `EauConfigPage`, `EauDemandesPage`, `EauElecCoutsPage`, `EauVitrinePage`). `EauBassinReleves` ne lisait pas `navigator.onLine` directement. |
| C-4 Onglets ré-implémentés | ✅ | Style extrait en brique partagée `eauSegmentTabClass()` dans `EauUi` (l'API `<EauTabs>` — pills rounded-full, nav inter-vues — ne correspondait pas à un contrôle segmenté de formulaire). `EauDemandesPage` consomme la brique ; rendu identique ; `cn` importé localement retiré. |
| C-5 Typages PDF | ✅ | `pdf.ts` : retours `Promise<jsPDF>`, `drawTable(doc: jsPDF, …)`, `cout: Awaited<ReturnType<typeof getCoutByMois>>`. Aucun `any` dans les signatures PDF. Les `withTimeout(...) as any` du pattern projet non touchés. |
| C-6 Code mort & incohérences | ✅ (avec 1 ⚠️ justifié) | `EAU_CHART.goldLight` supprimé (0 usage hors changelog) ; `triggerDownload` `export` retiré (interne) ; **barrel `services/index.ts` abandonné** (incomplet + 0 consommateur, `export * as services` retiré de l'index module) ; re-export en cascade `FRACTION_POMPE` retiré (import direct depuis `bilan.ts`). **⚠️ `stockFromNiveauCm` + `tauxRemplissageFlotteur` CONSERVÉS** : sans usage applicatif **mais couverts par des tests passants** (`eauBassinDebit.test.ts`) documentant la géométrie du bassin → suppression = churn/risque inutile ; gardés volontairement. |

### LOT D — Refonte des monolithes
| Item | État | Détail |
|------|------|--------|
| D-1 `EauDemandesPage` (~959 l.) | ⚠️ **REPORTÉ** | Refonte en sous-composants/hooks non engagée (gros diff, risque de régression sur un déploiement unique, budget de contexte). À traiter en **session dédiée**. |
| D-2 `EauBassinReleves` (~903 l.) | ⚠️ **REPORTÉ** | Idem D-1 — session dédiée. |
| D-3 Parallélisation lectures espace client | ✅ | `EauClientPage` : 4 lectures Dexie par compteur + boucle sur les compteurs → `Promise.all` imbriqués. Données identiques. |

---

## 4. Décisions & écarts au prompt

- **LOT D-1/D-2 reporté** (assumé) : la fenêtre de contexte approchait la saturation après le LOT C. Conformément à la consigne explicite, arrêt propre après C+D-3, déploiement, report documenté. **Aucun refactor laissé à moitié.**
- **C-6 helpers `bassin` conservés** : justifié ci-dessus (tests existants). Choix « garder » explicitement permis par le prompt.
- **C-3 sémantique** : `eauIsOnline()` lit `appStore.isOnline` (tenu à jour par `onlineStatusService` sur les events `online`/`offline`) → **toujours courant** dans les handlers, donc pas de valeur périmée capturée au rendu (mieux que `useAppStore(s=>s.isOnline)` dans un callback). Les lectures de la **couche service** (`eauSync.isOnline`, `eauBilanService`, `eauRoleService`, `offlineTiles`) gardent `navigator.onLine` (hors périmètre des 9 composants, et utilisées par les tests).
- **Skills** non installés (web-pwa-offline-first, testing-react) → réalisés manuellement (cf. §2).

---

## 5. Fichiers créés / modifiés

**Créés (4) :**
- `utils/pdfTheme.ts` (RGB charte PDF, dérivés d'`EAU_CHART`)
- `utils/online.ts` (`eauIsOnline` / `useEauOnline`)
- `__tests__/eauSyncTombstones.test.ts` (5 tests B-1)
- `__tests__/eauOptimLotA.test.ts` (A-2 + B-2)

**Supprimé (1) :** `services/index.ts` (barrel abandonné).

**Fichiers PARTAGÉS modifiés (à surveiller en priorité) :**
- `db/gestionEauDb.ts` — **migration Dexie v8** + interface `EauDeletion` + store `eau_deletions`.
- `services/eauSync.ts` — tombstones, `pushOne`, verrou pull, `logPushError`, `flushTombstones`, `pullAll(exclude)`.
- `context/GestionEauContext.tsx` — `pullAll(['eau_roles','eau_comptes_client'])`.
- `utils/format.ts` — `fmtAutonomie`, `fmtMois` (nouveaux exports additifs).
- `components/EauUi.tsx` — `eauSegmentTabClass` ajouté, `goldLight` retiré.
- `utils/id.ts` — `deterministicUuid` (nouvel export ; `newId` non retiré, plus utilisé par les bilans).

**Autres modifiés :** `services/eauBilanService.ts`, `services/eauTendanceService.ts`, `utils/alertes.ts`, `utils/projection.ts`, `utils/consoEstimee.ts`, `utils/contactImport.ts`, `utils/csv.ts`, `utils/pdf.ts`, `index.ts`, + 14 composants `Eau*.tsx`, + 4 tests existants ajustés, + `constants/appVersion.ts` & `package.json` (bump).

**Migration Dexie :** version **8**, store **`eau_deletions`** (`id, table`), local-only — additif, aucun store existant touché, aucune perte de données.

**Dépendances ajoutées :** **aucune** (attendu).

---

## 6. Vérifications (état de la Definition of Done)

- [x] `npx tsc --noEmit` → **exit 0**
- [x] `npm run build` → **OK** (PWA générée, 130 entrées précachées)
- [x] Tests `gestion-eau` → **160/160 verts** (dont 11 nouveaux LOT A/B)
- [x] Version bumpée (`appVersion.ts` 3.61.0 + `package.json` + changelog non-technique FR)
- [x] **Un seul** commit + push sur `cloudflare-migration` (`7dc9c14`)
- [ ] **Validation navigateur live** → voir §7 (à confirmer par JOEL)
- [x] Rapport de phase (ce fichier)

---

## 7. Validation navigateur — à confirmer par JOEL (RÈGLE #0ter)

La validation live des écrans **authentifiés** du module Eau n'est **pas réalisable en autonomie** : le navigateur bridé de l'agent ne peut pas se connecter à Supabase (« Preview only supports localhost URLs », cf. mémoire `feedback_test_local_navigateur_propre`), et Cloudflare doit d'abord reconstruire la nouvelle version (puis purge du cache Service Worker côté appareil).

**Couvert par tests automatisés** (pas besoin de terrain) : tombstones offline→online (B-1, 5 tests), idempotence recompute (B-2), fuseau des courbes (A-1), clés d'alerte locales (A-2), `_id` stable d'import (A-4).

**À vérifier par JOEL une fois la v3.61.0 en ligne** (session admin `joelsoatra@gmail.com`, fenêtre incognito neuve après Unregister SW) :
1. **Tendances** : les deux courbes de consommation (mesurée/estimée) alignées sur le même jour, surtout tôt le matin (< 03 h locale).
2. **Facturation → générer un PDF** (simple ET combinée eau+élec) : **aucun bleu**, accent vert forêt, montant total lisible (texte blanc sur fond vert).
3. **Demandes → import par lot** : supprimer une ligne **au milieu** → les valeurs des autres lignes restent correctes.
4. **Suppression hors-ligne** (terrain) : couper le réseau, supprimer un relevé/compteur, revenir en ligne → la ligne **ne réapparaît pas** (supprimée côté serveur).
5. Écrans `releveur`/`client`/`promoteur` (non testables sur session admin) : à valider par rôle, ou par lecture/tests — **flaggé**.

---

## 8. Recommandations pour la suite

1. **Session dédiée LOT D-1 / D-2** : refonte des deux monolithes (`EauDemandesPage`, `EauBassinReleves`) à **comportement identique** — extractions vérifiées une par une, `tsc --noEmit` fréquent, `isAnimationActive={false}` préservé sur Recharts. Gros diff → mérite son propre déploiement.
2. **Couche service `navigator.onLine`** : si souhaité, harmoniser `eauSync`/`eauBilanService`/`eauRoleService` vers `eauIsOnline()` (laissé tel quel ici car hors périmètre des 9 composants et utilisé par les tests).
3. **`countDirty()`** balaie encore ~20 tables (badge de sync) : si l'historique hors-ligne grossit, envisager un `_dirty` indexé numérique (1/0) — non bloquant aujourd'hui.
4. **Surveiller la console** après déploiement pour d'éventuels `🛑 [eauSync] … PGRST204` (drift schéma) — désormais explicitement journalisés.
