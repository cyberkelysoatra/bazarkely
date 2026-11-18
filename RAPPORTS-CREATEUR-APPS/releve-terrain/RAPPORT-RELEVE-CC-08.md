# RAPPORT RELEVE-CC-08 : compte 1saKELY, envoi au serveur et lecture (phase 3a)

- **Référence :** RELEVE-CC-08 (prompt `gestion-terrassement\PROMPT-RELEVE-CC-08-compte-envoi.md`)
- **Début / fin :** 18/11/2026 21:40 → 22:22 ; durée active ≈ 39 min, plus ≈ 3 min d'attente de la construction Cloudflare (poussé 22:12:50, 3.155.0 servie à 22:15:50)
- **Contexte atteint :** environ 60 %
- **Commit :** `3171e11` feat v3.155.0 sur `cloudflare-migration` (déployé) ; ce rapport commité seul ensuite (`[CF-Pages-Skip]`)
- **Production :** `https://1sakely.org/releve/` sert la **3.155.0**, entrée `releve-BtVo4eQy.js`, identique au build local

## Démarrage (section 1)
- `git pull` : à jour (`dfd4326`). `RAPPORT-RELEVE-CC-01.md` et `RAPPORT-RELEVE-CC-07.md` présents ; aucun prompt RELEVE-CC-11 lancé.
- URL de redirection Supabase Auth : `RAPPORT-RELEVE-CC-01.md` (étape 5) les montre déjà, `https://1sakely.org/releve/**` et `http://localhost:3000/releve/**` (9 → 11) : rien à ajouter.
- Fichiers modifiés avant la session et pas à moi : laissés hors du commit (documents de la racine, autres rapports, `frontend/dev-harness/`, `.playwright-mcp/`).
- Serveurs de dev : un `vite` de ce dépôt tournait déjà sur 3000 (127.0.0.1) et un second sur 3005 ; réutilisés, laissés en marche.
- Skills `supabase`, `supabase-postgres-best-practices`, `react-testing` : présents, non chargés (aucune écriture de schéma, SQL serveur figé, lecture seule par le connecteur ; tests sur le modèle des tests du module).

## Critères d'acceptation

| Critère | État | Preuve |
|---|---|---|
| C1 Intégration contre le vrai SQL dans PGlite | ✅ | `sync/__tests__/sync.test.ts`, **13 tests verts** (détail ci-dessous) ; `rt.sql` = section 5 de `SUPABASE-SQL.md`, md5 sur texte UTF-8, LF, une fin de ligne finale : **`ec258885bc1b26735bfc311fe20299c0`** (contrôlé dans le test) ; stubs de l'atelier copiés tels quels ; SQL joué deux fois ; adaptateur `select public.<fonction>(p_x => $1, ...)` avec `test.uid` |
| C2 Déconnexion refusée avec des lignes en attente | ✅ | `sync/__tests__/deconnexion.test.tsx` : règle (5 lignes → « 5 saisies pas encore envoyées : attendez le réseau ou exportez la sauvegarde », puis permise une fois tout marqué) et menu du haut (« Se déconnecter » refusé, message affiché, session gardée) |
| C3 Banc 412 x 869 | ✅ | `scripts/releve-banc-cc08.cjs` sur le build de production (`vite preview`) : écran 1 capturé ; relevé envoyé (« Tout est envoyé »), mode avion, S01 à S03 du jeu B tapés au pavé : **« 3 saisies en attente d'envoi »**, 0 appel serveur hors réseau ; réseau revenu, envoi sans geste : **« Tout est envoyé »**, serveur simulé a reçu S01, S02, S03 ; liste du chantier : auteur « Banc CC08 » au lieu de « ce téléphone ». Captures `captures-cc-08\01` à `06`, `resultats.json` |
| C4 Vérification en production | ✅ | section « Production » (requêtes et résultats) |
| C5 Non-régression de l'hôte | ✅ | `curl` après déploiement : `/` 200, `/plan/` 200, `/validation/` 200, `/pudi/` 200 (et `/releve/`, `/releve/connexion` 200) |
| C6 Types, build, tests | ✅ | compteur `tsc -p tsconfig.app.json` : **1910 avant, 1910 après**, **0** erreur dans `src/modules/releve-terrain/` ; `npm run build` OK ; `npx vitest run src/modules/releve-terrain` : **28 fichiers, 230 tests verts** (211 avant + 19) |
| C7 Rapport | ✅ | ce fichier |

### C1, scénario par scénario (PGlite, comptes P, R, C, N des stubs)
| Scénario | Ce qui est prouvé |
|---|---|
| md5 et rejeu | md5 conforme, 31 fonctions `rt_*` après deux exécutions |
| DR6 | R reçoit Chantier 1 « relever » ; 3 stations écrites sans réseau (repère : 3) ; la 1re réponse de `rt_envoyer` est perdue APRÈS écriture (délai dépassé) : lignes gardées « à envoyer », renvoi : **3 stations sur le serveur, pas 6** ; lignes « envoyées » ; P lit les 3 ; la révision n'a pas bougé et une écriture d'écran avec l'ancienne révision passe |
| Ordre | coupure sur `rt_domaine_enregistrer` : aucun autre appel (le chantier reste « à envoyer ») ; avec réseau, ordre exact `rt_domaine_enregistrer`, `rt_chantier_enregistrer`, `rt_releve_creer`, `rt_envoyer`, `rt_domaine_supprimer` ; 1004 objets partent en lots de 500, 500, 4, par heure de saisie croissante, 1004 sur le serveur |
| DR18 | relevé R2 et S01 créés sans réseau ; après l'envoi : `serveur_connu`, saisie « ici » ; chez P, `saisie.user_id` = R et l'appareil de R, S01 présente |
| DR11 | partage du domaine entier à R, puis retrait : Chantier 1 et son relevé envoyé **disparaissent** du téléphone ; le relevé de Chantier 2 qui garde une ligne en attente **reste, en lecture** (`saisie = 'lecture'`, 1 ligne en attente), son envoi suspendu par `DROIT_RETIRE` ; les 4 stations déjà envoyées restent sur le serveur |
| Réponses vides, partielles, en échec | rien n'est retiré |
| DR14 | second téléphone vide du même compte, autre identité : domaine, chantier, relevé, en-tête et objets identiques, saisie « ailleurs » (tenue par le 1er), `nb_stations` 3, lu à jour de la dernière donnée |
| D28 | données sans compte rattachées au premier compte **avec les mêmes identifiants** (serveur : propriétaire P, relevé tenu par P, 6 objets) ; identifiant refusé (`RT_NON_PROPRIETAIRE`, domaine de même id chez C) : nouveaux identifiants pour le domaine et tous ses enfants, liens des visées gardés, objet journal `ids_renouveles`, renvoi complet, domaine de C intact, cas dans `journal_envoi` |
| Suppression refusée | P supprime un chantier où R tient un relevé : `RT_RELEVE_TENU_AILLEURS`, chantier et relevé **restaurés** sur le téléphone, rien de supprimé sur le serveur ; message « En saisie sur le téléphone de r depuis le JJ/MM à HH:MM. » ; cas au journal |
| Délai puis nouvel essai | 1er appel en échec : lignes gardées ; 2e : tout part ; délais 5, 10, 20, 40, 60, 60 s ; un appel qui pend est coupé à 10 s |

## Production (section 5)
Chrome, deux navigateurs connectés ; « Browser 1 » (`909e8779-…`) sélectionné et confirmé **CyberKELY SOATRA** sur la page du compte Google, pas « ITAMPOLO NosyBe ». Aucun identifiant saisi.
1. Avant l'essai (lecture seule) : `rt_domaines`, `rt_chantiers`, `rt_releves`, `rt_objets`, `rt_appareils`, `rt_journal` = **0** partout.
2. `https://1sakely.org/releve/` : **connecté sans rien taper** (session de 1sakely.org reprise, pas d'écran 1). Le téléphone gardait les restes locaux des essais CC-03 et CC-07 (deux domaines supprimés, jamais envoyés, « 12 saisies en attente ») : rattachés au compte, suppressions soldées (`RT_INCONNU`), bandeau « Tout est envoyé ». Bannière « Nouvelle version disponible » touchée ; page sur `releve-BtVo4eQy.js`.
3. Domaine « ESSAI CC-08 », chantier « Chantier CC-08 », relevé « Releve CC-08 », 3 bornes (noms, X, Y, altitudes) tapées au pavé, « Bornes déjà calées » ; S01 à S03 du jeu B : S01 (19,993 ; 0,006 ; 33,274, indice 1,55, VERT), S03 (39,998 ; −0,002 ; 28,455, VERT) ; bandeau « Tout est envoyé » après chaque station.
4. Requête (connecteur, lecture seule) :
   - `rt_domaines` : `8688fac5-…` « ESSAI CC-08 », propriétaire `5020b356-…` (compte de Joël)
   - `rt_chantiers` : `e96dc415-…` « Chantier CC-08 », domaine `8688fac5-…`
   - `rt_releves` : `08083fae-…` « Releve CC-08 », `cree_par` et `detenteur_user` = `5020b356-…`, **`detenteur_appareil` = `19ede904-…` = l'appareil de ce navigateur** (`rt_appareils`, libellé « Windows »)
   - `rt_objets` : borne 3, station 3 (S01, S02, S03), journal 1 (calage sauté)
5. Renvoi forcé : les 3 stations remises « à envoyer » sur le téléphone, puis événement `online` : `recu_at` des 3 passé de 19:18:02 / 19:18:23 / 19:18:42 à **19:19:14** (UTC) ; `count(*)` stations = **3**, numéros distincts = 3 : **aucun doublon**.
6. Domaine supprimé dans l'application (confirmation « 1 relevé sera supprimé avec lui ») : serveur `supprime_at = 2026-11-18 19:19:56` sur le domaine, le chantier et le relevé (saisie libérée), journal `chantier_supprime`, `domaine_supprime`.
7. Nettoyage par identifiants, enfants d'abord : 7 `rt_objets`, 1 `rt_releves`, 1 `rt_chantiers`, 1 `rt_domaines`, 3 `rt_journal` (29, 30, 31). Recompte : objets 0, relevés 0, chantiers 0, domaines 0, journal 0 ; **`rt_appareils` 1 gardée** (ce navigateur).
8. `public.users.preferences` de Joël : `modules` = `["bazarkely","construction","gestion-eau","validation","releve"]`, `moduleOrder` intact (`rt_ouvrir`, attendu).
9. Onglet fermé, groupe vide.

## Ce qui a été construit
- **Compte (F11, H23)** : client Supabase chargé à la demande, même projet et même clé de session que l'hôte (`sync/client.ts`, `sync/session.ts`, modèle Validation). Écran 1 « Connectez-vous » (`ecrans/Connexion.tsx`) : « Continuer avec Google » (retour à la page demandée), « Se connecter par e-mail » (formulaire sur place). Porte (`App.tsx`) : écran 1 seulement avec réseau et sans session ; sans réseau ou avec une session, rien n'est demandé (3 tests `porte.test.tsx`).
- **Moteur (`sync/moteur.ts`)** : `rt_ouvrir` au premier cycle de la page (nouvelle identité si `RT_APPAREIL_AUTRE_COMPTE`), rattachement D28, envoi, lecture ; déclencheurs : démarrage, `online`, 2 s après une écriture (nombre de lignes en attente qui monte), retour au premier plan, 60 s visible et en ligne, connexion ; verrou `navigator.locks` `'releve-envoi'` ; 10 s par appel ; reprise 5 s doublée jusqu'à 60 s.
- **Envoi (`sync/envoi.ts`)** : ordre fixe, lots de 500, en-tête avec le premier lot quand la ligne du relevé attend ; réponses `DROIT_RETIRE`, `SAISIE_REPRISE`, `PAS_LA_SAISIE`, `EN_SAISIE`, `apres_reprise: true` : relevé suspendu (`lecture`, `reprise`, `ailleurs`), lignes gardées, ligne neutre « Envoi suspendu pour ce relevé » dans le bandeau.
- **Lecture (`sync/lecture.ts`)** : `rt_mes_terrains` vérifié (réponse complète seulement pour retirer), `rt_releve_lire` pour les relevés non tenus ici, et à l'ouverture d'un tel relevé (`useReleve`).
- **`db/depot.ts`** : `marquerEnvoye` (seulement si `maj_at` inchangé, jamais `rev`), `appliquerServeur` (jamais `a_envoyer`, jamais une ligne en attente écrasée, jamais `rev` d'un relevé tenu ici ; retrait DR11 qui garde en lecture ce qui attend ; restauration après refus), plus `rattacherAuCompte`, `renouvelerIdsDomaine`, `renouvelerIdsReleve`, `ajouterJournalEnvoi`, `poserCompte`, `renouvelerAppareil`.
- **Écrans** : repère du bandeau (relevé : lignes du relevé ; accueil et chantier : tout le téléphone), auteur dans la liste du chantier, « Se déconnecter » / « Se connecter » dans le menu du haut, suppression refusée d'avance quand un relevé est tenu par un autre téléphone.

## Fichiers
**Créés** : `sync/client.ts`, `sync/session.ts`, `sync/rpc.ts`, `sync/envoi.ts`, `sync/lecture.ts`, `sync/moteur.ts`, `sync/messages.ts`, `sync/regles.ts`, `sync/__tests__/rt.sql`, `sync/__tests__/stubs.sql`, `sync/__tests__/serveur.ts`, `sync/__tests__/sync.test.ts`, `sync/__tests__/deconnexion.test.tsx`, `sync/__tests__/porte.test.tsx`, `ecrans/Connexion.tsx`, `etat/useEnvoi.ts`, `frontend/scripts/releve-banc-cc08.cjs`, `captures-cc-08\` (6 captures, `resultats.json`).
**Modifiés** (module) : `App.tsx`, `main.tsx`, `composants/Bandeau.tsx`, `db/depot.ts`, `db/lecture.ts`, `db/types.ts`, `ecrans/Accueil.tsx`, `ecrans/CadreReleve.tsx`, `ecrans/Chantier.tsx`, `ecrans/MenuHaut.tsx`, `ecrans/MenuTerrain.tsx`, `ecrans/saisir/Cadre.tsx`, `etat/useReleve.ts`.
**Partagés** : `frontend/package.json`, `package-lock.json` (version 3.155.0, PGlite), `src/constants/appVersion.ts` (entrée « Relevé terrain : compte 1saKELY, envoi au serveur et lecture (RELEVE-CC-08) »), `CLAUDE.md` (ligne `releve` du tableau « Accès aux modules »).
**Dépendance ajoutée** : `@electric-sql/pglite` ^0.5.16 (développement seulement).

## Itérations
1. Tests d'intégration verts du premier coup (13/13).
2. Test du menu : le rôle des lignes est `menuitem`, pas `button` ; et le `localStorage` du montage global est un faux vide : un vrai en mémoire dans les deux fichiers de test.
3. Contrôle de types : 3 erreurs dans mon code (transaction Dexie à 5 tables passée en tableau, conversion d'objet) : corrigées, compteur revenu à 1910.
4. Revue du build : la chaîne `/__essai` s'était glissée dans l'entrée de production (garde de la porte) : rendue dépendante du mode développement, absente de `dist`.
5. Banc : sur l'écran Saisir, après « Station suivante », la page avait défilé et le bandeau passait sous l'en-tête collant dans la capture : capture prise après retour en haut (comportement existant, voir recommandations).

## Écarts au prompt
1. `depot.ts` reçoit, en plus des deux fonctions demandées, les écritures nécessaires à D28 et au compte (`rattacherAuCompte`, `renouvelerIds*`, journal, compte, appareil) : `depot.ts` reste le seul écrivain de la base.
2. Les domaines partagés avec le compte sont lus et gardés (droit compris) mais ne s'affichent pas encore dans « Mes terrains » : la section « Partagés avec moi » est de la phase 4.
3. Après un refus de suppression, le domaine ou le chantier restauré garde son état « à envoyer » et repart au cycle suivant (enregistrement rejouable, sans effet) ; un relevé restauré et déjà connu du serveur repasse « envoyé ».
4. Le compteur du bandeau compte les objets en attente du relevé, ou 1 quand seule la ligne du relevé attend (renommage, suppression) : sinon 3 stations auraient affiché 4.
5. Noms tronqués à 80 caractères à l'envoi (le serveur refuse au-delà, le téléphone en accepte 120).
6. Banc C3 sur un serveur simulé (aucune donnée envoyée à Supabase depuis le banc) avec une session fabriquée (jamais un vrai jeton) ; le vrai serveur est prouvé par C1 (PGlite) et C4 (production).

## Surprises
- `apres_reprise: true` : le serveur a accepté les données, mais le prompt demande de garder les lignes « à envoyer » ; c'est fait (renvoi sans doublon), RELEVE-CC-09 décidera de l'accusé de reprise.
- Le service hors ligne de Joël tenait encore la 3.154.0 : bannière « Nouvelle version disponible » légitime, touchée.
- Le serveur ne rend pas l'identifiant du propriétaire d'un domaine partagé (seulement son nom) : le téléphone note `proprietaire = 'partage'`.

## Recommandations pour RELEVE-CC-09
1. Saisie : prendre, terminer (`rt_saisie_terminer` en dernier de la file), reprendre, données tardives, accusé `rt_reprise_accuser`, et sortie des états suspendus (`lecture`, `reprise`, `ailleurs`) ; aujourd'hui un relevé suspendu ne repart que si le serveur le rend tenu par cet appareil.
2. Écrans en lecture seule pour `saisie` ≠ `ici` (et droit `consulter`) : le moteur refuse déjà d'envoyer, mais les écrans laissent encore écrire localement.
3. Ajouter `releve` au sélecteur de l'hôte (`moduleAccess.ts`, `modulePrefsSync.ts` qui doit absorber `releve` posé par le serveur).
4. Bandeau caché sous l'en-tête collant après « Station suivante » sur l'écran Saisir (vu au banc) : remonter en haut, ou rendre le bandeau collant avec l'en-tête.
5. Déconnexion : les données du compte restent sur le téléphone ; décider s'il faut les effacer une fois tout envoyé.
6. Garder `scripts/releve-banc-cc08.cjs` (14 s) comme non-régression de l'envoi.
