# NAVY ay — Rapport de la phase 2A : le circuit du colis par les épiceries

**Versions livrées :** v3.84.0 (`22737de`, le chantier) → v3.84.1 (`2528b69`, correctif) → v3.84.2 (`9b460b8`, finitions) — branche `cloudflare-migration` — en ligne sur 1sakely.org le 2026-09-26 (bundle final `index-BD5ohCke.js`, 13:25).

## Horaires et déroulé

| | |
|---|---|
| Début | 2026-09-26 02:15 |
| Interruption | vers 02:32, juste après l'écriture de la migration SQL (session coupée, reprise par « Réessayer ») |
| Reprise | vers 12:15 |
| Fin | 2026-09-26 13:45 |
| Durée active | environ 1 h 45 (17 min + 1 h 30) |
| Reprises | 1 (voir ci-dessus) ; rien n'était perdu : le fichier SQL était écrit, rien n'était encore appliqué |
| Fenêtre de contexte | non saturée |

**Itérations et erreurs marquantes**
1. **Serveur local.** Le port 3000 était pris par un ancien serveur d'une autre session (laissé en place). `npm run dev` a donc tourné sur le **port 3002**. Comme lors de la 1B, le Chrome de JOEL n'a **pas de session sur localhost** : toute la validation de bout en bout a été faite **en production** avec sa vraie session.
2. **Relecture du SQL avant application.** J'ai corrigé un défaut dans `navy_dispatch` : une variable « record » lue avant d'être remplie aurait planté quand le chauffeur choisi n'est plus disponible. J'ai ensuite joué un **parcours complet en transaction annulée**, avec des comptes simulés, avant toute donnée réelle.
3. **Revue de sécurité** (`/security-review`), une faille réelle (confiance 9/10), corrigée **avant** le déploiement :
   - `users.phone` (et même `users.created_at`) est modifiable par le compte lui-même. De même, n'importe qui peut créer une fiche partenaire « en attente » avec n'importe quel numéro.
   - Si le destinataire avait été rattaché par ces numéros, un compte aurait pu se déclarer destinataire du colis d'un autre, lire son code de retrait et le retirer.
   - **Correctif** : le destinataire n'est rattaché **que** par le téléphone d'une fiche partenaire **validée** par l'opératrice. Cette identité est vérifiée, et le numéro est figé après validation.
4. **Trois défauts vus seulement en production**, corrigés par deux commits (voir « Écarts ») :
   - **Compte à rebours faux** : l'horloge du téléphone avait quelques secondes d'écart avec le serveur. L'offre affichait « 38 s », et l'acceptation était refusée pour retard.
   - **Gain de l'épicier faux** quand il est aussi l'expéditeur : l'écran affichait 2 200 Ar au lieu de 100 Ar.
   - **Petites finitions** : « hors zone » affiché sur le suivi, un ancien message qui restait sur une carte, le message de retrait réussi qui disparaissait trop vite.
5. **Outillage.**
   - Deux micro-coupures réseau ont déconnecté l'extension Chrome ; l'onglet de test a été refermé une fois.
   - Un bloc SQL de compte rendu a annulé des gestes que je voulais garder.
   - L'onglet caché a laissé l'application « hors ligne » après une coupure.
   - Ces trois pièges sont consignés en P19 à P21 de `PROCEDURES-OUTILS.md`.
6. **Contrôle de types** : 1942 erreurs avant et après, mesurées par la même méthode (`grep -c "error TS"`), aux trois versions. **Zéro erreur** dans `modules/navy-ay/`. La seule erreur de `BottomNav.tsx` est préexistante et identique. `npm run build` réussit aux trois versions. **46 tests unitaires NAVY sont verts**, dont 10 nouveaux dans `parcelRules.test.ts`.
7. **Passe Impeccable (polish)**, bornée par la charte : le détecteur ne signale aucun défaut. Les boutons d'action de l'écran Colis de l'opératrice ont été portés à 44 px.

## État des critères

**Méthode.**
- Les tests ont été faits en production dans le Chrome de JOEL (vraie session admin, aucun identifiant saisi).
- Pour les deux côtés « épicier », il fallait deux boutiques : JOEL n'a droit qu'à une fiche épicier (la vraie « Aly »). Aly a donc servi de boutique côté écran, puis a été remise dans son état d'origine.
- Les épiceries TEST A et TEST B et le « TEST Chauffeur Rapide » appartiennent à des comptes de test créés pour l'occasion. Leurs gestes ont été joués **au serveur en leur nom**, par les mêmes fonctions que l'application.
- Le « TEST Chauffeur JOEL » appartenait à JOEL et a été piloté à l'écran.

| Critère | État | Preuve |
|---|---|---|
| **E1** SQL rejouable, tests négatifs | ✅ | Migration appliquée, puis **rejouée entière** sans erreur. Après rejeu : 62 fonctions `navy_*`, **aucune surcharge en double**, 22 règles et droits de tables à l'empreinte md5 identique avant et après, 1 seule tâche `navy-tick`, 21 index. Tests négatifs : tableau suivant |
| **E2** Prix | ✅ prod | Écran « Envoyer », tarifs TEST 100 / 100, 7,0 km, grille 1 000 Ar par 5 km, part 300 : **AjojoMIVOATRA 114 Ar · Transport 2 273 Ar · TEST Épicerie B 113 Ar · Total 2 500 Ar**. Un cas avec arrondi est testé en unitaire : 1 650 → **1 700**, dont 50 Ar vont à CyberKELY. L'épicier voit « Vous gagnez 100 Ar · votre tarif 100 Ar + part NAVY 14 Ar ». Le chauffeur ne voit que « Vous gagnez 1 600 Ar » (offre, courses) |
| **E3** Colis espèces, mode Automatique | ✅ prod | Colis **4683** : commande à l'écran, dépôt chez Aly à l'écran (« refermé devant moi », « espèces encaissées : 2 500 Ar »), offre, remise, confirmation, arrivée, retrait. Repères **Accepté 13:02 / En route 13:03 / Livré 13:04**. Le journal horodaté est complet (27 étapes, dont offres, relances, codes faux, déblocage) |
| **E4** Colis Orange Money, mode Je choisis | ✅ prod | Colis **3892** : numéro Orange Money fictif saisi dans Réglages à l'écran, liste des chauffeurs éligibles (nom, véhicule, zone, prix), choix de « TEST Chauffeur JOEL » (1 600 Ar), référence `TEST-OM-0001`. Déposé avant validation : **0 offre**. Validation dans « Paiements » à 10:08:55 UTC, et **première offre à la même seconde**, au chauffeur **choisi** et non au moins cher. **Avoir de 400 Ar** enregistré (plafond 2 000 − 1 600) |
| **E5** 30 s, 5 min, 30 min | ✅ prod (réel + simulé) | **En réel** : offre au moins cher à 12:52:25, expirée, puis au suivant à 12:53:05. **Relance automatique à 5 min** : tour 2 à 12:57:26. Relance manuelle par l'opératrice à l'écran. **Simulé** : lancement de la recherche reculé de 31 min → `navy_tick` → alerte « aucun chauffeur depuis 30 min », envoyée à l'opératrice (HTTP 200) |
| **E6** Double confirmation | ✅ prod | Le chauffeur seul : refusé (`the grocer must hand the parcel over first`). L'épicier seul : le colis reste « Chauffeur trouvé ». Les deux : « En route ». Un mauvais chauffeur désigné par l'épicier est refusé (test en transaction annulée) |
| **E7** Code de retrait | ✅ prod | Colis 4683 : 5 codes faux (« encore 4, 3, 2, 1 essais »), puis blocage ; le bon code est alors refusé aussi. L'alerte « Code de retrait bloqué » apparaît en tête de l'écran opératrice, qui le débloque ; le bon code passe ensuite. Colis 3892, à l'écran : « Code faux. Encore 4 essais. », puis retrait. **Le code n'apparaît nulle part** sur l'écran épicier (texte de la page vérifié). L'épicier, le chauffeur et même l'opératrice lisent **0 ligne** de `navy_parcel_secrets` |
| **E8** Non retiré | ✅ simulé | Colis 8163, arrivée reculée : 25 h → **rappel 24 h** ; 73 h → **alerte 3 jours** ; « retour à organiser » **refusé avant 7 jours** ; 7 j + 1 h → alerte « Non retiré depuis 7 jours » en tête de l'écran opératrice → bouton « Retour à organiser » : marqué |
| **E9** Notifications | ✅ serveur / ⏳ à confirmer par JOEL | 38 notifications, **toutes acceptées** (HTTP 200), dont **32 remises** à l'abonnement de JOEL (les autres visaient des comptes de test sans abonnement). **Aucune** ne contient de montant ni de code de retrait (vérifié en SQL). Titres : « Colis 4683 : à recevoir au dépôt », « … : chauffeur trouvé », « … : pris en charge », « Nouvelle course NAVY : 30 secondes pour accepter », etc. **Constat visuel demandé à JOEL** (voir la liste de contrôle, point 1) |
| **E10** Hors ligne | ✅ simulé | **Commande** préparée hors ligne (coupure simulée) : « Commande gardée sur ce téléphone », file `create:55b5d906…`. Au retour du réseau : envoyée, **1 seule ligne** au serveur avec **le même identifiant** (code 9148). **« J'ai le colis »** hors ligne : gardé, puis envoyé une seule fois (1 événement au journal). **Offres** sans réseau : « Sans réseau, vous ne pouvez ni recevoir ni accepter de course ». **Code de retrait** sans réseau : « La vérification du code de retrait demande le réseau », pas de champ de saisie |
| **E11** Reports de la 1B | ✅ prod | Fiche « TEST Chauffeur JOEL » supprimée sur le serveur ; au rafraîchissement suivant : `🧹 [navy] 1 partner row(s) removed on the server, removed from this phone`, et elle a disparu de l'appareil. Même chose pour les colis supprimés. « Corriger ma demande » ouvert **directement** avec une demande refusée absente du téléphone : titre, motif et **tous les champs préremplis** |
| **E12** Aucune régression | ✅ prod | Sans écran d'erreur : `/dashboard`, `/transactions`, Eau, Construction, écrans NAVY. En-tête NAVY : **89 px**. Aucun défilement horizontal à 484 px. Phases 0 à 1B rejouées au passage (rôles, épicerie, direction, réglages) |

**Tests négatifs**

| Test | Résultat |
|---|---|
| Un client lit le colis, le prix ou le code d'un autre | 0 ligne partout |
| Un inconnu annule un colis | refusé `42501` |
| L'épicier d'arrivée fait le dépôt, à la place de l'épicier de départ | refusé `42501` |
| Dépôt sans « espèces encaissées », pour un colis payé en espèces | refusé `22023` |
| Valeur déclarée de 60 000 Ar | refusée `22023` |
| Un chauffeur accepte l'offre adressée à un autre | refusé `42501` |
| Un chauffeur accepte une offre expirée | refusé `22023 offer expired` (en production aussi) |
| Le chauffeur confirme avant l'épicier ; l'épicier désigne un autre chauffeur | refusé `22023` |
| Réception avec un mauvais code colis | refusée `22023` |
| Code de retrait lu par l'épicier, le chauffeur ou l'opératrice | 0 ligne |
| Code faux | compté ; bloqué au 5ᵉ, bon code refusé tant que c'est bloqué |
| Déblocage par l'épicier | refusé `42501` |
| « Retour à organiser » avant 7 jours | refusé `22023` |
| Anonyme (REST) : les 8 tables | **401** chacune |
| Anonyme (REST) : création, dépôt, acceptation, remise ×2, réception, retrait, décision de paiement, annulation, déblocage, devis, `navy_tick`, `navy_my_offers`, `navy_cash_due`, `navy_open_grocers` | `42501 permission denied for function` |

**Nettoyage (preuve SQL finale).**
- 0 colis, 0 offre, 0 événement, 0 paiement, 0 code, 0 notification journalisée.
- 0 statut chauffeur, 0 zone, 0 compte `test-navy-*`.
- **1 seule fiche partenaire : Aly.** Réglages : part 300, numéro Orange Money revenu à vide.
- **Aly** est remise exactement à son état d'origine :
  - validée, ouverte, même date de décision ;
  - position, zone et tarifs vides, comme au départ.
  - Seule sa date technique de dernière modification a changé, car le déclencheur la réécrit.
- Appareil de test : 0 colis, 0 geste en attente, 0 brouillon, seule Aly en copie locale.

## Choix faits pour les délais planifiés

- **`pg_cron`, tâche `navy-tick` toutes les 10 s** (granularité à la seconde disponible sur Supabase). Elle traite, dans l'ordre :
  - les offres échues, avec passage au suivant ;
  - les relances à 5 min, qui ouvrent un nouveau tour avec tous les chauffeurs éligibles ;
  - l'alerte à 30 min ;
  - les rappels 24 h, 3 jours et 7 jours.
- **Vérification à la lecture** : `navy_accept_offer` refuse toute offre dont l'échéance serveur est passée. L'écran calcule le décompte à partir du temps restant **donné par le serveur** (`navy_my_offers`).
- En pratique, une offre non répondue passe au suivant entre 30 et 40 s. Mesuré en production : 30 s pile, puis 10 s au plus.
- L'offre part par **notification immédiate**. L'écran « Offres » interroge aussi le serveur toutes les 4 s, et une pastille « Offres » est rafraîchie toutes les 15 s.

## SQL final

Fichier : `supabase/migrations/20260926200000_navy_ay_phase_2a_colis.sql` (reproduit ci-dessous). Appliqué par l'outil Supabase relié au projet, puis rejoué en entier. Les ajouts faits en cours de validation (`navy_cash_due`, `navy_my_offers`, rattachement du destinataire) y sont intégrés.

```sql
-- =====================================================================================
-- NAVY ay - phase 2A : the parcel journey through grocers.
--   sender orders and pays -> drops the parcel at a grocer -> a driver heading to the
--   arrival zone takes it -> the arrival grocer receives it -> the recipient collects it
--   with a secret code.
--
-- IDEMPOTENT: every statement can be replayed (if not exists, create or replace,
-- drop ... if exists + create, on conflict do nothing, cron.schedule by name).
--
-- SECURITY:
-- - RLS enabled AND forced on every new table; everything revoked from public / anon /
--   authenticated (Supabase default grants, P7 table variant), then SELECT only.
--   NO client ever writes a parcel table directly: every state change goes through a
--   SECURITY DEFINER function that checks the caller's role AND the expected state.
-- - Amounts are computed and frozen by the server at order time; the app never sends
--   a price. The total paid is readable by the sender and operators only
--   (navy_parcel_prices); a grocer reads its own price line; a driver only ever sees
--   what he earns (navy_parcels.driver_fare / offer fare).
-- - The withdrawal code lives in navy_parcel_secrets, readable by the sender and the
--   linked recipient ONLY (not even operators). It is checked server-side
--   (navy_withdraw_parcel), 5 wrong attempts block it (an operator unblocks).
-- - Notifications (notify_users, web-push) carry a short title, never an amount nor
--   the withdrawal code.
-- - Deadlines (30 s offers, 5 min relaunch, 30 min alert, 24 h / 3 days / 7 days) are
--   decided by the server: pg_cron job `navy-tick` every 10 seconds, plus the expiry
--   check inside navy_accept_offer. Never a timer living only in a phone.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. Settings
-- -------------------------------------------------------------------------------------
alter table public.navy_settings add column if not exists cyberkely_share integer not null default 300;
alter table public.navy_settings add column if not exists orange_money_number text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'navy_settings_cyberkely_share_check') then
    alter table public.navy_settings add constraint navy_settings_cyberkely_share_check check (cyberkely_share >= 0);
  end if;
end $$;
grant update (cyberkely_share, orange_money_number) on public.navy_settings to authenticated;

-- -------------------------------------------------------------------------------------
-- 2. Pure helpers (distance, fare, price breakdown)
-- -------------------------------------------------------------------------------------

-- Estimated distance (phase 2A): great-circle distance between the two shops + 30 %,
-- rounded to 0.1 km. SINGLE place to replace by a road distance in phase 2B
-- (mirrored by estimatedKm() in frontend utils/parcelRules.ts).
create or replace function public.navy_estimated_km(p_lat1 float8, p_lng1 float8, p_lat2 float8, p_lng2 float8)
returns numeric language sql immutable set search_path = public as $$
  select round((2 * 6371 * asin(sqrt(
           power(sin(radians(p_lat2 - p_lat1) / 2), 2)
           + cos(radians(p_lat1)) * cos(radians(p_lat2)) * power(sin(radians(p_lng2 - p_lng1) / 2), 2)
         )) * 1.3)::numeric, 1);
$$;

-- Driver fare: max(minimum fare, fare per 5 km x STARTED 5 km slices) (= computeFare).
create or replace function public.navy_fare(p_km numeric, p_min integer, p_per5 integer)
returns integer language sql immutable set search_path = public as $$
  select greatest(greatest(coalesce(p_min, 0), 0),
                  greatest(coalesce(p_per5, 0), 0) * ceil(greatest(coalesce(p_km, 0), 0) / 5.0)::integer);
$$;

-- Price breakdown. Total = depot + transport + pickup + CyberKELY share, rounded UP to
-- 100 Ar; the rounding goes to CyberKELY. The CyberKELY part (rounding included) is
-- spread over the 3 lines in proportion to their fee (largest remainder, ties in line
-- order), so that the lines shown to the client add up exactly to the total.
create or replace function public.navy_price_breakdown(p_depot integer, p_transport integer, p_pickup integer, p_share integer)
returns jsonb language plpgsql immutable set search_path = public as $$
declare
  v_base integer[] := array[greatest(coalesce(p_depot, 0), 0), greatest(coalesce(p_transport, 0), 0), greatest(coalesce(p_pickup, 0), 0)];
  v_share integer := greatest(coalesce(p_share, 0), 0);
  v_sub integer;
  v_total integer;
  v_navy integer;
  v_sum integer;
  v_exact numeric;
  v_part integer[] := array[0, 0, 0];
  v_rem numeric[] := array[0, 0, 0];
  v_left integer;
  i integer;
  v_best integer;
begin
  v_sub := v_base[1] + v_base[2] + v_base[3] + v_share;
  v_total := (ceil(v_sub / 100.0) * 100)::integer;
  v_navy := v_share + (v_total - v_sub);
  v_sum := v_base[1] + v_base[2] + v_base[3];
  if v_sum = 0 then
    v_part[2] := v_navy;
  else
    for i in 1..3 loop
      v_exact := v_navy::numeric * v_base[i] / v_sum;
      v_part[i] := floor(v_exact)::integer;
      v_rem[i] := v_exact - floor(v_exact);
    end loop;
    v_left := v_navy - (v_part[1] + v_part[2] + v_part[3]);
    while v_left > 0 loop
      v_best := 1;
      for i in 2..3 loop
        if v_rem[i] > v_rem[v_best] then v_best := i; end if;
      end loop;
      v_part[v_best] := v_part[v_best] + 1;
      v_rem[v_best] := -1;
      v_left := v_left - 1;
    end loop;
  end if;
  return jsonb_build_object(
    'subtotal', v_sub, 'total', v_total, 'navy_total', v_navy, 'rounding', v_total - v_sub,
    'lines', jsonb_build_array(
      jsonb_build_object('kind', 'depot',     'base', v_base[1], 'navy_share', v_part[1], 'shown', v_base[1] + v_part[1]),
      jsonb_build_object('kind', 'transport', 'base', v_base[2], 'navy_share', v_part[2], 'shown', v_base[2] + v_part[2]),
      jsonb_build_object('kind', 'pickup',    'base', v_base[3], 'navy_share', v_part[3], 'shown', v_base[3] + v_part[3])));
end;
$$;

-- Last 9 digits of a Malagasy phone number (034 12 345 67 = +261 34 12 345 67).
create or replace function public.navy_phone_key(p text)
returns text language sql immutable set search_path = public as $$
  select nullif(right(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 9), '');
$$;

-- -------------------------------------------------------------------------------------
-- 3. Tables
-- -------------------------------------------------------------------------------------
create table if not exists public.navy_parcels (
  id                    uuid primary key,                 -- client-generated id (idempotent order)
  code                  text not null check (code ~ '^[0-9]{4}$'),  -- written on the parcel
  sender_id             uuid not null references public.users(id) on delete cascade,
  sender_name           text,
  sender_phone          text,
  recipient_name        text not null check (length(btrim(recipient_name)) between 1 and 80),
  recipient_phone       text not null,
  recipient_user_id     uuid references public.users(id) on delete set null,
  -- grocers (snapshots: the parcel keeps the names / phones / positions of the order)
  depot_partner_id      uuid not null references public.navy_partners(id),
  depot_name            text,
  depot_phone           text,
  depot_lat             double precision,
  depot_lng             double precision,
  depot_zone_id         uuid references public.navy_zones(id) on delete set null,
  arrival_partner_id    uuid not null references public.navy_partners(id),
  arrival_name          text,
  arrival_phone         text,
  arrival_lat           double precision,
  arrival_lng           double precision,
  arrival_zone_id       uuid references public.navy_zones(id) on delete set null,
  distance_km           numeric not null,
  -- content
  category              text not null check (category in ('document', 'vetement', 'telephone', 'nourriture', 'autre')),
  declared_value        integer not null check (declared_value between 0 and 50000),
  -- journey
  status                text not null default 'commande'
                          check (status in ('commande', 'depose', 'chauffeur_trouve', 'pris_en_charge', 'arrive', 'retire', 'annule')),
  payment_method        text not null check (payment_method in ('especes', 'orange_money')),
  payment_status        text not null
                          check (payment_status in ('a_payer_depot', 'attente_reference', 'a_verifier', 'refuse', 'paye')),
  payment_refusal_reason text,
  paid_at               timestamptz,
  -- driver search
  driver_mode           text not null default 'auto' check (driver_mode in ('auto', 'choix')),
  chosen_driver_id      uuid references public.navy_partners(id) on delete set null,
  chosen_fare           integer,
  search_state          text check (search_state in ('recherche', 'attente_client', 'trouve')),
  search_round          integer not null default 0,
  search_started_at     timestamptz,
  next_relaunch_at      timestamptz,
  no_driver_alert_at    timestamptz,
  -- driver (snapshot at acceptance) and what he earns
  driver_partner_id     uuid references public.navy_partners(id) on delete set null,
  driver_user_id        uuid references public.users(id) on delete set null,
  driver_name           text,
  driver_phone          text,
  driver_vehicle        text,
  driver_plate          text,
  driver_fare           integer,
  -- double confirmation of the hand-over
  handover_grocer_at    timestamptz,
  handover_driver_at    timestamptz,
  -- withdrawal code checks (the code itself is in navy_parcel_secrets)
  withdraw_attempts     integer not null default 0,
  withdraw_blocked_at   timestamptz,
  -- deadlines after arrival
  reminder_24h_at       timestamptz,
  alert_3d_at           timestamptz,
  overdue_7d_at         timestamptz,
  return_status         text check (return_status in ('a_organiser')),
  -- timestamps
  sealed_confirmed      boolean not null default false,
  cash_collected_at     timestamptz,
  ordered_at            timestamptz not null default now(),
  deposited_at          timestamptz,
  driver_found_at       timestamptz,
  picked_up_at          timestamptz,
  arrived_at            timestamptz,
  withdrawn_at          timestamptz,
  cancelled_at          timestamptz,
  cancelled_by          uuid references public.users(id) on delete set null,
  cancel_reason         text,
  updated_at            timestamptz not null default now(),
  constraint navy_parcels_distinct_shops check (depot_partner_id <> arrival_partner_id)
);
-- The 4-digit code is unique among parcels still on their way.
create unique index if not exists navy_parcels_active_code on public.navy_parcels (code)
  where status not in ('retire', 'annule');
create index if not exists navy_parcels_sender_idx on public.navy_parcels (sender_id, ordered_at desc);
create index if not exists navy_parcels_recipient_idx on public.navy_parcels (recipient_user_id) where recipient_user_id is not null;
create index if not exists navy_parcels_depot_idx on public.navy_parcels (depot_partner_id, status);
create index if not exists navy_parcels_arrival_idx on public.navy_parcels (arrival_partner_id, status);
create index if not exists navy_parcels_driver_idx on public.navy_parcels (driver_user_id) where driver_user_id is not null;
create index if not exists navy_parcels_status_idx on public.navy_parcels (status, ordered_at desc);

-- Frozen amounts (sender + operators only).
create table if not exists public.navy_parcel_prices (
  parcel_id          uuid primary key references public.navy_parcels(id) on delete cascade,
  depot_fee          integer not null,
  pickup_fee         integer not null,
  transport_ceiling  integer not null,       -- what the client pays for the transport
  share_fixed        integer not null,       -- CyberKELY fixed share (settings)
  rounding           integer not null,       -- rounding up to 100 Ar, added to CyberKELY
  navy_total         integer not null,       -- share_fixed + rounding
  total_price        integer not null,       -- what the client pays
  credit_due         integer not null default 0,  -- credit owed to the client (used in phase 2B)
  credit_reason      text,
  created_at         timestamptz not null default now()
);

-- Price lines as shown to the client (partner fee + its CyberKELY share).
create table if not exists public.navy_parcel_price_lines (
  parcel_id   uuid not null references public.navy_parcels(id) on delete cascade,
  seq         smallint not null,
  kind        text not null check (kind in ('depot', 'transport', 'pickup')),
  partner_id  uuid references public.navy_partners(id) on delete set null,
  label       text not null,
  base_amount integer not null,
  navy_share  integer not null,
  shown_amount integer not null,
  primary key (parcel_id, seq)
);
create index if not exists navy_parcel_price_lines_partner_idx on public.navy_parcel_price_lines (partner_id);

-- Withdrawal code: sender + linked recipient ONLY.
create table if not exists public.navy_parcel_secrets (
  parcel_id     uuid primary key references public.navy_parcels(id) on delete cascade,
  withdraw_code text not null check (withdraw_code ~ '^[0-9]{6}$')
);

-- Offers to drivers, with their deadline.
create table if not exists public.navy_parcel_offers (
  id               uuid primary key default gen_random_uuid(),
  parcel_id        uuid not null references public.navy_parcels(id) on delete cascade,
  driver_partner_id uuid not null references public.navy_partners(id) on delete cascade,
  driver_user_id   uuid not null references public.users(id) on delete cascade,
  round            integer not null,
  fare             integer not null,          -- what the driver earns
  -- snapshot shown to the driver (no amount paid by the client, no code)
  parcel_code      text not null,
  depot_name       text,
  depot_lat        double precision,
  depot_lng        double precision,
  arrival_name     text,
  arrival_lat      double precision,
  arrival_lng      double precision,
  distance_km      numeric not null,
  category         text not null,
  status           text not null default 'envoyee' check (status in ('envoyee', 'acceptee', 'refusee', 'expiree', 'annulee')),
  sent_at          timestamptz not null default now(),
  expires_at       timestamptz not null,
  answered_at      timestamptz
);
create index if not exists navy_parcel_offers_parcel_idx on public.navy_parcel_offers (parcel_id, round);
create index if not exists navy_parcel_offers_driver_idx on public.navy_parcel_offers (driver_user_id, status);
create index if not exists navy_parcel_offers_live_idx on public.navy_parcel_offers (expires_at) where status = 'envoyee';

-- Journal of every state change (who, when, what). No amount, no code.
create table if not exists public.navy_parcel_events (
  id         bigint generated always as identity primary key,
  parcel_id  uuid not null references public.navy_parcels(id) on delete cascade,
  at         timestamptz not null default now(),
  actor_id   uuid references public.users(id) on delete set null,
  actor_role text not null check (actor_role in ('client', 'epicier', 'chauffeur', 'operatrice', 'systeme')),
  event      text not null,
  note       text
);
create index if not exists navy_parcel_events_parcel_idx on public.navy_parcel_events (parcel_id, at);

-- Orange Money references typed by the sender, checked by an operator.
create table if not exists public.navy_parcel_payments (
  id           uuid primary key,                -- client-generated id (idempotent)
  parcel_id    uuid not null references public.navy_parcels(id) on delete cascade,
  reference    text not null check (length(btrim(reference)) between 4 and 40),
  amount       integer not null,
  status       text not null default 'a_verifier' check (status in ('a_verifier', 'valide', 'refuse')),
  reason       text,
  submitted_by uuid not null references public.users(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  decided_by   uuid references public.users(id) on delete set null,
  decided_at   timestamptz
);
create index if not exists navy_parcel_payments_status_idx on public.navy_parcel_payments (status, submitted_at);
create index if not exists navy_parcel_payments_parcel_idx on public.navy_parcel_payments (parcel_id);

-- Proof of every notification sent (return of notify_users = pg_net request id).
create table if not exists public.navy_notify_log (
  id         bigint generated always as identity primary key,
  parcel_id  uuid references public.navy_parcels(id) on delete cascade,
  user_ids   uuid[] not null,
  title      text not null,
  url        text,
  request_id bigint,
  error      text,
  at         timestamptz not null default now()
);
create index if not exists navy_notify_log_parcel_idx on public.navy_notify_log (parcel_id, at);

-- -------------------------------------------------------------------------------------
-- 4. Access helpers (SECURITY DEFINER, read auth.uid())
-- -------------------------------------------------------------------------------------
create or replace function public.navy_owns_partner(p_partner_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null
     and exists (select 1 from public.navy_partners where id = p_partner_id and user_id = auth.uid());
$$;

create or replace function public.navy_can_see_parcel(p_parcel_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from public.navy_parcels p
     where p.id = p_parcel_id
       and (p.sender_id = auth.uid() or p.recipient_user_id = auth.uid() or p.driver_user_id = auth.uid()
            or public.navy_owns_partner(p.depot_partner_id) or public.navy_owns_partner(p.arrival_partner_id)
            or public.navy_is_operator()));
$$;

create or replace function public.navy_is_parcel_sender(p_parcel_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null
     and exists (select 1 from public.navy_parcels where id = p_parcel_id and sender_id = auth.uid());
$$;

-- Sender or linked recipient (the only two people who may read the withdrawal code).
create or replace function public.navy_is_parcel_party(p_parcel_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null
     and exists (select 1 from public.navy_parcels
                  where id = p_parcel_id and (sender_id = auth.uid() or recipient_user_id = auth.uid()));
$$;

create or replace function public.navy_operator_ids()
returns uuid[] language sql stable security definer set search_path = public, auth as $$
  select coalesce(array_agg(distinct u), array[]::uuid[]) from (
    select user_id as u from public.navy_operators
    union
    select id from auth.users where email = 'joelsoatra@gmail.com'
  ) s;
$$;

create or replace function public.navy_partner_user(p_partner_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select user_id from public.navy_partners where id = p_partner_id;
$$;

-- -------------------------------------------------------------------------------------
-- 5. RLS (enabled AND forced) + SELECT policies only
-- -------------------------------------------------------------------------------------
alter table public.navy_parcels            enable row level security;
alter table public.navy_parcels            force row level security;
alter table public.navy_parcel_prices      enable row level security;
alter table public.navy_parcel_prices      force row level security;
alter table public.navy_parcel_price_lines enable row level security;
alter table public.navy_parcel_price_lines force row level security;
alter table public.navy_parcel_secrets     enable row level security;
alter table public.navy_parcel_secrets     force row level security;
alter table public.navy_parcel_offers      enable row level security;
alter table public.navy_parcel_offers      force row level security;
alter table public.navy_parcel_events      enable row level security;
alter table public.navy_parcel_events      force row level security;
alter table public.navy_parcel_payments    enable row level security;
alter table public.navy_parcel_payments    force row level security;
alter table public.navy_notify_log         enable row level security;
alter table public.navy_notify_log         force row level security;

drop policy if exists navy_parcels_select on public.navy_parcels;
create policy navy_parcels_select on public.navy_parcels for select to public using (
  sender_id = auth.uid() or recipient_user_id = auth.uid() or driver_user_id = auth.uid()
  or public.navy_owns_partner(depot_partner_id) or public.navy_owns_partner(arrival_partner_id)
  or public.navy_is_operator());

drop policy if exists navy_parcel_prices_select on public.navy_parcel_prices;
create policy navy_parcel_prices_select on public.navy_parcel_prices for select to public using (
  public.navy_is_parcel_sender(parcel_id) or public.navy_is_operator());

drop policy if exists navy_parcel_price_lines_select on public.navy_parcel_price_lines;
create policy navy_parcel_price_lines_select on public.navy_parcel_price_lines for select to public using (
  public.navy_is_parcel_sender(parcel_id) or public.navy_is_operator()
  or (kind <> 'transport' and public.navy_owns_partner(partner_id)));

drop policy if exists navy_parcel_secrets_select on public.navy_parcel_secrets;
create policy navy_parcel_secrets_select on public.navy_parcel_secrets for select to public using (
  public.navy_is_parcel_party(parcel_id));

drop policy if exists navy_parcel_offers_select on public.navy_parcel_offers;
create policy navy_parcel_offers_select on public.navy_parcel_offers for select to public using (
  driver_user_id = auth.uid() or public.navy_is_operator());

drop policy if exists navy_parcel_events_select on public.navy_parcel_events;
create policy navy_parcel_events_select on public.navy_parcel_events for select to public using (
  public.navy_can_see_parcel(parcel_id));

drop policy if exists navy_parcel_payments_select on public.navy_parcel_payments;
create policy navy_parcel_payments_select on public.navy_parcel_payments for select to public using (
  submitted_by = auth.uid() or public.navy_is_operator());

drop policy if exists navy_notify_log_select on public.navy_notify_log;
create policy navy_notify_log_select on public.navy_notify_log for select to public using (
  public.navy_is_operator());

revoke all on public.navy_parcels, public.navy_parcel_prices, public.navy_parcel_price_lines,
              public.navy_parcel_secrets, public.navy_parcel_offers, public.navy_parcel_events,
              public.navy_parcel_payments, public.navy_notify_log
  from public, anon, authenticated;
grant select on public.navy_parcels, public.navy_parcel_prices, public.navy_parcel_price_lines,
                public.navy_parcel_secrets, public.navy_parcel_offers, public.navy_parcel_events,
                public.navy_parcel_payments, public.navy_notify_log
  to authenticated;

-- -------------------------------------------------------------------------------------
-- 6. Internal machinery (never executable by clients)
-- -------------------------------------------------------------------------------------

-- Web-push to some accounts. Never breaks the transition that calls it; the result
-- (pg_net request id or error) is kept in navy_notify_log as proof.
create or replace function public.navy_notify(p_parcel_id uuid, p_user_ids uuid[], p_title text, p_url text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_ids uuid[];
  v_req bigint;
  v_err text;
begin
  select coalesce(array_agg(distinct u), array[]::uuid[]) into v_ids
    from unnest(coalesce(p_user_ids, array[]::uuid[])) u where u is not null;
  if coalesce(array_length(v_ids, 1), 0) = 0 then
    return;
  end if;
  begin
    v_req := public.notify_users(v_ids, p_title, 'Ouvrez NAVY ay pour voir le détail.', p_url);
  exception when others then
    v_err := sqlerrm;
  end;
  insert into public.navy_notify_log (parcel_id, user_ids, title, url, request_id, error)
  values (p_parcel_id, v_ids, p_title, p_url, v_req, v_err);
end;
$$;

create or replace function public.navy_log(p_parcel_id uuid, p_role text, p_event text, p_note text default null)
returns void language sql security definer set search_path = public as $$
  insert into public.navy_parcel_events (parcel_id, actor_id, actor_role, event, note)
  values (p_parcel_id, auth.uid(), p_role, p_event, p_note);
$$;

-- Drivers who may receive an offer for a parcel right now: approved, available (not
-- expired), heading to the arrival zone, fare for the estimated distance <= ceiling.
create or replace function public.navy_eligible_drivers(p_arrival_zone uuid, p_km numeric, p_ceiling integer)
returns table (partner_id uuid, user_id uuid, name text, vehicle_type text, fare integer, dest_zone_id uuid, since timestamptz)
language sql stable security definer set search_path = public as $$
  select * from (
    select p.id, p.user_id, p.display_name, p.vehicle_type,
           public.navy_fare(p_km, coalesce(p.min_fare, s.suggested_min_fare), coalesce(p.fare_per_5km, s.suggested_fare_per_5km)) as fare,
           d.dest_zone_id, d.client_at
      from public.navy_partners p
      join public.navy_driver_status d on d.partner_id = p.id
      cross join public.navy_settings s
     where p.kind = 'chauffeur' and p.status = 'approved'
       and d.available and d.available_until > now()
       and p_arrival_zone is not null and d.dest_zone_id = p_arrival_zone
  ) e
  where e.fare <= p_ceiling
  order by e.fare, e.client_at, e.id;
$$;

-- Send the next offer of a parcel, if it is waiting for a driver. Called after a
-- deposit, a validated payment, a refusal, an expiry, a relaunch, a client choice.
create or replace function public.navy_dispatch(p_parcel_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  p public.navy_parcels;
  v_ceiling integer;
  v_pid uuid;
  v_uid uuid;
  v_fare integer;
  v_name text;
  v_more_expensive boolean;
begin
  select * into p from public.navy_parcels where id = p_parcel_id for update;
  if not found or p.status <> 'depose' or p.payment_status <> 'paye' or p.search_state = 'attente_client' then
    return;
  end if;
  if exists (select 1 from public.navy_parcel_offers
              where parcel_id = p.id and status = 'envoyee' and expires_at > now()) then
    return;   -- an offer is live
  end if;
  if p.search_started_at is null then
    update public.navy_parcels
       set search_state = 'recherche', search_round = 1, search_started_at = now(),
           next_relaunch_at = now() + interval '5 minutes', updated_at = now()
     where id = p.id returning * into p;
    perform public.navy_log(p.id, 'systeme', 'recherche_chauffeur');
  end if;
  select transport_ceiling into v_ceiling from public.navy_parcel_prices where parcel_id = p.id;

  -- "Je choisis mon chauffeur": the chosen driver first (once per round).
  if p.driver_mode = 'choix' and p.chosen_driver_id is not null
     and not exists (select 1 from public.navy_parcel_offers o
                      where o.parcel_id = p.id and o.round = p.search_round and o.driver_partner_id = p.chosen_driver_id) then
    select e.partner_id, e.user_id, e.fare, e.name into v_pid, v_uid, v_fare, v_name
      from public.navy_eligible_drivers(p.arrival_zone_id, p.distance_km, v_ceiling) e
     where e.partner_id = p.chosen_driver_id;
  end if;

  if v_pid is null then
    select e.partner_id, e.user_id, e.fare, e.name into v_pid, v_uid, v_fare, v_name
      from public.navy_eligible_drivers(p.arrival_zone_id, p.distance_km, v_ceiling) e
     where not exists (select 1 from public.navy_parcel_offers o
                        where o.parcel_id = p.id and o.round = p.search_round and o.driver_partner_id = e.partner_id)
       and (p.driver_mode = 'auto' or p.chosen_fare is null or e.fare <= p.chosen_fare)
     limit 1;
  end if;

  if v_pid is null then
    if p.driver_mode = 'choix' then
      -- Only more expensive drivers left: the client decides.
      select exists (select 1 from public.navy_eligible_drivers(p.arrival_zone_id, p.distance_km, v_ceiling) e
                      where not exists (select 1 from public.navy_parcel_offers o
                                         where o.parcel_id = p.id and o.round = p.search_round and o.driver_partner_id = e.partner_id))
        into v_more_expensive;
      if v_more_expensive then
        update public.navy_parcels set search_state = 'attente_client', updated_at = now() where id = p.id;
        perform public.navy_log(p.id, 'systeme', 'avis_client_demande', 'Chauffeurs suivants plus chers');
        perform public.navy_notify(p.id, array[p.sender_id], 'Colis ' || p.code || ' : choisissez un autre chauffeur',
                                   '/navy/colis/' || p.id);
      end if;
    end if;
    return;   -- nobody for now: relaunch every 5 minutes (navy_tick)
  end if;

  insert into public.navy_parcel_offers (parcel_id, driver_partner_id, driver_user_id, round, fare, parcel_code,
                                         depot_name, depot_lat, depot_lng, arrival_name, arrival_lat, arrival_lng,
                                         distance_km, category, expires_at)
  values (p.id, v_pid, v_uid, p.search_round, v_fare, p.code,
          p.depot_name, p.depot_lat, p.depot_lng, p.arrival_name, p.arrival_lat, p.arrival_lng,
          p.distance_km, p.category, now() + interval '30 seconds');
  perform public.navy_log(p.id, 'systeme', 'offre_envoyee', coalesce(v_name, 'chauffeur'));
  perform public.navy_notify(p.id, array[v_uid], 'Nouvelle course NAVY : 30 secondes pour accepter', '/navy/offres');
end;
$$;

-- Hand-over done by both sides → picked up.
create or replace function public.navy_complete_handover(p_parcel_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  p public.navy_parcels;
begin
  select * into p from public.navy_parcels where id = p_parcel_id for update;
  if p.status = 'chauffeur_trouve' and p.handover_grocer_at is not null and p.handover_driver_at is not null then
    update public.navy_parcels set status = 'pris_en_charge', picked_up_at = now(), updated_at = now() where id = p.id;
    perform public.navy_log(p.id, 'systeme', 'pris_en_charge');
    perform public.navy_notify(p.id, array[p.sender_id, p.recipient_user_id, public.navy_partner_user(p.arrival_partner_id)],
                               'Colis ' || p.code || ' : pris en charge', '/navy/colis/' || p.id);
  end if;
end;
$$;

-- Server clock: offers expired after 30 s → next driver; relaunch every 5 min; operator
-- alert after 30 min without a driver; reminders 24 h / 3 days / 7 days after arrival.
-- Run every 10 seconds by pg_cron (job navy-tick). Idempotent.
create or replace function public.navy_tick()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_expired integer := 0;
  v_relaunched integer := 0;
  v_alerts integer := 0;
  v_reminders integer := 0;
  v_n integer;
begin
  -- 1. offers not answered in time
  for r in select distinct o.parcel_id from public.navy_parcel_offers o
            where o.status = 'envoyee' and o.expires_at <= now() loop
    perform 1 from public.navy_parcels where id = r.parcel_id for update;
    update public.navy_parcel_offers set status = 'expiree', answered_at = now()
     where parcel_id = r.parcel_id and status = 'envoyee' and expires_at <= now();
    get diagnostics v_n = row_count;
    v_expired := v_expired + v_n;
    perform public.navy_log(r.parcel_id, 'systeme', 'offre_expiree');
    perform public.navy_dispatch(r.parcel_id);
  end loop;

  -- 2. relaunch every 5 minutes (new round: every eligible driver again)
  for r in select id from public.navy_parcels
            where status = 'depose' and payment_status = 'paye' and search_state = 'recherche'
              and next_relaunch_at <= now()
              and not exists (select 1 from public.navy_parcel_offers o
                               where o.parcel_id = navy_parcels.id and o.status = 'envoyee' and o.expires_at > now()) loop
    update public.navy_parcels
       set search_round = search_round + 1, next_relaunch_at = now() + interval '5 minutes', updated_at = now()
     where id = r.id;
    perform public.navy_log(r.id, 'systeme', 'relance_chauffeurs');
    perform public.navy_dispatch(r.id);
    v_relaunched := v_relaunched + 1;
  end loop;

  -- 2b. paid and deposited parcels whose search never started (safety net)
  for r in select id from public.navy_parcels
            where status = 'depose' and payment_status = 'paye' and search_started_at is null loop
    perform public.navy_dispatch(r.id);
  end loop;

  -- 3. no driver after 30 minutes → operators
  for r in select id, code from public.navy_parcels
            where status = 'depose' and search_started_at <= now() - interval '30 minutes' and no_driver_alert_at is null loop
    update public.navy_parcels set no_driver_alert_at = now(), updated_at = now() where id = r.id;
    perform public.navy_log(r.id, 'systeme', 'alerte_sans_chauffeur_30min');
    perform public.navy_notify(r.id, public.navy_operator_ids(), 'Colis ' || r.code || ' : aucun chauffeur depuis 30 min',
                               '/navy/operatrice/colis');
    v_alerts := v_alerts + 1;
  end loop;

  -- 4. not collected: 24 h reminder (sender + recipient)
  for r in select id, code, sender_id, recipient_user_id from public.navy_parcels
            where status = 'arrive' and arrived_at <= now() - interval '24 hours' and reminder_24h_at is null loop
    update public.navy_parcels set reminder_24h_at = now(), updated_at = now() where id = r.id;
    perform public.navy_log(r.id, 'systeme', 'rappel_24h');
    perform public.navy_notify(r.id, array[r.sender_id, r.recipient_user_id], 'Colis ' || r.code || ' : à retirer à l''épicerie',
                               '/navy/colis/' || r.id);
    v_reminders := v_reminders + 1;
  end loop;

  -- 5. not collected after 3 days → operators
  for r in select id, code from public.navy_parcels
            where status = 'arrive' and arrived_at <= now() - interval '3 days' and alert_3d_at is null loop
    update public.navy_parcels set alert_3d_at = now(), updated_at = now() where id = r.id;
    perform public.navy_log(r.id, 'systeme', 'alerte_non_retire_3j');
    perform public.navy_notify(r.id, public.navy_operator_ids(), 'Colis ' || r.code || ' : non retiré depuis 3 jours',
                               '/navy/operatrice/colis');
    v_alerts := v_alerts + 1;
  end loop;

  -- 6. over 7 days → operators may mark "retour à organiser"
  for r in select id, code from public.navy_parcels
            where status = 'arrive' and arrived_at <= now() - interval '7 days' and overdue_7d_at is null loop
    update public.navy_parcels set overdue_7d_at = now(), updated_at = now() where id = r.id;
    perform public.navy_log(r.id, 'systeme', 'alerte_non_retire_7j');
    perform public.navy_notify(r.id, public.navy_operator_ids(), 'Colis ' || r.code || ' : retour à organiser',
                               '/navy/operatrice/colis');
    v_alerts := v_alerts + 1;
  end loop;

  return jsonb_build_object('expired', v_expired, 'relaunched', v_relaunched, 'alerts', v_alerts, 'reminders', v_reminders);
end;
$$;

-- -------------------------------------------------------------------------------------
-- 7. Client-facing functions
-- -------------------------------------------------------------------------------------

-- Open, validated, positioned grocers (for the order screen). No phone, no NIF.
create or replace function public.navy_open_grocers()
returns table (id uuid, shop_name text, lat float8, lng float8, zone_id uuid, depot_fee integer, pickup_fee integer)
language sql stable security definer set search_path = public as $$
  select p.id, coalesce(p.shop_name, p.display_name), p.shop_lat, p.shop_lng, p.zone_id,
         coalesce(p.depot_fee, s.suggested_depot_fee, 0), coalesce(p.pickup_fee, s.suggested_pickup_fee, 0)
    from public.navy_partners p cross join public.navy_settings s
   where auth.uid() is not null and p.kind = 'epicier' and p.status = 'approved' and p.is_open
     and p.shop_lat is not null and p.shop_lng is not null
   order by 2;
$$;

-- Internal: quote for a pair of grocers (raises a clear error when impossible).
create or replace function public.navy_compute_quote(p_depot uuid, p_arrival uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  d public.navy_partners;
  a public.navy_partners;
  s public.navy_settings;
  v_km numeric;
  v_ceiling integer;
  v_dep integer;
  v_pick integer;
  v_bd jsonb;
  v_drivers jsonb;
begin
  select * into s from public.navy_settings where id;
  select * into d from public.navy_partners where id = p_depot and kind = 'epicier' and status = 'approved';
  if not found or not d.is_open or d.shop_lat is null then
    raise exception 'navy: depot grocer not available' using errcode = '22023';
  end if;
  select * into a from public.navy_partners where id = p_arrival and kind = 'epicier' and status = 'approved';
  if not found or not a.is_open or a.shop_lat is null then
    raise exception 'navy: arrival grocer not available' using errcode = '22023';
  end if;
  if d.id = a.id then
    raise exception 'navy: same grocer for depot and arrival' using errcode = '22023';
  end if;
  v_km := public.navy_estimated_km(d.shop_lat, d.shop_lng, a.shop_lat, a.shop_lng);
  v_ceiling := public.navy_fare(v_km, s.suggested_min_fare, s.suggested_fare_per_5km);
  v_dep := coalesce(d.depot_fee, s.suggested_depot_fee, 0);
  v_pick := coalesce(a.pickup_fee, s.suggested_pickup_fee, 0);
  v_bd := public.navy_price_breakdown(v_dep, v_ceiling, v_pick, s.cyberkely_share);
  select coalesce(jsonb_agg(jsonb_build_object('partner_id', e.partner_id, 'name', e.name, 'vehicle_type', e.vehicle_type,
                                               'fare', e.fare, 'dest_zone_id', e.dest_zone_id) order by e.fare, e.since), '[]'::jsonb)
    into v_drivers
    from public.navy_eligible_drivers(a.zone_id, v_km, v_ceiling) e;
  return jsonb_build_object(
    'distance_km', v_km, 'transport_ceiling', v_ceiling, 'depot_fee', v_dep, 'pickup_fee', v_pick,
    'share', s.cyberkely_share, 'breakdown', v_bd,
    'depot_name', coalesce(d.shop_name, d.display_name), 'arrival_name', coalesce(a.shop_name, a.display_name),
    'depot_zone_id', d.zone_id, 'arrival_zone_id', a.zone_id, 'drivers', v_drivers,
    'orange_money_number', s.orange_money_number);
end;
$$;

-- Quote shown before ordering (any signed-in account).
create or replace function public.navy_quote(p_depot uuid, p_arrival uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'navy_quote: sign-in required' using errcode = '42501';
  end if;
  return public.navy_compute_quote(p_depot, p_arrival);
end;
$$;

-- Order. Idempotent on the client id: a replay returns the same parcel. Amounts are
-- computed HERE and frozen. Returns the parcel code and the withdrawal code (sender).
create or replace function public.navy_create_parcel(
  p_id uuid, p_depot uuid, p_arrival uuid, p_recipient_name text, p_recipient_phone text,
  p_category text, p_declared_value integer, p_driver_mode text, p_chosen_driver uuid, p_payment_method text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid uuid := auth.uid();
  v_existing public.navy_parcels;
  q jsonb;
  d public.navy_partners;
  a public.navy_partners;
  v_code text;
  v_wcode text;
  v_chosen_fare integer;
  v_recipient uuid;
  v_key text;
  v_user public.users;
  v_line jsonb;
  v_seq integer := 0;
  v_try integer := 0;
begin
  if v_uid is null then
    raise exception 'navy_create_parcel: sign-in required' using errcode = '42501';
  end if;
  select * into v_existing from public.navy_parcels where id = p_id;
  if found then
    if v_existing.sender_id <> v_uid then
      raise exception 'navy_create_parcel: not yours' using errcode = '42501';
    end if;
    return jsonb_build_object('id', v_existing.id, 'code', v_existing.code, 'replay', true,
                              'withdraw_code', (select withdraw_code from public.navy_parcel_secrets where parcel_id = p_id));
  end if;

  if p_category not in ('document', 'vetement', 'telephone', 'nourriture', 'autre') then
    raise exception 'navy_create_parcel: invalid category' using errcode = '22023';
  end if;
  if p_declared_value is null or p_declared_value < 0 or p_declared_value > 50000 then
    raise exception 'navy_create_parcel: declared value must be between 0 and 50000' using errcode = '22023';
  end if;
  if p_driver_mode not in ('auto', 'choix') or p_payment_method not in ('especes', 'orange_money') then
    raise exception 'navy_create_parcel: invalid option' using errcode = '22023';
  end if;
  if length(btrim(coalesce(p_recipient_name, ''))) = 0 then
    raise exception 'navy_create_parcel: recipient name required' using errcode = '22023';
  end if;
  v_key := public.navy_phone_key(p_recipient_phone);
  if v_key is null or length(v_key) < 9 then
    raise exception 'navy_create_parcel: recipient phone required' using errcode = '22023';
  end if;

  q := public.navy_compute_quote(p_depot, p_arrival);
  if (q->>'arrival_zone_id') is null then
    raise exception 'navy_create_parcel: arrival grocer outside every zone' using errcode = '22023';
  end if;
  if p_payment_method = 'orange_money' and coalesce(btrim(q->>'orange_money_number'), '') = '' then
    raise exception 'navy_create_parcel: Orange Money number not set yet' using errcode = '22023';
  end if;
  if p_driver_mode = 'choix' then
    select (e->>'fare')::integer into v_chosen_fare from jsonb_array_elements(q->'drivers') e
     where (e->>'partner_id')::uuid = p_chosen_driver;
    if v_chosen_fare is null then
      raise exception 'navy_create_parcel: chosen driver not available' using errcode = '22023';
    end if;
  end if;

  select * into d from public.navy_partners where id = p_depot;
  select * into a from public.navy_partners where id = p_arrival;
  select * into v_user from public.users where id = v_uid;

  -- Recipient with a NAVY account. SECURITY: linked ONLY through a phone number vetted
  -- by an operator (approved partner profile). users.phone is writable by its owner:
  -- matching on it would let anyone claim another person's number and read the
  -- withdrawal code of parcels sent to that number. A verified phone for every client
  -- account (SMS, phase 1C) will widen this.
  select np.user_id into v_recipient from public.navy_partners np
   where np.status = 'approved' and public.navy_phone_key(np.phone) = v_key
   order by np.decided_at nulls last, np.created_at limit 1;

  v_wcode := lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint % 1000000))::text, 6, '0');

  loop
    v_try := v_try + 1;
    v_code := lpad(((('x' || encode(extensions.gen_random_bytes(2), 'hex'))::bit(16)::integer % 10000))::text, 4, '0');
    begin
      insert into public.navy_parcels (
        id, code, sender_id, sender_name, sender_phone, recipient_name, recipient_phone, recipient_user_id,
        depot_partner_id, depot_name, depot_phone, depot_lat, depot_lng, depot_zone_id,
        arrival_partner_id, arrival_name, arrival_phone, arrival_lat, arrival_lng, arrival_zone_id,
        distance_km, category, declared_value, payment_method, payment_status, driver_mode, chosen_driver_id, chosen_fare)
      values (
        p_id, v_code, v_uid, coalesce(v_user.username, split_part(v_user.email, '@', 1)), v_user.phone,
        btrim(p_recipient_name), btrim(p_recipient_phone), v_recipient,
        d.id, coalesce(d.shop_name, d.display_name), d.phone, d.shop_lat, d.shop_lng, d.zone_id,
        a.id, coalesce(a.shop_name, a.display_name), a.phone, a.shop_lat, a.shop_lng, a.zone_id,
        (q->>'distance_km')::numeric, p_category, p_declared_value, p_payment_method,
        case when p_payment_method = 'especes' then 'a_payer_depot' else 'attente_reference' end,
        p_driver_mode, case when p_driver_mode = 'choix' then p_chosen_driver end, v_chosen_fare);
      exit;
    exception when unique_violation then
      if v_try >= 40 then raise; end if;
    end;
  end loop;

  insert into public.navy_parcel_prices (parcel_id, depot_fee, pickup_fee, transport_ceiling, share_fixed, rounding,
                                         navy_total, total_price)
  values (p_id, (q->>'depot_fee')::integer, (q->>'pickup_fee')::integer, (q->>'transport_ceiling')::integer,
          (q->>'share')::integer, (q->'breakdown'->>'rounding')::integer,
          (q->'breakdown'->>'navy_total')::integer, (q->'breakdown'->>'total')::integer);

  for v_line in select * from jsonb_array_elements(q->'breakdown'->'lines') loop
    v_seq := v_seq + 1;
    insert into public.navy_parcel_price_lines (parcel_id, seq, kind, partner_id, label, base_amount, navy_share, shown_amount)
    values (p_id, v_seq, v_line->>'kind',
            case v_line->>'kind' when 'depot' then d.id when 'pickup' then a.id end,
            case v_line->>'kind' when 'depot' then coalesce(d.shop_name, d.display_name)
                                 when 'pickup' then coalesce(a.shop_name, a.display_name)
                                 else 'Transport' end,
            (v_line->>'base')::integer, (v_line->>'navy_share')::integer, (v_line->>'shown')::integer);
  end loop;

  insert into public.navy_parcel_secrets (parcel_id, withdraw_code) values (p_id, v_wcode);
  perform public.navy_log(p_id, 'client', 'commande',
                          case p_payment_method when 'especes' then 'Espèces au dépôt' else 'Orange Money' end);
  perform public.navy_notify(p_id, array[public.navy_partner_user(d.id)], 'Colis ' || v_code || ' : à recevoir au dépôt',
                             '/navy/epicier/colis');
  return jsonb_build_object('id', p_id, 'code', v_code, 'withdraw_code', v_wcode, 'replay', false);
end;
$$;

-- Sender: Orange Money reference received by SMS. Idempotent on the client id.
create or replace function public.navy_submit_payment_reference(p_id uuid, p_parcel_id uuid, p_reference text)
returns public.navy_parcels
language plpgsql security definer set search_path = public as $$
declare
  p public.navy_parcels;
  v_ref text := upper(btrim(coalesce(p_reference, '')));
begin
  select * into p from public.navy_parcels where id = p_parcel_id and sender_id = auth.uid() for update;
  if auth.uid() is null or not found then
    raise exception 'navy_submit_payment_reference: own parcel only' using errcode = '42501';
  end if;
  if exists (select 1 from public.navy_parcel_payments where id = p_id) then
    return p;   -- replay
  end if;
  if p.payment_method <> 'orange_money' or p.status = 'annule'
     or p.payment_status not in ('attente_reference', 'refuse') then
    raise exception 'navy_submit_payment_reference: not expected now' using errcode = '22023';
  end if;
  if length(v_ref) not between 4 and 40 then
    raise exception 'navy_submit_payment_reference: invalid reference' using errcode = '22023';
  end if;
  insert into public.navy_parcel_payments (id, parcel_id, reference, amount, submitted_by)
  values (p_id, p.id, v_ref, (select total_price from public.navy_parcel_prices where parcel_id = p.id), auth.uid());
  update public.navy_parcels set payment_status = 'a_verifier', payment_refusal_reason = null, updated_at = now()
   where id = p.id returning * into p;
  perform public.navy_log(p.id, 'client', 'reference_orange_money');
  perform public.navy_notify(p.id, public.navy_operator_ids(), 'Colis ' || p.code || ' : paiement à vérifier',
                             '/navy/operatrice/paiements');
  return p;
end;
$$;

-- Operator: validate or refuse an Orange Money reference. Idempotent.
create or replace function public.navy_decide_payment(p_payment_id uuid, p_decision text, p_reason text default null)
returns public.navy_parcels
language plpgsql security definer set search_path = public as $$
declare
  pay public.navy_parcel_payments;
  p public.navy_parcels;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not public.navy_is_operator() then
    raise exception 'navy_decide_payment: operator only' using errcode = '42501';
  end if;
  if p_decision not in ('valider', 'refuser') then
    raise exception 'navy_decide_payment: invalid decision' using errcode = '22023';
  end if;
  select * into pay from public.navy_parcel_payments where id = p_payment_id;
  if not found then
    raise exception 'navy_decide_payment: unknown payment' using errcode = 'P0002';
  end if;
  select * into p from public.navy_parcels where id = pay.parcel_id for update;
  select * into pay from public.navy_parcel_payments where id = p_payment_id for update;
  if pay.status = (case p_decision when 'valider' then 'valide' else 'refuse' end) then
    return p;   -- replay
  end if;
  if pay.status <> 'a_verifier' or p.payment_status <> 'a_verifier' then
    raise exception 'navy_decide_payment: not waiting for a decision' using errcode = '22023';
  end if;
  if p_decision = 'refuser' and v_reason is null then
    raise exception 'navy_decide_payment: reason required' using errcode = '22023';
  end if;
  update public.navy_parcel_payments
     set status = case p_decision when 'valider' then 'valide' else 'refuse' end,
         reason = v_reason, decided_by = auth.uid(), decided_at = now()
   where id = pay.id;
  if p_decision = 'valider' then
    update public.navy_parcels set payment_status = 'paye', paid_at = now(), updated_at = now()
     where id = p.id returning * into p;
    perform public.navy_log(p.id, 'operatrice', 'paiement_valide');
    perform public.navy_notify(p.id, array[p.sender_id], 'Colis ' || p.code || ' : paiement confirmé', '/navy/colis/' || p.id);
    perform public.navy_dispatch(p.id);
  else
    update public.navy_parcels set payment_status = 'refuse', payment_refusal_reason = v_reason, updated_at = now()
     where id = p.id returning * into p;
    perform public.navy_log(p.id, 'operatrice', 'paiement_refuse', v_reason);
    perform public.navy_notify(p.id, array[p.sender_id], 'Colis ' || p.code || ' : paiement non reconnu', '/navy/colis/' || p.id);
  end if;
  select * into p from public.navy_parcels where id = p.id;
  return p;
end;
$$;

-- Depot grocer: the parcel is dropped (closed in front of me; cash collected if cash).
-- The driver search starts here when the payment is acquired. Idempotent.
create or replace function public.navy_deposit_parcel(p_parcel_id uuid, p_sealed boolean, p_cash_collected boolean)
returns public.navy_parcels
language plpgsql security definer set search_path = public as $$
declare
  p public.navy_parcels;
begin
  select * into p from public.navy_parcels where id = p_parcel_id for update;
  if not found or not public.navy_owns_partner(p.depot_partner_id) then
    raise exception 'navy_deposit_parcel: depot grocer only' using errcode = '42501';
  end if;
  if p.deposited_at is not null and p.status <> 'annule' then
    return p;   -- replay
  end if;
  if p.status <> 'commande' then
    raise exception 'navy_deposit_parcel: not allowed from %', p.status using errcode = '22023';
  end if;
  if not coalesce(p_sealed, false) then
    raise exception 'navy_deposit_parcel: parcel must be closed in front of the grocer' using errcode = '22023';
  end if;
  if p.payment_method = 'especes' and not coalesce(p_cash_collected, false) then
    raise exception 'navy_deposit_parcel: cash must be collected' using errcode = '22023';
  end if;
  update public.navy_parcels
     set status = 'depose', deposited_at = now(), sealed_confirmed = true,
         cash_collected_at = case when payment_method = 'especes' then now() else cash_collected_at end,
         payment_status = case when payment_method = 'especes' then 'paye' else payment_status end,
         paid_at = case when payment_method = 'especes' then now() else paid_at end,
         updated_at = now()
   where id = p.id returning * into p;
  perform public.navy_log(p.id, 'epicier', 'depose',
                          case when p.payment_method = 'especes' then 'Refermé devant l''épicier, espèces encaissées'
                               else 'Refermé devant l''épicier' end);
  perform public.navy_notify(p.id, array[p.sender_id, p.recipient_user_id], 'Colis ' || p.code || ' : déposé à l''épicerie',
                             '/navy/colis/' || p.id);
  perform public.navy_dispatch(p.id);
  select * into p from public.navy_parcels where id = p.id;
  return p;
end;
$$;

-- Driver: accept an offer addressed to him, before its deadline. Network required.
create or replace function public.navy_accept_offer(p_offer_id uuid)
returns public.navy_parcels
language plpgsql security definer set search_path = public as $$
declare
  v_parcel_id uuid;
  o public.navy_parcel_offers;
  p public.navy_parcels;
  dr public.navy_partners;
begin
  select parcel_id into v_parcel_id from public.navy_parcel_offers where id = p_offer_id;
  if auth.uid() is null or v_parcel_id is null then
    raise exception 'navy_accept_offer: unknown offer' using errcode = '42501';
  end if;
  select * into p from public.navy_parcels where id = v_parcel_id for update;
  select * into o from public.navy_parcel_offers where id = p_offer_id for update;
  if o.driver_user_id <> auth.uid() then
    raise exception 'navy_accept_offer: offer not addressed to you' using errcode = '42501';
  end if;
  if o.status = 'acceptee' then
    return p;   -- replay
  end if;
  if o.status <> 'envoyee' or o.expires_at <= now() then
    raise exception 'navy_accept_offer: offer expired' using errcode = '22023';
  end if;
  if p.status <> 'depose' then
    update public.navy_parcel_offers set status = 'annulee', answered_at = now() where id = o.id;
    raise exception 'navy_accept_offer: parcel no longer available' using errcode = '22023';
  end if;
  select * into dr from public.navy_partners where id = o.driver_partner_id and status = 'approved';
  if not found then
    raise exception 'navy_accept_offer: driver not approved' using errcode = '42501';
  end if;
  update public.navy_parcel_offers set status = 'acceptee', answered_at = now() where id = o.id;
  update public.navy_parcel_offers set status = 'annulee', answered_at = now()
   where parcel_id = p.id and id <> o.id and status = 'envoyee';
  update public.navy_parcels
     set status = 'chauffeur_trouve', search_state = 'trouve', driver_found_at = now(),
         driver_partner_id = dr.id, driver_user_id = dr.user_id, driver_name = dr.display_name, driver_phone = dr.phone,
         driver_vehicle = dr.vehicle_type, driver_plate = dr.vehicle_plate, driver_fare = o.fare, updated_at = now()
   where id = p.id returning * into p;
  -- Driver cheaper than the ceiling paid by the client: the difference is owed to him.
  update public.navy_parcel_prices
     set credit_due = greatest(transport_ceiling - o.fare, 0),
         credit_reason = case when transport_ceiling > o.fare then 'Chauffeur moins cher que le prix payé' end
   where parcel_id = p.id;
  perform public.navy_log(p.id, 'chauffeur', 'chauffeur_trouve', dr.display_name);
  perform public.navy_notify(p.id, array[p.sender_id, p.recipient_user_id, public.navy_partner_user(p.depot_partner_id)],
                             'Colis ' || p.code || ' : chauffeur trouvé', '/navy/colis/' || p.id);
  return p;
end;
$$;

-- Driver: refuse an offer → next driver at once.
create or replace function public.navy_refuse_offer(p_offer_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_parcel_id uuid;
  o public.navy_parcel_offers;
begin
  select parcel_id into v_parcel_id from public.navy_parcel_offers where id = p_offer_id;
  if auth.uid() is null or v_parcel_id is null then
    raise exception 'navy_refuse_offer: unknown offer' using errcode = '42501';
  end if;
  perform 1 from public.navy_parcels where id = v_parcel_id for update;
  select * into o from public.navy_parcel_offers where id = p_offer_id for update;
  if o.driver_user_id <> auth.uid() then
    raise exception 'navy_refuse_offer: offer not addressed to you' using errcode = '42501';
  end if;
  if o.status <> 'envoyee' then
    return;
  end if;
  update public.navy_parcel_offers set status = 'refusee', answered_at = now() where id = o.id;
  perform public.navy_log(o.parcel_id, 'chauffeur', 'offre_refusee');
  perform public.navy_dispatch(o.parcel_id);
end;
$$;

-- Depot grocer: hands the parcel to the expected driver (chosen or QR scanned).
-- First half of the double confirmation. Idempotent.
create or replace function public.navy_handover_grocer(p_parcel_id uuid, p_driver_partner_id uuid)
returns public.navy_parcels
language plpgsql security definer set search_path = public as $$
declare
  p public.navy_parcels;
begin
  select * into p from public.navy_parcels where id = p_parcel_id for update;
  if not found or not public.navy_owns_partner(p.depot_partner_id) then
    raise exception 'navy_handover_grocer: depot grocer only' using errcode = '42501';
  end if;
  if p.status = 'pris_en_charge' or (p.status = 'chauffeur_trouve' and p.handover_grocer_at is not null) then
    return p;   -- replay
  end if;
  if p.status <> 'chauffeur_trouve' then
    raise exception 'navy_handover_grocer: not allowed from %', p.status using errcode = '22023';
  end if;
  if p_driver_partner_id is distinct from p.driver_partner_id then
    raise exception 'navy_handover_grocer: this is not the expected driver' using errcode = '22023';
  end if;
  update public.navy_parcels set handover_grocer_at = now(), updated_at = now() where id = p.id;
  perform public.navy_log(p.id, 'epicier', 'remis_au_chauffeur', 'En attente de la confirmation du chauffeur');
  perform public.navy_notify(p.id, array[p.driver_user_id], 'Colis ' || p.code || ' : confirmez la prise en charge', '/navy/courses');
  perform public.navy_complete_handover(p.id);
  select * into p from public.navy_parcels where id = p.id;
  return p;
end;
$$;

-- Driver: confirms he has the parcel. Second half; only after the grocer's gesture.
create or replace function public.navy_handover_driver(p_parcel_id uuid)
returns public.navy_parcels
language plpgsql security definer set search_path = public as $$
declare
  p public.navy_parcels;
begin
  select * into p from public.navy_parcels where id = p_parcel_id for update;
  if not found or auth.uid() is null or p.driver_user_id is distinct from auth.uid() then
    raise exception 'navy_handover_driver: own course only' using errcode = '42501';
  end if;
  if p.status = 'pris_en_charge' or (p.status = 'chauffeur_trouve' and p.handover_driver_at is not null) then
    return p;   -- replay
  end if;
  if p.status <> 'chauffeur_trouve' then
    raise exception 'navy_handover_driver: not allowed from %', p.status using errcode = '22023';
  end if;
  if p.handover_grocer_at is null then
    raise exception 'navy_handover_driver: the grocer must hand the parcel over first' using errcode = '22023';
  end if;
  update public.navy_parcels set handover_driver_at = now(), updated_at = now() where id = p.id;
  perform public.navy_log(p.id, 'chauffeur', 'prise_en_charge_confirmee');
  perform public.navy_complete_handover(p.id);
  select * into p from public.navy_parcels where id = p.id;
  return p;
end;
$$;

-- Arrival grocer: parcel received (identified by its 4-digit code). Idempotent.
create or replace function public.navy_receive_parcel(p_parcel_id uuid, p_code text)
returns public.navy_parcels
language plpgsql security definer set search_path = public as $$
declare
  p public.navy_parcels;
begin
  select * into p from public.navy_parcels where id = p_parcel_id for update;
  if not found or not public.navy_owns_partner(p.arrival_partner_id) then
    raise exception 'navy_receive_parcel: arrival grocer only' using errcode = '42501';
  end if;
  if p.status in ('arrive', 'retire') then
    return p;   -- replay
  end if;
  if p.status <> 'pris_en_charge' then
    raise exception 'navy_receive_parcel: not allowed from %', p.status using errcode = '22023';
  end if;
  if btrim(coalesce(p_code, '')) <> p.code then
    raise exception 'navy_receive_parcel: wrong parcel code' using errcode = '22023';
  end if;
  update public.navy_parcels set status = 'arrive', arrived_at = now(), updated_at = now() where id = p.id returning * into p;
  perform public.navy_log(p.id, 'epicier', 'arrive');
  perform public.navy_notify(p.id, array[p.sender_id, p.recipient_user_id], 'Colis ' || p.code || ' : arrivé, prêt à retirer',
                             '/navy/colis/' || p.id);
  return p;
end;
$$;

-- Arrival grocer: types the withdrawal code given by the recipient. Checked HERE; a
-- wrong code is counted (not an exception, so that the count is kept), 5 → blocked.
create or replace function public.navy_withdraw_parcel(p_parcel_id uuid, p_withdraw_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  p public.navy_parcels;
  v_code text;
begin
  select * into p from public.navy_parcels where id = p_parcel_id for update;
  if not found or not public.navy_owns_partner(p.arrival_partner_id) then
    raise exception 'navy_withdraw_parcel: arrival grocer only' using errcode = '42501';
  end if;
  if p.status = 'retire' then
    return jsonb_build_object('ok', true, 'already', true);
  end if;
  if p.status <> 'arrive' then
    raise exception 'navy_withdraw_parcel: not allowed from %', p.status using errcode = '22023';
  end if;
  if p.withdraw_blocked_at is not null then
    return jsonb_build_object('ok', false, 'blocked', true, 'remaining', 0);
  end if;
  select withdraw_code into v_code from public.navy_parcel_secrets where parcel_id = p.id;
  if v_code is null or btrim(coalesce(p_withdraw_code, '')) <> v_code then
    update public.navy_parcels
       set withdraw_attempts = withdraw_attempts + 1,
           withdraw_blocked_at = case when withdraw_attempts + 1 >= 5 then now() end,
           updated_at = now()
     where id = p.id returning * into p;
    perform public.navy_log(p.id, 'epicier', 'code_retrait_faux', 'Essai ' || p.withdraw_attempts || ' sur 5');
    if p.withdraw_blocked_at is not null then
      perform public.navy_log(p.id, 'systeme', 'code_retrait_bloque');
      perform public.navy_notify(p.id, public.navy_operator_ids(), 'Colis ' || p.code || ' : code de retrait bloqué',
                                 '/navy/operatrice/colis');
    end if;
    return jsonb_build_object('ok', false, 'blocked', p.withdraw_blocked_at is not null,
                              'remaining', greatest(5 - p.withdraw_attempts, 0));
  end if;
  update public.navy_parcels set status = 'retire', withdrawn_at = now(), updated_at = now() where id = p.id returning * into p;
  perform public.navy_log(p.id, 'epicier', 'retire');
  perform public.navy_notify(p.id, array[p.sender_id, p.recipient_user_id, p.driver_user_id],
                             'Colis ' || p.code || ' : livré', '/navy/colis/' || p.id);
  return jsonb_build_object('ok', true);
end;
$$;

-- Operator: unblock the withdrawal code after 5 wrong attempts.
create or replace function public.navy_unblock_withdraw(p_parcel_id uuid)
returns public.navy_parcels
language plpgsql security definer set search_path = public as $$
declare
  p public.navy_parcels;
begin
  if not public.navy_is_operator() then
    raise exception 'navy_unblock_withdraw: operator only' using errcode = '42501';
  end if;
  update public.navy_parcels set withdraw_attempts = 0, withdraw_blocked_at = null, updated_at = now()
   where id = p_parcel_id returning * into p;
  if not found then
    raise exception 'navy_unblock_withdraw: unknown parcel' using errcode = 'P0002';
  end if;
  perform public.navy_log(p.id, 'operatrice', 'code_retrait_debloque');
  return p;
end;
$$;

-- Cancel: the sender while not dropped; an operator while not picked up. A payment
-- already acquired becomes a credit owed to the client (no cash refund).
create or replace function public.navy_cancel_parcel(p_parcel_id uuid, p_reason text default null)
returns public.navy_parcels
language plpgsql security definer set search_path = public as $$
declare
  p public.navy_parcels;
  v_op boolean := public.navy_is_operator();
  v_role text;
begin
  select * into p from public.navy_parcels where id = p_parcel_id for update;
  if not found or auth.uid() is null or (p.sender_id <> auth.uid() and not v_op) then
    raise exception 'navy_cancel_parcel: sender or operator only' using errcode = '42501';
  end if;
  if p.status = 'annule' then
    return p;   -- replay
  end if;
  if p.sender_id = auth.uid() and p.status = 'commande' then
    v_role := 'client';
  elsif v_op and p.status in ('commande', 'depose', 'chauffeur_trouve') then
    v_role := 'operatrice';
  else
    raise exception 'navy_cancel_parcel: too late (%)', p.status using errcode = '22023';
  end if;
  update public.navy_parcel_offers set status = 'annulee', answered_at = now() where parcel_id = p.id and status = 'envoyee';
  if p.payment_status = 'paye' then
    update public.navy_parcel_prices set credit_due = total_price, credit_reason = 'Colis annulé après paiement'
     where parcel_id = p.id;
  end if;
  update public.navy_parcels
     set status = 'annule', cancelled_at = now(), cancelled_by = auth.uid(),
         cancel_reason = nullif(btrim(coalesce(p_reason, '')), ''), search_state = null, updated_at = now()
   where id = p.id returning * into p;
  perform public.navy_log(p.id, v_role, 'annule', p.cancel_reason);
  perform public.navy_notify(p.id, array[p.sender_id, public.navy_partner_user(p.depot_partner_id), p.driver_user_id],
                             'Colis ' || p.code || ' : annulé', '/navy/colis/' || p.id);
  return p;
end;
$$;

-- Sender ("Je choisis" mode, the next drivers are more expensive): choose another
-- driver among the eligible ones, or switch to "Automatique" (p_driver = null).
create or replace function public.navy_choose_driver(p_parcel_id uuid, p_driver uuid)
returns public.navy_parcels
language plpgsql security definer set search_path = public as $$
declare
  p public.navy_parcels;
  v_fare integer;
begin
  select * into p from public.navy_parcels where id = p_parcel_id for update;
  if not found or auth.uid() is null or p.sender_id <> auth.uid() then
    raise exception 'navy_choose_driver: own parcel only' using errcode = '42501';
  end if;
  if p.status not in ('commande', 'depose') then
    raise exception 'navy_choose_driver: not allowed from %', p.status using errcode = '22023';
  end if;
  if p_driver is null then
    update public.navy_parcels set driver_mode = 'auto', chosen_driver_id = null, chosen_fare = null,
           search_state = case when search_state = 'attente_client' then 'recherche' else search_state end, updated_at = now()
     where id = p.id;
    perform public.navy_log(p.id, 'client', 'mode_automatique');
  else
    select e.fare into v_fare
      from public.navy_eligible_drivers(p.arrival_zone_id, p.distance_km,
                                        (select transport_ceiling from public.navy_parcel_prices where parcel_id = p.id)) e
     where e.partner_id = p_driver;
    if v_fare is null then
      raise exception 'navy_choose_driver: driver not available' using errcode = '22023';
    end if;
    update public.navy_parcels set driver_mode = 'choix', chosen_driver_id = p_driver, chosen_fare = v_fare,
           search_state = case when search_state = 'attente_client' then 'recherche' else search_state end,
           search_round = case when search_state = 'attente_client' then search_round + 1 else search_round end,
           updated_at = now()
     where id = p.id;
    perform public.navy_log(p.id, 'client', 'chauffeur_choisi');
  end if;
  perform public.navy_dispatch(p.id);
  select * into p from public.navy_parcels where id = p.id;
  return p;
end;
$$;

-- Eligible drivers of a parcel right now (sender, for the choice above; operators).
create or replace function public.navy_parcel_drivers(p_parcel_id uuid)
returns table (partner_id uuid, name text, vehicle_type text, fare integer, dest_zone_id uuid)
language plpgsql stable security definer set search_path = public as $$
declare
  p public.navy_parcels;
begin
  select * into p from public.navy_parcels where id = p_parcel_id;
  if not found or auth.uid() is null or (p.sender_id <> auth.uid() and not public.navy_is_operator()) then
    raise exception 'navy_parcel_drivers: own parcel only' using errcode = '42501';
  end if;
  return query
    select e.partner_id, e.name, e.vehicle_type, e.fare, e.dest_zone_id
      from public.navy_eligible_drivers(p.arrival_zone_id, p.distance_km,
                                        (select transport_ceiling from public.navy_parcel_prices where parcel_id = p.id)) e;
end;
$$;

-- Operator: relaunch the driver search now (new round).
create or replace function public.navy_relaunch_offers(p_parcel_id uuid)
returns public.navy_parcels
language plpgsql security definer set search_path = public as $$
declare
  p public.navy_parcels;
begin
  if not public.navy_is_operator() then
    raise exception 'navy_relaunch_offers: operator only' using errcode = '42501';
  end if;
  select * into p from public.navy_parcels where id = p_parcel_id for update;
  if not found or p.status <> 'depose' or p.payment_status <> 'paye' then
    raise exception 'navy_relaunch_offers: parcel is not waiting for a driver' using errcode = '22023';
  end if;
  update public.navy_parcel_offers set status = 'annulee', answered_at = now() where parcel_id = p.id and status = 'envoyee';
  update public.navy_parcels
     set search_state = 'recherche', search_round = search_round + 1, next_relaunch_at = now() + interval '5 minutes',
         search_started_at = coalesce(search_started_at, now()), updated_at = now()
   where id = p.id;
  perform public.navy_log(p.id, 'operatrice', 'relance_chauffeurs');
  perform public.navy_dispatch(p.id);
  select * into p from public.navy_parcels where id = p.id;
  return p;
end;
$$;

-- Operator: not collected for more than 7 days → "retour à organiser" (billed return in 2B).
create or replace function public.navy_mark_return(p_parcel_id uuid)
returns public.navy_parcels
language plpgsql security definer set search_path = public as $$
declare
  p public.navy_parcels;
begin
  if not public.navy_is_operator() then
    raise exception 'navy_mark_return: operator only' using errcode = '42501';
  end if;
  select * into p from public.navy_parcels where id = p_parcel_id for update;
  if not found or p.status <> 'arrive' then
    raise exception 'navy_mark_return: parcel not waiting at the arrival grocer' using errcode = '22023';
  end if;
  if p.return_status = 'a_organiser' then
    return p;
  end if;
  if p.arrived_at > now() - interval '7 days' then
    raise exception 'navy_mark_return: only after 7 days' using errcode = '22023';
  end if;
  update public.navy_parcels set return_status = 'a_organiser', updated_at = now() where id = p.id returning * into p;
  perform public.navy_log(p.id, 'operatrice', 'retour_a_organiser');
  perform public.navy_notify(p.id, array[p.sender_id], 'Colis ' || p.code || ' : retour à organiser', '/navy/colis/' || p.id);
  return p;
end;
$$;

-- Depot grocer: cash amount to collect for a parcel paid in cash (the full price
-- breakdown stays sender + operators only).
create or replace function public.navy_cash_due(p_parcel_ids uuid[])
returns table (parcel_id uuid, amount integer)
language sql stable security definer set search_path = public as $$
  select p.id, pr.total_price
    from public.navy_parcels p join public.navy_parcel_prices pr on pr.parcel_id = p.id
   where p.id = any(coalesce(p_parcel_ids, array[]::uuid[]))
     and p.payment_method = 'especes'
     and public.navy_owns_partner(p.depot_partner_id);
$$;

-- Driver: his live offers with the time left computed by the SERVER clock (a phone clock
-- a few seconds off would otherwise show a wrong countdown).
create or replace function public.navy_my_offers()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(o) || jsonb_build_object('seconds_left', round(extract(epoch from o.expires_at - now())::numeric, 1))
                            order by o.expires_at), '[]'::jsonb)
    from public.navy_parcel_offers o
   where auth.uid() is not null and o.driver_user_id = auth.uid()
     and o.status = 'envoyee' and o.expires_at > now();
$$;

-- -------------------------------------------------------------------------------------
-- 8. Function privileges (P7: EXECUTE is granted to anon explicitly by default)
-- -------------------------------------------------------------------------------------
revoke execute on function public.navy_estimated_km(float8, float8, float8, float8) from public, anon;
revoke execute on function public.navy_fare(numeric, integer, integer) from public, anon;
revoke execute on function public.navy_price_breakdown(integer, integer, integer, integer) from public, anon;
revoke execute on function public.navy_phone_key(text) from public, anon;
revoke execute on function public.navy_owns_partner(uuid) from public, anon;
revoke execute on function public.navy_can_see_parcel(uuid) from public, anon;
revoke execute on function public.navy_is_parcel_sender(uuid) from public, anon;
revoke execute on function public.navy_is_parcel_party(uuid) from public, anon;
revoke execute on function public.navy_operator_ids() from public, anon, authenticated;
revoke execute on function public.navy_partner_user(uuid) from public, anon, authenticated;
revoke execute on function public.navy_notify(uuid, uuid[], text, text) from public, anon, authenticated;
revoke execute on function public.navy_log(uuid, text, text, text) from public, anon, authenticated;
revoke execute on function public.navy_eligible_drivers(uuid, numeric, integer) from public, anon, authenticated;
revoke execute on function public.navy_dispatch(uuid) from public, anon, authenticated;
revoke execute on function public.navy_complete_handover(uuid) from public, anon, authenticated;
revoke execute on function public.navy_tick() from public, anon, authenticated;
revoke execute on function public.navy_compute_quote(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.navy_open_grocers() from public, anon;
revoke execute on function public.navy_quote(uuid, uuid) from public, anon;
revoke execute on function public.navy_create_parcel(uuid, uuid, uuid, text, text, text, integer, text, uuid, text) from public, anon;
revoke execute on function public.navy_submit_payment_reference(uuid, uuid, text) from public, anon;
revoke execute on function public.navy_decide_payment(uuid, text, text) from public, anon;
revoke execute on function public.navy_deposit_parcel(uuid, boolean, boolean) from public, anon;
revoke execute on function public.navy_accept_offer(uuid) from public, anon;
revoke execute on function public.navy_refuse_offer(uuid) from public, anon;
revoke execute on function public.navy_handover_grocer(uuid, uuid) from public, anon;
revoke execute on function public.navy_handover_driver(uuid) from public, anon;
revoke execute on function public.navy_receive_parcel(uuid, text) from public, anon;
revoke execute on function public.navy_withdraw_parcel(uuid, text) from public, anon;
revoke execute on function public.navy_unblock_withdraw(uuid) from public, anon;
revoke execute on function public.navy_cancel_parcel(uuid, text) from public, anon;
revoke execute on function public.navy_choose_driver(uuid, uuid) from public, anon;
revoke execute on function public.navy_parcel_drivers(uuid) from public, anon;
revoke execute on function public.navy_relaunch_offers(uuid) from public, anon;
revoke execute on function public.navy_mark_return(uuid) from public, anon;
revoke execute on function public.navy_cash_due(uuid[]) from public, anon;
revoke execute on function public.navy_my_offers() from public, anon;

grant execute on function public.navy_estimated_km(float8, float8, float8, float8) to authenticated;
grant execute on function public.navy_fare(numeric, integer, integer) to authenticated;
grant execute on function public.navy_price_breakdown(integer, integer, integer, integer) to authenticated;
grant execute on function public.navy_phone_key(text) to authenticated;
grant execute on function public.navy_owns_partner(uuid) to authenticated;
grant execute on function public.navy_can_see_parcel(uuid) to authenticated;
grant execute on function public.navy_is_parcel_sender(uuid) to authenticated;
grant execute on function public.navy_is_parcel_party(uuid) to authenticated;
grant execute on function public.navy_open_grocers() to authenticated;
grant execute on function public.navy_quote(uuid, uuid) to authenticated;
grant execute on function public.navy_create_parcel(uuid, uuid, uuid, text, text, text, integer, text, uuid, text) to authenticated;
grant execute on function public.navy_submit_payment_reference(uuid, uuid, text) to authenticated;
grant execute on function public.navy_decide_payment(uuid, text, text) to authenticated;
grant execute on function public.navy_deposit_parcel(uuid, boolean, boolean) to authenticated;
grant execute on function public.navy_accept_offer(uuid) to authenticated;
grant execute on function public.navy_refuse_offer(uuid) to authenticated;
grant execute on function public.navy_handover_grocer(uuid, uuid) to authenticated;
grant execute on function public.navy_handover_driver(uuid) to authenticated;
grant execute on function public.navy_receive_parcel(uuid, text) to authenticated;
grant execute on function public.navy_withdraw_parcel(uuid, text) to authenticated;
grant execute on function public.navy_unblock_withdraw(uuid) to authenticated;
grant execute on function public.navy_cancel_parcel(uuid, text) to authenticated;
grant execute on function public.navy_choose_driver(uuid, uuid) to authenticated;
grant execute on function public.navy_parcel_drivers(uuid) to authenticated;
grant execute on function public.navy_relaunch_offers(uuid) to authenticated;
grant execute on function public.navy_mark_return(uuid) to authenticated;
grant execute on function public.navy_cash_due(uuid[]) to authenticated;
grant execute on function public.navy_my_offers() to authenticated;

-- -------------------------------------------------------------------------------------
-- 9. Server clock: pg_cron every 10 seconds (replaces a job of the same name).
-- -------------------------------------------------------------------------------------
select cron.schedule('navy-tick', '10 seconds', 'select public.navy_tick()');

comment on table public.navy_parcels is
  'NAVY ay parcels (phase 2A). State changes ONLY through navy_* SECURITY DEFINER functions. Amounts in navy_parcel_prices (sender + operators), withdrawal code in navy_parcel_secrets (sender + linked recipient only).';
comment on table public.navy_parcel_secrets is
  'Withdrawal code of a parcel: readable by the sender and the linked recipient ONLY; checked server-side by navy_withdraw_parcel (5 attempts).';

notify pgrst, 'reload schema';
```

## Fichiers

**Créés** (`frontend/src/modules/navy-ay/`)
- `types/parcel.ts` ; `utils/parcelRules.ts` (+ `parcelRules.test.ts`) ; `services/parcelService.ts`
- `components/NavyParcelSync.tsx`
- `components/parcel/` : `SendParcelPage`, `GrocerPicker`, `MyParcelsPage`, `ParcelDetailPage`, `GrocerParcelsPage`, `DriverOffersPage`, `DriverCoursesPage`, `ParcelUi`
- `components/operator/OperatorParcelsPage.tsx`, `OperatorPaymentsPage.tsx`
- `supabase/migrations/20260926200000_navy_ay_phase_2a_colis.sql`

**Modifiés dans le module**
- `NavyRoutes.tsx` (9 routes), `NavyHeaderParts.tsx` (icônes, pastilles), `NavyHomePage.tsx` (« Envoyer un colis »)
- `map/NavyMap.tsx` (toucher une épicerie) ; `operator/OperatorSettingsPage.tsx` (part CyberKELY, Orange Money, lien Zones)
- `partner/DriverDirectionPage.tsx` (demande de notifications) ; `partner/PartnerRequestPage.tsx` (report 1B)
- `context/useNavyRoles.ts` (pastilles par écran) ; `db/navyDb.ts` (version 2, additive)
- `services/partnerService.ts` (réconciliation, report 1B), `services/operatorService.ts`
- `types/partner.ts`, `utils/partnerRules.ts` (+ test : barres par rôle)

**Modifiés, fichiers partagés ⚠️** (ajouts conditionnés à NAVY)
- `components/Navigation/BottomNav.tsx` : 5 icônes ajoutées, et la pastille NAVY lit un dictionnaire par chemin au lieu du seul chemin « Demandes ». Rien d'autre.
- `constants/appVersion.ts`, `package.json` (3.84.0 → 3.84.2) ; `FONCTIONNEMENT-MODULES.md` (section « Phase 2A »).
- Header, AppLayout, `sw-custom.ts` et `constants/index.ts` : **non touchés**.

**Non commités exprès**
- `PROCEDURES-OUTILS.md` (P19 à P21 ajoutés après les commits) et ce rapport.
- `RAPPORT-PHASE-2-BIS.md` (SMS), déjà modifié avant la session.

**Dépendances ajoutées :** aucune. `html5-qrcode`, `leaflet` et `dexie` étaient déjà là.

## Écarts au prompt

- **Trois commits au lieu d'un + un correctif** : le chantier (3.84.0), puis deux correctifs de défauts **vus seulement en production** :
  - 3.84.1 : compte à rebours sur l'horloge du serveur, et gain de l'épicier ;
  - 3.84.2 : trois finitions d'affichage.
  - J'ai préféré livrer ces finitions plutôt que les laisser en production.
- **Rattachement du destinataire** : seulement par le téléphone d'un partenaire **validé**, et non par tout compte portant ce numéro. C'est une correction de sécurité (voir plus haut). Un simple client sans fiche partenaire ne voit donc pas encore « À recevoir » : il faudra un téléphone vérifié par SMS (phase 1C).
- **« Paiement à vérifier »** est un **état de paiement** distinct de l'état du colis. Un colis peut ainsi être déposé pendant que l'opératrice vérifie la référence, et aucune offre ne part avant sa validation.
- **Barre de l'opératrice** : Colis, Paiements, Demandes, Partenaires, Chauffeurs, Réglages (6). **Zones** s'ouvre depuis Réglages ; sa route est inchangée.
- **Épicier : montant à encaisser.** L'épicier de départ lit le montant à encaisser en espèces par une fonction dédiée (`navy_cash_due`), sans accès au reste des prix.
- **Double confirmation dans l'ordre** : l'épicier d'abord, puis le chauffeur (le chauffeur seul est refusé).
- **Validation locale impossible** avec une vraie session (localhost sans session). Tout a été prouvé en production.
- **SQL exécuté par l'outil Supabase relié au projet**, comme aux phases précédentes.

## Surprises

- 🔴 **Faille préexistante, toute l'application** : `users.phone` et `users.created_at` sont modifiables par le compte lui-même. Le déclencheur `users_role_guard` ne protège que `role`. NAVY en est protégé depuis cette phase, mais **toute future fonction qui ferait confiance à `users.phone` serait exposée**. À traiter comme `role` (déclencheur de protection).
- L'onglet de test a été refermé une fois (Chrome ou JOEL), et l'extension s'est déconnectée deux fois lors de micro-coupures réseau. Le parcours a repris sans perte.
- Le navigateur relié pendant la seconde moitié n'avait **pas** la permission de notification (« à demander ») ; les notifications de JOEL partent vers le navigateur déjà abonné (1 abonnement en base).
- Après un retrait réussi, le compteur d'essais faux reste à sa dernière valeur. C'est sans effet, puisque le colis est terminé.

## Ambiguïtés

- **« Aucun code dans les notifications »** : j'ai suivi l'exemple du prompt, qui inclut le **code colis** (« Colis 4821 : pris en charge ») : ce code est écrit sur le colis. Le **code de retrait**, lui, n'y figure jamais (vérifié).
- **Destinataire « avec un compte NAVY lié à son numéro »** : interprété comme un numéro **vérifié** (voir « Écarts »).
- **« Je choisis »** : le prix de référence pour « passer au suivant sans demander » est le prix du chauffeur choisi à la commande.
- **Annulation après paiement** : un colis payé en espèces puis annulé par l'opératrice donne lui aussi un **avoir**, comme pour Orange Money.
- **Sans réponse de personne**, la relance à 5 min repropose la course à tous les chauffeurs éligibles, y compris ceux qui avaient laissé passer l'offre.

## Liste de contrôle pour JOEL

1. **Notification (constat demandé)** : pendant les tests, entre 12 h 51 et 13 h 20, ton navigateur habituel a dû afficher des notifications en bas à droite de Windows : « **Colis 4683 : à recevoir au dépôt** », « Nouvelle course NAVY : 30 secondes pour accepter », « Colis 3892 : paiement à vérifier »… Dis-moi si tu les as vues (le serveur de push confirme 32 remises à ton abonnement).
2. Mettre à jour l'application ; Paramètres → Version : **3.84.2**.
3. **Sur téléphone** : NAVY ay → **Envoyer**. Vérifier à 360–412 px les 6 étapes, la carte des épiceries au doigt, puis le très gros code colis et le bouton « Copier le code de retrait ».
4. **Chauffeur, avec un vrai téléphone** : Direction → Disponible vers une zone. Depuis un autre compte, commander un colis vers cette zone. L'offre doit arriver en **notification**, écran verrouillé, et l'écran plein « 30 s » doit s'ouvrir en touchant la notification.
5. **Épicier** : scanner le **QR NAVY du chauffeur** avec « Scanner son QR » (caméra réelle).
6. **Mode avion réel** : commander, puis rétablir le réseau. La commande part seule, sans doublon.
7. Dans Réglages, saisir le **vrai numéro Orange Money de CyberKELY** quand tu veux ouvrir ce paiement.
8. Dessiner les **vraies zones** (Réglages → Zones), placer et faire vérifier la position des épiceries : sans zone d'arrivée, aucune commande n'est possible vers une épicerie.
9. iPhone : les notifications ne marchent qu'avec l'application installée sur l'écran d'accueil.

## Recommandations pour la phase 2B

- **Distance par la route** : remplacer seulement `navy_estimated_km` côté SQL et `estimatedKm` côté téléphone (fonctions uniques, testées).
- **Prix proposé par le client et filtre des offres basses** : le plafond est déjà un paramètre de `navy_eligible_drivers`, il suffira de le passer. La contre-proposition viendra ensuite.
- **Avoir** : `navy_parcel_prices.credit_due` est prêt. Il manque un solde d'avoir par client, et son imputation à la commande (côté serveur).
- **Téléphone vérifié par SMS (1C)** : cela ouvrira « À recevoir » à tous les clients, et protège `users.phone` par un déclencheur.
- **Couloir d'itinéraire** : aujourd'hui, seule la zone d'arrivée compte ; la zone de départ n'est pas prise en compte.
- **Temps réel** : l'écran Offres interroge toutes les 4 s ; un canal temps réel Supabase réduirait la latence et le réseau.
