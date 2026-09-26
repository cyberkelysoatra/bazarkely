-- =====================================================================================
-- public.users hardening, follow-up of 20260926230000_users_columns_guard.sql
--   1. NAVY operator lookups read the e-mail from auth.users (login e-mail, not
--      writable by a client) instead of public.users.email. Same signatures and
--      result shapes (operatorService.ts sees no change).
--   2. Self-deletion of a public.users row is removed: no app screen deletes its own
--      row (the only deletion path is the admin RPC delete_user_admin, SECURITY
--      DEFINER owned by postgres, unaffected). DELETE and TRUNCATE are revoked from
--      anon and authenticated. postgres / service_role keep them.
-- Idempotent: safe to replay.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. Operator lookups anchored on auth.users
-- -------------------------------------------------------------------------------------
create or replace function public.navy_find_user_by_email(p_email text)
returns table (user_id uuid, email text, username text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.navy_is_operator() then
    raise exception 'navy_find_user_by_email: operator only' using errcode = '42501';
  end if;
  return query
    select a.id, a.email::text, u.username::text
      from auth.users a
      join public.users u on u.id = a.id
     where lower(a.email) = lower(btrim(p_email))
       and a.deleted_at is null
     limit 1;
end;
$$;

create or replace function public.navy_list_operators()
returns table (user_id uuid, email text, username text, designated_at timestamptz, is_admin boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.navy_is_operator() then
    raise exception 'navy_list_operators: operator only' using errcode = '42501';
  end if;
  return query
    select u.id, a.email::text, u.username::text, o.created_at, false
      from public.navy_operators o
      join public.users u on u.id = o.user_id
      left join auth.users a on a.id = u.id
    union all
    select u.id, a.email::text, u.username::text, null::timestamptz, true
      from public.users u
      left join auth.users a on a.id = u.id
     where u.role = 'admin'
       and not exists (select 1 from public.navy_operators o where o.user_id = u.id);
end;
$$;

-- P7: EXECUTE is granted to anon explicitly by default.
revoke execute on function public.navy_find_user_by_email(text) from public, anon;
revoke execute on function public.navy_list_operators() from public, anon;
grant execute on function public.navy_find_user_by_email(text) to authenticated;
grant execute on function public.navy_list_operators() to authenticated;

-- -------------------------------------------------------------------------------------
-- 2. No client-side deletion of public.users rows
-- -------------------------------------------------------------------------------------
drop policy if exists "Users can delete own profile" on public.users;
revoke delete, truncate on table public.users from public, anon, authenticated;

notify pgrst, 'reload schema';
