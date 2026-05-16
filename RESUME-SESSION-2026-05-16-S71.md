# RÉSUMÉ SESSION S71 — 2026-05-15 → 2026-05-16

**Versions livrées :** 3.14.3 + 3.14.4 + 3.14.5 + 3.14.6
**Branche :** `claude/distracted-lumiere-71d154` → mergée 4 fois sur `main` (merge `--no-ff`)
**Commits sur main :**
- `4220696` Merge v3.14.3 — Pattern auth offline-safe unifié sur account/goal/transactionService
- `5429130` Merge v3.14.4 — Bruit console offline éliminé (WebSocket + autoCreateBudgets + recurringTransactions)
- `549b65b` Merge v3.14.5 — familySharingService lectures offline-safe (5 fonctions) + favicon precache
- `0df611c` Merge v3.14.6 — Dexie v15 family_members + lectures familySharing skip-offline + SW update skip-offline

**Déploiement :** ✅ Validé en production sur https://1sakely.org. Logs offline finaux confirment :
- Console **totalement vide** au démarrage offline (les seuls logs sont les `✅` informatifs des services métier)
- TransactionService : `311 transaction(s) depuis IndexedDB (retour immédiat)`
- ReimbursementService : `2 reimbursement(s) en attente depuis IndexedDB (retour immédiat)`
- SW polling : `⏸️ [SW] Vérification de mise à jour skipped — offline` (au lieu du `⚠️ Failed to update a ServiceWorker` historique)
- Plus aucun `AuthRetryableFetchError`, `ERR_INTERNET_DISCONNECTED`, `WebSocket connection failed`, ni "Vous n'êtes pas membre de ce groupe"

---

## Demande initiale de JOEL

Reprise après S70 clôturée. JOEL propose les priorités S71 du "grand nettoyage offline" :
- **P1** : Lectures à migrer (familySharingService 12x getUser, getFamilyGroupMembers, services divers)
- **P2** : Bruit console à éliminer (useBudgetIntelligence, useFamilyRealtime, recurringTransactionService)
- **P3** : Mutations à migrer (BudgetsPage createBudget, mutations famille)
- **P4** : reimbursement phase 2 (FIFO + credit balance + allocations)

JOEL recommande P1 lectures + P2 bruit console avant P4 reimbursement phase 2.

---

## Cadrage (séries de questions fermées)

### Série 1 — Périmètre S71
| Question | Réponse | Implication |
|---|---|---|
| Périmètre ? | C — P1 #3 d'abord (`getCurrentUserId` unifié sur accountService/goalService/transactionService) | Fix mécanique rapide |
| familySharingService 12x getUser ? | NON — lectures uniquement (mutations en P3) | Périmètre clair |
| `getFamilyGroupMembers` ? | B — Nouvelle table Dexie `family_group_members` (pattern S69) | Refonte offline-first |
| Versioning ? | B — Bump patch par chantier (v3.14.x au fil) | Granularité fine |

### Série 2 — Architecture P1#3
| Question | Réponse | Implication |
|---|---|---|
| Helper centralisé ou local ? | B — Helper local privé par service (autonome, pas de dépendance croisée) | Cohérence avec v3.14.0 (recurring importait depuis familyGroupService — décision révisée) |
| Périmètre 4 services ? | B — Migrer les 4 sans relecture préalable | accountService, goalService, transactionService (apiService legacy exclu) |
| Cas apiService legacy ? | B — Laisser tel quel (migration callers vers services offline-first plus tard) | |
| Audit anti-régression ? | B — Tracer callers impactés avant code | RÈGLE #2 |

### Série 4 — Après v3.14.4 (P2 bruit console)
| Question | Réponse | Implication |
|---|---|---|
| Vite.svg micro-fix ? | A — Bundle avec P1 suivant | |
| Suite S71 ? | A — P1#1 familySharingService 12x getUser → getCurrentUserSafe | |

### Série 5 — Après v3.14.5 (régression check membership)
| Question | Réponse | Implication |
|---|---|---|
| Stratégie checks membership ? | C — Fix complet P1#2 (Dexie family_members + snapshots) | Architecture solide |
| SW update offline ? | OUI — skip si offline | Élimine bruit polling |
| Bundle dans v3.14.6 maintenant ? | A — Maintenant | |

---

## Travail accompli

### v3.14.3 — Pattern auth offline-safe unifié sur 3 services

**Objectif :** Éliminer le fallback `supabase.auth.getUser()` (fetch réseau, throw `AuthRetryableFetchError` en offline) dans les méthodes privées `getCurrentUserId()` de 3 services métier.

**Fichiers modifiés :**
- `services/accountService.ts` : `getCurrentUserId()` aligné sur pattern S68 (Zustand → getSession → null)
- `services/goalService.ts` : idem
- `services/transactionService.ts` : idem

**Pattern appliqué (helper local privé) :**
```typescript
private async getCurrentUserId(): Promise<string | null> {
  try {
    const storeUser = useAppStore.getState().user;
    if (storeUser?.id) return storeUser.id;
  } catch {}
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.user?.id) return data.session.user.id;
  } catch (error) {
    console.error('❌ [Service] ...', error);
  }
  return null;
}
```

**Architecture résultante :** 6 services métier critiques (loans, family, recurring, reimbursement, account, goal, transaction) utilisent désormais le même pattern offline-safe. Aucun ne fait `getUser()` dans ses chemins offline-first.

### v3.14.4 — Bruit console offline éliminé (3 quick wins)

**`hooks/useFamilyRealtime.ts` — skip WebSocket si offline :**
- Les 4 fonctions `subscribeToFamilyGroup` / `subscribeToFamilyMembers` / `subscribeToSharedTransactions` / `subscribeToReimbursements` retournent un cleanup no-op si `useAppStore.isOnline === false`
- `isOnline` mis dans les deps de `useCallback` → quand la connexion revient, les callbacks sont re-créés, les `useEffect` parents qui les ont en deps re-trigger naturellement, et les subscriptions sont créées sans intervention manuelle
- Élimine 6 `WebSocket connection failed wss://...realtime/v1/websocket` au démarrage offline

**`hooks/useBudgetIntelligence.ts` :**
- `loadTransactions` : remplacement `apiService.getTransactions()` (online-only) par `transactionService.getTransactions()` (offline-first SWR depuis v3.10.0). Plus de mapping snake_case → camelCase manuel
- `autoCreateBudgets` : early return si `!navigator.onLine`. Auparavant en offline → 11 tentatives `apiService.createBudget()` POST échouaient toutes → **22 lignes d'erreur** (11 POST + 11 supabase.ts)

**`services/recurringTransactionService.ts` :**
- `getAll` : skip Supabase si `!navigator.onLine`, retour direct IndexedDB. Plus de `GET .../recurring_transactions ERR_INTERNET_DISCONNECTED` x3 au démarrage Dashboard

**Impact mesuré (logs prod) :** ~23 lignes d'erreur éliminées au démarrage offline + ~10 lignes de stack traces.

### v3.14.5 — familySharingService lectures + favicon precache

**`services/familySharingService.ts` — helper local + 5 lectures migrées :**
- Helper module-local `getCurrentUserSafe()` ajouté (pattern S68 répliqué, cohérent avec loanService, familyGroupService, reimbursementService). Pattern dupliqué localement (pas d'import croisé) conformément à la décision série 2
- 5 fonctions de lecture migrées de `supabase.auth.getUser()` vers `getCurrentUserSafe()` :
  - `getFamilySharedTransactions` (utilisée par `TransactionsPage` line 251)
  - `getUserSharingRules`
  - `shouldAutoShare`
  - `getSharedTransactionByTransactionId`
  - `getSharedRecurringTransactions`
- 7 mutations conservées intactes (shareTransaction, unshareTransaction, updateSharedTransaction, upsertSharingRule, deleteSharingRule, shareRecurringTransaction, unshareRecurringTransaction) — migration P3

**`index.html` — favicon dans le precache PWA :**
- Remplacement `<link rel="icon" type="image/svg+xml" href="/vite.svg" />` (asset Vite par défaut non présent dans le precache Workbox → `vite.svg net::ERR_INTERNET_DISCONNECTED` x2) par `<link rel="icon" type="image/png" href="/icon-192x192.png" />` (déjà précaché Workbox + déjà référencé comme `apple-touch-icon`)

### v3.14.6 — Dexie v15 family_members + lectures skip-offline + SW skip-offline

**Cause racine de la régression v3.14.5 :** `getCurrentUserSafe` (v3.14.5) éliminait le **premier** fetch `getUser`, mais le **deuxième** fetch `supabase.from('family_members').select('id').single()` (check membership inline) continuait à planter avec `ERR_INTERNET_DISCONNECTED` → `membershipError` truthy → throw du message erroné "Vous n'êtes pas membre de ce groupe" alors que l'utilisateur EST membre.

**`lib/database.ts` — Dexie v15 :**
- Nouvelle table `familyMembers!: Table<FamilyMember>` avec index composite `[familyGroupId+userId]` (vérification membership rapide) et `[familyGroupId+isActive]` (filtrage membres actifs)
- Import `FamilyMember` depuis `types/family`
- Migration `upgrade()` vide — la table est peuplée au premier appel online de `getFamilyGroupMembers`

**`services/familyGroupService.ts` :**
- Helper exporté `verifyMembership(familyGroupId, userId): Promise<boolean>` : (1) Dexie d'abord, (2) si cache absent + offline → return true (faire confiance plutôt que bloquer), (3) si online → tenter Supabase + peupler le cache Dexie
- Refactor `getFamilyGroupMembers` en SWR offline-first complet :
  - Lecture Dexie d'abord (filtre familyGroupId puis isActive en mémoire, contourne limitations Dexie boolean indexing)
  - Si offline → retour direct cache (ne throw plus, vide acceptable)
  - Si online → `verifyMembership` + `supabase.from('family_members').select(...)`, fallback cache si fetch échoue, `db.familyMembers.where('familyGroupId').delete()` + `bulkPut` pour remplacer le cache
  - Tri admin-first conservé

**`services/familySharingService.ts` — 5 lectures :**
- Early return offline ajouté entre `getCurrentUserSafe` et le check membership Supabase. Le check membership et la requête principale sont tous deux online-only et auraient planté → on les contourne directement
- Retours : `getFamilySharedTransactions` → `[]`, `getUserSharingRules` → `[]`, `shouldAutoShare` → `false`, `getSharedTransactionByTransactionId` → `null`, `getSharedRecurringTransactions` → `[]`

**`hooks/useServiceWorkerUpdate.ts` :**
- `registration.update()` (vérification périodique de mise à jour du SW) skip si `!navigator.onLine`
- Log informatif `⏸️ [SW] Vérification de mise à jour skipped — offline` au lieu du `⚠️ Failed to update a ServiceWorker for scope` historique

---

## Validation production

### Logs offline avant S71 (v3.14.2, ~30 lignes d'erreur au démarrage)
- `helpers.js:87 GET .../auth/v1/user ERR_INTERNET_DISCONNECTED` x N
- `recurringTransactionService.ts:290 GET .../recurring_transactions ERR_INTERNET_DISCONNECTED` x 3
- `useFamilyRealtime.ts:107 WebSocket connection failed` x 6
- `useBudgetIntelligence.ts:99 Erreur API: TypeError: Failed to fetch` x 2
- `apiService.ts:86 Erreur createBudget` x 11 + `supabase.ts:87 Supabase error` x 11
- `familySharingService.ts:894 Erreur dans getFamilySharedTransactions: Error: Utilisateur non authentifié`
- `familyGroupService.ts:499 Erreur dans getFamilyGroupMembers: Error: Vous n'êtes pas membre de ce groupe`
- `vite.svg net::ERR_INTERNET_DISCONNECTED` x 2
- `useServiceWorkerUpdate.ts ⚠️ Failed to update a ServiceWorker` x N

### Logs offline après S71 (v3.14.6, **0 ligne d'erreur**)
```
📱 [TransactionService] 💾 Lecture des transactions depuis IndexedDB...
📱 [TransactionService] ✅ 311 transaction(s) depuis IndexedDB (retour immédiat)
💸 [ReimbursementService] ✅ 2 reimbursement(s) en attente depuis IndexedDB (retour immédiat)
⏰ Vérification périodique des mises à jour...
⏸️ [SW] Vérification de mise à jour skipped — offline
```

**Console offline 100% propre.** Aucune erreur, uniquement les logs informatifs `✅` des lectures Dexie.

---

## Reste à faire (S72 ou sessions ultérieures)

### P3 — Mutations offline-first (~2-3h)
- 7 mutations `familySharingService` : `shareTransaction`, `unshareTransaction`, `updateSharedTransaction`, `upsertSharingRule`, `deleteSharingRule`, `shareRecurringTransaction`, `unshareRecurringTransaction` → queue via syncManager
- 3 mutations `familyGroupService` : `createFamilyGroup`, `joinFamilyGroup`, `leaveFamilyGroup` → idem
- Mutations `BudgetsPage` `createBudget` x 3 → via `budgetService.createBudget` (offline-first avec queue)

### P4 — Phase 2 reimbursement (~3-4h)
- `recordReimbursementPayment` FIFO + credit balance + allocations offline-first
- 2 nouvelles tables Dexie : `reimbursement_payments`, `reimbursement_payment_allocations`
- `getPaymentHistory`, `getAllocationDetails`
- Propagation `CloudOff` sur `FamilyReimbursementsPage`

### Cleanup
- Pages legacy utilisant `apiService` directement (vs services offline-first) — substitution mécanique
- `hooks/useMultiYearBudgetData` + `hooks/useYearlyBudgetData` → migrer `apiService.getBudgets` et auth
- `loanStorageService` dead code
- Unification `syncManager` + `onlineStatusService`

---

## Capitalisation

### Memory mise à jour
- **Nouveau pattern** : "skip-offline early return" comme alternative légère à offline-first complet pour les fonctions sans cache local (return `[]` / `null` / `false`) — cf. v3.14.4 useBudgetIntelligence et v3.14.6 familySharingService lectures
- **Confirmation pattern** : helper `getCurrentUserSafe` local privé par service (autonome, pas d'import croisé) — décision série 2, cohérent v3.14.3 (les 3 services) et v3.14.5 (familySharingService)

### CLAUDE.md
Aucun nouveau piège à ajouter — tous les patterns appliqués étaient déjà capitalisés en S68/S69/S70 :
- "supabase.auth.getUser() plante en offline" (résolu v3.12.1, étendu en S71 à 6 services)
- "Snapshots dénormalisés Dexie" (S69) — appliqué à `familyMembers` v3.14.6
- "Chaîne complète offline-first à auditer" (S69) — vérifié sur TransactionsPage → familySharingService → check membership
- "SW Workbox bloque les tests offline en prod" (S69) — procédure de bypass appliquée à chaque validation

### Architecture (état final S71)
- **6 services métier** utilisent `getCurrentUserSafe` : loans, family, recurring, reimbursement, account, goal, transaction
- **Dexie v15** avec 4 modules offline-first : loans (v13), reimbursements (v14), familyMembers (v15) + tables historiques (users, accounts, transactions, budgets, goals, recurring, etc.)
- **Console offline 100% propre** : zéro `Failed to fetch`, zéro `WebSocket failed`, zéro `Utilisateur non authentifié`, zéro `Failed to update ServiceWorker`

---

## Fichiers modifiés (cumul S71)

| Fichier | v3.14.3 | v3.14.4 | v3.14.5 | v3.14.6 |
|---|:---:|:---:|:---:|:---:|
| `services/accountService.ts` | ✓ | | | |
| `services/goalService.ts` | ✓ | | | |
| `services/transactionService.ts` | ✓ | | | |
| `hooks/useFamilyRealtime.ts` | | ✓ | | |
| `hooks/useBudgetIntelligence.ts` | | ✓ | | |
| `services/recurringTransactionService.ts` | | ✓ | | |
| `services/familySharingService.ts` | | | ✓ | ✓ |
| `index.html` | | | ✓ | |
| `lib/database.ts` | | | | ✓ |
| `services/familyGroupService.ts` | | | | ✓ |
| `hooks/useServiceWorkerUpdate.ts` | | | | ✓ |
| `constants/appVersion.ts` | ✓ | ✓ | ✓ | ✓ |
| `package.json` | ✓ | ✓ | ✓ | ✓ |
| `VERSION_HISTORY.md` | ✓ | ✓ | ✓ | ✓ |

**Total : 14 fichiers uniques modifiés sur 4 versions.**
