-- PUDI-CC-17: 12 votes to spread over the programmes and proposals (rule B, specification v9 4.5),
-- several votes allowed on the same programme, up to 12 on one. pudi_votes.priorites becomes a
-- multiset (one element per vote, the same id repeated for stacked votes, stored sorted).
-- Votes already sent (exactly 3 distinct programmes) stay valid as they are: 3 votes used of 12.
-- Every other check of the vote is unchanged. Idempotent: can be replayed.

-- Time the rule changed (votes not modified since then with 3 votes = « votes à 3 voix »).
alter table public.pudi_settings add column if not exists regle_voix_at timestamptz;
update public.pudi_settings set regle_voix_at = now() where id = 1 and regle_voix_at is null;

-- a. 1 to 12 votes (was exactly 3).
alter table public.pudi_votes drop constraint if exists pudi_votes_priorites_check;
alter table public.pudi_votes add constraint pudi_votes_priorites_check check (cardinality(priorites) between 1 and 12);

-- Helper: rewrites the live definition of a function with exact text replacements (never retyped).
-- A replacement already applied is skipped; a pattern found nowhere stops the migration.
create or replace function pg_temp.pudi_remplacer(p_fn regprocedure, p_paires text[])
returns void language plpgsql as $r$
declare d text := pg_get_functiondef(p_fn); i int;
begin
  for i in 1 .. array_length(p_paires, 1) / 2 loop
    if position(p_paires[2 * i] in d) > 0 then continue; end if;
    if position(p_paires[2 * i - 1] in d) = 0 then raise exception 'PUDI_CC17 pattern % not found in %', i, p_fn; end if;
    d := replace(d, p_paires[2 * i - 1], p_paires[2 * i]);
  end loop;
  execute d;
end $r$;

-- b. pudi_soumettre_vote: 1 to 12 votes, repetitions allowed, all known ids; stored sorted.
select pg_temp.pudi_remplacer('public.pudi_soumettre_vote(text,text,text,text,boolean,text[],text[],text,text)'::regprocedure, array[
'  if cardinality(p_priorites) is distinct from 3
     or (select count(distinct x) from unnest(p_priorites) x) <> 3
     or exists (select 1 from unnest(p_priorites) x where x not in (select public.pudi_ids_valides()))',
'  if coalesce(cardinality(p_priorites), 0) not between 1 and 12
     or exists (select 1 from unnest(p_priorites) x where x is null or x not in (select public.pudi_ids_valides()))',
'    p_priorites, urg, nullif(btrim(coalesce(p_manquant,'''')),''''), canal,',
'    array(select x from unnest(p_priorites) x order by x), urg, nullif(btrim(coalesce(p_manquant,'''')),''''), canal,'
]);

-- c. pudi_choix_noter: same rule (repetitions allowed, at most 12); complete = at least 1 vote.
select pg_temp.pudi_remplacer('public.pudi_choix_noter(uuid,text[],text[],text,text)'::regprocedure, array[
'  if cardinality(pri) > 3
     or (select count(distinct x) from unnest(pri) x) <> cardinality(pri)
     or exists (select 1 from unnest(pri) x where x not in (select public.pudi_ids_valides()))',
'  if cardinality(pri) > 12
     or exists (select 1 from unnest(pri) x where x is null or x not in (select public.pudi_ids_valides()))',
'cardinality(pri) = 3, now(), vu)',
'cardinality(pri) >= 1, now(), vu)'
]);

-- pudi_etat: also gives the freeze of the lists and the time of the rule change (additive keys),
-- so no closing or freezing date is ever written in the application.
select pg_temp.pudi_remplacer('public.pudi_etat()'::regprocedure, array[
'    ''cloture_at'', s.cloture_at,
',
'    ''cloture_at'', s.cloture_at,
    ''gel_listes_at'', s.gel_listes_at,
    ''regle_voix_at'', s.regle_voix_at,
'
]);

-- d. Results: per programme and proposal, votes (occurrences) and voters (distinct people),
-- concentration (votes with 6 or more on one programme), distribution 1..12, votes left at 3.
-- Old keys kept: n / pct = voters (and n_priorite / pct_priorite for the proposals).
create or replace function public.pudi_calculer_resultats(p_avec_tests boolean)
 returns json
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare s public.pudi_settings; r json;
begin
  select * into s from public.pudi_settings where id = 1;
  with v as (select * from public.pudi_votes where not masque and (p_avec_tests or not est_test)),
       n as (select count(*)::int as n from v),
       vx as (select v.user_id, x.id, count(*)::int as k from v, unnest(v.priorites) as x(id) group by v.user_id, x.id),
       t as (select coalesce(sum(k), 0)::int as voix from vx),
       pr as (select p.id, p.ordre, p.tranche_pudi,
                (select count(*)::int from vx where vx.id = p.id) as np,
                (select coalesce(sum(k), 0)::int from vx where vx.id = p.id) as nv,
                (select count(*)::int from vx where vx.id = p.id and vx.k >= 6) as nc,
                (select count(*)::int from v where p.id = any(v.urgents)) as nu
              from public.pudi_programmes p),
       po as (select q.id, q.intitule, q.ajoute_at, (substr(q.id, 2))::int as rang,
                (select count(*)::int from vx where vx.id = q.id) as np,
                (select coalesce(sum(k), 0)::int from vx where vx.id = q.id) as nv,
                (select count(*)::int from vx where vx.id = q.id and vx.k >= 6) as nc,
                (select count(*)::int from v where q.id = any(v.urgents)) as nu
              from public.pudi_propositions q where not q.masque)
  select json_build_object(
    'clos', now() >= s.cloture_at, 'cloture_at', s.cloture_at, 'publie_at', s.publie_at, 'calcule_at', now(),
    'nb_votants', (select n from n),
    'voix_placees', (select voix from t),
    'priorites', coalesce((select json_agg(json_build_object('id', id, 'n', np,
        'pct', case when (select n from n) = 0 then 0 else round(100.0 * np / (select n from n), 1) end,
        'voix', nv, 'votants', np,
        'pct_voix', case when (select voix from t) = 0 then 0 else round(100.0 * nv / (select voix from t), 1) end,
        'pct_votants', case when (select n from n) = 0 then 0 else round(100.0 * np / (select n from n), 1) end,
        'concentration', nc)
        order by nv desc, np desc, ordre) from pr), '[]'),
    'urgents', coalesce((select json_agg(json_build_object('id', id, 'n', nu,
        'pct', case when (select n from n) = 0 then 0 else round(100.0 * nu / (select n from n), 1) end,
        'tranche_pudi', tranche_pudi, 'ecart', tranche_pudi > 1 and nu > 0)
        order by nu desc, ordre) from pr), '[]'),
    'propositions', coalesce((select json_agg(json_build_object('id', id, 'intitule', intitule, 'ajoute_at', ajoute_at,
        'n_priorite', np, 'pct_priorite', case when (select n from n) = 0 then 0 else round(100.0 * np / (select n from n), 1) end,
        'voix', nv, 'votants', np,
        'pct_voix', case when (select voix from t) = 0 then 0 else round(100.0 * nv / (select voix from t), 1) end,
        'pct_votants', case when (select n from n) = 0 then 0 else round(100.0 * np / (select n from n), 1) end,
        'concentration', nc,
        'n_urgent', nu, 'pct_urgent', case when (select n from n) = 0 then 0 else round(100.0 * nu / (select n from n), 1) end)
        order by nv desc, np desc, nu desc, rang) from po), '[]'),
    'repartition', (select json_object_agg(g.k, (select count(*) from v where cardinality(v.priorites) = g.k) order by g.k)
        from generate_series(1, 12) as g(k)),
    'concentration', json_build_object(
      'votes', (select count(distinct user_id) from vx where k >= 6),
      'pct_votes', case when (select n from n) = 0 then 0 else round(100.0 * (select count(distinct user_id) from vx where k >= 6) / (select n from n), 1) end,
      'voix', (select coalesce(sum(k), 0) from vx where k >= 6),
      'pct_voix', case when (select voix from t) = 0 then 0 else round(100.0 * (select coalesce(sum(k), 0) from vx where k >= 6) / (select voix from t), 1) end),
    'nb_votes_3_voix', (select count(*) from v where cardinality(v.priorites) = 3
        and (select count(distinct x) from unnest(v.priorites) x) = 3
        and s.regle_voix_at is not null and v.updated_at <= s.regle_voix_at),
    'regle_voix_at', s.regle_voix_at,
    'par_profil', coalesce((select json_object_agg(profil, k) from (select profil, count(*) k from v group by profil) x), '{}'),
    'par_fokontany', coalesce((select json_object_agg(fokontany, k) from (select fokontany, count(*) k from v group by fokontany) x), '{}'),
    'reseaux', json_build_object(
      'dans_nos_reseaux', (select count(*) from v where exists (select 1 from public.pudi_contacts c where c.phone_hash = v.phone_hash)),
      'hors_reseaux', (select count(*) from v where not exists (select 1 from public.pudi_contacts c where c.phone_hash = v.phone_hash))),
    'manquants', coalesce((select json_agg(manquant order by created_at) from v where manquant is not null), '[]')
  ) into r;
  return r;
end $function$;

-- Organisers: clear number of a vote ONLY when its number is already in a manager's member list
-- (pudi_membres, clear by design, specification v6 4.14); else null (« inconnu »). Journaled.
create or replace function public.pudi_admin_votes_numeros()
 returns table(id_anonyme text, numero text)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  perform public.pudi_exiger_admin();
  perform public.pudi_journaliser('consulter_numeros_votes', null,
    jsonb_build_object('motif', 'relance des votants par WhatsApp (PUDI-CC-17)'));
  return query
  select v.id_anonyme,
    (select x from public.pudi_membres m, unnest(m.numeros) x
      where v.phone_hash = any(public.pudi_empreintes_ligne(m.numeros))
        and btrim(coalesce(x, '')) <> ''
        and public.pudi_empreinte('tel:' || coalesce(public.pudi_normaliser_numero(x), x)) = v.phone_hash
      order by m.ajoute_at limit 1)
  from public.pudi_votes v
  order by v.created_at;
end $function$;
revoke all on function public.pudi_admin_votes_numeros() from public, anon;
grant execute on function public.pudi_admin_votes_numeros() to authenticated;

-- Organisers: closing date changed from Admin > Paramètres, optionally moving the freeze of the
-- lists by the same delta (no new deployment). Journaled with both values.
create or replace function public.pudi_admin_set_cloture_gel(p_at timestamptz, p_deplacer_gel boolean)
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare ancien timestamptz; gel_avant timestamptz; gel_apres timestamptz;
begin
  perform public.pudi_exiger_admin();
  if p_at is null then raise exception 'PUDI_DATE'; end if;
  select cloture_at, gel_listes_at into ancien, gel_avant from public.pudi_settings where id = 1 for update;
  gel_apres := case when coalesce(p_deplacer_gel, false) and gel_avant is not null then gel_avant + (p_at - ancien) else gel_avant end;
  update public.pudi_settings set cloture_at = p_at, gel_listes_at = gel_apres, updated_at = now(), updated_by = auth.uid() where id = 1;
  perform public.pudi_journaliser('changer_cloture', null, jsonb_build_object('avant', ancien, 'apres', p_at,
    'gel_avant', gel_avant, 'gel_apres', gel_apres, 'gel_deplace', coalesce(p_deplacer_gel, false)));
  return json_build_object('cloture_at', p_at, 'gel_listes_at', gel_apres);
end $function$;
revoke all on function public.pudi_admin_set_cloture_gel(timestamptz, boolean) from public, anon;
grant execute on function public.pudi_admin_set_cloture_gel(timestamptz, boolean) to authenticated;
