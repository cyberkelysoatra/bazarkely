-- PUDI-CC-16.5 b: « Proposer un projet manquant » from 300 to 1000 characters (a voter could not
-- enter a 1500-character proposal on 24/10). Idempotent: can be replayed.

alter table public.pudi_votes drop constraint if exists pudi_votes_manquant_check;
alter table public.pudi_votes add constraint pudi_votes_manquant_check check (char_length(manquant) <= 1000);

-- pudi_soumettre_vote: ONLY the limit changes (`> 300` becomes `> 1000`). The current definition is
-- read and rewritten on that single expression, so every other line, the signature, security
-- definer and search_path stay exactly as they are; nothing happens when it was already done.
do $m$
declare
  f regprocedure := 'public.pudi_soumettre_vote(text,text,text,text,boolean,text[],text[],text,text)'::regprocedure;
  avant text := pg_get_functiondef(f);
  ancien constant text := 'if char_length(coalesce(p_manquant,'''')) > 300 then raise exception ''PUDI_MANQUANT''; end if;';
  nouveau constant text := 'if char_length(coalesce(p_manquant,'''')) > 1000 then raise exception ''PUDI_MANQUANT''; end if;';
begin
  if position(nouveau in avant) > 0 then return; end if;
  if position(ancien in avant) = 0 then raise exception 'PUDI-CC-16.5: expected line not found in pudi_soumettre_vote'; end if;
  execute replace(avant, ancien, nouveau);
end $m$;

-- Grants re-applied identically (authenticated only).
revoke all on function public.pudi_soumettre_vote(text, text, text, text, boolean, text[], text[], text, text) from public, anon;
grant execute on function public.pudi_soumettre_vote(text, text, text, text, boolean, text[], text[], text, text) to authenticated;
