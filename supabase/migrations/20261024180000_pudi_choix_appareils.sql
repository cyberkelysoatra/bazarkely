-- PUDI-CC-16.2: choices made on a device but never sent (organisers' figures only).
-- The device id is the anonymous funnel id (pudi_visiteur, random, no account, no number).
-- Figures only, never a list of devices; never merged into the results. Idempotent: can be replayed.

create table if not exists public.pudi_choix_appareils (
  visiteur uuid primary key,
  priorites text[] not null,
  urgents text[] not null default '{}',
  manquant text null check (char_length(manquant) <= 1000),
  canal_code text null,
  complet boolean not null,
  maj_at timestamptz not null default now(),
  vote_user uuid null
);
alter table public.pudi_choix_appareils enable row level security;
alter table public.pudi_choix_appareils force row level security;
-- No policy: only the security definer functions below read or write it (default grants revoked).
revoke all on public.pudi_choix_appareils from public, anon, authenticated;

-- Called by the client (debounced 3 s, online, never in the preview) when the draft changes and
-- has at least one priority. Same limits as a vote; 1 call per 5 s per device.
create or replace function public.pudi_choix_noter(p_visiteur uuid, p_priorites text[], p_urgents text[], p_manquant text, p_canal text)
returns json
language plpgsql volatile security definer set search_path = public as $$
declare
  s public.pudi_settings; pri text[] := coalesce(p_priorites, '{}'); urg text[] := coalesce(p_urgents, '{}');
  uid uuid := auth.uid(); vu uuid; prec timestamptz;
begin
  if p_visiteur is null then raise exception 'PUDI_VISITEUR'; end if;
  select * into s from public.pudi_settings where id = 1;
  if not s.publie or now() >= s.cloture_at then return json_build_object('ok', false, 'ignore', true); end if;
  if cardinality(pri) > 3
     or (select count(distinct x) from unnest(pri) x) <> cardinality(pri)
     or exists (select 1 from unnest(pri) x where x not in (select public.pudi_ids_valides()))
    then raise exception 'PUDI_PRIORITES'; end if;
  if cardinality(urg) > 10
     or (select count(distinct x) from unnest(urg) x) <> cardinality(urg)
     or exists (select 1 from unnest(urg) x where x not in (select public.pudi_ids_valides()))
    then raise exception 'PUDI_URGENTS'; end if;
  if char_length(coalesce(p_manquant, '')) > 1000 then raise exception 'PUDI_MANQUANT'; end if;
  select maj_at into prec from public.pudi_choix_appareils where visiteur = p_visiteur;
  if prec is not null and prec > now() - interval '5 seconds' then
    return json_build_object('ok', false, 'erreur', 'PUDI_TROP_TOT');
  end if;
  -- A signed-in account that already voted: the device is « sent », never counted as unsent.
  if uid is not null and exists (select 1 from public.pudi_votes v where v.user_id = uid) then vu := uid; end if;
  insert into public.pudi_choix_appareils as c (visiteur, priorites, urgents, manquant, canal_code, complet, maj_at, vote_user)
  values (p_visiteur, pri, urg, nullif(btrim(coalesce(p_manquant, '')), ''),
          (select k.code from public.pudi_canaux k where k.code = p_canal), cardinality(pri) = 3, now(), vu)
  on conflict (visiteur) do update set
    priorites = excluded.priorites, urgents = excluded.urgents, manquant = excluded.manquant,
    canal_code = coalesce(c.canal_code, excluded.canal_code), complet = excluded.complet, maj_at = now(),
    vote_user = coalesce(c.vote_user, excluded.vote_user);
  return json_build_object('ok', true);
end $$;

-- Called by the client just after a vote was sent from this device.
create or replace function public.pudi_choix_lier_vote(p_visiteur uuid)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'PUDI_NON_CONNECTE'; end if;
  if p_visiteur is null or not exists (select 1 from public.pudi_votes v where v.user_id = uid) then return; end if;
  update public.pudi_choix_appareils set vote_user = uid where visiteur = p_visiteur;
end $$;

-- Organisers: figures only (complete / partial unsent choices, ranking of the complete ones).
create or replace function public.pudi_admin_choix_non_envoyes()
returns json
language plpgsql stable security definer set search_path = public as $$
declare r json;
begin
  perform public.pudi_exiger_admin();
  with n as (select * from public.pudi_choix_appareils where vote_user is null),
  c as (select x id, count(*) nb from n, unnest(n.priorites) x where n.complet group by x)
  select json_build_object(
    'calcule_at', now(),
    'complets', (select count(*) from n where complet),
    'partiels', (select count(*) from n where not complet and cardinality(priorites) > 0),
    'classement', coalesce((select json_agg(json_build_object('id', id, 'n', nb) order by nb desc, id) from c), '[]')
  ) into r;
  return r;
end $$;

revoke all on function public.pudi_choix_noter(uuid, text[], text[], text, text) from public;
grant execute on function public.pudi_choix_noter(uuid, text[], text[], text, text) to anon, authenticated;
revoke all on function public.pudi_choix_lier_vote(uuid) from public, anon;
grant execute on function public.pudi_choix_lier_vote(uuid) to authenticated;
revoke all on function public.pudi_admin_choix_non_envoyes() from public, anon;
grant execute on function public.pudi_admin_choix_non_envoyes() to authenticated;

-- Purge: same definition as before plus the unsent choices.
create or replace function public.pudi_purger(p_forcer boolean default false)
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare s public.pudi_settings; nv int; nc int;
begin
  if auth.uid() is not null and not public.is_joel() then raise exception 'PUDI_JOEL_REQUIS'; end if;
  select * into s from public.pudi_settings where id = 1;
  if now() < s.purge_at and not p_forcer then return json_build_object('purge', false, 'prevue', s.purge_at); end if;
  delete from public.pudi_votes; get diagnostics nv = row_count;
  delete from public.pudi_contacts; get diagnostics nc = row_count;
  delete from public.pudi_listes; delete from public.pudi_refus; delete from public.pudi_connexions; delete from public.pudi_admins;
  delete from public.pudi_journal;
  delete from public.pudi_membres; delete from public.pudi_responsables;
  delete from public.pudi_masquages;
  delete from public.pudi_parcours;
  delete from public.pudi_messages; delete from public.pudi_discussion_suspendus;
  delete from public.pudi_messages_prives; delete from public.pudi_conversations;
  delete from public.pudi_presence;
  delete from public.pudi_choix_appareils;
  insert into public.pudi_journal (user_id, action, details) values (auth.uid(), 'purge', jsonb_build_object('votes', nv, 'contacts', nc));
  return json_build_object('purge', true, 'votes', nv, 'contacts', nc);
end $function$;
