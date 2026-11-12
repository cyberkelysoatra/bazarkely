-- NEC-CC-20 (v3.145.0): Mon Business Plan, paper pre-test typed by the trainer, pulled by the phone.
-- Own column: bp_envoyer overwrites bp_plans.contenu at every save of the phone. Idempotent.

alter table public.bp_plans add column if not exists pretest_formateur jsonb;
alter table public.bp_plans add column if not exists pretest_formateur_at timestamptz;

-- Trainer writes (or clears with null) the paper pre-test of one plan.
create or replace function public.bp_admin_poser_pretest(p_plan_id uuid, p_pretest jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_joel() then raise exception 'NON_AUTORISE'; end if;
  if p_pretest is not null and (jsonb_typeof(p_pretest->'reponses') is distinct from 'object' or jsonb_typeof(p_pretest->'auto') is distinct from 'array'
     or pg_column_size(p_pretest) > 4096) then
    return jsonb_build_object('ok', false, 'raison', 'FORMAT');
  end if;
  update public.bp_plans set pretest_formateur = p_pretest, pretest_formateur_at = case when p_pretest is null then null else now() end
  where plan_id = p_plan_id;
  if not found then return jsonb_build_object('ok', false, 'raison', 'INTROUVABLE'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- The participant's phone reads it back with its own token (same check as bp_envoyer).
create or replace function public.bp_lire_pretest(p_plan_id uuid, p_jeton text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v public.bp_plans;
begin
  if p_jeton is null or length(p_jeton) < 32 then return jsonb_build_object('ok', false, 'raison', 'JETON'); end if;
  select * into v from public.bp_plans where plan_id = p_plan_id;
  if not found then return jsonb_build_object('ok', false, 'raison', 'INTROUVABLE'); end if;
  if v.jeton_hash <> encode(extensions.digest(p_jeton, 'sha256'), 'hex') then return jsonb_build_object('ok', false, 'raison', 'JETON'); end if;
  return jsonb_build_object('ok', true, 'pretest', v.pretest_formateur, 'le', v.pretest_formateur_at);
end $$;

revoke all on function public.bp_admin_poser_pretest(uuid, jsonb) from public, anon;
revoke all on function public.bp_lire_pretest(uuid, text) from public;
grant execute on function public.bp_admin_poser_pretest(uuid, jsonb) to authenticated;
grant execute on function public.bp_lire_pretest(uuid, text) to anon, authenticated;

-- Trainer list and plan: same body as NEC-CC-02, plus the paper pre-test, and in the list whether the
-- plan holds a validated pre-test ('app', 'formateur' = paper one received by the phone, or null).
create or replace function public.bp_admin_liste(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_joel() then raise exception 'NON_AUTORISE'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'plan_id', plan_id, 'prenom', prenom, 'nom_projet', nom_projet, 'progression', progression,
      'alertes', alertes, 'rev', rev, 'maj_at', maj_at, 'vu_at', vu_at,
      'pretest_formateur', pretest_formateur,
      'pretest_valide', case when contenu->'pretest'->>'valideLe' is null then null
                             else coalesce(contenu->'pretest'->>'source', 'app') end) order by prenom)
    from public.bp_plans where session_code = upper(trim(p_code))), '[]'::jsonb);
end $$;

create or replace function public.bp_admin_plan(p_plan_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v public.bp_plans;
begin
  if not public.is_joel() then raise exception 'NON_AUTORISE'; end if;
  select * into v from public.bp_plans where plan_id = p_plan_id;
  if not found then return null; end if;
  return jsonb_build_object('plan_id', v.plan_id, 'prenom', v.prenom, 'contenu', v.contenu, 'maj_at', v.maj_at,
    'pretest_formateur', v.pretest_formateur);
end $$;
