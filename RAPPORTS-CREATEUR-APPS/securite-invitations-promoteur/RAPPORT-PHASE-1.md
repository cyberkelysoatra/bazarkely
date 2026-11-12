# Rapport SECINV-CC-01 : le promoteur ne lit plus les jetons d'invitation

- **Référence :** SECINV-CC-01 (gestion-eau, table `eau_invitations`)
- **Début :** 12/11/2026 18 h 50 · **Fin :** 12/11/2026 18 h 57 · **Durée active :** environ 7 min
- **Fenêtre de contexte :** environ 75 000 jetons utilisés sur 1 000 000
- **Nature :** correctif de données seul. Aucun fichier de `frontend/` modifié, aucun `npm`, aucune version, aucun déploiement d'appli. Seul ce rapport est commité.
- **Moyen d'exécution :** l'éditeur SQL Supabase dans Chrome demandait une connexion (page « Sign in ») : comme prévu par le prompt, tout le SQL a été exécuté par le connecteur Supabase, même projet (`ofzmwrzatcztoekrpvkj`). Aucun jeton de session moissonné.

## Résultat en une phrase
Un promoteur non admin lit désormais 0 invitation (0 jeton) ; l'admin lit toujours les 6 ; une invitation réclamée par son jeton fonctionne toujours pour la bonne personne ; l'anonyme n'a plus aucun droit sur la table ; rien ne reste des essais.

## Critères

| # | Critère | Résultat | Chiffres |
|---|---|---|---|
| 1 | Seule `eau_invitations_admin_all` reste | ✅ | `pg_policies` : `["eau_invitations_admin_all"]` |
| 2 | Promoteur non admin (`6ba6d4e4-…`) lit 0 ligne, 0 jeton | ✅ | avant : 6 lignes, 3 jetons lisibles · après : 0 ligne, 0 jeton |
| 3 | Admin (`5020b356-…`) lit le même nombre qu'avant | ✅ | 6 (avant comme après) |
| 4 | Invitation de test : promoteur ne lit pas le jeton, une autre identité la réclame | ✅ | admin la voit : 1 · promoteur : 0 ligne, 0 jeton, mise à jour tentée : 0 ligne · identité test (ni admin ni promoteur) : mauvais jeton → `null`, bon jeton → `TEST-SECINV-d0a4e531` (statut `acceptee`, compte client créé : 1) · après annulation : 0 invitation `TEST-SECINV`, 0 compte client, 0 rôle pour l'identité test |
| 5 | Synchro du promoteur sur un tirage vide | ✅ (avec réserve, voir ci-dessous) | aucune erreur ; lignes locales conservées |
| 6 | Confirmation d'e-mail obligatoire (lecture seule) | ✅ | `mailer_autoconfirm: false` ; 103 comptes, 1 non confirmé, 0 connecté sans confirmation |

### Détail critère 5 (lecture de `eauSync.ts`)
- `doPullTable('eau_invitations')` fait `select('*')`. Avec la règle retirée, le serveur répond **HTTP 200 avec une liste vide** (la sécurité filtre les lignes, elle ne renvoie pas d'erreur). Le code renvoie alors `{ pulled: 0, ok: true }` : **aucune erreur, aucun message en console, rien de visible** pour le promoteur.
- En revanche, le tirage **ne retire jamais** une ligne locale absente du serveur (il ajoute et met à jour seulement, cf. PROCEDURES-OUTILS « pullTable ne retire jamais »). Donc sur un appareil où le promoteur a déjà ouvert la page « Demandes », **les 6 invitations déjà en cache restent visibles** (la liste vient de Dexie via `listInvitations()`), y compris les 3 jetons. Elles sont toutes acceptées ou révoquées : ces jetons ne permettent plus aucune réclamation (`eau_claim_invitation_by_token` refuse tout statut autre que `en_attente`). Les **nouvelles** invitations, elles, n'arriveront plus jamais sur son appareil.
- Le promoteur ne pousse rien vers `eau_invitations` (il n'en crée pas) : pas d'effet côté envoi.

### Détail critère 6
- La page des réglages Auth du tableau de bord Supabase n'a pas pu être lue (tableau de bord non connecté dans Chrome). Le fait a été lu à la source publique officielle du même réglage : `GET https://ofzmwrzatcztoekrpvkj.supabase.co/auth/v1/settings` (clé anonyme publique) → `"mailer_autoconfirm": false`, c'est-à-dire **« Confirm email » activé** (un compte e-mail/mot de passe doit confirmer son adresse). Fournisseurs actifs : e-mail et Google. Aucun réglage modifié.
- SQL : 103 comptes `auth.users`, **1** avec `email_confirmed_at is null` (créé le 09/11/2025, fournisseur e-mail), dont **0** avec `last_sign_in_at` non nul.

## État avant / après

| Élément | Avant | Après |
|---|---|---|
| Règles (RLS activée, non forcée) | `eau_invitations_admin_all` (ALL, `eau_is_admin()`) + `eau_invitations_sel_promoteur` (SELECT, `eau_is_promoteur()`) | `eau_invitations_admin_all` seule |
| Droits de table `anon` | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE (+ droits de colonnes sur les 22 colonnes) | aucun (REST anonyme : HTTP 401, `42501 permission denied for table eau_invitations`) |
| Droits de table `authenticated` | les 7 droits par défaut | inchangés (la sécurité par ligne fait le tri) |
| Lignes par statut | 4 `acceptee`, 2 `revoquee` (6) | identique |
| Invitations en attente avec jeton valide | 0 | 0 |
| Lecture anonyme effective | 0 ligne (bloquée par les règles) | refusée dès le droit de table |
| Vitrine `/i/<jeton>` (RPC anonyme `eau_invitation_token_state`) | fonctionne | fonctionne (HTTP 200, `"unknown"` pour un jeton inexistant) |

## SQL exécuté (exact)

Relevé initial : requêtes en lecture seule sur `pg_policies`, `pg_class`, `information_schema.role_table_grants`, `information_schema.column_privileges`, `eau_invitations` (comptes par statut), `eau_roles` (promoteurs et admins), `pg_proc` (`pg_get_functiondef` de `eau_claim_invitation_by_token`, `eau_is_promoteur`, `eau_is_admin`).

Mesure de la faille avant correctif (transaction annulée par l'exception finale) :
```sql
do $$
declare r jsonb := '{}'::jsonb; n int; t int;
begin
  perform set_config('request.jwt.claims', json_build_object('sub','6ba6d4e4-306f-4b47-80c7-c499f4da2ea2','role','authenticated')::text, true);
  set local role authenticated;
  select count(*), count(token) into n, t from public.eau_invitations;
  r := r || jsonb_build_object('promoteur_count', n, 'promoteur_tokens_visible', t);
  reset role;
  perform set_config('request.jwt.claims', json_build_object('role','anon')::text, true);
  set local role anon;
  select count(*) into n from public.eau_invitations;
  r := r || jsonb_build_object('anon_count', n);
  reset role;
  raise exception 'RESULTS %', r;
end $$;
-- RESULTS {"anon_count": 0, "promoteur_count": 6, "promoteur_tokens_visible": 3}
```

Correctif (joué deux fois, idempotent) :
```sql
drop policy if exists eau_invitations_sel_promoteur on public.eau_invitations;
revoke all on public.eau_invitations from anon;
```

Tests des critères 2 à 4 (un seul bloc, tout annulé par l'exception finale) :
```sql
do $$
declare
  r jsonb := '{}'::jsonb; n int; t int; v_claim text; v_tok text := 'secinv-' || replace(gen_random_uuid()::text,'-','');
  v_id text := 'TEST-SECINV-' || substr(replace(gen_random_uuid()::text,'-',''),1,8);
  c_promo text := '6ba6d4e4-306f-4b47-80c7-c499f4da2ea2';
  c_admin text := '5020b356-7281-4007-bec6-30a956b8a347';
  c_test  text := '00000000-5ec1-4000-8000-000000000001';
begin
  perform set_config('request.jwt.claims', json_build_object('sub',c_promo,'role','authenticated')::text, true);
  set local role authenticated;
  select count(*), count(token) into n, t from public.eau_invitations;
  r := r || jsonb_build_object('c2_promoteur_count', n, 'c2_promoteur_token_rows', t);
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub',c_admin,'role','authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.eau_invitations;
  r := r || jsonb_build_object('c3_admin_count', n);
  insert into public.eau_invitations (id, nom, role_client, invite_channel, token, expires_at, statut, invited_by)
  values (v_id, 'TEST-SECINV', true, 'whatsapp', v_tok, now() + interval '1 hour', 'en_attente', c_admin);
  select count(*) into n from public.eau_invitations where id = v_id;
  r := r || jsonb_build_object('c4_admin_sees_test', n);
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub',c_promo,'role','authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.eau_invitations where id = v_id or nom = 'TEST-SECINV';
  select count(token) into t from public.eau_invitations where nom = 'TEST-SECINV';
  r := r || jsonb_build_object('c4_promoteur_rows', n, 'c4_promoteur_token_rows', t);
  update public.eau_invitations set statut = 'acceptee' where id = v_id;
  get diagnostics n = row_count;
  r := r || jsonb_build_object('c4_promoteur_update_rows', n);
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub',c_test,'role','authenticated')::text, true);
  set local role authenticated;
  select public.eau_claim_invitation_by_token('wrong-token') into v_claim;
  r := r || jsonb_build_object('c4_wrong_token_claim', v_claim);
  select public.eau_is_admin() or public.eau_is_promoteur() into strict v_claim;
  r := r || jsonb_build_object('c4_test_identity_admin_or_promoteur', v_claim);
  select public.eau_claim_invitation_by_token(v_tok) into v_claim;
  r := r || jsonb_build_object('c4_claim_result', v_claim, 'c4_claim_ok', v_claim = v_id);
  reset role;
  select statut || '/' || coalesce(accepted_by,'') into v_claim from public.eau_invitations where id = v_id;
  r := r || jsonb_build_object('c4_after_claim', v_claim,
     'c4_compte_client_created', (select count(*) from public.eau_comptes_client where user_id = c_test));
  perform set_config('request.jwt.claims', json_build_object('role','anon')::text, true);
  set local role anon;
  begin
    select count(*) into n from public.eau_invitations;
    r := r || jsonb_build_object('anon', 'read ' || n);
  exception when insufficient_privilege then
    r := r || jsonb_build_object('anon', 'permission denied (42501)');
  end;
  reset role;
  raise exception 'RESULTS %', r;
end $$;
-- RESULTS {"anon": "permission denied (42501)", "c4_claim_ok": true, "c3_admin_count": 6,
--  "c4_after_claim": "acceptee/00000000-5ec1-4000-8000-000000000001", "c4_claim_result": "TEST-SECINV-d0a4e531",
--  "c4_promoteur_rows": 0, "c2_promoteur_count": 0, "c4_admin_sees_test": 1, "c4_wrong_token_claim": null,
--  "c2_promoteur_token_rows": 0, "c4_promoteur_token_rows": 0, "c4_compte_client_created": 1,
--  "c4_promoteur_update_rows": 0, "c4_test_identity_admin_or_promoteur": "false"}
```

Contrôle final (lecture seule) : 0 invitation `TEST-SECINV` / jeton `secinv-%`, 0 compte client et 0 rôle pour l'identité test, 6 invitations (4 acceptées, 2 révoquées), une seule règle ; `auth.users` : 103 comptes, 1 non confirmé, 0 non confirmé connecté.

## Écarts
1. **Connecteur au lieu de Chrome** : l'éditeur SQL demandait une connexion ; repli prévu par le prompt.
2. **`revoke all on public.eau_invitations from anon` ajouté** : le relevé montrait un droit SELECT direct (et les autres droits par défaut de Supabase) accordé à `anon` sur la table. Il ne donnait aucune ligne en pratique (les règles bloquaient), mais c'était la condition prévue par le prompt ; retiré par précaution. Aucun chemin de l'appli ne lit cette table sans être connecté (la vitrine passe par la fonction `eau_invitation_token_state`, vérifiée intacte).
3. **Critère 6 lu à la source publique** `auth/v1/settings` plutôt que sur la page du tableau de bord (non connecté) : même réglage, même valeur.
4. Identité test du critère 4 : un identifiant fictif (`00000000-5ec1-…`), qui n'existe pas dans `auth.users` ; la table `eau_comptes_client` n'a pas de clé étrangère vers `auth.users`, donc la réclamation est allée jusqu'au bout.

## Surprises
- **Avant correctif, 3 jetons étaient lisibles** par le promoteur (sur des invitations déjà acceptées ou révoquées, donc inutilisables).
- **Le cache de l'appareil du promoteur garde les anciennes invitations** (critère 5) : la liste de la page « Demandes » ne devient vide que sur un appareil neuf ou après vidage du cache, pas sur un appareil qui l'a déjà affichée.

## Recommandations
1. (Faible, sans urgence) Purger `eau_invitations` dans le cache local quand l'utilisateur n'est pas admin, ou réconcilier comme `refreshElec` (retirer les lignes absentes d'un tirage réussi et complet). Les jetons restant en cache sont aujourd'hui tous inutilisables, donc pas de risque immédiat.
2. Masquer la section « Invitations » de la page « Demandes » pour un promoteur non admin, pour ne pas afficher une liste vide ou périmée.
3. Pas d'erreur visible à prévoir : aucune modification de code nécessaire pour la synchronisation.
4. La consigne « En attendant » de la note (pas d'invitation par lien pour les rôles sensibles) peut être levée : le promoteur ne voit plus les jetons.
