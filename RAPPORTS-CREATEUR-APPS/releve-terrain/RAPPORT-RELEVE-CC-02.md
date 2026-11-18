# RAPPORT RELEVE-CC-02 : module de calcul pur « Relevé terrain »

- **Référence :** RELEVE-CC-02 (phase 2, calcul pur + tests)
- **Début / fin :** 18/11/2026 17:00 → 17:22 ; durée active ≈ 22 min
- **Contexte atteint :** PRD v0.10 du 18/11/2026 (vérifié en première ligne), sections 3, 6.1 à 6.7 et 6.9, 8, 11 (jeux A, A2, A3, B, C, D, D2, F, G)
- **Commit :** `17420a3` sur `cloudflare-migration`, poussé, message avec `[CF-Pages-Skip]` (pas de construction Cloudflare). Pas de changement de version, pas de déploiement.

## Itérations et erreurs notables
1. Première exécution : 94 tests sur 95 verts du premier coup (toutes les valeurs attendues du PRD retrouvées).
2. Seul écart : la station S14 que le **prompt** décrivait « verte » est **rouge**. Ce n'est pas une valeur du PRD (le PRD dit seulement « refusée (rang 3) »), mais j'ai appliqué la règle `it.fails` du prompt (voir « Écarts »).
3. Pas d'autre erreur. Le skill `react-testing` n'a pas été nécessaire (conventions Vitest déjà en place dans le dépôt).

## Critères d'acceptation

| Critère | État | Mesure |
|---|---|---|
| C1 tests verts | ⚠️ | 11 fichiers, 96 tests passés, **1 `it.fails`** (liste ci-dessous) |
| C2 toutes les valeurs attendues vérifiées | ✅ | voir la correspondance ci-dessous, rien sauté |
| C3 performance | ✅ | station du jeu B : **0,07 ms** (médiane de 20, limite 5 ms) ; courbes du jeu D : **0,5 à 0,65 ms** (médiane de 20, limite 50 ms) |
| C4 contrôle des types | ✅ | compteur global **1910 avant, 1910 après** ; **0 erreur** dans `src/modules/releve-terrain/` (tests compris) ; aucun `any` |
| C5 `npm run build` | ✅ | construit en 11 s ; le module n'est importé nulle part, `dist/` ne contient pas `d3-delaunay` |
| C6 dépendance | ✅ | `d3-delaunay` ^6.0.6 dans `dependencies` de `frontend/package.json`, fichier de verrouillage mis à jour ; **licence ISC** |
| C7 commit | ✅ | `17420a3`, seulement mes fichiers (`git add` par chemins), poussé |
| C8 rapport | ✅ | ce fichier |

**Tests par fichier :** jeu-a 10 · jeu-a2 5 · jeu-a3 3 · jeu-b 9 · jeu-c 4 · jeu-d 9 · jeu-d2 4 · jeu-f 8 (dont 1 `it.fails`) · jeu-g 6 · bornes-valeurs 30 · cas-limites 8. Total 96.

**`it.fails` (seul accepté par la phase suivante) :** `jeu-f.test.ts` › « S14 : la station visant la borne de rang 2 est verte (affirmation du prompt, fausse : indice 5,30) ».

## Correspondance des tests avec le PRD (C2)
- **jeu-a** : tableau « Attendu » du jeu A (3 côtés : distance retenue, écart décamètre et appareil, biais, dénivelé, couleur) ; fermeture −0,011 vert ; bornes calées A, B, C ; écarts au plan B 0,025 vert / C 0,182 orange ; écarts d'altitude B +0,035 / C +0,052 verts ; cap 74,4 → 64,4, direction du plan 64,39, écart 0,0 vert ; calage orange ; pas de message de mode d'affichage.
- **jeu-a2** : B (47,317 ; 22,671), C (69,213 ; −17,165), C au sud de A→B, distances, dénivelés, fermeture, couleurs identiques au jeu A, « nord approximatif » ; sans cap : B (52,468 ; 0), « orientation libre (axe A vers B) », pas de nord.
- **jeu-a3** : cap 254,4 → 244,4, écart 180,0 rouge + « Le plan et le terrain ne concordent pas », positions identiques, calage rouge ; altitude du plan de C 22,33 → −0,948 rouge, calage rouge, altitudes identiques ; cap absent → « cap non contrôlé », calage orange.
- **jeu-b** : S01 à S08, X, Y, altitude, écart d'altitude, indice, vert (8 tests) + mesure C3.
- **jeu-c** : E1, E2 (toutes les valeurs, y compris altitudes par borne, couleurs, visée suspecte), E4 (X, Y, altitude, indice 3,38 orange, visées de plus de 60 m, orange), E5 (pas de calcul, en attente, borne manquante C, proposition « Ajouter une borne éphémère »).
- **jeu-d** : 11 points, 17 triangles tous gardés, plus long côté 71,29 ; courbes 35 / 30 / 25 sur Y = 0 à 12,86 / 33,61 / 54,34 (± 0,20) ; altitudes en (30 ; 0), (40 ; 5), (20 ; −5) (± 0,05) ; courbes majeures tous les 5 m ; mesure C3.
- **jeu-d2** : 8 triangles gardés sur 17, exactement ceux de la liste ; altitudes et « non couvert » à 20 m ; pas de courbe 35, courbes 30 et 25 ; à 15 m : trois points non couverts, (25 ; 0) = 32,076.
- **jeu-f** : création de D depuis S06 (rang 1, coordonnées) ; refus de E4 (message H13 étape 3) ; S10, S11, S12 (toutes valeurs) ; S13 (calcul à 4, rouge, suspecte C, retraits C 0,003 / A 0,953 / B 0,186 / D 0,966, résultat sans C) ; S14 (rang 2 depuis S10, refus rang 3 avec le message de rang).
- **jeu-g** : doublon B refusé (« La lettre B est déjà portée par Borne nord ») ; prochain panneau E ; réemploi D, usage 2, rang 1, position de S01 ; écran Station « D, Angle sud du parking » ; historique et export « D (1) ; Piquet du manguier ; borne éphémère ; 1 ; retirée » et « D (2) ; … ; active » ; S10 inchangée.
- **bornes-valeurs** : section 8, distance ≤ 0 ou > 1000, pente hors −90 à +90, cap hors 0 à 360 (bornes incluses acceptées).
- **cas-limites** : 50/50/99 (angle 8,1°, rouge, « bornes presque alignées ») ; 50/10/70 (« côtés incompatibles ») ; sans plan ni `coteC` (question du côté de C, jamais de côté par défaut) ; lettres réelles dans les messages ; station à 0,5 m de A (`tropPres`) ; `moyenneCaps` ; `normaliserCap(5 − 10)` 355 ; `ecartAngulaire(359, 1)` 2 ; 26 lettres prises.

## Écarts au PRD et au prompt (avec preuve)
1. **S14 « verte » (prompt, pas PRD) : faux.** Depuis (60 ; 5), la borne de rang 2 (placée à S10, (54,993 ; 11,995)) est vue au gisement 324,41°, B à 324,27°, C à 157,71° : les trois bornes sont presque alignées avec la station. Calcul indépendant (Python, formule par les angles : indice = √(3 / Σ sin²(αi − αj))) : **indice 5,30 > 4 → rouge**. Le module donne la même valeur (vérifiée dans le test vert). Le refus « trop de reports, précision insuffisante » reste vérifié, ce qui montre aussi que le rang est contrôlé avant la couleur (ordre demandé en 6.7).
2. **Signe de la hauteur d'appareil en 6.2.** Le PRD écrit « dénivelé = moyenne des V (plus ht − hi) ». Pour rester cohérent avec 6.1 (Zs = ZB + ht − hi − V), le code applique, par lecture A vers B, V + hi − ht (et l'opposé pour une lecture retour). Effet nul dans tous les jeux (hi = ht = 1,50 m). **À trancher par le porteur** avant d'autoriser hi ≠ ht.
3. Choix d'interprétation (pas de valeur en jeu) : visée suspecte désignée seulement si l'écart de position ou d'altitude n'est pas vert (une station orange par sa seule géométrie, comme E4, n'en désigne pas) ; « Distance d'une visée » comparée à la distance lue ; `messageRouge` = « côtés incompatibles » quand le triangle est impossible ; avec `ok: false`, `bornes.c.x/y` valent `NaN`.

## Fichiers
Créés (tous dans `frontend/src/modules/releve-terrain/calcul/`) : `types.ts`, `seuils.ts`, `visee.ts`, `calage.ts`, `station.ts`, `courbes.ts`, `ephemere.ts`, `lettres.ts`, `index.ts`, `d3-delaunay.d.ts` (typage local, le paquet n'en fournit pas), `__tests__/` (11 fichiers de test + `donnees.ts`, `semis.ts`).
Modifiés (**partagés**) : `frontend/package.json`, `frontend/package-lock.json` (ajout de `d3-delaunay` seulement).

## API publique de `calcul/index.ts` (pour RELEVE-CC-03 à CC-07)
- Types : `Couleur`, `Seuil`, `Reglages`, `Lecture`, `EntreeCote`, `ResultatCote`, `Point3`, `ValeursPlan`, `EntreeCalage`, `ResultatCalage`, `BorneConnue`, `Visee`, `ResultatPosition`, `ResultatStation`, `PointCote`, `Triangulation`, `Courbe`, `BorneEtiquette`, `Validation`, `CleControle`, `CleStation`.
- Seuils : `REGLAGES_DEFAUT`, `couleurDe`, `pire`, `rangCouleur`, `MESSAGES`, `COUPURE_MIN` / `COUPURE_MAX`.
- 6.1 et section 8 : `horizontale`, `deniveleVisee`, `altitudeDepuis`, `validerDistance`, `validerPente`, `validerCap`, `validerVisee`.
- 6.2 / 6.3 : `calerCote`, `modeAffichageSuspect`, `calerBornes`, `normaliserCap`, `ecartAngulaire`, `moyenneCaps`, `capVecteur`, `angleMinTriangle`.
- 6.4 : `calculerStation`, `indiceGeometrie`.
- 6.5 : `trianguler`, `courbesDeNiveau`, `altitudeEn`, `zoneCouverte`, `plusLongCote`, `croisementsLigneY`.
- 6.7 : `peutDevenirBorneEphemere`, `estReportee`.
- 6.9 : `prochaineLettreLibre`, `lettreLibre`, `verifierLettre`, `prochainUsage`, `etiquetteBorne`, `ligneExportBorne`, `messageAucuneLettre`.
- Champs ajoutés au contrat : `ResultatCote.dispersion` / `couleurs`, `ResultatCalage.mentionOrientation` / `coteCUtilise`, `ResultatStation.propositionEphemere` / `messages`.

## Recommandations
- Faire trancher le signe hi / ht de 6.2 (écart 2) dans le PRD avant la phase écran du calage.
- Corriger dans le prochain prompt l'affirmation « S14 verte » ; pour un cas S14 réellement vert, prendre une station hors de l'alignement B, borne de rang 2, C (par exemple (52 ; 0)).
- Les écrans doivent passer par `validerVisee` / `validerCap` avant tout calcul, et afficher `messageRouge` tel quel avant « Continuer quand même ».
