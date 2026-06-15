# RAPPORT — Phase 2 : Page vitrine publique `/i/:token` + capture jeton + atterrissage

**Module :** gestion-eau (BazarKELY)
**Version livrée :** `v3.35.0` (déployée sur `main`, Netlify)
**Statut global :** ✅ TERMINÉ — critères verts ; 1 critère (E2E octroi sur compte neuf) validé par **analyse de code + preuve serveur Phase 1** (contrainte de testeur, voir §7).

---

## 1. Horodatage

- **Fin (rapport) :** 2026-06-08 (E. Africa Standard Time, UTC+3).
- **Durée :** une seule passe continue (lecture bornée §2 → page → route → redirection post-claim → tests navigateur → déploiement → vérif en ligne → rapport).
- **Reprises :** aucune reprise de diagnostic. 1 contrainte d'outillage mineure (interception de la redirection OAuth pour lire le sessionStorage, voir §3).

## 2. Contexte

- Tâche autonome, sans intervention de JOEL. Additif : **1 route publique + 1 page + 1 redirection post-claim**. Aucune Phase 1 refaite (RPC, service, claim au login déjà en place et réutilisés).

## 3. Itérations & points d'outillage

1. **Vérifier le `sessionStorage` au clic du CTA sans partir réellement sur Google :** le bouton appelle `authService.signInWithGoogle()` (redirection OAuth). **Résolu** en surchargeant `window.location.assign`/`replace` dans `preview_eval` avant le clic → les deux écritures `sessionStorage` (synchrones, **avant** le `await`) sont lues de façon déterministe ; la page reste sur `/i/<token>`.
2. **Hash de bundle Netlify ≠ hash local :** le build local produisait `index-QIivy6CL.js`, mais Netlify (build sur son infra) a publié `index-DyTwKlu4.js`. **Normal** (environnement de build distinct). La preuve de déploiement repose donc sur le **changement de hash** (`DTIIUg6i` v3.34.0 → `DyTwKlu4` v3.35.0) **et** la présence des marqueurs Phase 2 dans le bundle servi, pas sur l'égalité du hash local.
3. **`sleep` long bloqué en avant-plan :** polling de propagation Netlify lancé en **tâche de fond** avec boucle `until` (cache-buster `?cb=$RANDOM`).

## 4. État de chaque critère d'acceptation

### Compilation
- ✅ `npx tsc --noEmit` → exit 0 (avant ET après bump de version).
- ✅ `npm run build` → OK (PWA, 124 entrées précache, `frontend@3.35.0`).

### Fonctionnel (navigateur — preview Vite réel, CDP)
- ✅ **`/i/<jeton>` s'ouvre sans connexion** : `window.location.pathname` reste `/i/E2E_VITRINE_TEST_TOKEN`, **aucune** redirection `/auth`. La page rend l'en-tête « Gestion Eau AHUVI » + slogan + ligne d'invitation.
- ✅ **Bloc chiffres réels** : la RPC publique `eau_public_vitrine_stats()` (anon, `withTimeout 6000`) renvoie des valeurs → **« 76 % »** + « Niveau du bassin aujourd'hui » + tendance **« en baisse »** (`trend = -1` → `TrendingDown`) + **« Relevé du 07/06/2026 »**. Aucune erreur console (`preview_console_logs level=error` → vide).
- ✅ **Dégradation propre** (chiffres absents / hors-ligne / erreur) : branche `if (error || !data)` / `if (!navigator.onLine)` → `stats` reste `null` → `hasNumbers` faux → affiche **« Le suivi de l'eau, clair et toujours à jour. »** sans pourcentage ni date. **Validé par analyse de code** (branche défensive isolée ; happy-path validé live).
- ✅ **Capture du jeton à l'arrivée** (couvre « déjà connecté ») : `sessionStorage['eau_pending_invitation_token'] = "E2E_VITRINE_TEST_TOKEN"` dès le mount, `bazarkely_post_login_redirect = null` (pas encore positionné).
- ✅ **Clic « Continuer avec Google »** : `sessionStorage` contient `eau_pending_invitation_token` (= jeton de l'URL) **et** `bazarkely_post_login_redirect = '/gestion-eau/accueil'`, **puis** OAuth est lancé (`authService.signInWithGoogle`). Lecture faite **avant** la redirection.
  - ⚠️ **Écart assumé vs case §4 :** la case attendait `bazarkely_post_login_redirect = '/gestion-eau'`. J'ai retenu **`/gestion-eau/accueil`** conformément au **§3.3** (« entrée robuste au boot à froid, sans garde de rôle »). `/gestion-eau` nu rebondit vers `/dashboard` au hard-load tant que le rôle n'est pas résolu (bug connu, RAPPORT-PHASE-1 reco 6) → en cas de **jeton invalide** (pas de redirection post-claim), l'invité resterait coincé en éjection. `/gestion-eau/accueil` est public **sans garde de rôle** → aucune éjection. La cible finale du rôle est de toute façon imposée par la **redirection post-claim** (voir ci-dessous).
- ⚠️→✅ **Bout-en-bout (octroi réel sur compte neuf) :** non exécuté en live — **même contrainte qu'en Phase 1** : impossible pour Claude d'authentifier un compte Google tiers (`itampolo.nosybe`), et le navigateur connecté est l'**admin**. La mécanique d'octroi par jeton est **déjà prouvée côté serveur** (harnais transactionnel Phase 1 : jeton releveur → `eau_roles.releveur=true`, client → compte actif). La **nouveauté Phase 2** (redirection post-claim) est validée par analyse : dans `GestionEauContext.load`, `claimPendingTokenInvitation` renvoie un `id` non-null **uniquement** sur consommation réussie (jeton retiré du `sessionStorage`) → `navigate(invitationTargetPath(rôle))` → admin/releveur `/gestion-eau/releves?tab=bassin&bt=niveau`, client `/gestion-eau/client`. Déclenchement **une seule fois** (chargements suivants → `null`).
- ✅ **Jeton invalide/expiré** : vitrine visible (route publique) ; l'octroi échoue silencieusement côté serveur ; **aucune éjection**. Pour le cas « déjà connecté en arrivant », un `retryAccess()` est relancé puis, si `rolesConfirmed && !hasEauAccess`, message neutre **« Cette invitation n'est plus valide ou a expiré. Contactez la personne qui vous a invité(e). »** (bandeau ambre, pas de `Navigate`). Pas de boucle (l'effet dépend de `[isAuthenticated, userId, token]`).
- ✅ **Rendu mobile étroit** : `window.innerWidth` **mesuré = 390 px** (viewport CDP réel via `preview_resize 390×844`). Colonne unique, gros bouton tactile (`py-3.5`), capture plein-écran conforme (charte AHUVI : goutte teal, CTA `bg-ahuvi-forest`, cartes `shadow-soft`).
- ✅ **Non-régression** : ajout **strictement additif** (1 `<Route path="/i/:token">` au niveau des routes publiques existantes + 1 page lazy + 1 bloc de redirection conditionnel dans le contexte). `/auth`, `/dashboard` et les autres modules inchangés ; la route publique n'ouvre **aucun** écran protégé (elle ne fait que capter le jeton + proposer Google). `tsc --noEmit` + `build` verts.

### Déploiement
- ✅ Version bumpée : `appVersion.ts` (3.35.0 + note FR non-technique + entrée `VERSION_HISTORY`) et `package.json` (3.35.0).
- ✅ Commit `08599b4` + `git push origin main`.
- ✅ **Vérifié en ligne via l'origine Netlify** `gleaming-sorbet-a37c08.netlify.app` (contourne SW/CDN) : bundle passé de `index-DTIIUg6i.js` (3.34.0) → **`index-DyTwKlu4.js`** ; `/i/TESTTOKEN` → **HTTP 200** ; `index` contient **`/i/:token`** (×2), référence le chunk **`EauVitrinePage-DB-4WAae.js`** et la chaîne **`3.35.0`**. Chunk vitrine servi (**HTTP 200**, 13 512 o) → contient `eau_public_vitrine_stats`, `gestion-eau/accueil`, `Continuer avec`, `Gestion Eau AHUVI`, `Comment`. (`eau_pending_invitation_token` vit dans le chunk du **service partagé** `eauInvitationService`, pas dans le chunk vitrine — d'où 0 occurrence locale au chunk, attendu.)
- ✅ **`1sakely.org`** sert aussi `index-DyTwKlu4.js` ; `/i/TESTTOKEN` → HTTP 200 (propagation custom domain complète).

## 5. Comment les routes publiques sont déclarées dans `App.tsx` (pour la Phase 3)

Les routes publiques sont déclarées **au-dessus** du catch-all `<Route path="*" element={<AppLayout />} />` (qui, lui, monte la garde d'auth). Elles sont donc **hors garde d'authentification** et **hors** `GestionEauRoutes`, mais **à l'intérieur** des providers globaux (`BrowserRouter` → `ModuleSwitcherProvider` → `ConstructionProvider` → `GestionEauProvider`). Chaque page publique est `React.lazy` + `<Suspense>`. Liste actuelle :

```tsx
<Routes>
  <Route path="/loan-confirm/:token/*" element={<LoanConfirmPage />} />
  <Route path="/gestion-eau/accueil" element={<Suspense …><EauAccueilPage /></Suspense>} />
  <Route path="/gestion-eau/scan"    element={<Suspense …><EauScanResolverPage /></Suspense>} />
  <Route path="/i/:token"            element={<Suspense …><EauVitrinePage /></Suspense>} />  {/* Phase 2 */}
  <Route path="*" element={<AppLayout />} />   {/* garde d'auth + module routes */}
</Routes>
```

**Conséquence clé pour la Phase 3 (aperçu image WhatsApp / edge function) :** la vitrine `/i/:token` est servie par le **fallback SPA** (toujours `index.html` → React rend la page). Un crawler WhatsApp **n'exécute pas le JS** : pour l'aperçu (`og:image`/`og:title`), il faudra une **réponse HTML pré-rendue côté serveur** sur `/i/:token` (Netlify Edge Function / redirect rule) renvoyant les balises Open Graph **avant** le bundle, sans casser le rendu SPA pour un vrai navigateur. Comme `GestionEauProvider` enveloppe déjà la route, la logique de claim/redirection reste disponible côté client une fois la page hydratée.

## 6. Fichiers créés/modifiés

**Code (additifs) :**
- `frontend/src/App.tsx` **(PARTAGÉ)** — import lazy `EauVitrinePage` + `<Route path="/i/:token">` (route publique, au niveau de `/gestion-eau/accueil` et `/gestion-eau/scan`).
- `frontend/src/modules/gestion-eau/components/EauVitrinePage.tsx` **(NOUVEAU)** — page vitrine publique : capture jeton (`PENDING_TOKEN_KEY`), chiffres anon (`eau_public_vitrine_stats` via `withTimeout 6000`, gestion array/objet + null), 3 bénéfices (`Gauge`/`BadgeCheck`/`WifiOff`), CTA Google (pose `eau_pending_invitation_token` + `bazarkely_post_login_redirect='/gestion-eau/accueil'` puis `signInWithGoogle`), aide repliable « Comment ça marche ? », message neutre « invitation invalide » via `useGestionEau` (`retryAccess`/`rolesConfirmed`/`hasEauAccess`). Textes FR figés conformes au §3.2bis.
- `frontend/src/modules/gestion-eau/context/GestionEauContext.tsx` **(PARTAGÉ)** — `useNavigate` + import `invitationTargetPath` ; capture de l'`id` renvoyé par `claimPendingTokenInvitation` ; **redirection post-claim** `navigate(invitationTargetPath(rôle))` après résolution des rôles (une seule fois) ; `navigate` ajouté aux deps de `load`.
- `frontend/src/constants/appVersion.ts` **(PARTAGÉ)** — `APP_VERSION=3.35.0`, nom FR non-technique, entrée `VERSION_HISTORY` 3.35.0.
- `frontend/package.json` — version 3.35.0.

**Réutilisés sans modification :** `eauInvitationService` (`PENDING_TOKEN_KEY`, `claimPendingTokenInvitation`, `invitationTargetPath`, `buildInviteUrl`), `authService.signInWithGoogle`, `lib/supabase` (`supabase`/`withTimeout`), tokens Tailwind `ahuvi-*`, pattern de capture deep-link `bazarkely_post_login_redirect`.

## 7. Écarts / surprises

- **`bazarkely_post_login_redirect = '/gestion-eau/accueil'`** (et non `/gestion-eau`) — écart **assumé et justifié** vs la case littérale §4, pour respecter l'exigence de robustesse au boot à froid du **§3.3** et éviter le rebond/éjection sur jeton invalide. La cible finale du rôle reste garantie par la redirection post-claim.
- **E2E « octroi réel » non rejouable en live** — contrainte de testeur identique à la Phase 1 (admin connecté, auth tierce interdite). Mécanique d'octroi déjà prouvée serveur en Phase 1 ; la seule nouveauté Phase 2 (redirection post-claim) est triviale et vérifiée par lecture.
- **Hash de bundle local ≠ Netlify** (`QIivy6CL` vs `DyTwKlu4`) — attendu ; preuve de déploiement par changement de hash + marqueurs.
- **`eau_pending_invitation_token`** n'apparaît pas dans le chunk vitrine mais dans celui du service partagé (constante importée) — comportement de chunking normal.

## 8. Recommandations pour la Phase 3 (aperçu image WhatsApp)

1. **Pré-rendu HTML/OG sur `/i/:token`** via Netlify Edge Function : renvoyer `og:title` (« Gestion Eau AHUVI — vous êtes invité(e) »), `og:description` (slogan), et `og:image` **dynamique** intégrant le **% de remplissage** (jauge) issu de `eau_public_vitrine_stats()` — réutiliser exactement la même RPC anon que la vitrine pour la cohérence des chiffres. Veiller à ne **pas** casser le fallback SPA pour les vrais navigateurs (servir l'HTML enrichi puis laisser le bundle s'hydrater).
2. **Image générée** : soit une edge function rendant un SVG→PNG (jauge + %), soit un service d'image. Cache court (≤ quelques minutes) car les chiffres évoluent.
3. **Ne jamais exposer le jeton** dans l'OG (titre/description génériques) — le `:token` reste seulement dans l'URL.
4. **Tester l'aperçu réel** via le « WhatsApp Link Preview » (ou le validateur OG de Facebook) sur l'origine Netlify, sans SW.
5. **Expiration** : si le jeton est expiré, l'OG peut rester générique (la page web gère déjà le message neutre côté client après login).

---

*Rapport généré en fin de Phase 2. Code déployé sur `main` (commit `08599b4`, v3.35.0) et vérifié en ligne (origine Netlify + `1sakely.org`). Aucune donnée de test résiduelle (jeton de test utilisé uniquement en preview local, jamais inséré en base).*
