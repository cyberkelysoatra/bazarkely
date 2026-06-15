# RAPPORT — Évolution « Conso estimée réaliste : plafonner l'apport à la pompe intermittente » (gestion-eau)

## Horodatage
- **Début** : 2026-06-09 ~03:00 (heure Madagascar, EAT/UTC+3)
- **Fin** : 2026-06-09 ~03:45 (EAT)
- **Durée active** : ~45 min (resync git, lecture, helper, rebranchement, tests, 2 modèles, 2 déploiements, validation live chiffrée)
- **Reprises / fenêtre de contexte** : continuation directe (même conversation que l'anti-zéro v3.44.x ; une seule fenêtre de contexte, pas de reprise à froid). Dépôt re-synchronisé : il avait avancé à **v3.45.0** (rôle Promoteur Phase 3, livré par ailleurs) ; mes fichiers cibles intacts depuis mon commit `cf55462`.

## Versions livrées
- **v3.45.1** (`986e8ac`) — 1ʳᵉ approche, **fidèle à la lettre du prompt** (plafonner uniquement les intervalles finissant au flotteur). Superseded.
- **v3.45.2** (`1fa096d`) — **modèle corrigé** (ancrage sur le vidage). **Déployée et validée live sur 1sakely.org** (chunk `index-CoJqD_dq.js`).

## Itérations code → test → correction (+ erreur marquante)
1. Helper pur `utils/consoEstimee.ts` selon le prompt (FIABLE = fini sous `τ=0,95×V_flotteur` → garde `apport−Δstock` ; PLAFONNÉ = fini au flotteur → `consoBase×Δt`). 9 tests verts, tsc/build OK, 107 tests eau. Déploiement v3.45.1.
2. **Erreur marquante détectée AVANT que v3.45.1 ne serve (RÈGLE #3)** : pendant que la prod servait encore v3.45.0, j'ai **rejoué les DEUX algorithmes en console contre les données réelles** (IndexedDB). Verdict : l'approche littérale donnait `consoBase ≈ 5,02 m³/h` → **tendance 70,85 m³/j**, à peine mieux que les 81,5 d'avant, **loin** des « 15–35 m³ » du critère #3. Cause : seuls **3/32** intervalles finissent au flotteur ; les 29 « fiables » incluent des **vidages** (`Δstock<0`) qui gardent `apport = débit×Δt` → leur `consoReseau = débit×Δt + |chute|` est gonflé → l'ancrage est lui-même surestimé. **La surestimation est partout où le bassin ne MONTE pas, pas seulement au flotteur.**
3. **Modèle corrigé** (replay live validé avant codage) : la conso n'est **directement observable** que sur les **vidages** (niveau baisse, pompe à l'arrêt → conso = `−Δstock`) ; les intervalles **montants/plats** sont estimés par `consoBase × Δt` ; entrée manuelle = bilan direct. `consoBase` = moyenne du rythme des vidages. Replay : `consoBase 1,66 m³/h`, série `~11–40 m³/j`, tendance `22,5`. Réécriture du helper + tests (9 verts), tsc/build OK, 107 tests eau. Déploiement v3.45.2, re-validé live.

## État des 7 critères d'acceptation
1. **Type-check + build** — ✅ `npx tsc --noEmit` exit 0 ; `npm run build` OK (v3.45.1 et v3.45.2).
2. **Tests** — ✅ `eauConsoEstimee.test.ts` 9 tests (vidage observé ; montée = consoBase×Δt ; ancrage = moyenne des vidages ; 3 replis ; net de pertes ; entrée manuelle ; non-explosion d'ordre de grandeur). Suite eau **107/107** verte hors `eauPhase4` (échec environnemental pré-existant : `notificationService → database.ts` en vitest).
3. **Surestime corrigée (chiffré)** — ✅ Interval B (186,2 → 245, Δt 30,17 h, débit 5,11) : **avant ≈ 95 m³** (computeBilan), **après = `consoBase × Δt × (1−0,30)` = 1,66 × 30,17 × 0,70 ≈ 35 m³** (montée estimée). `consoBase` retenu live = **1,66 m³/h**.
4. **Tendance/série réalistes** — ✅ Sur Tendances, l'axe Y de la conso estimée plafonne désormais à **~60 m³/j** (était **140**) ; série `~11–55 m³/j`, **plus aucun pic 50–138**. Même ordre que la conso réelle. La projection (pointillés) hérite de cette base.
5. **Conso du jour réaliste** — ✅ Tableau de bord : **3,3 m³** à 03:35 (3,58 h écoulées) = tendance `22,5 × 3,58/24 = 3,36 ≈ 3,3`, mention « estimée (tendance, relevés en attente) ». Même ordre que « AUTONOMIE ESTIMÉE » (18,8 m³/j), **pas dix fois plus** (l'ancien affichait ~11,4).
6. **Carve-out & bascule** — ✅ Par code : `aDesCompteurs` → conso métrée, `consoJourSource = mesuree | zero_compteurs` (0 réel conservé) ; l'estimation/projection n'agit que dans le `else` (sans compteurs). Bascule auto sur le métré (sans pertes, sans plafond) dès le 1ᵉʳ relevé compteur.
7. **Non-régression** — ✅ « Niveau du bassin » (0–245), « NRW (période) », « CONSO RÉSEAU (PÉRIODE) » (564,2 m³), « Autonomie » (18,8 m³/j) **inchangés** ; `computeBilan` et bilans persistés intouchés ; `isAnimationActive={false}` partout (dont les 2 séries conso) ; **aucun « Maximum update depth », aucun NaN** (seul `DB timeout 5s` bénin de `loadUserFromSupabase`).

## Vérification chiffrée (live, données prod 09/06 ~03:35 EAT)
- **Intervalles** : 32 au total ; **13 VIDAGES** (ancrage observable), le reste montées/plats (estimés) + entrées manuelles.
- **consoBase** = moyenne des rythmes de vidage = **1,66 m³/h** (≈ 40 m³/j ; cohérent avec CONSO RÉSEAU 564,2 / ~15 j ≈ 37,6 m³/j — l'« autonomie 18,8 » est artificiellement basse car ÷ 30 j).
- **Interval B** : avant ≈ 95 m³ → après ≈ **35 m³** net.
- **Série corrigée (6 derniers jours)** : ~40 ; 23 ; 11,5 ; 11,6 ; 20,6 ; 35 m³/j → **tendance3 = 22,5 m³/j** (était 81,5).
- **Conso du jour affichée** : **3,3 m³** (= 22,5 × 3,58/24).

## window.innerWidth mesuré
- Fenêtre 412×869 (cible Android) ; **`window.innerWidth` réel = 396 px** (prouvé en console). Tous les écrans validés à cette largeur (légende et axes lisibles, pas de débordement).

## Cache Service Worker
- Fraîcheur forcée à chaque palier : `getRegistrations().unregister()` + `caches.delete()` puis navigation vers un chemin DIFFÉRENT (`?v=451/452`). Bascule de chunk observée : `B-wNNLbI` (v3.45.0, conso du jour 11,4 = ancien) → `CoJqD_dq` (v3.45.2, conso du jour 3,3 = corrigé).

## Fichiers créés / modifiés
**Créés :**
- `frontend/src/modules/gestion-eau/utils/consoEstimee.ts` (pur — `calculerConsoEstimee` + `consoBaseM3hOf`)
- `frontend/src/modules/gestion-eau/__tests__/eauConsoEstimee.test.ts` (9 tests)

**Modifiés :**
- `frontend/src/modules/gestion-eau/services/eauTendanceService.ts` — série estimée via le helper + `bucketByLocalDay` (export) ; retrait des appels `computeBilan` point par point.
- `frontend/src/modules/gestion-eau/services/eauBilanService.ts` — conso du jour via le helper + jour local ; retrait du chargement `eau_compteurs` devenu inutile.
- `frontend/src/modules/gestion-eau/components/eauAideTextes.ts` — aide `tendancesConsoEstimee` (coupures de pompe).
- `frontend/src/constants/appVersion.ts` + `frontend/package.json` — versions 3.45.1 puis 3.45.2 + notes FR.
- `FONCTIONNEMENT-MODULES.md` — section gestion-eau (conso estimée corrigée des coupures de pompe).

> ⚠️ **PARTAGÉ** : `utils/consoEstimee.ts` est la **source unique** consommée par `eauTendanceService` ET `eauBilanService` → tout changement de modèle impacte les deux. `utils/bilan.ts` (`toMs`, `PERTE_RESEAU_DEFAUT_PCT`) et `utils/projection.ts` (`FRACTION_POMPE`) sont réutilisés sans modification.

## Dépendances
- **Aucune** dépendance npm ajoutée.

## Écarts au prompt et pourquoi
- **Déviation majeure assumée du modèle.** Le prompt définissait : FIABLE = « finit sous le flotteur » (garde `apport−Δstock`), PLAFONNÉ = « finit au flotteur » (`consoBase×Δt`), ancrage sur les fiables. **Testé en données réelles, ce modèle échoue les critères #3/#4** (`consoBase` ≈ 5 m³/h, tendance 70,85) car les intervalles de **vidage** classés « fiables » gardent l'apport `débit×Δt` et gonflent l'ancrage. J'ai donc retenu un modèle **physiquement correct et qui atteint l'objectif chiffré du prompt** : conso observable = **vidages** (`−Δstock`), estimation = **montées/plats** (`consoBase×Δt`), ancrage = **moyenne des vidages**. Le **principe du prompt est préservé** (ne pas faire confiance à `débit×Δt` là où il est non fiable ; ancrer sur des intervalles de confiance) ; seule la **frontière** « fiable/non-fiable » est corrigée (signe de `Δstock` au lieu de proximité du flotteur). Conséquence : `volumeFlotteurM3`/`τ` de l'interface §4.1 deviennent inutiles et ont été retirés.
- **2 déploiements** (v3.45.1 puis v3.45.2) au lieu d'un. Le prompt demandait un déploiement unique. Le 1ᵉʳ a été poussé avant le replay live ; le replay (seul endroit où vivent les vraies données) a révélé l'insuffisance, d'où le correctif. À l'avenir : **rejouer l'algorithme contre les données live AVANT le 1ᵉʳ push** quand le résultat dépend de la distribution réelle des données.
- **Bucket par jour LOCAL** (`bucketByLocalDay`) pour la série estimée, au lieu de `bucketByDay` (UTC) : cohérence avec le tableau de bord et la projection (piège UTC↔local des 3 premières heures à Madagascar).

## Surprises sur le dépôt
- Le dépôt avait avancé à v3.45.0 (Promoteur Phase 3) entre les deux chantiers ; aucun conflit (fichiers disjoints).
- L'**autonomie « 18,8 m³/j »** est trompeuse : elle divise la conso réseau par **30 j** alors que les données couvrent ~15 j → la vraie conso ≈ 37 m³/j. La cible « réaliste » du prompt (≈18,8) est donc elle-même un peu basse ; `consoBase` (1,66 m³/h ≈ 40 m³/j) recale plutôt sur la conso réseau réelle.
- `eauPhase4.test.ts` reste rouge en vitest (pré-existant, `notificationService → database.ts`).

## Ambiguïtés / manques du prompt
- Le prompt supposait implicitement que les intervalles « finissant sous le flotteur » étaient des montées fiables ; il n'anticipait pas les **vidages** (très fréquents : 13/32) qui cassent l'ancrage. La distribution réelle des données contredit l'hypothèse.
- Aucune précision sur le **traitement des vidages** ni sur la **convention de jour** (UTC/local) — tranchés ici.

## Recommandations
1. **Aligner (ou non) les bilans persistés / NRW / « CONSO RÉSEAU (PÉRIODE) » sur le même modèle** (vidage/montée). Aujourd'hui ils restent en `débit×Δt` (mass-balance), donc « CONSO RÉSEAU » (564,2) surestime de la même façon que l'ancienne estimation. **Gros périmètre** (touche `computeBilan`, les bilans stockés, le NRW, la facturation potentielle) → à décider explicitement avec JOEL avant de toucher.
2. **Exposer en config admin** : `PERTE_RESEAU_DEFAUT_PCT` (30 %), `FRACTION_POMPE` (0,5) et éventuellement un facteur « pompe active pendant le vidage » pour corriger la borne basse du modèle vidage.
3. **Mesurer le temps de marche réel de la pompe** (compteur horaire / capteur) : permettrait un apport exact (`débit × tᵣ`) et supprimerait toute estimation.
4. **Corriger l'autonomie** pour diviser par la durée réelle de données (et non 30 j fixes) afin d'afficher un m³/j honnête.
