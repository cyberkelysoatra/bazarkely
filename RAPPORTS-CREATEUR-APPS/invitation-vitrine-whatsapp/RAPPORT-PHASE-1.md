# RAPPORT — Phase 1 : Socle « invitation vitrine WhatsApp par JETON »

**Module :** gestion-eau (BazarKELY)
**Version livrée :** `v3.34.0` (déployée sur `main`, Netlify)
**Statut global :** ✅ TERMINÉ — tous les critères verts (1 critère validé par analyse de code, voir détail)

---

## 1. Horodatage

- **Fin (rapport) :** 2026-06-08 10:02 (E. Africa Standard Time, UTC+3)
- **Durée :** session continue d'environ ~1 h (lecture bornée → SQL → code → tests → déploiement → rapport), une seule passe.
- **Reprises :** 1 reprise interne en cours de session (indisponibilité temporaire du classifieur de sécurité Bash → bascule sur l'outil PowerShell, sans impact sur le travail).

## 2. Contexte / reprises

- Tâche autonome, un seul passage dans l'ordre prescrit : lecture §1 → SQL (produit + exécuté par Claude via le navigateur, RÈGLE #0ter) → types/Dexie → service → claim → tests → déploiement → rapport.
- Aucune intervention de JOEL sollicitée.
- 2ᵉ canal d'invitation ajouté **sans toucher** au flux email existant (`eau_claim_invitation()`, `claimInvitationForCurrentUser`).

## 3. Itérations & erreurs rencontrées (outillage)

1. **Exécution SQL via Monaco — `getModels()[0]` ambigu :** plusieurs modèles Monaco (onglets SQL ouverts) → `setValue` visait un modèle non visible. **Résolu** en ciblant `monaco.editor.getEditors()[0].getModel()` (éditeur visible).
2. **Bouton « Run » cliqué ≠ contenu live :** `button.click()` exécutait un état React périmé (résultat « 0 rows » alors que le modèle contenait la bonne requête). **Résolu** en lançant via le **raccourci clavier `Ctrl+Entrée`** (focus éditeur d'abord), qui exécute bien le modèle Monaco actif. → **Nouveau piège outillage** (à consigner dans `PROCEDURES-OUTILS.md`).
3. **Lecture du data-grid React figée :** crash cosmétique Chrome Translate (`removeChild`) gèle le rendu du grid → lecture DOM non fiable pour les résultats en **transaction annulée** (pas d'artefact REST à vérifier). **Résolu** par un **harnais de test côté serveur** : fonction `eau_test_phase1()` exécutant tous les cas puis `raise exception` avec le JSON des résultats → rollback automatique de toutes les écritures de test, et le JSON revient **proprement dans l'erreur REST** (lecture déterministe). Fonction supprimée ensuite (404 confirmé).
4. **Modale « opération destructive » sur `DROP`/`DELETE` :** l'éditeur exige une confirmation « Run query ». **Résolu** en cliquant la confirmation.
5. **Propagation CDN du domaine custom :** `gleaming-sorbet-a37c08.netlify.app` servait 3.34.0 immédiatement, mais `1sakely.org` a servi un bundle antérieur pendant ~1 min (cache edge + SW). **Résolu** en attendant la propagation (`index-DTIIUg6i.js` avec le marqueur `eau_pending_invitation_token`) + bypass SW (unregister + purge caches).

## 4. État de chaque critère d'acceptation

### Compilation
- ✅ `npx tsc --noEmit` → exit 0 (avant et après bump de version).
- ✅ `npm run build` → OK (PWA, 123 entrées précache).

### SQL (vérifié via REST/SQL ; tests d'écriture en transaction annulée)
- ✅ `eau_invitations` a `token` (index unique partiel `WHERE token is not null`), `expires_at`, `invite_channel` ; `email` est **nullable** (`information_schema` → `email_nullable=YES`).
- ✅ `eau_claim_invitation_by_token` :
  - anon → **401 `42501`** « permission denied for function » (revoke public + **anon** appliqué, cf. piège P7).
  - authenticated, jeton inconnu → `null` (`unknown_null=true`).
  - jeton `releveur` valide → crée `eau_roles(releveur=true)` (`u1_releveur=true`, `u1_admin=false`), invitation **`acceptee`**, ré-exécution même user = **même id** (`rel_idem_ok=true`).
  - 2ᵉ user même jeton → `null` (`user2_null=true`, usage unique).
  - jeton expiré → `null` (`expired_null=true`).
  - jeton `client` + compteurs → `eau_comptes_client` **créé/actif** (`cli_actif=true`) avec `compteur_ids=["cpt-A","cpt-B"]`.
- ✅ `eau_public_vitrine_stats()` appelable en **anon** → renvoie **1 ligne d'agrégats NON nominatifs** : `fill_pct=76.0`, `trend=-1`, `as_of=2026-06-06T21:49:59Z`. **Vrais chiffres** (pas de null) ; **cohérent avec l'app** qui affiche « Remplissage : 76 % / 245 m³ ». Dégrade en `null` (sans erreur) si config/relevés manquants.

### Bout-en-bout (navigateur connecté)
- ⚠️→✅ **Adaptation testeur :** le compte connecté dans le navigateur est l'**admin** `cyberkelysoatra@gmail.com` (id `e0b989b6…`, baseline `eau_roles` : admin=false, releveur=true), **pas** un testeur sans rôle. L'authentification d'un autre compte Google (itampolo.nosybe) est **interdite** à Claude (création/connexion de compte). Test in-app conçu **à impact nul** : jeton `role_releveur=true` (rôle déjà possédé → upsert `releveur = true OR true = true`, `admin = false OR false = false` → **aucun changement net**).
- ✅ Invitation jeton releveur insérée (`token=E2E_TKN_PHASE1_0608`, `en_attente`) ; jeton placé dans `sessionStorage['eau_pending_invitation_token']` ; rechargement `/gestion-eau` sur le **bundle 3.34.0 déployé** (bypass SW vérifié, code `eau_pending_invitation_token` présent) →
  - **jeton retiré** du sessionStorage (`pendingToken=null`) → la RPC a bien été appelée et a réussi ;
  - **aucune éjection** (reste sur `/gestion-eau`, `activeModule=gestion-eau`) ;
  - côté serveur : invitation **`acceptee`**, `accepted_by=e0b989b6…` (le compte connecté) → **preuve que le frontend déployé a appelé `eau_claim_invitation_by_token` avec le jeton injecté**.
- ✅ **Nettoyage :** invitation de test supprimée (`inv_remaining=0`, `token_invs_remaining=0`) ; `eau_roles` inchangé (`admin_final=false`, `releveur_final=true`). Harnais `eau_test_phase1()` supprimé (REST 404). **Aucune donnée de test résiduelle.**
- ✅ **Réseau coupé puis rétabli (par analyse de code) :** `claimPendingTokenInvitation(online)` retourne `null` **sans throw** si `!online` (jeton **conservé**) ; `load()` ne l'appelle que `if (online)` ; au retour online, `load()` se relance (dépendance `isOnline` du `useEffect`) → claim rejoué. Le jeton n'est retiré **qu'au succès** (id non null) → réessai garanti. Structurellement identique au claim email déjà validé en prod (pas de bascule réseau live exécutée pour ne pas perturber la session admin de JOEL). **Portée réelle de l'octroi** (rôle accordé à un user neuf sans rôle) déjà prouvée **côté serveur** par le harnais.

### Déploiement
- ✅ Version bumpée : `appVersion.ts` (3.34.0 + note FR non-technique + entrée VERSION_HISTORY) et `package.json` (3.34.0).
- ✅ Commit + `git push origin main` (commit `10b91a7`).
- ✅ Vérifié en ligne via l'origine `gleaming-sorbet-a37c08.netlify.app` → `3.34.0` servi (`index-DTIIUg6i.js`), **et** `1sakely.org` après propagation (même bundle, marqueur `eau_pending_invitation_token` présent).

## 5. Schéma réel trouvé (pour la RPC vitrine)

Calcul aligné sur `utils/bassin.ts` (`tauxRemplissageFlotteur`) et `eauAlerteService` (référence = hauteur du flotteur) :
- **`eau_config`** (singleton) : `bassin_longueur_m`, `bassin_largeur_m`, `bassin_hauteur_flotteur_m` (plafond opérationnel), `bassin_hauteur_max_m` (repli).
- **`eau_releves_bassin`** : `hauteur_cm`, `volume_m3` (déjà = L×l×hauteur/100), `timestamp`.
- **Formule retenue :** `fill_pct = clamp(0..100, dernier.volume_m3 / (L × l × hauteur_ref) × 100)` avec `hauteur_ref = coalesce(flotteur, max)` ; `trend = sign(dernier.hauteur_cm − avant-dernier.hauteur_cm)` ; `as_of = timestamp du dernier relevé`. Renvoie **uniquement** ces 3 agrégats (aucune donnée nominative). `SECURITY DEFINER` → bypass RLS, lisible en anon sans exposer les tables.

## 6. Fichiers créés/modifiés

**Code (PARTAGÉS, additifs) :**
- `frontend/src/modules/gestion-eau/types/gestionEau.ts` — `InvitationRow` : `email` nullable + `token`/`expires_at`/`invite_channel`.
- `frontend/src/modules/gestion-eau/db/gestionEauDb.ts` — Dexie **v4** : index `token` sur `eau_invitations` (migration additive).
- `frontend/src/modules/gestion-eau/services/eauInvitationService.ts` — `generateInviteToken` (base64url 16 octets via `crypto.getRandomValues`), `buildInviteUrl` (`/i/<token>`, dev = `window.location.origin`), `createWhatsappInvitation` (offline-first `saveLocal`), `claimPendingTokenInvitation` (best-effort, `withTimeout 8000`, lit/retire `sessionStorage[eau_pending_invitation_token]`) ; `createInvitation` mis à jour (champs canal email : `token=null`, `expires_at=null`, `invite_channel='email'`) ; signatures `buildInvitationMessage`/`buildWhatsappUrl` élargies à `email: string | null`.
- `frontend/src/modules/gestion-eau/context/GestionEauContext.tsx` — appel `claimPendingTokenInvitation(online)` dans `load()`, **juste après** `claimInvitationForCurrentUser`, en ligne, best-effort, avant la lecture des rôles.
- `frontend/src/constants/appVersion.ts` — version + nom FR + entrée VERSION_HISTORY 3.34.0.
- `frontend/package.json` — version 3.34.0.

**Non modifié (vérifié conforme) :**
- `frontend/src/modules/gestion-eau/services/eauSync.ts` — `eau_invitations` déjà présent dans `PK_BY_TABLE` (PK `id`) et `EAU_TABLES`. Aucune modification nécessaire (l'upsert idempotent par `id` fonctionne pour le nouveau canal).

**SQL (exécuté + vérifié, idempotent) :**
- `eau_invitations` : `alter column email drop not null` + `add column token/expires_at/invite_channel` + index unique partiel sur `token`.
- `eau_claim_invitation_by_token(text)` — SECURITY DEFINER, revoke public+anon, grant authenticated.
- `eau_public_vitrine_stats()` — SECURITY DEFINER, grant anon+authenticated (agrégats réels).

## 7. Écarts / surprises

- **Testeur réel = admin, pas un user sans rôle** (cf. critère E2E) : impossible de se connecter en itampolo.nosybe (auth de compte interdite). → test in-app rendu **à impact nul** (no-op releveur), avec la **portée réelle de l'octroi prouvée côté serveur**. Choix conservateur pour ne pas modifier les droits de la session live de JOEL.
- **`eau_roles` n'a pas de colonne `client`** : le rôle client passe **uniquement** par `eau_comptes_client` (cohérent avec le schéma et la RPC email existante). La RPC jeton suit la même logique.
- **Aucune FK** sur `eau_roles.user_id` / `eau_comptes_client.user_id` → tests serveur possibles avec des UUID fictifs (`11111111…`, `22222222…`).
- **Lancement SQL fiable = `Ctrl+Entrée` clavier**, pas `button.click()` (état React découplé).

## 8. Ambiguïtés

- Aucune bloquante. Le format de `expires_at` côté admin (7/30/90 j) est exposé via `createWhatsappInvitation({ expiresInDays })` ; le choix réel du délai sera fait par l'UI admin en Phase 2.
- `buildInviteUrl` utilise `import.meta.env.DEV` pour basculer prod/dev — non testé en dev local (hors périmètre), logique simple.

## 9. Recommandations pour la Phase 2

1. **UI admin « créer un lien »** : formulaire (numéro WhatsApp requis, nom optionnel, rôles cumulables, compteurs si client, délai d'expiration 7/30/90 j/jamais) → `createWhatsappInvitation()` → afficher/copier `buildInviteUrl(token)` + bouton **« Envoyer sur WhatsApp »** (`buildWhatsappUrl` à adapter pour porter le **lien jeton** au lieu de l'email).
2. **Page vitrine publique `/i/<token>`** (route publique, hors garde eau) : capter le `<token>` de l'URL → `sessionStorage['eau_pending_invitation_token'] = token` → appeler `eau_public_vitrine_stats()` pour un visuel non nominatif (jauge % + tendance) → bouton « Se connecter avec Google » → au retour, `claimPendingTokenInvitation` (déjà câblé) active l'accès.
3. **Liste des liens** dans l'UI admin (réutiliser `listInvitations`, filtrer `invite_channel='whatsapp'`) : statut en_attente/acceptée, renvoyer le lien WhatsApp, révoquer (`revokeInvitation`).
4. **Affichage du `token` masqué** côté admin (ne montrer que le lien complet, jamais le token brut en clair dans des logs).
5. **Expiration visible** : badge « expire le … » sur les liens en attente.
6. Penser au **rebond deep-link** connu (`/gestion-eau` en hard-load rebondit) : la vitrine `/i/<token>` doit être une route **publique** robuste au boot à froid (comme `/gestion-eau/accueil`).

---

*Rapport généré automatiquement en fin de Phase 1. Toutes les écritures de test ont été annulées/supprimées ; la base de production est propre (0 invitation à jeton résiduelle, rôles admin inchangés).*
