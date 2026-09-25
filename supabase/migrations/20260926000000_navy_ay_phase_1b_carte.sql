-- =====================================================================================
-- NAVY ay - phase 1B : zones, grocer shop position, driver direction, change requests
-- of approved partners, document retention (purge queue).
--
-- IDEMPOTENT: every statement can be replayed (if not exists, create or replace,
-- drop ... if exists + create, on conflict do nothing).
--
-- SECURITY:
-- - RLS enabled AND forced on every new table; everything revoked from public / anon /
--   authenticated (Supabase grants them by default, P7 table variant), then only the
--   strict minimum granted back.
-- - Every SECURITY DEFINER function has a fixed search_path.
-- - Computed / decision columns (zone_id, shop_location_verified_*, suspension_reason,
--   rejection_final, ended_at, documents_purge_after) are never granted to clients.
-- - Storage objects cannot be deleted in SQL (storage.protect_delete): deletion goes
--   through the Storage API, allowed to operators ONLY for paths queued and due in
--   navy_document_purges; the server then checks that the file is really gone.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. Geometry helpers (polygon = jsonb array of [lat, lng] points)
-- -------------------------------------------------------------------------------------
create or replace function public.navy_valid_polygon(p jsonb)
returns boolean language sql immutable set search_path = public as $$
  select jsonb_typeof(p) = 'array'
     and jsonb_array_length(p) between 3 and 200
     and not exists (
       select 1 from jsonb_array_elements(p) e
        where jsonb_typeof(e) <> 'array' or jsonb_array_length(e) <> 2
           or jsonb_typeof(e->0) <> 'number' or jsonb_typeof(e->1) <> 'number'
           or (e->>0)::float8 not between -90 and 90
           or (e->>1)::float8 not between -180 and 180);
$$;

-- Ray casting, x = lng, y = lat (the island is small: planar test is enough).
create or replace function public.navy_point_in_polygon(p_lat float8, p_lng float8, p jsonb)
returns boolean language plpgsql immutable set search_path = public as $$
declare
  n int := jsonb_array_length(p);
  i int;
  j int;
  yi float8; xi float8; yj float8; xj float8;
  inside boolean := false;
begin
  if p_lat is null or p_lng is null or n is null or n < 3 then
    return false;
  end if;
  j := n - 1;
  for i in 0 .. n - 1 loop
    yi := (p->i->>0)::float8; xi := (p->i->>1)::float8;
    yj := (p->j->>0)::float8; xj := (p->j->>1)::float8;
    if ((yi > p_lat) <> (yj > p_lat))
       and (p_lng < (xj - xi) * (p_lat - yi) / (yj - yi) + xi) then
      inside := not inside;
    end if;
    j := i;
  end loop;
  return inside;
end;
$$;

-- -------------------------------------------------------------------------------------
-- 2. Tables
-- -------------------------------------------------------------------------------------
create table if not exists public.navy_zones (
  id          uuid primary key,                        -- client-generated id
  name        text not null check (length(btrim(name)) between 1 and 60),
  polygon     jsonb not null check (public.navy_valid_polygon(polygon)),
  color       text not null default '#E9B824' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order  integer not null default 0,
  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists navy_zones_sort_idx on public.navy_zones (sort_order, created_at);

-- First zone in the order that contains the point (zones may overlap: order wins).
create or replace function public.navy_zone_for_point(p_lat float8, p_lng float8)
returns uuid language sql stable security definer set search_path = public as $$
  select z.id from public.navy_zones z
   where public.navy_point_in_polygon(p_lat, p_lng, z.polygon)
   order by z.sort_order, z.created_at, z.id
   limit 1;
$$;

alter table public.navy_partners add column if not exists shop_location_set_at      timestamptz;
alter table public.navy_partners add column if not exists shop_location_verified_at timestamptz;
alter table public.navy_partners add column if not exists shop_location_verified_by uuid references public.users(id) on delete set null;
alter table public.navy_partners add column if not exists zone_id                   uuid references public.navy_zones(id) on delete set null;
alter table public.navy_partners add column if not exists suspension_reason         text;
alter table public.navy_partners add column if not exists rejection_final           boolean not null default false;
alter table public.navy_partners add column if not exists ended_at                  timestamptz;
alter table public.navy_partners add column if not exists documents_purge_after     timestamptz;

-- New status 'ended' (end of partnership, distinct from suspension).
alter table public.navy_partners drop constraint if exists navy_partners_status_check;
alter table public.navy_partners add constraint navy_partners_status_check
  check (status in ('pending', 'approved', 'rejected', 'suspended', 'ended'));

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'navy_partners_shop_position_check') then
    alter table public.navy_partners add constraint navy_partners_shop_position_check
      check ((shop_lat is null) = (shop_lng is null)
             and (shop_lat is null or (shop_lat between -90 and 90 and shop_lng between -180 and 180)));
  end if;
end $$;

create table if not exists public.navy_driver_status (
  partner_id      uuid primary key references public.navy_partners(id) on delete cascade,
  user_id         uuid not null references public.users(id) on delete cascade,
  available       boolean not null default false,
  dest_lat        double precision check (dest_lat is null or dest_lat between -90 and 90),
  dest_lng        double precision check (dest_lng is null or dest_lng between -180 and 180),
  dest_zone_id    uuid references public.navy_zones(id) on delete set null,
  -- 3 h after the driver's last choice: past this time the driver counts as
  -- unavailable, nothing is written (readers compare with now()).
  available_until timestamptz,
  -- time of the choice ON THE PHONE: an older replayed choice never overwrites a newer one
  client_at       timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists navy_driver_status_user_idx on public.navy_driver_status (user_id);

create table if not exists public.navy_partner_changes (
  id               uuid primary key,                   -- client-generated id
  partner_id       uuid not null references public.navy_partners(id) on delete cascade,
  requested_by     uuid not null references public.users(id) on delete cascade,
  status           text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  changes          jsonb not null default '{}'::jsonb check (jsonb_typeof(changes) = 'object'),
  rejection_reason text,
  decided_by       uuid references public.users(id) on delete set null,
  decided_at       timestamptz,
  created_at       timestamptz not null default now()
);
create unique index if not exists navy_partner_changes_one_pending
  on public.navy_partner_changes (partner_id) where status = 'pending';
create index if not exists navy_partner_changes_status_idx on public.navy_partner_changes (status, created_at);

-- Documents to delete from the private bucket. Filled by the server only.
-- RETENTION (decision of JOEL, 2026-09-25) -- DURATIONS TO BE CONFIRMED BY A LAWYER:
--   final refusal = now ; replaced by an approved change = now ;
--   end of partnership = ended_at + 12 months.
create table if not exists public.navy_document_purges (
  path       text primary key,
  partner_id uuid references public.navy_partners(id) on delete set null,
  reason     text not null check (reason in ('rejected_final', 'replaced', 'change_rejected', 'ended')),
  due_at     timestamptz not null,
  purged_at  timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists navy_document_purges_due_idx on public.navy_document_purges (due_at) where purged_at is null;

-- -------------------------------------------------------------------------------------
-- 3. Triggers
-- -------------------------------------------------------------------------------------

-- A document path belongs to a partner row only when it lives in its own folder
-- {user_id}/{partner_id}/... (security review 2026-09-25: without this, a partner could
-- point its row at ANOTHER partner's document and get it deleted by a final refusal).
create or replace function public.navy_path_owned(p_path text, p_user_id uuid, p_partner_id uuid)
returns boolean language sql immutable set search_path = public as $$
  select p_path is null
      or (left(p_path, length(p_user_id::text || '/' || p_partner_id::text || '/'))
            = p_user_id::text || '/' || p_partner_id::text || '/'
          and position('..' in p_path) = 0);
$$;

-- navy_partners guard (replaces phase 1A): same protections + position rules,
-- final refusal / end of partnership freeze, computed zone.
create or replace function public.navy_partners_guard()
returns trigger language plpgsql set search_path = public as $$
declare
  v_client boolean := current_user in ('authenticated', 'anon');
begin
  if tg_op = 'INSERT' then
    if v_client then
      new.status := 'pending';
      new.rejection_reason := null;
      new.decided_by := null;
      new.decided_at := null;
      new.phone_verified_at := null;
      new.shop_location_verified_at := null;
      new.shop_location_verified_by := null;
      new.suspension_reason := null;
      new.rejection_final := false;
      new.ended_at := null;
      new.documents_purge_after := null;
      if not (public.navy_path_owned(new.id_doc_path, new.user_id, new.id)
          and public.navy_path_owned(new.nif_doc_path, new.user_id, new.id)
          and public.navy_path_owned(new.stat_doc_path, new.user_id, new.id)
          and public.navy_path_owned(new.shop_photo_path, new.user_id, new.id)
          and public.navy_path_owned(new.license_doc_path, new.user_id, new.id)
          and public.navy_path_owned(new.vehicle_photo_path, new.user_id, new.id)) then
        raise exception 'navy_partners: document path outside own folder' using errcode = '42501';
      end if;
    end if;
    if new.shop_lat is not null then
      new.shop_location_set_at := now();
    else
      new.shop_location_set_at := null;
    end if;
    new.zone_id := public.navy_zone_for_point(new.shop_lat, new.shop_lng);
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  if v_client then
    if new.id is distinct from old.id
       or new.user_id is distinct from old.user_id
       or new.kind is distinct from old.kind
       or new.status is distinct from old.status
       or new.rejection_reason is distinct from old.rejection_reason
       or new.decided_by is distinct from old.decided_by
       or new.decided_at is distinct from old.decided_at
       or new.created_at is distinct from old.created_at
       or new.phone_verified_at is distinct from old.phone_verified_at
       or new.shop_location_set_at is distinct from old.shop_location_set_at
       or new.shop_location_verified_at is distinct from old.shop_location_verified_at
       or new.shop_location_verified_by is distinct from old.shop_location_verified_by
       or new.suspension_reason is distinct from old.suspension_reason
       or new.rejection_final is distinct from old.rejection_final
       or new.ended_at is distinct from old.ended_at
       or new.documents_purge_after is distinct from old.documents_purge_after then
      raise exception 'navy_partners: protected column' using errcode = '42501';
    end if;
    if not (public.navy_path_owned(new.id_doc_path, new.user_id, new.id)
        and public.navy_path_owned(new.nif_doc_path, new.user_id, new.id)
        and public.navy_path_owned(new.stat_doc_path, new.user_id, new.id)
        and public.navy_path_owned(new.shop_photo_path, new.user_id, new.id)
        and public.navy_path_owned(new.license_doc_path, new.user_id, new.id)
        and public.navy_path_owned(new.vehicle_photo_path, new.user_id, new.id)) then
      raise exception 'navy_partners: document path outside own folder' using errcode = '42501';
    end if;
    -- Final refusal or end of partnership: the row is closed for its owner.
    if (old.rejection_final or old.status = 'ended') and row(new.*) is distinct from row(old.*) then
      raise exception 'navy_partners: closed file' using errcode = '42501';
    end if;
    -- Position checked on site by an operator: frozen.
    if old.shop_location_verified_at is not null
       and (new.shop_lat is distinct from old.shop_lat or new.shop_lng is distinct from old.shop_lng) then
      raise exception 'navy_partners: shop position verified, frozen' using errcode = '42501';
    end if;
    -- Once approved (or suspended), the vetted identity / vehicle / document data is
    -- frozen: the public QR page vouches for it. It changes only through an approved
    -- navy_partner_changes request (navy_decide_partner_change, SECURITY DEFINER).
    if old.status in ('approved', 'suspended') and (
         new.display_name is distinct from old.display_name
      or new.phone is distinct from old.phone
      or new.nif is distinct from old.nif
      or new.id_doc_path is distinct from old.id_doc_path
      or new.shop_name is distinct from old.shop_name
      or new.stat_number is distinct from old.stat_number
      or new.stat_doc_path is distinct from old.stat_doc_path
      or new.nif_doc_path is distinct from old.nif_doc_path
      or new.shop_photo_path is distinct from old.shop_photo_path
      or new.vehicle_type is distinct from old.vehicle_type
      or new.vehicle_plate is distinct from old.vehicle_plate
      or new.vehicle_photo_path is distinct from old.vehicle_photo_path
      or new.license_doc_path is distinct from old.license_doc_path
      or new.nif_holder_type is distinct from old.nif_holder_type
      or new.nif_holder_name is distinct from old.nif_holder_name) then
      raise exception 'navy_partners: vetted data is frozen after approval' using errcode = '42501';
    end if;
  end if;

  if new.shop_lat is distinct from old.shop_lat or new.shop_lng is distinct from old.shop_lng then
    new.shop_location_set_at := case when new.shop_lat is null then null else now() end;
    new.zone_id := public.navy_zone_for_point(new.shop_lat, new.shop_lng);
  elsif v_client then
    new.zone_id := old.zone_id;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists navy_partners_guard on public.navy_partners;
create trigger navy_partners_guard
  before insert or update on public.navy_partners
  for each row execute function public.navy_partners_guard();

-- navy_zones: author, timestamps
create or replace function public.navy_zones_stamp()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_at := now();
  else
    new.id := old.id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  new.name := btrim(new.name);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists navy_zones_stamp on public.navy_zones;
create trigger navy_zones_stamp
  before insert or update on public.navy_zones
  for each row execute function public.navy_zones_stamp();

-- Zones changed → recompute every computed zone (shops and driver destinations).
create or replace function public.navy_recompute_zones()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.navy_partners p
     set zone_id = public.navy_zone_for_point(p.shop_lat, p.shop_lng)
   where p.zone_id is distinct from public.navy_zone_for_point(p.shop_lat, p.shop_lng);
  update public.navy_driver_status d
     set dest_zone_id = public.navy_zone_for_point(d.dest_lat, d.dest_lng)
   where d.dest_zone_id is distinct from public.navy_zone_for_point(d.dest_lat, d.dest_lng);
  return null;
end;
$$;

drop trigger if exists navy_zones_recompute on public.navy_zones;
create trigger navy_zones_recompute
  after insert or update or delete on public.navy_zones
  for each statement execute function public.navy_recompute_zones();

-- -------------------------------------------------------------------------------------
-- 4. RLS (enabled AND forced) + policies
-- -------------------------------------------------------------------------------------
alter table public.navy_zones           enable row level security;
alter table public.navy_zones           force row level security;
alter table public.navy_driver_status   enable row level security;
alter table public.navy_driver_status   force row level security;
alter table public.navy_partner_changes enable row level security;
alter table public.navy_partner_changes force row level security;
alter table public.navy_document_purges enable row level security;
alter table public.navy_document_purges force row level security;

-- navy_zones: read by any signed-in account, written by operators / admin
drop policy if exists navy_zones_select on public.navy_zones;
create policy navy_zones_select on public.navy_zones
  for select to public using (auth.uid() is not null);
drop policy if exists navy_zones_insert on public.navy_zones;
create policy navy_zones_insert on public.navy_zones
  for insert to public with check (public.navy_is_operator());
drop policy if exists navy_zones_update on public.navy_zones;
create policy navy_zones_update on public.navy_zones
  for update to public using (public.navy_is_operator()) with check (public.navy_is_operator());
drop policy if exists navy_zones_delete on public.navy_zones;
create policy navy_zones_delete on public.navy_zones
  for delete to public using (public.navy_is_operator());

-- navy_driver_status: read by the driver and operators; written ONLY through
-- navy_set_driver_status() (no write policy, no write grant)
drop policy if exists navy_driver_status_select on public.navy_driver_status;
create policy navy_driver_status_select on public.navy_driver_status
  for select to public using (user_id = auth.uid() or public.navy_is_operator());

-- navy_partner_changes: read by the requester and operators; written only through RPCs
drop policy if exists navy_partner_changes_select on public.navy_partner_changes;
create policy navy_partner_changes_select on public.navy_partner_changes
  for select to public using (requested_by = auth.uid() or public.navy_is_operator());

-- navy_document_purges: read by operators; written only by the server
drop policy if exists navy_document_purges_select on public.navy_document_purges;
create policy navy_document_purges_select on public.navy_document_purges
  for select to public using (public.navy_is_operator());

-- -------------------------------------------------------------------------------------
-- 5. Privileges
-- -------------------------------------------------------------------------------------
revoke all on public.navy_zones, public.navy_driver_status, public.navy_partner_changes, public.navy_document_purges
  from public, anon, authenticated;

grant select on public.navy_zones to authenticated;
grant insert (id, name, polygon, color, sort_order) on public.navy_zones to authenticated;
grant update (id, name, polygon, color, sort_order) on public.navy_zones to authenticated;
grant delete on public.navy_zones to authenticated;
grant select on public.navy_driver_status to authenticated;
grant select on public.navy_partner_changes to authenticated;
grant select on public.navy_document_purges to authenticated;

-- navy_partners: the new decision columns are NOT granted; the owner may write its
-- shop position (the trigger freezes it once verified).
grant insert (shop_lat, shop_lng) on public.navy_partners to authenticated;
grant update (shop_lat, shop_lng) on public.navy_partners to authenticated;

-- -------------------------------------------------------------------------------------
-- 6. RPC functions
-- -------------------------------------------------------------------------------------

-- Queue every document path of a partner row for deletion (idempotent per path).
create or replace function public.navy_queue_partner_documents(p_row public.navy_partners, p_reason text, p_due timestamptz)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_path text;
  v_n integer := 0;
begin
  foreach v_path in array array[p_row.id_doc_path, p_row.nif_doc_path, p_row.stat_doc_path,
                                p_row.shop_photo_path, p_row.license_doc_path, p_row.vehicle_photo_path] loop
    -- never queue a path outside the partner's own folder
    if v_path is not null and public.navy_path_owned(v_path, p_row.user_id, p_row.id) then
      insert into public.navy_document_purges (path, partner_id, reason, due_at)
      values (v_path, p_row.id, p_reason, p_due)
      on conflict (path) do update
        set due_at = least(public.navy_document_purges.due_at, excluded.due_at),
            reason = case when excluded.due_at < public.navy_document_purges.due_at
                          then excluded.reason else public.navy_document_purges.reason end
        where public.navy_document_purges.purged_at is null;
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end;
$$;

-- Decision by an operator (replaces phase 1A):
--   'approve' | 'reject' (p_final: false = to correct, true = final) | 'suspend' |
--   'reactivate' | 'end' (end of partnership). Idempotent: a decision already applied
--   returns the row unchanged.
drop function if exists public.navy_decide_partner(uuid, text, text);
create or replace function public.navy_decide_partner(p_id uuid, p_decision text, p_reason text default null,
                                                      p_final boolean default false)
returns public.navy_partners
language plpgsql security definer set search_path = public as $$
declare
  v_row public.navy_partners;
  v_target text;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_final boolean := coalesce(p_final, false);
begin
  if not public.navy_is_operator() then
    raise exception 'navy_decide_partner: operator only' using errcode = '42501';
  end if;

  select * into v_row from public.navy_partners where id = p_id for update;
  if not found then
    raise exception 'navy_decide_partner: unknown partner' using errcode = 'P0002';
  end if;

  v_target := case p_decision
    when 'approve' then 'approved'
    when 'reject' then 'rejected'
    when 'suspend' then 'suspended'
    when 'reactivate' then 'approved'
    when 'end' then 'ended'
    else null end;
  if v_target is null then
    raise exception 'navy_decide_partner: invalid decision %', p_decision using errcode = '22023';
  end if;
  if p_decision in ('reject', 'suspend') and v_reason is null then
    raise exception 'navy_decide_partner: reason required' using errcode = '22023';
  end if;

  if v_row.status = v_target then
    -- replay; a "to correct" refusal may still be turned into a final one
    if not (p_decision = 'reject' and v_final and not v_row.rejection_final) then
      return v_row;
    end if;
  elsif (p_decision = 'approve' and (v_row.status not in ('pending', 'rejected') or v_row.rejection_final))
     or (p_decision = 'reject' and v_row.status <> 'pending')
     or (p_decision = 'suspend' and v_row.status <> 'approved')
     or (p_decision = 'reactivate' and v_row.status <> 'suspended')
     or (p_decision = 'end' and v_row.status not in ('approved', 'suspended')) then
    raise exception 'navy_decide_partner: % not allowed from %', p_decision, v_row.status using errcode = '22023';
  end if;

  if p_decision = 'reject' then
    update public.navy_partners
       set status = 'rejected', rejection_reason = v_reason, rejection_final = v_final,
           decided_by = auth.uid(), decided_at = now()
     where id = p_id returning * into v_row;
    if v_final then
      perform public.navy_queue_partner_documents(v_row, 'rejected_final', now());
    end if;
  elsif p_decision = 'suspend' then
    update public.navy_partners
       set status = 'suspended', suspension_reason = v_reason, decided_by = auth.uid(), decided_at = now()
     where id = p_id returning * into v_row;
  elsif p_decision = 'reactivate' then
    update public.navy_partners
       set status = 'approved', suspension_reason = null, decided_by = auth.uid(), decided_at = now()
     where id = p_id returning * into v_row;
  elsif p_decision = 'end' then
    update public.navy_partners
       set status = 'ended', suspension_reason = v_reason, ended_at = now(),
           -- RETENTION: 12 months after the end (decision of JOEL, to be confirmed by a lawyer)
           documents_purge_after = now() + interval '12 months',
           is_open = false, decided_by = auth.uid(), decided_at = now()
     where id = p_id returning * into v_row;
    perform public.navy_queue_partner_documents(v_row, 'ended', v_row.documents_purge_after);
    update public.navy_driver_status set available = false, available_until = null, updated_at = now()
     where partner_id = p_id;
    update public.navy_partner_changes set status = 'rejected', rejection_reason = 'Fin du partenariat',
           decided_by = auth.uid(), decided_at = now()
     where partner_id = p_id and status = 'pending';
  else -- approve
    update public.navy_partners
       set status = 'approved', rejection_reason = null, decided_by = auth.uid(), decided_at = now()
     where id = p_id returning * into v_row;
  end if;
  return v_row;
end;
$$;

-- Owner sends a corrected request again (rejected -> pending). Idempotent.
-- A final refusal cannot be resubmitted.
create or replace function public.navy_resubmit_partner(p_id uuid)
returns public.navy_partners
language plpgsql security definer set search_path = public as $$
declare
  v_row public.navy_partners;
begin
  select * into v_row from public.navy_partners where id = p_id and user_id = auth.uid() for update;
  if not found then
    raise exception 'navy_resubmit_partner: unknown partner' using errcode = 'P0002';
  end if;
  if v_row.status = 'pending' then
    return v_row;
  end if;
  if v_row.status <> 'rejected' or v_row.rejection_final then
    raise exception 'navy_resubmit_partner: not allowed from %', v_row.status using errcode = '22023';
  end if;
  update public.navy_partners
     set status = 'pending', rejection_reason = null, decided_by = null, decided_at = null
   where id = p_id
   returning * into v_row;
  return v_row;
end;
$$;

-- Operator: shop position checked on site → frozen. Idempotent.
create or replace function public.navy_verify_shop_location(p_id uuid)
returns public.navy_partners
language plpgsql security definer set search_path = public as $$
declare
  v_row public.navy_partners;
begin
  if not public.navy_is_operator() then
    raise exception 'navy_verify_shop_location: operator only' using errcode = '42501';
  end if;
  select * into v_row from public.navy_partners where id = p_id and kind = 'epicier' for update;
  if not found then
    raise exception 'navy_verify_shop_location: unknown grocer' using errcode = 'P0002';
  end if;
  if v_row.shop_lat is null then
    raise exception 'navy_verify_shop_location: no position' using errcode = '22023';
  end if;
  if v_row.shop_location_verified_at is not null then
    return v_row;
  end if;
  update public.navy_partners
     set shop_location_verified_at = now(), shop_location_verified_by = auth.uid()
   where id = p_id returning * into v_row;
  return v_row;
end;
$$;

-- Driver: available / not available + destination. Own approved driver profile only.
-- Idempotent and order-safe: a replayed older choice (p_client_at) is ignored.
create or replace function public.navy_set_driver_status(p_partner_id uuid, p_available boolean,
                                                         p_dest_lat float8, p_dest_lng float8,
                                                         p_client_at timestamptz)
returns public.navy_driver_status
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_at timestamptz := least(coalesce(p_client_at, now()), now());
  v_row public.navy_driver_status;
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
  return v_row;
end;
$$;

-- Partner: ask to change vetted data. Idempotent on the client id; one pending request
-- per partner (a second call with the same id updates it while pending).
create or replace function public.navy_request_partner_change(p_id uuid, p_partner_id uuid, p_changes jsonb)
returns public.navy_partner_changes
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_partner public.navy_partners;
  v_row public.navy_partner_changes;
  v_clean jsonb := '{}'::jsonb;
  v_key text;
  v_val jsonb;
  v_prefix text;
begin
  select * into v_partner from public.navy_partners
   where id = p_partner_id and user_id = v_uid and status in ('approved', 'suspended');
  if v_uid is null or not found then
    raise exception 'navy_request_partner_change: own approved partner only' using errcode = '42501';
  end if;
  if p_changes is null or jsonb_typeof(p_changes) <> 'object' then
    raise exception 'navy_request_partner_change: invalid changes' using errcode = '22023';
  end if;

  v_prefix := v_uid::text || '/' || p_partner_id::text || '/';
  for v_key, v_val in select * from jsonb_each(p_changes) loop
    if v_key in ('display_name', 'shop_name', 'vehicle_type', 'vehicle_plate', 'nif_holder_type',
                 'nif_holder_name', 'nif', 'stat_number') then
      if jsonb_typeof(v_val) not in ('string', 'null') then
        raise exception 'navy_request_partner_change: invalid value for %', v_key using errcode = '22023';
      end if;
      v_clean := v_clean || jsonb_build_object(v_key, v_val);
    elsif v_key in ('id_doc_path', 'nif_doc_path', 'stat_doc_path', 'shop_photo_path',
                    'vehicle_photo_path', 'license_doc_path') then
      -- new photos must live in the partner's own folder
      if jsonb_typeof(v_val) <> 'string' or left(v_val #>> '{}', length(v_prefix)) <> v_prefix
         or position('..' in v_val #>> '{}') > 0 then
        raise exception 'navy_request_partner_change: invalid photo path' using errcode = '22023';
      end if;
      v_clean := v_clean || jsonb_build_object(v_key, v_val);
    end if;
  end loop;
  if v_clean = '{}'::jsonb then
    raise exception 'navy_request_partner_change: nothing to change' using errcode = '22023';
  end if;
  if v_clean ? 'vehicle_type' and (v_clean->>'vehicle_type') not in ('bajaj', 'moto', 'taxi', 'voiture', 'velo', 'camion', 'autre') then
    raise exception 'navy_request_partner_change: invalid vehicle type' using errcode = '22023';
  end if;
  if v_clean ? 'nif_holder_type' and (v_clean->>'nif_holder_type') not in ('self', 'owner', 'cooperative') then
    raise exception 'navy_request_partner_change: invalid NIF holder' using errcode = '22023';
  end if;

  select * into v_row from public.navy_partner_changes where id = p_id for update;
  if found then
    if v_row.requested_by <> v_uid or v_row.partner_id <> p_partner_id then
      raise exception 'navy_request_partner_change: not yours' using errcode = '42501';
    end if;
    if v_row.status = 'pending' then
      update public.navy_partner_changes set changes = v_clean where id = p_id returning * into v_row;
    end if;
    return v_row;
  end if;

  insert into public.navy_partner_changes (id, partner_id, requested_by, status, changes)
  values (p_id, p_partner_id, v_uid, 'pending', v_clean)
  returning * into v_row;
  return v_row;
end;
$$;

-- Operator: approve (copy the fields into navy_partners, queue replaced photos) or
-- reject (reason required, queue the unused new photos). Idempotent.
create or replace function public.navy_decide_partner_change(p_id uuid, p_decision text, p_reason text default null)
returns public.navy_partner_changes
language plpgsql security definer set search_path = public as $$
declare
  v_row public.navy_partner_changes;
  v_partner public.navy_partners;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_c jsonb;
  v_col text;
  v_old text;
begin
  if not public.navy_is_operator() then
    raise exception 'navy_decide_partner_change: operator only' using errcode = '42501';
  end if;
  if p_decision not in ('approve', 'reject') then
    raise exception 'navy_decide_partner_change: invalid decision %', p_decision using errcode = '22023';
  end if;
  select * into v_row from public.navy_partner_changes where id = p_id for update;
  if not found then
    raise exception 'navy_decide_partner_change: unknown request' using errcode = 'P0002';
  end if;
  if v_row.status = (case p_decision when 'approve' then 'approved' else 'rejected' end) then
    return v_row;   -- replay
  end if;
  if v_row.status <> 'pending' then
    raise exception 'navy_decide_partner_change: % not allowed from %', p_decision, v_row.status using errcode = '22023';
  end if;
  v_c := v_row.changes;

  if p_decision = 'reject' then
    if v_reason is null then
      raise exception 'navy_decide_partner_change: reason required' using errcode = '22023';
    end if;
    select * into v_partner from public.navy_partners where id = v_row.partner_id;
    foreach v_col in array array['id_doc_path', 'nif_doc_path', 'stat_doc_path', 'shop_photo_path',
                                 'vehicle_photo_path', 'license_doc_path'] loop
      -- a new photo nobody uses any more (never the current one)
      if v_c ? v_col and (v_c->>v_col) is distinct from (to_jsonb(v_partner)->>v_col) then
        insert into public.navy_document_purges (path, partner_id, reason, due_at)
        values (v_c->>v_col, v_row.partner_id, 'change_rejected', now())
        on conflict (path) do nothing;
      end if;
    end loop;
    update public.navy_partner_changes
       set status = 'rejected', rejection_reason = v_reason, decided_by = auth.uid(), decided_at = now()
     where id = p_id returning * into v_row;
    return v_row;
  end if;

  select * into v_partner from public.navy_partners where id = v_row.partner_id for update;
  if v_partner.status not in ('approved', 'suspended') then
    raise exception 'navy_decide_partner_change: partner is %', v_partner.status using errcode = '22023';
  end if;
  -- old photos replaced by a different file → queued for deletion now
  foreach v_col in array array['id_doc_path', 'nif_doc_path', 'stat_doc_path', 'shop_photo_path',
                               'vehicle_photo_path', 'license_doc_path'] loop
    v_old := to_jsonb(v_partner)->>v_col;
    if v_c ? v_col and v_old is not null and v_old is distinct from (v_c->>v_col)
       and public.navy_path_owned(v_old, v_partner.user_id, v_partner.id) then
      insert into public.navy_document_purges (path, partner_id, reason, due_at)
      values (v_old, v_partner.id, 'replaced', now())
      on conflict (path) do nothing;
    end if;
  end loop;

  update public.navy_partners p
     set display_name       = case when v_c ? 'display_name'       then v_c->>'display_name'       else p.display_name end,
         shop_name          = case when v_c ? 'shop_name'          then v_c->>'shop_name'          else p.shop_name end,
         vehicle_type       = case when v_c ? 'vehicle_type'       then v_c->>'vehicle_type'       else p.vehicle_type end,
         vehicle_plate      = case when v_c ? 'vehicle_plate'      then v_c->>'vehicle_plate'      else p.vehicle_plate end,
         nif_holder_type    = case when v_c ? 'nif_holder_type'    then v_c->>'nif_holder_type'    else p.nif_holder_type end,
         nif_holder_name    = case when v_c ? 'nif_holder_name'    then v_c->>'nif_holder_name'    else p.nif_holder_name end,
         nif                = case when v_c ? 'nif'                then v_c->>'nif'                else p.nif end,
         stat_number        = case when v_c ? 'stat_number'        then v_c->>'stat_number'        else p.stat_number end,
         id_doc_path        = case when v_c ? 'id_doc_path'        then v_c->>'id_doc_path'        else p.id_doc_path end,
         nif_doc_path       = case when v_c ? 'nif_doc_path'       then v_c->>'nif_doc_path'       else p.nif_doc_path end,
         stat_doc_path      = case when v_c ? 'stat_doc_path'      then v_c->>'stat_doc_path'      else p.stat_doc_path end,
         shop_photo_path    = case when v_c ? 'shop_photo_path'    then v_c->>'shop_photo_path'    else p.shop_photo_path end,
         vehicle_photo_path = case when v_c ? 'vehicle_photo_path' then v_c->>'vehicle_photo_path' else p.vehicle_photo_path end,
         license_doc_path   = case when v_c ? 'license_doc_path'   then v_c->>'license_doc_path'   else p.license_doc_path end
   where p.id = v_partner.id;

  update public.navy_partner_changes
     set status = 'approved', decided_by = auth.uid(), decided_at = now()
   where id = p_id returning * into v_row;
  return v_row;
end;
$$;

-- Operator: documents due for deletion (not deleted yet). The operator's app deletes
-- them through the Storage API (allowed by the storage policy below), then calls
-- navy_mark_documents_purged(). pg_cron cannot do it: storage objects cannot be
-- deleted in SQL (storage.protect_delete), only through the Storage API.
create or replace function public.navy_purge_documents()
returns table (path text, reason text, due_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.navy_is_operator() then
    raise exception 'navy_purge_documents: operator only' using errcode = '42501';
  end if;
  return query
    select q.path, q.reason, q.due_at from public.navy_document_purges q
     where q.purged_at is null and q.due_at <= now()
     order by q.due_at, q.path;
end;
$$;

-- Operator: confirm deletions. Trusts nothing: a path is marked purged only if the
-- file is really absent from the bucket. Clears the partner columns still pointing to
-- it (a final refusal keeps the file record, without photos). Returns the paths marked.
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
    return next v_path;
  end loop;
end;
$$;

-- Storage delete policy helper: a path queued, due and not purged yet.
create or replace function public.navy_path_purgeable(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.navy_document_purges q
                  where q.path = p_name and q.purged_at is null and q.due_at <= now());
$$;

-- Function privileges (P7: EXECUTE granted to anon explicitly by default).
revoke execute on function public.navy_valid_polygon(jsonb) from public, anon;
revoke execute on function public.navy_path_owned(text, uuid, uuid) from public, anon;
revoke execute on function public.navy_point_in_polygon(float8, float8, jsonb) from public, anon;
revoke execute on function public.navy_zone_for_point(float8, float8) from public, anon;
revoke execute on function public.navy_partners_guard() from public, anon, authenticated;
revoke execute on function public.navy_zones_stamp() from public, anon, authenticated;
revoke execute on function public.navy_recompute_zones() from public, anon, authenticated;
revoke execute on function public.navy_queue_partner_documents(public.navy_partners, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.navy_decide_partner(uuid, text, text, boolean) from public, anon;
revoke execute on function public.navy_resubmit_partner(uuid) from public, anon;
revoke execute on function public.navy_verify_shop_location(uuid) from public, anon;
revoke execute on function public.navy_set_driver_status(uuid, boolean, float8, float8, timestamptz) from public, anon;
revoke execute on function public.navy_request_partner_change(uuid, uuid, jsonb) from public, anon;
revoke execute on function public.navy_decide_partner_change(uuid, text, text) from public, anon;
revoke execute on function public.navy_purge_documents() from public, anon;
revoke execute on function public.navy_mark_documents_purged(text[]) from public, anon;
revoke execute on function public.navy_path_purgeable(text) from public, anon;

grant execute on function public.navy_valid_polygon(jsonb) to authenticated;
grant execute on function public.navy_path_owned(text, uuid, uuid) to authenticated;
grant execute on function public.navy_point_in_polygon(float8, float8, jsonb) to authenticated;
grant execute on function public.navy_zone_for_point(float8, float8) to authenticated;
grant execute on function public.navy_decide_partner(uuid, text, text, boolean) to authenticated;
grant execute on function public.navy_resubmit_partner(uuid) to authenticated;
grant execute on function public.navy_verify_shop_location(uuid) to authenticated;
grant execute on function public.navy_set_driver_status(uuid, boolean, float8, float8, timestamptz) to authenticated;
grant execute on function public.navy_request_partner_change(uuid, uuid, jsonb) to authenticated;
grant execute on function public.navy_decide_partner_change(uuid, text, text) to authenticated;
grant execute on function public.navy_purge_documents() to authenticated;
grant execute on function public.navy_mark_documents_purged(text[]) to authenticated;
grant execute on function public.navy_path_purgeable(text) to authenticated;

-- -------------------------------------------------------------------------------------
-- 7. Storage: operators may delete ONLY queued, due documents of `navy-documents`
-- -------------------------------------------------------------------------------------
drop policy if exists navy_documents_delete on storage.objects;
create policy navy_documents_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'navy-documents' and public.navy_is_operator() and public.navy_path_purgeable(name));

comment on table public.navy_document_purges is
  'NAVY ay identity documents to delete from the private bucket navy-documents. Retention: final refusal = now, replaced = now, end of partnership = +12 months (decision of JOEL 2026-09-25, TO BE CONFIRMED BY A LAWYER).';
comment on table public.navy_driver_status is
  'NAVY ay driver availability and chosen DESTINATION only (no continuous GPS tracking). available_until = last choice + 3 h.';

notify pgrst, 'reload schema';
