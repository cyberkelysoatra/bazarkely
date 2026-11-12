# RAPPORT NEC-CC-21 : B-lossom sur la couverture, correction du pré-test papier, mise à jour sans geste (v3.146.0)

- **Référence :** NEC-CC-21 (histoires PRD NEC-171, NEC-170, NEC-172)
- **Début :** 12/11/2026 18 h 24 · **Fin :** 18 h 55 · **Durée active :** environ 31 min
- **Fenêtre de contexte :** une seule, sans résumé intermédiaire
- **Commit :** `31470c3` sur `cloudflare-migration`, en ligne à 18 h 45 sur https://1sakely.org/plan/ (bundle `plan-CsCPLUd_.js`, contient 3.146.0 ; « À propos » affiche « Version 3.146.0 »)

## Critères

| # | Critère | Résultat |
|---|---|---|
| NEC-171 | Couverture : « Organisé par B-lossom Center » sous « NOSY BE ENTREPRENEURSHIP CAMP 2026 », rien d'autre ; page 2 « Mon projet en une page » | ✅ Nouveau test `export/pdf.test.ts` : un vrai PDF est fabriqué par `creerPdf`, ses pages sont décompressées et lues. Page 1 contient le nom du camp puis la ligne (dans cet ordre), sans lieu, sans tiret ni point médian ; page 2 contient « Mon projet en une page ». Style repris de `f8a1f4f` (11 pt, gris doux). Le bloc commence 5 mm plus haut pour que le reste de la couverture garde sa place. |
| NEC-170 tests | Correction adoptée si `le` plus récent ; ignorée si égal ou plus ancien ; effacement ; pré-test app gardé ; vieux plan sans `recuLe` | ✅ 7 tests ajoutés à `utils/pretestFormateur.test.ts` (15 tests dans le fichier). |
| NEC-170 bout en bout | Téléphone (serveur de dev, 412 px) avec pré-test papier 13/15, correction 15/15 reçue en moins de 60 s avec la mention ; pré-test app inchangé | ✅ Formateur en production (Chrome de Joël, session existante), téléphone = Playwright sur `127.0.0.1:3000`. 13/15 posé à 15:47:49 UTC, reçu à 15:48:10 (**21 s**). L'écran formateur montre alors la grille pré-remplie (21 réponses), la ligne « Pré-test papier reçu par le téléphone. Ta correction le remplacera à sa prochaine ouverture en ligne. » et « Effacer ». Correction 15/15 à 15:48:38, reçue à 15:49:10 (**32 s**), carte « Ton pré-test papier a été ajouté par le formateur · Ton parcours : 15/15 ». « Effacer » à 15:49:22, téléphone revenu à « Fais ton pré-test » à 15:50:09 (**47 s**). Plan APP (3/15 validé dans l'app) avec un pré-test papier 15/15 posé sur le serveur : toujours 3/15 après plus de 90 s en ligne ; formateur : « Pré-test : 3/15 », « Fait dans l'app », pas de grille. `innerWidth` 412, pas de défilement horizontal. |
| NEC-170 nettoyage | Plans TEST-CC21 retirés par « Retirer » | ✅ 2 plans retirés depuis la liste formateur ; `bp_plans` : 0 ligne TEST-CC21, 9 plans NEC2026 (les vrais, intacts), 2 pierres tombales. |
| NEC-172 (a) | Page ouverte sur A, B mis en ligne, passe seule à B sans toucher | ✅ Build de production servi en local (A puis B = même code, version « 3.145.0-B »), 412 px. Passage à B en **9,0 s** (délais de test : vérification 5 s, inactivité 8 s), page rechargée seule, aucune erreur. |
| NEC-172 (b) | Saisie en cours quand B arrive : pas de rechargement pendant la saisie, texte gardé | ✅ 46 caractères tapés pendant 55 s (un toutes les 1,2 s) dans la fiche d'identité : aucun rechargement, bandeau « Nouvelle version » visible ; passage à B 9,6 s après la dernière frappe ; texte complet présent après le passage. |
| NEC-172 (c) | Hors ligne au moment de la vérification : aucune erreur, passage après `online` | ✅ 25 s hors ligne avec B en ligne : aucune erreur, reste en A ; retour réseau → B en **4,0 s**. |
| NEC-172 (d) | Mode avion après le passage | ✅ Après le passage à B, hors ligne : accueil et sommaire d'un plan s'ouvrent depuis le cache, version B. |
| Qualité | Compteur de types ; tests ; build | ✅ 1910 avant, 1910 après, zéro erreur dans les fichiers du chantier. `npx vitest run src/modules/business-plan` : 17 fichiers, 190 tests verts. `npm run build` OK. |

## Fichiers
- **Créé :** `export/pdf.test.ts`
- **Modifiés (module) :** `export/pdf.ts`, `types.ts`, `utils/pretest.ts`, `utils/pretestFormateur.test.ts`, `sync/index.ts`, `pages/FormateurPlan.tsx`, `etat/pwa.ts`, `etat/usePlan.ts` (partagé par tous les écrans du plan), `App.tsx`
- **Partagés hors module :** `frontend/src/constants/appVersion.ts`, `frontend/package.json` (3.146.0)
- **Non touché :** `public/plan/sw.js`
- **Captures et bancs :** `21-captures/` (`banc-maj.cjs`, `banc-telephone.cjs`, `telephone.log`, captures 412 px et formateur)

## Écarts
1. **`reg.update()` seul ne voit jamais une nouvelle version** : l'adresse du service worker porte le nom du fichier d'entrée (`sw.js?v=...`) et `sw.js` ne change pas d'un déploiement à l'autre. La vérification lit donc aussi `/plan/` sur le réseau (avec un paramètre qui évite le cache du worker) et, si le fichier d'entrée diffère, enregistre la nouvelle adresse du worker ; `reg.update()` reste appelé sinon. C'est la cause probable des 4 téléphones restés en ancienne version le 12/11 (le bandeau n'apparaissait qu'après un rechargement de la page).
2. **`sync/index.ts` : deux gardes adaptées** en plus du passage de `le` (sinon la correction n'était jamais demandée) : la récupération continue quand le pré-test local vient du formateur, et une réponse `pretest: null` est transmise (effacement).
3. **`usePlan.ts`** : la garde « validé sur ce téléphone entre-temps » ne s'applique plus à un pré-test venu du formateur (sinon la correction était réécrite par l'ancienne version) ; chaque enregistrement est suivi par la mise à jour, qui l'attend avant de recharger.
4. **Écran formateur** : la règle des 60 s sans saisie ne déclenche pas la mise à jour sur `/plan/formateur` (la grille papier non enregistrée serait perdue en rechargeant) ; arrière-plan et changement de page la déclenchent.
5. **Bandeau « Nouvelle version »** : il enregistre maintenant la saisie avant de recharger.
6. **Effacement** : seul un pré-test reçu avec `recuLe` (donc depuis v3.146.0) est retiré ; un pré-test reçu en v3.145.0 se corrige, mais ne s'efface pas (règle du prompt).
7. **Test bout en bout** : le formateur a agi en production (seul endroit où sa session existe), le téléphone sur le serveur de dev ; mêmes fonctions serveur. Le plan APP a été coupé de Supabase pendant la pose du pré-test papier pour reproduire « pré-test app + pré-test papier sur le serveur ».

## Surprises
- Le port 4180 était déjà pris par un autre programme (il servait la page de l'hôte) : premier essai du banc (a) faux négatif, refait sur le port 4191.
- L'écran formateur du Chrome de Joël était encore en 3.145.0 avec le bandeau en attente : exactement le cas réglé ici.
- La dernière capture du banc téléphone a dépassé son délai (page en arrière-plan) ; toutes les observations étaient déjà dans `telephone.log`.

## Ce qui manquait dans le prompt
- Le fait que l'adresse du worker change à chaque version (donc que `reg.update()` ne suffit pas).
- Le cas de l'écran formateur (grille non enregistrée) face à la règle des 60 s.

## Recommandations
- Ce soir, les téléphones ouverts en 3.145.0 n'ont pas encore ce mécanisme : ils passeront en 3.146.0 à leur prochain rechargement (ou au bandeau), puis se mettront à jour seuls ensuite.
- Pour une correction de pré-test reçu avant 3.146.0 qu'il faut effacer : poser d'abord une correction (le téléphone prend `recuLe`), puis effacer.
