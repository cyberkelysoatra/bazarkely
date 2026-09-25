-- =====================================================================================
-- NAVY ay - phase 1A : partner profiles (grocers / drivers), operators, settings,
-- referrals, private document storage.
--
-- IDEMPOTENT: every statement can be replayed (create if not exists, create or
-- replace, drop policy if exists + create policy, on conflict do nothing).
--
-- SECURITY:
-- - RLS enabled AND forced on every table; anon has no privilege at all.
-- - Supabase grants INSERT/UPDATE/DELETE to `authenticated` (and EXECUTE to anon) by
--   default on new objects: everything is revoked explicitly, then only what is
--   needed is granted back (column-level privileges on navy_partners).
-- - Decisions (approve / reject / suspend / reactivate) only through
--   navy_decide_partner(), SECURITY DEFINER, reserved to navy_is_operator().
-- - The storage bucket `navy-documents` holds SENSITIVE PERSONAL DATA (identity
--   documents, NIF, statistical card, driving licence). Private bucket, never
--   public, read by the owner (own folder) and by operators / admin only, displayed
--   through short-lived signed URLs.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. Tables
-- -------------------------------------------------------------------------------------
create table if not exists public.navy_operators (
  user_id       uuid primary key references public.users(id) on delete cascade,
  designated_by uuid references public.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create table if not exists public.navy_partners (
  id                 uuid primary key,                       -- client-generated id
  user_id            uuid not null references public.users(id) on delete cascade,
  kind               text not null check (kind in ('epicier', 'chauffeur')),
  status             text not null default 'pending'
                       check (status in ('pending', 'approved', 'rejected', 'suspended')),
  rejection_reason   text,
  decided_by         uuid references public.users(id) on delete set null,
  decided_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- common identity
  display_name       text,
  phone              text,
  nif                text,
  id_doc_path        text,
  -- grocer
  shop_name          text,
  stat_number        text,
  stat_doc_path      text,
  nif_doc_path       text,
  shop_photo_path    text,
  is_open            boolean not null default false,
  depot_fee          integer check (depot_fee is null or depot_fee >= 0),
  pickup_fee         integer check (pickup_fee is null or pickup_fee >= 0),
  -- driver
  vehicle_type       text check (vehicle_type is null or vehicle_type in
                       ('bajaj', 'moto', 'taxi', 'voiture', 'velo', 'camion', 'autre')),
  vehicle_plate      text,
  vehicle_photo_path text,
  license_doc_path   text,
  nif_holder_type    text check (nif_holder_type is null or nif_holder_type in ('self', 'owner', 'cooperative')),
  nif_holder_name    text,
  min_fare           integer check (min_fare is null or min_fare >= 0),
  fare_per_5km       integer check (fare_per_5km is null or fare_per_5km >= 0),
  -- reserved for phase 1B (no screen yet)
  shop_lat           double precision,
  shop_lng           double precision,
  phone_verified_at  timestamptz,
  constraint navy_partners_user_kind_key unique (user_id, kind)
);

create index if not exists navy_partners_status_created_idx on public.navy_partners (status, created_at);

create table if not exists public.navy_settings (
  id                     boolean primary key default true check (id),   -- single row
  suggested_min_fare     integer not null default 1000 check (suggested_min_fare >= 0),
  suggested_fare_per_5km integer not null default 1000 check (suggested_fare_per_5km >= 0),
  suggested_depot_fee    integer check (suggested_depot_fee is null or suggested_depot_fee >= 0),
  suggested_pickup_fee   integer check (suggested_pickup_fee is null or suggested_pickup_fee >= 0),
  updated_by             uuid references public.users(id) on delete set null,
  updated_at             timestamptz not null default now()
);
insert into public.navy_settings (id) values (true) on conflict (id) do nothing;

create table if not exists public.navy_referrals (
  user_id             uuid primary key references public.users(id) on delete cascade,  -- referee
  referrer_partner_id uuid not null references public.navy_partners(id) on delete cascade,
  created_at          timestamptz not null default now()
);

-- -------------------------------------------------------------------------------------
-- 2. Role helpers (SECURITY DEFINER, read auth.uid())
-- -------------------------------------------------------------------------------------
-- SECURITY: NOT based on public.users.role. As of 2026-09-25 any signed-in account can
-- UPDATE its own users row, role included (pre-existing, app-wide issue reported to
-- JOEL). NAVY holds identity documents, so its admin is anchored on the sign-in identity
-- (auth.users, not writable by clients), exactly like the existing public.is_joel().
-- Other operators are designated through navy_operators (writable by operators only).
create or replace function public.navy_is_admin()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select exists (select 1 from auth.users where id = auth.uid() and email = 'joelsoatra@gmail.com');
$$;

create or replace function public.navy_is_operator()
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    public.navy_is_admin()
    or exists (select 1 from public.navy_operators where user_id = auth.uid())
  );
$$;

-- -------------------------------------------------------------------------------------
-- 3. Triggers: protected columns of navy_partners, updated_at, settings author
--    Direct client writes run as `authenticated`; SECURITY DEFINER functions run as
--    their owner, which is the only way to change status / decision columns.
-- -------------------------------------------------------------------------------------
create or replace function public.navy_partners_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if current_user in ('authenticated', 'anon') then
      new.status := 'pending';
      new.rejection_reason := null;
      new.decided_by := null;
      new.decided_at := null;
      new.phone_verified_at := null;
    end if;
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  if current_user in ('authenticated', 'anon') then
    if new.id is distinct from old.id
       or new.user_id is distinct from old.user_id
       or new.kind is distinct from old.kind
       or new.status is distinct from old.status
       or new.rejection_reason is distinct from old.rejection_reason
       or new.decided_by is distinct from old.decided_by
       or new.decided_at is distinct from old.decided_at
       or new.created_at is distinct from old.created_at
       or new.phone_verified_at is distinct from old.phone_verified_at then
      raise exception 'navy_partners: protected column' using errcode = '42501';
    end if;
    -- Once approved (or suspended), the vetted identity / vehicle / document data is
    -- frozen: the public QR page vouches for it. Only is_open and the fees stay editable.
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
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists navy_partners_guard on public.navy_partners;
create trigger navy_partners_guard
  before insert or update on public.navy_partners
  for each row execute function public.navy_partners_guard();

create or replace function public.navy_settings_stamp()
returns trigger language plpgsql set search_path = public as $$
begin
  new.id := true;
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists navy_settings_stamp on public.navy_settings;
create trigger navy_settings_stamp
  before update on public.navy_settings
  for each row execute function public.navy_settings_stamp();

-- -------------------------------------------------------------------------------------
-- 4. RLS (enabled AND forced) + policies
-- -------------------------------------------------------------------------------------
alter table public.navy_operators enable row level security;
alter table public.navy_operators force row level security;
alter table public.navy_partners  enable row level security;
alter table public.navy_partners  force row level security;
alter table public.navy_settings  enable row level security;
alter table public.navy_settings  force row level security;
alter table public.navy_referrals enable row level security;
alter table public.navy_referrals force row level security;

-- navy_operators: read by operators / admin; writes only through navy_designate_operator()
drop policy if exists navy_operators_select on public.navy_operators;
create policy navy_operators_select on public.navy_operators
  for select to public using (public.navy_is_operator());

-- navy_partners: owner reads / creates / edits own rows; operators read everything
drop policy if exists navy_partners_select on public.navy_partners;
create policy navy_partners_select on public.navy_partners
  for select to public using (user_id = auth.uid() or public.navy_is_operator());

drop policy if exists navy_partners_insert on public.navy_partners;
create policy navy_partners_insert on public.navy_partners
  for insert to public with check (user_id = auth.uid() and status = 'pending');

drop policy if exists navy_partners_update on public.navy_partners;
create policy navy_partners_update on public.navy_partners
  for update to public using (user_id = auth.uid()) with check (user_id = auth.uid());

-- navy_settings: read by any signed-in account, written by operators / admin
drop policy if exists navy_settings_select on public.navy_settings;
create policy navy_settings_select on public.navy_settings
  for select to public using (auth.uid() is not null);

drop policy if exists navy_settings_update on public.navy_settings;
create policy navy_settings_update on public.navy_settings
  for update to public using (public.navy_is_operator()) with check (public.navy_is_operator());

-- navy_referrals: read by operators / admin; insert only through navy_record_referral()
drop policy if exists navy_referrals_select on public.navy_referrals;
create policy navy_referrals_select on public.navy_referrals
  for select to public using (public.navy_is_operator());

-- -------------------------------------------------------------------------------------
-- 5. Table privileges: revoke Supabase defaults, grant back the strict minimum
-- -------------------------------------------------------------------------------------
revoke all on public.navy_operators, public.navy_partners, public.navy_settings, public.navy_referrals
  from public, anon, authenticated;

grant select on public.navy_operators to authenticated;
grant select on public.navy_referrals to authenticated;
grant select on public.navy_settings to authenticated;
grant update (suggested_min_fare, suggested_fare_per_5km, suggested_depot_fee, suggested_pickup_fee)
  on public.navy_settings to authenticated;

grant select on public.navy_partners to authenticated;
-- id / user_id / kind are listed because an upsert re-sets them to the SAME value;
-- the trigger rejects any real change. Status / decision columns are never granted.
grant insert (id, user_id, kind, display_name, phone, nif, id_doc_path,
              shop_name, stat_number, stat_doc_path, nif_doc_path, shop_photo_path, is_open, depot_fee, pickup_fee,
              vehicle_type, vehicle_plate, vehicle_photo_path, license_doc_path, nif_holder_type, nif_holder_name,
              min_fare, fare_per_5km)
  on public.navy_partners to authenticated;
grant update (id, user_id, kind, display_name, phone, nif, id_doc_path,
              shop_name, stat_number, stat_doc_path, nif_doc_path, shop_photo_path, is_open, depot_fee, pickup_fee,
              vehicle_type, vehicle_plate, vehicle_photo_path, license_doc_path, nif_holder_type, nif_holder_name,
              min_fare, fare_per_5km)
  on public.navy_partners to authenticated;

-- -------------------------------------------------------------------------------------
-- 6. RPC functions
-- -------------------------------------------------------------------------------------

-- Decision by an operator: 'approve' | 'reject' | 'suspend' | 'reactivate'.
-- Idempotent: a decision already applied returns the row unchanged.
create or replace function public.navy_decide_partner(p_id uuid, p_decision text, p_reason text default null)
returns public.navy_partners
language plpgsql security definer set search_path = public as $$
declare
  v_row public.navy_partners;
  v_target text;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
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
    else null end;
  if v_target is null then
    raise exception 'navy_decide_partner: invalid decision %', p_decision using errcode = '22023';
  end if;
  if p_decision in ('reject', 'suspend') and v_reason is null then
    raise exception 'navy_decide_partner: reason required' using errcode = '22023';
  end if;

  if v_row.status = v_target then
    return v_row;   -- already applied (replay)
  end if;

  if (p_decision = 'approve' and v_row.status not in ('pending', 'rejected'))
     or (p_decision = 'reject' and v_row.status <> 'pending')
     or (p_decision = 'suspend' and v_row.status <> 'approved')
     or (p_decision = 'reactivate' and v_row.status <> 'suspended') then
    raise exception 'navy_decide_partner: % not allowed from %', p_decision, v_row.status using errcode = '22023';
  end if;

  update public.navy_partners
     set status = v_target,
         rejection_reason = case when p_decision in ('reject', 'suspend') then v_reason else null end,
         decided_by = auth.uid(),
         decided_at = now()
   where id = p_id
   returning * into v_row;
  return v_row;
end;
$$;

-- Owner sends a corrected request again (rejected -> pending). Idempotent.
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
  if v_row.status <> 'rejected' then
    raise exception 'navy_resubmit_partner: not allowed from %', v_row.status using errcode = '22023';
  end if;
  update public.navy_partners
     set status = 'pending', rejection_reason = null, decided_by = null, decided_at = null
   where id = p_id
   returning * into v_row;
  return v_row;
end;
$$;

-- Public card behind the QR code: approved partners only, NO document, phone or NIF.
create or replace function public.navy_public_partner(p_id uuid)
returns table (kind text, name text, vehicle_type text, vehicle_plate text)
language sql stable security definer set search_path = public as $$
  select p.kind,
         case when p.kind = 'epicier' then coalesce(p.shop_name, p.display_name) else p.display_name end,
         case when p.kind = 'chauffeur' then p.vehicle_type end,
         case when p.kind = 'chauffeur' then p.vehicle_plate end
    from public.navy_partners p
   where p.id = p_id and p.status = 'approved';
$$;

-- Referral: recorded once for the calling account, only toward an approved partner
-- that is not one of the caller's own profiles.
create or replace function public.navy_record_referral(p_referrer_partner_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'navy_record_referral: sign-in required' using errcode = '42501';
  end if;
  if not exists (select 1 from public.navy_partners
                  where id = p_referrer_partner_id and status = 'approved' and user_id <> v_uid) then
    return false;
  end if;
  insert into public.navy_referrals (user_id, referrer_partner_id)
  values (v_uid, p_referrer_partner_id)
  on conflict (user_id) do nothing;
  return true;
end;
$$;

-- Designate an operator (admin designates the first one; an operator may add others).
create or replace function public.navy_designate_operator(p_user_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.navy_is_operator() then
    raise exception 'navy_designate_operator: operator only' using errcode = '42501';
  end if;
  if not exists (select 1 from public.users where id = p_user_id) then
    raise exception 'navy_designate_operator: unknown account' using errcode = 'P0002';
  end if;
  insert into public.navy_operators (user_id, designated_by)
  values (p_user_id, auth.uid())
  on conflict (user_id) do nothing;
  return true;
end;
$$;

-- Find the account to designate by its e-mail (operators only, exact match).
create or replace function public.navy_find_user_by_email(p_email text)
returns table (user_id uuid, email text, username text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.navy_is_operator() then
    raise exception 'navy_find_user_by_email: operator only' using errcode = '42501';
  end if;
  return query
    select u.id, u.email::text, u.username::text
      from public.users u
     where lower(u.email) = lower(btrim(p_email))
     limit 1;
end;
$$;

-- Operator list with e-mails (users rows of others are not readable directly).
create or replace function public.navy_list_operators()
returns table (user_id uuid, email text, username text, designated_at timestamptz, is_admin boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.navy_is_operator() then
    raise exception 'navy_list_operators: operator only' using errcode = '42501';
  end if;
  return query
    select u.id, u.email::text, u.username::text, o.created_at, false
      from public.navy_operators o join public.users u on u.id = o.user_id
    union all
    select u.id, u.email::text, u.username::text, null::timestamptz, true
      from public.users u
     where u.role = 'admin' and not exists (select 1 from public.navy_operators o where o.user_id = u.id);
end;
$$;

-- Function privileges (P7: EXECUTE is granted to anon explicitly by default).
revoke execute on function public.navy_is_admin() from public, anon;
revoke execute on function public.navy_is_operator() from public, anon;
revoke execute on function public.navy_partners_guard() from public, anon, authenticated;
revoke execute on function public.navy_settings_stamp() from public, anon, authenticated;
revoke execute on function public.navy_decide_partner(uuid, text, text) from public, anon;
revoke execute on function public.navy_resubmit_partner(uuid) from public, anon;
revoke execute on function public.navy_public_partner(uuid) from public;
revoke execute on function public.navy_record_referral(uuid) from public, anon;
revoke execute on function public.navy_designate_operator(uuid) from public, anon;
revoke execute on function public.navy_find_user_by_email(text) from public, anon;
revoke execute on function public.navy_list_operators() from public, anon;

grant execute on function public.navy_is_admin() to authenticated;
grant execute on function public.navy_is_operator() to authenticated;
grant execute on function public.navy_decide_partner(uuid, text, text) to authenticated;
grant execute on function public.navy_resubmit_partner(uuid) to authenticated;
grant execute on function public.navy_public_partner(uuid) to anon, authenticated;
grant execute on function public.navy_record_referral(uuid) to authenticated;
grant execute on function public.navy_designate_operator(uuid) to authenticated;
grant execute on function public.navy_find_user_by_email(text) to authenticated;
grant execute on function public.navy_list_operators() to authenticated;

-- -------------------------------------------------------------------------------------
-- 7. Storage: private bucket `navy-documents` (SENSITIVE PERSONAL DATA)
--    Path: {user_id}/{partner_id}/{name}.jpg
-- -------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('navy-documents', 'navy-documents', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists navy_documents_select on storage.objects;
create policy navy_documents_select on storage.objects
  for select to authenticated
  using (bucket_id = 'navy-documents'
         and ((storage.foldername(name))[1] = (auth.uid())::text or public.navy_is_operator()));

drop policy if exists navy_documents_insert on storage.objects;
create policy navy_documents_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'navy-documents' and (storage.foldername(name))[1] = (auth.uid())::text);

drop policy if exists navy_documents_update on storage.objects;
create policy navy_documents_update on storage.objects
  for update to authenticated
  using (bucket_id = 'navy-documents' and (storage.foldername(name))[1] = (auth.uid())::text)
  with check (bucket_id = 'navy-documents' and (storage.foldername(name))[1] = (auth.uid())::text);

comment on table public.navy_partners is
  'NAVY ay partners (grocers / drivers). Contains personal data (phone, NIF, document paths). Documents live in the PRIVATE bucket navy-documents (identity documents = sensitive personal data), signed URLs only.';

notify pgrst, 'reload schema';
