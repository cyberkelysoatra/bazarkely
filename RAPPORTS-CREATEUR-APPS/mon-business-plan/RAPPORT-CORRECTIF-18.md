# Rapport NEC-CC-18 : « Ma journée », badge d'avance ou de décalage, jauge de la journée, écran de fin d'étape

Référence : **NEC-CC-18** (récits NEC-164, NEC-165, NEC-166, NEC-167). Version livrée : **3.143.0**, commit `55d1097` sur `cloudflare-migration`, en ligne sur https://1sakely.org/plan/ (« Version 3.143.0 » lue dans À propos).

## Temps
- Début : 2026-11-12 14:10 (heure de Madagascar). Fin : 14:48. Durée active : environ 38 min.
- Une seule session, sans reprise ; fenêtre de contexte non atteinte.

## Itérations et erreurs notables
1. Garde d'attente : aucun fichier du module, de `appVersion.ts` ni de `package.json` en cours chez une autre session. Démarrage immédiat.
2. `npm run dev` : port 3000 déjà pris par un serveur Vite d'une autre session (même dossier). Réutilisé tel quel (`http://127.0.0.1:3000/plan/`, `localhost` répond 426 car un autre processus écoute en IPv6).
3. Test unitaire « étape 9 composite » : j'attendais 50 %, le calcul donne 67 % car la trame du pitch se pré-remplit depuis la synthèse (33 %). Le calcul était juste, le test a été corrigé pour comparer à la moyenne réelle des deux rubriques.
4. Tests de composant : le banc global de vitest simule `react-router-dom` (sans `Link`) et `localStorage` (fonctions vides). Le fichier de test fournit son propre `Link` et un vrai stockage en mémoire.
5. Typage du faux `Link` du test : 2 erreurs, corrigées. Compteur final identique au départ.
6. Navigateur Playwright partagé (MCP) occupé par une autre session : validation faite avec un banc Playwright autonome (`channel: 'chrome'`, headless), comme en NEC-CC-17.

## Critères d'acceptation

### Calcul (section 3, `etat/journee.ts`, 20 tests)
- ✅ identité 100 et M1 100, le reste vide : **18 %** (et `progressionGlobale` inchangée : 14 %).
- ✅ Étape 9 = moyenne synthèse et pitch, faite seulement si les deux sont à 100 ; étape 12 jamais cochée.
- ✅ `etapePrevue` : 08:10 null, 10:25 étape 4 (pause), 14:10 étape 8, 17:40 null.
- ✅ `ecart` : 9 min d'avance = « À l'heure », 10 min = avance ; 14 min de retard = à l'heure, 15 min = décalage ; au-delà de 60 min « plus d'une heure » ; arrondi à 5 ; plan exemple = null ; hors fenêtre = null.
- ✅ Textes sans U+2014, U+2013, U+00B7 (vérifié par test et par balayage des fichiers).

### NEC-164 et NEC-165 : frise du sommaire
- ✅ Titre « Ma journée », 12 pastilles numérotées, défilement horizontal interne, étape en cours amenée dans la vue, aucun défilement horizontal de la page (412 px).
- ✅ Plan identité + M1 à 100 % : pastilles 1 et 2 cochées (turquoise), pastille 3 en bordure épaisse.
- ✅ Horloge fixée à 14:10 (test de composant et banc navigateur `page.clock`) : pulsation sur la pastille 8 ; page réelle à 14:23, 14:29 et en prod à 14:44 : pulsation sur la 8.
- ✅ Horloge à 18:00 (et 08:10, 17:40, 22:00 en test) : aucune pulsation, aucun badge.
- ✅ Badge : décalage en ambre, jamais rouge, sans reproche ni note (« Décalage de plus d'une heure : fais d'abord les blocs Clients, Proposition de valeur, Revenus et Coûts, le reste peut attendre ce soir. »).
- ✅ « Il te reste 9 étapes ». Rafraîchissement chaque minute, minuterie effacée au démontage.
- ✅ Pastille 9 ouvre `/synthese`, pastille 12 ouvre `/exporter`.
- ✅ Plan exemple : aucune frise.

### NEC-166 : jauge de la journée
- ✅ Sommaire et Mes projets : « Ma journée est faite à » **18 %** sur le cas de référence (banc dev et banc build hors ligne).
- ✅ Écran formateur inchangé : `FormateurPlan.tsx` non modifié, il affiche toujours `progressionGlobale` ; `formateurPretest.test.tsx` vert.
- ✅ Étiquette « facultatif » sur « Mes prix relevés » et « Mes notes ».

### NEC-167 : écran de fin d'étape
- ✅ Module 1 rempli champ par champ (15 champs) : l'écran apparaît **après le 15e champ seulement**, une fois ; idem pour la fiche d'identité (étape 1).
- ✅ Textes : « Étape 2 terminée », « 5 points sur 20 de la grille du jury sont posés. », « Il te reste 9 étapes », bouton « Étape suivante : Business Model Canvas (40 min) » qui a le focus, « Rester ici ». Étape 11 : « Prochaine étape : mon PDF » vers `/exporter` (test).
- ✅ 20 confettis au départ, 0 après 2 s (retirés du DOM) ; vibration 40 ms appelée ; fermeture par Échap et par le voile ; `role="dialog"`, `aria-modal="true"`.
- ✅ Rechargement puis réouverture et modification du module 1 : plus d'écran ; `nec.fetes.<id>` = `[1,2]`.
- ✅ Plan déjà à 100 % avant la version (clé effacée pour simuler) : aucun écran, étape notée en silence (`[2]`).
- ✅ Vue formateur : n'utilise pas `PageRubrique` (lecture seule dans `FormateurPlan`), donc jamais d'écran ; plan exemple : aucun écran, rien noté.
- ✅ Mode avion sur le build de production (banc Playwright, `navigator.onLine = false`) : tout le parcours ci-dessus vert, zéro erreur de page.
- ✅ Mouvement réduit émulé : pastille sans animation (`animation-name: none`), aucun confetti, coche affichée d'emblée (`stroke-dashoffset: 0`).

### Définition du « fini »
- ✅ Tests du module : 15 fichiers, 164 tests verts (`npx vitest run src/modules/business-plan`).
- ✅ Compteur de types : 1910 avant, 1910 après, 0 erreur dans les fichiers touchés.
- ✅ `npm run build` OK ; version 3.143.0 (`npm run version:minor`, entrée ajoutée à `VERSION_HISTORY`).
- ✅ Production vérifiée : empreinte `plan-f5JtGPuk.js` identique au build local, « Version 3.143.0 », frise, badge et étiquettes présents à 412 px, aucune erreur.

## Fichiers
Créés :
- `frontend/src/modules/business-plan/etat/journee.ts`
- `frontend/src/modules/business-plan/etat/journee.test.ts`
- `frontend/src/modules/business-plan/composants/MaJournee.tsx`
- `frontend/src/modules/business-plan/composants/FinEtape.tsx`
- `frontend/src/modules/business-plan/composants/journee.test.tsx`
- `RAPPORTS-CREATEUR-APPS/mon-business-plan/18-captures/` (bancs `banc-journee.cjs`, `verif-prod.cjs` et captures)

Modifiés :
- `pages/Sommaire.tsx`, `pages/Accueil.tsx`, `pages/PageRubrique.tsx`, `plan.css` (module)
- **Partagés** : `frontend/src/constants/appVersion.ts`, `frontend/package.json` (version)

Dépendances ajoutées : aucune.

## Captures (`18-captures/`)
- `sommaire-vide-*.png`, `sommaire-journee-*.png`, `frise-badge-*.png` : frise avec badge (dev `local` et build hors ligne `build-hors-ligne`).
- `frise-14h10-*.png` : horloge fixée à 14:10, pulsation sur 8.
- `fin-etape-*.png` : écran de fin d'étape avec confettis ; `fin-etape-reduit-*.png` : mouvement réduit.
- `accueil-jauge-*.png` : Mes projets avec la nouvelle jauge ; `sommaire-prod.png` : production.

## Écarts par rapport au prompt
- Ambre : la charte du module (`tailwind.plan.config.js`) n'a pas de couleur ambre ; valeurs directes `#F2A900` (bordure, confettis) et `#7A4B00` sur `#FFF4DC` (texte lisible). Pas de modification de la configuration partagée.
- Mes projets n'avait pas de libellé visible : ajout d'une petite ligne « Ma journée est faite à » au-dessus de la barre.
- Tous les 11 pas faits : le badge compare à l'étape 12 (Mon PDF), donc avance avant 16:50, sinon à l'heure ; jamais de décalage.
- Entre 17:10 et 17:30, l'étape prévue reste la 12.
- Serveur de dev : celui déjà lancé par une autre session a été réutilisé (port pris).

## Surprises
- La trame du pitch se nourrit de la synthèse : une synthèse complète donne déjà un pitch à 33 %.
- Le banc global vitest simule le routeur et le stockage, ce qui rend les composants à liens intestables sans simulation locale.

## Points manquants du prompt
- Pas de règle pour « tout fait » ni pour la plage 17:10 à 17:30 (choix ci-dessus).
- Pas de couleur ambre définie dans la charte du module.

## Recommandations
- Ajouter `ambre` à `tailwind.plan.config.js` lors d'un prochain chantier pour ne plus utiliser de valeurs directes.
- Sur place : si un participant met son téléphone à une mauvaise heure, le badge sera faux ; la frise reste utile (elle ne dépend que du travail fait).
