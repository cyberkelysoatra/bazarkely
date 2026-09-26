# Rapport — Sécurité `public.users`, suite : deux corrections SQL

- **Date :** 2026-09-26, 19:34 → 19:50 (heure locale), soit environ **16 min** de travail actif.
- **Fenêtre de contexte :** environ 60 000 jetons consommés sur la session.
- **Version de l'application :** inchangée (v3.84.2). **Aucun fichier `frontend/` modifié** : ni contrôle de types, ni build, ni nouvelle version.
- **Exécution :** connecteur Supabase (`execute_sql`, P22), tests en transaction annulée (P8/P14), vérification en production dans le Chrome de JOEL.

## Résumé

1. La recherche d'une opératrice par e-mail s'appuie désormais sur l'**e-mail de connexion** (`auth.users`), qu'aucun compte ne peut modifier. Même chose pour la liste des opératrices. L'écran ne voit aucune différence.
2. Plus aucun compte connecté (ni visiteur anonyme) ne peut **effacer sa propre fiche** `users` ni vider la table. La suppression d'un compte reste possible par l'administrateur (fonction serveur `delete_user_admin`).

## 1. Audit

### 1.1 Règles et droits d'effacement sur `public.users` (avant)

| Élément | État avant |
|---|---|
| Règle RLS `Users can delete own profile` | `for delete to public using (auth.uid() = id)` |
| Autres règles `for delete` | aucune |
| Droits `DELETE` | `anon`, `authenticated`, `service_role` |
| Droits `TRUNCATE` | `anon`, `authenticated`, `service_role` |

### 1.2 Suppressions de lignes `users` par l'application (`frontend/src`)

- **Aucun** appel `from('users')…delete()` ni `db.users().delete()`. Aucun bouton « supprimer mon compte ».
- `OptimizedSyncService.ts:641` `db.users.delete(...)` : base **locale** Dexie, pas Supabase.
- `modules/gestion-eau/services/eauSync.ts:157` (`from(table).delete()` générique) : tables `eau_*` seulement.
- `AdminPage.tsx` → `adminService.deleteUser` → RPC **`delete_user_admin`** (serveur).

### 1.3 Fonctions serveur qui suppriment dans `users`

- `delete_user_admin(target_user_id)` : `SECURITY DEFINER`, propriétaire `postgres`, contrôle `auth.jwt()->>'email' = 'joelsoatra@gmail.com'`, refuse sa propre suppression. **Non affectée** par le retrait des droits (elle s'exécute avec les droits de `postgres`).

→ Cas « aucun écran ne supprime sa propre fiche » : règle supprimée, `DELETE` et `TRUNCATE` retirés à `anon` et `authenticated`.

### 1.4 Ce qu'efface en cascade la suppression d'une ligne `users` (pour mémoire)

**Supprimées (`on delete cascade`) :** `accounts`, `transactions`, `budgets`, `goals`, `sync_queue`, `sms_inbox`, `sms_appareils`, `push_subscriptions`, `poc_company_members`, `poc_alerts`, `navy_operators` (l'opératrice), `navy_partners` (fiche partenaire), `navy_referrals`, `navy_driver_status`, `navy_partner_changes` (demandes), `navy_parcels` (**colis dont il est l'expéditeur**), `navy_parcel_offers` (offres chauffeur), `navy_parcel_payments` (paiements soumis).

**Mises à vide (`set null`) :** `navy_operators.designated_by`, `navy_partners.decided_by` / `shop_location_verified_by`, `navy_settings.updated_by`, `navy_zones.created_by`, `navy_partner_changes.decided_by`, `navy_parcels.recipient_user_id` / `driver_user_id` / `cancelled_by`, `navy_parcel_events.actor_id`, `navy_parcel_payments.decided_by`.

**Bloquante (`no action`) :** `reimbursement_requests.settled_by`.

### 1.5 Fonctions d'opératrices (avant)

`navy_find_user_by_email` et `navy_list_operators` lisaient toutes deux `public.users.email` → toutes deux corrigées.

## 2. SQL final — `supabase/migrations/20260926235000_users_delete_and_operator_lookup.sql`

```sql
create or replace function public.navy_find_user_by_email(p_email text)
returns table (user_id uuid, email text, username text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.navy_is_operator() then
    raise exception 'navy_find_user_by_email: operator only' using errcode = '42501';
  end if;
  return query
    select a.id, a.email::text, u.username::text
      from auth.users a
      join public.users u on u.id = a.id
     where lower(a.email) = lower(btrim(p_email))
       and a.deleted_at is null
     limit 1;
end;
$$;

create or replace function public.navy_list_operators()
returns table (user_id uuid, email text, username text, designated_at timestamptz, is_admin boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.navy_is_operator() then
    raise exception 'navy_list_operators: operator only' using errcode = '42501';
  end if;
  return query
    select u.id, a.email::text, u.username::text, o.created_at, false
      from public.navy_operators o
      join public.users u on u.id = o.user_id
      left join auth.users a on a.id = u.id
    union all
    select u.id, a.email::text, u.username::text, null::timestamptz, true
      from public.users u
      left join auth.users a on a.id = u.id
     where u.role = 'admin'
       and not exists (select 1 from public.navy_operators o where o.user_id = u.id);
end;
$$;

revoke execute on function public.navy_find_user_by_email(text) from public, anon;
revoke execute on function public.navy_list_operators() from public, anon;
grant execute on function public.navy_find_user_by_email(text) to authenticated;
grant execute on function public.navy_list_operators() to authenticated;

drop policy if exists "Users can delete own profile" on public.users;
revoke delete, truncate on table public.users from public, anon, authenticated;

notify pgrst, 'reload schema';
```

Choix : noms tous qualifiés (`auth.users`, `public.users`) plutôt que d'élargir le `search_path` ; signatures et formes de résultat identiques ; contrôle `navy_is_operator()` conservé ; `service_role` garde `DELETE`/`TRUNCATE`.

## 3. Exécution

1. **Essai à blanc** : migration + tests dans un seul appel terminé par une exception → tout annulé. Contrôle : règle d'effacement toujours présente, droits intacts, ancienne fonction en place, 0 compte de test.
2. **Passe 1** : appliquée sans erreur.
3. **Passe 2 (rejeu)** : rejouée seule, sans erreur. Relecture : 0 règle `for delete`, 0 droit `DELETE`/`TRUNCATE` pour `anon`/`authenticated`, 2 fonctions, 17 fiches `users`, 0 compte de test résiduel.
4. **Tests sur l'état appliqué** (rejeu + tests, annulés) : tous verts (ci-dessous).

## 4. Résultats des tests (transaction annulée, `authenticated` simulé par `request.jwt.claims` + `set local role`)

Mise en scène de l'usurpation (côté serveur, annulée) : l'e-mail de l'admin est déplacé dans sa fiche `public.users`, puis posé sur la fiche d'un autre compte (contrainte d'unicité de l'e-mail oblige).

| Test | Attendu | Obtenu |
|---|---|---|
| Ancienne logique (lecture `public.users.email`) sur l'e-mail usurpé | renverrait l'usurpateur | ✅ `true` (le trou existait bien) |
| Opératrice cherche l'e-mail de l'admin (majuscules + espaces) | le vrai titulaire | ✅ `T_find_admin=true` |
| L'usurpateur est-il renvoyé pour cet e-mail ? | non | ✅ `0` ligne |
| Opératrice cherche l'e-mail réel de l'autre compte | ce compte | ✅ `true` |
| E-mail inconnu | aucune ligne | ✅ `0` |
| `navy_list_operators` : admin avec l'e-mail de `auth.users` | présent | ✅ `1` |
| Non-opérateur : `navy_find_user_by_email` / `navy_list_operators` | refus 42501 | ✅ `42501` / `42501` |
| Compte connecté supprime sa propre ligne | refus ou 0 ligne | ✅ `42501 permission denied for table users` |
| Compte connecté `TRUNCATE` | refus | ✅ `42501` |
| `anon` supprime une ligne (SQL) | refus | ✅ `42501` |
| `anon` `TRUNCATE` | refus | ✅ `42501` |
| Serveur (`postgres`) supprime la fiche d'un compte de test fraîchement créé | possible | ✅ `1` ligne |
| Droits des fonctions | pas d'`anon` | ✅ `{postgres, authenticated, service_role}` |
| `service_role` garde `DELETE` | oui | ✅ `true` |

**Production (vraie session de JOEL, Chrome, 1sakely.org)** : `/navy/operatrice/reglages` → section Opératrices affiche « Joël SOATRA — Administrateur » comme avant ; `POST /rest/v1/rpc/navy_list_operators` → **HTTP 200** (×2) ; aucun message `42501` / « permission denied » en console. Personne de nouveau désigné.

## 5. Fichiers

- **Créés :** `supabase/migrations/20260926235000_users_delete_and_operator_lookup.sql`, `RAPPORTS-CREATEUR-APPS/securite-users-colonnes/RAPPORT-SUITE.md`.
- **Modifié :** `CLAUDE.md` (une ligne au piège « colonnes de `users` modifiables » sur l'effacement).
- **Base de production :** 2 fonctions remplacées, 1 règle RLS supprimée, droits `DELETE`/`TRUNCATE` retirés à `anon` et `authenticated`.
- **Aucun fichier `frontend/`.**

## 6. Écarts

1. **Test `anon` par l'API REST non joué** : l'appel `DELETE /rest/v1/users` en clé anon a été bloqué par le filtre de sécurité de l'outil (requête d'effacement large). Je ne l'ai pas contourné. Couvert par : test SQL en rôle `anon` (refus `42501`), relecture des droits (`anon` n'a plus `DELETE`, pas d'`EXECUTE` sur les deux fonctions). JOEL peut le rejouer s'il le souhaite ; réponse attendue : **401 `42501` permission denied for table users**.
2. **Recherche par e-mail non rejouée dans l'écran en production** : le bouton « Ajouter » désigne aussitôt une opératrice (interdit par le prompt), et appeler la fonction depuis la page aurait demandé de lire le jeton de session (interdit). Couvert par les tests SQL.
3. Capture d'écran de preuve impossible (onglet piloté gelé, P13) : preuve par texte de la page et requêtes réseau.

## 7. Surprises

- La contrainte `users_email_key` (unicité) empêche deux fiches d'avoir le même e-mail : l'usurpation passait donc par un e-mail **pas encore utilisé** dans `public.users` ou libéré — le test a dû la simuler en déplaçant d'abord l'e-mail de la victime.
- `delete_user_admin` est exécutable par `anon` (droit par défaut, P7) ; sans danger car elle refuse tout jeton qui n'est pas celui de JOEL, mais le droit est inutile.
- `reimbursement_requests.settled_by` en `no action` : la suppression d'un compte qui a réglé un remboursement échouerait (sauf nettoyage préalable dans `delete_user_admin`).

## 8. Recommandations

1. `revoke execute on function public.delete_user_admin(uuid) from public, anon;` (hygiène P7).
2. `delete_user_admin` s'ancre sur l'e-mail du jeton : l'aligner sur `is_joel()` / `navy_is_admin()` pour un seul point de vérité.
3. Supprimer un compte efface ses colis envoyés (`navy_parcels.sender_id` en cascade) : à revoir avant d'offrir une suppression de compte (conserver l'historique des colis, anonymiser plutôt qu'effacer).
4. Rappel : `users.phone` reste non vérifié tant que la vérification par SMS n'existe pas.
