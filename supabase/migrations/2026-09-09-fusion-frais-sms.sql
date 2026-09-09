-- =====================================================================
-- Fusion des lignes de frais SMS dans leur transaction principale
-- Phase 2 bis — v3.76.0 — 2026-09-09
-- =====================================================================
--
-- CONTEXTE
-- La v3.75.0 ecrivait DEUX transactions pour une operation Mobile Money avec
-- frais : le mouvement principal, et une ligne « Frais - ... » distincte.
-- La liste des transactions affichait donc deux lignes pour une seule
-- operation reelle. La v3.76.0 n'en ecrit plus qu'une, dont le montant inclut
-- les frais, le detail etant loge dans `transactions.transfer_fee`.
--
-- Ce script rattrape les 23 lignes de frais deja ecrites par la v3.75.0.
--
-- INVARIANT A VERIFIER : le total des transactions du compte doit etre
-- RIGOUREUSEMENT identique avant et apres. Il l'est par construction — la
-- ligne de frais porte un montant negatif `f.amount`, que l'etape 2 ajoute au
-- principal avant que l'etape 3 ne la supprime : le total perd et regagne
-- exactement la meme valeur. Si l'ecart n'est PAS nul, ANNULER et signaler.
--
-- IDEMPOTENT : une fois la ligne de frais supprimee et `transfer_fee`
-- renseignee, la jointure ne trouve plus aucune paire. Rejouable a volonte.
--
-- A EXECUTER dans l'ordre : etape 1 (lecture seule), puis 2 et 3, puis 4.
-- =====================================================================


-- ---------------------------------------------------------------------
-- ETAPE 1 — APERCU EN LECTURE SEULE. N'ecrit rien.
-- Releve l'utilisateur, le nombre de transactions, le TOTAL AVANT, le nombre
-- de paires a fusionner et la somme des frais concernes.
-- ---------------------------------------------------------------------
with u as (
  select user_id
  from public.transactions
  where notes like 'SMS %'
  group by user_id
  order by count(*) desc
  limit 1
), paires as (
  select p.id as id_principal, f.id as id_frais, f.amount as montant_frais
  from public.transactions p
  join public.transactions f
    on f.user_id = p.user_id
   and f.notes = p.notes
   and f.description like 'Frais - %'
  where p.user_id = (select user_id from u)
    and p.notes like 'SMS %'
    and p.description not like 'Frais - %'
    and coalesce(p.transfer_fee, 0) = 0
)
select
  (select user_id::text from u)
  || ' | transactions=' || (select count(*) from public.transactions where user_id = (select user_id from u))::text
  || ' | total_avant=' || (select coalesce(sum(amount), 0) from public.transactions where user_id = (select user_id from u))::text
  || ' | paires=' || (select count(*) from paires)::text
  || ' | somme_frais=' || (select coalesce(sum(montant_frais), 0) from paires)::text
  as recap;


-- ---------------------------------------------------------------------
-- ETAPE 2 — Report des frais dans la transaction principale.
-- `f.amount` est NEGATIF (une ligne de frais est une depense) : l'additionner
-- au principal, lui aussi negatif, donne bien le total debite.
-- ---------------------------------------------------------------------
update public.transactions t
   set amount = t.amount + f.amount,
       transfer_fee = abs(f.amount)
  from public.transactions f
 where f.user_id = t.user_id
   and f.notes = t.notes
   and f.description like 'Frais - %'
   and t.notes like 'SMS %'
   and t.description not like 'Frais - %'
   and coalesce(t.transfer_fee, 0) = 0;


-- ---------------------------------------------------------------------
-- ETAPE 3 — Suppression des lignes de frais desormais fusionnees.
-- Ne supprime QUE celles dont le principal porte deja ses frais (etape 2
-- passee) : une etape 2 qui n'aurait pas abouti ne peut pas faire perdre
-- d'argent au compte.
-- ---------------------------------------------------------------------
delete from public.transactions f
 where f.notes like 'SMS %'
   and f.description like 'Frais - %'
   and exists (
     select 1
     from public.transactions p
     where p.user_id = f.user_id
       and p.notes = f.notes
       and p.description not like 'Frais - %'
       and p.transfer_fee = abs(f.amount)
   );


-- ---------------------------------------------------------------------
-- ETAPE 4 — CONTROLE. `paires` doit valoir 0 et `total_apres` doit etre
-- RIGOUREUSEMENT egal au `total_avant` releve a l'etape 1.
-- ---------------------------------------------------------------------
with u as (
  select user_id
  from public.transactions
  where notes like 'SMS %'
  group by user_id
  order by count(*) desc
  limit 1
), paires as (
  select p.id
  from public.transactions p
  join public.transactions f
    on f.user_id = p.user_id
   and f.notes = p.notes
   and f.description like 'Frais - %'
  where p.user_id = (select user_id from u)
    and p.notes like 'SMS %'
    and p.description not like 'Frais - %'
)
select
  'transactions=' || (select count(*) from public.transactions where user_id = (select user_id from u))::text
  || ' | total_apres=' || (select coalesce(sum(amount), 0) from public.transactions where user_id = (select user_id from u))::text
  || ' | paires_restantes=' || (select count(*) from paires)::text
  || ' | lignes_frais_restantes=' || (select count(*) from public.transactions
                                      where user_id = (select user_id from u)
                                        and notes like 'SMS %'
                                        and description like 'Frais - %')::text
  || ' | principales_avec_frais=' || (select count(*) from public.transactions
                                      where user_id = (select user_id from u)
                                        and notes like 'SMS %'
                                        and coalesce(transfer_fee, 0) > 0)::text
  as controle;
