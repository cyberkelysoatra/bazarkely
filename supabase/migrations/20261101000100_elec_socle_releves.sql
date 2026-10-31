-- ELEC-CC-02 (phase 1) : socle RTB Energie (reglages, clients, compteurs) et releves
-- d'electricite dans le module gestion-eau. Idempotent (rejouable sans effet de bord).
--
-- Roles (fonctions d'aide de ELEC-CC-01) :
--   eau_is_releveur_elec()  : releveur electricite
--   eau_has_gestion_elec()  : admin ou gestion electricite
--   eau_has_lecture_elec()  : admin, promoteur, gestion ou lecture electricite
-- Politiques en role public (predicats sur auth.uid() via les fonctions d'aide),
-- RLS activee ET forcee, droits retires a anon/public, aucun truncate/references/trigger.

-- ───────────────────────────── 2.1 eau_elec_reglages ─────────────────────────────
create table if not exists public.eau_elec_reglages (
  id                text primary key default 'rtb' check (id = 'rtb'),
  raison_sociale    text,
  forme_juridique   text,
  siege             text,
  nif               text,
  stat              text,
  rcs               text,
  telephone         text,
  email             text,
  banque            text,
  titulaire_compte  text,
  iban              text,
  bic               text,
  site              text,
  puissance_kwc     numeric,
  contrat_ref       text,
  tarif_kwh         numeric not null default 895,
  forfait_ht        numeric not null default 200000,
  tva_pct           numeric not null default 20,
  echeance_jours    int not null default 15,
  devise            text not null default 'MGA',
  numero_annee      int not null default 2026,
  numero_prochain   int not null default 50,
  mode_essai        boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Ligne unique : valeurs par defaut, identite et coordonnees bancaires VIDES (saisies par RTB).
insert into public.eau_elec_reglages (id) values ('rtb') on conflict (id) do nothing;

-- ───────────────────────────── 2.2 eau_elec_clients ─────────────────────────────
create table if not exists public.eau_elec_clients (
  id               text primary key,
  code             text not null unique,
  nom              text not null,
  raison_sociale   text,
  adresse          text,
  nif              text,
  stat             text,
  email            text,
  telephone        text,
  facture_groupee  boolean not null default false,
  hors_domaine     boolean not null default false,
  statut           text not null default 'actif' check (statut in ('actif','pause','arrete')),
  user_id          text null,
  notes_internes   text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_eau_elec_clients_user on public.eau_elec_clients (user_id);

-- ───────────────────────────── 2.3 eau_elec_compteurs ─────────────────────────────
create table if not exists public.eau_elec_compteurs (
  id                    text primary key,
  code                  text not null unique,
  bien                  text not null,
  client_id             text not null references public.eau_elec_clients(id) on delete restrict,
  decimales             int not null default 2 check (decimales between 0 and 3),
  statut                text not null default 'actif' check (statut in ('actif','pause','arrete')),
  remplace_compteur_id  text null references public.eau_elec_compteurs(id),
  date_mise_en_service  date,
  date_arret            date,
  index_reprise         numeric null,
  date_index_reprise    date null,
  ordre                 int,
  note                  text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists idx_eau_elec_compteurs_client on public.eau_elec_compteurs (client_id);
create index if not exists idx_eau_elec_compteurs_remplace on public.eau_elec_compteurs (remplace_compteur_id);

-- ─────────────────────── 2.4 eau_elec_releves_compteur (reprise) ───────────────────────
-- La table existante (vide) pointait vers les compteurs d'EAU : la cle est reprise vers
-- les compteurs d'electricite. Garde-fou : on ne touche a la cle que si la table est vide
-- ou deja reprise.
do $fk$
declare
  v_target regclass;
begin
  select c.confrelid::regclass into v_target
    from pg_constraint c
   where c.conrelid = 'public.eau_elec_releves_compteur'::regclass
     and c.conname = 'eau_elec_releves_compteur_compteur_id_fkey';
  if v_target is distinct from 'public.eau_elec_compteurs'::regclass then
    if exists (select 1 from public.eau_elec_releves_compteur) then
      raise exception 'eau_elec_releves_compteur contient des lignes : cle non reprise';
    end if;
    alter table public.eau_elec_releves_compteur
      drop constraint if exists eau_elec_releves_compteur_compteur_id_fkey;
    alter table public.eau_elec_releves_compteur
      add constraint eau_elec_releves_compteur_compteur_id_fkey
      foreign key (compteur_id) references public.eau_elec_compteurs(id) on delete restrict;
  end if;
end
$fk$;

alter table public.eau_elec_releves_compteur
  add column if not exists origine text not null default 'terrain';
alter table public.eau_elec_releves_compteur
  add column if not exists updated_at timestamptz not null default now();
do $ck$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.eau_elec_releves_compteur'::regclass
       and conname = 'eau_elec_releves_compteur_origine_check'
  ) then
    alter table public.eau_elec_releves_compteur
      add constraint eau_elec_releves_compteur_origine_check
      check (origine in ('terrain','carnet','photo_client'));
  end if;
end
$ck$;

-- ───────────────────────────── RLS et droits ─────────────────────────────
alter table public.eau_elec_reglages enable row level security;
alter table public.eau_elec_reglages force row level security;
alter table public.eau_elec_clients enable row level security;
alter table public.eau_elec_clients force row level security;
alter table public.eau_elec_compteurs enable row level security;
alter table public.eau_elec_compteurs force row level security;
alter table public.eau_elec_releves_compteur enable row level security;
alter table public.eau_elec_releves_compteur force row level security;

revoke all on public.eau_elec_reglages from anon, public;
revoke all on public.eau_elec_clients from anon, public;
revoke all on public.eau_elec_compteurs from anon, public;
revoke all on public.eau_elec_releves_compteur from anon, public;
revoke all on public.eau_elec_reglages from authenticated;
revoke all on public.eau_elec_clients from authenticated;
revoke all on public.eau_elec_compteurs from authenticated;
revoke all on public.eau_elec_releves_compteur from authenticated;
grant select, insert, update on public.eau_elec_reglages to authenticated;
grant select, insert, update, delete on public.eau_elec_clients to authenticated;
grant select, insert, update, delete on public.eau_elec_compteurs to authenticated;
grant select, insert, update, delete on public.eau_elec_releves_compteur to authenticated;

-- Reglages : lecture domaine electricite (promoteur compris), ecriture gestion, aucune suppression.
drop policy if exists eau_elec_reglages_sel on public.eau_elec_reglages;
drop policy if exists eau_elec_reglages_ins on public.eau_elec_reglages;
drop policy if exists eau_elec_reglages_upd on public.eau_elec_reglages;
create policy eau_elec_reglages_sel on public.eau_elec_reglages for select to public
  using (eau_has_lecture_elec());
create policy eau_elec_reglages_ins on public.eau_elec_reglages for insert to public
  with check (eau_has_gestion_elec());
create policy eau_elec_reglages_upd on public.eau_elec_reglages for update to public
  using (eau_has_gestion_elec()) with check (eau_has_gestion_elec());

-- Clients : lecture domaine electricite (promoteur compris), ecriture gestion. Releveur : rien.
drop policy if exists eau_elec_clients_sel on public.eau_elec_clients;
drop policy if exists eau_elec_clients_ins on public.eau_elec_clients;
drop policy if exists eau_elec_clients_upd on public.eau_elec_clients;
drop policy if exists eau_elec_clients_del on public.eau_elec_clients;
create policy eau_elec_clients_sel on public.eau_elec_clients for select to public
  using (eau_has_lecture_elec());
-- Un client RTB lit SA seule fiche (domaine electricite du client, lecture locale) :
-- aucune donnee d'un autre client.
drop policy if exists eau_elec_clients_sel_self on public.eau_elec_clients;
create policy eau_elec_clients_sel_self on public.eau_elec_clients for select to public
  using (user_id is not null and user_id = (auth.uid())::text);
create policy eau_elec_clients_ins on public.eau_elec_clients for insert to public
  with check (eau_has_gestion_elec());
create policy eau_elec_clients_upd on public.eau_elec_clients for update to public
  using (eau_has_gestion_elec()) with check (eau_has_gestion_elec());
create policy eau_elec_clients_del on public.eau_elec_clients for delete to public
  using (eau_has_gestion_elec());

-- Compteurs : lecture domaine electricite + releveur electricite, ecriture gestion.
drop policy if exists eau_elec_compteurs_sel on public.eau_elec_compteurs;
drop policy if exists eau_elec_compteurs_ins on public.eau_elec_compteurs;
drop policy if exists eau_elec_compteurs_upd on public.eau_elec_compteurs;
drop policy if exists eau_elec_compteurs_del on public.eau_elec_compteurs;
create policy eau_elec_compteurs_sel on public.eau_elec_compteurs for select to public
  using (eau_has_lecture_elec() or eau_is_releveur_elec());
create policy eau_elec_compteurs_ins on public.eau_elec_compteurs for insert to public
  with check (eau_has_gestion_elec());
create policy eau_elec_compteurs_upd on public.eau_elec_compteurs for update to public
  using (eau_has_gestion_elec()) with check (eau_has_gestion_elec());
create policy eau_elec_compteurs_del on public.eau_elec_compteurs for delete to public
  using (eau_has_gestion_elec());

-- Releves : le releveur d'EAU n'y a plus acces. Releveur electricite : insertion a son nom,
-- modification et suppression de SES releves de moins de 48 h (regle des releves d'eau).
drop policy if exists eau_elec_releves_sel on public.eau_elec_releves_compteur;
drop policy if exists eau_elec_releves_ins on public.eau_elec_releves_compteur;
drop policy if exists eau_elec_releves_upd on public.eau_elec_releves_compteur;
drop policy if exists eau_elec_releves_del on public.eau_elec_releves_compteur;
create policy eau_elec_releves_sel on public.eau_elec_releves_compteur for select to public
  using (eau_has_lecture_elec() or eau_is_releveur_elec());
create policy eau_elec_releves_ins on public.eau_elec_releves_compteur for insert to public
  with check (
    eau_has_gestion_elec()
    or (eau_is_releveur_elec() and agent_id = (auth.uid())::text
        and "timestamp" <= now() + interval '12 hours')
  );
create policy eau_elec_releves_upd on public.eau_elec_releves_compteur for update to public
  using (
    eau_has_gestion_elec()
    or (eau_is_releveur_elec() and agent_id = (auth.uid())::text
        and "timestamp" >= now() - interval '48 hours')
  )
  with check (
    eau_has_gestion_elec()
    or (eau_is_releveur_elec() and agent_id = (auth.uid())::text
        and "timestamp" >= now() - interval '48 hours'
        and "timestamp" <= now() + interval '12 hours')
  );
create policy eau_elec_releves_del on public.eau_elec_releves_compteur for delete to public
  using (
    eau_has_gestion_elec()
    or (eau_is_releveur_elec() and agent_id = (auth.uid())::text
        and "timestamp" >= now() - interval '48 hours')
  );

-- ───────────────────── 2.6 Invitations : roles electricite ─────────────────────
alter table public.eau_invitations add column if not exists role_releveur_elec boolean not null default false;
alter table public.eau_invitations add column if not exists role_gestion_elec boolean not null default false;
alter table public.eau_invitations add column if not exists role_lecture_elec boolean not null default false;

-- Reprises a l'identique des definitions du 01/11/2026 ; seuls ajouts : les trois roles
-- electricite dans la condition, l'insertion et la fusion (ou logique) de eau_roles.
create or replace function public.eau_claim_invitation()
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_uid       text := auth.uid()::text;
  v_mail      text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_inv       eau_invitations%rowtype;
  v_compte_id text;
begin
  if v_uid is null or v_mail = '' then return null; end if;

  select * into v_inv from eau_invitations
   where statut = 'en_attente' and lower(email) = v_mail
   order by created_at asc limit 1;
  if not found then return null; end if;

  if v_inv.role_admin or v_inv.role_releveur or v_inv.role_promoteur
     or v_inv.role_releveur_elec or v_inv.role_gestion_elec or v_inv.role_lecture_elec then
    insert into eau_roles (user_id, admin, releveur, promoteur,
                           releveur_elec, gestion_elec, lecture_elec, updated_at)
    values (v_uid, v_inv.role_admin, v_inv.role_releveur, v_inv.role_promoteur,
            v_inv.role_releveur_elec, v_inv.role_gestion_elec, v_inv.role_lecture_elec, now())
    on conflict (user_id) do update
      set admin = eau_roles.admin or excluded.admin,
          releveur = eau_roles.releveur or excluded.releveur,
          promoteur = eau_roles.promoteur or excluded.promoteur,
          releveur_elec = eau_roles.releveur_elec or excluded.releveur_elec,
          gestion_elec = eau_roles.gestion_elec or excluded.gestion_elec,
          lecture_elec = eau_roles.lecture_elec or excluded.lecture_elec,
          updated_at = now();
  end if;

  if v_inv.role_client then
    select id into v_compte_id from eau_comptes_client where user_id = v_uid limit 1;
    if v_compte_id is null then
      v_compte_id := 'inv-' || replace(gen_random_uuid()::text, '-', '');
      insert into eau_comptes_client
        (id, nom, contact, compteur_ids, code_enrolement, code_qr, user_id, actif, created_by, created_at)
      values
        (v_compte_id, coalesce(v_inv.nom, v_mail), null, coalesce(v_inv.compteur_ids,'[]'::jsonb),
         'INV' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
         'QR'  || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),
         v_uid, true, v_inv.invited_by, now());
    else
      update eau_comptes_client
         set compteur_ids = (
               select coalesce(jsonb_agg(distinct e), '[]'::jsonb) from (
                 select jsonb_array_elements_text(coalesce(compteur_ids,'[]'::jsonb)) e
                 union
                 select jsonb_array_elements_text(coalesce(v_inv.compteur_ids,'[]'::jsonb)) e
               ) s),
             actif = true
       where id = v_compte_id;
    end if;
  end if;

  update eau_invitations set statut='acceptee', accepted_by=v_uid, accepted_at=now()
   where id = v_inv.id;
  return v_inv.id;
end;
$function$;

create or replace function public.eau_claim_invitation_by_token(p_token text)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_uid       text := auth.uid()::text;
  v_inv       eau_invitations%rowtype;
  v_compte_id text;
begin
  if v_uid is null or coalesce(p_token,'') = '' then return null; end if;
  select * into v_inv from eau_invitations where token = p_token limit 1;
  if not found then return null; end if;
  if v_inv.statut = 'acceptee' then
    if v_inv.accepted_by = v_uid then return v_inv.id; end if;
    return null;
  end if;
  if v_inv.statut <> 'en_attente' then return null; end if;
  if v_inv.expires_at is not null and now() > v_inv.expires_at then return null; end if;
  if v_inv.role_admin or v_inv.role_releveur or v_inv.role_promoteur
     or v_inv.role_releveur_elec or v_inv.role_gestion_elec or v_inv.role_lecture_elec then
    insert into eau_roles (user_id, admin, releveur, promoteur,
                           releveur_elec, gestion_elec, lecture_elec, updated_at)
    values (v_uid, v_inv.role_admin, v_inv.role_releveur, v_inv.role_promoteur,
            v_inv.role_releveur_elec, v_inv.role_gestion_elec, v_inv.role_lecture_elec, now())
    on conflict (user_id) do update
      set admin = eau_roles.admin or excluded.admin,
          releveur = eau_roles.releveur or excluded.releveur,
          promoteur = eau_roles.promoteur or excluded.promoteur,
          releveur_elec = eau_roles.releveur_elec or excluded.releveur_elec,
          gestion_elec = eau_roles.gestion_elec or excluded.gestion_elec,
          lecture_elec = eau_roles.lecture_elec or excluded.lecture_elec,
          updated_at = now();
  end if;
  if v_inv.role_client then
    select id into v_compte_id from eau_comptes_client where user_id = v_uid limit 1;
    if v_compte_id is null then
      v_compte_id := 'inv-' || replace(gen_random_uuid()::text, '-', '');
      insert into eau_comptes_client
        (id, nom, contact, compteur_ids, code_enrolement, code_qr, user_id, actif, created_by, created_at)
      values
        (v_compte_id, coalesce(v_inv.nom,'Client invité'), v_inv.phone,
         coalesce(v_inv.compteur_ids,'[]'::jsonb),
         'INV' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
         'QR'  || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),
         v_uid, true, v_inv.invited_by, now());
    else
      update eau_comptes_client
         set compteur_ids = (
               select coalesce(jsonb_agg(distinct e),'[]'::jsonb) from (
                 select jsonb_array_elements_text(coalesce(compteur_ids,'[]'::jsonb)) e
                 union
                 select jsonb_array_elements_text(coalesce(v_inv.compteur_ids,'[]'::jsonb)) e) s),
             actif = true
       where id = v_compte_id;
    end if;
  end if;
  update eau_invitations
     set statut = 'acceptee', accepted_by = v_uid, accepted_at = now()
   where id = v_inv.id;
  return v_inv.id;
end;
$function$;

revoke execute on function public.eau_claim_invitation() from public, anon;
revoke execute on function public.eau_claim_invitation_by_token(text) from public, anon;
grant execute on function public.eau_claim_invitation() to authenticated;
grant execute on function public.eau_claim_invitation_by_token(text) to authenticated;
