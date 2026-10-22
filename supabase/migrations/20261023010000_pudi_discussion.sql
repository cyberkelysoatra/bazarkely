-- PUDI-CC-12: one public discussion. Readable by everyone, written by signed-in accounts, author
-- shown as first name + initial (never an e-mail, an id or a number). A deleted message stays as
-- « Ce message a été supprimé ». Organisers may suspend an account from writing.
-- Idempotent: can be replayed.

create table if not exists public.pudi_messages (
  id uuid primary key default gen_random_uuid(),
  auteur uuid not null,
  auteur_nom text not null check (char_length(auteur_nom) between 1 and 40),
  texte text not null check (char_length(texte) between 1 and 500),
  reponse_a uuid null references public.pudi_messages(id),
  cree_at timestamptz not null default now(),
  supprime_at timestamptz,
  supprime_par uuid,
  supprime_role text check (supprime_role in ('auteur','responsable','organisateur'))
);
create index if not exists pudi_messages_cree_at on public.pudi_messages (cree_at);
create index if not exists pudi_messages_auteur on public.pudi_messages (auteur, cree_at);
alter table public.pudi_messages enable row level security;
alter table public.pudi_messages force row level security;
revoke all on public.pudi_messages from public, anon, authenticated;

create table if not exists public.pudi_discussion_suspendus (
  user_id uuid primary key,
  par uuid,
  motif text,
  at timestamptz default now()
);
alter table public.pudi_discussion_suspendus enable row level security;
alter table public.pudi_discussion_suspendus force row level security;
revoke all on public.pudi_discussion_suspendus from public, anon, authenticated;

-- « Joël S. » from the Google full name; « Participant » when there is none.
create or replace function public.pudi_discussion_nom(p_user uuid)
returns text
language plpgsql stable security definer set search_path = public as $$
declare brut text; mots text[]; prenom text; n int;
begin
  select btrim(coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''))
    into brut from auth.users u where u.id = p_user;
  mots := regexp_split_to_array(coalesce(brut, ''), '\s+');
  mots := array_remove(mots, '');
  n := coalesce(array_length(mots, 1), 0);
  if n = 0 then return 'Participant'; end if;
  prenom := left(mots[1], 36);
  if n = 1 then return prenom; end if;
  return prenom || ' ' || upper(left(mots[n], 1)) || '.';
end $$;

-- Authors whose messages the caller may delete as a group manager: members of one of his
-- channels (vote number fingerprint on a line, or Google e-mail of a line).
create or replace function public.pudi_discussion_auteurs_geres(p_canal text default null)
returns setof uuid
language sql stable security definer set search_path = public as $$
  select distinct a.auteur
  from (select distinct auteur from public.pudi_messages) a
  join auth.users u on u.id = a.auteur
  where exists (
    select 1 from public.pudi_membres m
    where (case when p_canal is null
             then m.canal_code in (select r.canal_code from public.pudi_responsables r where r.email = public.pudi_mon_email())
             else m.canal_code = p_canal end)
      and ((m.email is not null and lower(btrim(m.email)) = lower(btrim(u.email)))
        or exists (select 1 from public.pudi_votes v where v.user_id = a.auteur
                     and v.phone_hash = any(public.pudi_empreintes_ligne(m.numeros)))))
$$;

-- Page of messages before p_avant (oldest first). p_apercu_canal: organisers only, delete rights
-- computed as for a manager of that channel (JOEL's role preview).
create or replace function public.pudi_discussion_lire(p_avant timestamptz default null, p_limite int default 50, p_apercu_canal text default null)
returns json
language plpgsql stable security definer set search_path = public as $$
declare
  moi uuid := auth.uid();
  orga boolean := public.pudi_is_admin();
  apercu boolean := p_apercu_canal is not null and public.pudi_is_admin();
  geres uuid[] := '{}';
  r json;
begin
  if moi is not null and (apercu or (not orga and exists (select 1 from public.pudi_responsables x where x.email = public.pudi_mon_email()))) then
    select coalesce(array_agg(g), '{}') into geres from public.pudi_discussion_auteurs_geres(case when apercu then p_apercu_canal end) g;
  end if;
  select coalesce(json_agg(json_build_object(
      'id', m.id,
      'auteur_nom', m.auteur_nom,
      'texte', case when m.supprime_at is null then m.texte else '' end,
      'supprime', m.supprime_at is not null,
      'supprime_role', m.supprime_role,
      'cree_at', m.cree_at,
      'reponse_a', case when m.reponse_a is null then null else (
        select json_build_object('id', p.id, 'auteur_nom', p.auteur_nom,
          'extrait', case when p.supprime_at is null then left(p.texte, 80) else '' end,
          'supprime', p.supprime_at is not null)
        from public.pudi_messages p where p.id = m.reponse_a) end,
      'est_moi', moi is not null and m.auteur = moi,
      'peut_supprimer', moi is not null and m.supprime_at is null
        and (m.auteur = moi or (orga and not apercu) or m.auteur = any(geres)),
      'auteur_suspendu', case when orga and not apercu then exists (select 1 from public.pudi_discussion_suspendus s where s.user_id = m.auteur) end
    ) order by m.cree_at, m.id), '[]')
  into r
  from (select * from public.pudi_messages
        where p_avant is null or cree_at < p_avant
        order by cree_at desc, id desc
        limit least(greatest(coalesce(p_limite, 50), 1), 100)) m;
  return r;
end $$;

-- Writing: signed in, not suspended, 1..500 characters (max 10 line breaks), 1 per 10 s, 60 a day.
create or replace function public.pudi_discussion_ecrire(p_texte text, p_reponse_a uuid default null)
returns json
language plpgsql volatile security definer set search_path = public as $$
declare
  moi uuid := auth.uid();
  t text;
  lignes text[];
  nid uuid;
begin
  if moi is null then raise exception 'PUDI_NON_CONNECTE'; end if;
  if exists (select 1 from public.pudi_discussion_suspendus s where s.user_id = moi) then raise exception 'PUDI_DISCUSSION_SUSPENDU'; end if;
  t := btrim(replace(coalesce(p_texte, ''), E'\r\n', E'\n'), E' \t\n\r');
  lignes := string_to_array(t, E'\n');
  if array_length(lignes, 1) > 11 then
    t := array_to_string(lignes[1:11], E'\n') || ' ' || array_to_string(lignes[12:], ' ');
  end if;
  if char_length(t) < 1 or char_length(t) > 500 then raise exception 'PUDI_MESSAGE_INVALIDE'; end if;
  if p_reponse_a is not null and not exists (select 1 from public.pudi_messages where id = p_reponse_a) then raise exception 'PUDI_MESSAGE_INVALIDE'; end if;
  perform pg_advisory_xact_lock(hashtext('pudi_discussion:' || moi::text));
  if exists (select 1 from public.pudi_messages where auteur = moi and cree_at > now() - interval '10 seconds')
     or (select count(*) from public.pudi_messages where auteur = moi and cree_at > now() - interval '1 day') >= 60 then
    raise exception 'PUDI_TROP_DE_MESSAGES';
  end if;
  insert into public.pudi_messages (auteur, auteur_nom, texte, reponse_a)
  values (moi, public.pudi_discussion_nom(moi), t, p_reponse_a)
  returning id into nid;
  perform public.pudi_journaliser('message_ecrire', nid::text, '{}'::jsonb);
  return json_build_object('id', nid);
end $$;

-- Deleting (the row stays): author, organiser, or manager of a channel where the author is a member.
create or replace function public.pudi_discussion_supprimer(p_id uuid)
returns json
language plpgsql volatile security definer set search_path = public as $$
declare
  moi uuid := auth.uid();
  m public.pudi_messages;
  role text;
begin
  if moi is null then raise exception 'PUDI_NON_CONNECTE'; end if;
  select * into m from public.pudi_messages where id = p_id for update;
  if not found then raise exception 'PUDI_MESSAGE_INCONNU'; end if;
  if m.supprime_at is not null then return json_build_object('id', p_id, 'deja', true); end if;
  if m.auteur = moi then role := 'auteur';
  elsif public.pudi_is_admin() then role := 'organisateur';
  elsif exists (select 1 from public.pudi_discussion_auteurs_geres(null) g where g = m.auteur) then role := 'responsable';
  else raise exception 'PUDI_SUPPRESSION_INTERDITE';
  end if;
  update public.pudi_messages set supprime_at = now(), supprime_par = moi, supprime_role = role where id = p_id;
  perform public.pudi_journaliser('message_supprimer', p_id::text, jsonb_build_object('role', role));
  return json_build_object('id', p_id, 'role', role);
end $$;

-- Organisers: suspend the author of a message (reason required) and lift it.
create or replace function public.pudi_admin_discussion_suspendre(p_message uuid, p_motif text)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare a uuid;
begin
  perform public.pudi_exiger_admin();
  if char_length(btrim(coalesce(p_motif, ''))) < 3 then raise exception 'PUDI_MOTIF_REQUIS'; end if;
  select auteur into a from public.pudi_messages where id = p_message;
  if a is null then raise exception 'PUDI_MESSAGE_INCONNU'; end if;
  insert into public.pudi_discussion_suspendus (user_id, par, motif) values (a, auth.uid(), btrim(p_motif))
  on conflict (user_id) do update set par = excluded.par, motif = excluded.motif, at = now();
  perform public.pudi_journaliser('discussion_suspendre', p_message::text, jsonb_build_object('motif', btrim(p_motif)));
end $$;

create or replace function public.pudi_admin_discussion_retablir_auteur(p_message uuid)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare a uuid;
begin
  perform public.pudi_exiger_admin();
  select auteur into a from public.pudi_messages where id = p_message;
  if a is null then raise exception 'PUDI_MESSAGE_INCONNU'; end if;
  delete from public.pudi_discussion_suspendus where user_id = a;
  perform public.pudi_journaliser('discussion_retablir', p_message::text, '{}'::jsonb);
end $$;

-- Organisers: counters of the Suivi screen.
create or replace function public.pudi_admin_discussion_suivi()
returns json
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.pudi_exiger_admin();
  return json_build_object(
    'nb_messages', (select count(*) from public.pudi_messages),
    'nb_auteurs', (select count(distinct auteur) from public.pudi_messages),
    'nb_supprimes', (select count(*) from public.pudi_messages where supprime_at is not null),
    'nb_suspendus', (select count(*) from public.pudi_discussion_suspendus));
end $$;

revoke all on function public.pudi_discussion_nom(uuid) from public, anon, authenticated;
revoke all on function public.pudi_discussion_auteurs_geres(text) from public, anon, authenticated;
revoke all on function public.pudi_discussion_lire(timestamptz, int, text) from public;
grant execute on function public.pudi_discussion_lire(timestamptz, int, text) to anon, authenticated;
revoke all on function public.pudi_discussion_ecrire(text, uuid) from public, anon;
grant execute on function public.pudi_discussion_ecrire(text, uuid) to authenticated;
revoke all on function public.pudi_discussion_supprimer(uuid) from public, anon;
grant execute on function public.pudi_discussion_supprimer(uuid) to authenticated;
revoke all on function public.pudi_admin_discussion_suspendre(uuid, text) from public, anon;
grant execute on function public.pudi_admin_discussion_suspendre(uuid, text) to authenticated;
revoke all on function public.pudi_admin_discussion_retablir_auteur(uuid) from public, anon;
grant execute on function public.pudi_admin_discussion_retablir_auteur(uuid) to authenticated;
revoke all on function public.pudi_admin_discussion_suivi() from public, anon;
grant execute on function public.pudi_admin_discussion_suivi() to authenticated;

-- Purge: same definition as before plus the discussion.
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
  insert into public.pudi_journal (user_id, action, details) values (auth.uid(), 'purge', jsonb_build_object('votes', nv, 'contacts', nc));
  return json_build_object('purge', true, 'votes', nv, 'contacts', nc);
end $function$;
