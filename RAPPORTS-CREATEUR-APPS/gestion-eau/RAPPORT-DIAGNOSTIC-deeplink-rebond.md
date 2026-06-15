# RAPPORT DE DIAGNOSTIC — Rebond `/gestion-eau` → `/dashboard` au hard-reload (F5) à froid

> **Chantier de DIAGNOSTIC SEUL.** Aucun code applicatif modifié, aucun déploiement, aucun bump de version, aucun commit/push. Dépôt laissé intact. Seul livrable : ce rapport + un correctif **proposé mais NON appliqué**.

---

## 1. Horodatage & déroulé

| | |
|---|---|
| Début (session) | 2026-06-07 15:32:25 |
| Fin (rédaction rapport) | 2026-06-07 15:38:31 |
| Durée active | ~6 min |
| Sessions / reprises | 1 seule session, sans reprise |
| Fenêtre de contexte atteinte | Non |
| Version prod testée | `https://1sakely.org`, bundle `index-CML6W4qf.js` (≈ v3.31.x) |
| Compte de test | **joelsoatra@gmail.com** (admin), id `5020b356-7281-4007-bec6-30a956b8a347` — identité **identique** côté store Zustand et session Supabase |

**Méthode :** lecture bornée des 6 fichiers de la surface de redirection, puis preuve runtime sur la prod via l'extension Claude pour Chrome (navigateur « CyberKELY SOATRA », deviceId `909e8779-…`). Test A/B déterministe sur `localStorage['bazarkely_active_module']`, doublé d'un test « à froid » (IndexedDB vidé) pour distinguer C1 des gardes de rôle.

---

## 2. Reproduction — étapes exactes & preuves

### Constante d'environnement
- Connecté admin, `pathname = /gestion-eau`.
- Clé observée au démarrage : `localStorage['bazarkely_active_module'] = "gestion-eau"`.

### Tableau des observations

| # | État Dexie/IndexedDB | `bazarkely_active_module` | URL chargée | **URL finale** | Verdict |
|---|---|---|---|---|---|
| A | chaud | `bazarkely` | `/gestion-eau` | **`/dashboard`** | 🔴 REBOND |
| B (contrôle) | chaud | `gestion-eau` | `/gestion-eau` | `/gestion-eau` | ✅ reste |
| C (froid) | **vidé** | `bazarkely` | `/gestion-eau` | **`/dashboard`** | 🔴 REBOND |
| D (contrôle froid) | **vidé** | `gestion-eau` | `/gestion-eau` | `/gestion-eau` (stable 8 s) | ✅ reste |

> IndexedDB vidé en C/D : bases supprimées = `BazarKELYDB`, `GestionEauDB`, `GestionEauTilesDB`, `bazarkely-db`, `keyval-store` (re-synchronisées automatiquement depuis Supabase au rechargement — source de vérité). **`localStorage` jamais vidé** (c'est la variable du diagnostic + porteur de session).

### Preuves runtime brutes
- **Test A** → `{"finalPath":"/dashboard","savedModule":"bazarkely"}`
- **Test B** → `{"finalPath":"/gestion-eau","savedModule":"gestion-eau"}`
- **Test C (froid)** → `{"finalPath":"/dashboard","savedModule":"bazarkely"}`
- **Test D (froid, 8 échantillons à 1 s)** → `{"samples":["/gestion-eau" ×8],"finalPath":"/gestion-eau","savedModule":"gestion-eau"}`

### Console au moment du rebond (Test C, froid + `bazarkely`)
Aucun log d'erreur eau, **aucun toast « Accès refusé »**, aucune trace de refus de rôle. Seuls apparaissent :
```
🔐 Auth state change: SIGNED_IN
🔄 [SyncManager] 🌐 En ligne au démarrage…
💰 [LoanService] ⚠️ Échec Supabase → tableau vide: … timeout after 5000ms   (sans rapport, page budget)
🔐 Auth state change: INITIAL_SESSION
✅ Session Supabase restaurée pour: joelsoatra@gmail.com
```
→ Le rebond se produit **silencieusement**, sans passer par la logique de refus d'accès du module eau.

---

## 3. Tableau des candidats — confirmé / écarté

| Cand. | Emplacement | Statut | Preuve |
|---|---|---|---|
| **C1** | `ModuleSwitcherContext.tsx:157-162` — `if (!isInSavedModule && isDefaultRoute) navigate(savedModule.path)` | ✅ **DÉCLENCHÉ — CAUSE RACINE** | Le rebond suit **déterministement** la seule clé `bazarkely_active_module` (A vs B, C vs D). Or **seule C1 lit cette clé**. Rebond identique à froid (C), donc indépendant du cache. |
| **C2** | `GestionEauRoute.tsx:80` — `<Navigate to="/dashboard">` si `sessionStatus==='valid' && rolesConfirmed && !hasEauAccess` | ❌ ÉCARTÉ | Admin = `hasEauAccess` vrai. Test D (froid, module=`gestion-eau`) reste **stable 8 s** (au-delà de la fenêtre de pull de 6 s) → la garde n'éjecte jamais l'admin. Aucun toast « refusé » en C. |
| **C3** | `EauRoleProtectedRoute.tsx:50` & `:65` — `<Navigate to="/dashboard">` si `!hasEauAccess` | ❌ ÉCARTÉ | Même preuve que C2 (admin a accès + rôle admin). De plus C3 est en aval de C2 (shieldé). Insensible à `bazarkely_active_module`. |
| **C4** | `AppLayout.tsx:237` — `path="*"` → `/dashboard` | ❌ ÉCARTÉ | `/gestion-eau` **matche** la route `path="/gestion-eau/*"` (`AppLayout.tsx:227-234`), jamais le catch-all. Insensible à la clé. |
| **C5** | `App.tsx` — `onAuthStateChange` / `initializeApp` | ❌ ÉCARTÉ | Aucun `navigate`/`Navigate` dans ces chemins (lecture complète). Insensible à la clé. |

**Logique d'isolation :** entre Test A et Test B (et C vs D), **la seule variable changée est `bazarkely_active_module`**. L'identité, le rôle admin, l'état de session sont identiques. Aucun des candidats C2…C5 ne lit cette clé. Donc la différence de comportement ne peut venir que de **C1**. C'est une isolation déterministe, pas une hypothèse.

---

## 4. Cause racine prouvée

**Fichier :** `frontend/src/contexts/ModuleSwitcherContext.tsx`
**Lignes :** `140-165` (effet de restauration au montage), point de bascule **`157-162`**.

```ts
// useEffect monté une seule fois (hasCheckedStorage)
const savedModule = loadSavedModule();              // lit localStorage['bazarkely_active_module']
if (savedModule) {
  const isInSavedModule = moduleIdForPath(currentPath) === savedModule.id;
  const isDefaultRoute =
    currentPath === '/dashboard' ||
    currentPath === '/construction/dashboard' ||
    currentPath === '/gestion-eau';                  // ← /gestion-eau est une "route d'atterrissage"
  if (!isInSavedModule && isDefaultRoute) {
    navigate(savedModule.path);                       // ← savedModule = bazarkely ⇒ navigate('/dashboard')
    setActiveModuleState(savedModule);
    return;
  }
}
```

**Mécanisme exact :**
1. Au boot, `ModuleSwitcherProvider` (monté tout en haut, `App.tsx:169`, **au-dessus** de `GestionEauProvider` et des routes) exécute son effet de restauration **une fois**.
2. Si `bazarkely_active_module === "bazarkely"` (module BazarKELY, `path: '/dashboard'`) **et** que l'URL courante est `/gestion-eau` (listée comme route d'atterrissage), alors `!isInSavedModule` (`gestion-eau` ≠ `bazarkely`) **et** `isDefaultRoute` sont vrais → **`navigate('/dashboard')`** immédiat.
3. Ce `navigate` démonte tout le sous-arbre `/gestion-eau/*` **avant** même que les gardes de rôle aient leur mot à dire. Le rôle de l'utilisateur n'intervient jamais.

**Pourquoi le correctif v3.29.1 ne couvrait pas ce cas :** v3.29.1 a durci **uniquement** `GestionEauRoute` (la garde de rôle : ne rebondit plus que sur refus confirmé, sinon spinner/écran d'attente). Or le rebond résiduel **ne passe pas par la garde de rôle** : il est émis **en amont**, par `ModuleSwitcherContext`, qui est purement client-side et **indépendant du rôle**. Le correctif visait la mauvaise couche.

**Déclencheur en usage réel :** `bazarkely_active_module` n'est écrit **que** par `setActiveModule` (clic explicite dans le sélecteur de module, ligne `201`). Donc dès qu'on atteint `/gestion-eau` par **tout autre moyen** que le sélecteur (deep-link, lien in-app, signet, ou simplement parce que la dernière action sélecteur était « BazarKELY ») puis qu'on **recharge (F5)**, la clé vaut `bazarkely` et le rebond se produit. (Si la clé est `null` — jamais utilisé le sélecteur — pas de rebond ; d'où le caractère intermittent.)

---

## 5. Correctif minimal proposé (⚠️ NON appliqué)

**Idée directrice :** la restauration « dernier module utilisé » ne doit s'appliquer **qu'à la racine neutre** (`/` ou `/dashboard`), **pas** quand l'utilisateur a explicitement demandé une route d'un autre module. Atterrir sur `/gestion-eau` (ou `/construction/dashboard`) est une **intention explicite** qui doit primer sur la restauration.

**Modification ciblée — `ModuleSwitcherContext.tsx`, bloc `150-156` :** retirer les routes propres aux modules de la liste `isDefaultRoute`, ne garder que la racine réellement neutre :

```ts
// AVANT (157 → rebondit aussi depuis /gestion-eau et /construction/dashboard)
const isDefaultRoute =
  currentPath === '/dashboard' ||
  currentPath === '/construction/dashboard' ||
  currentPath === '/gestion-eau';

// APRÈS (proposé) — ne restaurer que depuis la racine neutre
const isDefaultRoute =
  currentPath === '/' ||
  currentPath === '/dashboard';
```

> Variante plus conservatrice si l'on veut garder la restauration depuis `/dashboard` tout en respectant une arrivée explicite sur un autre module : ne déclencher la restauration que si **l'URL courante appartient au module par défaut** (`moduleIdForPath(currentPath) === 'bazarkely'`). Cela revient au même pour le cas eau (on ne rebondit plus depuis `/gestion-eau`).

**Effets de bord potentiels à valider :**
- **Module Construction** : un F5 sur `/construction/dashboard` avec `bazarkely_active_module='bazarkely'` ne rebondira plus vers `/dashboard` — comportement **souhaitable** et symétrique au fix eau (à confirmer comme voulu).
- **Restauration « reprendre où j'étais »** : la restauration automatique ne s'opère plus que depuis `/` et `/dashboard`. Cas concret : on quitte l'app en étant « module eau », puis on rouvre via un raccourci pointant `/dashboard` → on **ne** sera **plus** redirigé automatiquement vers `/gestion-eau`. Si cette restauration depuis `/dashboard` est un comportement désiré, préférer la **variante conservatrice** (test `moduleIdForPath`), qui la préserve.
- Aucun impact sur `setActiveModule` (clic sélecteur) ni sur l'effet `170-173` qui synchronise `activeModule` à la route.

**Comment valider ensuite (mêmes scénarios que ce rapport) :**
1. `bazarkely_active_module='bazarkely'`, F5 sur `/gestion-eau` → doit **rester** sur `/gestion-eau` (à froid ET à chaud).
2. Idem `/construction/dashboard` → reste.
3. Non-régression sélecteur : cliquer BazarKELY→Eau→BazarKELY navigue correctement.
4. Non-régression restauration : F5 sur `/dashboard` selon la variante retenue.

---

## 6. Confirmation — dépôt intact

- `git status --porcelain --untracked-files=no` → **vide** (exit 0) : **aucune** modification de fichier suivi.
- Aucun commit, aucune branche de travail créée, aucun déploiement, aucun bump de version.
- Les fichiers `??` (untracked) listés par `git status` étaient **déjà présents** au début de session (identiques au snapshot initial). Le seul ajout est **ce rapport** (`RAPPORTS-CREATEUR-APPS/gestion-eau/RAPPORT-DIAGNOSTIC-deeplink-rebond.md`), livrable attendu.
- Navigateur de test remis à son état initial : `bazarkely_active_module = "gestion-eau"` (valeur observée au démarrage). IndexedDB se re-synchronise seul depuis Supabase.

---

## 7. Surprises / ambiguïtés & recommandations

- **Surprise utile :** le rebond est **insensible à l'état « froid »** (IndexedDB vidé) — contre-intuitif si l'on suspectait une course de rôles. C'est justement ce qui disqualifie la piste rôle et pointe vers une cause purement client-side (C1).
- **Caractère intermittent expliqué :** le bug n'apparaît que si `bazarkely_active_module ∈ {bazarkely, construction}`. Avec `null` (sélecteur jamais utilisé) ou `gestion-eau`, pas de rebond → d'où l'impression d'aléatoire selon l'historique de navigation de l'utilisateur.
- **Le même mécanisme explique aussi le « deep-link rebond » historique** (pas seulement le F5) : arriver sur `/gestion-eau` par un lien externe avec la clé à `bazarkely` rebondit dès le premier rendu, sans recharge.
- **Recommandation pour la session de correctif :**
  1. Trancher avec JOEL : la restauration auto « dernier module » depuis `/dashboard` est-elle voulue ? → choisit entre la version simple et la **variante conservatrice**.
  2. Appliquer le correctif ciblé `ModuleSwitcherContext.tsx`, lancer `npx tsc --noEmit`, bumper la version, déployer.
  3. Re-jouer les 4 scénarios du §5 sur prod (test A/B sur la clé) pour valider la non-régression Construction et la restauration.
