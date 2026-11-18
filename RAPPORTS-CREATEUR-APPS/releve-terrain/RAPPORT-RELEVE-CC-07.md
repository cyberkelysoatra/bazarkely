# RAPPORT RELEVE-CC-07 : assemblage, recette des jeux A à G dans les vrais écrans, mise en ligne

- **Référence :** RELEVE-CC-07 (phase 2e, assemblage et recette)
- **Début / fin :** 18/11/2026 vers 20:05 → 21:20 ; durée active ≈ 1 h 03 ; attente séparée ≈ 12 min (construction Cloudflare 21:04 → 21:16, retrait des worktrees en arrière-plan pendant ce temps). Aucune attente des rapports de la vague 2 : les trois étaient présents à l'ouverture.
- **Contexte atteint :** environ 60 %
- **Commits sur `cloudflare-migration` (poussés) :**
  - `db36311`, `2bf489e`, `e8d7842` : fusions `--no-ff` de `releve-cc-04`, `releve-cc-05`, `releve-cc-06` (`[CF-Pages-Skip]`)
  - `ca1d3dd` feat v3.154.0 (assemblage, correctifs, banc, documents, fiche de Joël, captures) : **déployé**
  - le présent rapport, commité seul ensuite (`[CF-Pages-Skip]`)
- **Production :** `https://1sakely.org/releve/` sert la **3.154.0** (`precache.json` version 3.154.0, entrée `releve-BhvhbvY7.js`, identique au build local).

## Notes de fusion
- Aucun conflit : chaque session avait son fichier de registre (`registre-bornes.ts`, `registre-stations.ts`, `registre-resultats.ts`) et ses dossiers.
- `package-lock.json` inchangé par les trois branches : pas de `npm ci`.
- Après fusion, avant tout changement : types **1910** (identique à la base), **0** erreur dans le module ; `npx vitest run src/modules/releve-terrain` : **23 fichiers, 206 tests verts**.
- Serveur de dev : un `vite` de ce dépôt tournait déjà sur le port 3000 (et un second sur 3005) avant la session ; réutilisé tel quel (rechargement à chaud), laissé en marche.
- Rapports de CC-01 et CC-02, encore hors de git, ajoutés au commit du chantier ; ceux de CC-03 (déjà dans git), CC-04, CC-05, CC-06 (arrivés par les fusions) y sont.

### « Besoins sur les fichiers partagés » des trois rapports
| Besoin | Décision |
|---|---|
| CC-04 n°1 : `LectureCote.distance` et `pente` à `null` pendant la saisie | **Appliqué** : type `number \| null`, conversion forcée retirée de `CarteCote`, filtre par garde de type dans `EcranCalage` et `releveCalcule` (seules les lectures complètes comptent). Exports et sauvegarde ne lisent pas les lectures : sans effet sur eux |
| CC-04 n°2 : prop `sautees` de `Etapes` | Non appliqué : les écrans 6 et 7 montrent déjà la carte « Étape 2 sautée » ; changement d'aspect à faire valider (phase 3) |
| CC-04 n°3 : variante `compacte` de `ChampNombre` | Non appliqué : la mise en page X, Y puis altitude tient à 412 px |
| CC-04 n°4 et CC-05 : `setup.ts` simule Dexie, `react-router-dom`, `randomUUID` | Documenté ici (aucun code) : tout test d'écran du module fait `vi.unmock('dexie')` et `vi.unmock('react-router-dom')` (voir `bornes/__tests__/environnement.ts`) |
| CC-05 n°1 : props `droite` et `pied` de `CadreReleve`, retrait du double `saisir/Cadre.tsx` | Non appliqué : refonte de trois écrans juste avant mise en ligne, sans gain pour l'utilisateur ; recommandé pour CC-08 |
| CC-05 n°2 : libellé vide coupé « Toucher po... » dans un champ en demi-largeur | **Appliqué** : prop `vide` de `ChampNombre` (défaut « Toucher pour saisir »), « Saisir » sur les 8 champs en demi-largeur (écrans 6, 7, 8) |
| CC-05 n°3 : couleur du résultat retenu | Non appliqué (la carte colore d'après le calcul complet, la station gardée entre bien dans les courbes) ; à décider en phase 3 |
| CC-05 n°4 : bouton « danger » de la confirmation de remplacement | Non appliqué (acceptable, action irréversible au sens du PRD) |
| CC-06 : `dist` jamais vidé | Contourné : `dist/assets/releve` et `dist/releve` vidés avant chaque build de recette |
| CC-03 recommandation 2 : limite d'erreur autour des écrans | **Appliquée** : `composants/LimiteErreur.tsx` (« Un problème est survenu », « Recharger », « Mes terrains »), remise à zéro à chaque nouvelle adresse, 3 tests |

## Itérations et erreurs notables
1. Partie 1 du banc, premier essai : la mention « cap non contrôlé » était cherchée sur la ligne du cap ; elle s'affiche dans l'alerte de la carte Contrôle (texte exact du PRD). Lecture du banc corrigée, pas le code.
2. Mode avion : avec un profil Chrome dans le dossier temporaire de la session (chemin très long), le service hors ligne ne finissait jamais de garder ses fichiers (30 s puis 120 s). Diagnostic sur un profil neuf au chemin court : tout gardé en quelques secondes. Profil du banc placé dans `%TEMP%\rp-cc07-...` : vert. Piège du banc seulement.
3. Premier passage complet : deux lignes A3 rouges (altitude du plan de C 22,33 lue à +0,052) alors qu'elles étaient vertes à l'essai précédent. Cause : le banc rechargeait la page juste après avoir saisi l'altitude, avant la fin de l'écriture. Le banc attend désormais que la valeur soit dans la base ; jeu A3 rejoué 3 fois : 13/13. Sur le téléphone, on passe d'un écran à l'autre sans recharger : pas de risque équivalent.
4. Revue de sécurité : la fusion de l'en-tête d'une sauvegarde importée acceptait une clé `__proto__` (le prototype de l'objet fusionné était remplacé ; pas de pollution globale). Corrigé (clés `__proto__`, `constructor`, `prototype` ignorées) avec 2 tests ; parties 1, 3, 5 du banc rejouées sur le build final : vertes.
5. Lancement du banc : deux fois sur une douzaine, `TimeoutError` dès le démarrage ; relancé tel quel, vert. Non reproduit en diagnostic (voir Surprises).
6. Commit : le premier `git commit` a échoué (message passé par PowerShell), seules les fusions `[CF-Pages-Skip]` sont parties au premier `push` (aucun déploiement) ; commit refait par fichier de message.

## Critères d'acceptation

| Critère | État | Preuve |
|---|---|---|
| C1 fusion, worktrees, branches, rapports | ✅ | 3 fusions sans conflit ; serveurs de dev 3001, 3002, 3003 des worktrees arrêtés ; `git status --porcelain` vide dans les trois, `git worktree remove --force` : `git worktree list` n'en montre plus aucun ; branches `releve-cc-04`, `-05`, `-06` gardées ; rapports CC-01 à CC-06 dans git |
| C2 recette 3.1 dans les vrais écrans | ✅ | build de production, `vite preview` port 4107, 412 x 869, facteur 3,5 ; rien d'injecté : domaine « Recette A à G », chantier « Premier chantier », 5 relevés, bornes, lectures, visées et points du plan **tapés au pavé** (touches du clavier, Entrée = OK). Second passage complet : **163 valeurs sur 163** (détail plus bas), 35 captures, CSV et PDF dans `captures-cc-07\` |
| C3 mode avion et réouverture | ✅ | profil persistant (`BANC_PROFIL`), visite en ligne, `setOffline(true)` (`navigator.onLine` faux), puis domaine « Domaine avion », chantier, relevé « Hors réseau », bornes vérifiées, S01 à S03 du jeu B et une station incomplète, tout hors réseau ; navigateur fermé, relancé avec le même profil, `setOffline(true)` avant `goto` : domaine et chantier là, S01 à S03 identiques au chiffre près, VERT ; pastille « 1 station incomplète » (D22). **8/8** |
| C4 H08 sous 1 s | ✅ | toucher « Calculer la station » → résultat affiché, sur les 12 stations du relevé « Stations B F G » saisies dans le flux réel (pas de rechargement) : **médiane 13,5 ms, pire 31,6 ms** (premier passage : 20,5 et 27,7 ms) |
| C5 revue de sécurité | ✅ | section suivante, tous les points ✅ (un correctif fait, point 4 des itérations) |
| C6 tests, types, build | ✅ | `npx vitest run src/modules/releve-terrain` : **25 fichiers, 211 tests verts** (206 après fusion + 3 limite d'erreur + 2 fusion d'en-tête), dont le seul `it.fails` admis de CC-02 ; compteur `tsc -p tsconfig.app.json` : **1910 avant, 1910 après**, **0** erreur dans `src/modules/releve-terrain/` ; `npm run build` OK |
| C7 production | ✅ | section « Production » |
| C8 fiche de Joël | ✅ | `RECETTE-JOEL-PHASE-2.md` (aucun tiret long ou demi-long, aucun point médian : contrôle par script, 0 occurrence) |
| C9 rapport | ✅ | ce fichier |

## Durées mesurées (3.1 étape 7)
- Ouverture de l'application à la première saisie : accueil prêt (« + Nouveau domaine foncier ») **403 ms** à la première visite ; ouverture d'un relevé jusqu'au premier champ « Distance vers A » de l'écran 8 (téléphone déjà garni) : **médiane 869 ms, pire 934 ms** sur 5 (rechargement complet de la page à chaque fois).
- Une station, du premier chiffre au résultat : **médiane 778 ms, pire 966 ms** (frappe automatique des 6 valeurs, 5 ms par touche ; sur le terrain, c'est le temps de lecture de l'appareil qui compte, l'indicateur du PRD est « moins de 2 minutes »).
- H08 (toucher « Calculer » → résultat) : voir C4.

## Table des numéros de station (« nom dans le PRD », « numéro à l'écran »)

| Relevé | PRD | Écran |
|---|---|---|
| Courbes D | S01 à S08 (jeu B) | S01 à S08 |
| Défauts C | E1 | S01 |
| Défauts C | E2 | S02 |
| Défauts C | E4 | S03 |
| Défauts C | E5 | S04 |
| Stations B F G | S01 à S08 | S01 à S08 |
| Stations B F G | E4 (jeu F, mesurée par l'écran 10) | S09 |
| Stations B F G | S10 à S13 | S10 à S13 |
| Stations B F G | S14 (station visant E de rang 2) | S14 |
| Hors réseau (mode avion) | S01 à S03 (jeu B), puis E5 | S01 à S03, S04 |

Ordre de 3.1 suivi ; deux précisions : pour A3, l'altitude du plan de C repassée à 21,33 et le cap remis avant le cas « sans cap » (sinon le calage resterait rouge par C, alors que le PRD attend orange) ; pour S14, en plus de « E depuis S10, rang 2 » puis le retrait de E, une station visant E, B et C depuis (60 ; 5) est mesurée par l'écran 10 : refus « trop de reports, précision insuffisante », sans bouton Continuer (vérifié jusqu'ici seulement en test unitaire).

## Valeurs de la recette, jeu par jeu (second passage complet, 3.154.0)
Les points du plan des jeux D et D2 sont saisis au pavé dans la carte « Points du plan » : P1 (30 ; 0), P2 (40 ; 5), P3 (20 ; −5), P4 (25 ; 0) ; leurs altitudes de plan (30 ; 28 ; 33,9 ; 32) ne servent qu'à la colonne écart. Pour les lignes « contient », la colonne « Lu » donne le texte entier de la carte lue.

**A** (28/28)

| Valeur | Attendu | Lu à l’écran | |
|---|---|---|---|
| A vers B distance retenue | Distance retenue52,468 m | Distance retenue 52,468 m Dénivelé −11,245 m Écart décamètre et appareil +0,016 m Biais de l'appareil −0,017 m | ✅ |
| A vers B écart décamètre et appareil | Écart décamètre et appareil+0,016 m | Distance retenue 52,468 m Dénivelé −11,245 m Écart décamètre et appareil +0,016 m Biais de l'appareil −0,017 m | ✅ |
| A vers B biais | Biais de l'appareil−0,017 m | Distance retenue 52,468 m Dénivelé −11,245 m Écart décamètre et appareil +0,016 m Biais de l'appareil −0,017 m | ✅ |
| A vers B dénivelé | Dénivelé−11,245 m | Distance retenue 52,468 m Dénivelé −11,245 m Écart décamètre et appareil +0,016 m Biais de l'appareil −0,017 m | ✅ |
| A vers B couleur | A vers BVERT | A vers B VERT 52,468 +0,016 −11,245 | ✅ |
| B vers C distance retenue | Distance retenue45,457 m | Distance retenue 45,457 m Dénivelé −5,489 m Écart décamètre et appareil −0,124 m Biais de l'appareil +0,125 m | ✅ |
| B vers C écart décamètre et appareil | Écart décamètre et appareil−0,124 m | Distance retenue 45,457 m Dénivelé −5,489 m Écart décamètre et appareil −0,124 m Biais de l'appareil +0,125 m | ✅ |
| B vers C biais | Biais de l'appareil+0,125 m | Distance retenue 45,457 m Dénivelé −5,489 m Écart décamètre et appareil −0,124 m Biais de l'appareil +0,125 m | ✅ |
| B vers C dénivelé | Dénivelé−5,489 m | Distance retenue 45,457 m Dénivelé −5,489 m Écart décamètre et appareil −0,124 m Biais de l'appareil +0,125 m | ✅ |
| B vers C couleur | B vers CORANGE | B vers C ORANGE 45,457 −0,124 −5,489 | ✅ |
| A vers C distance retenue | Distance retenue71,310 m | Distance retenue 71,310 m Dénivelé −16,723 m Écart décamètre et appareil +0,011 m Biais de l'appareil −0,012 m | ✅ |
| A vers C écart décamètre et appareil | Écart décamètre et appareil+0,011 m | Distance retenue 71,310 m Dénivelé −16,723 m Écart décamètre et appareil +0,011 m Biais de l'appareil −0,012 m | ✅ |
| A vers C biais | Biais de l'appareil−0,012 m | Distance retenue 71,310 m Dénivelé −16,723 m Écart décamètre et appareil +0,011 m Biais de l'appareil −0,012 m | ✅ |
| A vers C dénivelé | Dénivelé−16,723 m | Distance retenue 71,310 m Dénivelé −16,723 m Écart décamètre et appareil +0,011 m Biais de l'appareil −0,012 m | ✅ |
| A vers C couleur | A vers CVERT | A vers C VERT 71,310 +0,011 −16,723 | ✅ |
| fermeture de la boucle | Boucle des dénivelés : −0,011 m VERT | Boucle des dénivelés : −0,011 m VERT | ✅ |
| borne A | A 0,000 0,000 38,110 | A 0,000 0,000 38,110 | ✅ |
| borne B | B 47,312 22,681 26,865 | B 47,312 22,681 26,865 | ✅ |
| borne C | C 69,217 −17,150 21,382 | C 69,217 −17,150 21,382 | ✅ |
| écart au plan B | Position de B 0,025 m VERT | Position de B 0,025 m VERT | ✅ |
| écart au plan C | Position de C 0,182 m ORANGE | Position de C 0,182 m ORANGE | ✅ |
| écart d'altitude B | Altitude de B +0,035 m VERT | Altitude de B +0,035 m VERT | ✅ |
| écart d'altitude C | Altitude de C +0,052 m VERT | Altitude de C +0,052 m VERT | ✅ |
| cap corrigé | Cap lu 74,4° ; déclinaison 10° ; cap corrigé 64,4° | Cap lu 74,4° ; déclinaison 10° ; cap corrigé 64,4° saisi à la main | ✅ |
| écart de cap | Cap A vers B (plan 64,4°) écart 0,0° VERT | Cap A vers B (plan 64,4°) écart 0,0° VERT | ✅ |
| couleur du calage | Résultat du calage ORANGE | Résultat du calage ORANGE | ✅ |
| pas de message sur le mode d’affichage | absent | absent | ✅ |
| calage orange validé, Saisir ouvert | /saisir | /saisir | ✅ |

**A3** (13/13)

| Valeur | Attendu | Lu à l’écran | |
|---|---|---|---|
| cap 254,4 corrigé | Cap lu 254,4° ; déclinaison 10° ; cap corrigé 244,4° | Cap lu 254,4° ; déclinaison 10° ; cap corrigé 244,4° saisi à la main | ✅ |
| cap 254,4 : écart de cap | écart 180,0° ROUGE | Cap A vers B (plan 64,4°) écart 180,0° ROUGE | ✅ |
| cap 254,4 : message | Le plan et le terrain ne concordent pas | Contrôle du plan de masse Position de B 0,025 m VERT Position de C 0,182 m ORANGE Altitude de B +0,035 m VERT Altitude de C +0,052 m VERT Cap A vers B (plan 64,4°) écart 180,0° ROUGE Le plan et le terrain ne concordent pas Le terrain fait foi pour les distances et les altitudes ; le plan donne l'origine et l'orientation. | ✅ |
| cap 254,4 : positions identiques (B) | B 47,312 22,681 26,865 | B 47,312 22,681 26,865 | ✅ |
| cap 254,4 : positions identiques (C) | C 69,217 −17,150 21,382 | C 69,217 −17,150 21,382 | ✅ |
| cap 254,4 : calage rouge | Résultat du calage ROUGE | Résultat du calage ROUGE | ✅ |
| cap 254,4 : dialogue avant validation | Le plan et le terrain ne concordent pas : vérifier la borne A ou B ou le plan | Calage rouge Le plan et le terrain ne concordent pas : vérifier la borne A ou B ou le plan Refaire Continuer quand même | ✅ |
| altitude du plan de C 22,33 : écart | Altitude de C −0,948 m ROUGE | Altitude de C −0,948 m ROUGE | ✅ |
| altitude du plan de C 22,33 : calage rouge | Résultat du calage ROUGE | Résultat du calage ROUGE | ✅ |
| altitude du plan de C 22,33 : altitude calculée de C inchangée | C 69,217 −17,150 21,382 | C 69,217 −17,150 21,382 | ✅ |
| altitude du plan de C 22,33 : altitude calculée de B inchangée | B 47,312 22,681 26,865 | B 47,312 22,681 26,865 | ✅ |
| sans cap : mention « cap non contrôlé » (alerte de la carte Contrôle) | cap non contrôlé | cap non contrôlé / Le terrain fait foi pour les distances et les altitudes ; le plan donne l'origine et l'orientation. | ✅ |
| sans cap : calage orange (inchangé) | Résultat du calage ORANGE | Résultat du calage ORANGE | ✅ |

**A2** (17/17)

| Valeur | Attendu | Lu à l’écran | |
|---|---|---|---|
| question du côté de C posée (jamais de côté par défaut) | posée | posée | ✅ |
| avec cap : B | {x:47.317,y:22.671} | {x:47.317,y:22.671} | ✅ |
| avec cap : C | {x:69.213,y:-17.165} | {x:69.213,y:-17.165} | ✅ |
| avec cap : C au sud de la droite A vers B | sud | sud | ✅ |
| A vers B : couleur et distance identiques au jeu A | A vers BVERT 52,468 | A vers B VERT 52,468 +0,016 −11,245 | ✅ |
| A vers B : dénivelé identique au jeu A | −11,245 | A vers B VERT 52,468 +0,016 −11,245 | ✅ |
| B vers C : couleur et distance identiques au jeu A | B vers CORANGE 45,457 | B vers C ORANGE 45,457 −0,124 −5,489 | ✅ |
| B vers C : dénivelé identique au jeu A | −5,489 | B vers C ORANGE 45,457 −0,124 −5,489 | ✅ |
| A vers C : couleur et distance identiques au jeu A | A vers CVERT 71,310 | A vers C VERT 71,310 +0,011 −16,723 | ✅ |
| A vers C : dénivelé identique au jeu A | −16,723 | A vers C VERT 71,310 +0,011 −16,723 | ✅ |
| fermeture identique | −0,011 m VERT | Boucle des dénivelés : −0,011 m VERT | ✅ |
| avec cap : mention | Nord approximatif | Résultat du calage ORANGE Côté Distance Écart déca Dénivelé A vers B VERT 52,468 +0,016 −11,245 B vers C ORANGE 45,457 −0,124 −5,489 A vers C VERT 71,310 +0,011 −16,723 Boucle des dénivelés : −0,011 m VERT Borne X Y Altitude A 0,000 0,000 38,110 B 47,317 22,671 26,865 C 69,213 −17,165 21,382 Nord approximatif | ✅ |
| avec cap : mention sur la carte | Nord approximatif | Nord approximatif | ✅ |
| sans cap : B | {x:52.468,y:0} | {x:52.468,y:0} | ✅ |
| sans cap : mention | Orientation libre (axe A vers B) | Résultat du calage ORANGE Côté Distance Écart déca Dénivelé A vers B VERT 52,468 +0,016 −11,245 B vers C ORANGE 45,457 −0,124 −5,489 A vers C VERT 71,310 +0,011 −16,723 Boucle des dénivelés : −0,011 m VERT Borne X Y Altitude A 0,000 0,000 38,110 B 52,468 0,000 26,865 C 55,002 −45,386 21,382 Orientation libre (axe A vers B) | ✅ |
| sans cap : mention sur la carte | orientation libre (axe A vers B) | présente | ✅ |
| sans cap : pas de flèche du nord | 0 | 0 | ✅ |

**D (stations B)** (8/8)

| Valeur | Attendu | Lu à l’écran | |
|---|---|---|---|
| S01 | {x:19.993,y:0.006,altitude:33.274,ecartAltitude:0.01,indice:1.55,couleur:vert} | {x:19.993,y:0.006,altitude:33.274,ecartAltitude:0.01,indice:1.55,couleur:vert,numero:S01} | ✅ |
| S02 | {x:30.006,y:5.006,altitude:30.918,ecartAltitude:0.013,indice:1.34,couleur:vert} | {x:30.006,y:5.006,altitude:30.918,ecartAltitude:0.013,indice:1.34,couleur:vert,numero:S02} | ✅ |
| S03 | {x:39.998,y:-0.002,altitude:28.455,ecartAltitude:0.041,indice:1.19,couleur:vert} | {x:39.998,y:-0.002,altitude:28.455,ecartAltitude:0.041,indice:1.19,couleur:vert,numero:S03} | ✅ |
| S04 | {x:45,y:-8.001,altitude:27.211,ecartAltitude:0.014,indice:1.24,couleur:vert} | {x:45,y:-8.001,altitude:27.211,ecartAltitude:0.014,indice:1.24,couleur:vert,numero:S04} | ✅ |
| S05 | {x:54.993,y:-0.005,altitude:24.843,ecartAltitude:0.055,indice:1.36,couleur:vert} | {x:54.993,y:-0.005,altitude:24.843,ecartAltitude:0.055,indice:1.36,couleur:vert,numero:S05} | ✅ |
| S06 | {x:35,y:11.999,altitude:29.728,ecartAltitude:0.049,indice:1.27,couleur:vert} | {x:35,y:11.999,altitude:29.728,ecartAltitude:0.049,indice:1.27,couleur:vert,numero:S06} | ✅ |
| S07 | {x:24.998,y:-3.007,altitude:32.052,ecartAltitude:0.03,indice:1.38,couleur:vert} | {x:24.998,y:-3.007,altitude:32.052,ecartAltitude:0.03,indice:1.38,couleur:vert,numero:S07} | ✅ |
| S08 | {x:49.988,y:7.993,altitude:26.093,ecartAltitude:0.05,indice:1.23,couleur:vert} | {x:49.988,y:7.993,altitude:26.093,ecartAltitude:0.05,indice:1.23,couleur:vert,numero:S08} | ✅ |

**D** (8/8)

| Valeur | Attendu | Lu à l’écran | |
|---|---|---|---|
| confirmation avant recalcul | Tous les résultats seront recalculés. Continuer ? | Modifier les seuils Tous les résultats seront recalculés. Continuer ? Annuler Continuer | ✅ |
| 11 points, 17 triangles gardés sur 17 | 11 points, 17 triangles gardés sur 17 (coupure 100 m) | 11 points, 17 triangles gardés sur 17 (coupure 100 m). | ✅ |
| altitude en P1 (30 ; 0) | 30.872 | 30,872 | ✅ |
| altitude en P2 (40 ; 5) | 28.483 | 28,483 | ✅ |
| altitude en P3 (20 ; -5) | 33.257 | 33,257 | ✅ |
| courbe 35 sur Y = 0 | 12.86 | [12.856] | ✅ |
| courbe 30 sur Y = 0 | 33.61 | [33.608] | ✅ |
| courbe 25 sur Y = 0 | 54.34 | [54.34] | ✅ |

**D2** (7/7)

| Valeur | Attendu | Lu à l’écran | |
|---|---|---|---|
| 8 triangles gardés sur 17 | 8 triangles gardés sur 17 (coupure 20 m) | 11 points, 8 triangles gardés sur 17 (coupure 20 m). | ✅ |
| altitude en P1 (30 ; 0) | 30.872 | 30,872 | ✅ |
| altitude en P2 (40 ; 5) | 28.483 | 28,483 | ✅ |
| P3 (20 ; −5) | non couvert | non couvert | ✅ |
| pas de courbe 35 sur Y = 0 | [] | [] | ✅ |
| courbe 30 sur Y = 0 | 33.61 | [33.608] | ✅ |
| courbe 25 sur Y = 0 | 54.34 | [54.34] | ✅ |

**D2 (15 m)** (4/4)

| Valeur | Attendu | Lu à l’écran | |
|---|---|---|---|
| altitude en P4 (25 ; 0) | 32.076 | 32,076 | ✅ |
| P1 non couvert | non couvert | non couvert | ✅ |
| P2 non couvert | non couvert | non couvert | ✅ |
| P3 non couvert | non couvert | non couvert | ✅ |

**C** (22/22)

| Valeur | Attendu | Lu à l’écran | |
|---|---|---|---|
| E1 couleur | rouge | rouge | ✅ |
| E1 X ; Y ; altitude | [29.569,3.238,31.072] | [29,569m,3,238m,31,072m] | ✅ |
| E1 altitudes par borne | 30,919 | 30,919 (A), 31,248 (B), 30,908 (C) | ✅ |
| E1 altitudes par borne (B) | 31,248 | 30,919 (A), 31,248 (B), 30,908 (C) | ✅ |
| E1 altitudes par borne (C) | 30,908 | 30,919 (A), 31,248 (B), 30,908 (C) | ✅ |
| E1 écart altitude | 0.339 | 0,339 m | ✅ |
| E1 écart position | 0.676 | 0,676 m | ✅ |
| E1 visée suspecte B | Refaire la visée vers B, Borne nord | Refaire la visée vers B, Borne nord | ✅ |
| E2 couleur | rouge | rouge | ✅ |
| E2 X ; Y ; altitude | [29.797,5.352,30.561] | [29,797m,5,352m,30,561m] | ✅ |
| E2 altitudes par borne (C) | 28,537 | 30,919 (A), 30,921 (B), 28,537 (C) | ✅ |
| E2 écart altitude | 2.384 | 2,384 m | ✅ |
| E2 écart position | 0.147 | 0,147 m | ✅ |
| E2 visée suspecte C | Refaire la visée vers C, Borne sud-est | Refaire la visée vers C, Borne sud-est | ✅ |
| E4 couleur | orange | orange | ✅ |
| E4 X ; Y ; altitude | [149.994,-0.017,1.928] | [149,994m,−0,017m,1,928m] | ✅ |
| E4 indice | 3.38 | 3,38 | ✅ |
| E4 visées de plus de 60 m (orange) | 3 | 3 | ✅ |
| E5 pas de calcul, station en attente | incomplete | incomplete | ✅ |
| E5 message | Station incomplète : il manque la borne C. | Station incomplète : il manque la borne C. | ✅ |
| E5 proposition (H11) | Ajouter une borne éphémère | Ajouter une borne éphémère | ✅ |
| E5 pastille D22 | 1 station incomplète | 1 station incomplète | ✅ |

**B** (8/8)

| Valeur | Attendu | Lu à l’écran | |
|---|---|---|---|
| S01 | {x:19.993,y:0.006,altitude:33.274,ecartAltitude:0.01,indice:1.55,couleur:vert} | {x:19.993,y:0.006,altitude:33.274,ecartAltitude:0.01,indice:1.55,couleur:vert,numero:S01} | ✅ |
| S02 | {x:30.006,y:5.006,altitude:30.918,ecartAltitude:0.013,indice:1.34,couleur:vert} | {x:30.006,y:5.006,altitude:30.918,ecartAltitude:0.013,indice:1.34,couleur:vert,numero:S02} | ✅ |
| S03 | {x:39.998,y:-0.002,altitude:28.455,ecartAltitude:0.041,indice:1.19,couleur:vert} | {x:39.998,y:-0.002,altitude:28.455,ecartAltitude:0.041,indice:1.19,couleur:vert,numero:S03} | ✅ |
| S04 | {x:45,y:-8.001,altitude:27.211,ecartAltitude:0.014,indice:1.24,couleur:vert} | {x:45,y:-8.001,altitude:27.211,ecartAltitude:0.014,indice:1.24,couleur:vert,numero:S04} | ✅ |
| S05 | {x:54.993,y:-0.005,altitude:24.843,ecartAltitude:0.055,indice:1.36,couleur:vert} | {x:54.993,y:-0.005,altitude:24.843,ecartAltitude:0.055,indice:1.36,couleur:vert,numero:S05} | ✅ |
| S06 | {x:35,y:11.999,altitude:29.728,ecartAltitude:0.049,indice:1.27,couleur:vert} | {x:35,y:11.999,altitude:29.728,ecartAltitude:0.049,indice:1.27,couleur:vert,numero:S06} | ✅ |
| S07 | {x:24.998,y:-3.007,altitude:32.052,ecartAltitude:0.03,indice:1.38,couleur:vert} | {x:24.998,y:-3.007,altitude:32.052,ecartAltitude:0.03,indice:1.38,couleur:vert,numero:S07} | ✅ |
| S08 | {x:49.988,y:7.993,altitude:26.093,ecartAltitude:0.05,indice:1.23,couleur:vert} | {x:49.988,y:7.993,altitude:26.093,ecartAltitude:0.05,indice:1.23,couleur:vert,numero:S08} | ✅ |

**F** (18/18)

| Valeur | Attendu | Lu à l’écran | |
|---|---|---|---|
| E4 refusée comme borne éphémère | refuse | refuse | ✅ |
| E4 message (H13 étape 3) | Position trop fragile : choisissez un endroit plus au centre des bornes | Position trop fragile : choisissez un endroit plus au centre des bornes | ✅ |
| S06 acceptée, rang 1 | accepte 1 | accepte 1 | ✅ |
| D lettre proposée | D | D | ✅ |
| D en (35,000 ; 11,999 ; 29,728) | Depuis la station S06 : X 35,000 ; Y 11,999 ; altitude 29,728 | Depuis la station S06 : X 35,000 ; Y 11,999 ; altitude 29,728 | ✅ |
| S10 | {x:54.993,y:11.995,altitude:24.906,ecartAltitude:0.033,indice:1.41,couleur:vert} | {x:54.993,y:11.995,altitude:24.906,ecartAltitude:0.033,indice:1.41,couleur:vert,numero:S10} | ✅ |
| pas de proposition H15 après S10 | 0 | 0 | ✅ |
| S11 | {x:45.001,y:14.998,altitude:27.335,ecartAltitude:0.026,indice:1.16,couleur:vert} | {x:45.001,y:14.998,altitude:27.335,ecartAltitude:0.026,indice:1.16,couleur:vert,numero:S11} | ✅ |
| proposition H15 après S11 | Ajouter une borne éphémère pour cette zone ? | La borne A n'est pas visible sur deux stations de suite.Ajouter une borne éphémère pour cette zone ?OuiNon | ✅ |
| S12 | {x:54.996,y:11.998,altitude:24.906,ecartAltitude:0.033,indice:1.1,couleur:vert} | {x:54.996,y:11.998,altitude:24.906,ecartAltitude:0.033,indice:1.1,couleur:vert,numero:S12} | ✅ |
| S13 rouge | rouge | rouge | ✅ |
| S13 calcul à 4 | [54.964,13.194,24.926] | [54,964m,13,194m,24,926m] | ✅ |
| S13 visée suspecte C | Refaire la visée vers C, Borne sud-est | Refaire la visée vers C, Borne sud-est | ✅ |
| S13 retraits | sans C : 0,003 m / sans A : 0,953 m / sans B : 0,186 m / sans D : 0,966 m | sans C : 0,003 m / sans A : 0,953 m / sans B : 0,186 m / sans D : 0,966 m | ✅ |
| S13 résultat gardé sans C | [54.996,12.002,24.904] | {x:54,996m,y:12,002m,altitude:24,904m} | ✅ |
| S14 : borne E créée depuis S10, rang 2 | E 2 | E 2 | ✅ |
| S14 : borne depuis une station visant E (rang 3) refusée | trop de reports, précision insuffisante | Station S14 ROUGE trop de reports, précision insuffisante X 59,999m Y 5,000m Altitude du sol 25,505m Altitudes calculées, une par borne 25,499 (B), 25,497 (C), | ✅ |
| E retirée, D seule active | D | D | ✅ |

**G** (21/21)

| Valeur | Attendu | Lu à l’écran | |
|---|---|---|---|
| prochain panneau libre (A, B, C, D actives) | E | E | ✅ |
| doublon B refusé | La lettre B est déjà portée par Borne nord | La lettre B est déjà portée par Borne nord | ✅ |
| réemploi : lettre D, rang 1 | D 1 | D 1 | ✅ |
| réemploi : position | Depuis la station S01 : X 19,993 ; Y 0,006 ; altitude 33,274 | Depuis la station S01 : X 19,993 ; Y 0,006 ; altitude 33,274 | ✅ |
| écran Station : une seule ligne D, usage 2, « Angle sud du parking » | [{usage:2,nom:Angle sud du parking}] | [{usage:2,nom:Angle sud du parking}] | ✅ |
| S10 garde son résultat et renvoie à D (1) | {x:54.993,y:11.995,altitude:24.906,visee:Visée vers D (1), Piquet du manguier, retirée} | {x:54,993m,y:11,995m,altitude:24,906m,visees:[Visée vers D (1), Piquet du manguier, retirée,Visée vers D (2), Angle sud du parking]} | ✅ |
| S11 garde son résultat et renvoie à D (1) | {x:45.001,y:14.998,altitude:27.335,visee:Visée vers D (1), Piquet du manguier, retirée} | {x:45,001m,y:14,998m,altitude:27,335m,visees:[Visée vers D (1), Piquet du manguier, retirée,Visée vers D (2), Angle sud du parking]} | ✅ |
| S12 garde son résultat et renvoie à D (1) | {x:54.996,y:11.998,altitude:24.906,visee:Visée vers D (1), Piquet du manguier, retirée} | {x:54,996m,y:11,998m,altitude:24,906m,visees:[Visée vers D (1), Piquet du manguier, retirée,Visée vers D (2), Angle sud du parking]} | ✅ |
| S13 garde son résultat et renvoie à D (1) | {x:54.964,y:13.194,altitude:24.926,visee:Visée vers D (1), Piquet du manguier, retirée} | {x:54,964m,y:13,194m,altitude:24,926m,visees:[Visée vers D (1), Piquet du manguier, retirée,Visée vers D (2), Angle sud du parking]} | ✅ |
| CSV : D (1) | D (1);Piquet du manguier;borne éphémère;1;retirée | D (1);Piquet du manguier;borne éphémère;1;retirée | ✅ |
| CSV : D (2) | D (2);Angle sud du parking;borne éphémère;1;active | D (2);Angle sud du parking;borne éphémère;1;active | ✅ |
| CSV : S10 renvoie à D (1) | B, C, D (1) | B, C, D (1) | ✅ |
| CSV : BOM, virgule décimale, aucun tiret long ni point médian | true | true | ✅ |
| PDF du plan | %PDF-, Releve_Stations-B-F-G_<date>.pdf | Releve_Stations-B-F-G_2026-11-18.pdf (10347 octets) | ✅ |
| sauvegarde rouverte « Garder les deux » | Stations B F G (2) | Stations B F G (2) | ✅ |
| mêmes résultats après réimportation (CSV identique) | 22 lignes identiques | identique | ✅ |
| carte : bornes A, B, C dessinées | 3 | 3 | ✅ |
| carte : D (1) grise (retirée) | #8A8A82 | Borne D (1), Piquet du manguier, retirée #8A8A82 | ✅ |
| carte : D (2) active | #000000 | Borne D (2), Angle sud du parking #000000 | ✅ |
| carte : stations dessinées | ≥ 13 | 14 | ✅ |
| carte : courbes à 1 m | 1 m | 1 m ; 25 26 27 28 29 30 31 32 33 | ✅ |

**Mode avion** (8/8)

| Valeur | Attendu | Lu à l’écran | |
|---|---|---|---|
| S01 saisie hors réseau | {x:19.993,y:0.006,altitude:33.274,ecartAltitude:0.01,indice:1.55,couleur:vert} | {x:19.993,y:0.006,altitude:33.274,ecartAltitude:0.01,indice:1.55,couleur:vert,numero:S01} | ✅ |
| S02 saisie hors réseau | {x:30.006,y:5.006,altitude:30.918,ecartAltitude:0.013,indice:1.34,couleur:vert} | {x:30.006,y:5.006,altitude:30.918,ecartAltitude:0.013,indice:1.34,couleur:vert,numero:S02} | ✅ |
| S03 saisie hors réseau | {x:39.998,y:-0.002,altitude:28.455,ecartAltitude:0.041,indice:1.19,couleur:vert} | {x:39.998,y:-0.002,altitude:28.455,ecartAltitude:0.041,indice:1.19,couleur:vert,numero:S03} | ✅ |
| navigateur relancé hors réseau : domaine et chantier là | Domaine avion, Chantier avion | présents | ✅ |
| S01 retrouvée après relance (H02) | {x:19,993m,y:0,006m,altitude:33,274m,couleur:vert} | {x:19,993m,y:0,006m,altitude:33,274m,couleur:vert} | ✅ |
| S02 retrouvée après relance (H02) | {x:30,006m,y:5,006m,altitude:30,918m,couleur:vert} | {x:30,006m,y:5,006m,altitude:30,918m,couleur:vert} | ✅ |
| S03 retrouvée après relance (H02) | {x:39,998m,y:−0,002m,altitude:28,455m,couleur:vert} | {x:39,998m,y:−0,002m,altitude:28,455m,couleur:vert} | ✅ |
| station incomplète : pastille (D22) | 1 station incomplète | 1 station incomplète | ✅ |

## Revue de sécurité (écrite, sans commande)

| Point | État | Preuve |
|---|---|---|
| Aucun import de code de l'hôte | ✅ | imports hors du module (hors tests) : `react`, `react-dom`, `react-dom/client`, `react-router-dom`, `dexie`, `d3-delaunay`, `jspdf` ; aucun `@/`, aucun chemin relatif sortant du module (grep) |
| Aucun appel serveur, aucun Supabase | ✅ | 0 `supabase` dans le code (une seule mention, dans un commentaire de `main.tsx` qui dit qu'il n'y en a pas) et 0 dans `dist/assets/releve` et `dist/releve` ; pas de `XMLHttpRequest`, `WebSocket`, `sendBeacon` ; un seul `fetch`, `etat/pwa.ts`, vers `/releve/` même origine, pour détecter une nouvelle version (page statique, aucune donnée envoyée) |
| Ni `innerHTML` ni `eval` avec des données de l'utilisateur | ✅ | 0 `innerHTML`, `dangerouslySetInnerHTML`, `eval(`, `new Function`, `insertAdjacentHTML`, `document.write` dans le module ; tout texte passe par React |
| Import de sauvegarde validé, jamais exécuté | ✅ | `exports/sauvegarde.tsx` : taille > 5 Mo refusée avant lecture, `JSON.parse` (aucune exécution), puis `depot.verifierSauvegarde` : format `releve-terrain`, schéma 1, relevé avec nom et en-tête, chaque objet avec `id` texte, type parmi 5, `donnees` objet ; refus « Ce fichier n'est pas une sauvegarde de relevé. » (banc CC-06). **Correctif CC-07** : la fusion profonde de l'en-tête ignore `__proto__`, `constructor`, `prototype` (test `db/__tests__/fusion.test.ts`) |
| Garde contre l'injection CSV sur les cellules texte seulement | ✅ | `exports/csv.ts`, `texteCsv` : préfixe `'` si la cellule commence par `=`, `+`, `@`, tabulation, retour, ou `-` suivi d'une lettre ; `nombreCsv` jamais préfixé (test `csv.test.ts`) ; le CSV du jeu G du banc garde ses nombres en `35,000` |
| Page `/__essai` absente de `dist/` | ✅ | `grep -rl "__essai"` et `"Jeux du PRD"` dans `dist/assets/releve` et `dist/releve` (hors `.map`) : vide |
| Fichiers `public/releve` suivis | ✅ | `git ls-files -- frontend/public/releve` : `manifest.webmanifest`, `og-releve-v1.png`, `releve-icon-192.png`, `releve-icon-512.png`, `releve-icon-maskable-512.png`, `sw.js` |
| Caches de `/releve/` épargnés par le service hors ligne de l'hôte | ✅ | `src/sw-custom.ts` ligne 48 : `'releve-'` dans les préfixes épargnés à la purge ; ligne 591 : `/^\/releve(\/|$|\?)/` exclu de la navigation de l'hôte. Vu en production dans Chrome : caches `releve-precache-…` gardés à côté de ceux de l'hôte |

## Production (section 5)
- Cloudflare : `ca1d3dd` poussé à 21:04, 3.154.0 servie au plus tard à 21:16 (sondage du précache).
- `curl` : `/releve/` **200** `text/html` `no-cache` · `/releve/precache.json` version **3.154.0**, 31 fichiers, dont `jspdf.es.min-SVth3uLM.js`, `pdf-BOjsIun7.js` et les **7 polices** woff2 · `/releve/n-existe-pas.js` **404 `no-store`** · `/`, `/plan/`, `/validation/`, `/pudi/` **200**.
- Chrome, deux navigateurs connectés ; celui de la session (deviceId `909e8779-…`) confirmé « **CyberKELY SOATRA** » sur la page du compte Google (`cyberkelysoatra@gmail.com`), pas « ITAMPOLO NosyBe ». `https://1sakely.org/releve/` : l'ancienne 3.153.1 tenait la page, la bannière « Nouvelle version disponible » (légitime cette fois) touchée, worker 3.154.0 aux commandes, bannière disparue. Domaine « ESSAI CC-07 », chantier « Chantier essai », relevé « Releve essai » ; noms, X, Y, altitudes des 3 bornes tapés au pavé (les champs vides montrent « Saisir »), « Bornes déjà calées » ; S01 du jeu B tapé : **S01, X 19,993, Y 0,006, altitude 33,274, écart 0,010 m, indice 1,55, VERT**. Domaine supprimé (confirmation « 1 relevé sera supprimé avec lui ») : accueil vide. Aucun identifiant saisi ; onglet fermé, groupe vide.
- Une capture prise juste après l'ouverture montrait une page encore vide (chargement) ; 2 s plus tard, la page était complète.

## Fichiers modifiés par CC-07
**Module** (`frontend/src/modules/releve-terrain/`) : `App.tsx` (limite d'erreur), `composants/LimiteErreur.tsx` (nouveau), `composants/__tests__/LimiteErreur.test.tsx` (nouveau), `composants/ChampNombre.tsx` (prop `vide`), `db/types.ts` (`LectureCote` nullable), `db/depot.ts` (clés de prototype ignorées), `db/__tests__/fusion.test.ts` (nouveau), `ecrans/bornes/EcranBornes.tsx`, `ecrans/calage/CarteCote.tsx`, `ecrans/calage/EcranCalage.tsx`, `ecrans/saisir/LignesStation.tsx`, `etat/releveCalcule.ts`.
**Partagés (signalés)** : `frontend/package.json` et `frontend/src/constants/appVersion.ts` (version 3.154.0), `FONCTIONNEMENT-MODULES.md` (section « Module Relevé terrain »), `CLAUDE.md` (ligne `releve` du tableau « Accès aux modules »).
**Banc** : `frontend/scripts/releve-banc-cc07.cjs` (nouveau ; `BANC_PARTIE=1,2,…` pour rejouer une partie). **Rapports** : `captures-cc-07\`, `RECETTE-JOEL-PHASE-2.md`, ce rapport, et `RAPPORT-RELEVE-CC-01.md`, `-02.md` (jusqu'ici hors de git).
Non commités (déjà modifiés avant la session, pas à moi) : documents de la racine (`ETAT-TECHNIQUE-COMPLET.md`, `FEATURE-MATRIX.md`, `PROCEDURES-OUTILS.md`, `VERSION_HISTORY.md`), autres rapports, `frontend/dev-harness/`, `.playwright-mcp/`.

## Écarts au prompt
1. Serveur de dev : celui qui tournait déjà sur 3000 a été réutilisé, pas relancé.
2. A3 : altitude de C remise à 21,33 avant le cas sans cap (voir la table des numéros).
3. S14 : refus du rang 3 vérifié en plus dans les vrais écrans (non demandé).
4. Quatre besoins de fichiers partagés non appliqués, avec la raison (tableau des besoins).
5. Deux correctifs de code non demandés : limite d'erreur (recommandation de CC-03) et fusion d'en-tête (revue de sécurité).
6. Skills : `react-testing` chargé pour les deux fichiers de test ajoutés ; `impeccable` non chargé (aucun écran visiblement incohérent après fusion, captures relues).

## Surprises
- Profil Chrome du banc dans un chemin très long : le cache du service hors ligne échoue sans message ; garder `BANC_PROFIL` court (`%TEMP%\rp-…`).
- `TimeoutError` occasionnel au tout début du banc (2 fois sur une douzaine), relance verte ; probablement la charge du poste (deux `vite` de dev, `vitest` en parallèle).
- La carte du relevé « Stations B F G » est à petite échelle parce que S09 (E4, 150 m à l'est) est loin : étiquettes serrées autour de B (pincer pour zoomer, comportement prévu par CC-06).
- Le mode avion du banc, `setOffline(true)`, ne coupe que ce navigateur ; le vrai mode avion du téléphone reste à voir par Joël.

## Ce qui reste pour la recette de Joël
La fiche `RECETTE-JOEL-PHASE-2.md` (environ 30 minutes, Android, mode avion) : installation de l'icône, jeu A complet avec la vraie boussole (puis cap 74,4 tapé), S01 à S06 du jeu B, D depuis S06, E1 rouge puis remplacement de la visée, partage CSV et PDF par WhatsApp, fermeture et réouverture en mode avion. Ce que le banc ne peut pas prouver : boussole réelle et rotation d'écran, verrou d'écran (D10), saisie d'une main au soleil, feuille de partage Android, vrai mode avion.

## Recommandations pour la phase 3 (RELEVE-CC-08)
1. Compte et serveur : ajouter `marquerEnvoye` et `appliquerServeur` dans `db/depot.ts` comme prévu par le contrat CC-03, et rejouer le jeu H (droits) au banc avec trois comptes d'essai.
2. Ajouter `releve` au sélecteur de modules (`moduleAccess.ts`, écrivain unique `modulePrefsSync.ts`) et mettre à jour la ligne du tableau « Accès aux modules ».
3. Remplacer `ecrans/saisir/Cadre.tsx` par `CadreReleve` enrichi de `droite` et `pied` (besoin CC-05 n°1), et décider de la couleur du résultat retenu (n°3) et de la bande des étapes « sautée » (CC-04 n°2).
4. Faire trancher par le porteur le signe hi / ht de la règle 6.2 (CC-02) avant d'autoriser des hauteurs différentes, et les limites de hauteur 0 à 5 m (CC-03).
5. Garder `scripts/releve-banc-cc07.cjs` comme recette de non-régression : `BANC_PARTIE` permet de rejouer un seul jeu en 20 à 70 s.
6. Vider `dist/assets/releve` dans `vite.releve.config.ts` avant chaque build (CC-06), pour que les contrôles de fichiers ne voient que la version courante.
