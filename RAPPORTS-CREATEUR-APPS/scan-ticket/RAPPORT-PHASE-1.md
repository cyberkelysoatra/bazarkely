# RAPPORT — PHASE 1 / 2 : Scan de ticket (socle hors-ligne)

**Projet :** BazarKELY · **Version livrée :** v3.25.0 · **Date :** 2026-06-06

---

## 1. Horodatage & exécution

- **Fin de codage / rédaction du rapport :** 2026-06-06 ~18:02 (heure locale machine).
- **Durée active :** une seule session continue autonome (≈ 1 séance), sans interruption ni
  demande d'intervention.
- **Sessions / reprises :** 1 session, 0 reprise. **Fenêtre de contexte :** non saturée (pas de
  compaction déclenchée).
- **Mode :** autonomie complète (RÈGLE #0bis non déclenchée — le prompt était entièrement cadré).

## 2. Itérations code → test → correction

1. **Lecture bornée** des fichiers patrons (transactionService, database, apiService, syncManager,
   AddTransactionPage, TransactionDetailPage, categoryService, accountService, supabase, vite, sw-custom).
2. **Construction** (types → Dexie v17 → apiService → syncManager → receiptService → ocrService →
   receiptParser → utils image → composants UI → intégrations pages → PWA precache).
3. **`tsc --noEmit`** : **propre du premier coup** (0 erreur).
4. **Tests** : 1ʳᵉ passe → **2 échecs révélateurs** (vrais bugs/écarts) :
   - **Bug parser (réel, corrigé)** : la regex de montant de fin fusionnait deux nombres séparés
     par un gros blanc (« 1 500   3 000 » lu comme « 15003000 », d'où un prix unitaire faux
     7 501 500). **Correctif** : jeton « nombre » à groupage strict de milliers (groupes de 3
     chiffres, séparateur unique) → seul le dernier nombre est capturé. Re-test : **OK**.
   - **Test trop strict** : libellés d'article d'une seule lettre (« A », « B ») filtrés par la
     garde « ≥ 2 lettres » (anti-lignes purement numériques). Test corrigé avec des libellés
     réalistes ; la garde est conservée (utile en production).
5. **`tsc --noEmit`** + **build Vite** : verts. **20 tests** verts.
6. **OCR live (dev server)** : ticket de synthèse lu **parfaitement** hors-ligne (voir §4, critère 5).
7. **SQL** exécuté via le navigateur + **vérifié REST** (critère 2).

**Erreurs marquantes :** le bug de fusion de montants (ci-dessus) — typique d'un OCR de tickets MGA
où l'espace sert à la fois de séparateur de milliers et de séparateur entre colonnes. Résolu par un
jeton numérique à groupage strict.

## 3. État de chaque critère d'acceptation

| # | Critère | État | Détail |
|---|---------|------|--------|
| 1 | `tsc --noEmit` propre, build OK, flux normal non régressé | ✅ | tsc 0 erreur ; build OK (frontend@3.25.0) ; intégrations strictement additives |
| 2 | SQL exécuté, tables + RLS, vérif REST + test négatif | ✅ | `transaction_receipts`/`transaction_items` → 200 ; anon SELECT `[]` ; **anon INSERT → 401** |
| 3 | Bouton « Scanner un ticket » visible (icône + aide ⓘ) | ✅ | `ReceiptScanButton` sur `/add-transaction` (dépenses), icône ScanLine + aide dépliable |
| 4 | Capture caméra mobile ; aucune image persistée | ✅ | `input capture=environment` ; image traitée en mémoire (Blob/Canvas) puis libérée, jamais stockée |
| 5 | OCR hors-ligne (réseau coupé) ; assets locaux | ✅ | Ticket lu en 553 ms, **confiance 0,88** ; **0 requête CDN** (assets `/tesseract/*` locaux, précachés SW) |
| 6 | Parsing ≥ 3 tickets + tests parser verts | ✅ | 18 tests parser (espaces, « 2 x », TVA ignorée, total absent → Σ, dates exclues, incohérence) |
| 7 | « Correction si doute » (revue si confiance basse / Σ≠total) | ✅ | Seuil `0,75` + cohérence ; sinon `ReviewReceipt` ; sinon insertion directe |
| 8 | 1 transaction expense (= total) + N items + 1 receipt (receipt_md) | ✅ | `createTransaction` + `receiptService.saveReceipt` ; un seul débit = total |
| 9 | Détail : carte « Articles » + édition inline → recalcul total ET solde | ✅ | `ReceiptItemsCard` ; `recomputeTotalAndSyncTransaction` ajuste transaction + solde (delta) |
| 10 | Catégorie suggérée et modifiable | ✅ | `suggestCategory` (historique fournisseur puis mots-clés), jamais bloquante |
| 11 | Hors-ligne de bout en bout + sync sans doublon | ✅ | Dexie d'abord ; sync idempotente (id client, upsert `onConflict`, rejeu `ignoreDuplicates`) |
| 12 | `FONCTIONNEMENT-MODULES.md` à jour | ✅ | Section « MODULE — SCAN DE TICKET (flux Transactions) » ajoutée |

**Aucun critère ⚠️.** Réserve honnête sur le critère 5 : la lecture *live* a été validée sur un
**ticket de synthèse** (texte net rendu sur canvas) en environnement dev ; la qualité sur **photos
réelles de tickets froissés** dépend de l'éclairage/cadrage et reste à calibrer en usage terrain
(voir §8, recommandations Phase 2).

## 4. Preuve OCR hors-ligne (critère 5)

Test exécuté dans la page (dev server, worker chauffé) sur un ticket rendu en canvas :

```
Entrée (canvas)            Sortie OCR (Tesseract fra, hors-ligne)
SHOPRITE                   "SHOPRITE\nRiz 5kg 15000\nHuile 1L 8000\nTOTAL 23000\n"
Riz 5kg      15000         confiance = 0,88 · durée = 553 ms (à chaud)
Huile 1L      8000         requêtes CDN = 0  (assets /tesseract/* locaux)
TOTAL        23000
```

Le parser sur cette sortie donne : fournisseur « SHOPRITE », 2 lignes (15000 + 8000), total 23000.

## 5. Fichiers créés / modifiés

### Nouveaux
- `frontend/src/types/receipt.ts`
- `frontend/src/services/receiptParser.ts` (+ `__tests__/receiptParser.test.ts`)
- `frontend/src/services/ocrService.ts`
- `frontend/src/services/receiptService.ts`
- `frontend/src/utils/receiptImage.ts`
- `frontend/src/constants/receipt.ts`
- `frontend/src/components/Receipt/ReceiptScanButton.tsx`
- `frontend/src/components/Receipt/ReviewReceipt.tsx`
- `frontend/src/components/Receipt/ReceiptItemsCard.tsx` (+ `__tests__/ReceiptItemsCard.test.tsx`)
- `frontend/public/tesseract/**` (worker + cœur WASM + données de langue — voir §6)

### Modifiés — ⚠️ FICHIERS PARTAGÉS (modifs strictement additives)
- `frontend/src/types/index.ts` — `SyncOperation.table_name` étend les 2 nouvelles tables
- `frontend/src/lib/database.ts` — **Dexie v17** (2 stores, migration additive)
- `frontend/src/services/apiService.ts` — 5 méthodes reçu/lignes (upsert idempotent)
- `frontend/src/services/syncManager.ts` — 2 cas de rejeu (upsert `ignoreDuplicates` + DELETE)
- `frontend/src/pages/AddTransactionPage.tsx` — bouton « Scanner un ticket »
- `frontend/src/pages/TransactionDetailPage.tsx` — carte « Articles » + refresh après édition
- `frontend/src/constants/appVersion.ts` — bump v3.25.0 + historique
- `frontend/vite.config.ts` — globPatterns injectManifest étendus (`wasm`,`gz`) pour précacher l'OCR
- `frontend/package.json` / `package-lock.json` — dépendance + version
- `FONCTIONNEMENT-MODULES.md` — nouvelle section

## 6. Dépendances ajoutées & taille des assets

- **`tesseract.js` 7.0.0** (npm) — OCR hors-ligne, gratuit, sans clé.
- **Assets de langue / cœur servis localement** (`frontend/public/tesseract/`, ~**7,2 Mo**) :
  - `worker.min.js` — 111 Ko
  - `core/tesseract-core-simd-lstm.wasm.js` — 3,90 Mo
  - `core/tesseract-core-simd-lstm.wasm` — 2,86 Mo
  - `lang/fra.traineddata.gz` — **595 Ko** (modèle **« fast »**, choisi pour le mobile Madagascar ;
    le modèle « best » faisait 6,3 Mo — réservé éventuellement à la Phase 2 cloud).
- **Précache PWA total** : 125 entrées ≈ **11,6 Mo** (≈ 4,4 Mo app + 7,2 Mo OCR). Le cœur est
  **épinglé** sur `simd-lstm` (corePath exact) — pas de résolution dynamique vers un CDN.

## 7. Écarts au prompt (et pourquoi)

- **« mets à jour la transaction via `transactionService.updateTransaction` (qui ajuste le solde) »** :
  en réalité `updateTransaction` **ne touche pas au solde** (ajustement fait ailleurs, manuellement,
  dans `TransactionDetailPage`). Pour honorer l'exigence « recalcul du total ET ajustement du
  solde », `recomputeTotalAndSyncTransaction` ajuste le solde **explicitement du delta** via
  `accountService.updateAccount` (offline-first). Comportement conforme au critère 9.
- **Cœur Tesseract épinglé `simd-lstm`** (plutôt que résolution dynamique multi-variantes) : évite
  d'embarquer ~40 Mo de variantes et toute requête CDN. SIMD WASM est supporté par toutes les
  cibles (Android Chrome, desktop moderne). Compromis documenté.
- **Modèle de langue « fast »** au lieu de « best » : taille ÷10 pour le mobile ; la précision fine
  est l'objet de la Phase 2 (cloud).
- **Précache** (et non simple cache runtime) des assets OCR : nécessaire pour le critère 11
  (1ʳᵉ utilisation hors-ligne possible dès l'installation).

## 8. Surprises sur bazarkely-2 / ambiguïtés du prompt

- **Suites de tests héritées cassées** : `transactionService.test.ts` / `syncService.test.ts`
  échouent **indépendamment** de cette livraison (elles appellent des méthodes inexistantes —
  `getTransactionById`, `getMonthlyStats` — et attendent un ancien format `ApiResponse`). Le vrai
  garde-fou du projet reste `tsc --noEmit` + build (cf. CLAUDE.md), tous deux verts.
- **`npm run build` ne typecheck pas** (piège connu) : `tsc --noEmit` lancé séparément, propre.
- **Route détail** = `/transaction/:transactionId` (singulier) — utilisée pour la navigation post-scan.
- **Ambiguïté « prix »** dans l'écran de revue (unitaire vs ligne) : choix = **prix de ligne**
  (`lineTotal`) pour garantir « total = Σ des prix » ; le prix unitaire est déduit (lineTotal/qté).

## 9. Recommandations pour la Phase 2 (OCR cloud Google Vision)

- **Qualité réelle du parsing Tesseract** : excellente sur texte net (confiance 0,88 observée),
  mais Tesseract « fast » se dégrade vite sur photos réelles (froissé, faible lumière, polices de
  ticket thermique). **Recommandation de seuil** : conserver `RECEIPT_CONFIDENCE_THRESHOLD = 0,75`
  mais **router vers Vision** quand (a) confiance OCR < 0,6, OU (b) Σ lignes ≠ total au-delà de la
  tolérance, OU (c) 0 ligne détectée — au lieu de simplement ouvrir la revue.
- **Architecture déjà prête** : `ocrService` expose `recognizeOffline` ; ajouter un
  `recognizeCloud(blob)` (Vision) + un sélecteur de moteur ; `transaction_receipts.ocr_engine`
  enregistre déjà le moteur utilisé (`'tesseract'`) pour traçabilité/calibrage.
- **Parser réutilisable tel quel** sur la sortie Vision (texte + éventuels blocs) — `receiptParser`
  est pur et indépendant du moteur ; envisager d'exploiter les **bounding boxes** Vision pour mieux
  séparer libellé/quantité/prix par colonnes (gros gain sur les tickets multi-colonnes).
- **Coût/confidentialité** : Vision uniquement en ligne et sur demande (l'utilisateur garde le mode
  hors-ligne gratuit par défaut) ; ne jamais envoyer l'image sans consentement explicite.
- **Pré-traitement** : la binarisation/redressement (deskew) améliorerait nettement Tesseract sur
  photos réelles — candidat d'amélioration peu coûteux avant de basculer cloud.

---

*Rapport généré automatiquement en clôture de Phase 1 — toutes les conditions de la DoD sont
remplies (critères verts, `tsc --noEmit` propre, build OK, version bumpée v3.25.0, commit + push
sur `main`).*
