-- PUDi · correction du 21/10/2026 : un numéro de proposition n'est JAMAIS réattribué
-- (avant : une proposition supprimée libérait son numéro, la suivante le reprenait).
-- SQL seul, idempotent, aucun déploiement.
create sequence if not exists public.pudi_proposition_num;
revoke all on sequence public.pudi_proposition_num from public, anon, authenticated;
-- Plancher 6 : P6 a déjà servi deux fois pendant les essais de la phase 3 ; la prochaine sera au moins P7.
select setval('public.pudi_proposition_num',
  greatest((select coalesce(max((substr(id, 2))::int), 0) from public.pudi_propositions), 6,
           (select last_value from public.pudi_proposition_num)), true);

create or replace function public.pudi_admin_proposition_enregistrer(p_id text, p_intitule text, p_lieu text,
  p_source text, p_date_source date, p_precision text, p_origine_vote text default null) returns text
language plpgsql volatile security definer set search_path = public as $$
declare nid text := p_id; s public.pudi_settings;
begin
  perform public.pudi_exiger_admin();
  select * into s from public.pudi_settings where id = 1;
  if now() >= s.cloture_at and p_id is null then raise exception 'PUDI_CLOS'; end if;
  if char_length(btrim(coalesce(p_intitule,''))) < 3 then raise exception 'PUDI_INTITULE'; end if;
  if char_length(btrim(coalesce(p_source,''))) < 2 then raise exception 'PUDI_SOURCE_REQUISE'; end if;
  if nid is null then
    nid := 'P' || nextval('public.pudi_proposition_num');
    insert into public.pudi_propositions (id, intitule, lieu, source, date_source, precision_texte, origine_vote, ajoute_par)
    values (nid, btrim(p_intitule), nullif(btrim(coalesce(p_lieu,'')),''), btrim(p_source), p_date_source,
      nullif(btrim(coalesce(p_precision,'')),''), p_origine_vote, auth.uid());
    perform public.pudi_journaliser('ajouter_proposition', nid, jsonb_build_object('intitule', p_intitule, 'source', p_source, 'origine_vote', p_origine_vote));
  else
    update public.pudi_propositions set intitule = btrim(p_intitule), lieu = nullif(btrim(coalesce(p_lieu,'')),''),
      source = btrim(p_source), date_source = p_date_source, precision_texte = nullif(btrim(coalesce(p_precision,'')),''),
      updated_at = now() where id = nid;
    if not found then raise exception 'PUDI_PROPOSITION_INCONNUE'; end if;
    perform public.pudi_journaliser('modifier_proposition', nid, jsonb_build_object('intitule', p_intitule));
  end if;
  return nid;
end $$;
revoke execute on function public.pudi_admin_proposition_enregistrer(text,text,text,text,date,text,text) from public, anon;
grant execute on function public.pudi_admin_proposition_enregistrer(text,text,text,text,date,text,text) to authenticated;
