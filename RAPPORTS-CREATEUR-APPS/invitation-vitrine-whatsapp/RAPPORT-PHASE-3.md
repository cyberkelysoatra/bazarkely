# RAPPORT — Phase 3 : Aperçu WhatsApp (Netlify Edge — injection Open Graph + image PNG dynamique)

**Chantier :** Invitation vitrine WhatsApp (Gestion Eau AHUVI)
**Phase :** 3 (finale) — aperçu riche du lien `https://1sakely.org/i/<jeton>` dans WhatsApp
**Horodatage :** 2026-06-08, ~11h45–12h05 (UTC+3, Antananarivo)
**Version déployée :** `3.37.0` (minor)
**Commits :** `80197bd` (implémentation) + `a0dd438` (polish pastille) — `git push origin main` → Netlify **Published ✓**
**Statut :** ✅ **LIVRÉ ET AUTO-VALIDÉ** (preuves ci-dessous). Validation finale réelle « coller dans WhatsApp » = **à confirmer côté JOEL** (voir limite de cache).

---

## 1. But atteint

Quand on colle `https://1sakely.org/i/<jeton>` dans WhatsApp, un **aperçu riche** s'affiche :
grande image (charte AHUVI, **% de remplissage + tendance + « Gestion Eau AHUVI »**), **titre** et
**description** en français. Au tap → ouvre la vitrine (Phase 2), inchangée.

Le robot d'aperçu de WhatsApp/Facebook **n'exécute pas le JavaScript** : la PWA seule renvoyait un
`<head>` sans contenu social. La solution injecte les balises **Open Graph côté serveur** sur `/i/*`
et sert une **image PNG** générée à la volée, via **deux Netlify Edge Functions (Deno)**.

---

## 2. Architecture livrée

### 2.1 `invite-og` — injection Open Graph sur `/i/*`
`frontend/netlify/edge-functions/invite-og.ts`, déclarée dans `netlify.toml` :
```toml
[[edge_functions]]
  path = "/i/*"
  function = "invite-og"
```
Comportement :
1. `context.next()` → récupère le HTML de l'app (passe par la redirection SPA `/* → /index.html`).
2. Lit les chiffres **non nominatifs** via la **RPC anon `eau_public_vitrine_stats()`** (REST,
   `apikey`+`Authorization` = clé **anon** depuis `SUPABASE_URL`/`SUPABASE_ANON_KEY` env, **timeout 2,5 s**,
   `AbortController`). En cas d'échec → description **générique** (jamais d'erreur).
3. **Purge** les balises `og:*` / `twitter:*` / `description` par défaut de `index.html` (anti-doublon)
   puis **injecte** les balises dynamiques avant `</head>`.
4. Renvoie le HTML modifié (Cache-Control `public, max-age=300`). Un vrai navigateur boote ensuite la
   SPA (route `/i/:token` → `EauVitrinePage`, Phase 2) ; le robot lit juste les balises.

> **Même source de chiffres que la vitrine** (`eau_public_vitrine_stats`) → aperçu et page **cohérents**.
> **Le jeton n'apparaît jamais** dans le titre/description/image (seulement dans `og:url`, comme l'URL réelle).

### 2.2 `og-invite` — image PNG 1200×630
`frontend/netlify/edge-functions/og-invite.tsx`, déclarée dans `netlify.toml` :
```toml
[[edge_functions]]
  path = "/og-invite.png"
  function = "og-invite"
```
- **Vrai PNG** (pas de SVG) via **`og_edge@0.0.6`** (`ImageResponse`, Satori → Resvg).
- Charte AHUVI : fond **dégradé `#364E30` (forest) → `#10939F` (teal)**, accent **or `#C3C067`**, goutte
  dessinée (carré arrondi pivoté, pas d'emoji → fiable).
- **Avec chiffres** : gros `{fill_pct} %` + « Niveau du bassin » + **pastille tendance** (En hausse /
  En baisse / Stable) + bandeau « Rejoignez le suivi de l'eau de votre quartier ».
- **Sans chiffres** : slogan générique « Suivez l'eau de votre quartier, simplement. » (sans %).
- **Image SANS jeton** (chiffres **globaux** du bassin) → **une seule image partagée**, cache long acceptable.
- **Anti-500** : tout échec de rendu (police/wasm) retombe sur un **PNG plein 1200×630 valide embarqué**
  (base64, charte forest) — l'endpoint renvoie **toujours HTTP 200**.

### 2.3 Variables d'environnement
`SUPABASE_URL` / `SUPABASE_ANON_KEY` lues via `Deno.env.get(...)`, **avec repli** sur les valeurs
publiques déjà embarquées dans le bundle client (`lib/supabase.ts`) — donc fonctionne même si les env
Netlify ne sont pas (encore) déclarées. **Jamais la service key.**

---

## 3. Techno d'image retenue + pourquoi

**`og_edge` (port Deno de `@vercel/og`) en Netlify Edge Function**, retenu plutôt que `@vercel/og` en
Netlify **Function Node** pour 3 raisons décisives :
1. **WASM natif Deno** : Resvg/Yoga (`.wasm`) tournent nativement sur l'edge Deno → **pas** le risque
   de bundling esbuild des `.wasm` qui complique `@vercel/og` côté Netlify Functions (Lambda).
2. **Police embarquée** : `og_edge` inclut **Noto Sans** par défaut → **aucune police à fournir**, le
   texte français (accents, `—`, `'`) rend correctement sans dépendance fragile.
3. **Approche documentée par Netlify** (guide officiel « Generate dynamic OG images using Netlify Edge
   Functions ») → chemin le plus éprouvé, le moins itératif.

Détails de robustesse :
- **Pas de JSX** : éléments construits via `React.createElement` (helper `h`) → aucun pragma JSX à
  configurer côté Deno.
- **Pas d'emoji** (💧 remplacé par une goutte dessinée) ni de glyphes `▲▼` (absents de Noto Sans) :
  tendance affichée en **mots** + **pastille colorée** → zéro dépendance à des polices symboles/twemoji.

---

## 4. Preuves mesurées (auto-validation sans WhatsApp)

Lues sur l'origine Netlify `https://gleaming-sorbet-a37c08.netlify.app` **et** sur `https://1sakely.org`
(curl, User-Agent crawler `facebookexternalhit/1.1` ; curl n'utilise aucun Service Worker).

### 4.1 Image `/og-invite.png`
```
Content-Type : image/png
Dimensions   : 1200 x 630  (vérifié IHDR + `file`: PNG image data, 1200 x 630, 8-bit/color RGBA)
Poids        : 264 795 octets (~258 Ko)  ≤ ~300 Ko  ✅
Cache-Control: public, max-age=300, s-maxage=300
HTTP         : 200 (origine Netlify ET 1sakely.org)
```
**Rendu visuel confirmé** (image téléchargée + ouverte) : dégradé AHUVI, goutte or, **« 76 % »**,
« Niveau du bassin », **pastille rouge « En baisse »** (tendance `-1`, cohérente avec la donnée Phase 2),
bandeau « Rejoignez le suivi de l'eau de votre quartier ». → C'est bien le **rendu og_edge** (RGBA,
~258 Ko), **pas** le repli (le repli plein faisait ~3 Ko).

### 4.2 Balises OG servies sur `/i/<jeton>` (extrait réel)
```html
<meta property="og:title" content="Gestion Eau AHUVI — Vous êtes invité(e)" />
<meta property="og:description" content="Bassin rempli à 76 % (en baisse). Suivez l&#39;eau de votre quartier, simplement — gratuit et même sans connexion. Touchez pour rejoindre." />
<meta property="og:image" content="https://1sakely.org/og-invite.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:type" content="image/png" />
<meta property="og:url" content="https://1sakely.org/i/<jeton>" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Gestion Eau AHUVI" />
<meta property="og:locale" content="fr_FR" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Gestion Eau AHUVI — Vous êtes invité(e)" />
<meta name="twitter:description" content="…" />
<meta name="twitter:image" content="https://1sakely.org/og-invite.png" />
```
- `og:image` **absolu** et **public** (HTTP 200, sans auth, sans redirection). ✅
- **Aucun doublon** (la purge fonctionne : une seule `og:title`). ✅
- **Jeton jamais exposé** hors `og:url`. ✅

### 4.3 Cas « avec / sans données »
- **Avec stats** (cas live actuel) : description + image **contiennent le %** (« 76 % », « en baisse »). ✅
- **Sans stats** : branches défensives → description **générique** + image **générique** (slogan, sans %),
  **toujours 200, jamais 500** (RPC en échec → `null` ; rendu en échec → repli PNG embarqué). Validé par
  lecture de code (les deux branches sont isolées ; le happy-path est prouvé live).

### 4.4 La route `/i/<jeton>` boote toujours la SPA (vrai navigateur)
HTML servi conserve `<div id="root">` + `<script type="module" … src="/assets/index-…js">` → 200.
L'injection OG (uniquement dans `<head>`) **ne casse pas** l'hydratation → la vitrine Phase 2
(claim/redirection) reste active. ✅

### 4.5 Non-régression
- Home `/` : `og:title = "BazarKELY — Gestion de budget familial"` (OG **de base**, **pas** l'OG eau) →
  l'edge n'affecte **que** `/i/*`. ✅
- `/og-invite.png` est un chemin dédié (pas de collision avec `/i/*`). Les autres modules
  (dashboard, `/auth`, construction) ne sont pas touchés (paths edge limités). ✅
- `npx tsc --noEmit` → exit 0 ; `npm run build` → OK (`frontend@3.37.0`). Les fichiers `netlify/` sont
  **hors `tsconfig` (`include: ["src"]`)** → non typechecés par `tsc`, compilés par Netlify (Deno).

---

## 5. Limite connue (documentée, pas un bug)

**WhatsApp met en cache l'aperçu par URL** (souvent plusieurs jours). Comme **chaque invitation a un
jeton unique**, l'aperçu est **frais au 1er partage** et reflète les chiffres de ce moment ; il **ne se
met pas à jour** ensuite pour ce **même** lien — **sans importance** (1 lien = 1 personne).
Consigné aussi dans `FONCTIONNEMENT-MODULES.md`.

---

## 6. Itérations / erreurs

Phase **peu itérative** (choix techno tranché avant code) :
1. **Recherche bornée** : confirmé `og_edge@0.0.6` (Deno, Noto Sans embarqué, 1200×630 par défaut) comme
   chemin Netlify le plus fiable → évite l'écueil bundling WASM de `@vercel/og` Node.
2. **Anti-500 préparé en amont** : génération locale (Node `zlib`, sans dépendance) d'un PNG plein
   1200×630 valide (~3 Ko) embarqué en base64 comme repli garanti.
3. **1ère mise en prod** (`80197bd`) : **tout vert du premier coup** — image og_edge rendue (1200×630,
   ~248 Ko), OG injecté, SPA intacte, non-régression OK.
4. **1 polish cosmétique** (`a0dd438`) : la pastille de tendance s'étirait sur toute la largeur (défaut
   `align: stretch` d'une colonne flex) → ajout `alignSelf: 'flex-start'` pour qu'elle épouse son libellé.
   Re-déployé, re-vérifié visuellement (image ~258 Ko, pastille compacte).

Aucune erreur de build/déploiement Netlify (edge + functions bundlés sans incident).

---

## 7. Fichiers créés / modifiés

**Edge functions (NOUVEAUX) :**
- `frontend/netlify/edge-functions/invite-og.ts` — injection Open Graph dynamique sur `/i/*`
  (RPC anon `eau_public_vitrine_stats`, purge + injection, jeton jamais exposé, Cache-Control court).
- `frontend/netlify/edge-functions/og-invite.tsx` — image PNG 1200×630 via `og_edge` (charte AHUVI,
  chiffres ou générique), repli PNG embarqué anti-500.

**Partagés (modifiés) :**
- `netlify.toml` **(PARTAGÉ)** — 2 blocs `[[edge_functions]]` (`invite-og` → `/i/*`, `og-invite` → `/og-invite.png`).
- `frontend/index.html` **(PARTAGÉ)** — balises Open Graph **de base** (site BazarKELY), remplacées par
  l'edge sur `/i/*`.
- `frontend/src/constants/appVersion.ts` **(PARTAGÉ)** — `APP_VERSION = 3.37.0`, note FR non-technique,
  entrée `VERSION_HISTORY` 3.37.0.
- `frontend/package.json` — version `3.37.0`.
- `FONCTIONNEMENT-MODULES.md` — section « Aperçu WhatsApp riche (Phase 3) » + limite de cache WhatsApp.

**Dépendances ajoutées :** **aucune** dans `package.json`. Les imports edge sont des URL Deno résolues
par Netlify au build : `https://esm.sh/react@18.2.0` et `https://deno.land/x/og_edge@0.0.6/mod.ts`.

---

## 8. Écarts / surprises

- **Image SANS jeton** (écart bénéfique vs `/i/${token}/og.png` suggéré) : les chiffres affichés étant
  **globaux** (non nominatifs), inutile de passer le jeton à l'image. Endpoint **token-free**
  `/og-invite.png` → plus simple, pas d'exposition du jeton dans `og:image`, image mutualisée + cache long.
- **`og:image` collision évitée** : un chemin `/i/<token>/og.png` aurait été capté par l'edge `/i/*`
  (injecteur HTML) → choix d'un chemin **dédié** `/og-invite.png`.
- **Routage** : déclaré dans `netlify.toml` (comme demandé) plutôt qu'en `export const config` inline,
  pour éviter tout doublon de déclaration.
- **Repli anti-500** : préparé mais **non déclenché en prod** (le rendu og_edge réussit) — filet de
  sécurité conservé.

---

## 9. Recommandations

1. **Déclarer `SUPABASE_URL` / `SUPABASE_ANON_KEY`** dans les variables d'environnement Netlify (dashboard)
   pour ne pas dépendre du repli embarqué — purement défensif (la clé anon est déjà publique).
2. **Validation réelle WhatsApp (JOEL)** : créer une invitation par lien (Phase 4), coller le lien
   `1sakely.org/i/<jeton>` dans une conversation WhatsApp et vérifier l'aperçu (image + titre + texte).
   Rappel : **cache WhatsApp** — l'aperçu est figé au 1er partage du lien (sans importance, 1 lien = 1 personne).
   Au besoin, le **validateur OG de Facebook** (« Sharing Debugger ») permet de forcer un re-scrape pour test.
3. **Évolution éventuelle** : si un jour on veut un visuel par rôle ou par client, passer un paramètre à
   `/og-invite.png` (ex. `?role=client`) — l'architecture le permet sans refonte.

---

**Conclusion :** Phase 3 **terminée** — code déployé sur `main` (Netlify Published), aperçu OG + image PNG
dynamique **vérifiés en production** (origine Netlify et `1sakely.org`). Reste la confirmation visuelle
côté WhatsApp par JOEL (limite de cache rappelée).
