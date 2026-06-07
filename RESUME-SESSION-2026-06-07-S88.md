# RÉSUMÉ SESSION S88 — 2026-06-07

## Objet : Isolation eau · PHASE 2 — Verrouillage RLS par rôle + ownership client

**Statut : 🟢 LIVRÉ & VALIDÉ — v3.30.0 déployée (commits `b8ecc20` app + `008315f` docs).**

---

## Accomplissements

### Côté serveur (SQL produit + exécuté par Claude via navigateur, RÈGLE #0ter)
- **Helpers** SECURITY DEFINER `eau_is_admin()`, `eau_is_releveur()`, `eau_client_has_compteur(text)` (`compteur_ids` = **jsonb**, opérateur `?`), grant public, owner postgres (pas de récursion).
- **RPC** parcours sans rôle : `eau_claim_enrolement(p_code)` + `eau_create_demande(p_email,p_nom)` (SECURITY DEFINER), `eau_bootstrap_admin` durcie.
- **63 policies** `to public` + prédicats `auth.uid()`/rôle sur **16 tables `eau_*`** (RLS forcée enable). Remplace le bloc permissif `using(true)` de S85. **0 policy permissive résiduelle**.
- ⚠️ **Finding capital :** `revoke ... from public` NE SUFFIT PAS pour bloquer l'anon — Supabase grant EXECUTE explicitement à `anon` par défaut → **`revoke ... from anon` obligatoire**. RPC durcies → anon 401.

### Côté app
- `eauCompteClientService.linkByEnrolementCode` → RPC `eau_claim_enrolement` + pull (client ne lit plus `eau_comptes_client` en clair).
- `eauDemandeService.createDemande` → RPC `eau_create_demande` (repli offline-first conservé).
- `eauSync` inchangé (tolère déjà retour filtré / refus RLS). `tsc --noEmit` OK, build OK, version 3.30.0.

### Validation (sans moissonner de token — P4)
- **Anon (REST clé publique) :** `[]` sur les 16 tables + INSERT → 401 RLS.
- **Par rôle (éditeur SQL, simulation `auth.uid()` en transaction ROLLBACK) :**
  - Admin : lit tout (11 compteurs, 3 comptes, bassin) + écrit (insert config/facture OK).
  - Releveur : compteurs=11, config=1, bassin=1 ; **factures=0, comptes_client=0**.
  - Client : **3/11 compteurs**, voisin=0, mon compte=1/3, bassin/config=0 ; helper has_assigné=true/has_voisin=false.
- Deploy live : 3.30.0 servie (bundle `index-CMlR3ByT.js`). `innerWidth` réel mesuré = **984 px**.

---

## Reste à faire (Phase 3)
1. Corriger le redirect deep-link `/gestion-eau`→`/dashboard` au hard-load (**bug shell App/AppLayout, hors périmètre sécurité**).
2. Valider le parcours **client réel in-app** (login Google cyberkelysoatra → enrôlement code → espace client).
3. Optionnel : message « code déjà utilisé » dédié (la RLS conflate invalide/déjà-pris) ; nettoyage des comptes de test.

## Comptes de test (état persistant, autorisé par JOEL)
- Releveur : `itampolo.nosybe@` (`7b54446b…`, admin=false/releveur=true).
- Client : `cyberkelysoatra@` (`e0b989b6…`) enrôlé sur compte « SCI RêveD'OR » (3 compteurs).
- Admin : `joelsoatra@` (`5020b356…`, admin+releveur).

## Capitalisation
- Mémoire : `project_isolation_eau_phases`, `feedback_rls_public_pas_authenticated`, `MEMORY.md` à jour.
- `PROCEDURES-OUTILS.md` : ajout P7 (revoke from anon), P8 (test RLS par rôle via set_config+rollback), P9 (ModuleSwitcher clics scriptés).
- `SUPABASE-SQL.md` (section RLS par rôle), `FONCTIONNEMENT-MODULES.md`, `RAPPORT-SECU-PHASE-2.md`.
