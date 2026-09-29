-- =====================================================================================
-- NAVY ay - phase 3C (decision 59 + recommendations of the 3B report).
--
-- 1. Live map: a position less precise than 100 m (accuracy_m > 100) no longer moves the
--    driver, never feeds the computed speed nor the simulated movement: it only refreshes
--    the time of the last signal (column "at"). The time of the last usable position is
--    kept apart (new column fix_at), so the next precise position measures its speed over
--    the right duration. Seen on 2026-09-28/29: an imprecise GPS jump gave up to 29 m/s.
--    Same rule on the phones (frontend liveMotion.ts, isImpreciseFix).
--    navy_live_drivers() also returns fix_age_s (age of the usable position) and
--    accuracy_m; age_s stays the age of the last signal (unchanged meaning for old pages).
-- 2. navy_app_reports: summary of the app's own measurement (battery with the screen off,
--    positions sent / expected), sent by the driver ("Envoyer mon rapport") or
--    automatically at "Pas disponible". NEVER any coordinates. RLS enabled AND forced, no
--    write policy: writes only through navy_app_report_submit (security definer, for the
--    caller's own account, 30 per day at most). Read: the account itself and the
--    operators. anon: nothing. Purged after 90 days (pg_cron, daily).
-- Idempotent: can be replayed as is.
-- =====================================================================================

-- ------------------------------------------------------------------ 1. imprecise positions

alter table public.navy_driver_positions add column if not exists fix_at timestamptz;
update public.navy_driver_positions set fix_at = at where fix_at is null;

create or replace function public.navy_report_position(p_partner_id uuid, p_lat double precision, p_lng double precision,
                                                       p_heading double precision, p_speed_mps double precision,
                                                       p_accuracy_m double precision)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  s public.navy_driver_status;
  r public.navy_driver_positions;
  v_available boolean;
  -- Less precise than 100 m: the time of the signal only (phase 3C, P40).
  v_imprecise boolean := p_accuracy_m is not null and p_accuracy_m > 100;
  v_speed float8 := case when p_speed_mps is not null and p_speed_mps >= 0 and p_speed_mps <= 60 then p_speed_mps end;
  v_dt float8;
  v_new_period boolean;
  v_still_reset boolean;
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

  if found and v_imprecise then
    -- The driver is still there (signal), but this fix says nothing reliable about where:
    -- position, speed and heading stay those of the last usable fix. A new choice of the
    -- driver (available again) still resets the protected anchor and the idle clock, on
    -- the last usable position.
    v_new_period := r.anchor_at is null or (v_available and r.anchor_at < s.client_at);
    v_still_reset := r.still_since is null or r.still_lat is null or (v_available and r.still_since < s.client_at);
    update public.navy_driver_positions
       set at = now(),
           fix_at = coalesce(fix_at, r.at),
           anchor_lat = case when v_new_period then r.lat else anchor_lat end,
           anchor_lng = case when v_new_period then r.lng else anchor_lng end,
           anchor_at  = case when v_new_period then now() else anchor_at end,
           still_since = case when v_still_reset then now() else still_since end,
           still_lat   = case when v_still_reset then r.lat else still_lat end,
           still_lng   = case when v_still_reset then r.lng else still_lng end
     where partner_id = p_partner_id;
    return jsonb_build_object('ok', true, 'ignored', false, 'imprecise', true, 'at', now());
  end if;

  if v_imprecise then
    v_speed := null;   -- first position of the period: shown, but never a speed
  end if;
  -- Never a speed measured from (or to) an imprecise position (the first one of a period
  -- may have been kept to show the driver at all).
  if found and not v_imprecise and coalesce(r.accuracy_m, 0) <= 100 then
    v_dt := extract(epoch from (now() - coalesce(r.fix_at, r.at)));
    if v_speed is null and v_dt between 5 and 300 then
      v_speed := public.navy_geo_m(r.lat, r.lng, p_lat, p_lng) / v_dt;
      if v_speed > 40 then
        v_speed := null;   -- a GPS jump, not a speed
      end if;
    end if;
  end if;
  -- A new availability period (or a first position) resets the protected anchor.
  v_new_period := r.partner_id is null or r.anchor_at is null or (v_available and r.anchor_at < s.client_at);
  -- The still point: moving more than 150 m BEYOND the fix's own uncertainty (or a new
  -- choice of the driver: available again, "Toujours disponible ?") restarts the idle clock.
  v_still_reset := r.partner_id is null or r.still_since is null or r.still_lat is null
                   or (v_available and r.still_since < s.client_at)
                   or public.navy_geo_m(r.still_lat, r.still_lng, p_lat, p_lng)
                        - least(greatest(coalesce(p_accuracy_m, 0), 0), 100000) > 150;

  insert into public.navy_driver_positions as t
         (partner_id, user_id, lat, lng, heading, speed_mps, accuracy_m, at, fix_at, anchor_lat, anchor_lng, anchor_at,
          still_since, still_lat, still_lng)
  values (p_partner_id, v_uid, p_lat, p_lng,
          case when p_heading between 0 and 360 then p_heading end, v_speed,
          case when p_accuracy_m >= 0 then least(p_accuracy_m, 100000) end, now(), now(),
          p_lat, p_lng, now(), now(), p_lat, p_lng)
  on conflict (partner_id) do update
     set lat = excluded.lat, lng = excluded.lng, heading = excluded.heading, speed_mps = excluded.speed_mps,
         accuracy_m = excluded.accuracy_m, at = excluded.at, fix_at = excluded.fix_at,
         anchor_lat = case when v_new_period then excluded.anchor_lat else t.anchor_lat end,
         anchor_lng = case when v_new_period then excluded.anchor_lng else t.anchor_lng end,
         anchor_at  = case when v_new_period then excluded.anchor_at else t.anchor_at end,
         still_since = case when v_still_reset then excluded.still_since else t.still_since end,
         still_lat   = case when v_still_reset then excluded.still_lat else t.still_lat end,
         still_lng   = case when v_still_reset then excluded.still_lng else t.still_lng end;
  return jsonb_build_object('ok', true, 'ignored', false, 'at', now());
end;
$function$;

revoke execute on function public.navy_report_position(uuid, double precision, double precision, double precision, double precision, double precision) from public, anon;
grant execute on function public.navy_report_position(uuid, double precision, double precision, double precision, double precision, double precision) to authenticated;

create or replace function public.navy_live_drivers()
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
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
                 'fix_age_s', round(extract(epoch from (now() - coalesce(pos.fix_at, pos.at))))::int,
                 'accuracy_m', round(pos.accuracy_m::numeric)::int,
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
                 'fix_age_s', round(extract(epoch from (now() - coalesce(pos.fix_at, pos.at))))::int,
                 'accuracy_m', round(pos.accuracy_m::numeric)::int,
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
$function$;

-- ------------------------------------------------------------------ 2. app reports

create table if not exists public.navy_app_reports (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  created_at          timestamptz not null default now(),
  app_version         text,
  device_model        text,
  android_version     text,
  period_start        timestamptz not null,
  period_end          timestamptz not null,
  samples             integer not null default 0,
  screen_off_minutes  integer not null default 0,
  drain_pct_per_hour  numeric(6, 2),
  positions_sent      integer not null default 0,
  positions_expected  integer not null default 0,
  auto                boolean not null default false,
  constraint navy_app_reports_period check (period_end >= period_start and period_end - period_start <= interval '48 hours'),
  constraint navy_app_reports_counts check (samples between 0 and 1000 and screen_off_minutes between 0 and 2880
                                            and positions_sent between 0 and 100000 and positions_expected between 0 and 100000),
  constraint navy_app_reports_drain check (drain_pct_per_hour is null or drain_pct_per_hour between -100 and 100),
  constraint navy_app_reports_texts check (coalesce(length(app_version), 0) <= 20 and coalesce(length(device_model), 0) <= 80
                                           and coalesce(length(android_version), 0) <= 20)
);
create index if not exists navy_app_reports_user_idx on public.navy_app_reports (user_id, created_at desc);
create index if not exists navy_app_reports_created_idx on public.navy_app_reports (created_at);

alter table public.navy_app_reports enable row level security;
alter table public.navy_app_reports force row level security;

-- Supabase grants every right on a new table to anon and authenticated: take them back.
revoke all on table public.navy_app_reports from public, anon, authenticated;
grant select on table public.navy_app_reports to authenticated;

drop policy if exists navy_app_reports_read on public.navy_app_reports;
create policy navy_app_reports_read on public.navy_app_reports
  for select to authenticated
  using (user_id = (select auth.uid()) or public.navy_is_operator());

create or replace function public.navy_app_report_submit(p_app_version text, p_device_model text, p_android_version text,
                                                         p_period_start timestamptz, p_period_end timestamptz,
                                                         p_samples integer, p_screen_off_minutes integer,
                                                         p_drain_pct_per_hour numeric, p_positions_sent integer,
                                                         p_positions_expected integer, p_auto boolean)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'navy_app_report_submit: sign-in required' using errcode = '42501';
  end if;
  if p_period_start is null or p_period_end is null or p_period_end < p_period_start
     or p_period_end > now() + interval '5 minutes' or p_period_start < now() - interval '49 hours' then
    raise exception 'navy_app_report_submit: invalid period' using errcode = '22023';
  end if;
  if (select count(*) from public.navy_app_reports where user_id = v_uid and created_at > now() - interval '1 day') >= 30 then
    raise exception 'navy_app_report_submit: too many reports today' using errcode = '54000';
  end if;
  insert into public.navy_app_reports (user_id, app_version, device_model, android_version, period_start, period_end,
                                       samples, screen_off_minutes, drain_pct_per_hour, positions_sent, positions_expected, auto)
  values (v_uid, left(p_app_version, 20), left(p_device_model, 80), left(p_android_version, 20), p_period_start, p_period_end,
          greatest(coalesce(p_samples, 0), 0), greatest(coalesce(p_screen_off_minutes, 0), 0),
          round(p_drain_pct_per_hour, 2), greatest(coalesce(p_positions_sent, 0), 0),
          greatest(coalesce(p_positions_expected, 0), 0), coalesce(p_auto, false))
  returning id into v_id;
  return v_id;
end;
$function$;

revoke execute on function public.navy_app_report_submit(text, text, text, timestamptz, timestamptz, integer, integer, numeric, integer, integer, boolean) from public, anon;
grant execute on function public.navy_app_report_submit(text, text, text, timestamptz, timestamptz, integer, integer, numeric, integer, integer, boolean) to authenticated;

create or replace function public.navy_purge_app_reports()
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  n integer;
begin
  delete from public.navy_app_reports where created_at < now() - interval '90 days';
  get diagnostics n = row_count;
  return n;
end;
$function$;

revoke execute on function public.navy_purge_app_reports() from public, anon, authenticated;

-- Daily purge (cron.schedule replaces a job of the same name).
select cron.schedule('navy-app-reports-purge', '37 2 * * *', 'select public.navy_purge_app_reports()');
