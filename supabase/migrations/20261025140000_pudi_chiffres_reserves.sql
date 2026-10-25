-- PUDI-CC-19 (specification v11, sections 4.4, 4.5 and 5): voter counts reserved to the organisers.
-- 1. pudi_settings.chiffres_publics (off by default), changed only by the super administrator
--    (public.is_joel()) through pudi_admin_set_chiffres_publics, journaled.
-- 2. pudi_resultats: organisers (pudi_is_admin) or switch on = complete content (`complet` true);
--    anyone else = votes only (no voters, no distribution per voter, no concentration, no converted
--    votes) and the breakdowns by profile, fokontany and networks as percentages only.
--    pudi_calculer_resultats and pudi_admin_resultats_apercu are unchanged (always complete).
-- 3. pudi_etat: + 'chiffres_publics' (read by the settings screen).
-- Idempotent: can be replayed without effect. Signatures, security definer, search_path and grants
-- of the replaced functions are kept.

alter table public.pudi_settings add column if not exists chiffres_publics boolean not null default false;

-- Reduced results (internal helper, called by pudi_resultats only).
create or replace function public.pudi_resultats_reduits(p jsonb)
returns json
language sql
immutable
set search_path = public
as $$
  with n as (select greatest(coalesce((p->>'nb_votants')::int, 0), 0) as n),
       rz as (select coalesce((p->'reseaux'->>'dans_nos_reseaux')::int, 0) as d,
                     coalesce((p->'reseaux'->>'hors_reseaux')::int, 0) as h)
  select json_build_object(
    'complet', false,
    'clos', p->'clos', 'cloture_at', p->'cloture_at', 'publie_at', p->'publie_at', 'calcule_at', p->'calcule_at',
    'voix_placees', p->'voix_placees', 'top_ecart', p->'top_ecart', 'regle_voix_at', p->'regle_voix_at',
    'priorites', coalesce((select jsonb_agg(jsonb_build_object('id', e->'id', 'voix', e->'voix', 'pct_voix', e->'pct_voix',
        'tranche_pudi', e->'tranche_pudi', 'ecart_pudi', e->'ecart_pudi') order by o)
      from jsonb_array_elements(p->'priorites') with ordinality as x(e, o)), '[]'::jsonb),
    'propositions', coalesce((select jsonb_agg(jsonb_build_object('id', e->'id', 'intitule', e->'intitule', 'ajoute_at', e->'ajoute_at',
        'voix', e->'voix', 'pct_voix', e->'pct_voix') order by o)
      from jsonb_array_elements(p->'propositions') with ordinality as x(e, o)), '[]'::jsonb),
    'par_profil', coalesce((select jsonb_object_agg(k, round(100.0 * v::int / n.n, 1))
      from jsonb_each_text(p->'par_profil') as x(k, v), n where n.n > 0), '{}'::jsonb),
    'par_fokontany', coalesce((select jsonb_object_agg(k, round(100.0 * v::int / n.n, 1))
      from jsonb_each_text(p->'par_fokontany') as x(k, v), n where n.n > 0), '{}'::jsonb),
    'reseaux', (select json_build_object(
        'dans_nos_reseaux', case when d + h = 0 then 0 else round(100.0 * d / (d + h), 1) end,
        'hors_reseaux', case when d + h = 0 then 0 else round(100.0 * h / (d + h), 1) end) from rz),
    'manquants', coalesce(p->'manquants', '[]'::jsonb))
$$;
revoke all on function public.pudi_resultats_reduits(jsonb) from public, anon, authenticated;

create or replace function public.pudi_resultats()
returns json
language plpgsql
stable security definer
set search_path = public
as $function$
declare s public.pudi_settings; r json;
begin
  select * into s from public.pudi_settings where id = 1;
  if now() < s.cloture_at and not public.pudi_is_admin() and not exists (
      select 1 from public.pudi_votes v where v.user_id = auth.uid() and not v.masque and not v.est_test)
    then raise exception 'PUDI_RESULTATS_RESERVES'; end if;
  r := public.pudi_calculer_resultats(false);
  -- PUDI-CC-19: voter counts for the organisers, or for everyone when the super administrator
  -- switched « Afficher tous les chiffres au public » on.
  if public.pudi_is_admin() or coalesce(s.chiffres_publics, false) then
    return (r::jsonb || jsonb_build_object('complet', true))::json;
  end if;
  return public.pudi_resultats_reduits(r::jsonb);
end $function$;

create or replace function public.pudi_admin_set_chiffres_publics(p boolean)
returns json
language plpgsql
security definer
set search_path = public
as $function$
declare ancien boolean;
begin
  if auth.uid() is null or not public.is_joel() then
    raise exception 'PUDI_SUPER_ADMIN_REQUIS' using errcode = '42501';
  end if;
  if p is null then raise exception 'PUDI_VALEUR'; end if;
  select chiffres_publics into ancien from public.pudi_settings where id = 1 for update;
  update public.pudi_settings set chiffres_publics = p, updated_at = now(), updated_by = auth.uid() where id = 1;
  perform public.pudi_journaliser('changer_chiffres_publics', null, jsonb_build_object('avant', ancien, 'apres', p));
  return json_build_object('chiffres_publics', p);
end $function$;
revoke all on function public.pudi_admin_set_chiffres_publics(boolean) from public, anon;
grant execute on function public.pudi_admin_set_chiffres_publics(boolean) to authenticated;

create or replace function public.pudi_etat()
returns json
language sql
stable security definer
set search_path = public
as $function$
  select json_build_object(
    'publie', s.publie,
    'publie_at', s.publie_at,
    'cloture_at', s.cloture_at,
    'gel_listes_at', s.gel_listes_at,
    'regle_voix_at', s.regle_voix_at,
    'chiffres_publics', s.chiffres_publics,
    'maintenant', now(),
    'clos', now() >= s.cloture_at,
    'connecte', auth.uid() is not null,
    'a_vote', exists (select 1 from public.pudi_votes v where v.user_id = auth.uid()),
    'est_admin', public.pudi_is_admin(),
    'est_responsable', exists (select 1 from public.pudi_responsables r where r.email = public.pudi_mon_email()))
  from public.pudi_settings s where s.id = 1
$function$;
