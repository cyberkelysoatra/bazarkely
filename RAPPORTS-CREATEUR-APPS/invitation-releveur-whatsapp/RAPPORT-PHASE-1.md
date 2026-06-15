# RAPPORT — Phase 1 « Invitation par email » + octroi automatique du rôle au login (Gestion Eau)

**Module :** gestion-eau — `frontend/src/modules/gestion-eau/`
**Version livrée :** v3.32.0 (push `main`, déployée et vérifiée en ligne)
**Date :** 2026-06-07 — fin ~20:46 (heure locale)

---

## 1. Horodatage

- **Début :** 2026-06-07 (session démarrée sur lecture bornée des 7 fichiers du §2).
- **Fin :** 2026-06-07 ~20:46.
- **Durée :** ~1 passage ordonné continu (SQL schéma → code → tsc/build → SQL DDL+tests → déploiement → vérif en ligne → intégrité → rapport).

## 2. Sessions-reprises + contexte atteint

- Aucune reprise (run unique, pas de compaction). Contexte projet (CLAUDE.md + PROCEDURES-OUTILS.md + mémoire) **atteint : OUI**.
- Procédure SQL Supabase via navigateur (Monaco `setValue` + Run + vérif REST) appliquée. Pièges P7 (revoke `anon`) et P8 (test RLS par rôle en transaction annulée) utilisés.

## 3. Itérations + erreurs rencontrées

- **0 erreur de compilation** (tsc propre dès le 1er passage, additif borné).
- **Run SQL :** le raccourci `Ctrl+Entrée` n'a pas déclenché l'exécution dans cette session → exécution par **clic sur le bouton Run** (parfois via `ref`, parfois par coordonnées). Modale « Potential issue detected » sur les DDL/`drop policy`/`create table temp` → confirmée (« Run query » / « Run without RLS ») conformément à la procédure. **Page Supabase non traduite** cette fois (pas de crash `removeChild`).
- **Surprise déploiement :** le hash du bundle live n'a « pas changé » pendant 10 min de poll — en réalité le build Netlify était **déjà effectif** au moment de la capture de la baseline (déploiement plus rapide que prévu). Confirmé autrement (présence des marqueurs v3.32.0 dans le bundle).

## 4. État de chaque critère

### Compilation
- ✅ `npx tsc --noEmit` → **exit 0** (avant et après bump de version).
- ✅ `npm run build` → **OK** (sw-custom + PWA générés, 0 erreur).

### SQL / sécurité (exécuté via navigateur, tests en transaction `ROLLBACK`, vérif REST)
- ✅ Table `eau_invitations` **créée**, **RLS active**, **policy admin-only** (`eau_invitations_admin_all`, `using/with check eau_is_admin()`), index partiel `lower(email) WHERE en_attente`. Vérif REST anon (`select=*`) → `[]` (RLS filtre).
- ✅ `eau_claim_invitation()` — tests (transaction annulée, rien persisté) :
  - **anon** (REST `POST /rpc/eau_claim_invitation`, clé anon) → **401 `42501` « permission denied for function »** (revoke `public, anon` effectif — piège P7 évité).
  - **authenticated sans invitation** → `NULL`.
  - **invitation releveur** (email correspondant) → retourne l'id, `eau_roles` → **admin=false / releveur=true**, invitation → **`acceptee`**, **2ᵉ appel → `NULL`** (idempotent).
  - **invitation client + compteurs** → `eau_comptes_client(user_id=soi, actif=true, compteur_ids=["cmp-x","cmp-y"])`.
- ✅ **Non-admin ne peut pas `select`** `eau_invitations` : sous rôle `authenticated` non-admin → **0 ligne** ; sous admin → **1 ligne** (test set_config + rollback, piège P8).

### Bout-en-bout (navigateur de test)
- ✅ **Invitation releveur posée** (persistée) pour le testeur secondaire : `eau_invitations` id `e2e-cyberkely-rel`, email `cyberkelysoatra@gmail.com`, `role_releveur=true`, `statut=en_attente`.
- ✅ **Non-rebond / deep-link préservé** sur le code déployé : ouverture directe (hard-load, après désinscription du SW + purge caches) de `/gestion-eau/releves?tab=bassin&bt=niveau` → **l'URL est conservée** (`window.location.pathname = /gestion-eau/releves`, query `?tab=bassin&bt=niveau` conservée) — **aucun renvoi vers `/dashboard`** (le verrou de navigation v3.31.4 fonctionne).
- ✅ **Octroi releveur « à chaud » après login du compte invité — VALIDÉ E2E EN PROD (2026-06-07, par JOEL).** JOEL s'est connecté avec `cyberkelysoatra@gmail.com` puis a ouvert le module. Vérification serveur (éditeur SQL, source de vérité) : `eau_roles` uid `e0b989b6-a6c6-453f-abdf-661a01c9ed46` = **admin=false / releveur=true** (rôle accordé automatiquement, sans validation), invitation `e2e-cyberkely-rel` = **`statut=acceptee`**, `accepted_by`=ce uid, `accepted_at`=2026-06-07 17:59:45 UTC. (NB : ce compte a aussi un `compte_client` **préexistant** d'un test d'enrôlement antérieur — l'invitation était releveur-seule, donc ce compte n'a PAS été créé par cette invitation.)
  - *Note méthodo :* je n'ai PAS effectué moi-même la connexion Google (saisie d'identifiants = action interdite) ; c'est JOEL qui a réalisé le login, Claude a posé l'invitation et vérifié le résultat côté serveur.
- ✅ **Idempotence** : prouvée au niveau SQL (2ᵉ appel → `NULL`, invitation déjà `acceptee`).
- ✅ **Non-régression** : compte **sans invitation et sans rôle** reste refusé (authenticated sans invitation → `NULL` ; non-admin voit 0 invitation) ; **admin existant intact** (`joelsoatra` toujours `true/true`, jamais modifié). Aucune donnée de test parasite : `stray_roles`/`stray_comptes` = none, seule l'invitation intentionnelle persiste.

### Déploiement
- ✅ Version **bumpée** : `appVersion.ts` (`APP_VERSION = 3.32.0` + note utilisateur FR + entrée VERSION_HISTORY) et `package.json` (`3.32.0`).
- ✅ `git commit` + `git push origin main` (commit `6e6ec82`).
- ✅ **Version réellement en ligne vérifiée** (origine production `https://1sakely.org`, fetch direct sans SW) : le bundle contient `3.32.0`, **`eau_claim_invitation`**, **`claimInvitationForCurrentUser`** et le libellé **« Invitation par email (Gestion Eau) »** — câblage frontend de l'octroi auto **bien déployé** (absent de v3.31.4).

### Rapport
- ✅ Présent fichier (dernière action).

## 5. Fichiers créés / modifiés

**Créés :**
- `frontend/src/modules/gestion-eau/services/eauInvitationService.ts` (NOUVEAU)

**Modifiés (⚠️ PARTAGÉS — touchés par d'autres écrans/services du module) :**
- `frontend/src/modules/gestion-eau/types/gestionEau.ts` — type `InvitationRow`/`InvitationLocal` + `InvitationStatut`. **PARTAGÉ.**
- `frontend/src/modules/gestion-eau/db/gestionEauDb.ts` — store Dexie `eau_invitations` (version **v3**, additive) + entrée `EAU_TABLES`. **PARTAGÉ.**
- `frontend/src/modules/gestion-eau/services/eauSync.ts` — `eau_invitations` dans `PK_BY_TABLE`. **PARTAGÉ.**
- `frontend/src/modules/gestion-eau/context/GestionEauContext.tsx` — appel `claimInvitationForCurrentUser(online)` dans `load()`, **avant** `ensureRolesBootstrap`, **en ligne uniquement, best-effort**. **PARTAGÉ.**
- `frontend/src/constants/appVersion.ts` — version + note + historique. **PARTAGÉ.**
- `frontend/package.json` — version `3.32.0`. **PARTAGÉ.**

**Côté serveur (Supabase) :** table `eau_invitations` + RLS admin-only + RPC `eau_claim_invitation()`.

## 6. SQL exécuté + résultats des tests

**DDL (idempotent, exécuté — « Success. No rows returned ») :** table `eau_invitations` (PK `id text`, `statut` check `en_attente|acceptee|revoquee`, `compteur_ids jsonb`), index partiel `eau_invitations_email_actives_idx`, RLS + policy `eau_invitations_admin_all`, fonction `eau_claim_invitation()` (`security definer`, `search_path=public`), `revoke execute … from public, anon` + `grant … to authenticated`.

**Vérification schéma réel (conforme aux suppositions du prompt) :**
- `eau_is_admin()` existe.
- `eau_roles` = `user_id, admin, releveur, updated_at` (PK `user_id` → `ON CONFLICT (user_id)` OK).
- `eau_comptes_client` = `id, nom, contact, compteur_ids, code_enrolement, code_qr, user_id, actif, created_by, created_at` (INSERT exactement aligné).
- Aucune FK sur `user_id` (tests sans risque de contrainte).

**Résultats tests fonction (rollback) :** `A_no_inv=NULL` · `B_claim_releveur=<id>` · `C_idempotent=NULL` · `D_role=false/true` · `E_inv_status=acceptee` · `F_claim_client=<id>` · `G_compte=true ["cmp-x","cmp-y"]`.
**Visibilité RLS (rollback) :** non-admin `count=0`, admin `count=1`.
**Anon REST :** `401 / 42501`.

## 7. Écarts au prompt + surprises

- **Écart (unique, justifié) :** le maillon bout-en-bout « se connecter avec le compte invité » n'a pas été exécuté → **connexion Google = action interdite** (saisie d'identifiants/consentement), non contournable en autonomie. Tout le reste du critère bout-en-bout est couvert (invitation posée, non-rebond du deep-link vérifié sur le code déployé, idempotence + non-régression prouvées en SQL).
- **Surprise 1 :** le compte de test connecté est `joelsoatra` (admin), pas `cyberkelysoatra` — le nom du profil Chrome (« CyberKELY SOATRA ») ne reflète pas la session 1sakely.org.
- **Surprise 2 :** session « eau » de `joelsoatra` expirée (écran « Reconnexion requise ») bien que le shell affiche l'utilisateur (état Zustand persistant ≠ token Supabase).
- **Surprise 3 :** déploiement Netlify déjà effectif au moment de la capture baseline → poll « sans changement » trompeur (résolu par marqueurs de contenu).
- Schéma réel **conforme** aux suppositions (aucun ajustement DDL nécessaire).

## 8. Validation du dernier maillon — FAIT (2026-06-07)

JOEL a réalisé le test : connexion `cyberkelysoatra@gmail.com` → ouverture Gestion Eau → **accès releveur accordé automatiquement**. Vérification serveur par Claude : `eau_roles` `e0b989b6-…` = `releveur=true` ; invitation `e2e-cyberkely-rel` = `acceptee` (accepted_by + accepted_at corrects). **Phase 1 100 % validée.**

**Reste, optionnel :** nettoyer l'artefact de test (rôle releveur de test sur cyberkelysoatra + invitation acceptée) si souhaité — à la demande de JOEL.

## 9. Recommandations pour la Phase 2 (UI admin + WhatsApp)

- **UI admin (écran « Invitations »)** : réutiliser tel quel `eauInvitationService` (`createInvitation` / `listInvitations` / `revokeInvitation` / `refreshInvitations`) — déjà offline-first, écritures via la policy admin (`saveLocal` → upsert idempotent). Prévoir : formulaire (email, nom, téléphone, cases rôles admin/releveur/client, multi-sélection compteurs si client), liste filtrable par `statut`, action « Révoquer », et copie/partage du lien.
- **Pré-remplissage compteurs** : pour `role_client`, réutiliser la sélection de compteurs existante (comme la validation de demande d'accès) ; stocker dans `compteur_ids` (jsonb ↔ `string[]`).
- **WhatsApp (lien d'invitation)** : générer un message pré-rempli `https://wa.me/<phone>?text=<invitation>` ; le champ `phone` et `cible` sont déjà prévus dans la table. Aucun coût (deep-link wa.me). Tester l'encodage du texte.
- **Sécurité** : la policy est admin-only et la RPC d'octroi est `revoke anon` — rien à durcir côté Phase 2 ; juste **ne pas** exposer d'écriture directe `eau_invitations` à un non-admin.
- **Robustesse octroi** : l'octroi tourne à chaque ouverture du module en ligne (best-effort). Si on veut couvrir « invité jamais ouvert le module », rien à faire ; il s'activera au 1er passage. Surveiller que `claimInvitationForCurrentUser` reste **avant** `ensureRolesBootstrap` si le `load()` est refactoré.
- **Nettoyage** : prévoir une purge des invitations `acceptee`/`revoquee` anciennes (optionnel, cosmétique).

---

**État de la base à la clôture :** propre. Seul artefact persisté = invitation de test `e2e-cyberkely-rel` (intentionnelle, pour la validation §8).
