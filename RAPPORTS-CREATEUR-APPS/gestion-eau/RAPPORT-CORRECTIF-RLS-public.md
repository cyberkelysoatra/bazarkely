# Rapport — Correctif RLS module gestion-eau (`to authenticated` → `to public`)

**Date :** 2026-06-07 · **Session :** S85 · **Commit :** `bcf7ff6` (poussé sur `main`)

---

## 1. Incident

Lors d'actions normales du module gestion-eau (création de compte client, enregistrement de la config, journalisation d'audit), la console de production affichait en boucle :

```
POST .../rest/v1/eau_comptes_client ... 401 (Unauthorized)
⚠️ [eauSync] push eau_comptes_client échec: new row violates row-level security policy for table "eau_comptes_client"
```

Tables concernées observées : `eau_comptes_client`, `eau_config`, `eau_audit` (et par extension les 16 tables `eau_*`).

**Effet visible :** les données étaient bien sauvegardées en local (Dexie, offline-first) mais **ne remontaient jamais** au serveur Supabase. Le symptôme passait inaperçu car `eauSync.pushTable()` est best-effort (n'émet qu'un `console.warn`, ne casse pas l'UI).

## 2. Cause racine

Les policies RLS des tables `eau_*` avaient été créées avec `for all **to authenticated** using(true) with check(true)`.

Or **BazarKELY authentifie ses utilisateurs via son propre système** (identifiant/mot de passe stocké dans sa table `users`), **invisible du serveur Supabase**. Conséquence : tous les appels `supabase.from()` partent en rôle **`anon`** (sauf le rare login Google OAuth qui établit une vraie session). Donc `auth.uid()` est **NULL** côté base, et le rôle `authenticated` n'est jamais endossé.

Une policy `to authenticated` exclut le rôle `anon` → aucune policy permissive ne s'applique → INSERT rejeté (`401` / `violates row level security policy`). Les **tables principales** (`accounts`, `transactions`, `budgets`, `goals`…) ne posaient pas ce problème car elles sont déjà en `roles={public}`. Le module Eau était simplement plus strict que le reste de l'app — incohérence de configuration, **pas un bug de code applicatif**.

## 3. Correctif appliqué

Réalignement des 16 tables `eau_*` sur le même niveau que le reste de l'app (rôle `public`), exécuté sur la base en S85 (bloc DDL idempotent : `alter table … enable row level security` + `drop policy if exists` + `create policy … for all to public using (true) with check (true)`).

Tables : `eau_compteurs, eau_qr_compteur, eau_releves_compteur, eau_releves_bassin, eau_entrees_bassin, eau_bilans, eau_debit_tests, eau_factures, eau_config, eau_roles, eau_comptes_client, eau_demandes_acces, eau_scans, eau_alertes, eau_audit, eau_annonces`.

La doc de référence `SUPABASE-SQL.md` a été corrigée (le bloc RLS passe en `to public` + commentaire explicatif) puis **commitée** — pour qu'une future réexécution du SQL de référence ne recasse pas le module.

## 4. Vérification LIVE (source de vérité — RÈGLE #0ter)

| Vérification | Méthode | Résultat |
|---|---|---|
| Rôle des policies `eau_*` | `pg_policies` (éditeur SQL) | **16/16 en `roles={public}`** (1 seul rôle distinct) |
| Écriture anonyme acceptée | INSERT REST anon sur `eau_audit` | **`201 Created`** (ligne de test ensuite supprimée, `200`) |
| Lecture/données réelles en prod | GET REST anon sur `eau_comptes_client` | **`200`** — comptes présents : **Mr &Mme POGET**, **Mr BAJO**, **SCI RêveD'OR** |

→ Lecture **et** écritures aboutissent désormais en rôle `anon` (le rôle réel de l'app). Base **non modifiée** lors de cette session de nettoyage (elle était déjà correcte depuis S85) — vérification en lecture seule.

## 5. État des critères (DoD)

- ✅ Commit ne contenant que la doc RLS pertinente : `SUPABASE-SQL.md` (1 file changed, +7/−2). Confirmé via `git show --stat HEAD`.
- ✅ `git push origin main` effectué : `321024c..bcf7ff6`.
- ✅ Rapport écrit (ce fichier) et affiché dans le chat.
- ✅ **Aucun bruit CRLF embarqué** : staging par chemin explicite (`git add SUPABASE-SQL.md`), jamais `git add -A`/`.`. Les ~380 fichiers « modifiés » (CRLF↔LF) sont restés hors commit.
- ⛔ Pas de bump de version : aucun code frontend modifié, pas de rebuild fonctionnel.

**Fichier commité (chemin exact) :** `SUPABASE-SQL.md`

## 6. ⚠️ Limite de sécurité (à acter)

`to public` = **aucun isolement au niveau base**. Quiconque possède la clé anon publique (de toute façon embarquée dans le bundle de l'app) peut **lire et écrire toutes les données eau** via l'API REST : comptes clients, compteurs, relevés, factures, config, audit.

La séparation par rôle (admin / releveur / client) n'existe aujourd'hui **qu'au niveau application** (gardes de route `EauRoleProtectedRoute` + filtrage du menu par `eau_roles`), donc **contournable** par un appel REST direct. Ce niveau d'exposition est **identique à celui du reste de BazarKELY** (déjà en `public`) — ce n'est pas une régression, mais une limite assumée du modèle de sécurité actuel.

## 7. 🔴 Recommandation clé

Une vraie sécurité par rôle au niveau base (via `auth.uid()` dans les policies) est **infaisable tant que les requêtes de données partent en `anon`**. Prérequis : un **chantier d'architecture transverse** = faire porter une session Supabase authentifiée (JWT utilisateur) à **chaque** appel `supabase.from()` de toute l'app, **puis seulement** réintroduire des policies par rôle. À traiter comme un **projet distinct**, hors du module gestion-eau (impacte l'app entière : login, OAuth, offline-first).

## 8. Métadonnées

- **Début (nettoyage) :** ~01:05 EAT, 2026-06-07
- **Fin (push) :** 01:11:44 EAT, 2026-06-07 (horodatage du commit)
- **Durée :** ~7 min
- **Surprises :** le correctif de base lui-même avait été appliqué et vérifié plus tôt dans la session ; ce nettoyage n'a fait que committer la doc + reconfirmer le live. Aucune modification de base nécessaire.
- **Ambiguïtés du prompt :** aucune. Étapes 2 (FONCTIONNEMENT-MODULES.md / CLAUDE.md) : vérifiées, **aucun diff de fond** (`git diff -w --stat` vide) → non incluses, conformément à la consigne.
