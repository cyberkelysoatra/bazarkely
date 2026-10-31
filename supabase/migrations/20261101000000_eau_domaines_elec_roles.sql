-- ELEC-CC-01 (phase 0) : domaines Eau / Electricite dans le module gestion-eau.
-- Idempotent : rejouable sans effet de bord.

-- 1. Roles electricite (cumulables, defaut false). `releveur` = releveur d'eau.
alter table public.eau_roles add column if not exists releveur_elec boolean not null default false;
alter table public.eau_roles add column if not exists gestion_elec  boolean not null default false;
alter table public.eau_roles add column if not exists lecture_elec  boolean not null default false;

-- 2. Fonctions d'aide (modele eau_is_*) pour les politiques RLS des phases suivantes.
create or replace function public.eau_is_releveur_elec()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select releveur_elec from eau_roles where user_id = auth.uid()::text), false);
$$;

create or replace function public.eau_has_gestion_elec()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select admin or gestion_elec from eau_roles where user_id = auth.uid()::text), false);
$$;

create or replace function public.eau_has_lecture_elec()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select admin or promoteur or gestion_elec or lecture_elec
                   from eau_roles where user_id = auth.uid()::text), false);
$$;

revoke execute on function public.eau_is_releveur_elec() from public, anon;
revoke execute on function public.eau_has_gestion_elec() from public, anon;
revoke execute on function public.eau_has_lecture_elec() from public, anon;
grant execute on function public.eau_is_releveur_elec() to authenticated;
grant execute on function public.eau_has_gestion_elec() to authenticated;
grant execute on function public.eau_has_lecture_elec() to authenticated;

-- 3. Domaine des annonces.
alter table public.eau_annonces add column if not exists domaine text not null default 'eau';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'eau_annonces_domaine_check') then
    alter table public.eau_annonces
      add constraint eau_annonces_domaine_check check (domaine in ('eau', 'elec'));
  end if;
end $$;

-- 4. RLS active et forcee ; droits par defaut non voulus retires.
--    Les politiques existantes (ecriture eau_roles = eau_is_admin()) couvrent toutes
--    les colonnes, dont les nouvelles : aucun compte ne peut se donner un role.
alter table public.eau_roles enable row level security;
alter table public.eau_roles force row level security;
alter table public.eau_annonces enable row level security;
alter table public.eau_annonces force row level security;
revoke all on table public.eau_roles from anon;
revoke all on table public.eau_annonces from anon;
revoke truncate, references, trigger on table public.eau_roles from authenticated;
revoke truncate, references, trigger on table public.eau_annonces from authenticated;
