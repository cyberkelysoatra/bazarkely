-- PUDI-CC-14.3: anonymous presence (people online now) and the figures table of the organisers
-- (specification v8, 10). Same random visitor id as the funnel (pudi_parcours), no account, no
-- number. Figures only, never a list of devices. Idempotent: can be replayed.

create table if not exists public.pudi_presence (
  visiteur uuid primary key,
  vu_at timestamptz not null default now()
);
create index if not exists pudi_presence_vu_at on public.pudi_presence (vu_at);
alter table public.pudi_presence enable row level security;
alter table public.pudi_presence force row level security;
revoke all on public.pudi_presence from public, anon, authenticated;

-- Called every 60 s by a visible, online page (not in JOEL's preview). Rows older than one day
-- are removed here from time to time (about 1 call in 50) and by the organisers' figures.
create or replace function public.pudi_noter_presence(p_visiteur uuid)
returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if p_visiteur is null then return; end if;
  insert into public.pudi_presence (visiteur, vu_at) values (p_visiteur, now())
  on conflict (visiteur) do update set vu_at = now();
  if random() < 0.02 then
    delete from public.pudi_presence where vu_at < now() - interval '1 day';
  end if;
end $$;

-- Organisers: figures only (all channels, then per channel).
create or replace function public.pudi_admin_frequentation()
returns json
language plpgsql volatile security definer set search_path = public as $$
declare r json;
begin
  perform public.pudi_exiger_admin();
  delete from public.pudi_presence where vu_at < now() - interval '1 day';
  with e as (
    select visiteur, coalesce(max(canal_code), '(aucun)') canal,
           bool_or(etape = 'visite') visite, bool_or(etape = 'choix_commence') commence, bool_or(etape = 'choix_complet') complet
    from public.pudi_parcours group by visiteur
  ), v as (
    select coalesce(canal_code, '(aucun)') canal from public.pudi_votes where not est_test and not masque
  ), chiffres as (
    select canal,
      count(*) filter (where visite) venus,
      count(*) filter (where visite and not commence) sans_coche,
      count(*) filter (where commence) commence,
      count(*) filter (where complet) complet
    from e group by canal
  ), canaux as (
    select c.canal, c.venus, c.sans_coche, c.commence, c.complet, (select count(*) from v where v.canal = c.canal) votes from chiffres c
    union
    select v.canal, 0, 0, 0, 0, count(*) from v where v.canal not in (select canal from chiffres) group by v.canal
  )
  select json_build_object(
    'calcule_at', now(),
    'en_ligne', (select count(*) from public.pudi_presence where vu_at > now() - interval '2 minutes'),
    'venus', (select count(*) from e where visite),
    'sans_coche', (select count(*) from e where visite and not commence),
    'commence', (select count(*) from e where commence),
    'complet', (select count(*) from e where complet),
    'votes', (select count(*) from v),
    'par_canal', coalesce((select json_agg(json_build_object('canal', canal, 'venus', venus, 'sans_coche', sans_coche, 'commence', commence, 'complet', complet, 'votes', votes) order by venus desc, canal) from canaux), '[]')
  ) into r;
  return r;
end $$;

revoke all on function public.pudi_noter_presence(uuid) from public;
grant execute on function public.pudi_noter_presence(uuid) to anon, authenticated;
revoke all on function public.pudi_admin_frequentation() from public, anon;
grant execute on function public.pudi_admin_frequentation() to authenticated;

-- Purge: same definition as before plus the presence.
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
  insert into public.pudi_journal (user_id, action, details) values (auth.uid(), 'purge', jsonb_build_object('votes', nv, 'contacts', nc));
  return json_build_object('purge', true, 'votes', nv, 'contacts', nc);
end $function$;
