# RAPPORT RELEVE-CC-05 : écrans 8 « Saisir », 9 « Station rouge », 10 « Borne éphémère »

- **Référence :** RELEVE-CC-05 (phase 2c, session parallèle, worktree `C:\bazarkely-2-releve-05`, branche `releve-cc-05`)
- **Début / fin :** 18/11/2026 vers 18:55 → 20:05 ; durée active environ 1 h 10
- **Contexte atteint :** environ 55 % (lecture du contrat CC-03, du PRD, des maquettes ; 13 fichiers écrits ; 3 passages au banc de dev, 2 au banc de production)
- **Commits sur `releve-cc-05` (poussés sur `origin`, aucun déploiement, aucune version changée) :**
  - `f151c5a` feat : écrans 8, 9, 10, tests, scénario de banc, captures `[CF-Pages-Skip]`
  - commit suivant : ce rapport seul `[CF-Pages-Skip]`
- `cloudflare-migration` non touchée, rien écrit dans `C:\bazarkely-2`, extension Chrome non utilisée.

## Itérations et erreurs notables
1. **Confirmation de remplacement trop zélée (trouvée au banc de dev).** Sur S12 (4 bornes), la pente de D déclenchait « Remplacer la visée vers D (20,57 m ; vide) ? » : la station était déjà calculée avec 3 visées et la visée D à moitié saisie était prise pour une lecture à remplacer. Règle corrigée : la confirmation (H09) ne vise qu'une visée **complète** (distance et pente) d'une station calculée, **enregistrée avant l'ouverture de l'écran** ; tout ce qui a été tapé pendant la même saisie se corrige librement jusqu'à « Calculer la station ».
2. Test de composant : `getByText` ne trouvait pas « Accepté : station verte, indice 1,27. » car, dans le jeu F, S06 porte déjà D : le contrôle refuse à juste titre (« Cette station porte déjà la borne D »). Le test reconstruit l'état d'avant D.
3. Visées calculées dans le test S14 arrondies au millimètre : position retrouvée à 2 mm près, tolérance du test ramenée au centimètre.
4. Mesure C5 : le premier `[role=status]` était l'avis « Borne D créée », pas le bandeau ; le banc vise désormais l'élément qui suit l'en-tête.
5. Passe `impeccable` (polish, MODÈLE B) : sur l'écran 9 le pied fixe portait quatre boutons (environ 40 % de l'écran) et « Garder quand même » passait sur deux lignes ; quand une visée est à refaire, « Garder quand même » et « Écarter » descendent en pleine largeur dans le contenu (« Ou décider sans refaire la visée »), le pied ne garde que l'action principale. Texte du retrait corrigé (« avec les 0 stations » → rien quand aucune station ne l'a visée). Build et banc refaits sur le code final.

## Critères d'acceptation

Banc de production (`vite preview`, port 4102, 412 x 869, facteur 3,5) : `scripts/releve-banc-cc05.cjs`, résultats complets dans `captures-cc-05/resultats.json`, **0 erreur**. Seules les bornes A, B, C sont injectées (« vérifiées », calage sauté) ; **toutes les visées sont tapées** au pavé de l'écran 8 (touches du clavier, `Entrée` = OK).

| Critère | État | Preuve |
|---|---|---|
| C1 jeu B | ✅ | S01 à S08 tapées, toutes **VERT**, numéros S01 à S08 ; chaque X, Y, altitude, écart d'altitude à 0,01 m près et indice à 0,01 près du PRD. Ex. S01 : X 19,993, Y 0,006, altitude 33,274, écart 0,010, indice 1,55 ; S08 : X 49,988, Y 7,993, altitude 26,093, écart 0,050, indice 1,23 |
| C2 jeu C | ✅ | E1 (S01) ROUGE, « Refaire la visée vers B, Borne nord », X 29,569, Y 3,238, altitude 31,072, altitudes 30,919 (A), 31,248 (B), 30,908 (C) · E2 (S02) ROUGE, « Refaire la visée vers C, Borne sud-est » · E4 (S03) ORANGE, indice 3,38, les 3 lignes marquées « Visée de plus de 60 m » en orange (`#7C2D12`) · E5 (S04) « Station incomplète : il manque la borne C. », bouton « Ajouter une borne éphémère », pastille « 1 » de libellé « 1 station incomplète », ligne « Stations incomplètes : S04 » ; supprimée après confirmation : plus de pastille |
| C3 jeu F | ✅ | E4 mesurée par l'écran 10 (étapes 1 et 2) devient **S09**, refusée à l'étape 3 : « Position trop fragile : choisissez un endroit plus au centre des bornes » · S06 → étape 3 acceptée rang 1 → étape 4 : lettre D, « Depuis la station S06 : X 35,000 ; Y 11,999 ; altitude 29,728 », nom vide refusé (« Le nom de l'endroit est obligatoire »), « Piquet du manguier » créé · S10 X 54,993, Y 11,995, altitude 24,906, indice 1,41 ; S11 X 45,001, Y 14,998, altitude 27,335 ; S12 X 54,996, Y 11,998, altitude 24,906 (tous VERT) · proposition H15 absente après S10, présente après S11 (« La borne A n'est pas visible sur deux stations de suite. Ajouter une borne éphémère pour cette zone ? »), répondue « Non » · S13 ROUGE, suspecte C, « sans C : 0,003 m, sans A : 0,953 m, sans B : 0,186 m, sans D : 0,966 m » ; « Garder ce résultat sans C » : X 54,996, Y 12,002, altitude 24,904 · S14 : E « Piquet du talus » créée depuis S10 **rang 2**, la ligne E apparaît à l'écran 8 (ABCDE), puis retirée (liste active : D seule). Station visant E, B, C depuis (60 ; 5) à 25,000 m : `ecrans/ephemere/__tests__/controle.test.tsx`, position retrouvée (60,00 ; 25,00), `rangMax` 2, l'étape 3 affiche « trop de reports, précision insuffisante », sans bouton Continuer |
| C4 jeu G | ✅ | Depuis S01 avec D active : lettre proposée **E** ; B saisie : « La lettre B est déjà portée par Borne nord » · D retirée · depuis S01 : contrôle « Accepté : station verte, indice 1,55. », lettre **D**, usage **2**, rang **1**, « Depuis la station S01 : X 19,993 ; Y 0,006 ; altitude 33,274 » · écran 8 : une seule ligne D, usage 2, « Angle sud du parking » · S10 à S13 : X, Y, altitude identiques avant et après (S13 avec son résultat sans C), et leurs visées restent sur « D (1), Piquet du manguier, retirée » |
| C5 D21 | ✅ | 4 bornes actives (ABCD), `scrollY` 0 : bouton « Calculer la station » de 727 à 787 px, barre du bas de 797 à 869 px, `innerHeight` 869 ; bandeau 40 px, texte « Enregistré sur ce téléphone » sur **1** ligne (`getClientRects`) |
| C6 H08 | ✅ | build de production, 10 essais (toucher « Calculer la station » → résultat affiché) : **médiane 45 ms**, maximum 95 ms (premier passage : médiane 42 ms) |
| C7 H09 | ✅ | test unitaire sur l'objet stocké (`ecrans/saisir/__tests__/remplacement.test.ts`, vraie IndexedDB via `depot.ts`) : confirmation exigée, texte « Remplacer la visée vers B (36,06 m ; −10,3°) ? L'ancienne valeur reste dans l'historique. », puis `historique = [{ distance: 36.06, pente: -10.3, remplace_le }]`, nouvelle distance 35,4, autres visées intactes, résultat recalculé ; au banc : « Refaire la visée vers B » rouvre le pavé sur la ligne B surlignée, la nouvelle valeur ouvre « Remplacer la visée vers B (27,05 m ; −9,4°) ? ... », Annuler garde 27,05 |
| C8 captures | ✅ | 24 captures dans `captures-cc-05\` (écrans 8, 9, 10 dans tous leurs états) ; `innerWidth` 412 et `scrollWidth` ≤ 412 sur les 23 vues mesurées ; côte à côte avec la maquette `B-Station` : `c8-cote-a-cote.png` ; contraste minimal mesuré 6,47:1 (blanc sur `#B91C1C`, pastille D22) ; aucun tiret long, demi-long ni point médian à l'écran (contrôle du texte de chaque vue) ni dans le code des trois écrans |
| C9 types, build, tests | ✅ | compteur `tsc -p tsconfig.app.json` : **1910 avant, 1910 après**, 0 erreur dans `src/modules/releve-terrain/` ; `npm run build` OK (2 fois) ; `npx vitest run src/modules/releve-terrain` : **15 fichiers, 153 tests verts** (146 de CC-03 + 7 nouveaux) ; ni `__essai` ni les jeux dans `dist/assets/releve` |
| C10 commits | ✅ | `f151c5a` (mes fichiers seulement) poussé sur `origin/releve-cc-05` ; ce rapport commité seul et poussé |

**Verrou d'écran (D10)** : demandé à l'ouverture de l'écran 8 et de l'étape 2 de l'écran 10, redemandé au retour de la page, rendu à la sortie ; Chromium sans écran du banc le refuse (`data-verrou-ecran="refuse"`), l'écran continue sans lui. À voir sur un vrai téléphone (CC-07).

## Ce qui a été fait
- **Écran 8** (`/r/:releve/saisir/:station?`) : station créée à la première valeur (identifiant tiré par le téléphone, numéro `prochainNumero`, jamais de station vide), écritures en file pour que deux valeurs rapides ne s'écrasent pas, une ligne par borne active (plus les bornes retirées que la station vise), pastille 44 px, deux grands champs (pavé, virgule, signe moins d'une touche), bouton « pas visible » ; limites « Distance entre 0 et 1 000 m. », « Pente entre −90° et +90°. » ; « Calculer la station » fixé au-dessus de la barre (D21) ; « Stations incomplètes : S04 » ; lien « Bornes éphémères » dans l'en-tête ; résultat vert (X, Y, altitude du sol, altitudes une par une, écart d'altitude, plus grand écart de distance, indice, pastille avec son mot), « Station suivante » et « Faire de cette station une borne éphémère » ; station incomplète (H11) avec « Ajouter une borne éphémère », « Plus tard », « Supprimer la station » ; proposition H15 ; avertissements « trop près de la borne, calcul fragile » et visées de plus de 60 m.
- **Écran 9** (dans la route Saisir, `?vue=resultat`) : bloc rouge « Lecture fausse » ou orange « À vérifier », action nommée au format de H08, altitudes par borne, chiffres de H08 ; « Refaire la visée vers B » (`?refaire=<borne>`) ; « Garder quand même » (note obligatoire, `etat = 'gardee'`, journal `station_gardee`) ; « Écarter » (confirmation, `etat = 'ecartee'`, journal `station_ecartee`) ; avec 4 visées : écarts par retrait, résultat sans la suspecte, « Garder ce résultat sans C ».
- **Écran 10** (`/r/:releve/ephemere`, paramètres `etape`, `station`, `pour`, `lettre`) : conseil avec le prochain panneau libre et le choix d'une autre lettre libre, lien vers `/carte?zones=ephemere`, mesure avec les lignes de l'écran 8, contrôle (`peutDevenirBorneEphemere`, rang vérifié d'abord), création (lettre, nom obligatoire, rang, usage, journal `borne_ephemere_creee`, retour à la saisie, ou à la station incomplète d'origine), liste des bornes actives avec « Retirer » (confirmation, journal `borne_ephemere_retiree`) et des bornes retirées en gris ; aucune suppression.

## Fichiers
**Créés** (`frontend/src/modules/releve-terrain/ecrans/`) : `saisir/` (`Saisir.tsx`, `Cadre.tsx`, `LignesStation.tsx`, `Chiffres.tsx`, `useSaisieStation.ts`, `useVerrouEcran.ts`, `logique.ts`, `__tests__/remplacement.test.ts`), `station-rouge/StationRouge.tsx`, `ephemere/` (`Ephemere.tsx`, `EtapeControle.tsx`, `logique.ts`, `__tests__/controle.test.tsx`) ; `frontend/scripts/releve-banc-cc05.cjs` ; `RAPPORTS-CREATEUR-APPS/releve-terrain/captures-cc-05/` ; ce rapport.
**Modifié** : `ecrans/registre-stations.ts` (seul fichier de registre de cette session).

## Besoins sur des fichiers partagés (non touchés)
1. **`CadreReleve.tsx`** : pas d'emplacement pour un lien dans l'en-tête ni pour un bloc fixe au-dessus de la barre du bas. J'ai écrit `saisir/Cadre.tsx` (mêmes composants, mêmes règles) ; CC-07 peut ajouter à `CadreReleve` des props `droite` et `pied` puis supprimer ce double.
2. **`ChampNombre`** : le libellé vide « Toucher pour saisir » (20 px) est coupé dans un champ de demi-largeur (« Toucher po... ») ; proposer un libellé vide plus court ou réglable (`vide?: string`, par exemple « Saisir »).
3. **`calculerReleve`** : la couleur d'une station est celle du calcul avec toutes les visées ; une station gardée « sans C » reste donc ROUGE (couleur), mais entre dans les courbes grâce à `etat = 'gardee'`. C'est pourquoi « Garder ce résultat sans C » pose aussi `etat = 'gardee'` avec la note « Résultat gardé sans la visée vers C » (journal `station_gardee`, `detail.sans_visee`). Si la carte (CC-06) doit colorer d'après le résultat retenu, il faut une couleur du retenu dans `StationCalculee`.
4. **`Confirmation`** : le bouton de confirmation est toujours de style « danger » ; pour « Remplacer » c'est acceptable (action irréversible au sens du PRD).

## Écarts au prompt
1. **Scénario de banc** dans `frontend/scripts/releve-banc-cc05.cjs` (hors des dossiers autorisés), comme le prévoit le contrat de CC-03 (un scénario par session).
2. **Port du serveur de dev : 3002** (prompt) et non 3012 (contrat CC-03).
3. **Écran 8 en mode « mesure de la borne »** : les lignes montrent toutes les bornes actives (principales d'abord par l'ordre des lettres) et non les seules principales, pour permettre le rang 2 voulu par 6.7.
4. **Confirmation H09** : demandée pour une visée complète déjà enregistrée à l'ouverture de l'écran (voir itération 1) ; « pas visible » posé sur une telle visée passe aussi par la confirmation et garde l'ancienne lecture dans l'historique.
5. **Écran 9, orange sans visée suspecte** (E4) : le PRD ne nomme pas d'action ; texte affiché « Géométrie fragile : station loin des bornes ou alignée avec elles. Visées de plus de 60 m : précision moindre. », avec « Garder quand même » et « Écarter ».
6. **Refus supplémentaires à l'étape 3** (non demandés, sans effet sur les jeux) : station écartée, station incomplète (« Compléter la mesure »), station qui porte déjà une borne active.
7. Skill `react-testing` non chargé (conventions Vitest et Testing Library déjà en place) ; `impeccable` chargé pour la passe finale.

## Surprises
- Les jeux de `jeux.ts` partent d'un état où D existe déjà : un test qui veut « S06 devient D » doit retirer D et les stations qui la visent.
- Chromium sans écran refuse le verrou d'écran : le banc ne peut prouver que la demande, pas l'écran allumé.
- `npm run build` dure plus de 10 minutes dans un worktree (cinq builds enchaînés) ; prévoir un délai long.

## Recommandations pour RELEVE-CC-07
1. Fusionner `releve-cc-05` après `releve-cc-04` et `releve-cc-06` (seul fichier commun possible : aucun, `registre-stations.ts` est à moi) ; relancer `node scripts/releve-banc.cjs cc05` après la fusion.
2. Remplacer `saisir/Cadre.tsx` par `CadreReleve` enrichi (besoin 1).
3. Vérifier sur un vrai téléphone Android : verrou d'écran (D10), pavé à une main en plein soleil, enchaînement « Station suivante ».
4. CC-06 : lire `?zones=ephemere` sur la carte (lien de l'étape 1) et montrer en gris les bornes retirées et les stations écartées.
