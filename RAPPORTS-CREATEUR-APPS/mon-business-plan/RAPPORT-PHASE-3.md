# Rapport NEC-CC-03 : Mon Business Plan, phase 3 (modules 1 et 2)

Réf. NEC-CC-03 · branche **`nec-m12`** (worktree `C:\bazarkely-2-nec-m12`) · dernier commit **`417e269`** · aucune poussée, aucun déploiement, version inchangée (3.129.0).

## Durées et déroulement
- Début : 10/11/2026 08:16 · fin : 09:00 · durée ≈ 45 min (dont ≈ 11 min d'installation `npm ci`).
- Une seule session, fenêtre de contexte non atteinte, aucune question posée.
- Itérations :
  1. Banc : boucle d'ouverture des aides écrite sur une liste « vivante » (le 2e bouton n'existait plus une fois le 1er ouvert) ; corrigée dans le banc, pas dans l'app.
  2. Banc : seule « erreur » relevée = le websocket HMR du serveur de dev, fixé sur le port 3000 déjà pris (bruit connu, prévu par le contrat de la phase 1) ; filtré.
  3. Contrôle de types : 1 erreur dans mon fichier (type `Pv` inutilisé) ; retirée.
  4. Phrase d'exemple : virgule en trop avant « qui » ; retirée.
  5. Finition `impeccable` : le bouton « Voir mon canvas » portait l'icône de liste du sommaire ; remplacée par une icône de canvas dessinée localement (même trait que `composants/Icones`, fichier partagé non touché). Les tests contenaient en clair les caractères interdits (dans l'expression qui les cherche) : remplacés par leurs codes `\u`.

## Critères d'acceptation
Banc : Playwright + Chrome système (`channel: 'chrome'`), fenêtre **412 × 869, DPR 3,5, tactile** ; mesuré `innerWidth === 412`, `devicePixelRatio === 3.5`. Bancs et captures dans `3-captures/` (`banc-m12.cjs` sur le serveur de dev 3001 : **33/33 OK** ; `banc-m12-horsligne.cjs` sur le build servi par `vite preview` 4183 : **9/9 OK**).

| | Critère | Résultat | Preuve |
|---|---|---|---|
| C1 | Tout remplir, recharger, tout revient ; 100 % au Sommaire | ✅ | Nouveau projet, nom « Projet Banc C1 » ; M1 : 15 champs remplis ; M2 : 9 blocs sur deux lignes + date 12/11/2026. Après rechargement : 15 valeurs M1, 9 valeurs M2 et la date identiques. Sommaire : `m1 = 100`, `m2 = 100`. |
| C2 | Phrase 1c complète avec le nom du projet | ✅ | « Pour M1 réponse 10 qui M1 réponse 11, Projet Banc C1 propose M1 réponse 12 qui M1 réponse 13, contrairement à M1 réponse 14. » Sur l'exemple : « … JUS'NOSY propose … contrairement aux jus importés … » (contraction « à les » → « aux »). |
| C3 | Exemple JUS'NOSY : M1 et M2 remplis, lecture seule | ✅ | `/p/exemple/m1` et `/m2` : 0 champ de saisie, aucun « Non rempli », textes du cahier présents (problème, causes, conséquences, « 60 établissements ciblés », 9 blocs, « 11 novembre 2026 »), bandeau lecture seule. Sommaire de l'exemple : M1 et M2 à 100 %. |
| C4 | Pas de défilement horizontal à 412 ; canvas correct à 1280 | ✅ | `scrollWidth === 412` sur M1 (aides ouvertes), M2 (9 exemples ouverts), canvas ouvert, M1 et M2 de l'exemple. Canvas 412 : empilé 1 à 9. Canvas 1280 (`canvas-1280.png`) : 8 7 2 4 1 en haut (même hauteur de départ, gauche à droite), 6 sous 7 et 3 sous 4, 8, 2 et 1 sur deux rangées, 9 et 5 en bas de même largeur. |
| C5 | Hors ligne après le premier chargement | ✅ | Build : « Prêt pour le mode avion » atteint, nouveau projet, `setOffline(true)` ; M1 et M2 s'ouvrent, une saisie dans chacun survit au rechargement hors ligne ; Sommaire hors ligne : M1 7 % (1/15), M2 11 % (1/9). 0 erreur de page. |
| C6 | Seuls les fichiers autorisés | ✅ | `git diff --name-only cloudflare-migration...nec-m12` : 11 fichiers, tous dans `ateliers/m1/`, `ateliers/m2/`, `data/exemple/m1.ts`, `data/exemple/m2.ts`. |
| C7 | Rapport | ✅ | Ce fichier (dans le dépôt principal, non commité). |

## Contrôles de fin
- Types : `npx tsc --noEmit -p tsconfig.app.json` → **1910** (= base de la phase 1 au même commit `18593e2`), **0 erreur** dans `business-plan`.
- `npm run build` OK dans le worktree.
- Vitest : 22 tests verts (`m1.test.ts` 5, `m2.test.ts` 5, `chiffres.test.ts` 12).
- Aucun tiret long, tiret moyen ni point médian dans les textes (grep + tests).

## Fichiers (branche `nec-m12`)
- `ateliers/m1/Page.tsx` : intro « Structurer le projet », aide « À retenir » (3 points), 1a arbre (Conséquences en haut, branches en SVG, Problème central en violet, racines en SVG, Causes en bas) avec l'exemple JUS'NOSY en aide, 1b 6 questions + rappel « « Tout le monde » n'est pas un client. », 1c 5 morceaux + nom du projet (lien vers la fiche d'identité s'il manque) + « MA PHRASE » en direct, 1d.
- `ateliers/m1/phrase.ts` (nouveau) : construction de la phrase, crochets pour les parties vides, contraction « à les / à le ».
- `ateliers/m1/progression.ts` : part des 15 champs remplis.
- `ateliers/m2/Page.tsx` : intro, « Version du » (date du jour à Madagascar par défaut, enregistrée avec la première saisie), bouton « Voir mon canvas » (en haut et en bas), 9 cartes numérotées avec question, consigne « Une idée par ligne, en quelques mots. », note « Un bloc vide est une question à travailler, pas un détail. », bouton « Voir l'exemple ».
- `ateliers/m2/blocs.ts` (nouveau) : les 9 blocs (titre, question, exemple, placement dans la grille), date de Madagascar (UTC+3), date en français.
- `ateliers/m2/Canvas.tsx` (nouveau) : vue d'ensemble plein écran (fermeture par « Fermer » ou Échap), grille du cahier dès 768 px, empilée sur téléphone, « À travailler » pour un bloc vide.
- `ateliers/m2/progression.ts` : part des 9 blocs remplis.
- `data/exemple/m1.ts`, `data/exemple/m2.ts` : valeurs JUS'NOSY.
- `ateliers/m1/m1.test.ts`, `ateliers/m2/m2.test.ts` (nouveaux).

## Besoins sur les fichiers partagés (non modifiés)
- `rubriques/registre.ts` : les titres du Sommaire restent ceux de la phase 1 (« Module 1 : Le problème et le client », « Module 2 : Mon modèle économique », sous-titre « Les 9 cases du modèle »). Le prompt nomme les modules « Structurer le projet » et « Le Business Model Canvas » : ces titres sont repris en tête de page. À aligner en phase 5 si l'équipe NEC le souhaite.
- `composants/Icones.tsx` : une icône « canvas » partagée serait plus propre que l'icône locale de `m2/Page.tsx`.

## Surprises
- `.bp-ecran` limite la page à 480 px : à 1280 px, une grille dans la page serait restée étroite. La vue d'ensemble est donc un plein écran fixe (hors de cette limite), ce qui ne touche aucun fichier partagé.
- `planExemple()` fusionne les sections avec `Object.assign` (superficiel) : `client` et `pv` de l'exemple doivent être complets (ils le sont).
- `npm ci` hors ligne d'abord : 11 minutes.

## Ce que le prompt n'avait pas prévu
- « Share of the 12 text fields » : le module 1 compte en réalité **15** champs (3 de l'arbre + 6 du client + 5 de la phrase + 1). La progression porte sur les 15.
- Textes de l'exemple non fournis par le prompt, rédigés de façon cohérente avec le cahier et la page 8 : client (qui, où, « 60 établissements ciblés », achat actuel, prix actuel « environ 3 000 Ar à 4 000 Ar », décideur et paiement à 15 jours), découpage de la proposition de valeur en 5 morceaux, « Pourquoi moi ? ». À faire relire par l'équipe NEC.
- « Version du » par défaut aujourd'hui : enregistrée seulement avec la première saisie d'un bloc (ou un choix de date), pour que la date ne change pas d'un jour à l'autre sans action.
- Numéros de page du cahier : non affichés dans les modules 1 et 2 (le texte « Bientôt… page N » a disparu avec les pages réelles).
