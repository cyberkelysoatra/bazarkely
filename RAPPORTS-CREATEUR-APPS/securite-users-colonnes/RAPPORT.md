# Rapport — Verrou des colonnes sensibles de `public.users`

- **Date :** 2026-09-26, 15:37 → 16:05 (heure locale), soit environ **28 min** de travail actif.
- **Fenêtre de contexte :** environ 215 000 jetons consommés sur la session.
- **Version de l'application :** inchangée (v3.84.2). **Aucun code frontend modifié** : le correctif est 100 % côté serveur, donc ni contrôle de types, ni build, ni bump de version.
- **Serveur de dev :** déjà lancé sur le port 3000 par une session précédente (réutilisé). Un second serveur inactif (port 3002) captait `localhost:3000` en IPv6 (piège P18) : arrêté.

## Résumé

Avant : un compte connecté pouvait réécrire lui-même son téléphone, son e-mail, sa date de création, etc. (seul le rôle était protégé).
Après : il ne peut plus modifier **que ses préférences** (et la date de mise à jour). Tout le reste est refusé, y compris les colonnes qui seront ajoutées plus tard. L'application fonctionne comme avant en production.

## 1. Audit (S1)

### 1.1 Colonnes de `public.users` (14)

`id`, `username`, `email`, `phone`, `role` (défaut `'user'`), `preferences` (jsonb), `created_at`, `updated_at`, `last_sync`, `experience_points` (défaut 0), `certification_level` (défaut 1), `profile_picture_url`, `last_login_at` (défaut `now()`), `notification_preferences` (jsonb).

Droits : `anon` et `authenticated` ont **tous** les droits de table (dont `UPDATE`, `INSERT`, `DELETE`, `TRUNCATE`).
Règles RLS : lecture / modification / suppression / insertion limitées à `auth.uid() = id` (les **lignes**, jamais les colonnes).
Déclencheurs avant l'intervention : `users_role_guard` (rôle seulement), `trigger_users_updated_at` + `update_users_updated_at` (posent `updated_at = now()`, en double), `on_user_created_create_cash_account` (après insertion).

### 1.2 Écritures client sur `public.users` (`frontend/src`)

| Fichier : ligne | Opération | Colonnes | Appelants |
|---|---|---|---|
| `services/apiService.ts:583` `updateUserPreferences` | `update` | `preferences`, `updated_at` | `modules/navy-ay/services/modulePrefsSync.ts:147` (modules, dernier module, ordre, rôle NAVY), `components/Navigation/BottomNav.tsx:208`, `pages/PriorityQuestionsPage.tsx:210` |
| `services/apiService.ts:127` `createUser` | `insert` | toutes celles passées | **aucun appelant** (seul `staticApiService.ts:128`, lui-même jamais importé) |

Toutes les autres occurrences de `from('users')` / `db.users()` sont des **lectures** (`App.tsx`, `authService`, `adminService`, `leaderboardService`, `familyGroupService`, `eauRoleService`, `modulePrefsSync` lecture, Construction `OrderDetailPage` / `WorkflowHistory`). `OptimizedSyncService` (`case 'users'`) écrit dans la base **locale** Dexie, pas dans Supabase. Aucun écran ne modifie le téléphone, le nom d'utilisateur, l'e-mail ni la photo. Les Edge Functions utilisent la clé de service (non concernées).

### 1.3 Création de la ligne à l'inscription

`authService.register` → `supabase.auth.signUp({ data: { username, phone } })` ; la ligne est créée **côté serveur** par `handle_new_user` (déclencheur `trigger_handle_new_user` sur `auth.users`, `SECURITY DEFINER`, propriétaire `postgres`) : `id`, `username` (métadonnées, nom Google ou début de l'e-mail), `email`, `phone` (**déclaré** dans les métadonnées, non vérifié), `role = 'user'`, `preferences`. Même chemin pour Google. Aucune insertion client.

### 1.4 Fonctions et règles qui lisent des colonnes d'identité de `users`

| Objet | Colonne lue | Usage | Risque avant le verrou |
|---|---|---|---|
| `navy_find_user_by_email` | `users.email` | l'opératrice cherche un compte par e-mail pour le **désigner opératrice** | **usurpable** : un compte pouvait mettre l'e-mail d'un autre dans sa ligne et se faire désigner à sa place. Corrigé par le verrou. |
| `navy_create_parcel` | `users.phone` (et `username`, `email`) | **copie** du téléphone de l'expéditeur sur le colis (affiché à l'épicier / au destinataire) | affichage seulement ; le **destinataire** n'est rattaché que via le téléphone d'un partenaire **validé** (correctif 2A). Reste non vérifié (déclaré à l'inscription). |
| `is_admin`, `admin_is_current_user_admin`, `get_all_users_admin`, `get_admin_utilisateurs`, `navy_list_operators` ; ~30 règles RLS `poc_*` et `transaction_categories_admin_all` | `users.role` | droits d'administrateur | déjà protégé depuis le 2026-09-25, reste protégé |
| `get_admin_activite`, `get_admin_stats` | `created_at`, `last_login_at` | statistiques admin | faussables ; désormais figées |
| `navy_is_admin`, `navy_operator_ids`, `is_joel` | `auth.users.email` | ancrage sur `auth.users` | non modifiable par un client, sain |

Aucune fonction Eau ne lit `public.users`.

### 1.5 Données existantes (contrôle)

17 comptes ; 0 e-mail différent de celui de `auth.users` ; 0 doublon d'e-mail ; 1 rôle non `user` (l'admin). 2 téléphones diffèrent des métadonnées d'inscription (anciens comptes de 2025, retouches probablement faites côté serveur) : rien qui ressemble à une usurpation.

## 2. SQL final (S2) — `supabase/migrations/20260926230000_users_columns_guard.sql`

```sql
create or replace function public.users_columns_guard()
returns trigger language plpgsql set search_path = public as $$
declare
  c_update_allowed constant text[] := array['preferences', 'updated_at'];
  c_insert_allowed constant text[] := array['id', 'username', 'preferences'];
  c_insert_server constant text[] := array[
    'role', 'email', 'phone', 'created_at', 'updated_at', 'last_login_at', 'last_sync',
    'experience_points', 'certification_level', 'profile_picture_url',
    'notification_preferences'];
  v_col text;
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if current_user = 'anon' then
    raise exception 'public.users cannot be written anonymously' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    select n.k into v_col
      from jsonb_each(to_jsonb(new) - c_update_allowed) as n(k, v)
     where n.v is distinct from (to_jsonb(old) -> n.k)
     order by n.k limit 1;
    if v_col is not null then
      raise exception 'users.% can only be changed server-side', v_col using errcode = '42501';
    end if;
    return new;
  end if;
  -- INSERT by a client
  new.role := 'user';
  new.email := auth.jwt() ->> 'email';
  new.phone := null;
  new.created_at := now();  new.updated_at := now();  new.last_login_at := now();
  new.last_sync := null;  new.experience_points := 0;  new.certification_level := 1;
  new.profile_picture_url := null;  new.notification_preferences := null;
  select n.k into v_col
    from jsonb_each(to_jsonb(new) - c_insert_allowed - c_insert_server) as n(k, v)
   where n.v <> 'null'::jsonb
   order by n.k limit 1;
  if v_col is not null then
    raise exception 'users.% can only be set server-side', v_col using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke execute on function public.users_columns_guard() from public, anon, authenticated;
drop trigger if exists users_role_guard on public.users;
drop function if exists public.users_role_guard();
drop trigger if exists users_columns_guard on public.users;
create trigger users_columns_guard before insert or update on public.users
  for each row execute function public.users_columns_guard();
```

### Justification de la liste blanche

| Colonne | Autorisée pour | Raison |
|---|---|---|
| `preferences` | UPDATE, INSERT | seule écriture cliente réelle (`updateUserPreferences` : modules, dernier module, ordre des modules, rôle NAVY, réponses prioritaires, thème) |
| `updated_at` | UPDATE | écrite par le même appel ; de toute façon réécrite par les déclencheurs `now()` |
| `id` | INSERT | clé, contrôlée par la règle RLS `auth.uid() = id` |
| `username` | INSERT | posé par l'inscription légitime (`handle_new_user`) ; simple nom d'affichage, pas une identité de confiance |

`phone` : **verrouillé purement** (aucun écran ne le modifie), donc pas de fonction dédiée. Il reste **non vérifié** (déclaré à l'inscription) jusqu'à la vérification par SMS de la phase 1C. À l'insertion client il est forcé à `null` ; sinon « supprimer sa ligne puis la recréer » aurait permis de changer de téléphone.

Déclencheurs finaux sur `public.users` : `on_user_created_create_cash_account`, `trigger_users_updated_at`, `update_users_updated_at`, **`users_columns_guard` (seul déclencheur de garde)**. L'ancien `users_role_guard` et sa fonction sont supprimés.

## 3. Exécution

- **Outil :** le connecteur Supabase de la session (`execute_sql`) a accès au projet : utilisé à la place du pilotage de l'éditeur dans Chrome (plus fiable, pas de crash Translate). Consigné en **P22** de `PROCEDURES-OUTILS.md`.
- **Essai à blanc :** migration + tests dans un même appel terminé par une exception → tout annulé ; contrôle ensuite : garde toujours `users_role_guard`, pas de colonne `test_x`, pas de compte de test, pas de nouvelle fonction.
- **Application :** passe 1 OK ; **passe 2 (rejeu) OK**, sans erreur. Relecture : 1 seul déclencheur de garde, ancienne fonction absente, `anon` et `authenticated` sans droit d'exécution sur la fonction (S4 ✅).

## 4. Tests négatifs (S3) — sur le verrou réellement en place, transaction annulée, `authenticated` simulé (`request.jwt.claims` + `set local role`)

| Test | Résultat attendu | Obtenu |
|---|---|---|
| UPDATE `phone` | refus 42501 | ✅ `42501 users.phone can only be changed server-side` |
| UPDATE `created_at` | refus 42501 | ✅ `42501 users.created_at …` |
| UPDATE `email` | refus 42501 | ✅ `42501 users.email …` |
| UPDATE `role` | refus 42501 | ✅ `42501 users.role …` |
| UPDATE `username`, `last_login_at`, `experience_points` (bonus) | refus | ✅ 42501 ×3 |
| UPDATE `preferences` + `updated_at` | accepté | ✅ 1 ligne, préférence écrite |
| UPDATE de la ligne d'un autre compte | 0 ligne | ✅ `rows=0` (RLS) |
| `alter table … add column test_x` puis UPDATE `test_x` | refus (protection par défaut) | ✅ `42501 users.test_x can only be changed server-side` |
| INSERT client `role='admin'`, `created_at='2000-01-01'`, e-mail et téléphone d'un autre, `experience_points=999` | forcés | ✅ `role=user`, `created_at` = aujourd'hui, e-mail = celui du jeton, `phone=NULL`, `xp=0` ; `username` et `preferences` gardés |
| INSERT client avec `test_x` renseignée | refus | ✅ `42501 users.test_x can only be set server-side` |
| Inscription réelle (`insert into auth.users` → `handle_new_user`) | fonctionne | ✅ `role=user`, téléphone des métadonnées posé, e-mail correct |
| `anon` UPDATE (SQL) | aucune écriture | ✅ `rows=0` |
| `anon` INSERT (SQL) | refus | ✅ `42501 public.users cannot be written anonymously` |
| `anon` REST `PATCH /users?id=not.is.null {"phone":…}` | aucune écriture | ✅ HTTP 200 `[]` (0 ligne) |
| `anon` REST `POST /users {"role":"admin"}` | refus | ✅ HTTP 401 `42501 public.users cannot be written anonymously` |
| Serveur (`postgres`) UPDATE `phone` | libre | ✅ 1 ligne |

## 5. Non-régression en production (S5) — vraie session de JOEL, Chrome, 1sakely.org (bundle `index-BD5ohCke.js`)

| Parcours | Preuve |
|---|---|
| Sélecteur de modules → **Budget** | `/dashboard` affiché (soldes, budget) ; serveur : `lastModule = bazarkely`, `updated_at` 12:55:14 UTC, `moduleOrder` **conservé** `[gestion-eau, bazarkely, construction]`, `modules` conservé |
| → **Gestion Eau** | `/gestion-eau` tableau de bord AHUVI affiché |
| → **Construction** | `/construction/dashboard` affiché (Administrateur Joël SOATRA) |
| → **NAVY ay** | `/navy` affiché, « Mes demandes de partenaire : Épicier — Validée » |
| Sélecteur de rôle NAVY → Client | serveur : `navyRole = client` (12:57:14 UTC) ; requêtes `PATCH /rest/v1/users` → **HTTP 200** (×2) |
| Retour Épicier → écran **Colis** | `/navy/epicier/colis` : « À recevoir au dépôt / À remettre au chauffeur / Arrivés, à retirer » |
| Budget → Transactions | `/transactions` affiché |
| File d'attente des préférences | `bazarkely_prefs_pending` vide après chaque changement |
| Console | **aucun** `42501`, « server-side », « permission denied » ni « updateUserPreferences failed ». Seuls messages : délais d'attente de **lectures** (profil, prêts, récurrentes, eau) — onglet piloté caché/brident (P13/P20) et timeout de profil connu (mémoire `project_db_timeout_loaduser`) ; le verrou ne touche pas les lectures |
| Connexion Google / première inscription | non rejouées en vrai (pas de création de compte ni de déconnexion de JOEL) ; prouvées par le code (ces chemins ne font que **lire** `users`) et par le test SQL de `handle_new_user` ci-dessus |

## 6. Fichiers

- **Créés :** `supabase/migrations/20260926230000_users_columns_guard.sql`, `RAPPORTS-CREATEUR-APPS/securite-users-colonnes/RAPPORT.md`.
- **Modifiés :** `CLAUDE.md` (piège « `users.role` modifiable » → « colonnes de `users` modifiables », règle de la liste blanche) ; `PROCEDURES-OUTILS.md` (P14 → liste blanche, **P22** connecteur Supabase ; embarque aussi P19–P21 restés non commités).
- **Ajouté au commit (demande du prompt) :** `RAPPORTS-CREATEUR-APPS/navy-ay/RAPPORT-PHASE-2A.md`.
- **Base de production :** fonction `users_columns_guard` + déclencheur ; `users_role_guard` supprimé.

## 7. Écarts

1. SQL exécuté via le **connecteur Supabase** plutôt qu'en pilotant l'éditeur dans Chrome : même résultat, plus sûr ; vérifications par REST conservées.
2. Pas de fonction dédiée pour le téléphone : aucun écran ne le modifie (cas prévu par le prompt).
3. Connexion Google et inscription non rejouées « en vrai » (interdit de créer un compte ou de manipuler des identifiants) : couvertes par lecture du code + test SQL.
4. Pas de contrôle de types / build / bump : aucun fichier frontend touché (condition 3 du prompt non applicable).

## 8. Surprises

- **`navy_find_user_by_email` était usurpable** via `users.email` : un compte pouvait prendre l'e-mail d'un autre dans sa ligne et se faire désigner opératrice à sa place. Le verrou ferme ce trou.
- `anon` et `authenticated` ont aussi `TRUNCATE` et `DELETE` sur `users` (droits Supabase par défaut) ; `TRUNCATE` n'est pas exposé par l'API REST, `DELETE` est limité à sa propre ligne par la RLS.
- Deux déclencheurs `updated_at` identiques en double sur `users` (sans effet nuisible).
- Un serveur de dev inactif sur le port 3002 détournait `localhost:3000` (P18).

## 9. Recommandations

1. **`users.phone` reste non vérifié** (déclaré à l'inscription) : ne **jamais** s'en servir pour accorder un accès. Aujourd'hui seul `navy_create_parcel` le lit, pour **copier** le téléphone de l'expéditeur sur le colis (affichage) ; le destinataire est bien rattaché via un partenaire validé. Remplacer par un téléphone vérifié quand la phase 1C (SMS) existera.
2. `navy_find_user_by_email` : désormais fiable, mais l'ancrer sur `auth.users.email` serait encore plus robuste (même motif que `navy_is_admin`).
3. Retirer la règle « Users can delete own profile » (supprimer sa ligne efface ses données en cascade et n'a aucun usage dans l'application) et révoquer `TRUNCATE` / `DELETE` inutiles pour `anon`.
4. Supprimer le code mort `apiService.createUser` / `staticApiService` (hors périmètre ici).
5. Toute future écriture cliente sur `users` (ex. modifier son nom) : **ajouter la colonne à la liste blanche** par migration, sinon refus `42501` en production.
