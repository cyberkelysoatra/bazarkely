-- ============================================================================
-- PUDi Nosy Be 2026-2040 · Phase 2 · administration functions + scheduled purge
-- Requires the Phase 1 block. Idempotent. Every function checks the caller itself.
-- ============================================================================

create or replace function public.pudi_exiger_admin() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.pudi_is_admin() then raise exception 'PUDI_ADMIN_REQUIS'; end if;
end $$;

create or replace function public.pudi_journaliser(p_action text, p_cible text, p_details jsonb) returns void
language sql volatile security definer set search_path = public as $$
  insert into public.pudi_journal (user_id, action, cible, details) values (auth.uid(), p_action, p_cible, p_details)
$$;

-- Live dashboard
create or replace function public.pudi_admin_suivi() returns json
language plpgsql stable security definer set search_path = public as $$
declare r json;
begin
  perform public.pudi_exiger_admin();
  with v as (select * from public.pudi_votes where not est_test and not masque)
  select json_build_object(
    'calcule_at', now(),
    'nb_votes', (select count(*) from v),
    'nb_tests', (select count(*) from public.pudi_votes where est_test),
    'nb_masques', (select count(*) from public.pudi_votes where masque and not est_test),
    'nb_connexions', (select count(*) from public.pudi_connexions),
    'nb_refus', (select count(*) from public.pudi_refus),
    'par_jour', coalesce((select json_object_agg(j, k) from (select to_char(created_at at time zone 'Indian/Antananarivo','YYYY-MM-DD') j, count(*) k from v group by 1) x), '{}'),
    'par_canal', coalesce((select json_agg(json_build_object('code', code, 'n', n, 'hors_liste', hl) order by n desc)
        from (select coalesce(v.canal_code,'(aucun)') code, count(*) n,
                count(*) filter (where c.liste_membres and not exists
                  (select 1 from public.pudi_contacts k where k.canal_code = v.canal_code and k.phone_hash = v.phone_hash)) hl
              from v left join public.pudi_canaux c on c.code = v.canal_code group by 1) x), '[]'),
    'dans_nos_reseaux', (select count(*) from v where exists (select 1 from public.pudi_contacts k where k.phone_hash = v.phone_hash)),
    'fokontany_autre', (select count(*) from v where fokontany = 'AUTRE'),
    'indices_ip', coalesce((select json_agg(json_build_object('groupe', left(ip_hash, 6), 'n', n, 'du', du, 'au', au) order by n desc)
        from (select ip_hash, count(*) n, min(created_at) du, max(created_at) au from v
              where ip_hash is not null group by ip_hash having count(*) >= 5) x), '[]')
  ) into r;
  return r;
end $$;

-- Vote by vote (admins only): no e-mail, no phone
create or replace function public.pudi_admin_votes()
returns table (id_anonyme text, fokontany text, fokontany_autre text, profil text, canal_code text,
  dans_nos_reseaux boolean, groupes text[], hors_liste_du_canal boolean, priorites text[], urgents text[],
  manquant text, cree_le timestamptz, modifie_le timestamptz, nb_modifications int,
  masque boolean, masque_motif text, est_test boolean, groupe_ip text)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.pudi_exiger_admin();
  return query
  select v.id_anonyme, v.fokontany, v.fokontany_autre, v.profil, v.canal_code,
    exists (select 1 from public.pudi_contacts k where k.phone_hash = v.phone_hash),
    coalesce((select array_agg(distinct k.canal_code order by k.canal_code) from public.pudi_contacts k where k.phone_hash = v.phone_hash), '{}'),
    coalesce((select c.liste_membres from public.pudi_canaux c where c.code = v.canal_code), false)
      and not exists (select 1 from public.pudi_contacts k where k.canal_code = v.canal_code and k.phone_hash = v.phone_hash),
    v.priorites, v.urgents, v.manquant, v.created_at, v.updated_at, v.nb_modifications,
    v.masque, v.masque_motif, v.est_test, left(v.ip_hash, 6)
  from public.pudi_votes v order by v.created_at;
end $$;

create or replace function public.pudi_admin_masquer(p_id_anonyme text, p_masque boolean, p_motif text) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  perform public.pudi_exiger_admin();
  if p_masque and char_length(btrim(coalesce(p_motif,''))) < 3 then raise exception 'PUDI_MOTIF_REQUIS'; end if;
  update public.pudi_votes set masque = p_masque, masque_motif = case when p_masque then p_motif else null end
   where id_anonyme = p_id_anonyme;
  if not found then raise exception 'PUDI_VOTE_INCONNU'; end if;
  perform public.pudi_journaliser(case when p_masque then 'masquer_vote' else 'reafficher_vote' end, p_id_anonyme, jsonb_build_object('motif', p_motif));
end $$;

create or replace function public.pudi_admin_set_cloture(p_at timestamptz) returns void
language plpgsql volatile security definer set search_path = public as $$
declare ancien timestamptz;
begin
  perform public.pudi_exiger_admin();
  if p_at is null then raise exception 'PUDI_DATE'; end if;
  select cloture_at into ancien from public.pudi_settings where id = 1;
  update public.pudi_settings set cloture_at = p_at, updated_at = now(), updated_by = auth.uid() where id = 1;
  perform public.pudi_journaliser('changer_cloture', null, jsonb_build_object('avant', ancien, 'apres', p_at));
end $$;

-- Publication switch: Joel only. Publishing deletes the test votes made before.
create or replace function public.pudi_admin_set_publie(p_publie boolean) returns json
language plpgsql volatile security definer set search_path = public as $$
declare n int := 0;
begin
  if not public.is_joel() then raise exception 'PUDI_JOEL_REQUIS'; end if;
  if p_publie then delete from public.pudi_votes where est_test; get diagnostics n = row_count; end if;
  update public.pudi_settings set publie = p_publie, updated_at = now(), updated_by = auth.uid() where id = 1;
  perform public.pudi_journaliser(case when p_publie then 'publier' else 'depublier' end, null, jsonb_build_object('votes_test_supprimes', n));
  return json_build_object('publie', p_publie, 'votes_test_supprimes', n);
end $$;

create or replace function public.pudi_admin_canal_enregistrer(p_code text, p_nom text, p_type text,
  p_liste_membres boolean, p_responsable text, p_remarque text, p_actif boolean) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  perform public.pudi_exiger_admin();
  if p_code !~ '^[a-z0-9-]{1,24}$' then raise exception 'PUDI_CODE_CANAL'; end if;
  if char_length(btrim(coalesce(p_nom,''))) = 0 then raise exception 'PUDI_NOM_CANAL'; end if;
  insert into public.pudi_canaux (code, nom, type, liste_membres, responsable, remarque, actif)
  values (p_code, btrim(p_nom), p_type, coalesce(p_liste_membres,false), p_responsable, p_remarque, coalesce(p_actif,true))
  on conflict (code) do update set nom = excluded.nom, type = excluded.type, liste_membres = excluded.liste_membres,
    responsable = excluded.responsable, remarque = excluded.remarque, actif = excluded.actif;
  perform public.pudi_journaliser('enregistrer_canal', p_code, jsonb_build_object('nom', p_nom, 'actif', p_actif));
end $$;

create or replace function public.pudi_admin_canaux()
returns table (code text, nom text, type text, liste_membres boolean, responsable text, remarque text, actif boolean,
  nb_numeros bigint, nb_votes bigint, nb_votes_hors_liste bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.pudi_exiger_admin();
  return query
  select c.code, c.nom, c.type, c.liste_membres, c.responsable, c.remarque, c.actif,
    (select count(distinct k.phone_hash) from public.pudi_contacts k where k.canal_code = c.code),
    (select count(*) from public.pudi_votes v where v.canal_code = c.code and not v.est_test and not v.masque),
    (select count(*) from public.pudi_votes v where v.canal_code = c.code and not v.est_test and not v.masque and c.liste_membres
       and not exists (select 1 from public.pudi_contacts k where k.canal_code = c.code and k.phone_hash = v.phone_hash))
  from public.pudi_canaux c order by c.created_at;
end $$;

-- Import a list of numbers for a channel. Numbers arrive over HTTPS and are fingerprinted at once; never stored in clear.
create or replace function public.pudi_admin_importer_liste(p_canal text, p_source text, p_date date, p_numeros text[])
returns json
language plpgsql volatile security definer set search_path = public as $$
declare lid uuid := gen_random_uuid(); recus int := coalesce(cardinality(p_numeros),0); inval int; ins int; ailleurs int;
begin
  perform public.pudi_exiger_admin();
  if not exists (select 1 from public.pudi_canaux where code = p_canal) then raise exception 'PUDI_CANAL_INCONNU'; end if;
  if char_length(btrim(coalesce(p_source,''))) = 0 then raise exception 'PUDI_SOURCE_REQUISE'; end if;
  if recus > 20000 then raise exception 'PUDI_LISTE_TROP_LONGUE'; end if;
  insert into public.pudi_listes (id, canal_code, source, date_source, importe_par) values (lid, p_canal, btrim(p_source), p_date, auth.uid());
  with n as (select public.pudi_normaliser_numero(x) num from unnest(p_numeros) x)
  select count(*) filter (where num is null) into inval from n;
  with h as (select distinct public.pudi_empreinte('tel:' || num) ph
             from (select public.pudi_normaliser_numero(x) num from unnest(p_numeros) x) n where num is not null)
  insert into public.pudi_contacts (liste_id, canal_code, phone_hash) select lid, p_canal, ph from h;
  get diagnostics ins = row_count;
  select count(distinct k.phone_hash) into ailleurs from public.pudi_contacts k
   where k.liste_id = lid and exists (select 1 from public.pudi_contacts o where o.phone_hash = k.phone_hash and o.canal_code <> p_canal);
  update public.pudi_listes set nb_numeros = ins where id = lid;
  perform public.pudi_journaliser('importer_liste', p_canal, jsonb_build_object('liste', lid, 'source', p_source, 'recus', recus, 'valides', ins, 'invalides', inval));
  return json_build_object('liste_id', lid, 'recus', recus, 'enregistres', ins, 'invalides', inval,
    'doublons_dans_le_fichier', recus - inval - ins, 'deja_dans_un_autre_canal', ailleurs);
end $$;

create or replace function public.pudi_admin_listes()
returns table (id uuid, canal_code text, source text, date_source date, importe_at timestamptz, nb_numeros int)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.pudi_exiger_admin();
  return query select l.id, l.canal_code, l.source, l.date_source, l.importe_at, l.nb_numeros from public.pudi_listes l order by l.importe_at desc;
end $$;

create or replace function public.pudi_admin_supprimer_liste(p_liste uuid) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  perform public.pudi_exiger_admin();
  delete from public.pudi_listes where id = p_liste;
  if not found then raise exception 'PUDI_LISTE_INCONNUE'; end if;
  perform public.pudi_journaliser('supprimer_liste', p_liste::text, null);
end $$;

create or replace function public.pudi_admin_multi_canaux() returns json
language plpgsql stable security definer set search_path = public as $$
declare r json;
begin
  perform public.pudi_exiger_admin();
  with p as (select phone_hash, array_agg(distinct canal_code order by canal_code) cs from public.pudi_contacts group by phone_hash)
  select json_build_object(
    'numeros_total', (select count(*) from p),
    'numeros_multi_canaux', (select count(*) from p where cardinality(cs) > 1),
    'combinaisons', coalesce((select json_agg(json_build_object('canaux', cs, 'n', n) order by n desc)
        from (select cs, count(*) n from p where cardinality(cs) > 1 group by cs) x), '[]')) into r;
  return r;
end $$;

-- People who signed in on PUDi (D2 A); Joel ticks administrators here
create or replace function public.pudi_admin_connexions()
returns table (user_id uuid, email text, premiere timestamptz, derniere timestamptz, est_admin boolean, a_vote boolean)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  perform public.pudi_exiger_admin();
  return query
  select c.user_id, u.email::text, c.premiere, c.derniere,
    exists (select 1 from public.pudi_admins a where a.user_id = c.user_id),
    exists (select 1 from public.pudi_votes v where v.user_id = c.user_id)
  from public.pudi_connexions c join auth.users u on u.id = c.user_id order by c.derniere desc;
end $$;

create or replace function public.pudi_admin_set_admin(p_user uuid, p_admin boolean) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.is_joel() then raise exception 'PUDI_JOEL_REQUIS'; end if;
  if p_admin then insert into public.pudi_admins (user_id, ajoute_par) values (p_user, auth.uid()) on conflict do nothing;
  else delete from public.pudi_admins where user_id = p_user; end if;
  perform public.pudi_journaliser(case when p_admin then 'nommer_admin' else 'retirer_admin' end, p_user::text, null);
end $$;

-- Refused attempts (D3 B): the refused account's e-mail and the vote that holds the number
create or replace function public.pudi_admin_refus()
returns table (at timestamptz, email_refuse text, id_anonyme_detenteur text)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  perform public.pudi_exiger_admin();
  return query select r.at, u.email::text, v.id_anonyme
  from public.pudi_refus r left join auth.users u on u.id = r.user_id
  left join public.pudi_votes v on v.phone_hash = r.phone_hash order by r.at desc;
end $$;

-- Frees a number held by a vote (the real owner can then vote). The holding vote is masked.
create or replace function public.pudi_admin_liberer_numero(p_id_anonyme text, p_motif text) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  perform public.pudi_exiger_admin();
  if char_length(btrim(coalesce(p_motif,''))) < 3 then raise exception 'PUDI_MOTIF_REQUIS'; end if;
  update public.pudi_votes set phone_hash = 'libere:' || id_anonyme, masque = true, masque_motif = 'Numéro libéré : ' || p_motif
   where id_anonyme = p_id_anonyme;
  if not found then raise exception 'PUDI_VOTE_INCONNU'; end if;
  perform public.pudi_journaliser('liberer_numero', p_id_anonyme, jsonb_build_object('motif', p_motif));
end $$;

create or replace function public.pudi_admin_journal()
returns table (at timestamptz, email text, action text, cible text, details jsonb)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  perform public.pudi_exiger_admin();
  return query select j.at, u.email::text, j.action, j.cible, j.details
  from public.pudi_journal j left join auth.users u on u.id = j.user_id order by j.at desc limit 500;
end $$;

-- Purge of personal data (planned 28/01/2027). Joel or the scheduler only.
create or replace function public.pudi_purger(p_forcer boolean default false) returns json
language plpgsql volatile security definer set search_path = public as $$
declare s public.pudi_settings; nv int; nc int;
begin
  if auth.uid() is not null and not public.is_joel() then raise exception 'PUDI_JOEL_REQUIS'; end if;
  select * into s from public.pudi_settings where id = 1;
  if now() < s.purge_at and not p_forcer then return json_build_object('purge', false, 'prevue', s.purge_at); end if;
  delete from public.pudi_votes; get diagnostics nv = row_count;
  delete from public.pudi_contacts; get diagnostics nc = row_count;
  delete from public.pudi_listes; delete from public.pudi_refus; delete from public.pudi_connexions; delete from public.pudi_admins;
  delete from public.pudi_journal;
  insert into public.pudi_journal (user_id, action, details) values (auth.uid(), 'purge', jsonb_build_object('votes', nv, 'contacts', nc));
  return json_build_object('purge', true, 'votes', nv, 'contacts', nc);
end $$;

-- Preview for administrators: same aggregates INCLUDING test votes (lets JOEL check the display before publication)
create or replace function public.pudi_admin_resultats_apercu() returns json
language plpgsql stable security definer set search_path = public as $$
declare s public.pudi_settings; clos boolean; r json;
begin
  select * into s from public.pudi_settings where id = 1;
  clos := now() >= s.cloture_at;
  perform public.pudi_exiger_admin();

  with v as (select * from public.pudi_votes where not masque),
       n as (select count(*)::int as n from v),
       pr as (select p.id, p.ordre, p.tranche_pudi,
                (select count(*)::int from v where p.id = any(v.priorites)) as np,
                (select count(*)::int from v where p.id = any(v.urgents)) as nu
              from public.pudi_programmes p)
  select json_build_object(
    'apercu_avec_tests', true, 'nb_tests', (select count(*) from v where est_test), 'clos', clos, 'cloture_at', s.cloture_at, 'calcule_at', now(), 'nb_votants', (select n from n),
    'priorites', coalesce((select json_agg(json_build_object('id', id, 'n', np,
        'pct', case when (select n from n) = 0 then 0 else round(100.0 * np / (select n from n), 1) end)
        order by np desc, ordre) from pr), '[]'),
    'urgents', coalesce((select json_agg(json_build_object('id', id, 'n', nu,
        'pct', case when (select n from n) = 0 then 0 else round(100.0 * nu / (select n from n), 1) end,
        'tranche_pudi', tranche_pudi, 'ecart', tranche_pudi > 1 and nu > 0)
        order by nu desc, ordre) from pr), '[]'),
    'par_profil', coalesce((select json_object_agg(profil, k) from (select profil, count(*) k from v group by profil) x), '{}'),
    'par_fokontany', coalesce((select json_object_agg(fokontany, k) from (select fokontany, count(*) k from v group by fokontany) x), '{}'),
    'reseaux', json_build_object(
      'dans_nos_reseaux', (select count(*) from v where exists (select 1 from public.pudi_contacts c where c.phone_hash = v.phone_hash)),
      'hors_reseaux', (select count(*) from v where not exists (select 1 from public.pudi_contacts c where c.phone_hash = v.phone_hash))),
    'manquants', coalesce((select json_agg(manquant order by created_at) from v where manquant is not null), '[]')
  ) into r;
  return r;
end $$;

revoke execute on function public.pudi_admin_resultats_apercu() from public, anon;
grant execute on function public.pudi_admin_resultats_apercu() to authenticated;

-- Execute rights: helpers private; admin functions for authenticated (each checks the caller)
revoke execute on function public.pudi_exiger_admin(), public.pudi_journaliser(text,text,jsonb), public.pudi_purger(boolean)
  from public, anon, authenticated;
do $$ declare f text; begin
  foreach f in array array[
    'pudi_admin_suivi()','pudi_admin_votes()','pudi_admin_masquer(text,boolean,text)','pudi_admin_set_cloture(timestamptz)',
    'pudi_admin_set_publie(boolean)','pudi_admin_canal_enregistrer(text,text,text,boolean,text,text,boolean)','pudi_admin_canaux()',
    'pudi_admin_importer_liste(text,text,date,text[])','pudi_admin_listes()','pudi_admin_supprimer_liste(uuid)',
    'pudi_admin_multi_canaux()','pudi_admin_connexions()','pudi_admin_set_admin(uuid,boolean)','pudi_admin_refus()',
    'pudi_admin_liberer_numero(text,text)','pudi_admin_journal()'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
grant execute on function public.pudi_purger(boolean) to authenticated;  -- the function itself refuses anyone but Joel

-- Scheduled purge (only if pg_cron is installed; otherwise Joel uses the button, reminder in the admin screen)
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'pudi-purge';
    perform cron.schedule('pudi-purge', '5 21 27 1 *', 'select public.pudi_purger(false)');
  end if;
end $$;
