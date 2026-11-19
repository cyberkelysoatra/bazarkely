# RAPPORT RELEVE-CC-11 : correctifs après la première prise en main (installation, retour de la connexion Google, exemples dans les champs, menus de Validation et PUDi)

- **Référence :** RELEVE-CC-11 (prompt `gestion-terrassement\PROMPT-RELEVE-CC-11-correctifs-terrain.md`)
- **Début / fin :** 19/11/2026 09:11 → 10:22 ; durée active ≈ 68 min, plus ≈ 3 min d'attente de la construction Cloudflare (poussé 10:17, 3.158.0 servie 10:20)
- **Contexte atteint :** environ 70 %
- **Commit :** `41c30ec` feat v3.158.0 sur `cloudflare-migration` ; ce rapport et les captures commités seuls ensuite (`[CF-Pages-Skip]`)
- **Production :** `https://1sakely.org/releve/` sert la **3.158.0** (`precache.json`), entrée `releve-fS5-XUdK.js`, identique au build local

## Démarrage (section 1)
- `git pull` : à jour (`2de08d5`). `RAPPORT-RELEVE-CC-10.md` présent.
- Fichiers modifiés avant la session et pas à moi (documents de la racine, autres rapports, `frontend/dev-harness/`, `.playwright-mcp/`) : laissés hors du commit.
- Serveur de dev : 3000 et 3005 déjà pris ; démarré sur **3006** et laissé en marche.
- Compteur de types au départ : **1910**.
- Skills : `react-testing` présent, non chargé (tests écrits sur le modèle des tests du module, Testing Library + Vitest) ; `impeccable` chargé pour une passe de finition bornée (installation et champs), MODÈLE B prioritaire.

## Critères d'acceptation

| Critère | État | Preuve |
|---|---|---|
| C1 Installation | ✅ | `etat/__tests__/installation.test.ts` **13 tests** (Chrome Android, Brave Android par `navigator.brave`, Samsung Internet, iPhone et iPad « Macintosh » tactile, ordinateur, WebView WhatsApp et Firefox Android, gestes de chaque navigateur, adresse d'intention, aucun tiret ni point médian) ; `composants/__tests__/installation.test.tsx` **5 tests** (entrée montrée sans `beforeinstallprompt`, feuille Brave avec « Ouvrir dans Chrome », Chrome sans le bouton, ligne du menu du haut, offre du navigateur utilisée quand elle existe et pas de feuille, cachée en `display-mode: standalone` puis avec `navigator.standalone`). Banc `releve-banc-cc11.cjs` sur le build de production, 412 x 869, `innerWidth` **412** et largeur de défilement 412 : `01` accueil avec le bouton, `02` menu avec l'entrée, `03` feuille en mode Brave (« brave-android », deux étapes, ligne Chrome, lien `intent://…package=com.android.chrome`), `04` feuille en mode Chrome (sans bouton) |
| C2 Retour après la connexion | ✅ | `sync/__tests__/retour-connexion.test.tsx` **9 tests** : marque écrite dans l'application installée **avant** `signInWithOAuth` (lue par le faux client au moment de l'appel), pas de marque hors application ; carte montrée hors application avec marque fraîche et session, marque retirée, « Continuer ici » la cache ; carte attendue tant que la session n'est pas là puis montrée ; pas de carte avec une marque de 16 min (retirée quand même), ni sans marque, ni dans l'application (marque gardée jusqu'à la session) ; dans l'application, `visibilitychange` puis `focus` relisent par `getSession` et le compte s'affiche, marque retirée ; hors application, aucune relecture. Toutes les lignes de console de la suite espionnées : le jeton factice n'y apparaît jamais |
| C3 Couleur | ✅ | voir « Couleur des barres » : rien à changer |
| C4 Exemples | ✅ | `ecrans/__tests__/exemples.test.tsx` **9 tests** : accueil (nouveau domaine, nouveau chantier), formulaire « Nouveau relevé », écran Bornes, écran Calage avec cap à la main, écran Saisir, borne éphémère étape 4, station rouge (« Garder quand même »), Résultats (point du plan et réglages des seuils), connexion par e-mail ; échoue si un champ autre que date, mot de passe, fichier n'a ni valeur ni exemple (contre-épreuve faite : exemple « Opérateurs » retiré → échec) ; exemple parti à la frappe et revenu au vidage (champ texte `:placeholder-shown`, pavé de « X de A » : exemple, « 4 », effacer, exemple, valeur, vidage, exemple). Captures 412 x 869 : `05` domaine, `06` chantier, `07` nouveau relevé, `08` et `09` Bornes, `10` pavé avec l'exemple, `11` et `12` Calage, `13` Saisir. **Contraste du gris** (`encre-2` `#3F3F3A`, mesuré sur la page) : **10,59:1** sur le champ blanc, **10,0:1** sur le champ actif `#FFF9DB` (texte du champ, pavé et `::placeholder`) |
| C5 Menus | ✅ | `validation/utils/modulesCompte.test.ts` **12 tests**, `pudi/utils/admin.test.ts` **30 tests** (dont `['validation','releve']`, `['releve']`, `['pudi','releve']`, `['releve','bazarkely']`), cas existants verts |
| C6 Bandeau | ✅ | banc : page descendue de 47 px, « Station suivante » : défilement **0**, bandeau de 76 à 126 px sous l'en-tête (bas à 76 px), `visible: true` ; capture `14` |
| C7 Non-régression | ✅ | bancs sur le build de production : `cc07` **toutes les parties, 162 contrôles, 0 échec** (111 s), `cc08`, `cc09`, `cc10`, `cc11` verts, 0 erreur de page ; `npx vitest run src/modules/releve-terrain` + `navy-ay/utils` (dont `moduleAccess`) + menus : **49 fichiers, 504 tests verts** |
| C8 Types, build, version, production | ✅ | compteur `tsc -p tsconfig.app.json` : **1910 avant, 1910 après**, **0** erreur dans les fichiers touchés ; `npm run build` OK ; **3.158.0** ; poussé ; production : `/releve/` 3.158.0, `/` 200, `/validation/` 200, `/pudi/` 200 (et `/plan/`, `/releve/connexion` 200) ; l'entrée de `/validation/` et le morceau `Commutateur` de `/pudi/` servis contiennent « Relevé terrain » |
| C9 Rapport | ✅ | ce fichier, dernière action |

## Couleur des barres (3.3, D36)
1. `frontend/releve/index.html` : `<meta name="theme-color" content="#000000" />`, une seule balise.
2. `public/releve/manifest.webmanifest` : `"theme_color": "#000000"`.
3. Rien ne change la balise à l'exécution sous `/releve/` : aucune mention de `theme-color` dans `src/modules/releve-terrain/` ; dans le build, **0 des 23 fichiers** `assets/releve/c/*.js` ne contient `theme-color` (le module n'importe rien de l'hôte, son build est séparé) ; `components/Layout/Header.tsx` et `validation/composants/Mise.tsx` appartiennent aux builds de l'hôte et de `/validation/`, jamais chargés par `/releve/`. Contrôlé aussi sur l'entrée servie en production : 0.
4. Production (`curl`) : `/releve/` et `/releve/connexion` portent `#000000`, le manifeste aussi.

**Rien n'a été changé** : le brun vient du thème propre de Brave, qui n'applique pas la couleur de la page à ses barres.

## Ce qui a été construit
- **Installation (3.1, D33)** : `etat/installation.ts` (détection pure du navigateur, gestes, application installée, adresse « Ouvrir dans Chrome » recopiée du modèle Validation, rien importé), `composants/Installation.tsx` (feuille « Installer Relevé terrain », bouton secondaire de l'accueil sous la liste) ; `etat/pwa.ts` : `useAppliInstallee`, `useEntreeInstallation` (cachée aussi après `appinstalled`) ; menu du haut : ligne « Installer sur mon téléphone », et le bouton de « Version de l'outil » suit la même règle.
- **Retour après Google (3.2, D34)** : `sync/session.ts` : marque `releve.connexion.depuisApp` (heure seulement) posée avant `signInWithOAuth` dans l'application installée ; `retenirRetourDepuisApp` lue une fois à l'ouverture (`main.tsx`, avant le nettoyage de l'adresse), marque retirée une fois lue ; `demarrerRelectureSession` (application installée : `visibilitychange` et `focus` → `getSession`, jamais `getUser`) ; `composants/RetourConnexion.tsx`, carte en tête de l'accueil. Connexion de l'hôte et des autres modules non touchée.
- **Exemples et aides (3.4, D35)** : `ChampNombre` (`exemple` dans le champ vide et dans l'affichage du pavé, `aide` sous le libellé, `aria-describedby`), `ChampTexte` et `FeuilleNom` (`exemple` en `placeholder` gris `encre-2`, `aide`) ; textes réunis dans `ecrans/exemples.ts` ; champs côte à côte alignés par le bas quand une seule aide les décale.
- **Menus (3.5, D27)** : `releve` (« Relevé terrain », `/releve/`) dans `modulesCompte.ts` de Validation et de PUDi, liste faite seulement de modules légers → ni NAVY ay ni PUDi ; tuile « Relevé terrain » (carré noir, montagne jaune, comme l'hôte) dans les deux commutateurs.
- **Bandeau (3.6)** : « Station suivante » ramène en haut de page.
- **Écritures rapprochées (trouvé par le banc, voir Surprises)** : `etat/useReleve.ts` fait passer les écritures d'un écran l'une après l'autre ; `EcranBornes` fusionne sur les dernières valeurs écrites d'une borne. Test `ecrans/bornes/__tests__/ecritures-rapprochees.test.tsx` (contre-épreuve sur l'ancien code : X perdu).

## Exemples et lignes d'aide (liste finale)
| Écran, champ | Exemple | Ligne d'aide |
|---|---|---|
| Accueil et menu du haut, « Nom du domaine » (aussi « Renommer le domaine ») | ex. ITAMPOLO BeFefiky | Le terrain ou la propriété où vous travaillez. |
| « Nom du chantier » (nouveau, renommer) | ex. Villa V14 | Un bâtiment ou une zone du domaine. |
| « Nom du relevé » (Chantier, Bornes) | ex. Implantation V14, matin | |
| « Opérateurs » (Chantier, Bornes) | ex. Joël, Rado | Qui tient l'appareil, qui tient la cible. |
| « Hauteur de l'appareil » | ex. 1,50 | Du sol au centre de l'appareil posé sur sa baguette. |
| « Hauteur des cibles » | ex. 1,50 | Du sol au centre de la cible ronde. |
| « Nom de l'endroit de A » (B, C) | ex. Borne ouest, angle du mur | |
| « X de A », « Y de A » | ex. 47,312 | Recopié du plan de masse. Sans plan, laissez vide. (une fois, sous X) |
| « Altitude de A » | ex. 38,110 | Altitude écrite sur le plan. Sans plan, laissez vide. |
| « Cap A vers B lu sur une boussole » | ex. 74,4 | En degrés, de 0 à 360, téléphone pointé de A vers B. |
| « Lecture n : distance » | ex. 52,47 | La distance affichée par l'appareil. (sous la lecture 1) |
| « Lecture n : pente » | ex. −12,1 | La pente affichée par l'appareil, en degrés, avec son signe. (sous la lecture 1) |
| « Décamètre aller », « retour » | ex. 52,45 | Mesure au ruban, facultative. |
| Saisir, « Distance vers X » | ex. 36,06 | |
| Saisir, « Pente vers X » | ex. −10,3 | |
| Borne éphémère, « Lettre du panneau » | ex. D | La lettre peinte sur la cible. |
| Borne éphémère, « Nom de l'endroit » | ex. Piquet du manguier | |
| Station rouge, « Note (obligatoire) » | ex. Cible bougée par le vent, visée refaite | |
| Résultats, « Nom du point » | ex. P1, angle nord de la villa | |
| Résultats, « X (m) », « Y (m) », « Altitude du plan (m) » | ex. 30,000 ; ex. 5,000 ; ex. 30,872 | |
| Réglages des seuils | « ex. » + valeur par défaut : 0,3 / 0,6 (écarts de station), 2,5 / 4 (indice), 60 (visée), 0,1 / 0,3 (décamètre, aller-retour), 0,15 / 0,3 (fermeture, écarts au plan), 20 (cap), 2 (indice éphémère), 15 (coupure), 10 (déclinaison) | |
| Connexion, « E-mail » | ex. nom@gmail.com | |

Date, mot de passe et fichier : sans exemple.

**Le PRD l'emporte sur deux lignes du prompt** : « posé sur son trépied » devient « posé sur **sa baguette** » (PRD : « L'opérateur pose son appareil sur une baguette de 1,50 m ») ; « L'angle affiché par l'appareil, en degrés » devient « **La pente** affichée par l'appareil, en degrés, **avec son signe** » (PRD : « pente en degrés avec son signe »).

**Feuille d'installation, textes finaux** (une liste numérotée ; les touches ⋮, ≡ et Partager sont dessinées) :
- Chrome Android : 1 « Touchez ⋮ en haut à droite. » 2 « Puis « Installer l'application » ou « Ajouter à l'écran d'accueil ». »
- Brave Android : 1 « Touchez ⋮ en bas à droite. » 2 « Puis « Ajouter à l'écran d'accueil ». » ; ligne « Pour une installation complète, ouvrez cette page dans Chrome. » ; bouton « Ouvrir dans Chrome ».
- Samsung Internet : 1 « Touchez ≡. » 2 « Puis « Ajouter la page à ». » 3 « Puis « Écran d'accueil ». » ; bouton « Ouvrir dans Chrome ».
- iPhone, iPad : 1 « Touchez Partager. » 2 « Puis « Sur l'écran d'accueil ». »
- Autres navigateurs, ordinateur : 1 « Ouvrez cette page dans Chrome sur votre téléphone. » 2 « Puis touchez ⋮ et « Installer l'application ». » ; bouton « Ouvrir dans Chrome » sur un autre navigateur Android.
- Phrase d'introduction : « L'outil s'ouvrira depuis l'écran d'accueil, comme une application, même sans réseau. »

## Fichiers
**Créés** : `etat/installation.ts`, `composants/Installation.tsx`, `composants/RetourConnexion.tsx`, `ecrans/exemples.ts`, tests `etat/__tests__/installation.test.ts`, `composants/__tests__/installation.test.tsx`, `sync/__tests__/retour-connexion.test.tsx`, `ecrans/__tests__/exemples.test.tsx`, `ecrans/bornes/__tests__/ecritures-rapprochees.test.tsx`, `frontend/scripts/releve-banc-cc11.cjs`, `captures-cc-11\` (14 captures, `resultats.json`).
**Modifiés (module)** : `composants/ChampNombre.tsx`, `composants/Formulaires.tsx`, `ecrans/Accueil.tsx`, `ecrans/MenuHaut.tsx`, `ecrans/MenuTerrain.tsx`, `ecrans/Chantier.tsx`, `ecrans/Connexion.tsx`, `ecrans/bornes/EcranBornes.tsx`, `ecrans/calage/CarteCap.tsx`, `ecrans/calage/CarteCote.tsx`, `ecrans/saisir/LignesStation.tsx`, `ecrans/saisir/Saisir.tsx`, `ecrans/ephemere/Ephemere.tsx`, `ecrans/station-rouge/StationRouge.tsx`, `ecrans/resultats/ComparaisonPlan.tsx`, `ecrans/resultats/ReglagesSeuils.tsx`, `etat/pwa.ts`, `etat/useReleve.ts`, `sync/session.ts`, `main.tsx`.
**Partagés (strictement additifs)** : `modules/validation/utils/modulesCompte.ts` (+ test), `modules/validation/composants/Commutateur.tsx`, `modules/pudi/utils/modulesCompte.ts`, `modules/pudi/utils/admin.test.ts`, `modules/pudi/composants/Commutateur.tsx`, `src/constants/appVersion.ts`, `frontend/package.json` (3.158.0).
**Bancs mis à jour** : `scripts/releve-banc-cc07.cjs`, `scripts/releve-banc-cc08.cjs` (voir Écarts).

## Itérations
1. C5, C1, C2 verts du premier coup ; C4 : une requête du test trop stricte (exemple cherché comme texte au lieu de `placeholder`), corrigée.
2. Contrôle de types : 1 erreur dans le test C4 (type d'un nœud), corrigée ; compteur revenu à 1910.
3. Finition (`impeccable`, deux tours de captures) : « ⋮ » rendu comme deux-points par la police étroite → touches dessinées (⋮, ≡, Partager), le glyphe gardé pour les lecteurs d'écran ; exemple gris collé au bas du champ → centré.
4. Bancs CC-07 et CC-08 rouges : cause antérieure à ce lot (voir Surprises), bancs adaptés, puis défaut réel corrigé ; les cinq bancs verts.

## Écarts au prompt
1. Lignes d'aide de « Lecture n » seulement sous la lecture 1 (répétées trois fois, elles chargeaient l'écran) ; « Décamètre aller » et « retour » ont chacun la leur (côte à côte).
2. Étapes de la feuille découpées en lignes numérotées : « Touchez ⋮ en haut à droite. » puis « Puis « … ». », sens inchangé.
3. Admin : « Relevé terrain » apparaît désormais dans les menus de Validation et PUDi, comme dans l'hôte (CLAUDE.md : admin = tous les modules + `releve`) ; les tests admin existants complétés de `releve`.
4. Carte « Connexion réussie » : montrée sur l'accueil (seule page de retour de la connexion du module en pratique) ; elle attend que la session soit établie.
5. La règle « entrée cachée » s'applique aussi après l'événement `appinstalled` (l'application vient d'être installée depuis cette page).
6. Hors périmètre mais nécessaire à C7 : correctif des écritures rapprochées (`useReleve.ts`, `EcranBornes.tsx`), petit et testé.
7. Bancs : `cc07` reçoit une session fabriquée et tous les appels Supabase coupés (sinon la connexion est demandée depuis CC-08) ; `cc08` cherche le texte attendu dans le bandeau de CC-09 (« Vous tenez la saisie, tout est envoyé »). Captures des bancs CC-07 à CC-10 écrites dans un dossier temporaire, celles déjà livrées non écrasées.

## Surprises
- **Bancs CC-07 et CC-08 rouges depuis CC-08 et CC-09** : CC-07 ouvrait `/releve/` sans compte (la connexion est demandée depuis CC-08) ; CC-08 attendait l'ancien texte du bandeau (changé en CC-09). Prouvé antérieur : le build 3.157.0 reconstruit sans mes changements échoue au même banc.
- **Défaut réel mis au jour** : une fois CC-07 relancé avec une session, « Ce relevé a changé dans un autre onglet » apparaissait sur l'écran Bornes et X était perdu : deux écritures parties ensemble (nom validé puis X tapé aussitôt) portaient la même révision. Corrigé (file d'écritures + fusion sur les dernières valeurs) ; sans la fusion, la file seule aurait réécrit le nom avec son ancienne valeur.
- Le « ⋮ » s'affiche comme « : » dans Barlow Condensed.
- Brave ne colore pas ses barres avec `theme-color` : le brun vu par Joël vient de Brave.

## Recommandations pour la suite
1. Recette de Joël : sur Brave, menu ⋯ → « Installer sur mon téléphone » → « Ouvrir dans Chrome », installation par Chrome ; puis connexion Google lancée depuis l'application installée : la carte « Connexion réussie » dans l'onglet, retour dans l'application connectée sans la relancer.
2. Les autres écrans qui écrivent un objet entier à partir de l'affichage (Calage, côtés) pourraient recevoir la même fusion si un double geste très rapide y est constaté.
3. Garder `scripts/releve-banc-cc11.cjs` (11 s) et `cc07` (111 s, désormais avec session) comme non-régression.
