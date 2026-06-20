# Rapport de phase — Animation d'eau calibrée dans la carte « Stock actuel » (Mode A)

**Module :** gestion-eau (AHUVI) · **Versions :** v3.66.4 (1ʳᵉ passe « ratio simple ») puis **v3.66.5 (passe calibrée — livraison finale)** · **Branche :** `cloudflare-migration`

## Horodatage
- Début : 2026-06-20 · Fin : 2026-06-20 (même session)
- Durée active : ~70 min cumulées (v3.66.4 puis enrichissement v3.66.5 : calibrage config, traits, couleur dédiée, contraste, Impeccable).
- Fenêtre de contexte : non saturée ; `appVersion.ts` non relu intégralement (> 25k tokens) → édité par PowerShell ciblé (UTF-8 sans BOM).

## VRAIES hauteurs lues en config (table `eau_config`, IndexedDB live)
| Champ | Valeur réelle |
|---|---|
| `bassin_longueur_m` | **14 m** |
| `bassin_largeur_m` | **7 m** |
| `bassin_hauteur_flotteur_m` (= 100 %) | **2,5 m** |
| `bassin_hauteur_trop_plein_m` | **2,9 m** |
| `bassin_hauteur_max_m` | **null (ABSENT)** |
| `bassin_band_flotteur_cm` | 10 |

### Valeur manquante + repli appliqué (⚠️ à signaler à JOEL)
`bassin_hauteur_max_m` n'est **pas renseignée** → `hauteurTop` retombe sur le **trop-plein (2,9 m)** (repli prévu : max ?? trop-plein ?? flotteur). Conséquence : le haut de la carte = trop-plein, donc `bassinTropPleinFraction = 2,9/2,9 = 1,0` → trait trop-plein **non tracé** (= haut de carte). **Recommandation : saisir `bassin_hauteur_max_m`** (hauteur physique réelle du bassin, ≥ 2,9 m) pour faire apparaître le trait trop-plein distinct et abaisser légèrement le niveau d'eau relatif.

### Fractions calculées (sur S = 14 × 7 = 98 m², stock = 166,6 m³)
- `bassinWaterFraction` = 166,6 / (98 × 2,9) = **0,586** (eau aux 58,6 % de la carte).
- `bassinFlotteurFraction` = 2,5 / 2,9 = **0,862** → trait « 100% » à **13,8 %** du haut (vérifié DOM : `top: 13,79 %`).
- `bassinTropPleinFraction` = 2,9 / 2,9 = **1,0** → non tracé.
- `tauxRemplissage` (texte, plafonné) = 166,6 / 245 = **0,68** → « Remplissage : 68 % » (inchangé).

## Itérations code → test → correction
1. Lecture bornée des 6 fichiers autorisés + lecture config live (IndexedDB).
2. **v3.66.4** : 1ʳᵉ passe `fillRatio` (eau au `tauxRemplissage`) — livrée puis enrichie.
3. **v3.66.5** : calibrage réel — ajout des 3 fractions à `DashboardData`/`getDashboardData` ; `EAU_CHART.eauFill` ; refonte `EauWaterFill` (props `waterFraction`/`flotteurFraction`/`tropPleinFraction`, traits overlay, vagues ×1,5) ; `EauStatCard` (encres renforcées) ; câblage carte.
4. `tsc --noEmit` exit 0 ; `build` OK (à chaque passe).
5. **Validation navigateur** (admin, localhost:3000, `innerWidth=379`, `visibilityState=hidden`) :
   - `rectFill = #149E8C` (eauFill) ✓ ; opacités corps/vagues `0,16 / 0,22 / 0,30` ✓
   - trait « 100% » overlay à `top: 13,79 %` ✓ ; trop-plein non tracé (fraction = 1) ✓
   - eau peinte au niveau réel `0,586` (rAF gelé → peinture rejouée à la main, cf. piège) ✓
   - `pointer-events:none` ; corps `role=button` (Tendances) + bouton icône « Saisir un relevé bassin » (saisie) intacts ✓
   - **seule** « Stock actuel » porte de l'eau ✓
   - zoom : eau vert d'eau + 2 vagues + texte net.
6. **Correctif contraste** (mesuré en navigateur, fond pire-cas = corps + 2 vagues cumulés sous la surface) :
   - 1er jet (corps 0,18 / vagues 0,26 / 0,38 ; hint gray-600) → hint **3,65:1** ❌, valeur forest 4,43.
   - Final (corps **0,16** / vagues **0,22 / 0,30** ; label+hint+« /245 » en **gray-700**, valeur **ahuvi-forest**) → **label 5,49:1 / hint 5,49:1 / valeur (grand texte) 4,88:1** ✅, tous ≥ 4,5:1.

### Erreurs / pièges marquants
- **rAF gelé en onglet MCP `hidden`** (piège déjà consigné) : la boucle d'animation ne tourne pas dans l'onglet de test → géométrie prouvée en rejouant `paint()` à la main au ratio réel + captures. Animation active pour l'utilisateur réel (onglet visible).
- **`Read` impossible sur `appVersion.ts`** (> 25k tokens) → bump PowerShell **UTF-8 sans BOM** (le BOM casse le build PWA — piège connu).
- **Texte en SVG étiré** (`preserveAspectRatio="none"`) serait déformé → traits flotteur/trop-plein + étiquette « 100% » rendus en **overlay HTML** (non déformés).

## État des critères d'acceptation
1. Eau **#149E8C** animée, niveau = stock/(S×hauteurTop) sur **vraies** hauteurs (0,586) — ✅
2. Traits flotteur (« 100% » à 13,8 %) ; trop-plein = haut de carte donc non tracé (repli `max` absent **signalé**) ; niveau > flotteur monterait au-dessus du trait (non plafonné) — ✅ (avec réserve config : max manquant)
3. Montée douce 0→niveau puis figé ; vagues ×~1,5 ; jamais au-dessus du niveau — ✅ (mouvement non observable dans l'onglet MCP gelé, actif pour l'utilisateur)
4. **Lisibilité ≥ 4,5:1** : label 5,49 / hint 5,49 / valeur 4,88 (mesurés) — ✅
5. Position inchangée ; 2 clics OK — ✅
6. Aucune autre carte modifiée ; stock null → pas d'eau, pas d'erreur (`hasFill=false`) — ✅
7. `prefers-reduced-motion` → niveau + traits posés, statiques — ✅ (par code)
8. `eauFill` + encres AHUVI, zéro bleu ; aucune dépendance — ✅
9. `tsc --noEmit` exit 0 ; `build` OK — ✅

## Fichiers créés / modifiés
- **Créé** : `frontend/src/modules/gestion-eau/components/EauWaterFill.tsx`
- **Modifié (PARTAGÉ)** : `services/eauBilanService.ts` — 3 champs calibrés dans `DashboardData` + calcul dans `getDashboardData` (additif).
- **Modifié (PARTAGÉ)** : `components/EauUi.tsx` — `EAU_CHART.eauFill` + props eau/contraste sur `EauStatCard` (additif, `null` → inchangé).
- **Modifié (PARTAGÉ)** : `components/EauDashboard.tsx` — câblage des 3 fractions sur la SEULE carte « Stock actuel » + span « /volumeMax » gray-700.
- **Modifié** : `constants/appVersion.ts`, `package.json` — v3.66.5.

## Dépendances ajoutées
Aucune (SVG pur + `requestAnimationFrame`).

## Impeccable — retenu / écarté (bridé charte AHUVI ; contraste mesuré)
- **Setup** : le projet n'a pas de `PRODUCT.md` (le skill voulait lancer `init`, qui génère une doc design projet-wide **hors périmètre**) → règles Impeccable appliquées directement au calque, sans dérailler. (MAJ skill v3.7.1 dispo — prochaine session.)
- **Retenu** : couleur via constante `EAU_CHART.eauFill` (jamais d'hex en dur dans le composant) ; ease-out exponentiel (pas de bounce) ; vagues ralenties ×1,5 ; **opacités abaissées (0,16/0,22/0,30) pour le contraste** — la charte/lisibilité prime sur les opacités indicatives du prompt (0,16–0,22 / 0,26 / 0,38) ; encres AHUVI renforcées (gray-700 / ahuvi-forest) ; traits + étiquette en overlay HTML net ; calque `aria-hidden`/`pointer-events-none`.
- **Écarté** : dégradé vertical / reflets brillants (palette hors charte + risque contraste) ; vagues à forte amplitude (illusion de niveau + lisibilité) ; halo blanc sous tout le bloc de texte (rendu superflu une fois les opacités/encres calibrées — seul le chip « 100% » garde un fond `bg-white/70`) ; biais des vagues vers le bas pour « zéro crête au-dessus du niveau » (rendu moins naturel ; amplitude faible jugée acceptable, le NIVEAU restant piloté par `waterFraction`).

## Écarts au prompt
- Opacités finales légèrement **sous** les valeurs indicatives (vagues 0,22/0,30 au lieu de 0,26/0,38) pour tenir le contraste ≥ 4,5:1 — choix assumé (« la charte/contraste prime »).
- Bump de version par PowerShell (Read impossible) plutôt que `npm run version:patch`, pour préserver l'entrée d'historique rédigée à la main.
- Deux versions livrées (3.66.4 puis 3.66.5) : la 1ʳᵉ passe simple ayant déjà été poussée, l'enrichissement calibré porte le n° suivant.

## Recommandations pour la suite
1. **Saisir `bassin_hauteur_max_m`** dans la config (hauteur physique réelle ≥ 2,9 m) → fera apparaître le trait trop-plein distinct et calibrera le haut de carte sur le vrai sommet.
2. Validation finale par JOEL sur SON Chrome (onglet visible) pour confirmer la **montée** et l'**ondulation** (non observables dans l'onglet MCP gelé).
3. Pattern réutilisable (`waterFraction` + traits) sur d'autres KPI à jauge si souhaité — strictement additif.
