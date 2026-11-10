# Rapport NEC-CC-06 : Mon Business Plan, correctif 6 (en-tête MODÈLE B, logo B-lossom qui ouvre les autres modules)

Réf. NEC-CC-06 · version **3.132.0** · commit `01a7105` sur `cloudflare-migration` · poussé à 10:47:34, en ligne à **10:49:50** (10/11/2026)

## Durées et déroulement
- Une seule session, fenêtre de contexte non atteinte, aucune question posée, un seul déploiement.
- Serveur de dev : port **3007** (lancé avant le code, laissé tourner ; les ports 3000 à 3006 n'ont pas été touchés). Build servi par `vite preview` sur **4187**.
- Itérations :
  1. Premier banc 46/48. Les titres de module (« Module 5. Les chiffres clés ») passaient sur 2 lignes : l'en-tête du module 5 montait à 153,8 px, plus haut qu'avant. Titre et sous-titre coupés sur **une ligne** chacun : tous les écrans reviennent à la hauteur de la phase 1.
  2. Contrôle du contour de focus trop strict dans mon banc (le navigateur le dessine en 3 px) : corrigé dans le banc.
  3. Capture de la feuille : les 6 tuiles d'un admin débordaient à 412 px (« Validation » coupée). Grille de 3 colonnes au plus : 2 rangées de 3, sans défilement.

## Hauteur de l'en-tête (412 px, DPR 3,5)
| Écran | Phase 1 | Avant (MODÈLE A, phase 5) | Après (MODÈLE B) |
|---|---|---|---|
| Accueil (sans surtitre) | 86,1 | 131,1 | **86,1** |
| Sommaire, module 5, Exporter, formateur | 105,6 | 150,6 | **105,6** |

Phase 1 calculée : MODÈLE A moins le bandeau des logos (34 px), le filet (1 px) et ses marges (2 × 5 px), soit 45 px ; les deux mesures « après » tombent exactement dessus.

## Critères d'acceptation
Bancs Playwright + Chrome du système, **412 × 869, DPR 3,5, tactile**, `innerWidth === 412` et `devicePixelRatio === 3.5` prouvés. Dans `6-captures/` : `banc-dev.cjs` (dev 3007) **51/51**, `banc-build.cjs` (build + service worker, 4187) **16/16**, `mesure-entete.cjs` (hauteurs avant).

| | Critère | Résultat | Preuve |
|---|---|---|---|
| C1 | Une rangée, logos, pas de défilement, nom de 40 caractères | ✅ | Accueil, Sommaire, module 5, Exporter, écran formateur (et Identité, modules 1 et 4, Synthèse, Sommaire de l'exemple) : NEC 44 px à gauche (x 16 à 88), bloc de titre de x 100 à 338, B-lossom 44 px à droite (x 350 à 396), images chargées (largeurs naturelles 195 et 125), plus de bandeau ni de filet, `scrollWidth` = 412 partout. Nom « Boulangerie artisanale Hell-Ville Nosy B » (40 caractères) : titre du Sommaire coupé sur 1 ligne avec « … », sous-titre du module 5 coupé aussi, logos intacts. Captures `c1-*.png`, `planche-entetes.png`. Netteté : les fichiers font 120 px de haut, affichés à 44 px × 3,5 = 154 px, soit un agrandissement de 1,28 (fichiers non retouchés, comme demandé) ; à l'œil sur les captures, contours propres. |
| C2 | Sans session : logo non bouton, 0 requête Supabase | ✅ | Aucune session gardée (`localStorage` vide) : logo = simple `<img>` sur les 10 écrans, toucher sans effet, **0 requête vers supabase.co** sur tout le passage (journal réseau du contexte). Idem en mode avion sur le build. |
| C3 | Fausse session admin, ligne `users` simulée | ✅ | Lecture `users?select=role,preferences&id=eq.u-banc`. Logo = bouton « Ouvrir les autres modules de 1saKELY », cible 54 × 52 px, contour de focus visible. Feuille : Gestion Eau, BazarKELY, Construction POC, NAVY ay, PUDi, Validation (ordre `moduleOrder` puis ordre de l'hôte), **pas de Mon Business Plan**. Retour et Échap la ferment. Toucher « Gestion Eau » : `/gestion-eau` en pleine page. Liste gardée sous `nec.modules`. Compte sans ligne connue : logo reste une image. Captures `c3-feuille-412.png`, `planche-feuille.png`. |
| C4 | Mode avion sur le build | ✅ | Participant : en-tête et 2 logos de 44 px sur Accueil, Sommaire et module 5 hors ligne, logo non bouton, 0 requête Supabase. Compte : liste lue en ligne et gardée ; fichier du commutateur non chargé avant le premier toucher ; en mode avion après rechargement, logo = bouton, feuille avec les 6 modules, fichier `Commutateur-*.js` servi par la précache, aucune lecture `users`. Captures `c4-horsligne-*.png`. |
| C5 | Production, Chrome de Joël | ✅ | Seul Chrome connecté à l'extension, session 1sakely.org de `joelsoatra@gmail.com`. `/plan/` sert `plan-BwztBztm.js` (version **3.132.0**) ; bannière « Nouvelle version » touchée, service worker passé sur `plan-BwztBztm.js`. Vrai clic sur le logo B-lossom : feuille avec Gestion Eau, BazarKELY, Construction POC, NAVY ay, PUDi, Validation. Vrai clic sur « Gestion Eau » : `https://1sakely.org/gestion-eau` s'ouvre (« AHUVI Eau »). Plan de participant sur ce navigateur : identique octet pour octet avant et après (voir « Surprises »). |
| C6 | Rapport | ✅ | Ce fichier, écrit après le déploiement. |

## Contrôles de fin
- Types : `npx tsc --noEmit -p tsconfig.app.json` → **1910 avant, 1910 après**, **0 erreur** dans `business-plan`.
- `npm run build` OK (deux fois : avant et après le changement de version). Précache du plan : 41 fichiers, dont `Commutateur-*.js` (chargé par le service worker à l'installation, donc disponible hors ligne).
- Aucun tiret long, tiret moyen ni point médian dans les fichiers du chantier.
- Page de garde du PDF inchangée (`export/pdf.ts` non touché).

## Fichiers
Créés dans `frontend/src/modules/business-plan/` :
- `utils/modulesCompte.ts` : règles copiées de Validation (admin = tous ; sinon NAVY ay toujours, BazarKELY, Gestion Eau, Construction et Validation s'ils sont dans `preferences.modules`, PUDi jusqu'au 28/01/2027 ; liste exactement `['validation']` = Validation seule), Mon Business Plan jamais listé.
- `etat/modules.ts` : session lue seulement dans le `localStorage` (même clé que Validation) ; sans session, rien n'est chargé ; avec session, liste gardée `nec.modules` d'abord, puis lecture `users` (`role, preferences`) avec le client formateur existant (même session partagée), sous délai.
- `etat/commutateur.ts` : ouverture et fermeture (entrée d'historique, Retour, Échap, toucher dehors absorbé), copie de Validation sans le menu du compte.
- `composants/BarreCommutateur.tsx` : cadre de la feuille, posée sur `<body>` au-dessus de la barre du bas, états « Chargement de vos modules... » et « Réseau indisponible, réessayez ».
- `composants/Commutateur.tsx` (fichier à part, chargé au premier toucher) : tuiles, dont une tuile Validation (bleu `#0369A1`, coche).

Modifiés : `composants/EnTete.tsx` (MODÈLE B), `constants/appVersion.ts`, `package.json`.
Hôte et Validation : **aucun changement**. Rien d'importé de l'hôte ni de Validation.

## Écarts avec le prompt et textes ajoutés (à valider par Joël)
1. **Titre et sous-titre coupés sur une ligne** (avec « … ») sur tous les écrans, pas seulement pour le nom du projet : c'est ce qui rend la hauteur de la phase 1. Les titres longs des modules (« Module 4. Stratégie commerciale, organisation… ») sont donc coupés dans l'en-tête ; ils restent en entier dans le Sommaire et pour les lecteurs d'écran.
2. **Adresse de BazarKELY : `/dashboard`** (comme Validation, éprouvé en production) plutôt que `/`, qui peut renvoyer vers le dernier module ouvert.
3. **Feuille en 2 rangées de 3** au lieu d'une rangée qui défile (6 modules pour un admin).
4. Petit titre « Mes autres modules » en haut de la feuille.

## Surprises
- Le Chrome de Joël n'avait **aucun plan de participant** : j'ai créé une copie locale de l'exemple (« JUS'NOSY (ma copie) », rien d'envoyé) pour vérifier qu'elle reste intacte. Elle est restée sur ce navigateur ; Joël peut la supprimer depuis « Mes projets ».
- L'identifiant du Chrome noté en mémoire (`909e8779-…`) n'existe plus ; un seul navigateur était connecté, avec la session de Joël.
- Le logo B-lossom fait 46 × 44 px ; le bouton l'entoure d'une marge de 4 px pour atteindre une cible de 54 × 52 px sans changer la mise en page.

## Recommandations
- Joël : sur votre téléphone, toucher une fois le logo B-lossom, puis revenir au plan depuis Validation ou l'hôte.
- Plus tard : fichiers de logos en 2 × plus grand (même dessin) pour une netteté parfaite sur les écrans très denses.
