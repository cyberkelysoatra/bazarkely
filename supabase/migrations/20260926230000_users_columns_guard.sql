-- =====================================================================================
-- Security fix (2026-09-26): users_role_guard only protected `role`. The UPDATE
-- policies on public.users ("Users can update own profile" / "Enable update for users
-- based on user_id") only check auth.uid() = id, and authenticated / anon hold UPDATE
-- on the whole table, so a signed-in account could still rewrite its own `phone`,
-- `email`, `created_at`... and any column added later. Any server function trusting
-- users.phone / users.email (e.g. navy_find_user_by_email, the sender phone snapshot
-- of navy_create_parcel) could be spoofed.
--
-- Fix: replace the blacklist (users_role_guard) with a WHITELIST trigger,
-- users_columns_guard, BEFORE INSERT OR UPDATE. For client roles:
-- - anon: every write is refused (errcode 42501);
-- - authenticated UPDATE: only `preferences` and `updated_at` may change. Every other
--   column is compared through to_jsonb(new) - allowed vs to_jsonb(old) - allowed, so a
--   column added later is protected BY DEFAULT. Refusal (42501) names the column;
-- - authenticated INSERT: only `id`, `username`, `preferences` come from the client.
--   role := 'user', created_at / updated_at / last_login_at := now(), email := the
--   e-mail of the JWT, phone and the other known columns reset to their defaults. Any
--   other (future) column carrying a value is refused (42501).
-- Server-side code (SECURITY DEFINER functions owned by postgres, e.g. handle_new_user,
-- the SQL editor, the service role) runs under another role and is unaffected.
--
-- Audit 2026-09-26: the only client write to public.users is
-- apiService.updateUserPreferences -> preferences + updated_at (used by BottomNav,
-- PriorityQuestionsPage, modulePrefsSync). The profile row is created server-side by
-- handle_new_user (trigger on auth.users); apiService.createUser has no caller. No
-- screen edits the phone number: users.phone is simply locked (it stays UNVERIFIED:
-- declared at sign-up, only an SMS check - NAVY phase 1C - will make it reliable).
-- IDEMPOTENT: create or replace + drop ... if exists.
-- =====================================================================================

create or replace function public.users_columns_guard()
returns trigger language plpgsql set search_path = public as $$
declare
  -- Columns a client may change on its own row.
  c_update_allowed constant text[] := array['preferences', 'updated_at'];
  -- Columns a client may choose when creating its own row.
  c_insert_allowed constant text[] := array['id', 'username', 'preferences'];
  -- Columns the guard itself sets on a client INSERT.
  c_insert_server constant text[] := array[
    'role', 'email', 'phone', 'created_at', 'updated_at', 'last_login_at', 'last_sync',
    'experience_points', 'certification_level', 'profile_picture_url',
    'notification_preferences'];
  v_col text;
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if current_user = 'anon' then
    raise exception 'public.users cannot be written anonymously' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' then
    select n.k into v_col
      from jsonb_each(to_jsonb(new) - c_update_allowed) as n(k, v)
     where n.v is distinct from (to_jsonb(old) -> n.k)
     order by n.k
     limit 1;
    if v_col is not null then
      raise exception 'users.% can only be changed server-side', v_col using errcode = '42501';
    end if;
    return new;
  end if;

  -- INSERT by a client
  new.role := 'user';
  new.email := auth.jwt() ->> 'email';
  new.phone := null;
  new.created_at := now();
  new.updated_at := now();
  new.last_login_at := now();
  new.last_sync := null;
  new.experience_points := 0;
  new.certification_level := 1;
  new.profile_picture_url := null;
  new.notification_preferences := null;

  select n.k into v_col
    from jsonb_each(to_jsonb(new) - c_insert_allowed - c_insert_server) as n(k, v)
   where n.v <> 'null'::jsonb
   order by n.k
   limit 1;
  if v_col is not null then
    raise exception 'users.% can only be set server-side', v_col using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke execute on function public.users_columns_guard() from public, anon, authenticated;

-- One guard only: the blacklist trigger is replaced by the whitelist one.
drop trigger if exists users_role_guard on public.users;
drop function if exists public.users_role_guard();

drop trigger if exists users_columns_guard on public.users;
create trigger users_columns_guard
  before insert or update on public.users
  for each row execute function public.users_columns_guard();
