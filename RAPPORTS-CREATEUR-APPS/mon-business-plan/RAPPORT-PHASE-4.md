# Rapport NEC-CC-04 : Mon Business Plan, phase 4 (modules 3, 4 et « Mes prix relevés »)

Réf. NEC-CC-04 · branche **`nec-m34`** (worktree `C:\bazarkely-2-nec-m34`) · dernier commit **`1a6ee97`** · aucun push de `cloudflare-migration`, aucun déploiement, version inchangée (3.129.0)

## Durées et déroulement
- Début : 10/11/2026 08:16 · fin : 09:05 · durée ≈ 50 min.
- Une seule session, fenêtre de contexte non atteinte.
- Itérations :
  1. Premier chargement du serveur de dev (port 3002) plus long que 30 s (préparation des dépendances) : délais du banc portés à 180 s.
  2. Banc : deux sélecteurs ambigus (« Concurrent 1 » trouvait aussi « Supprimer le concurrent 1 ») et une boucle d'ouverture des aides fautive. Défauts du banc, pas de l'appli.
  3. Finition `impeccable` (mode Operate, charte NEC) : en lecture seule, « Mes prix relevés » montrait chaque prix comme une grande fiche de 4 champs. Remplacé par une liste compacte (élément, unité, prix à droite, lieu dessous). Banc complet repassé ensuite : tout vert.

## Critères d'acceptation
Banc : Playwright + Chrome système, fenêtre 412 × 869, DPR 3,5, tactile ; mesuré `innerWidth === 412`, `devicePixelRatio === 3.5`. Bancs : `banc-m34.cjs` (dev 3002), `banc-horsligne.cjs` (build servi par `vite preview` 4182).

| | Critère | Résultat | Preuve |
|---|---|---|---|
| C1 | Saisie M3, M4, prix, rechargement, calculs 3a | ✅ | 60, 25, 4, prix 3 000 (repris du module 5 par le bouton « Reprendre le prix du module 5 : 3 000 Ar »), 20 % → **6 000 bouteilles de 50 cl**, **18 000 000 Ar**, **1 200** par mois, **14 400** par an, **43 200 000 Ar**. Après rechargement : clients 60, source 3, part 20, concurrent « Sodas » en Indirect, SWOT, 4 P, personne, temps partiel, objectif du trimestre 4, SARLU, statuts « Déjà fait », date CNaPS 2027-01-16, 3 prix relevés : tout revenu. Vitest : 7 tests (calculs, progressions, envoi, exemple sans tirets). |
| C2 | Unité partagée | ✅ | « bouteille » tapée en 3a → lue en 5a ; « bouteille de 50 cl » tapée en 5a → lue en 3a. |
| C3 | Liaisons avec le module 5 | ✅ | « Utiliser ces ventes » → message « Ventes de l'année 1 reprises dans le module 5. », bouton disparu, module 5 année 1 = **1 200**. « Envoyer vers mon prix de revient » (Mangues, le kg, 2 000) → « Ajouté au module 5 », ligne « Mangues (le kg) » 2 000 en 5a, coût variable unitaire **0 Ar → 2 000 Ar**. |
| C4 | Exemple JUS'NOSY en lecture seule | ✅ | M3, M4, prix : 0 champ de saisie, 0 bouton d'action, toutes les valeurs attendues présentes (chiffres 3a, 3 concurrents, SWOT, 4 P, « Livrer 10 hôtels chaque semaine d'ici juin 2027 », SARLU, « Prévu le 10 janvier 2027 », prix relevés), aucun tiret long, demi-cadratin ni point médian. Sommaire de l'exemple : M3 100 %, M4 100 %, prix 100 %. |
| C5 | Pas de défilement horizontal, hors ligne | ✅ | `scrollWidth === innerWidth === 412` sur 10 mesures (m3, m4, prix en saisie avec aides ouvertes, sommaire, exemples m3, m4, prix avec aides ouvertes, et les 3 exemples sur le build hors ligne). Build : « Prêt pour le mode avion ✓ », `setOffline(true)` (`navigator.onLine === false`), saisie M3 puis rechargement hors ligne : 60 et 43 200 000 Ar revenus ; M4 et prix s'ouvrent ; prix « Mangues » survit au rechargement hors ligne. |
| C6 | Fichiers modifiés | ✅ | `git diff --name-only cloudflare-migration...nec-m34` : 12 fichiers, tous dans `ateliers/m3`, `ateliers/m4`, `ateliers/prix`, `data/exemple/m3.ts`, `m4.ts`, `prix.ts`. |
| C7 | Rapport | ✅ | Ce fichier. |

## Contrôles de fin
- Types : `npx tsc --noEmit -p tsconfig.app.json` → **1910** (identique à la référence de la phase 1 au même commit de départ), **0** erreur dans `business-plan`.
- `npm run build` OK dans le worktree (plan : `plan-*.js` 116,9 kB gzip, pages M3/M4/prix chargées à la demande).
- Vitest `business-plan` : 19 tests verts (12 phase 1 + 7 phase 4).

## Fichiers (branche `nec-m34`)
- `ateliers/m3/Page.tsx`, `progression.ts`, **`calculs.ts`** (calculs purs 3a), **`calculs.test.ts`**
- `ateliers/m4/Page.tsx`, `progression.ts`
- `ateliers/prix/Page.tsx`, `progression.ts`, **`envoi.ts`** (ajout d'un prix aux coûts de 5a)
- `data/exemple/m3.ts`, `m4.ts`, `prix.ts`

## Besoins sur les fichiers partagés
Aucun. Rien n'a été touché hors de la liste autorisée.

## Choix faits sans le cahier
- **Le cahier papier n'était pas fourni** (ni dans le dépôt, ni dans le dossier du prompt). Textes rédigés dans son esprit, à faire relire par l'équipe NEC : questions des 4 P, bloc « À FAIRE CE SOIR » (4 consignes), tableau des formes juridiques (forme, pour qui, ce que vous risquez), paragraphe des démarches, consignes des cartes SWOT, exemples JUS'NOSY de M4 et des prix relevés. Les textes cités par le prompt sont repris mot pour mot.
- Le tableau de la page 10 est rendu en liste empilée (un tableau déborderait à 412 px).
- La forme juridique est enregistrée en toutes lettres (« SARL unipersonnelle (SARLU) ») : directement lisible par la synthèse et l'export de la phase 5.
- « Ventes visées en Ar » est affiché **par an** (43 200 000 Ar, le chiffre du critère C1).
- « Envoyer vers mon prix de revient » : sans unité, le libellé est l'élément seul (pas de « Sucre () ») ; si le module 5 n'a que la ligne vide d'un plan neuf, elle est remplacée au lieu de rester en tête. Bouton inactif tant que l'élément ou le prix manquent.
- L'alerte « Citez au moins un concurrent » est un rappel doux violet (pas le rouge des erreurs).
- Démarches : bouton « Déjà fait » ou champ date natif « Date prévue » ; en lecture seule « Déjà fait » ou « Prévu le 10 janvier 2027 ».
- Progressions : M3 = 14 points (unité, 3 chiffres et leurs 3 sources, prix, part, au moins un concurrent nommé, 4 cartes SWOT) ; M4 = 14 points (4 P, étapes, équipe, fournisseurs, 4 trimestres, forme, pourquoi, toutes les démarches renseignées) ; prix = 3 lignes complètes pour 100 %.

## Surprises
- Le serveur de dev 3002 met plus de 30 s à servir la première page (préparation des dépendances), puis tout va vite.
- Erreurs « WebSocket closed without opened » dans la console du dev : le rechargement à chaud reste fixé sur le port 3000 (déjà noté en phase 1), sans effet sur la page.
- Sur les captures pleine page de la finition, la barre du bas apparaît en plein milieu : c'est un effet de la capture (barre fixe), pas un défaut.

## Ce que le prompt n'avait pas prévu
- Le cahier papier (pages 8 à 12 et 19) n'était pas joint : voir « Choix faits sans le cahier ».
- Le test hors ligne (C5) ne peut se faire que sur le build : le service worker n'existe pas en dev. Fait sur `vite preview` 4182.

## Pour la fusion
`nec-m34` part de `18593e2` et ne touche que ses propres dossiers : la fusion avec `nec-m12` (phase 3) ne doit pas créer de conflit. Après fusion : refaire le compteur de types et le build, puis `npm run version:minor` avant le push.
