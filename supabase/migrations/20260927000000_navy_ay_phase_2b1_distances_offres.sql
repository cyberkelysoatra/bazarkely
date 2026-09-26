-- =====================================================================================
-- NAVY ay - phase 2B1: road distances, client proposed price, counter-proposal,
-- corridor around the driver's route, NAVY credit (avoir).
--
-- IDEMPOTENT: every statement can be replayed (if not exists, create or replace,
-- drop ... if exists + create, on conflict, cron.schedule by name).
--
-- SECURITY:
-- - RLS enabled AND forced on every new table; everything revoked from public / anon /
--   authenticated (Supabase default grants, P7 table variant), then SELECT only.
--   No client ever writes these tables directly: navy_* SECURITY DEFINER functions only.
-- - OpenRouteService key: ONLY a secret of the Edge Function `navy-routes` (ORS_API_KEY).
--   The database never sees it. The database calls the function through pg_net with a
--   shared secret kept in Vault (navy_routes_secret); the function writes back through
--   service_role-only functions (navy_store_distances / navy_store_route / navy_ors_log).
-- - Driver GPS position and route (navy_driver_routes): the driver himself and operators
--   only. One reading when the driver declares himself available / changes direction,
--   erased when the direction expires (navy_tick). Never a continuous tracking.
-- - Credit (navy_credit_movements): a JOURNAL of movements, the balance is their sum;
--   never a balance written directly. Readable by its owner and operators only (no
--   partner). Never refunded in cash, never transferable.
-- - Distances: any error of the routing service => fallback to the straight-line
--   estimate + 30 % (navy_estimated_km), never a blocked order.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. Settings, partners, existing parcel tables
-- -------------------------------------------------------------------------------------
alter table public.navy_settings add column if not exists corridor_width_m      integer not null default 500;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'navy_settings_corridor_width_check') then
    alter table public.navy_settings add constraint navy_settings_corridor_width_check check (corridor_width_m between 50 and 5000);
  end if;
end $$;
-- Only the corridor width is editable by operators (RLS update policy: operators).
grant update (corridor_width_m) on public.navy_settings to authenticated;

-- Driver option "Masquer les offres inférieures à mon tarif" (off by default).
alter table public.navy_partners add column if not exists hide_low_offers boolean not null default false;
grant insert (hide_low_offers) on public.navy_partners to authenticated;
grant update (hide_low_offers) on public.navy_partners to authenticated;

-- Parcels: distance source, proposed price, counter-proposal, supplement.
alter table public.navy_parcels add column if not exists distance_source   text not null default 'estimation';
alter table public.navy_parcels add column if not exists proposed_total    integer;
alter table public.navy_parcels add column if not exists counter_state     text;
alter table public.navy_parcels add column if not exists counter_at        timestamptz;
alter table public.navy_parcels add column if not exists counter_round     integer;
alter table public.navy_parcels add column if not exists precheck_at       timestamptz;
alter table public.navy_parcels add column if not exists supplement_status text;

alter table public.navy_parcels drop constraint if exists navy_parcels_driver_mode_check;
alter table public.navy_parcels add constraint navy_parcels_driver_mode_check
  check (driver_mode in ('auto', 'choix', 'prix'));
alter table public.navy_parcels drop constraint if exists navy_parcels_search_state_check;
alter table public.navy_parcels add constraint navy_parcels_search_state_check
  check (search_state in ('recherche', 'attente_client', 'trouve', 'contre_proposition', 'attente_supplement'));
alter table public.navy_parcels drop constraint if exists navy_parcels_distance_source_check;
alter table public.navy_parcels add constraint navy_parcels_distance_source_check
  check (distance_source in ('route', 'estimation'));
alter table public.navy_parcels drop constraint if exists navy_parcels_counter_state_check;
alter table public.navy_parcels add constraint navy_parcels_counter_state_check
  check (counter_state in ('propose', 'choisi', 'refuse'));
alter table public.navy_parcels drop constraint if exists navy_parcels_supplement_status_check;
alter table public.navy_parcels add constraint navy_parcels_supplement_status_check
  check (supplement_status in ('a_payer_depot', 'attente_reference', 'a_verifier', 'refuse', 'paye'));
alter table public.navy_parcels drop constraint if exists navy_parcels_proposed_total_check;
alter table public.navy_parcels add constraint navy_parcels_proposed_total_check
  check (proposed_total is null or (proposed_total > 0 and proposed_total % 100 = 0));

-- Frozen amounts: credit used, what is left to pay, supplement after a counter-proposal.
alter table public.navy_parcel_prices add column if not exists initial_total          integer;
alter table public.navy_parcel_prices add column if not exists credit_used            integer not null default 0;
alter table public.navy_parcel_prices add column if not exists amount_due             integer;
alter table public.navy_parcel_prices add column if not exists supplement             integer not null default 0;
alter table public.navy_parcel_prices add column if not exists supplement_credit_used integer not null default 0;
alter table public.navy_parcel_prices add column if not exists supplement_due         integer not null default 0;
alter table public.navy_parcel_prices add column if not exists supplement_method      text;
update public.navy_parcel_prices set initial_total = total_price where initial_total is null;
update public.navy_parcel_prices set amount_due = initial_total - credit_used where amount_due is null;
alter table public.navy_parcel_prices drop constraint if exists navy_parcel_prices_supplement_method_check;
alter table public.navy_parcel_prices add constraint navy_parcel_prices_supplement_method_check
  check (supplement_method in ('avoir', 'especes', 'orange_money'));

-- Offers of the "Je propose mon prix" mode go to every driver at once, open for the round.
alter table public.navy_parcel_offers add column if not exists broadcast boolean not null default false;

-- Orange Money references: first payment or supplement.
alter table public.navy_parcel_payments add column if not exists kind text not null default 'principal';
alter table public.navy_parcel_payments drop constraint if exists navy_parcel_payments_kind_check;
alter table public.navy_parcel_payments add constraint navy_parcel_payments_kind_check
  check (kind in ('principal', 'supplement'));

-- -------------------------------------------------------------------------------------
-- 2. New tables
-- -------------------------------------------------------------------------------------

-- Road distance between two grocers (both directions stored: a road trip is not
-- symmetric). The positions used are kept: a row whose positions no longer match the
-- grocers' current positions is ignored (fallback), even before its recomputation.
create table if not exists public.navy_grocer_distances (
  from_id     uuid not null references public.navy_partners(id) on delete cascade,
  to_id       uuid not null references public.navy_partners(id) on delete cascade,
  from_lat    double precision not null,
  from_lng    double precision not null,
  to_lat      double precision not null,
  to_lng      double precision not null,
  km          numeric not null check (km >= 0),
  duration_s  integer,
  source      text not null check (source in ('route', 'estimation')),
  computed_at timestamptz not null default now(),
  primary key (from_id, to_id),
  constraint navy_grocer_distances_distinct check (from_id <> to_id)
);
create index if not exists navy_grocer_distances_to_idx on public.navy_grocer_distances (to_id);

-- Bookkeeping of the distance computation (single row; kept out of navy_settings so
-- that system writes never touch the operators' settings audit).
create table if not exists public.navy_distance_state (
  id           boolean primary key default true check (id),
  computed_at  timestamptz,
  requested_at timestamptz,
  full_pending boolean not null default false,
  last_error   text
);
insert into public.navy_distance_state (id) values (true) on conflict (id) do nothing;

-- Grocers whose distances must be (re)computed (validated, moved).
create table if not exists public.navy_distance_queue (
  partner_id uuid primary key references public.navy_partners(id) on delete cascade,
  queued_at  timestamptz not null default now()
);

-- Light journal of the requests sent to OpenRouteService (quota follow-up).
create table if not exists public.navy_ors_requests (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  kind        text not null check (kind in ('matrix', 'directions')),
  ok          boolean not null,
  http_status integer,
  detail      text
);
create index if not exists navy_ors_requests_at_idx on public.navy_ors_requests (at);

-- Driver: ONE GPS reading at availability / direction change, and the route computed
-- from it. Erased when the direction expires.
create table if not exists public.navy_driver_routes (
  partner_id   uuid primary key references public.navy_partners(id) on delete cascade,
  user_id      uuid not null references public.users(id) on delete cascade,
  origin_lat   double precision not null check (origin_lat between -90 and 90),
  origin_lng   double precision not null check (origin_lng between -180 and 180),
  dest_lat     double precision not null,
  dest_lng     double precision not null,
  route        jsonb,                       -- [[lat, lng], ...] simplified
  route_status text not null default 'pending' check (route_status in ('pending', 'ok', 'failed')),
  attempts     integer not null default 0,
  requested_at timestamptz,
  computed_at  timestamptz,
  expires_at   timestamptz not null,
  created_at   timestamptz not null default now()
);
create index if not exists navy_driver_routes_expires_idx on public.navy_driver_routes (expires_at);

-- NAVY credit: journal of movements (+ credit, - use). Balance = sum.
create table if not exists public.navy_credit_movements (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  amount     integer not null check (amount <> 0),
  kind       text not null check (kind in ('credit', 'utilisation')),
  parcel_id  uuid references public.navy_parcels(id) on delete set null,
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists navy_credit_movements_user_idx on public.navy_credit_movements (user_id, created_at);
create index if not exists navy_credit_movements_parcel_idx on public.navy_credit_movements (parcel_id);

-- Counter-proposal: up to 3 drivers shown to the sender.
create table if not exists public.navy_parcel_counter_offers (
  parcel_id         uuid not null references public.navy_parcels(id) on delete cascade,
  rank              smallint not null,
  driver_partner_id uuid not null references public.navy_partners(id) on delete cascade,
  driver_name       text,
  vehicle_type      text,
  fare              integer not null,
  new_total         integer not null,
  supplement        integer not null,
  near_m            double precision,
  created_at        timestamptz not null default now(),
  primary key (parcel_id, rank)
);

-- -------------------------------------------------------------------------------------
-- 3. Pure helpers
-- -------------------------------------------------------------------------------------

-- Great-circle distance in meters.
create or replace function public.navy_geo_m(p_lat1 float8, p_lng1 float8, p_lat2 float8, p_lng2 float8)
returns float8 language sql immutable set search_path = public as $$
  select case when p_lat1 is null or p_lng1 is null or p_lat2 is null or p_lng2 is null then null else
    2 * 6371000 * asin(least(1, sqrt(power(sin(radians(p_lat2 - p_lat1) / 2), 2)
      + cos(radians(p_lat1)) * cos(radians(p_lat2)) * power(sin(radians(p_lng2 - p_lng1) / 2), 2)))) end;
$$;

-- Shortest distance (meters) between a point and a route [[lat, lng], ...].
-- Simple geometry (PostGIS is not installed on the project): local planar projection
-- centred on the point, exact enough at the scale of an island (< 0.1 %).
create or replace function public.navy_point_route_m(p_lat float8, p_lng float8, p_route jsonb)
returns float8 language plpgsql immutable set search_path = public as $$
declare
  n int;
  i int;
  kx float8;
  ky constant float8 := 110574;
  x1 float8; y1 float8; x2 float8; y2 float8;
  dx float8; dy float8; t float8; d float8;
  best float8;
begin
  if p_lat is null or p_lng is null or p_route is null or jsonb_typeof(p_route) <> 'array' then
    return null;
  end if;
  n := jsonb_array_length(p_route);
  if n = 0 then
    return null;
  end if;
  kx := 111320 * cos(radians(p_lat));
  if n = 1 then
    x1 := ((p_route->0->>1)::float8 - p_lng) * kx;
    y1 := ((p_route->0->>0)::float8 - p_lat) * ky;
    return sqrt(x1 * x1 + y1 * y1);
  end if;
  x2 := ((p_route->0->>1)::float8 - p_lng) * kx;
  y2 := ((p_route->0->>0)::float8 - p_lat) * ky;
  for i in 1 .. n - 1 loop
    x1 := x2; y1 := y2;
    x2 := ((p_route->i->>1)::float8 - p_lng) * kx;
    y2 := ((p_route->i->>0)::float8 - p_lat) * ky;
    dx := x2 - x1; dy := y2 - y1;
    if dx = 0 and dy = 0 then
      t := 0;
    else
      t := greatest(0, least(1, -(x1 * dx + y1 * dy) / (dx * dx + dy * dy)));
    end if;
    d := sqrt(power(x1 + t * dx, 2) + power(y1 + t * dy, 2));
    if best is null or d < best then
      best := d;
    end if;
  end loop;
  return best;
end;
$$;

-- Minimum accepted for "Je propose mon prix": both grocers' fees + CyberKELY share,
-- rounded UP to 100 Ar (mirrored by minProposedTotal() in utils/parcelRules.ts).
create or replace function public.navy_min_total(p_depot integer, p_pickup integer, p_share integer)
returns integer language sql immutable set search_path = public as $$
  select (ceil((greatest(coalesce(p_depot, 0), 0) + greatest(coalesce(p_pickup, 0), 0)
                + greatest(coalesce(p_share, 0), 0)) / 100.0) * 100)::integer;
$$;

-- -------------------------------------------------------------------------------------
-- 4. Distances between grocers (replaces navy_estimated_km for two grocers)
-- -------------------------------------------------------------------------------------

-- Road distance when known for the CURRENT positions, else straight line + 30 %.
create or replace function public.navy_pair_km(p_from uuid, p_to uuid)
returns table (km numeric, source text)
language sql stable security definer set search_path = public as $$
  select coalesce(g.km, public.navy_estimated_km(a.shop_lat, a.shop_lng, b.shop_lat, b.shop_lng)),
         case when g.km is not null then 'route' else 'estimation' end
    from public.navy_partners a
    cross join public.navy_partners b
    left join public.navy_grocer_distances g
      on g.from_id = a.id and g.to_id = b.id and g.source = 'route'
     and g.from_lat = a.shop_lat and g.from_lng = a.shop_lng and g.to_lat = b.shop_lat and g.to_lng = b.shop_lng
   where a.id = p_from and b.id = p_to;
$$;

-- Shared secret database -> Edge Function navy-routes.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'navy_routes_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'navy_routes_secret',
                                'Shared secret database -> navy-routes Edge Function');
  end if;
end $$;

-- Call the Edge Function (pg_net: sent after commit, never breaks the caller).
create or replace function public.navy_call_routes(p_body jsonb)
returns bigint language plpgsql security definer set search_path = public, extensions as $$
declare
  v_secret text;
  v_req bigint;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'navy_routes_secret';
  if v_secret is null then
    return null;
  end if;
  select net.http_post(
    url := 'https://ofzmwrzatcztoekrpvkj.supabase.co/functions/v1/navy-routes',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      -- public anon key: only satisfies the gateway JWT check; the real auth is x-navy-internal
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mem13cnphdGN6dG9la3JwdmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNjAxMTUsImV4cCI6MjA3NDczNjExNX0.hYDpbvzwNZWmDgXPSGEgoKLR-m51TQZmaWw1whQ90Cw',
      'x-navy-internal', v_secret),
    body := p_body,
    timeout_milliseconds := 30000) into v_req;
  return v_req;
exception when others then
  return null;
end;
$$;

create or replace function public.navy_request_distances()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.navy_distance_state set requested_at = now() where id;
  perform public.navy_call_routes(jsonb_build_object('action', 'matrix'));
end;
$$;

create or replace function public.navy_request_route(p_partner_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.navy_call_routes(jsonb_build_object('action', 'route', 'partner_id', p_partner_id));
end;
$$;

-- Grocer validated / moved / removed → only its rows are dropped and recomputed.
create or replace function public.navy_partners_distances()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_ok_new boolean;
  v_ok_old boolean;
  v_moved boolean;
begin
  if tg_op = 'DELETE' then
    return old;   -- rows removed by the foreign keys (on delete cascade)
  end if;
  if new.kind <> 'epicier' then
    return new;
  end if;
  v_ok_new := new.status = 'approved' and new.shop_lat is not null and new.shop_lng is not null;
  v_ok_old := tg_op = 'UPDATE' and old.status = 'approved' and old.shop_lat is not null and old.shop_lng is not null;
  v_moved := tg_op = 'UPDATE' and (new.shop_lat is distinct from old.shop_lat or new.shop_lng is distinct from old.shop_lng);
  if (v_ok_old and not v_ok_new) or v_moved then
    delete from public.navy_grocer_distances where from_id = new.id or to_id = new.id;
  end if;
  if not v_ok_new then
    delete from public.navy_distance_queue where partner_id = new.id;
  elsif not v_ok_old or v_moved then
    insert into public.navy_distance_queue (partner_id) values (new.id)
    on conflict (partner_id) do update set queued_at = now();
    perform public.navy_request_distances();
  end if;
  return new;
end;
$$;

drop trigger if exists navy_partners_distances on public.navy_partners;
create trigger navy_partners_distances
  after insert or update on public.navy_partners
  for each row execute function public.navy_partners_distances();

-- ----- service_role only (Edge Function navy-routes) -----

create or replace function public.navy_routes_config()
returns text language sql stable security definer set search_path = public, vault as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'navy_routes_secret';
$$;

create or replace function public.navy_ors_log(p_kind text, p_ok boolean, p_http_status integer, p_detail text)
returns void language sql security definer set search_path = public as $$
  insert into public.navy_ors_requests (kind, ok, http_status, detail)
  values (p_kind, p_ok, p_http_status, left(p_detail, 300));
$$;

-- What to compute: every approved positioned grocer (locations), and the grocers whose
-- rows must be written (all when a full recomputation was asked).
create or replace function public.navy_distance_work()
returns jsonb language sql stable security definer set search_path = public as $$
  with g as (
    select id, shop_lat as lat, shop_lng as lng from public.navy_partners
     where kind = 'epicier' and status = 'approved' and shop_lat is not null and shop_lng is not null)
  select jsonb_build_object(
    'started_at', now(),
    'full', (select full_pending from public.navy_distance_state where id),
    'grocers', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'lat', lat, 'lng', lng) order by id) from g), '[]'::jsonb),
    'touched', coalesce((select jsonb_agg(g.id) from g
                          where (select full_pending from public.navy_distance_state where id)
                             or exists (select 1 from public.navy_distance_queue q where q.partner_id = g.id)), '[]'::jsonb));
$$;

-- Store the Matrix answer. p_locations = [{id, lat, lng}] in the request order,
-- p_distances / p_durations = the ORS matrices (km / s, null = no road found).
create or replace function public.navy_store_distances(p_started_at timestamptz, p_full boolean, p_locations jsonb,
                                                      p_distances jsonb, p_durations jsonb, p_touched uuid[])
returns integer language plpgsql security definer set search_path = public as $$
declare
  n int := jsonb_array_length(coalesce(p_locations, '[]'::jsonb));
  i int;
  j int;
  a jsonb;
  b jsonb;
  v_km numeric;
  v_rows int := 0;
begin
  for i in 0 .. n - 1 loop
    a := p_locations->i;
    for j in 0 .. n - 1 loop
      continue when i = j;
      b := p_locations->j;
      continue when not ((a->>'id')::uuid = any(p_touched) or (b->>'id')::uuid = any(p_touched));
      -- the grocer must still be at the position used for the request
      continue when not exists (select 1 from public.navy_partners pa where pa.id = (a->>'id')::uuid
                                   and pa.shop_lat = (a->>'lat')::float8 and pa.shop_lng = (a->>'lng')::float8)
                 or not exists (select 1 from public.navy_partners pb where pb.id = (b->>'id')::uuid
                                   and pb.shop_lat = (b->>'lat')::float8 and pb.shop_lng = (b->>'lng')::float8);
      v_km := nullif(p_distances->i->>j, '')::numeric;
      insert into public.navy_grocer_distances as d (from_id, to_id, from_lat, from_lng, to_lat, to_lng, km, duration_s, source, computed_at)
      values ((a->>'id')::uuid, (b->>'id')::uuid, (a->>'lat')::float8, (a->>'lng')::float8, (b->>'lat')::float8, (b->>'lng')::float8,
              coalesce(round(v_km, 1), public.navy_estimated_km((a->>'lat')::float8, (a->>'lng')::float8, (b->>'lat')::float8, (b->>'lng')::float8)),
              round(nullif(p_durations->i->>j, '')::numeric)::integer,
              case when v_km is null then 'estimation' else 'route' end, now())
      on conflict (from_id, to_id) do update
         set from_lat = excluded.from_lat, from_lng = excluded.from_lng, to_lat = excluded.to_lat, to_lng = excluded.to_lng,
             km = excluded.km, duration_s = excluded.duration_s, source = excluded.source, computed_at = excluded.computed_at;
      v_rows := v_rows + 1;
    end loop;
  end loop;
  delete from public.navy_distance_queue where partner_id = any(p_touched) and queued_at <= p_started_at;
  update public.navy_distance_state
     set computed_at = now(), last_error = null,
         full_pending = case when p_full then false else full_pending end
   where id;
  return v_rows;
end;
$$;

create or replace function public.navy_distance_failed(p_error text)
returns void language sql security definer set search_path = public as $$
  update public.navy_distance_state set last_error = left(p_error, 200) where id;
$$;

-- Route to compute for a driver (pending only). Counts the attempt.
create or replace function public.navy_route_work(p_partner_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r public.navy_driver_routes;
begin
  update public.navy_driver_routes
     set attempts = attempts + 1, requested_at = now()
   where partner_id = p_partner_id and route_status = 'pending' and expires_at > now()
   returning * into r;
  if not found then
    return null;
  end if;
  return jsonb_build_object('origin_lat', r.origin_lat, 'origin_lng', r.origin_lng, 'dest_lat', r.dest_lat, 'dest_lng', r.dest_lng);
end;
$$;

-- Store the route, only if the reading / destination did not change meanwhile.
create or replace function public.navy_store_route(p_partner_id uuid, p_origin_lat float8, p_origin_lng float8,
                                                  p_dest_lat float8, p_dest_lng float8, p_route jsonb, p_ok boolean)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.navy_driver_routes
     set route = case when p_ok then p_route else null end,
         route_status = case when p_ok then 'ok' when attempts >= 3 then 'failed' else 'pending' end,
         computed_at = now()
   where partner_id = p_partner_id and origin_lat = p_origin_lat and origin_lng = p_origin_lng
     and dest_lat = p_dest_lat and dest_lng = p_dest_lng;
  return found;
end;
$$;

-- ----- operators -----

create or replace function public.navy_distance_status()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  s public.navy_distance_state;
  v_width integer;
  v_month timestamptz := date_trunc('month', now() at time zone 'Indian/Antananarivo') at time zone 'Indian/Antananarivo';
begin
  if not public.navy_is_operator() then
    raise exception 'navy_distance_status: operator only' using errcode = '42501';
  end if;
  select * into s from public.navy_distance_state where id;
  select corridor_width_m into v_width from public.navy_settings where id;
  return jsonb_build_object(
    'computed_at', s.computed_at,
    'requested_at', s.requested_at,
    'last_error', s.last_error,
    'full_pending', s.full_pending,
    'corridor_width_m', v_width,
    'grocers', (select count(*) from public.navy_partners where kind = 'epicier' and status = 'approved' and shop_lat is not null),
    'pairs_route', (select count(*) from public.navy_grocer_distances where source = 'route'),
    'pairs_total', (select count(*) from public.navy_grocer_distances),
    'queued', (select count(*) from public.navy_distance_queue),
    'month_requests', (select count(*) from public.navy_ors_requests where at >= v_month),
    'month_matrix', (select count(*) from public.navy_ors_requests where at >= v_month and kind = 'matrix'),
    'month_directions', (select count(*) from public.navy_ors_requests where at >= v_month and kind = 'directions'),
    'month_errors', (select count(*) from public.navy_ors_requests where at >= v_month and not ok));
end;
$$;

create or replace function public.navy_request_distance_refresh()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.navy_is_operator() then
    raise exception 'navy_request_distance_refresh: operator only' using errcode = '42501';
  end if;
  update public.navy_distance_state set full_pending = true where id;
  perform public.navy_request_distances();
  return public.navy_distance_status();
end;
$$;

-- -------------------------------------------------------------------------------------
-- 5. Credit (avoir)
-- -------------------------------------------------------------------------------------
create or replace function public.navy_credit_balance_of(p_user uuid)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount), 0)::integer from public.navy_credit_movements where user_id = p_user;
$$;

-- Credit owed by a parcel (navy_parcel_prices.credit_due) → journal, by difference
-- (replay-safe: the journal converges on credit_due).
create or replace function public.navy_credit_sync(p_parcel_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_target integer;
  v_have integer;
  v_user uuid;
  v_reason text;
begin
  select coalesce(pr.credit_due, 0), p.sender_id, pr.credit_reason into v_target, v_user, v_reason
    from public.navy_parcel_prices pr join public.navy_parcels p on p.id = pr.parcel_id
   where pr.parcel_id = p_parcel_id;
  if v_user is null then
    return;
  end if;
  select coalesce(sum(amount), 0) into v_have from public.navy_credit_movements
   where parcel_id = p_parcel_id and kind = 'credit';
  if v_target <> v_have then
    insert into public.navy_credit_movements (user_id, amount, kind, parcel_id, note)
    values (v_user, v_target - v_have, 'credit', p_parcel_id, v_reason);
  end if;
end;
$$;

-- Own balance and last movements (client, "Mes colis").
create or replace function public.navy_my_credit()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'balance', public.navy_credit_balance_of(auth.uid()),
    'movements', coalesce((select jsonb_agg(jsonb_build_object('at', m.created_at, 'amount', m.amount, 'kind', m.kind,
                                                                'note', m.note, 'parcel_code', p.code) order by m.created_at desc)
                             from (select * from public.navy_credit_movements where user_id = auth.uid()
                                    order by created_at desc limit 20) m
                             left join public.navy_parcels p on p.id = m.parcel_id), '[]'::jsonb))
  where auth.uid() is not null;
$$;

-- -------------------------------------------------------------------------------------
-- 6. Eligibility (replaces the 2A version): approved, available, and (destination in
--    the arrival grocer's zone OR route passing within the corridor width of it).
-- -------------------------------------------------------------------------------------
drop function if exists public.navy_eligible_drivers(uuid, numeric, integer);

create or replace function public.navy_eligible_drivers(p_arrival_zone uuid, p_arrival_lat float8, p_arrival_lng float8,
                                                        p_depot_lat float8, p_depot_lng float8, p_km numeric)
returns table (partner_id uuid, user_id uuid, name text, vehicle_type text, fare integer, dest_zone_id uuid,
               since timestamptz, via text, hide_low boolean, near_m float8)
language sql stable security definer set search_path = public as $$
  select p.id, p.user_id, p.display_name, p.vehicle_type,
         public.navy_fare(p_km, coalesce(p.min_fare, s.suggested_min_fare), coalesce(p.fare_per_5km, s.suggested_fare_per_5km)),
         d.dest_zone_id, d.client_at,
         case when p_arrival_zone is not null and d.dest_zone_id = p_arrival_zone then 'zone' else 'couloir' end,
         p.hide_low_offers,
         -- nearest to the departure: GPS reading -> depot grocer; else destination -> arrival grocer
         coalesce(public.navy_geo_m(r.origin_lat, r.origin_lng, p_depot_lat, p_depot_lng),
                  public.navy_geo_m(d.dest_lat, d.dest_lng, p_arrival_lat, p_arrival_lng))
    from public.navy_partners p
    join public.navy_driver_status d on d.partner_id = p.id
    cross join public.navy_settings s
    left join public.navy_driver_routes r on r.partner_id = p.id and r.expires_at > now()
   where p.kind = 'chauffeur' and p.status = 'approved'
     and d.available and d.available_until > now()
     and ((p_arrival_zone is not null and d.dest_zone_id = p_arrival_zone)
          or (r.route_status = 'ok' and r.route is not null
              and public.navy_point_route_m(p_arrival_lat, p_arrival_lng, r.route) <= s.corridor_width_m));
$$;

-- -------------------------------------------------------------------------------------
-- 7. Quote and order
-- -------------------------------------------------------------------------------------
create or replace function public.navy_compute_quote(p_depot uuid, p_arrival uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  d public.navy_partners;
  a public.navy_partners;
  s public.navy_settings;
  v_km numeric;
  v_src text;
  v_ceiling integer;
  v_dep integer;
  v_pick integer;
  v_bd jsonb;
  v_drivers jsonb;
begin
  select * into s from public.navy_settings where id;
  select * into d from public.navy_partners where id = p_depot and kind = 'epicier' and status = 'approved';
  if not found or not d.is_open or d.shop_lat is null then
    raise exception 'navy: depot grocer not available' using errcode = '22023';
  end if;
  select * into a from public.navy_partners where id = p_arrival and kind = 'epicier' and status = 'approved';
  if not found or not a.is_open or a.shop_lat is null then
    raise exception 'navy: arrival grocer not available' using errcode = '22023';
  end if;
  if d.id = a.id then
    raise exception 'navy: same grocer for depot and arrival' using errcode = '22023';
  end if;
  select k.km, k.source into v_km, v_src from public.navy_pair_km(d.id, a.id) k;
  v_ceiling := public.navy_fare(v_km, s.suggested_min_fare, s.suggested_fare_per_5km);
  v_dep := coalesce(d.depot_fee, s.suggested_depot_fee, 0);
  v_pick := coalesce(a.pickup_fee, s.suggested_pickup_fee, 0);
  v_bd := public.navy_price_breakdown(v_dep, v_ceiling, v_pick, s.cyberkely_share);
  -- "Je choisis mon chauffeur": drivers within the transport price paid by the client.
  select coalesce(jsonb_agg(jsonb_build_object('partner_id', e.partner_id, 'name', e.name, 'vehicle_type', e.vehicle_type,
                                               'fare', e.fare, 'dest_zone_id', e.dest_zone_id, 'via', e.via) order by e.fare, e.since), '[]'::jsonb)
    into v_drivers
    from public.navy_eligible_drivers(a.zone_id, a.shop_lat, a.shop_lng, d.shop_lat, d.shop_lng, v_km) e
   where e.fare <= v_ceiling;
  return jsonb_build_object(
    'distance_km', v_km, 'distance_source', v_src, 'transport_ceiling', v_ceiling, 'depot_fee', v_dep, 'pickup_fee', v_pick,
    'share', s.cyberkely_share, 'breakdown', v_bd, 'min_total', public.navy_min_total(v_dep, v_pick, s.cyberkely_share),
    'depot_name', coalesce(d.shop_name, d.display_name), 'arrival_name', coalesce(a.shop_name, a.display_name),
    'depot_zone_id', d.zone_id, 'arrival_zone_id', a.zone_id, 'drivers', v_drivers,
    'orange_money_number', s.orange_money_number);
end;
$$;

-- Quote shown before ordering (any signed-in account) + the caller's credit balance.
create or replace function public.navy_quote(p_depot uuid, p_arrival uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'navy_quote: sign-in required' using errcode = '42501';
  end if;
  return public.navy_compute_quote(p_depot, p_arrival)
         || jsonb_build_object('credit_balance', public.navy_credit_balance_of(auth.uid()));
end;
$$;

-- Order. Idempotent on the client id. Amounts computed HERE and frozen; the credit is
-- deducted automatically (the rest is kept). p_proposed_total: "Je propose mon prix".
drop function if exists public.navy_create_parcel(uuid, uuid, uuid, text, text, text, integer, text, uuid, text);

create or replace function public.navy_create_parcel(
  p_id uuid, p_depot uuid, p_arrival uuid, p_recipient_name text, p_recipient_phone text,
  p_category text, p_declared_value integer, p_driver_mode text, p_chosen_driver uuid, p_payment_method text,
  p_proposed_total integer default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid uuid := auth.uid();
  v_existing public.navy_parcels;
  q jsonb;
  d public.navy_partners;
  a public.navy_partners;
  v_code text;
  v_wcode text;
  v_chosen_fare integer;
  v_recipient uuid;
  v_key text;
  v_user public.users;
  v_line jsonb;
  v_seq integer := 0;
  v_try integer := 0;
  v_ceiling integer;
  v_bd jsonb;
  v_total integer;
  v_balance integer;
  v_used integer;
  v_due integer;
begin
  if v_uid is null then
    raise exception 'navy_create_parcel: sign-in required' using errcode = '42501';
  end if;
  select * into v_existing from public.navy_parcels where id = p_id;
  if found then
    if v_existing.sender_id <> v_uid then
      raise exception 'navy_create_parcel: not yours' using errcode = '42501';
    end if;
    return jsonb_build_object('id', v_existing.id, 'code', v_existing.code, 'replay', true,
                              'withdraw_code', (select withdraw_code from public.navy_parcel_secrets where parcel_id = p_id));
  end if;

  if p_category not in ('document', 'vetement', 'telephone', 'nourriture', 'autre') then
    raise exception 'navy_create_parcel: invalid category' using errcode = '22023';
  end if;
  if p_declared_value is null or p_declared_value < 0 or p_declared_value > 50000 then
    raise exception 'navy_create_parcel: declared value must be between 0 and 50000' using errcode = '22023';
  end if;
  if p_driver_mode not in ('auto', 'choix', 'prix') or p_payment_method not in ('especes', 'orange_money') then
    raise exception 'navy_create_parcel: invalid option' using errcode = '22023';
  end if;
  if length(btrim(coalesce(p_recipient_name, ''))) = 0 then
    raise exception 'navy_create_parcel: recipient name required' using errcode = '22023';
  end if;
  v_key := public.navy_phone_key(p_recipient_phone);
  if v_key is null or length(v_key) < 9 then
    raise exception 'navy_create_parcel: recipient phone required' using errcode = '22023';
  end if;

  q := public.navy_compute_quote(p_depot, p_arrival);
  if (q->>'arrival_zone_id') is null then
    raise exception 'navy_create_parcel: arrival grocer outside every zone' using errcode = '22023';
  end if;
  if p_driver_mode = 'choix' then
    select (e->>'fare')::integer into v_chosen_fare from jsonb_array_elements(q->'drivers') e
     where (e->>'partner_id')::uuid = p_chosen_driver;
    if v_chosen_fare is null then
      raise exception 'navy_create_parcel: chosen driver not available' using errcode = '22023';
    end if;
  end if;

  if p_driver_mode = 'prix' then
    if p_proposed_total is null or p_proposed_total <= 0 or p_proposed_total % 100 <> 0 then
      raise exception 'navy_create_parcel: proposed total must be a multiple of 100' using errcode = '22023';
    end if;
    if p_proposed_total < (q->>'min_total')::integer then
      raise exception 'navy_create_parcel: proposed total below the minimum (%)', q->>'min_total' using errcode = '22023';
    end if;
    if p_proposed_total > 1000000 then
      raise exception 'navy_create_parcel: proposed total too high' using errcode = '22023';
    end if;
    -- What the driver earns = total - both grocers - CyberKELY share.
    v_ceiling := p_proposed_total - (q->>'depot_fee')::integer - (q->>'pickup_fee')::integer - (q->>'share')::integer;
    v_bd := public.navy_price_breakdown((q->>'depot_fee')::integer, v_ceiling, (q->>'pickup_fee')::integer, (q->>'share')::integer);
  else
    v_ceiling := (q->>'transport_ceiling')::integer;
    v_bd := q->'breakdown';
  end if;
  v_total := (v_bd->>'total')::integer;

  -- Credit first (serialised per account: two orders never use the same credit twice).
  perform pg_advisory_xact_lock(hashtext('navy_credit:' || v_uid::text));
  v_balance := public.navy_credit_balance_of(v_uid);
  v_used := least(greatest(v_balance, 0), v_total);
  v_due := v_total - v_used;
  if p_payment_method = 'orange_money' and v_due > 0 and coalesce(btrim(q->>'orange_money_number'), '') = '' then
    raise exception 'navy_create_parcel: Orange Money number not set yet' using errcode = '22023';
  end if;

  select * into d from public.navy_partners where id = p_depot;
  select * into a from public.navy_partners where id = p_arrival;
  select * into v_user from public.users where id = v_uid;

  -- Recipient with a NAVY account: linked ONLY through a phone vetted by an operator
  -- (approved partner profile). See phase 2A.
  select np.user_id into v_recipient from public.navy_partners np
   where np.status = 'approved' and public.navy_phone_key(np.phone) = v_key
   order by np.decided_at nulls last, np.created_at limit 1;

  v_wcode := lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint % 1000000))::text, 6, '0');

  loop
    v_try := v_try + 1;
    v_code := lpad(((('x' || encode(extensions.gen_random_bytes(2), 'hex'))::bit(16)::integer % 10000))::text, 4, '0');
    begin
      insert into public.navy_parcels (
        id, code, sender_id, sender_name, sender_phone, recipient_name, recipient_phone, recipient_user_id,
        depot_partner_id, depot_name, depot_phone, depot_lat, depot_lng, depot_zone_id,
        arrival_partner_id, arrival_name, arrival_phone, arrival_lat, arrival_lng, arrival_zone_id,
        distance_km, distance_source, category, declared_value, payment_method, payment_status, paid_at,
        driver_mode, chosen_driver_id, chosen_fare, proposed_total)
      values (
        p_id, v_code, v_uid, coalesce(v_user.username, split_part(v_user.email, '@', 1)), v_user.phone,
        btrim(p_recipient_name), btrim(p_recipient_phone), v_recipient,
        d.id, coalesce(d.shop_name, d.display_name), d.phone, d.shop_lat, d.shop_lng, d.zone_id,
        a.id, coalesce(a.shop_name, a.display_name), a.phone, a.shop_lat, a.shop_lng, a.zone_id,
        (q->>'distance_km')::numeric, q->>'distance_source', p_category, p_declared_value, p_payment_method,
        case when v_due = 0 then 'paye' when p_payment_method = 'especes' then 'a_payer_depot' else 'attente_reference' end,
        case when v_due = 0 then now() end,
        p_driver_mode, case when p_driver_mode = 'choix' then p_chosen_driver end, v_chosen_fare,
        case when p_driver_mode = 'prix' then p_proposed_total end);
      exit;
    exception when unique_violation then
      if v_try >= 40 then raise; end if;
    end;
  end loop;

  insert into public.navy_parcel_prices (parcel_id, depot_fee, pickup_fee, transport_ceiling, share_fixed, rounding,
                                         navy_total, total_price, initial_total, credit_used, amount_due)
  values (p_id, (q->>'depot_fee')::integer, (q->>'pickup_fee')::integer, v_ceiling,
          (q->>'share')::integer, (v_bd->>'rounding')::integer,
          (v_bd->>'navy_total')::integer, v_total, v_total, v_used, v_due);

  for v_line in select * from jsonb_array_elements(v_bd->'lines') loop
    v_seq := v_seq + 1;
    insert into public.navy_parcel_price_lines (parcel_id, seq, kind, partner_id, label, base_amount, navy_share, shown_amount)
    values (p_id, v_seq, v_line->>'kind',
            case v_line->>'kind' when 'depot' then d.id when 'pickup' then a.id end,
            case v_line->>'kind' when 'depot' then coalesce(d.shop_name, d.display_name)
                                 when 'pickup' then coalesce(a.shop_name, a.display_name)
                                 else 'Transport' end,
            (v_line->>'base')::integer, (v_line->>'navy_share')::integer, (v_line->>'shown')::integer);
  end loop;

  if v_used > 0 then
    insert into public.navy_credit_movements (user_id, amount, kind, parcel_id, note)
    values (v_uid, -v_used, 'utilisation', p_id, 'Commande');
  end if;

  insert into public.navy_parcel_secrets (parcel_id, withdraw_code) values (p_id, v_wcode);
  perform public.navy_log(p_id, 'client', 'commande',
                          case when v_due = 0 then 'Payé par l''avoir NAVY'
                               when p_payment_method = 'especes' then 'Espèces au dépôt' else 'Orange Money' end
                          || case when p_driver_mode = 'prix' then ' · prix proposé par le client' else '' end);
  perform public.navy_notify(p_id, array[public.navy_partner_user(d.id)], 'Colis ' || v_code || ' : à recevoir au dépôt',
                             '/navy/epicier/colis');
  -- Price too low for every driver right now: counter-proposal at once (no driver called).
  perform public.navy_analyse_search(p_id, true);
  return jsonb_build_object('id', p_id, 'code', v_code, 'withdraw_code', v_wcode, 'replay', false,
                            'credit_used', v_used, 'amount_due', v_due, 'total', v_total);
end;
$$;

-- -------------------------------------------------------------------------------------
-- 8. Driver search: dispatch, counter-proposal, clock
-- -------------------------------------------------------------------------------------

-- Cause of a search without taker. (a) nobody available on the direction: nothing here
-- (2A behaviour: relaunch every 5 min, operator alert at 30 min). (b) drivers exist but
-- their fare is above the transport price paid → counter-proposal (up to 3 drivers,
-- nearest to the departure). ONE counter-proposal per parcel.
-- p_pre: before the search (order not dropped yet): only when NO driver would take the
-- parcel at the price paid.
create or replace function public.navy_analyse_search(p_parcel_id uuid, p_pre boolean)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  p public.navy_parcels;
  pr public.navy_parcel_prices;
  v_n integer;
begin
  select * into p from public.navy_parcels where id = p_parcel_id for update;
  if not found or p.counter_state is not null or p.status not in ('commande', 'depose') then
    return false;
  end if;
  if p.status = 'depose' and p.search_state not in ('recherche') then
    return false;
  end if;
  select * into pr from public.navy_parcel_prices where parcel_id = p.id;
  if p_pre and exists (
       select 1 from public.navy_eligible_drivers(p.arrival_zone_id, p.arrival_lat, p.arrival_lng, p.depot_lat, p.depot_lng, p.distance_km) e
        where (p.driver_mode = 'prix' and not (e.hide_low and e.fare > pr.transport_ceiling))
           or (p.driver_mode <> 'prix' and e.fare <= pr.transport_ceiling)) then
    return false;
  end if;

  delete from public.navy_parcel_counter_offers where parcel_id = p.id;
  insert into public.navy_parcel_counter_offers (parcel_id, rank, driver_partner_id, driver_name, vehicle_type, fare,
                                                 new_total, supplement, near_m)
  select p.id, row_number() over (order by x.near_m nulls last, x.fare, x.partner_id), x.partner_id, x.name, x.vehicle_type, x.fare,
         -- SECURITY: the exact distance to the driver's GPS reading is NOT stored (the
         -- sender reads this table; three distances would locate the driver). Rank only.
         x.total, greatest(x.total - pr.total_price, 0), null::double precision
    from (select e.*, (public.navy_price_breakdown(pr.depot_fee, e.fare, pr.pickup_fee, pr.share_fixed)->>'total')::integer as total
            from public.navy_eligible_drivers(p.arrival_zone_id, p.arrival_lat, p.arrival_lng, p.depot_lat, p.depot_lng, p.distance_km) e
           where e.fare > pr.transport_ceiling
           order by e.near_m nulls last, e.fare, e.partner_id
           limit 3) x;
  get diagnostics v_n = row_count;
  if v_n = 0 then
    return false;
  end if;
  update public.navy_parcels
     set counter_state = 'propose', counter_at = now(), counter_round = search_round,
         search_state = 'contre_proposition', updated_at = now()
   where id = p.id;
  perform public.navy_log(p.id, 'systeme', 'contre_proposition', v_n || ' chauffeur(s) proposé(s)');
  perform public.navy_notify(p.id, array[p.sender_id], 'Colis ' || p.code || ' : un chauffeur est disponible à un autre prix',
                             '/navy/colis/' || p.id);
  return true;
end;
$$;

create or replace function public.navy_dispatch(p_parcel_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  p public.navy_parcels;
  v_ceiling integer;
  v_pid uuid;
  v_uid uuid;
  v_fare integer;
  v_name text;
  v_more_expensive boolean;
  e record;
  v_sent integer := 0;
  v_uids uuid[] := array[]::uuid[];
begin
  select * into p from public.navy_parcels where id = p_parcel_id for update;
  if not found or p.status <> 'depose' or p.payment_status <> 'paye'
     or coalesce(p.supplement_status, 'paye') <> 'paye'
     or p.search_state in ('attente_client', 'contre_proposition', 'attente_supplement') then
    return;
  end if;
  if p.search_started_at is null then
    update public.navy_parcels
       set search_state = 'recherche', search_round = 1, search_started_at = now(),
           next_relaunch_at = now() + interval '5 minutes', updated_at = now()
     where id = p.id returning * into p;
    perform public.navy_log(p.id, 'systeme', 'recherche_chauffeur');
  end if;
  select transport_ceiling into v_ceiling from public.navy_parcel_prices where parcel_id = p.id;

  -- "Je propose mon prix": the offer goes to EVERY eligible driver at once, open for the
  -- whole round; the first who accepts wins. A driver with "hide low offers" does not
  -- receive an offer below his own fare.
  if p.driver_mode = 'prix' then
    for e in select x.* from public.navy_eligible_drivers(p.arrival_zone_id, p.arrival_lat, p.arrival_lng,
                                                          p.depot_lat, p.depot_lng, p.distance_km) x
              where not (x.hide_low and x.fare > v_ceiling)
                and not exists (select 1 from public.navy_parcel_offers o
                                 where o.parcel_id = p.id and o.round = p.search_round and o.driver_partner_id = x.partner_id)
              order by x.near_m nulls last, x.partner_id loop
      insert into public.navy_parcel_offers (parcel_id, driver_partner_id, driver_user_id, round, fare, parcel_code,
                                             depot_name, depot_lat, depot_lng, arrival_name, arrival_lat, arrival_lng,
                                             distance_km, category, expires_at, broadcast)
      values (p.id, e.partner_id, e.user_id, p.search_round, v_ceiling, p.code,
              p.depot_name, p.depot_lat, p.depot_lng, p.arrival_name, p.arrival_lat, p.arrival_lng,
              p.distance_km, p.category, greatest(coalesce(p.next_relaunch_at, now() + interval '5 minutes'), now() + interval '30 seconds'), true);
      v_sent := v_sent + 1;
      v_uids := v_uids || e.user_id;
    end loop;
    if v_sent > 0 then
      perform public.navy_log(p.id, 'systeme', 'offre_diffusee', v_sent || ' chauffeur(s)');
      perform public.navy_notify(p.id, v_uids, 'Nouvelle course NAVY : le premier qui accepte l''emporte', '/navy/offres');
    elsif not exists (select 1 from public.navy_parcel_offers
                       where parcel_id = p.id and status = 'envoyee' and expires_at > now()) then
      perform public.navy_analyse_search(p.id, false);   -- complete round without taker
    end if;
    return;
  end if;

  if exists (select 1 from public.navy_parcel_offers
              where parcel_id = p.id and status = 'envoyee' and expires_at > now()) then
    return;   -- an offer is live
  end if;

  -- "Je choisis mon chauffeur": the chosen driver first (once per round).
  if p.driver_mode = 'choix' and p.chosen_driver_id is not null
     and not exists (select 1 from public.navy_parcel_offers o
                      where o.parcel_id = p.id and o.round = p.search_round and o.driver_partner_id = p.chosen_driver_id) then
    select x.partner_id, x.user_id, x.fare, x.name into v_pid, v_uid, v_fare, v_name
      from public.navy_eligible_drivers(p.arrival_zone_id, p.arrival_lat, p.arrival_lng, p.depot_lat, p.depot_lng, p.distance_km) x
     where x.partner_id = p.chosen_driver_id and x.fare <= v_ceiling;
  end if;

  if v_pid is null then
    select x.partner_id, x.user_id, x.fare, x.name into v_pid, v_uid, v_fare, v_name
      from public.navy_eligible_drivers(p.arrival_zone_id, p.arrival_lat, p.arrival_lng, p.depot_lat, p.depot_lng, p.distance_km) x
     where x.fare <= v_ceiling
       and not exists (select 1 from public.navy_parcel_offers o
                        where o.parcel_id = p.id and o.round = p.search_round and o.driver_partner_id = x.partner_id)
       and (p.driver_mode = 'auto' or p.chosen_fare is null or x.fare <= p.chosen_fare)
     order by x.fare, x.since, x.partner_id
     limit 1;
  end if;

  if v_pid is null then
    if p.driver_mode = 'choix' then
      -- Only more expensive drivers (within the price paid) left: the client decides.
      select exists (select 1 from public.navy_eligible_drivers(p.arrival_zone_id, p.arrival_lat, p.arrival_lng,
                                                                p.depot_lat, p.depot_lng, p.distance_km) x
                      where x.fare <= v_ceiling
                        and not exists (select 1 from public.navy_parcel_offers o
                                         where o.parcel_id = p.id and o.round = p.search_round and o.driver_partner_id = x.partner_id))
        into v_more_expensive;
      if v_more_expensive then
        update public.navy_parcels set search_state = 'attente_client', updated_at = now() where id = p.id;
        perform public.navy_log(p.id, 'systeme', 'avis_client_demande', 'Chauffeurs suivants plus chers');
        perform public.navy_notify(p.id, array[p.sender_id], 'Colis ' || p.code || ' : choisissez un autre chauffeur',
                                   '/navy/colis/' || p.id);
        return;
      end if;
    end if;
    -- Complete round without taker: cause (a) nothing more, (b) counter-proposal.
    perform public.navy_analyse_search(p.id, false);
    return;   -- otherwise relaunch every 5 minutes (navy_tick)
  end if;

  insert into public.navy_parcel_offers (parcel_id, driver_partner_id, driver_user_id, round, fare, parcel_code,
                                         depot_name, depot_lat, depot_lng, arrival_name, arrival_lat, arrival_lng,
                                         distance_km, category, expires_at)
  values (p.id, v_pid, v_uid, p.search_round, v_fare, p.code,
          p.depot_name, p.depot_lat, p.depot_lng, p.arrival_name, p.arrival_lat, p.arrival_lng,
          p.distance_km, p.category, now() + interval '30 seconds');
  perform public.navy_log(p.id, 'systeme', 'offre_envoyee', coalesce(v_name, 'chauffeur'));
  perform public.navy_notify(p.id, array[v_uid], 'Nouvelle course NAVY : 30 secondes pour accepter', '/navy/offres');
end;
$$;

create or replace function public.navy_tick()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_expired integer := 0;
  v_relaunched integer := 0;
  v_alerts integer := 0;
  v_reminders integer := 0;
  v_counters integer := 0;
  v_routes integer := 0;
  v_n integer;
begin
  -- 1. offers not answered in time (30 s, or end of the round for broadcast offers)
  for r in select distinct o.parcel_id from public.navy_parcel_offers o
            where o.status = 'envoyee' and o.expires_at <= now() loop
    perform 1 from public.navy_parcels where id = r.parcel_id for update;
    update public.navy_parcel_offers set status = 'expiree', answered_at = now()
     where parcel_id = r.parcel_id and status = 'envoyee' and expires_at <= now();
    get diagnostics v_n = row_count;
    v_expired := v_expired + v_n;
    perform public.navy_log(r.parcel_id, 'systeme', 'offre_expiree');
    perform public.navy_dispatch(r.parcel_id);
  end loop;

  -- 2. every 5 minutes: cause of the search without taker (counter-proposal at the
  --    latest 5 min after the offer started), else a new round with every eligible driver
  for r in select id from public.navy_parcels
            where status = 'depose' and payment_status = 'paye' and search_state = 'recherche'
              and next_relaunch_at <= now() loop
    if public.navy_analyse_search(r.id, false) then
      v_counters := v_counters + 1;
      continue;
    end if;
    continue when exists (select 1 from public.navy_parcel_offers o
                           where o.parcel_id = r.id and o.status = 'envoyee' and o.expires_at > now());
    update public.navy_parcels
       set search_round = search_round + 1, next_relaunch_at = now() + interval '5 minutes', updated_at = now()
     where id = r.id;
    perform public.navy_log(r.id, 'systeme', 'relance_chauffeurs');
    perform public.navy_dispatch(r.id);
    v_relaunched := v_relaunched + 1;
  end loop;

  -- 2b. paid and deposited parcels whose search never started (safety net), and
  --     "Je propose mon prix": drivers who became available during the round
  for r in select id from public.navy_parcels
            where status = 'depose' and payment_status = 'paye' and coalesce(supplement_status, 'paye') = 'paye'
              and (search_started_at is null or (driver_mode = 'prix' and search_state = 'recherche')) loop
    perform public.navy_dispatch(r.id);
  end loop;

  -- 2c. before the drop: price too low for every driver → counter-proposal (every 5 min)
  for r in select id from public.navy_parcels
            where status = 'commande' and counter_state is null
              and (precheck_at is null or precheck_at <= now() - interval '5 minutes') loop
    update public.navy_parcels set precheck_at = now() where id = r.id;
    if public.navy_analyse_search(r.id, true) then
      v_counters := v_counters + 1;
    end if;
  end loop;

  -- 3. no driver after 30 minutes → operators
  for r in select id, code from public.navy_parcels
            where status = 'depose' and search_started_at <= now() - interval '30 minutes' and no_driver_alert_at is null loop
    update public.navy_parcels set no_driver_alert_at = now(), updated_at = now() where id = r.id;
    perform public.navy_log(r.id, 'systeme', 'alerte_sans_chauffeur_30min');
    perform public.navy_notify(r.id, public.navy_operator_ids(), 'Colis ' || r.code || ' : aucun chauffeur depuis 30 min',
                               '/navy/operatrice/colis');
    v_alerts := v_alerts + 1;
  end loop;

  -- 4. not collected: 24 h reminder (sender + recipient)
  for r in select id, code, sender_id, recipient_user_id from public.navy_parcels
            where status = 'arrive' and arrived_at <= now() - interval '24 hours' and reminder_24h_at is null loop
    update public.navy_parcels set reminder_24h_at = now(), updated_at = now() where id = r.id;
    perform public.navy_log(r.id, 'systeme', 'rappel_24h');
    perform public.navy_notify(r.id, array[r.sender_id, r.recipient_user_id], 'Colis ' || r.code || ' : à retirer à l''épicerie',
                               '/navy/colis/' || r.id);
    v_reminders := v_reminders + 1;
  end loop;

  -- 5. not collected after 3 days → operators
  for r in select id, code from public.navy_parcels
            where status = 'arrive' and arrived_at <= now() - interval '3 days' and alert_3d_at is null loop
    update public.navy_parcels set alert_3d_at = now(), updated_at = now() where id = r.id;
    perform public.navy_log(r.id, 'systeme', 'alerte_non_retire_3j');
    perform public.navy_notify(r.id, public.navy_operator_ids(), 'Colis ' || r.code || ' : non retiré depuis 3 jours',
                               '/navy/operatrice/colis');
    v_alerts := v_alerts + 1;
  end loop;

  -- 6. over 7 days → operators may mark "retour à organiser"
  for r in select id, code from public.navy_parcels
            where status = 'arrive' and arrived_at <= now() - interval '7 days' and overdue_7d_at is null loop
    update public.navy_parcels set overdue_7d_at = now(), updated_at = now() where id = r.id;
    perform public.navy_log(r.id, 'systeme', 'alerte_non_retire_7j');
    perform public.navy_notify(r.id, public.navy_operator_ids(), 'Colis ' || r.code || ' : retour à organiser',
                               '/navy/operatrice/colis');
    v_alerts := v_alerts + 1;
  end loop;

  -- 7. driver position and route erased when the direction expires (or is stopped)
  delete from public.navy_driver_routes dr
   where dr.expires_at <= now()
      or not exists (select 1 from public.navy_driver_status d
                      where d.partner_id = dr.partner_id and d.available and d.available_until > now());
  get diagnostics v_routes = row_count;
  -- routes still waiting (service slow or failed): retried, 3 attempts at most
  for r in select partner_id from public.navy_driver_routes
            where route_status = 'pending' and attempts < 3
              and (requested_at is null or requested_at <= now() - interval '1 minute') loop
    update public.navy_driver_routes set requested_at = now() where partner_id = r.partner_id;
    perform public.navy_request_route(r.partner_id);
  end loop;

  -- 8. distances still to compute (service down, quota): retried every 30 minutes
  if exists (select 1 from public.navy_distance_queue)
     or exists (select 1 from public.navy_distance_state where id and full_pending) then
    if exists (select 1 from public.navy_distance_state where id
                and (requested_at is null or requested_at <= now() - interval '30 minutes')) then
      perform public.navy_request_distances();
    end if;
  end if;

  return jsonb_build_object('expired', v_expired, 'relaunched', v_relaunched, 'alerts', v_alerts,
                            'reminders', v_reminders, 'counters', v_counters, 'routes_erased', v_routes);
end;
$$;

-- -------------------------------------------------------------------------------------
-- 9. Client / partner functions changed by 2B1
-- -------------------------------------------------------------------------------------

-- Sender: choose one of the counter-proposed drivers. Prices refrozen; the supplement
-- is paid like the first payment: credit first, then cash at the grocer if the parcel is
-- not dropped yet, else Orange Money (reference validated by an operator). No offer
-- before the supplement is acquired.
create or replace function public.navy_choose_counter(p_parcel_id uuid, p_driver uuid)
returns public.navy_parcels
language plpgsql security definer set search_path = public as $$
declare
  p public.navy_parcels;
  pr public.navy_parcel_prices;
  v_fare integer;
  v_name text;
  v_bd jsonb;
  v_new integer;
  v_supp integer;
  v_used integer;
  v_due integer;
  v_status text;
  v_method text;
  v_line jsonb;
  v_seq integer := 0;
begin
  select * into p from public.navy_parcels where id = p_parcel_id for update;
  if not found or auth.uid() is null or p.sender_id <> auth.uid() then
    raise exception 'navy_choose_counter: own parcel only' using errcode = '42501';
  end if;
  if p.counter_state = 'choisi' and p.chosen_driver_id = p_driver then
    return p;   -- replay
  end if;
  if p.counter_state is distinct from 'propose' or p.status not in ('commande', 'depose') then
    raise exception 'navy_choose_counter: no counter-proposal pending' using errcode = '22023';
  end if;
  if not exists (select 1 from public.navy_parcel_counter_offers where parcel_id = p.id and driver_partner_id = p_driver) then
    raise exception 'navy_choose_counter: driver not available' using errcode = '22023';
  end if;
  select x.fare, x.name into v_fare, v_name
    from public.navy_eligible_drivers(p.arrival_zone_id, p.arrival_lat, p.arrival_lng, p.depot_lat, p.depot_lng, p.distance_km) x
   where x.partner_id = p_driver;
  if v_fare is null then
    raise exception 'navy_choose_counter: driver not available' using errcode = '22023';
  end if;
  select * into pr from public.navy_parcel_prices where parcel_id = p.id for update;
  v_bd := public.navy_price_breakdown(pr.depot_fee, v_fare, pr.pickup_fee, pr.share_fixed);
  v_new := greatest((v_bd->>'total')::integer, pr.total_price);
  v_supp := v_new - pr.total_price;

  perform pg_advisory_xact_lock(hashtext('navy_credit:' || p.sender_id::text));
  v_used := least(greatest(public.navy_credit_balance_of(p.sender_id), 0), v_supp);
  v_due := v_supp - v_used;
  if v_due = 0 then
    v_status := 'paye'; v_method := 'avoir';
  elsif p.status = 'commande' then
    v_status := 'a_payer_depot'; v_method := 'especes';
  else
    if coalesce(btrim((select orange_money_number from public.navy_settings where id)), '') = '' then
      raise exception 'navy_choose_counter: Orange Money number not set yet' using errcode = '22023';
    end if;
    v_status := 'attente_reference'; v_method := 'orange_money';
  end if;

  if v_used > 0 then
    insert into public.navy_credit_movements (user_id, amount, kind, parcel_id, note)
    values (p.sender_id, -v_used, 'utilisation', p.id, 'Supplément');
  end if;
  update public.navy_parcel_prices
     set transport_ceiling = v_fare, rounding = (v_bd->>'rounding')::integer, navy_total = (v_bd->>'navy_total')::integer,
         total_price = v_new, supplement = v_supp, supplement_credit_used = v_used, supplement_due = v_due,
         supplement_method = v_method
   where parcel_id = p.id;
  delete from public.navy_parcel_price_lines where parcel_id = p.id;
  for v_line in select * from jsonb_array_elements(v_bd->'lines') loop
    v_seq := v_seq + 1;
    insert into public.navy_parcel_price_lines (parcel_id, seq, kind, partner_id, label, base_amount, navy_share, shown_amount)
    values (p.id, v_seq, v_line->>'kind',
            case v_line->>'kind' when 'depot' then p.depot_partner_id when 'pickup' then p.arrival_partner_id end,
            case v_line->>'kind' when 'depot' then p.depot_name when 'pickup' then p.arrival_name else 'Transport' end,
            (v_line->>'base')::integer, (v_line->>'navy_share')::integer, (v_line->>'shown')::integer);
  end loop;
  -- offers still live at the old price are withdrawn
  update public.navy_parcel_offers set status = 'annulee', answered_at = now() where parcel_id = p.id and status = 'envoyee';
  update public.navy_parcels
     set counter_state = 'choisi', driver_mode = 'choix', chosen_driver_id = p_driver, chosen_fare = v_fare,
         supplement_status = v_status,
         search_state = case when status = 'depose' then (case when v_status = 'paye' then 'recherche' else 'attente_supplement' end) end,
         search_round = case when status = 'depose' then search_round + 1 else search_round end,
         next_relaunch_at = case when status = 'depose' then now() + interval '5 minutes' else next_relaunch_at end,
         updated_at = now()
   where id = p.id;
  perform public.navy_log(p.id, 'client', 'contre_proposition_choisie', v_name);
  perform public.navy_log(p.id, 'systeme', 'supplement_' || case v_status when 'paye' then 'paye_avoir'
                                                                     when 'a_payer_depot' then 'especes_depot'
                                                                     else 'orange_money' end);
  perform public.navy_dispatch(p.id);
  select * into p from public.navy_parcels where id = p.id;
  return p;
end;
$$;

-- Sender: refuse the counter-proposal → the search goes on as in case (a).
create or replace function public.navy_refuse_counter(p_parcel_id uuid)
returns public.navy_parcels
language plpgsql security definer set search_path = public as $$
declare
  p public.navy_parcels;
begin
  select * into p from public.navy_parcels where id = p_parcel_id for update;
  if not found or auth.uid() is null or p.sender_id <> auth.uid() then
    raise exception 'navy_refuse_counter: own parcel only' using errcode = '42501';
  end if;
  if p.counter_state = 'refuse' then
    return p;
  end if;
  if p.counter_state is distinct from 'propose' then
    raise exception 'navy_refuse_counter: no counter-proposal pending' using errcode = '22023';
  end if;
  update public.navy_parcels
     set counter_state = 'refuse',
         search_state = case when status = 'depose' then 'recherche' end,
         next_relaunch_at = case when status = 'depose' then now() + interval '5 minutes' else next_relaunch_at end,
         updated_at = now()
   where id = p.id;
  perform public.navy_log(p.id, 'client', 'contre_proposition_refusee');
  perform public.navy_dispatch(p.id);
  select * into p from public.navy_parcels where id = p.id;
  return p;
end;
$$;

-- Counter-proposal shown to the sender (and operators).
create or replace function public.navy_parcel_counter(p_parcel_id uuid)
returns table (rank smallint, driver_partner_id uuid, driver_name text, vehicle_type text, new_total integer,
               supplement integer, near_km numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.navy_is_parcel_sender(p_parcel_id) or public.navy_is_operator()) then
    raise exception 'navy_parcel_counter: own parcel only' using errcode = '42501';
  end if;
  return query
    select c.rank, c.driver_partner_id, c.driver_name, c.vehicle_type, c.new_total, c.supplement,
           round((c.near_m / 1000.0)::numeric, 1)
      from public.navy_parcel_counter_offers c where c.parcel_id = p_parcel_id order by c.rank;
end;
$$;

-- Sender: Orange Money reference (first payment OR supplement). Idempotent.
create or replace function public.navy_submit_payment_reference(p_id uuid, p_parcel_id uuid, p_reference text)
returns public.navy_parcels
language plpgsql security definer set search_path = public as $$
declare
  p public.navy_parcels;
  pr public.navy_parcel_prices;
  v_ref text := upper(btrim(coalesce(p_reference, '')));
  v_kind text;
begin
  select * into p from public.navy_parcels where id = p_parcel_id and sender_id = auth.uid() for update;
  if auth.uid() is null or not found then
    raise exception 'navy_submit_payment_reference: own parcel only' using errcode = '42501';
  end if;
  if exists (select 1 from public.navy_parcel_payments where id = p_id) then
    return p;   -- replay
  end if;
  if p.status = 'annule' then
    raise exception 'navy_submit_payment_reference: not expected now' using errcode = '22023';
  end if;
  if p.payment_method = 'orange_money' and p.payment_status in ('attente_reference', 'refuse') then
    v_kind := 'principal';
  elsif p.supplement_status in ('attente_reference', 'refuse') then
    v_kind := 'supplement';
  else
    raise exception 'navy_submit_payment_reference: not expected now' using errcode = '22023';
  end if;
  if length(v_ref) not between 4 and 40 then
    raise exception 'navy_submit_payment_reference: invalid reference' using errcode = '22023';
  end if;
  select * into pr from public.navy_parcel_prices where parcel_id = p.id;
  insert into public.navy_parcel_payments (id, parcel_id, reference, amount, submitted_by, kind)
  values (p_id, p.id, v_ref,
          case v_kind when 'principal' then coalesce(pr.amount_due, pr.total_price) else pr.supplement_due end,
          auth.uid(), v_kind);
  if v_kind = 'principal' then
    update public.navy_parcels set payment_status = 'a_verifier', payment_refusal_reason = null, updated_at = now()
     where id = p.id returning * into p;
    perform public.navy_log(p.id, 'client', 'reference_orange_money');
  else
    update public.navy_parcels set supplement_status = 'a_verifier', payment_refusal_reason = null, updated_at = now()
     where id = p.id returning * into p;
    perform public.navy_log(p.id, 'client', 'reference_orange_money_supplement');
  end if;
  perform public.navy_notify(p.id, public.navy_operator_ids(),
                             'Colis ' || p.code || case v_kind when 'principal' then ' : paiement à vérifier' else ' : supplément à vérifier' end,
                             '/navy/operatrice/paiements');
  return p;
end;
$$;

-- Operator: validate or refuse an Orange Money reference (first payment or supplement).
create or replace function public.navy_decide_payment(p_payment_id uuid, p_decision text, p_reason text default null)
returns public.navy_parcels
language plpgsql security definer set search_path = public as $$
declare
  pay public.navy_parcel_payments;
  p public.navy_parcels;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not public.navy_is_operator() then
    raise exception 'navy_decide_payment: operator only' using errcode = '42501';
  end if;
  if p_decision not in ('valider', 'refuser') then
    raise exception 'navy_decide_payment: invalid decision' using errcode = '22023';
  end if;
  select * into pay from public.navy_parcel_payments where id = p_payment_id;
  if not found then
    raise exception 'navy_decide_payment: unknown payment' using errcode = 'P0002';
  end if;
  select * into p from public.navy_parcels where id = pay.parcel_id for update;
  select * into pay from public.navy_parcel_payments where id = p_payment_id for update;
  if pay.status = (case p_decision when 'valider' then 'valide' else 'refuse' end) then
    return p;   -- replay
  end if;
  if pay.status <> 'a_verifier'
     or (pay.kind = 'principal' and p.payment_status <> 'a_verifier')
     or (pay.kind = 'supplement' and p.supplement_status is distinct from 'a_verifier') then
    raise exception 'navy_decide_payment: not waiting for a decision' using errcode = '22023';
  end if;
  if p_decision = 'refuser' and v_reason is null then
    raise exception 'navy_decide_payment: reason required' using errcode = '22023';
  end if;
  update public.navy_parcel_payments
     set status = case p_decision when 'valider' then 'valide' else 'refuse' end,
         reason = v_reason, decided_by = auth.uid(), decided_at = now()
   where id = pay.id;
  if pay.kind = 'supplement' then
    if p_decision = 'valider' then
      update public.navy_parcels
         set supplement_status = 'paye',
             search_state = case when status = 'depose' and search_state = 'attente_supplement' then 'recherche' else search_state end,
             next_relaunch_at = case when status = 'depose' then now() + interval '5 minutes' else next_relaunch_at end,
             updated_at = now()
       where id = p.id returning * into p;
      perform public.navy_log(p.id, 'operatrice', 'supplement_valide');
      perform public.navy_notify(p.id, array[p.sender_id], 'Colis ' || p.code || ' : supplément confirmé', '/navy/colis/' || p.id);
      perform public.navy_dispatch(p.id);
    else
      update public.navy_parcels set supplement_status = 'refuse', payment_refusal_reason = v_reason, updated_at = now()
       where id = p.id returning * into p;
      perform public.navy_log(p.id, 'operatrice', 'supplement_refuse', v_reason);
      perform public.navy_notify(p.id, array[p.sender_id], 'Colis ' || p.code || ' : supplément non reconnu', '/navy/colis/' || p.id);
    end if;
  elsif p_decision = 'valider' then
    update public.navy_parcels set payment_status = 'paye', paid_at = now(), updated_at = now()
     where id = p.id returning * into p;
    perform public.navy_log(p.id, 'operatrice', 'paiement_valide');
    perform public.navy_notify(p.id, array[p.sender_id], 'Colis ' || p.code || ' : paiement confirmé', '/navy/colis/' || p.id);
    perform public.navy_dispatch(p.id);
  else
    update public.navy_parcels set payment_status = 'refuse', payment_refusal_reason = v_reason, updated_at = now()
     where id = p.id returning * into p;
    perform public.navy_log(p.id, 'operatrice', 'paiement_refuse', v_reason);
    perform public.navy_notify(p.id, array[p.sender_id], 'Colis ' || p.code || ' : paiement non reconnu', '/navy/colis/' || p.id);
  end if;
  select * into p from public.navy_parcels where id = p.id;
  return p;
end;
$$;

-- Depot grocer: drop. Cash to collect = first payment left (cash) + cash supplement.
create or replace function public.navy_deposit_parcel(p_parcel_id uuid, p_sealed boolean, p_cash_collected boolean)
returns public.navy_parcels
language plpgsql security definer set search_path = public as $$
declare
  p public.navy_parcels;
  v_cash integer;
begin
  select * into p from public.navy_parcels where id = p_parcel_id for update;
  if not found or not public.navy_owns_partner(p.depot_partner_id) then
    raise exception 'navy_deposit_parcel: depot grocer only' using errcode = '42501';
  end if;
  if p.deposited_at is not null and p.status <> 'annule' then
    return p;   -- replay
  end if;
  if p.status <> 'commande' then
    raise exception 'navy_deposit_parcel: not allowed from %', p.status using errcode = '22023';
  end if;
  if not coalesce(p_sealed, false) then
    raise exception 'navy_deposit_parcel: parcel must be closed in front of the grocer' using errcode = '22023';
  end if;
  select (case when p.payment_method = 'especes' and p.payment_status = 'a_payer_depot'
               then coalesce(pr.amount_due, pr.total_price) else 0 end)
       + (case when p.supplement_status = 'a_payer_depot' then pr.supplement_due else 0 end)
    into v_cash from public.navy_parcel_prices pr where pr.parcel_id = p.id;
  if coalesce(v_cash, 0) > 0 and not coalesce(p_cash_collected, false) then
    raise exception 'navy_deposit_parcel: cash must be collected' using errcode = '22023';
  end if;
  update public.navy_parcels
     set status = 'depose', deposited_at = now(), sealed_confirmed = true,
         cash_collected_at = case when coalesce(v_cash, 0) > 0 then now() else cash_collected_at end,
         payment_status = case when payment_method = 'especes' and payment_status = 'a_payer_depot' then 'paye' else payment_status end,
         paid_at = case when payment_method = 'especes' and payment_status = 'a_payer_depot' then now() else paid_at end,
         supplement_status = case when supplement_status = 'a_payer_depot' then 'paye' else supplement_status end,
         updated_at = now()
   where id = p.id returning * into p;
  perform public.navy_log(p.id, 'epicier', 'depose',
                          case when coalesce(v_cash, 0) > 0 then 'Refermé devant l''épicier, espèces encaissées'
                               else 'Refermé devant l''épicier' end);
  perform public.navy_notify(p.id, array[p.sender_id, p.recipient_user_id], 'Colis ' || p.code || ' : déposé à l''épicerie',
                             '/navy/colis/' || p.id);
  perform public.navy_dispatch(p.id);
  select * into p from public.navy_parcels where id = p.id;
  return p;
end;
$$;

-- Driver: accept an offer. The parcel row is locked: the FIRST acceptance wins, the
-- other offers of the parcel are cancelled at once (broadcast mode included).
create or replace function public.navy_accept_offer(p_offer_id uuid)
returns public.navy_parcels
language plpgsql security definer set search_path = public as $$
declare
  v_parcel_id uuid;
  o public.navy_parcel_offers;
  p public.navy_parcels;
  dr public.navy_partners;
begin
  select parcel_id into v_parcel_id from public.navy_parcel_offers where id = p_offer_id;
  if auth.uid() is null or v_parcel_id is null then
    raise exception 'navy_accept_offer: unknown offer' using errcode = '42501';
  end if;
  select * into p from public.navy_parcels where id = v_parcel_id for update;
  select * into o from public.navy_parcel_offers where id = p_offer_id for update;
  if o.driver_user_id <> auth.uid() then
    raise exception 'navy_accept_offer: offer not addressed to you' using errcode = '42501';
  end if;
  if o.status = 'acceptee' then
    return p;   -- replay
  end if;
  if o.status = 'annulee' and p.driver_partner_id is not null then
    raise exception 'navy_accept_offer: offer already taken' using errcode = '22023';
  end if;
  if o.status <> 'envoyee' or o.expires_at <= now() then
    raise exception 'navy_accept_offer: offer expired' using errcode = '22023';
  end if;
  if p.status <> 'depose' then
    update public.navy_parcel_offers set status = 'annulee', answered_at = now() where id = o.id;
    raise exception 'navy_accept_offer: parcel no longer available' using errcode = '22023';
  end if;
  select * into dr from public.navy_partners where id = o.driver_partner_id and status = 'approved';
  if not found then
    raise exception 'navy_accept_offer: driver not approved' using errcode = '42501';
  end if;
  update public.navy_parcel_offers set status = 'acceptee', answered_at = now() where id = o.id;
  update public.navy_parcel_offers set status = 'annulee', answered_at = now()
   where parcel_id = p.id and id <> o.id and status = 'envoyee';
  update public.navy_parcels
     set status = 'chauffeur_trouve', search_state = 'trouve', driver_found_at = now(),
         driver_partner_id = dr.id, driver_user_id = dr.user_id, driver_name = dr.display_name, driver_phone = dr.phone,
         driver_vehicle = dr.vehicle_type, driver_plate = dr.vehicle_plate, driver_fare = o.fare,
         counter_state = case when counter_state = 'propose' then null else counter_state end,
         updated_at = now()
   where id = p.id returning * into p;
  -- Driver cheaper than the transport price paid: the difference is credited (avoir).
  update public.navy_parcel_prices
     set credit_due = greatest(transport_ceiling - o.fare, 0),
         credit_reason = case when transport_ceiling > o.fare then 'Chauffeur moins cher que le prix payé' end
   where parcel_id = p.id;
  perform public.navy_credit_sync(p.id);
  perform public.navy_log(p.id, 'chauffeur', 'chauffeur_trouve', dr.display_name);
  perform public.navy_notify(p.id, array[p.sender_id, p.recipient_user_id, public.navy_partner_user(p.depot_partner_id)],
                             'Colis ' || p.code || ' : chauffeur trouvé', '/navy/colis/' || p.id);
  return p;
end;
$$;

-- Cancel: everything acquired (cash, Orange Money, credit used) becomes credit.
create or replace function public.navy_cancel_parcel(p_parcel_id uuid, p_reason text default null)
returns public.navy_parcels
language plpgsql security definer set search_path = public as $$
declare
  p public.navy_parcels;
  v_op boolean := public.navy_is_operator();
  v_role text;
begin
  select * into p from public.navy_parcels where id = p_parcel_id for update;
  if not found or auth.uid() is null or (p.sender_id <> auth.uid() and not v_op) then
    raise exception 'navy_cancel_parcel: sender or operator only' using errcode = '42501';
  end if;
  if p.status = 'annule' then
    return p;   -- replay
  end if;
  if p.sender_id = auth.uid() and p.status = 'commande' then
    v_role := 'client';
  elsif v_op and p.status in ('commande', 'depose', 'chauffeur_trouve') then
    v_role := 'operatrice';
  else
    raise exception 'navy_cancel_parcel: too late (%)', p.status using errcode = '22023';
  end if;
  update public.navy_parcel_offers set status = 'annulee', answered_at = now() where parcel_id = p.id and status = 'envoyee';
  update public.navy_parcel_prices pr
     set credit_due = (case when p.payment_status = 'paye' then coalesce(pr.initial_total, pr.total_price) else pr.credit_used end)
                    + (case when p.supplement_status = 'paye' then pr.supplement else pr.supplement_credit_used end),
         credit_reason = 'Colis annulé'
   where pr.parcel_id = p.id;
  perform public.navy_credit_sync(p.id);
  update public.navy_parcels
     set status = 'annule', cancelled_at = now(), cancelled_by = auth.uid(),
         cancel_reason = nullif(btrim(coalesce(p_reason, '')), ''), search_state = null, updated_at = now()
   where id = p.id returning * into p;
  perform public.navy_log(p.id, v_role, 'annule', p.cancel_reason);
  perform public.navy_notify(p.id, array[p.sender_id, public.navy_partner_user(p.depot_partner_id), p.driver_user_id],
                             'Colis ' || p.code || ' : annulé', '/navy/colis/' || p.id);
  return p;
end;
$$;

-- Sender ("Je choisis", next drivers more expensive): choose another driver, or
-- "Automatique" (p_driver = null). Same as 2A with the new eligibility.
create or replace function public.navy_choose_driver(p_parcel_id uuid, p_driver uuid)
returns public.navy_parcels
language plpgsql security definer set search_path = public as $$
declare
  p public.navy_parcels;
  v_fare integer;
  v_ceiling integer;
begin
  select * into p from public.navy_parcels where id = p_parcel_id for update;
  if not found or auth.uid() is null or p.sender_id <> auth.uid() then
    raise exception 'navy_choose_driver: own parcel only' using errcode = '42501';
  end if;
  if p.status not in ('commande', 'depose') then
    raise exception 'navy_choose_driver: not allowed from %', p.status using errcode = '22023';
  end if;
  if p.driver_mode = 'prix' or p.search_state in ('contre_proposition', 'attente_supplement') then
    raise exception 'navy_choose_driver: not allowed from %', coalesce(p.search_state, p.driver_mode) using errcode = '22023';
  end if;
  select transport_ceiling into v_ceiling from public.navy_parcel_prices where parcel_id = p.id;
  if p_driver is null then
    update public.navy_parcels set driver_mode = 'auto', chosen_driver_id = null, chosen_fare = null,
           search_state = case when search_state = 'attente_client' then 'recherche' else search_state end, updated_at = now()
     where id = p.id;
    perform public.navy_log(p.id, 'client', 'mode_automatique');
  else
    select x.fare into v_fare
      from public.navy_eligible_drivers(p.arrival_zone_id, p.arrival_lat, p.arrival_lng, p.depot_lat, p.depot_lng, p.distance_km) x
     where x.partner_id = p_driver and x.fare <= v_ceiling;
    if v_fare is null then
      raise exception 'navy_choose_driver: driver not available' using errcode = '22023';
    end if;
    update public.navy_parcels set driver_mode = 'choix', chosen_driver_id = p_driver, chosen_fare = v_fare,
           search_state = case when search_state = 'attente_client' then 'recherche' else search_state end,
           search_round = case when search_state = 'attente_client' then search_round + 1 else search_round end,
           updated_at = now()
     where id = p.id;
    perform public.navy_log(p.id, 'client', 'chauffeur_choisi');
  end if;
  perform public.navy_dispatch(p.id);
  select * into p from public.navy_parcels where id = p.id;
  return p;
end;
$$;

create or replace function public.navy_parcel_drivers(p_parcel_id uuid)
returns table (partner_id uuid, name text, vehicle_type text, fare integer, dest_zone_id uuid)
language plpgsql stable security definer set search_path = public as $$
declare
  p public.navy_parcels;
begin
  select * into p from public.navy_parcels where id = p_parcel_id;
  if not found or auth.uid() is null or (p.sender_id <> auth.uid() and not public.navy_is_operator()) then
    raise exception 'navy_parcel_drivers: own parcel only' using errcode = '42501';
  end if;
  return query
    select x.partner_id, x.name, x.vehicle_type, x.fare, x.dest_zone_id
      from public.navy_eligible_drivers(p.arrival_zone_id, p.arrival_lat, p.arrival_lng, p.depot_lat, p.depot_lng, p.distance_km) x
     where x.fare <= (select transport_ceiling from public.navy_parcel_prices where parcel_id = p.id)
     order by x.fare, x.since;
end;
$$;

-- Operator: relaunch now (new round). Never while a supplement is awaited.
create or replace function public.navy_relaunch_offers(p_parcel_id uuid)
returns public.navy_parcels
language plpgsql security definer set search_path = public as $$
declare
  p public.navy_parcels;
begin
  if not public.navy_is_operator() then
    raise exception 'navy_relaunch_offers: operator only' using errcode = '42501';
  end if;
  select * into p from public.navy_parcels where id = p_parcel_id for update;
  if not found or p.status <> 'depose' or p.payment_status <> 'paye' or coalesce(p.supplement_status, 'paye') <> 'paye' then
    raise exception 'navy_relaunch_offers: parcel is not waiting for a driver' using errcode = '22023';
  end if;
  update public.navy_parcel_offers set status = 'annulee', answered_at = now() where parcel_id = p.id and status = 'envoyee';
  update public.navy_parcels
     set search_state = 'recherche', search_round = search_round + 1, next_relaunch_at = now() + interval '5 minutes',
         search_started_at = coalesce(search_started_at, now()),
         counter_state = case when counter_state = 'propose' then 'refuse' else counter_state end,
         updated_at = now()
   where id = p.id;
  perform public.navy_log(p.id, 'operatrice', 'relance_chauffeurs');
  perform public.navy_dispatch(p.id);
  select * into p from public.navy_parcels where id = p.id;
  return p;
end;
$$;

-- Depot grocer: cash still to collect at the drop (first payment left + supplement).
drop function if exists public.navy_cash_due(uuid[]);
create or replace function public.navy_cash_due(p_parcel_ids uuid[])
returns table (parcel_id uuid, amount integer)
language sql stable security definer set search_path = public as $$
  select p.id,
         (case when p.payment_method = 'especes' and p.payment_status = 'a_payer_depot' then coalesce(pr.amount_due, pr.total_price) else 0 end
          + case when p.supplement_status = 'a_payer_depot' then pr.supplement_due else 0 end)::integer
    from public.navy_parcels p join public.navy_parcel_prices pr on pr.parcel_id = p.id
   where p.id = any(coalesce(p_parcel_ids, array[]::uuid[]))
     and public.navy_owns_partner(p.depot_partner_id);
$$;

-- Driver: live offers, time left by the SERVER clock (broadcast offers: end of round).
create or replace function public.navy_my_offers()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(o) || jsonb_build_object('seconds_left', round(extract(epoch from o.expires_at - now())::numeric, 1))
                            order by o.broadcast, o.expires_at), '[]'::jsonb)
    from public.navy_parcel_offers o
   where auth.uid() is not null and o.driver_user_id = auth.uid()
     and o.status = 'envoyee' and o.expires_at > now();
$$;

-- Driver: available / not available + destination (1B) + ONE optional GPS reading.
-- The reading and the route computed from it expire with the direction.
drop function if exists public.navy_set_driver_status(uuid, boolean, float8, float8, timestamptz);
create or replace function public.navy_set_driver_status(p_partner_id uuid, p_available boolean,
                                                         p_dest_lat float8, p_dest_lng float8,
                                                         p_client_at timestamptz,
                                                         p_origin_lat float8 default null, p_origin_lng float8 default null)
returns public.navy_driver_status
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_at timestamptz := least(coalesce(p_client_at, now()), now());
  v_row public.navy_driver_status;
  r public.navy_driver_routes;
  v_has_origin boolean := p_origin_lat is not null and p_origin_lng is not null
                          and p_origin_lat between -90 and 90 and p_origin_lng between -180 and 180;
  v_dest_same boolean;
begin
  if v_uid is null or not exists (select 1 from public.navy_partners
                                   where id = p_partner_id and user_id = v_uid
                                     and kind = 'chauffeur' and status = 'approved') then
    raise exception 'navy_set_driver_status: own approved driver only' using errcode = '42501';
  end if;
  if p_available and (p_dest_lat is null or p_dest_lng is null
                      or p_dest_lat not between -90 and 90 or p_dest_lng not between -180 and 180) then
    raise exception 'navy_set_driver_status: destination required' using errcode = '22023';
  end if;

  select * into v_row from public.navy_driver_status where partner_id = p_partner_id for update;
  if found and v_row.client_at >= v_at then
    return v_row;   -- replay or older choice
  end if;

  insert into public.navy_driver_status as d
         (partner_id, user_id, available, dest_lat, dest_lng, dest_zone_id, available_until, client_at, updated_at)
  values (p_partner_id, v_uid, p_available,
          case when p_available then p_dest_lat else coalesce(v_row.dest_lat, p_dest_lat) end,
          case when p_available then p_dest_lng else coalesce(v_row.dest_lng, p_dest_lng) end,
          null,
          case when p_available then v_at + interval '3 hours' else null end,
          v_at, now())
  on conflict (partner_id) do update
     set available = excluded.available,
         dest_lat = excluded.dest_lat,
         dest_lng = excluded.dest_lng,
         available_until = excluded.available_until,
         client_at = excluded.client_at,
         updated_at = now()
  returning * into v_row;

  update public.navy_driver_status
     set dest_zone_id = public.navy_zone_for_point(dest_lat, dest_lng)
   where partner_id = p_partner_id
   returning * into v_row;

  -- GPS reading and route (corridor)
  if not v_row.available then
    delete from public.navy_driver_routes where partner_id = p_partner_id;   -- position erased
  else
    select * into r from public.navy_driver_routes where partner_id = p_partner_id for update;
    v_dest_same := found and r.dest_lat = v_row.dest_lat and r.dest_lng = v_row.dest_lng;
    if v_has_origin then
      if v_dest_same and public.navy_geo_m(r.origin_lat, r.origin_lng, p_origin_lat, p_origin_lng) < 100 then
        update public.navy_driver_routes set expires_at = v_row.available_until where partner_id = p_partner_id;
      else
        insert into public.navy_driver_routes as t (partner_id, user_id, origin_lat, origin_lng, dest_lat, dest_lng,
                                                    route, route_status, attempts, requested_at, computed_at, expires_at)
        values (p_partner_id, v_uid, p_origin_lat, p_origin_lng, v_row.dest_lat, v_row.dest_lng,
                null, 'pending', 0, now(), null, v_row.available_until)
        on conflict (partner_id) do update
           set origin_lat = excluded.origin_lat, origin_lng = excluded.origin_lng,
               dest_lat = excluded.dest_lat, dest_lng = excluded.dest_lng,
               route = null, route_status = 'pending', attempts = 0, requested_at = now(), computed_at = null,
               expires_at = excluded.expires_at;
        perform public.navy_request_route(p_partner_id);   -- ONE request per change
      end if;
    elsif v_dest_same then
      -- "Toujours disponible ?" without a new reading: same direction, route kept
      update public.navy_driver_routes set expires_at = v_row.available_until where partner_id = p_partner_id;
    else
      -- new direction without a reading (refused): zone criterion only
      delete from public.navy_driver_routes where partner_id = p_partner_id;
    end if;
  end if;
  return v_row;
end;
$$;

-- -------------------------------------------------------------------------------------
-- 10. RLS (enabled AND forced) + SELECT policies only
-- -------------------------------------------------------------------------------------
alter table public.navy_grocer_distances      enable row level security;
alter table public.navy_grocer_distances      force row level security;
alter table public.navy_distance_state        enable row level security;
alter table public.navy_distance_state        force row level security;
alter table public.navy_distance_queue        enable row level security;
alter table public.navy_distance_queue        force row level security;
alter table public.navy_ors_requests          enable row level security;
alter table public.navy_ors_requests          force row level security;
alter table public.navy_driver_routes         enable row level security;
alter table public.navy_driver_routes         force row level security;
alter table public.navy_credit_movements      enable row level security;
alter table public.navy_credit_movements      force row level security;
alter table public.navy_parcel_counter_offers enable row level security;
alter table public.navy_parcel_counter_offers force row level security;

-- Distances between grocers: any signed-in account (kept on the phone for offline).
drop policy if exists navy_grocer_distances_select on public.navy_grocer_distances;
create policy navy_grocer_distances_select on public.navy_grocer_distances for select to public using (auth.uid() is not null);

drop policy if exists navy_distance_state_select on public.navy_distance_state;
create policy navy_distance_state_select on public.navy_distance_state for select to public using (public.navy_is_operator());

drop policy if exists navy_distance_queue_select on public.navy_distance_queue;
create policy navy_distance_queue_select on public.navy_distance_queue for select to public using (public.navy_is_operator());

drop policy if exists navy_ors_requests_select on public.navy_ors_requests;
create policy navy_ors_requests_select on public.navy_ors_requests for select to public using (public.navy_is_operator());

-- Position and route: the driver himself and operators. Never a client.
drop policy if exists navy_driver_routes_select on public.navy_driver_routes;
create policy navy_driver_routes_select on public.navy_driver_routes for select to public using (
  user_id = auth.uid() or public.navy_is_operator());

-- Credit: its owner and operators. Never a partner.
drop policy if exists navy_credit_movements_select on public.navy_credit_movements;
create policy navy_credit_movements_select on public.navy_credit_movements for select to public using (
  user_id = auth.uid() or public.navy_is_operator());

drop policy if exists navy_parcel_counter_offers_select on public.navy_parcel_counter_offers;
create policy navy_parcel_counter_offers_select on public.navy_parcel_counter_offers for select to public using (
  public.navy_is_parcel_sender(parcel_id) or public.navy_is_operator());

revoke all on public.navy_grocer_distances, public.navy_distance_state, public.navy_distance_queue, public.navy_ors_requests,
              public.navy_driver_routes, public.navy_credit_movements, public.navy_parcel_counter_offers
  from public, anon, authenticated;
grant select on public.navy_grocer_distances, public.navy_distance_state, public.navy_distance_queue, public.navy_ors_requests,
                public.navy_driver_routes, public.navy_credit_movements, public.navy_parcel_counter_offers
  to authenticated;
revoke usage, select on sequence public.navy_ors_requests_id_seq from public, anon, authenticated;

-- -------------------------------------------------------------------------------------
-- 11. Function privileges (P7: EXECUTE is granted to anon explicitly by default)
-- -------------------------------------------------------------------------------------
revoke execute on function public.navy_geo_m(float8, float8, float8, float8) from public, anon;
revoke execute on function public.navy_point_route_m(float8, float8, jsonb) from public, anon;
revoke execute on function public.navy_min_total(integer, integer, integer) from public, anon;
revoke execute on function public.navy_pair_km(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.navy_call_routes(jsonb) from public, anon, authenticated;
revoke execute on function public.navy_request_distances() from public, anon, authenticated;
revoke execute on function public.navy_request_route(uuid) from public, anon, authenticated;
revoke execute on function public.navy_partners_distances() from public, anon, authenticated;
revoke execute on function public.navy_routes_config() from public, anon, authenticated;
revoke execute on function public.navy_ors_log(text, boolean, integer, text) from public, anon, authenticated;
revoke execute on function public.navy_distance_work() from public, anon, authenticated;
revoke execute on function public.navy_store_distances(timestamptz, boolean, jsonb, jsonb, jsonb, uuid[]) from public, anon, authenticated;
revoke execute on function public.navy_distance_failed(text) from public, anon, authenticated;
revoke execute on function public.navy_route_work(uuid) from public, anon, authenticated;
revoke execute on function public.navy_store_route(uuid, float8, float8, float8, float8, jsonb, boolean) from public, anon, authenticated;
revoke execute on function public.navy_distance_status() from public, anon;
revoke execute on function public.navy_request_distance_refresh() from public, anon;
revoke execute on function public.navy_credit_balance_of(uuid) from public, anon, authenticated;
revoke execute on function public.navy_credit_sync(uuid) from public, anon, authenticated;
revoke execute on function public.navy_my_credit() from public, anon;
revoke execute on function public.navy_eligible_drivers(uuid, float8, float8, float8, float8, numeric) from public, anon, authenticated;
revoke execute on function public.navy_compute_quote(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.navy_quote(uuid, uuid) from public, anon;
revoke execute on function public.navy_create_parcel(uuid, uuid, uuid, text, text, text, integer, text, uuid, text, integer) from public, anon;
revoke execute on function public.navy_analyse_search(uuid, boolean) from public, anon, authenticated;
revoke execute on function public.navy_dispatch(uuid) from public, anon, authenticated;
revoke execute on function public.navy_tick() from public, anon, authenticated;
revoke execute on function public.navy_choose_counter(uuid, uuid) from public, anon;
revoke execute on function public.navy_refuse_counter(uuid) from public, anon;
revoke execute on function public.navy_parcel_counter(uuid) from public, anon;
revoke execute on function public.navy_submit_payment_reference(uuid, uuid, text) from public, anon;
revoke execute on function public.navy_decide_payment(uuid, text, text) from public, anon;
revoke execute on function public.navy_deposit_parcel(uuid, boolean, boolean) from public, anon;
revoke execute on function public.navy_accept_offer(uuid) from public, anon;
revoke execute on function public.navy_cancel_parcel(uuid, text) from public, anon;
revoke execute on function public.navy_choose_driver(uuid, uuid) from public, anon;
revoke execute on function public.navy_parcel_drivers(uuid) from public, anon;
revoke execute on function public.navy_relaunch_offers(uuid) from public, anon;
revoke execute on function public.navy_cash_due(uuid[]) from public, anon;
revoke execute on function public.navy_my_offers() from public, anon;
revoke execute on function public.navy_set_driver_status(uuid, boolean, float8, float8, timestamptz, float8, float8) from public, anon;

grant execute on function public.navy_geo_m(float8, float8, float8, float8) to authenticated;
grant execute on function public.navy_point_route_m(float8, float8, jsonb) to authenticated;
grant execute on function public.navy_min_total(integer, integer, integer) to authenticated;
grant execute on function public.navy_routes_config() to service_role;
grant execute on function public.navy_ors_log(text, boolean, integer, text) to service_role;
grant execute on function public.navy_distance_work() to service_role;
grant execute on function public.navy_store_distances(timestamptz, boolean, jsonb, jsonb, jsonb, uuid[]) to service_role;
grant execute on function public.navy_distance_failed(text) to service_role;
grant execute on function public.navy_route_work(uuid) to service_role;
grant execute on function public.navy_store_route(uuid, float8, float8, float8, float8, jsonb, boolean) to service_role;
grant execute on function public.navy_distance_status() to authenticated;
grant execute on function public.navy_request_distance_refresh() to authenticated;
grant execute on function public.navy_my_credit() to authenticated;
grant execute on function public.navy_quote(uuid, uuid) to authenticated;
grant execute on function public.navy_create_parcel(uuid, uuid, uuid, text, text, text, integer, text, uuid, text, integer) to authenticated;
grant execute on function public.navy_choose_counter(uuid, uuid) to authenticated;
grant execute on function public.navy_refuse_counter(uuid) to authenticated;
grant execute on function public.navy_parcel_counter(uuid) to authenticated;
grant execute on function public.navy_submit_payment_reference(uuid, uuid, text) to authenticated;
grant execute on function public.navy_decide_payment(uuid, text, text) to authenticated;
grant execute on function public.navy_deposit_parcel(uuid, boolean, boolean) to authenticated;
grant execute on function public.navy_accept_offer(uuid) to authenticated;
grant execute on function public.navy_cancel_parcel(uuid, text) to authenticated;
grant execute on function public.navy_choose_driver(uuid, uuid) to authenticated;
grant execute on function public.navy_parcel_drivers(uuid) to authenticated;
grant execute on function public.navy_relaunch_offers(uuid) to authenticated;
grant execute on function public.navy_cash_due(uuid[]) to authenticated;
grant execute on function public.navy_my_offers() to authenticated;
grant execute on function public.navy_set_driver_status(uuid, boolean, float8, float8, timestamptz, float8, float8) to authenticated;

-- -------------------------------------------------------------------------------------
-- 12. Existing credits (credit_due recorded in 2A) → journal; first computation.
-- -------------------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in select parcel_id from public.navy_parcel_prices where credit_due > 0 loop
    perform public.navy_credit_sync(r.parcel_id);
  end loop;
end $$;

insert into public.navy_distance_queue (partner_id)
select id from public.navy_partners
 where kind = 'epicier' and status = 'approved' and shop_lat is not null and shop_lng is not null
on conflict (partner_id) do nothing;

select cron.schedule('navy-tick', '10 seconds', 'select public.navy_tick()');

comment on table public.navy_grocer_distances is
  'NAVY ay (2B1): road distance between two grocers (OpenRouteService Matrix, driving-car), both directions. Written by navy_store_distances (service_role) only. Missing or stale pair => straight line + 30 %.';
comment on table public.navy_driver_routes is
  'NAVY ay (2B1): ONE GPS reading of a driver at availability / direction change and the route computed from it. Driver + operators only. Erased when the direction expires (navy_tick).';
comment on table public.navy_credit_movements is
  'NAVY ay (2B1): credit (avoir) journal. Balance = sum(amount). Never written directly by a client, never refunded in cash, never transferable.';

notify pgrst, 'reload schema';
