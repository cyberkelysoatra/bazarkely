# RAPPORT — Migration Cloudflare, Phase 3 (Finalisation de la branche)

- **Horodatage :** 2026-06-11 (UTC 2026-06-10T21:24Z)
- **Branche de travail :** `cloudflare-migration` (jamais `main`)
- **Commits ajoutés (sur la branche uniquement) :**
  - `4fcf130` chore(cloudflare): remove obsolete 'Deploy to Netlify' GitHub Actions workflow
  - `ca75882` fix(cloudflare): og-invite.png — switch workers-og -> @cf-wasm/og for reliable rich render
- **`main` :** INTACT — `170b014` en local **et** sur `origin/main` (identiques, aucun commit ajouté).
- **Builds consommés :** **0 build Netlify**, **1 build Cloudflare Pages** (préviz, déclenché par le push unique de la branche).

---

## ⚠️ Prérequis restants AVANT la bascule du domaine (rappel en tête)

> La bascule du domaine (`1sakely.org` → Cloudflare) est une **étape manuelle séparée, faite par JOEL**, hors de cette phase. Avant de la lancer :

1. **Clé Google Vision à poser** — `GOOGLE_VISION_API_KEY` dans Cloudflare Pages → Settings → Environment variables, en **Production ET Preview**. Tant qu'elle est absente, l'OCR cloud renvoie `503 vision_not_configured` et l'app retombe proprement sur Tesseract (non bloquant, mais OCR dégradé).
2. **Accès OVH prêt** — pour repointer le DNS du domaine vers Cloudflare.
3. **Décision « pause auto-déploiement Netlify avant fusion `main` »** — avant de fusionner `cloudflare-migration` → `main`, décider si l'on suspend l'auto-déploiement Netlify (sinon Netlify redéploiera depuis `main` au moment de la fusion). La fusion vers `main` n'est PAS faite dans cette phase.

---

## A. Suppression du workflow GitHub « Deploy to Netlify » — ✅ FAIT

- Fichier supprimé : `.github/workflows/deploy.yml` (son `name:` était précisément `Deploy to Netlify`).
- Raison : runs en échec en boucle depuis des mois + redondant avec l'auto-déploiement natif Netlify + inutile sous Cloudflare. Tarit la source des emails d'échec.
- **Workflows restants intacts :** `.github/workflows/ci.yml` (« CI - Tests and Coverage ») — conservé (c'est un workflow de tests, pas de déploiement ; les tests y sont déjà désactivés via un simple `echo`, comportement préexistant non modifié).
- Commit : `4fcf130` (sur la branche).

## B. Re-validation OCR — ✅ DOCUMENTÉ (clé absente → 503 propre)

- Endpoint testé : `POST https://cloudflare-migration.bazarkely.pages.dev/api/ocr-receipt`.
- **Résultat : `HTTP 503 { "error": "vision_not_configured" }`.**
- Lecture du code (`frontend/functions/api/ocr-receipt.ts`, lignes 38-42) : ce 503 est renvoyé **avant tout parsing du body**, uniquement parce que `env.GOOGLE_VISION_API_KEY` est absente de l'environnement **Preview**. C'est donc la **dégradation propre attendue** (le client bascule sur Tesseract — Phase 1).
- **Non bloquant.** Dès que JOEL pose la clé (Production + Preview), l'endpoint renverra `200 { text, confidence }` (ou un code Vision propre 413/502/504 selon l'image). À re-tester après pose de la clé, avant bascule.

## C. Fiabilisation du rendu `/og-invite.png` — ✅ RENDU RICHE OK (1 build)

- **Cause racine identifiée :** `workers-og` n'embarque **aucune police par défaut**. Sans police, le rendu satori produit un **flux VIDE** (jamais d'exception) → le filet de sécurité retombait **systématiquement** sur le PNG de repli embarqué (≈ 3,16 Ko). C'est ce qui était observé en Phase 2.
- **Correctif (1 seule tentative, comme prescrit) :** remplacement de `workers-og` par **`@cf-wasm/og`** (variantes `legacy/workerd` à wasm **inliné**, pensées pour le runtime Cloudflare Workers/Pages). `@cf-wasm/og` **embarque une police par défaut** (Noto Sans latin) : le rendu riche s'initialise même si le `fetch` de la police Roboto échoue. Le markup HTML est converti en arbre satori via `@cf-wasm/og/html-to-react` (`t()`). **Composition, dimensions (1200×630) et repli PNG embarqué conservés** (rendu bufférisé → tout échec/flux vide retombe sur le repli).
- **Dépendances :** `workers-og` retiré, `@cf-wasm/og@^0.3.8` ajouté (`package.json` + `package-lock.json`).
- **Validation sur la préviz (build Cloudflare #1) :**
  - Avant build : `/og-invite.png` = **3 161 octets** (repli plein, 1200×630).
  - Après build : `/og-invite.png` = **221 214 octets**, **1200×630**, `content-type: image/png`.
  - **Contrôle visuel** : composition complète rendue — dégradé forest→teal, goutte or, en-tête « Gestion Eau AHUVI », gros **« 92 % »** dynamique, « Niveau du bassin », pastille verte **« En hausse »**, pied de page « Rejoignez le suivi de l'eau de votre quartier ».
- **Décision : on GARDE `@cf-wasm/og`.** Aucun 2ᵉ build nécessaire (pas de repli au 1er build → pas de retour à `workers-og`).
- Commit : `ca75882` (sur la branche).

---

## État des critères d'acceptation

| Critère | État |
|---|---|
| Workflow « Deploy to Netlify » supprimé (autres intacts) | ✅ `deploy.yml` supprimé, `ci.yml` conservé |
| OCR : 200 avec clé OU 503 documenté si clé absente | ✅ 503 `vision_not_configured` documenté (clé absente) |
| `/og-invite.png` : rendu riche **ou** repli fiable 1200×630 | ✅ **rendu riche** OK, 1200×630, 221 Ko |
| `npx tsc --noEmit` → exit 0 | ✅ exit 0 (fonction hors scope tsconfig `include: ["src"]`) |
| `main` intact, 0 build Netlify, ≤ 2 builds Cloudflare | ✅ main = `170b014` (== origin), 0 Netlify, **1** Cloudflare |
| Rapport écrit | ✅ ce fichier |

### Note sur `tsc`
- `npx tsc --noEmit` = **exit 0** (le garde-fou retenu par `CLAUDE.md`).
- `npx tsc -b` (build complet du projet) remonte des erreurs **préexistantes et hors périmètre** (`databaseMigration.ts`, `recurringUtils.ts`, fichiers de test `pwa.test.ts`/`safari-compatibility.test.ts`, `types/family.ts`, etc.) — **aucune** introduite par cette phase. La fonction `og-invite.png.ts` est hors des deux tsconfig (bundlée par Cloudflare, pas par `tsc`).

## Note `/context`
Exécution autonome (agent) : la capture d'écran de la commande interactive `/context` n'est pas réalisable programmatiquement dans ce contexte. Aucun dépassement de contexte rencontré ; la phase est restée largement dans le budget. Repères de consommation : 1 build Cloudflare (sur 500/mois), 0 build Netlify.

---

## Périmètre strictement respecté
- Travail **uniquement** sur `cloudflare-migration` ; **aucun** push/fusion vers `main` ; **aucun** déploiement Netlify.
- Aucun changement du comportement fonctionnel de l'app (seules une fonction de rendu d'image OG et la suppression d'un workflow CI/CD).
- Bascule du domaine **NON lancée** (étape manuelle séparée de JOEL).
