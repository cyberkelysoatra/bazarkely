# RAPPORT ÉVO 2/3 — Vitrine « lien déjà utilisé » (marketing AHUVI + fiche d'accès)

**Module :** Gestion Eau (AHUVI) — chantier « invitation par lien WhatsApp / jeton »
**Phase :** ÉVO 2/3 (vitrine marketing pour lien mort + fiche de demande d'accès)
**Date :** 2026-06-08 (≈ 21:35 heure locale machine)
**Version déployée :** **v3.40.1** (feature v3.40.0 + correctif déterministe photos v3.40.1)
**Origine de vérification en ligne :** `https://gleaming-sorbet-a37c08.netlify.app` (origine Netlify, SW purgé)
**Commits :** `649d60b` (v3.40.0, feat) puis `0d27702` (v3.40.1, fix) sur `main`

---

## 1. Objectif livré

`EauVitrinePage` (`/i/:token`) est désormais une page à **deux visages**, pilotée par l'état
public du jeton (`getInvitationTokenState`, ÉVO 1) :

- **`valid`** → écran d'inscription **INCHANGÉ** (en-tête AHUVI, chiffres non nominatifs, 3
  bénéfices, bouton « Continuer avec Google », aide « Comment ça marche ? »). Zéro régression :
  le JSX du chemin valid est repris verbatim, le claim par jeton est inchangé.
- **`used` / `expired` / `revoked` / `unknown`** (+ **hors-ligne/erreur** → `unknown`) → **page
  vitrine marketing** : bandeau « déjà utilisé » (ton doux), hero « Itampolo Resort · Nosy Be »,
  2 blocs de texte figés (≤ 100 mots), 4 astuces d'utilisation, 3 photos du domaine (dégradation
  propre si absentes), puis **fiche « Demander un accès »** (nom/phone/fonction requis ;
  email/message optionnels). Aucune inscription par jeton n'est proposée ; **le jeton mort n'est
  jamais réclamé**.

Un **écran de chargement** (« Chargement… ») s'affiche tant que l'état du jeton n'est pas résolu.

---

## 2. Itérations & erreurs rencontrées

1. **Rédaction de la branche marketing** dans `EauVitrinePage.tsx` (composant interne `VitrinePhoto`
   + fiche). `npx tsc --noEmit` ✅, `npm run build` ✅ du premier coup.
2. **Surprise — le HEAD a avancé pendant la session** : au démarrage HEAD = `c458743` (v3.38.0,
   ÉVO 1). En préparant le versioning, `package.json` et `appVersion.ts` étaient déjà à **v3.39.0**
   (commit `4ac73d3` « ÉVO 3/3 import du répertoire → lot d'invitations WhatsApp » — chantier
   **parallèle** releveur, poussé entre-temps). Mon edit `EauVitrinePage.tsx` était bien préservé en
   working tree. → **Bump vers v3.40.0** (et non 3.39.0, déjà pris) pour éviter toute collision.
3. **Déploiement v3.40.0** (`649d60b`), confirmé en ligne (bundle `index-…` contient `3.40.0`).
4. **Surprise — Service Worker périmé** sur l'origine Netlify : la 1ʳᵉ visite affichait l'**ancien**
   comportement (branche valid toujours active). Diagnostic : SW Workbox servait l'ancien chunk
   `EauVitrinePage-Vapn-h0h.js` (sans « Itampolo ») depuis le precache, alors que le nouveau déploiement
   a un autre hash. **Résolution** : `getRegistrations().unregister()` + `caches.delete(...)` + navigation
   sur un chemin neuf → nouveau chunk `EauVitrinePage-p7QziV_1.js` chargé → **vitrine marketing OK**.
   (Piège SW connu, cf. CLAUDE.md.)
5. **Surprise — photos absentes « pending » en prod (pas d'`onError`)** : sur Netlify, un chemin
   `/gestion-eau/vitrine/<x>.jpg` absent renvoie le **fallback SPA (200 / HTML)** ; la `<img>` reste
   en état *pending* **sans déclencher `onError`** → l'ancien rendu conditionnel (icône **uniquement**
   sur `onError`) montrait un fond dégradé **sans icône**. En preview local (Vite), `onError` se
   déclenchait bien (icône affichée). → **Correctif v3.40.1** : `VitrinePhoto` rend l'**icône comme
   couche de base permanente** dans le fond dégradé, la `<img>` superposée (`object-cover`) la couvre
   quand elle charge. Dégradation « fond + icône » garantie dans **tous** les cas (absent / pending /
   onError / hors-ligne).
6. **Déploiement v3.40.1** (`0d27702`), vérifié en ligne (SW purgé) : chunk `EauVitrinePage-iTPkGabz.js`,
   **3 icônes de repère visibles** sur les emplacements photo.

Aucune erreur de compilation ; `tsc --noEmit` et `build` verts à chaque itération.

---

## 3. État des critères d'acceptation

### Compilation
- ✅ `npx tsc --noEmit` exit 0 (chaque itération)
- ✅ `npm run build` OK (`frontend@3.40.1`)

### Fonctionnel
- ✅ `/i/<jeton VALIDE>` → écran d'inscription inchangé. *(Code valid repris verbatim ; chemin gardé
  intact. Note : non re-testé en ligne avec un VRAI jeton valide — voir §6.)*
- ✅ `/i/<jeton bidon>` (inconnu) → **page marketing** (état `unknown`). **Vérifié en ligne** sur
  l'origine Netlify (texte « Ce lien d'invitation a déjà été utilisé », « ITAMPOLO RESORT · NOSY BE »,
  hero, blocs figés, astuces).
- ✅ Hors-ligne / erreur → `getInvitationTokenState` renvoie `unknown` → page marketing (jamais
  l'inscription). *(Garanti par la valeur par défaut `unknown` d'ÉVO 1 ; non re-simulé hors-ligne en
  ligne, comportement déterministe par le code.)*
- ✅ Photos absentes → **dégradation propre (fond dégradé AHUVI + icône lucide)**. **Vérifié en ligne**
  après correctif v3.40.1 : `figure svg` = 3 (icônes visibles), aucune image cassée, **aucune erreur
  console** liée à la vitrine.
- ✅ Fiche : `nom`+`phone`+`fonction` requis ; clic « Continuer avec Google » →
  - `localStorage.eau_pending_enrollment` = `{intent:'demande', nom, email, phone, fonction, message}` ✅
  - `sessionStorage.bazarkely_post_login_redirect` = `/gestion-eau/accueil` ✅
  - `sessionStorage.eau_pending_invitation_token` **retiré** (null) ✅
  - puis OAuth. **Vérifié déterministe en preview local** (storage lu avant redirection).
- ✅ Validation : champs vides → `toast.error` FR « Renseignez au moins votre nom, votre WhatsApp et
  votre fonction. » + **aucun storage écrit**. **Vérifié en preview local**.
- ✅ Select fonction : 6 options exactes `["", releveur, proprietaire, investisseur, locataire, autre]`.
  **Vérifié** (preview local + en ligne).
- ⚠️ **Bout-en-bout réel (Google + demande en base)** : NON exécuté de façon autonome. La connexion
  Google réelle exige une saisie d'identifiants interactive (hors de mon périmètre) et l'accès admin à
  `EauDemandesPage`. → **À valider par JOEL** (voir §6). La logique en amont (intention `demande` enrichie
  + retrait du jeton mort) est prouvée déterministe en preview.
- ✅ Rendu mobile : **`window.innerWidth` mesuré = 375 px** (preset mobile, preview local). En ligne sur
  desktop, `innerWidth` = 1920 px. *(Conformément à la consigne, je ne prétends pas 412 px — la mesure
  réelle est 375 px via le preset preview.)*
- ✅ Non-régression : chemin `valid` inchangé (JSX verbatim) ; aucune autre route touchée.

### Déploiement
- ⚠️ **Photos NON copiées** dans `frontend/public/gestion-eau/vitrine/` car **absentes du dépôt** au
  moment du build (les 3 `.jpg` n'ont pas été fournies dans l'arborescence). La page dégrade proprement
  sans elles (icône de repère sur fond AHUVI).
- ✅ Version bumpée (v3.40.0 puis v3.40.1) + notes FR (`appVersion.ts` + `package.json`).
- ✅ `git push origin main` (2 commits) ; **vérifié en ligne** via l'origine `*.netlify.app` (SW purgé,
  chemins neufs) : bundles `index-…` contiennent `3.40.1`, vitrine marketing rendue, icônes visibles.

---

## 4. Fichiers créés / modifiés

| Fichier | Nature | Détail |
|---|---|---|
| `frontend/src/modules/gestion-eau/components/EauVitrinePage.tsx` | **PARTAGÉ — modifié** | Branche marketing conditionnelle (`getInvitationTokenState`) ; composant interne `VitrinePhoto` (icône en couche de base + `<img>` superposée, dégradation déterministe) ; fiche « Demander un accès » (`setPendingEnrollment` intent `demande`, `removeItem(PENDING_TOKEN_KEY)` avant OAuth) ; écran de chargement ; **chemin `valid` inchangé** |
| `frontend/src/constants/appVersion.ts` | **PARTAGÉ — modifié** | `APP_VERSION` 3.40.1 + `APP_VERSION_NAME` (note FR) + 2 entrées `VERSION_HISTORY` (3.40.0 feat, 3.40.1 fix) |
| `frontend/package.json` | **PARTAGÉ — modifié** | `version` → 3.40.1 |
| `frontend/public/gestion-eau/vitrine/*.jpg` | **assets — ABSENTS** | `ahuvi-golf-practice.jpg` / `ahuvi-solaire.jpg` / `ahuvi-ponton.jpg` non présents au build ; référencés en `/gestion-eau/vitrine/<nom>.jpg` ; à déposer ultérieurement |

Aucune signature de service modifiée (réutilisation pure de `getInvitationTokenState`,
`setPendingEnrollment`, `authService.signInWithGoogle`, `PENDING_TOKEN_KEY`, briques AHUVI).

---

## 5. Présence des 3 photos au build

**ABSENTES.** Le dossier `frontend/public/gestion-eau/vitrine/` n'existe pas et aucune des 3 `.jpg`
n'était dans l'arborescence au moment du build. La page reste élégante : fond dégradé `from-ahuvi-100
to-ahuvi-50` + icône lucide de repère (`Flag` golf / `Sun` solaire / `Anchor` ponton). Dès que les
vraies photos seront déposées au bon chemin, elles recouvriront l'icône et s'afficheront normalement,
sans changement de code.

---

## 6. Écarts, surprises & recommandations pour ÉVO 3

**Écarts/surprises notables :**
1. **HEAD avancé en cours de session** (v3.38.0 → v3.39.0 par un chantier parallèle « ÉVO 3/3 import
   répertoire »). La numérotation « ÉVO » est partagée entre deux chantiers distincts → cette vitrine
   est sortie en **v3.40.x** (et non 3.39.0). À surveiller : risque de collision si plusieurs sessions
   bumpent en parallèle.
2. **SW Workbox périmé** sur l'origine Netlify : indispensable de purger (unregister + caches.delete +
   chemin neuf) pour voir un nouveau déploiement. Piège connu (CLAUDE.md / mémoire).
3. **Fallback SPA Netlify = 200/HTML pour un asset absent** → `<img>` *pending* sans `onError`. D'où le
   correctif v3.40.1 (icône en couche de base). À garder en tête pour toute future image optionnelle.

**Recommandations pour ÉVO 3 :**
- **Déposer les 3 photos** dans `frontend/public/gestion-eau/vitrine/` (`ahuvi-golf-practice.jpg`,
  `ahuvi-solaire.jpg`, `ahuvi-ponton.jpg`) — cosmétique pur, aucun code à changer.
- **Validation E2E par JOEL (interactive)** : depuis un `/i/<jeton réellement utilisé>`, remplir la fiche,
  se connecter Google (testeur sans rôle eau) → vérifier qu'une **demande d'accès** apparaît dans
  `EauDemandesPage` (admin) avec nom/phone/fonction/message, puis **nettoyer la demande de test**.
- Optionnel : règle Netlify renvoyant un vrai **404** (au lieu du fallback SPA) pour
  `/gestion-eau/vitrine/*` afin que `onError` se déclenche aussi en prod (la dégradation par icône de
  base rend cela non bloquant).
- ÉVO 3 « espace client réel » : la fiche `demande` enrichie (phone/fonction/message) est désormais
  capturée de bout en bout côté front ; côté admin, prévoir l'affichage de ces champs dans le détail
  d'une demande si pas déjà fait.

---

## 7. Preuves de vérification (synthèse)

- **Preview local (Vite, port 3000)** : jeton bidon → marketing ; select 6 options ; submit fiche →
  storage `{intent:demande,…}` + redirect `/gestion-eau/accueil` + `PENDING_TOKEN_KEY` null ; validation
  vide → toast + aucun storage ; `innerWidth` = **375 px** (preset mobile) ; **0 erreur console**.
- **En ligne (origine Netlify, SW purgé)** : v3.40.1 servie (`index-DxjJEboD.js`), chunk
  `EauVitrinePage-iTPkGabz.js` ; **vitrine marketing rendue** ; **3 icônes de repère visibles**
  (`figure svg` = 3) ; seules erreurs console = le `sw.js` 404 **pré-existant** (piège connu, non lié).

**Statut global : ÉVO 2/3 livrée et déployée en prod (v3.40.1).** Reste la validation E2E interactive
(connexion Google réelle + contrôle de la demande côté admin) à la main de JOEL.

---

## 8. Addendum — Câblage des vraies photos (v3.42.0, commit `bca1e22`)

JOEL a déposé **3 photos** dans `frontend/public/gestion-eau/vitrine/` (≈ 80–120 Ko, 1000×563 / 492).
Elles ne portaient pas les 3 noms d'origine (`solaire`/`ponton`) → j'ai **adapté `VitrinePhoto`** aux
sujets réels (légendes validées par JOEL) :

| Emplacement | Fichier | Légende | Icône |
|---|---|---|---|
| 1 | `ahuvi-golf-practice.jpg` | « Le parcours de golf prend forme. » | `Flag` (inchangé) |
| 2 | `ahuvi-residences.jpg` | « Les Résidences, pensées pour durer. » | `Home` (ex-solaire) |
| 3 | `ahuvi-villa-piscine.jpg` | « Les villas du domaine prennent vie. » | `Waves` (ex-ponton) |

- **Piège** : `frontend/public/` est **gitignored** → photos ajoutées avec `git add -f`.
- **Bump** : 3 sessions parallèles ont consommé 3.39/3.40/3.41 pendant le travail → cette livraison
  est en **v3.42.0** (HEAD était `153e91c` v3.41.0 « édition relevé bassin »).
- **Vérifié en ligne** (origine Netlify) : v3.42.0 servie ; les 3 `.jpg` renvoient `image/jpeg 200`
  (tailles exactes) ; un test `new Image()` confirme **chargement + décodage OK** des 3 (1000×492 /
  563). Dans la page, les `<img loading="lazy">` se chargent au scroll (l'icône de repère reste en
  fond d'ici là) — comportement voulu ; légendes affichées exactes.

**Statut final : ÉVO 2/3 + photos déployées en prod (v3.42.0).** Reste uniquement la validation E2E
interactive (Google réel + demande visible côté admin) à la main de JOEL.
