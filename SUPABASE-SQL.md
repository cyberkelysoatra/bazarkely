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

-- ========== RLS (activation + policy authentifiés) ==========
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
    execute format('create policy %I on %I for all to authenticated using (true) with check (true);', t||'_auth_all', t);
  end loop;
end $$;
```

> **Après exécution**, vérifie dans Supabase → Table Editor que les 15 tables `eau_*` apparaissent. C'est tout : Claude Code se charge du reste (le code de l'app lit/écrit ces tables).
