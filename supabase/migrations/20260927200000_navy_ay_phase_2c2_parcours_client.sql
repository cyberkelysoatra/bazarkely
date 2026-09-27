-- =====================================================================================
-- NAVY ay - phase 2C2: the client's home on the map and the new sending journey.
--   1. navy_client_profiles: the usual pickup grocer of each account (decision 7).
--   2. navy_lookup_recipient(phone): is the recipient on NAVY ay? (first name and usual
--      grocer only). Until the SMS check of client phones exists (phase 1C), only the
--      phone of a VALIDATED PARTNER is recognised (same rule as the 2A recipient link).
--   3. navy_available_drivers(): available drivers shown on the client's map, at their
--      DECLARED destination (live positions come in 2C3), with first name, vehicle,
--      plate and vehicle photo (decision 52 (4)); never a phone.
--   4. navy_route_paths + navy_route_path(): road geometry between the departure
--      (grocer, or rounded hand-over place) and the arrival grocer, computed ONCE per pair
--      by the Edge Function navy-routes (action 'path', called by the database only).
--
-- IDEMPOTENT: every statement can be replayed (if not exists, create or replace,
-- drop ... if exists + create, cron.schedule by name).
--
-- SECURITY:
-- - RLS enabled AND forced on every new table; anon has no right at all (P7: explicit
--   revoke, not only from public).
-- - navy_client_profiles: each account reads and writes ITS row only; the grocer must be
--   an approved grocer (trigger), dates set by the server.
-- - navy_lookup_recipient: SECURITY DEFINER, 30 calls per hour per account (journal
--   navy_lookup_log, no policy), answers { known, first_name, usual_grocer_id } and
--   nothing else: never a family name, never a home position.
-- - Vehicle photo: readable by any signed-in account only while its driver is approved
--   AND available (to recognise the vehicle before proposing a parcel).
-- - Paths: no client writes them; operators read the table; handover rows (they locate a
--   client) are forgotten after 7 days, grocer pairs after 30 days.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. Usual pickup grocer
-- -------------------------------------------------------------------------------------
create table if not exists public.navy_client_profiles (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  usual_grocer_id  uuid references public.navy_partners (id) on delete set null,
  updated_at       timestamptz not null default now()
);

alter table public.navy_client_profiles enable row level security;
alter table public.navy_client_profiles force row level security;
drop policy if exists navy_client_profiles_select on public.navy_client_profiles;
drop policy if exists navy_client_profiles_insert on public.navy_client_profiles;
drop policy if exists navy_client_profiles_update on public.navy_client_profiles;
drop policy if exists navy_client_profiles_delete on public.navy_client_profiles;
create policy navy_client_profiles_select on public.navy_client_profiles for select to public using (user_id = auth.uid());
create policy navy_client_profiles_insert on public.navy_client_profiles for insert to public with check (user_id = auth.uid());
create policy navy_client_profiles_update on public.navy_client_profiles for update to public
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy navy_client_profiles_delete on public.navy_client_profiles for delete to public using (user_id = auth.uid());
revoke all on public.navy_client_profiles from public, anon, authenticated;
grant select, insert, update, delete on public.navy_client_profiles to authenticated;

-- The grocer must be an approved grocer; the date is the server's.
create or replace function public.navy_client_profiles_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.usual_grocer_id is not null and not exists (
       select 1 from public.navy_partners where id = new.usual_grocer_id and kind = 'epicier' and status = 'approved') then
    raise exception 'navy: usual grocer not available' using errcode = '22023';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists navy_client_profiles_guard on public.navy_client_profiles;
create trigger navy_client_profiles_guard before insert or update on public.navy_client_profiles
  for each row execute function public.navy_client_profiles_guard();

-- -------------------------------------------------------------------------------------
-- 2. Recipient recognition
-- -------------------------------------------------------------------------------------
create table if not exists public.navy_lookup_log (
  id       bigserial primary key,
  user_id  uuid not null,
  at       timestamptz not null default now()
);
create index if not exists navy_lookup_log_user_idx on public.navy_lookup_log (user_id, at);
alter table public.navy_lookup_log enable row level security;
alter table public.navy_lookup_log force row level security;
revoke all on public.navy_lookup_log from public, anon, authenticated;
revoke all on sequence public.navy_lookup_log_id_seq from public, anon, authenticated;

-- First word of a name ("Soa Rakoto" -> "Soa"): the family name never leaves the server.
create or replace function public.navy_first_name(p text)
returns text language sql immutable set search_path = public as $$
  select nullif(split_part(regexp_replace(btrim(coalesce(p, '')), '\s+', ' ', 'g'), ' ', 1), '');
$$;

create or replace function public.navy_lookup_recipient(p_phone text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_key text := public.navy_phone_key(p_phone);
  -- Phase 1C (SMS check of client phones) will switch this on: a client whose phone was
  -- VERIFIED is then recognised too. Until then, only validated partners are.
  v_verified_clients constant boolean := false;
  v_user uuid;
  v_name text;
  v_grocer uuid;
begin
  if v_uid is null then
    raise exception 'navy_lookup_recipient: sign-in required' using errcode = '42501';
  end if;
  if (select count(*) from public.navy_lookup_log where user_id = v_uid and at > now() - interval '1 hour') >= 30 then
    raise exception 'navy_lookup_recipient: too many lookups, try again later' using errcode = '54000';
  end if;
  insert into public.navy_lookup_log (user_id) values (v_uid);
  delete from public.navy_lookup_log where at < now() - interval '1 day';

  if v_key is null or length(v_key) < 9 then
    return jsonb_build_object('known', false, 'first_name', null, 'usual_grocer_id', null);
  end if;

  -- Same rule as the 2A recipient link: the phone of a validated partner.
  select np.user_id, public.navy_first_name(np.display_name) into v_user, v_name
    from public.navy_partners np
   where np.status = 'approved' and public.navy_phone_key(np.phone) = v_key
   order by np.decided_at nulls last, np.created_at
   limit 1;

  if v_user is null and v_verified_clients then
    select u.id, public.navy_first_name(pu.username) into v_user, v_name
      from auth.users u left join public.users pu on pu.id = u.id
     where u.phone_confirmed_at is not null and public.navy_phone_key(u.phone) = v_key
     limit 1;
  end if;

  if v_user is null then
    return jsonb_build_object('known', false, 'first_name', null, 'usual_grocer_id', null);
  end if;

  -- The usual grocer only when it can receive a parcel now (approved, open, positioned).
  select c.usual_grocer_id into v_grocer
    from public.navy_client_profiles c
    join public.navy_partners g on g.id = c.usual_grocer_id
   where c.user_id = v_user and g.kind = 'epicier' and g.status = 'approved' and g.is_open and g.shop_lat is not null;

  return jsonb_build_object('known', true, 'first_name', v_name, 'usual_grocer_id', v_grocer);
end;
$$;

-- -------------------------------------------------------------------------------------
-- 3. Available drivers on the client's map (declared destination, rounded ~100 m)
-- -------------------------------------------------------------------------------------
create or replace function public.navy_available_drivers()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'navy_available_drivers: sign-in required' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'partner_id', p.id,
             'first_name', public.navy_first_name(p.display_name),
             'vehicle_type', p.vehicle_type,
             'plate', p.vehicle_plate,
             'vehicle_photo_path', p.vehicle_photo_path,
             'dest_lat', round(d.dest_lat::numeric, 3)::float8,
             'dest_lng', round(d.dest_lng::numeric, 3)::float8,
             'dest_zone_id', d.dest_zone_id,
             -- the declared route (one GPS reading -> destination), rounded ~100 m, 60 points at most.
             -- Its first 800 m are cut: the GPS reading itself (often the driver's home) is never shown.
             'route', case when r.route_status = 'ok' and jsonb_typeof(r.route) = 'array' then (
                 select jsonb_agg(jsonb_build_array(round((pt->>0)::numeric, 3), round((pt->>1)::numeric, 3)) order by i)
                   from jsonb_array_elements(r.route) with ordinality as e(pt, i)
                  where ((i - 1) % greatest(1, ceil(jsonb_array_length(r.route) / 60.0)::int) = 0
                         or i = jsonb_array_length(r.route))
                    and coalesce(public.navy_geo_m(r.origin_lat, r.origin_lng, (pt->>0)::float8, (pt->>1)::float8), 0) >= 800) end
           ) order by d.client_at)
      from public.navy_partners p
      join public.navy_driver_status d on d.partner_id = p.id
      left join public.navy_driver_routes r on r.partner_id = p.id and r.expires_at > now()
     where p.kind = 'chauffeur' and p.status = 'approved'
       and d.available and d.available_until > now()
       and d.dest_lat is not null and d.dest_lng is not null), '[]'::jsonb);
end;
$$;

-- Vehicle photo of an available driver: any signed-in account may read it (decision 52 (4)).
create or replace function public.navy_vehicle_photo_public(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from public.navy_partners p join public.navy_driver_status d on d.partner_id = p.id
     where p.vehicle_photo_path = p_name and p.kind = 'chauffeur' and p.status = 'approved'
       and d.available and d.available_until > now());
$$;

drop policy if exists navy_vehicle_photos_select on storage.objects;
create policy navy_vehicle_photos_select on storage.objects
  for select to public
  using (case when bucket_id = 'navy-documents' then public.navy_vehicle_photo_public(name) else false end);

-- -------------------------------------------------------------------------------------
-- 4. Road geometry of the parcel (route drawn on the map)
-- -------------------------------------------------------------------------------------
create table if not exists public.navy_route_paths (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null check (kind in ('grocer', 'handover')),
  from_lat      float8 not null,
  from_lng      float8 not null,
  to_lat        float8 not null,
  to_lng        float8 not null,
  path          jsonb,                 -- [[lng, lat], ...] (GeoJSON order)
  km            numeric,
  status        text not null default 'pending' check (status in ('pending', 'ok', 'failed')),
  attempts      integer not null default 0,
  requested_by  uuid,
  requested_at  timestamptz not null default now(),
  computed_at   timestamptz,
  constraint navy_route_paths_key unique (from_lat, from_lng, to_lat, to_lng)
);
create index if not exists navy_route_paths_user_idx on public.navy_route_paths (requested_by, requested_at);
alter table public.navy_route_paths enable row level security;
alter table public.navy_route_paths force row level security;
drop policy if exists navy_route_paths_select on public.navy_route_paths;
create policy navy_route_paths_select on public.navy_route_paths for select to public using (public.navy_is_operator());
revoke all on public.navy_route_paths from public, anon, authenticated;
grant select on public.navy_route_paths to authenticated;

-- Client: road geometry from the departure grocer (p_depot) or the hand-over place
-- (rounded ~1 m) to the arrival grocer. Asked ONCE per pair to navy-routes; 30 requests
-- per hour per account at most. Answer: { status: ok | pending | failed | none, km, path }.
create or replace function public.navy_route_path(p_depot uuid, p_lat float8, p_lng float8, p_arrival uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  a public.navy_partners;
  d public.navy_partners;
  v_kind text;
  v_flat float8;
  v_flng float8;
  r public.navy_route_paths;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'navy_route_path: sign-in required' using errcode = '42501';
  end if;
  select * into a from public.navy_partners where id = p_arrival and kind = 'epicier' and status = 'approved' and shop_lat is not null;
  if not found then
    raise exception 'navy: arrival grocer not available' using errcode = '22023';
  end if;
  if p_depot is not null then
    select * into d from public.navy_partners where id = p_depot and kind = 'epicier' and status = 'approved' and shop_lat is not null;
    if not found then
      raise exception 'navy: depot grocer not available' using errcode = '22023';
    end if;
    v_kind := 'grocer'; v_flat := d.shop_lat; v_flng := d.shop_lng;
  else
    v_flat := public.navy_round5(p_lat); v_flng := public.navy_round5(p_lng);
    if v_flat is null or v_flng is null or v_flat not between -90 and 90 or v_flng not between -180 and 180 then
      raise exception 'navy: hand-over place required' using errcode = '22023';
    end if;
    v_kind := 'handover';
  end if;

  select * into r from public.navy_route_paths
   where from_lat = v_flat and from_lng = v_flng and to_lat = a.shop_lat and to_lng = a.shop_lng;
  if not found then
    if (select count(*) from public.navy_route_paths where requested_by = v_uid and requested_at > now() - interval '1 hour') < 30 then
      insert into public.navy_route_paths (kind, from_lat, from_lng, to_lat, to_lng, requested_by)
      values (v_kind, v_flat, v_flng, a.shop_lat, a.shop_lng, v_uid)
      on conflict on constraint navy_route_paths_key do nothing
      returning id into v_id;
      if v_id is not null then
        perform public.navy_call_routes(jsonb_build_object('action', 'path', 'id', v_id));
        return jsonb_build_object('status', 'pending', 'km', null, 'path', null);
      end if;
      select * into r from public.navy_route_paths
       where from_lat = v_flat and from_lng = v_flng and to_lat = a.shop_lat and to_lng = a.shop_lng;
    end if;
    if r.id is null then
      return jsonb_build_object('status', 'none', 'km', null, 'path', null);
    end if;
  end if;
  return jsonb_build_object('status', r.status, 'km', r.km, 'path', case when r.status = 'ok' then r.path end);
end;
$$;

-- ----- service_role only (Edge Function navy-routes) -----
create or replace function public.navy_path_work(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r public.navy_route_paths;
begin
  update public.navy_route_paths set attempts = attempts + 1
   where id = p_id and status = 'pending' and attempts < 3
   returning * into r;
  if not found then
    return null;
  end if;
  return jsonb_build_object('lat', r.from_lat, 'lng', r.from_lng, 'to_lat', r.to_lat, 'to_lng', r.to_lng);
end;
$$;

create or replace function public.navy_store_path(p_id uuid, p_path jsonb, p_km numeric, p_ok boolean)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_ok and (p_path is null or jsonb_typeof(p_path) <> 'array' or jsonb_array_length(p_path) < 2
               or jsonb_array_length(p_path) > 1000) then
    raise exception 'navy_store_path: invalid path' using errcode = '22023';
  end if;
  update public.navy_route_paths
     set path = case when p_ok then p_path end,
         km = case when p_ok then round(p_km, 1) end,
         status = case when p_ok then 'ok' when attempts >= 3 then 'failed' else 'pending' end,
         computed_at = now()
   where id = p_id;
  return found;
end;
$$;

-- Forget: hand-over places after 7 days (they locate a client), grocer pairs after 30.
create or replace function public.navy_purge_route_paths()
returns integer language plpgsql security definer set search_path = public as $$
declare
  n integer;
begin
  delete from public.navy_route_paths
   where (kind = 'handover' and requested_at < now() - interval '7 days')
      or (kind = 'grocer' and requested_at < now() - interval '30 days')
      or (status <> 'ok' and requested_at < now() - interval '1 day');
  get diagnostics n = row_count;
  return n;
end;
$$;
select cron.schedule('navy-route-paths-purge', '23 2 * * *', 'select public.navy_purge_route_paths()');

-- -------------------------------------------------------------------------------------
-- 5. Function privileges (P7: EXECUTE is granted to anon explicitly by default)
-- -------------------------------------------------------------------------------------
revoke execute on function public.navy_client_profiles_guard() from public, anon, authenticated;
revoke execute on function public.navy_first_name(text) from public, anon, authenticated;
revoke execute on function public.navy_lookup_recipient(text) from public, anon;
revoke execute on function public.navy_available_drivers() from public, anon;
revoke execute on function public.navy_vehicle_photo_public(text) from public, anon;
revoke execute on function public.navy_route_path(uuid, float8, float8, uuid) from public, anon;
revoke execute on function public.navy_path_work(uuid) from public, anon, authenticated;
revoke execute on function public.navy_store_path(uuid, jsonb, numeric, boolean) from public, anon, authenticated;
revoke execute on function public.navy_purge_route_paths() from public, anon, authenticated;

grant execute on function public.navy_lookup_recipient(text) to authenticated;
grant execute on function public.navy_available_drivers() to authenticated;
-- storage policy helper: evaluated for the signed-in reader
grant execute on function public.navy_vehicle_photo_public(text) to authenticated;
grant execute on function public.navy_route_path(uuid, float8, float8, uuid) to authenticated;
grant execute on function public.navy_path_work(uuid) to service_role;
grant execute on function public.navy_store_path(uuid, jsonb, numeric, boolean) to service_role;

comment on table public.navy_client_profiles is
  'NAVY ay (2C2): usual pickup grocer of each account (decision 7). Own row only; the grocer must be an approved grocer.';
comment on table public.navy_lookup_log is
  'NAVY ay (2C2): journal of navy_lookup_recipient calls (30 per hour per account). No policy: server only; kept 1 day.';
comment on table public.navy_route_paths is
  'NAVY ay (2C2): road geometry departure -> arrival grocer (OpenRouteService through navy-routes). Operators only; hand-over places forgotten after 7 days.';

notify pgrst, 'reload schema';
