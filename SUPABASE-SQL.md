# SUPABASE — SQL du module `gestion-eau`

> **À exécuter UNE seule fois, AVANT la Phase 1**, dans Supabase → SQL Editor (copier-coller le bloc ci-dessous, puis « Run »). Aucune compétence requise : c'est un copier-coller.
>
> Ce schéma fait **référence** : les prompts imposent à Claude Code d'aligner exactement le code (Dexie + Supabase) sur ces noms de tables/colonnes (snake_case côté base). Les `id` sont générés côté client (uuid) → type `text`. RLS activé avec une policy permissive pour les utilisateurs authentifiés (à affiner plus tard si besoin).

```sql
-- ========== TABLES ==========
create table if not exists eau_compteurs (
  id text primary key,
  nom text not null,
  type text not null check (type in ('villa','golf','commun')),
  proprietaire text,
  zone text,
  ordre int,
  lat double precision,
  lng double precision,
  actif boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists eau_qr_compteur (
  id text primary key,
  compteur_id text not null references eau_compteurs(id) on delete cascade,
  emplacement text,
  code text unique not null,
  actif boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists eau_releves_compteur (
  id text primary key,
  compteur_id text not null references eau_compteurs(id) on delete cascade,
  index numeric not null,
  rupture_index boolean not null default false,
  aberrant_confirme boolean not null default false,
  timestamp timestamptz not null,
  agent_id text,
  note text,
  photo_url text
);

create table if not exists eau_releves_bassin (
  id text primary key,
  hauteur_cm numeric not null,
  volume_m3 numeric not null,
  timestamp timestamptz not null,
  agent_id text,
  note text
);

create table if not exists eau_entrees_bassin (
  id text primary key,
  volume_m3 numeric not null,
  timestamp timestamptz not null,
  agent_id text,
  note text
);

create table if not exists eau_bilans (
  id text primary key,
  timestamp timestamptz not null,
  timestamp_prev timestamptz,
  stock_prev numeric,
  entrees_m3 numeric,
  conso_m3 numeric,
  stock_attendu numeric,
  stock_mesure numeric,
  ecart_m3 numeric,
  ecart_pct numeric,
  anomalie boolean default false,
  traitee boolean default false,
  commentaire text,
  -- Évolution « bassin/débit » : apport mesuré, conso réseau réelle, pertes, débit utilisé.
  apport_m3 numeric,
  conso_reseau_m3 numeric,
  pertes_m3 numeric,
  debit_m3h_utilise numeric
);

-- Tests de débit des pompes « vanne fermée » (évolution « bassin/débit »).
create table if not exists eau_debit_tests (
  id text primary key,
  niveau_debut_cm numeric not null,
  niveau_fin_cm numeric not null,
  duree_min numeric not null,
  debit_m3h numeric not null,
  ecart_pct numeric,
  timestamp timestamptz not null,
  agent_id text,
  note text,
  created_at timestamptz default now()
);

create table if not exists eau_factures (
  id text primary key,
  numero text,
  compteur_id text references eau_compteurs(id) on delete set null,
  periode_start timestamptz,
  periode_end timestamptz,
  index_debut numeric,
  index_fin numeric,
  conso_m3 numeric,
  tarif numeric,
  montant numeric,
  devise text default 'MGA',
  statut text default 'impaye' check (statut in ('paye','impaye')),
  date_echeance timestamptz,
  paye_at timestamptz,
  relance_count int default 0,
  generated_at timestamptz default now()
);

create table if not exists eau_config (
  id text primary key default 'singleton',
  bassin_longueur_m numeric,
  bassin_largeur_m numeric,
  bassin_hauteur_max_m numeric,
  -- Évolution « bassin/débit » : hauteurs flotteur (plafond op.) / trop-plein (sécurité) + seuil stabilité débit.
  bassin_hauteur_flotteur_m numeric,
  bassin_hauteur_trop_plein_m numeric,
  debit_ecart_max_pct numeric default 15,
  tarif_m3 numeric,
  devise text default 'MGA',
  seuil_pct numeric,
  seuil_m3 numeric,
  periode_facturation_jours int,
  seuil_aberrant_facteur numeric,
  jours_sans_releve_alerte int,
  bassin_seuil_critique_pct numeric,
  numero_facture_seq int default 0,
  copro_nom text,
  copro_contact text,
  logo_url text,
  langue text default 'fr',
  map_centre_lat double precision,
  map_centre_lng double precision,
  map_rayon_km numeric,
  map_zoom_min int,
  map_zoom_max int
);

create table if not exists eau_roles (
  user_id text primary key,
  admin boolean not null default false,
  releveur boolean not null default false,
  updated_at timestamptz default now()
);

create table if not exists eau_comptes_client (
  id text primary key,
  nom text not null,
  contact text,
  compteur_ids jsonb default '[]'::jsonb,
  code_enrolement text unique not null,
  code_qr text unique not null,
  user_id text,
  actif boolean not null default true,
  created_by text,
  created_at timestamptz default now()
);

create table if not exists eau_demandes_acces (
  id text primary key,
  user_id text,
  email text,
  nom text,
  statut text default 'en_attente' check (statut in ('en_attente','validee','refusee')),
  roles_attribues jsonb,
  compteurs_visibles jsonb,
  traitee_par text,
  traitee_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists eau_scans (
  id text primary key,
  code text,
  type text check (type in ('compteur','client')),
  compteur_id text,
  client_id text,
  qr_id text,
  emplacement text,
  user_id text,
  role text,
  resultat text,
  timestamp timestamptz not null
);

create table if not exists eau_alertes (
  id text primary key,
  type text check (type in ('anomalie','fuite','compteur_non_releve','bassin_critique','flotteur_defaillant','debit_instable')),
  ref_id text,
  message text,
  niveau text,
  lu boolean default false,
  traitee boolean default false,
  created_at timestamptz default now()
);

create table if not exists eau_audit (
  id text primary key,
  user_id text,
  action text,
  entite text,
  entite_id text,
  details jsonb,
  timestamp timestamptz not null
);

create table if not exists eau_annonces (
  id text primary key,
  titre text,
  texte text,
  type text check (type in ('promo','evenement','communaute')),
  actif boolean not null default true,
  date_debut timestamptz,
  date_fin timestamptz,
  created_by text,
  created_at timestamptz default now()
);

-- ========== INDEX ==========
create index if not exists idx_eau_releves_compteur_cid_ts on eau_releves_compteur (compteur_id, timestamp);
create index if not exists idx_eau_releves_bassin_ts on eau_releves_bassin (timestamp);
create index if not exists idx_eau_entrees_bassin_ts on eau_entrees_bassin (timestamp);
create index if not exists idx_eau_factures_cid on eau_factures (compteur_id);
create index if not exists idx_eau_qr_compteur_cid on eau_qr_compteur (compteur_id);
create index if not exists idx_eau_scans_cid_ts on eau_scans (compteur_id, timestamp);
create index if not exists idx_eau_debit_tests_ts on eau_debit_tests (timestamp);

-- ========== RLS (activation + policy public) — ⚠️ REMPLACÉ pour eau_* par la PHASE 2 (v3.30.0) ==========
-- ⚠️ HISTORIQUE (S85) — NE PLUS RÉ-EXÉCUTER pour les tables eau_* : le bloc ci-dessous crée
-- des policies PERMISSIVES `using(true)` qui ont été SUPPRIMÉES en Phase 2 (v3.30.0) au profit
-- de policies par rôle conditionnées (voir section « RLS PAR RÔLE — PHASE 2 » plus bas).
-- La note « auth maison → anon » s'est révélée ERRONÉE (cf. Phase 1 v3.29.0) : l'app utilise une
-- VRAIE session Supabase (JWT `authenticated`, `sub == users.id`). Le « anon » historique venait
-- d'une course au boot, pas d'une auth maison.
-- IMPORTANT (tables NON-eau, accounts/transactions/budgets…) : elles restent `public using(true)`.
do $$
declare t text;
begin
  foreach t in array array[
    'eau_compteurs','eau_qr_compteur','eau_releves_compteur','eau_releves_bassin',
    'eau_entrees_bassin','eau_bilans','eau_debit_tests','eau_factures','eau_config','eau_roles',
    'eau_comptes_client','eau_demandes_acces','eau_scans','eau_alertes','eau_audit','eau_annonces'
  ]
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists %I on %I;', t||'_auth_all', t);
    execute format('create policy %I on %I for all to public using (true) with check (true);', t||'_auth_all', t);
  end loop;
end $$;
```

> **Après exécution**, vérifie dans Supabase → Table Editor que les 15 tables `eau_*` apparaissent. C'est tout : Claude Code se charge du reste (le code de l'app lit/écrit ces tables).

---

## RLS PAR RÔLE — PHASE 2 (v3.30.0, 2026-06-07) — ÉTAT COURANT DES TABLES eau_*

> **Remplace** le bloc permissif `*_auth_all` / `using(true)` (S85) ci-dessus pour TOUTES les
> tables `eau_*`. Isolation portée par **les prédicats `auth.uid()`/rôle**, pas par le rôle SQL :
> les policies ciblent `to public` MAIS sont conditionnées → une requête anon résiduelle (course
> au boot, sync de fond) est **filtrée à 0 ligne** au lieu d'être rejetée en 401. **63 policies**
> sur **16 tables** (RLS forcée enable), **0 policy permissive résiduelle** (vérifié `pg_policies`).

**Identité.** `auth.uid()` (uuid) == `users.id` == `eau_roles.user_id` == `eau_comptes_client.user_id`.
Colonnes `id`/`user_id` en `text` → comparer avec `auth.uid()::text`. `eau_comptes_client.compteur_ids`
est **jsonb** (opérateur `?` pour tester l'appartenance d'un id de compteur).

**Helpers (SECURITY DEFINER, search_path figé, `grant ... to public`).** Owner `postgres` (BYPASSRLS)
→ pas de récursion quand une policy sur `eau_roles` appelle `eau_is_admin()`.
```sql
create or replace function eau_is_admin() returns boolean language sql security definer stable
  set search_path = public as $$ select coalesce((select admin from eau_roles where user_id = auth.uid()::text), false); $$;
create or replace function eau_is_releveur() returns boolean language sql security definer stable
  set search_path = public as $$ select coalesce((select releveur from eau_roles where user_id = auth.uid()::text), false); $$;
create or replace function eau_client_has_compteur(cid text) returns boolean language sql security definer stable
  set search_path = public as $$ select coalesce((select compteur_ids from eau_comptes_client
     where user_id = auth.uid()::text and actif), '[]'::jsonb) ? cid; $$;
grant execute on function eau_is_admin(), eau_is_releveur(), eau_client_has_compteur(text) to public;
```

**RPC parcours sans rôle (SECURITY DEFINER, `grant authenticated`, `revoke anon` + `revoke public`).**
⚠️ Supabase accorde `EXECUTE` à `anon` PAR DÉFAUT (ALTER DEFAULT PRIVILEGES) → `revoke from public`
NE SUFFIT PAS, il faut aussi `revoke from anon` (sinon un anon peut écrire avec `auth.uid()` NULL).
```sql
-- eau_bootstrap_admin() (Phase 1) durcie : revoke from anon
revoke execute on function eau_bootstrap_admin() from anon;
create or replace function eau_claim_enrolement(p_code text) returns text language plpgsql security definer
  set search_path = public as $$
declare v_id text; begin
  update eau_comptes_client set user_id = auth.uid()::text, actif = true
   where code_enrolement = p_code and (user_id is null or user_id = auth.uid()::text) returning id into v_id;
  return v_id; end; $$;
create or replace function eau_create_demande(p_email text, p_nom text) returns text language plpgsql security definer
  set search_path = public as $$
declare v_id text; begin
  insert into eau_demandes_acces(id, user_id, email, nom, statut, created_at)
  values (gen_random_uuid()::text, auth.uid()::text, p_email, p_nom, 'en_attente', now()) returning id into v_id;
  return v_id; end; $$;
revoke execute on function eau_claim_enrolement(text), eau_create_demande(text,text) from public, anon;
grant  execute on function eau_claim_enrolement(text), eau_create_demande(text,text) to authenticated;
```

**Matrice des policies (rôle `public` + prédicats).** « tout utilisateur connecté » = `auth.uid() is not null`.

| Table | SELECT | INSERT (with check) | UPDATE / DELETE |
|---|---|---|---|
| eau_roles | admin OR `user_id=auth.uid()` (sa ligne) | admin | admin |
| eau_comptes_client | admin OR `user_id=auth.uid()` (sa ligne) | admin | admin |
| eau_demandes_acces | admin OR `user_id=auth.uid()` | admin OR `user_id=auth.uid()` | admin |
| eau_compteurs | admin OR releveur OR `eau_client_has_compteur(id)` | admin | admin |
| eau_qr_compteur | admin OR releveur | admin | admin |
| eau_releves_compteur | admin OR releveur OR `eau_client_has_compteur(compteur_id)` | admin OR releveur | admin |
| eau_releves_bassin / eau_entrees_bassin / eau_bilans / eau_debit_tests | admin OR releveur (**client = aucune branche → bassin invisible**) | admin OR releveur | admin |
| eau_factures | admin OR `eau_client_has_compteur(compteur_id)` | admin | admin |
| eau_config | admin OR releveur | admin | admin |
| eau_scans | admin | admin OR releveur OR `user_id=auth.uid()` | admin |
| eau_alertes | admin OR releveur | admin OR releveur | admin |
| eau_audit | admin | `auth.uid() is not null` | DELETE admin (pas d'UPDATE) |
| eau_annonces | `auth.uid() is not null` | admin | admin |

**Tests négatifs vérifiés (v3.30.0)** : anon = 0 ligne sur les 16 tables + écriture 401 RLS ;
releveur lit compteurs/config/bassin mais 0 sur factures/comptes_client ; client voit ses 3 compteurs
(sur 11) + son compte (1 sur 3) mais 0 sur bassin/config/voisin. Détail : `RAPPORTS-CREATEUR-APPS/gestion-eau/RAPPORT-SECU-PHASE-2.md`.
