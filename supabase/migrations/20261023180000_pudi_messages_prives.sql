-- PUDI-CC-14.2: private messages with the organisers (specification v8, 4.16). One conversation per
-- signed-in person, readable only by its author and by the organisers (never by group managers or
-- other voters). Same rate limits as the public discussion; deletions are soft and logged.
-- client_id: idempotent sending (a retried send never writes twice).
-- Idempotent: can be replayed.

create table if not exists public.pudi_conversations (
  id uuid primary key default gen_random_uuid(),
  auteur uuid not null unique,
  cree_at timestamptz not null default now(),
  maj_at timestamptz not null default now(),
  non_lu_orga boolean not null default true,
  non_lu_auteur boolean not null default false
);
alter table public.pudi_conversations enable row level security;
alter table public.pudi_conversations force row level security;
revoke all on public.pudi_conversations from public, anon, authenticated;

create table if not exists public.pudi_messages_prives (
  id uuid primary key default gen_random_uuid(),
  conversation uuid not null references public.pudi_conversations(id) on delete cascade,
  emetteur uuid not null,
  emetteur_role text not null check (emetteur_role in ('votant','organisateur')),
  texte text not null check (char_length(texte) between 1 and 1000),
  cree_at timestamptz not null default now(),
  supprime_at timestamptz,
  supprime_par uuid,
  client_id uuid unique
);
create index if not exists pudi_messages_prives_conv on public.pudi_messages_prives (conversation, cree_at);
create index if not exists pudi_messages_prives_emetteur on public.pudi_messages_prives (emetteur, cree_at);
alter table public.pudi_messages_prives enable row level security;
alter table public.pudi_messages_prives force row level security;
revoke all on public.pudi_messages_prives from public, anon, authenticated;

-- Cleans a text the same way as the public discussion (max 10 line breaks), then checks 1..1000.
create or replace function public.pudi_prive_texte(p_texte text)
returns text
language plpgsql immutable set search_path = public as $$
declare t text; lignes text[];
begin
  t := btrim(replace(coalesce(p_texte, ''), E'\r\n', E'\n'), E' \t\n\r');
  lignes := string_to_array(t, E'\n');
  if array_length(lignes, 1) > 11 then
    t := array_to_string(lignes[1:11], E'\n') || ' ' || array_to_string(lignes[12:], ' ');
  end if;
  if char_length(t) < 1 or char_length(t) > 1000 then raise exception 'PUDI_MESSAGE_INVALIDE'; end if;
  return t;
end $$;

-- Messages of a conversation as the screens show them (deleted text emptied).
create or replace function public.pudi_prive_liste(p_conversation uuid, p_moi uuid)
returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object(
      'id', m.id,
      'texte', case when m.supprime_at is null then m.texte else '' end,
      'supprime', m.supprime_at is not null,
      'cree_at', m.cree_at,
      'role', m.emetteur_role,
      'est_moi', m.emetteur = p_moi,
      'auteur_nom', case when m.emetteur_role = 'organisateur' then 'Organisateurs' else public.pudi_discussion_nom(m.emetteur) end
    ) order by m.cree_at, m.id), '[]')
  from public.pudi_messages_prives m where m.conversation = p_conversation
$$;

-- Author: own conversation and its messages; marks the organisers' answers as read.
create or replace function public.pudi_prive_lire()
returns json
language plpgsql volatile security definer set search_path = public as $$
declare moi uuid := auth.uid(); c public.pudi_conversations;
begin
  if moi is null then raise exception 'PUDI_NON_CONNECTE'; end if;
  select * into c from public.pudi_conversations where auteur = moi;
  if not found then return json_build_object('conversation', null, 'messages', '[]'::json); end if;
  if c.non_lu_auteur then update public.pudi_conversations set non_lu_auteur = false where id = c.id; end if;
  return json_build_object('conversation', c.id, 'messages', public.pudi_prive_liste(c.id, moi));
end $$;

-- Author: is an answer waiting? (unread dot of the menu, no side effect)
create or replace function public.pudi_prive_non_lu()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select non_lu_auteur from public.pudi_conversations where auteur = auth.uid()), false)
$$;

-- Author: writes (conversation created if needed). Signed in, not suspended, 1 per 10 s, 60 a day.
create or replace function public.pudi_prive_ecrire(p_texte text, p_client_id uuid default null)
returns json
language plpgsql volatile security definer set search_path = public as $$
declare moi uuid := auth.uid(); t text; cid uuid; nid uuid;
begin
  if moi is null then raise exception 'PUDI_NON_CONNECTE'; end if;
  if p_client_id is not null then
    select id into nid from public.pudi_messages_prives where client_id = p_client_id and emetteur = moi;
    if found then return json_build_object('id', nid, 'deja', true); end if;
  end if;
  if exists (select 1 from public.pudi_discussion_suspendus s where s.user_id = moi) then raise exception 'PUDI_DISCUSSION_SUSPENDU'; end if;
  t := public.pudi_prive_texte(p_texte);
  perform pg_advisory_xact_lock(hashtext('pudi_prive:' || moi::text));
  if exists (select 1 from public.pudi_messages_prives where emetteur = moi and emetteur_role = 'votant' and cree_at > now() - interval '10 seconds')
     or (select count(*) from public.pudi_messages_prives where emetteur = moi and emetteur_role = 'votant' and cree_at > now() - interval '1 day') >= 60 then
    raise exception 'PUDI_TROP_DE_MESSAGES';
  end if;
  insert into public.pudi_conversations (auteur) values (moi) on conflict (auteur) do nothing;
  select id into cid from public.pudi_conversations where auteur = moi;
  insert into public.pudi_messages_prives (conversation, emetteur, emetteur_role, texte, client_id)
  values (cid, moi, 'votant', t, p_client_id) returning id into nid;
  update public.pudi_conversations set maj_at = now(), non_lu_orga = true where id = cid;
  perform public.pudi_journaliser('prive_ecrire', nid::text, '{}'::jsonb);
  return json_build_object('id', nid);
end $$;

-- Organisers: list of conversations (author first name + initial and Gmail, to answer by e-mail).
create or replace function public.pudi_admin_prives()
returns json
language plpgsql stable security definer set search_path = public as $$
declare r json;
begin
  perform public.pudi_exiger_admin();
  select coalesce(json_agg(x order by x.non_lu desc, x.dernier_at desc), '[]') into r from (
    select c.id, public.pudi_discussion_nom(c.auteur) as auteur_nom, u.email as auteur_email,
           c.non_lu_orga as non_lu,
           (select max(m.cree_at) from public.pudi_messages_prives m where m.conversation = c.id) as dernier_at,
           (select count(*) from public.pudi_messages_prives m where m.conversation = c.id) as nb_messages
    from public.pudi_conversations c left join auth.users u on u.id = c.auteur) x;
  return r;
end $$;

-- Organisers: one conversation (marks it read).
create or replace function public.pudi_admin_prive_lire(p_conversation uuid)
returns json
language plpgsql volatile security definer set search_path = public as $$
declare c public.pudi_conversations;
begin
  perform public.pudi_exiger_admin();
  select * into c from public.pudi_conversations where id = p_conversation;
  if not found then raise exception 'PUDI_CONVERSATION_INCONNUE'; end if;
  if c.non_lu_orga then update public.pudi_conversations set non_lu_orga = false where id = c.id; end if;
  return json_build_object('conversation', c.id,
    'auteur_nom', public.pudi_discussion_nom(c.auteur),
    'auteur_email', (select email from auth.users where id = c.auteur),
    'messages', public.pudi_prive_liste(c.id, auth.uid()));
end $$;

-- Organisers: answer (the author sees an unread dot).
create or replace function public.pudi_admin_prive_repondre(p_conversation uuid, p_texte text, p_client_id uuid default null)
returns json
language plpgsql volatile security definer set search_path = public as $$
declare t text; nid uuid;
begin
  perform public.pudi_exiger_admin();
  if p_client_id is not null then
    select id into nid from public.pudi_messages_prives where client_id = p_client_id and emetteur = auth.uid();
    if found then return json_build_object('id', nid, 'deja', true); end if;
  end if;
  if not exists (select 1 from public.pudi_conversations where id = p_conversation) then raise exception 'PUDI_CONVERSATION_INCONNUE'; end if;
  t := public.pudi_prive_texte(p_texte);
  insert into public.pudi_messages_prives (conversation, emetteur, emetteur_role, texte, client_id)
  values (p_conversation, auth.uid(), 'organisateur', t, p_client_id) returning id into nid;
  update public.pudi_conversations set maj_at = now(), non_lu_auteur = true, non_lu_orga = false where id = p_conversation;
  perform public.pudi_journaliser('prive_repondre', nid::text, '{}'::jsonb);
  return json_build_object('id', nid);
end $$;

-- Organisers: soft delete with a reason, logged.
create or replace function public.pudi_admin_prive_supprimer(p_message uuid, p_motif text)
returns json
language plpgsql volatile security definer set search_path = public as $$
declare m public.pudi_messages_prives;
begin
  perform public.pudi_exiger_admin();
  if char_length(btrim(coalesce(p_motif, ''))) < 3 then raise exception 'PUDI_MOTIF_REQUIS'; end if;
  select * into m from public.pudi_messages_prives where id = p_message for update;
  if not found then raise exception 'PUDI_MESSAGE_INCONNU'; end if;
  if m.supprime_at is not null then return json_build_object('id', p_message, 'deja', true); end if;
  update public.pudi_messages_prives set supprime_at = now(), supprime_par = auth.uid() where id = p_message;
  perform public.pudi_journaliser('prive_supprimer', p_message::text, jsonb_build_object('motif', btrim(p_motif)));
  return json_build_object('id', p_message);
end $$;

revoke all on function public.pudi_prive_texte(text) from public, anon, authenticated;
revoke all on function public.pudi_prive_liste(uuid, uuid) from public, anon, authenticated;
revoke all on function public.pudi_prive_lire() from public, anon;
grant execute on function public.pudi_prive_lire() to authenticated;
revoke all on function public.pudi_prive_non_lu() from public, anon;
grant execute on function public.pudi_prive_non_lu() to authenticated;
revoke all on function public.pudi_prive_ecrire(text, uuid) from public, anon;
grant execute on function public.pudi_prive_ecrire(text, uuid) to authenticated;
revoke all on function public.pudi_admin_prives() from public, anon;
grant execute on function public.pudi_admin_prives() to authenticated;
revoke all on function public.pudi_admin_prive_lire(uuid) from public, anon;
grant execute on function public.pudi_admin_prive_lire(uuid) to authenticated;
revoke all on function public.pudi_admin_prive_repondre(uuid, text, uuid) from public, anon;
grant execute on function public.pudi_admin_prive_repondre(uuid, text, uuid) to authenticated;
revoke all on function public.pudi_admin_prive_supprimer(uuid, text) from public, anon;
grant execute on function public.pudi_admin_prive_supprimer(uuid, text) to authenticated;

-- Purge: same definition as before plus the private messages.
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
  delete from public.pudi_messages_prives; delete from public.pudi_conversations;
  insert into public.pudi_journal (user_id, action, details) values (auth.uid(), 'purge', jsonb_build_object('votes', nv, 'contacts', nc));
  return json_build_object('purge', true, 'votes', nv, 'contacts', nc);
end $function$;
