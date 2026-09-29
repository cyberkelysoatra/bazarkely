-- =====================================================================================
-- NAVY ay - phase 3B, corrective (seen only on a real phone, 2026-09-28/29):
-- the idle stop never fired because imprecise fixes (indoors, network location: up to
-- 1 253 m of uncertainty, 16 fixes out of 196 in 1 h 40) moved the still point by more
-- than 150 m and restarted the clock. A position now restarts it only when it is farther
-- than 150 m BEYOND its own uncertainty (accuracy_m). Nothing else changes: signature,
-- rules, 200 m rounding, protected zone, no history.
-- Idempotent: can be replayed as is.
-- =====================================================================================

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
  -- The still point: moving more than 150 m BEYOND the fix's own uncertainty (or a new
  -- choice of the driver: available again, "Toujours disponible ?") restarts the idle clock.
  v_still_reset := r.partner_id is null or r.still_since is null or r.still_lat is null
                   or (v_available and r.still_since < s.client_at)
                   or public.navy_geo_m(r.still_lat, r.still_lng, p_lat, p_lng)
                        - least(greatest(coalesce(p_accuracy_m, 0), 0), 100000) > 150;

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
