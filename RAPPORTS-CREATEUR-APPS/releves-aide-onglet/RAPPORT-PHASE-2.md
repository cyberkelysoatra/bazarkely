# Rapport de phase — Bouton ⓘ Aide dans la barre d'onglets (onglet Source)

**Module :** Gestion Eau (AHUVI) — page `/gestion-eau/releves`, onglet **Source**
**Version livrée :** v3.66.0
**Branche :** `cloudflare-migration`

---

## Horodatage

- **Début :** 2026-06-17 (lecture des fichiers bornés + lancement dev server)
- **Fin :** 2026-06-17 (commit + push + rapport)
- **Durée active :** ~20 min
- **Fenêtre de contexte atteinte :** confortable (~80k tokens utilisés sur 200k) — aucune compaction.

---

## Objectif

Répliquer pour l'onglet **Source** le mécanisme déjà livré en v3.65.0 sur l'onglet Compteurs :
le bouton ⓘ « Aide » remonte dans la barre d'onglets collante (à droite de la nav, même ligne
que les pilules), et le panneau d'aide « Stock du bassin » (`AIDE.bassinNiveau`) se déplie sous
la barre. L'ancienne aide ⓘ de tête, rendue à l'intérieur de `EauBassinReleves`, est retirée
(plus de doublon). L'aide ⓘ de la carte « Entrées d'eau » (`AIDE.bassinEntree`) reste inchangée.

---

## Itérations code → test → correction

1. **Lecture bornée** des 4 fichiers autorisés (`EauRelevesPage`, `EauBassinReleves`, `EauTabs`,
   `EauAide`). Mécanisme `rightSlot` + `useAideState`/`AideToggleButton`/`AidePanel` confirmé.
2. **Édition `EauRelevesPage.tsx`** : ajout `aideSource = useAideState(AIDE.bassinNiveau.id)` ;
   branche `else` du `rightSlot` remplacée (était `undefined`) par un `<AideToggleButton>` ciblant
   `aideSource` ; ajout d'un bloc `{tab === 'source' && <AidePanel … open={aideSource.open}/>}`
   juste avant le contenu Source.
3. **Édition `EauBassinReleves.tsx`** : suppression de la ligne `<EauAide … bassinNiveau …/>` de
   tête ; nettoyage des imports `EauAide` et `AIDE` (devenus orphelins ; `Info` conservé car
   encore utilisé dans l'objet `explain`).
4. **`npx tsc --noEmit`** → **0 erreur** (confirme l'absence d'import orphelin).
5. **`npm run build`** → OK (130 entrées précache, sw-custom généré).
6. **Tests navigateur** (session admin déjà connectée, localhost:3000, via Chrome MCP, DOM-level) —
   voir ci-dessous.
7. **Bump version** 3.65.0 → 3.66.0 (`appVersion.ts` + `package.json`) + entrée d'historique.
8. **Re-`tsc` + re-build** après bump → OK (aucun BOM, pas de régression).

### Erreurs marquantes rencontrées

- **Dev server « Port 3000 already in use »** : un serveur tournait déjà → réutilisé, pas un blocage.
- **Capture d'écran CDP `Page.captureScreenshot` timeout** : renderer figé car onglet MCP masqué
  (`visibilityState:hidden` → rAF gelé — piège connu). Contourné par une **vérification DOM
  exhaustive** (états `aria-expanded`, `aria-controls`, ordre DOM panneau/barre, `localStorage`,
  styles calculés sticky/glass/overflow), bien plus fiable que le pixel ici.
- **`resize_window` à 412px sans effet sur `window.innerWidth`** (reste 1084) : piège connu
  (resize no-op sur cette fenêtre / viewport figé). Largeur étroite réelle non atteignable dans
  l'environnement → critère 6 vérifié **structurellement** (voir ci-dessous), pas en 412px réel.

---

## État des critères

| # | Critère | État |
|---|---------|------|
| 1 | ⓘ Source à droite de la barre collante, même ligne que les pilules ; aucune aide de tête au-dessus de la carte Stock | ✅ (1 seul btn `aria-label="Aide"` dans `[data-eau-sticky-tabs]`, `controls=eau-aide-panel-bassin-niveau` ; carte Stock = 1er élément) |
| 2 | Clic ⓘ Source déplie/replie « Stock du bassin » sous la barre ; mémorisé entre rechargements | ✅ (`aria-expanded` true après clic, panneau présent + texte « À quoi ça sert », ordre DOM = panneau APRÈS la barre, `localStorage eau_aide_bassin-niveau='1'`) |
| 3 | Carte « Entrées d'eau » garde son propre ⓘ « Entrées » inchangé | ✅ (btn `controls=eau-aide-panel-bassin-entree` présent, **hors** barre collante) |
| 4 | Onglet Compteurs strictement identique à v3.65.0 | ✅ (un seul ⓘ `controls=eau-aide-panel-releves` dans la barre, panneau sous la barre) |
| 5 | Bascule Compteurs ↔ Source change la cible du ⓘ, mémorisations indépendantes | ✅ (`lsReleves='1'` et `lsBassin='1'` stockés séparément ; cible bascule releves ↔ bassin-niveau) |
| 6 | Mobile étroit : nav scrollable, ⓘ collé à droite sans casser le sticky | ⚠️ **Vérifié structurellement** : `nav` en `overflow-x:auto`, slot ⓘ en `flex-shrink:0` (dernier enfant). `window.innerWidth` non réductible sous 1084 ici (resize no-op — preuve fournie). Mécanisme `rightSlot` identique à celui déjà prouvé à l'étroit en v3.65.0 (Compteurs). |
| 7 | Barre toujours collante sous le Header, glassmorphisme + calage inchangés | ✅ (`position:sticky`, `top:211px`, `backdrop-filter:blur(12px)`, `bg rgba(255,255,255,0.5)` ; calage des cartes non modifié) |
| 8 | `npx tsc --noEmit` = 0 erreur ; `npm run build` OK | ✅ (les deux passent, avant **et** après bump) |

---

## Fichiers modifiés

- `frontend/src/modules/gestion-eau/components/EauRelevesPage.tsx`
- `frontend/src/modules/gestion-eau/components/EauBassinReleves.tsx`
- `frontend/src/constants/appVersion.ts` (bump + historique)
- `frontend/package.json` (bump)

---

## Écarts au prompt

- **Critère 6 (412px)** : non prouvé en largeur réelle 412px — `window.innerWidth` figé à 1084
  dans l'environnement de test (resize sans effet, piège documenté). Garanti structurellement
  par les classes CSS (`overflow-x:auto` + `flex-shrink:0`), mécanisme déjà validé à l'étroit
  en v3.65.0. Conformément à la consigne « ne jamais prétendre 412px sans preuve », je ne le
  déclare pas vérifié visuellement.
- **Capture d'écran** : non fournie (CDP figé sur onglet masqué). Preuve apportée au niveau DOM.
- Version bumpée en **minor** (3.66.0) car ajout de fonctionnalité observable (nouveau ⓘ Source).

---

## Recommandations

- Validation visuelle finale possible par JOEL dans son Chrome propre sur localhost:3000 (ou en
  prod après déploiement) : onglet Source → ⓘ à droite de la barre → déplie « Stock du bassin ».
- Aucune dette technique introduite. Module Eau toujours sans aide de tête en doublon.
