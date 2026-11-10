-- NEC-CC-02 (v3.130.0): Mon Business Plan, trainer live tracking.
-- bp_sessions / bp_plans locked to every client role; access only through the security definer RPCs below.

-- 1. Tables
create table if not exists public.bp_sessions (
  code text primary key,
  libelle text not null,
  ouverte boolean not null default true,
  purge_le date not null,
  cree_at timestamptz not null default now()
);

create table if not exists public.bp_plans (
  plan_id uuid primary key,
  session_code text not null references public.bp_sessions(code) on delete cascade,
  jeton_hash text not null,
  prenom text not null default '',
  nom_projet text not null default '',
  contenu jsonb not null,
  progression jsonb not null default '{}'::jsonb,
  alertes jsonb not null default '[]'::jsonb,
  rev integer not null default 0,
  cree_at timestamptz not null default now(),
  maj_at timestamptz not null default now(),
  vu_at timestamptz not null default now()
);
create index if not exists bp_plans_session_idx on public.bp_plans(session_code, maj_at desc);

alter table public.bp_sessions enable row level security;
alter table public.bp_sessions force row level security;
alter table public.bp_plans enable row level security;
alter table public.bp_plans force row level security;
revoke all on public.bp_sessions, public.bp_plans from anon, authenticated;

-- 2. Session de la formation (T1, T2 : valeurs par défaut)
insert into public.bp_sessions(code, libelle, purge_le)
values ('NEC2026', 'Nosy Be Entrepreneurship Camp 2026', date '2026-12-31')
on conflict (code) do nothing;

-- 3. Participant : vérifier un code
create or replace function public.bp_rejoindre(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v public.bp_sessions;
begin
  select * into v from public.bp_sessions where code = upper(trim(p_code));
  if not found then return jsonb_build_object('ok', false, 'raison', 'CODE_INCONNU'); end if;
  if not v.ouverte then return jsonb_build_object('ok', false, 'raison', 'SESSION_FERMEE'); end if;
  return jsonb_build_object('ok', true, 'code', v.code, 'libelle', v.libelle);
end $$;

-- 4. Participant : envoyer son plan (idempotent par rev, réservé au téléphone qui l'a créé)
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

-- 5. Participant : retirer son accord (efface son plan du serveur)
create or replace function public.bp_retirer(p_plan_id uuid, p_jeton text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  delete from public.bp_plans
  where plan_id = p_plan_id and jeton_hash = encode(extensions.digest(p_jeton, 'sha256'), 'hex');
  return jsonb_build_object('ok', true);
end $$;

-- 6. Formateur (is_joel)
create or replace function public.bp_admin_liste(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_joel() then raise exception 'NON_AUTORISE'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'plan_id', plan_id, 'prenom', prenom, 'nom_projet', nom_projet, 'progression', progression,
      'alertes', alertes, 'rev', rev, 'maj_at', maj_at, 'vu_at', vu_at) order by prenom)
    from public.bp_plans where session_code = upper(trim(p_code))), '[]'::jsonb);
end $$;

create or replace function public.bp_admin_plan(p_plan_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v public.bp_plans;
begin
  if not public.is_joel() then raise exception 'NON_AUTORISE'; end if;
  select * into v from public.bp_plans where plan_id = p_plan_id;
  if not found then return null; end if;
  return jsonb_build_object('plan_id', v.plan_id, 'prenom', v.prenom, 'contenu', v.contenu, 'maj_at', v.maj_at);
end $$;

create or replace function public.bp_admin_session(p_code text, p_ouverte boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_joel() then raise exception 'NON_AUTORISE'; end if;
  update public.bp_sessions set ouverte = p_ouverte where code = upper(trim(p_code));
  return jsonb_build_object('ok', found);
end $$;

-- 7. Droits : tout fermer puis ouvrir seulement le nécessaire (§33, §41)
revoke all on function public.bp_rejoindre(text) from public, anon, authenticated, service_role;
revoke all on function public.bp_envoyer(text, uuid, text, text, text, jsonb, jsonb, jsonb, integer) from public, anon, authenticated, service_role;
revoke all on function public.bp_retirer(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.bp_admin_liste(text) from public, anon, authenticated, service_role;
revoke all on function public.bp_admin_plan(uuid) from public, anon, authenticated, service_role;
revoke all on function public.bp_admin_session(text, boolean) from public, anon, authenticated, service_role;
grant execute on function public.bp_rejoindre(text) to anon, authenticated;
grant execute on function public.bp_envoyer(text, uuid, text, text, text, jsonb, jsonb, jsonb, integer) to anon, authenticated;
grant execute on function public.bp_retirer(uuid, text) to anon, authenticated;
grant execute on function public.bp_admin_liste(text) to authenticated;
grant execute on function public.bp_admin_plan(uuid) to authenticated;
grant execute on function public.bp_admin_session(text, boolean) to authenticated;

-- 8. Purge automatique (T1)
select cron.schedule('bp-purge', '15 1 * * *',
  $$delete from public.bp_plans p using public.bp_sessions s
    where p.session_code = s.code and s.purge_le < current_date$$);
