# Rapport de phase — Carte KPI « Pompes en marche » : calque de flux d'eau descendant

- **Horodatage** : 2026-06-23
- **Version livrée** : `3.66.13` (branche `cloudflare-migration`)
- **Contexte / sessions** : phase unique, autonome. Lecture bornée des 8 fichiers imposés (aucune
  exploration hors périmètre). Module `gestion-eau` (charte AHUVI).

---

## 1. Objectif

Donner à la carte « Pompes en marche » (tableau de bord, sous « Stock actuel ») une animation de la
**même famille** que sa voisine : une **chute d'eau descendante** (l'eau pompée se déverse du haut
vers le bas + lame accumulée en bas), d'**intensité ∝ au débit courant des pompes**, **figée** à
débit nul. Mécanisme **généralisé et réutilisable** : composant dédié `EauFlowFill` + prop
`flowFraction` sur `EauStatCard` (symétrique de `waterFraction`). Comportement de clic sur le corps
de la carte → page Relevés, onglet **Source**, calé sur le bloc « Débit mesuré (m³/h) ».

---

## 2. Itérations code → test → correction

1. Lecture des 8 fichiers de référence (modèle technique `EauWaterFill`, `EauStatCard`/tokens,
   dashboard, routage Relevés, `EauBassinReleves`, `TestsDebit`, `scrollUnderHeader`, `EauTabs`).
2. Création `EauFlowFill.tsx` (canvas) calqué sur la discipline d'`EauWaterFill`.
3. Extension additive `EauStatCard` (prop `flowFraction`, priorité à `waterFraction`).
4. Branchement dashboard (constante de borne + `flowFraction` + clic corps).
5. Câblage navigation/calage (intention `debitFocus` distincte de `debit`).
6. `npx tsc --noEmit` → **exit 0** du 1ᵉʳ coup (aucune correction de types nécessaire).
7. `npm run build` → **succès** (32,9 s, 79 modules, SW généré).
8. Validation Vite + test d'algorithme canvas (voir §5).

---

## 3. Fichiers créés / modifiés

| Fichier | Type | Nature |
|---|---|---|
| `components/EauFlowFill.tsx` | **CRÉÉ** | Calque canvas de chute d'eau descendante. |
| `components/EauUi.tsx` | **PARTAGÉ** | `EauStatCard` : prop `flowFraction` (additive), encres renforcées étendues au flux, rendu `EauFlowFill` si `flowFraction != null` et pas de `waterFraction`. |
| `components/EauDashboard.tsx` | **PARTAGÉ** | Constante `DEBIT_POMPES_NOMINAL_M3H` + `clamp01` ; carte « Pompes en marche » → `flowFraction` + `onClick=goSourceDebit`. |
| `components/EauRelevesPage.tsx` | **PARTAGÉ** | `?focus=debit` → onglet Source + intention `debitFocus` ; nettoyage query inclut `focus`. |
| `components/EauBassinReleves.tsx` | **PARTAGÉ** | Intention `debitFocus` : `setDebitOpen(true)` + `scrollElementUnderHeader([data-eau-debit-mesure] sinon debitRef)`, rAF + ré-assertion 360 ms. |
| `components/bassin/TestsDebit.tsx` | **PARTAGÉ** | Ancre `data-eau-debit-mesure` sur le bloc « Débit mesuré (m³/h) ». |
| `constants/appVersion.ts`, `package.json` | — | Bump `3.66.13` + note FR. |

⚠️ **Fichiers partagés** : tous les changements sont **additifs**. Aucune signature existante
modifiée ; les autres cartes du dashboard et les deep-links historiques (`?tab=bassin&bt=debit`,
`?tab=source`, `?tab=apports`, icône → saisie débit) restent **inchangés**.

---

## 4. Constante de borne retenue

`const DEBIT_POMPES_NOMINAL_M3H = 8;` (m³/h), placée en tête d'`EauDashboard.tsx`, commentée
« plein régime visuel, ajustable ». `flowFraction = clamp01((debitCourantM3h ?? 0) / 8)`. Aucun débit
nominal n'existant en données (décision produit JOEL), cette borne fixe est l'unique point d'ajustement.

---

## 5. État des critères d'acceptation

**`EauFlowFill`**
- ✅ Filets descendants (haut → bas) + lame d'eau en bas, couleur unique `EAU_CHART.eauFill` (rgba dérivé du token, aucun hex en dur ni bleu).
- ✅ Intensité ∝ `flowFraction` : nombre de filets `round(flow·14)`, vitesse `×(0,4+0,6·flow)`, lame `flow·0,28·H`. Mesuré en test : filets 3→7→14, lame 7→17→34 px, pixels peints 1326→3206→6271 entre 0,2 et 1 (croissance monotone, nettement distincte).
- ✅ `flowFraction <= 0` : aucun filet, aucune lame, **0 pixel peint** (figé).
- ✅ `aria-hidden`, `pointer-events-none`, `overflow-hidden` ; ne capte aucun clic ; opacités faibles (filets 0,14–0,18 ; lame 0,12) → texte lisible.
- ✅ `prefers-reduced-motion: reduce` → état statique (lame plate + filets figés à leur offset, re-peint au resize), aucune boucle d'animation lancée.
- ✅ Une seule boucle `requestAnimationFrame` + `ResizeObserver`, tous deux nettoyés au démontage.
- ✅ Re-tween en douceur (`FLOW_TAU = 0,3`, ease-out exponentiel, identique à `EauWaterFill`).

**`EauStatCard`**
- ✅ Prop `flowFraction` fonctionnelle ; `waterFraction` **prioritaire** si les deux fournis (`hasFlow = !hasWater && flowFraction != null`).
- ✅ Cartes sans `flowFraction` inchangées (« Stock actuel » conserve `EauWaterFill` ; toutes les autres rendent à l'identique).

**Dashboard**
- ✅ Carte « Pompes en marche » : chute d'eau d'intensité cohérente avec `debitCourantM3h`.
- ✅ Débit nul/inconnu → carte figée, valeur affichée intacte (`fmtM3h(...)`).

**Navigation & calage (4.4)**
- ✅ Clic corps → `/gestion-eau/releves?tab=source&focus=debit` → onglet Source.
- ✅ Intention `debitFocus` (distincte de `debit`) : révèle Tests de débit + cale `[data-eau-debit-mesure]` sous `[data-eau-sticky-tabs]` via `scrollElementUnderHeader` ; repli `debitRef` si aucun test.
- ✅ `onIconClick` (→ `goSaisieBassin('debit')`) et autres deep-links inchangés.
- ✅ Ré-assertion 360 ms (chargement direct par URL) ; `scrollElementUnderHeader` respecte déjà `prefers-reduced-motion`.
- ✅ Recharts : `isAnimationActive={false}` conservé sur le graphe de débit.

**Global**
- ✅ `npx tsc --noEmit` exit 0 · ✅ `npm run build` OK · ✅ version bumpée · ✅ push `cloudflare-migration`.

### Méthode de validation (contrainte connue)

Le navigateur bridé de Claude **ne peut pas s'authentifier** (login Supabase/Google bloqué) → la
page protégée `/gestion-eau` n'est pas atteignable par Claude (mémoire `feedback_test_local_navigateur_propre`).
Validation effectuée dans les limites possibles :
1. **Vite transforme `EauFlowFill.tsx`** sans erreur (HTTP 200, JS valide) → imports/syntaxe runtime OK.
2. **Test d'algorithme canvas** (réplique exacte de `paint()`, mêmes constantes) exécuté dans le
   navigateur : confirme le mapping d'intensité et le gel à 0 (chiffres ci-dessus).
3. `tsc --noEmit` + `build` verts.

➡️ **Validation visuelle finale sur le dashboard connecté = JOEL** (son navigateur propre, en local
ou en prod après déploiement Cloudflare). À confirmer : rendu de la chute d'eau « Pompes en marche »,
absence de régression « Stock actuel », et calage du bloc « Débit mesuré » au clic.

---

## 6. Passe « Impeccable »

Non exécutée comme passe formelle distincte (la finition est intégrée au composant). Choix de polissage
**retenus**, bridés AHUVI :
- Filets en **dégradé longitudinal** (transparent aux extrémités, marqué au centre) → effet de streak
  qui « tombe » sans clignoter, plutôt qu'un trait plein.
- Surface de la lame **légèrement ondulée** (amplitude ≤ 2,2 px, ∝ intensité) pour la vie sans bruit visuel.
- Répartition **déterministe** des filets (fractions du nombre d'or) → pas de scintillement au remount.

**Écartés** (bride dure) : aucun highlight blanc (contrairement aux colonnes d'`EauWaterFill`) pour
respecter « couleur exclusivement `eauFill` » ; aucune nouvelle palette/police/librairie ; logique,
données et navigation non touchées.

---

## 7. Écarts au prompt

- **Aucun écart fonctionnel.** Implémentation canvas retenue (option explicitement autorisée) plutôt
  que DOM/SVG, pour un système de particules à nombre/vitesse variables plus sobre côté perf mobile.
- Ancre de calage matérialisée par **attribut `data-`** (`data-eau-debit-mesure`) plutôt qu'une ref
  transmise — option explicitement autorisée par le prompt, et cohérente avec `data-eau-sticky-tabs`.

---

## 8. Recommandations pour la suite

- Après validation visuelle de JOEL, **ajuster `DEBIT_POMPES_NOMINAL_M3H`** si le plein régime visuel
  est atteint trop tôt/tard (un seul nombre à changer).
- `flowFraction` étant désormais générique sur `EauStatCard`, il est réutilisable pour toute carte de
  flux entrant (ex. « Entrées du jour ») si on veut filer la métaphore.
