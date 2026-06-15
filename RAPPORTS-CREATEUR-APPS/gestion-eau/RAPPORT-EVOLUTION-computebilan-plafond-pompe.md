# RAPPORT — computeBilan : plafonner l'apport par débit à la pompe intermittente (gestion-eau)

## Horodatage
- **Début** : 2026-06-09 ~03:45 (EAT) · **Fin** : ~04:20 (EAT) · **Durée** : ~35 min
- **Reprise** : continuation directe (même conversation). Dépôt re-synchronisé : avancé à **v3.46.0** entre-temps (feature « vue propriétaire », `b08e0c4`). Mes fichiers cibles intacts.
- **Version livrée** : **v3.46.1** (`bd723ea`) — déployée et confirmée LIVE (page version 3.46.1).

## Contexte & cadrage (questions fermées à JOEL)
Ce chantier est le **chip** que j'avais créé ce matin. Son constat (« série conso estimée 50–138 m³/j ») était **déjà résolu** côté AFFICHAGE par v3.45.2 (helper `consoEstimee.ts`, ancrage vidage). MAIS `computeBilan` n'avait pas été touché → les **bilans PERSISTÉS**, « Conso réseau (période) », pertes/NRW et anomalies restaient surestimés (mass-balance `débit×Δt`).
J'ai donc posé 2 questions fermées avant d'agir (RÈGLE #0bis), car le périmètre dépasse l'affichage :
- **Q1 = « Oui, corriger aussi le moteur des bilans »** (accepte que « Conso réseau période », pertes et anomalies changent).
- **Q2 = « Facturation = compteurs uniquement »** → aucun impact sur des montants facturés.

## Changement réalisé
Dans `utils/bilan.ts → computeBilan`, branche apport par débit :
```
- apportM3 = input.debitM3h * dtHours;
+ apportM3 = input.debitM3h * dtHours * FRACTION_POMPE;   // pompe intermittente
```
- `FRACTION_POMPE = 0,5` **déplacée comme constante CANONIQUE dans `utils/bilan.ts`**, **ré-exportée** par `utils/projection.ts` (importateurs `consoEstimee.ts` + tests inchangés ; pas de cycle).
- N'impacte **pas** l'override ni les entrées manuelles (seulement l'estimation par débit).
- `consoEstimee.ts` (affichage estimé v3.45.2) n'utilise **pas** `computeBilan` → **aucun double comptage**.

## Vérifications
- **`npx tsc --noEmit`** : exit 0. **`npm run build`** : OK.
- **Tests** : suite eau verte. Tests `computeBilan`/débit adaptés en gardant des nombres propres (Δt porté à **2 h** : `débit × 2h × 0,5 = débit × 1h` → mêmes valeurs attendues qu'avant) + **1 nouveau test** explicite du facteur `FRACTION_POMPE`. `eauCalculs.test.ts` (apport = entrées) non affecté.
  - ⚠️ 2 échecs **PRÉ-EXISTANTS, hors périmètre** : `eauNavRoles.test.tsx` (introduit par la feature « vue propriétaire » v3.46.0 — prouvé par `git stash` : échoue aussi sans mes changements) et `eauPhase4.test.ts` (environnemental `notificationService → database.ts`).
- **Effet de la formule (replay LECTURE SEULE des relevés live, aucune mutation)** : à couverture d'intervalles **égale**, la « Conso réseau (période) » passe de **1796,5 m³ (×1)** à **819,8 m³ (×0,5)** → le plafond **divise bien par ~2**.

## Recompute EXÉCUTÉ (autorisation explicite de JOEL) + résultats live
La « Conso réseau (période) » du tableau de bord est la **somme des bilans PERSISTÉS**, pas un recalcul à la volée. Au départ : **10 bilans** pour **33 relevés** (couverture incomplète) → conso réseau persistée = **564,2 m³**.
**Déroulé** : j'ai d'abord présenté l'effet à JOEL (questions A/B/C) ; le 1ᵉʳ « A » a été **bloqué par le garde-fou de sécurité** (mutation prod jugée insuffisamment autorisée) → j'ai **re-demandé une confirmation explicite et détaillée** → JOEL a répondu « **oui, lance le recalcul** ». J'ai alors cliqué « Recalculer tous les bilans » → **fenêtre de confirmation** (2 temps) → clic « Recalculer ».
**Résultats live après recompute (lecture IndexedDB + tableau de bord) :**
- Bilans : **10 → 32** (couverture complète).
- « Conso réseau (période) » : **564,2 → 819,8 m³** — **= exactement ma prédiction read-only (819,8)** → preuve formelle que la formule `×FRACTION_POMPE` est active en prod. La hausse vient de la **couverture** (10→32), pas d'un échec (564 était un sous-comptage) ; à couverture égale la formule divise par 2 (1796→820).
- **Dernier bilan** : « Attendu 340,4 · Écart −95,4 m³ (61,9 %) » → **« Attendu 263,3 · Écart −18,3 m³ (23,8 %) »** ; sa conso réseau **95,4 → 18,3 m³**, apport **154 → 77 m³**. La formule fonctionne parfaitement par bilan.

## ⚠️ Découverte : les anomalies persistent à cause du SEUIL (réglage), pas de la formule
Après recompute, **32/32 bilans sont en « Anomalie »**. Diagnostic : `seuil_pct = 2 %` (et `seuil_m3 = null` → infini). Un seuil d'écart à **2 %** est irréaliste : même avec la formule corrigée (écarts désormais −0,4 à −18 m³ vs −95 avant), presque tout dépasse 2 %. **Donc je m'étais trompé en annonçant à JOEL que « les fausses anomalies disparaîtraient »** — elles persistent **uniquement** à cause du seuil mal réglé, pas du calcul (qui, lui, a bien réduit les écarts d'un facteur ~5). Corriger ceci = régler un **seuil d'anomalie réaliste** (ex. 20–30 %) en Configuration — décision/réglage de JOEL, hors de ce chantier de code.

## Fichiers modifiés
- `utils/bilan.ts` — **PARTAGÉ** : `FRACTION_POMPE` canonique + apport débit ×FRACTION_POMPE.
- `utils/projection.ts` — ré-export de `FRACTION_POMPE` depuis bilan.ts.
- `__tests__/eauBassinDebit.test.ts` — Δt 2 h (compense ×0,5) + test FRACTION_POMPE.
- `constants/appVersion.ts` + `package.json` — v3.46.1 + note FR.
- `FONCTIONNEMENT-MODULES.md` — section « Moteur des bilans aligné sur la pompe intermittente ».
Aucune dépendance npm. SQL/schéma/NRW-agrégation/facturation non touchés. `computeAndSaveBilan`/`recomputeAllBilans` non modifiés (ils appellent `computeBilan` corrigé).

## Écarts au prompt
- Le prompt suggérait aussi la piste (a) « borner l'apport ≤ volume utile − stockPrev ». **Écartée** : sur un intervalle de remplissage jusqu'au flotteur, ce plafond force `conso ≈ 0` (sous-estime la conso pendant le remplissage). La piste (b) `FRACTION_POMPE` a été retenue (auto-contenue, déjà conventionnelle).
- Le prompt disait « recalcul à l'affichage » : **inexact** — `computeBilan` alimente des bilans **persistés** (cf. découverte ci-dessus). Le changement est additif (formule), mais visible seulement sur les nouveaux bilans ou après recompute.

## Recommandations
1. **Seuil d'anomalie (PRIORITAIRE)** : `seuil_pct = 2 %` est irréaliste → 32/32 bilans flaggés malgré la formule corrigée. Régler un seuil d'écart réaliste (ex. **20–30 %**) et/ou un `seuil_m3` en Configuration. Sans ça, l'indicateur d'anomalie reste inexploitable (tout est « anomalie »).
2. **Recompute** : FAIT (autorisé par JOEL). La « Conso réseau période » reflète désormais la **couverture complète** (819,8), pas un « 564 ÷ 2 ». À garder en tête pour toute lecture future de cet indicateur.
2. **Exposer `FRACTION_POMPE` en config admin** (aujourd'hui 0,5 codé en dur) — la vraie valeur dépend du cycle réel de la pompe.
3. **Mesurer le temps de marche réel de la pompe** (compteur horaire) → apport exact, fin des approximations.
4. **Aligner l'agrégation** : envisager de recalculer « Conso réseau (période) » à la volée (comme la conso estimée) pour ne plus dépendre de la couverture des bilans persistés.
