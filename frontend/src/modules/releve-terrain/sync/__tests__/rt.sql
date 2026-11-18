-- Relevé de terrain (module « Relevé terrain » de 1saKELY) : schéma et fonctions serveur, lot 1.
-- Réf. dossier technique RELEVE (gestion-terrassement), version 1.0 du 18/11/2026. PRD v0.9 (règles 6.8, 6.10).
-- Patron de Validation client : RLS activée et forcée, aucune règle, aucun droit direct sur les tables ;
-- tout passe par des fonctions SECURITY DEFINER qui vérifient elles-mêmes qui appelle.
-- Les calculs (positions, altitudes, courbes) se font sur le téléphone : le serveur range, partage et arbitre la saisie.
-- Rejouable sans dégât (if not exists, create or replace).

do $$ begin
  if to_regclass('public.users') is null then raise exception 'STOP: public.users is missing'; end if;
end $$;

-- ============================================================================================
-- 1. Tables
-- ============================================================================================
create table if not exists public.rt_domaines (
  id uuid primary key,
  proprietaire uuid not null references auth.users(id),
  nom text not null check (char_length(btrim(nom)) between 1 and 80),
  cree_at timestamptz not null default now(),
  supprime_at timestamptz null
);
create index if not exists rt_domaines_proprio on public.rt_domaines (proprietaire) where supprime_at is null;

create table if not exists public.rt_chantiers (
  id uuid primary key,
  domaine_id uuid not null references public.rt_domaines(id),
  nom text not null check (char_length(btrim(nom)) between 1 and 80),
  cree_at timestamptz not null default now(),
  supprime_at timestamptz null
);
create index if not exists rt_chantiers_domaine on public.rt_chantiers (domaine_id) where supprime_at is null;

-- Invitation : un lien, un domaine, une portée (domaine entier si chantiers est nul), un droit. Usage unique, sans limite de durée.
create table if not exists public.rt_invitations (
  id uuid primary key default gen_random_uuid(),
  domaine_id uuid not null references public.rt_domaines(id),
  chantiers uuid[] null,
  droit text not null check (droit in ('consulter', 'relever')),
  jeton_hash text not null unique,
  etat text not null default 'envoyee' check (etat in ('envoyee', 'acceptee', 'retiree')),
  cree_at timestamptz not null default now(),
  accepte_at timestamptz null,
  accepte_par uuid null references auth.users(id),
  retire_at timestamptz null
);
create index if not exists rt_invitations_domaine on public.rt_invitations (domaine_id);

-- Partage actif : une ligne par compte et par portée (chantier_id nul = domaine entier). Cumulables ; le plus précis l'emporte.
create table if not exists public.rt_partages (
  id uuid primary key default gen_random_uuid(),
  domaine_id uuid not null references public.rt_domaines(id),
  chantier_id uuid null references public.rt_chantiers(id),
  invite_id uuid not null references auth.users(id),
  droit text not null check (droit in ('consulter', 'relever')),
  invitation_id uuid null references public.rt_invitations(id),
  cree_at timestamptz not null default now(),
  maj_at timestamptz not null default now(),
  retire_at timestamptz null
);
create unique index if not exists rt_partages_portee on public.rt_partages
  (invite_id, domaine_id, coalesce(chantier_id, '00000000-0000-0000-0000-000000000000'::uuid)) where retire_at is null;
create index if not exists rt_partages_invite on public.rt_partages (invite_id) where retire_at is null;

-- Appareil : un identifiant tiré au hasard par le téléphone à la première ouverture, et son libellé (modèle).
create table if not exists public.rt_appareils (
  id uuid primary key,
  user_id uuid not null references auth.users(id),
  libelle text not null default 'téléphone' check (char_length(libelle) between 1 and 60),
  vu_at timestamptz not null default now()
);

create table if not exists public.rt_releves (
  id uuid primary key,
  chantier_id uuid not null references public.rt_chantiers(id),
  cree_par uuid not null references auth.users(id),
  nom text not null check (char_length(btrim(nom)) between 1 and 80),
  entete jsonb not null default '{}'::jsonb check (pg_column_size(entete) <= 20000),
  detenteur_user uuid null references auth.users(id),
  detenteur_appareil uuid null references public.rt_appareils(id),
  detenteur_depuis timestamptz null,
  ancien_user uuid null references auth.users(id),
  ancien_appareil uuid null references public.rt_appareils(id),
  reprise_at timestamptz null,
  ancien_clos boolean not null default true,
  cree_at timestamptz not null default now(),
  maj_at timestamptz not null default now(),
  supprime_at timestamptz null,
  check ((detenteur_user is null) = (detenteur_appareil is null))
);
create index if not exists rt_releves_chantier on public.rt_releves (chantier_id) where supprime_at is null;

-- Contenu d'un relevé : bornes, côtés, stations, points du plan, journal. Données brutes en JSON, calculées sur le téléphone.
create table if not exists public.rt_objets (
  id uuid primary key,
  releve_id uuid not null references public.rt_releves(id),
  type text not null check (type in ('borne', 'cote', 'station', 'point_plan', 'journal')),
  donnees jsonb not null check (pg_column_size(donnees) <= 20000),
  supprime boolean not null default false,
  auteur uuid not null references auth.users(id),
  appareil uuid not null references public.rt_appareils(id),
  saisi_at timestamptz null,
  recu_at timestamptz not null default now(),
  apres_reprise boolean not null default false
);
create index if not exists rt_objets_releve on public.rt_objets (releve_id, recu_at);

create table if not exists public.rt_journal (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  user_id uuid null,
  action text not null,
  detail jsonb not null default '{}'::jsonb
);

do $$ declare t text; begin
  foreach t in array array['rt_domaines','rt_chantiers','rt_invitations','rt_partages','rt_appareils','rt_releves','rt_objets','rt_journal'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on table public.%I from public, anon, authenticated, service_role', t);
  end loop;
end $$;

-- ============================================================================================
-- 2. Fonctions internes
-- ============================================================================================
create or replace function public.rt_moi() returns uuid
language plpgsql stable security definer set search_path = public as $$
declare u uuid := auth.uid();
begin
  if u is null then raise exception 'RT_NON_CONNECTE'; end if;
  return u;
end $$;

create or replace function public.rt_nouveau_jeton() returns text
language sql volatile set search_path = public as $$
  select replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
$$;

create or replace function public.rt_hash(p_jeton text) returns text
language sql immutable set search_path = public as $$ select encode(sha256(convert_to(coalesce(p_jeton, ''), 'UTF8')), 'hex') $$;

create or replace function public.rt_journaliser(p_action text, p_detail jsonb) returns void
language sql volatile security definer set search_path = public as $$
  insert into public.rt_journal (user_id, action, detail) values (auth.uid(), p_action, coalesce(p_detail, '{}'::jsonb))
$$;

-- Nom affiché d'un compte (« téléphone de X »).
create or replace function public.rt_nom_compte(p_user uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(btrim(a.raw_user_meta_data->>'full_name'), ''), nullif(btrim(a.raw_user_meta_data->>'name'), ''),
                  split_part(a.email, '@', 1), 'compte')
  from auth.users a where a.id = p_user
$$;

-- Droit effectif d'un compte sur un chantier : 'proprietaire', 'relever', 'consulter' ou nul.
-- Le partage du chantier passe avant celui du domaine (le plus précis l'emporte).
create or replace function public.rt_droit(p_user uuid, p_chantier uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when d.proprietaire = p_user then 'proprietaire'
    else coalesce(
      (select p.droit from public.rt_partages p where p.invite_id = p_user and p.chantier_id = c.id and p.retire_at is null),
      (select p.droit from public.rt_partages p where p.invite_id = p_user and p.domaine_id = d.id and p.chantier_id is null and p.retire_at is null))
  end
  from public.rt_chantiers c join public.rt_domaines d on d.id = c.domaine_id
  where c.id = p_chantier and c.supprime_at is null and d.supprime_at is null
$$;

-- Ajoute « releve » aux modules du compte, sans toucher aux autres clés.
create or replace function public.rt_ouvrir_module(p_user uuid) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  update public.users u
     set preferences = jsonb_set(coalesce(u.preferences, '{}'::jsonb), '{modules}',
       case when coalesce(u.preferences->'modules', '[]'::jsonb) ? 'releve'
            then coalesce(u.preferences->'modules', '[]'::jsonb)
            else coalesce(u.preferences->'modules', '[]'::jsonb) || '["releve"]'::jsonb end, true)
   where u.id = p_user;
  if not found then raise exception 'RT_USERS_ABSENT'; end if;
end $$;

-- Enregistre ou rafraîchit l'appareil appelant ; refuse l'appareil d'un autre compte.
create or replace function public.rt_appareil(p_appareil uuid, p_libelle text) returns void
language plpgsql volatile security definer set search_path = public as $$
declare u uuid := public.rt_moi(); a record;
begin
  if p_appareil is null then raise exception 'RT_APPAREIL_ABSENT'; end if;
  select * into a from public.rt_appareils where id = p_appareil;
  if found and a.user_id <> u then raise exception 'RT_APPAREIL_AUTRE_COMPTE'; end if;
  insert into public.rt_appareils (id, user_id, libelle) values (p_appareil, u, coalesce(nullif(left(btrim(p_libelle), 60), ''), 'téléphone'))
  on conflict (id) do update set vu_at = now(),
    libelle = coalesce(nullif(left(btrim(excluded.libelle), 60), ''), public.rt_appareils.libelle);
end $$;

-- Libère les saisies tenues par un compte sur les chantiers où il n'a plus le droit « relever ».
create or replace function public.rt_liberer_sans_droit(p_user uuid, p_domaine uuid) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  update public.rt_releves r set detenteur_user = null, detenteur_appareil = null, detenteur_depuis = null, maj_at = now()
   from public.rt_chantiers c
   where r.chantier_id = c.id and c.domaine_id = p_domaine and r.detenteur_user = p_user
     and coalesce(public.rt_droit(p_user, c.id), '') not in ('proprietaire', 'relever');
end $$;

-- Description d'un relevé pour l'appelant (en-tête, saisie, droit).
create or replace function public.rt_releve_resume(p_releve uuid, p_user uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', r.id, 'chantier_id', r.chantier_id, 'nom', r.nom, 'entete', r.entete,
    'cree_par', r.cree_par, 'cree_par_nom', public.rt_nom_compte(r.cree_par),
    'cree_at', r.cree_at, 'maj_at', r.maj_at,
    'saisie', case when r.detenteur_user is null then null else jsonb_build_object(
       'user_id', r.detenteur_user, 'nom', public.rt_nom_compte(r.detenteur_user),
       'appareil', r.detenteur_appareil, 'appareil_libelle', (select libelle from public.rt_appareils where id = r.detenteur_appareil),
       'depuis', r.detenteur_depuis, 'moi', r.detenteur_user = p_user) end,
    'reprise_at', r.reprise_at,
    'derniere_donnee_at', (select max(o.recu_at) from public.rt_objets o where o.releve_id = r.id),
    'nb_stations', (select count(*) from public.rt_objets o where o.releve_id = r.id and o.type = 'station' and not o.supprime))
  from public.rt_releves r where r.id = p_releve
$$;

-- ============================================================================================
-- 3. Fonctions appelables (compte connecté)
-- ============================================================================================

-- Première ouverture du module : ajoute le module au compte, enregistre l'appareil.
create or replace function public.rt_ouvrir(p_appareil uuid, p_libelle text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare u uuid := public.rt_moi();
begin
  perform public.rt_ouvrir_module(u);
  perform public.rt_appareil(p_appareil, p_libelle);
  return jsonb_build_object('ok', true, 'user_id', u, 'nom', public.rt_nom_compte(u));
end $$;

-- Tout ce que le compte voit : ses domaines, puis ceux partagés avec lui, avec le droit effectif par chantier.
create or replace function public.rt_mes_terrains() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare u uuid := public.rt_moi();
begin
  return coalesce((
    select jsonb_agg(x order by x->>'a_moi' desc, x->>'nom') from (
      select jsonb_build_object(
        'id', d.id, 'nom', d.nom, 'a_moi', d.proprietaire = u,
        'proprietaire_nom', public.rt_nom_compte(d.proprietaire),
        'domaine_entier', case when d.proprietaire = u then null else
           (select p.droit from public.rt_partages p where p.invite_id = u and p.domaine_id = d.id and p.chantier_id is null and p.retire_at is null) end,
        'nb_partages', case when d.proprietaire = u then
           (select count(distinct p.invite_id) from public.rt_partages p where p.domaine_id = d.id and p.retire_at is null) else null end,
        'chantiers', coalesce((
          select jsonb_agg(jsonb_build_object('id', c.id, 'nom', c.nom, 'droit', public.rt_droit(u, c.id),
                   'releves', coalesce((select jsonb_agg(public.rt_releve_resume(r.id, u) order by r.cree_at desc)
                                        from public.rt_releves r where r.chantier_id = c.id and r.supprime_at is null), '[]'::jsonb))
                 order by c.cree_at)
          from public.rt_chantiers c
          where c.domaine_id = d.id and c.supprime_at is null and public.rt_droit(u, c.id) is not null), '[]'::jsonb)
      ) as x
      from public.rt_domaines d
      where d.supprime_at is null
        and (d.proprietaire = u or exists (select 1 from public.rt_partages p where p.domaine_id = d.id and p.invite_id = u and p.retire_at is null))
    ) s), '[]'::jsonb);
end $$;

create or replace function public.rt_domaine_enregistrer(p_id uuid, p_nom text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare u uuid := public.rt_moi(); d record;
begin
  if p_id is null then raise exception 'RT_ID_ABSENT'; end if;
  if char_length(btrim(coalesce(p_nom, ''))) not between 1 and 80 then raise exception 'RT_NOM_VIDE'; end if;
  select * into d from public.rt_domaines where id = p_id;
  if found then
    if d.proprietaire <> u then raise exception 'RT_NON_PROPRIETAIRE'; end if;
    if d.supprime_at is not null then raise exception 'RT_SUPPRIME'; end if;
    update public.rt_domaines set nom = btrim(p_nom) where id = p_id;
  else
    insert into public.rt_domaines (id, proprietaire, nom) values (p_id, u, btrim(p_nom));
  end if;
  return jsonb_build_object('ok', true, 'id', p_id);
end $$;

create or replace function public.rt_chantier_enregistrer(p_id uuid, p_domaine uuid, p_nom text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare u uuid := public.rt_moi(); d record; c record;
begin
  if p_id is null then raise exception 'RT_ID_ABSENT'; end if;
  if char_length(btrim(coalesce(p_nom, ''))) not between 1 and 80 then raise exception 'RT_NOM_VIDE'; end if;
  select * into c from public.rt_chantiers where id = p_id;
  select * into d from public.rt_domaines where id = coalesce(c.domaine_id, p_domaine);
  if not found or d.supprime_at is not null then raise exception 'RT_INCONNU'; end if;
  if d.proprietaire <> u then raise exception 'RT_NON_PROPRIETAIRE'; end if;
  if c.id is not null then
    if c.supprime_at is not null then raise exception 'RT_SUPPRIME'; end if;
    update public.rt_chantiers set nom = btrim(p_nom) where id = p_id;
  else
    insert into public.rt_chantiers (id, domaine_id, nom) values (p_id, d.id, btrim(p_nom));
  end if;
  return jsonb_build_object('ok', true, 'id', p_id);
end $$;

-- Supprimer un chantier (ou un domaine) : refusé si un relevé y est tenu par un autre téléphone que celui de l'appelant.
create or replace function public.rt_chantier_supprimer(p_id uuid, p_appareil uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare u uuid := public.rt_moi(); c record;
begin
  select c2.*, d.proprietaire into c from public.rt_chantiers c2 join public.rt_domaines d on d.id = c2.domaine_id where c2.id = p_id;
  if not found or c.supprime_at is not null then raise exception 'RT_INCONNU'; end if;
  if c.proprietaire <> u then raise exception 'RT_NON_PROPRIETAIRE'; end if;
  if exists (select 1 from public.rt_releves r where r.chantier_id = p_id and r.supprime_at is null
             and r.detenteur_appareil is not null and r.detenteur_appareil is distinct from p_appareil) then
    raise exception 'RT_RELEVE_TENU_AILLEURS';
  end if;
  update public.rt_releves set supprime_at = now(), detenteur_user = null, detenteur_appareil = null, detenteur_depuis = null
   where chantier_id = p_id and supprime_at is null;
  update public.rt_partages set retire_at = now() where chantier_id = p_id and retire_at is null;
  update public.rt_chantiers set supprime_at = now() where id = p_id;
  perform public.rt_journaliser('chantier_supprime', jsonb_build_object('chantier', p_id));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.rt_domaine_supprimer(p_id uuid, p_appareil uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare u uuid := public.rt_moi(); d record; c record;
begin
  select * into d from public.rt_domaines where id = p_id;
  if not found or d.supprime_at is not null then raise exception 'RT_INCONNU'; end if;
  if d.proprietaire <> u then raise exception 'RT_NON_PROPRIETAIRE'; end if;
  if exists (select 1 from public.rt_releves r join public.rt_chantiers c2 on c2.id = r.chantier_id
             where c2.domaine_id = p_id and r.supprime_at is null and c2.supprime_at is null
               and r.detenteur_appareil is not null and r.detenteur_appareil is distinct from p_appareil) then
    raise exception 'RT_RELEVE_TENU_AILLEURS';
  end if;
  for c in select id from public.rt_chantiers where domaine_id = p_id and supprime_at is null loop
    perform public.rt_chantier_supprimer(c.id, p_appareil);
  end loop;
  update public.rt_partages set retire_at = now() where domaine_id = p_id and retire_at is null;
  update public.rt_invitations set etat = 'retiree', retire_at = now() where domaine_id = p_id and etat = 'envoyee';
  update public.rt_domaines set supprime_at = now() where id = p_id;
  perform public.rt_journaliser('domaine_supprime', jsonb_build_object('domaine', p_id));
  return jsonb_build_object('ok', true);
end $$;

-- Créer un relevé (avec ou sans réseau au moment de la saisie) : le téléphone créateur en tient la saisie d'office.
-- Rejouable : même id, même créateur, même chantier = déjà fait.
create or replace function public.rt_releve_creer(p_id uuid, p_chantier uuid, p_appareil uuid, p_nom text, p_entete jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare u uuid := public.rt_moi(); r record; dr text;
begin
  if p_id is null then raise exception 'RT_ID_ABSENT'; end if;
  select * into r from public.rt_releves where id = p_id;
  if found then
    if r.cree_par = u and r.chantier_id = p_chantier then return jsonb_build_object('ok', true, 'deja', true); end if;
    raise exception 'RT_ID_PRIS';
  end if;
  dr := public.rt_droit(u, p_chantier);
  if dr is null then raise exception 'RT_INCONNU'; end if;
  if dr not in ('proprietaire', 'relever') then raise exception 'RT_DROIT_INSUFFISANT'; end if;
  if char_length(btrim(coalesce(p_nom, ''))) not between 1 and 80 then raise exception 'RT_NOM_VIDE'; end if;
  perform 1 from public.rt_appareils where id = p_appareil and user_id = u;
  if not found then raise exception 'RT_APPAREIL_INCONNU'; end if;
  insert into public.rt_releves (id, chantier_id, cree_par, nom, entete, detenteur_user, detenteur_appareil, detenteur_depuis)
  values (p_id, p_chantier, u, btrim(p_nom), coalesce(p_entete, '{}'::jsonb), u, p_appareil, now());
  perform public.rt_journaliser('releve_cree', jsonb_build_object('releve', p_id));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.rt_releve_lire(p_releve uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare u uuid := public.rt_moi(); r record;
begin
  select * into r from public.rt_releves where id = p_releve and supprime_at is null;
  if not found or public.rt_droit(u, r.chantier_id) is null then raise exception 'RT_INCONNU'; end if;
  return public.rt_releve_resume(p_releve, u) || jsonb_build_object(
    'droit', public.rt_droit(u, r.chantier_id),
    'objets', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'type', o.type, 'donnees', o.donnees, 'supprime', o.supprime,
                 'auteur', o.auteur, 'saisi_at', o.saisi_at, 'recu_at', o.recu_at, 'apres_reprise', o.apres_reprise) order by o.recu_at, o.id)
               from public.rt_objets o where o.releve_id = p_releve), '[]'::jsonb));
end $$;

create or replace function public.rt_saisie_prendre(p_releve uuid, p_appareil uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare u uuid := public.rt_moi(); r record; dr text;
begin
  select * into r from public.rt_releves where id = p_releve and supprime_at is null for update;
  if not found then raise exception 'RT_INCONNU'; end if;
  dr := public.rt_droit(u, r.chantier_id);
  if dr is null then raise exception 'RT_INCONNU'; end if;
  if dr not in ('proprietaire', 'relever') then raise exception 'RT_DROIT_INSUFFISANT'; end if;
  perform 1 from public.rt_appareils where id = p_appareil and user_id = u;
  if not found then raise exception 'RT_APPAREIL_INCONNU'; end if;
  if r.detenteur_appareil = p_appareil then return jsonb_build_object('ok', true, 'deja', true); end if;
  if r.detenteur_appareil is not null then
    return jsonb_build_object('ok', false, 'code', 'EN_SAISIE', 'saisie', public.rt_releve_resume(p_releve, u)->'saisie');
  end if;
  update public.rt_releves set detenteur_user = u, detenteur_appareil = p_appareil, detenteur_depuis = now(), maj_at = now() where id = p_releve;
  perform public.rt_journaliser('saisie_prise', jsonb_build_object('releve', p_releve));
  return jsonb_build_object('ok', true);
end $$;

-- Reprise par le propriétaire du domaine, et lui seul ; l'ancien téléphone garde le droit d'envoyer ce qu'il a saisi
-- avant d'apprendre la reprise (marqué « arrivé après reprise »), jusqu'à son accusé de réception.
create or replace function public.rt_saisie_reprendre(p_releve uuid, p_appareil uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare u uuid := public.rt_moi(); r record;
begin
  select * into r from public.rt_releves where id = p_releve and supprime_at is null for update;
  if not found then raise exception 'RT_INCONNU'; end if;
  if public.rt_droit(u, r.chantier_id) is distinct from 'proprietaire' then raise exception 'RT_REPRISE_PROPRIETAIRE_SEUL'; end if;
  perform 1 from public.rt_appareils where id = p_appareil and user_id = u;
  if not found then raise exception 'RT_APPAREIL_INCONNU'; end if;
  if r.detenteur_appareil is null or r.detenteur_appareil = p_appareil then
    return public.rt_saisie_prendre(p_releve, p_appareil);
  end if;
  update public.rt_releves set ancien_user = detenteur_user, ancien_appareil = detenteur_appareil, ancien_clos = false, reprise_at = now(),
         detenteur_user = u, detenteur_appareil = p_appareil, detenteur_depuis = now(), maj_at = now()
   where id = p_releve;
  perform public.rt_journaliser('saisie_reprise', jsonb_build_object('releve', p_releve, 'ancien', r.detenteur_user, 'ancien_appareil', r.detenteur_appareil));
  return jsonb_build_object('ok', true, 'reprise', true);
end $$;

-- Fin de saisie : le téléphone l'appelle quand toutes ses données sont parties (dernière opération de sa file).
create or replace function public.rt_saisie_terminer(p_releve uuid, p_appareil uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare u uuid := public.rt_moi(); r record;
begin
  select * into r from public.rt_releves where id = p_releve and supprime_at is null for update;
  if not found then raise exception 'RT_INCONNU'; end if;
  if r.detenteur_appareil is distinct from p_appareil or r.detenteur_user <> u then
    return jsonb_build_object('ok', true, 'deja', true);
  end if;
  update public.rt_releves set detenteur_user = null, detenteur_appareil = null, detenteur_depuis = null, maj_at = now() where id = p_releve;
  perform public.rt_journaliser('saisie_terminee', jsonb_build_object('releve', p_releve));
  return jsonb_build_object('ok', true);
end $$;

-- L'ancien téléphone a vidé sa file après une reprise : plus rien de lui n'entre.
create or replace function public.rt_reprise_accuser(p_releve uuid, p_appareil uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare u uuid := public.rt_moi();
begin
  update public.rt_releves set ancien_clos = true where id = p_releve and ancien_appareil = p_appareil and ancien_user = u;
  return jsonb_build_object('ok', true);
end $$;

-- Envoi de la file du téléphone : tableau d'objets {id, type, donnees, supprime, saisi_at}, et en-tête éventuel.
-- Rejouable sans doublon (upsert par id). Seul le téléphone qui tient la saisie écrit ; l'ancien téléphone après
-- une reprise écrit encore, marqué, tant qu'il n'a pas accusé réception. Un compte sans droit « relever » n'écrit plus.
create or replace function public.rt_envoyer(p_releve uuid, p_appareil uuid, p_objets jsonb, p_entete jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare u uuid := public.rt_moi(); r record; dr text; tardif boolean := false; o jsonb; n int := 0; ex record;
begin
  select * into r from public.rt_releves where id = p_releve and supprime_at is null for update;
  if not found then raise exception 'RT_INCONNU'; end if;
  dr := public.rt_droit(u, r.chantier_id);
  if coalesce(dr, '') not in ('proprietaire', 'relever') then
    return jsonb_build_object('ok', false, 'code', 'DROIT_RETIRE');
  end if;
  if r.detenteur_appareil = p_appareil and r.detenteur_user = u then
    tardif := false;
  elsif r.ancien_appareil = p_appareil and r.ancien_user = u and not r.ancien_clos then
    tardif := true;
  else
    return jsonb_build_object('ok', false, 'code', case when r.ancien_appareil = p_appareil then 'SAISIE_REPRISE' else 'PAS_LA_SAISIE' end,
                              'reprise_at', r.reprise_at, 'saisie', public.rt_releve_resume(p_releve, u)->'saisie');
  end if;
  if jsonb_typeof(coalesce(p_objets, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_objets, '[]'::jsonb)) > 500 then
    raise exception 'RT_LOT_INVALIDE';
  end if;
  for o in select * from jsonb_array_elements(coalesce(p_objets, '[]'::jsonb)) loop
    select * into ex from public.rt_objets where id = (o->>'id')::uuid;
    if found and ex.releve_id <> p_releve then raise exception 'RT_ID_PRIS'; end if;
    if found and tardif and ex.appareil <> p_appareil then continue; end if; -- un tardif ne remplace pas une saisie du nouveau détenteur
    insert into public.rt_objets (id, releve_id, type, donnees, supprime, auteur, appareil, saisi_at, apres_reprise)
    values ((o->>'id')::uuid, p_releve, o->>'type', coalesce(o->'donnees', '{}'::jsonb), coalesce((o->>'supprime')::boolean, false),
            u, p_appareil, least((o->>'saisi_at')::timestamptz, now() + interval '12 hours'), tardif)
    on conflict (id) do update set donnees = excluded.donnees, supprime = excluded.supprime, recu_at = now(),
            apres_reprise = public.rt_objets.apres_reprise or excluded.apres_reprise;
    n := n + 1;
  end loop;
  if p_entete is not null and not tardif then
    update public.rt_releves set entete = p_entete, nom = coalesce(nullif(btrim(p_entete->>'nom'), ''), nom), maj_at = now() where id = p_releve;
  else
    update public.rt_releves set maj_at = now() where id = p_releve;
  end if;
  return jsonb_build_object('ok', true, 'recus', n, 'apres_reprise', tardif, 'reprise_at', case when tardif then r.reprise_at end);
end $$;

create or replace function public.rt_releve_supprimer(p_releve uuid, p_appareil uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare u uuid := public.rt_moi(); r record; dr text;
begin
  select * into r from public.rt_releves where id = p_releve and supprime_at is null for update;
  if not found then raise exception 'RT_INCONNU'; end if;
  dr := public.rt_droit(u, r.chantier_id);
  if dr is null then raise exception 'RT_INCONNU'; end if;
  if not (dr = 'proprietaire' or (dr = 'relever' and r.cree_par = u)) then raise exception 'RT_DROIT_INSUFFISANT'; end if;
  if r.detenteur_appareil is not null and r.detenteur_appareil is distinct from p_appareil then raise exception 'RT_RELEVE_TENU_AILLEURS'; end if;
  update public.rt_releves set supprime_at = now(), detenteur_user = null, detenteur_appareil = null, detenteur_depuis = null where id = p_releve;
  perform public.rt_journaliser('releve_supprime', jsonb_build_object('releve', p_releve));
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Partage ----------
-- Le propriétaire prépare une invitation : domaine entier (p_chantiers nul) ou chantiers de ce domaine. Le jeton n'est rendu qu'ici.
create or replace function public.rt_invitation_creer(p_domaine uuid, p_chantiers uuid[], p_droit text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare u uuid := public.rt_moi(); d record; j text; iid uuid;
begin
  select * into d from public.rt_domaines where id = p_domaine and supprime_at is null;
  if not found then raise exception 'RT_INCONNU'; end if;
  if d.proprietaire <> u then raise exception 'RT_NON_PROPRIETAIRE'; end if;
  if p_droit not in ('consulter', 'relever') then raise exception 'RT_DROIT_INVALIDE'; end if;
  if p_chantiers is not null then
    if cardinality(p_chantiers) = 0 then raise exception 'RT_AUCUN_CHANTIER'; end if;
    if exists (select 1 from unnest(p_chantiers) x(id) left join public.rt_chantiers c on c.id = x.id
               where c.id is null or c.domaine_id <> p_domaine or c.supprime_at is not null) then
      raise exception 'RT_CHANTIER_HORS_DOMAINE';
    end if;
  end if;
  j := public.rt_nouveau_jeton();
  insert into public.rt_invitations (domaine_id, chantiers, droit, jeton_hash)
  values (p_domaine, (select array_agg(distinct x) from unnest(p_chantiers) x), p_droit, public.rt_hash(j)) returning id into iid;
  perform public.rt_journaliser('invitation_creee', jsonb_build_object('invitation', iid, 'domaine', p_domaine));
  return jsonb_build_object('ok', true, 'invitation_id', iid, 'jeton', j);
end $$;

-- Aperçu d'une invitation, sans connexion.
create or replace function public.rt_invitation_apercu(p_jeton text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare i record; d record;
begin
  select * into i from public.rt_invitations where jeton_hash = public.rt_hash(p_jeton);
  if not found then return jsonb_build_object('valide', false); end if;
  if i.etat <> 'envoyee' then return jsonb_build_object('valide', false, 'plus_valable', true); end if;
  select * into d from public.rt_domaines where id = i.domaine_id;
  if d.supprime_at is not null then return jsonb_build_object('valide', false, 'plus_valable', true); end if;
  return jsonb_build_object('valide', true, 'proprietaire_nom', public.rt_nom_compte(d.proprietaire), 'domaine_nom', d.nom,
    'domaine_entier', i.chantiers is null, 'droit', i.droit,
    'chantiers', coalesce((select jsonb_agg(c.nom order by c.nom) from public.rt_chantiers c where c.id = any(i.chantiers) and c.supprime_at is null), '[]'::jsonb));
end $$;

create or replace function public.rt_invitation_accepter(p_jeton text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare u uuid := public.rt_moi(); i record; d record; c uuid;
begin
  select * into i from public.rt_invitations where jeton_hash = public.rt_hash(p_jeton) for update;
  if not found then raise exception 'RT_INVITATION_PLUS_VALABLE'; end if;
  if i.etat = 'acceptee' and i.accepte_par = u then return jsonb_build_object('ok', true, 'deja', true, 'domaine_id', i.domaine_id); end if;
  if i.etat <> 'envoyee' then
    perform public.rt_journaliser('invitation_refusee', jsonb_build_object('invitation', i.id));
    raise exception 'RT_INVITATION_PLUS_VALABLE';
  end if;
  select * into d from public.rt_domaines where id = i.domaine_id;
  if d.supprime_at is not null then raise exception 'RT_INVITATION_PLUS_VALABLE'; end if;
  if d.proprietaire = u then raise exception 'RT_INVITATION_PROPRIETAIRE'; end if;
  if i.chantiers is null then
    insert into public.rt_partages (domaine_id, chantier_id, invite_id, droit, invitation_id) values (d.id, null, u, i.droit, i.id)
    on conflict (invite_id, domaine_id, coalesce(chantier_id, '00000000-0000-0000-0000-000000000000'::uuid)) where retire_at is null
    do update set droit = excluded.droit, invitation_id = excluded.invitation_id, maj_at = now();
  else
    foreach c in array i.chantiers loop
      if exists (select 1 from public.rt_chantiers where id = c and supprime_at is null) then
        insert into public.rt_partages (domaine_id, chantier_id, invite_id, droit, invitation_id) values (d.id, c, u, i.droit, i.id)
        on conflict (invite_id, domaine_id, coalesce(chantier_id, '00000000-0000-0000-0000-000000000000'::uuid)) where retire_at is null
        do update set droit = excluded.droit, invitation_id = excluded.invitation_id, maj_at = now();
      end if;
    end loop;
  end if;
  update public.rt_invitations set etat = 'acceptee', accepte_at = now(), accepte_par = u where id = i.id;
  perform public.rt_ouvrir_module(u);
  perform public.rt_liberer_sans_droit(u, d.id);
  perform public.rt_journaliser('invitation_acceptee', jsonb_build_object('invitation', i.id));
  return jsonb_build_object('ok', true, 'domaine_id', d.id);
end $$;

-- Qui a accès à un domaine (propriétaire seul) : partages actifs et invitations en attente.
create or replace function public.rt_acces(p_domaine uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare u uuid := public.rt_moi(); d record;
begin
  select * into d from public.rt_domaines where id = p_domaine and supprime_at is null;
  if not found then raise exception 'RT_INCONNU'; end if;
  if d.proprietaire <> u then raise exception 'RT_NON_PROPRIETAIRE'; end if;
  return jsonb_build_object(
    'partages', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'invite_id', p.invite_id, 'invite_nom', public.rt_nom_compte(p.invite_id),
        'chantier_id', p.chantier_id, 'chantier_nom', (select nom from public.rt_chantiers where id = p.chantier_id), 'droit', p.droit, 'depuis', p.cree_at)
        order by public.rt_nom_compte(p.invite_id), p.chantier_id nulls first)
      from public.rt_partages p where p.domaine_id = p_domaine and p.retire_at is null), '[]'::jsonb),
    'invitations', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'droit', i.droit, 'domaine_entier', i.chantiers is null,
        'chantiers', (select jsonb_agg(c.nom order by c.nom) from public.rt_chantiers c where c.id = any(i.chantiers)), 'cree_at', i.cree_at) order by i.cree_at)
      from public.rt_invitations i where i.domaine_id = p_domaine and i.etat = 'envoyee'), '[]'::jsonb));
end $$;

create or replace function public.rt_partage_modifier(p_partage uuid, p_droit text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare u uuid := public.rt_moi(); p record;
begin
  select p2.*, d.proprietaire into p from public.rt_partages p2 join public.rt_domaines d on d.id = p2.domaine_id where p2.id = p_partage and p2.retire_at is null for update;
  if not found then raise exception 'RT_INCONNU'; end if;
  if p.proprietaire <> u then raise exception 'RT_NON_PROPRIETAIRE'; end if;
  if p_droit not in ('consulter', 'relever') then raise exception 'RT_DROIT_INVALIDE'; end if;
  update public.rt_partages set droit = p_droit, maj_at = now() where id = p_partage;
  perform public.rt_liberer_sans_droit(p.invite_id, p.domaine_id);
  perform public.rt_journaliser('partage_modifie', jsonb_build_object('partage', p_partage, 'droit', p_droit));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.rt_partage_retirer(p_partage uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare u uuid := public.rt_moi(); p record;
begin
  select p2.*, d.proprietaire into p from public.rt_partages p2 join public.rt_domaines d on d.id = p2.domaine_id where p2.id = p_partage and p2.retire_at is null for update;
  if not found then raise exception 'RT_INCONNU'; end if;
  if p.proprietaire <> u then raise exception 'RT_NON_PROPRIETAIRE'; end if;
  update public.rt_partages set retire_at = now() where id = p_partage;
  perform public.rt_liberer_sans_droit(p.invite_id, p.domaine_id);
  perform public.rt_journaliser('partage_retire', jsonb_build_object('partage', p_partage));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.rt_invitation_retirer(p_invitation uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare u uuid := public.rt_moi(); i record;
begin
  select i2.*, d.proprietaire into i from public.rt_invitations i2 join public.rt_domaines d on d.id = i2.domaine_id where i2.id = p_invitation for update;
  if not found then raise exception 'RT_INCONNU'; end if;
  if i.proprietaire <> u then raise exception 'RT_NON_PROPRIETAIRE'; end if;
  if i.etat = 'envoyee' then update public.rt_invitations set etat = 'retiree', retire_at = now() where id = p_invitation; end if;
  return jsonb_build_object('ok', true);
end $$;

-- ============================================================================================
-- 4. Droits d'appel
-- ============================================================================================
do $$ declare f regprocedure; begin
  for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'rt\_%' loop
    execute format('revoke all on function %s from public, anon, authenticated, service_role', f);
  end loop;
end $$;
grant execute on function public.rt_invitation_apercu(text) to anon, authenticated;
grant execute on function
  public.rt_ouvrir(uuid, text), public.rt_mes_terrains(), public.rt_domaine_enregistrer(uuid, text),
  public.rt_chantier_enregistrer(uuid, uuid, text), public.rt_chantier_supprimer(uuid, uuid), public.rt_domaine_supprimer(uuid, uuid),
  public.rt_releve_creer(uuid, uuid, uuid, text, jsonb), public.rt_releve_lire(uuid), public.rt_saisie_prendre(uuid, uuid),
  public.rt_saisie_reprendre(uuid, uuid), public.rt_saisie_terminer(uuid, uuid), public.rt_reprise_accuser(uuid, uuid),
  public.rt_envoyer(uuid, uuid, jsonb, jsonb), public.rt_releve_supprimer(uuid, uuid),
  public.rt_invitation_creer(uuid, uuid[], text), public.rt_invitation_accepter(text), public.rt_acces(uuid),
  public.rt_partage_modifier(uuid, text), public.rt_partage_retirer(uuid), public.rt_invitation_retirer(uuid)
to authenticated;
