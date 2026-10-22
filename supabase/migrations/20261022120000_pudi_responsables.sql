-- PUDI-CC-07: group managers and member lists
create table if not exists public.pudi_responsables (
  canal_code text not null references public.pudi_canaux(code) on delete cascade,
  email text not null check (email = lower(btrim(email)) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  ajoute_par uuid, ajoute_at timestamptz not null default now(),
  primary key (canal_code, email)
);
create table if not exists public.pudi_membres (
  id uuid primary key default gen_random_uuid(),
  canal_code text not null references public.pudi_canaux(code) on delete cascade,
  numeros text[] not null check (cardinality(numeros) between 1 and 3),
  email text check (email is null or (email = lower(btrim(email)) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  etablissement text check (char_length(etablissement) <= 120),
  fokontany text check (char_length(fokontany) <= 80),
  ajoute_par uuid, ajoute_at timestamptz not null default now(),
  modifie_par uuid, modifie_at timestamptz not null default now()
);
create index if not exists pudi_membres_canal_idx on public.pudi_membres (canal_code);
alter table public.pudi_responsables enable row level security;
alter table public.pudi_responsables force row level security;
alter table public.pudi_membres enable row level security;
alter table public.pudi_membres force row level security;
revoke all on public.pudi_responsables, public.pudi_membres from public, anon, authenticated;

create or replace function public.pudi_mon_email() returns text
language sql stable security definer set search_path = public as $$
  select lower(btrim(coalesce(auth.jwt()->>'email', (select email from auth.users where id = auth.uid()))))
$$;

create or replace function public.pudi_est_responsable(p_canal text) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (public.pudi_is_admin()
    or exists (select 1 from public.pudi_responsables r where r.canal_code = p_canal and r.email = public.pudi_mon_email()))
$$;

-- Rebuilds the fingerprints of one channel's member list in pudi_contacts.
create or replace function public.pudi_resync_membres(p_canal text) returns void
language plpgsql volatile security definer set search_path = public as $$
declare lid uuid; n int;
begin
  select id into lid from public.pudi_listes where canal_code = p_canal and source = 'Saisie des responsables';
  if lid is null then
    insert into public.pudi_listes (canal_code, source, date_source, importe_par)
      values (p_canal, 'Saisie des responsables', current_date, auth.uid()) returning id into lid;
  end if;
  delete from public.pudi_contacts where liste_id = lid;
  insert into public.pudi_contacts (liste_id, canal_code, phone_hash)
    select distinct lid, p_canal, public.pudi_empreinte('tel:' || x)
    from public.pudi_membres m, unnest(m.numeros) x where m.canal_code = p_canal;
  get diagnostics n = row_count;
  update public.pudi_listes set nb_numeros = n, importe_at = now() where id = lid;
end $$;

-- Admin: managers of a channel
create or replace function public.pudi_admin_responsables(p_canal text)
returns table (email text, ajoute_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.pudi_exiger_admin();
  return query select r.email, r.ajoute_at from public.pudi_responsables r where r.canal_code = p_canal order by r.email;
end $$;

create or replace function public.pudi_admin_responsable_ajouter(p_canal text, p_email text) returns void
language plpgsql volatile security definer set search_path = public as $$
declare e text := lower(btrim(coalesce(p_email,'')));
begin
  perform public.pudi_exiger_admin();
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'PUDI_EMAIL_INVALIDE'; end if;
  if not exists (select 1 from public.pudi_canaux where code = p_canal) then raise exception 'PUDI_CANAL_INCONNU'; end if;
  insert into public.pudi_responsables (canal_code, email, ajoute_par) values (p_canal, e, auth.uid())
    on conflict (canal_code, email) do nothing;
  perform public.pudi_journaliser('responsable_ajouter', p_canal, jsonb_build_object('email', e));
end $$;

create or replace function public.pudi_admin_responsable_retirer(p_canal text, p_email text) returns void
language plpgsql volatile security definer set search_path = public as $$
declare e text := lower(btrim(coalesce(p_email,'')));
begin
  perform public.pudi_exiger_admin();
  delete from public.pudi_responsables where canal_code = p_canal and email = e;
  perform public.pudi_journaliser('responsable_retirer', p_canal, jsonb_build_object('email', e));
end $$;

-- Manager: channels I manage (all channels for admins)
create or replace function public.pudi_mes_groupes()
returns table (code text, nom text, type text, nb_membres int)
language sql stable security definer set search_path = public as $$
  select c.code, c.nom, c.type, (select count(*)::int from public.pudi_membres m where m.canal_code = c.code)
  from public.pudi_canaux c
  where auth.uid() is not null and (public.pudi_is_admin()
     or exists (select 1 from public.pudi_responsables r where r.canal_code = c.code and r.email = public.pudi_mon_email()))
  order by c.nom
$$;

create or replace function public.pudi_groupe_membres(p_canal text)
returns table (id uuid, numeros text[], email text, etablissement text, fokontany text, modifie_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.pudi_est_responsable(p_canal) then raise exception 'PUDI_RESPONSABLE_REQUIS'; end if;
  return query select m.id, m.numeros, m.email, m.etablissement, m.fokontany, m.modifie_at
    from public.pudi_membres m where m.canal_code = p_canal order by m.etablissement nulls last, m.ajoute_at;
end $$;

create or replace function public.pudi_groupe_membre_enregistrer(p_canal text, p_id uuid, p_numeros text[],
  p_email text, p_etablissement text, p_fokontany text) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare nums text[]; x text; n text; e text := nullif(lower(btrim(coalesce(p_email,''))), ''); rid uuid := coalesce(p_id, gen_random_uuid());
begin
  if not public.pudi_est_responsable(p_canal) then raise exception 'PUDI_RESPONSABLE_REQUIS'; end if;
  if p_id is not null and not exists (select 1 from public.pudi_membres where id = p_id and canal_code = p_canal)
    then raise exception 'PUDI_RESPONSABLE_REQUIS'; end if;
  nums := '{}';
  foreach x in array coalesce(p_numeros, '{}') loop
    if btrim(coalesce(x,'')) = '' then continue; end if;
    n := public.pudi_normaliser_numero(x);
    if n is null then raise exception 'PUDI_NUMERO_INVALIDE'; end if;
    if not n = any(nums) then nums := nums || n; end if;
  end loop;
  if cardinality(nums) not between 1 and 3 then raise exception 'PUDI_NUMERO_INVALIDE'; end if;
  if e is not null and e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'PUDI_EMAIL_INVALIDE'; end if;
  if exists (select 1 from public.pudi_membres m where m.canal_code = p_canal and m.id <> rid and m.numeros && nums)
    then raise exception 'PUDI_NUMERO_DEJA_DANS_LE_GROUPE'; end if;
  insert into public.pudi_membres as m (id, canal_code, numeros, email, etablissement, fokontany, ajoute_par, modifie_par)
    values (rid, p_canal, nums, e, nullif(btrim(coalesce(p_etablissement,'')),''), nullif(btrim(coalesce(p_fokontany,'')),''), auth.uid(), auth.uid())
  on conflict (id) do update set numeros = excluded.numeros, email = excluded.email, etablissement = excluded.etablissement,
    fokontany = excluded.fokontany, modifie_par = auth.uid(), modifie_at = now();
  perform public.pudi_resync_membres(p_canal);
  perform public.pudi_journaliser('membre_enregistrer', p_canal, jsonb_build_object('membre', rid, 'nb_numeros', cardinality(nums)));
  return rid;
end $$;

create or replace function public.pudi_groupe_membre_supprimer(p_canal text, p_id uuid) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.pudi_est_responsable(p_canal) then raise exception 'PUDI_RESPONSABLE_REQUIS'; end if;
  delete from public.pudi_membres where id = p_id and canal_code = p_canal;
  perform public.pudi_resync_membres(p_canal);
  perform public.pudi_journaliser('membre_supprimer', p_canal, jsonb_build_object('membre', p_id));
end $$;

-- Rights
revoke execute on function public.pudi_mon_email(), public.pudi_est_responsable(text), public.pudi_resync_membres(text)
  from public, anon, authenticated;
do $$ declare f text; begin
  foreach f in array array['pudi_admin_responsables(text)','pudi_admin_responsable_ajouter(text,text)',
    'pudi_admin_responsable_retirer(text,text)','pudi_mes_groupes()','pudi_groupe_membres(text)',
    'pudi_groupe_membre_enregistrer(text,uuid,text[],text,text,text)','pudi_groupe_membre_supprimer(text,uuid)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- (a) pudi_etat(): one more key 'est_responsable' (rest of the definition unchanged, grants kept).
create or replace function public.pudi_etat()
 returns json
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select json_build_object(
    'publie', s.publie,
    'publie_at', s.publie_at,
    'cloture_at', s.cloture_at,
    'maintenant', now(),
    'clos', now() >= s.cloture_at,
    'connecte', auth.uid() is not null,
    'a_vote', exists (select 1 from public.pudi_votes v where v.user_id = auth.uid()),
    'est_admin', public.pudi_is_admin(),
    'est_responsable', exists (select 1 from public.pudi_responsables r where r.email = public.pudi_mon_email()))
  from public.pudi_settings s where s.id = 1
$function$;

-- (b) pudi_purger(boolean): the member lists and the managers are deleted with everything else.
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
  insert into public.pudi_journal (user_id, action, details) values (auth.uid(), 'purge', jsonb_build_object('votes', nv, 'contacts', nc));
  return json_build_object('purge', true, 'votes', nv, 'contacts', nc);
end $function$;
