-- PUDI-CC-18: no more « urgents » question, urgency read from the 12-vote ranking,
-- old 3-programme votes converted once to 4 + 4 + 4. Idempotent.

-- a. Backup of every vote before the conversion (created only once), closed to clients.
create table if not exists public.pudi_votes_sauvegarde_20261024 as select * from public.pudi_votes;
alter table public.pudi_votes_sauvegarde_20261024 enable row level security;
alter table public.pudi_votes_sauvegarde_20261024 force row level security;
revoke all on table public.pudi_votes_sauvegarde_20261024 from public, anon, authenticated;

-- b. Flag of the converted votes.
alter table public.pudi_votes add column if not exists converti_4x boolean not null default false;

-- c. Conversion: exactly 3 distinct programmes, sent before the 12-vote rule and not modified since.
--    updated_at, nb_modifications and masque are left as they are.
with s as (select regle_voix_at from public.pudi_settings where id = 1),
c as (
  select v.user_id, v.id_anonyme, v.priorites as avant,
         array(select x from unnest(v.priorites) x, generate_series(1, 4) g order by x) as apres
  from public.pudi_votes v, s
  where s.regle_voix_at is not null
    and cardinality(v.priorites) = 3
    and (select count(distinct x) from unnest(v.priorites) x) = 3
    and not v.converti_4x
    and v.updated_at < s.regle_voix_at
),
u as (
  update public.pudi_votes v set priorites = c.apres, converti_4x = true
  from c where v.user_id = c.user_id
  returning v.user_id
)
insert into public.pudi_journal (user_id, action, cible, details)
select null, 'vote_converti_4x', c.id_anonyme, jsonb_build_object('avant', c.avant, 'apres', c.apres)
from c join u on u.user_id = c.user_id;

-- d. Vote: p_urgents may be null (the client sends none); null keeps the stored urgents.
--    A vote sent again is no longer « converted ». Every other check unchanged.
create or replace function public.pudi_soumettre_vote(p_fokontany text, p_fokontany_autre text, p_profil text, p_telephone text, p_resident boolean, p_priorites text[], p_urgents text[], p_manquant text, p_canal text)
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid(); s public.pudi_settings; adm boolean := public.pudi_is_admin();
  num text; ph text; existing public.pudi_votes; canal text; urg text[] := p_urgents;
begin
  if uid is null then raise exception 'PUDI_NON_CONNECTE'; end if;
  select * into s from public.pudi_settings where id = 1;
  if now() >= s.cloture_at then raise exception 'PUDI_CLOS'; end if;
  if not s.publie and not adm then raise exception 'PUDI_NON_PUBLIE'; end if;

  -- PUDI-CC-09: a vote masked automatically (a more recent vote of the same person is kept) stays as it is.
  if exists (select 1 from public.pudi_votes v where v.user_id = uid and v.masque)
     and exists (select 1 from public.pudi_masquages k where k.vote_user_id = uid and k.retabli_at is null) then
    perform public.pudi_journaliser('vote_refuse', null, jsonb_build_object('motif', 'vote_masque'));
    return json_build_object('erreur', 'PUDI_VOTE_MASQUE');
  end if;

  if coalesce(p_resident, false) is false then raise exception 'PUDI_RESIDENCE'; end if;
  if p_profil is null or p_profil not in ('operateur_touristique','autre_entreprise','habitant','association_osc','autre')
    then raise exception 'PUDI_PROFIL'; end if;
  if p_fokontany is null or char_length(btrim(p_fokontany)) = 0 or char_length(p_fokontany) > 60
    then raise exception 'PUDI_FOKONTANY'; end if;
  if p_fokontany = 'AUTRE' and char_length(btrim(coalesce(p_fokontany_autre,''))) = 0
    then raise exception 'PUDI_FOKONTANY'; end if;
  if coalesce(cardinality(p_priorites), 0) not between 1 and 12
     or exists (select 1 from unnest(p_priorites) x where x is null or x not in (select public.pudi_ids_valides()))
    then raise exception 'PUDI_PRIORITES'; end if;
  if urg is not null and (cardinality(urg) > 10
     or (select count(distinct x) from unnest(urg) x) <> cardinality(urg)
     or exists (select 1 from unnest(urg) x where x not in (select public.pudi_ids_valides())))
    then raise exception 'PUDI_URGENTS'; end if;
  if char_length(coalesce(p_manquant,'')) > 1000 then raise exception 'PUDI_MANQUANT'; end if;

  select * into existing from public.pudi_votes where user_id = uid;

  if p_telephone is null or btrim(p_telephone) = '' then
    if existing.user_id is null then raise exception 'PUDI_NUMERO_INVALIDE'; end if;
    ph := existing.phone_hash;
  else
    num := public.pudi_normaliser_numero(p_telephone);
    if num is null then raise exception 'PUDI_NUMERO_INVALIDE'; end if;
    ph := public.pudi_empreinte('tel:' || num);
    if exists (select 1 from public.pudi_votes v where v.phone_hash = ph and v.user_id <> uid) then
      insert into public.pudi_refus (user_id, phone_hash, motif) values (uid, ph, 'numero_deja_utilise');
      return json_build_object('erreur', 'PUDI_NUMERO_DEJA_UTILISE');
    end if;
  end if;

  -- One person, one vote (v6): another number of the same manager line already voted with another account.
  if exists (select 1 from public.pudi_membres m where ph = any(public.pudi_empreintes_ligne(m.numeros))
      and exists (select 1 from public.pudi_votes v where v.user_id <> uid and v.phone_hash <> ph
        and v.phone_hash = any(public.pudi_empreintes_ligne(m.numeros)))) then
    insert into public.pudi_refus (user_id, phone_hash, motif) values (uid, ph, 'personne_deja_votee');
    perform public.pudi_journaliser('vote_refuse', null, jsonb_build_object('motif', 'personne_deja_votee'));
    return json_build_object('erreur', 'PUDI_PERSONNE_DEJA_VOTEE');
  end if;

  canal := case when p_canal ~ '^[a-z0-9-]{1,24}$' then p_canal else null end;

  insert into public.pudi_votes as v (user_id, fokontany, fokontany_autre, profil, phone_hash, resident_declare,
    priorites, urgents, manquant, canal_code, ip_hash, est_test)
  values (uid, p_fokontany, nullif(btrim(coalesce(p_fokontany_autre,'')),''), p_profil, ph, true,
    array(select x from unnest(p_priorites) x order by x), coalesce(urg, '{}'), nullif(btrim(coalesce(p_manquant,'')),''), canal, public.pudi_ip_hash(), not s.publie)
  on conflict (user_id) do update set
    fokontany = excluded.fokontany, fokontany_autre = excluded.fokontany_autre, profil = excluded.profil,
    phone_hash = excluded.phone_hash, priorites = excluded.priorites, urgents = coalesce(urg, v.urgents),
    manquant = excluded.manquant,
    canal_code = coalesce(v.canal_code, excluded.canal_code),
    ip_hash = excluded.ip_hash, est_test = excluded.est_test,
    converti_4x = false,
    nb_modifications = v.nb_modifications + 1, updated_at = now();

  return public.pudi_mon_vote();
end $function$;

-- My vote: tells whether it was converted to 4 + 4 + 4.
create or replace function public.pudi_mon_vote()
 returns json
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select json_build_object('fokontany', v.fokontany, 'fokontany_autre', v.fokontany_autre,
    'profil', v.profil, 'priorites', v.priorites, 'urgents', v.urgents, 'manquant', v.manquant,
    'canal_code', v.canal_code, 'created_at', v.created_at, 'updated_at', v.updated_at,
    'nb_modifications', v.nb_modifications, 'est_test', v.est_test, 'masque', v.masque,
    'converti_4x', v.converti_4x)
  from public.pudi_votes v where v.user_id = auth.uid()
$function$;

-- e. Results: no urgents in the public keys; « écart avec le PUDi » on the votes ranking
--    (top 15 programmes by votes, at least 1 vote, PUDi tranche 2031-2035 or 2036-2040).
create or replace function public.pudi_calculer_resultats(p_avec_tests boolean)
 returns json
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare s public.pudi_settings; r json; top_ecart constant int := 15;
begin
  select * into s from public.pudi_settings where id = 1;
  with v as (select * from public.pudi_votes where not masque and (p_avec_tests or not est_test)),
       n as (select count(*)::int as n from v),
       vx as (select v.user_id, x.id, count(*)::int as k from v, unnest(v.priorites) as x(id) group by v.user_id, x.id),
       t as (select coalesce(sum(k), 0)::int as voix from vx),
       pr0 as (select p.id, p.ordre, p.tranche_pudi,
                (select count(*)::int from vx where vx.id = p.id) as np,
                (select coalesce(sum(k), 0)::int from vx where vx.id = p.id) as nv,
                (select count(*)::int from vx where vx.id = p.id and vx.k >= 6) as nc
              from public.pudi_programmes p),
       pr as (select pr0.*, row_number() over (order by nv desc, np desc, ordre) as rang from pr0),
       po as (select q.id, q.intitule, q.ajoute_at, (substr(q.id, 2))::int as rang,
                (select count(*)::int from vx where vx.id = q.id) as np,
                (select coalesce(sum(k), 0)::int from vx where vx.id = q.id) as nv,
                (select count(*)::int from vx where vx.id = q.id and vx.k >= 6) as nc
              from public.pudi_propositions q where not q.masque)
  select json_build_object(
    'clos', now() >= s.cloture_at, 'cloture_at', s.cloture_at, 'publie_at', s.publie_at, 'calcule_at', now(),
    'nb_votants', (select n from n),
    'voix_placees', (select voix from t),
    'top_ecart', top_ecart,
    'priorites', coalesce((select json_agg(json_build_object('id', id, 'n', np,
        'pct', case when (select n from n) = 0 then 0 else round(100.0 * np / (select n from n), 1) end,
        'voix', nv, 'votants', np,
        'pct_voix', case when (select voix from t) = 0 then 0 else round(100.0 * nv / (select voix from t), 1) end,
        'pct_votants', case when (select n from n) = 0 then 0 else round(100.0 * np / (select n from n), 1) end,
        'concentration', nc,
        'tranche_pudi', tranche_pudi,
        'ecart_pudi', rang <= top_ecart and nv >= 1 and tranche_pudi > 1)
        order by nv desc, np desc, ordre) from pr), '[]'),
    'propositions', coalesce((select json_agg(json_build_object('id', id, 'intitule', intitule, 'ajoute_at', ajoute_at,
        'n_priorite', np, 'pct_priorite', case when (select n from n) = 0 then 0 else round(100.0 * np / (select n from n), 1) end,
        'voix', nv, 'votants', np,
        'pct_voix', case when (select voix from t) = 0 then 0 else round(100.0 * nv / (select voix from t), 1) end,
        'pct_votants', case when (select n from n) = 0 then 0 else round(100.0 * np / (select n from n), 1) end,
        'concentration', nc)
        order by nv desc, np desc, rang) from po), '[]'),
    'repartition', (select json_object_agg(g.k, (select count(*) from v where cardinality(v.priorites) = g.k) order by g.k)
        from generate_series(1, 12) as g(k)),
    'concentration', json_build_object(
      'votes', (select count(distinct user_id) from vx where k >= 6),
      'pct_votes', case when (select n from n) = 0 then 0 else round(100.0 * (select count(distinct user_id) from vx where k >= 6) / (select n from n), 1) end,
      'voix', (select coalesce(sum(k), 0) from vx where k >= 6),
      'pct_voix', case when (select voix from t) = 0 then 0 else round(100.0 * (select coalesce(sum(k), 0) from vx where k >= 6) / (select voix from t), 1) end),
    'nb_votes_convertis', (select count(*) from v where v.converti_4x),
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

-- f. Unsent choices: urgents accepted and dropped (signature kept).
create or replace function public.pudi_choix_noter(p_visiteur uuid, p_priorites text[], p_urgents text[], p_manquant text, p_canal text)
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  s public.pudi_settings; pri text[] := coalesce(p_priorites, '{}');
  uid uuid := auth.uid(); vu uuid; prec timestamptz;
begin
  if p_visiteur is null then raise exception 'PUDI_VISITEUR'; end if;
  select * into s from public.pudi_settings where id = 1;
  if not s.publie or now() >= s.cloture_at then return json_build_object('ok', false, 'ignore', true); end if;
  if cardinality(pri) > 12
     or exists (select 1 from unnest(pri) x where x is null or x not in (select public.pudi_ids_valides()))
    then raise exception 'PUDI_PRIORITES'; end if;
  if char_length(coalesce(p_manquant, '')) > 1000 then raise exception 'PUDI_MANQUANT'; end if;
  select maj_at into prec from public.pudi_choix_appareils where visiteur = p_visiteur;
  if prec is not null and prec > now() - interval '5 seconds' then
    return json_build_object('ok', false, 'erreur', 'PUDI_TROP_TOT');
  end if;
  -- A signed-in account that already voted: the device is « sent », never counted as unsent.
  if uid is not null and exists (select 1 from public.pudi_votes v where v.user_id = uid) then vu := uid; end if;
  insert into public.pudi_choix_appareils as c (visiteur, priorites, urgents, manquant, canal_code, complet, maj_at, vote_user)
  values (p_visiteur, pri, '{}', nullif(btrim(coalesce(p_manquant, '')), ''),
          (select k.code from public.pudi_canaux k where k.code = p_canal), cardinality(pri) >= 1, now(), vu)
  on conflict (visiteur) do update set
    priorites = excluded.priorites, urgents = excluded.urgents, manquant = excluded.manquant,
    canal_code = coalesce(c.canal_code, excluded.canal_code), complet = excluded.complet, maj_at = now(),
    vote_user = coalesce(c.vote_user, excluded.vote_user);
  return json_build_object('ok', true);
end $function$;

-- Purge of 28/01/2027 also drops the backup table.
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
  delete from public.pudi_discussion_versions;
  delete from public.pudi_messages; delete from public.pudi_discussion_suspendus;
  delete from public.pudi_messages_prives; delete from public.pudi_conversations;
  delete from public.pudi_presence;
  delete from public.pudi_choix_appareils;
  drop table if exists public.pudi_votes_sauvegarde_20261024;
  insert into public.pudi_journal (user_id, action, details) values (auth.uid(), 'purge', jsonb_build_object('votes', nv, 'contacts', nc));
  return json_build_object('purge', true, 'votes', nv, 'contacts', nc);
end $function$;
