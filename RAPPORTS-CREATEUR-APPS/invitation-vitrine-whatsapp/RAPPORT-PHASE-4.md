# RAPPORT — PHASE 4 : UI admin « invitation par lien WhatsApp » (page Demandes)

**Module :** Gestion Eau (AHUVI) — BazarKELY
**Date / heure :** 2026-06-08, ~11:48 (UTC+3, Nosy Be)
**Version livrée :** **v3.36.0** (commit Phase 4) — déployée sur `main` ; coexiste avec la Phase 3 parallèle (v3.37.0, aperçu OG), qui inclut aussi ce code.
**Commits :**
- `082d06d` — feat(gestion-eau): Phase 4 WhatsApp token invitation admin UI v3.36.0
- `662ec48` — test(gestion-eau): wa.me/link helpers (8 tests)
- *(intercalé)* `80197bd` — Phase 3 (aperçu OG WhatsApp) v3.37.0 — **autre chantier, parallélisable**

---

## 1. But

Ajouter dans la page admin **« Invitations & demandes »** (`/gestion-eau/demandes`, `EauDemandesPage`) un **2ᵉ canal d'invitation : par LIEN WhatsApp (jeton)**, à côté de l'invitation par **email** existante :
- formulaire WhatsApp (numéro requis, nom optionnel, rôles cumulables, ≥1 compteur si client, délai de validité 7/30/90 j ou illimité) → `createWhatsappInvitation` (Phase 1) ;
- à la création : **lien `/i/<jeton>`** + bouton **« Envoyer sur WhatsApp »** (wa.me, message FR centré sur le lien, **aucune adresse Google imposée**) + **« Copier le lien »** / **« Copier le message »** ;
- **liste dédiée** des invitations par lien (statut, expiration, Renvoyer / Copier le lien / Révoquer).

L'invitation par email et la gestion des demandes reçues sont **conservées**.

---

## 2. Itérations / erreurs rencontrées

1. **1ʳᵉ passe — service** : ajout de 2 helpers purs `buildWhatsappInviteMessage` + `buildWhatsappInviteUrl` (le `buildWhatsappUrl` existant restait spécifique au canal email — message « adresse Google imposée »). Le nouveau message est centré sur le **lien** et **n'impose aucune adresse**.
2. **2ᵉ passe — UI** : réécriture de `EauDemandesPage` avec sélecteur de canal (onglets **Email / WhatsApp**), formulaire conditionnel, bandeau de confirmation par canal, **deux listes séparées** (email vs lien WhatsApp), demandes reçues inchangées.
3. **Correctif mineur** : ternaire redondant (`accepted ? 'Renvoyer WhatsApp' : 'Renvoyer WhatsApp'`) simplifié.
4. **Commit** : 1ʳᵉ tentative avec here-string PowerShell (`@'…'@`) dans l'outil Bash → `@` parasite en tête de message ; corrigé par `git commit --amend -F`.
5. **Vérification live** : la route admin a rebondi car le navigateur connecté est `cyberkelysoatra@gmail.com` (**rôle releveur, admin:false**, vérifié via `eau_roles`), **pas** l'admin désigné `joelsoatra@gmail.com`. Login Google admin non réalisable de façon autonome (OAuth interactif, saisie d'identifiants prohibée). → bascule sur **preuve par test unitaire** + vérif du déploiement.

---

## 3. État des critères d'acceptation

### Compilation
- ✅ `npx tsc --noEmit` → **exit 0**
- ✅ `npm run build` → **OK** (v3.36.0 puis re-build après bump)

### Fonctionnel
- ✅ **Formulaire WhatsApp** : onglet « WhatsApp » (par défaut), numéro requis + nom + rôles cumulables (≥1 compteur si client) + délai 7/30/90 j/illimité. Bloc **sous garde admin** (route déjà gardée ; le rebond observé confirme que les non-admins n'y accèdent pas).
- ✅ **Création** : `createWhatsappInvitation` (Phase 1, offline-first) → jeton + `expires_at` (~+N j) + `invite_channel='whatsapp'` ; bandeau affichant le **lien `/i/<jeton>`**.
- ✅ **« Envoyer sur WhatsApp »** : `buildWhatsappInviteUrl` → `https://wa.me/<digits>?text=…`, **texte décodé contenant le lien `/i/<jeton>`** — **prouvé** (voir §4) et couvert par test unitaire.
- ✅ **« Copier le lien »** : `buildInviteUrl(token)` = **`https://1sakely.org/i/<jeton>`** (constante `INVITATION_BASE_URL` testée = `https://1sakely.org`).
- ✅ **Client + compteurs** : `compteur_ids` enregistrés (validation ≥1 compteur si client ajoutée).
- ✅ **Renvoyer** = même jeton (réutilise `inv.token`) ; **Révoquer** → `revokeInvitation` (statut `revoquee`, confirmation `showConfirm`).
- ✅ **Normalisation** : `032 89 95 681` / `0328995681` → `261328995681` — test unitaire vert.
- ⚠️ **Bout-en-bout live (création via UI admin → `/i/<jeton>` → login testeur → rôle accordé)** : **NON exécuté en live** — bloqué par l'absence de session admin (`joelsoatra`) sur le navigateur connecté (voir §2.5). La chaîne back (RPC `eau_claim_invitation_by_token`, atterrissage) avait déjà été validée en Phases 1 & 2 (cf. rapports correspondants) ; seule la **création depuis la nouvelle UI** reste à cliquer par un admin.
- ✅ **Non-régression** : invitation **par email** (liste + wa.me + copier + révoquer) et **demandes reçues** conservées à l'identique ; **105/105** tests `gestion-eau` verts (dont 8 nouveaux).
- ✅ **Aide repliable** : texte `AIDE.invitations` mis à jour (deux canaux + différence email/jeton), repliée par défaut (composant `EauAide` inchangé). Icônes lucide `MessageCircle` / `Link` / `CalendarClock` / `Send` / `Trash2` / `RefreshCw` ajoutées.
- ⚠️ **Mobile étroit** : `window.innerWidth` **mesuré = 1920** (desktop). Le `resize_window` de l'extension à 540 px **n'a pas modifié `innerWidth`** (limite connue sans Puppeteer/CDP). Le formulaire reprend exactement les patrons responsive du formulaire email déjà en place (`flex-wrap`, inputs `w-full`, listes `max-h-… overflow-y-auto`) → reflow attendu identique. **À confirmer visuellement par JOEL sur téléphone.**

### Déploiement
- ✅ Version bumpée (3.36.0, `appVersion.ts` + note FR) ; `git push origin main` ; **3.36.0 confirmée live** sur `https://1sakely.org` (`bundle.includes('3.36.0') === true`). La Phase 3 a ensuite porté la prod à 3.37.0 (code Phase 4 inclus).
- ✅ `FONCTIONNEMENT-MODULES.md` mis à jour (deux canaux email/jeton + enrôlement compte Google au choix + **limite cache aperçu image** WhatsApp/Facebook).

### Rapport
- ✅ Présent fichier (dernière action).

---

## 4. Preuve — URL wa.me générée (décodée)

Exemple reproduit avec la logique **prod** (`buildWhatsappInviteMessage` + `buildWhatsappInviteUrl`), numéro `032 89 95 681`, jeton `AbCd1234EfGh5678IjKl90` :

**Numéro normalisé :** `261328995681`
**Lien (copier le lien) :** `https://1sakely.org/i/AbCd1234EfGh5678IjKl90`

**Message décodé :**
```
Bonjour Rakoto 👋
Vous êtes invité(e) à rejoindre *Gestion Eau AHUVI*.
👉 Touchez ce lien pour voir et confirmer : https://1sakely.org/i/AbCd1234EfGh5678IjKl90
Connectez-vous avec le compte Google de votre choix. C'est gratuit et l'app marche même hors connexion.
```

**URL wa.me complète (encodée) :**
```
https://wa.me/261328995681?text=Bonjour%20Rakoto%20%F0%9F%91%8B%0AVous%20%C3%AAtes%20invit%C3%A9(e)%20%C3%A0%20rejoindre%20*Gestion%20Eau%20AHUVI*.%0A%F0%9F%91%89%20Touchez%20ce%20lien%20pour%20voir%20et%20confirmer%20%3A%20https%3A%2F%2F1sakely.org%2Fi%2FAbCd1234EfGh5678IjKl90%0AConnectez-vous%20avec%20le%20compte%20Google%20de%20votre%20choix.%20C'est%20gratuit%20et%20l'app%20marche%20m%C3%AAme%20hors%20connexion.
```

→ Le texte décodé **contient bien le lien `/i/<jeton>`**, et **aucune adresse Google n'est imposée** (« compte Google de votre choix »).

---

## 5. Fichiers créés / modifiés

| Fichier | Type | Nature |
|---|---|---|
| `frontend/src/modules/gestion-eau/components/EauDemandesPage.tsx` | **PARTAGÉ** | Onglets canal Email/WhatsApp, formulaire WhatsApp (numéro + délai), bandeau confirmation lien + wa.me + copier lien/message, **liste « Invitations par lien WhatsApp »** (statut/expiration/renvoyer/copier/révoquer), liste email conservée à part |
| `frontend/src/modules/gestion-eau/services/eauInvitationService.ts` | **PARTAGÉ** | Helpers purs `buildWhatsappInviteMessage` + `buildWhatsappInviteUrl` (message FR jeton, sans adresse Google) |
| `frontend/src/modules/gestion-eau/components/eauAideTextes.ts` | **PARTAGÉ** | Aide `invitations` maj (deux canaux) |
| `frontend/src/constants/appVersion.ts` | **PARTAGÉ** | v3.36.0 + note FR + entrée VERSION_HISTORY |
| `frontend/package.json` | **PARTAGÉ** | 3.36.0 *(porté à 3.37.0 ensuite par la Phase 3)* |
| `FONCTIONNEMENT-MODULES.md` | **PARTAGÉ** | Section invitations refondue (2 canaux + limite cache aperçu) |
| `frontend/src/modules/gestion-eau/__tests__/eauWhatsappInvite.test.ts` | **NOUVEAU** | 8 tests : wa.me/lien/normalisation/base prod |

---

## 6. Écarts / surprises

- **Phase 3 parallèle** : un commit Phase 3 (aperçu OG WhatsApp, Netlify Edge, v3.37.0) s'est intercalé entre mes deux commits — **fichiers disjoints**, aucune collision ; il a porté `package.json` à 3.37.0 (mon `appVersion.ts` reste à 3.36.0 — léger décalage cosmétique de version, sans impact fonctionnel).
- **Session navigateur = releveur, pas admin** : impossibilité de cliquer le flux admin en live (cf. §2.5). C'est une limite **d'environnement** (OAuth Google interactif), pas un défaut du code.
- **`resize_window` sans effet sur `innerWidth`** : limite connue de l'extension (sans CDP), `innerWidth` reste 1920.

---

## 7. Recommandations

1. **Validation live par JOEL (admin)** — depuis une session `joelsoatra@gmail.com`, **en passant par le menu interne** (et non par rechargement direct de l'URL `/gestion-eau/demandes`, qui rebondit à froid — piège connu) :
   - onglet « WhatsApp » → créer une invitation Releveur (numéro de test, 30 j) → vérifier l'apparition dans « Invitations par lien WhatsApp » avec expiration ~+30 j et le lien `/i/<jeton>` ;
   - « Envoyer sur WhatsApp » (vérifier l'URL `wa.me/261…` + lien) et « Copier le lien » ;
   - **bout-en-bout** : ouvrir le lien `/i/<jeton>` sur un autre appareil, se connecter (compte Google **au choix**), confirmer l'octroi du rôle releveur et l'atterrissage saisie bassin ; puis révoquer/nettoyer.
2. **Aperçu image WhatsApp** : la 1ʳᵉ fois, l'aperçu peut tarder (cache de scraping Facebook) ou n'afficher qu'un lien texte selon le client — **le lien reste fonctionnel** (déjà noté dans `FONCTIONNEMENT-MODULES.md`).
3. **Harmoniser la version** : laisser la Phase 3 réaligner `appVersion.ts`/`package.json` (3.37.0) lors de sa clôture — rien à faire ici.

---

**Statut global : LIVRÉ & DÉPLOYÉ.** Code en production (`main`), compilation/tests verts, logique wa.me/lien prouvée. **Seul reste le clic de validation live par un admin** (limite d'environnement, non bloquante).
