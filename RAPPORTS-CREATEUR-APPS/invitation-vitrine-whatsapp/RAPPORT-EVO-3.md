# RAPPORT — ÉVO 3/3 : Import du répertoire téléphone → invitations WhatsApp par lot

**Horodatage :** 2026-06-08 21:22 (UTC+3, Antananarivo)
**Module :** Gestion Eau (AHUVI) — page admin « Invitations & demandes » (`/gestion-eau/demandes`)
**Commit ÉVO 3 :** `4ac73d3` — `feat(gestion-eau): EVO 3/3 import phone contacts -> batch WhatsApp invitations (v3.39.0)`
**Branche :** `main` (poussé ; déploiement Netlify confirmé LIVE)

---

## 1. Résumé

Ajout **strictement additif** sur `EauDemandesPage` : un bouton « Importer du répertoire »
(Contact Picker API, Android Chrome) permet de sélectionner plusieurs contacts du téléphone,
de les revoir/éditer dans un panneau de lot (rôle commun Releveur|Administrateur, délai commun,
lignes éditables + suppression), puis de créer toutes les invitations par jeton WhatsApp d'un
coup et d'obtenir, pour chacune, un bouton « Envoyer sur WhatsApp » (wa.me) + « Copier le lien ».

Aucune signature de `eauInvitationService.ts` modifiée (réutilisation seule de
`createWhatsappInvitation`, `buildWhatsappInviteUrl`, `buildInviteUrl`, `normalizeWhatsappNumber`).

---

## 2. Itérations / erreurs rencontrées

| # | Évènement | Résolution |
|---|-----------|------------|
| 1 | Edit du bump de version échoue (apostrophes `\'` échappées dans `appVersion.ts`) | Édité en matchant la forme échappée `d\'invitation` ; OK |
| 2 | Scan récursif des chunks Netlify (×107, double fetch cache-bust) **gèle le renderer** (CDP timeout 45 s) | Remplacé par un scan **léger** : index → chunks d'entrée → 1 seul chunk `EauDemandesPage` |
| 3 | 1ʳᵉ vérif Netlify : ancien chunk `EauDemandesPage-Bq9l4sHN.js` sans le marqueur → déploiement pas encore propagé | Attente ~2 min puis re-scan : nouveau chunk `EauDemandesPage-CAl3ZhYm.js` **avec** le marqueur |
| 4 | `package.json` passé à 3.40.0 + HEAD avancé à `649d60b` pendant la session | = session **parallèle ÉVO 2** (autorisée par le prompt) ; commit ÉVO 3 intact dans l'historique linéaire, code inclus dans le déploiement |

Aucune erreur de compilation ni de test.

---

## 3. État des critères d'acceptation

### Compilation
- ✅ `npx tsc --noEmit` → exit 0
- ✅ `npm run build` → exit 0 (3.39.0 puis 3.40.0 côté session parallèle)

### Fonctionnel
- ✅ **Fallback hors Android** : sur desktop Chrome de test, le prédicat `isContactPickerSupported()`
  exécuté en live renvoie `false` (`'contacts' in navigator` = false, `'ContactsManager' in window`
  = false) → le bouton se rend **désactivé** avec l'aide « Disponible sur Android (Chrome) ». Le reste
  de la page (formulaire d'invitation unitaire, listes, validation) est inchangé.
- ✅ **Logique de mapping** (vérifiée en console live + 5 tests unitaires) : entrée
  `[{name:['A'],tel:['032…']}, {name:['B'],tel:[]}]` → **1 contact retenu (A)**, **1 ignoré (B)**,
  `ignored = 1`. Conforme.
- ✅ **Revue du lot** : rôle commun (radio segment admin **xor** releveur, défaut Releveur), délai
  commun (`<select>` 7/30/90/Illimité, défaut 30), lignes éditables (nom + numéro), suppression d'une
  ligne (`Trash2`), compteur des ignorés.
- ✅ **Création du lot** : N appels `createWhatsappInvitation` séquentiels avec `role_admin/role_releveur`
  selon le rôle commun, `role_client:false`, `compteur_ids:[]`, `expiresInDays` commun, `invited_by` =
  admin courant. Les invitations rejoignent la liste « Invitations par lien WhatsApp » via `reload()`.
- ✅ **Liens prêts** : chaque invitation du lot a « Envoyer sur WhatsApp » (`buildWhatsappInviteUrl`,
  repli message copié si l'ouverture échoue, via `openWhatsappToken`) et « Copier le lien »
  (`buildInviteUrl(token)`).
- ✅ **Non-régression** : l'ancien marqueur « Invitations par lien WhatsApp » est toujours présent
  dans le chunk déployé (`oldMarker:true`) ; formulaire email/WhatsApp et demandes reçues inchangés.
- ⚠️ **`window.innerWidth` mesuré = `2560` px** (et non ~528). `resize_window(528×900)` a renvoyé
  « succès » mais la fenêtre est restée mesurée à 2560 px (fenêtre maximisée / écran haute densité côté
  JOEL). Valeur **réellement mesurée** rapportée, sans extrapolation. Le rendu mobile étroit reste à
  confirmer par JOEL.

### Déploiement
- ✅ Version bumpée (3.39.0) + note FR + entrée `VERSION_HISTORY`.
- ✅ `git push origin main` effectué (commit `4ac73d3`).
- ✅ **Vérifié en ligne via l'origine Netlify** `gleaming-sorbet-a37c08.netlify.app` (SW prod absent
  sur cette origine) : nouveau chunk `EauDemandesPage-CAl3ZhYm.js` (≠ ancien `Bq9l4sHN`) contenant
  « Importer du répertoire » → **ÉVO 3 EST EN PRODUCTION**.

### Rapport
- ✅ Présent fichier (action finale).

---

## 4. Fichiers créés / modifiés

| Fichier | Type | Détail |
|---------|------|--------|
| `frontend/src/modules/gestion-eau/utils/contactImport.ts` | **NOUVEAU** | Helper PUR `mapImportedContacts` (mapping contacts répertoire → lignes d'invitation ; écart + comptage des sans-numéro ; tolère null/undefined) |
| `frontend/src/modules/gestion-eau/components/EauDemandesPage.tsx` | **MODIFIÉ (PARTAGÉ)** | Détection Contact Picker + bouton import (désactivé hors support) + aide repliable + panneau de revue du lot + panneau « Liens prêts à envoyer » + handlers (`openContactPicker`, `updateBatchRow`, `removeBatchRow`, `cancelBatch`, `createBatch`) + helper `isContactPickerSupported()` |
| `frontend/src/modules/gestion-eau/__tests__/eauContactImport.test.ts` | **NOUVEAU** | 5 tests du mapping (retenue/écart + compteur, nom/email, sans chiffre, null/vide, sans nom) |
| `frontend/src/constants/appVersion.ts` | **MODIFIÉ (PARTAGÉ)** | `APP_VERSION` 3.39.0 + note FR + entrée `VERSION_HISTORY` |
| `frontend/package.json` | **MODIFIÉ (PARTAGÉ)** | `version` 3.39.0 (porté ensuite à 3.40.0 par la session parallèle ÉVO 2) |

> `eauInvitationService.ts` : **NON modifié** (réutilisation seule, conforme à la consigne de sobriété).

**Tests :** 110/110 passants (dont 5 nouveaux). tsc OK. build OK.

---

## 5. Comportement Contact Picker observé

- **Desktop Chrome (navigateur de test JOEL)** : `'contacts' in navigator` = `false`,
  `'ContactsManager' in window` = `false` → `isContactPickerSupported()` = **false** →
  **fallback propre** (bouton désactivé + mention). Aucune erreur, aucun plantage.
- **Sélecteur réel (Android Chrome)** : **non testable depuis l'extension Chrome desktop**
  (le sélecteur de contacts Android n'existe pas hors appareil). Vérifié **par logique** (prédicat de
  détection + mapping pur + appels `createWhatsappInvitation`) et **à confirmer par JOEL sur un Android**
  (HTTPS, geste utilisateur requis par l'API). À noter : `navigator.contacts.getProperties()` est
  appelé avant `select()` pour n'ajouter `email` que s'il est proposé par l'appareil.

---

## 6. Écarts / surprises

1. **Session active = releveur (itampolo), pas admin** : la page `/gestion-eau/demandes` est réservée
   à l'admin ; avec la session courante elle rebondit vers `/gestion-eau`. La vérification **visuelle**
   du panneau admin n'a donc pas pu se faire dans le navigateur (l'OAuth d'un compte admin ne peut pas
   être effectué à la place de JOEL). Vérification faite par : déploiement du bon code (marqueur dans
   le chunk live), logique de détection/mapping exécutée en console, tests unitaires.
2. **`innerWidth` non réduit par `resize_window`** (resté 2560) : valeur mesurée rapportée telle quelle.
3. **Session parallèle ÉVO 2** active simultanément : a porté la version à 3.40.0 et avancé `main`
   par-dessus le commit ÉVO 3. Sans impact — historique linéaire, code ÉVO 3 inclus dans le build live.

---

## 7. Recommandations

- **À confirmer par JOEL sur un téléphone Android (Chrome), connecté en admin** : ouvrir
  « Invitations & demandes » → « Importer du répertoire » → choisir 2-3 contacts → vérifier le
  pré-remplissage nom/numéro, le rôle/délai commun, la création du lot, puis l'envoi WhatsApp d'un lien.
- **Limite assumée** : WhatsApp s'ouvre **un contact à la fois** (pas d'envoi groupé gratuit) ;
  l'écran le signale explicitement.
- **Évolution possible** : mémoriser le dernier rôle/délai choisis, ou marquer visuellement dans la
  liste « Liens prêts » ceux déjà envoyés (l'API wa.me ne renvoie pas d'accusé, donc purement local).
