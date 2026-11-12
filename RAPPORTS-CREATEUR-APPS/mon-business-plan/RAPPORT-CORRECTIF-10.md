# Rapport NEC-CC-10 : Mon Business Plan, confidentialité exacte, « Retirer » et « Tout effacer » côté formateur

Réf. NEC-CC-10, version **3.142.0**, commit `0796371` sur `cloudflare-migration`, en ligne à 13:39 (12/11/2026) : fichier servi `plan-DPT2zxuL.js`, identique au build local, « Version 3.142.0 » affichée dans À propos en production.

## ⚠️ À lire d'abord : 6 projets de NEC2026 retirés pendant les tests, depuis un téléphone Android
- Avant les tests, NEC2026 comptait **13** projets. À la fin : **7**, et 6 pierres tombales (`bp_plans_retires`) de NEC2026.
- Les journaux de l'API Supabase montrent 6 appels `bp_admin_retirer` entre **13:45:36 et 13:46:18** (heure de Madagascar), un toutes les 6 à 12 secondes, venant d'un **téléphone Android** (`Linux; Android 10`), même réseau et même région (Vakinankaratra) que le poste de test, avec une **autre session** que celle du Chrome Windows piloté (empreinte de jeton `ckkuZz` contre `UZYODz`).
- Aucune de mes actions ne visait NEC2026 : l'écran formateur que je pilotais était sur TESTCC10 (code mémorisé changé avant d'ouvrir l'écran, remis à NEC2026 à la fin), et mes bancs Playwright étaient soit anonymes, soit entièrement simulés (aucun appel au serveur).
- **Confirmé par Joël le 12/11/2026 : ces 6 retraits étaient voulus.** Rien à remettre.
- Conclusion : retrait fait à la main par le formateur sur son téléphone, avec la nouvelle fonction, juste après la mise en ligne. **Rien n'a été remis** : ce serait contredire une décision du formateur, et les contenus effacés ne peuvent de toute façon pas être reconstitués côté serveur. Les participants concernés gardent leur projet sur leur téléphone ; leur pastille dira « Envoi refusé : projet retiré par le formateur ».
- Si ces retraits n'étaient pas voulus : les projets restent sur les téléphones, mais ne pourront plus être renvoyés tant que leur pierre tombale existe. Il suffirait de supprimer ces 6 lignes de `bp_plans_retires` (identifiants listés en annexe) pour que le prochain envoi de chaque téléphone les recrée.

## Déroulement
- Début 13:20, fin 13:55, durée active environ 35 min. Une seule session, sans reprise, fenêtre de contexte non atteinte.
- Aucune question posée, **un seul déploiement**, bâti sur `60ec934` (v3.141.0, NEC-CC-17) : aucun fichier du module n'était en cours de modification au départ, rien de 3.135.1 à 3.141.0 n'a été défait.
- Serveur de dev : le port 3000 était occupé par un autre processus (réponse « Upgrade Required », pas un Vite) ; serveur lancé sur **3001** et laissé tourner.

## Ce qui a changé
- **Serveur** (`supabase/migrations/20261112000000_nec_retrait_effacement.sql`, exécuté par le connecteur Supabase puis rejoué depuis le fichier commité, empreinte md5 contrôlée, procédure P23) : table `bp_plans_retires` (RLS activée et forcée, aucun droit client), `bp_envoyer` refuse un projet retiré (`RETIRE`, après les contrôles de session), `bp_admin_retirer` et `bp_admin_effacer_session` (garde `is_joel()`, exécution réservée à `authenticated`), tâche `bp-purge` qui efface aussi les pierres tombales des sessions purgées.
- **À propos** : deux cartes, « Vos données restent sur votre téléphone » et « Si vous rejoignez la formation » (Quand, Quoi, À qui, Comment arrêter, plus la phrase sur WhatsApp, PDF et sauvegarde). Date unique `DATE_PURGE = '31/12/2026'` (lue sur `bp_sessions.purge_le` de NEC2026) dans `composants/Confidentialite.tsx`, qui porte aussi le texte commun.
- **Rejoindre la formation** : nouveau texte d'accord ; explication « Ce qui est envoyé, et comment l'arrêter » **dépliable sur place** (un lien vers `/a-propos` aurait perdu le code et le prénom tapés, état React non mémorisé), même texte que la carte À propos.
- **Téléphone** (`sync/index.ts`) : `RETIRE: 'projet retiré par le formateur'` ; un lien refusé `RETIRE` n'est plus envoyé (`signalerModification`, `relancer` et `envoyer` sortent sans requête). « Arrêter l'envoi » inchangé.
- **Écran formateur** : bouton « Retirer » (icône poubelle, 44 px, hors des liens) sur chaque carte, confirmation dans la carte, carte retirée tout de suite, liste rechargée, message d'échec sinon ; les projets retirés sont écartés même d'un rafraîchissement lancé avant le retrait. Encadré de session : texte de fermeture complété, ligne « Les projets reçus sont effacés automatiquement le 31/12/2026. », bouton « Tout effacer » (contour couleur alerte, grisé si la liste est vide), confirmation avec le nombre, message « N projets effacés. ». Une seule confirmation ouverte à la fois ; le rafraîchissement de 15 s n'en ouvre ni n'en ferme aucune.
- **Projet retiré ouvert par le formateur** : « Ce projet a été retiré. » avec le retour « Participants ».

## Critères d'acceptation
| Critère | Résultat | Preuve |
|---|---|---|
| C1. Avant de rejoindre, aucune requête vers Supabase | ✅ | Chrome, dev : plan neuf, nom du projet et nom saisis, 8 s d'attente, journal réseau filtré `supabase.co` vide. |
| C2. À propos : deux cartes, textes exacts, vraie date ; plus de « Rien n'est envoyé sur internet » | ✅ | Texte lu dans la page (dev et production) ; `grep` du module : aucune occurrence. |
| C3. Formation : nouveau texte, explication, case obligatoire, « Travailler seul » n'envoie rien | ✅ | Code et prénom tapés, explication dépliée : valeurs gardées ; « Rejoindre » sans case : « Cochez la case d'accord pour rejoindre la formation. » ; après « Travailler seul » et saisie, zéro requête. Lien de 44 px. |
| C4. Deux projets dans TESTCC10, visibles côté formateur | ✅ | « Test A » (Zoto) et « Test B » (Bema) rejoints en dev, liste formateur en production : 2 participants. Contenu serveur sans téléphone. Capture `c4-formateur-deux-projets-prod.jpg`. |
| C5. Retirer « Test B » | ✅ | Texte : « Retirer « Bema, Test B » ? Le projet est effacé du serveur et ne sera plus accepté. Il reste sur le téléphone du participant. » ; carte disparue (1 participant) ; SQL : ligne absente, pierre tombale présente. Capture `c5-confirmation-retirer-prod.jpg`. |
| C6. « Test B » modifié : `RETIRE`, pastille, plus de requête, pas de retour de la carte | ✅ | 1 seul `bp_envoyer` après la modification, réponse `RETIRE` ; ensuite lieu, secteur et rechargement : zéro requête ; pastille « Envoi refusé : projet retiré par le formateur » ; écran formateur : 3 chargements en 36 s, carte jamais revenue. Capture `c6-pastille-retire.jpg`. |
| C7. Tout effacer | ✅ | Avec 1 projet : « Effacer définitivement le projet de la session TESTCC10 ? ... », liste vide, session fermée, « 1 projet effacé. », bouton grisé ; « Test A » modifié : `SESSION_FERMEE` ; après « Rouvrir » : `RETIRE`, ne réapparaît pas. Avec 2 projets : texte exact « Effacer définitivement les 2 projets de la session TESTCC10 ? ... », « 2 projets effacés. ». Captures `c7-*.jpg`. |
| C8. Projet retiré ouvert côté formateur | ✅ | `/plan/formateur/<id de Test B>` en production : « Ce projet a été retiré. » et le lien « Participants », pas de plantage. Capture `c8-plan-retire-prod.jpg`. |
| C9. Sécurité anonyme | ✅ (voir écart 2) | REST avec la clé publique seule : lecture de `bp_plans_retires`, `bp_admin_retirer`, `bp_admin_effacer_session` → 401, `42501 permission denied`. Utilisateur connecté qui n'est pas le formateur (transaction annulée) : `NON_AUTORISE` pour les deux fonctions. `anon` garde l'exécution de `bp_envoyer`. |
| C10. Hors ligne | ✅ | Banc Playwright sur la production, réseau coupé (`setOffline`) : À propos s'ouvre avec ses deux cartes et la version 3.142.0 ; « Arrêter l'envoi » hors ligne mis en file (`nec.retraits`), rejoué au retour du réseau (`bp_retirer` 200), file vidée, ligne absente du serveur. |
| C11. 412 px | ✅ | `innerWidth` 412, `scrollWidth` 412, aucun élément qui dépasse : Formation (explication dépliée), À propos hors ligne, écran formateur (liste, confirmation Retirer, confirmation Tout effacer). Nouveaux boutons tous à 44 px de haut. Captures `c11-*.png`, `c10-c11-apropos-hors-ligne-412.png`. |
| C12. Rapport | ✅ | Ce fichier, écrit après le contrôle de production. |
| Types, tests, build | ✅ | Compteur `tsc -p tsconfig.app.json` : 1910 avant, 1910 après, zéro erreur dans `business-plan`. Tests du module : 135 sur 135. `npm run build` réussi. |
| Données de test | ⚠️ | TESTCC10 supprimée (plans et pierres tombales partis en cascade) ; données locales de test effacées du navigateur. NEC2026 : 7 au lieu de 13, voir l'encadré en tête. |

## Fichiers
- Créés : `frontend/src/modules/business-plan/composants/Confidentialite.tsx`, `supabase/migrations/20261112000000_nec_retrait_effacement.sql`, ce rapport et `10-captures/`.
- Modifiés : `pages/APropos.tsx`, `pages/Formation.tsx`, `pages/Formateur.tsx`, `pages/FormateurPlan.tsx`, `sync/index.ts`, `sync/formateur.ts`, `db/base.ts` (commentaire seulement) ; partagés avec l'hôte : `frontend/src/constants/appVersion.ts`, `frontend/package.json` (version).
- Dépendance ajoutée : aucune.

## Écarts avec le prompt
1. **Lien vers À propos remplacé par une explication dépliable** : le prompt le prévoyait si le lien faisait perdre la saisie, ce qui était le cas.
2. **C9, « NON_AUTORISE pour anon »** : avec les droits demandés (exécution réservée à `authenticated`), un appel anonyme est refusé avant même d'entrer dans la fonction (`42501`), ce qui est plus strict. `NON_AUTORISE` a été vérifié pour un utilisateur connecté qui n'est pas le formateur.
3. **Texte de « Tout effacer » au singulier** : « les 1 projets » étant incorrect, avec un seul projet le texte devient « Effacer définitivement le projet de la session ... » et le message « 1 projet effacé. ». Au pluriel, texte exact du prompt.
4. **Profil Chrome** : le prompt annonçait CyberKELY ; en réalité `is_joel()` vérifie `joelsoatra@gmail.com`, et c'est ce compte qui était connecté. Vérifié dans la définition de la fonction avant de s'y fier.
5. **Fenêtre Chrome** : le redimensionnement ne tenait pas (largeurs 359, 657, 958, 1277 obtenues) et l'écran formateur ne peut pas être mis dans un cadre (protection anti-cadre) ; la largeur 412 a été prouvée par Playwright (le plugin Playwright était pris par une autre session : script autonome), avec pour l'écran formateur une session locale factice et des réponses simulées, sans aucun appel réel.
6. **Un onglet Chrome n'a pas pu être fermé** : il était sorti du groupe d'onglets piloté (onglet `1sakely.org/plan/formateur`) ; à fermer à la main.

## Surprises
- Le port 3000 était occupé par un processus qui n'est pas Vite (« Upgrade Required »).
- Au retour du réseau, `bp_retirer` est appelé deux fois (écoute `online` plus le rafraîchissement de la page) ; sans effet puisque l'effacement est idempotent. Lors d'un premier essai, la file locale n'était pas encore vidée 5 s après (réponse plus lente), elle l'était au second essai et le serait de toute façon à l'ouverture suivante. Comportement d'avant, non modifié.
- Le formateur a utilisé « Retirer » sur NEC2026 pendant les tests (voir l'encadré).

## Ce que le prompt n'avait pas prévu
- Le cas d'un seul projet pour le texte de « Tout effacer ».
- Qu'un vrai formateur puisse se servir de la fonction en production pendant les tests, ce qui rend le critère « NEC2026 inchangé » invérifiable comme preuve de non-intervention : la preuve vient ici des journaux d'API.
- La largeur de la fenêtre Chrome, non pilotable de façon fiable sur ce poste.

## Recommandations
- Confirmer que les 6 retraits de NEC2026 faits à 13:45 depuis le téléphone étaient voulus (sinon : supprimer les 6 pierres tombales, voir ci-dessous).
- Le bouton « Actualiser » de l'écran formateur (antérieur) fait 40 px de haut : à passer à 44 px lors d'une prochaine retouche.

## Annexe : pierres tombales NEC2026 créées à 13:45-13:46
`90c72660-9296-4c56-8839-eed828d8c830`, `1937f8d5-d608-4ef6-b88b-06274a369002`, `1eb46592-ed87-48f0-945b-612211d22971`, `72f9b77c-48c0-4c5a-9e2b-b0f2c5fa72ce`, `39200309-6efa-4ec1-b531-32b1364d0626`, `b2ea2f7c-1c18-43d9-a894-b6339c18da18`.
