-- PUDI-CC-11: anonymous visit funnel (pudi_parcours), admin reading, purge includes it.
-- Nothing personal is stored: a random browser id, a step, an optional channel, a time.
-- Idempotent: can be replayed.

create table if not exists public.pudi_parcours (
  visiteur uuid not null,
  etape text not null check (etape in ('visite','fiche','choix_commence','choix_complet','envoyer','connecte','vote')),
  canal_code text,
  at timestamptz not null default now(),
  primary key (visiteur, etape)
);
alter table public.pudi_parcours enable row level security;
alter table public.pudi_parcours force row level security;
revoke all on public.pudi_parcours from public, anon, authenticated;

-- Each step counted once per visitor; unknown step refused, unknown channel stored as null.
create or replace function public.pudi_noter_etape(p_visiteur uuid, p_etape text, p_canal text)
returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if p_visiteur is null or p_etape is null
     or p_etape not in ('visite','fiche','choix_commence','choix_complet','envoyer','connecte','vote') then
    raise exception 'PUDI_ETAPE_INCONNUE';
  end if;
  insert into public.pudi_parcours (visiteur, etape, canal_code)
  values (p_visiteur, p_etape, (select c.code from public.pudi_canaux c where c.code = p_canal))
  on conflict do nothing;
end $$;
revoke all on function public.pudi_noter_etape(uuid, text, text) from public;
grant execute on function public.pudi_noter_etape(uuid, text, text) to anon, authenticated;

-- Funnel for the organisers. p_canal: null = all, '(aucun)' = without channel, else one channel.
create or replace function public.pudi_admin_parcours(p_canal text default null)
returns json
language plpgsql stable security definer set search_path = public as $$
declare r json;
begin
  perform public.pudi_exiger_admin();
  with p as (
    select * from public.pudi_parcours
    where p_canal is null
       or (p_canal = '(aucun)' and canal_code is null)
       or canal_code = p_canal
  ), v as (
    select * from public.pudi_votes
    where not est_test and not masque
      and (p_canal is null or (p_canal = '(aucun)' and canal_code is null) or canal_code = p_canal)
  )
  select json_build_object(
    'calcule_at', now(),
    'debut', (select min(at) from public.pudi_parcours),
    'etapes', json_build_object(
      'visite', (select count(*) from p where etape = 'visite'),
      'fiche', (select count(*) from p where etape = 'fiche'),
      'choix_commence', (select count(*) from p where etape = 'choix_commence'),
      'choix_complet', (select count(*) from p where etape = 'choix_complet'),
      'envoyer', (select count(*) from p where etape = 'envoyer'),
      'connecte', (select count(*) from p where etape = 'connecte'),
      'vote', (select count(*) from p where etape = 'vote')),
    'nb_votes', (select count(*) from v),
    'canaux', coalesce((select json_agg(code order by code) from (select distinct canal_code code from public.pudi_parcours where canal_code is not null) x), '[]')
  ) into r;
  return r;
end $$;
revoke all on function public.pudi_admin_parcours(text) from public, anon;
grant execute on function public.pudi_admin_parcours(text) to authenticated;

-- Purge: same definition as before plus one line for the funnel.
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
  insert into public.pudi_journal (user_id, action, details) values (auth.uid(), 'purge', jsonb_build_object('votes', nv, 'contacts', nc));
  return json_build_object('purge', true, 'votes', nv, 'contacts', nc);
end $function$;
