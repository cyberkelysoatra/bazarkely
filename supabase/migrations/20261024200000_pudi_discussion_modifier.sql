-- PUDI-CC-16.3: edit one's own discussion message for 10 minutes (checked on the server), previous
-- texts kept for the organisers only. pudi_discussion_lire gains `modifie` and, for the author,
-- `modifiable_jusqu_a` (everything else unchanged). Idempotent: can be replayed.

alter table public.pudi_messages add column if not exists modifie_at timestamptz null;

create table if not exists public.pudi_discussion_versions (
  id uuid primary key default gen_random_uuid(),
  message uuid not null references public.pudi_messages (id) on delete cascade,
  texte text not null,
  cree_at timestamptz not null default now()
);
create index if not exists pudi_discussion_versions_message on public.pudi_discussion_versions (message, cree_at);
alter table public.pudi_discussion_versions enable row level security;
alter table public.pudi_discussion_versions force row level security;
-- No policy: read by the organisers' function only (default grants revoked).
revoke all on public.pudi_discussion_versions from public, anon, authenticated;

create or replace function public.pudi_discussion_modifier(p_id uuid, p_texte text)
returns json
language plpgsql volatile security definer set search_path = public as $$
declare
  moi uuid := auth.uid();
  m public.pudi_messages;
  t text;
  lignes text[];
begin
  if moi is null then raise exception 'PUDI_NON_CONNECTE'; end if;
  select * into m from public.pudi_messages where id = p_id for update;
  if not found or m.auteur is distinct from moi then raise exception 'PUDI_MESSAGE_NON_MODIFIABLE'; end if;
  if m.supprime_at is not null then raise exception 'PUDI_MESSAGE_NON_MODIFIABLE'; end if;
  if exists (select 1 from public.pudi_discussion_suspendus s where s.user_id = moi) then raise exception 'PUDI_DISCUSSION_SUSPENDU'; end if;
  if now() - m.cree_at > interval '10 minutes' then raise exception 'PUDI_DELAI_MODIFICATION'; end if;
  -- Same text rules as writing (pudi_discussion_ecrire).
  t := btrim(replace(coalesce(p_texte, ''), E'\r\n', E'\n'), E' \t\n\r');
  lignes := string_to_array(t, E'\n');
  if array_length(lignes, 1) > 11 then
    t := array_to_string(lignes[1:11], E'\n') || ' ' || array_to_string(lignes[12:], ' ');
  end if;
  if char_length(t) < 1 or char_length(t) > 500 then raise exception 'PUDI_MESSAGE_INVALIDE'; end if;
  if t = m.texte then return json_build_object('id', m.id, 'inchange', true); end if;
  if (select count(*) from public.pudi_discussion_versions v where v.message = m.id) >= 5 then
    raise exception 'PUDI_TROP_DE_MODIFICATIONS';
  end if;
  insert into public.pudi_discussion_versions (message, texte) values (m.id, m.texte);
  update public.pudi_messages set texte = t, modifie_at = now() where id = m.id;
  perform public.pudi_journaliser('message_modifier', m.id::text, '{}'::jsonb);
  return json_build_object('id', m.id, 'modifie_at', now());
end $$;

-- Organisers: previous texts of a message (oldest first) and the current one.
create or replace function public.pudi_admin_discussion_versions(p_message uuid)
returns json
language plpgsql stable security definer set search_path = public as $$
declare r json;
begin
  perform public.pudi_exiger_admin();
  select json_build_object(
    'actuel', (select case when supprime_at is null then texte else '' end from public.pudi_messages where id = p_message),
    'versions', coalesce((select json_agg(json_build_object('texte', v.texte, 'cree_at', v.cree_at) order by v.cree_at)
                          from public.pudi_discussion_versions v where v.message = p_message), '[]')
  ) into r;
  return r;
end $$;

revoke all on function public.pudi_discussion_modifier(uuid, text) from public, anon;
grant execute on function public.pudi_discussion_modifier(uuid, text) to authenticated;
revoke all on function public.pudi_admin_discussion_versions(uuid) from public, anon;
grant execute on function public.pudi_admin_discussion_versions(uuid) to authenticated;

-- Reading: same definition as before plus `modifie` and `modifiable_jusqu_a`.
create or replace function public.pudi_discussion_lire(p_avant timestamp with time zone default null::timestamp with time zone, p_limite integer default 50, p_apercu_canal text default null::text)
 returns json
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
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
      'auteur_suspendu', case when orga and not apercu then exists (select 1 from public.pudi_discussion_suspendus s where s.user_id = m.auteur) end,
      'modifie', m.modifie_at is not null,
      'modifiable_jusqu_a', case when moi is not null and m.auteur = moi and m.supprime_at is null then m.cree_at + interval '10 minutes' end
    ) order by m.cree_at, m.id), '[]')
  into r
  from (select * from public.pudi_messages
        where p_avant is null or cree_at < p_avant
        order by cree_at desc, id desc
        limit least(greatest(coalesce(p_limite, 50), 1), 100)) m;
  return r;
end $function$;

-- Purge: same definition as before plus the previous texts.
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
  insert into public.pudi_journal (user_id, action, details) values (auth.uid(), 'purge', jsonb_build_object('votes', nv, 'contacts', nc));
  return json_build_object('purge', true, 'votes', nv, 'contacts', nc);
end $function$;
