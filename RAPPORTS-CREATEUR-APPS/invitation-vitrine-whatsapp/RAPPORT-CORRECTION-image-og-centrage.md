# Rapport — Correction : recentrage de l'image d'aperçu WhatsApp (anti-rognage) + cache-bust

**Date :** 2026-06-08
**Version déployée :** `3.37.1` (correctif `patch`)
**Commit :** `e0b1ab2` — `fix(gestion-eau): center OG invite image (anti-crop) + image cache-bust v3.37.1`
**Branche :** `main` → Netlify **Published** (vérifié)
**Périmètre :** cosmétique, **2 edge functions Deno uniquement** — aucun schéma, aucune donnée, aucun écran.

---

## 1. Problème

L'image PNG `/og-invite.png` (1200×630, « 76 % » net) était correcte **mais sa composition
était calée à GAUCHE**. WhatsApp recadre l'aperçu du fil en format quasi-carré **centré** et
**rogne les côtés** → le « 76 » était coupé, il ne restait que « % ».

Cause directe : le conteneur racine n'avait ni `alignItems` ni `textAlign`, et les 3 lignes
(header `key:'h'`, centre `key:'c'`, footer `key:'f'`) n'avaient pas de `justifyContent` → tout
le contenu se tassait à gauche.

---

## 2. Correctifs appliqués

### 2.1 `frontend/netlify/edge-functions/og-invite.tsx` — recentrage + safe-zone
- **Conteneur racine** : ajout `alignItems:'center'` + `textAlign:'center'` (dégradé, paddings,
  `justifyContent:'space-between'`, `flexDirection:'column'` conservés).
- **Les 3 lignes (h / c / f)** : ajout `justifyContent:'center'` (cause directe du rognage).
- **Header** (goutte + marque) : `justifyContent:'center'` + `alignItems:'center'`.
- **Bloc central** (chiffres ET slogan générique) : `alignItems:'center'` + `textAlign:'center'`.
- **Pastille tendance** : `alignSelf:'flex-start'` → **`alignSelf:'center'`**.
- **Footer/bandeau** : `justifyContent:'center'` + `textAlign:'center'` + `maxWidth:'620px'`.
- **Safe-zone** : gros nombre `fontSize` **210px → 190px** (marge pour « 100 % »), slogan
  générique `maxWidth` 960px → **620px**.
- **Inchangé** : dimensions 1200×630, charte AHUVI, textes FR figés, repli PNG anti-500,
  `fetchStats`, `cache-control`.

### 2.2 `frontend/netlify/edge-functions/invite-og.ts` — cache-bust
- `og:image` et `twitter:image` pointent désormais vers **`…/og-invite.png?v=2`** (cache-buster) :
  WhatsApp/Facebook considèrent une **nouvelle URL d'image** et re-téléchargent la version
  recentrée. Le `?v=` est ignoré côté edge (l'endpoint répond toujours). Reste de l'injecteur
  inchangé (purge anti-doublon, jeton non exposé hors `og:url`, description dynamique).

---

## 3. Fichiers modifiés
| Fichier | Nature |
|---|---|
| `frontend/netlify/edge-functions/og-invite.tsx` | recentrage h+v, pastille center, 210→190, slogan 960→620 |
| `frontend/netlify/edge-functions/invite-og.ts` | `og:image`/`twitter:image` → `?v=2` |
| `frontend/src/constants/appVersion.ts` | version 3.37.1 + note FR + entrée historique |
| `frontend/package.json` | version 3.37.1 |

---

## 4. Vérifications (auto-validées en prod)

- ✅ `npx tsc --noEmit` exit 0 ; `npm run build` OK (sw-custom built, version 3.37.1).
- ✅ Déploiement **Published** — injection `?v=2` détectée ~30 s après push sur l'origine
  Netlify `gleaming-sorbet-a37c08.netlify.app`.
- ✅ `GET /og-invite.png` sur **les deux origines** (`*.netlify.app` ET `1sakely.org`) :
  **HTTP 200**, `Content-Type: image/png`, **262 699 octets (~256 Ko ≤ 300 Ko)**,
  **1200×630** (IHDR vérifié), `cache-control: public, max-age=300, s-maxage=300`.
- ✅ **Preuve de centrage / anti-rognage** : carré central **630×630** (x 285→915) recadré et
  inspecté visuellement → « 76 % », « Niveau du bassin », goutte + « Gestion Eau AHUVI »,
  pastille « En baisse » et bandeau **entièrement dans le carré, rien coupé**.
- ✅ `GET /i/<jeton>` (User-Agent crawler) : `og:image` **et** `twitter:image` = `…/og-invite.png?v=2` ;
  description dynamique « Bassin rempli à 76 % (en baisse)… » ; **1 seule occurrence** par clé
  (pas de doublon) ; **jeton présent uniquement dans `og:url`**, nulle part ailleurs.
- ✅ **Non-régression** : la home `/` garde son OG de base (BazarKELY, pas l'aperçu eau) ;
  `/i/<jeton>` boote toujours la SPA (`<div id="root">` + script module).

### Preuves visuelles jointes
- `og-invite-v2-full.png` — image pleine 1200×630 (composition centrée).
- `og-invite-v2-square-center.png` — **carré central 630×630** (simulation du recadrage WhatsApp ;
  tout le contenu clé visible, non coupé).

#### Avant / Après
- **Avant** : composition calée à gauche → « 76 » hors du carré central → coupé par WhatsApp,
  seul « % » visible.
- **Après** : composition centrée h+v dans la safe-zone → « 76 % » entier dans le carré central.

---

## 5. Rappel pour JOEL (test côté WhatsApp)

> WhatsApp met l'aperçu en **cache par lien** pendant plusieurs jours. L'ancien aperçu rogné
> peut donc rester affiché pour un lien **déjà partagé**.
>
> Pour voir l'image recentrée :
> 1. Tester avec un **NOUVEAU lien** `/i/<jeton>` (jamais encore partagé sur WhatsApp).
> 2. Au besoin, forcer un nouveau scan via le **Facebook Sharing Debugger**
>    (https://developers.facebook.com/tools/debug/) : coller l'URL du lien → « Scrape Again ».
>
> Le cache-bust `?v=2` couvre les **nouveaux** liens ; pour un lien déjà mis en cache, seul un
> re-scrape (ou l'expiration naturelle du cache WhatsApp) rafraîchira l'aperçu.
