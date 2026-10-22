-- PUDI-CC-09: automatic masking of an older vote of the same person, notice and claims.
-- Specification v6 point 4.14. Idempotent: can be replayed.

-- 1. Freeze of the manager lists (claims deadline)
alter table public.pudi_settings add column if not exists gel_listes_at timestamptz not null default '2026-10-27 18:00:00+03';

-- 2. Managers' WhatsApp number (normalised with pudi_normaliser_numero)
alter table public.pudi_responsables add column if not exists whatsapp text;

-- 3. One row per automatically masked vote
create table if not exists public.pudi_masquages (
  id text primary key check (id ~ '^M-[0-9A-F]{6}$'),
  vote_user_id uuid not null,
  vote_id_anonyme text not null,
  gagnant_user_id uuid not null,
  membre_id uuid,
  canal_code text,
  auteur_ligne uuid,
  at timestamptz not null default now(),
  vu_at timestamptz,
  retabli_at timestamptz,
  retabli_par uuid,
  retabli_motif text
);
create index if not exists pudi_masquages_actifs_idx on public.pudi_masquages (vote_user_id) where retabli_at is null;
alter table public.pudi_masquages enable row level security;
alter table public.pudi_masquages force row level security;
revoke all on public.pudi_masquages from public, anon, authenticated;

-- 4. Internal helpers (never callable by a client)
create or replace function public.pudi_motif_masquage_auto() returns text
language sql immutable as $$ select 'Masqué : remplacé par un vote plus récent de la même personne'::text $$;

create or replace function public.pudi_listes_figees() returns boolean
language sql stable security definer set search_path = public as $$
  select now() >= coalesce((select gel_listes_at from public.pudi_settings where id = 1), 'infinity'::timestamptz)
$$;

create or replace function public.pudi_nouvel_id_masquage() returns text
language plpgsql volatile security definer set search_path = public as $$
declare r text;
begin
  loop
    r := 'M-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
    exit when not exists (select 1 from public.pudi_masquages where id = r);
  end loop;
  return r;
end $$;

-- A vote restored by hand by an organiser stays out of the automatic masking (his decision stands).
create or replace function public.pudi_vote_retabli_a_la_main(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.pudi_masquages k where k.vote_user_id = p_user
    and k.retabli_at is not null and k.retabli_motif is distinct from 'Numéros séparés')
$$;

-- Masks the older real votes of one line: keeps the most recent, masks the others. Returns the count.
create or replace function public.pudi_masquer_ligne(p_membre uuid) returns int
language plpgsql volatile security definer set search_path = public as $$
declare m public.pudi_membres; fp text[]; g public.pudi_votes; v public.pudi_votes; mid text; n int := 0;
begin
  select * into m from public.pudi_membres where id = p_membre;
  if m.id is null then return 0; end if;
  fp := public.pudi_empreintes_ligne(m.numeros);
  select * into g from public.pudi_votes x
    where x.phone_hash = any(fp) and not x.est_test and not x.masque and not public.pudi_vote_retabli_a_la_main(x.user_id)
    order by x.updated_at desc, x.created_at desc, x.user_id limit 1;
  if g.user_id is null then return 0; end if;
  for v in select * from public.pudi_votes x
    where x.phone_hash = any(fp) and not x.est_test and not x.masque and x.user_id <> g.user_id
      and not public.pudi_vote_retabli_a_la_main(x.user_id)
  loop
    update public.pudi_votes set masque = true, masque_motif = public.pudi_motif_masquage_auto() where user_id = v.user_id;
    mid := public.pudi_nouvel_id_masquage();
    insert into public.pudi_masquages (id, vote_user_id, vote_id_anonyme, gagnant_user_id, membre_id, canal_code, auteur_ligne)
      values (mid, v.user_id, v.id_anonyme, g.user_id, m.id, m.canal_code, auth.uid());
    perform public.pudi_journaliser('masquage_auto', mid, jsonb_build_object('masquage', mid, 'membre', m.id,
      'canal', m.canal_code, 'auteur_ligne', auth.uid(), 'date', now()));
    n := n + 1;
  end loop;
  return n;
end $$;

-- Restores every active masking whose masked vote and kept vote no longer share any line.
-- Returns the fingerprints of the restored votes (their lines are checked again by the caller).
create or replace function public.pudi_retablir_separes() returns setof text
language plpgsql volatile security definer set search_path = public as $$
declare k public.pudi_masquages; hm text; hg text;
begin
  for k in select * from public.pudi_masquages where retabli_at is null order by at loop
    select phone_hash into hm from public.pudi_votes where user_id = k.vote_user_id;
    select phone_hash into hg from public.pudi_votes where user_id = k.gagnant_user_id;
    if hm is not null and hg is not null and exists (select 1 from public.pudi_membres m
        where array[hm, hg] <@ public.pudi_empreintes_ligne(m.numeros)) then
      continue;
    end if;
    update public.pudi_votes set masque = false, masque_motif = null
      where user_id = k.vote_user_id and masque and masque_motif = public.pudi_motif_masquage_auto();
    update public.pudi_masquages set retabli_at = now(), retabli_par = auth.uid(), retabli_motif = 'Numéros séparés' where id = k.id;
    perform public.pudi_journaliser('masquage_retabli', k.id, jsonb_build_object('masquage', k.id, 'membre', k.membre_id,
      'canal', k.canal_code, 'motif', 'Numéros séparés', 'automatique', true, 'date', now()));
    if hm is not null then return next hm; end if;
  end loop;
end $$;

-- After a save (p_membre = the line) or a delete (p_membre = null) of a manager line.
create or replace function public.pudi_apres_modif_ligne(p_membre uuid) returns void
language plpgsql volatile security definer set search_path = public as $$
declare h text; mb uuid;
begin
  if public.pudi_listes_figees() then return; end if;
  perform pg_advisory_xact_lock(hashtext('pudi_masquages'));
  for h in select * from public.pudi_retablir_separes() loop
    for mb in select m.id from public.pudi_membres m where h = any(public.pudi_empreintes_ligne(m.numeros)) loop
      perform public.pudi_masquer_ligne(mb);
    end loop;
  end loop;
  if p_membre is not null then perform public.pudi_masquer_ligne(p_membre); end if;
end $$;

revoke execute on function public.pudi_motif_masquage_auto(), public.pudi_listes_figees(), public.pudi_nouvel_id_masquage(),
  public.pudi_vote_retabli_a_la_main(uuid), public.pudi_masquer_ligne(uuid), public.pudi_retablir_separes(),
  public.pudi_apres_modif_ligne(uuid) from public, anon, authenticated;

-- 5. Manager line save / delete: current definitions + freeze + automatic masking and restoration
create or replace function public.pudi_groupe_membre_enregistrer(p_canal text, p_id uuid, p_numeros text[], p_email text, p_etablissement text, p_fokontany text)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare nums text[]; x text; n text; e text := nullif(lower(btrim(coalesce(p_email,''))), ''); rid uuid := coalesce(p_id, gen_random_uuid());
begin
  if not public.pudi_est_responsable(p_canal) then raise exception 'PUDI_RESPONSABLE_REQUIS'; end if;
  if public.pudi_listes_figees() then raise exception 'PUDI_LISTES_FIGEES'; end if;
  if p_id is not null and not exists (select 1 from public.pudi_membres where id = p_id and canal_code = p_canal)
    then raise exception 'PUDI_RESPONSABLE_REQUIS'; end if;
  nums := '{}';
  foreach x in array coalesce(p_numeros, '{}') loop
    if btrim(coalesce(x,'')) = '' then continue; end if;
    n := public.pudi_normaliser_numero(x);
    if n is null then raise exception 'PUDI_NUMERO_INVALIDE'; end if;
    if not n = any(nums) then nums := nums || n; end if;
  end loop;
  if cardinality(nums) not between 1 and 3 then raise exception 'PUDI_NUMERO_INVALIDE'; end if;
  if e is not null and e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'PUDI_EMAIL_INVALIDE'; end if;
  if exists (select 1 from public.pudi_membres m where m.canal_code = p_canal and m.id <> rid and m.numeros && nums)
    then raise exception 'PUDI_NUMERO_DEJA_DANS_LE_GROUPE'; end if;
  insert into public.pudi_membres as m (id, canal_code, numeros, email, etablissement, fokontany, ajoute_par, modifie_par)
    values (rid, p_canal, nums, e, nullif(btrim(coalesce(p_etablissement,'')),''), nullif(btrim(coalesce(p_fokontany,'')),''), auth.uid(), auth.uid())
  on conflict (id) do update set numeros = excluded.numeros, email = excluded.email, etablissement = excluded.etablissement,
    fokontany = excluded.fokontany, modifie_par = auth.uid(), modifie_at = now();
  perform public.pudi_resync_membres(p_canal);
  perform public.pudi_journaliser('membre_enregistrer', p_canal, jsonb_build_object('membre', rid, 'nb_numeros', cardinality(nums)));
  perform public.pudi_apres_modif_ligne(rid);
  return rid;
end $function$;

create or replace function public.pudi_groupe_membre_supprimer(p_canal text, p_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if not public.pudi_est_responsable(p_canal) then raise exception 'PUDI_RESPONSABLE_REQUIS'; end if;
  if public.pudi_listes_figees() then raise exception 'PUDI_LISTES_FIGEES'; end if;
  delete from public.pudi_membres where id = p_id and canal_code = p_canal;
  perform public.pudi_resync_membres(p_canal);
  perform public.pudi_journaliser('membre_supprimer', p_canal, jsonb_build_object('membre', p_id));
  perform public.pudi_apres_modif_ligne(null);
end $function$;

-- 6. Manager designation: Gmail AND WhatsApp number (3 arguments). The 2-argument form keeps its
-- signature and grants and now asks for the number (PUDI_NUMERO_INVALIDE).
create or replace function public.pudi_admin_responsable_ajouter(p_canal text, p_email text, p_whatsapp text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare e text := lower(btrim(coalesce(p_email,''))); w text := public.pudi_normaliser_numero(p_whatsapp);
begin
  perform public.pudi_exiger_admin();
  if public.pudi_listes_figees() then raise exception 'PUDI_LISTES_FIGEES'; end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'PUDI_EMAIL_INVALIDE'; end if;
  if w is null then raise exception 'PUDI_NUMERO_INVALIDE'; end if;
  if not exists (select 1 from public.pudi_canaux where code = p_canal) then raise exception 'PUDI_CANAL_INCONNU'; end if;
  insert into public.pudi_responsables (canal_code, email, ajoute_par, whatsapp) values (p_canal, e, auth.uid(), w)
    on conflict (canal_code, email) do update set whatsapp = excluded.whatsapp;
  perform public.pudi_journaliser('responsable_ajouter', p_canal, jsonb_build_object('email', e, 'whatsapp', true));
end $function$;

create or replace function public.pudi_admin_responsable_ajouter(p_canal text, p_email text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  perform public.pudi_admin_responsable_ajouter(p_canal, p_email, null);
end $function$;

drop function if exists public.pudi_admin_responsables(text);
create function public.pudi_admin_responsables(p_canal text)
 returns table(email text, ajoute_at timestamp with time zone, whatsapp text)
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
begin
  perform public.pudi_exiger_admin();
  return query select r.email, r.ajoute_at, r.whatsapp from public.pudi_responsables r where r.canal_code = p_canal order by r.email;
end $function$;

-- 7. Votes: current definition + a vote masked automatically cannot be changed (PUDI_VOTE_MASQUE)
create or replace function public.pudi_soumettre_vote(p_fokontany text, p_fokontany_autre text, p_profil text, p_telephone text, p_resident boolean, p_priorites text[], p_urgents text[], p_manquant text, p_canal text)
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid(); s public.pudi_settings; adm boolean := public.pudi_is_admin();
  num text; ph text; existing public.pudi_votes; canal text; urg text[] := coalesce(p_urgents, '{}');
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
    p_priorites, urg, nullif(btrim(coalesce(p_manquant,'')),''), canal, public.pudi_ip_hash(), not s.publie)
  on conflict (user_id) do update set
    fokontany = excluded.fokontany, fokontany_autre = excluded.fokontany_autre, profil = excluded.profil,
    phone_hash = excluded.phone_hash, priorites = excluded.priorites, urgents = excluded.urgents,
    manquant = excluded.manquant,
    canal_code = coalesce(v.canal_code, excluded.canal_code),
    ip_hash = excluded.ip_hash, est_test = excluded.est_test,
    nb_modifications = v.nb_modifications + 1, updated_at = now();

  return public.pudi_mon_vote();
end $function$;

-- 8. The person whose vote is masked: her active maskings (reference, date, the line author's
-- WhatsApp number only when that author is a designated manager of the channel with a number).
create or replace function public.pudi_mes_masquages()
returns table (id text, at timestamptz, whatsapp text, gel_listes_at timestamptz)
language sql stable security definer set search_path = public, auth as $$
  select k.id, k.at,
    (select r.whatsapp from public.pudi_responsables r join auth.users u on lower(u.email) = r.email
      where u.id = k.auteur_ligne and r.canal_code = k.canal_code and r.whatsapp is not null limit 1),
    (select s.gel_listes_at from public.pudi_settings s where s.id = 1)
  from public.pudi_masquages k
  where auth.uid() is not null and k.vote_user_id = auth.uid() and k.retabli_at is null
  order by k.at desc
$$;

create or replace function public.pudi_masquages_vus() returns int
language plpgsql volatile security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then raise exception 'PUDI_NON_CONNECTE'; end if;
  update public.pudi_masquages set vu_at = now() where vote_user_id = auth.uid() and vu_at is null and retabli_at is null;
  get diagnostics n = row_count;
  return n;
end $$;

-- 9. Organisers: list (never a vote's content, never a phone number) and manual restoration
create or replace function public.pudi_admin_masquages()
returns table (id text, at timestamptz, canal_code text, auteur_email text, email_masque text, id_anonyme text,
  retabli_at timestamptz, retabli_motif text, retabli_par_email text, vu_at timestamptz)
language plpgsql stable security definer set search_path to 'public', 'auth' as $function$
begin
  perform public.pudi_exiger_admin();
  return query select k.id, k.at, k.canal_code, ua.email::text, um.email::text, k.vote_id_anonyme,
      k.retabli_at, k.retabli_motif, ur.email::text, k.vu_at
    from public.pudi_masquages k
    left join auth.users ua on ua.id = k.auteur_ligne
    left join auth.users um on um.id = k.vote_user_id
    left join auth.users ur on ur.id = k.retabli_par
    order by coalesce(k.retabli_at, k.at) desc;
end $function$;

create or replace function public.pudi_admin_masquage_retablir(p_id text, p_motif text) returns void
language plpgsql volatile security definer set search_path = public as $$
declare k public.pudi_masquages;
begin
  perform public.pudi_exiger_admin();
  if char_length(btrim(coalesce(p_motif,''))) < 3 then raise exception 'PUDI_MOTIF_REQUIS'; end if;
  if public.pudi_listes_figees() and not public.is_joel() then raise exception 'PUDI_JOEL_REQUIS'; end if;
  perform pg_advisory_xact_lock(hashtext('pudi_masquages'));
  select * into k from public.pudi_masquages where id = p_id;
  if k.id is null then raise exception 'PUDI_MASQUAGE_INCONNU'; end if;
  if k.retabli_at is not null then raise exception 'PUDI_DEJA_RETABLI'; end if;
  update public.pudi_votes set masque = false, masque_motif = null
    where user_id = k.vote_user_id and masque and masque_motif = public.pudi_motif_masquage_auto();
  update public.pudi_masquages set retabli_at = now(), retabli_par = auth.uid(), retabli_motif = btrim(p_motif) where id = k.id;
  perform public.pudi_journaliser('masquage_retabli', k.id, jsonb_build_object('masquage', k.id, 'membre', k.membre_id,
    'canal', k.canal_code, 'motif', btrim(p_motif), 'automatique', false, 'date', now()));
end $$;

-- 10. Follow-up counters: current definition + maskings (active / restored)
create or replace function public.pudi_admin_suivi()
 returns json
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
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
    'nb_masquages_actifs', (select count(*) from public.pudi_masquages where retabli_at is null),
    'nb_masquages_retablis', (select count(*) from public.pudi_masquages where retabli_at is not null),
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
end $function$;

-- 11. « Retirer » a proposal always masks it (row kept, so « Rétablir » always works)
create or replace function public.pudi_admin_proposition_retirer(p_id text, p_motif text)
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare nv int;
begin
  perform public.pudi_exiger_admin();
  if char_length(btrim(coalesce(p_motif,''))) < 3 then raise exception 'PUDI_MOTIF_REQUIS'; end if;
  select count(*) into nv from public.pudi_votes v where p_id = any(v.priorites) or p_id = any(v.urgents);
  update public.pudi_propositions set masque = true, masque_motif = p_motif, updated_at = now() where id = p_id;
  if not found then raise exception 'PUDI_PROPOSITION_INCONNUE'; end if;
  perform public.pudi_journaliser('retirer_proposition', p_id, jsonb_build_object('motif', p_motif, 'votes', nv, 'efface', false));
  return json_build_object('id', p_id, 'votes', nv, 'efface', false);
end $function$;

-- 12. Purge: the maskings are deleted with everything else
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
  insert into public.pudi_journal (user_id, action, details) values (auth.uid(), 'purge', jsonb_build_object('votes', nv, 'contacts', nc));
  return json_build_object('purge', true, 'votes', nv, 'contacts', nc);
end $function$;

-- 13. Rights of the new client functions (the replaced ones keep theirs)
do $$ declare f text; begin
  foreach f in array array['pudi_admin_responsable_ajouter(text,text,text)','pudi_admin_responsables(text)',
    'pudi_mes_masquages()','pudi_masquages_vus()','pudi_admin_masquages()','pudi_admin_masquage_retablir(text,text)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
