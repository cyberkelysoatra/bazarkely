# RAPPORT RELEVE-CC-06 : écrans 11 « Carte », 12 « Résultats » et exports

- **Référence :** RELEVE-CC-06 (phase 2d, session parallèle, worktree `C:\bazarkely-2-releve-06`, branche `releve-cc-06`)
- **Début / fin :** 18/11/2026 vers 19:05 → 20:05 ; durée active ≈ 1 h
- **Contexte atteint :** environ 55 % (lecture du contrat CC-03, du PRD, des maquettes, 23 fichiers écrits, 3 passages au banc)
- **Commits sur `releve-cc-06` (poussés, `[CF-Pages-Skip]`, aucun déploiement, aucune version changée) :**
  - `a5036b0` feat : carte, résultats, exports, réglages (code, tests, scénario de banc)
  - le commit de ce rapport et des captures, seul, ensuite

## Itérations et erreurs notables
1. `npm ci --prefer-offline` dans le worktree (≈ 8 min), serveur de dev `npx vite --port 3003 --strictPort` lancé avant le code et laissé tourner.
2. `tsc` : deux erreurs `erasableSyntaxOnly` (propriétés de paramètre de constructeur dans `exports/pdf.ts`), corrigées. Ensuite 0 erreur dans le module.
3. Tests : `Blob.text()` absent de jsdom, lecture des fichiers par `FileReader` (plus sûr aussi sur les vieux téléphones) ; un cache de courbes à une seule entrée vidé d'un test à l'autre, remplacé par un petit cache de 8 entrées ; deux attentes de test fausses (guillemets CSV, ordre des mentions) corrigées dans les tests.
4. Banc, 1er passage : échec sur l'import du jeu F, parce que les jeux F et G portent le même nom « Stations B F G » : le dialogue « Remplacer / Garder les deux » s'affichait **à juste titre** ; scénario corrigé (« Garder les deux »).
5. Banc, 2e passage : faux échec C5 dû à d'anciens fichiers restés dans `dist` (le build ne vide pas `dist`) ; `dist/assets/releve` et `dist/releve` vidés puis reconstruits : vert.
6. Passe `impeccable` (polish, bornée) : titre de la carte ramené à la règle du design (« Carte » 34 px / 800, compte en sous-titre) ; numéros des stations masqués sur une carte dense (plus de 30 stations et moins de 7 px par mètre : ils se chevauchaient) et visibles dès qu'on zoome.

## Critères d'acceptation

| Critère | État | Preuve |
|---|---|---|
| C1 jeu D | ✅ | Test `ecrans/carte/__tests__/modele.test.ts` sur `donneesCourbes` (fonction qui alimente le SVG) : 17 triangles gardés ; ligne Y = 0 : 35 vers 12,86, 30 vers 33,61, 25 vers 54,34 (± 0,20). Banc (build de production) : carte « 11 points, 17 triangles gardés sur 17 (coupure 100 m) », tableau Comparaison **30,872 / 28,483 / 33,257**, P1 et P3 en rouge (écart > 0,50), courbes 22 à 38 dessinées dont 25, 30, 35 |
| C2 jeu D2 | ✅ | Test : 8 triangles gardés, exactement les 8 du PRD ; (30 ; 0) 30,872, (40 ; 5) 28,483, (20 ; −5) non couvert, aucune courbe 35 sur Y = 0. Banc : « 8 triangles gardés sur 17 (coupure 20 m) », même tableau, P3 « non couvert », aucun segment de 35 ne coupe Y = 0 ; puis coupure réglée à **15 m** par la carte Réglages : P4 (25 ; 0) **32,076**, P1, P2, P3 « non couvert » |
| C3 CSV jeu G | ✅ | Banc (fichier téléchargé `Releve_Stations-B-F-G_2026-11-18_points.csv`, copie dans `captures-cc-06\`) : BOM présent, en-tête exact H18, `D (1);Piquet du manguier;borne éphémère;1;retirée`, `D (2);Angle sud du parking;borne éphémère;1;active`, S10 « B, C, D (1) », virgule décimale, aucun tiret long ni point médian. Test `exports/__tests__/csv.test.ts` : station visant une borne de rang 2 → « normale, reportée », « gardée, reportée » ; injection (`=`, `+`, `@`, `-` + lettre préfixés, nombres jamais) |
| C4 aller-retour sauvegarde | ✅ | Test (vraie IndexedDB) : jeu F exporté puis rouvert « Garder les deux » : `calculerReleve` des deux relevés égal en profondeur (positions, couleurs, points des courbes), tous les ids différents, même nombre de bornes ; « Remplacer » garde les ids ; Annuler n'écrit rien ; fichiers faux, trop gros (> 5 Mo), objet illisible refusés. Banc : fichier `Releve_Stations-B-F-G-2_2026-11-18.releve.json` partagé puis rouvert par le menu « Ouvrir une sauvegarde ici » du chantier, dialogue « Garder les deux » : 19 objets, aucun id commun, même nombre de bornes, **CSV des deux relevés identique** ; « Remplacer » : 19 ids gardés ; `{"format":"autre"}` et un texte quelconque refusés avec « Ce fichier n'est pas une sauvegarde de relevé. » |
| C5 PDF | ✅ | Test (compression coupée) : PDF non vide, nom « Plates-formes 1 à 3 », lettres A, B, C, D (1), D (2), « Piquet du manguier, retirée », date, nom de fichier `Releve_<nom>_<AAAA-MM-JJ>.pdf` ; orientation libre : pas de « N », mention « orientation libre (axe A vers B) » ; « nord approximatif » et « altitudes relatives ». Banc : `jspdf.es.min-*.js` (127 ko gzip) et `pdf-*.js` absents de la page et **non demandés avant le toucher**, demandés au toucher ; les deux dans `releve/precache.json` ; PDF de 9 997 octets commençant par `%PDF-` (copie dans `captures-cc-06\`) |
| C6 carte | ✅ | Banc, `vite preview` : 100 stations distinctes et 9 courbes : **15,3 à 20,1 ms** sur 5 ouvertures (entrée `performance` « releve-carte », du début du rendu à l'image suivante) ; changement d'intervalle à 0,5 m : 15,5 ms. Pincement à deux pointeurs (événements de pointeur synthétiques) : échelle 4,45 → 13,36 px/m ; « Recentrer » revient à 4,45 ; toucher S45 ouvre `/r/cent-stations/saisir/C45`. `?zones=ephemere` : bannière visible, zones différentes ; test : 3 bornes principales, seuil 2,0 (4 bornes et 2,5 en mode normal), cellules grises toutes au-dessus du seuil |
| C7 réglages | ✅ | Banc : « Modifier les seuils » → coupure 15 → « Tous les résultats seront recalculés. Continuer ? » → `entete.reglages.coupure` 15, rev 2 → 4, objet journal `reglages_modifies` `{avant:{coupure:20}, apres:{coupure:15}}`, résultats recalculés à l'écran ; intervalle « 2 m » : `cles.vue_intervalle = 2`, rev et `maj_at` du relevé inchangés |
| C8 captures | ✅ | `captures-cc-06\` : `11-carte`, `11-carte-bas`, `11-c1-carte-jeu-D`, `11-c6-carte-100-stations`, `11-c6-apres-pince`, `11-c6-zones-ephemere`, `12-resultats-haut`, `12-resultats-1/2/3`, `12-reglages-feuille`, `12-point-plan-feuille`, `12-c1-comparaison-jeu-D`, `12-c4-fichier-refuse`, `12-ancre-points-plan`, et `maquette-Carte`, `maquette-Exports` pour le côte à côte. `innerWidth` 412 et `scrollWidth` 412 sur 4 vues ; `#points-plan` : page défilée de 512 px, carte à 16 px du haut. Contraste minimal 9,61:1 (`#3F3F3A` sur `#F4F4F1`), aucun texte sous 4,5:1 |
| C9 types, build, tests | ✅ | Compteur `tsc -p tsconfig.app.json` : **1910 avant, 1910 après**, 0 erreur dans `src/modules/releve-terrain/` ; `npm run build` complet OK ; `npx vitest run src/modules/releve-terrain` : **18 fichiers, 179 tests verts** (146 de CC-03, dont son `it.fails` admis, + 33 nouveaux) |
| C10 commits | ✅ | `a5036b0` : seulement mes fichiers (voir ci-dessous), poussé sur `origin/releve-cc-06` ; ce rapport commité seul ensuite |

## Fichiers créés (`frontend/src/modules/releve-terrain/`)
- `ecrans/carte/` : `Carte.tsx` (écran 11), `VueCarte.tsx` (SVG, gestes), `ChoixIntervalle.tsx`, `useCourbes.ts` (préférence `cles.vue_intervalle`, courbes mémorisées), `modele.ts` (courbes, comparaison, zones, vue, libellés), `__tests__/modele.test.ts`
- `ecrans/resultats/` : `Resultats.tsx` (écran 12), `ComparaisonPlan.tsx` (`#points-plan`), `Exporter.tsx`, `ReglagesSeuils.tsx`
- `exports/` : `csv.ts`, `pdf.ts`, `sauvegarde.tsx` (`exporterSauvegarde`, `ouvrirSauvegarde`, dialogue Remplacer / Garder les deux), `pointsPlan.ts`, `fichiers.ts`, `sansModule.ts`, `__tests__/` (`csv`, `pdf`, `pointsPlan`, `sauvegarde`)
- **Modifiés (autorisés)** : `ecrans/registre-resultats.ts` (deux routes, `ouvrirSauvegarde`, `exporterSauvegarde`), `frontend/vite.releve.config.ts` (`resolve.alias` des modules optionnels de jsPDF)
- **Hors liste, nouveau fichier** : `frontend/scripts/releve-banc-cc06.cjs` (scénario de banc, convention du contrat CC-03 « un scénario par session »)

## Besoins sur les fichiers partagés (non touchés)
Aucun indispensable. À noter pour CC-07 :
1. Le build ne vide pas `dist` : des fichiers d'anciennes versions s'y accumulent (sans effet sur `precache.json`, qui ne liste que le build courant).
2. Le code d'entrée de `/releve/` passe de 122,8 à environ 126 ko gzip : `registre-resultats.ts` importe statiquement `exports/sauvegarde.tsx` pour que le sélecteur de fichier s'ouvre dans le toucher même (Safari refuse un `click()` après un chargement de code).

## Écarts au prompt
1. Numéro des stations : la route `/r/:releve/saisir/:station` reçoit **l'id** de la station (le prompt CC-05 parle de « station id »), pas « S05 ».
2. Rang d'une borne éphémère sur la carte : « D » suivi de « r1 » en petit ; le nom de l'endroit s'affiche au toucher, avec « rang 1 » sous la carte.
3. Rang d'une station dans le CSV : vide (H18 ne dit rien) ; la station « reportée » se lit dans État.
4. Mise en page : courbes et zones grises seulement à partir de 6 points (H16), intervalle par défaut 1 m quand le téléphone n'a pas de préférence ; PDF : intervalle 1 m quand le téléphone est réglé sur « Sans ».
5. Zones grises calculées sur le cadre des **bornes** plus 20 m (ce qui permet le cache « tant que les bornes ne changent pas ») ; une station très éloignée (E4) reste hors zone grisée.
6. Réimportation sans conflit de nom : ids du fichier gardés, sauf si ce relevé vit déjà dans un autre chantier (copie, pour ne jamais le déplacer en silence). Fichier d'une version plus récente : message propre de `depot` (« ... plus récente ... ») ; tout autre refus : « Ce fichier n'est pas une sauvegarde de relevé. »
7. Bornes de saisie choisies faute de règle : seuils > 0 et ≤ 1 000, orange < rouge ; indice éphémère > 0 et ≤ 10 ; déclinaison de −45° à 45° ; coordonnées du plan ±100 000 m, altitude de −1 000 à 10 000 m ; fichier de points ≤ 1 Mo.
8. Port du serveur de dev : 3003 (prompt) au lieu de 3013 (contrat CC-03).
9. Skill `react-testing` non chargé : conventions Vitest déjà en place (setup du dépôt, `fake-indexeddb`). `impeccable` chargé (polish borné, voir itération 6).

## Surprises
- Les jeux F et G portent le même nom de relevé : le banc a montré le dialogue de conflit dès la deuxième importation, preuve utile du comportement H20.
- Mesure de la carte « 100 stations » : le jeu cyclique de CC-03 ne donne que 8 positions distinctes ; le banc fabrique 100 stations distinctes sur un terrain lisse, visées exactes depuis A, B, C (calage sauté).
- Le contrôle de contraste du banc lit `color` et non `fill` pour le texte SVG : les étiquettes de la carte sont noires ou brunes sur blanc (lisibles), mais leur ratio n'est pas mesuré exactement par l'outil.

## Recommandations pour RELEVE-CC-07
1. Fusionner `releve-cc-06` : seul `registre-resultats.ts` touche le registre ; aucun conflit attendu avec CC-04 et CC-05 (dossiers séparés). L'écran 6 peut lier `/r/:releve/resultats#points-plan` tel quel ; le lien `?zones=ephemere` de l'écran 10 est servi.
2. Vider `dist` avant le build de recette (ou ajouter un nettoyage de `dist/assets/releve` dans `vite.releve.config.ts`) pour que les contrôles de fichiers ne voient que la version courante.
3. Rejouer `scripts/releve-banc-cc06.cjs` après la fusion : il couvre l'import par le menu du chantier, la carte, les exports et les réglages sur le build de production (47 s).
4. Contrôle en production à ajouter : `/releve/precache.json` liste `jspdf.es.min-*.js` et `pdf-*.js` ; partager un PDF depuis un vrai téléphone Android (feuille de partage) en mode avion.
