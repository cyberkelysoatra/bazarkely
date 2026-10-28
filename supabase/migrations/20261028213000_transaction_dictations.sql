-- Voice entry (DICTEE-CC-01, phase 1): one row per transaction created from a dictation.
-- Keeps only the heard text (never the audio) and the AI line as returned, for the
-- correction rules of phase 3. Idempotent: safe to replay.

create table if not exists public.transaction_dictations (
  id uuid primary key,
  dictation_id uuid not null,
  transaction_id uuid not null unique references public.transactions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  transcript text not null,
  transcript_corrected text,
  ai_item jsonb not null,
  model text,
  recorded_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists transaction_dictations_user_idx
  on public.transaction_dictations(user_id, created_at desc);
create index if not exists transaction_dictations_dictation_idx
  on public.transaction_dictations(dictation_id);

alter table public.transaction_dictations enable row level security;
alter table public.transaction_dictations force row level security;

-- Supabase grants every new table to anon/authenticated by default (P7, table variant).
revoke all on public.transaction_dictations from public, anon;
grant select, insert, update, delete on public.transaction_dictations to authenticated;
-- TRUNCATE ignores RLS: never left to a client role.
revoke truncate, references, trigger on public.transaction_dictations from authenticated;

drop policy if exists td_select_own on public.transaction_dictations;
create policy td_select_own on public.transaction_dictations
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists td_insert_own on public.transaction_dictations;
-- A trace may only point to one of the caller's OWN transactions (foreign keys ignore RLS).
create policy td_insert_own on public.transaction_dictations
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.transactions t
                where t.id = transaction_id and t.user_id = (select auth.uid()))
  );

drop policy if exists td_update_own on public.transaction_dictations;
create policy td_update_own on public.transaction_dictations
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.transactions t
                where t.id = transaction_id and t.user_id = (select auth.uid()))
  );

drop policy if exists td_delete_own on public.transaction_dictations;
create policy td_delete_own on public.transaction_dictations
  for delete to authenticated using (user_id = (select auth.uid()));
