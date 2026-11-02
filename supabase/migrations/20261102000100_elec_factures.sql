-- ELEC-CC-03 (phase 2a) : facture RTB Energie, coeur (calcul, numerotation, statuts,
-- validation des gerants). Idempotent (rejouable sans effet de bord).
--
-- Regles (fournies par RTB) :
--   ligne : kwh = index_fin - index_debut ; montant = round(kwh * tarif_kwh, 2)
--   facture : energie = somme des lignes ; HT = energie + round(forfait_ht, 2) (une fois)
--             TVA = round(HT * tva_pct / 100, 2) ; TTC = round(HT + TVA) (Ariary, demi vers le haut)
--   numero FAC-AAAA-MM-NNN : AAAA-MM = mois de consommation ; NNN continu sur l'annee,
--             attribue a l'emission seulement ; compteur d'essai distinct en mode essai.
-- Toutes les transitions de statut passent par les fonctions eau_elec_* (security definer).

-- ───────────────────────────── 2.1 Role validation_elec ─────────────────────────────
alter table public.eau_roles add column if not exists validation_elec boolean not null default false;
alter table public.eau_invitations add column if not exists role_validation_elec boolean not null default false;

create or replace function public.eau_is_validation_elec()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select validation_elec from eau_roles where user_id = auth.uid()::text), false);
$$;

-- Un valideur lit factures, lignes, avis, clients, compteurs, releves et reglages.
create or replace function public.eau_has_lecture_elec()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select admin or promoteur or gestion_elec or lecture_elec or validation_elec
                   from eau_roles where user_id = auth.uid()::text), false);
$$;

revoke execute on function public.eau_is_validation_elec() from public, anon;
revoke execute on function public.eau_has_lecture_elec() from public, anon;
grant execute on function public.eau_is_validation_elec() to authenticated;
grant execute on function public.eau_has_lecture_elec() to authenticated;

-- ───────────────────────────── 2.2 Reglages : compteur d'essai ─────────────────────────────
alter table public.eau_elec_reglages add column if not exists numero_essai_prochain int not null default 50;
alter table public.eau_elec_reglages add column if not exists numero_essai_annee int not null default 2026;

-- ───────────────────────────── 2.3 eau_elec_factures ─────────────────────────────
create table if not exists public.eau_elec_factures (
  id                      text primary key,
  client_id               text not null references public.eau_elec_clients(id) on delete restrict,
  bien                    text,
  cycle                   text not null check (cycle ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  statut                  text not null default 'brouillon'
                          check (statut in ('brouillon','emise','a_valider','validee','envoyee','payee','abandonnee')),
  essai                   boolean not null default false,
  numero                  text,
  numero_seq              int,
  periode_debut           date,
  periode_fin             date,
  date_emission           date,
  date_echeance           date,
  tarif_kwh               numeric,
  forfait_ht              numeric,
  tva_pct                 numeric,
  total_kwh               numeric,
  montant_energie         numeric(14,2),
  montant_ht              numeric(14,2),
  montant_tva             numeric(14,2),
  montant_ttc             numeric(14,0),
  client_snapshot         jsonb,
  emetteur_snapshot       jsonb,
  validation_date_limite  date,
  date_envoi              date,
  en_attente_releve       boolean not null default false,
  motif_attente           text,
  note_interne            text,
  cle_regroupement        text not null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
-- Un meme cycle ne produit jamais deux factures pour la meme cle (essai et officiel a part :
-- les factures d'essai reprennent les numeros du tableur pour comparaison).
create unique index if not exists uq_eau_elec_factures_cle
  on public.eau_elec_factures (cycle, cle_regroupement, essai);
-- Numero unique dans sa serie (officielle ou essai).
create unique index if not exists uq_eau_elec_factures_numero
  on public.eau_elec_factures (numero, essai) where numero is not null;
create index if not exists idx_eau_elec_factures_cycle on public.eau_elec_factures (cycle);
create index if not exists idx_eau_elec_factures_client on public.eau_elec_factures (client_id);

-- ───────────────────────────── 2.4 eau_elec_facture_lignes ─────────────────────────────
create table if not exists public.eau_elec_facture_lignes (
  id                text primary key,
  facture_id        text not null references public.eau_elec_factures(id) on delete cascade,
  compteur_id       text not null references public.eau_elec_compteurs(id) on delete restrict,
  code_compteur     text,
  index_debut       numeric,
  date_index_debut  timestamptz,
  index_fin         numeric,
  date_index_fin    timestamptz,
  releve_fin_id     text,
  kwh               numeric,
  montant           numeric(14,2),
  ordre             int,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_eau_elec_facture_lignes_facture on public.eau_elec_facture_lignes (facture_id);
create index if not exists idx_eau_elec_facture_lignes_compteur on public.eau_elec_facture_lignes (compteur_id);

-- ───────────────────────────── 2.5 eau_elec_validations ─────────────────────────────
create table if not exists public.eau_elec_validations (
  id          text primary key,
  facture_id  text not null references public.eau_elec_factures(id) on delete cascade,
  user_id     text not null,
  avis        text not null check (avis in ('bon','remarque')),
  texte       text,
  reponse     text,
  levee       boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (facture_id, user_id)
);

-- ───────────────────────────── 2.6 Totaux calcules par la base ─────────────────────────────
-- Montant d'une ligne : kwh et montant recalcules a chaque ecriture (prix de la facture).
create or replace function public.eau_elec_ligne_calcul()
returns trigger language plpgsql set search_path = public as $$
declare
  v_tarif numeric;
begin
  select tarif_kwh into v_tarif from eau_elec_factures where id = new.facture_id;
  if new.index_fin is not null and new.index_debut is not null then
    new.kwh := new.index_fin - new.index_debut;
  else
    new.kwh := null;
  end if;
  new.montant := case when new.kwh is null or v_tarif is null then null else round(new.kwh * v_tarif, 2) end;
  new.updated_at := now();
  return new;
end;
$$;

-- Totaux d'une facture : toujours recalcules depuis ses lignes et ses parametres.
create or replace function public.eau_elec_facture_totaux()
returns trigger language plpgsql set search_path = public as $$
declare
  v_energie numeric;
  v_kwh numeric;
  v_ht numeric;
  v_tva numeric;
begin
  select sum(round(l.kwh * new.tarif_kwh, 2)), sum(l.kwh)
    into v_energie, v_kwh
    from eau_elec_facture_lignes l
   where l.facture_id = new.id and l.kwh is not null;
  if new.tarif_kwh is null or new.forfait_ht is null or new.tva_pct is null then
    new.total_kwh := v_kwh;
    new.montant_energie := null;
    new.montant_ht := null;
    new.montant_tva := null;
    new.montant_ttc := null;
    return new;
  end if;
  v_energie := coalesce(v_energie, 0);
  v_ht := v_energie + round(new.forfait_ht, 2);
  v_tva := round(v_ht * new.tva_pct / 100, 2);
  new.total_kwh := coalesce(v_kwh, 0);
  new.montant_energie := v_energie;
  new.montant_ht := v_ht;
  new.montant_tva := v_tva;
  new.montant_ttc := round(v_ht + v_tva);
  return new;
end;
$$;

-- Une ligne change : la facture se recalcule (son declencheur de totaux s'en charge).
create or replace function public.eau_elec_ligne_touche_facture()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op in ('UPDATE','DELETE') then
    update eau_elec_factures set updated_at = now() where id = old.facture_id;
  end if;
  if tg_op in ('INSERT','UPDATE') and (tg_op = 'INSERT' or new.facture_id is distinct from old.facture_id) then
    update eau_elec_factures set updated_at = now() where id = new.facture_id;
  end if;
  return null;
end;
$$;

-- Le prix de la facture change : les montants des lignes suivent.
create or replace function public.eau_elec_facture_prix_lignes()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.tarif_kwh is distinct from old.tarif_kwh then
    update eau_elec_facture_lignes set updated_at = now() where facture_id = new.id;
  end if;
  return null;
end;
$$;

-- ───────────────────────────── 2.7 Garde-fous ─────────────────────────────
-- Invoker (P31) : la garde ne depend que des valeurs, jamais de l'appelant.
create or replace function public.eau_elec_facture_garde()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    if old.statut in ('envoyee','payee','abandonnee') then
      raise exception 'Facture % envoyee : suppression refusee', coalesce(old.numero, old.id) using errcode = '42501';
    end if;
    if old.numero is not null and not old.essai then
      raise exception 'Facture officielle % : suppression refusee', old.numero using errcode = '42501';
    end if;
    return old;
  end if;
  -- UPDATE
  if old.numero is not null and new.numero is distinct from old.numero then
    raise exception 'Numero % : modification refusee', old.numero using errcode = '42501';
  end if;
  if old.statut in ('envoyee','payee','abandonnee') then
    if new.statut not in ('envoyee','payee','abandonnee')
       or new.numero_seq is distinct from old.numero_seq
       or new.essai is distinct from old.essai
       or new.date_emission is distinct from old.date_emission
       or new.date_echeance is distinct from old.date_echeance
       or new.periode_debut is distinct from old.periode_debut
       or new.periode_fin is distinct from old.periode_fin
       or new.tarif_kwh is distinct from old.tarif_kwh
       or new.forfait_ht is distinct from old.forfait_ht
       or new.tva_pct is distinct from old.tva_pct
       or new.total_kwh is distinct from old.total_kwh
       or new.montant_energie is distinct from old.montant_energie
       or new.montant_ht is distinct from old.montant_ht
       or new.montant_tva is distinct from old.montant_tva
       or new.montant_ttc is distinct from old.montant_ttc
       or new.client_id is distinct from old.client_id
       or new.bien is distinct from old.bien
       or new.cycle is distinct from old.cycle
       or new.client_snapshot is distinct from old.client_snapshot
       or new.emetteur_snapshot is distinct from old.emetteur_snapshot then
      raise exception 'Facture % envoyee : modification refusee', coalesce(old.numero, old.id) using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.eau_elec_ligne_garde()
returns trigger language plpgsql set search_path = public as $$
declare
  v_statut text;
  v_fid text := case when tg_op = 'DELETE' then old.facture_id else new.facture_id end;
begin
  select statut into v_statut from eau_elec_factures where id = v_fid;
  -- Facture absente : suppression en cascade de sa facture (deja gardee).
  if v_statut in ('envoyee','payee','abandonnee') then
    raise exception 'Facture envoyee : lignes non modifiables' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and old.facture_id is distinct from new.facture_id then
    select statut into v_statut from eau_elec_factures where id = old.facture_id;
    if v_statut in ('envoyee','payee','abandonnee') then
      raise exception 'Facture envoyee : lignes non modifiables' using errcode = '42501';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

-- Ordre d'execution (alphabetique) : la garde (a_) avant les totaux (b_).
drop trigger if exists a_eau_elec_facture_garde on public.eau_elec_factures;
create trigger a_eau_elec_facture_garde before update or delete on public.eau_elec_factures
  for each row execute function public.eau_elec_facture_garde();
drop trigger if exists b_eau_elec_facture_totaux on public.eau_elec_factures;
create trigger b_eau_elec_facture_totaux before insert or update on public.eau_elec_factures
  for each row execute function public.eau_elec_facture_totaux();
drop trigger if exists c_eau_elec_facture_prix_lignes on public.eau_elec_factures;
create trigger c_eau_elec_facture_prix_lignes after update on public.eau_elec_factures
  for each row execute function public.eau_elec_facture_prix_lignes();

drop trigger if exists a_eau_elec_ligne_garde on public.eau_elec_facture_lignes;
create trigger a_eau_elec_ligne_garde before insert or update or delete on public.eau_elec_facture_lignes
  for each row execute function public.eau_elec_ligne_garde();
drop trigger if exists b_eau_elec_ligne_calcul on public.eau_elec_facture_lignes;
create trigger b_eau_elec_ligne_calcul before insert or update on public.eau_elec_facture_lignes
  for each row execute function public.eau_elec_ligne_calcul();
drop trigger if exists c_eau_elec_ligne_touche_facture on public.eau_elec_facture_lignes;
create trigger c_eau_elec_ligne_touche_facture after insert or update or delete on public.eau_elec_facture_lignes
  for each row execute function public.eau_elec_ligne_touche_facture();

-- Les fonctions de declencheur ne s'appellent pas directement.
revoke execute on function public.eau_elec_ligne_calcul() from public, anon, authenticated;
revoke execute on function public.eau_elec_facture_totaux() from public, anon, authenticated;
revoke execute on function public.eau_elec_ligne_touche_facture() from public, anon, authenticated;
revoke execute on function public.eau_elec_facture_prix_lignes() from public, anon, authenticated;
revoke execute on function public.eau_elec_facture_garde() from public, anon, authenticated;
revoke execute on function public.eau_elec_ligne_garde() from public, anon, authenticated;

-- ───────────────────────────── 2.8 Fonctions serveur ─────────────────────────────
-- Jour de Madagascar (memento §24).
create or replace function public.eau_elec_jour_mg()
returns date language sql stable set search_path = public as $$
  select (now() at time zone 'Indian/Antananarivo')::date;
$$;

-- REGLE UNIQUE de la numerotation annuelle (a confirmer par RTB avant decembre) :
-- une annee de consommation plus recente que celle du compteur repart a 1.
create or replace function public.eau_elec_sequence(p_annee_cycle int, p_annee_compteur int, p_prochain int)
returns table (annee int, seq int) language sql immutable set search_path = public as $$
  select case when p_annee_cycle > p_annee_compteur then p_annee_cycle else p_annee_compteur end,
         case when p_annee_cycle > p_annee_compteur then 1 else p_prochain end;
$$;

create or replace function public.eau_elec_format_numero(p_cycle text, p_seq int)
returns text language sql immutable set search_path = public as $$
  select 'FAC-' || p_cycle || '-' || lpad(p_seq::text, greatest(3, length(p_seq::text)), '0');
$$;

create or replace function public.eau_elec_emettre_facture(p_id text)
returns text language plpgsql security definer set search_path = public as $$
declare
  f eau_elec_factures%rowtype;
  r eau_elec_reglages%rowtype;
  c eau_elec_clients%rowtype;
  v_annee_cycle int;
  v_annee int;
  v_seq int;
  v_numero text;
  v_jour date := eau_elec_jour_mg();
  v_ok int;
begin
  if not eau_has_gestion_elec() then
    raise exception 'Emission reservee a la gestion' using errcode = '42501';
  end if;
  select * into f from eau_elec_factures where id = p_id for update;
  if not found then raise exception 'Facture introuvable' using errcode = 'P0002'; end if;
  -- Rejeu : une facture deja emise garde son numero, rien n'avance.
  if f.numero is not null then return f.numero; end if;
  if f.statut <> 'brouillon' then raise exception 'Facture non brouillon' using errcode = '22023'; end if;
  if f.en_attente_releve then raise exception 'Facture en attente de releve' using errcode = '22023'; end if;
  select count(*) into v_ok from eau_elec_facture_lignes where facture_id = p_id and kwh is not null;
  if v_ok = 0 then raise exception 'Facture sans ligne' using errcode = '22023'; end if;

  select * into r from eau_elec_reglages where id = 'rtb' for update;
  select * into c from eau_elec_clients where id = f.client_id;
  v_annee_cycle := split_part(f.cycle, '-', 1)::int;
  if r.mode_essai then
    select s.annee, s.seq into v_annee, v_seq
      from eau_elec_sequence(v_annee_cycle, r.numero_essai_annee, r.numero_essai_prochain) s;
  else
    select s.annee, s.seq into v_annee, v_seq
      from eau_elec_sequence(v_annee_cycle, r.numero_annee, r.numero_prochain) s;
  end if;
  if v_annee_cycle < v_annee then
    raise exception 'Annee de consommation % anterieure au compteur (%)', v_annee_cycle, v_annee using errcode = '22023';
  end if;
  v_numero := eau_elec_format_numero(f.cycle, v_seq);

  update eau_elec_factures set
    statut = 'emise',
    essai = r.mode_essai,
    numero = v_numero,
    numero_seq = v_seq,
    date_emission = v_jour,
    date_echeance = v_jour + r.echeance_jours,
    tarif_kwh = r.tarif_kwh,
    forfait_ht = r.forfait_ht,
    tva_pct = r.tva_pct,
    client_snapshot = jsonb_build_object(
      'code', c.code, 'nom', c.nom, 'raison_sociale', c.raison_sociale, 'adresse', c.adresse,
      'nif', c.nif, 'stat', c.stat, 'email', c.email, 'telephone', c.telephone),
    emetteur_snapshot = jsonb_build_object(
      'raison_sociale', r.raison_sociale, 'forme_juridique', r.forme_juridique, 'siege', r.siege,
      'nif', r.nif, 'stat', r.stat, 'rcs', r.rcs, 'telephone', r.telephone, 'email', r.email,
      'banque', r.banque, 'titulaire_compte', r.titulaire_compte, 'iban', r.iban, 'bic', r.bic,
      'site', r.site, 'puissance_kwc', r.puissance_kwc, 'contrat_ref', r.contrat_ref, 'devise', r.devise,
      'echeance_jours', r.echeance_jours),
    validation_date_limite = null,
    updated_at = now()
  where id = p_id;

  if r.mode_essai then
    update eau_elec_reglages set numero_essai_annee = v_annee, numero_essai_prochain = v_seq + 1, updated_at = now()
     where id = 'rtb';
  else
    update eau_elec_reglages set numero_annee = v_annee, numero_prochain = v_seq + 1, updated_at = now()
     where id = 'rtb';
  end if;
  return v_numero;
end;
$$;

-- Ordre documente : code client, puis bien (facture groupee, sans bien, en premier), puis id.
create or replace function public.eau_elec_emettre_cycle(p_cycle text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_res jsonb := '[]'::jsonb;
  v_id text;
  v_num text;
begin
  if not eau_has_gestion_elec() then
    raise exception 'Emission reservee a la gestion' using errcode = '42501';
  end if;
  for v_id in
    select f.id from eau_elec_factures f join eau_elec_clients c on c.id = f.client_id
     where f.cycle = p_cycle and f.statut = 'brouillon' and not f.en_attente_releve
       and exists (select 1 from eau_elec_facture_lignes l where l.facture_id = f.id and l.kwh is not null)
     order by c.code, f.bien nulls first, f.id
  loop
    v_num := eau_elec_emettre_facture(v_id);
    v_res := v_res || jsonb_build_object('id', v_id, 'numero', v_num);
  end loop;
  return v_res;
end;
$$;

-- Re-datation apres correction d'un releve : meme numero, date du jour, echeance suivante,
-- avis effaces. p_lignes (facultatif) remplace les lignes par celles recalculees.
create or replace function public.eau_elec_redater_facture(p_id text, p_lignes jsonb default null)
returns date language plpgsql security definer set search_path = public as $$
declare
  f eau_elec_factures%rowtype;
  v_jour date := eau_elec_jour_mg();
  v_ech int;
  l jsonb;
begin
  if not eau_has_gestion_elec() then
    raise exception 'Re-datation reservee a la gestion' using errcode = '42501';
  end if;
  select * into f from eau_elec_factures where id = p_id for update;
  if not found then raise exception 'Facture introuvable' using errcode = 'P0002'; end if;
  if f.statut not in ('emise','a_valider','validee') then
    raise exception 'Facture % : re-datation impossible (statut %)', coalesce(f.numero, f.id), f.statut using errcode = '22023';
  end if;
  if p_lignes is not null then
    if jsonb_typeof(p_lignes) <> 'array' or jsonb_array_length(p_lignes) = 0 then
      raise exception 'Lignes invalides' using errcode = '22023';
    end if;
    delete from eau_elec_facture_lignes where facture_id = p_id;
    for l in select * from jsonb_array_elements(p_lignes) loop
      insert into eau_elec_facture_lignes
        (id, facture_id, compteur_id, code_compteur, index_debut, date_index_debut, index_fin,
         date_index_fin, releve_fin_id, ordre)
      values
        (l->>'id', p_id, l->>'compteur_id', l->>'code_compteur', (l->>'index_debut')::numeric,
         (l->>'date_index_debut')::timestamptz, (l->>'index_fin')::numeric,
         (l->>'date_index_fin')::timestamptz, l->>'releve_fin_id', (l->>'ordre')::int);
    end loop;
  end if;
  select echeance_jours into v_ech from eau_elec_reglages where id = 'rtb';
  delete from eau_elec_validations where facture_id = p_id;
  update eau_elec_factures set
    date_emission = v_jour,
    date_echeance = v_jour + coalesce(v_ech, 15),
    statut = case when f.statut = 'validee' then 'emise' else f.statut end,
    updated_at = now()
  where id = p_id;
  return v_jour;
end;
$$;

create or replace function public.eau_elec_soumettre_cycle(p_cycle text, p_date_limite date)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_n int;
begin
  if not eau_has_gestion_elec() then
    raise exception 'Soumission reservee a la gestion' using errcode = '42501';
  end if;
  if p_date_limite is null or p_date_limite < eau_elec_jour_mg() then
    raise exception 'Date limite passee' using errcode = '22023';
  end if;
  update eau_elec_factures set statut = 'a_valider', validation_date_limite = p_date_limite, updated_at = now()
   where cycle = p_cycle and statut = 'emise';
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

create or replace function public.eau_elec_donner_avis(p_facture text, p_avis text, p_texte text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid text := auth.uid()::text;
  v_statut text;
begin
  if v_uid is null or not eau_is_validation_elec() then
    raise exception 'Avis reserve aux valideurs' using errcode = '42501';
  end if;
  if p_avis not in ('bon','remarque') then raise exception 'Avis inconnu' using errcode = '22023'; end if;
  if p_avis = 'remarque' and coalesce(btrim(p_texte), '') = '' then
    raise exception 'Une remarque exige un texte' using errcode = '22023';
  end if;
  select statut into v_statut from eau_elec_factures where id = p_facture for update;
  if v_statut is distinct from 'a_valider' then
    raise exception 'Facture non soumise a validation' using errcode = '22023';
  end if;
  insert into eau_elec_validations (id, facture_id, user_id, avis, texte, reponse, levee)
  values (p_facture || ':' || v_uid, p_facture, v_uid, p_avis,
          case when p_avis = 'remarque' then btrim(p_texte) else null end, null, false)
  on conflict (facture_id, user_id) do update
    set avis = excluded.avis, texte = excluded.texte, reponse = null, levee = false, updated_at = now();
end;
$$;

-- Reponse de la gestion a une remarque : la remarque est levee.
create or replace function public.eau_elec_repondre_remarque(p_validation text, p_reponse text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not eau_has_gestion_elec() then
    raise exception 'Reponse reservee a la gestion' using errcode = '42501';
  end if;
  if coalesce(btrim(p_reponse), '') = '' then raise exception 'Reponse vide' using errcode = '22023'; end if;
  update eau_elec_validations set reponse = btrim(p_reponse), levee = true, updated_at = now()
   where id = p_validation and avis = 'remarque';
  if not found then raise exception 'Remarque introuvable' using errcode = 'P0002'; end if;
end;
$$;

create or replace function public.eau_elec_clore_validation(p_cycle text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  f record;
  v_jour date := eau_elec_jour_mg();
  v_nb_valideurs int;
  v_bons int;
  v_remarques int;
  v_validees int := 0;
  v_bloquees jsonb := '[]'::jsonb;
begin
  if not eau_has_gestion_elec() then
    raise exception 'Cloture reservee a la gestion' using errcode = '42501';
  end if;
  select count(*) into v_nb_valideurs from eau_roles where validation_elec;
  for f in select * from eau_elec_factures where cycle = p_cycle and statut = 'a_valider' order by numero_seq for update loop
    select count(*) filter (where avis = 'remarque' and not levee),
           count(*) filter (where avis = 'bon' and user_id in (select user_id from eau_roles where validation_elec))
      into v_remarques, v_bons
      from eau_elec_validations where facture_id = f.id;
    if v_remarques > 0 then
      v_bloquees := v_bloquees || jsonb_build_object('id', f.id, 'numero', f.numero, 'raison', 'remarque');
    elsif (f.validation_date_limite is not null and v_jour > f.validation_date_limite)
          or (v_nb_valideurs > 0 and v_bons >= v_nb_valideurs) then
      update eau_elec_factures set statut = 'validee', updated_at = now() where id = f.id;
      v_validees := v_validees + 1;
    else
      v_bloquees := v_bloquees || jsonb_build_object('id', f.id, 'numero', f.numero, 'raison', 'attente');
    end if;
  end loop;
  return jsonb_build_object('validees', v_validees, 'bloquees', v_bloquees);
end;
$$;

-- Envoi fait hors de l'app : seule la date est enregistree. p_sans_validation = l'ecran a
-- demande une confirmation explicite pour une facture emise jamais validee.
create or replace function public.eau_elec_marquer_envoyee(p_id text, p_date date, p_sans_validation boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare
  f eau_elec_factures%rowtype;
begin
  if not eau_has_gestion_elec() then
    raise exception 'Envoi reserve a la gestion' using errcode = '42501';
  end if;
  select * into f from eau_elec_factures where id = p_id for update;
  if not found then raise exception 'Facture introuvable' using errcode = 'P0002'; end if;
  if not (f.statut = 'validee' or (f.statut = 'emise' and p_sans_validation)) then
    raise exception 'Facture % : envoi impossible (statut %)', coalesce(f.numero, f.id), f.statut using errcode = '22023';
  end if;
  if p_date is null or p_date > eau_elec_jour_mg() then
    raise exception 'Date d''envoi future' using errcode = '22023';
  end if;
  if f.date_emission is not null and p_date < f.date_emission then
    raise exception 'Date d''envoi avant l''emission' using errcode = '22023';
  end if;
  update eau_elec_factures set statut = 'envoyee', date_envoi = p_date, updated_at = now() where id = p_id;
end;
$$;

-- Efface les factures d'essai NON envoyees d'un cycle ; remet le compteur d'essai a la plus
-- petite valeur effacee si elles etaient les dernieres attribuees (sinon le laisse et le dit).
create or replace function public.eau_elec_effacer_essai(p_cycle text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_ids jsonb;
  v_min int;
  v_annee int;
  v_reste int;
  r eau_elec_reglages%rowtype;
  v_remis boolean := false;
begin
  if not eau_has_gestion_elec() then
    raise exception 'Effacement reserve a la gestion' using errcode = '42501';
  end if;
  select * into r from eau_elec_reglages where id = 'rtb' for update;
  select coalesce(jsonb_agg(id), '[]'::jsonb), min(numero_seq) into v_ids, v_min
    from eau_elec_factures
   where cycle = p_cycle and essai and statut not in ('envoyee','payee','abandonnee');
  v_annee := split_part(p_cycle, '-', 1)::int;
  delete from eau_elec_factures
   where cycle = p_cycle and essai and statut not in ('envoyee','payee','abandonnee');
  if v_min is not null and v_annee = r.numero_essai_annee then
    select count(*) into v_reste from eau_elec_factures
     where essai and numero_seq >= v_min and split_part(cycle, '-', 1)::int = v_annee;
    if v_reste = 0 then
      update eau_elec_reglages set numero_essai_prochain = v_min, updated_at = now() where id = 'rtb';
      v_remis := true;
    end if;
  end if;
  return jsonb_build_object('effacees', v_ids, 'compteur_remis', v_remis,
    'prochain_essai', (select numero_essai_prochain from eau_elec_reglages where id = 'rtb'));
end;
$$;

revoke execute on function public.eau_elec_jour_mg() from public, anon;
revoke execute on function public.eau_elec_sequence(int, int, int) from public, anon;
revoke execute on function public.eau_elec_format_numero(text, int) from public, anon;
revoke execute on function public.eau_elec_emettre_facture(text) from public, anon;
revoke execute on function public.eau_elec_emettre_cycle(text) from public, anon;
revoke execute on function public.eau_elec_redater_facture(text, jsonb) from public, anon;
revoke execute on function public.eau_elec_soumettre_cycle(text, date) from public, anon;
revoke execute on function public.eau_elec_donner_avis(text, text, text) from public, anon;
revoke execute on function public.eau_elec_repondre_remarque(text, text) from public, anon;
revoke execute on function public.eau_elec_clore_validation(text) from public, anon;
revoke execute on function public.eau_elec_marquer_envoyee(text, date, boolean) from public, anon;
revoke execute on function public.eau_elec_effacer_essai(text) from public, anon;
grant execute on function public.eau_elec_jour_mg() to authenticated;
grant execute on function public.eau_elec_sequence(int, int, int) to authenticated;
grant execute on function public.eau_elec_format_numero(text, int) to authenticated;
grant execute on function public.eau_elec_emettre_facture(text) to authenticated;
grant execute on function public.eau_elec_emettre_cycle(text) to authenticated;
grant execute on function public.eau_elec_redater_facture(text, jsonb) to authenticated;
grant execute on function public.eau_elec_soumettre_cycle(text, date) to authenticated;
grant execute on function public.eau_elec_donner_avis(text, text, text) to authenticated;
grant execute on function public.eau_elec_repondre_remarque(text, text) to authenticated;
grant execute on function public.eau_elec_clore_validation(text) to authenticated;
grant execute on function public.eau_elec_marquer_envoyee(text, date, boolean) to authenticated;
grant execute on function public.eau_elec_effacer_essai(text) to authenticated;

-- Un compteur de numeros ne redescend jamais sous un numero deja attribue dans son annee
-- (formulaire de reglages ouvert avant une emission, rejeu d'un vieil envoi) : il est
-- remonte au numero suivant le plus grand attribue. Aucun doublon, aucun retour en arriere.
create or replace function public.eau_elec_reglages_garde_compteurs()
returns trigger language plpgsql set search_path = public as $$
declare
  v_max int;
begin
  select max(numero_seq) into v_max from eau_elec_factures
   where numero is not null and not essai and split_part(cycle, '-', 1)::int = new.numero_annee;
  if v_max is not null and new.numero_prochain <= v_max then
    new.numero_prochain := v_max + 1;
  end if;
  select max(numero_seq) into v_max from eau_elec_factures
   where numero is not null and essai and split_part(cycle, '-', 1)::int = new.numero_essai_annee;
  if v_max is not null and new.numero_essai_prochain <= v_max then
    new.numero_essai_prochain := v_max + 1;
  end if;
  return new;
end;
$$;
drop trigger if exists a_eau_elec_reglages_garde_compteurs on public.eau_elec_reglages;
create trigger a_eau_elec_reglages_garde_compteurs before insert or update on public.eau_elec_reglages
  for each row execute function public.eau_elec_reglages_garde_compteurs();
revoke execute on function public.eau_elec_reglages_garde_compteurs() from public, anon, authenticated;

-- ───────────────────────────── 2.9 RLS et politiques ─────────────────────────────
alter table public.eau_elec_factures enable row level security;
alter table public.eau_elec_factures force row level security;
alter table public.eau_elec_facture_lignes enable row level security;
alter table public.eau_elec_facture_lignes force row level security;
alter table public.eau_elec_validations enable row level security;
alter table public.eau_elec_validations force row level security;

revoke all on public.eau_elec_factures from anon, public, authenticated;
revoke all on public.eau_elec_facture_lignes from anon, public, authenticated;
revoke all on public.eau_elec_validations from anon, public, authenticated;
grant select, insert, update, delete on public.eau_elec_factures to authenticated;
grant select, insert, update, delete on public.eau_elec_facture_lignes to authenticated;
grant select on public.eau_elec_validations to authenticated;

-- Factures : lecture domaine (valideurs compris) ; la gestion n'ecrit que des brouillons,
-- sans numero, ni essai, ni date d'emission (ces champs sont poses par les fonctions).
drop policy if exists eau_elec_factures_sel on public.eau_elec_factures;
drop policy if exists eau_elec_factures_ins on public.eau_elec_factures;
drop policy if exists eau_elec_factures_upd on public.eau_elec_factures;
drop policy if exists eau_elec_factures_del on public.eau_elec_factures;
create policy eau_elec_factures_sel on public.eau_elec_factures for select to public
  using (eau_has_lecture_elec());
create policy eau_elec_factures_ins on public.eau_elec_factures for insert to public
  with check (eau_has_gestion_elec() and statut = 'brouillon' and numero is null and numero_seq is null
              and not essai and date_emission is null and date_envoi is null);
create policy eau_elec_factures_upd on public.eau_elec_factures for update to public
  using (eau_has_gestion_elec() and statut = 'brouillon')
  with check (eau_has_gestion_elec() and statut = 'brouillon' and numero is null and numero_seq is null
              and not essai and date_emission is null and date_envoi is null);
create policy eau_elec_factures_del on public.eau_elec_factures for delete to public
  using (eau_has_gestion_elec() and statut = 'brouillon');

drop policy if exists eau_elec_facture_lignes_sel on public.eau_elec_facture_lignes;
drop policy if exists eau_elec_facture_lignes_ins on public.eau_elec_facture_lignes;
drop policy if exists eau_elec_facture_lignes_upd on public.eau_elec_facture_lignes;
drop policy if exists eau_elec_facture_lignes_del on public.eau_elec_facture_lignes;
create policy eau_elec_facture_lignes_sel on public.eau_elec_facture_lignes for select to public
  using (eau_has_lecture_elec());
create policy eau_elec_facture_lignes_ins on public.eau_elec_facture_lignes for insert to public
  with check (eau_has_gestion_elec() and exists (
    select 1 from public.eau_elec_factures f where f.id = facture_id and f.statut = 'brouillon'));
create policy eau_elec_facture_lignes_upd on public.eau_elec_facture_lignes for update to public
  using (eau_has_gestion_elec() and exists (
    select 1 from public.eau_elec_factures f where f.id = facture_id and f.statut = 'brouillon'))
  with check (eau_has_gestion_elec() and exists (
    select 1 from public.eau_elec_factures f where f.id = facture_id and f.statut = 'brouillon'));
create policy eau_elec_facture_lignes_del on public.eau_elec_facture_lignes for delete to public
  using (eau_has_gestion_elec() and exists (
    select 1 from public.eau_elec_factures f where f.id = facture_id and f.statut = 'brouillon'));

-- Avis : lecture domaine ; ecriture par les fonctions seulement (aucune politique d'ecriture).
drop policy if exists eau_elec_validations_sel on public.eau_elec_validations;
create policy eau_elec_validations_sel on public.eau_elec_validations for select to public
  using (eau_has_lecture_elec());

-- ───────────────────── Invitations : role validation_elec ─────────────────────
-- Reprises de la definition de ELEC-CC-02 ; seul ajout : role_validation_elec.
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
     or v_inv.role_releveur_elec or v_inv.role_gestion_elec or v_inv.role_lecture_elec
     or v_inv.role_validation_elec then
    insert into eau_roles (user_id, admin, releveur, promoteur,
                           releveur_elec, gestion_elec, lecture_elec, validation_elec, updated_at)
    values (v_uid, v_inv.role_admin, v_inv.role_releveur, v_inv.role_promoteur,
            v_inv.role_releveur_elec, v_inv.role_gestion_elec, v_inv.role_lecture_elec,
            v_inv.role_validation_elec, now())
    on conflict (user_id) do update
      set admin = eau_roles.admin or excluded.admin,
          releveur = eau_roles.releveur or excluded.releveur,
          promoteur = eau_roles.promoteur or excluded.promoteur,
          releveur_elec = eau_roles.releveur_elec or excluded.releveur_elec,
          gestion_elec = eau_roles.gestion_elec or excluded.gestion_elec,
          lecture_elec = eau_roles.lecture_elec or excluded.lecture_elec,
          validation_elec = eau_roles.validation_elec or excluded.validation_elec,
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
     or v_inv.role_releveur_elec or v_inv.role_gestion_elec or v_inv.role_lecture_elec
     or v_inv.role_validation_elec then
    insert into eau_roles (user_id, admin, releveur, promoteur,
                           releveur_elec, gestion_elec, lecture_elec, validation_elec, updated_at)
    values (v_uid, v_inv.role_admin, v_inv.role_releveur, v_inv.role_promoteur,
            v_inv.role_releveur_elec, v_inv.role_gestion_elec, v_inv.role_lecture_elec,
            v_inv.role_validation_elec, now())
    on conflict (user_id) do update
      set admin = eau_roles.admin or excluded.admin,
          releveur = eau_roles.releveur or excluded.releveur,
          promoteur = eau_roles.promoteur or excluded.promoteur,
          releveur_elec = eau_roles.releveur_elec or excluded.releveur_elec,
          gestion_elec = eau_roles.gestion_elec or excluded.gestion_elec,
          lecture_elec = eau_roles.lecture_elec or excluded.lecture_elec,
          validation_elec = eau_roles.validation_elec or excluded.validation_elec,
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
