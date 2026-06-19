# Rapport de phase — Animation d'eau dans la carte « Stock actuel » (Mode A)

**Module :** gestion-eau (AHUVI) · **Version livrée :** v3.66.4 · **Branche :** `cloudflare-migration`

## Horodatage
- Début : 2026-06-20 (session)
- Fin : 2026-06-20 (même session)
- Durée active : ~25 min (lecture bornée → composant → câblage → tsc/build → validation navigateur → déploiement → rapport)
- Fenêtre de contexte atteinte : non saturée (lecture bornée respectée, fichier `appVersion.ts` non relu intégralement car > 25k tokens — édité par PowerShell ciblé).

## Itérations code → test → correction
1. **Lecture bornée** des 3 fichiers autorisés (`EauUi.tsx`, `EauDashboard.tsx`, `tailwind.config.js`) + repérage de la carte « Stock actuel » dans `EauDashboard.tsx` (ligne 252).
2. **Création** de `EauWaterFill.tsx` (SVG pur, rAF, ease-out, reduced-motion).
3. **Branchement additif** de `fillRatio` dans `EauStatCard` (corps enveloppé en `relative z-10`, calque rendu avant).
4. **Câblage** de la seule carte « Stock actuel » : `fillRatio={data?.tauxRemplissage ?? null}`.
5. `npx tsc --noEmit` → **exit 0** ; `npm run build` → **OK**.
6. **Validation navigateur** (session admin, localhost:3000) :
   - Carte trouvée, « Remplissage : 68% » → `rect y=32, height=68` (eau aux 68% du bas) ✅
   - Couleur `rgb(16,147,159)` = `#10939F` = `ahuvi-teal` exact ✅
   - `pointer-events:none` sur le calque → corps `role=button` (Tendances) + bouton icône (saisie bassin) intacts ✅
   - **Seule** « Stock actuel » porte de l'eau (6 cartes scannées) ✅
   - Capture d'écran : nappe teal ondulée sous le texte, texte lisible ✅
7. **Bump** v3.66.4 (`appVersion.ts` + `package.json`, UTF-8 sans BOM) → re-`tsc` OK + re-`build` OK.

### Erreurs / pièges marquants rencontrés
- **rAF gelé en onglet MCP `hidden`** (piège déjà consigné) : `requestAnimationFrame` ne tourne pas dans l'onglet de test (laisse `d=""` / `rect h=0`). **Contourné** en rejouant manuellement la logique exacte de `paint()` sur le DOM réel au ratio live (0,68) pour prouver la géométrie, puis capture d'écran. Pour un utilisateur réel (onglet visible) l'animation tourne normalement.
- **`Read` impossible sur `appVersion.ts`** (> 25k tokens, ligne géante) → bump par PowerShell ciblé en **UTF-8 sans BOM** (le BOM casse le build vite-plugin-pwa — piège connu).
- 1ʳᵉ insertion d'historique ratée (ancre dépendante du saut de ligne) → corrigée via `IndexOf`/`Substring` indépendant de CRLF/LF.

## État des critères d'acceptation
1. Nappe teal à la hauteur du % affiché (68%) — ✅
2. Montée 0→niveau (ease-out) puis fige, vagues continues, jamais de dépassement — ✅ (logique vérifiée ; mouvement non observable dans l'onglet MCP gelé mais actif pour l'utilisateur réel)
3. Icône / libellé / valeur / hint en place et lisibles au-dessus de l'eau (z-10) — ✅
4. Clic corps → Tendances ; clic icône → saisie bassin (calque `pointer-events-none`) — ✅
5. Aucune autre carte n'affiche d'eau ni n'a changé — ✅
6. `tauxRemplissage` null → carte normale, sans eau, sans erreur (`hasFill=false`) — ✅ (par construction, prouvé par les autres cartes)
7. `prefers-reduced-motion` → niveau posé, statique (branche dédiée, sans rAF) — ✅ (par code)
8. Aucune couleur hors charte (teal via `currentColor`) ; aucune dépendance ajoutée — ✅
9. `tsc --noEmit` exit 0 ; `npm run build` OK — ✅

## Fichiers créés / modifiés
- **Créé** : `frontend/src/modules/gestion-eau/components/EauWaterFill.tsx`
- **Modifié (PARTAGÉ)** : `frontend/src/modules/gestion-eau/components/EauUi.tsx` — ajout strictement additif de la prop `fillRatio` à `EauStatCard` (conditionné ; rendu inchangé sans la prop).
- **Modifié (PARTAGÉ)** : `frontend/src/modules/gestion-eau/components/EauDashboard.tsx` — `fillRatio` ajouté sur la SEULE carte « Stock actuel ».
- **Modifié** : `frontend/src/constants/appVersion.ts`, `frontend/package.json` — bump v3.66.4.

## Dépendances ajoutées
Aucune (SVG pur + `requestAnimationFrame`, comme attendu).

## Suggestions Impeccable — retenues / écartées
- **Retenu** : deux vagues d'opacités/vitesses/phases différentes (0,28 et 0,40) sur un corps translucide (0,20) → profondeur sans nuire à la lisibilité du texte.
- **Retenu** : couleur via `currentColor` + `text-ahuvi-teal` plutôt qu'un hex en dur → reste piloté par le token de charte (zéro hex arbitraire).
- **Retenu** : tween exponentiel ease-out (approche par valeurs inférieures) → garantit « ne dépasse jamais le niveau réel » sans logique de clamp supplémentaire.
- **Écarté** : dégradé vertical / reflets brillants → introduirait des teintes hors charte et risquerait de réduire le contraste du texte. Charte AHUVI prioritaire → gardé un aplat teal translucide uniforme.
- **Écarté** : amplitude de vague plus marquée (effet « houle ») → nuirait à la lisibilité et donnerait l'illusion d'un niveau supérieur ; amplitude maintenue à 4–5,5 unités.

## Écarts au prompt
Aucun écart fonctionnel. Seule adaptation : bump de version par PowerShell (Read du fichier impossible) au lieu de `npm run version:patch`, pour éviter d'écraser l'entrée d'historique rédigée à la main.

## Recommandations pour la suite
- Validation finale par JOEL sur SON Chrome (onglet visible) pour confirmer visuellement la **montée** et l'**ondulation** (non observables dans l'onglet MCP gelé).
- Si le motif plaît, le pattern `fillRatio` est réutilisable tel quel sur d'autres KPI à jauge (ex. « Autonomie estimée ») — additif, sans toucher aux cartes existantes.
