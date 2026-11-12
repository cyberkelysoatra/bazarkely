-- NEC-CC-22 (v3.147.0): Mon Business Plan, post-test opened remotely by the trainer, evaluation tab.
-- The post-test itself travels inside bp_plans.contenu (bp_envoyer unchanged). Idempotent.

alter table public.bp_sessions add column if not exists posttest_ouvert boolean not null default false;
alter table public.bp_sessions add column if not exists posttest_ouvert_at timestamptz;

-- Trainer opens or closes the post-test of a session.
create or replace function public.bp_admin_posttest(p_code text, p_ouvert boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_joel() then raise exception 'NON_AUTORISE'; end if;
  update public.bp_sessions set posttest_ouvert = p_ouvert,
    posttest_ouvert_at = case when p_ouvert then now() else posttest_ouvert_at end
  where code = upper(trim(p_code));
  return jsonb_build_object('ok', found);
end $$;

-- Trainer reads the state of the session (open for sending, post-test open).
create or replace function public.bp_admin_etat_session(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v public.bp_sessions;
begin
  if not public.is_joel() then raise exception 'NON_AUTORISE'; end if;
  select * into v from public.bp_sessions where code = upper(trim(p_code));
  if not found then return null; end if;
  return jsonb_build_object('ouverte', v.ouverte, 'posttest_ouvert', v.posttest_ouvert, 'posttest_ouvert_at', v.posttest_ouvert_at);
end $$;

-- The phone reads its paper pre-test AND whether the post-test is open (same token check as today).
create or replace function public.bp_lire_pretest(p_plan_id uuid, p_jeton text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v public.bp_plans; v_ouvert boolean;
begin
  if p_jeton is null or length(p_jeton) < 32 then return jsonb_build_object('ok', false, 'raison', 'JETON'); end if;
  select * into v from public.bp_plans where plan_id = p_plan_id;
  if not found then return jsonb_build_object('ok', false, 'raison', 'INTROUVABLE'); end if;
  if v.jeton_hash <> encode(extensions.digest(p_jeton, 'sha256'), 'hex') then return jsonb_build_object('ok', false, 'raison', 'JETON'); end if;
  select posttest_ouvert into v_ouvert from public.bp_sessions where code = v.session_code;
  return jsonb_build_object('ok', true, 'pretest', v.pretest_formateur, 'le', v.pretest_formateur_at,
    'posttest_ouvert', coalesce(v_ouvert, false));
end $$;

-- Trainer's evaluation: everything needed for the results table, one call.
create or replace function public.bp_admin_evaluation(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_joel() then raise exception 'NON_AUTORISE'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'plan_id', plan_id, 'prenom', prenom, 'nom_projet', nom_projet, 'progression', progression,
      'pretest', contenu->'pretest', 'pretest_formateur', pretest_formateur, 'posttest', contenu->'posttest') order by prenom)
    from public.bp_plans where session_code = upper(trim(p_code))), '[]'::jsonb);
end $$;

revoke all on function public.bp_admin_posttest(text, boolean) from public, anon;
revoke all on function public.bp_admin_etat_session(text) from public, anon;
revoke all on function public.bp_admin_evaluation(text) from public, anon;
revoke all on function public.bp_lire_pretest(uuid, text) from public;
grant execute on function public.bp_admin_posttest(text, boolean) to authenticated;
grant execute on function public.bp_admin_etat_session(text) to authenticated;
grant execute on function public.bp_admin_evaluation(text) to authenticated;
grant execute on function public.bp_lire_pretest(uuid, text) to anon, authenticated;
