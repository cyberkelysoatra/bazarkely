Réf. NEC-CC-23 · story NEC-173 (PRD édition suivante v0.9)

# Rapport : bouton « Écouter » (Mon Business Plan, /plan/)

**Version en production : 3.148.0** · commit `987dbec` sur `cloudflare-migration` · vérifiée sur 1sakely.org/plan/a-propos.

## Horaires

| Début | Fin | Durée active |
|---|---|---|
| 12/11/2026, 21 h 16 | 12/11/2026, 21 h 46 | environ 30 min |

## Ce qui a été livré

Un bouton « Écouter » lit à voix haute, avec la voix française du téléphone, les explications de chaque étape. Si on le touche pendant la lecture, il affiche « Arrêter » et coupe la lecture. Rien n'est enregistré, rien n'est envoyé au serveur, il n'y a aucun fichier son.

- **Où il apparaît :** sur la carte d'introduction violette de m1, m2, m3, m5, impact, mission, pitch, relecture et synthèse. On le trouve aussi dans chaque aide ouverte (« À retenir », « Les mots à connaître », etc.), dans l'explication de la boucle de compréhension (aux deux endroits où elle s'affiche), sur les écrans du niveau Bases et dans les encadrés « Attention au piège » du niveau Ciblé (module 5).
- **Où il n'apparaît pas :** sur les champs, les résultats et les pages formateur. Il n'apparaît pas non plus sur les aides d'exemple (« Exemple JUS'NOSY ») : le prompt dit « jamais sur les exemples ». Une aide fermée n'a pas de bouton.
- **Choix de la voix :** une voix dont la langue commence par « fr ». La voix installée sur l'appareil passe en premier, parce qu'elle marche hors ligne, puis la voix fr-FR. Les voix sont attendues jusqu'à 3 s. **Sans voix française, aucun bouton**, et aucun message.
- **Texte lu :** le texte visible du bloc, sans le bouton lui-même, sans « (?) », sans émojis ni pictogrammes. Le compteur « Explication 1 sur 3 » du niveau Bases n'est pas lu non plus. Le texte est découpé en phrases (sur . ! ? : et les retours à la ligne), et les phrases sont lues l'une après l'autre. Une phrase de plus de 220 caractères est coupée aux virgules. Cela évite la coupure des longs textes sous Chrome Android.
- **Un seul texte lu à la fois** dans tout le module. Si une lecture démarre, celle en cours s'arrête et son bouton revient à « Écouter ». La lecture s'arrête aussi au second toucher, quand on change d'écran, quand on ferme l'aide ou quand la page passe en arrière-plan.

## Critères d'acceptation

| # | Critère | Résultat | Preuve |
|---|---|---|---|
| 1 | Tests unitaires : nettoyage du texte, découpage en phrases, une seule lecture à la fois, cas sans voix | ✅ 10 tests dans `ecouter.test.tsx`. Ils couvrent aussi le choix de la voix, une voix qui arrive en retard et une aide fermée ou ouverte | Tout le module : 213/213 tests verts |
| 2 | Développement, 412 px (`innerWidth` = 412) : intro de m1, « Écouter » → `speaking === true`, « Arrêter », `aria-pressed=true` → second toucher → `speaking === false` | ✅ | `c2-m1-lecture-dev.png` |
| 3 | Intro m1 puis « À retenir » ouvert : la première lecture s'arrête, la seconde lit, un seul « Arrêter » | ✅ Étiquettes : `Écouter:false`, `Arrêter:true` | `c3-aide-retenir-lit.png` |
| 4 | Lecture en cours, retour au Sommaire : la lecture s'arrête | ✅ `speaking:false`, `pending:false` | n/a |
| 5 | Aide fermée : pas de bouton ; ouverte : bouton. Boucle impact (mauvaise réponse sur un plan de test) : bouton qui lit l'explication, aux deux endroits. Écran Bases du m5 : bouton (et aussi en Ciblé) | ✅ | `c5-boucle-impact-explication.png`, `c5-m5-bases.png`, `c5-m5-cible.png` |
| 6 | Sans voix française (voix anglaise seule, puis liste vide) : aucun bouton sur m1 (aide ouverte), m5 ni impact, aucune erreur console | ✅ 0 bouton dans les deux cas. Les seules erreurs console viennent du WebSocket de rechargement de Vite, propre au serveur de développement et sans lien avec ce chantier | n/a |
| 7 | Hors ligne (réseau coupé dans la page, `navigator.onLine === false`, fetch refusé) : la lecture démarre avec une voix installée | ✅ En développement et **en production** | `c7-horsligne-m2-lit.png` |
| 8 | Non-régression : tests du module verts ; texte WhatsApp de l'exemple identique ; pas de défilement horizontal à 412 px | ✅ 213/213. WhatsApp : production 3.147.0 contre nouvelle version, **identiques au caractère près** (281 caractères). Le code du PDF (`export/`) n'a pas été touché et ses tests sont verts. Défilement : `scrollWidth` = 397 ≤ 412 sur m1 à m5, impact, mission, synthèse, pitch et relecture, toutes aides ouvertes, aucun bouton hors écran | `c8-*.png` |
| 9 | Production : « À propos » affiche 3.148.0 ; le critère 2 passe sur 1sakely.org/plan/ dans le plan d'exemple | ✅ | `c9-prod-apropos.png`, `c9-prod-m1-lecture.png` |
| 10 | Ce rapport | ✅ | n/a |

Contrôle des types : 1910 erreurs avant, 1910 après (anciennes erreurs), **0 dans les fichiers du chantier**. `npm run build` OK.

## Fichiers

Créés :
- `frontend/src/modules/business-plan/composants/Ecouter.tsx` : le bouton, le choix de la voix, le nettoyage et le découpage du texte, la lecture unique.
- `frontend/src/modules/business-plan/composants/ecouter.test.tsx`

Modifiés (les **partagés** sont utilisés par tout le module) :
- **`composants/Carte.tsx`** (partagé) : nouvelle option `ecouter`, désactivée par défaut. Sans elle, l'affichage ne change pas.
- **`composants/Aide.tsx`** (partagé) : bouton dans le contenu ouvert, sauf pour les aides « Exemple… ».
- **`composants/BoucleComprehension.tsx`** (partagé) : l'explication passe dans un petit bloc avec le bouton.
- **`composants/Icones.tsx`** (partagé) : deux icônes ajoutées, `hautParleur` et `arret`.
- `ateliers/m5/niveaux.tsx` : bouton dans `Piege` (Ciblé) et dans `EcranBases`.
- `ateliers/{m1,m2,m3,m5,impact,mission,pitch,relecture,synthese}/Page.tsx` : `ecouter` ajouté sur la première carte violette seulement.
- `frontend/src/constants/appVersion.ts`, `frontend/package.json` : version 3.148.0.

Aucun champ du plan, aucune synchronisation, aucun réglage enregistré, ni PDF, ni texte WhatsApp, ni écran formateur n'a été modifié. Aucun paquet n'a été ajouté.

## Voix trouvées sur ce PC (Chrome 157, Windows 11)

| Nom | Langue | Installée (`localService`) |
|---|---|---|
| Microsoft Hortense - French (France) | fr-FR | oui, **choisie** |
| Microsoft Julie - French (France) | fr-FR | oui |
| Microsoft Paul - French (France) | fr-FR | oui |
| Google français | fr-FR | non (réseau) |
| 18 autres voix Google (de, en, es, it…) | n/a | non |

## Ce qui n'a pas pu être testé ici

- **Aucun vrai téléphone Android n'a été testé.** Tout a été vérifié dans Chrome sous Windows, avec la fenêtre réglée à 412 px de large. Trois points restent à vérifier sur les téléphones du 14/11 :
  - la présence d'une voix française (Google ou Samsung) ;
  - la lecture hors ligne : la voix doit être téléchargée dans les réglages du téléphone, sinon Android peut la déclarer « réseau » ;
  - la lecture d'un long texte sans coupure.
- **Changement d'onglet réel :** l'arrêt quand la page passe en arrière-plan a été simulé (`document.hidden` forcé, puis l'événement `visibilitychange`). Je n'ai pas vraiment changé d'application.

## Surprises

- `localhost:3000` arrivait sur un autre serveur de développement, qui répondait « Upgrade Required ». Les tests ont été faits sur `127.0.0.1:3000`.
- Ma fenêtre Chrome (via l'extension) refusait de descendre à 412 px de large : un panneau latéral prend environ 170 px. Les tests de mise en page ont donc été faits dans Playwright, qui a les mêmes voix Windows.
- En cours de session, le banc Playwright est passé à un zoom de 75 % pour `127.0.0.1` (largeur lue : 549 px). La mesure de débordement a été refaite sur `127.0.0.2`, avec une largeur prouvée de 412 px.
- Le découpage aux deux-points, demandé par le prompt, rend certains passages un peu hachés. Exemple au niveau Bases : « Total : » puis « 120 Ar. ».

## Recommandations

1. Le 14/11, au début de la séance, faire toucher « Écouter » sur l'intro du module 1. Le bouton n'apparaît pas sur un téléphone ? Il n'a pas de voix française : réglages → Synthèse vocale → installer le français (hors ligne).
2. Si les participants trouvent la lecture hachée, une prochaine version pourra regrouper les morceaux très courts (moins de 40 caractères) avec la phrase suivante.
3. Les plans de test (copies de l'exemple) existent seulement dans le navigateur Playwright local, sans compte ni serveur. Aucun plan réel n'a été touché.

## Captures (`23-captures\`)

`c2-m1-lecture-dev.png` · `c3-aide-retenir-lit.png` · `c5-boucle-impact-explication.png` · `c5-m5-bases.png` · `c5-m5-cible.png` · `c7-horsligne-m2-lit.png` · `c8-impact-intro-sans-titre.png` · `c8-m3-aide-ouverte.png` · `c9-prod-apropos.png` · `c9-prod-m1-lecture.png`
