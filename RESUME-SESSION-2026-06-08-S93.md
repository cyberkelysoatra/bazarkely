# RÉSUMÉ SESSION S93 — 2026-06-08

## Gestion Eau — ÉVO 2/3 « vitrine lien déjà utilisé » + câblage des 3 photos

### Objectif
Transformer `EauVitrinePage` (`/i/:token`) en page à **deux visages** selon l'état du jeton
(`getInvitationTokenState`, ÉVO 1) : lien valide → inscription inchangée ; lien mort
(`used`/`expired`/`revoked`/`unknown` + hors-ligne) → **page vitrine marketing AHUVI** + fiche
« Demander un accès » (enrôlement `intent: 'demande'`, **sans jamais réclamer le jeton mort**).

### Livré & déployé (validé en prod par JOEL)
- **v3.40.0** (`649d60b`) — branche marketing conditionnelle : bandeau « déjà utilisé », hero
  Itampolo Resort, 2 blocs texte figés, 4 astuces, 3 emplacements photo (dégradation propre),
  fiche d'accès (nom/phone/fonction requis ; email/message optionnels ; select fonction). Submit :
  `setPendingEnrollment(intent demande)` + `bazarkely_post_login_redirect=/gestion-eau/accueil` +
  **`removeItem(PENDING_TOKEN_KEY)`** avant OAuth. Chemin `valid` **inchangé** (zéro régression).
- **v3.40.1** (`0d27702`) — dégradation déterministe : l'icône lucide devient **couche de base
  permanente** (le fallback SPA Netlify renvoie 200/HTML pour un asset absent → `<img>` reste
  *pending* sans `onError` ; l'ancien rendu icône-sur-onError montrait un fond vide).
- **v3.42.0** (`bca1e22`) — **3 vraies photos** déposées par JOEL dans `public/gestion-eau/vitrine/`
  et câblées (légendes validées) : `ahuvi-golf-practice.jpg` « Le parcours de golf prend forme. »,
  `ahuvi-residences.jpg` « Les Résidences, pensées pour durer. », `ahuvi-villa-piscine.jpg`
  « Les villas du domaine prennent vie. ». `public/` gitignored → `git add -f`.

### Vérifications
- `tsc --noEmit` + `build` verts à chaque itération.
- En ligne (origine `gleaming-sorbet-a37c08.netlify.app`, SW purgé) : vitrine marketing rendue,
  3 photos servies `image/jpeg 200`, décodage confirmé (`new Image()` : 1000×563/492).
- **Validé en prod par JOEL** (capture 22:17) : lien obsolète → page de présentation, photo golf
  chargée (lazy OK sur téléphone réel).

### Pièges rencontrés
- **Versions partagées entre chantiers parallèles** : 3.39/3.40/3.41 consommées par d'autres
  sessions pendant le travail → toujours `git rev-parse HEAD` + version committée AVANT de bumper.
- **SW Workbox périmé** sur Netlify : purger (unregister + caches.delete + chemin neuf).
- **`frontend/public/` gitignored** → `git add -f` pour les assets.

### Reste à faire
- ⚠️ **Validation E2E interactive (JOEL)** : depuis un lien mort, remplir la fiche + connexion Google
  réelle (compte test sans rôle) → vérifier la demande dans `EauDemandesPage` admin (nom/phone/
  fonction/message), puis nettoyer.
- **ÉVO 3/3 de la vitrine** : à cadrer (la précédente « ÉVO 3/3 » committée concerne le chantier
  parallèle « import répertoire releveur », pas la vitrine).

### Baseline prod : **v3.42.0**
Rapport : `RAPPORTS-CREATEUR-APPS/invitation-vitrine-whatsapp/RAPPORT-EVO-2.md`.
