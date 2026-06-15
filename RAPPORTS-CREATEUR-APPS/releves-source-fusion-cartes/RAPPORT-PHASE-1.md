# Rapport Phase 1 — Onglet « Source » : fusion de la carte « Bassin » dans la carte « Stock d'eau du bassin »

## Horodatage
- **Date** : 2026-06-15
- **Début** : à l'ouverture de la session (lecture du fichier cible)
- **Fin** : après validation navigateur + écriture de ce rapport
- **Durée** : ~35 min (estimation, session continue)
- **Fenêtre de contexte atteinte** : ~environ 60 % (lecture du gros `appVersion.ts` + transcript navigateur, dans les limites)

## Itérations code → test → correction
1. Lecture bornée (`EauBassinReleves.tsx`, `appVersion.ts`, `package.json`).
2. 3 éditions du composant (ref sur carte Stock ; rangée relevé+crayon ; rapatriement des 2 tiroirs + suppression de la carte Bassin) + 2 mises à jour de commentaires de doc.
3. `npx tsc --noEmit` → **exit 0 du premier coup** (aucune correction nécessaire).
4. `npm run build` → **OK du premier coup**.
5. Bump version 3.56.1 → 3.57.0 (`package.json` + `appVersion.ts` : `APP_VERSION`, note FR, entrée `VERSION_HISTORY`, équilibrage de la parenthèse de note).
6. Re-`tsc` + re-`build` → toujours verts.
7. Commit + push `cloudflare-migration`, puis validation navigateur live.

**0 cycle de correction** : aucun bug introduit (le typecheck et le build sont passés au premier essai, et le navigateur a confirmé le comportement attendu).

## État des critères d'acceptation
| # | Critère | État | Preuve |
|---|---------|------|--------|
| 1 | Une seule carte de tête (« Stock d'eau du bassin »), carte « Bassin » disparue | ✅ | DOM : `standaloneBassinTitleLines = 0` ; capture mobile (une seule carte) |
| 2 | Rangée sous la grille : Règle à gauche, ligne brute au milieu, crayon à droite ; pas de titre « Bassin » | ✅ | DOM + capture : `233 cm · 228,3 m³ · 15/06/2026 09:01` entre la grille Écart et « Comprendre » |
| 3 | Clic corps → Comprendre ; clic rangée → Historique ; clic crayon → Saisie ; les trois indépendants | ✅ | Testés un par un en DOM : chaque tiroir s'ouvre seul, **aucune fuite** vers les deux autres (stopPropagation OK) |
| 4 | À l'ouverture de Saisie/Historique, la carte remonte sous le Header | ⚠️ | Logique `scrollBassinUnderHeader` **inchangée**, `bassinCardRef` repositionné sur la carte fusionnée (confirmé). **Non observable en test** : onglet MCP `visibilityState:hidden` → `window.scrollTo` ignoré + rAF gelé par Chrome (limitation outillage documentée ; OK pour l'utilisateur réel, validé v3.56.1) |
| 5 | Deep-link « Saisir bassin » ouvre la Saisie sur la carte fusionnée + défile sous le Header | ⚠️ | Mécanisme « ouvre Saisie » = même `setOpenDrawer('saisir')` (vérifié fonctionnel via le crayon) ; câblage parent `openIntent` non modifié. Volet défilement = même limitation outillage qu'au critère 4 |
| 6 | Crayon désactivé si `isReadOnly` ou `!dim` | ✅ | Binding `disabled={isReadOnly \|\| !dim}` **verbatim** (ici actif : admin + bassin configuré → `pencilDisabled = false`) |
| 7 | `tsc --noEmit` exit 0 ; `build` OK ; aucun orphelin | ✅ | Les deux verts ; `bassinCardRef`/`openDrawer`/`setOpenDrawer` tous référencés, aucun résidu |
| 8 | Charte respectée, rendu mobile propre (~412 px) | ✅ | Capture **396 px** (largeur réelle de l'outil) : teal=eau, crayon forest secondaire, espacements `mt-3 pt-3 border-t` cohérents. `window.innerWidth` a oscillé 396↔528 (fenêtre maximisée — incohérence outillage connue) ; le rendu capturé fait 396 px |

## Fichiers modifiés
- `frontend/src/modules/gestion-eau/components/EauBassinReleves.tsx` — **seul fichier module** (non partagé) : ref déplacé sur la carte Stock, rangée relevé+crayon insérée sous la grille Attendu/Écart, tiroirs Saisir/Histo rapatriés dans la carte Stock, carte « Bassin » supprimée, commentaires de doc mis à jour.
- `frontend/src/constants/appVersion.ts` — version 3.57.0 + note FR + entrée historique (fichier **non partagé** au sens du module ; modifié à chaque déploiement).
- `frontend/package.json` — version 3.57.0.

Aucun fichier partagé inter-modules touché.

## Version déployée
- **3.57.0** poussée sur `cloudflare-migration` (commit `7f99906`). Cloudflare a rebuildé ; l'app live a auto-détecté et appliqué la mise à jour (toast « Application mise à jour ✅ » observé), puis affiché la carte fusionnée.

## Écarts au prompt
- Aucun écart fonctionnel. Conformité stricte : rangée `mt-3 pt-3 border-t border-gray-100 flex items-center gap-2`, zone Historique `flex-1 min-w-0` + `stopPropagation`, crayon repris à l'identique avec `stopPropagation`, ligne brute **seule** (pas de titre « Bassin »), tiroirs et logique de bilan inchangés.

## Surprises / pièges rencontrés
- **Onglet MCP en arrière-plan (`visibilityState:hidden`)** : `window.scrollTo` est ignoré par Chrome et les rAF sont gelés → impossible d'**observer** le défilement « sous le Header » en automatisation (le code est pourtant inchangé et validé pour l'utilisateur réel en v3.56.1). Piège déjà consigné en mémoire.
- **Clics MCP n'atteignent pas React** : les `left_click` pixel n'ont pas déclenché les handlers ; bascule sur `element.click()` DOM (efficace) pour piloter onglets/tiroirs.
- **Captures d'écran gelées par intermittence** (CDP timeout) au début, redevenues fonctionnelles ensuite — d'où une validation principalement par lecture du DOM, confirmée par une capture finale nette.
- **`innerText` renvoie le texte en MAJUSCULES** pour l'en-tête (CSS `uppercase`) alors que `textContent` garde la casse source — adapter les regex de vérification.
- **`appVersion.ts` > 256 Ko / 25k tokens** : lu par portions, édité chirurgicalement (note + équilibrage de parenthèse via grep ciblé).

## Recommandations
- Rien en attente côté code : la fusion est livrée, validée en prod (DOM + capture), `tsc`/`build` verts.
- Faire confirmer par JOEL, sur son navigateur réel (non bridé), le **défilement « sous le Header »** à l'ouverture de Saisie/Historique et via le deep-link « Saisir bassin » — seul point non observable en automatisation (limitation outillage, pas un doute sur le code).
