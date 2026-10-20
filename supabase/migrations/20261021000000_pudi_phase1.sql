-- ============================================================================
-- PUDi Nosy Be 2026-2040 · Phase 1 · schema + public/voter functions
-- Idempotent: safe to run several times. Run as one block in the Supabase SQL editor.
-- No policy on any pudi_* table: every access goes through the SECURITY DEFINER
-- functions below. RLS enabled AND forced; anon and authenticated get no table rights.
-- ============================================================================

-- 0. Prerequisites (must already exist): public.is_joel(), extensions.hmac, vault.
do $$ begin
  if to_regprocedure('public.is_joel()') is null then
    raise exception 'STOP: public.is_joel() is missing';
  end if;
end $$;

-- 1. Secret pepper for phone fingerprints (never leaves the server)
do $$ begin
  if not exists (select 1 from vault.secrets where name = 'pudi_phone_pepper') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'),
      'pudi_phone_pepper', 'PUDi: HMAC key for phone and IP fingerprints');
  end if;
end $$;

-- 2. Tables
create table if not exists public.pudi_settings (
  id smallint primary key default 1 check (id = 1),
  publie boolean not null default false,
  cloture_at timestamptz not null default '2026-10-26 20:00:00+03',
  purge_at timestamptz not null default '2027-01-28 00:00:00+03',
  updated_at timestamptz not null default now(),
  updated_by uuid
);
insert into public.pudi_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.pudi_programmes (
  id text primary key,
  secteur text not null,
  tranche_pudi smallint not null check (tranche_pudi between 1 and 3),
  ordre smallint not null
);
insert into public.pudi_programmes (id, secteur, tranche_pudi, ordre) values
  ('A1','AME',1,1),
  ('A2','AME',1,2),
  ('A3','AME',1,3),
  ('A4','AME',1,4),
  ('A5','AME',3,5),
  ('A6','AME',2,6),
  ('A7','AME',3,7),
  ('A8','AME',1,8),
  ('T1','TOU',1,9),
  ('T2','TOU',1,10),
  ('T3','TOU',1,11),
  ('T4','TOU',1,12),
  ('T5','TOU',1,13),
  ('T6','TOU',1,14),
  ('T7','TOU',1,15),
  ('T8','TOU',1,16),
  ('T9','TOU',1,17),
  ('E1','ENV',1,18),
  ('E2','ENV',1,19),
  ('E3','ENV',1,20),
  ('H1','SAN',1,21),
  ('H2','SAN',1,22),
  ('D1','EDU',2,23),
  ('D2','EDU',1,24),
  ('D3','EDU',1,25),
  ('W1','ASS',1,26),
  ('W2','ASS',1,27),
  ('W3','ASS',1,28),
  ('W4','ASS',1,29),
  ('W5','ASS',1,30),
  ('N1','ENE',1,31),
  ('N2','ENE',2,32),
  ('N3','ENE',1,33),
  ('R1','ROU',1,34),
  ('R2','ROU',2,35),
  ('R3','ROU',2,36),
  ('R4','ROU',1,37),
  ('R5','ROU',1,38),
  ('R6','ROU',1,39),
  ('M1','TRA',1,40),
  ('M2','TRA',1,41),
  ('M3','TRA',1,42),
  ('Q1','EQU',1,43),
  ('Q2','EQU',2,44),
  ('Q3','EQU',1,45),
  ('Q4','EQU',1,46),
  ('Q5','EQU',1,47),
  ('Q6','EQU',1,48),
  ('Q7','EQU',1,49),
  ('Q8','EQU',2,50),
  ('Q9','EQU',2,51),
  ('S1','SEC',2,52)
on conflict (id) do update set secteur = excluded.secteur,
  tranche_pudi = excluded.tranche_pudi, ordre = excluded.ordre;

create table if not exists public.pudi_votes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  id_anonyme text not null unique default ('V-' || upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8))),
  fokontany text not null check (char_length(fokontany) between 1 and 60),
  fokontany_autre text check (char_length(fokontany_autre) <= 80),
  profil text not null check (profil in ('operateur_touristique','autre_entreprise','habitant','association_osc','autre')),
  phone_hash text not null unique,
  resident_declare boolean not null check (resident_declare),
  priorites text[] not null check (cardinality(priorites) = 3),
  urgents text[] not null default '{}' check (cardinality(urgents) <= 10),
  manquant text check (char_length(manquant) <= 300),
  canal_code text check (canal_code ~ '^[a-z0-9-]{1,24}$'),
  ip_hash text,
  est_test boolean not null default false,
  masque boolean not null default false,
  masque_motif text,
  nb_modifications int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pudi_refus (
  id bigint generated always as identity primary key,
  user_id uuid,
  phone_hash text,
  motif text not null,
  at timestamptz not null default now()
);

create table if not exists public.pudi_canaux (
  code text primary key check (code ~ '^[a-z0-9-]{1,24}$'),
  nom text not null,
  type text not null check (type in ('groupe_whatsapp','affiche','reunion','autre')),
  liste_membres boolean not null default false,
  responsable text,
  remarque text,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.pudi_listes (
  id uuid primary key default gen_random_uuid(),
  canal_code text not null,
  source text not null,
  date_source date,
  importe_par uuid,
  importe_at timestamptz not null default now(),
  nb_numeros int not null default 0
);

create table if not exists public.pudi_contacts (
  liste_id uuid not null references public.pudi_listes(id) on delete cascade,
  canal_code text not null,
  phone_hash text not null,
  primary key (liste_id, phone_hash)
);
create index if not exists pudi_contacts_phone_idx on public.pudi_contacts (phone_hash);

create table if not exists public.pudi_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ajoute_par uuid,
  ajoute_at timestamptz not null default now()
);

create table if not exists public.pudi_connexions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  premiere timestamptz not null default now(),
  derniere timestamptz not null default now()
);

create table if not exists public.pudi_journal (
  id bigint generated always as identity primary key,
  user_id uuid,
  action text not null,
  cible text,
  details jsonb,
  at timestamptz not null default now()
);

-- 3. Lock every table (variant "table" of trap P7: revoke explicitly from anon AND authenticated)
do $$ declare t text; begin
  foreach t in array array['pudi_settings','pudi_programmes','pudi_votes','pudi_refus','pudi_canaux',
                           'pudi_listes','pudi_contacts','pudi_admins','pudi_connexions','pudi_journal'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
  end loop;
end $$;

-- 4. Private helpers (no execute for clients)
create or replace function public.pudi_pepper() returns text
language sql stable security definer set search_path = public, vault as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'pudi_phone_pepper'
$$;

-- Returns digits in international form (no '+'), or null when unusable.
create or replace function public.pudi_normaliser_numero(p text) returns text
language plpgsql immutable as $$
declare plus boolean := btrim(coalesce(p,'')) like '+%'; d text := regexp_replace(coalesce(p,''), '\D', '', 'g');
begin
  if d like '00%' then d := substr(d, 3); plus := true; end if;
  if length(d) = 10 and d like '03%' then d := '261' || substr(d, 2);
  elsif length(d) = 9 and d like '3%' then d := '261' || d;
  end if;
  if d ~ '^2613[2-9][0-9]{7}$' then return d; end if;           -- Malagasy mobile
  if d like '261%' then return null; end if;                     -- malformed Malagasy number
  if plus and length(d) between 8 and 15 then return d; end if;  -- foreign, given with +/00
  return null;
end $$;

create or replace function public.pudi_empreinte(p_valeur text) returns text
language sql stable security definer set search_path = public, extensions as $$
  select encode(extensions.hmac(p_valeur, public.pudi_pepper(), 'sha256'), 'hex')
$$;

create or replace function public.pudi_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (public.is_joel()
    or exists (select 1 from public.pudi_admins a where a.user_id = auth.uid()))
$$;

create or replace function public.pudi_ip_hash() returns text
language plpgsql stable security definer set search_path = public as $$
declare h json := nullif(current_setting('request.headers', true), '')::json; ip text;
begin
  ip := coalesce(h->>'cf-connecting-ip', split_part(coalesce(h->>'x-forwarded-for',''), ',', 1), h->>'x-real-ip');
  if ip is null or btrim(ip) = '' then return null; end if;
  return public.pudi_empreinte('ip:' || btrim(ip));
exception when others then return null;
end $$;

-- 5. Client functions
-- State of the consultation (anon + authenticated)
create or replace function public.pudi_etat() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'publie', s.publie,
    'cloture_at', s.cloture_at,
    'maintenant', now(),
    'clos', now() >= s.cloture_at,
    'connecte', auth.uid() is not null,
    'a_vote', exists (select 1 from public.pudi_votes v where v.user_id = auth.uid()),
    'est_admin', public.pudi_is_admin())
  from public.pudi_settings s where s.id = 1
$$;

-- Records that this account signed in on PUDi (list used by Joel to pick admins, D2 A)
create or replace function public.pudi_ping() returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  insert into public.pudi_connexions (user_id) values (auth.uid())
  on conflict (user_id) do update set derniere = now();
end $$;

-- Own vote (never returns the phone)
create or replace function public.pudi_mon_vote() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('fokontany', v.fokontany, 'fokontany_autre', v.fokontany_autre,
    'profil', v.profil, 'priorites', v.priorites, 'urgents', v.urgents, 'manquant', v.manquant,
    'canal_code', v.canal_code, 'created_at', v.created_at, 'updated_at', v.updated_at,
    'nb_modifications', v.nb_modifications, 'est_test', v.est_test, 'masque', v.masque)
  from public.pudi_votes v where v.user_id = auth.uid()
$$;

-- Submit or modify the vote. Errors are raised as 'PUDI_<CODE>' (mapped to French in the UI),
-- except PUDI_NUMERO_DEJA_UTILISE, RETURNED as {"erreur": ...} so that the refusal is logged.
create or replace function public.pudi_soumettre_vote(
  p_fokontany text, p_fokontany_autre text, p_profil text, p_telephone text,
  p_resident boolean, p_priorites text[], p_urgents text[], p_manquant text, p_canal text)
returns json
language plpgsql volatile security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); s public.pudi_settings; adm boolean := public.pudi_is_admin();
  num text; ph text; existing public.pudi_votes; canal text; urg text[] := coalesce(p_urgents, '{}');
begin
  if uid is null then raise exception 'PUDI_NON_CONNECTE'; end if;
  select * into s from public.pudi_settings where id = 1;
  if now() >= s.cloture_at then raise exception 'PUDI_CLOS'; end if;
  if not s.publie and not adm then raise exception 'PUDI_NON_PUBLIE'; end if;
  if coalesce(p_resident, false) is false then raise exception 'PUDI_RESIDENCE'; end if;
  if p_profil is null or p_profil not in ('operateur_touristique','autre_entreprise','habitant','association_osc','autre')
    then raise exception 'PUDI_PROFIL'; end if;
  if p_fokontany is null or char_length(btrim(p_fokontany)) = 0 or char_length(p_fokontany) > 60
    then raise exception 'PUDI_FOKONTANY'; end if;
  if p_fokontany = 'AUTRE' and char_length(btrim(coalesce(p_fokontany_autre,''))) = 0
    then raise exception 'PUDI_FOKONTANY'; end if;
  if cardinality(p_priorites) is distinct from 3
     or (select count(distinct x) from unnest(p_priorites) x) <> 3
     or exists (select 1 from unnest(p_priorites) x where x not in (select id from public.pudi_programmes))
    then raise exception 'PUDI_PRIORITES'; end if;
  if cardinality(urg) > 10
     or (select count(distinct x) from unnest(urg) x) <> cardinality(urg)
     or exists (select 1 from unnest(urg) x where x not in (select id from public.pudi_programmes))
    then raise exception 'PUDI_URGENTS'; end if;
  if char_length(coalesce(p_manquant,'')) > 300 then raise exception 'PUDI_MANQUANT'; end if;

  select * into existing from public.pudi_votes where user_id = uid;

  if p_telephone is null or btrim(p_telephone) = '' then
    if existing.user_id is null then raise exception 'PUDI_NUMERO_INVALIDE'; end if;
    ph := existing.phone_hash;                       -- modification without retyping the number
  else
    num := public.pudi_normaliser_numero(p_telephone);
    if num is null then raise exception 'PUDI_NUMERO_INVALIDE'; end if;
    ph := public.pudi_empreinte('tel:' || num);
    -- D3 B: a number already used by ANOTHER Google account is refused
    if exists (select 1 from public.pudi_votes v where v.phone_hash = ph and v.user_id <> uid) then
      -- returned (not raised) so that the refusal stays logged for the administrators
      insert into public.pudi_refus (user_id, phone_hash, motif) values (uid, ph, 'numero_deja_utilise');
      return json_build_object('erreur', 'PUDI_NUMERO_DEJA_UTILISE');
    end if;
  end if;

  canal := case when p_canal ~ '^[a-z0-9-]{1,24}$' then p_canal else null end;

  insert into public.pudi_votes as v (user_id, fokontany, fokontany_autre, profil, phone_hash, resident_declare,
    priorites, urgents, manquant, canal_code, ip_hash, est_test)
  values (uid, p_fokontany, nullif(btrim(coalesce(p_fokontany_autre,'')),''), p_profil, ph, true,
    p_priorites, urg, nullif(btrim(coalesce(p_manquant,'')),''), canal, public.pudi_ip_hash(), not s.publie)
  on conflict (user_id) do update set
    fokontany = excluded.fokontany, fokontany_autre = excluded.fokontany_autre, profil = excluded.profil,
    phone_hash = excluded.phone_hash, priorites = excluded.priorites, urgents = excluded.urgents,
    manquant = excluded.manquant,
    canal_code = coalesce(v.canal_code, excluded.canal_code),   -- first known origin is kept
    ip_hash = excluded.ip_hash, est_test = excluded.est_test,
    nb_modifications = v.nb_modifications + 1, updated_at = now();

  return public.pudi_mon_vote();
end $$;

-- Results: voters (non-test, non-masked) and admins before closing; everyone after closing.
create or replace function public.pudi_resultats() returns json
language plpgsql stable security definer set search_path = public as $$
declare s public.pudi_settings; clos boolean; r json;
begin
  select * into s from public.pudi_settings where id = 1;
  clos := now() >= s.cloture_at;
  if not clos and not public.pudi_is_admin() and not exists (
      select 1 from public.pudi_votes v where v.user_id = auth.uid() and not v.masque and not v.est_test)
    then raise exception 'PUDI_RESULTATS_RESERVES'; end if;

  with v as (select * from public.pudi_votes where not masque and not est_test),
       n as (select count(*)::int as n from v),
       pr as (select p.id, p.ordre, p.tranche_pudi,
                (select count(*)::int from v where p.id = any(v.priorites)) as np,
                (select count(*)::int from v where p.id = any(v.urgents)) as nu
              from public.pudi_programmes p)
  select json_build_object(
    'clos', clos, 'cloture_at', s.cloture_at, 'calcule_at', now(), 'nb_votants', (select n from n),
    'priorites', coalesce((select json_agg(json_build_object('id', id, 'n', np,
        'pct', case when (select n from n) = 0 then 0 else round(100.0 * np / (select n from n), 1) end)
        order by np desc, ordre) from pr), '[]'),
    'urgents', coalesce((select json_agg(json_build_object('id', id, 'n', nu,
        'pct', case when (select n from n) = 0 then 0 else round(100.0 * nu / (select n from n), 1) end,
        'tranche_pudi', tranche_pudi, 'ecart', tranche_pudi > 1 and nu > 0)
        order by nu desc, ordre) from pr), '[]'),
    'par_profil', coalesce((select json_object_agg(profil, k) from (select profil, count(*) k from v group by profil) x), '{}'),
    'par_fokontany', coalesce((select json_object_agg(fokontany, k) from (select fokontany, count(*) k from v group by fokontany) x), '{}'),
    'reseaux', json_build_object(
      'dans_nos_reseaux', (select count(*) from v where exists (select 1 from public.pudi_contacts c where c.phone_hash = v.phone_hash)),
      'hors_reseaux', (select count(*) from v where not exists (select 1 from public.pudi_contacts c where c.phone_hash = v.phone_hash))),
    'manquants', coalesce((select json_agg(manquant order by created_at) from v where manquant is not null), '[]')
  ) into r;
  return r;
end $$;

-- 6. Execute rights
revoke execute on function public.pudi_pepper(), public.pudi_normaliser_numero(text), public.pudi_empreinte(text),
  public.pudi_ip_hash() from public, anon, authenticated;
revoke execute on function public.pudi_is_admin(), public.pudi_ping(), public.pudi_mon_vote(),
  public.pudi_soumettre_vote(text,text,text,text,boolean,text[],text[],text,text) from public, anon;
grant execute on function public.pudi_is_admin(), public.pudi_ping(), public.pudi_mon_vote(),
  public.pudi_soumettre_vote(text,text,text,text,boolean,text[],text[],text,text) to authenticated;
revoke execute on function public.pudi_etat(), public.pudi_resultats() from public;
grant execute on function public.pudi_etat(), public.pudi_resultats() to anon, authenticated;
