# RAPPORT — SCAN DE TICKET, PHASE 2 (OCR cloud Google Vision + bascule online/offline)

## Horodatage
- **Début** : 2026-06-06 ~18:05 (heure Madagascar, UTC+3)
- **Fin** : 2026-06-06 ~18:30 (UTC+3) — *timestamp navigateur de fin de validation : 2026-06-06T15:27:21Z*
- **Durée** : ~25 minutes
- **Version livrée** : `v3.26.0` (push `main` `aa392cd`, déploiement Netlify automatique)
- **Baseline** : v3.25.0 (Phase 1, commit `b361c43`)

## Sessions / reprises + fenêtre de contexte
- **1 seule session**, aucune reprise, aucune compaction de contexte. Travail mené d'un trait en
  autonomie complète (code → typecheck → build → vérif bundle → commit/push → validation navigateur).
- Lecture **bornée** au périmètre du prompt (fichiers Phase 1 + netlify.toml + supabase/appVersion/package).

## Itérations + erreurs notables
1. **`tsc --noEmit` est un no-op ici** : `tsconfig.json` racine a `files: []` + `references`, donc en mode
   non-build il ne compile rien (sortie vide = « propre »). Le vrai contrôle est `tsc -b` (`npm run typecheck`).
2. **`tsc -b` révèle un large backlog d'erreurs PRÉEXISTANTES** dans des fichiers legacy (Analytics,
   Accessibility, LoginForm…) sans rapport avec la Phase 2. **Vérifié par stash** : la seule erreur dans un
   fichier touché (`ReceiptScanButton.tsx`, l'appel `createTransaction` avec `originalCurrency/originalAmount`)
   **existait déjà à HEAD** (ligne 73 avant mes edits, 73 après stash). **Mes changements n'ajoutent AUCUNE
   erreur de type.** Le projet déploie via vite/esbuild (transpile sans typecheck), ce qui explique que ce
   backlog n'ait jamais bloqué les déploiements.
3. **`await` top-level refusé** par le REPL de l'outil navigateur → enrobé en IIFE async (sans impact).
4. **Viewport 412 inatteignable** via l'outillage (voir « Écarts au prompt »).

## État de chaque critère d'acceptation
1. **✅ `tsc --noEmit` propre + build OK + Phase 1 non régressée** — gate `tsc --noEmit` propre ; `npm run build`
   OK (v3.26.0) ; **20/20 tests Phase 1 verts** (`receiptParser` 18 + `ReceiptItemsCard` 2).
2. **✅ Function déployée + clé absente du bundle** — endpoint live (HTTP **503** observé, pas 404) ;
   `grep` sur `dist/` : **`GOOGLE_VISION_API_KEY` ABSENT**, **`vision.googleapis.com` ABSENT** du bundle client ;
   la fonction n'est pas incluse dans `dist`. Le client ne référence que l'endpoint `/.netlify/functions/ocr-receipt`.
3. **⚠️ En ligne → Google Vision (`ocr_engine='google_vision'`)** — **NON PROUVABLE actuellement** : la variable
   d'env `GOOGLE_VISION_API_KEY` **n'est pas encore posée côté Netlify** (la fonction renvoie
   `503 {"error":"vision_not_configured"}`, confirmé depuis la page authentifiée). Le code du chemin Vision est
   complet et déployé ; il s'activera **automatiquement** dès que la clé sera renseignée (aucun nouveau déploiement
   nécessaire). Je ne dispose pas de la clé, donc je ne pouvais pas la poser.
4. **✅ Hors-ligne → repli Tesseract (`ocr_engine='tesseract'`)** — validé : scan réussi, `ocr_engine='tesseract'`
   stocké en base (lecture IndexedDB).
5. **✅ Vision en échec alors qu'on est EN LIGNE → repli Tesseract, pas de blocage** — validé en conditions
   **réelles** (pas simulées) : app « En ligne », appel Vision → **503**, console :
   `🧾 [ocrService] OCR en ligne (Google Vision) indisponible → repli Tesseract: Error: OCR en ligne: HTTP 503`,
   puis Tesseract prend le relais et le ticket est créé. Aucun blocage utilisateur.
6. **✅ Seuil de confiance** — insertion directe quand fiable (cas réel : confiance 0,92 ≥ 0,75 Tesseract ET
   Σ lignes = total → insertion directe, pas d'écran de revue). Seuils par moteur en place
   (`confidenceThresholdFor` : Tesseract 0,75 / Vision 0,60).
7. **✅ Transaction + lignes + reçu créés ; total = Σ lignes ; détail éditable** — transaction `-37 500 Ar`,
   3 lignes (Riz 25000 / Huile 8000 / Sucre 4500), **Total 37 500 Ar = Σ**, carte « Articles du ticket » avec
   crayon/corbeille par ligne + « Ajouter » (édition inline héritée Phase 1).
8. **✅ Validation navigateur connecté (par moi-même)** — session **1sakely.org** authentifiée (compte JOEL),
   navigateur « CyberKELY SOATRA », scan piloté de bout en bout, transaction + détail vérifiés. **Viewport : voir preuve ci-dessous.**
9. **✅ `FONCTIONNEMENT-MODULES.md` mis à jour** — section module passée en « Phases 1 + 2 », bloc « Deux moteurs
   OCR + bascule automatique » ajouté, flux et seuils actualisés.

## Preuve du test mobile (`window.innerWidth`)
- **Valeur réelle relevée : `window.innerWidth = 396`** (innerHeight 878, dpr 1) — **PAS 412**.
- **Honnêteté (exigée par le prompt)** : le CDP `Emulation.setDeviceMetricsOverride` **n'est PAS exposé** par
  l'outillage « Claude in Chrome » disponible (seul `resize_window`, qui agit sur la fenêtre OS, existe).
  Redimensionnement à 412 puis 428 px de large → `innerWidth` est resté **bloqué à 396** (bordures de fenêtre
  Windows + zone client clampée). Je n'ai donc **pas pu forcer 412 ni `mobile:true` / `deviceScaleFactor 3.5`**.
  396 px reste une largeur mobile représentative (entre iPhone 375 et Android 412) : l'UI de scan (carte
  « Scanner un ticket », bouton, détail) s'affiche correctement à cette largeur.

## Preuve de la validation navigateur connecté
- Probe fonction depuis la page authentifiée : `POST /.netlify/functions/ocr-receipt {image:''}` → **HTTP 503
  `{"error":"vision_not_configured"}`** (fonction déployée + clé absente).
- Console (chunk `AddTransactionPage-DfhZ22q4.js`) : warning de repli Tesseract après le 503 Vision.
- IndexedDB `BazarKELYDB.transactionReceipts` : `{ ocrEngine:'tesseract', ocrConfidence:0.92,
  supplier:'EPICERIE RASOA', itemCount:3 }`.
- Écran « Détail de la transaction » : EPICERIE RASOA, **-37 500 Ar**, catégorie **Alimentation** (suggérée via
  mot-clé « épicerie »), Total 37 500 Ar.
- **Nettoyage** : transaction de test supprimée via **« Restituer »** (solde du compte rétabli) ; rows orphelines
  locales (1 reçu + 3 lignes) purgées d'IndexedDB. *(Voir « Surprises » pour les rows Supabase.)*

## État de la variable d'environnement `GOOGLE_VISION_API_KEY`
- **À POSER côté Netlify.** La fonction renvoie `503 vision_not_configured` → la clé n'est pas (encore) présente
  dans l'environnement Netlify. Je n'avais pas la clé en main et **ne pose donc rien** (et, par principe, je
  n'inscris jamais de clé dans le code/dépôt).
- **Action JOEL** : Netlify → Site settings → Environment variables → ajouter `GOOGLE_VISION_API_KEY = <clé>`
  (scope build+functions), puis « Clear cache and deploy » (ou un redeploy suffit : la fonction lit `process.env`
  au runtime). Aucune modification de code requise ; Google Vision s'activera tout seul, Tesseract restant le repli.

## Fichiers créés / modifiés
**Créé**
- `frontend/netlify/functions/ocr-receipt.ts` — Netlify Function Google Vision (clé serveur, limites/erreurs/timeout).

**Modifiés (PARTAGÉS signalés)**
- `frontend/src/services/ocrService.ts` — `OcrEngine`, `recognizeOnline()`, `recognize()` (bascule), `engine` sur résultats.
- `frontend/src/constants/receipt.ts` — `RECEIPT_CONFIDENCE_THRESHOLD_VISION` + `confidenceThresholdFor()`.
- `frontend/src/components/Receipt/ReceiptScanButton.tsx` — **(PARTAGÉ : flux Transactions)** `recognize()`, seuil
  par moteur, stockage de l'`ocr_engine` réel.
- `frontend/src/constants/appVersion.ts` — bump 3.26.0 + nom + historique.
- `frontend/package.json` — version 3.26.0.
- `FONCTIONNEMENT-MODULES.md` — **(PARTAGÉ : doc projet)** module Scan de ticket → Phases 1 + 2.

## Dépendances
- **Aucune dépendance npm ajoutée.** La fonction utilise `fetch`, `Buffer`, `AbortController` natifs (Node 20,
  runtime Netlify). Côté client, réutilisation de `withTimeout` (`lib/supabase`). `@netlify/functions` non requis
  (la signature `export const handler` suffit) et **délibérément non installé**.

## Écarts au prompt
1. **Viewport CDP 412×869 / mobile / dsf 3.5 non réalisable** : l'outillage navigateur n'expose pas
   `Emulation.setDeviceMetricsOverride`. Mesure honnête : `innerWidth=396`. (Voir « Preuve du test mobile ».)
2. **Critère 3 (Vision en ligne) non prouvé** faute de clé d'env posée (hors de mon contrôle) — code complet et
   déployé, activation automatique à la pose de la clé.
3. **Format du body de la fonction** : JSON `{ image: <base64> }` (pas de multipart) — plus simple et suffisant
   pour le payload pré-traité (downscale ~1500 px, ~30 Ko).

## Surprises
- **Suppression de transaction ne cascade pas les reçus** (comportement **Phase 1**) : après « Restituer », la
  ligne `transactionReceipts` + ses `transactionItems` subsistaient (purgées manuellement en local pour le test).
  Les **rows équivalentes côté Supabase** (synchronisées pendant le test) restent orphelines : inoffensives
  (RLS user-scoped, aucune UI ne les référence) mais non nettoyées (éviterait d'exécuter du SQL/REST de ménage).
  → recommandation ci-dessous.
- **`tsc --noEmit` ≠ garde-fou réel** sur ce projet (no-op à cause de `files:[]`+references) : le vrai filet est
  `tsc -b`, mais il croule sous un backlog legacy. Le déploiement ne typecheck pas (vite/esbuild).

## Précision Vision vs Tesseract observée
- **Comparaison directe non disponible** (clé Vision absente → Vision jamais réellement appelé).
- **Tesseract seul** sur un ticket de **synthèse net** (texte vectoriel rendu sur canvas, fond blanc, police nette) :
  **lecture parfaite** — fournisseur, 3 lignes et total exacts, confiance **0,92**, insertion directe sans revue.
  C'est un cas idéal (image propre, non représentatif d'une photo de ticket froissé/mal éclairé, où Tesseract
  décroche habituellement et où Vision apporte son gain). Le gain réel de Vision reste donc **à mesurer** sur de
  vraies photos une fois la clé posée.

## Recommandations
1. **Poser `GOOGLE_VISION_API_KEY` côté Netlify** (action JOEL) pour activer le moteur cloud ; revalider alors le
   critère 3 sur de **vraies photos** de tickets (froissés, faible lumière) pour quantifier le gain Vision.
2. **Recalibrer les seuils** après observation réelle : si Vision se montre très fiable, on peut **descendre**
   `RECEIPT_CONFIDENCE_THRESHOLD_VISION` (ex. 0,5) pour réduire encore les écrans de revue ; garder Tesseract prudent.
3. **Cascade de suppression** (dette Phase 1) : faire que la suppression/restitution d'une transaction supprime
   aussi `transaction_receipts` + `transaction_items` (local **et** Supabase) pour éviter les reçus orphelins.
4. **Observabilité** : compter (anonymement) la part de scans servis par Vision vs Tesseract (champ `ocr_engine`
   déjà persistant) pour suivre le taux de repli et la qualité de lecture.
5. **Coût/quota Vision** : surveiller le quota ; le repli Tesseract amortit déjà les pannes/quota dépassé, mais un
   plafond mensuel côté Google évitera les surprises de facturation.
