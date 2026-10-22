-- PUDI-CC-08: specification v6 (P1 kept and renamed, one person one vote, managers see participation)

-- 1. P1 kept, renamed, unmasked (votes kept)
update public.pudi_propositions set
  intitule = 'Hôpital de niveau régional à Nosy Be',
  precision_texte = 'Demande exprimée en réunion PIC3 : soigner sur place les malades aujourd''hui évacués vers Antsiranana, au prix d''une traversée maritime et d''une longue route. Le PUDi recense un CHRD II à Andavakotoko (p. 34), prévoit un hôpital dans la nouvelle ville de Madiro (p. 104, programme A6) et annonce un nouvel hôpital dans la deuxième phase (p. 85), sans en préciser le niveau.',
  masque = false, masque_motif = null, updated_at = now()
where id = 'P1';
select public.pudi_journaliser('proposition_modifier', 'P1', '{"source":"cahier v6"}'::jsonb);

-- 2. Fingerprints of a member line (same formula as a vote: pudi_empreinte('tel:' || normalised number))
create or replace function public.pudi_empreintes_ligne(p_numeros text[]) returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(public.pudi_empreinte('tel:' || coalesce(public.pudi_normaliser_numero(x), x))), '{}')
  from unnest(coalesce(p_numeros, '{}')) x where btrim(coalesce(x, '')) <> ''
$$;
revoke execute on function public.pudi_empreintes_ligne(text[]) from public, anon, authenticated;

-- 3. pudi_soumettre_vote: current definition + « one person, one vote » across the numbers of a manager line
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

-- 4. Managers see participation (never the choices, dates, channel or which number voted)
drop function if exists public.pudi_mes_groupes();
create function public.pudi_mes_groupes()
returns table (code text, nom text, type text, nb_membres int, nb_ayant_vote int)
language sql stable security definer set search_path = public as $$
  select c.code, c.nom, c.type,
    (select count(*)::int from public.pudi_membres m where m.canal_code = c.code),
    (select count(*)::int from public.pudi_membres m where m.canal_code = c.code
       and exists (select 1 from public.pudi_votes v where not v.est_test
         and v.phone_hash = any(public.pudi_empreintes_ligne(m.numeros))))
  from public.pudi_canaux c
  where auth.uid() is not null and (public.pudi_is_admin()
     or exists (select 1 from public.pudi_responsables r where r.canal_code = c.code and r.email = public.pudi_mon_email()))
  order by c.nom
$$;

drop function if exists public.pudi_groupe_membres(text);
create function public.pudi_groupe_membres(p_canal text)
returns table (id uuid, numeros text[], email text, etablissement text, fokontany text, modifie_at timestamptz, a_vote boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.pudi_est_responsable(p_canal) then raise exception 'PUDI_RESPONSABLE_REQUIS'; end if;
  return query select m.id, m.numeros, m.email, m.etablissement, m.fokontany, m.modifie_at,
      exists (select 1 from public.pudi_votes v where not v.est_test
        and v.phone_hash = any(public.pudi_empreintes_ligne(m.numeros)))
    from public.pudi_membres m where m.canal_code = p_canal order by m.etablissement nulls last, m.ajoute_at;
end $$;

revoke execute on function public.pudi_mes_groupes(), public.pudi_groupe_membres(text) from public, anon;
grant execute on function public.pudi_mes_groupes(), public.pudi_groupe_membres(text) to authenticated;

-- 5. Refusals list: one more column « motif » so the screen can tell the two cases apart (same check, same grants)
drop function if exists public.pudi_admin_refus();
create function public.pudi_admin_refus()
returns table (at timestamptz, email_refuse text, id_anonyme_detenteur text, motif text)
language plpgsql stable security definer set search_path to 'public', 'auth' as $function$
begin
  perform public.pudi_exiger_admin();
  return query select r.at, u.email::text, v.id_anonyme, r.motif
  from public.pudi_refus r left join auth.users u on u.id = r.user_id
  left join public.pudi_votes v on v.phone_hash = r.phone_hash order by r.at desc;
end $function$;
revoke execute on function public.pudi_admin_refus() from public, anon;
grant execute on function public.pudi_admin_refus() to authenticated;
