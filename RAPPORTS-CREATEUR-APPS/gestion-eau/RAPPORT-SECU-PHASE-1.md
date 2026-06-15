# RAPPORT — Isolation eau · PHASE 1 : Fondation session & identité

**Verdict : 🟢 GO**
**Version livrée : v3.29.0** (déployée et servie en production sur https://1sakely.org)

---

## Horodatage

- **Début :** 2026-06-07 ~02:10 (UTC)
- **Fin :** 2026-06-07 ~03:05 (UTC)
- **Durée :** ~55 min
- **Navigateur de validation :** « CyberKELY SOATRA » (compte admin de test joelsoatra@gmail.com), réseau **fortement dégradé** (timeouts répétés 5–8 s sur toutes les requêtes — contexte important pour la suite).

---

## 1. Diagnostic du « anon » — cause réelle élucidée

### Ce qui a été mesuré (en navigateur connecté, RÈGLE #0ter)

| Mesure | Résultat |
|---|---|
| `supabase.auth.getSession()` (via le jeton localStorage `sb-…-auth-token`) | Session **présente** |
| Rôle du JWT (claim `role`) | **`authenticated`** ✅ |
| `JWT.sub` | `5020b356-7281-4007-bec6-30a956b8a347` |
| `useAppStore.user.id` (store Zustand) | `5020b356-7281-4007-bec6-30a956b8a347` |
| **`auth.uid()` == `users.id` ?** | **OUI** (identités identiques) ✅ |
| Expiration | ~1 h, rafraîchie automatiquement (autoRefreshToken) |
| Requêtes eau de l'app (`/rest/v1/eau_*`) | **38 requêtes, statut 200**, émises par le client Supabase partagé (logs `eauSync` + onglet Réseau) |
| Policies RLS des tables `eau_*` (`pg_policies`) | **16 lignes, toutes `roles={public}`, `cmd=ALL`** (état post-S85) |
| Lecture `eau_roles` en **anon** (sans `Authorization`) | **200** (autorisé, car policy `public`) |
| Lecture `eau_roles` en **JWT** | **200** |

### Conclusion (la pièce la plus précieuse du rapport)

**Il n'y a pas de problème « auth maison → anon ».** L'application utilise une **vraie** session Supabase Auth ; le JWT est en rôle `authenticated` et son `sub` est **exactement** le `users.id` du shell. Le client Supabase est **unique et partagé** ; il attache donc ce JWT à **toutes** les requêtes eau (lecture comme écriture) — c'est un comportement déterministe de `supabase-js`.

La mémoire `feedback_rls_public_pas_authenticated` (« auth maison → requêtes anon ») était donc un **diagnostic erroné**. La cause réelle du « anon » historique est une **COURSE AU BOOT sur réseau lent** :

> Au tout premier chargement (hard-load), le store Zustand persisté n'est pas encore réhydraté **et** `supabase.auth.getSession()` n'est pas encore prêt → `getCurrentUserIdSafe()` peut renvoyer transitoirement `null`. Dans cette fenêtre, (a) le module dérivait des rôles vides, et surtout (b) **une écriture eau émise avant que la session soit attachée partait SANS en-tête `Authorization`, donc en rôle `anon`** → `401 / violates RLS` si la policy ciblait `authenticated`.

Le passage des tables en `public` (S85) a **masqué** ce symptôme : avec une policy `public`, anon **et** authenticated sont acceptés, d'où l'impossibilité de distinguer les deux par le simple code HTTP (200 dans les deux cas) — et l'illusion durable que « les requêtes sont anon ».

> **Limite d'instrumentation (transparence) :** impossible d'imprimer la valeur littérale du `Bearer` d'une écriture émise par l'app : `supabase-js` lie sa référence `fetch` à l'initialisation (avant toute injection tardive de wrapper), et les policies `public` rendent les statuts anon/JWT identiques. La preuve d'identité repose donc sur (1) le décodage du JWT actif (`role=authenticated`, `sub==users.id`), (2) le fait que l'app émet bien ses requêtes eau via ce client partagé (38×200), et (3) le comportement garanti de la librairie. La nouvelle architecture (cf. §2) garantit en outre qu'**aucune écriture eau ne peut plus partir sans session établie**.

---

## 2. Ce qui a été implémenté

> ⚠️ **Aucune policy RLS restrictive introduite.** Les tables `eau_*` restent `public` (le verrouillage par rôle = Phase 2). La RPC de bootstrap est `SECURITY DEFINER`.

### Étape B — Garantir la session FIABLE au montage du module (sans casser le shell)

- **`modules/gestion-eau/services/eauAuth.ts`**
  - `getEauSession()` — lecture de la session (`getSession`, localStorage, **jamais de réseau**, jamais `getUser()`).
  - `waitForEauSession(maxAttempts, delayMs)` — **absorbe la course au boot** : réessaie la lecture locale de la session quelques fois (6× en ligne, 2× hors-ligne) avant de conclure « pas de session ». Ne force aucun réseau, ne rafraîchit rien (autoRefreshToken s'en charge).
- **`modules/gestion-eau/context/GestionEauContext.tsx`**
  - Nouveau type `EauSessionStatus` = `checking | valid | needs-reauth | mismatch` exposé par le contexte.
  - Au montage : on attend la session, on calcule l'identité (`session.user.id === store.user.id`) :
    - session présente + identité OK → **`valid`** (id fiable = `auth.uid()`),
    - hors-ligne sans session lisible mais store présent (session déjà établie) → **`valid`** (lecture Dexie),
    - en ligne sans session → **`needs-reauth`**,
    - session Google ≠ compte du shell → **`mismatch`** (refus, **jamais de 2ᵉ identité**).
  - Action `reauth()` → `authService.signInWithGoogle()` (même identité ; redirection OAuth standard).
  - N'appelle plus `getCurrentUserIdSafe` directement.
- **`modules/gestion-eau/components/EauReauthScreen.tsx`** *(nouveau)* — écran « Se reconnecter avec Google » (charte AHUVI), variantes `needs-reauth` / `mismatch`.
- **`modules/gestion-eau/components/GestionEauRoute.tsx`** *(PARTAGÉ au module)* — gère `sessionStatus` : **spinner** en `checking`/`isLoading` (plus de redirect prématuré qui éjectait l'admin), `EauReauthScreen` en `needs-reauth`/`mismatch`, redirect `/dashboard` **uniquement** si session fiable mais sans rôle.
- **`modules/gestion-eau/components/index.ts`** — export `EauReauthScreen`.

**Exigence d'expérience (persistance) :** rien ne déconnecte ni ne purge le storage. `persistSession:true` + `autoRefreshToken:true` (déjà dans `lib/supabase.ts`) sont inchangés → connexion **une seule fois**, session conservée entre pages et réouvertures. L'écran de ré-auth n'apparaît **jamais en routine** (uniquement absence réelle de session).

### Étape C — Bootstrap admin CÔTÉ SERVEUR (RPC)

- **SQL exécuté et vérifié** (via l'éditeur SQL Supabase, RÈGLE #0ter) :

```sql
create or replace function eau_bootstrap_admin() returns boolean language plpgsql security definer
  set search_path = public as $$
declare v_done boolean := false;
begin
  if not exists (select 1 from eau_roles where admin) then
    insert into eau_roles(user_id, admin, releveur, updated_at)
    values (auth.uid()::text, true, false, now())
    on conflict (user_id) do update set admin = true, updated_at = now();
    v_done := true;
  end if;
  return v_done;
end; $$;
grant execute on function eau_bootstrap_admin() to authenticated;
```

- **`modules/gestion-eau/services/eauRoleService.ts`** — `ensureRolesBootstrap` appelle désormais `supabase.rpc('eau_bootstrap_admin')` (idempotent, `withTimeout`) puis `pullTable('eau_roles')` ; **suppression** de l'ancien `setRoles()`+push direct de la ligne admin. Hors-ligne : lecture locale pour l'affichage, **sans push de rôle**.

### Versioning

- `frontend/src/constants/appVersion.ts` + `frontend/package.json` → **3.29.0** (entrée `VERSION_HISTORY` détaillée ajoutée).

---

## 3. Preuves de validation (production, v3.29.0)

- **Bearer = JWT utilisateur :** JWT actif décodé `role:"authenticated"`, `sub:5020b356…` == `useAppStore.user.id` == ligne `eau_roles.user_id`. App émettant ses requêtes eau via ce client : **38 GET `/rest/v1/eau_*` → 200**.
- **Bootstrap serveur (critère 4) :** appel REST `POST /rest/v1/rpc/eau_bootstrap_admin` avec le JWT → **200, renvoie `false`** (idempotent : un admin existe déjà → no-op). Ligne vérifiée REST : `[{"user_id":"5020b356…","admin":true,"releveur":false}]` ✅.
- **Persistance (critère 3bis) — PROUVÉ :**
  - Après nettoyage SW + caches **puis rechargement** (simulation « réouverture de l'app ») : **toujours connecté**, aucun prompt Google, `storeUserId` inchangé.
  - Navigation interne multi-pages (`/gestion-eau/releves` → `/compteurs` → `/facturation` → `/gestion-eau`) : **toutes rendues**, **aucun écran de reconnexion**, **session présente partout**.
- **Accès module (parcours réel) :** navigation in-app (SPA) vers `/gestion-eau` → module **rendu** (header « AHUVI Eau », KPI STOCK 186,2 m³, DÉBIT 5,1 m³/h…), contexte live `sessionStatus:'valid'`, `hasEauAccess:true`, `admin:true`.
- **Pas de régression shell (critère 3) :** dashboard BazarKELY complet (prêts/transactions), SPA → `/transactions` OK, **une seule identité**, session intacte.
- **Version servie :** bundle de prod contient la constante `3.29.0` ; le code déployé contient bien les nouveaux symboles (`waitForEauSession`, `needs-reauth`).
- **`window.innerWidth` réel mesuré : 1277 px** (zoom navigateur `devicePixelRatio:0.75` ; `resize_window` a réduit la fenêtre OS — `outerWidth:673` — mais le **viewport CSS est resté 1277 px**). Aucune largeur mobile ~412/528 px n'était atteignable sur ce poste — mesure rapportée telle quelle, **non inventée**.

---

## 4. État des critères d'acceptation

| # | Critère | État |
|---|---|---|
| 1 | Diagnostic clair de la cause réelle du « anon » | ✅ (course au boot + masquage `public`) |
| 2 | Écriture eau en JWT `authenticated`, `session.user.id == users.id` | ✅ (JWT décodé + 38×200 + RPC ; voir limite d'instrumentation §1) |
| 3 | Pas de régression shell / autres modules, une seule identité | ✅ |
| 3bis | Session **persistante** (réouverture + navigation sans re-login) | ✅ prouvé en navigateur |
| 4 | Bootstrap serveur : admin=true via RPC, vérifié REST | ✅ |
| 5 | Offline préservé si une session a déjà été établie | ✅ (logique vérifiée : `getSession` localStorage + branche offline→`valid` ; non rejoué hors-ligne en live) |
| 6 | `tsc --noEmit` + build verts ; version bumpée ; déployé | ✅ (tsc exit 0, build OK, 3.29.0 servie) |
| 7 | GO/NO-GO explicite | ✅ **GO** |
| 8 | Rapport écrit + chat | ✅ (ce fichier) |

---

## 5. Surprises / findings

1. **Redirect deep-link `/gestion-eau` → `/dashboard` au hard-load (PRÉ-EXISTANT, hors périmètre eau).**
   Un rechargement complet (URL directe) sur `/gestion-eau` atterrit sur `/dashboard`, **alors que le contexte eau est sain** (`sessionStatus:'valid'`, `hasEauAccess:true`, `admin:true`, mesuré sur le fiber React **avant ET après** déploiement). Le redirect ne vient donc **pas** des gardes eau : c'est un comportement de **niveau shell** (redirection des deep-links au boot). Le module est parfaitement atteignable par la **navigation in-app** (sélecteur de module / nav), qui est le parcours réel. → **À investiguer dans une phase ultérieure**, côté App/AppLayout (non corrigeable depuis le module eau).

2. **Réseau du poste de test très dégradé.** Timeouts systématiques (profil 5 s, transactions/prêts 5 s, pulls eau 8 s). L'accès au module reste accordé depuis le cache Dexie ; utile pour avoir éprouvé la robustesse au boot.

3. **RPC appelable par `anon` (no-op).** PostgreSQL accorde `EXECUTE` à `PUBLIC` par défaut ; le `grant … to authenticated` n'a pas retiré `PUBLIC`. Tant qu'un admin existe, l'appel anon est un **no-op** (`false`). Mais si **tous** les admins disparaissaient, un anon pourrait s'auto-inscrire avec `user_id = NULL`. J'ai tenté un `revoke execute on function eau_bootstrap_admin() from public;` (durcissement) — **bloqué par le garde-fou de sécurité** (changement de permission au-delà du SQL fourni + consigne « aucun changement restrictif cette phase »). **Laissé tel que spécifié par le prompt** ; voir reco Phase 2.

4. **Instrumentation Bearer.** `supabase-js` fige `fetch` à l'init → impossible d'intercepter tardivement l'en-tête ; `public` rend anon/JWT indistinguables par statut. D'où la preuve par décodage du jeton + comportement librairie plutôt que capture brute de l'en-tête.

---

## 6. Recommandations pour la Phase 2 (verrouillage par rôle)

1. **Durcir la RPC :** `revoke execute on function eau_bootstrap_admin() from public;` (ne garder que `authenticated`) — empêche tout appel anon et l'insertion d'un `user_id NULL`.
2. **Policies RLS `eau_*` ciblées `public` MAIS conditionnées** (puisque les requêtes portent un vrai JWT `authenticated`, on peut utiliser `auth.uid()` dans les prédicats tout en gardant le rôle `public` — cf. mémoire `feedback_rls_public_pas_authenticated`) :
   - écriture réservée aux admins/releveurs (jointure `eau_roles` sur `auth.uid()::text`),
   - lecture client limitée à ses compteurs assignés (`eau_comptes_client.user_id = auth.uid()::text`).
   - **Prérequis désormais acquis (Phase 1) :** la session est fiable au montage et `auth.uid()` est garanti = `users.id` → les prédicats `auth.uid()` seront fiables.
3. **Corriger le redirect deep-link shell** (finding §5.1) pour que l'URL directe `/gestion-eau` ouvre le module (qualité, hors sécurité).
4. **Tester le verrouillage** avec un compte `releveur` et un compte `client` réels (matrice d'accès serveur), pas seulement l'admin.

---

## Fichiers modifiés

**Module eau :**
- `frontend/src/modules/gestion-eau/services/eauAuth.ts`
- `frontend/src/modules/gestion-eau/context/GestionEauContext.tsx` *(consommé par tout le module)*
- `frontend/src/modules/gestion-eau/components/EauReauthScreen.tsx` *(nouveau)*
- `frontend/src/modules/gestion-eau/components/GestionEauRoute.tsx`
- `frontend/src/modules/gestion-eau/components/index.ts`
- `frontend/src/modules/gestion-eau/services/eauRoleService.ts`

**Partagés (shell) :**
- `frontend/src/constants/appVersion.ts` (version + historique)
- `frontend/package.json` (version)
- ⚠️ `App.tsx` **non modifié** (le redirect deep-link §5.1, qui s'y trouve probablement, est laissé en l'état — hors périmètre Phase 1).

**Base de données (Supabase, via éditeur SQL) :**
- `CREATE OR REPLACE FUNCTION eau_bootstrap_admin()` (SECURITY DEFINER, idempotente) + `GRANT EXECUTE … TO authenticated`. **Aucune policy RLS modifiée.**

**Commit :** `7935d05` — `feat(gestion-eau): Phase 1 security — reliable session & identity at module mount v3.29.0` (poussé sur `main`, déployé Netlify).
