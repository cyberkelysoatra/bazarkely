# RAPPORT — Correctif « Maximum update depth exceeded » (Recharts 3 + React 19) — module gestion-eau

## Horodatage
- **Début :** 2026-06-08 ~22:50 (heure locale appareil)
- **Fin :** 2026-06-08 ~23:06
- **Durée :** ~16 minutes
- **Version livrée :** **v3.43.1** (patch) — commit `34c963f`, poussé sur `main`, déployé par Netlify
- **Asset déployé vérifié :** `index-D8luE94P.js` (contient `3.43.1`)

## Diagnostic confirmé
`recharts@3.2.0` + React 19 : l'animation d'apparition des séries (`CurveWithAnimation`, `Line.js`)
entrait en boucle infinie de `setState` au montage → `Maximum update depth exceeded` capturé par
l'`ErrorBoundary`, notamment sur la courbe « Niveau du bassin » (Saisie bassin → onglet Niveau et
page Tendances). Aucune série n'avait `isAnimationActive` dans le module → toutes animaient.

## Correctif appliqué (additif, minimal)
Ajout de `isAnimationActive={false}` sur **13 séries** `<Line>` / `<Area>` / `<Bar>` :

| Fichier | Séries modifiées |
|---|---|
| `EauSaisieBassinPage.tsx` | 1 `<Line>` (Niveau) + 1 `<Bar>` (Débit) |
| `EauTendancesPage.tsx` | 1 `<Area>` + 1 `<Line>` + 3 `<Bar>` |
| `EauDashboard.tsx` | 2 `<Area>` |
| `EauClientPage.tsx` | 1 `<Bar>` |
| `EauFacturationPage.tsx` | 2 `<Bar>` |
| `EauSaisieCompteurPage.tsx` | 1 `<Bar>` |
| **Total** | **2 `<Line>` + 3 `<Area>` + 8 `<Bar>` = 13 séries** |

Aucun autre changement (pas de refactor, pas de modif de données, pas de changement de version de
dépendance). Bump `appVersion.ts` + `package.json` 3.43.0 → 3.43.1.

## État des 5 critères d'acceptation

| # | Critère | État |
|---|---|---|
| 1 | `npx tsc --noEmit` → exit 0 | ✅ (`TSC_OK`) |
| 2 | `npm run build` réussit | ✅ (sw-custom 23.98 kB, 124 entries precache, exit 0) |
| 3 | Plus de « Maximum update depth exceeded » / `ErrorBoundary` ne se déclenche plus | ✅ Console propre sur **Saisie bassin → Niveau** et **Tendances** (seul message d'erreur : « DB timeout after 5s » au chargement du profil — comportement attendu et documenté, la session reste valide ; AUCUN message `Maximum update depth` / `CurveWithAnimation` / React error / ErrorBoundary) |
| 4 | Graphiques intacts | ✅ Niveau bassin : courbe complète **24/05 → 08/06** affichée ; Tendances : « Consommation métrée par jour » (aire) + « Niveau du bassin » (courbe) rendus ; sections NRW / Top consommateurs / Conso par zone en état vide (« Pas encore de données » — données réelles absentes, pas une régression) |
| 5 | Non-régression | ✅ Aucun autre comportement modifié ; rendu identique (sans l'animation d'apparition) ; pas de toucher aux autres modules |

## Validation navigateur (RÈGLE #0ter)
- Connecté en **admin** sur `https://1sakely.org` (Tableau de bord Eau accessible et rendu).
- Procédure anti-cache SW (leçon v3.27.1) : **désinscription du Service Worker + purge de tous les
  caches** via la console, puis navigation fraîche → bundle servi = `index-D8luE94P.js` (v3.43.1).
- **Saisie bassin → onglet Niveau** : courbe « NIVEAU DU BASSIN (30 J) » affichée intégralement,
  page stable, console propre (hors DB timeout attendu).
- **Suivi → Tendances** : 6 sections rendues, courbe + aire OK, `errorBoundary:false`, console propre.
- Page **réactive** confirmée par exécution JS synchrone instantanée (DOM probe : `.recharts-surface`
  présents, pas d'ErrorBoundary). Remarque outillage : `Page.captureScreenshot` et les sondes basées
  sur `requestAnimationFrame` ont expiré par intermittence — artefact de **throttling rAF quand l'onglet
  d'automatisation n'est pas au premier plan** (rAF se met en pause), PAS un blocage du thread principal :
  une vraie boucle `setState` aurait journalisé l'erreur React, ce qui n'a jamais été le cas, et le JS
  synchrone répondait instantanément. Capture finale de Tendances obtenue une fois l'onglet ramené au
  premier plan.

## `window.innerWidth` mesuré
- **588 px** (valeur réelle relevée via `window.innerWidth` après `resize_window(412×869)`).
- La cible Android 412 px **n'est pas atteignable** : le plancher de largeur de l'extension la ramène à
  588 px (cohérent avec le plancher ≈528 px documenté). Testé au plus étroit atteignable = **588 px** :
  graphiques rendus, aucun ErrorBoundary.

## Écarts au prompt
- Aucun écart fonctionnel. Le périmètre exact (13 séries dans les 6 fichiers listés) a été couvert.
- Largeur mobile : 412 px non atteignable (plancher extension) ; testé et prouvé à **588 px** réels.
- Captures d'écran : timeouts intermittents du moteur de capture (throttling rAF onglet non focalisé),
  contournés ; preuve complétée par sondes DOM + console + capture finale.

## Recommandation (réévaluation ultérieure)
La désactivation d'animation est le remède **sûr et reconnu** pour ce bug et n'a aucun impact
fonctionnel. À terme, une **montée de version de `recharts`** intégrant le correctif de la boucle
d'animation sous React 19 (suivre les releases ≥ 3.x corrigeant `CurveWithAnimation`) serait préférable :
elle permettrait de **réactiver les animations d'apparition** sans risque. Tant que ce correctif amont
n'est pas confirmé, conserver `isAnimationActive={false}`. À vérifier au prochain bump de dépendances.
