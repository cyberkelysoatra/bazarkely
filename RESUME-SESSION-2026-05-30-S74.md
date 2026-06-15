# RÉSUMÉ DE SESSION — S74 (2026-05-30)

## Problème traité
Une transaction (et potentiellement comptes/prêts/budgets/partages familiaux) saisie **sous réseau dégradé** apparaissait **2 à 3 fois** dans la liste (ex. « RAISSA » ×3, « Essais Doublon HorsLigne » ×2). Détecté à partir d'une copie de console + capture d'écran fournies par JOEL.

## Diagnostic (cause racine)
Mécanisme du **double-envoi avec identifiants différents** :
1. À la création, l'enregistrement est sauvé en IndexedDB avec un UUID client.
2. En ligne, l'app tente un envoi direct vers Supabase avec **timeout 5 s**. Sous réseau lent, l'INSERT **est commité côté serveur** mais la réponse dépasse 5 s → l'app croit à un échec.
3. L'app **met l'opération en file** → le SyncManager la rejoue → **2ᵉ INSERT**.
4. Aggravant décisif : l'INSERT **ne transmettait jamais l'id client** (`apiService` et `syncManager` faisaient `const { id, ...insertData } = data` ou `.insert()` sans id). Le serveur générait donc un **nouvel UUID aléatoire à chaque envoi** → aucune déduplication possible.
5. Le rafraîchissement (`bulkPut`) **ajoutait** les lignes serveur sans supprimer l'orpheline locale → jusqu'à 3 copies visibles.

Marqueur de l'ancien comportement dans les logs : `🔄 ID de la transaction mis à jour: <idLocal> → <idServeur>` (branche `supabaseTransaction.id !== transactionId`).

## Correctif (v3.16.1) — idempotence par upsert + id client conservé
Principe : **conserver le même identifiant côté téléphone et côté serveur**, et écrire en **`upsert(onConflict: 'id')`** sur **tous** les chemins offline-first/mis en file. Ainsi l'envoi direct qui « expire mais passe » et le rejeu de la file convergent sur **une seule ligne**.

### Fichiers modifiés (10)
- `services/syncManager.ts` — 14 branches CREATE : ne retirent plus l'id, passent en `.upsert(data, { onConflict: 'id', ignoreDuplicates: true })` (transactions, accounts, budgets, goals, fee_configurations, personal_loans, loan_repayments, loan_interest_periods, reimbursement_requests, family_shared_transactions, family_sharing_rules, family_shared_recurring_transactions, family_members).
- `services/apiService.ts` — createTransaction/createAccount/createBudget/createGoal : `.insert()` → `.upsert({...}, { onConflict: 'id' }).select().single()`.
- `services/transactionService.ts` — payload d'envoi direct inclut `id: transactionId`.
- `services/accountService.ts` — payload d'envoi direct inclut `(supabaseData as any).id = accountId`.
- `services/budgetService.ts` — `mapBudgetToSupabase` ajoute `id: budget.id`.
- `services/goalService.ts` — `mapGoalToSupabase` ajoute `id`.
- `services/loanService.ts` — createLoan / recordPayment / generateInterestPeriod : `.insert()` → `.upsert(onConflict id)`.
- `services/familySharingService.ts` — shareTransaction / pushReimbursementInsert / upsertSharingRule(CREATE) / shareRecurringTransaction : `.insert()` → `.upsert(onConflict id)`.
- `constants/appVersion.ts` + `package.json` — bump 3.16.0 → 3.16.1 + entrée historique.

### Hors périmètre (volontaire)
Chemins **purement en ligne** (sans file, sans id client → non concernés par le double-envoi) : `familyGroupService.createFamilyGroup` + `joinFamilyGroup` (id serveur), `reimbursementService.createReimbursementRequest` et `reimbursement_payments/allocations/member_credit_balance`.

## Vérifications
- ✅ `npm run build` réussi (bundle + SW générés). Les erreurs `tsc` affichées sont **pré-existantes** (fichiers test/utils non touchés) — aucun des 10 fichiers modifiés n'est en cause.
- ✅ Déployé : commit `1cf2348` sur `main` → Netlify (bundle `index-BvV4OH8z.js`).
- ✅ Validé en prod sur 3 conditions (réseau rapide, 3G, hors-ligne→reconnexion) : une seule ligne à chaque fois, marqueur `🔄 ID de la transaction mis à jour` **disparu**.

## Piège rencontré
JOEL a d'abord testé **sur l'ancien Service Worker** (« 🔄 Service Worker en attente détecté » répété, marqueur `ID mis à jour` toujours présent). Il a fallu Unregister + Update on reload + fermer tous les onglets pour charger réellement la 3.16.1.

## Reste à faire (SESSION DÉDIÉE)
**Nettoyage des doublons déjà existants** (RAISSA ×3, Essais Doublon HorsLigne ×2, Taxi ×2…) en base Supabase + IndexedDB, **et recalcul des soldes faussés** (les doublons ont décrémenté les soldes plusieurs fois). Le présent correctif empêche seulement la création de **nouveaux** doublons.

## Note dépôt
3 fichiers modifiés non liés (`useFamilyRealtime.ts`, `familyGroupService.ts`, `recurringTransactionService.ts`) sont restés **non commités** dans le dépôt de JOEL — travaux en cours à clarifier.
