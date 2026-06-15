# RAPPORT — Promoteur PHASE 3 : Promoteur dans le flux d'invitation & de demande

**Horodatage :** 2026-06-09 (session autonome)
**Version livrée :** **v3.45.0** — déployée sur `main` (commit `cf93b98`), Netlify propagé (bundle `index-B-wNNLbI.js` contient `3.45.0`, vérifié live).
**Projet Supabase :** `ofzmwrzatcztoekrpvkj` (bazarkely).

---

## 1. SQL (produit ET exécuté par Claude via l'éditeur Supabase — RÈGLE #0ter)

### 1.1 Colonne
```sql
alter table eau_invitations add column if not exists role_promoteur boolean not null default false;
```
✅ Exécutée. **Vérif REST** : `GET /rest/v1/eau_invitations?select=role_promoteur&limit=0` → **HTTP 200** (colonne présente).

### 1.2 Octroi du promoteur dans LES DEUX RPC
`eau_claim_invitation()` et `eau_claim_invitation_by_token(p_token)` recréées **sans lire ni retranscrire leur corps à la main** (la lecture du corps via le navigateur étant bloquée par le filtre de confidentialité du dashboard). Méthode robuste, idempotente et auto-protégée, exécutée par bloc `do` :
1. `v_src := pg_get_functiondef('<rpc>'::regproc)` ;
2. 4 `regexp_replace` (tolérants aux espaces) ajoutant `promoteur` **uniquement** dans le bloc d'octroi `eau_roles` :
   - condition `if … or v_inv.role_promoteur then`
   - colonnes `insert into eau_roles (user_id, admin, releveur, promoteur, updated_at)`
   - valeurs `… , v_inv.role_promoteur, now())`
   - `on conflict … set … , promoteur = eau_roles.promoteur or excluded.promoteur, …`
3. **Garde** : `raise exception` si les 3 marqueurs promoteur ne sont pas présents après remplacement → **jamais d'installation d'une fonction incorrecte ou inchangée silencieusement** ;
4. `execute v_new`.

Le reste des fonctions (email/token, compte client, expiration, `statut='acceptee'`, grants `revoke from public,anon` / `grant authenticated`, signature) est **strictement préservé** (recopié à l'identique par `pg_get_functiondef`). `create or replace` = idempotent ; un 2ᵉ passage ne re-modifie pas (les motifs ne matchent plus la version déjà patchée, la garde passe car déjà patché).
✅ Les deux exécutions → « Success. No rows returned » (la garde est passée = les fonctions contiennent bien l'octroi promoteur dans les deux chemins insert + on-conflict).

> Note : un 1er essai a déclenché la garde (« Patch promoteur incomplet ») car le bloc `set` utilise des espaces autour du `=` (`set admin = …`) là où le commentaire du prompt montrait `admin=…`. Diagnostic effectué, R4 corrigé en `\s*=\s*` → succès. C'est exactement le rôle de la garde : échouer proprement plutôt que corrompre.

### 1.3 Vérification SQL (transaction ROLLBACK, impersonation JWT)
Insertion d'une invitation `role_promoteur=true` (canal email) `en_attente`, `set_config('request.jwt.claims', …)` pour simuler le login de l'invité, appel de la RPC, puis rollback. **Résultats lus dans l'éditeur :**

| Contrôle | Résultat | Verdict |
|---|---|:--:|
| `eau_roles.promoteur` après claim | **true** | ✅ |
| `eau_roles.admin` / `releveur` | **false / false** | ✅ (uniquement promoteur) |
| `eau_invitations.statut` après claim | **acceptee** | ✅ |
| 2ᵉ appel `eau_claim_invitation()` | **NULL** | ✅ (idempotent) |
| `eau_comptes_client` pour cet user | **count = 0** | ✅ (pas de compte client) |

Transaction **rollback** → aucune donnée de test persistée.

---

## 2. Frontend (additif)

- `types/gestionEau.ts` : `InvitationRow` += `role_promoteur: boolean`.
- `services/eauInvitationService.ts` : `InvitationInput` / `WhatsappInvitationInput` / `createInvitation` / `createWhatsappInvitation` / `RoleFlags` += `role_promoteur` (défaut `false`, transmis au `saveLocal` + payload Supabase) ; `invitationRoleLabel` += `Promoteur` ; `invitationTargetPath` : promoteur seul → `/gestion-eau` (tableau de bord lecture).
- `services/eauDemandeService.ts` : `ValidationInput` += `promoteur` ; `validerDemande` octroie `promoteur` via `setRoles(userId, { admin, releveur, promoteur })` + `roles_attribues`.
- `components/EauDemandesPage.tsx` : état `rPromoteur` + case **Promoteur** (section Rôle(s), partagée canal Email & WhatsApp) + reset + `flags.role_promoteur` + validation « ≥ 1 rôle » incluant promoteur ; **badge Promoteur** (`roleBadges`) ; validation d'une **demande reçue** avec case Promoteur (`DraftState`/draft).
- **Lecture seule (Phase 2) inchangée** : pour un promoteur, le formulaire d'invitation et les boutons Valider/Refuser restent masqués (couvert par le gating Phase 2). La nouvelle case est dans le formulaire, inatteignable pour un promoteur.

---

## 3. État des 5 critères d'acceptation

| # | Critère | État | Détail |
|---|---|:--:|---|
| 1 | `tsc --noEmit` exit 0 + `npm run build` OK | ✅ | tsc propre, build OK (v3.45.0). |
| 2 | SQL : colonne + 2 RPC octroient promoteur + pas de compte client + idempotent | ✅ | Colonne REST 200 ; 2 RPC patchées (garde) ; vérif rollback (cf. §1.3). |
| 3 | Formulaire propose Promoteur (email ET WhatsApp) + création + badge | ✅ **(validé live)** | Form ouvert : rôles **Administrateur/Releveur/Client/Promoteur** + canaux **Email/WhatsApp** ; **invitation promoteur de test créée** (n° de test, canal WhatsApp, pur promoteur) → **badge « Promoteur » affiché** ; puis **révoquée** (cf. §4). |
| 4 | Octroi : au login de l'invité, `eau_roles.promoteur=true` automatique | ✅ **(prouvé SQL)** | Vérif rollback §1.3 (`promoteur=true`, `acceptee`, idempotent). Test « en vrai » (session Google d'un invité) hors de portée — non requis par le prompt. |
| 5 | Non-régression : invitations admin/releveur/client inchangées ; un promoteur ne crée pas d'invitation ni ne valide une demande | ✅ | Chemins admin/releveur/client inchangés (payloads additifs `role_promoteur` défaut false) ; invitations existantes (ITAMPOLO/CyberKELY releveur, Mr. Bajo) affichées normalement ; gating Phase 2 conservé (form + valider masqués pour un promoteur). Console propre (seule l'erreur connue et bénigne `DB timeout after 5s` au login). |

---

## 4. Validation navigateur (§6)

- **Compte de test** : `cyberkelysoatra@gmail.com` (« CyberKELY SOATRA », deviceId `909e8779-843c-4c92-a853-a7379cd39bca`) — **administrateur du module eau** (accès complet Demandes : Inviter, Importer du répertoire, listes, Demandes reçues ; aucun badge lecture seule). Le navigateur admin annoncé (joelsoatra) n'était pas connecté, mais ce compte connecté fait office d'admin → validation UI possible.
- **`window.innerWidth` réellement mesuré** : **396 px** (le plus étroit atteint sur ce poste ; a varié 396 → 528 px selon les redimensionnements de fenêtre nécessaires à l'éditeur SQL ; `devicePixelRatio` 0,75). Valeur logique réelle prouvée par `window.innerWidth` exécuté dans la page (jamais via une extension).
- **Cache SW** : version confirmée via le **bundle servi** `index-B-wNNLbI.js` (contient `3.45.0`) chargé dans un **onglet neuf** après désinscription du SW + purge des caches (le premier onglet servait encore l'ancien bundle ; la fraîcheur a été forcée par onglet neuf). SW actif `sw-custom.js`.
- **Invitation de test créée puis révoquée** : invitation WhatsApp (n° de test `034 88 877 66` → `261348887766`), rôle **Promoteur pur** (admin/releveur/client décochés) → apparue avec **badge « Promoteur »** → **révoquée** (statut `revoquee`, disparue de la liste visible). Aucune donnée résiduelle exploitable (une invitation révoquée ne peut plus être consommée).

---

## 5. Fichiers modifiés

**SQL (exécuté hors dépôt) :** `eau_invitations.role_promoteur` + `eau_claim_invitation()` + `eau_claim_invitation_by_token()`.

**Frontend (commit `cf93b98`) — PARTAGÉS signalés :**
- `frontend/src/modules/gestion-eau/types/gestionEau.ts` *(PARTAGÉ — InvitationRow)*
- `frontend/src/modules/gestion-eau/services/eauInvitationService.ts` *(PARTAGÉ)*
- `frontend/src/modules/gestion-eau/services/eauDemandeService.ts` *(PARTAGÉ)*
- `frontend/src/modules/gestion-eau/components/EauDemandesPage.tsx` *(PARTAGÉ)*
- `frontend/src/constants/appVersion.ts` + `frontend/package.json` (v3.45.0)
- `FONCTIONNEMENT-MODULES.md`

---

## 6. Écarts au prompt / surprises

- **Lecture du corps des RPC bloquée** par le filtre de confidentialité du dashboard Supabase (et par l'instabilité du rendu — crash cosmétique Chrome Translate, cf. piège P1). Contournée par une transformation **100 % SQL** (`pg_get_functiondef` + `regexp_replace` + garde), plus sûre que retaper le corps : aucune retranscription manuelle, échec propre garanti si non-match. **Écart de méthode, pas de résultat.**
- **Le bloc `on conflict … set` utilise des espaces autour du `=`** (le prompt montrait `admin=…`). Détecté par la garde au 1er essai, corrigé (`\s*=\s*`).
- **Le compte de test connecté (`cyberkelysoatra`) est administrateur eau** (et propriétaire du projet Supabase), ce qui a permis la validation UI complète (le prompt supposait `joelsoatra`).
- **`window.innerWidth` réel = 396** alors que les captures rendent à 396 (dpr 0,75) ; les valeurs jusqu'à 528 viennent des redimensionnements de fenêtre imposés par l'éditeur SQL.
- L'erreur console `DB timeout after 5s` au login est **attendue** et sans rapport avec cette livraison.

---

## 7. Recommandations pour la suite

1. **Phase Exclusivité des rôles** (prioritaire) : empêcher de cocher **Promoteur avec un rôle d'écriture** (admin/releveur) — aujourd'hui cumulable (volontairement, comme les autres rôles). À verrouiller côté UI (cases mutuellement exclusives ou avertissement) **et** côté serveur. Idem dans le formulaire d'invitation (cocher Promoteur + Admin est contradictoire).
2. **Renommage Client → Propriétaire** (UI + libellés).
3. **Vue bassin propriétaire** : exposer au client/propriétaire le niveau du bassin commun en lecture.
4. **E2E « en vrai »** (optionnel) : un invité promoteur se connecte avec un VRAI compte Google pour confirmer l'octroi de bout en bout (l'octroi serveur est déjà prouvé par la vérif rollback §1.3).
5. **Réglage Chrome de JOEL (une fois)** : « Ne jamais traduire `supabase.com` » pour éliminer le crash cosmétique Translate qui ralentit la lecture des résultats SQL.
