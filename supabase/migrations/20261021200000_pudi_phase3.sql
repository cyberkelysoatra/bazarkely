-- ============================================================================
-- PUDi Nosy Be 2026-2040 · Phase 3 · proposals (outside the PIC list), real publication time
-- Requires the Phase 1 and Phase 2 blocks. Idempotent.
-- ============================================================================

-- 1. Real publication time (kept from the first publication)
alter table public.pudi_settings add column if not exists publie_at timestamptz;

-- 2. Proposals table
create table if not exists public.pudi_propositions (
  id text primary key check (id ~ '^P[0-9]{1,3}$'),
  intitule text not null check (char_length(intitule) between 3 and 140),
  lieu text check (char_length(lieu) <= 120),
  source text not null check (char_length(source) between 2 and 160),
  date_source date,
  precision_texte text check (char_length(precision_texte) <= 600),
  origine_vote text,
  ajoute_at timestamptz not null default now(),
  ajoute_par uuid,
  masque boolean not null default false,
  masque_motif text,
  updated_at timestamptz not null default now()
);
alter table public.pudi_propositions enable row level security;
alter table public.pudi_propositions force row level security;
revoke all on public.pudi_propositions from public, anon, authenticated;

insert into public.pudi_propositions (id, intitule, lieu, source, date_source, precision_texte) values
  ('P1', 'Nouveau CHRD (Centre hospitalier de référence de district)', null, 'Réunion PIC3 du 20/10/2026', '2026-10-20',
   'Le PUDi recense le CHRD II existant (p. 34) et ne programme pas de nouveau CHRD.'),
  ('P2', 'Projets pour Nosy Sakatia', 'Nosy Sakatia', 'Réunion PIC3 du 20/10/2026', '2026-10-20',
   'Sakatia n''est citée dans le PUDi que comme site touristique ; contenu à préciser.'),
  ('P3', 'Sécurité de la bande littorale des 300 m', 'Littoral', 'Sondage des opérateurs des 18 et 19/10/2026', '2026-10-19', null),
  ('P4', 'Lutte contre les nuisances sonores nocturnes', null, 'Sondage des opérateurs des 18 et 19/10/2026', '2026-10-19', null),
  ('P5', 'Gestion des animaux errants', null, 'Sondage des opérateurs des 18 et 19/10/2026', '2026-10-19', null)
on conflict (id) do nothing;

-- 3. Valid choice ids = the 52 programmes + the proposals not withdrawn
create or replace function public.pudi_ids_valides() returns setof text
language sql stable security definer set search_path = public as $$
  select id from public.pudi_programmes
  union all
  select id from public.pudi_propositions where not masque
$$;

-- 4. State: adds publie_at
create or replace function public.pudi_etat() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'publie', s.publie,
    'publie_at', s.publie_at,
    'cloture_at', s.cloture_at,
    'maintenant', now(),
    'clos', now() >= s.cloture_at,
    'connecte', auth.uid() is not null,
    'a_vote', exists (select 1 from public.pudi_votes v where v.user_id = auth.uid()),
    'est_admin', public.pudi_is_admin())
  from public.pudi_settings s where s.id = 1
$$;

-- 5. Public list of proposals (anon + authenticated)
create or replace function public.pudi_propositions_publiques() returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('id', id, 'intitule', intitule, 'lieu', lieu, 'source', source,
    'date_source', date_source, 'precision', precision_texte, 'ajoute_at', ajoute_at)
    order by (substr(id, 2))::int), '[]')
  from public.pudi_propositions where not masque
$$;

-- 6. Vote: same rules, ids checked against programmes + active proposals
create or replace function public.pudi_soumettre_vote(
  p_fokontany text, p_fokontany_autre text, p_profil text, p_telephone text,
  p_resident boolean, p_priorites text[], p_urgents text[], p_manquant text, p_canal text)
returns json
language plpgsql volatile security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); s public.pudi_settings; adm boolean := public.pudi_is_admin();
  num text; ph text; existing public.pudi_votes; canal text; urg text[] := coalesce(p_urgents, '{}');
begin
  if uid is null then raise exception 'PUDI_NON_CONNECTE'; end if;
  select * into s from public.pudi_settings where id = 1;
  if now() >= s.cloture_at then raise exception 'PUDI_CLOS'; end if;
  if not s.publie and not adm then raise exception 'PUDI_NON_PUBLIE'; end if;
  if coalesce(p_resident, false) is false then raise exception 'PUDI_RESIDENCE'; end if;
  if p_profil is null or p_profil not in ('operateur_touristique','autre_entreprise','habitant','association_osc','autre')
    then raise exception 'PUDI_PROFIL'; end if;
  if p_fokontany is null or char_length(btrim(p_fokontany)) = 0 or char_length(p_fokontany) > 60
    then raise exception 'PUDI_FOKONTANY'; end if;
  if p_fokontany = 'AUTRE' and char_length(btrim(coalesce(p_fokontany_autre,''))) = 0
    then raise exception 'PUDI_FOKONTANY'; end if;
  if cardinality(p_priorites) is distinct from 3
     or (select count(distinct x) from unnest(p_priorites) x) <> 3
     or exists (select 1 from unnest(p_priorites) x where x not in (select public.pudi_ids_valides()))
    then raise exception 'PUDI_PRIORITES'; end if;
  if cardinality(urg) > 10
     or (select count(distinct x) from unnest(urg) x) <> cardinality(urg)
     or exists (select 1 from unnest(urg) x where x not in (select public.pudi_ids_valides()))
    then raise exception 'PUDI_URGENTS'; end if;
  if char_length(coalesce(p_manquant,'')) > 300 then raise exception 'PUDI_MANQUANT'; end if;

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

  canal := case when p_canal ~ '^[a-z0-9-]{1,24}$' then p_canal else null end;

  insert into public.pudi_votes as v (user_id, fokontany, fokontany_autre, profil, phone_hash, resident_declare,
    priorites, urgents, manquant, canal_code, ip_hash, est_test)
  values (uid, p_fokontany, nullif(btrim(coalesce(p_fokontany_autre,'')),''), p_profil, ph, true,
    p_priorites, urg, nullif(btrim(coalesce(p_manquant,'')),''), canal, public.pudi_ip_hash(), not s.publie)
  on conflict (user_id) do update set
    fokontany = excluded.fokontany, fokontany_autre = excluded.fokontany_autre, profil = excluded.profil,
    phone_hash = excluded.phone_hash, priorites = excluded.priorites, urgents = excluded.urgents,
    manquant = excluded.manquant,
    canal_code = coalesce(v.canal_code, excluded.canal_code),
    ip_hash = excluded.ip_hash, est_test = excluded.est_test,
    nb_modifications = v.nb_modifications + 1, updated_at = now();

  return public.pudi_mon_vote();
end $$;

-- 7. Results computed in one private function; programmes and proposals counted SEPARATELY
create or replace function public.pudi_calculer_resultats(p_avec_tests boolean) returns json
language plpgsql stable security definer set search_path = public as $$
declare s public.pudi_settings; r json;
begin
  select * into s from public.pudi_settings where id = 1;
  with v as (select * from public.pudi_votes where not masque and (p_avec_tests or not est_test)),
       n as (select count(*)::int as n from v),
       pr as (select p.id, p.ordre, p.tranche_pudi,
                (select count(*)::int from v where p.id = any(v.priorites)) as np,
                (select count(*)::int from v where p.id = any(v.urgents)) as nu
              from public.pudi_programmes p),
       po as (select q.id, q.intitule, q.ajoute_at, (substr(q.id, 2))::int as rang,
                (select count(*)::int from v where q.id = any(v.priorites)) as np,
                (select count(*)::int from v where q.id = any(v.urgents)) as nu
              from public.pudi_propositions q where not q.masque)
  select json_build_object(
    'clos', now() >= s.cloture_at, 'cloture_at', s.cloture_at, 'publie_at', s.publie_at, 'calcule_at', now(),
    'nb_votants', (select n from n),
    'priorites', coalesce((select json_agg(json_build_object('id', id, 'n', np,
        'pct', case when (select n from n) = 0 then 0 else round(100.0 * np / (select n from n), 1) end)
        order by np desc, ordre) from pr), '[]'),
    'urgents', coalesce((select json_agg(json_build_object('id', id, 'n', nu,
        'pct', case when (select n from n) = 0 then 0 else round(100.0 * nu / (select n from n), 1) end,
        'tranche_pudi', tranche_pudi, 'ecart', tranche_pudi > 1 and nu > 0)
        order by nu desc, ordre) from pr), '[]'),
    'propositions', coalesce((select json_agg(json_build_object('id', id, 'intitule', intitule, 'ajoute_at', ajoute_at,
        'n_priorite', np, 'pct_priorite', case when (select n from n) = 0 then 0 else round(100.0 * np / (select n from n), 1) end,
        'n_urgent', nu, 'pct_urgent', case when (select n from n) = 0 then 0 else round(100.0 * nu / (select n from n), 1) end)
        order by np desc, nu desc, rang) from po), '[]'),
    'par_profil', coalesce((select json_object_agg(profil, k) from (select profil, count(*) k from v group by profil) x), '{}'),
    'par_fokontany', coalesce((select json_object_agg(fokontany, k) from (select fokontany, count(*) k from v group by fokontany) x), '{}'),
    'reseaux', json_build_object(
      'dans_nos_reseaux', (select count(*) from v where exists (select 1 from public.pudi_contacts c where c.phone_hash = v.phone_hash)),
      'hors_reseaux', (select count(*) from v where not exists (select 1 from public.pudi_contacts c where c.phone_hash = v.phone_hash))),
    'manquants', coalesce((select json_agg(manquant order by created_at) from v where manquant is not null), '[]')
  ) into r;
  return r;
end $$;

create or replace function public.pudi_resultats() returns json
language plpgsql stable security definer set search_path = public as $$
declare s public.pudi_settings; r json;
begin
  select * into s from public.pudi_settings where id = 1;
  if now() < s.cloture_at and not public.pudi_is_admin() and not exists (
      select 1 from public.pudi_votes v where v.user_id = auth.uid() and not v.masque and not v.est_test)
    then raise exception 'PUDI_RESULTATS_RESERVES'; end if;
  r := public.pudi_calculer_resultats(false);
  return r;
end $$;

create or replace function public.pudi_admin_resultats_apercu() returns json
language plpgsql stable security definer set search_path = public as $$
declare r json;
begin
  perform public.pudi_exiger_admin();
  r := public.pudi_calculer_resultats(true);
  return (r::jsonb || jsonb_build_object('apercu_avec_tests', true,
    'nb_tests', (select count(*) from public.pudi_votes where est_test and not masque)))::json;
end $$;

-- 8. Publication keeps the time of the FIRST publication
create or replace function public.pudi_admin_set_publie(p_publie boolean) returns json
language plpgsql volatile security definer set search_path = public as $$
declare n int := 0;
begin
  if not public.is_joel() then raise exception 'PUDI_JOEL_REQUIS'; end if;
  if p_publie then delete from public.pudi_votes where est_test; get diagnostics n = row_count; end if;
  update public.pudi_settings set publie = p_publie,
    publie_at = case when p_publie then coalesce(publie_at, now()) else publie_at end,
    updated_at = now(), updated_by = auth.uid() where id = 1;
  perform public.pudi_journaliser(case when p_publie then 'publier' else 'depublier' end, null, jsonb_build_object('votes_test_supprimes', n));
  return json_build_object('publie', p_publie, 'votes_test_supprimes', n);
end $$;

-- 9. Proposals administration
create or replace function public.pudi_admin_propositions()
returns table (id text, intitule text, lieu text, source text, date_source date, precision_texte text, origine_vote text,
  ajoute_at timestamptz, masque boolean, masque_motif text, nb_priorite bigint, nb_urgent bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.pudi_exiger_admin();
  return query select q.id, q.intitule, q.lieu, q.source, q.date_source, q.precision_texte, q.origine_vote,
    q.ajoute_at, q.masque, q.masque_motif,
    (select count(*) from public.pudi_votes v where q.id = any(v.priorites) and not v.est_test and not v.masque),
    (select count(*) from public.pudi_votes v where q.id = any(v.urgents) and not v.est_test and not v.masque)
  from public.pudi_propositions q order by (substr(q.id, 2))::int;
end $$;

-- p_id null = new proposal (next free number). Returns the id.
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
    perform pg_advisory_xact_lock(hashtext('pudi_propositions'));
    select 'P' || (coalesce(max((substr(id, 2))::int), 0) + 1) into nid from public.pudi_propositions;
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

-- Withdraw: deleted if nobody chose it, otherwise masked (votes kept); reason required
create or replace function public.pudi_admin_proposition_retirer(p_id text, p_motif text) returns json
language plpgsql volatile security definer set search_path = public as $$
declare nv int;
begin
  perform public.pudi_exiger_admin();
  if char_length(btrim(coalesce(p_motif,''))) < 3 then raise exception 'PUDI_MOTIF_REQUIS'; end if;
  select count(*) into nv from public.pudi_votes v where p_id = any(v.priorites) or p_id = any(v.urgents);
  if nv = 0 then
    delete from public.pudi_propositions where id = p_id;
    if not found then raise exception 'PUDI_PROPOSITION_INCONNUE'; end if;
  else
    update public.pudi_propositions set masque = true, masque_motif = p_motif, updated_at = now() where id = p_id;
  end if;
  perform public.pudi_journaliser('retirer_proposition', p_id, jsonb_build_object('motif', p_motif, 'votes', nv, 'efface', nv = 0));
  return json_build_object('id', p_id, 'votes', nv, 'efface', nv = 0);
end $$;

create or replace function public.pudi_admin_proposition_retablir(p_id text) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  perform public.pudi_exiger_admin();
  update public.pudi_propositions set masque = false, masque_motif = null, updated_at = now() where id = p_id;
  if not found then raise exception 'PUDI_PROPOSITION_INCONNUE'; end if;
  perform public.pudi_journaliser('retablir_proposition', p_id, null);
end $$;

-- Free text of a voter -> proposal (source "Texte libre d'un votant", origin kept)
create or replace function public.pudi_admin_transformer_manquant(p_id_anonyme text, p_intitule text, p_lieu text, p_precision text)
returns text
language plpgsql volatile security definer set search_path = public as $$
declare t text;
begin
  perform public.pudi_exiger_admin();
  select manquant into t from public.pudi_votes where id_anonyme = p_id_anonyme;
  if t is null then raise exception 'PUDI_VOTE_INCONNU'; end if;
  return public.pudi_admin_proposition_enregistrer(null, p_intitule, p_lieu, 'Texte libre d''un votant',
    (now() at time zone 'Indian/Antananarivo')::date, coalesce(p_precision, 'Proposé par un votant : « ' || t || ' »'), p_id_anonyme);
end $$;

-- 10. Rights
revoke execute on function public.pudi_ids_valides(), public.pudi_calculer_resultats(boolean) from public, anon, authenticated;
revoke execute on function public.pudi_etat(), public.pudi_propositions_publiques() from public;
grant execute on function public.pudi_etat(), public.pudi_propositions_publiques() to anon, authenticated;
do $$ declare f text; begin
  foreach f in array array['pudi_admin_propositions()','pudi_admin_proposition_enregistrer(text,text,text,text,date,text,text)',
    'pudi_admin_proposition_retirer(text,text)','pudi_admin_proposition_retablir(text)',
    'pudi_admin_transformer_manquant(text,text,text,text)','pudi_admin_resultats_apercu()','pudi_admin_set_publie(boolean)',
    'pudi_soumettre_vote(text,text,text,text,boolean,text[],text[],text,text)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
