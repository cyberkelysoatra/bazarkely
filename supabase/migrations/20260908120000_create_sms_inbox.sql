-- Phase 1 SMS Orange Money — socle de donnees et ingestion.
-- Idempotent : rejouable sans effet de bord.

-- ---------------------------------------------------------------------------
-- 1. Boite de reception des SMS
-- ---------------------------------------------------------------------------
create table if not exists public.sms_inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  reference text not null,
  texte_brut text not null,
  modele text,
  sens text,
  montant bigint,
  frais bigint not null default 0,
  solde bigint,
  tiers text,
  expediteur text,
  horodatage timestamptz,
  etat text not null default 'a_valider',
  transaction_id uuid,
  appareil text,
  recu_le timestamptz not null default now(),
  traite_le timestamptz
);

-- Coeur de l'anti-doublon : toute ingestion est un upsert sur ce couple.
create unique index if not exists sms_inbox_user_reference_uniq
  on public.sms_inbox (user_id, reference);

create index if not exists sms_inbox_user_etat_idx
  on public.sms_inbox (user_id, etat, horodatage desc);

-- Etats admis.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'sms_inbox_etat_check'
  ) then
    alter table public.sms_inbox add constraint sms_inbox_etat_check
      check (etat in ('a_valider','auto_ecrit','valide','ignore','non_reconnu','rupture_chaine'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'sms_inbox_sens_check'
  ) then
    alter table public.sms_inbox add constraint sms_inbox_sens_check
      check (sens is null or sens in ('credit','debit','aucun'));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Expediteurs autorises (cote serveur, lus et mis en cache par le capteur
--    Android de la phase 3 : ajouter un operateur ne doit jamais obliger a
--    reinstaller l'application sur les telephones).
-- ---------------------------------------------------------------------------
create table if not exists public.sms_expediteurs_autorises (
  libelle text primary key,
  operateur text,
  actif boolean not null default true
);

insert into public.sms_expediteurs_autorises (libelle, operateur) values
  ('OrangeMoney','Orange Money'), ('MVola','MVola'),
  ('Airtel Money','Airtel Money'), ('BMOI','BMOI')
on conflict (libelle) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Appareils relies. La cle d'appareil n'est JAMAIS stockee en clair :
--    seul son hachage SHA-256 est conserve.
-- ---------------------------------------------------------------------------
create table if not exists public.sms_appareils (
  cle_hash text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  libelle text,
  cree_le timestamptz not null default now(),
  derniere_vue timestamptz
);

create index if not exists sms_appareils_user_idx on public.sms_appareils (user_id);

-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------
alter table public.sms_inbox enable row level security;
alter table public.sms_inbox force row level security;
alter table public.sms_appareils enable row level security;
alter table public.sms_appareils force row level security;
alter table public.sms_expediteurs_autorises enable row level security;

revoke all on public.sms_inbox from anon;
revoke all on public.sms_appareils from anon;
revoke all on public.sms_expediteurs_autorises from anon;

grant select, insert, update, delete on public.sms_inbox to authenticated;
grant select, insert, update, delete on public.sms_appareils to authenticated;
grant select on public.sms_expediteurs_autorises to authenticated;

-- sms_inbox : chacun ne voit que ses propres lignes.
drop policy if exists sms_inbox_select_own on public.sms_inbox;
create policy sms_inbox_select_own on public.sms_inbox
  for select to public using (auth.uid() = user_id);

drop policy if exists sms_inbox_insert_own on public.sms_inbox;
create policy sms_inbox_insert_own on public.sms_inbox
  for insert to public with check (auth.uid() = user_id);

drop policy if exists sms_inbox_update_own on public.sms_inbox;
create policy sms_inbox_update_own on public.sms_inbox
  for update to public using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists sms_inbox_delete_own on public.sms_inbox;
create policy sms_inbox_delete_own on public.sms_inbox
  for delete to public using (auth.uid() = user_id);

-- sms_appareils : idem.
drop policy if exists sms_appareils_select_own on public.sms_appareils;
create policy sms_appareils_select_own on public.sms_appareils
  for select to public using (auth.uid() = user_id);

drop policy if exists sms_appareils_insert_own on public.sms_appareils;
create policy sms_appareils_insert_own on public.sms_appareils
  for insert to public with check (auth.uid() = user_id);

drop policy if exists sms_appareils_update_own on public.sms_appareils;
create policy sms_appareils_update_own on public.sms_appareils
  for update to public using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists sms_appareils_delete_own on public.sms_appareils;
create policy sms_appareils_delete_own on public.sms_appareils
  for delete to public using (auth.uid() = user_id);

-- Referentiel commun : lisible par tout utilisateur connecte (donc par un
-- appareil relie, qui agit via l'Edge Function), en lecture seule.
drop policy if exists sms_expediteurs_select_all on public.sms_expediteurs_autorises;
create policy sms_expediteurs_select_all on public.sms_expediteurs_autorises
  for select to public using (auth.role() = 'authenticated');
