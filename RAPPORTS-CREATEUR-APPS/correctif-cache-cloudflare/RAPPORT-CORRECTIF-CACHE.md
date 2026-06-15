# RAPPORT — Correctif `index.html` périmé (cache Cloudflare + Service Worker)

- **Date :** 2026-06-13
- **Branche :** `cloudflare-migration` (push direct, PAS `main`)
- **Commit :** `7658802` — *fix: stopper l'index.html périmé (no-cache racine + navigation SW NetworkFirst) v3.48.1*
- **Version :** 3.48.0 → **3.48.1** (patch)
- **Durée (correctif → publication validée) :** ~30 min (diagnostic + 2 couches + build + déploiement Cloudflare Pages ~5 min + validation curl)
- **Statut :** ✅ **RÉSOLU & PROUVÉ EN PRODUCTION** (1sakely.org)

---

## 1. Bug corrigé

Après un push qui déploie, une navigation simple (sans `?cb=` anti-cache) recevait un **ancien** bundle `index-<hash>.js` périmé, alors qu'un `curl …/?cb=<unique>` obtenait le dernier build. Conséquence réelle : un correctif déployé semblait « ne pas marcher » côté utilisateur jusqu'à purge manuelle du cache ; les navigations pleine page sur routes profondes étaient aussi cassées par le SW.

## 2. Cause racine (deux couches de cache empilées sur le document HTML)

1. **Edge Cloudflare** — `frontend/public/_headers` ne posait `no-cache`/`must-revalidate` que sur `/*.html`. Or la vraie entrée est la **racine `/`** (`start_url` PWA) et les **routes SPA** (sans extension `.html`, servies via `_redirects /* /index.html 200`) → elles échappaient à la règle et pouvaient être mises en cache au bord.
2. **Service Worker** — `frontend/src/sw-custom.ts` servait la navigation SPA en **« cache d'abord »** (`createHandlerBoundToURL('/index.html')`) → l'`index.html` précaché (ancien) était servi tant que le nouveau SW n'avait pas activé son précache.

## 3. Fichiers modifiés (5)

| Fichier | Nature |
|---|---|
| `frontend/public/_headers` | **Couche A** — règles `no-cache` racine + index.html |
| `frontend/src/sw-custom.ts` | **Couche B** — navigation NetworkFirst + repli précache offline |
| `frontend/src/constants/appVersion.ts` | bump 3.48.1 + APP_BUILD_DATE + entrée VERSION_HISTORY |
| `frontend/package.json` | version 3.48.1 |
| `PROCEDURES-OUTILS.md` | doc dépôt — nouveau piège **P12** (corrigé + procédure de test fiable) |

## 4. Diff résumé des 2 couches

### Couche A — `frontend/public/_headers`
```diff
+# Document d'entrée SPA — jamais servi périmé (revalidation systématique).
+/
+  Cache-Control: no-cache
+
+/index.html
+  Cache-Control: no-cache
+
 # HTML — jamais en cache (revalidation systématique).
 /*.html
   Cache-Control: public, max-age=0, must-revalidate
```
`no-cache` (revalidation), **pas** `no-store` → l'offline reste possible. `/assets/*` inchangé (immuable, cache long).

### Couche B — `frontend/src/sw-custom.ts`
```diff
-import { precacheAndRoute, createHandlerBoundToURL, cleanupOutdatedCaches } from 'workbox-precaching';
+import { precacheAndRoute, matchPrecache, cleanupOutdatedCaches } from 'workbox-precaching';

-// Navigation fallback pour SPA
-const handler = createHandlerBoundToURL('/index.html');
-const navigationRoute = new NavigationRoute(handler, { denylist: [ … ] });
+// Navigation SPA : « réseau d'abord » avec repli offline sur le précache.
+const navigationHandler = new NetworkFirst({
+  cacheName: 'html-cache',
+  networkTimeoutSeconds: 3,
+  plugins: [{ handlerDidError: async () => (await matchPrecache('/index.html')) || Response.error() }],
+});
+const navigationRoute = new NavigationRoute(navigationHandler, { denylist: [ /* IDENTIQUE */ ] });
 registerRoute(navigationRoute);
```
- **En ligne** → index.html FRAIS depuis le réseau (le `no-cache` de la Couche A contourne un edge périmé) → dernier bundle sans purge.
- **Hors-ligne / réseau en échec ou timeout (3 s)** → repli sur l'`index.html` **précaché** (`matchPrecache`).
- `denylist` **identique** ; `precacheAndRoute(__WB_MANIFEST)`, `cleanupOutdatedCaches`, `skipWaiting`+`clientsClaim`, `api-cache` NetworkFirst et le précache Tesseract (`/tesseract/*` wasm/gz) **inchangés**.

## 5. Preuves de production (1sakely.org, profil normal sans purge)

### Critère 1 — en-tête racine `no-cache` (Couche A live)
```
$ curl -I https://1sakely.org/
Cache-Control: no-cache          ← (avant : public, max-age=0, must-revalidate)
```

### Critère 2 (CENTRAL) — navigation simple sert la nouvelle version sans purge
| | Bundle servi (`curl https://1sakely.org/`, **sans `?cb=`**) | Version |
|---|---|---|
| **AVANT** publication | `index-BqXWbneI.js` | 3.48.0 |
| **APRÈS** publication | `index-BQxXDA8b.js` | **3.48.1** ✓ |

`grep '3.48.1'` dans le bundle servi → **présent**. La navigation simple (sans paramètre anti-cache) sert le neuf, **aucune purge manuelle requise**. *(Note : le hash diffère du build local `index-CbJsfPoF.js` car Cloudflare Pages rebuild la source sur sa propre infra — comportement attendu, non un défaut.)*

### Couche B live
```
$ curl -s https://1sakely.org/sw-custom.js | grep -oE 'html-cache|networkTimeoutSeconds|matchPrecache'
html-cache            ← cacheName NetworkFirst
networkTimeoutSeconds ← repli rapide (3 s)
matchPrecache         ← repli offline précache
```

### Critère 3 — Offline OK (vérifié au niveau artefact déployé)
Le `sw-custom.js` déployé **précache `index.html`** (entrée `"index.html"` présente dans le manifeste) **et** câble le repli `matchPrecache('/index.html')` via `handlerDidError`. Avec `skipWaiting`+`clientsClaim`, une navigation hors-ligne sert l'index.html précaché. *(Le basculement live `navigator.onLine=false` se prouve en navigateur ; ici la preuve est l'inspection de l'artefact SW publié — précache + repli présents.)*

### Critère 4 — Pages Functions & deep-links non cassés
```
/og-invite.png      → HTTP 200  image/png            (Function PNG, pas index.html)
/i/<token>          → HTTP 200  text/html            (middleware OG, pas le catch-all SPA)
/api/ocr-receipt    → HTTP 503  application/json     (Function joignable ; 503 = clé Vision absente, connu/attendu)
```
`_redirects /* /index.html 200` et les deep-links `?tab=`/`?bt=`/`?c=` intacts (denylist navigation inchangée). `/assets/*` toujours immuable.

### Critère 5 — qualité build
```
npx tsc --noEmit  → exit 0
npm run build     → OK (dist/_headers contient les règles no-cache ; dist/sw-custom.js régénéré, 24.09 kB)
```

### Critère 6 — doc dépôt
`PROCEDURES-OUTILS.md` → nouveau piège **P12** (cause, résolution 2 couches, procédure de test fiable).

## 6. Anti-régression vérifiée

- ✅ Offline : précache `index.html` + repli `matchPrecache` présents dans le SW déployé ; précache Tesseract (`/tesseract/*` wasm/gz) intact → « Scan ticket » hors-ligne préservé.
- ✅ Pages Functions non interceptées : `/i/*`, `/og-invite.png`, `/api/ocr-receipt` répondent (pas avalées par le SPA, restées dans la denylist).
- ✅ Repli SPA `_redirects /* /index.html 200` intact ; deep-links OK.
- ✅ Assets hashés `/assets/*` toujours en cache long immuable (règle inchangée).
- ✅ Aucune modification des règles SW existantes (skipWaiting, purge caches obsolètes, api-cache).

## 7. Reste éventuel

- **Routes profondes au bord :** le test `curl -I /` prouve la racine en `no-cache` ; la Couche B (NetworkFirst client-side) couvre les routes SPA profondes en ligne. Si une route profonde précise devait encore être servie périmée par l'edge, ajouter une règle `_headers` dédiée — non observé ici.
- **Cosmétique hors périmètre :** `/sw-custom.js` est servi par Cloudflare avec `Cache-Control: max-age=14400, must-revalidate` (≠ règle `_headers` `max-age=0`). Non touché par ce correctif (règle `/sw-custom.js` inchangée) et sans impact : les navigateurs revalident systématiquement le script du SW. À traiter séparément si besoin.
- **Première bascule :** sur un appareil ayant l'ancien SW « cache d'abord », la toute première navigation après ce déploiement peut nécessiter **1 rechargement** le temps que le nouveau SW NetworkFirst s'active ; ensuite, plus aucune purge.

---

*Rapport généré le 2026-06-13 — correctif app-wide (tous utilisateurs), boucle d'autonomie complète.*
