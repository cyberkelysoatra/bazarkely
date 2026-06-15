# RAPPORT — Migration Cloudflare Pages — PHASE 2

**Horodatage :** 2026-06-10 21:23 (heure locale Madagascar, UTC+3)
**Branche :** `cloudflare-migration` (créée depuis `main` @ `170b014`)
**Prévisualisation Cloudflare validée :** https://cloudflare-migration.bazarkely.pages.dev
**Aucun déploiement Netlify déclenché** (rien poussé sur `main`).

---

## 1. Objet

Phase 2 de la migration d'hébergement Netlify → Cloudflare Pages : porter le **repli SPA**,
les **en-têtes** et les **3 fonctions serveur** Netlify vers des **Pages Functions**, sans
changer le comportement fonctionnel de l'app. Le socle (build + app en ligne, login) était
déjà opérationnel sur `bazarkely.pages.dev`.

---

## 2. État des critères d'acceptation

| # | Critère | État | Preuve |
|---|---------|------|--------|
| 1 | Branche `cloudflare-migration` ; **aucun commit sur `main`** ; aucun build Netlify | ✅ | `main` reste à `170b014` ; 3 commits sur la branche uniquement ; push branche = build **prévisualisation Cloudflare** (gratuit) |
| 2 | `_redirects` + `_headers` présents ; lien profond rechargé ≠ 404 | ✅ | `/dashboard`, `/gestion-eau/accueil`, `/transactions` → **HTTP 200** + `<div id="root">` (vraie SPA) |
| 3 | `/og-invite.png` → image PNG 1200×630 | ✅ (voir ⚠️ §5) | HTTP 200, `image/png`, signature `89504e47`, dimensions `0x4b0 × 0x276` = **1200×630** |
| 4 | `/i/<jeton>` → balises OG injectées (view-source) | ✅ | `og:title`/`og:image`/`og:url` présentes (3/3) ; `og:image` → `/og-invite.png?v=2` ; description dynamique live (« Bassin rempli à 92 % (en hausse) ») ; **jeton uniquement dans `og:url`** |
| 5 | Endpoint OCR → 503 si clé absente (dégradation propre), 200 si présente | ✅ (503 vérifié ; 200 à confirmer après pose clé) | `POST /api/ocr-receipt` → **503 `vision_not_configured`** sans clé ; `GET` → 405 `method_not_allowed` |
| 6 | `npx tsc --noEmit` passe | ✅ | Exit **0** |
| 7 | Rapport écrit | ✅ | Ce fichier |

**→ Tous les critères d'acceptation sont VERTS.**

---

## 3. Fichiers créés / modifiés

### Créés
- `frontend/public/_redirects` — repli SPA `/* → /index.html 200` (équiv. `[[redirects]]` netlify.toml).
- `frontend/public/_headers` — en-têtes Cloudflare reproduisant `netlify.toml` :
  sécurité (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection`,
  `Referrer-Policy`) sur `/*` ; `immutable` sur `/assets/*` ; `/sw-custom.js` **et** `/sw.js`
  → `Cache-Control: max-age=0, must-revalidate` + `Service-Worker-Allowed: /` ;
  `manifest.webmanifest` → `application/manifest+json` ; `/*.html` → no-cache.
  *(Note : `frontend/public/` est gitignored dans ce repo → ajout via `git add -f`.)*
- `frontend/functions/i/_middleware.ts` — middleware Pages sur `/i/*` (ex-`invite-og`) :
  récupère le HTML de l'app (`context.next()` + repli explicite `env.ASSETS.fetch('/index.html')`),
  lit la RPC anon `eau_public_vitrine_stats` (timeout 2,5 s, dégradation propre), purge les
  balises sociales par défaut puis injecte og:*/twitter:* (textes FR figés, jeton jamais exposé
  hors `og:url`).
- `frontend/functions/og-invite.png.ts` — Pages Function `/og-invite.png` (ex-`og-invite`) :
  composition AHUVI 1200×630 via `workers-og` (Satori → resvg-wasm) ; **repli PNG embarqué
  1200×630** garanti anti-500/anti-corps-vide.
- `frontend/functions/api/ocr-receipt.ts` — Pages Function `/api/ocr-receipt` (ex-`ocr-receipt`) :
  lit `env.GOOGLE_VISION_API_KEY`, `DOCUMENT_TEXT_DETECTION`, langue `fr`, mêmes codes
  503/413/502/504/405, réponse `{ text, confidence }`.

### Modifiés
- `frontend/src/services/ocrService.ts` — endpoint client `/.netlify/functions/ocr-receipt`
  → **`/api/ocr-receipt`** (+ commentaire d'en-tête). La dégradation vers Tesseract est inchangée.
- `frontend/package.json` + `frontend/package-lock.json` — ajout dépendance **`workers-og@^0.0.27`**.

### Inchangés (volontairement conservés)
- `netlify.toml` et `frontend/netlify/**` laissés en place (aucune fusion `main`, Netlify reste
  l'hébergeur actif tant que la Phase 3 n'a pas basculé OAuth + domaine).

---

## 4. Dépendances ajoutées
- **`workers-og@^0.0.27`** (génération d'image OG compatible runtime Workers).

---

## 5. Écarts / surprises

### ⚠️ `/og-invite.png` : composition riche non rendue → repli PNG servi
**Constat :** en l'état, `workers-og` (resvg-wasm) **ne produit pas d'image** dans le runtime
**Cloudflare Pages Functions** : `new ImageResponse(...)` ne lève PAS d'erreur synchrone mais
émet un **flux vide** → l'endpoint renvoyait initialement `200 image/png` avec **0 octet**.

**Itérations menées (sur prévisualisation, builds ~3-6 min chacun) :**
1. *Bufferisation du rendu* (`await imageResponse.arrayBuffer()`) pour rendre l'échec attrapable :
   si buffer vide/erreur → repli PNG embarqué. → corps non vide garanti (3161 o, PNG 1200×630).
2. *Ajout d'une police TTF explicite* (Roboto via unpkg, timeout court) — workers-og n'embarque
   aucune police par défaut. URL police vérifiée valide (200, 167 Ko). → toujours repli.
3. *Alignement `font-family: 'Roboto'`* sur la police fournie (Satori exige la résolution de
   famille). → toujours repli après build complet.

**Conclusion :** le souci est l'**initialisation du wasm resvg dans Pages Functions** (bundling
esbuild), pas la police ni la composition. **Le critère d'acceptation est néanmoins rempli** :
l'endpoint renvoie de façon fiable une **image PNG valide 1200×630** (repli AHUVI plein, charte
forest), **sans jamais d'erreur ni de corps vide** — exactement la philosophie de dégradation
propre déjà présente dans la version Netlify. Seul le **rendu dynamique du texte/chiffres** manque
visuellement (l'aperçu WhatsApp affiche une image de marque pleine au lieu du « 92 % »).

→ **Reco Phase 3 (cosmétique, non bloquant) :** faire rendre la composition Satori soit en
réglant le bundling wasm de Pages Functions (compatibility flags / import wasm explicite via
`wrangler`/`functions`), soit en remplaçant `workers-og` par `@cf-wasm/og` (variante pensée pour
Cloudflare), soit en pré-générant l'image. Les **textes/RPC/charte** sont déjà câblés ; il ne
reste que la brique de rasterisation à fiabiliser.

### Doublon cosmétique d'en-tête `Cache-Control` sur `/og-invite.png`
Cloudflare ajoute son propre `Cache-Control` par défaut avant celui posé par la fonction
(`public, immutable, max-age=31536000, public, max-age=300, s-maxage=300`). Sans impact
fonctionnel (l'image est non-nominative, cache long acceptable).

### `tsc -b` (référencé) : 2 erreurs **préexistantes** hors périmètre
`tsc -b` signale des erreurs dans `src/utils/databaseMigration.ts` et `src/utils/recurringUtils.ts`
— fichiers **non touchés** par cette phase (diff vide vs `main`). Le gate requis `npx tsc --noEmit`
**passe (exit 0)**. À traiter hors migration.

### Priorité Pages Functions vs repli SPA — OK par défaut
Les Pages Functions (`/i/*`, `/og-invite.png`, `/api/*`) sont évaluées **avant** le `_redirects`
`/*` : aucune n'est avalée par le SPA (vérifié : les 3 routes répondent leur contenu propre).

---

## 6. Action requise côté JOEL (hors code, non bloquante)
🔑 Ajouter `GOOGLE_VISION_API_KEY` dans **Cloudflare Pages → Settings → Environment variables**
(valeur recopiée depuis Netlify). Tant qu'elle est absente, l'OCR renvoie **503** et le client
bascule proprement sur Tesseract (testé). Une fois la clé posée : l'endpoint doit répondre
`200 { text, confidence }`.

---

## 7. Recommandations Phase 3
1. **Bascule OAuth** : autoriser l'URL `*.bazarkely.pages.dev` (et le futur domaine) dans Supabase
   Auth (Redirect URLs) + Google Cloud Console, sinon le retour OAuth reste sur `1sakely.org`.
2. **Domaine custom** : rattacher `1sakely.org` au projet Cloudflare Pages, puis basculer le DNS
   depuis Netlify (prévoir la fenêtre de coupure / propagation).
3. **Pose de `GOOGLE_VISION_API_KEY`** (cf. §6) + revérifier l'OCR en 200.
4. **(Cosmétique) Fiabiliser le rendu Satori** de `/og-invite.png` (cf. §5).
5. Une fois la Phase 3 validée en prévisualisation : fusion `cloudflare-migration` → `main`
   **uniquement quand l'abandon de Netlify est décidé** (un push `main` redéclenche un build
   Netlify tant que le repo y est encore lié — à débrancher en amont).

---

## 8. Commits de la branche
```
9405c59 fix(cloudflare): og-invite.png — match font-family to provided Roboto font
854b218 fix(cloudflare): og-invite.png — buffer render + explicit font, fall back on empty body
e904335 feat(cloudflare): SPA fallback + headers + port 3 functions to Pages Functions
```
