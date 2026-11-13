# Rapport du correctif 25 : une ancienne page n'écrase plus jamais un plan plus récent, et « Écouter » lit naturellement

Réf. NEC-CC-25 (histoires NEC-174 et NEC-173, ce second volet reprenant le prompt NEC-CC-24, jamais lancé). Version **3.149.0**, commit `1d74cd8`, branche `cloudflare-migration`.

## Horaires (13/11/2026)
| Étape | Heure |
|---|---|
| Lecture du prompt, garde d'attente (aucun fichier du module modifié, rien à attendre) | 11 h 11 |
| Lecture naturelle codée, tests verts | 11 h 15 |
| Garde-fou des anciennes pages codé, 13 tests unitaires verts | 11 h 23 |
| Essais navigateur (Playwright 412 px, puis vrai Chrome) | 11 h 25 à 11 h 38 |
| Build, version 3.149.0, commit, push | 11 h 44 |
| Contrôle en production | 11 h 56 à 12 h 03 (fichier en ligne contenant 3.149.0 constaté à 11 h 55) |

## Ce qui a changé, en clair
1. **Un enregistrement est refusé si le plan du téléphone est déjà plus récent** que celui que la page a en mémoire. La page abandonne alors sa modification, se recharge sur la version récente et affiche pendant 6 secondes (ou jusqu'au toucher), au-dessus de la barre du bas : « Ce projet a été modifié dans une autre page : la version la plus récente est affichée. » C'est exactement le cas de Justella : l'onglet du 12/11 ne peut plus repasser par-dessus la révision 1995.
2. **Une page qui revient au premier plan relit le plan** et se met à jour en silence s'il a changé.
3. **Les autres pages ouvertes sont prévenues à chaque enregistrement** (seulement le numéro du plan et sa révision, jamais son contenu) et se mettent à jour d'elles-mêmes.
4. **La copie de secours d'une ancienne page perd toujours** à la réouverture (elle porte la révision de départ de la page + 1).
5. **« Écouter »** ne coupe plus aux deux-points, et lit « fois », « ariary », « par mois », « égale », « pour cent », « plus », et « 15 990 000 » comme un seul nombre. Le texte affiché ne change pas.

## Critères d'acceptation
| # | Critère | Résultat | Preuve |
|---|---|---|---|
| 1 | Tests unitaires : révision plus basse refusée et plan stocké rendu ; égale ou plus haute acceptée ; copie de secours d'une page périmée rejetée | ✅ 13 tests (`db/plans.test.ts`) : fonction `peutEnregistrer`, `enregistrerPlan` sur base simulée en mémoire, annonce `{ id, rev }` sans contenu, rejeu des copies, et le hook `usePlan` (page seule, page périmée, retour au premier plan, annonce d'une autre page, page cachée juste après la frappe) | n/a |
| 2 | Deux onglets, développement, 412 px (`innerWidth` = 412 prouvé) : B tape « TEXTE B », A (ancien) tape « TEXTE A » | ✅ A affiche « TEXTE B », la phrase s'affiche puis disparaît après 6 s, le plan stocké garde « TEXTE B » (révision 1, la frappe ancienne refusée) ; A retape ensuite « TEXTE A » depuis la version récente : révision 2 avec les deux textes | `c2-dev-onglet-ancien-avis.png` |
| 2 bis | Même essai, A ramené au premier plan avant de taper | ✅ A affiche déjà « TEXTE B » avant toute frappe, pas de phrase, stocké final : « TEXTE B » + « TEXTE A » | `c2-dev-retour-premier-plan.png` |
| 2 ter | Vrai Chrome (extension), deux vrais onglets | ✅ A caché pendant la frappe dans B ; au retour, événements réels `visibilitychange` puis `focus`, A affiche déjà « TEXTE B » ; A tape « TEXTE A » : stocké révision 2 avec les deux textes, aucune phrase | n/a |
| 3 | Page seule : frappe, enregistrement automatique, enregistrement d'urgence à la sortie | ✅ révisions 6 → 7 → 8 (une par enregistrement), puis frappe suivie d'une sortie immédiate de la page : révision 9 avec le texte, aucune copie de secours restante, aucune phrase | n/a |
| 4 | Pré-test du formateur adopté, post-test gardé | ✅ tests existants verts (`formateurPretest`, `pretest`, `pretestFormateur`, `posttest`) ; l'adoption du pré-test prévient aussi les autres pages ; le post-test vu ouvert reste en mémoire même quand la page se recharge sur une version récente | n/a |
| 5 | Critères 1 à 4 de NEC-CC-24 (lecture naturelle) | ✅ voir section dédiée | `c5-dev-m5-bases.png` |
| 6 | Non-régression | ✅ `npx vitest run src/modules/business-plan` : 20 fichiers, **252/252** ; texte WhatsApp de l'exemple : développement et production 3.148.0 **identiques** (281 caractères) ; défilement horizontal à 412 px : `scrollWidth` = 397 sur Sommaire, module 1 et module 5 | n/a |
| 7 | Production : « À propos » = 3.149.0 ; critère 2 refait sur 1sakely.org avec une copie de l'exemple, puis copie supprimée | ✅ « À propos » : 3.149.0 (412 px). Copie de l'exemple, jamais rattachée à la formation : onglet ancien → « TEXTE B » affiché, phrase affichée, stocké révision 1 avec « TEXTE B » ; deux onglets normaux → A mis à jour en direct (« TEXTE B2 »), aucune phrase, stocké révision 3 avec les deux textes. Copie supprimée ensuite. Lecture naturelle en production : écran Bases du module 5 à 412 px, 18 phrases en file, aucune fautive (« Total : 120 ariary. », « Ventes : 600 beignets fois 200 ariary égale 120000 ariary »), `scrollWidth` 397 | `c7-prod-apropos.png`, `c7-prod-onglet-ancien-avis.png`, `c7-prod-deux-onglets-direct.png`, `c7-prod-m5-bases.png` |
| 8 | Ce rapport | ✅ | |

Types : compteur **1910 avant, 1910 après**, zéro erreur dans `business-plan`. Build OK (aucun `jsxDEV`).

## Lecture naturelle (NEC-CC-24, critères 1 à 4)
1. ✅ Tests exacts : `2 x 8`, `2x8`, `2 X 8` → `2 fois 8` ; `50 × 15 %` → `50 fois 15 pour cent` ; `8 000 Ar x 12` → `8000 ariary fois 12` ; `Total : 120 Ar.` reste une phrase `Total : 120 ariary.` ; `8 000 Ar/mois` → `8000 ariary par mois` ; `15 990 000 Ar` avec espace normale, insécable et fine insécable → `15990000 ariary` ; `prix = coût + marge` → `prix égale coût + marge` ; `10 + 5` → `10 plus 5` ; `un taxi`, `Excel`, `le point x du plan`, `Arrivage et Art`, `2 8`, `en 2024 2025 2026`, `et/ou` inchangés ; `Ma part : 20 %` → `Ma part : 20 pour cent`. Les tests de NEC-CC-23 restent verts (36/36 dans le fichier).
2. ✅ `Total : 120 Ar. Marge : 40 Ar.` donne exactement 2 phrases. Un deux-points suivi d'un retour à la ligne termine toujours le morceau.
3. ✅ Module 5, niveau Bases de l'exemple, 412 px, espion sur `speechSynthesis.speak` : 114 textes mis en file, **aucun** avec « x » entre nombres, « Ar » isolé, « × » ou une fin en « : ».
4. ✅ Non-régression : voir critère 6 ci-dessus.

Textes mis en file sur l'écran Bases du module 5 (premier bloc), **avant** (production 3.148.0) puis **après** :

| Avant (26 morceaux) | Après (18 phrases) |
|---|---|
| « Les chiffres répondent à trois questions : » / « combien faut-il pour démarrer ? » | « Les chiffres répondent à trois questions : combien faut-il pour démarrer ? » |
| « Tous les montants sont en ariary (Ar). » | « Tous les montants sont en ariary (ariary). » |
| « Pour faire un beignet, la vendeuse dépense : » / « farine 50 Ar, sucre et coco 30 Ar, huile 30 Ar, charbon 10 Ar. » | « Pour faire un beignet, la vendeuse dépense : farine 50 ariary, sucre et coco 30 ariary, huile 30 ariary, charbon 10 ariary. » |
| « Total : » / « 120 Ar. » | « Total : 120 ariary. » |
| « Le loyer de son petit local, 40 000 Ar par mois, elle le paie même un jour de pluie sans client : » / « c'est une charge fixe. » | « Le loyer de son petit local, 40000 ariary par mois, elle le paie même un jour de pluie sans client : c'est une charge fixe. » |
| « Ventes : » / « 600 beignets × 200 Ar = 120 000 Ar » | « Ventes : 600 beignets fois 200 ariary égale 120000 ariary » |

## Fichiers
| Fichier | Rôle |
|---|---|
| `frontend/src/modules/business-plan/db/plans.ts` | `peutEnregistrer`, `ConflitPlan`, enregistrement en une transaction, annonce `BroadcastChannel('bp-plans')`, rejeu des copies sous la même règle, lecture qui attend les enregistrements en cours |
| `frontend/src/modules/business-plan/etat/usePlan.ts` | enregistrements de la page à la file, rechargement sur conflit, relecture au retour au premier plan et sur annonce |
| `frontend/src/modules/business-plan/etat/avisPlan.ts` (nouveau) | la phrase, séparée pour ne pas alourdir la page d'accueil |
| `frontend/src/modules/business-plan/App.tsx` | affichage de la phrase |
| `frontend/src/modules/business-plan/sync/index.ts` | une ligne : l'adoption du pré-test prévient aussi les autres pages |
| `frontend/src/modules/business-plan/composants/Ecouter.tsx` et `ecouter.test.tsx` | lecture naturelle |
| `frontend/src/modules/business-plan/db/plans.test.ts` (nouveau) | 13 tests |
| `frontend/src/constants/appVersion.ts`, `frontend/package.json` | **partagés** avec toute l'app : version 3.149.0 |

## Ce qui n'a pas pu être testé
- **Aucun vrai téléphone Android.** Le cas de Justella (onglet gelé par Android en arrière-plan pendant une nuit) a été simulé par une page qui ne reçoit pas les annonces des autres pages ; Chrome Android peut aussi tuer l'onglet, qui se recharge alors entièrement : ce cas était déjà sûr.
- Le banc Playwright n'émet aucun événement de retour au premier plan : dans la variante 2 bis l'événement `focus` a été envoyé à la main. Le vrai retour d'onglet a été vérifié dans le vrai Chrome (critère 2 ter), qui ne descend pas sous 958 px de large (panneau latéral) : la largeur de 412 px a été prouvée dans Playwright.

## Surprises
- Sur `127.0.0.1`, le banc Playwright lit toujours 549 px (zoom gardé) ; tous les essais à 412 px ont été faits sur `127.0.0.2`, comme en NEC-CC-23.
- Le test de suite global remplace `localStorage` par un faux qui ne garde rien : les nouveaux tests installent un vrai stockage en mémoire.
- « Tous les montants sont en ariary (Ar). » se lit désormais « ariary (ariary) » : conforme à la règle demandée, un peu redondant à l'oreille.
- Deux pages du même téléphone qui enregistraient presque en même temps pouvaient déjà s'écraser l'une l'autre ; la file d'enregistrements de la page et l'attente des enregistrements en cours à la lecture évitent aussi qu'un changement d'écran rapide déclenche la phrase à tort.
- La suppression des copies du banc local (développement) a aussi retiré une ancienne copie d'essai d'une session précédente (navigateur Playwright local uniquement, aucun compte, aucun serveur).
- Le navigateur Playwright garde, sur 1sakely.org, un plan d'essai d'une session précédente rattaché à la formation : il n'a pas été touché.
- Le guetteur de déploiement cherchait la version au mauvais chemin (`/plan/assets/` au lieu de `/assets/plan/`) : le déploiement était en ligne avant qu'il ne le voie.

## Recommandations
1. Le 14/11, demander à deux participantes d'ouvrir le même plan dans deux onglets sur leur téléphone et de vérifier la phrase : c'est le seul essai Android réel possible.
2. Rappeler en séance qu'il vaut mieux fermer les anciens onglets de l'app : le garde-fou protège le plan, mais la frappe faite dans un onglet ancien est abandonnée.
3. Si l'oreille gêne, retirer « (Ar) » du texte de l'exemple du module 5 plutôt que de compliquer la règle de lecture.
