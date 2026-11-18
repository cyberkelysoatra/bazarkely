# RAPPORT RELEVE-CC-03 : entrée /releve/, données sur le téléphone, habillage MODÈLE B, accueil et chantiers

- **Référence :** RELEVE-CC-03 (phase 2a, socle des écrans)
- **Début / fin :** 18/11/2026 17:36 → 18:45 ; durée active ≈ 1 h 10
- **Contexte atteint :** environ 60 % (estimation : lecture des sources, 50 fichiers écrits, 6 passages au banc)
- **Commits sur `cloudflare-migration` (poussés, déployés par Cloudflare Pages) :**
  - `9f87814` feat v3.153.0 (socle complet)
  - `1c46288` fix v3.153.1 (fausse « Nouvelle version disponible » à la première visite, trouvée pendant le contrôle de production)
- **Production :** `https://1sakely.org/releve/` sert la **3.153.1** (`precache.json` version 3.153.1, entrée `releve-CNHngodo.js`).

## Itérations et erreurs notables
1. Calcul et dépôt : 33 tests de `releveCalcule` verts du premier coup ; `depot.test.ts` a demandé deux réglages d'environnement (le `setup.ts` global du dépôt simule Dexie **et** remplace `crypto.randomUUID` par une constante ; `vi.useFakeTimers()` complet bloque `fake-indexeddb`, d'où `toFake: ['setTimeout', 'clearTimeout']`).
2. Banc : `waitForFunction` de Playwright ne sait pas attendre un prédicat asynchrone (il rendait la main tout de suite) : remplacé par une vraie boucle. `vite preview` ajoute `Vary: Origin` : le cache refusait alors les scripts de module hors ligne ; le service worker de `/releve/` cherche désormais avec `ignoreVary: true` (Cloudflare n'envoie pas `Vary` sur ces fichiers, comportement de production inchangé).
3. Contraste : le titre des feuilles ouvertes depuis l'en-tête héritait du texte blanc (1,1:1, détecté par le scan automatique du banc). Feuilles et dialogues passent désormais par un portail vers `body` avec encre explicite.
4. Touche « OK » du pavé pas jaune (classe de fond écrasée) : corrigé.
5. **Défaut trouvé en production (corrigé en 3.153.1)** : à la première visite, la page `/releve/` est contrôlée par le service worker racine de l'hôte ; le premier worker de `/releve/` passe un instant par « en attente » : la bannière « Nouvelle version disponible » s'affichait sans raison et la mise à jour automatique rechargeait la page au changement d'écran. Reproduit au banc sur la 3.153.0 (`fausseNouvelleVersion: true`), absent en 3.153.1 (`false`). Le même code existe dans `business-plan/etat/pwa.ts` (voir « Surprises »).
6. Observation non reproduite : pendant le contrôle de la mise à jour 3.153.0 → 3.153.1 dans Chrome, la page est apparue une fois vide (racine React vide, aucune erreur en console relevée après coup) juste après un enregistrement manuel du worker fait par moi en même temps que la page. Après rechargement, puis bannière légitime « Nouvelle version disponible » touchée, la 3.153.1 est active et la page s'affiche. Voir « Recommandations ».

## Critères d'acceptation

| Critère | État | Preuve |
|---|---|---|
| C1 tests | ✅ | `npx vitest run src/modules/releve-terrain` : **13 fichiers, 146 tests verts**, dont le seul `it.fails` admis par RAPPORT-RELEVE-CC-02 (jeu-f, S14 « verte »). Par fichier : releveCalcule 33 · depot 17 · bornes-valeurs 30 · jeu-a 10 · jeu-b 9 · jeu-d 9 · jeu-f 8 · cas-limites 8 · jeu-g 6 · jeu-a2 5 · jeu-c 4 · jeu-d2 4 · jeu-a3 3 |
| C2 banc 412 x 869 | ✅ | `innerWidth` 412 et `scrollWidth` 412 sur les 8 vues mesurées (accueil vide, accueil, menu domaine, menu du haut, chantier, nouveau relevé, chantier final, cadre d'un relevé) ; captures dans `captures-cc-03\` |
| C3 mode avion | ✅ | contexte ordinaire : `setOffline(true)`, rechargement, domaine « Domaine avion » et chantier créés, présents après un second rechargement (`navigator.onLine === false`) ; profil persistant : navigateur fermé, **serveur `vite preview` arrêté**, navigateur rouvert hors ligne, domaine et chantier créés, navigateur refermé et rouvert : présents (`profilApresFermeture: true`) |
| C4 deux onglets | ✅ | `depot.test.ts` : l'onglet 2 écrit (rev 2), l'écriture de l'onglet 1 (rev 1) est refusée (`ConflitReleve`, données de l'onglet 2 gardées), et par `executer()` l'avis « Ce relevé a changé dans un autre onglet : affichage mis à jour. » reste 6 s puis disparaît |
| C5 habillage | ✅ | styles calculés en production : en-tête `rgb(0,0,0)`, titre « Barlow Condensed » 800 26 px, bande Reprendre `rgb(255,209,0)`, cadre 3 px noir, fond `rgb(244,244,241)`, chiffres `tabular-nums` ; contrastes ci-dessous ; côte à côte : `captures-cc-03\c5-cote-a-cote-accueil.png` |
| C6 aucun import de l'hôte | ✅ | imports hors du module : `react`, `react-dom`, `react-dom/client`, `react-router-dom`, `dexie`, `d3-delaunay` (calcul), polices par `url()` CSS ; tests seulement : `vitest`, `fake-indexeddb`, `node:crypto` ; aucun `@/`, aucun `lucide-react`, aucun Supabase (grep, 0 occurrence aussi dans `dist/assets/releve`) |
| C7 poids | ✅ | première visite sans polices : **127,4 ko** gzip (page 0,7 ; CSS 3,9 ; code 122,8) ; mesuré en production : code 122,5 ko gzip, CSS 3,9, page 0,9 ; polices : 7 fichiers woff2, **157,0 ko** au total (non compressibles), toutes dans `precache.json` ; précache complet 315 ko |
| C8 types et build | ✅ | compteur `tsc -p tsconfig.app.json` : **1910 avant, 1910 après** (contrôlé après chaque commit) ; **0 erreur** dans `src/modules/releve-terrain/` ; `npm run build` OK (5 builds enchaînés) |
| C9 production | ✅ | voir section suivante |
| C10 rapport | ✅ | ce fichier, contrat en fin de rapport |

**Contrastes mesurés** (scan de tout texte visible au banc, plus paires d'état calculées) : blanc sur `#B91C1C` (pastille de stations incomplètes) **6,47** (minimum) · `#991B1B` sur blanc 8,31 · `#3F3F3A` sur `#F4F4F1` 9,61 · `#3F3F3A` sur blanc 10,59 · `#2F302C` sur `#E9EAE6` 11,0 · noir sur `#FFD100` 14,37 · `#D9D9D9` (blanc 85 %) sur noir 14,84 · noir sur `#F4F4F1` 19,06 · blanc sur noir 21 · noir sur blanc 21 · `#7F1D1D` sur `#FEE2E2` 8,2 · `#14532D` sur `#DCFCE7` 8,3 · `#7C2D12` sur `#FFEDD5` 8,18 · `#1E3A8A` sur `#DBEAFE` 8,49 · noir sur `#FFF9DB` 19,83 · `#3F3F3A` sur `#FFF9DB` 10,0 · blanc sur `#1E3A8A` 10,36 · blanc sur `#3F3F3A` 10,59. Tout ≥ 4,5:1.

**Performance (4.3)** : 100 stations recalculées en **1,8 ms** (médiane de 5, maximum 2,6 ms) sur le build de production au banc (mesure `performance.measure('releve-calcul')`), 3,8 ms en Node (test). Limite 200 ms.

## Production et navigateur (section 5)
- `curl` sur la 3.153.1 : `/releve/` 200 `text/html` `no-cache` · `/releve/c/abc` 200 HTML · `/releve/sw.js` 200 `application/javascript`, `Service-Worker-Allowed: /releve/` · `/releve/precache.json` 200 `application/json` `no-cache`, 7 polices listées · `/releve/n-existe-pas.js` et `/assets/releve/c/n-existe-pas.js` **404 `no-store`** · `/`, `/plan/`, `/validation/`, `/pudi/` 200.
- Juste après le déploiement, quelques réponses transitoires : `precache.json`, manifeste et icônes annoncés `text/html`, puis un fichier de code en 404 vu par Chrome (mémento §23). Quelques minutes plus tard tout était correct ; le 404 étant `no-store`, rien n'a été gardé.
- Chrome, profil confirmé « **CyberKELY SOATRA** » sur la page du compte Google (`cyberkelysoatra@gmail.com`) : `https://1sakely.org/releve/`, domaine « ESSAI CC-03 », chantier « Chantier essai », relevé « Releve essai » créés ; après rechargement, tout est là (« Reprendre : bornes ») ; domaine supprimé avec confirmation « 1 relevé sera supprimé avec lui » ; accueil revenu à l'état vide. Puis contrôle de la mise à jour 3.153.0 → 3.153.1 (bannière légitime, nouvelle version active). Aucun identifiant saisi ; onglets fermés, groupe vide.
- Worktrees (`git worktree list`) : `C:/bazarkely-2-releve-04 [releve-cc-04]`, `C:/bazarkely-2-releve-05 [releve-cc-05]`, `C:/bazarkely-2-releve-06 [releve-cc-06]`, tous à `1c46288` ; `frontend\.env.production` recopié dans chacun ; rien installé.

## Fichiers
**Créés** : `frontend/releve/index.html`, `frontend/vite.releve.config.ts`, `frontend/tailwind.releve.config.js`, `frontend/functions/releve/_middleware.ts`, `frontend/functions/assets/releve/_middleware.ts`, `frontend/public/releve/` (`sw.js`, `manifest.webmanifest`, `releve-icon-192.png`, `releve-icon-512.png`, `releve-icon-maskable-512.png`, `og-releve-v1.png`, ajoutés par `git add -f`, `git ls-files frontend/public/releve` les liste tous), `frontend/scripts/releve-banc.cjs`, `frontend/scripts/releve-banc-cc03.cjs`, et dans `frontend/src/modules/releve-terrain/` : `main.tsx`, `App.tsx`, `version.ts`, `releve.css`, `db/` (`base.ts`, `types.ts`, `depot.ts`, `lecture.ts`, `__tests__/depot.test.ts`), `etat/` (`releveCalcule.ts`, `useReleve.ts`, `useRequete.ts`, `jeux.ts`, `avis.ts`, `navigation.ts`, `pwa.ts`, `__tests__/releveCalcule.test.ts`), `composants/` (`EnTete`, `Bandeau`, `Etapes`, `BarreBas`, `Pastilles`, `ChampNombre`, `Bouton`, `Feuilles`, `Formulaires`, `Avis`, `Icones`), `ecrans/` (`Accueil`, `Chantier`, `MenuTerrain`, `MenuHaut`, `CadreReleve`, `Prochainement`, `Essai`, `registre.ts`, `registre-bornes.ts`, `registre-stations.ts`, `registre-resultats.ts`, `typesRegistre.ts`).
**Modifiés (partagés, ajouts seulement)** : `frontend/vite.config.ts` (`releveEntry()`, `releve/**` dans `globIgnores`), `frontend/src/sw-custom.ts` (`'releve-'` épargné, `/^\/releve(\/|$|\?)/` exclu de la navigation), `frontend/public/_headers` (bloc `/releve/`), `netlify.toml` (redirections `/releve` et `/releve/*`), `frontend/package.json` (`build`, dépendances, version), `frontend/package-lock.json`, `frontend/src/constants/appVersion.ts`.
Non commités par moi (déjà modifiés avant la session) : documents de la racine, autres rapports, `.playwright-mcp/`.

## Dépendances ajoutées
`@fontsource/barlow` ^5.3.0 et `@fontsource/barlow-condensed` ^5.3.0 (licence OFL, sous-ensemble latin seulement chargé) ; `fake-indexeddb` ^6.2.8 (développement, Apache-2.0). Navigateur Playwright Chromium 1193 installé sur le poste (`npx playwright install chromium`).

## Écarts au prompt
1. **Service worker** : `ignoreVary: true` ajouté aux deux recherches dans le cache (raison : banc ; sans effet en production).
2. **`pwa.ts`** : copie de `/plan/` sauf la détection d'une version en attente, corrigée (3.153.1, voir itération 5). Deuxième version poussée : 3.153.0 puis 3.153.1.
3. **Pastille de lettre** : graisse 800 (le prompt limite Barlow Condensed à 600, 700, 800 ; le design demande 900).
4. **Hauteurs** : limites choisies faute de règle au PRD : supérieure à 0 et au plus 5 m, message « Hauteur refusée : elle doit être supérieure à 0 et au plus 5 m. ».
5. **Barre du bas** : les écrans de cette phase étant l'accueil et le chantier, elle n'apparaît que dans le cadre des écrans provisoires 6 à 12 (`CadreReleve`), comme le veut « dans un relevé seulement ».
6. **Étape d'un relevé** déduite des données : 1 tant qu'une borne principale n'a pas de nom, 2 tant que le calage est « à faire », sinon 3 (l'étape 4 n'est jamais déduite).
7. **Import « garder les deux »** : quand le nom existe déjà dans le chantier, le relevé importé devient « <nom> (2) », « (3) »... (non précisé par le prompt).
8. Aide ⓘ ajoutée à l'accueil (« Ranger mes terrains ») et à la feuille « Nouveau relevé » (« Les deux hauteurs ») lors de la passe `impeccable` (PRODUCT.md demande une aide dépliable sur chaque écran non trivial). Skill `react-testing` non chargé : conventions Vitest déjà en place.

## Surprises dans le dépôt
- `src/test/setup.ts` simule globalement Dexie, IndexedDB **et** `crypto.randomUUID` (constante `mock-uuid-123`) : tout test de données réel doit `vi.unmock('dexie')`, fournir `fake-indexeddb` à `Dexie.dependencies` et rétablir `randomUUID` (voir `db/__tests__/depot.test.ts`).
- **Même défaut probable sur `/plan/`** : `business-plan/etat/pwa.ts` affiche « Nouvelle version » et peut recharger la page à la première visite d'un téléphone qui a déjà le service worker de l'hôte (même condition `reg.waiting && controller`). Non touché (hors périmètre).
- `vite preview` envoie `Vary: Origin` : un service worker qui cherche dans le cache sans `ignoreVary` paraît cassé au banc alors qu'il marche en production.
- `/releve/sw.js` reçoit en production `Cache-Control: max-age=14400` malgré `no-cache` dans `_headers` (même chose pour `/plan/sw.js`) : sans gravité, l'adresse du worker change à chaque version (`?v=`).
- Port 4173 déjà pris sur le poste par une autre session (le banc refuse et demande `BANC_PORT`).

## Ce que le prompt n'avait pas prévu
- Le contrôle de production de la **mise à jour** elle-même (une version qui attend derrière une autre) : c'est lui qui a révélé le défaut de la 3.153.0.
- Les worktrees n'ont pas de `node_modules` : chaque session parallèle doit en fournir (voir contrat, « Serveur de dev »).
- La note « no Google Fonts » : la maquette MODÈLE B charge Google Fonts ; la capture de la maquette au banc en dépend (réseau requis pour `c5-cote-a-cote-accueil.png` seulement).

## Contrat pour RELEVE-CC-04, CC-05, CC-06

### Registres (un fichier par session, aucun autre écran touché)
- `ecrans/registre-bornes.ts` (**CC-04**, écrans 6 et 7), `ecrans/registre-stations.ts` (**CC-05**, écrans 8, 9, 10), `ecrans/registre-resultats.ts` (**CC-06**, écrans 11, 12 et exports). `registre.ts` les assemble : ne pas le modifier.
- Chaque fichier exporte `ecrans: LigneEcran[]` avec `{ route, composant, titre }` (`typesRegistre.ts`). Remplacer `lazy(() => import('./Prochainement'))` par `lazy(() => import('./MonEcran'))` (export par défaut). Routes actuelles : `/r/:releve/bornes`, `/r/:releve/calage` (CC-04) ; `/r/:releve/saisir/:station?`, `/r/:releve/ephemere` (CC-05 ; l'écran 9 s'ouvre dans la route Saisir) ; `/r/:releve/carte` (paramètre `?zones=ephemere`), `/r/:releve/resultats` (CC-06). Une route nouvelle s'ajoute dans son propre fichier.
- `registre-resultats.ts` exporte aussi `ouvrirSauvegarde?: (chantierId: string) => void | Promise<void>` et `exporterSauvegarde?: (releveId: string) => void | Promise<void>`, `undefined` aujourd'hui. Dès que CC-06 les définit, l'accueil, le menu du chantier et les confirmations montrent « Ouvrir une sauvegarde ici », « Exporter la sauvegarde d'abord », « Exporter leurs sauvegardes d'abord » sans autre changement. Pour produire ou relire le fichier : `depot.lireSauvegarde(releveId)` et `depot.importerReleve(chantierId, sauvegarde, mode)` ; `depot.verifierSauvegarde(objet)` contrôle la forme.

### Cadre d'un écran de relevé
```tsx
const { releve } = useParams()
const r = useReleve(releve)
return <CadreReleve releve={r} etape={3} onglet="saisir" bandeauCompact>...</CadreReleve>
```
`CadreReleve` (`ecrans/CadreReleve.tsx`) : props `releve` (résultat de `useReleve`), `etape?: 1|2|3|4`, `onglet?: 'saisir'|'carte'|'resultats'|null`, `bandeauCompact?` (D21), `bandeau?` (phase 3). Il affiche chargement, relevé absent, en-tête (nom, « chantier, domaine »), bandeau, étapes (ligne fine D23 dès que le calage est fait ou sauté), `<main>` (colonne, espacement 12 px) et barre du bas avec la pastille D22.

### `useReleve(releveId)` (`etat/useReleve.ts`)
Retourne `{ etat, rev, reglagesDefaut, actions }`.
- `etat.statut` : `'chargement' | 'absent' | 'pret'` ; prêt : `releve`, `objets` (vivants), `chantier`, `domaine`, `calcule: ReleveCalcule`.
- `actions` (rev gardée automatiquement, erreurs transformées en avis, retour `null`/`false` si refus) : `ecrireObjets(objets)`, `ecrireObjet(objet)`, `supprimerObjets(ids)`, `modifierEntete(patch)` (fusion profonde), `renommer(nom)`, `supprimer()`. Un objet à écrire : `{ id?, type, donnees, saisi_at? }` (sans `id` : création ; avec `id` : remplacement).
- `calcule` (`etat/releveCalcule.ts`, fonction pure `calculerReleve(entete, objets, reglagesDefaut)`) : `reglages` (défauts puis réglages du relevé), `cotes {ab, bc, ac}` (`ResultatCote | null`, sens de saisie indifférent), `calage` (`ResultatCalage | null`, dès que les 3 côtés ont une lecture), `etatCalage`, `couleurCalage` (`null` si sauté ou non calculé), `orientation`, `mentionOrientation`, `principales {a, b, c}` (rôles par `ordre` 1, 2, 3), `bornes: BorneCalculee[]` (`id`, `donnees`, `position: Point3 | null`, `etiquette` « D (2), Angle sud du parking » quand la lettre a servi plusieurs fois, `active`), `stations: StationCalculee[]` dans l'ordre des numéros (`id`, `numero`, `donnees`, `resultat`, `resultatSans` si `sans_visee`, `retenu: ResultatPosition | null`, `couleur`, `incomplete`), **`pointsCourbes: PointCote[]`** (règle 6.5 : bornes principales et éphémères actives ou retirées, stations vertes et oranges, rouges gardées avec le résultat sans la visée écartée, jamais incomplètes ni écartées, un point par position, une borne éphémère l'emporte sur sa station d'origine ; à passer à `trianguler(points, reglages.coupure)`), `stationsIncompletes`, `prochainNumero` (« S14 »), `etape`.
- Calage sauté : les principales « vérifiées » aux valeurs X, Y, altitude du plan (complètes) ; une station qui vise une borne éphémère est calculée après la station d'origine de cette borne.

### `db/depot.ts` (seul écrivain)
- Domaines et chantiers : `creerDomaine(nom)`, `renommerDomaine(id, nom)`, `supprimerDomaine(id)` (avec ses chantiers et leurs relevés), `creerChantier(domaineId, nom)`, `renommerChantier(id, nom)`, `supprimerChantier(id)`.
- Relevés : `creerReleve(chantierId, { nom, date?, operateurs?, hi?, ht? })` (bornes A, B, C ordre 1, 2, 3, noms vides), `renommerReleve(id, nom, rev)`, `supprimerReleve(id, rev)`, `marquerOuvert(id)` (sans rev), `modifierEntete(id, patch, rev)`, `dupliquerReleve(id)`, `importerReleve(chantierId, sauvegarde, 'remplacer' | 'garder_les_deux')`, `lireSauvegarde(id)`, `verifierSauvegarde(x)`.
- Objets : `ecrireObjets(releveId, objets, rev)`, `ecrireObjet(...)`, `supprimerObjets(releveId, ids, rev)`, `supprimerObjet(...)`, `principales(objets)`.
- Clés : `appareil()`, `lireCle(cle)`, `ecrireVueIntervalle(n)`, `ecrireReglagesDefaut(r)`.
- Erreurs : `ConflitReleve`, `MemoirePleine`, `NomVide`, `ReleveIntrouvable`, `SauvegardeInvalide` ; messages `MESSAGE_CONFLIT`, `MESSAGE_MEMOIRE`, `MESSAGE_NOM_VIDE` ; `executer(f)` (`etat/avis.ts`) les affiche ; `montrerAvis(texte, ton?, duree?)`.
- Autres onglets : `ecouterAutresOnglets(f)` (canal `releve-terrain`). Aides : `dateMadagascar()`, `nouvelId()`, `fusionProfonde()`, `HAUTEUR_DEFAUT`.
- Phase 3 (CC-08) : ajouter ici `marquerEnvoye` et `appliquerServeur`, sans `a_envoyer` ni `rev`.
- Lectures (sans écriture) : `db/lecture.ts` (`listeTerrains`, `lireChantier`, `lireReleve`, `dernierReleve`, `idsReleves`) et le hook `useRequete(cle, requete, relecture?)`.

### Composants (`composants/`, MODÈLE B)
`EnTete {titre, sousTitre?, droite?}` et `BoutonEnTete` · `Bandeau {etat?: 'local'|'tenue'|'ailleurs'|'fin_en_attente'|'reprise', texte?, action?: {libelle, onClick}, compacte?}` · `Etapes {releveId, actuelle, faites, reduite?}` · `BarreBas {releveId, actif, incompletes, calageFait}` · `PastilleLettre {lettre, taille?, usage?}` · `PastilleEtat {couleur: 'vert'|'orange'|'rouge'|'bleu'|'gris', mot?, petite?}` · `ChampNombre {libelle, valeur, onChange, unite?, decimales?, min?, max?, minExclu?, messageHorsLimites?, valider?, autoriserVide?}` et `PaveNumerique {titre, valeurInitiale, unite?, onValider, onAnnuler, ...limites}` (plus `formaterNombre`, `lireNombre`, `verifierValeur`) · `Bouton {variante: 'principal'|'secondaire'|'danger', grand?, pleineLargeur?, icone?}` · `Feuille {ouvert, titre, onFermer}` · `FeuilleMenu {ouvert, titre, onFermer, elements: [{libelle, onClick, danger?}]}` · `Confirmation {ouvert, titre, texte, confirmer, onAnnuler, autre?}` · `Aide {titre}` · `ChampTexte`, `FeuilleNom` · `Icone {nom}` et `Point` · `AvisGlobal` (déjà dans `App`). Échelle d'empilement : en-tête 10, barre du bas 5, feuilles 30, dialogues 40, avis 45, pavé 50.

### Jeux (`etat/jeux.ts`) et page d'essai
`jeu(lettre, variante?)` rend une sauvegarde `.releve.json` ; identifiants lisibles (`A`, `B`, `C`, `D1`, `D2`, `AB`, `S01`...). Numéros : A et A3 « Calage A » (A3 : `variante=cap_inverse` par défaut, `altitude_c`, `sans_cap`) ; A2 « Calage A2 » (sans X ni Y, `cote_c` droite, `variante=sans_cap`) ; B « Stations B » S01 à S08 (bornes vérifiées, calage sauté) ; D « Courbes D » (coupure 100) et D2 « Courbes D2 » (coupure 20), mêmes stations ; C « Défauts C » : E1 = S01, E2 = S02, E4 = S03, E5 = S04 ; F « Stations B F G » : S01 à S08, E4 = S09, D créée depuis S06, S10 à S13 ; G : état de F, D (1) retirée, D (2) « Angle sud du parking » depuis S01. Constante `NUMEROS`.
Page d'essai (serveur de dev seulement, absente du build : grep vide dans `dist/assets/releve`) : `http://localhost:<port>/releve/__essai?jeu=B` (ou `jeu=A3&variante=altitude_c`) charge le jeu dans un nouveau relevé du domaine « Essai », chantier « Jeux du PRD », puis ouvre son étape.

### Serveur de dev depuis un worktree
Les worktrees n'ont pas de `node_modules`. Dans `C:\bazarkely-2-releve-0X\frontend`, au choix : `npm ci` (propre, plusieurs minutes) ou une jonction vers les modules du dépôt principal, valable tant que `package-lock.json` n'est pas modifié : `cmd /c mklink /J node_modules C:\bazarkely-2\frontend\node_modules`. Puis `npx vite --port 3011 --strictPort` (CC-04), `3012` (CC-05), `3013` (CC-06) et ouvrir `http://localhost:301X/releve/`.

### Banc
Build d'abord (`npm run build`), puis :
```
BANC_PORT=4101 BANC_SORTIE=C:\...\captures-cc-04 node scripts/releve-banc.cjs cc04
```
(PowerShell : `$env:BANC_PORT='4101'; $env:BANC_SORTIE='...'; node scripts/releve-banc.cjs cc04`). Ports 4101 (CC-04), 4102 (CC-05), 4103 (CC-06). Le scénario `cc04` est un fichier `scripts/releve-banc-cc04.cjs` qui exporte `executer(banc)` (modèle : `releve-banc-cc03.cjs`). `banc` donne `url()`, `ouvrir({ profil })`, `capturer(page, nom)`, `mesurer(page)`, `attendreHorsLigne(page)`, `injecter(page, { domaines, chantiers, releves, objets })`, `contrastes(page)`, `arreterServeur()` et `demarrerServeur()`. `BANC_PROFIL=<dossier>` : contexte persistant (IndexedDB et service worker gardés d'un lancement à l'autre). Pas de page d'essai en production : injecter les données (exemple complet dans `donneesTerrain()` de `releve-banc-cc03.cjs`).

## Recommandations
1. Corriger la même détection de version en attente dans `business-plan/etat/pwa.ts` (`/plan/`) : condition `reg.waiting && reg.active` et worker de `/plan/` aux commandes.
2. Ajouter, dans la phase d'assemblage (CC-07), une limite d'erreur React autour des écrans (« Un problème est survenu : recharger ») pour qu'une erreur de rendu ou un fichier de code introuvable ne laisse jamais une page vide sur le terrain ; refaire alors au banc un passage de version A à version B.
3. Pour les sessions parallèles : un scénario de banc par session (`releve-banc-cc0X.cjs`), captures dans leur propre dossier, commits de branche avec `[CF-Pages-Skip]`.
4. Faire trancher les limites de hauteur (0 à 5 m) par le porteur si d'autres bornes sont voulues.
