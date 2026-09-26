-- =====================================================================================
-- NAVY ay - phase 2B2: direct hand-over to the driver (no departure grocer) and prepaid
-- return of a parcel not collected; security leftovers (delete_user_admin); adjustable
-- estimate margin (navy_settings.estimate_margin_pct).
--
-- IDEMPOTENT: every statement can be replayed (if not exists, create or replace,
-- drop ... if exists + create, on conflict, cron.schedule by name, guarded patch).
--
-- SECURITY:
-- - RLS enabled AND forced on the new table; everything revoked from public / anon /
--   authenticated; no client writes a parcel table directly (navy_* SECURITY DEFINER).
-- - Photo of the opened content (hand-over without a witness grocer): PRIVATE bucket
--   navy-documents, path {sender}/parcels/{parcel}/contenu.jpg. Readable by the sender
--   (own folder, 1A policy), operators (1A policy) and the driver of THAT course only
--   while he has to pick it up / carry it (navy_parcel_photo_reader). Purged 30 days
--   after the end of the parcel (navy_document_purges, reason parcel_photo) unless an
--   operator opened a dispute.
-- - The client sees the driver's vehicle photo (to recognise him) only for his own
--   direct hand-over parcel, between acceptance and pick-up.
-- - Distance hand-over place -> arrival grocer: computed by the Edge Function
--   navy-routes (called by the database only, shared secret), never by the phone.
-- - Double confirmation: the client ("remis au chauffeur", or the driver's QR scanned)
--   THEN the driver ("j'ai le colis"). One gesture alone never picks the parcel up.
-- - Return: priced at the CURRENT rates, frozen, paid in advance (credit first, then
--   Orange Money validated by an operator). No offer before it is paid.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. Settings: estimate margin (decision 47 (2))
-- -------------------------------------------------------------------------------------
alter table public.navy_settings add column if not exists estimate_margin_pct integer not null default 30;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'navy_settings_estimate_margin_check') then
    alter table public.navy_settings add constraint navy_settings_estimate_margin_check check (estimate_margin_pct between 0 and 150);
  end if;
end $$;
grant update (estimate_margin_pct) on public.navy_settings to authenticated;

-- Straight-line distance + the margin of the settings (30 % by default), 0.1 km.
-- Only used for a NEW price: a parcel keeps the distance frozen at its order.
create or replace function public.navy_estimated_km(p_lat1 float8, p_lng1 float8, p_lat2 float8, p_lng2 float8)
returns numeric language sql stable security definer set search_path = public as $$
  select round((2 * 6371 * asin(sqrt(
           power(sin(radians(p_lat2 - p_lat1) / 2), 2)
           + cos(radians(p_lat1)) * cos(radians(p_lat2)) * power(sin(radians(p_lng2 - p_lng1) / 2), 2)
         )) * (1 + coalesce((select estimate_margin_pct from public.navy_settings where id), 30) / 100.0))::numeric, 1);
$$;

-- -------------------------------------------------------------------------------------
-- 2. Parcels: departure mode, hand-over, photo, refusal, return
-- -------------------------------------------------------------------------------------
alter table public.navy_parcels add column if not exists departure_mode     text not null default 'epicier';
alter table public.navy_parcels add column if not exists handover_note      text;
alter table public.navy_parcels add column if not exists client_handover_at timestamptz;
alter table public.navy_parcels add column if not exists photo_path         text;
alter table public.navy_parcels add column if not exists photo_at           timestamptz;
alter table public.navy_parcels add column if not exists photo_dispute_at   timestamptz;
alter table public.navy_parcels add column if not exists photo_purged_at    timestamptz;
alter table public.navy_parcels add column if not exists refused_driver_ids uuid[] not null default '{}';
alter table public.navy_parcels add column if not exists refusal_reason     text;
alter table public.navy_parcels add column if not exists return_of          uuid references public.navy_parcels(id) on delete set null;
alter table public.navy_parcels add column if not exists return_parcel_id   uuid references public.navy_parcels(id) on delete set null;
alter table public.navy_parcels add column if not exists return_confirmed_at timestamptz;
alter table public.navy_parcels add column if not exists returned_at        timestamptz;
alter table public.navy_parcels add column if not exists return_reminder_at timestamptz;
alter table public.navy_parcels add column if not exists return_alert_at    timestamptz;

alter table public.navy_parcels alter column depot_partner_id drop not null;

alter table public.navy_parcels drop constraint if exists navy_parcels_departure_mode_check;
alter table public.navy_parcels add constraint navy_parcels_departure_mode_check
  check (departure_mode in ('epicier', 'remise'));
alter table public.navy_parcels drop constraint if exists navy_parcels_depot_by_mode_check;
alter table public.navy_parcels add constraint navy_parcels_depot_by_mode_check
  check ((departure_mode = 'remise') = (depot_partner_id is null));
alter table public.navy_parcels drop constraint if exists navy_parcels_handover_note_check;
alter table public.navy_parcels add constraint navy_parcels_handover_note_check
  check (handover_note is null or length(handover_note) <= 120);
alter table public.navy_parcels drop constraint if exists navy_parcels_status_check;
alter table public.navy_parcels add constraint navy_parcels_status_check
  check (status in ('commande', 'depose', 'chauffeur_trouve', 'pris_en_charge', 'arrive', 'retire', 'annule', 'retourne'));
alter table public.navy_parcels drop constraint if exists navy_parcels_search_state_check;
alter table public.navy_parcels add constraint navy_parcels_search_state_check
  check (search_state in ('recherche', 'attente_client', 'trouve', 'contre_proposition', 'attente_supplement', 'choix_apres_refus'));

-- The 4-digit code is unique among parcels still on their way.
drop index if exists public.navy_parcels_active_code;
create unique index if not exists navy_parcels_active_code on public.navy_parcels (code)
  where status not in ('retire', 'annule', 'retourne');
create unique index if not exists navy_parcels_return_of_idx on public.navy_parcels (return_of) where return_of is not null;
create index if not exists navy_parcels_photo_idx on public.navy_parcels (photo_path) where photo_path is not null;

-- Parcel photos go through the existing purge queue of the private bucket.
alter table public.navy_document_purges drop constraint if exists navy_document_purges_reason_check;
alter table public.navy_document_purges add constraint navy_document_purges_reason_check
  check (reason in ('rejected_final', 'replaced', 'change_rejected', 'ended', 'parcel_photo'));

-- -------------------------------------------------------------------------------------
-- 3. Distance hand-over place -> arrival grocer (OpenRouteService through navy-routes)
-- -------------------------------------------------------------------------------------
create table if not exists public.navy_handover_distances (
  id           uuid primary key default gen_random_uuid(),
  lat          double precision not null check (lat between -90 and 90),
  lng          double precision not null check (lng between -180 and 180),
  arrival_id   uuid not null references public.navy_partners(id) on delete cascade,
  arrival_lat  double precision not null,
  arrival_lng  double precision not null,
  km           numeric check (km >= 0),
  duration_s   integer,
  status       text not null default 'pending' check (status in ('pending', 'ok', 'failed')),
  attempts     integer not null default 0,
  requested_by uuid references public.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  computed_at  timestamptz,
  constraint navy_handover_distances_key unique (lat, lng, arrival_id, arrival_lat, arrival_lng)
);
create index if not exists navy_handover_distances_user_idx on public.navy_handover_distances (requested_by, requested_at);

alter table public.navy_handover_distances enable row level security;
alter table public.navy_handover_distances force row level security;
drop policy if exists navy_handover_distances_select on public.navy_handover_distances;
create policy navy_handover_distances_select on public.navy_handover_distances for select to public using (public.navy_is_operator());
revoke all on public.navy_handover_distances from public, anon, authenticated;
grant select on public.navy_handover_distances to authenticated;

-- Hand-over point rounded to 5 decimals (~1 m): the key of the distance table.
create or replace function public.navy_round5(p float8)
returns float8 language sql immutable set search_path = public as $$
  select round(p::numeric, 5)::float8;
$$;

-- Quote for a direct hand-over (no departure grocer, no depot fee: the CyberKELY share
-- is spread over the two remaining lines). Pure read.
create or replace function public.navy_compute_quote_handover(p_lat float8, p_lng float8, p_arrival uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  a public.navy_partners;
  s public.navy_settings;
  v_lat float8 := public.navy_round5(p_lat);
  v_lng float8 := public.navy_round5(p_lng);
  h public.navy_handover_distances;
  v_km numeric;
  v_src text;
  v_ceiling integer;
  v_pick integer;
  v_bd jsonb;
  v_drivers jsonb;
begin
  if v_lat is null or v_lng is null or v_lat not between -90 and 90 or v_lng not between -180 and 180 then
    raise exception 'navy: hand-over place required' using errcode = '22023';
  end if;
  select * into s from public.navy_settings where id;
  select * into a from public.navy_partners where id = p_arrival and kind = 'epicier' and status = 'approved';
  if not found or not a.is_open or a.shop_lat is null then
    raise exception 'navy: arrival grocer not available' using errcode = '22023';
  end if;
  select * into h from public.navy_handover_distances
   where lat = v_lat and lng = v_lng and arrival_id = a.id and arrival_lat = a.shop_lat and arrival_lng = a.shop_lng;
  if found and h.status = 'ok' and h.km is not null then
    v_km := round(h.km, 1); v_src := 'route';
  else
    v_km := public.navy_estimated_km(v_lat, v_lng, a.shop_lat, a.shop_lng); v_src := 'estimation';
  end if;
  v_ceiling := public.navy_fare(v_km, s.suggested_min_fare, s.suggested_fare_per_5km);
  v_pick := coalesce(a.pickup_fee, s.suggested_pickup_fee, 0);
  v_bd := public.navy_price_breakdown(0, v_ceiling, v_pick, s.cyberkely_share);
  select coalesce(jsonb_agg(jsonb_build_object('partner_id', e.partner_id, 'name', e.name, 'vehicle_type', e.vehicle_type,
                                               'fare', e.fare, 'dest_zone_id', e.dest_zone_id, 'via', e.via) order by e.fare, e.since), '[]'::jsonb)
    into v_drivers
    from public.navy_eligible_drivers(a.zone_id, a.shop_lat, a.shop_lng, v_lat, v_lng, v_km) e
   where e.fare <= v_ceiling;
  return jsonb_build_object(
    'departure_mode', 'remise', 'handover_lat', v_lat, 'handover_lng', v_lng,
    'distance_km', v_km, 'distance_source', v_src, 'distance_pending', coalesce(h.status = 'pending', false),
    'transport_ceiling', v_ceiling, 'depot_fee', 0, 'pickup_fee', v_pick,
    'share', s.cyberkely_share, 'breakdown', v_bd, 'min_total', public.navy_min_total(0, v_pick, s.cyberkely_share),
    'depot_name', 'Remise au chauffeur', 'arrival_name', coalesce(a.shop_name, a.display_name),
    'depot_zone_id', public.navy_zone_for_point(v_lat, v_lng), 'arrival_zone_id', a.zone_id, 'drivers', v_drivers,
    'orange_money_number', s.orange_money_number, 'estimate_margin_pct', s.estimate_margin_pct);
end;
$$;

-- Client: quote of a direct hand-over + credit balance. Asks the road distance ONCE per
-- (place, grocer) to navy-routes (pg_net, after commit); 30 requests per hour per account
-- at most (beyond: the estimate is used). The phone reads it again a few seconds later.
create or replace function public.navy_quote_handover(p_lat float8, p_lng float8, p_arrival uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  a public.navy_partners;
  v_lat float8 := public.navy_round5(p_lat);
  v_lng float8 := public.navy_round5(p_lng);
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'navy_quote_handover: sign-in required' using errcode = '42501';
  end if;
  select * into a from public.navy_partners where id = p_arrival and kind = 'epicier' and status = 'approved'
     and is_open and shop_lat is not null;
  if found and v_lat between -90 and 90 and v_lng between -180 and 180
     and not exists (select 1 from public.navy_handover_distances
                      where lat = v_lat and lng = v_lng and arrival_id = a.id and arrival_lat = a.shop_lat and arrival_lng = a.shop_lng)
     and (select count(*) from public.navy_handover_distances
           where requested_by = v_uid and requested_at > now() - interval '1 hour') < 30 then
    insert into public.navy_handover_distances (lat, lng, arrival_id, arrival_lat, arrival_lng, requested_by)
    values (v_lat, v_lng, a.id, a.shop_lat, a.shop_lng, v_uid)
    on conflict on constraint navy_handover_distances_key do nothing
    returning id into v_id;
    if v_id is not null then
      perform public.navy_call_routes(jsonb_build_object('action', 'handover', 'id', v_id));
    end if;
  end if;
  return public.navy_compute_quote_handover(p_lat, p_lng, p_arrival)
         || jsonb_build_object('credit_balance', public.navy_credit_balance_of(v_uid));
end;
$$;

-- ----- service_role only (Edge Function navy-routes) -----
create or replace function public.navy_handover_work(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  h public.navy_handover_distances;
begin
  update public.navy_handover_distances set attempts = attempts + 1
   where id = p_id and status = 'pending' and attempts < 3
   returning * into h;
  if not found then
    return null;
  end if;
  return jsonb_build_object('lat', h.lat, 'lng', h.lng, 'to_lat', h.arrival_lat, 'to_lng', h.arrival_lng);
end;
$$;

create or replace function public.navy_store_handover_distance(p_id uuid, p_km numeric, p_duration_s integer, p_ok boolean)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.navy_handover_distances
     set km = case when p_ok then round(p_km, 1) end,
         duration_s = case when p_ok then p_duration_s end,
         status = case when p_ok then 'ok' when attempts >= 3 then 'failed' else 'pending' end,
         computed_at = now()
   where id = p_id;
  return found;
end;
$$;

-- -------------------------------------------------------------------------------------
-- 4. Internal machinery
-- -------------------------------------------------------------------------------------

-- Cancel (core): everything acquired (cash, Orange Money, credit used, supplement)
-- becomes credit. Checks are done by the callers.
create or replace function public.navy_cancel_parcel_internal(p_parcel_id uuid, p_role text, p_reason text)
returns public.navy_parcels
language plpgsql security definer set search_path = public as $$
declare
  p public.navy_parcels;
begin
  select * into p from public.navy_parcels where id = p_parcel_id for update;
  if not found or p.status = 'annule' then
    return p;
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
  perform public.navy_log(p.id, p_role, 'annule', p.cancel_reason);
  perform public.navy_notify(p.id, array[p.sender_id, public.navy_partner_user(p.depot_partner_id), p.driver_user_id],
                             'Colis ' || p.code || ' : annulé', '/navy/colis/' || p.id);
  return p;
end;
$$;

-- Paid parcel that needs no drop at a grocer: a direct hand-over (the client keeps the
-- parcel until the driver comes) or a confirmed return (the grocer already holds it:
-- the drop is confirmed automatically). Then the driver search starts.
create or replace function public.navy_auto_ready(p_parcel_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  p public.navy_parcels;
begin
  select * into p from public.navy_parcels where id = p_parcel_id for update;
  if not found or p.status <> 'commande' or p.payment_status <> 'paye' or coalesce(p.supplement_status, 'paye') <> 'paye' then
    return;
  end if;
  if p.departure_mode = 'remise' then
    update public.navy_parcels set status = 'depose', updated_at = now() where id = p.id;
    perform public.navy_log(p.id, 'systeme', 'pret_pour_remise', 'Paiement acquis');
  elsif p.return_of is not null and p.return_confirmed_at is not null then
    update public.navy_parcels set status = 'depose', deposited_at = now(), sealed_confirmed = true, updated_at = now() where id = p.id;
    perform public.navy_log(p.id, 'systeme', 'depose', 'Retour : le colis est déjà chez l''épicier');
    perform public.navy_notify(p.id, array[public.navy_partner_user(p.depot_partner_id)],
                               'Colis ' || p.code || ' : retour à remettre à un chauffeur', '/navy/epicier/colis');
  else
    return;
  end if;
  perform public.navy_dispatch(p.id);
end;
$$;

-- Return priced at the CURRENT rates (both grocers + transport + CyberKELY share,
-- rounded to 100 Ar). The departure grocer (who holds the parcel) need not be open.
create or replace function public.navy_return_breakdown(p_depot uuid, p_arrival uuid)
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
begin
  select * into s from public.navy_settings where id;
  select * into d from public.navy_partners where id = p_depot and kind = 'epicier';
  select * into a from public.navy_partners where id = p_arrival and kind = 'epicier' and status = 'approved';
  if d.id is null or a.id is null or a.shop_lat is null or d.shop_lat is null or d.id = a.id then
    raise exception 'navy: return grocer not available' using errcode = '22023';
  end if;
  select k.km, k.source into v_km, v_src from public.navy_pair_km(d.id, a.id) k;
  v_ceiling := public.navy_fare(v_km, s.suggested_min_fare, s.suggested_fare_per_5km);
  v_dep := coalesce(d.depot_fee, s.suggested_depot_fee, 0);
  v_pick := coalesce(a.pickup_fee, s.suggested_pickup_fee, 0);
  return jsonb_build_object(
    'distance_km', v_km, 'distance_source', v_src, 'transport_ceiling', v_ceiling, 'depot_fee', v_dep, 'pickup_fee', v_pick,
    'share', s.cyberkely_share, 'breakdown', public.navy_price_breakdown(v_dep, v_ceiling, v_pick, s.cyberkely_share),
    'depot_name', coalesce(d.shop_name, d.display_name), 'arrival_name', coalesce(a.shop_name, a.display_name),
    'arrival_id', a.id, 'arrival_zone_id', a.zone_id, 'orange_money_number', s.orange_money_number);
end;
$$;

-- Freeze the price of a confirmed return (once), credit first, then Orange Money.
create or replace function public.navy_price_return(p_parcel_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  r public.navy_parcels;
  b jsonb;
  v_total integer;
  v_used integer;
  v_due integer;
  v_line jsonb;
  v_seq integer := 0;
begin
  select * into r from public.navy_parcels where id = p_parcel_id for update;
  if not found or r.return_of is null or r.return_confirmed_at is null
     or exists (select 1 from public.navy_parcel_prices where parcel_id = r.id) then
    return;
  end if;
  b := public.navy_return_breakdown(r.depot_partner_id, r.arrival_partner_id);
  v_total := (b->'breakdown'->>'total')::integer;
  perform pg_advisory_xact_lock(hashtext('navy_credit:' || r.sender_id::text));
  v_used := least(greatest(public.navy_credit_balance_of(r.sender_id), 0), v_total);
  v_due := v_total - v_used;
  insert into public.navy_parcel_prices (parcel_id, depot_fee, pickup_fee, transport_ceiling, share_fixed, rounding,
                                         navy_total, total_price, initial_total, credit_used, amount_due)
  values (r.id, (b->>'depot_fee')::integer, (b->>'pickup_fee')::integer, (b->>'transport_ceiling')::integer,
          (b->>'share')::integer, (b->'breakdown'->>'rounding')::integer, (b->'breakdown'->>'navy_total')::integer,
          v_total, v_total, v_used, v_due);
  for v_line in select * from jsonb_array_elements(b->'breakdown'->'lines') loop
    v_seq := v_seq + 1;
    insert into public.navy_parcel_price_lines (parcel_id, seq, kind, partner_id, label, base_amount, navy_share, shown_amount)
    values (r.id, v_seq, v_line->>'kind',
            case v_line->>'kind' when 'depot' then r.depot_partner_id when 'pickup' then r.arrival_partner_id end,
            case v_line->>'kind' when 'depot' then r.depot_name when 'pickup' then r.arrival_name else 'Transport' end,
            (v_line->>'base')::integer, (v_line->>'navy_share')::integer, (v_line->>'shown')::integer);
  end loop;
  if v_used > 0 then
    insert into public.navy_credit_movements (user_id, amount, kind, parcel_id, note)
    values (r.sender_id, -v_used, 'utilisation', r.id, 'Retour');
  end if;
  update public.navy_parcels
     set distance_km = (b->>'distance_km')::numeric, distance_source = b->>'distance_source',
         payment_status = case when v_due = 0 then 'paye' else 'attente_reference' end,
         paid_at = case when v_due = 0 then now() end, updated_at = now()
   where id = r.id;
  perform public.navy_log(r.id, 'systeme', 'retour_prix_fige',
                          case when v_due = 0 then 'Payé par l''avoir NAVY' else 'À payer par Orange Money' end);
  perform public.navy_auto_ready(r.id);
end;
$$;

-- Create the return of a parcel marked "retour à organiser": sender = recipient, from
-- the arrival grocer back to the departure grocer (direct hand-over: the grocer nearest
-- to the hand-over place, proposed by default, confirmed by the sender).
create or replace function public.navy_create_return(p_parcel_id uuid)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare
  o public.navy_parcels;
  a public.navy_partners;
  v_id uuid := gen_random_uuid();
  v_arrival uuid;
  v_code text;
  v_wcode text;
  v_try integer := 0;
  v_confirmed boolean;
  v_km numeric;
  v_src text;
begin
  select * into o from public.navy_parcels where id = p_parcel_id for update;
  if not found or o.return_of is not null or o.status <> 'arrive' or o.return_status is distinct from 'a_organiser' then
    return null;
  end if;
  if o.return_parcel_id is not null then
    return o.return_parcel_id;   -- replay
  end if;
  v_confirmed := o.departure_mode = 'epicier';
  if v_confirmed then
    v_arrival := o.depot_partner_id;
  else
    select p.id into v_arrival from public.navy_partners p
     where p.kind = 'epicier' and p.status = 'approved' and p.is_open and p.shop_lat is not null and p.id <> o.arrival_partner_id
     order by public.navy_geo_m(o.depot_lat, o.depot_lng, p.shop_lat, p.shop_lng), p.id
     limit 1;
  end if;
  select * into a from public.navy_partners where id = v_arrival and kind = 'epicier' and status = 'approved' and shop_lat is not null;
  if a.id is null then
    perform public.navy_log(o.id, 'systeme', 'retour_impossible', 'Aucune épicerie de retour disponible');
    return null;
  end if;
  select k.km, k.source into v_km, v_src from public.navy_pair_km(o.arrival_partner_id, a.id) k;
  v_wcode := lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint % 1000000))::text, 6, '0');
  loop
    v_try := v_try + 1;
    v_code := lpad(((('x' || encode(extensions.gen_random_bytes(2), 'hex'))::bit(16)::integer % 10000))::text, 4, '0');
    begin
      insert into public.navy_parcels (
        id, code, sender_id, sender_name, sender_phone, recipient_name, recipient_phone, recipient_user_id,
        depot_partner_id, depot_name, depot_phone, depot_lat, depot_lng, depot_zone_id,
        arrival_partner_id, arrival_name, arrival_phone, arrival_lat, arrival_lng, arrival_zone_id,
        distance_km, distance_source, category, declared_value, payment_method, payment_status,
        driver_mode, departure_mode, return_of, return_confirmed_at)
      values (
        v_id, v_code, o.sender_id, o.sender_name, o.sender_phone, coalesce(o.sender_name, 'Expéditeur'),
        coalesce(o.sender_phone, ''), o.sender_id,
        o.arrival_partner_id, o.arrival_name, o.arrival_phone, o.arrival_lat, o.arrival_lng, o.arrival_zone_id,
        a.id, coalesce(a.shop_name, a.display_name), a.phone, a.shop_lat, a.shop_lng, a.zone_id,
        v_km, v_src, o.category, o.declared_value, 'orange_money', 'attente_reference',
        'auto', 'epicier', o.id, case when v_confirmed then now() end);
      exit;
    exception when unique_violation then
      if v_try >= 40 then raise; end if;
    end;
  end loop;
  insert into public.navy_parcel_secrets (parcel_id, withdraw_code) values (v_id, v_wcode);
  update public.navy_parcels set return_parcel_id = v_id, updated_at = now() where id = o.id;
  perform public.navy_log(o.id, 'systeme', 'retour_cree', 'Colis retour ' || v_code);
  perform public.navy_log(v_id, 'systeme', 'commande', 'Retour du colis ' || o.code);
  if v_confirmed then
    perform public.navy_price_return(v_id);
  end if;
  perform public.navy_notify(v_id, array[o.sender_id],
                             'Colis ' || o.code || case when (select payment_status from public.navy_parcels where id = v_id) = 'paye'
                                                        then ' : retour payé par votre avoir' else ' : retour à payer' end,
                             '/navy/colis/' || v_id);
  perform public.navy_notify(v_id, array[public.navy_partner_user(o.arrival_partner_id)],
                             'Colis ' || o.code || ' : retour organisé, gardez le colis', '/navy/epicier/colis');
  return v_id;
end;
$$;

-- -------------------------------------------------------------------------------------
-- 5. Functions of 2A / 2B1 recreated for 2B2
-- -------------------------------------------------------------------------------------

drop function if exists public.navy_create_parcel(uuid, uuid, uuid, text, text, text, integer, text, uuid, text, integer);

create or replace function public.navy_create_parcel(
  p_id uuid, p_depot uuid, p_arrival uuid, p_recipient_name text, p_recipient_phone text,
  p_category text, p_declared_value integer, p_driver_mode text, p_chosen_driver uuid, p_payment_method text,
  p_proposed_total integer default null, p_departure_mode text default 'epicier',
  p_handover_lat float8 default null, p_handover_lng float8 default null, p_handover_note text default null,
  p_sender_phone text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid uuid := auth.uid();
  v_existing public.navy_parcels;
  q jsonb;
  d public.navy_partners;
  a public.navy_partners;
  v_remise boolean := coalesce(p_departure_mode, 'epicier') = 'remise';
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
  v_note text := nullif(btrim(coalesce(p_handover_note, '')), '');
  v_sender_phone text;
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
  if p_driver_mode not in ('auto', 'choix', 'prix') or p_payment_method not in ('especes', 'orange_money')
     or coalesce(p_departure_mode, 'epicier') not in ('epicier', 'remise') then
    raise exception 'navy_create_parcel: invalid option' using errcode = '22023';
  end if;
  if length(btrim(coalesce(p_recipient_name, ''))) = 0 then
    raise exception 'navy_create_parcel: recipient name required' using errcode = '22023';
  end if;
  v_key := public.navy_phone_key(p_recipient_phone);
  if v_key is null or length(v_key) < 9 then
    raise exception 'navy_create_parcel: recipient phone required' using errcode = '22023';
  end if;

  if v_remise then
    -- Direct hand-over (decisions 16, 17): Orange Money only, the driver calls the client.
    if p_payment_method <> 'orange_money' then
      raise exception 'navy_create_parcel: direct hand-over needs Orange Money' using errcode = '22023';
    end if;
    if length(coalesce(public.navy_phone_key(p_sender_phone), '')) < 9 then
      raise exception 'navy_create_parcel: sender phone required' using errcode = '22023';
    end if;
    if v_note is not null and length(v_note) > 120 then
      raise exception 'navy_create_parcel: landmark too long' using errcode = '22023';
    end if;
    q := public.navy_compute_quote_handover(p_handover_lat, p_handover_lng, p_arrival);
  else
    q := public.navy_compute_quote(p_depot, p_arrival);
  end if;
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
    v_ceiling := p_proposed_total - (q->>'depot_fee')::integer - (q->>'pickup_fee')::integer - (q->>'share')::integer;
    v_bd := public.navy_price_breakdown((q->>'depot_fee')::integer, v_ceiling, (q->>'pickup_fee')::integer, (q->>'share')::integer);
  else
    v_ceiling := (q->>'transport_ceiling')::integer;
    v_bd := q->'breakdown';
  end if;
  v_total := (v_bd->>'total')::integer;

  perform pg_advisory_xact_lock(hashtext('navy_credit:' || v_uid::text));
  v_balance := public.navy_credit_balance_of(v_uid);
  v_used := least(greatest(v_balance, 0), v_total);
  v_due := v_total - v_used;
  if p_payment_method = 'orange_money' and v_due > 0 and coalesce(btrim(q->>'orange_money_number'), '') = '' then
    raise exception 'navy_create_parcel: Orange Money number not set yet' using errcode = '22023';
  end if;

  if not v_remise then
    select * into d from public.navy_partners where id = p_depot;
  end if;
  select * into a from public.navy_partners where id = p_arrival;
  select * into v_user from public.users where id = v_uid;
  v_sender_phone := case when v_remise then btrim(p_sender_phone) else v_user.phone end;

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
        driver_mode, chosen_driver_id, chosen_fare, proposed_total, departure_mode, handover_note)
      values (
        p_id, v_code, v_uid, coalesce(v_user.username, split_part(v_user.email, '@', 1)), v_sender_phone,
        btrim(p_recipient_name), btrim(p_recipient_phone), v_recipient,
        case when v_remise then null else d.id end,
        case when v_remise then 'Remise au chauffeur' else coalesce(d.shop_name, d.display_name) end,
        case when v_remise then null else d.phone end,
        case when v_remise then (q->>'handover_lat')::float8 else d.shop_lat end,
        case when v_remise then (q->>'handover_lng')::float8 else d.shop_lng end,
        case when v_remise then (q->>'depot_zone_id')::uuid else d.zone_id end,
        a.id, coalesce(a.shop_name, a.display_name), a.phone, a.shop_lat, a.shop_lng, a.zone_id,
        (q->>'distance_km')::numeric, q->>'distance_source', p_category, p_declared_value, p_payment_method,
        case when v_due = 0 then 'paye' when p_payment_method = 'especes' then 'a_payer_depot' else 'attente_reference' end,
        case when v_due = 0 then now() end,
        p_driver_mode, case when p_driver_mode = 'choix' then p_chosen_driver end, v_chosen_fare,
        case when p_driver_mode = 'prix' then p_proposed_total end,
        case when v_remise then 'remise' else 'epicier' end, case when v_remise then v_note end);
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
    -- Direct hand-over: no departure grocer line (its CyberKELY part is 0 anyway).
    continue when v_remise and v_line->>'kind' = 'depot';
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
                          || case when v_remise then ' · remise directe au chauffeur' else '' end
                          || case when p_driver_mode = 'prix' then ' · prix proposé par le client' else '' end);
  if not v_remise then
    perform public.navy_notify(p_id, array[public.navy_partner_user(d.id)], 'Colis ' || v_code || ' : à recevoir au dépôt',
                               '/navy/epicier/colis');
  end if;
  perform public.navy_analyse_search(p_id, true);
  perform public.navy_auto_ready(p_id);   -- direct hand-over already paid (credit): search now
  return jsonb_build_object('id', p_id, 'code', v_code, 'withdraw_code', v_wcode, 'replay', false,
                            'credit_used', v_used, 'amount_due', v_due, 'total', v_total);
end;
$$;

-- Counter-proposal (2B1) excluding drivers who refused this parcel at hand-over.
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
  if pr.parcel_id is null then
    return false;
  end if;
  if p_pre and exists (
       select 1 from public.navy_eligible_drivers(p.arrival_zone_id, p.arrival_lat, p.arrival_lng, p.depot_lat, p.depot_lng, p.distance_km) e
        where not (e.partner_id = any(p.refused_driver_ids))
          and ((p.driver_mode = 'prix' and not (e.hide_low and e.fare > pr.transport_ceiling))
               or (p.driver_mode <> 'prix' and e.fare <= pr.transport_ceiling))) then
    return false;
  end if;

  delete from public.navy_parcel_counter_offers where parcel_id = p.id;
  insert into public.navy_parcel_counter_offers (parcel_id, rank, driver_partner_id, driver_name, vehicle_type, fare,
                                                 new_total, supplement, near_m)
  select p.id, row_number() over (order by x.near_m nulls last, x.fare, x.partner_id), x.partner_id, x.name, x.vehicle_type, x.fare,
         x.total, greatest(x.total - pr.total_price, 0), null::double precision
    from (select e.*, (public.navy_price_breakdown(pr.depot_fee, e.fare, pr.pickup_fee, pr.share_fixed)->>'total')::integer as total
            from public.navy_eligible_drivers(p.arrival_zone_id, p.arrival_lat, p.arrival_lng, p.depot_lat, p.depot_lng, p.distance_km) e
           where e.fare > pr.transport_ceiling and not (e.partner_id = any(p.refused_driver_ids))
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

-- Dispatch (2B1) + 2B2: waits while the client decides after a refusal; never offers the
-- parcel again to a driver who refused it at hand-over.
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
     or p.search_state in ('attente_client', 'contre_proposition', 'attente_supplement', 'choix_apres_refus') then
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

  if p.driver_mode = 'prix' then
    for e in select x.* from public.navy_eligible_drivers(p.arrival_zone_id, p.arrival_lat, p.arrival_lng,
                                                          p.depot_lat, p.depot_lng, p.distance_km) x
              where not (x.hide_low and x.fare > v_ceiling)
                and not (x.partner_id = any(p.refused_driver_ids))
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
      perform public.navy_analyse_search(p.id, false);
    end if;
    return;
  end if;

  if exists (select 1 from public.navy_parcel_offers
              where parcel_id = p.id and status = 'envoyee' and expires_at > now()) then
    return;
  end if;

  if p.driver_mode = 'choix' and p.chosen_driver_id is not null
     and not (p.chosen_driver_id = any(p.refused_driver_ids))
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
       and not (x.partner_id = any(p.refused_driver_ids))
       and not exists (select 1 from public.navy_parcel_offers o
                        where o.parcel_id = p.id and o.round = p.search_round and o.driver_partner_id = x.partner_id)
       and (p.driver_mode = 'auto' or p.chosen_fare is null or x.fare <= p.chosen_fare)
     order by x.fare, x.since, x.partner_id
     limit 1;
  end if;

  if v_pid is null then
    if p.driver_mode = 'choix' then
      select exists (select 1 from public.navy_eligible_drivers(p.arrival_zone_id, p.arrival_lat, p.arrival_lng,
                                                                p.depot_lat, p.depot_lng, p.distance_km) x
                      where x.fare <= v_ceiling
                        and not (x.partner_id = any(p.refused_driver_ids))
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
    perform public.navy_analyse_search(p.id, false);
    return;
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

-- Hand-over done by both sides → picked up. Direct hand-over: the client's gesture
-- replaces the grocer's. A return that leaves the grocer ends the original parcel.
create or replace function public.navy_complete_handover(p_parcel_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  p public.navy_parcels;
begin
  select * into p from public.navy_parcels where id = p_parcel_id for update;
  if p.status = 'chauffeur_trouve' and p.handover_driver_at is not null
     and (p.handover_grocer_at is not null or (p.departure_mode = 'remise' and p.client_handover_at is not null)) then
    update public.navy_parcels set status = 'pris_en_charge', picked_up_at = now(), updated_at = now() where id = p.id;
    perform public.navy_log(p.id, 'systeme', 'pris_en_charge');
    perform public.navy_notify(p.id, array[p.sender_id, p.recipient_user_id, public.navy_partner_user(p.arrival_partner_id)],
                               'Colis ' || p.code || ' : pris en charge', '/navy/colis/' || p.id);
    if p.return_of is not null then
      update public.navy_parcels set status = 'retourne', returned_at = now(), updated_at = now()
       where id = p.return_of and status = 'arrive';
      if found then
        perform public.navy_log(p.return_of, 'systeme', 'retour_parti', 'Colis retour ' || p.code);
      end if;
    end if;
  end if;
end;
$$;

-- Driver: confirms he has the parcel. Second half; only after the grocer's gesture, or
-- (direct hand-over) after the client's.
create or replace function public.navy_handover_driver(p_parcel_id uuid)
returns public.navy_parcels
language plpgsql security definer set search_path = public as $$
declare
  p public.navy_parcels;
begin
  select * into p from public.navy_parcels where id = p_parcel_id for update;
  if not found or auth.uid() is null or p.driver_user_id is distinct from auth.uid() then
    raise exception 'navy_handover_driver: own course only' using errcode = '42501';
  end if;
  if p.status = 'pris_en_charge' or (p.status = 'chauffeur_trouve' and p.handover_driver_at is not null) then
    return p;   -- replay
  end if;
  if p.status <> 'chauffeur_trouve' then
    raise exception 'navy_handover_driver: not allowed from %', p.status using errcode = '22023';
  end if;
  if p.departure_mode = 'remise' then
    if p.client_handover_at is null then
      raise exception 'navy_handover_driver: the client must hand the parcel over first' using errcode = '22023';
    end if;
  elsif p.handover_grocer_at is null then
    raise exception 'navy_handover_driver: the grocer must hand the parcel over first' using errcode = '22023';
  end if;
  update public.navy_parcels set handover_driver_at = now(), updated_at = now() where id = p.id;
  perform public.navy_log(p.id, 'chauffeur', 'prise_en_charge_confirmee');
  perform public.navy_complete_handover(p.id);
  select * into p from public.navy_parcels where id = p.id;
  return p;
end;
$$;

-- Depot grocer: drop (2B1). Never for a direct hand-over (no depot) nor a return (the
-- drop is confirmed automatically once the return is paid).
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
  if p.return_of is not null then
    raise exception 'navy_deposit_parcel: return parcel, drop confirmed once paid' using errcode = '22023';
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

-- Sender: Orange Money reference (2B1). A return must have its grocer confirmed first.
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
  if p.return_of is not null and p.return_confirmed_at is null then
    raise exception 'navy_submit_payment_reference: return grocer to confirm first' using errcode = '22023';
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

-- Operator: validate / refuse (2B1). A validated direct hand-over or return is then
-- ready for the driver search (navy_auto_ready).
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
      perform public.navy_auto_ready(p.id);
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
    perform public.navy_auto_ready(p.id);
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

-- Cancel. Sender: while not dropped; direct hand-over: while no driver has it, or after
-- a driver's refusal (credit). Never a return (the operator decides). Operator: while
-- not picked up.
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
  if p.sender_id = auth.uid() and p.return_of is null
     and (p.status = 'commande'
          or (p.departure_mode = 'remise' and p.status = 'depose' and p.driver_partner_id is null)) then
    v_role := 'client';
  elsif v_op and p.status in ('commande', 'depose', 'chauffeur_trouve') then
    v_role := 'operatrice';
  else
    raise exception 'navy_cancel_parcel: too late (%)', p.status using errcode = '22023';
  end if;
  return public.navy_cancel_parcel_internal(p.id, v_role, p_reason);
end;
$$;

-- Counter-proposal choice (2B1). Direct hand-over / return: the supplement is never
-- cash at a depot (there is none / it is prepaid): credit then Orange Money.
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
  elsif p.status = 'commande' and p.departure_mode = 'epicier' and p.return_of is null then
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
    continue when p.departure_mode = 'remise' and v_line->>'kind' = 'depot';
    v_seq := v_seq + 1;
    insert into public.navy_parcel_price_lines (parcel_id, seq, kind, partner_id, label, base_amount, navy_share, shown_amount)
    values (p.id, v_seq, v_line->>'kind',
            case v_line->>'kind' when 'depot' then p.depot_partner_id when 'pickup' then p.arrival_partner_id end,
            case v_line->>'kind' when 'depot' then p.depot_name when 'pickup' then p.arrival_name else 'Transport' end,
            (v_line->>'base')::integer, (v_line->>'navy_share')::integer, (v_line->>'shown')::integer);
  end loop;
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

-- Operator: not collected for more than 7 days → "retour à organiser" → the return
-- parcel is created at once (a replay creates it if it is still missing).
create or replace function public.navy_mark_return(p_parcel_id uuid)
returns public.navy_parcels
language plpgsql security definer set search_path = public as $$
declare
  p public.navy_parcels;
begin
  if not public.navy_is_operator() then
    raise exception 'navy_mark_return: operator only' using errcode = '42501';
  end if;
  select * into p from public.navy_parcels where id = p_parcel_id for update;
  if not found or p.status <> 'arrive' then
    raise exception 'navy_mark_return: parcel not waiting at the arrival grocer' using errcode = '22023';
  end if;
  if p.return_of is not null then
    raise exception 'navy_mark_return: a return is not returned again' using errcode = '22023';
  end if;
  if p.return_status is distinct from 'a_organiser' then
    if p.arrived_at > now() - interval '7 days' then
      raise exception 'navy_mark_return: only after 7 days' using errcode = '22023';
    end if;
    update public.navy_parcels set return_status = 'a_organiser', updated_at = now() where id = p.id;
    perform public.navy_log(p.id, 'operatrice', 'retour_a_organiser');
  end if;
  perform public.navy_create_return(p.id);
  select * into p from public.navy_parcels where id = p.id;
  return p;
end;
$$;

-- Arrival grocer: withdrawal code (2A). If the recipient finally comes while a return is
-- organised and not gone yet, the return is cancelled (what was paid becomes credit).
create or replace function public.navy_withdraw_parcel(p_parcel_id uuid, p_withdraw_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  p public.navy_parcels;
  v_code text;
  v_ret public.navy_parcels;
begin
  select * into p from public.navy_parcels where id = p_parcel_id for update;
  if not found or not public.navy_owns_partner(p.arrival_partner_id) then
    raise exception 'navy_withdraw_parcel: arrival grocer only' using errcode = '42501';
  end if;
  if p.status = 'retire' then
    return jsonb_build_object('ok', true, 'already', true);
  end if;
  if p.status <> 'arrive' then
    raise exception 'navy_withdraw_parcel: not allowed from %', p.status using errcode = '22023';
  end if;
  if p.withdraw_blocked_at is not null then
    return jsonb_build_object('ok', false, 'blocked', true, 'remaining', 0);
  end if;
  select withdraw_code into v_code from public.navy_parcel_secrets where parcel_id = p.id;
  if v_code is null or btrim(coalesce(p_withdraw_code, '')) <> v_code then
    update public.navy_parcels
       set withdraw_attempts = withdraw_attempts + 1,
           withdraw_blocked_at = case when withdraw_attempts + 1 >= 5 then now() end,
           updated_at = now()
     where id = p.id returning * into p;
    perform public.navy_log(p.id, 'epicier', 'code_retrait_faux', 'Essai ' || p.withdraw_attempts || ' sur 5');
    if p.withdraw_blocked_at is not null then
      perform public.navy_log(p.id, 'systeme', 'code_retrait_bloque');
      perform public.navy_notify(p.id, public.navy_operator_ids(), 'Colis ' || p.code || ' : code de retrait bloqué',
                                 '/navy/operatrice/colis');
    end if;
    return jsonb_build_object('ok', false, 'blocked', p.withdraw_blocked_at is not null,
                              'remaining', greatest(5 - p.withdraw_attempts, 0));
  end if;
  update public.navy_parcels set status = 'retire', withdrawn_at = now(), updated_at = now() where id = p.id returning * into p;
  perform public.navy_log(p.id, 'epicier', 'retire');
  perform public.navy_notify(p.id, array[p.sender_id, p.recipient_user_id, p.driver_user_id],
                             'Colis ' || p.code || ' : livré', '/navy/colis/' || p.id);
  if p.return_parcel_id is not null then
    select * into v_ret from public.navy_parcels where id = p.return_parcel_id for update;
    if v_ret.status in ('commande', 'depose', 'chauffeur_trouve') then
      perform public.navy_cancel_parcel_internal(v_ret.id, 'systeme', 'Retiré par le destinataire avant le départ du retour');
    end if;
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- Purge (1B) + 2B2: a purged parcel photo is also cleared from its parcel.
create or replace function public.navy_mark_documents_purged(p_paths text[])
returns setof text
language plpgsql security definer set search_path = public, storage as $$
declare
  v_path text;
begin
  if not public.navy_is_operator() then
    raise exception 'navy_mark_documents_purged: operator only' using errcode = '42501';
  end if;
  for v_path in
    select q.path from public.navy_document_purges q
     where q.path = any(coalesce(p_paths, array[]::text[])) and q.purged_at is null and q.due_at <= now()
       and not exists (select 1 from storage.objects o where o.bucket_id = 'navy-documents' and o.name = q.path)
  loop
    update public.navy_document_purges set purged_at = now() where path = v_path;
    update public.navy_partners
       set id_doc_path        = nullif(id_doc_path, v_path),
           nif_doc_path       = nullif(nif_doc_path, v_path),
           stat_doc_path      = nullif(stat_doc_path, v_path),
           shop_photo_path    = nullif(shop_photo_path, v_path),
           vehicle_photo_path = nullif(vehicle_photo_path, v_path),
           license_doc_path   = nullif(license_doc_path, v_path)
     where v_path in (id_doc_path, nif_doc_path, stat_doc_path, shop_photo_path, vehicle_photo_path, license_doc_path)
       and public.navy_path_owned(v_path, user_id, id);
    update public.navy_parcels set photo_path = null, photo_purged_at = now(), updated_at = now()
     where photo_path = v_path;
    return next v_path;
  end loop;
end;
$$;

-- Server clock (2B1) + 2B2: unpaid returns (24 h reminder to the sender, 3 days alert to
-- operators), no "30 min" alert while the client decides after a refusal, parcel photos
-- queued for deletion 30 days after the end of the parcel (unless a dispute is open),
-- hand-over distances forgotten after 7 days (they locate a client).
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
  v_photos integer := 0;
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

  return jsonb_build_object('expired', v_expired, 'relaunched', v_relaunched, 'alerts', v_alerts,
                            'reminders', v_reminders, 'counters', v_counters, 'routes_erased', v_routes,
                            'photos_queued', v_photos);
end;
$$;

-- -------------------------------------------------------------------------------------
-- 6. New client / driver / operator functions
-- -------------------------------------------------------------------------------------

-- Sender: photo of the opened content, uploaded to {sender}/parcels/{parcel}/contenu.jpg
-- (checked here: own folder, this parcel, file really present). Before the hand-over.
create or replace function public.navy_set_parcel_photo(p_parcel_id uuid, p_path text)
returns public.navy_parcels
language plpgsql security definer set search_path = public, storage as $$
declare
  p public.navy_parcels;
  v_expected text;
begin
  select * into p from public.navy_parcels where id = p_parcel_id for update;
  if not found or auth.uid() is null or p.sender_id <> auth.uid() then
    raise exception 'navy_set_parcel_photo: own parcel only' using errcode = '42501';
  end if;
  v_expected := auth.uid()::text || '/parcels/' || p.id::text || '/contenu.jpg';
  if p.photo_path = v_expected and p.photo_at is not null
     and exists (select 1 from storage.objects o where o.bucket_id = 'navy-documents' and o.name = v_expected
                   and o.updated_at <= p.photo_at) then
    return p;   -- replay
  end if;
  if p.departure_mode <> 'remise' or p.status not in ('commande', 'depose', 'chauffeur_trouve') or p.client_handover_at is not null then
    raise exception 'navy_set_parcel_photo: not expected now' using errcode = '22023';
  end if;
  if p_path is distinct from v_expected then
    raise exception 'navy_set_parcel_photo: invalid path' using errcode = '22023';
  end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'navy-documents' and o.name = v_expected) then
    raise exception 'navy_set_parcel_photo: photo not uploaded' using errcode = '22023';
  end if;
  update public.navy_parcels set photo_path = v_expected, photo_at = now(), updated_at = now() where id = p.id returning * into p;
  perform public.navy_log(p.id, 'client', 'photo_contenu');
  return p;
end;
$$;

-- Storage policy helper: the driver of THIS course reads the content photo while he
-- picks the parcel up / carries it; the client reads the vehicle photo of HIS driver
-- (direct hand-over, between acceptance and pick-up).
create or replace function public.navy_parcel_photo_reader(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    exists (select 1 from public.navy_parcels p
             where p.photo_path = p_name and p.driver_user_id = auth.uid()
               and p.status in ('chauffeur_trouve', 'pris_en_charge'))
    or exists (select 1 from public.navy_parcels p join public.navy_partners d on d.id = p.driver_partner_id
                where d.vehicle_photo_path = p_name and p.sender_id = auth.uid()
                  and p.departure_mode = 'remise' and p.status = 'chauffeur_trouve'));
$$;

drop policy if exists navy_parcel_photos_select on storage.objects;
create policy navy_parcel_photos_select on storage.objects
  for select to public
  using (case when bucket_id = 'navy-documents' then public.navy_parcel_photo_reader(name) else false end);

-- The proof cannot be replaced once the parcel has been handed over (or has moved on):
-- RESTRICTIVE policy, ANDed with the 1A "own folder" update policy.
create or replace function public.navy_parcel_photo_locked(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.navy_parcels p
                  where p.photo_path = p_name
                    and (p.client_handover_at is not null or p.status not in ('commande', 'depose', 'chauffeur_trouve')));
$$;

drop policy if exists navy_parcel_photos_locked on storage.objects;
create policy navy_parcel_photos_locked on storage.objects
  as restrictive for update to public
  using (case when bucket_id = 'navy-documents' then not public.navy_parcel_photo_locked(name) else true end);

-- Sender (direct hand-over, driver found → picked up) and operators: who is coming.
create or replace function public.navy_parcel_driver_card(p_parcel_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  p public.navy_parcels;
  d public.navy_partners;
begin
  select * into p from public.navy_parcels where id = p_parcel_id;
  if not found or auth.uid() is null or (p.sender_id <> auth.uid() and not public.navy_is_operator()) then
    raise exception 'navy_parcel_driver_card: own parcel only' using errcode = '42501';
  end if;
  if p.driver_partner_id is null or p.status not in ('chauffeur_trouve', 'pris_en_charge') then
    return null;
  end if;
  select * into d from public.navy_partners where id = p.driver_partner_id;
  return jsonb_build_object('name', p.driver_name, 'vehicle_type', p.driver_vehicle, 'plate', p.driver_plate,
                            'phone', p.driver_phone,
                            'vehicle_photo_path', case when p.departure_mode = 'remise' and p.status = 'chauffeur_trouve'
                                                       then d.vehicle_photo_path end);
end;
$$;

-- Sender, first half of the direct hand-over: "remis au chauffeur" (or the driver's QR
-- scanned: p_driver_partner_id must then be the expected driver). Photo required.
create or replace function public.navy_client_handover(p_parcel_id uuid, p_driver_partner_id uuid default null)
returns public.navy_parcels
language plpgsql security definer set search_path = public as $$
declare
  p public.navy_parcels;
begin
  select * into p from public.navy_parcels where id = p_parcel_id for update;
  if not found or auth.uid() is null or p.sender_id <> auth.uid() then
    raise exception 'navy_client_handover: own parcel only' using errcode = '42501';
  end if;
  if p.status = 'pris_en_charge' or (p.status = 'chauffeur_trouve' and p.client_handover_at is not null) then
    return p;   -- replay
  end if;
  if p.departure_mode <> 'remise' or p.status <> 'chauffeur_trouve' then
    raise exception 'navy_client_handover: not allowed from %', p.status using errcode = '22023';
  end if;
  if p_driver_partner_id is not null and p_driver_partner_id is distinct from p.driver_partner_id then
    raise exception 'navy_client_handover: this is not the expected driver' using errcode = '22023';
  end if;
  if p.photo_path is null then
    raise exception 'navy_client_handover: photo of the content required' using errcode = '22023';
  end if;
  update public.navy_parcels set client_handover_at = now(), updated_at = now() where id = p.id;
  perform public.navy_log(p.id, 'client', 'remis_par_le_client',
                          case when p_driver_partner_id is not null then 'QR du chauffeur scanné' else 'En attente de la confirmation du chauffeur' end);
  perform public.navy_notify(p.id, array[p.driver_user_id], 'Colis ' || p.code || ' : confirmez la prise en charge', '/navy/courses');
  perform public.navy_complete_handover(p.id);
  select * into p from public.navy_parcels where id = p.id;
  return p;
end;
$$;

-- Driver: refuses the parcel at the hand-over (reason required). He is never offered
-- this parcel again; the client chooses: search another driver or cancel (credit).
create or replace function public.navy_refuse_handover(p_parcel_id uuid, p_reason text)
returns public.navy_parcels
language plpgsql security definer set search_path = public as $$
declare
  p public.navy_parcels;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select * into p from public.navy_parcels where id = p_parcel_id for update;
  if not found or auth.uid() is null or p.driver_user_id is distinct from auth.uid() then
    raise exception 'navy_refuse_handover: own course only' using errcode = '42501';
  end if;
  if p.departure_mode <> 'remise' or p.status <> 'chauffeur_trouve' or p.handover_driver_at is not null then
    raise exception 'navy_refuse_handover: not allowed from %', p.status using errcode = '22023';
  end if;
  if v_reason is null or length(v_reason) < 3 then
    raise exception 'navy_refuse_handover: reason required' using errcode = '22023';
  end if;
  update public.navy_parcel_prices set credit_due = 0, credit_reason = null where parcel_id = p.id;
  perform public.navy_credit_sync(p.id);
  update public.navy_parcel_offers set status = 'refusee', answered_at = now()
   where parcel_id = p.id and driver_partner_id = p.driver_partner_id and status = 'acceptee';
  update public.navy_parcels
     set status = 'depose', search_state = 'choix_apres_refus',
         refused_driver_ids = array(select distinct unnest(refused_driver_ids || p.driver_partner_id)),
         refusal_reason = left(v_reason, 200),
         driver_partner_id = null, driver_user_id = null, driver_name = null, driver_phone = null,
         driver_vehicle = null, driver_plate = null, driver_fare = null, driver_found_at = null,
         client_handover_at = null, updated_at = now()
   where id = p.id returning * into p;
  perform public.navy_log(p.id, 'chauffeur', 'remise_refusee', left(v_reason, 200));
  perform public.navy_notify(p.id, array[p.sender_id], 'Colis ' || p.code || ' : le chauffeur a refusé, choisissez la suite',
                             '/navy/colis/' || p.id);
  return p;
end;
$$;

-- Sender, after a driver's refusal: search another driver, or cancel (credit).
create or replace function public.navy_after_refusal(p_parcel_id uuid, p_choice text)
returns public.navy_parcels
language plpgsql security definer set search_path = public as $$
declare
  p public.navy_parcels;
begin
  select * into p from public.navy_parcels where id = p_parcel_id for update;
  if not found or auth.uid() is null or p.sender_id <> auth.uid() then
    raise exception 'navy_after_refusal: own parcel only' using errcode = '42501';
  end if;
  if p_choice not in ('rechercher', 'annuler') then
    raise exception 'navy_after_refusal: invalid choice' using errcode = '22023';
  end if;
  if p.search_state is distinct from 'choix_apres_refus' then
    if (p_choice = 'annuler' and p.status = 'annule') or (p_choice = 'rechercher' and p.status <> 'annule') then
      return p;   -- replay
    end if;
    raise exception 'navy_after_refusal: not expected now' using errcode = '22023';
  end if;
  if p_choice = 'annuler' then
    return public.navy_cancel_parcel_internal(p.id, 'client', 'Annulé après le refus du chauffeur');
  end if;
  update public.navy_parcels
     set search_state = 'recherche', search_round = search_round + 1, search_started_at = now(),
         next_relaunch_at = now() + interval '5 minutes', no_driver_alert_at = null, updated_at = now()
   where id = p.id;
  perform public.navy_log(p.id, 'client', 'nouvelle_recherche_apres_refus');
  perform public.navy_dispatch(p.id);
  select * into p from public.navy_parcels where id = p.id;
  return p;
end;
$$;

-- Operator: open / close a dispute on the content photo (an open dispute keeps it).
create or replace function public.navy_set_photo_dispute(p_parcel_id uuid, p_open boolean)
returns public.navy_parcels
language plpgsql security definer set search_path = public as $$
declare
  p public.navy_parcels;
begin
  if not public.navy_is_operator() then
    raise exception 'navy_set_photo_dispute: operator only' using errcode = '42501';
  end if;
  select * into p from public.navy_parcels where id = p_parcel_id for update;
  if not found then
    raise exception 'navy_set_photo_dispute: unknown parcel' using errcode = 'P0002';
  end if;
  if coalesce(p_open, false) then
    if p.photo_path is null then
      raise exception 'navy_set_photo_dispute: no photo' using errcode = '22023';
    end if;
    if p.photo_dispute_at is null then
      update public.navy_parcels set photo_dispute_at = now(), updated_at = now() where id = p.id;
      delete from public.navy_document_purges where path = p.photo_path and purged_at is null;
      perform public.navy_log(p.id, 'operatrice', 'litige_ouvert');
    end if;
  elsif p.photo_dispute_at is not null then
    update public.navy_parcels set photo_dispute_at = null, updated_at = now() where id = p.id;
    perform public.navy_log(p.id, 'operatrice', 'litige_clos');
  end if;
  select * into p from public.navy_parcels where id = p.id;
  return p;
end;
$$;

-- Sender: price of a return for a return grocer (direct hand-over original: the sender
-- chooses it; default = the one proposed at creation).
create or replace function public.navy_return_quote(p_parcel_id uuid, p_arrival uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  r public.navy_parcels;
  a public.navy_partners;
begin
  select * into r from public.navy_parcels where id = p_parcel_id;
  if not found or auth.uid() is null or (r.sender_id <> auth.uid() and not public.navy_is_operator()) then
    raise exception 'navy_return_quote: own parcel only' using errcode = '42501';
  end if;
  if r.return_of is null then
    raise exception 'navy_return_quote: not a return' using errcode = '22023';
  end if;
  select * into a from public.navy_partners where id = coalesce(p_arrival, r.arrival_partner_id)
     and kind = 'epicier' and status = 'approved' and is_open and shop_lat is not null;
  if a.id is null then
    raise exception 'navy: arrival grocer not available' using errcode = '22023';
  end if;
  return public.navy_return_breakdown(r.depot_partner_id, a.id)
         || jsonb_build_object('credit_balance', public.navy_credit_balance_of(r.sender_id),
                               'confirmed', r.return_confirmed_at is not null);
end;
$$;

-- Sender: confirm the return grocer (direct hand-over original) → price frozen.
create or replace function public.navy_confirm_return(p_parcel_id uuid, p_arrival uuid)
returns public.navy_parcels
language plpgsql security definer set search_path = public as $$
declare
  r public.navy_parcels;
  a public.navy_partners;
  v_km numeric;
  v_src text;
begin
  select * into r from public.navy_parcels where id = p_parcel_id for update;
  if not found or auth.uid() is null or r.sender_id <> auth.uid() then
    raise exception 'navy_confirm_return: own parcel only' using errcode = '42501';
  end if;
  if r.return_of is null or r.status <> 'commande' then
    raise exception 'navy_confirm_return: not expected now' using errcode = '22023';
  end if;
  if r.return_confirmed_at is not null then
    return r;   -- replay
  end if;
  select * into a from public.navy_partners where id = p_arrival and kind = 'epicier' and status = 'approved'
     and is_open and shop_lat is not null and id <> r.depot_partner_id;
  if a.id is null then
    raise exception 'navy: arrival grocer not available' using errcode = '22023';
  end if;
  select k.km, k.source into v_km, v_src from public.navy_pair_km(r.depot_partner_id, a.id) k;
  update public.navy_parcels
     set arrival_partner_id = a.id, arrival_name = coalesce(a.shop_name, a.display_name), arrival_phone = a.phone,
         arrival_lat = a.shop_lat, arrival_lng = a.shop_lng, arrival_zone_id = a.zone_id,
         distance_km = v_km, distance_source = v_src, return_confirmed_at = now(), updated_at = now()
   where id = r.id;
  perform public.navy_log(r.id, 'client', 'retour_epicerie_choisie', coalesce(a.shop_name, a.display_name));
  perform public.navy_price_return(r.id);
  select * into r from public.navy_parcels where id = r.id;
  return r;
end;
$$;

-- -------------------------------------------------------------------------------------
-- 7. Security leftovers: delete_user_admin (report securite-users-colonnes/RAPPORT-SUITE)
--    - admin check anchored on auth.users (public.is_joel()), like navy_is_admin();
--    - not executable by anon / public. Signature and body otherwise unchanged
--      (guarded patch, P10: the body is patched in SQL, never retyped).
-- -------------------------------------------------------------------------------------
do $patch$
declare
  v_src text := pg_get_functiondef('public.delete_user_admin(uuid)'::regprocedure);
  v_new text;
begin
  if position('IF NOT public.is_joel() THEN' in v_src) > 0 then
    return;   -- already patched
  end if;
  v_new := regexp_replace(v_src,
                          'IF\s*\(\s*SELECT\s+auth\.jwt\(\)\s*->>\s*''email''\s*\)\s*!=\s*''joelsoatra@gmail\.com''\s*THEN',
                          'IF NOT public.is_joel() THEN');
  if position('IF NOT public.is_joel() THEN' in v_new) = 0 or position('auth.jwt()' in v_new) > 0 then
    raise exception 'delete_user_admin patch: expected admin check not found';
  end if;
  execute v_new;
end
$patch$;
revoke execute on function public.delete_user_admin(uuid) from public, anon;
grant execute on function public.delete_user_admin(uuid) to authenticated;

-- -------------------------------------------------------------------------------------
-- 8. Function privileges (P7: EXECUTE is granted to anon explicitly by default)
-- -------------------------------------------------------------------------------------
revoke execute on function public.navy_estimated_km(float8, float8, float8, float8) from public, anon;
revoke execute on function public.navy_round5(float8) from public, anon, authenticated;
revoke execute on function public.navy_compute_quote_handover(float8, float8, uuid) from public, anon, authenticated;
revoke execute on function public.navy_quote_handover(float8, float8, uuid) from public, anon;
revoke execute on function public.navy_handover_work(uuid) from public, anon, authenticated;
revoke execute on function public.navy_store_handover_distance(uuid, numeric, integer, boolean) from public, anon, authenticated;
revoke execute on function public.navy_cancel_parcel_internal(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.navy_auto_ready(uuid) from public, anon, authenticated;
revoke execute on function public.navy_return_breakdown(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.navy_price_return(uuid) from public, anon, authenticated;
revoke execute on function public.navy_create_return(uuid) from public, anon, authenticated;
revoke execute on function public.navy_create_parcel(uuid, uuid, uuid, text, text, text, integer, text, uuid, text, integer, text, float8, float8, text, text) from public, anon;
revoke execute on function public.navy_analyse_search(uuid, boolean) from public, anon, authenticated;
revoke execute on function public.navy_dispatch(uuid) from public, anon, authenticated;
revoke execute on function public.navy_complete_handover(uuid) from public, anon, authenticated;
revoke execute on function public.navy_handover_driver(uuid) from public, anon;
revoke execute on function public.navy_deposit_parcel(uuid, boolean, boolean) from public, anon;
revoke execute on function public.navy_submit_payment_reference(uuid, uuid, text) from public, anon;
revoke execute on function public.navy_decide_payment(uuid, text, text) from public, anon;
revoke execute on function public.navy_cancel_parcel(uuid, text) from public, anon;
revoke execute on function public.navy_choose_counter(uuid, uuid) from public, anon;
revoke execute on function public.navy_mark_return(uuid) from public, anon;
revoke execute on function public.navy_withdraw_parcel(uuid, text) from public, anon;
revoke execute on function public.navy_mark_documents_purged(text[]) from public, anon;
revoke execute on function public.navy_tick() from public, anon, authenticated;
revoke execute on function public.navy_set_parcel_photo(uuid, text) from public, anon;
revoke execute on function public.navy_parcel_photo_reader(text) from public, anon;
revoke execute on function public.navy_parcel_photo_locked(text) from public, anon;
revoke execute on function public.navy_parcel_driver_card(uuid) from public, anon;
revoke execute on function public.navy_client_handover(uuid, uuid) from public, anon;
revoke execute on function public.navy_refuse_handover(uuid, text) from public, anon;
revoke execute on function public.navy_after_refusal(uuid, text) from public, anon;
revoke execute on function public.navy_set_photo_dispute(uuid, boolean) from public, anon;
revoke execute on function public.navy_return_quote(uuid, uuid) from public, anon;
revoke execute on function public.navy_confirm_return(uuid, uuid) from public, anon;

grant execute on function public.navy_estimated_km(float8, float8, float8, float8) to authenticated;
grant execute on function public.navy_quote_handover(float8, float8, uuid) to authenticated;
grant execute on function public.navy_handover_work(uuid) to service_role;
grant execute on function public.navy_store_handover_distance(uuid, numeric, integer, boolean) to service_role;
grant execute on function public.navy_create_parcel(uuid, uuid, uuid, text, text, text, integer, text, uuid, text, integer, text, float8, float8, text, text) to authenticated;
grant execute on function public.navy_handover_driver(uuid) to authenticated;
grant execute on function public.navy_deposit_parcel(uuid, boolean, boolean) to authenticated;
grant execute on function public.navy_submit_payment_reference(uuid, uuid, text) to authenticated;
grant execute on function public.navy_decide_payment(uuid, text, text) to authenticated;
grant execute on function public.navy_cancel_parcel(uuid, text) to authenticated;
grant execute on function public.navy_choose_counter(uuid, uuid) to authenticated;
grant execute on function public.navy_mark_return(uuid) to authenticated;
grant execute on function public.navy_withdraw_parcel(uuid, text) to authenticated;
grant execute on function public.navy_mark_documents_purged(text[]) to authenticated;
-- storage policy helper: evaluated for the signed-in reader
grant execute on function public.navy_parcel_photo_reader(text) to authenticated;
grant execute on function public.navy_parcel_photo_locked(text) to authenticated;
grant execute on function public.navy_set_parcel_photo(uuid, text) to authenticated;
grant execute on function public.navy_parcel_driver_card(uuid) to authenticated;
grant execute on function public.navy_client_handover(uuid, uuid) to authenticated;
grant execute on function public.navy_refuse_handover(uuid, text) to authenticated;
grant execute on function public.navy_after_refusal(uuid, text) to authenticated;
grant execute on function public.navy_set_photo_dispute(uuid, boolean) to authenticated;
grant execute on function public.navy_return_quote(uuid, uuid) to authenticated;
grant execute on function public.navy_confirm_return(uuid, uuid) to authenticated;

select cron.schedule('navy-tick', '10 seconds', 'select public.navy_tick()');

comment on table public.navy_handover_distances is
  'NAVY ay (2B2): road distance from a direct hand-over place to an arrival grocer (OpenRouteService through navy-routes). Operators only; forgotten after 7 days (it locates a client).';
comment on column public.navy_parcels.photo_path is
  'NAVY ay (2B2): photo of the opened content (direct hand-over), private bucket navy-documents. Sender, operators, driver of the course only. Purged 30 days after the end of the parcel unless photo_dispute_at is set.';

notify pgrst, 'reload schema';
