# RAPPORT — Isolation eau · PHASE 2 : Verrouillage RLS par rôle + ownership client

**Verdict : 🟢 LIVRÉ & VALIDÉ**
**Version livrée : v3.30.0** (déployée et servie en production sur https://1sakely.org — présente dans le bundle `index-CMlR3ByT.js`)
**Commit : `b8ecc20`** — `feat(gestion-eau): Phase 2 security — role-based RLS lockdown + client ownership v3.30.0`

---

## Horodatage

- **Date :** 2026-06-07
- **Navigateur de validation :** « CyberKELY SOATRA » (`909e8779-…`), connecté à l'app (admin) et au dashboard Supabase.
- **`window.innerWidth` réel mesuré : 984 px** (`devicePixelRatio:1`). Aucune largeur mobile (~412/528 px) n'était atteignable sur ce poste — **valeur rapportée telle quelle, non inventée** (cf. consigne).

---

## 1. Ce qui a été fait (côté serveur — SQL produit et exécuté par Claude, RÈGLE #0ter)

Exécuté via l'éditeur SQL Supabase (Monaco `setValue` + Run, rôle `postgres`), vérifié via l'API REST.

### Helpers d'autorisation (SECURITY DEFINER, `search_path` figé, `grant ... to public`)
`eau_is_admin()`, `eau_is_releveur()`, `eau_client_has_compteur(text)`. Owner `postgres` (BYPASSRLS)
→ pas de récursion quand une policy sur `eau_roles` appelle `eau_is_admin()`. `compteur_ids` est **jsonb**
(confirmé via filtre PostgREST `cs.["…"]`) → l'opérateur `?` teste l'appartenance d'un id de compteur.

### Durcissement & RPC des parcours sans rôle (SECURITY DEFINER)
- `eau_bootstrap_admin()` (Phase 1) : **`revoke execute from anon`**.
- **NOUVELLES** `eau_claim_enrolement(p_code)` (enrôlement par code) et `eau_create_demande(p_email,p_nom)`
  (demande d'accès), `grant ... to authenticated`, `revoke ... from public, anon`.
- ⚠️ **FINDING CLÉ (déviation justifiée du SQL fourni) :** le `revoke ... from public` du prompt
  **ne suffisait PAS**. **Supabase accorde `EXECUTE` explicitement au rôle `anon` par défaut**
  (`ALTER DEFAULT PRIVILEGES`), donc après `revoke from public` un anon pouvait **toujours** appeler
  les RPC (test : `eau_create_demande` en anon a inséré une demande `user_id=NULL`). Corrigé en ajoutant
  **`revoke execute ... from anon`** → les 3 RPC renvoient désormais **401 « permission denied »** en anon.
  (La ligne parasite insérée pendant ce diagnostic a été supprimée — `eau_demandes_acces` revérifiée vide.)

### Policies par rôle (rôle `public` + prédicats `auth.uid()`)
- `enable row level security` **forcé** sur les 16 tables (garde-fou ajouté : sans RLS activée, le
  `drop policy` aurait été inopérant).
- `drop` de **toutes** les policies `eau_*` existantes (dont les `*_auth_all` / `using(true)` de S85).
- **63 policies** recréées (15 tables × 4 cmd + `eau_audit` 3 cmd). `eau_debit_tests` traitée comme
  `eau_releves_bassin` (table présente en base). Bassin (`releves_bassin`/`entrees_bassin`/`bilans`/`debit_tests`)
  = **aucune branche client** → invisible au client.
- **Architecture (issue du diagnostic Phase 1) :** `to public` + prédicat, **PAS** `to authenticated`.
  Une requête anon résiduelle (course au boot, sync de fond) est **filtrée à 0 ligne**, pas rejetée en 401.

## 2. Ce qui a été fait (côté app — offline-first préservé)

- **`eauCompteClientService.linkByEnrolementCode`** : un client sans rôle ne peut plus lire
  `eau_comptes_client` en clair → appelle `supabase.rpc('eau_claim_enrolement', { p_code })` puis
  `pullTable('eau_comptes_client')` ; repli local synthétisé si le pull réseau échoue après un claim réussi.
  *(Limite UX assumée : la RPC retournant `null` ne distingue plus « code invalide » de « code déjà pris »
  sous RLS → les deux donnent « invalide ».)*
- **`eauDemandeService.createDemande`** : appelle `supabase.rpc('eau_create_demande', …)` ; **repli
  offline-first conservé** (un INSERT local rejoué passe la policy `with check (user_id=auth.uid())`).
- **`eauSync`** : inchangé — `pullTable`/`pushTable` toléraient déjà un retour filtré (moins de lignes
  = normal) et un refus RLS (best-effort, avalé, jamais de crash). Non régressé.
- `npx tsc --noEmit` **exit 0** ; `npm run build` **OK** ; version bumpée 3.29.1 → **3.30.0**.

---

## 3. Preuves de validation (production, v3.30.0)

> Méthode : tests **anon** via REST (clé anon publique, **aucun token de session moissonné** — cf. piège P4) ;
> tests **par rôle** via la simulation `auth.uid()` (`set_config('request.jwt.claims', …)` + `set local role
> authenticated`) dans une **transaction annulée (ROLLBACK)** — méthode canonique de test RLS, **sans aucune
> mutation persistante**. Setup persistant (rôle releveur + enrôlement client) **autorisé explicitement par JOEL**.

| # | Critère | Résultat | Preuve |
|---|---|:--:|---|
| 1 | Policies par rôle déployées ; 0 permissive résiduelle ; RPC durcies | ✅ | `pg_policies` : **total=63, permissive_residual=0, auth_all_residual=0, tables_with_policies=16, tables_rls_disabled=0** ; RPC anon → **401** |
| 2 | **Admin** lit/écrit tout | ✅ | run-as-admin : compteurs=11, comptes_client=3, bassin=1, `is_admin=true`, **insert config=1 + facture=1 OK** (rollback) |
| 3 | **Releveur** : lit compteurs/config/bassin ; **PAS** factures ni comptes_client | ✅ | run-as-releveur : compteurs=**11**, config=**1**, bassin=**1** ; factures=**0**, comptes_client=**0** ; `is_releveur=true, is_admin=false` |
| 4 | **Client** : 0 sur compteur non assigné + bassin ; ne lit QUE ses compteurs | ✅ | run-as-client : compteurs **3/11**, voisin non-assigné=**0**, mon compte=**1/3**, bassin/entrées/bilans/débit=**0**, config=**0** ; `has_assigné=true / has_voisin=false` |
| 5 | **Anon** : 0 ligne sur les 16 tables ; pas de 401 bloquant légitime | ✅ | REST anon : **`[]` sur les 16 tables** ; INSERT anon → **401 RLS** (`eau_audit`, `eau_roles`) ; requêtes anon légitimes = **200** (pas de 401) |
| 6 | Enrôlement (RPC) + demande (RPC) OK ; bootstrap intact | ✅ | `eau_claim_enrolement('F8WX3X')` en client → renvoie l'id du compte (idempotent) ; `eau_create_demande` granted authenticated ; `eau_bootstrap_admin` → `false` (idempotent), anon **401** |
| 7 | Offline-first préservé ; aucun crash si écriture refusée | ✅ | `eauSync` avale les refus (best-effort) ; repli local de `createDemande`/`linkByEnrolementCode` ; raisonné par lecture du code (pas de chemin qui throw) |
| 8 | `tsc --noEmit` + build verts ; version bumpée ; déployé | ✅ | tsc exit 0 ; build OK ; **3.30.0 servie en prod** (bundle `index-CMlR3ByT.js`) |
| 9 | `FONCTIONNEMENT-MODULES.md` + `SUPABASE-SQL.md` (section RLS par rôle) à jour | ✅ | section « RLS PAR RÔLE — PHASE 2 » + matrice ; ligne RLS du module corrigée |
| 10 | Rapport écrit + chat | ✅ | ce fichier + résumé chat |

**État final de la base (rôle postgres) :** `p2v_* = 0` partout (rollback propre, **aucune pollution de test**),
`eau_demandes_acces` vide, **releveur itampolo = true / admin = false** (releveur pur), **client cyberkelysoatra
enrôlé** sur le compte « SCI RêveD'OR » (3 compteurs).

---

## 4. Surprises / findings

1. **Supabase grant EXECUTE à `anon` par défaut** (§1) — `revoke from public` insuffisant, il faut
   `revoke from anon`. À retenir pour toute future RPC sensible. *(Documenté dans `SUPABASE-SQL.md`.)*
2. **`enable row level security` n'était pas garanti** — ajouté par prudence sur les 16 tables ; sans lui
   le `drop policy` aurait laissé un accès total. Vérifié : `tables_rls_disabled=0`.
3. **3 comptes clients existent** (pas 1) — renforce le test client (il n'en voit qu'1, le sien).
4. **Le sélecteur de module (`ModuleSwitcher`) ne répond pas aux clics scriptés** — la bascule in-app
   admin → eau n'a pas pu être re-jouée par automatisation (limite d'outillage, **pas un défaut app** :
   le shell se charge sans régression et l'accès admin à TOUTES les données eau est prouvé côté serveur ;
   la Phase 1 avait déjà validé le rendu du module pour l'admin). À retenir pour la mémoire outillage.
5. **Nuance UX enrôlement** — sous RLS, la RPC ne distingue plus « code invalide » de « code déjà pris »
   (les deux → « invalide »). Acceptable ; à réévaluer si besoin d'un message dédié (Phase 3).

---

## 5. Recommandations Phase 3

1. **Corriger le redirect deep-link `/gestion-eau` → `/dashboard` au hard-reload** (bug shell `App.tsx`,
   pré-existant, **hors périmètre** ici) — pour qu'une URL directe ouvre le module.
2. **Espace client réel** : maintenant que le serveur garantit l'isolement, valider le parcours client
   complet in-app (login Google cyberkelysoatra → enrôlement par code → espace client).
3. **Message « code déjà utilisé »** dédié si souhaité (finding §4.5) — via une RPC retournant un statut.
4. **Nettoyage des comptes de test** (optionnel, sur demande de JOEL) : retirer le rôle releveur d'itampolo
   et/ou ré-initialiser l'enrôlement du compte « SCI RêveD'OR » si l'état de démo doit être remis à zéro.

---

## Fichiers modifiés

**App :**
- `frontend/src/modules/gestion-eau/services/eauCompteClientService.ts` (`linkByEnrolementCode` → RPC)
- `frontend/src/modules/gestion-eau/services/eauDemandeService.ts` (`createDemande` → RPC)
- `frontend/src/constants/appVersion.ts` (3.30.0 + historique + message non-technique)
- `frontend/package.json` (3.30.0)

**Docs :**
- `SUPABASE-SQL.md` (section « RLS PAR RÔLE — PHASE 2 » + S85 marqué remplacé)
- `FONCTIONNEMENT-MODULES.md` (ligne RLS du module mise à jour)
- `RAPPORTS-CREATEUR-APPS/gestion-eau/RAPPORT-SECU-PHASE-2.md` (ce fichier)

**Base de données (Supabase, via éditeur SQL) :**
- Helpers `eau_is_admin/eau_is_releveur/eau_client_has_compteur` ; RPC `eau_claim_enrolement/eau_create_demande` ;
  durcissement `eau_bootstrap_admin` ; `enable RLS` ×16 ; drop policies S85 ; **63 policies par rôle**.

**Commit :** `b8ecc20` (poussé sur `main`, déployé Netlify, 3.30.0 servie).
