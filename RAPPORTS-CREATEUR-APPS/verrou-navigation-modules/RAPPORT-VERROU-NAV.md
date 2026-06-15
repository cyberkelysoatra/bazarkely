# RAPPORT — Verrou de navigation inter-modules (rester dans son module au rechargement)

**Version livrée :** v3.31.4
**Commit :** `a54a39e` — poussé sur `main` (Netlify déployé, version 3.31.4 confirmée en ligne)
**Date :** 2026-06-07

---

## 1. Horodatage & exécution

| Élément | Valeur |
|---|---|
| Début de la tâche | 2026-06-07 ~17:35 (heure machine) |
| Fin (rapport inclus) | 2026-06-07 17:48 |
| Durée active | ~13 min, en une seule passe |
| Sessions-reprises | 0 (aucune reprise) |
| Fenêtre de contexte atteinte | Non |
| Itérations code→test→correction | 1 passe directe — aucune correction nécessaire (tsc OK, build OK, validations live OK du 1er coup) |
| Erreurs marquantes en cours de route | 1 friction outillage mineure : `Edit` sur `package.json` et `appVersion.ts` a exigé un `Read` préalable (vue tronquée de `appVersion.ts` → relecture ciblée). Aucune erreur de code. |

---

## 2. Cause racine corrigée (chemin latent du shell)

Conforme au diagnostic du prompt (§3). Dans `AppLayout.tsx`, la branche **non authentifiée** faisait :

```tsx
<Route path="*" element={<Navigate to="/auth" replace />} />
```

Pendant la fenêtre de boot où `isAuthenticated` est `false` (restauration de session Supabase / rafraîchissement de token), ce `Navigate replace` **écrasait l'adresse courante** (ex. `/gestion-eau`) par `/auth`. Quand la session se restaurait (`isAuthenticated → true`), la branche authentifiée — qui n'a **aucune** route `/auth` — retombait sur `<Route path="*" element={<Navigate to="/dashboard" replace />} />` → **éjection vers le tableau de bord BazarKELY**, pour n'importe quel module.

C'était la dernière faille de l'invariant, complémentaire des correctifs déjà en prod (v3.29.1 garde de rôle eau ; v3.31.3 reprise auto restreinte à `/dashboard`), tous deux conservés intacts.

---

## 3. Correctifs appliqués

### 3.1 — `AppLayout.tsx` (PRINCIPAL, §4.1)
Branche non authentifiée : `Navigate to="/auth"` remplacé par un **rendu d'`AuthPage` SUR PLACE** (`<Route path="*" element={<AuthPage />} />`). L'URL n'est **jamais** modifiée. Quand la session se restaure, `AppLayout` re-rend la branche authentifiée sur la **même** adresse → l'utilisateur reste dans son module.

Vérifié par lecture :
- `AuthPage` fonctionne rendu à n'importe quelle adresse (lit les jetons OAuth depuis `sessionStorage`/hash, indépendamment du `path`).
- Sur un simple F5 alors que connecté : `handleOAuthCallback` ne navigue que s'il y a des jetons OAuth en attente (absents sur un F5) → pas de `navigate('/dashboard')`. De plus `checkExistingSession` réhydrate l'auth depuis `localStorage('bazarkely-user')` → bascule vers la branche authentifiée sur place.

### 3.2 — `AuthPage.tsx` (SECONDAIRE, §4.2 — LIVRÉ, sans risque OAuth)
- `handleGoogleSignIn` mémorise l'adresse d'origine avant de lancer Google : `sessionStorage['bazarkely_post_login_redirect'] = pathname + search`, **uniquement** si ce n'est ni `/auth` ni `/`.
- `handleOAuthCallback` : `navigate('/dashboard')` en dur remplacé par lecture de cette clé → `navigate(redirect || '/dashboard')` (puis suppression de la clé).
- **Aucune** modification du flux OAuth lui-même (capture des jetons dans `main.tsx`, `detectSessionInUrl:false`, `setSession`, ordre des events `onAuthStateChange`). Seule la **cible de navigation post-login** change → risque OAuth nul. 4.2 a donc été livré.

### 3.3 — Non-régression vérifiée (§4.3)
- `ModuleSwitcherContext.tsx` : reprise auto **toujours** limitée à `currentPath === '/dashboard'` (non touché).
- Aucune autre source de redirection inter-module : `useRequireAuth.ts` (qui fait `navigate('/auth')`) est **du code mort** — importé/utilisé nulle part (grep : 1 seul fichier, sa propre définition).
- Routes publiques `/gestion-eau/accueil` et `/gestion-eau/scan` (dans `App.tsx`, hors garde d'auth) : **intactes**.

---

## 4. État de chaque critère d'acceptation

### Compilation / build
| Critère | État |
|---|---|
| `npx tsc --noEmit` exit 0 | ✅ (exit 0) |
| `npm run build` OK | ✅ (built en 25.81s, 123 entrées précachées) |

### Comportement (validé live sur `https://1sakely.org`, session JOEL admin, version 3.31.4 confirmée)

**Valeurs `pathname` mesurées avant/après rechargement :**

| Module | URL testée | `pathname` AVANT | `pathname` APRÈS reload | État |
|---|---|---|---|---|
| Eau | `/gestion-eau/releves` | `/gestion-eau/releves` | `/gestion-eau/releves` | ✅ inchangé, shell AHUVI Eau affiché |
| Construction | `/construction/dashboard` | `/construction/dashboard` | `/construction/dashboard` | ✅ inchangé |
| BazarKELY | `/transactions` | `/transactions` | `/transactions` | ✅ inchangé |

| Critère | État |
|---|---|
| Aucun changement de module sans le geste explicite | ✅ (tous les rechargements restent sur place ; seul logo→footer change de module) |
| Geste officiel logo→footer fonctionne + `bazarkely_active_module` mis à jour | ✅ (Eau → 💰 BazarKELY → `/dashboard`, `savedModule='bazarkely'` ; retour 💧 → `/gestion-eau`, `savedModule='gestion-eau'`) |
| Reprise auto conservée (depuis `/dashboard` uniquement) | ✅ (`/dashboard` → saut vers `/gestion-eau`, dernier module mémorisé) |
| **Test décisif du correctif** (fenêtre de boot simulée) | ✅ `isAuthenticated` forcé à `false` dans le store persisté + chargement `/gestion-eau/releves` → **fin sur `/gestion-eau/releves`** (PAS `/dashboard`), auth auto-réparée (`isAuthNow=true`), shell module affiché. Avec l'ancien code ce scénario terminait sur `/dashboard`. |
| Routes publiques eau accessibles sans garde | ✅ `/gestion-eau/accueil` (page mission) et `/gestion-eau/scan` (résolveur QR « QR non reconnu ») rendus, URL préservée |
| Connexion Google non régressée | ⚠️ Non testée en live **volontairement** : ne pas déconnecter la session admin de JOEL. Raison de confiance : 4.2 ne modifie QUE la cible de `navigate` post-login ; le flux OAuth (capture jetons, `detectSessionInUrl:false`, `setSession`, ordre des events) est inchangé. Au pire repli sur `/dashboard` (comportement actuel). |

### Console (live)
3 erreurs observées, **toutes connues et non-bloquantes**, sans rapport avec le correctif :
1. `/sw.js` 404 (MIME text/html) — le vrai SW est `sw-custom.js` (piège connu, non bloquant).
2. idem (doublon).
3. `DB timeout after 5s` sur `loadUserFromSupabase` — comportement attendu (session reste valide via `catch`, piège connu).
Aucun `ErrorBoundary`, aucune redirection `/auth` parasite.

### Déploiement
| Critère | État |
|---|---|
| Version bumpée (`appVersion.ts` + `package.json`) note FR orientée utilisateur | ✅ 3.31.3 → 3.31.4 |
| `git commit` + `git push origin main` (type `fix:`) | ✅ commit `a54a39e` |
| Nouvelle version réellement en ligne (sans piège de cache) | ✅ SW désinscrit + caches vidés + navigation sur chemin différent → page version affiche **3.31.4** (chargement frais depuis l'origine, sans Service Worker) |

---

## 5. Fichiers créés / modifiés

| Fichier | Type | Partagé ? |
|---|---|---|
| `frontend/src/components/Layout/AppLayout.tsx` | Modifié (branche non authentifiée uniquement) | ⚠️ **PARTAGÉ** (shell global) |
| `frontend/src/pages/AuthPage.tsx` | Modifié (mémorisation + cible de navigation post-login) | ⚠️ **PARTAGÉ** (auth global) |
| `frontend/src/constants/appVersion.ts` | Modifié (version + nom + historique) | ⚠️ **PARTAGÉ** |
| `frontend/package.json` | Modifié (version) | ⚠️ **PARTAGÉ** |
| `RAPPORTS-CREATEUR-APPS/verrou-navigation-modules/RAPPORT-VERROU-NAV.md` | Créé (ce rapport) | Non |

**Dépendances ajoutées :** aucune.

---

## 6. Écarts au prompt
- **4.2 livré** (et non écarté). Aucun risque OAuth identifié (seule la cible de navigation change). Différence d'implémentation mineure vs le prompt : la mémorisation se fait dans `handleGoogleSignIn` (juste avant de lancer Google) plutôt qu'au montage d'`AuthPage` — choix le plus étroit et le moins susceptible de persister une valeur parasite pour les connexions par mot de passe (qui ne naviguent pas). Le prompt autorisait explicitement les deux emplacements.
- Critère « connexion Google » non validé en live (cf. ⚠️ §4) pour ne pas casser la session admin de JOEL.

---

## 7. Surprises sur le dépôt
- `useRequireAuth.ts` contient 4 `navigate('/auth')` mais est **mort** (jamais importé) → fausse piste potentielle écartée par grep.
- L'auto-reprise v3.31.3 fonctionne : `navigate('/dashboard')` du shell ramène en réalité sur `/gestion-eau` (dernier module de JOEL) — comportement attendu, pas un bug.
- Les pages internes des modules utilisent des `Navigate to="/dashboard"` (gardes de rôle Construction/Eau) : légitimes, sur refus **confirmé** seulement — non touchés.

---

## 8. Ambiguïtés / manques du prompt
- Aucune ambiguïté bloquante. Le prompt était précis (lecture bornée, cause racine fournie, correctifs détaillés).
- Le test « connexion Google » du §5 implique une déconnexion réelle, en tension avec « ne pas casser la session de JOEL » : arbitré en faveur de la préservation de session + raisonnement de non-régression.

---

## 9. Recommandations
- **Corriger le `/sw.js` 404** (piège connu, mémoire `project_sw_js_404`) : `safariServiceWorkerManager` tente `/sw.js` inexistant alors que le vrai SW est `sw-custom.js`. Cosmétique mais pollue la console et brouille les diagnostics.
- À la prochaine vraie reconnexion Google de JOEL, vérifier d'un coup d'œil le retour deep-link de 4.2 (login depuis `/gestion-eau` déconnecté → retour sur `/gestion-eau`).
- L'invariant « seul logo→footer change de module » est désormais garanti au niveau du shell (générique, pas par module) : tout futur module en hérite automatiquement.
