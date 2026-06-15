# RAPPORT — Promoteur PHASE 1 : socle sécurité / RLS (module gestion-eau)

**Chantier :** SQL / RLS pur — aucun code applicatif, aucun build, aucun commit, aucun déploiement, aucun bump de version.
**Auteur :** Claude Code (SQL produit ET exécuté via le navigateur, RÈGLE #0ter).
**Projet Supabase :** `ofzmwrzatcztoekrpvkj` (bazarkely).

## Horodatage
- **Début :** 2026-06-08 ~23:55 (+03:00)
- **Fin :** 2026-06-09 00:37 (+03:00)
- **Durée :** ~40 min (dont chargement lent de l'éditeur SQL sur viewport étroit).

## `user_id` de test utilisés (vérifs en transaction `rollback`, rien persisté)
- **Promoteur (identité « pure », absente de `eau_roles`) :** `4f8e8501-a86a-4373-832d-4c5851c7d1f1`
  — choisi volontairement sans aucun rôle eau préexistant, pour que le SEUL accès mesuré provienne de la policy promoteur (pas d'un rôle releveur/client résiduel).
- **Releveur « pur » (non-régression) :** `7b54446b-20d4-4168-8054-2775c9ccb992` (`admin=false, releveur=true`).
- Méthode P8 : `set_config('request.jwt.claims', …, true)` + `set local role authenticated` + `rollback`. L'attribution `promoteur=true` au uid de test est faite DANS la transaction puis annulée (aucun utilisateur promoteur créé en base — conforme : l'attribution réelle viendra en Phase 2).

## Ce qui a été posé (idempotent)
1. `eau_roles.promoteur boolean not null default false` (`add column if not exists`).
2. `eau_is_promoteur()` — `security definer stable`, patron identique à `eau_is_admin()/eau_is_releveur()`, `grant execute … to public`.
3. **Une policy `SELECT` additive `<table>_sel_promoteur` `for select to public using (eau_is_promoteur())` par table `eau_*` présente.**
4. RPC `eau_set_alert_thresholds(numeric,numeric,numeric,int,numeric,numeric)` — `security definer`, garde interne `eau_is_admin() OR eau_is_promoteur()`, met à jour UNIQUEMENT les 6 colonnes de seuils de `eau_config` (`where id='singleton'`). `revoke … from public` **et `from anon`**, `grant … to authenticated`.

### Tables ayant reçu la policy `_sel_promoteur` (17/17 — toutes les tables `eau_*` présentes)
`eau_alertes, eau_annonces, eau_audit, eau_bilans, eau_comptes_client, eau_compteurs, eau_config, eau_debit_tests, eau_demandes_acces, eau_entrees_bassin, eau_factures, eau_invitations, eau_qr_compteur, eau_releves_bassin, eau_releves_compteur, eau_roles, eau_scans`
- **Aucune table `eau_*` ignorée.** Toutes les tables présentes au schéma `public` sont couvertes.

## Résultat des 5 vérifications

| # | Vérification | Résultat | Valeurs réelles |
|---|---|---|---|
| 1 | **Lecture read-all promoteur** | ✅ | promoteur voit : `eau_releves_bassin`=**33/33**, `eau_comptes_client`=**3/3**, `eau_bilans`=**9/9** (= totaux base). `eau_factures`=**0/0** (table vide). **Contraste décisif** : même uid SANS promoteur ne voit **0 partout** → c'est bien la policy promoteur qui ouvre l'accès. |
| 2 | **Écritures refusées** | ✅ | `update eau_releves_bassin` (33 lignes existantes) → **0 ligne** ; `update eau_config set tarif_m3` (1 ligne) → **0 ligne** ; `update eau_factures` → 0 (table vide) ; `insert into eau_releves_bassin` → **erreur `42501`** (violation RLS, aucune policy INSERT pour promoteur). |
| 3 | **RPC seuils OK** | ✅ | promoteur : `eau_set_alert_thresholds(8,50,null,null,null,null)` exécutée sans erreur ; `eau_config.seuil_pct` passe de **2 → 8** dans la transaction (puis rollback). |
| 4 | **Non-régression** | ✅ | releveur pur voit **0** facture (inchangé) ; la nouvelle policy promoteur est *fausse* pour lui → **aucun élargissement**. uid « pur » baseline = 0 partout. |
| 5 | **Idempotence** | ✅ | bloc DDL ré-exécuté intégralement → « Success » ; `policies_count`=**17**, `distinct_tables`=**17** (aucun doublon) ; ACL RPC inchangée. |

### Contrôle de persistance DDL (post-déploiement)
- `col_promoteur_exists`=true · `helper_exists`=true · `rpc_exists`=true · `policies_count`=17.
- **ACL RPC** = `postgres, authenticated, service_role` → **`anon` ET `public` correctement retirés**, `authenticated` accordé. (`service_role` toujours présent — non pertinent, il bypass la RLS côté serveur.)
- **ACL helper** `eau_is_promoteur()` inclut `public` (`=X/postgres`) — conforme (le helper est volontairement public).

## Surprises / écarts au prompt (assumés et documentés)
1. **`eau_invitations` absente du tableau codé en dur du §2.** La base contient 17 tables `eau_*` ; le tableau du prompt en listait 16 (oubli de `eau_invitations`, créée plus tard pour l'invitation WhatsApp). Pour honorer l'objectif explicite « le promoteur lit **TOUT** (toutes les tables `eau_*`) », la boucle a été rendue **dynamique** (`select tablename from pg_tables where … like 'eau\_%'`) plutôt qu'un tableau figé. Effet : couvre `eau_invitations` **et** tout futur ajout de table `eau_*`, sans maintenance. Idempotent (`drop policy if exists` + `create`).
2. **`revoke … from anon` ajouté à la RPC** (en plus de `from public`). Piège connu **P7** (`PROCEDURES-OUTILS.md`) : Supabase accorde `EXECUTE` explicitement à `anon`, qu'un `revoke from public` ne retire pas. Sans ce revoke, un appel anon passerait le contrôle d'accès Postgres (puis serait de toute façon rejeté par la garde interne `forbidden`, `auth.uid()` NULL) — mais le revoke explicite est la pratique correcte. Vérifié : `anon` absent de l'ACL.
3. **`eau_factures` est vide (0 ligne)** en prod actuellement. La lecture read-all et l'`update` de refus y sont donc « triviaux » sur cette table précise ; la preuve solide vient des tables non vides (`eau_releves_bassin` 33, `eau_comptes_client` 3, `eau_bilans` 9, `eau_config` 1). La policy `eau_factures_sel_promoteur` est bien posée (mécanisme identique aux autres) → le promoteur verra les factures dès qu'il y en aura.
4. **Type des clés :** `eau_roles.user_id` est `text`, `users.id` est `uuid` (cast `::text` requis pour les jointures de préflight). Cohérent avec les helpers existants (`auth.uid()::text == eau_roles.user_id`).

## Recommandations pour la Phase 2 (frontend)
- **Écran « Utilisateurs » (attribution du rôle promoteur) :** prévoir un toggle `promoteur` sur `eau_roles` (admin only). L'écriture devra passer par une RPC `security definer` réservée admin (le promoteur ne s'auto-attribue pas ; la RLS lui interdit déjà toute écriture directe sur `eau_roles`).
- **Réglage des seuils :** exposer un formulaire câblé sur `eau_set_alert_thresholds(p_seuil_pct, p_seuil_m3, p_seuil_aberrant_facteur, p_jours_sans_releve_alerte, p_bassin_seuil_critique_pct, p_debit_ecart_max_pct)`. Les 6 champs correspondent aux colonnes : `seuil_pct, seuil_m3, seuil_aberrant_facteur, jours_sans_releve_alerte, bassin_seuil_critique_pct, debit_ecart_max_pct`. Passer `null` pour « ne pas changer » (coalesce côté SQL). Accessible admin **et** promoteur.
- **Passer en lecture seule pour le promoteur** tous les écrans d'écriture eau (relevés, factures, config hors seuils, clients, invitations, annonces, audit) : la RLS refuse déjà les écritures (preuve ci-dessus), mais l'UI doit masquer/désactiver les boutons de mutation pour éviter des erreurs `42501` côté client. Le promoteur est un rôle **consultation globale + réglage des seuils**.
- **Helper front `eau_is_promoteur` :** ajouter un équivalent côté app (lecture du flag `promoteur` dans le rôle eau chargé) pour piloter l'affichage (dashboards globaux read-only, accès à toutes les factures/relevés/bilans).
- **Garde-fou :** un promoteur ne doit pas être traité comme admin (pas de gestion d'utilisateurs, pas d'édition de relevés). Distinguer clairement `admin` / `promoteur` dans le routing et les menus.

---
*Définition de TERMINÉ atteinte : (1) SQL exécuté et vérifié (read-all OK, écritures refusées, RPC seuils OK, non-régression OK, idempotence OK), (2) ce rapport écrit.*
