-- NEC-CC-10: Mon Business Plan, trainer removes one plan or erases a whole session.
-- Idempotent: can be replayed. A removed plan (tombstone) is never accepted again by bp_envoyer.

-- 1. Tombstones
create table if not exists public.bp_plans_retires (
  plan_id uuid primary key,
  session_code text not null references public.bp_sessions(code) on delete cascade,
  retire_at timestamptz not null default now()
);
create index if not exists bp_plans_retires_session_idx on public.bp_plans_retires(session_code);
alter table public.bp_plans_retires enable row level security;
alter table public.bp_plans_retires force row level security;
revoke all on public.bp_plans_retires from anon, authenticated;

-- 2. bp_envoyer: same body as NEC-CC-02, plus the tombstone check after the session checks
create or replace function public.bp_envoyer(
  p_code text, p_plan_id uuid, p_jeton text, p_prenom text, p_nom_projet text,
  p_contenu jsonb, p_progression jsonb, p_alertes jsonb, p_rev integer)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_session public.bp_sessions;
  v_hash text;
  v_row public.bp_plans;
  v_contenu jsonb;
begin
  select * into v_session from public.bp_sessions where code = upper(trim(p_code));
  if not found then return jsonb_build_object('ok', false, 'raison', 'CODE_INCONNU'); end if;
  if not v_session.ouverte then return jsonb_build_object('ok', false, 'raison', 'SESSION_FERMEE'); end if;
  if exists (select 1 from public.bp_plans_retires where plan_id = p_plan_id) then
    return jsonb_build_object('ok', false, 'raison', 'RETIRE');
  end if;
  if p_jeton is null or length(p_jeton) < 32 then return jsonb_build_object('ok', false, 'raison', 'JETON'); end if;
  if pg_column_size(p_contenu) > 262144 then return jsonb_build_object('ok', false, 'raison', 'TROP_GROS'); end if;
  v_hash := encode(extensions.digest(p_jeton, 'sha256'), 'hex');
  -- jamais de téléphone ni d'e-mail sur le serveur, même si le client les envoie
  v_contenu := jsonb_set(p_contenu, '{identite}',
    coalesce(p_contenu->'identite', '{}'::jsonb) - 'telephone' - 'email');
  select * into v_row from public.bp_plans where plan_id = p_plan_id;
  if found then
    if v_row.jeton_hash <> v_hash then return jsonb_build_object('ok', false, 'raison', 'JETON'); end if;
    if p_rev <= v_row.rev then
      update public.bp_plans set vu_at = now() where plan_id = p_plan_id;
      return jsonb_build_object('ok', true, 'rev', v_row.rev);
    end if;
    update public.bp_plans set
      prenom = left(coalesce(p_prenom, ''), 80), nom_projet = left(coalesce(p_nom_projet, ''), 120),
      contenu = v_contenu, progression = coalesce(p_progression, '{}'::jsonb),
      alertes = coalesce(p_alertes, '[]'::jsonb), rev = p_rev, maj_at = now(), vu_at = now()
    where plan_id = p_plan_id;
  else
    insert into public.bp_plans(plan_id, session_code, jeton_hash, prenom, nom_projet, contenu, progression, alertes, rev)
    values (p_plan_id, v_session.code, v_hash, left(coalesce(p_prenom, ''), 80), left(coalesce(p_nom_projet, ''), 120),
            v_contenu, coalesce(p_progression, '{}'::jsonb), coalesce(p_alertes, '[]'::jsonb), p_rev);
  end if;
  return jsonb_build_object('ok', true, 'rev', p_rev);
end $$;

-- 3. Trainer: remove one plan
create or replace function public.bp_admin_retirer(p_plan_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_code text;
begin
  if not public.is_joel() then raise exception 'NON_AUTORISE'; end if;
  select session_code into v_code from public.bp_plans where plan_id = p_plan_id;
  if not found then return jsonb_build_object('ok', true, 'efface', 0); end if;
  insert into public.bp_plans_retires(plan_id, session_code) values (p_plan_id, v_code)
    on conflict (plan_id) do nothing;
  delete from public.bp_plans where plan_id = p_plan_id;
  return jsonb_build_object('ok', true, 'efface', 1);
end $$;

-- 4. Trainer: erase a whole session (closed, every plan removed and tombstoned)
create or replace function public.bp_admin_effacer_session(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_code text := upper(trim(p_code)); n integer;
begin
  if not public.is_joel() then raise exception 'NON_AUTORISE'; end if;
  update public.bp_sessions set ouverte = false where code = v_code;
  if not found then return jsonb_build_object('ok', false, 'raison', 'CODE_INCONNU'); end if;
  insert into public.bp_plans_retires(plan_id, session_code)
    select plan_id, session_code from public.bp_plans where session_code = v_code
    on conflict (plan_id) do nothing;
  delete from public.bp_plans where session_code = v_code;
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'efface', n);
end $$;

-- 5. Rights
revoke all on function public.bp_envoyer(text, uuid, text, text, text, jsonb, jsonb, jsonb, integer) from public, anon, authenticated, service_role;
grant execute on function public.bp_envoyer(text, uuid, text, text, text, jsonb, jsonb, jsonb, integer) to anon, authenticated;
revoke all on function public.bp_admin_retirer(uuid) from public, anon, authenticated, service_role;
revoke all on function public.bp_admin_effacer_session(text) from public, anon, authenticated, service_role;
grant execute on function public.bp_admin_retirer(uuid) to authenticated;
grant execute on function public.bp_admin_effacer_session(text) to authenticated;

-- 6. Purge also clears the tombstones of purged sessions
select cron.unschedule('bp-purge') where exists (select 1 from cron.job where jobname = 'bp-purge');
select cron.schedule('bp-purge', '15 1 * * *', $cron$
  delete from public.bp_plans p using public.bp_sessions s where p.session_code = s.code and s.purge_le < current_date;
  delete from public.bp_plans_retires r using public.bp_sessions s where r.session_code = s.code and s.purge_le < current_date;
$cron$);
