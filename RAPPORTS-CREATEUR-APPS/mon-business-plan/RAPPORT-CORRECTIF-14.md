# Rapport NEC-CC-14 : « Mon pitch de 2 minutes », aperçu de lien et icône de /plan/

- **Début :** 12/11/2026, 08 h 33 (lecture du prompt, serveur de dev `/plan/` sur le port 3007)
- **Attente de NEC-CC-13 :** de 08 h 36 à 09 h 16 (code préparé hors du dépôt pendant ce temps)
- **Mise en ligne :** commit `ea99e5a` poussé à 10 h 22, servi par 1sakely.org à 10 h 25 (v3.138.0)
- **Fin :** 10 h 30
- **Durée :** environ 2 heures, dont 40 minutes d'attente

## Critères d'acceptation

| Critère | Résultat | Preuve |
|---|---|---|
| Section après Synthèse, dans le Sommaire et dans Suivant / Précédent | ✅ | Sommaire (prod) : « 10 Synthèse », « 11 Mon pitch de 2 minutes », « Relecture en binôme ». Depuis la Synthèse : « Suivant : Mon pitch de 2 minutes » ; depuis le pitch : « Suivant : Relecture en binôme », Précédent ramène à la Synthèse. |
| Exemple : les 5 temps remplis à partir du résumé, 12 mots au plus | ✅ | JUS'NOSY (prod) : 5 × « 12 / 12 mots ». Test : les 6 exemples des secteurs donnent 5 temps non vides, au plus 12 mots, sans tiret long. |
| Chronomètre : signal à 1 min 45 | ✅ | À 1:42 aucun signal, à 1:47 carte orangée « 1 min 45 : il te reste 15 secondes. » et `navigator.vibrate(300)` appelé une fois. |
| Essai de 2 min 10 : conseil et partie la plus longue | ✅ | « Temps total : 2 min 10 s » ; « Coupe un mot-clé dans la partie la plus longue : 2. Ma solution et pourquoi elle est meilleure (45 s). » |
| 2 essais listés | ✅ | Copie de l'exemple : 3 essais listés (2 min 12 s, 1 min 56 s, 2 min 10 s), toujours là après rechargement. |
| Subvention au-dessus de 70 % : « Et si tu n'obtiens pas la subvention ? » | ✅ | Copie de l'exemple, subvention passée à 8 000 000 Ar (environ 89 % des besoins) : question 1 = celle-ci. Test unitaire aussi. |
| Plan sans point faible : 3 questions générales | ✅ | Exemple JUS'NOSY et plan vide : « Pourquoi toi ? », « Qui est ton concurrent le plus dangereux ? », « Quand vendras-tu ta première unité ? ». |
| PDF : la trame et les 3 réponses | ✅ | PDF créé dans le navigateur (78 ko, 19 pages), texte extrait : tableau « Temps / Durée / Mots-clés » des 5 temps + marge, puis les 3 questions et les 3 réponses saisies. |
| Hors ligne après un chargement en ligne | ✅ | Banc Playwright (Chrome, 412 px, `setOffline(true)`), sur la version construite puis sur la production : pitch de l'exemple affiché, 5 temps, 3 questions, un essai chronométré réalisé hors ligne. |
| 412 px, rien de caché derrière la barre du bas ni la ligne Suivant / Précédent | ✅ | `window.innerWidth` = 412, `scrollWidth` = 412 (pas de défilement horizontal) ; bas de page : dernière question à 718 px, ligne Suivant / Précédent de 775 à 827 px, barre du bas à 858 px. |
| Compteur de types non augmenté, zéro erreur dans les fichiers touchés | ✅ | 1910 avant, 1910 après ; 0 erreur dans `business-plan` et `vite.plan.config.ts`. |
| Tests existants | ✅ pour le module | 104 tests du module (dont les 12 nouveaux) passent. Toute la suite : 25 fichiers en échec, tous anciens et hors de ce chantier (Construction, Auth, composants UI, services) ; aucun n'importe le module du plan. |
| `npm run build` | ✅ | Les 4 constructions (hôte, PUDi, Validation, plan) passent. |
| Production : nouvelle version, section qui marche sur l'exemple | ✅ | `precache.json` = 3.138.0, code `plan-C09jQiIX.js` ; pitch de l'exemple : 5 temps remplis, Suivant / Précédent corrects. |
| Production : `og:image`, images en `image/png`, manifeste | ✅ | Les 6 balises `og:image*` / `twitter:*` présentes ; `og-plan.png`, `plan-icon-192.png`, `plan-icon-512.png` : 200 `image/png`, tailles identiques aux fichiers fournis ; le manifeste liste les 2 nouvelles icônes (512 en « any maskable »). |

## Fichiers

Nouveaux (`frontend/src/modules/business-plan/ateliers/pitch/`) :
- `Page.tsx` : la page (trame, répétition, questions, fin d'étape)
- `trame.ts` : les 5 temps, leurs durées, les mots-clés tirés du résumé, le comptage des mots
- `questions.ts` : les règles des questions pièges
- `exemples.ts` : l'exemple affiché sous chaque temps (TRANO KELY pour le tourisme, sinon l'exemple du secteur, sinon JUS'NOSY)
- `progression.ts`, `pitch.test.ts` (12 tests)

Modifiés : `types.ts` (champ facultatif `pitch`), `etat/vide.ts` (`pitchVide`, `pitchDe`), `rubriques/registre.ts`, `export/contenu.ts`, `frontend/plan/index.html`, `frontend/public/plan/manifest.webmanifest`, `frontend/vite.plan.config.ts`, `frontend/package.json`, `frontend/src/constants/appVersion.ts`.
Ajoutés à l'identique : `frontend/public/plan/og-plan.png` (1200 × 630), `plan-icon-192.png`, `plan-icon-512.png`.

## Écarts

1. **Place du pitch dans le PDF.** Un test déjà en place impose que les sections du PDF suivent l'ordre du cahier. Le pitch est donc placé juste après le module 5 (la place de la Synthèse dans le cahier), et non tout de suite après le résumé, qui est en tête du PDF. Cela correspond aussi à la section 8 du contenu, qui le prévoit « en annexe ».
2. **Durées.** La section 2 du contenu les donne : problème 20 s, solution 25 s, marché 20 s, chiffres 25 s, demande 20 s, plus 10 s de marge. Les durées de secours du prompt n'ont pas servi, et le 3e temps est « Mon marché et mes concurrents », comme dans le contenu.
3. **Morceaux.** Les durées sont celles de la section 10.3 : 20 s, puis 50 s, puis le tout.
4. **Fin d'étape.** Le texte est « Étape terminée. Ton projet tient sur une page et en 2 minutes. », sans numéro d'étape car l'appli n'en affiche pas. Il apparaît quand les 6 cartes du résumé sont remplies et qu'au moins un pitch complet a été répété.
5. **Exemple en lecture seule.** Les essais faits sur un exemple restent à l'écran et ne sont pas enregistrés, comme le reste de l'exemple. Sur une copie, ils sont gardés (10 au plus).
6. **Ton.** Le contenu de l'étape 9 tutoie (« Dis ton pitch... »), les autres pages de l'appli vouvoient. La page du pitch suit le contenu.

## Surprises

- Le commit NEC-CC-13 est arrivé à 09 h 14, puis une v3.137.1 (NEC-CC-12) attendait sans commit. J'ai attendu ce commit avant de monter la version, pour ne pas toucher à ses fichiers.
- Une autre session modifiait `data/exemples/education/m5.ts` et `exemples.test.ts` pendant le chantier : je ne les ai pas touchés, ils ne sont pas dans mon commit.
- Dans le navigateur intégré, une fois le serveur local arrêté, le code de la page ne se charge pas, alors que le cache le contient bien. C'est le même défaut que dans le rapport CORRECTIF-11. Le vrai mode avion a donc été testé avec Playwright, et il marche.
- La construction complète prend environ 8 minutes sur ce poste, dont 6 pour l'appli principale.
- `frontend/public` est ignoré par git : les images ont été ajoutées avec `git add -f`.

## Recommandations

- Le jour J : faire ouvrir `/plan/` une fois en Wi-Fi avant la séance de 15 h 30, pour que le pitch soit disponible en mode avion.
- Les mots-clés sont tirés automatiquement du résumé. Ils restent des mots-clés bruts et parfois coupés (ex. « 20 35 » pour « 20 à 35 ans ») : à présenter comme un point de départ que chacun retouche.
- La règle « D'où vient ce chiffre ? » se déclenche quand une source du module 3 est vide ou contient « estim ». Si le module 3 reçoit un jour un vrai choix « je l'estime », brancher la règle dessus.

Captures et bancs : `14-captures/` (`c6-local-avion.png`, `prod-avion-pitch.png`).
