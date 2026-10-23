-- PUDI-CC-14.4: a public message retried after a network failure is never written twice. Each
-- message carries a client id (unique); the new 3-argument writing function returns the message
-- already written with that id. The 2-argument function stays as it is (signature, grants,
-- checks) for pages still cached on phones. Idempotent: can be replayed.

alter table public.pudi_messages add column if not exists client_id uuid;
create unique index if not exists pudi_messages_client_id on public.pudi_messages (client_id);

create or replace function public.pudi_discussion_ecrire(p_texte text, p_reponse_a uuid, p_client_id uuid)
returns json
language plpgsql volatile security definer set search_path = public as $$
declare
  moi uuid := auth.uid();
  nid uuid;
  r json;
begin
  if moi is null then raise exception 'PUDI_NON_CONNECTE'; end if;
  if p_client_id is not null then
    select id into nid from public.pudi_messages where client_id = p_client_id and auteur = moi;
    if found then return json_build_object('id', nid, 'deja', true); end if;
  end if;
  -- Same checks and rules as the 2-argument function (it writes the message).
  r := public.pudi_discussion_ecrire(p_texte, p_reponse_a);
  if p_client_id is not null then
    update public.pudi_messages set client_id = p_client_id where id = (r->>'id')::uuid;
  end if;
  return r;
end $$;

revoke all on function public.pudi_discussion_ecrire(text, uuid, uuid) from public, anon;
grant execute on function public.pudi_discussion_ecrire(text, uuid, uuid) to authenticated;
