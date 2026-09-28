-- =====================================================================================
-- NAVY ay - phase 3B: position with the screen off, offers ringing like a call,
-- guided set-up screen (decisions 25, 48 (5), 49, 50, 56).
--   1. navy_driver_positions: when did the driver stop moving (still_since, still point).
--      navy_report_position() keeps its signature and its rules (200 m rounding, 800 to
--      1 200 m protected zone, no history are unchanged); it only maintains the still
--      point: moving more than 150 m from it restarts the clock.
--   2. navy_settings.idle_stop_minutes (60 by default, 15 to 480, set by the operators):
--      navy_tick() turns "Pas disponible" an available driver WITHOUT a course whose
--      position has not moved by more than 150 m for that long, erases his position and
--      route and notifies him ("Touchez pour redevenir disponible" -> /navy/direction).
--      The 3 h expiry of the direction stays in place.
--   3. push_fcm_tokens: Firebase Cloud Messaging tokens of the NAVY ay Android app (one
--      per device). RLS enabled and forced, anon has no right at all; written ONLY through
--      push_fcm_register() / push_fcm_forget() (SECURITY DEFINER, the account itself).
--      push_subscriptions (Web Push) is not touched. The Edge Function send-push reads
--      this table with the service role and sends through FCM HTTP v1 as well.
--   4. navy_notify(): same signature; an offer notification (/navy/offres) now carries
--      its parcel (/navy/offres?colis=<id>) so that the app's call-like alert can accept
--      or refuse THAT offer. send-push only rings for a recipient who really holds a live
--      offer for that parcel (never a client).
-- Idempotent: can be replayed as is.
-- =====================================================================================

-- ------------------------------------------------------------------ 1. still point
alter table public.navy_driver_positions add column if not exists still_since timestamptz;
alter table public.navy_driver_positions add column if not exists still_lat double precision;
alter table public.navy_driver_positions add column if not exists still_lng double precision;

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
  -- Phase 3B: the still point. Moving more than 150 m from it (or a new choice of the
  -- driver: available again, "Toujours disponible ?") restarts the idle clock.
  v_still_reset := r.partner_id is null or r.still_since is null or r.still_lat is null
                   or (v_available and r.still_since < s.client_at)
                   or public.navy_geo_m(r.still_lat, r.still_lng, p_lat, p_lng) > 150;

  insert into public.navy_driver_positions as t
         (partner_id, user_id, lat, lng, heading, speed_mps, accuracy_m, at, anchor_lat, anchor_lng, anchor_at,
          still_since, still_lat, still_lng)
  values (p_partner_id, v_uid, p_lat, p_lng,
          case when p_heading between 0 and 360 then p_heading end, v_speed,
          case when p_accuracy_m >= 0 then least(p_accuracy_m, 100000) end, now(),
          p_lat, p_lng, now(), now(), p_lat, p_lng)
  on conflict (partner_id) do update
     set lat = excluded.lat, lng = excluded.lng, heading = excluded.heading, speed_mps = excluded.speed_mps,
         accuracy_m = excluded.accuracy_m, at = excluded.at,
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

-- ------------------------------------------------------------------ 2. idle stop setting
alter table public.navy_settings add column if not exists idle_stop_minutes integer not null default 60;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'navy_settings_idle_stop_minutes_check') then
    alter table public.navy_settings
      add constraint navy_settings_idle_stop_minutes_check check (idle_stop_minutes between 15 and 480);
  end if;
end $$;
grant update (idle_stop_minutes) on public.navy_settings to authenticated;

-- "1 h", "1 h 30", "45 min"
create or replace function public.navy_duration_label(p_minutes integer)
 returns text
 language sql
 immutable
 set search_path to 'public'
as $function$
  select case
           when p_minutes < 60 then p_minutes || ' min'
           when p_minutes % 60 = 0 then (p_minutes / 60) || ' h'
           else (p_minutes / 60) || ' h ' || lpad((p_minutes % 60)::text, 2, '0')
         end;
$function$;
revoke execute on function public.navy_duration_label(integer) from public, anon;

-- One idle driver stopped: status, position and route erased, notification.
create or replace function public.navy_stop_idle_drivers()
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_minutes integer;
  r record;
  v_n integer := 0;
  v_req bigint;
  v_err text;
  v_title text;
begin
  select coalesce(idle_stop_minutes, 60) into v_minutes from public.navy_settings where id;
  v_minutes := coalesce(v_minutes, 60);
  v_title := 'Vous étiez immobile depuis ' || public.navy_duration_label(v_minutes)
             || ' : vous n''êtes plus disponible.';
  for r in select p.partner_id, p.user_id
             from public.navy_driver_positions p
             join public.navy_driver_status s on s.partner_id = p.partner_id
            where p.still_since is not null
              and p.still_since <= now() - make_interval(mins => v_minutes)
              and s.available and s.available_until > now()
              and s.client_at <= p.still_since
              and not public.navy_driver_in_course(p.partner_id)
            for update of s skip locked loop
    update public.navy_driver_status
       set available = false, available_until = null, client_at = now(), updated_at = now()
     where partner_id = r.partner_id and available;
    delete from public.navy_driver_positions where partner_id = r.partner_id;
    delete from public.navy_driver_routes where partner_id = r.partner_id;
    v_req := null;
    v_err := null;
    begin
      v_req := public.notify_users(array[r.user_id], v_title, 'Touchez pour redevenir disponible.', '/navy/direction');
    exception when others then
      v_err := sqlerrm;
    end;
    insert into public.navy_notify_log (parcel_id, user_ids, title, url, request_id, error)
    values (null, array[r.user_id], v_title, '/navy/direction', v_req, v_err);
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$function$;
revoke execute on function public.navy_stop_idle_drivers() from public, anon, authenticated;

-- navy_tick(): unchanged, plus step 11 (idle drivers).
create or replace function public.navy_tick()
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  r record;
  v_expired integer := 0;
  v_relaunched integer := 0;
  v_alerts integer := 0;
  v_reminders integer := 0;
  v_counters integer := 0;
  v_routes integer := 0;
  v_photos integer := 0;
  v_idle integer := 0;
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

  -- 2. every 5 minutes: counter-proposal or a new round
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

  -- 2b. safety net + "Je propose mon prix" late drivers
  for r in select id from public.navy_parcels
            where status = 'depose' and payment_status = 'paye' and coalesce(supplement_status, 'paye') = 'paye'
              and (search_started_at is null or (driver_mode = 'prix' and search_state = 'recherche')) loop
    perform public.navy_dispatch(r.id);
  end loop;

  -- 2c. before the drop: price too low for every driver -> counter-proposal (every 5 min)
  for r in select id from public.navy_parcels
            where status = 'commande' and counter_state is null
              and (precheck_at is null or precheck_at <= now() - interval '5 minutes') loop
    update public.navy_parcels set precheck_at = now() where id = r.id;
    if public.navy_analyse_search(r.id, true) then
      v_counters := v_counters + 1;
    end if;
  end loop;

  -- 3. no driver after 30 minutes -> operators
  for r in select id, code from public.navy_parcels
            where status = 'depose' and search_started_at <= now() - interval '30 minutes' and no_driver_alert_at is null
              and search_state is distinct from 'choix_apres_refus' loop
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

  -- 5. not collected after 3 days -> operators
  for r in select id, code from public.navy_parcels
            where status = 'arrive' and arrived_at <= now() - interval '3 days' and alert_3d_at is null loop
    update public.navy_parcels set alert_3d_at = now(), updated_at = now() where id = r.id;
    perform public.navy_log(r.id, 'systeme', 'alerte_non_retire_3j');
    perform public.navy_notify(r.id, public.navy_operator_ids(), 'Colis ' || r.code || ' : non retiré depuis 3 jours',
                               '/navy/operatrice/colis');
    v_alerts := v_alerts + 1;
  end loop;

  -- 6. over 7 days -> operators may mark "retour à organiser"
  for r in select id, code from public.navy_parcels
            where status = 'arrive' and arrived_at <= now() - interval '7 days' and overdue_7d_at is null
              and return_of is null loop
    update public.navy_parcels set overdue_7d_at = now(), updated_at = now() where id = r.id;
    perform public.navy_log(r.id, 'systeme', 'alerte_non_retire_7j');
    perform public.navy_notify(r.id, public.navy_operator_ids(), 'Colis ' || r.code || ' : retour à organiser',
                               '/navy/operatrice/colis');
    v_alerts := v_alerts + 1;
  end loop;

  -- 6b. return not paid: reminder to the sender after 24 h, operators after 3 days
  for r in select id, code, sender_id from public.navy_parcels
            where return_of is not null and status = 'commande' and payment_status <> 'paye'
              and ordered_at <= now() - interval '24 hours' and return_reminder_at is null loop
    update public.navy_parcels set return_reminder_at = now(), updated_at = now() where id = r.id;
    perform public.navy_log(r.id, 'systeme', 'rappel_retour_24h');
    perform public.navy_notify(r.id, array[r.sender_id], 'Colis ' || r.code || ' : retour à payer', '/navy/colis/' || r.id);
    v_reminders := v_reminders + 1;
  end loop;
  for r in select id, code from public.navy_parcels
            where return_of is not null and status = 'commande' and payment_status <> 'paye'
              and ordered_at <= now() - interval '3 days' and return_alert_at is null loop
    update public.navy_parcels set return_alert_at = now(), updated_at = now() where id = r.id;
    perform public.navy_log(r.id, 'systeme', 'alerte_retour_non_paye_3j');
    perform public.navy_notify(r.id, public.navy_operator_ids(), 'Colis ' || r.code || ' : retour non payé depuis 3 jours',
                               '/navy/operatrice/colis');
    v_alerts := v_alerts + 1;
  end loop;

  -- 7. driver position and route erased when the direction expires (or is stopped)
  delete from public.navy_driver_routes dr
   where dr.expires_at <= now()
      or not exists (select 1 from public.navy_driver_status d
                      where d.partner_id = dr.partner_id and d.available and d.available_until > now());
  get diagnostics v_routes = row_count;
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

  -- 9. photo of the content: deleted 30 days after the end of the parcel, unless a
  --    dispute is open (queued; the operator's app deletes through the Storage API)
  insert into public.navy_document_purges (path, partner_id, reason, due_at)
  select p.photo_path, null, 'parcel_photo', now()
    from public.navy_parcels p
   where p.photo_path is not null and p.photo_dispute_at is null
     and p.status in ('retire', 'annule', 'retourne')
     and coalesce(p.withdrawn_at, p.cancelled_at, p.returned_at, p.updated_at) <= now() - interval '30 days'
  on conflict (path) do nothing;
  get diagnostics v_photos = row_count;

  -- 10. hand-over distances forgotten after 7 days; still pending after 1 min: asked
  --     again (3 attempts at most, counted by navy_handover_work)
  delete from public.navy_handover_distances where requested_at < now() - interval '7 days';
  for r in select id from public.navy_handover_distances
            where status = 'pending' and attempts between 1 and 2
              and requested_at <= now() - interval '1 minute' and requested_at > now() - interval '1 hour'
              and coalesce(computed_at, requested_at) <= now() - interval '1 minute' loop
    update public.navy_handover_distances set computed_at = now() where id = r.id;
    perform public.navy_call_routes(jsonb_build_object('action', 'handover', 'id', r.id));
  end loop;

  -- 11. phase 3B: available driver without a course, still (150 m) for idle_stop_minutes
  v_idle := public.navy_stop_idle_drivers();

  return jsonb_build_object('expired', v_expired, 'relaunched', v_relaunched, 'alerts', v_alerts,
                            'reminders', v_reminders, 'counters', v_counters, 'routes_erased', v_routes,
                            'photos_queued', v_photos, 'idle_stopped', v_idle);
end;
$function$;
revoke execute on function public.navy_tick() from public, anon, authenticated;

-- ------------------------------------------------------------------ 3. FCM tokens
create table if not exists public.push_fcm_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null unique,
  platform text not null default 'android',
  app_version text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_used_at timestamptz,
  failures integer not null default 0,
  constraint push_fcm_tokens_token_check check (length(token) between 20 and 4096),
  constraint push_fcm_tokens_platform_check check (platform in ('android'))
);
create index if not exists push_fcm_tokens_user_idx on public.push_fcm_tokens (user_id);

alter table public.push_fcm_tokens enable row level security;
alter table public.push_fcm_tokens force row level security;
drop policy if exists push_fcm_tokens_select_own on public.push_fcm_tokens;
create policy push_fcm_tokens_select_own on public.push_fcm_tokens
  for select to public using (user_id = auth.uid());
-- No write policy: writes go through the two functions below only.
revoke all on table public.push_fcm_tokens from public, anon, authenticated;
grant select on table public.push_fcm_tokens to authenticated;

-- Registers (or moves to the signed-in account) the token of THIS device.
create or replace function public.push_fcm_register(p_token text, p_platform text default 'android', p_app_version text default null)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'push_fcm_register: sign-in required' using errcode = '42501';
  end if;
  if p_token is null or length(p_token) not between 20 and 4096 or p_token !~ '^[A-Za-z0-9:_-]+$' then
    raise exception 'push_fcm_register: invalid token' using errcode = '22023';
  end if;
  if coalesce(p_platform, 'android') <> 'android' then
    raise exception 'push_fcm_register: invalid platform' using errcode = '22023';
  end if;
  insert into public.push_fcm_tokens as t (user_id, token, platform, app_version, created_at, last_seen_at, failures)
  values (v_uid, p_token, 'android', left(p_app_version, 20), now(), now(), 0)
  on conflict (token) do update
     set user_id = v_uid, app_version = coalesce(left(excluded.app_version, 20), t.app_version),
         last_seen_at = now(), failures = 0,
         created_at = case when t.user_id = v_uid then t.created_at else now() end;
  -- At most 10 devices per account: the oldest ones go.
  delete from public.push_fcm_tokens
   where user_id = v_uid
     and id in (select id from public.push_fcm_tokens where user_id = v_uid
                 order by last_seen_at desc offset 10);
end;
$function$;

-- Forgets the token of THIS device (sign-out), only if it belongs to the caller.
create or replace function public.push_fcm_forget(p_token text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    raise exception 'push_fcm_forget: sign-in required' using errcode = '42501';
  end if;
  delete from public.push_fcm_tokens where token = p_token and user_id = auth.uid();
end;
$function$;

revoke execute on function public.push_fcm_register(text, text, text) from public, anon;
revoke execute on function public.push_fcm_forget(text) from public, anon;
grant execute on function public.push_fcm_register(text, text, text) to authenticated;
grant execute on function public.push_fcm_forget(text) to authenticated;

-- ------------------------------------------------------------------ 4. offer link
create or replace function public.navy_notify(p_parcel_id uuid, p_user_ids uuid[], p_title text, p_url text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_ids uuid[];
  v_req bigint;
  v_err text;
  v_url text := p_url;
begin
  select coalesce(array_agg(distinct u), array[]::uuid[]) into v_ids
    from unnest(coalesce(p_user_ids, array[]::uuid[])) u where u is not null;
  if coalesce(array_length(v_ids, 1), 0) = 0 then
    return;
  end if;
  -- Phase 3B: an offer names its parcel (the app's alert accepts / refuses THAT offer).
  if v_url = '/navy/offres' and p_parcel_id is not null then
    v_url := '/navy/offres?colis=' || p_parcel_id;
  end if;
  begin
    v_req := public.notify_users(v_ids, p_title, 'Ouvrez NAVY ay pour voir le détail.', v_url);
  exception when others then
    v_err := sqlerrm;
  end;
  insert into public.navy_notify_log (parcel_id, user_ids, title, url, request_id, error)
  values (p_parcel_id, v_ids, p_title, v_url, v_req, v_err);
end;
$function$;
revoke execute on function public.navy_notify(uuid, uuid[], text, text) from public, anon, authenticated;
