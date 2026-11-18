# RAPPORT RELEVE-CC-10 : partage (invitation WhatsApp, qui a accès, partagés avec moi, droits à l'écran), phase 4

- **Référence :** RELEVE-CC-10 (prompt `gestion-terrassement\PROMPT-RELEVE-CC-10-partage.md`)
- **Début / fin :** 19/11/2026 00:08 → 00:46 ; durée active ≈ 31 min, plus ≈ 7 min d'attente de la construction Cloudflare (poussé 00:32, 3.157.0 servie 00:39)
- **Contexte atteint :** environ 70 %
- **Commit :** `607a629` feat v3.157.0 sur `cloudflare-migration` ; ce rapport, la fiche de recette et les captures commités seuls ensuite (`[CF-Pages-Skip]`)
- **Production :** `https://1sakely.org/releve/` sert la **3.157.0**, entrée `releve-BsLJYwJA.js`, identique au build local

## Démarrage (section 1)
- `git pull` : à jour (`382de4a`). `RAPPORT-RELEVE-CC-09.md` présent.
- Fichiers modifiés avant la session et pas à moi (documents de la racine, autres rapports, `.playwright-mcp/`) : laissés hors du commit.
- Serveur de dev : démarré et laissé en marche (3000 était pris, il tourne sur **3001**).
- Compteur de types au départ : **1910**.
- Skills : `supabase` et `react-testing` présents, non chargés (SQL serveur figé, appels sur le modèle de CC-08 et CC-09). `impeccable` présent, non chargé : la finition des écrans 16 à 18 a été faite à la main d'après `DESIGN-RELEVE-MODELE-B.md`, en comparant les captures du banc aux maquettes.

## Critères d'acceptation

| Critère | État | Preuve |
|---|---|---|
| C1 Intégration contre le vrai SQL (PGlite) | ✅ | `sync/__tests__/partage.test.ts`, **9 tests verts** (détail ci-dessous), fixture de CC-08 (`rt.sql` md5 `ec258885…`), uniquement par les fonctions du module (`sync/partage.ts`, `sync/lecture.ts`, `db/depot.ts`, `db/lecture.ts`) |
| C2 Tests de composants des droits | ✅ | `ecrans/partage/__tests__/droits.test.tsx`, **4 tests verts** : propriétaire (⋯ du domaine et du chantier complets, « + Nouveau relevé », écrans 16 et 17 ouverts, chantier présélectionné, refus sans réseau) ; « relever » (« Partagés avec moi » et sa pastille, ⋯ réduit à « Ouvrir une sauvegarde ici », ⋯ d'un relevé : « Dupliquer » seul pour celui du propriétaire, « Supprimer » pour le sien, « Prendre la saisie » offert, routes 16 et 17 : « Réservé au propriétaire du domaine. ») ; « consulter » (ni « + Nouveau relevé » ni ⋯, barre sans Saisir, pas de « Prendre la saisie », écran 6 en lecture seule, création et réimport refusés, routes gardées) ; écran 18 (aperçu, « Se connecter et accepter » garde le jeton puis va à la connexion, lien usé) |
| C3 Banc 412 x 869 | ✅ | `scripts/releve-banc-cc10.cjs` sur le build de production, serveur simulé, session fabriquée, faux jeton : accueil avec « Partagés avec moi » (`01`), écran 16 (`02`, `03` message préparé, texte exact reçu par le menu de partage, jeton absent du stockage), écran 17 (`04`, `05` invitation en attente, `06` confirmation « Changer le droit »), écran 18 sans session (`07`, `08` lien usé, puis clic : `/releve/connexion?retour=%2Finvitation`, jeton gardé pour le retour). Largeur de page 412 partout, 0 erreur de page. Comparé aux maquettes 16, 17, 18 et à la rubrique de `Main.dc.html` : mêmes blocs et mêmes textes, habillage MODÈLE B (cadres noirs 3 px, bouton jaune, pastilles vert « relever » et gris « consulter » avec leur mot) |
| C4 Vérification en production | ✅ | section « Production » ; `curl` : `https://1sakely.org/releve/i/essai` 200 `text/html` avec les balises `og:` (titre « Relevé terrain : invitation », description, image 1200 x 630, texte de l'image), `og-releve-v1.png` 200 `image/png` ; hôte : `/`, `/plan/`, `/validation/`, `/pudi/`, `/releve/` en 200 |
| C5 Fiche de recette de Joël | ✅ | `RECETTE-JOEL-JEU-H.md` : comptes P, R, C, N, deux téléphones, DR1 à DR18 et DR8b avec téléphone, compte, ce qu'il faut voir et cases à cocher ; une ligne facultative pour l'outil Facebook ; 0 tiret cadratin, demi-cadratin ou point médian (contrôlé) |
| C6 Types, build, tests | ✅ | compteur `tsc -p tsconfig.app.json` : **1910 avant, 1910 après**, **0** erreur dans les fichiers touchés ; `npm run build` OK ; `npx vitest run src/modules/releve-terrain` : **32 fichiers, 264 tests verts** (avec `navy-ay/utils` : 42 fichiers, 425 tests) |
| C7 Rapport | ✅ | ce fichier |

### C1, scénario par scénario
| Scénario | Ce qui est prouvé |
|---|---|
| Message | texte exact du prompt (chantiers « A et B », « tout le domaine » pour le domaine entier), aucun tiret ni point médian |
| DR1 + DR2 | aperçu anonyme (De P, Domaine 1, Chantier 1, relever) ; R voit Chantier 1 seul en « relever », rien dans « Mes terrains », propriétaire « P » ; C voit Chantier 1 et 2 en « consulter », domaine entier ; N ne voit rien ; Chantier 4 créé ensuite : C le voit, R non |
| DR5 | C : création refusée sur le téléphone et par le serveur (`RT_DROIT_INSUFFISANT`), relevé de R en `lecture`, station refusée, « Prendre la saisie » refusé, duplication refusée ; sauvegarde de R1 exportée avec sa station |
| DR9 | R supprime R1 (serveur : `supprime_at` posé) ; le relevé de P refusé sur le téléphone (« Vous ne pouvez supprimer que les relevés que vous avez créés. ») et par le serveur |
| DR11 | partage retiré : réponse vide mais complète, le domaine partagé disparaît du téléphone de R qui n'a aucun domaine à lui ; la station envoyée reste sur le serveur |
| DR12 | R ne peut pas créer d'invitation (« Réservé au propriétaire du domaine. ») ni lire « Qui a accès » ; C ne peut ni renommer ni supprimer Chantier 2, ni renommer le domaine, ni créer un chantier (téléphone et serveur) |
| DR13 | lien déjà accepté : N reçoit le message exact « Invitation plus valable... » ; aperçu non valable ; P et sa propre invitation : « C'est votre propre invitation. » ; invitation en attente visible dans « Qui a accès » puis retirée : plus valable |
| DR15 + DR16 | domaine entier « relever » + Chantier 2 « consulter » : Chantier 1 et 4 relevables, Chantier 2 en lecture ; « Qui a accès » : « Sur Chantier 2, r ne fait que consulter : le partage du chantier passe avant celui du domaine. » ; retrait du partage de Chantier 2 : retour à « relever » ; changement du droit du domaine aller et retour |
| DR17 | invitation datée de 30 jours : aperçu valable, acceptée, chantier visible |

## Production (section 5)
Chrome, deux navigateurs connectés ; « Browser 2 » (`909e8779-…`, en usage) confirmé **CyberKELY SOATRA** sur la page du compte Google, pas « ITAMPOLO NosyBe ». Aucun identifiant saisi, aucun jeton de session lu, le jeton d'invitation jamais affiché ni écrit dans ce rapport.
1. Avant (lecture seule) : 1 domaine, 1 chantier, 1 relevé, 1 ligne de journal (`ITAMPOLO [BeFefiky]`, données réelles de Joël, jamais touchées), 0 invitation, 0 partage, 3 appareils.
2. `/releve/` connecté sans rien taper, entrée `releve-BsLJYwJA.js` ; bannière de mise à jour touchée.
3. Domaine « ESSAI CC-10 », chantiers « Chantier un » et « Chantier deux » créés dans l'application ; ⋯ du domaine : « + Nouveau chantier, Partager ce domaine, Qui a accès, Renommer le domaine, Supprimer le domaine ».
4. Écran 16 depuis le chantier : « Chantier deux » coché, « Relever » ; le menu de partage du navigateur remplacé dans l'onglet par une fonction qui garde le texte (rien n'est parti vers personne). Message : « *RELEVÉ TERRAIN : INVITATION* / Je vous partage Chantier deux (ESSAI CC-10), droit « relever ». Ouvrez ce lien et connectez-vous à 1sakely.org : https://1sakely.org/releve/i/<jeton> », sans tiret ; jeton absent du stockage du navigateur.
5. Lien copié par le bouton « Copier » de l'écran, passé à Playwright par un fichier temporaire (effacé ensuite) : contexte **sans session** : « De Joël SOATRA, Domaine ESSAI CC-10, Chantier Chantier deux, Droit relever » (capture `prod-01`).
6. « Qui a accès » : « Invitation en attente, Chantier deux, relever, Envoyée le 19/11/2026 à 00:42, pas encore acceptée. » ; « Retirer l'invitation » confirmé : « Ce domaine n'est partagé avec personne pour le moment. » ; serveur : invitation `retiree`.
7. Même lien rouvert sans session : « Invitation plus valable : elle a déjà été acceptée ou elle a été retirée. Demandez-en une nouvelle au propriétaire. » (capture `prod-02`).
8. Domaine supprimé dans l'application (confirmation), puis suppression par identifiants, enfants d'abord : 1 `rt_invitations`, 2 `rt_chantiers`, 1 `rt_domaines`, 4 `rt_journal` (40 à 43). Recompte : domaines 1, chantiers 1, relevés 1, invitations 0, partages 0, journal 1, appareils 3 (état d'avant), **« ESSAI CC-10 » : 0**.
9. Onglet fermé, groupe vide.

## Ce qui a été construit
- **`sync/partage.ts`** : `creerInvitation`, `apercuInvitation`, `accepterInvitation`, `lireAcces` (regroupé par compte, lignes « le plus précis l'emporte »), `modifierPartage`, `retirerPartage`, `retirerInvitation`, texte du message, messages d'erreur.
- **Écran 16 `/d/:domaine/partager`** (`ecrans/partage/Partager.tsx`) : cases, droit, note de cumul, envoi d'abord du domaine et des chantiers s'ils ne sont pas encore sur le serveur, puis menu de partage, sinon `wa.me`, sinon presse-papiers ; message préparé avec « Envoyer » et « Copier » ; jeton seulement en mémoire de l'écran.
- **Écran 17 `/d/:domaine/acces`** (`Acces.tsx`) : comptes, lignes et pastilles, phrase de 6.8, « Changer le droit » (confirmation vers « consulter »), « Retirer » (confirmation), invitations en attente, « + Partager encore ».
- **Écran 18 `/i/:jeton`** (`Invitation.tsx`) : aperçu anonyme, « Se connecter et accepter » (jeton gardé dans `localStorage` le temps de la connexion, retour par `/invitation`, effacé après la réponse), « Accepter l'invitation » avec une session ; puis un cycle de synchronisation et l'accueil sur `#partages`. La porte laisse passer `/i/` sans session.
- **Gardes (`commun.tsx`)** : routes 16 et 17 réservées au propriétaire du domaine.
- **Accueil** : rubrique « Partagés avec moi » (propriétaire, « tout le domaine », chantiers avec pastille, ⋯ seulement quand il a un contenu).
- **Droits à l'écran (6.8)** : `MenuTerrain` (éléments selon le droit), `Chantier` (« + Nouveau relevé », ⋯ du chantier et des relevés).
- **Droits sur le téléphone** (`db/depot.ts`, `DroitInsuffisant`, `droitLocal`) : création, duplication et réimport refusés en « consulter » ; renommer, supprimer un domaine ou un chantier et créer un chantier réservés au propriétaire ; « relever » supprime seulement ses relevés. Le serveur reste la vraie protection.
- **Lecture** : `domaine_entier` gardé (`partage_entier`) ; une réponse complète mais vide retire les domaines partagés (jamais ceux du compte).
- **`og:`** de `frontend/releve/index.html` : titre, description, texte de l'image.

## Fichiers
**Créés** : `sync/partage.ts`, `ecrans/partage/Partager.tsx`, `Acces.tsx`, `Invitation.tsx`, `commun.tsx`, `ecrans/partage/__tests__/droits.test.tsx`, `sync/__tests__/partage.test.ts`, `frontend/scripts/releve-banc-cc10.cjs`, `captures-cc-10\` (8 captures du banc, 2 de production, `resultats.json`), `RECETTE-JOEL-JEU-H.md`.
**Modifiés (module)** : `App.tsx`, `composants/Pastilles.tsx`, `db/depot.ts`, `db/lecture.ts`, `db/types.ts`, `ecrans/Accueil.tsx`, `ecrans/Chantier.tsx`, `ecrans/MenuTerrain.tsx`, `etat/avis.ts`, `sync/lecture.ts`.
**Partagés** : `frontend/releve/index.html`, `src/constants/appVersion.ts`, `frontend/package.json` (3.157.0).

## Itérations
1. C1 vert du premier coup (9 tests).
2. Contrôle de types : une apostrophe droite remplacée dans une chaîne entre apostrophes cassait `partage.ts` ; corrigé, compteur revenu à 1910.
3. C2 : « Prendre la saisie » apparaît deux fois pour un relevé libre (bandeau et écran 14) : requête multiple dans le test.
4. Production : `git push` tombé sur une coupure DNS, repassé au second essai. La copie du lien par script attendait une autorisation du presse-papiers : passée par le bouton « Copier » de l'écran.

## Écarts au prompt
1. Dans « Qui a accès », « Changer le droit » et « Retirer » sont sous **chaque ligne** (domaine entier ou chantier), pas une fois par compte comme sur la maquette : un compte peut avoir plusieurs lignes, chacune a son droit.
2. Passer de « consulter » à « relever » se fait sans confirmation (rien ne se perd) ; seul le passage vers « consulter » demande la confirmation du prompt.
3. Phrase de 6.8 en « relever » : écrite mot pour mot « ne fait que relever », comme le demande le prompt.
4. « Tout le domaine » dans le message WhatsApp : « Je vous partage tout le domaine (<domaine>) ».
5. Le titre `og:` de toute la page `/releve/` devient « Relevé terrain : invitation » (une seule page pour toutes les adresses du module).
6. Écran 16 : si le domaine ou les chantiers choisis ne sont pas encore sur le serveur, un cycle d'envoi part d'abord ; s'ils n'y sont toujours pas : « Ce domaine n'est pas encore sur le serveur : attendez le réseau... ».
7. Lien d'aperçu Facebook laissé à Joël (ligne facultative de la fiche).

## Surprises
- **Retrait muet** : un compte qui n'avait que des domaines partagés gardait le domaine après un retrait, car une réponse vide ne retirait jamais rien (protection de CC-08). Corrigé : une réponse complète et vide retire seulement les domaines partagés, jamais ceux du compte ; prouvé par DR11.
- Le serveur ne donne pas l'identifiant du propriétaire d'un domaine partagé, seulement son nom : « Propriétaire : <nom> ».
- « Qui a accès » met environ 3 s à s'afficher la première fois (ouverture du compte par `rt_ouvrir` avant le premier appel).
- La base contient un domaine réel de Joël, « ITAMPOLO [BeFefiky] » (créé le 18/11 à 21:11 UTC) : vu, jamais touché.

## Ce qui reste pour le lot 2
1. Recette de Joël sur deux téléphones avec la fiche `RECETTE-JOEL-JEU-H.md` (DR1 à DR18), en particulier le retour de la connexion Google avec un compte neuf.
2. Sélecteur propre au module Validation (`modulesCompte.ts`) qui ne connaît pas encore `releve` (relevé par CC-09, toujours ouvert).
3. Essai réel de deux « Prendre la saisie » simultanés (verrou serveur non essayé en PGlite).
4. Éventuel nom de compte plus lisible dans « Qui a accès » quand le compte Google n'a pas de nom (aujourd'hui le début de l'e-mail).
5. Garder `scripts/releve-banc-cc10.cjs` (9 s) comme non-régression du partage.
