# Rapport NEC-CC-07 : Mon Business Plan, correctif 7 (en-tête toujours visible, écran formateur verrouillé, logos plus nets, lien de connexion formateur)

Réf. NEC-CC-07, version **3.133.0**, commit `1954d62` sur `cloudflare-migration`, poussé à 23:21:42, en ligne à **23:26:35** (10/11/2026)

## Déroulement
- Une seule session, aucune question posée, **un seul déploiement**, après validation locale complète.
- Serveur de dev : port **3008** (lancé avant le code, laissé tourner ; ports 3000 à 3007 non touchés). Build servi par `vite preview` sur **4188**.
- Itérations :
  1. Banc de dev : la redirection arrivait sur `/plan` (sans barre finale) : c'est ce que donne le routeur pour « / ». `/plan` est hors du périmètre du service worker (`/plan/`) : redirection posée exactement sur `/plan/`.
  2. Cette redirection, faite au tout premier affichage, n'était pas vue par le routeur (son écoute n'était pas encore branchée) : page blanche. Déplacée juste après l'affichage : corrigé.
  3. Capture du module 5 : la barre d'onglets, à 95 % d'opacité, laissait deviner le texte qui passe dessous. Rendue opaque.

## Cause de l'en-tête qui partait
L'en-tête n'était tout simplement **pas collant** (aucun `position: sticky`). Aucun ancêtre n'avait de piège : `html`, `body` et `.bp-ecran` sont déjà en `overflow-x: clip` (mémento §30). Correctif à la racine :
- `header.bp-entete` : `sticky top-0 z-30`. Aucun écouteur de défilement.
- Hauteur de l'en-tête publiée sur `<html>` en `--bp-haut` (mesure à l'affichage et à chaque changement de taille, par `ResizeObserver`).
- Barre d'onglets du module 5 : `top: var(--bp-haut)` (collée sous l'en-tête et non plus sous le haut de l'écran), `z-10`, fond opaque. Empilement : en-tête 30, barre 10, contenu dessous (mémento §31).
- Champs (`input`, `textarea`, `select`) et sections du module 5 : `scroll-margin-top` = en-tête + barre d'onglets (61 px, seulement quand la barre existe) + marge. La page a déjà `interactive-widget=resizes-content` : à l'ouverture du clavier, la page rétrécit et l'en-tête reste en haut.
- La « ligne Retour » n'était pas collante avant : laissée telle quelle (elle défile avec la page, sous l'en-tête).
- Bandeau « Nouvelle version » (fixe, z-40) et barre du bas (fixe, z-20) inchangés.

## Critères d'acceptation
Bancs Playwright + Chrome du système, **412 × 869, DPR 3,5, tactile**, `innerWidth === 412` et `devicePixelRatio === 3.5` prouvés. Dans `7-captures/` : `banc-dev.cjs` (dev 3008) **55/55**, `banc-build.cjs` (build + service worker, 4188) **10/10**, `prod-incognito.cjs` (production sans session).

| | Critère | Résultat | Preuve |
|---|---|---|---|
| C1 | En-tête fixe sur toutes les pages | ✅ | Défilement jusqu'en bas, `getBoundingClientRect().top === 0`, en-tête entier et au premier plan en 3 points (`elementFromPoint`) : Accueil, Sommaire (921 px défilés), module 3 (4 893), module 5 (5 814), Exporter (184), À propos, Inviter, Formation, module 1 (2 613), Identité (711), écran formateur. Module 5, chacun des 6 onglets touché : en-tête bas à 105,6 px, barre d'onglets de 106 à 167 px, visible, section juste dessous (175 px). Captures `c1-*-haut.png`, `c1-*-bas.png`, `c1-m5-onglet-5a.png` à `5f`. |
| C2 | Clavier ouvert (hauteur 500) | ✅ | Module 5, dernier et premier champ de 5f : champ à 197 et 227 px, sous les onglets (167), au premier plan, entièrement dans l'écran. Module 1 (sans onglets) : premier champ remonté à 228 px sous l'en-tête (106). Captures `c2-clavier-*.png`. |
| C3 | Visiteur refusé | ✅ | Sans session, puis fausse session `x@y.z` : `/plan/formateur`, `/plan/formateur/abc-123` et `/plan/formateur/abc-123/m5` arrivent sur **`/plan/`** ; journal `MutationObserver` à chaque changement de page : **aucun** contenu du formateur (ni titre « Suivi formateur », ni liste, ni roue d'attente). Retour après redirection = page précédente (aucune entrée d'historique). Lien « Suivi formateur » absent de l'Accueil. **0 requête du formateur** ; sans session, 0 requête Supabase tout court. Idem hors ligne sur le build. |
| C4 | Session `joelsoatra@gmail.com`, appels simulés | ✅ | Lien présent ; toucher : écran formateur, participant simulé listé, en-tête fixe. `bp_admin_plan` puis `bp_admin_liste` répondant `NON_AUTORISE` : renvoi sur `/plan/`. Capture `c4-formateur.png`. |
| C5 | Mode avion sur le build | ✅ | Précache (42 fichiers, version 3.133.0) : `nec-logo-v2.png`, `blossom-blanc-v2.png`, plus les logos du PDF. Hors ligne : Accueil, Sommaire, module 5, module 3 de l'exemple défilés jusqu'en bas, en-tête à 0, logos v2 (160 px de haut) affichés à 44 px. Captures `c5-horsligne-*.png`. |
| C6 | Production | ✅ | Chrome connecté à l'extension (seul navigateur, session `joelsoatra@gmail.com`) : page servie `plan-DT53Lmdk.js`, version **3.133.0**, logos v2 ; lien « Suivi formateur » touché : écran formateur, **« Session NEC2026 : 9 participants »**, 9 cartes ; défilé jusqu'en bas, en-tête à 0 (`c6-prod-formateur-joel.jpg`). Rien de modifié ni supprimé côté serveur (lecture seule). Fenêtre privée : l'extension ne sait pas en ouvrir ; même contrôle fait avec un navigateur vierge, sans aucune session, sur `https://1sakely.org/plan/formateur` : arrivée sur `/plan/`, aucun contenu du formateur, 0 requête Supabase, version 3.133.0 (`c6-prod-sans-session.png`). |
| C7 / C8 | Lien de connexion formateur | ✅ | Sans session : Accueil sans lien ; À propos, tout en bas : « Connexion formateur » vers `https://1sakely.org/` (même onglet, cible 156 × 44 px, gris doux `#666666`) et la phrase « Connectez-vous avec Google, puis revenez sur Mon Business Plan par le sélecteur de modules. » Puis fausse session `joelsoatra@gmail.com` posée et `visibilitychange` déclenché, **sans rechargement** (marqueur de page conservé) : B-lossom devient un bouton, « Suivi formateur » apparaît ; À propos affiche « Connecté : joelsoatra@gmail.com » et rien d'autre. Session retirée + `focus` : le lien revient. Captures `c8-*.png`. |

## Contrôles de fin
- Types : `npx tsc --noEmit -p tsconfig.app.json` → **1910 avant, 1910 après**, **0 erreur** dans `business-plan`.
- `npm run build` OK.
- Aucun tiret long, tiret moyen ni point médian dans les fichiers écrits ou modifiés par ce correctif.
- SQL du serveur inchangé ; il reste le vrai verrou.

## Fichiers
Créés dans `frontend/src/modules/business-plan/` :
- `etat/session.ts` : compte de la session de l'hôte lu dans le `localStorage` seulement, relu à `visibilitychange` (visible), `pageshow`, `focus` et `storage` ; `estFormateur()` compare à la constante unique `EMAIL_FORMATEUR`.
- `composants/GardeFormateur.tsx` : garde des routes `/formateur` et `/formateur/*` (le code de l'écran formateur, donc Supabase, n'est jamais chargé pour un visiteur), roue d'attente seule, renvoi exact sur `/plan/`.

Modifiés : `App.tsx` (routes gardées), `composants/EnTete.tsx` (collant, `--bp-haut`, logos v2), `plan.css` (variables, marges de défilement), `ateliers/m5/Page.tsx` (barre d'onglets sous l'en-tête, opaque), `etat/modules.ts` (liste des modules relue au retour sur la page), `pages/Accueil.tsx` (lien formateur réactif), `pages/APropos.tsx` (lien de connexion), `pages/Formateur.tsx` et `pages/FormateurPlan.tsx` (attente = roue seule, refus = renvoi), `vite.plan.config.ts` (précache), `public/plan/logos/nec-logo-v2.png` et `blossom-blanc-v2.png` (copiés tels quels), `constants/appVersion.ts`, `package.json`. Également commités : `RAPPORT-CORRECTIF-6.md` et `6-captures/`.

## Choix et écarts (à valider par Joël)
1. **PDF : logos v1 gardés.** Le PDF utilise le logo B-lossom en couleur, qui n'a pas de version v2 ; je n'ai pas mélangé v1 et v2. `nec-logo-v1.png` et `blossom-couleur-v1.png` restent dans la précache pour le PDF hors ligne ; `blossom-blanc-v1.png` reste sur le serveur mais n'est plus précaché.
2. **Compte autre que le formateur** : après le renvoi sur l'accueil, l'en-tête lit toujours la ligne `users` du compte pour le sélecteur de modules (fonction du correctif 6). Aucune requête du formateur n'est faite ; mais ce n'est pas « zéro requête Supabase » au sens strict pour ce compte.
3. **Ligne Retour** laissée non collante (elle ne l'était pas).
4. Le message « Réservé au formateur » a disparu : un refus du serveur renvoie maintenant sur l'accueil, comme demandé.

## Surprises
- L'identifiant du Chrome noté en mémoire a encore changé (`08239667-…`) ; un seul navigateur connecté, avec la session de Joël.
- 9 participants sur le serveur (le prompt en annonçait 8).

## Recommandations
- Joël : sur votre téléphone, toucher la bannière « Nouvelle version », puis faire défiler le module 5 : l'en-tête et les onglets restent en haut.
- Pour vous connecter en formateur sur un autre appareil : À propos, tout en bas, « Connexion formateur ».
