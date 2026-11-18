# RAPPORT RELEVE-CC-04 : écrans 6 « Bornes » et 7 « Calage »

- **Référence :** RELEVE-CC-04 (phase 2b, session parallèle, worktree `C:\bazarkely-2-releve-04`, branche `releve-cc-04`)
- **Début / fin :** 18/11/2026 vers 18:50 → 19:50 ; durée active ≈ 1 h (dont ≈ 15 min d'attente de `npm ci`)
- **Contexte atteint :** environ 45 %
- **Commits sur `releve-cc-04` (poussés sur `origin`, aucun déploiement, aucune version changée) :**
  - `067580d` feat : écrans 6 et 7, tests, scénario de banc, captures `[CF-Pages-Skip]`
  - le présent rapport, commité seul ensuite `[CF-Pages-Skip]`
- `cloudflare-migration` non touchée, rien écrit dans `C:\bazarkely-2`.

## Itérations et erreurs notables
1. `npm ci --prefer-offline` : ≈ 15 min (trois sessions en même temps sur le poste) ; le code a été écrit pendant ce temps.
2. Tests d'écran : le `setup.ts` global simule aussi **`react-router-dom`** (en plus de Dexie et `randomUUID` signalés par CC-03) : `vi.unmock('react-router-dom')` nécessaire.
3. Sous la charge des trois sessions, le premier rendu (écran chargé à la demande) et les allers-retours IndexedDB dépassaient 1 s (`findBy`) et 10 s (délai d'un test) : délais portés à 10 s et 40 s dans `environnement.ts`. Suite complète ensuite verte **deux fois de suite**.
4. Boussole « 358 et 2 » : avec un nombre impair de lectures dans la fenêtre de 2 s, la moyenne circulaire donnait 0,1 (ou 359,9) au lieu de 0,0. Le calcul est juste (`moyenneCaps([358, 2])` vaut 0) ; le test envoie désormais autant de lectures de chaque valeur dans la fenêtre, et vérifie aussi `moyenneCaps` directement.
5. Banc : la première capture « Saisir après saut » était prise pendant le chargement de l'écran provisoire ; attente ajoutée, puis relecture de la base (état, bornes vérifiées, journal).

## Critères d'acceptation

| Critère | État | Preuve |
|---|---|---|
| C1 jeu A saisi dans les vrais écrans | ✅ | Banc `vite preview`, 412 x 869 : noms, X, Y, altitudes des 3 bornes, 9 lectures, 6 valeurs de décamètre, cap 74,4 tapés au clavier dans les champs (pavé). **27 valeurs lues à l'écran, 0 écart** (`captures-cc-04/resultats.json`, `c1.ecarts: []`) : distances 52,468 / 45,457 / 71,310 ; écarts +0,016 / −0,124 / +0,011 ; biais −0,017 / +0,125 / −0,012 ; dénivelés −11,245 / −5,489 / −16,723 ; VERT / ORANGE / VERT ; boucle −0,011 VERT ; A 0,000 0,000 38,110 ; B 47,312 22,681 26,865 ; C 69,217 −17,150 21,382 ; position B 0,025 VERT, C 0,182 ORANGE ; altitude B +0,035 VERT, C +0,052 VERT ; « Cap lu 74,4° ; déclinaison 10° ; cap corrigé 64,4° », « Cap A vers B (plan 64,4°) écart 0,0° VERT » ; calage ORANGE ; « Orienté par le plan » ; message de mode d'affichage absent (0). Validation : état `valide`, Saisir ouvert. Captures `7-calage-resultat.png`, `7-carte-resultat.png`, `7-carte-controle.png`, `7-calage-page-entiere.png` |
| C2 jeu A2 | ✅ | `calage.test.tsx` : sans plan, « À droite » coché, cap 74,4 : B 47,317 22,671, C 69,213 −17,165, « Nord approximatif » ; sans cap : B 52,468 0,000, « Orientation libre (axe A vers B) » ; jeu A avec C sans X ni Y : question « C est-il à gauche ou à droite en regardant de A vers B ? » posée, résultat masqué, puis « À droite » : C 69,217 −17,150 |
| C3 jeu A3 | ✅ | cap 254,4 : « écart 180,0° » ROUGE, « Le plan et le terrain ne concordent pas », calage ROUGE, dialogue « Le plan et le terrain ne concordent pas : vérifier la borne A ou B ou le plan », « Continuer quand même » : `calage.etat = 'force'` et 1 objet journal `calage_force` ; « Refaire » ne note rien ; altitude du plan de C 22,33 : −0,948 m ROUGE, dialogue « ... vérifier la borne C ou le plan », C reste à 21,382 ; sans cap : « cap non contrôlé », calage ORANGE, validé sans dialogue |
| C4 boussole | ✅ | `boussole.test.ts` (événements `deviceorientationabsolute` synthétiques, horloge simulée) : alpha 285,6 → 74,4 puis 64,4 corrigé (et 164,4 écran tourné de 90°) ; 358 et 2 → 0,0 ; cap lu 5,0 → 355,0 ; lectures 74 et 80 alternées (dispersion 3°) pendant 6 s → rien gardé, puis main stable → gardé ; aucun événement en 3 s ou événements sans alpha → chemin sans boussole. `calage.test.tsx` : jsdom sans capteur → « Pas de boussole sur ce téléphone : saisissez le cap lu sur une boussole. », champ manuel, 361 refusé « Cap entre 0 et 360°. ». Au banc (Chromium sans boussole) même chemin, puis 74,4 saisi |
| C5 lettres, noms, limites | ✅ | Banc et tests : A → B refusé « La lettre B est déjà portée par Borne nord » ; une lettre libre (K) acceptée ; nom effacé refusé « Donnez le nom de l'endroit. », ancien nom gardé ; noms vides refusés à « Étape suivante » ; distance 0 et 1 200 « Distance entre 0 et 1 000 m. » ; pente 95 « Pente entre −90° et +90°. » (`6-lettre-refusee.png`, `7-distance-refusee.png`) |
| C6 H06 | ✅ | Banc : 3 bornes avec plan, « saisir comme vérifiées » → `/r/…/saisir` (écran provisoire affiché), `calage.etat = 'saute'`, 3 bornes `verifiee`, journal `calage_saute` ; retour à l'étape 1 : carte « Étape 2 sautée », ligne des étapes réduite, étape 2 « ✓Calage » (`6-saute-bornes.png`, `7-saute.png`). Sans X, Y, altitude complets : refusé « Pour sauter le calage, saisissez X, Y et altitude des 3 bornes. » |
| C7 hauteurs après stations | ✅ | `bornes.test.tsx`, jeu B : S01 à 33,274 dans `useReleve` ; hi 1,60 tapé → dialogue « Toutes les stations seront recalculées. Continuer ? » (S01 inchangé tant que non confirmé) ; « Continuer » → S01 33,174, `hi = 1.6`, 1 journal `hauteurs_modifiees` ; « Annuler » garde 1,50. Page `/__essai?jeu=B` du serveur de dev (port 3001) répond 200 |
| C8 captures, largeur | ✅ | `innerWidth` 412 et `scrollWidth` 412 sur 5 vues (6 vide, 6 rempli, 7 vide, 7 rempli, 6 sauté) ; `c8-cote-a-cote.png` (MODÈLE B saisir, écran 6, écran 7) ; contrastes de tout texte visible : minimum **8,18:1** (`#7C2D12` sur `#FFEDD5`) |
| C9 types, build, tests | ✅ | compteur `tsc -p tsconfig.app.json` : **1910** (identique à la base de CC-03), **0 erreur** dans `src/modules/releve-terrain/` ; `npm run build` OK (`EcranBornes-*.js`, `EcranCalage-*.js` dans `dist/assets/releve/c/`) ; `npx vitest run src/modules/releve-terrain` : **16 fichiers, 166 tests verts** (dont le seul `it.fails` admis de CC-02), deux passages |
| C10 commits | ✅ | `067580d` (mes fichiers seulement, poussé), puis ce rapport seul |

Passe `impeccable` (polish) : un seul passage sur les captures du banc à 412 px ; aucun défaut d'affichage trouvé (pas de débordement, contrastes conformes, cadres 3 px, rayon 4 px, chiffres Barlow Condensed, aucune ombre ni dégradé). Skill `react-testing` non chargé : conventions Vitest et Testing Library déjà en place dans le dépôt.

## Fichiers créés
`frontend/src/modules/releve-terrain/ecrans/bornes/` : `EcranBornes.tsx`, `FeuilleLettre.tsx`, `__tests__/bornes.test.tsx`, `__tests__/environnement.ts`.
`frontend/src/modules/releve-terrain/ecrans/calage/` : `EcranCalage.tsx`, `CarteCote.tsx`, `CarteCap.tsx`, `CarteResultat.tsx`, `DialogueRouge.tsx`, `boussole.ts`, `useVeille.ts`, `format.ts`, `__tests__/boussole.test.ts`, `__tests__/calage.test.tsx`.
Modifié : `ecrans/registre-bornes.ts` (les deux routes pointent sur les vrais écrans).
Scénario de banc : `frontend/scripts/releve-banc-cc04.cjs` (voir écarts). Captures : `RAPPORTS-CREATEUR-APPS/releve-terrain/captures-cc-04/`.

## Besoins sur des fichiers partagés (à appliquer par RELEVE-CC-07)
1. **`db/types.ts`, `LectureCote`** : une lecture en cours de saisie (distance tapée, pente pas encore) est enregistrée avec `null` pour la valeur manquante (le type dit `number`, d'où une conversion dans `CarteCote.donneesDe`). `releveCalcule.entreeCote` l'ignore déjà correctement. Proposé : `distance: number | null ; pente: number | null`, et vérifier que `verifierSauvegarde`, les exports de CC-06 et le serveur (phase 3) acceptent ces `null`.
2. **`composants/Etapes.tsx`** : une étape sautée s'affiche comme faite (« ✓ Calage »). Pour dire « sautée » dans la bande elle-même, une prop `sautees?: NumeroEtape[]` (mot « sauté ») ; en attendant, les écrans 6 et 7 affichent une carte « Étape 2 sautée ».
3. **`composants/ChampNombre.tsx`** : valeur toujours en 42 px ; à trois champs par ligne (X, Y, altitude, comme la maquette), « −17,32 » serait tronqué à 412 px : j'ai mis X et Y sur une ligne, l'altitude dessous. Une variante `compacte` (30 px) permettrait la ligne de trois.
4. **`src/test/setup.ts`** : il simule `react-router-dom` en plus de Dexie : à documenter dans le contrat (tout test d'écran du module doit faire `vi.unmock('dexie')` et `vi.unmock('react-router-dom')`, voir `bornes/__tests__/environnement.ts`, réutilisable par CC-05 et CC-06).

## Écarts au prompt
1. **Fichier hors de mes dossiers** : `frontend/scripts/releve-banc-cc04.cjs`, nouveau fichier, imposé par le contrat de CC-03 (le banc charge `scripts/releve-banc-<scénario>.cjs`) ; aucun fichier partagé existant modifié.
2. **Serveur de dev** sur le port 3001 comme demandé (le contrat de CC-03 proposait 3011).
3. **Avertissement de recalcul** posé sur tout changement du calage après des stations : côtés, mais aussi cap et côté de C (ils changent aussi la place des bornes).
4. **Journal `hauteurs_modifiees`** écrit seulement quand des stations existent (cas de la section 8) ; détail `{ avant: {hi, ht}, apres: {hi, ht} }`. Journal `calage_force` : `{ message, couleur }` ; `calage_saute` : `{ bornes: [lettres] }`.
5. **Nom de l'endroit** : le refus s'affiche quand un nom existant est effacé, et à « Étape suivante » pour un nom jamais donné (pas à chaque sortie d'un champ encore vide).
6. **Cap lu à la boussole** arrondi au dixième avant enregistrement (affichage et calculs identiques à une saisie à la main).
7. « altitudes relatives » montré en pastille quand A n'a pas d'altitude (c'est la règle de `calcul/` : seule l'altitude de A fixe l'origine).
8. Commit : `[CF-Pages-Skip]` en fin de titre (le message se termine par la ligne d'attribution), comme les commits de branche précédents.

## Surprises
- Le `setup.ts` global simule `react-router-dom` (voir besoins, point 4).
- Chromium du banc annonce `ondeviceorientationabsolute` mais n'envoie aucun événement : c'est le délai de 3 s qui bascule sur la saisie à la main, exactement le chemin voulu pour un téléphone sans boussole.
- Moyenne circulaire et nombre impair de lectures : sur un vrai téléphone la fenêtre de 2 s contient des dizaines de lectures, l'effet (au plus un dixième de degré pour une dispersion de 2°) est sans conséquence ; il n'apparaît qu'avec un jeu artificiel de deux valeurs alternées.

## Recommandations pour RELEVE-CC-07
1. Appliquer les besoins 1 et 4 avant la fusion des trois branches (les exports de CC-06 liront `lectures`).
2. Après fusion, relancer `node scripts/releve-banc.cjs cc04` (le scénario saisit tout le jeu A en ≈ 45 s) : il vérifie aussi que « Valider » ouvre bien l'écran 8 réel de CC-05 (`/saisir`).
3. Essai sur un vrai téléphone Android (Chrome) pour la boussole : lecture stable en 2 s à plat, et rotation de l'écran (l'angle `screen.orientation.angle` est pris en compte, non vérifiable au banc).
4. Verrou d'écran (D10) : `navigator.wakeLock` présent au banc ; l'effet réel (écran qui ne s'éteint pas) n'est observable que sur téléphone.
