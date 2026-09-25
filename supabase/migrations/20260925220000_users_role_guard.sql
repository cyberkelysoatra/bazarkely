-- =====================================================================================
-- Security fix (2026-09-25): a signed-in account could promote ITSELF to admin with
--   update public.users set role = 'admin' where id = auth.uid();
-- (UPDATE policies "Users can update own profile" / "Enable update for users based on
-- user_id" only check auth.uid() = id, and authenticated / anon hold UPDATE on the
-- whole table, so revoking UPDATE(role) alone would NOT be enough).
--
-- Fix: a BEFORE INSERT OR UPDATE trigger. For client roles (authenticated, anon):
-- - UPDATE: any change of `role` is refused (errcode 42501);
-- - INSERT: `role` is forced to 'user'.
-- Server-side code (SECURITY DEFINER functions owned by postgres, e.g. handle_new_user,
-- the SQL editor, the service role) runs under another role and is unaffected: the
-- admin is still designated in SQL, as before.
--
-- The client never writes `role` legitimately (audit 2026-09-25: the only client write
-- to public.users is apiService.updateUserPreferences -> preferences + updated_at).
-- IDEMPOTENT: create or replace + drop trigger if exists.
-- =====================================================================================

create or replace function public.users_role_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.role := 'user';
    elsif new.role is distinct from old.role then
      raise exception 'users.role can only be changed server-side' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.users_role_guard() from public, anon, authenticated;

drop trigger if exists users_role_guard on public.users;
create trigger users_role_guard
  before insert or update on public.users
  for each row execute function public.users_role_guard();
