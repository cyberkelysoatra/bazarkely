-- ELEC-CC-04 (phase 2b) : cours BCM et contre-valeur en euros, facture sans abonnement,
-- contrat signe, identite obligatoire en mode officiel. Idempotent (rejouable).
-- Fonctions reprises des definitions de 20261102000100_elec_factures.sql (identiques en base
-- le 15/11/2026) ; seuls ajouts : ceux decrits ci-dessous.

-- ───────────────────────────── Colonnes ─────────────────────────────
alter table public.eau_elec_reglages  add column if not exists cours_bcm numeric(12,2);
alter table public.eau_elec_reglages  add column if not exists date_cours_bcm date;
alter table public.eau_elec_clients   add column if not exists contrat_signe boolean not null default false;
alter table public.eau_elec_compteurs add column if not exists sans_abonnement boolean not null default false;
alter table public.eau_elec_factures  add column if not exists avec_abonnement boolean not null default true;
alter table public.eau_elec_factures  add column if not exists cours_bcm numeric(12,2);
alter table public.eau_elec_factures  add column if not exists date_cours_bcm date;
alter table public.eau_elec_factures  add column if not exists contre_valeur_eur numeric(14,2);

-- ───────────────────────────── Totaux : contre-valeur en euros ─────────────────────────────
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
    new.contre_valeur_eur := null;
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
  new.contre_valeur_eur := case when new.cours_bcm is not null and new.cours_bcm > 0 and new.montant_ttc is not null
                                then round(new.montant_ttc / new.cours_bcm, 2) end;
  return new;
end;
$$;

-- ───────────────────────────── Garde : nouvelles colonnes figees apres envoi ─────────────────────────────
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
       or new.avec_abonnement is distinct from old.avec_abonnement
       or new.cours_bcm is distinct from old.cours_bcm
       or new.date_cours_bcm is distinct from old.date_cours_bcm
       or new.contre_valeur_eur is distinct from old.contre_valeur_eur
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

-- ───────────────────────────── Emission ─────────────────────────────
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
  -- Cours BCM obligatoire (cahier 5.5), jamais posterieur au jour d'edition.
  if r.cours_bcm is null or r.cours_bcm <= 0 or r.date_cours_bcm is null or r.date_cours_bcm > v_jour then
    raise exception 'Saisissez le cours de référence BCM dans les réglages' using errcode = '22023';
  end if;
  -- Mode officiel : identite et banque de RTB obligatoires (cahier 8, point 7).
  if not r.mode_essai and (coalesce(btrim(r.raison_sociale), '') = '' or coalesce(btrim(r.nif), '') = ''
       or coalesce(btrim(r.stat), '') = '' or coalesce(btrim(r.iban), '') = ''
       or coalesce(btrim(r.banque), '') = '') then
    raise exception 'Complétez l''identité et la banque de RTB dans les réglages' using errcode = '22023';
  end if;
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
    forfait_ht = case when f.avec_abonnement then r.forfait_ht else 0 end,
    tva_pct = r.tva_pct,
    cours_bcm = r.cours_bcm,
    date_cours_bcm = r.date_cours_bcm,
    client_snapshot = jsonb_build_object(
      'code', c.code, 'nom', c.nom, 'raison_sociale', c.raison_sociale, 'adresse', c.adresse,
      'nif', c.nif, 'stat', c.stat, 'email', c.email, 'telephone', c.telephone,
      'contrat_signe', c.contrat_signe),
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

-- ───────────────────────────── Re-datation : cours BCM courant ─────────────────────────────
create or replace function public.eau_elec_redater_facture(p_id text, p_lignes jsonb default null)
returns date language plpgsql security definer set search_path = public as $$
declare
  f eau_elec_factures%rowtype;
  r eau_elec_reglages%rowtype;
  v_jour date := eau_elec_jour_mg();
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
  select * into r from eau_elec_reglages where id = 'rtb';
  if r.cours_bcm is null or r.cours_bcm <= 0 or r.date_cours_bcm is null or r.date_cours_bcm > v_jour then
    raise exception 'Saisissez le cours de référence BCM dans les réglages' using errcode = '22023';
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
  delete from eau_elec_validations where facture_id = p_id;
  update eau_elec_factures set
    date_emission = v_jour,
    date_echeance = v_jour + coalesce(r.echeance_jours, 15),
    cours_bcm = r.cours_bcm,
    date_cours_bcm = r.date_cours_bcm,
    statut = case when f.statut = 'validee' then 'emise' else f.statut end,
    updated_at = now()
  where id = p_id;
  return v_jour;
end;
$$;

revoke execute on function public.eau_elec_facture_totaux() from public, anon, authenticated;
revoke execute on function public.eau_elec_facture_garde() from public, anon, authenticated;
revoke execute on function public.eau_elec_emettre_facture(text) from public, anon;
revoke execute on function public.eau_elec_redater_facture(text, jsonb) from public, anon;
grant execute on function public.eau_elec_emettre_facture(text) to authenticated;
grant execute on function public.eau_elec_redater_facture(text, jsonb) to authenticated;
