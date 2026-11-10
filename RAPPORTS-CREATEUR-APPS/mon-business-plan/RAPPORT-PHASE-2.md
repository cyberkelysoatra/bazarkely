# Rapport NEC-CC-02 : Mon Business Plan, phase 2 (suivi du formateur en direct)

Réf. NEC-CC-02 · version **3.130.0** · commit `2c18870` sur `cloudflare-migration`

## Durées et déroulement
- Début : 10/11/2026 08:14 · mise en ligne : 09:09:30 · fin des contrôles : 09:17 · durée active ≈ 1 h 05 (interruption de JOEL pendant le build comprise).
- Une seule session, fenêtre de contexte non atteinte.
- Serveur de dev : port **3003** (`.claude/launch.json`, entrée « Plan dev (3003) », non commitée), laissé tourner. Build servi par `vite preview` sur **4183**.
- Itérations notables :
  1. `delete` sur des champs obligatoires du type `Plan` refusé par TypeScript (2 erreurs) : remplacé par une copie sans `telephone` ni `email`.
  2. Banc C4 hors ligne sur le serveur de dev : page blanche, car le serveur de dev ne peut pas fournir un écran pas encore chargé quand le réseau est coupé (pas de service worker en dev). C4 rejoué sur le **build avec service worker**, comme sur un vrai téléphone : vert.
  3. Banc : sélecteurs « Téléphone » ambigus (la mention « Reste sur votre téléphone » du champ e-mail) et attente d'envoi trop large ; corrigés.

## Critères d'acceptation
Banc : Playwright + Chrome système (`channel: 'chrome'`), **412 × 869, DPR 3,5, tactile** ; mesuré `innerWidth === 412`, `devicePixelRatio === 3.5`, `scrollWidth === 412` sur l'accueil, l'écran Rejoindre, le sommaire et l'écran formateur.

| | Critère | Résultat |
|---|---|---|
| C1 | SQL vérifié | ✅ |
| C2 | `bp_envoyer` anonyme | ✅ |
| C3 | Accès refusés | ✅ (un écart, voir plus bas) |
| C4 | Banc 412 px en ligne puis hors ligne | ✅ |
| C5 | Travailler seul / Arrêter l'envoi | ✅ |
| C6 | Écran formateur | ✅ (en production, voir écarts) |
| C7 | `/plan/` sans rejoindre : zéro requête Supabase | ✅ |
| C8 | Production | ✅ |
| C9 | Rapport | ✅ ce fichier |

### C1 : base (migration `supabase/migrations/20261110000000_nec_plan_suivi.sql`, SQL du prompt à l'identique, appliqué par le connecteur Supabase)
Résultat de la requête de contrôle :
```
rls            : bp_plans {rls:true, force:true} · bp_sessions {rls:true, force:true}
table_privs    : []   (anon et authenticated : aucun droit sur les deux tables)
routine_privs  : bp_admin_liste/authenticated · bp_admin_plan/authenticated · bp_admin_session/authenticated ·
                 bp_envoyer/anon · bp_envoyer/authenticated · bp_rejoindre/anon · bp_rejoindre/authenticated ·
                 bp_retirer/anon · bp_retirer/authenticated
proacl         : postgres + rôles ci-dessus seulement, service_role absent partout
session        : NEC2026 « Nosy Be Entrepreneurship Camp 2026 », ouverte, purge_le 2026-12-31
cron           : bp-purge, 15 1 * * *
```

### C2 : `bp_envoyer` avec la clé anon (API REST)
```
bp_rejoindre(" nec2026 ")          → {"ok": true, "code": "NEC2026", ...}
bp_rejoindre("XXX")                → {"ok": false, "raison": "CODE_INCONNU"}
nouveau plan, rev 5                → {"ok": true, "rev": 5}      (insertion)
même plan, rev 5, autre contenu    → {"ok": true, "rev": 5}
même plan, rev 3, autre contenu    → {"ok": true, "rev": 5}
autre jeton, rev 9                 → {"ok": false, "raison": "JETON"}
jeton trop court                   → {"ok": false, "raison": "JETON"}
session fermée, rev 20             → {"ok": false, "raison": "SESSION_FERMEE"}
```
Lecture en base après ces appels : `rev 5`, `contenu = {"notes":"v5","identite":{"nomPrenom":"Banc C2"}}` (le contenu des envois rev 5 et 3 n'est pas passé ; **téléphone et e-mail envoyés, absents en base**), `vu_at (05:18:34) > maj_at (05:18:29)` : seul `vu_at` a bougé.

### C3 : accès refusés
- Clé anon : `GET /rest/v1/bp_plans` et `/bp_sessions` → `42501 permission denied for table`.
- Utilisateur connecté non Joël (rôle `authenticated`, identifiant réel d'un autre compte, simulé en SQL) : `select bp_plans` et `bp_sessions` → `42501` ; `bp_admin_liste`, `bp_admin_plan`, `bp_admin_session` → **`P0001 NON_AUTORISE`** ; session restée ouverte.
- Même simulation avec l'identifiant de Joël : `bp_admin_liste` et `bp_admin_plan` renvoient la ligne.
- `bp_retirer` avec le bon jeton : ligne effacée (compte 0).

### C4 : banc 412 px (build + service worker, « Prêt pour le mode avion ✓ » atteint)
```
Nouveau projet → écran Rejoindre proposé tout de suite ; sans case cochée : « Cochez la case d'accord… »
code NEC2026, prénom Banc412, accord → sommaire
identité : nom « Banc CC-02 », téléphone et e-mail remplis ; m5 : unité « bouteille », prix 1500
envoi en ligne : 200 {"ok": true, "rev": 2}, reçu 6,0 s après la dernière frappe (5 s de calme + réseau)
charge envoyée : téléphone présent ? false · e-mail présent ? false · progression {identite:13, m5:22, autres 0}
hors ligne : prix 1600, sommaire → pastille « En attente de réseau » (toujours là 6 s plus tard, 0 envoi)
retour du réseau : 200 {"ok": true, "rev": 3} 0,6 s après, prix 1600
pastille : « Envoyé au formateur à 9 h 03 »
```
Serveur : ligne `3dc952c5…` rev 3, prix 1600, unité « bouteille », nom « Banc CC-02 », sans `telephone` ni `email`. Puis ajout d'une alerte (apport 1 000 000, stock 500 000) : envoi rev 4 avec `alertes=["financement"]` 6,3 s après.

### C5
- **Travailler seul** (navigateur neuf) : sommaire sans pastille, carte « Rejoindre la formation » présente, saisie m5 et notes, 8 s d'attente, rechargement : **42 requêtes, 0 vers Supabase**.
- **Arrêter l'envoi** : sur le banc, pastille partie, carte « Rejoindre » revenue, ligne effacée du serveur (compte 0). En production (C8), `bp_retirer` répond 200.

### C6 : écran formateur
Fait **en production** (`https://1sakely.org/plan/formateur`) dans Chrome, profil **CyberKELY SOATRA (cyberkelysoatra@gmail.com)** vérifié sur myaccount.google.com, session de l'app ouverte sur `joelsoatra@gmail.com` :
- lien discret « Suivi formateur » sur l'accueil ✅
- carte « Banc412 / Banc CC-02 », 5 %, 11 mini-barres, « Dernière activité il y a 5 min », « 1 alerte du module 5 » avec info-bulle « Financement du démarrage pas équilibré » ✅
- actualisation toutes les 15 s : compteur 1 → 2 → 3, « Mis à jour à 09:10:28 » puis « 09:10:43 » ✅
- toucher la carte : sommaire en lecture seule (Module 5 : 44 %) ; m5 : 0 champ de saisie, bandeau « Lecture seule », « bouteille », « 1 600 Ar », alerte affichée, pas de barre de navigation participant ; m1 : écran d'attente « remplissez la page 4 du cahier papier » ✅
- « Fermer la session » → confirmation → « fermée, plus aucun envoi accepté » ; le plan TEST modifié pendant ce temps affiche « **Envoi refusé : session fermée** » ; « Rouvrir » → confirmation → « ouverte » ; la note en attente part toute seule au retour sur la page ✅
- 412 px : banc avec une fausse session locale et des réponses serveur simulées (aucun vrai jeton) : `innerWidth 412`, `scrollWidth 412`, 3 cartes triées par prénom, prénom et projet longs repliés, 4 alertes dépliées, « tirer pour actualiser » : 1 → 2 appels ✅
- sans session (`localhost:4183/plan/formateur`) : « Réservé au formateur », 0 erreur console ✅

### C7
Navigateur neuf, `/plan/`, Nouveau projet, Travailler seul, retour à l'accueil, 4 s : **123 requêtes, 0 vers Supabase** (dev). Même résultat en C5 sur le build.

### C8 : production
- Poussé 09:07, en ligne **09:09:30** : `/plan/` sert `plan-DYeP8sWs.js` qui contient `3.130.0` (même fichier que le build testé) ; `/plan/formateur` 200 `text/html` ; nouveau service worker `sw.js?v=plan-DYeP8sWs.js` actif après la bannière « Nouvelle version ».
- Vraie inscription depuis la production : Nouveau projet → Rejoindre (NEC2026, prénom TEST, accord) → nom « **TEST CC-02** » → pastille « Envoyé au formateur à 9 h 13 » → visible sur l'écran formateur (« TEST / TEST CC-02 / 1 % / à l'instant »).
- Effacé par « Arrêter l'envoi » (`bp_retirer` 200), plan local supprimé du navigateur.
- État final du serveur : **0 plan**, session NEC2026 **ouverte**.

## Contrôles de fin
- Types : `npx tsc --noEmit -p tsconfig.app.json` → **1910 avant, 1910 après**, 0 erreur dans `business-plan`.
- `npm run build` OK. Poids : entrée `plan-*.js` **117,2 kB** compressés (111,6 en phase 1, +5,6 kB). `@supabase/supabase-js` reste dans un fichier à part (`index-*.js`, 35,7 kB compressés) chargé seulement à l'inscription ou sur l'écran formateur. 0 `jsxDEV`.
- Service worker : il ne touche jamais une autre origine (`url.origin !== self.location.origin → return`), donc aucune réponse Supabase n'est mise en cache ; rien à changer.

## Fichiers
Créés :
- `supabase/migrations/20261110000000_nec_plan_suivi.sql`
- `frontend/src/modules/business-plan/sync/supabase.ts` (client participant anonyme sans session, client formateur sur la session partagée, chargés à la demande)
- `frontend/src/modules/business-plan/sync/formateur.ts` (appels `bp_admin_*`, textes des alertes)
- `frontend/src/modules/business-plan/pages/Formation.tsx`, `pages/Formateur.tsx`, `pages/FormateurPlan.tsx`

Modifiés (module seulement) :
- `db/base.ts` (Dexie version 2 : table `liens`, `plans` inchangée), `sync/index.ts` (file d'envoi), `main.tsx` (`demarrerSuivi()`), `App.tsx` (routes), `pages/Accueil.tsx` (Nouveau projet → Rejoindre, lien discret), `pages/Sommaire.tsx` (pastille, carte Formation, Arrêter l'envoi)

Fichiers partagés : `frontend/src/constants/appVersion.ts`, `frontend/package.json` (version). Aucun fichier `ateliers/m1..m4, prix` ni `data/exemple/*` touché (sessions parallèles) ; `frontend/dev-harness/` (non suivi, autre session) laissé hors commit.

## Écarts au prompt
- **C3, `bp_admin_liste` en anonyme** : refusé par `42501 permission denied for function` et non par `NON_AUTORISE`, car le SQL du §4 n'accorde ces fonctions qu'à `authenticated`. C'est plus strict ; `NON_AUTORISE` est bien levé pour un connecté non Joël.
- **C6 fait en production et non sur `localhost:3000`** : le port 3000 répond « Upgrade Required » (canal de rechargement à chaud d'un autre serveur Vite, pas de page), et la session de Joël n'existe que sur l'origine `1sakely.org`. Me connecter moi-même avec le vrai compte de Joël sur une autre origine aurait été une connexion avec ses identifiants : je ne l'ai pas fait. Le 412 px du formateur est prouvé à part, au banc, avec une fausse session et des réponses simulées.
- **C4 sur le build (4183) et non sur le serveur de dev** : hors ligne, seul le service worker peut fournir les écrans (comme en phase 1).
- Statut d'envoi gardé dans la ligne `liens` elle-même (`confirme`, `sale`, `envoyeLe`, `enAttente`, `refus`) plutôt qu'une table à part.
- Ajouts : retraits demandés hors ligne gardés dans `localStorage['nec.retraits']` et rejoués au retour du réseau ; inscription demandée hors ligne confirmée par `bp_rejoindre` au retour du réseau (refus éventuel affiché dans la pastille) ; état ouvert/fermé de la session lu par `bp_rejoindre` (aucune fonction `bp_admin_*` ne le donne) ; prénom prérempli avec le dernier mot de « Nom et prénom ».
- `APP_VERSION_NAME` mis à « Mon Business Plan : suivi du formateur en direct ».

## Surprises
- Le port 3000 n'est pas une page mais le canal de rechargement à chaud partagé de `vite.config.ts` : tout serveur Vite lancé sur un autre port essaie aussi de s'y brancher (erreurs WebSocket sans effet dans la console).
- La fenêtre Chrome du profil CyberKELY s'est réduite à 117 × 222 px après un redimensionnement : clics souris impossibles, les deux derniers boutons (« Rouvrir » / « Confirmer », « Arrêter l'envoi » / « Arrêter ») ont été déclenchés dans la page.
- Pendant le tout premier instant de l'écran formateur, l'état de la session est inconnu : le bouton affiche « Fermer la session » grisé jusqu'à la réponse (1 à 2 s).

## Ce que le prompt n'avait pas prévu
- Comment tester l'écran formateur en local sans la session de Joël sur l'origine locale.
- Que faire d'un « Arrêter l'envoi » sans réseau (traité : effacement local immédiat, effacement serveur au retour du réseau).
- Comment le formateur connaît l'état ouvert/fermé (traité par `bp_rejoindre`).

## Recommandations
- Si l'écran formateur doit servir en local, donner un port fixe et libre à la page plan et y ouvrir la session de Joël une fois.
- Petite finition possible : afficher « Session… » au lieu de « Fermer la session » grisé pendant la première seconde.
- Le jour J, montrer aux participants la pastille du sommaire : « En attente de réseau » est normal sans Wi-Fi, l'envoi part tout seul ensuite.
