# RAPPORT RELEVE-CC-09 : saisie (prendre, terminer, reprendre, données tardives, droit retiré) et sélecteur de modules (phase 3b)

- **Référence :** RELEVE-CC-09 (prompt `gestion-terrassement\PROMPT-RELEVE-CC-09-saisie.md`)
- **Début / fin :** 18/11/2026 22:46 → 23:50 ; durée active ≈ 58 min, plus ≈ 6 min d'attente des deux constructions Cloudflare
- **Contexte atteint :** environ 75 %
- **Commits :** `20a1082` feat v3.156.0 (poussé 23:29, servi 23:32) puis `f08670f` fix v3.156.1 (poussé 23:42, servi 23:45), sur `cloudflare-migration` ; ce rapport et les captures commités seuls ensuite (`[CF-Pages-Skip]`)
- **Production :** `https://1sakely.org/releve/` sert la **3.156.1**, entrée `releve-C6VG-ueI.js`, identique au build local

## Démarrage (section 1)
- `git pull` : à jour (`ee55fe0`). `RAPPORT-RELEVE-CC-08.md` présent.
- Fichiers modifiés avant la session et pas à moi (documents de la racine, autres rapports, `frontend/dev-harness/`, `.playwright-mcp/`) : laissés hors des commits.
- Serveurs de dev : `vite` déjà en marche sur 3000 et 3005 ; réutilisés, laissés en marche.
- Compteur de types au départ : **1910**.
- Skills `supabase` et `react-testing` présents, non chargés : appels serveur faits sur le modèle de RELEVE-CC-08 (SQL figé, md5 inchangé), tests sur le modèle des tests du module.

## Critères d'acceptation

| Critère | État | Preuve |
|---|---|---|
| C1 Intégration contre le vrai SQL (PGlite) | ✅ | `sync/__tests__/saisie.test.ts`, **8 tests verts** (détail ci-dessous), fixture de RELEVE-CC-08 (`rt.sql` md5 `ec258885…`, stubs P, R) |
| C2 Tests de composants | ✅ | `ecrans/saisie/__tests__/lecture-seule.test.tsx`, **13 tests verts** : 6 états du bandeau (sans compte, tenue avec et sans attente, sur une ligne, ailleurs, autre téléphone du même compte, libre et refus hors réseau, fin en attente, reprise, droit retiré) ; écrans 6, 7, 10, 12 en lecture seule, barre sans Saisir ; écran 8 renvoyé vers l'écran 14, dialogue de 6.10 ; écran 14 sans « Reprendre » pour un invité ; garde de `depot.ts` |
| C3 `moduleAccess` et non-régression de l'hôte | ✅ | `moduleAccess.test.ts` **30 verts** (6 nouveaux : `['releve']`, `['validation','releve']`, `['releve','bazarkely']`, `['validation']` inchangé, admin, jamais module de démarrage) ; production : `/` 200, `/plan/` 200, `/validation/` 200, `/pudi/` 200, `/releve/` 200 |
| C4 Banc 412 x 869 | ✅ | `scripts/releve-banc-cc09.cjs` sur le build de production, serveur simulé, session fabriquée : écran 14 (`01`), avertissement (`02`), écran 15 (`03`, 4 pastilles), station S05 avec la pastille (`04`), carte (`05`, 4 anneaux jaunes), écran 13 hors réseau (`06`, 0 appel), retour du réseau : `rt_saisie_terminer` puis « Saisie libre » (`07`), commutateur (`08`) ; 0 erreur de page ; captures `captures-cc-09\`, `resultats.json`. Comparées aux maquettes 13, 14, 15 : mêmes blocs, couleurs du bandeau de DESIGN, aspect MODÈLE B |
| C5 Vérification en production | ✅ | section « Production » |
| C6 Types, build, tests | ✅ | compteur `tsc -p tsconfig.app.json` : **1910 avant, 1910 après**, **0** erreur dans les fichiers touchés ; `npm run build` OK ; `npx vitest run src/modules/releve-terrain` + `moduleAccess` : **31 fichiers, 280 tests verts** (puis 281 avec le cas ajouté au correctif) |
| C7 Rapport | ✅ | ce fichier |

### C1, scénario par scénario (deux téléphones : le Dexie du test et un second qui agit sur le serveur avec son propre appareil)
| Scénario | Ce qui est prouvé |
|---|---|
| DR3 + DR4 | R crée et tient R1 ; chez P : `ailleurs`, détenteur R, « En saisie sur le téléphone de r depuis le JJ/MM à HH:MM. » ; P « Prendre la saisie » : refusé avec ce message, serveur inchangé ; sans réseau : message de H27 ; écriture refusée par `depot.ts` |
| DR7 | une station puis « Terminer » en mode avion : `fin_en_attente`, relevé tenu sur le serveur ; réseau revenu : appels exactement `rt_envoyer` puis `rt_saisie_terminer`, détenteur null, station reçue, téléphone « libre » ; P prend la saisie, R la voit « ailleurs » |
| DR8 | R tient R1, S04 et S05 en mode avion ; P reprend ; R saisit S06 et S07 ; un cycle de R : les 4 stations sur le serveur avec `apres_reprise`, `ancien_clos` vrai, R en `reprise`, S08 refusée (« Saisie reprise par le propriétaire : ce relevé est en lecture seule. »), le serveur répond `SAISIE_REPRISE` |
| DR8 sans attente | R n'a rien en attente ; il apprend la reprise en lisant, appelle `rt_reprise_accuser`, passe en lecture seule |
| DR8 côté propriétaire (ajouté au correctif) | P a repris ; R envoie S04 et S05 tardives ; au cycle suivant, P les a sur son téléphone, marquées, P écrit toujours (S06 non marquée) |
| DR8b | R tente de reprendre R1 tenu par P : « Seul le propriétaire du domaine peut reprendre la saisie. », serveur inchangé |
| DR10 | droit passé en « consulter » pendant que R tient avec 1 station en attente : saisie libérée, R en `lecture`, la station reste en attente sur le téléphone et dans sa sauvegarde, jamais sur le serveur, même au cycle suivant ; écriture refusée |
| Même compte, deux téléphones | B prend la saisie : A lit « En saisie sur votre autre téléphone, Téléphone B test, depuis le JJ/MM à HH:MM. » ; le propriétaire reprend depuis A, écrit, la station part non marquée |

## Production (section 5)
Chrome, deux navigateurs connectés ; « Browser 2 » (`909e8779-…`, en usage) confirmé **CyberKELY SOATRA** sur la page du compte Google, pas « ITAMPOLO NosyBe ». Aucun identifiant saisi, aucun jeton lu. Téléphone B = même compte, appareil `9e9069f9-…`, chaque appel en un bloc `begin; set_config('request.jwt.claims', …); set local role authenticated; select public.rt_…; commit;`.
1. Avant (lecture seule) : domaines, chantiers, relevés, objets, journal **0** ; `rt_appareils` 1 (ce navigateur, `19ede904-…`).
2. `/releve/` connecté sans rien taper, entrée `releve-CPjMpvPn.js` (3.156.0) ; bannière de mise à jour touchée ; logo devenu « Changer de module ».
3. A : domaine « ESSAI CC-09 », « Chantier CC-09 », relevé « Releve CC-09 » créés dans l'application : bandeau « Vous tenez la saisie / Tout est envoyé / Terminer la saisie » ; serveur : `detenteur_appareil` = `19ede904-…`. « Terminer la saisie » : écran de saisie, bandeau « Saisie libre ».
4. B : `rt_ouvrir('9e9069f9-…', 'Téléphone B test')` → `ok`, puis `rt_saisie_prendre` → `{"ok": true}` ; serveur : détenteur B, libellé « Téléphone B test ».
5. A, **sans recharger** (relecture des 30 s) : bandeau « En saisie sur votre autre téléphone, Téléphone B test, depuis le 18/11 à 23:34. », barre « Carte, Résultats » (pas de Saisir), bloc « Reprendre la saisie ».
6. A : « Reprendre la saisie » : dialogue « La saisie est tenue par votre autre téléphone, Téléphone B test depuis le 18/11 à 23:34 ; ce qu'il n'a pas encore envoyé arrivera plus tard. La reprendre ? » (capture `prod-01`) ; confirmé : A tient la saisie ; serveur : détenteur A, `ancien_appareil` B, `ancien_clos` faux, `reprise_at` 20:35:15 UTC.
7. B : `rt_envoyer` de S01 et S02 → `{"ok": true, "recus": 2, "apres_reprise": true}`, puis `rt_reprise_accuser` → `ok` ; serveur : 2 stations `apres_reprise` vrai, `ancien_clos` vrai.
8. **A ne les montrait pas** (voir Surprises) : correctif 3.156.1 déployé. Après mise en ligne : écran Saisir de A « 2 stations arrivées après reprise : à garder ou à écarter, S01 arrivé après reprise, S02 arrivé après reprise » (capture `prod-02`), S01 ouverte : « Station S01, arrivé après reprise, INCOMPLÈTE ».
9. Sélecteur de l'hôte (compte admin) : entrée « Sélectionner Relevé terrain » présente.
10. A « Terminer » : bandeau « Saisie libre » ; serveur : **`detenteur_user`, `detenteur_appareil`, `detenteur_depuis` = null**.
11. Domaine supprimé dans l'application (confirmation), puis suppression par identifiants, enfants d'abord : 5 `rt_objets`, 1 `rt_releves`, 1 `rt_chantiers`, 1 `rt_domaines`, 7 `rt_journal` (32 à 38), l'appareil B. Recompte : domaines 0, chantiers 0, relevés 0, objets 0, journal 0, **`rt_appareils` 1 = `19ede904-…` (A, gardé)**.
12. Onglet fermé, groupe vide.

## Ce qui a été construit
- **Bandeau (3.1)** : `composants/Bandeau.tsx` (états `tenue`, `ailleurs`, `libre`, `fin_en_attente`, `reprise`, `retire`, seconde ligne), logique dans `etat/useEnvoi.ts` (`useBandeauReleve`, `useActionsSaisie`) : textes exacts du prompt, une ligne sur l'écran 8 (D21).
- **Actions (3.2)** : `sync/saisie.ts` (`prendreSaisie`, `reprendreSaisie`, `terminerSaisie`) ; `depot.demanderFinSaisie` ; `sync/envoi.ts` : fin de saisie en dernier de la file, données tardives envoyées puis `rt_reprise_accuser`, réponses `SAISIE_REPRISE` et `DROIT_RETIRE` ; `sync/lecture.ts` et `depot.saisieDepuisServeur` : reprise apprise en lisant (`reprise_at` et autre détenteur), relevé gardé en lecture après un droit retiré tant qu'une ligne attend ; `moteur.cycle` renvoie aussitôt après une reprise apprise en lisant.
- **Lecture seule (6.8)** : garde dans `depot.ts` (`SaisieNonTenue`, `saisieTenueIci`) sur toute écriture d'écran, l'import « remplacer » et la fin de saisie ; `sync/` exempté ; préférence d'intervalle libre. Écrans : barre du bas sans Saisir, `LectureSeule` (champ désactivé) sur 6, 7, 10 et, sur 12, points du plan et réglages (exports et intervalle permis) ; écran 8 renvoie vers `/r/:id/saisie`.
- **Écrans 13 et 14** : `ecrans/saisie/EcranSaisie.tsx` (fin de journée, relevé tenu ailleurs, reprise par le propriétaire avec le dialogue, prise de saisie, reprise subie, droit retiré).
- **Données tardives (écran 15)** : `apresReprise` dans `releveCalcule`, pastille « arrivé après reprise » (écrans 8, 9, liste des tardives), anneau jaune sur la carte, CSV « Note » commençant par « arrivé après reprise ».
- **Accueil** : « Reprendre » montre le relevé tenu par CE téléphone. **H29** : relecture toutes les 30 s d'un relevé tenu ailleurs (visible et en ligne).
- **Hôte (3.3)** : entrée `releve` du sélecteur, `lightEntryRedirect` (D27), icône (carré noir, montagne jaune), jamais `lastModule` ; `CLAUDE.md` ; dans `/releve/`, logo = commutateur (`sync/modules.ts`, `composants/Commutateur.tsx`) avec une première tuile « Mes terrains ».

## Fichiers
**Créés** : `sync/saisie.ts`, `sync/modules.ts`, `composants/Commutateur.tsx`, `ecrans/saisie/EcranSaisie.tsx`, `ecrans/saisie/__tests__/lecture-seule.test.tsx`, `sync/__tests__/saisie.test.ts`, `frontend/scripts/releve-banc-cc09.cjs`, `captures-cc-09\` (8 captures du banc, 2 de production, `resultats.json`).
**Modifiés (module)** : `composants/Bandeau.tsx`, `BarreBas.tsx`, `EnTete.tsx`, `Pastilles.tsx`, `db/depot.ts`, `db/lecture.ts`, `db/types.ts`, `ecrans/CadreReleve.tsx`, `ecrans/saisir/Cadre.tsx`, `ecrans/saisir/Saisir.tsx`, `ecrans/station-rouge/StationRouge.tsx`, `ecrans/bornes/EcranBornes.tsx`, `ecrans/calage/EcranCalage.tsx`, `ecrans/resultats/Resultats.tsx`, `ecrans/carte/VueCarte.tsx`, `ecrans/registre-stations.ts`, `etat/avis.ts`, `etat/releveCalcule.ts`, `etat/useEnvoi.ts`, `etat/useReleve.ts`, `exports/csv.ts`, `sync/envoi.ts`, `sync/lecture.ts`, `sync/messages.ts`, `sync/moteur.ts`.
**Nœuds centraux de l'hôte (strictement additifs, conditionnés)** ⚠️ : `src/contexts/ModuleSwitcherContext.tsx`, `src/modules/navy-ay/utils/moduleAccess.ts` (+ test), `src/modules/navy-ay/services/modulePrefsSync.ts` (garde `lastModule`), `src/components/Navigation/BottomNav.tsx`, `CLAUDE.md`, `src/constants/appVersion.ts`, `frontend/package.json`.

## Itérations
1. C1 vert du premier coup (7 tests).
2. C2 : `navigator.onLine` non redéfinissable dans le montage global (affectation directe, comme `porte.test.tsx`) ; le dialogue est un `alertdialog` ; l'écran 10 n'a aucun contrôle dans son contenu en lecture seule (seul le pied fixe, désormais caché).
3. Contrôle de types : 1 erreur (`n` possiblement indéfini) corrigée ; un bandeau « Saisie libre. Lecture seule. » apparaissait un instant avant le compte des lignes : remplacé par un neutre « Lecture seule. ».
4. Banc : hors réseau, sans service hors ligne (bloqué au banc), le morceau de l'écran 13 ne se charge pas : chargé avant de couper le réseau (en usage réel, `precache.json` le contient).
5. Liste des tardives placée sous les champs (visible seulement en défilant) : remontée au-dessus, comme la maquette 15.
6. **Production** : le propriétaire détenteur ne recevait pas les tardives ; correctif 3.156.1 et test C1 ajouté (voir Surprises).

## Écarts au prompt
1. Deux déploiements (3.156.0 puis 3.156.1) au lieu d'un : correctif trouvé par la vérification en production.
2. « Terminer la saisie » reste possible d'écrire pendant `fin_en_attente` (le relevé est encore tenu, comme la maquette 13 qui garde Saisir) ; la fin part toujours après la dernière ligne.
3. État « droit retiré » affiché pour un relevé en lecture qui garde des lignes en attente ; un invité « consulter » sans ligne en attente voit « Saisie libre. Lecture seule. » ou le détenteur.
4. Un relevé `reprise` redevient `libre` quand le propriétaire a terminé et que l'accusé est fait (le téléphone peut alors reprendre la saisie normalement).
5. Commutateur du module : barre en bas sans entrée d'historique (le retour du téléphone ne la ferme pas) ; Échap et toucher dehors la ferment ; tuile « Mes terrains » ajoutée en tête pour ne pas perdre le retour aux terrains.
6. Écran 14 : un invité « relever » voit « Prendre la saisie » seulement quand le relevé est libre.

## Surprises
- **Données tardives invisibles chez le nouveau détenteur** : la lecture serveur ne relisait jamais les objets d'un relevé tenu ici ; or après une reprise c'est le propriétaire, détenteur, qui doit recevoir les stations de l'ancien téléphone. Les tests et le banc ne l'avaient pas montré (propriétaire simulé par accès direct au serveur ; serveur simulé ajoutant les stations avant la lecture). Corrigé : un relevé tenu ici est relu quand `reprise_at` est posé et qu'une donnée nouvelle est arrivée (une ligne en attente n'est jamais écrasée).
- Avertissement de reprise pour l'autre téléphone du même compte : virgule manquante après le libellé, corrigée en 3.156.1.
- Le sélecteur propre au module Validation (`modules/validation/utils/modulesCompte.ts`) ne connaît pas encore `releve` : pour `['validation', 'releve']`, il montrerait NAVY ay et PUDi dans `/validation/`. Non touché (hors périmètre).

## Recommandations pour RELEVE-CC-10
1. Mettre `modulesCompte.ts` de Validation (et PUDi) à jour pour D27 (`releve` connu, liste faite seulement de modules légers).
2. Faire valider par Joël, sur un vrai téléphone, l'avertissement et l'écran 15 ; les tardives se gardent ou s'écartent par les actions existantes (H10) : écran 9 pour une station orange ou rouge, à vérifier pour une station verte tardive en doublon.
3. Banc : faire arriver les tardives après la reprise (lecture suivante) pour couvrir le chemin corrigé en 3.156.1.
4. Garder `scripts/releve-banc-cc09.cjs` (37 s) comme non-régression de la saisie.
5. Section « Partagés avec moi » (phase 4) : l'écran 14 et le bandeau sont prêts pour un invité, mais les domaines partagés ne s'affichent pas encore dans « Mes terrains ».
