-- PUDI-CC-21: closing switch. The closing date stays as it is and stays displayed; the new
-- organiser switch « verrou_cloture » decides whether passing that date closes the consultation.
-- Effective closing = verrou_cloture and now() >= cloture_at (helper pudi_est_clos).
-- gel_listes_at and purge_at are NOT linked to the switch. Idempotent.

alter table public.pudi_settings add column if not exists verrou_cloture boolean not null default true;

create or replace function public.pudi_est_clos(s public.pudi_settings)
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(s.verrou_cloture, true) and now() >= s.cloture_at
$$;

revoke all on function public.pudi_est_clos(public.pudi_settings) from public, anon, authenticated;

-- Replace each closing test by the helper, keeping every other line of the live function
-- (signature, security definer, search_path, grants and all other checks are untouched:
-- create or replace keeps the existing privileges).
do $mig$
declare
  r record;
  def text;
  neuf text;
begin
  for r in
    select * from (values
      ('public.pudi_etat()',
       $a$'clos', now() >= s.cloture_at,$a$,
       $b$'clos', public.pudi_est_clos(s),
    'cloture_depassee', now() >= s.cloture_at,
    'verrou_cloture', s.verrou_cloture,$b$),
      ('public.pudi_soumettre_vote(text,text,text,text,boolean,text[],text[],text,text)',
       $a$if now() >= s.cloture_at then raise exception 'PUDI_CLOS'; end if;$a$,
       $b$if public.pudi_est_clos(s) then raise exception 'PUDI_CLOS'; end if;$b$),
      ('public.pudi_resultats()',
       $a$if now() < s.cloture_at and not public.pudi_is_admin()$a$,
       $b$if not public.pudi_est_clos(s) and not public.pudi_is_admin()$b$),
      ('public.pudi_calculer_resultats(boolean)',
       $a$'clos', now() >= s.cloture_at, 'cloture_at', s.cloture_at,$a$,
       $b$'clos', public.pudi_est_clos(s), 'cloture_depassee', now() >= s.cloture_at, 'verrou_cloture', s.verrou_cloture, 'cloture_at', s.cloture_at,$b$),
      ('public.pudi_resultats_reduits(jsonb)',
       $a$'clos', p->'clos', 'cloture_at', p->'cloture_at',$a$,
       $b$'clos', p->'clos', 'cloture_depassee', p->'cloture_depassee', 'verrou_cloture', p->'verrou_cloture', 'cloture_at', p->'cloture_at',$b$),
      ('public.pudi_admin_proposition_enregistrer(text,text,text,text,date,text,text)',
       $a$if now() >= s.cloture_at and p_id is null then raise exception 'PUDI_CLOS'; end if;$a$,
       $b$if public.pudi_est_clos(s) and p_id is null then raise exception 'PUDI_CLOS'; end if;$b$),
      ('public.pudi_choix_noter(uuid,text[],text[],text,text)',
       $a$if not s.publie or now() >= s.cloture_at then$a$,
       $b$if not s.publie or public.pudi_est_clos(s) then$b$)
    ) as t(fn, ancien, nouveau)
  loop
    def := pg_get_functiondef(r.fn::regprocedure);
    if position(r.nouveau in def) > 0 then
      continue; -- already applied
    end if;
    if position(r.ancien in def) = 0 then
      raise exception 'PUDI-CC-21: pattern not found in %', r.fn;
    end if;
    neuf := replace(def, r.ancien, r.nouveau);
    execute neuf;
  end loop;
end
$mig$;

create or replace function public.pudi_admin_set_verrou(p_actif boolean)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare ancien boolean; s public.pudi_settings;
begin
  perform public.pudi_exiger_admin();
  if p_actif is null then raise exception 'PUDI_VERROU'; end if;
  select verrou_cloture into ancien from public.pudi_settings where id = 1 for update;
  update public.pudi_settings set verrou_cloture = p_actif, updated_at = now(), updated_by = auth.uid()
    where id = 1 returning * into s;
  perform public.pudi_journaliser('changer_verrou', null, jsonb_build_object('avant', ancien, 'apres', p_actif));
  return json_build_object('verrou_cloture', s.verrou_cloture, 'clos', public.pudi_est_clos(s),
    'cloture_depassee', now() >= s.cloture_at, 'cloture_at', s.cloture_at);
end $$;

revoke all on function public.pudi_admin_set_verrou(boolean) from public, anon;
grant execute on function public.pudi_admin_set_verrou(boolean) to authenticated;
