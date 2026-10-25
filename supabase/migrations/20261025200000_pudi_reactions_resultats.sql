-- PUDI-CC-20: emoji reactions under the discussion messages (one per person and message), and the
-- reduced results lose their last indirect voter counts (no voix_placees, whole-number percentages).
-- Idempotent. Existing functions are patched with replace() on their live definition (exact diff),
-- signatures, security definer, search_path and grants unchanged.

-- 1. Reactions: no client right at all, only through pudi_reagir / pudi_discussion_lire.
create table if not exists public.pudi_reactions (
  message_id uuid not null references public.pudi_messages (id) on delete cascade,
  user_id uuid not null,
  emoji text not null check (emoji in (U&'\+01F44D', U&'\2764\FE0F', U&'\+01F602', U&'\+01F62E', U&'\+01F622', U&'\+01F64F')),
  at timestamptz not null default now(),
  primary key (message_id, user_id)
);
alter table public.pudi_reactions enable row level security;
alter table public.pudi_reactions force row level security;
revoke all on public.pudi_reactions from public, anon, authenticated;

-- Rate limit lookup (1 reaction per second per person) without scanning the journal.
create index if not exists pudi_journal_reagir_idx on public.pudi_journal (user_id, at) where action = 'message_reagir';

-- 2. React, change, remove (p_emoji null). Same checks as writing in the discussion.
create or replace function public.pudi_reagir(p_message uuid, p_emoji text default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  moi uuid := auth.uid();
  m public.pudi_messages;
  avant text;
begin
  if moi is null then raise exception 'PUDI_NON_CONNECTE'; end if;
  if exists (select 1 from public.pudi_discussion_suspendus s where s.user_id = moi) then raise exception 'PUDI_DISCUSSION_SUSPENDU'; end if;
  if p_emoji is not null and p_emoji not in (U&'\+01F44D', U&'\2764\FE0F', U&'\+01F602', U&'\+01F62E', U&'\+01F622', U&'\+01F64F') then
    raise exception 'PUDI_REACTION_INVALIDE';
  end if;
  select * into m from public.pudi_messages where id = p_message;
  if not found then raise exception 'PUDI_MESSAGE_INCONNU'; end if;
  if m.supprime_at is not null then raise exception 'PUDI_MESSAGE_SUPPRIME'; end if;
  perform pg_advisory_xact_lock(hashtext('pudi_reagir:' || moi::text));
  if exists (select 1 from public.pudi_journal j where j.user_id = moi and j.action = 'message_reagir' and j.at > now() - interval '1 second') then
    raise exception 'PUDI_TROP_DE_REACTIONS';
  end if;
  select r.emoji into avant from public.pudi_reactions r where r.message_id = p_message and r.user_id = moi;
  if avant is not distinct from p_emoji then
    return json_build_object('message', p_message, 'emoji', p_emoji, 'inchange', true);
  end if;
  if p_emoji is null then
    delete from public.pudi_reactions where message_id = p_message and user_id = moi;
  else
    insert into public.pudi_reactions (message_id, user_id, emoji) values (p_message, moi, p_emoji)
    on conflict (message_id, user_id) do update set emoji = excluded.emoji, at = now();
  end if;
  perform public.pudi_journaliser('message_reagir', p_message::text, jsonb_build_object('avant', avant, 'apres', p_emoji));
  return json_build_object('message', p_message, 'emoji', p_emoji);
end $$;
revoke all on function public.pudi_reagir(uuid, text) from public, anon;
grant execute on function public.pudi_reagir(uuid, text) to authenticated;

-- 3. Organisers only: who reacted to a message.
create or replace function public.pudi_admin_discussion_reactions(p_message uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.pudi_exiger_admin();
  return coalesce((select json_agg(json_build_object('emoji', r.emoji, 'auteur_nom', public.pudi_discussion_nom(r.user_id), 'at', r.at) order by r.at)
    from public.pudi_reactions r where r.message_id = p_message), '[]'::json);
end $$;
revoke all on function public.pudi_admin_discussion_reactions(uuid) from public, anon;
grant execute on function public.pudi_admin_discussion_reactions(uuid) to authenticated;

-- 4. Patches of live definitions (each replace must change the text exactly once).
do $do$
declare
  d text;
  n text;
begin
  -- 4a. pudi_discussion_lire: counts per emoji and own emoji, hidden on deleted messages.
  d := pg_get_functiondef('public.pudi_discussion_lire(timestamptz, integer, text)'::regprocedure);
  if position('''reactions''' in d) = 0 then
    n := replace(d, $a$m.cree_at + interval '10 minutes' end$a$,
      $b$m.cree_at + interval '10 minutes' end,
      'reactions', case when m.supprime_at is null then (select coalesce(json_object_agg(x.emoji, x.c), '{}'::json)
        from (select r.emoji, count(*) as c from public.pudi_reactions r where r.message_id = m.id group by r.emoji) x) end,
      'ma_reaction', case when moi is not null and m.supprime_at is null then (select r.emoji from public.pudi_reactions r where r.message_id = m.id and r.user_id = moi) end$b$);
    if n = d then raise exception 'pudi_discussion_lire: anchor not found'; end if;
    execute n;
  end if;

  -- 4b. pudi_purger: reactions erased with the discussion on 28/01/2027.
  d := pg_get_functiondef('public.pudi_purger(boolean)'::regprocedure);
  if position('pudi_reactions' in d) = 0 then
    n := replace(d, 'delete from public.pudi_discussion_versions;', 'delete from public.pudi_reactions;' || chr(10) || '  delete from public.pudi_discussion_versions;');
    if n = d then raise exception 'pudi_purger: anchor not found'; end if;
    execute n;
  end if;

  -- 4c. pudi_admin_discussion_suivi: number of reactions for the organisers.
  d := pg_get_functiondef('public.pudi_admin_discussion_suivi()'::regprocedure);
  if position('nb_reactions' in d) = 0 then
    n := replace(d, $a$'nb_suspendus', (select count(*) from public.pudi_discussion_suspendus))$a$,
      $b$'nb_suspendus', (select count(*) from public.pudi_discussion_suspendus),
    'nb_reactions', (select count(*) from public.pudi_reactions r join public.pudi_messages m on m.id = r.message_id where m.supprime_at is null))$b$);
    if n = d then raise exception 'pudi_admin_discussion_suivi: anchor not found'; end if;
    execute n;
  end if;
end $do$;

-- 5. Reduced results (PUDI-CC-19): no voix_placees, every percentage rounded to the whole number,
-- missing projects kept without any count.
create or replace function public.pudi_resultats_reduits(p jsonb)
returns json
language sql
immutable
set search_path = public
as $$
  with n as (select greatest(coalesce((p->>'nb_votants')::int, 0), 0) as n),
       rz as (select coalesce((p->'reseaux'->>'dans_nos_reseaux')::int, 0) as d,
                     coalesce((p->'reseaux'->>'hors_reseaux')::int, 0) as h)
  select json_build_object(
    'complet', false,
    'clos', p->'clos', 'cloture_at', p->'cloture_at', 'publie_at', p->'publie_at', 'calcule_at', p->'calcule_at',
    'top_ecart', p->'top_ecart', 'regle_voix_at', p->'regle_voix_at',
    'priorites', coalesce((select jsonb_agg(jsonb_build_object('id', e->'id', 'voix', e->'voix', 'pct_voix', round(coalesce((e->>'pct_voix')::numeric, 0)),
        'tranche_pudi', e->'tranche_pudi', 'ecart_pudi', e->'ecart_pudi') order by o)
      from jsonb_array_elements(p->'priorites') with ordinality as x(e, o)), '[]'::jsonb),
    'propositions', coalesce((select jsonb_agg(jsonb_build_object('id', e->'id', 'intitule', e->'intitule', 'ajoute_at', e->'ajoute_at',
        'voix', e->'voix', 'pct_voix', round(coalesce((e->>'pct_voix')::numeric, 0))) order by o)
      from jsonb_array_elements(p->'propositions') with ordinality as x(e, o)), '[]'::jsonb),
    'par_profil', coalesce((select jsonb_object_agg(k, round(100.0 * v::int / n.n))
      from jsonb_each_text(p->'par_profil') as x(k, v), n where n.n > 0), '{}'::jsonb),
    'par_fokontany', coalesce((select jsonb_object_agg(k, round(100.0 * v::int / n.n))
      from jsonb_each_text(p->'par_fokontany') as x(k, v), n where n.n > 0), '{}'::jsonb),
    'reseaux', (select json_build_object(
        'dans_nos_reseaux', case when d + h = 0 then 0 else round(100.0 * d / (d + h)) end,
        'hors_reseaux', case when d + h = 0 then 0 else round(100.0 * h / (d + h)) end) from rz),
    'manquants', coalesce(p->'manquants', '[]'::jsonb))
$$;
revoke all on function public.pudi_resultats_reduits(jsonb) from public, anon, authenticated;
