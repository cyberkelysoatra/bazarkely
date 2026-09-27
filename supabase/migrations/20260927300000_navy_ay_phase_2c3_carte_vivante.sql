-- =====================================================================================
-- NAVY ay - phase 2C3: the living map (decisions 48 (5), 49, 50, 53, 55 (2)).
--   1. navy_driver_positions: ONE row per driver (overwritten, no history), written every
--      30 s by the phone of an AVAILABLE driver (or during an accepted course) while
--      NAVY ay is open on screen, through navy_report_position() only.
--   2. navy_live_drivers(): available drivers for any signed-in account, position rounded
--      to a ~200 m grid, never older than 2 minutes, never within 800 m of the place the
--      driver declared himself available (home protection, 2C2); EXACT position only for
--      the sender and the two grocers of a course the driver accepted. Same shape as
--      navy_available_drivers() plus a `live` object.
--   3. navy_map_obstacles: the private NAVY layer (works, flooded road, closed passage):
--      proposed by approved drivers, validated / changed / deleted by operators only,
--      shown to every signed-in account while validated and in progress.
--   4. navy_obstacle_zones(): the validated obstacles in progress for the Edge Function
--      navy-routes (service_role only), which asks OpenRouteService to avoid them.
--
-- Amends decisions 8, 9, 25 and 46 (3): an AVAILABLE driver shares his position; outside
-- the declared availability (or an accepted course), never.
--
-- IDEMPOTENT: every statement can be replayed (if not exists, create or replace,
-- drop ... if exists + create, cron.schedule by name).
--
-- SECURITY:
-- - RLS enabled AND forced on every new table; anon has no right at all (P7).
-- - navy_driver_positions: no policy, no table right for clients: written only through
--   navy_report_position() (own approved driver, available or in a course), read only
--   through navy_live_drivers(). Rows older than 10 minutes and rows of a driver who is
--   no longer available (and has no course) are erased.
-- - navy_map_obstacles: guard trigger (a driver can only PROPOSE, in his name; the
--   operator's decision is stamped by the server).
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. Live positions (one row per driver, overwritten)
-- -------------------------------------------------------------------------------------
create table if not exists public.navy_driver_positions (
  partner_id  uuid primary key references public.navy_partners (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  lat         float8 not null check (lat between -90 and 90),
  lng         float8 not null check (lng between -180 and 180),
  heading     float8 check (heading is null or heading between 0 and 360),
  speed_mps   float8 check (speed_mps is null or speed_mps between 0 and 60),
  accuracy_m  float8 check (accuracy_m is null or accuracy_m >= 0),
  at          timestamptz not null default now(),
  -- first position of the current availability: within 800 m of it (often the home)
  -- the position is never shown to clients.
  anchor_lat  float8,
  anchor_lng  float8,
  anchor_at   timestamptz
);
alter table public.navy_driver_positions enable row level security;
alter table public.navy_driver_positions force row level security;
revoke all on public.navy_driver_positions from public, anon, authenticated;

-- ~200 m grid (0.0018 degree), the precision shown to every client (decision 50 (1)).
create or replace function public.navy_grid200(p float8)
returns float8 language sql immutable set search_path = public as $$
  select case when p is null then null else round((round(p / 0.0018) * 0.0018)::numeric, 5)::float8 end;
$$;

-- The driver has a course in progress (accepted, until the hand-over at the arrival).
create or replace function public.navy_driver_in_course(p_partner_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.navy_parcels
                  where driver_partner_id = p_partner_id and status in ('chauffeur_trouve', 'pris_en_charge'));
$$;

-- Driver's phone: its position, every 30 s at most (a faster call is ignored).
create or replace function public.navy_report_position(
  p_partner_id uuid, p_lat float8, p_lng float8, p_heading float8, p_speed_mps float8, p_accuracy_m float8)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  s public.navy_driver_status;
  r public.navy_driver_positions;
  v_available boolean;
  v_speed float8 := case when p_speed_mps is not null and p_speed_mps >= 0 and p_speed_mps <= 60 then p_speed_mps end;
  v_dt float8;
  v_new_period boolean;
begin
  if v_uid is null or not exists (select 1 from public.navy_partners
                                   where id = p_partner_id and user_id = v_uid
                                     and kind = 'chauffeur' and status = 'approved') then
    raise exception 'navy_report_position: own approved driver only' using errcode = '42501';
  end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'navy_report_position: invalid position' using errcode = '22023';
  end if;
  select * into s from public.navy_driver_status where partner_id = p_partner_id;
  v_available := found and s.available and s.available_until > now();
  if not v_available and not public.navy_driver_in_course(p_partner_id) then
    delete from public.navy_driver_positions where partner_id = p_partner_id;
    raise exception 'navy_report_position: not available' using errcode = '42501';
  end if;

  select * into r from public.navy_driver_positions where partner_id = p_partner_id for update;
  if found and r.at > now() - interval '10 seconds' then
    return jsonb_build_object('ok', true, 'ignored', true, 'at', r.at);
  end if;
  if found then
    v_dt := extract(epoch from (now() - r.at));
    if v_speed is null and v_dt between 5 and 300 then
      v_speed := public.navy_geo_m(r.lat, r.lng, p_lat, p_lng) / v_dt;
      if v_speed > 40 then
        v_speed := null;   -- a GPS jump, not a speed
      end if;
    end if;
  end if;
  -- A new availability period (or a first position) resets the protected anchor.
  v_new_period := r.partner_id is null or r.anchor_at is null or (v_available and r.anchor_at < s.client_at);

  insert into public.navy_driver_positions as t
         (partner_id, user_id, lat, lng, heading, speed_mps, accuracy_m, at, anchor_lat, anchor_lng, anchor_at)
  values (p_partner_id, v_uid, p_lat, p_lng,
          case when p_heading between 0 and 360 then p_heading end, v_speed,
          case when p_accuracy_m >= 0 then least(p_accuracy_m, 100000) end, now(),
          p_lat, p_lng, now())
  on conflict (partner_id) do update
     set lat = excluded.lat, lng = excluded.lng, heading = excluded.heading, speed_mps = excluded.speed_mps,
         accuracy_m = excluded.accuracy_m, at = excluded.at,
         anchor_lat = case when v_new_period then excluded.anchor_lat else t.anchor_lat end,
         anchor_lng = case when v_new_period then excluded.anchor_lng else t.anchor_lng end,
         anchor_at  = case when v_new_period then excluded.anchor_at else t.anchor_at end;
  return jsonb_build_object('ok', true, 'ignored', false, 'at', now());
end;
$$;

-- "Pas disponible" erases the position at once (unless a course is in progress).
create or replace function public.navy_driver_status_positions()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not new.available and not public.navy_driver_in_course(new.partner_id) then
    delete from public.navy_driver_positions where partner_id = new.partner_id;
  end if;
  return null;
end;
$$;
drop trigger if exists navy_driver_status_positions on public.navy_driver_status;
create trigger navy_driver_status_positions after insert or update of available on public.navy_driver_status
  for each row execute function public.navy_driver_status_positions();

-- No history: stale rows and rows of drivers who stopped are erased every 5 minutes.
create or replace function public.navy_purge_positions()
returns integer language plpgsql security definer set search_path = public as $$
declare
  n integer;
begin
  delete from public.navy_driver_positions p
   where p.at < now() - interval '10 minutes'
      or (not exists (select 1 from public.navy_driver_status d
                       where d.partner_id = p.partner_id and d.available and d.available_until > now())
          and not public.navy_driver_in_course(p.partner_id));
  get diagnostics n = row_count;
  return n;
end;
$$;
select cron.schedule('navy-positions-purge', '*/5 * * * *', 'select public.navy_purge_positions()');

-- -------------------------------------------------------------------------------------
-- 2. Drivers on the client's map, live (decisions 49, 50)
-- -------------------------------------------------------------------------------------
-- Hidden radius around the availability place: 800 m + a part (0-400 m) fixed for the
-- availability period, unknown to clients.
create or replace function public.navy_home_radius(p_partner_id uuid, p_anchor_at timestamptz)
returns float8 language sql immutable set search_path = public as $$
  select 800 + (abs(hashtext(p_partner_id::text || coalesce(p_anchor_at::text, ''))) % 400)::float8;
$$;

create or replace function public.navy_live_drivers()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'navy_live_drivers: sign-in required' using errcode = '42501';
  end if;
  return coalesce((
    with courses as (
      -- courses in progress where the caller is the sender or one of the two grocers
      select distinct pc.driver_partner_id as partner_id
        from public.navy_parcels pc
        left join public.navy_partners dg on dg.id = pc.depot_partner_id
        left join public.navy_partners ag on ag.id = pc.arrival_partner_id
       where pc.status in ('chauffeur_trouve', 'pris_en_charge') and pc.driver_partner_id is not null
         and (pc.sender_id = v_uid or dg.user_id = v_uid or ag.user_id = v_uid)
    ),
    avail as (
      select d.partner_id from public.navy_driver_status d
       where d.available and d.available_until > now() and d.dest_lat is not null and d.dest_lng is not null
    ),
    shown as (
      select partner_id, bool_or(exact) as exact from (
        select partner_id, false as exact from avail
        union all
        select partner_id, true from courses) u
      group by partner_id
    )
    select jsonb_agg(jsonb_build_object(
             'partner_id', p.id,
             'first_name', public.navy_first_name(p.display_name),
             'vehicle_type', p.vehicle_type,
             'plate', p.vehicle_plate,
             'vehicle_photo_path', case when a.partner_id is not null then p.vehicle_photo_path end,
             -- no rating table yet: nothing is shown below the threshold (decision 4)
             'rating', null,
             'available', a.partner_id is not null,
             'in_course', sh.exact,
             'dest_lat', round(coalesce(d.dest_lat, pos.lat)::numeric, 3)::float8,
             'dest_lng', round(coalesce(d.dest_lng, pos.lng)::numeric, 3)::float8,
             'dest_zone_id', d.dest_zone_id,
             'route', case when a.partner_id is not null and r.route_status = 'ok' and jsonb_typeof(r.route) = 'array' then (
                 select jsonb_agg(jsonb_build_array(round((pt->>0)::numeric, 3), round((pt->>1)::numeric, 3)) order by i)
                   from jsonb_array_elements(r.route) with ordinality as e(pt, i)
                  where ((i - 1) % greatest(1, ceil(jsonb_array_length(r.route) / 60.0)::int) = 0
                         or i = jsonb_array_length(r.route))
                    and coalesce(public.navy_geo_m(r.origin_lat, r.origin_lng, (pt->>0)::float8, (pt->>1)::float8), 0) >= 800) end,
             'live', case
               when pos.partner_id is null or pos.at < now() - interval '2 minutes' then null
               when sh.exact then jsonb_build_object(
                 'lat', round(pos.lat::numeric, 6)::float8, 'lng', round(pos.lng::numeric, 6)::float8,
                 'age_s', round(extract(epoch from (now() - pos.at)))::int,
                 'speed_kmh', case when pos.speed_mps is not null then round((pos.speed_mps * 3.6)::numeric)::int end,
                 'exact', true)
               -- home protection: within 800 m of the place he declared himself available. The
               -- radius varies between 800 and 1 200 m from one availability to the next, so the
               -- edge where the position disappears does not draw a circle around the home.
               when coalesce(public.navy_geo_m(pos.anchor_lat, pos.anchor_lng, pos.lat, pos.lng), 1e9) < public.navy_home_radius(p.id, pos.anchor_at)
                 or coalesce(public.navy_geo_m(r.origin_lat, r.origin_lng, pos.lat, pos.lng), 1e9) < public.navy_home_radius(p.id, pos.anchor_at) then null
               else jsonb_build_object(
                 'lat', public.navy_grid200(pos.lat), 'lng', public.navy_grid200(pos.lng),
                 'age_s', round(extract(epoch from (now() - pos.at)))::int,
                 'speed_kmh', case when pos.speed_mps is not null then round((pos.speed_mps * 3.6)::numeric)::int end,
                 'exact', false)
             end
           ) order by p.id)
      from shown sh
      join public.navy_partners p on p.id = sh.partner_id and p.kind = 'chauffeur' and p.status = 'approved'
      left join avail a on a.partner_id = p.id
      left join public.navy_driver_status d on d.partner_id = p.id
      left join public.navy_driver_positions pos on pos.partner_id = p.id
      left join public.navy_driver_routes r on r.partner_id = p.id and r.expires_at > now()
     where coalesce(d.dest_lat, pos.lat) is not null), '[]'::jsonb);
end;
$$;

-- -------------------------------------------------------------------------------------
-- 3. Private NAVY layer: obstacles (decisions 52 (2), 55 (2))
-- -------------------------------------------------------------------------------------
create table if not exists public.navy_map_obstacles (
  id            uuid primary key,                 -- client-generated id
  kind          text not null check (kind in ('travaux', 'inondation', 'ferme', 'autre')),
  geom          jsonb not null,                   -- {type: Point | LineString, coordinates: [lng, lat] ...}
  note          text check (note is null or length(note) <= 200),
  starts_at     timestamptz not null default now(),
  ends_at       timestamptz not null,
  status        text not null default 'propose' check (status in ('propose', 'valide', 'refuse')),
  reported_by   uuid references auth.users (id) on delete set null,
  validated_by  uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  constraint navy_map_obstacles_dates check (ends_at > starts_at)
);
create index if not exists navy_map_obstacles_status_idx on public.navy_map_obstacles (status, ends_at);

-- Point or line of at most 100 points, [lng, lat] (GeoJSON order).
create or replace function public.navy_valid_obstacle_geom(g jsonb)
returns boolean language plpgsql immutable set search_path = public as $$
declare
  pt jsonb;
  n int;
begin
  if g is null or jsonb_typeof(g) <> 'object' or jsonb_typeof(g->'coordinates') <> 'array' then
    return false;
  end if;
  if g->>'type' = 'Point' then
    pt := g->'coordinates';
    return jsonb_array_length(pt) = 2 and jsonb_typeof(pt->0) = 'number' and jsonb_typeof(pt->1) = 'number'
       and (pt->>0)::float8 between -180 and 180 and (pt->>1)::float8 between -90 and 90;
  elsif g->>'type' = 'LineString' then
    n := jsonb_array_length(g->'coordinates');
    if n < 2 or n > 100 then
      return false;
    end if;
    for pt in select value from jsonb_array_elements(g->'coordinates') loop
      if jsonb_typeof(pt) <> 'array' or jsonb_array_length(pt) <> 2 or jsonb_typeof(pt->0) <> 'number' or jsonb_typeof(pt->1) <> 'number'
         or (pt->>0)::float8 not between -180 and 180 or (pt->>1)::float8 not between -90 and 90 then
        return false;
      end if;
    end loop;
    return true;
  end if;
  return false;
end;
$$;

-- Guard: a driver only proposes (in his name); the operator's decision is stamped here.
-- SECURITY INVOKER on purpose: current_user must stay the caller's role (P14).
create or replace function public.navy_map_obstacles_guard()
returns trigger language plpgsql security invoker set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_op boolean := public.navy_is_operator();
begin
  if not public.navy_valid_obstacle_geom(new.geom) then
    raise exception 'navy: invalid obstacle shape' using errcode = '22023';
  end if;
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.created_at := now();
      if v_op then
        new.reported_by := v_uid;
        new.validated_by := case when new.status = 'propose' then null else v_uid end;
      else
        new.status := 'propose';
        new.reported_by := v_uid;
        new.validated_by := null;
        new.starts_at := least(greatest(coalesce(new.starts_at, now()), now()), now() + interval '1 day');
      end if;
    else
      -- updates are operators only (RLS); the decision is stamped by the server
      new.id := old.id;
      new.reported_by := old.reported_by;
      new.created_at := old.created_at;
      if new.status is distinct from old.status then
        new.validated_by := case when new.status = 'propose' then null else v_uid end;
      end if;
    end if;
  end if;
  -- after the clamps above: the real start counts
  if new.ends_at > new.starts_at + interval '90 days' then
    raise exception 'navy: obstacle lasts 90 days at most' using errcode = '22023';
  end if;
  return new;
end;
$$;
drop trigger if exists navy_map_obstacles_guard on public.navy_map_obstacles;
create trigger navy_map_obstacles_guard before insert or update on public.navy_map_obstacles
  for each row execute function public.navy_map_obstacles_guard();

-- A driver's report: the operators are told (notification).
create or replace function public.navy_map_obstacles_notify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'propose' then
    perform public.navy_notify(null, public.navy_operator_ids(), 'Obstacle signalé par un chauffeur', '/navy/operatrice/zones?onglet=obstacles');
  end if;
  return null;
end;
$$;
drop trigger if exists navy_map_obstacles_notify on public.navy_map_obstacles;
create trigger navy_map_obstacles_notify after insert on public.navy_map_obstacles
  for each row execute function public.navy_map_obstacles_notify();

-- An approved driver (may propose an obstacle).
create or replace function public.navy_is_driver()
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (select 1 from public.navy_partners
                                             where user_id = auth.uid() and kind = 'chauffeur' and status = 'approved');
$$;

alter table public.navy_map_obstacles enable row level security;
alter table public.navy_map_obstacles force row level security;
drop policy if exists navy_map_obstacles_select on public.navy_map_obstacles;
drop policy if exists navy_map_obstacles_insert on public.navy_map_obstacles;
drop policy if exists navy_map_obstacles_update on public.navy_map_obstacles;
drop policy if exists navy_map_obstacles_delete on public.navy_map_obstacles;
create policy navy_map_obstacles_select on public.navy_map_obstacles for select to public
  using (auth.uid() is not null and (
           (status = 'valide' and starts_at <= now() and ends_at > now())
           or reported_by = auth.uid()
           or public.navy_is_operator()));
create policy navy_map_obstacles_insert on public.navy_map_obstacles for insert to public
  with check (public.navy_is_operator() or (public.navy_is_driver() and status = 'propose' and reported_by = auth.uid()));
create policy navy_map_obstacles_update on public.navy_map_obstacles for update to public
  using (public.navy_is_operator()) with check (public.navy_is_operator());
create policy navy_map_obstacles_delete on public.navy_map_obstacles for delete to public
  using (public.navy_is_operator());
revoke all on public.navy_map_obstacles from public, anon, authenticated;
grant select, insert, update, delete on public.navy_map_obstacles to authenticated;

-- Ended or refused obstacles are forgotten after 7 days.
create or replace function public.navy_purge_obstacles()
returns integer language plpgsql security definer set search_path = public as $$
declare
  n integer;
begin
  delete from public.navy_map_obstacles
   where ends_at < now() - interval '7 days'
      or (status = 'refuse' and created_at < now() - interval '7 days');
  get diagnostics n = row_count;
  return n;
end;
$$;
select cron.schedule('navy-obstacles-purge', '41 2 * * *', 'select public.navy_purge_obstacles()');

-- -------------------------------------------------------------------------------------
-- 4. Obstacles to avoid, for navy-routes (service_role only)
-- -------------------------------------------------------------------------------------
create or replace function public.navy_obstacle_zones()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(geom order by created_at), '[]'::jsonb)
    from public.navy_map_obstacles
   where status = 'valide' and starts_at <= now() and ends_at > now();
$$;

-- -------------------------------------------------------------------------------------
-- 5. Function privileges (P7: EXECUTE is granted to anon explicitly by default)
-- -------------------------------------------------------------------------------------
revoke execute on function public.navy_grid200(float8) from public, anon, authenticated;
revoke execute on function public.navy_home_radius(uuid, timestamptz) from public, anon, authenticated;
revoke execute on function public.navy_driver_in_course(uuid) from public, anon, authenticated;
revoke execute on function public.navy_report_position(uuid, float8, float8, float8, float8, float8) from public, anon;
revoke execute on function public.navy_driver_status_positions() from public, anon, authenticated;
revoke execute on function public.navy_purge_positions() from public, anon, authenticated;
revoke execute on function public.navy_live_drivers() from public, anon;
revoke execute on function public.navy_valid_obstacle_geom(jsonb) from public, anon;
revoke execute on function public.navy_map_obstacles_guard() from public, anon, authenticated;
revoke execute on function public.navy_map_obstacles_notify() from public, anon, authenticated;
revoke execute on function public.navy_is_driver() from public, anon;
revoke execute on function public.navy_purge_obstacles() from public, anon, authenticated;
revoke execute on function public.navy_obstacle_zones() from public, anon, authenticated;

grant execute on function public.navy_report_position(uuid, float8, float8, float8, float8, float8) to authenticated;
grant execute on function public.navy_live_drivers() to authenticated;
-- RLS helper evaluated for the signed-in writer
grant execute on function public.navy_is_driver() to authenticated;
-- called by the obstacle guard, which runs as the caller (security invoker)
grant execute on function public.navy_valid_obstacle_geom(jsonb) to authenticated;
grant execute on function public.navy_obstacle_zones() to service_role;

comment on table public.navy_driver_positions is
  'NAVY ay (2C3): last position of each available driver (or in a course), one row overwritten every 30 s, no history. No client right: navy_report_position / navy_live_drivers only.';
comment on table public.navy_map_obstacles is
  'NAVY ay (2C3): private layer of temporary obstacles. Drivers propose, operators validate; shown while validated and in progress.';

notify pgrst, 'reload schema';
