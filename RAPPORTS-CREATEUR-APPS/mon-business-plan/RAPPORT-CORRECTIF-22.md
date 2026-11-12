# RAPPORT NEC-CC-22 : post-test dans l'app, ouvert à distance par le formateur, onglet Évaluation

**Référence :** NEC-CC-22 (PRD édition suivante v0.8, section 4.7 ; lot 2, sections 3 et 4 ; histoires NEC-90 à NEC-97)
**Version livrée :** 3.147.0, commit `76bd965` sur `cloudflare-migration`, en ligne sur 1sakely.org/plan (bundle et « À propos » vérifiés)
**Début :** 12/11/2026, attente de la fin de NEC-CC-21 (garde du prompt) jusqu'à 18 h 56, puis travail de 18 h 56 à 19 h 35
**Durée active :** environ 40 minutes (hors attente de NEC-CC-21)
**Fenêtre de contexte :** non mesurée précisément ; une seule session, sans résumé intermédiaire

## Itérations et erreurs notables
1. Une apostrophe dans une chaîne entre apostrophes (`Formateur.tsx`) a cassé la compilation : vue au compteur de types, corrigée avant tout commit.
2. Un test d'export appelait `planExemple` comme un objet (c'est une fonction) : corrigé au deuxième essai.
3. Preuve à 412 px de l'onglet Évaluation : Chrome sous Windows refuse une fenêtre plus étroite que 472 px, l'intégration dans un cadre est bloquée (protection anti-intégration), une fenêtre surgissante s'arrête à 378 px. Preuve faite à **378 px** (plus étroit que 412) et à 549 px, voir écarts.
4. La lecture du presse-papiers depuis la page déclenche une demande d'autorisation : le texte copié a été lu dans le presse-papiers Windows.

## Critères
| N° | Critère | État | Preuve |
|---|---|---|---|
| 1 | SQL appliqué, contrôles REST, NEC2026 fermé à la fin | ✅ | Migration `20261112190000_nec_posttest.sql` exécutée (connecteur Supabase). Clé anonyme : `bp_admin_posttest`, `bp_admin_etat_session`, `bp_admin_evaluation` refusées (42501) ; `bp_lire_pretest` avec un faux jeton : `JETON` ; lecture directe de `bp_sessions` et `bp_plans` refusée (42501). Fin : NEC2026 `posttest_ouvert = false`, `posttest_ouvert_at` nul. |
| 2 | Session et plans de test | ✅ | Session `TESTCC22` créée en SQL ; plans « TEST-CC22-A » (pré-test app 9/15, jeu du lot 2) et « TEST-CC22-B » (sans pré-test) rejoints depuis le navigateur intégré (autre profil, 412 px, `innerWidth` = 412). |
| 3 | Verrouillé | ✅ | Carte « Mon post-test » non cliquable avec cadenas et « Le formateur l'ouvrira en fin de formation. » ; l'adresse `/p/:id/posttest` n'affiche que ce message (0 question). `c3-url-posttest-verrouille.jpg` |
| 4 | Ouverture à distance, puis fermeture | ✅ | Chrome de Joël, session déjà ouverte : « Ouvrir le post-test » + confirmation ; le téléphone A, en ligne sur son sommaire, a vu la carte s'ouvrir en **38 s**. Après fermeture par le formateur (serveur `false`) : carte toujours ouverte en ligne après rechargement, puis hors ligne. `c4-*.jpg` |
| 5 | Post-test A et B | ✅ | A, toutes bonnes, partie C remplie : tableau **9 → 15, gain +6** ; B : 10 → 20, +10 ; corrigé des 15 questions avec réponse au pré-test, au post-test, bonne réponse et explications existantes (module 5 compris). Après « Terminer » (confirmation) : formulaire disparu, même après rechargement (figé). B : 12/15 et 14/24, gain « non calculable » avec la phrase d'explication. `c5-*.jpg` |
| 6 | Écran formateur et Évaluation | ✅ (412 px : voir écarts) | Étiquettes « post-test fait » sur A et B à côté de « pré-test app ». Évaluation : A 9, 15, +6, 10, 20, +10 ; B -, 12, non calc., -, 14, non calc. ; Moyenne 9, 13,5, +6, 10, 17, +10 ; taux par question (ex. Q3 100 % → 50 %) ; satisfaction 3,5 / 3 / 3 / 3 / 3,5, générale 3,2 ; deux commentaires avec prénoms ; indicateurs : progressent 1 sur 1 (gain B : 1), plans complets 0 sur 2 (règle U3 : les deux plans de test sont vides ; le cas positif est couvert par les tests unitaires). Tout vérifié à la main. « Copier pour WhatsApp » : « Texte copié. », presse-papiers conforme, sans tiret cadratin, demi-cadratin ni point médian. Page du participant : bloc Post-test avec scores et gains. Téléphones : `innerWidth` 412, aucun défilement horizontal. Évaluation : pas de défilement de la page à 378 px (358 = 358), le tableau défile dans sa propre boîte (520 > 300). `c6-*.jpg` |
| 7 | Hors ligne | ✅ (mode avion simulé) | Post-test A fait avec le réseau coupé dans la page (`navigator.onLine` faux + tout appel réseau en échec) : enregistré, résultats affichés, lien « en attente », serveur sans post-test ; réseau rendu : envoi en quelques secondes, post-test présent au serveur puis dans l'Évaluation. |
| 8 | PDF et texte WhatsApp sans post-test | ✅ | Plan A en production : texte copié (85 caractères) sans post-test ; PDF téléchargé (51 ko) décompressé dans la page : texte lisible (couverture, plan d'action), aucune trace de « post-test », de la réponse « Ce qui m'a le plus servi » ni de « Ce qu'il faudrait améliorer ». Plus un test unitaire sur `sectionsPdf`, `resumePdf` et `texteWhatsApp`. `export/contenu.ts` liste les champs un par un : aucune exclusion à ajouter. |
| 9 | Nettoyage | ✅ | Plans A et B retirés par « Retirer » (0 restant), session TESTCC22 et leurs 2 pierres tombales supprimées en SQL par identifiants. NEC2026 : mêmes 9 plans, `posttest_ouvert = false`. Code mémorisé du Chrome de Joël remis à `NEC2026`. |
| 10 | Tests et types | ✅ | `npx vitest run src/modules/business-plan` : 18 fichiers, **203 tests verts** (13 nouveaux : scores, gains, U2, U3, U4 « non calculable », jeu du lot 2 9/15, 15/15, gain 6, corrigé, ouverture jamais annulée, évaluation à 3 participants au centième, texte WhatsApp propre, absence à l'export). Compteur de types : **1910 avant, 1910 après**, 0 erreur dans le module. `npm run build` OK. |

## Fichiers
Créés :
- `supabase/migrations/20261112190000_nec_posttest.sql` (**migration**, appliquée en production)
- `frontend/src/modules/business-plan/utils/posttest.ts` (fonctions pures : scores, gains, corrigé, évaluation, texte WhatsApp)
- `frontend/src/modules/business-plan/utils/posttest.test.ts`
- `frontend/src/modules/business-plan/pages/Posttest.tsx` (`/p/:id/posttest`)
- `frontend/src/modules/business-plan/pages/Evaluation.tsx` (`/formateur/evaluation`)

Modifiés (ajouts seulement) :
- `types.ts` (`Posttest`, `posttest?`, `posttestOuvertLe?`)
- `utils/pretest.ts` (exporte `bonneReponse` et `explicationsQuestion`, mêmes textes qu'avant)
- `sync/index.ts` (`recupererPretest` lit aussi `posttest_ouvert` ; plus d'appel quand le pré-test app est fait ET le post-test déjà vu ouvert)
- `etat/usePlan.ts` (garde `posttestOuvertLe` en mémoire ; pas de nouvelle sauvegarde quand seule l'ouverture a changé)
- `sync/formateur.ts`, `pages/Formateur.tsx`, `pages/FormateurPlan.tsx`, `pages/Sommaire.tsx`, `pages/Pretest.tsx` (exporte `Choix`), `composants/Icones.tsx` (icône cadenas), `App.tsx` (2 routes, Évaluation déclarée avant `/formateur/:planId`)
- Partagés : `frontend/src/constants/appVersion.ts`, `frontend/package.json` (3.147.0)

## Écarts
- **412 px de l'Évaluation** : impossible d'obtenir exactement 412 px dans le Chrome de Joël (minimum 472 px pour une fenêtre normale, 378 px pour une fenêtre surgissante). Prouvé à 378 et 549 px ; la page est fluide, 412 est entre les deux.
- **Mode avion** : simulé dans la page (le navigateur intégré n'a pas de mode avion) ; même chemin de code que le vrai (`navigator.onLine`, échec réseau, événement `online`).
- **Pré-test de référence côté formateur** : celui du plan ; à défaut, le pré-test papier saisi par le formateur mais pas encore reçu par le téléphone (cohérent avec 4.7 « app ou papier saisi par le formateur »).
- **Partie A** sur une seule page, comme le pré-test (le prompt dit « sur le modèle de `Pretest.tsx` »), et non « une question par écran » du lot 2.
- « Terminer » demande les 15 réponses, les 6 lignes B et les 5 lignes C ; les deux textes sont facultatifs.
- `impeccable` : passe de finition bornée (contexte chargé, mode Operate, cible 412 px) ; rien à reprendre, charte NEC respectée.

## Surprises
- La fermeture du post-test laisse `posttest_ouvert_at` à l'heure de la dernière ouverture (voulu par le SQL du prompt) ; l'écran formateur n'affiche l'heure que lorsque le post-test est ouvert.
- Un vrai participant de NEC2026 a continué à travailler pendant les tests (révision 1091 → 1155) : sans lien avec ce chantier.
- Le Chrome de Joël a affiché « Nouvelle version : toucher pour mettre à jour » sur un onglet chargé avant le déploiement : mise à jour normale (NEC-CC-21).

## Points absents du prompt
- Rien sur l'ordre de tri de l'Évaluation (par prénom, comme le serveur) ni sur le format des nombres (virgule française, au centième).
- Le niveau de départ par étape (Rapide, Ciblé, Bases) demandé par 4.7 pour l'onglet Évaluation n'est pas dans les critères du prompt : non ajouté au tableau (il reste visible sur la page de chaque participant).
- Pas de bouton « Télécharger le fichier » (CSV) de NEC-96 : non demandé par ce prompt.

## Recommandations
- Le 14/11 : rejoindre la session sur chaque téléphone avant 16 h 45 et laisser le sommaire ouvert au moment de l'ouverture (la carte s'ouvre en moins d'une minute, en ligne).
- Ouvrir le post-test seulement au moment voulu : un téléphone qui l'a vu ouvert le garde, même si le formateur le referme.
- Après la séance, ajouter si besoin le niveau de départ par étape et l'export CSV dans l'onglet Évaluation.
