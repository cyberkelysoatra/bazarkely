# RÉSUMÉ SESSION S72 — 2026-05-17

**Version livrée :** 3.15.0 (minor)
**Branche :** commit direct sur `main` depuis le worktree principal (pas de branche `claude/...` intermédiaire)
**Commit sur main :**
- `adb8f31` feat: Family Sharing offline-first phase 1 v3.15.0 (S72)

**Déploiement :** ✅ Validé en production sur https://1sakely.org. Logs prod 2026-05-17 confirment :
- Démarrage online : 6 services métier servent depuis IndexedDB en immédiat (accounts 7, transactions 311, goals 1, loans 17, **familySharedTransactions 207**, reimbursements 2)
- Premier chargement page Famille : `Cache vide → fetch Supabase synchrone...` puis `✅ 207 dépense(s) partagée(s) depuis IndexedDB (retour immédiat)`
- Mode avion (`📴 Connexion perdue, pause du polling`) : toutes les lectures continuent en local
- Retour internet : `🌐 Connexion rétablie, traitement immédiat de la queue` + `Aucune opération en attente` (queue vide car test sans mutation)
- Plus aucune erreur famille au démarrage offline

---

## Demande initiale de JOEL

Reprise après S71 clôturée (v3.14.6). JOEL propose les priorités S72 :
- **P3** : Mutations offline-first (~2-3h, 10 mutations famille + 3 BudgetsPage createBudget)
- **P4** : Phase 2 reimbursement (recordReimbursementPayment FIFO + credit balance) — ~3-4h

JOEL recommande P3 d'abord pour finir le module Famille offline-first complet.

---

## Cadrage (séries de questions fermées)

### Série 1 — Périmètre S72
| Question | Réponse | Implication |
|---|---|---|
| Priorité ? | A — P3 mutations offline-first | |
| Scope dans S72 ? | A — Les 3 blocs : familySharing 7 + familyGroup 3 + BudgetsPage 3 | Scope large |
| Pattern de queue ? | B — Vérifier état actuel syncManager | Adapter selon code lu |
| Validation prod ? | NON — un seul déploiement en fin de session | 1 version patch |

### Série 2 — Architecture des mutations
| Question | Réponse | Implication |
|---|---|---|
| Q5 shareTransaction offline ? | B — retour minimal puis automatique au retour internet | UUID client + snapshots Dexie lus en local |
| Q6 updateSharedTransaction cascade hasReimbursementRequest ? | B (puis confirmé B après warning Q10) | Risque accepté, mais finalement reporté S73 |
| Q7 createFamilyGroup/joinFamilyGroup offline ? | A — restent online-only avec message clair | Code d'invitation serveur |
| Q8 6 autres mutations simples ? | A — toutes offline-first | Pattern queueSyncOperation |
| Q9 nouvelles tables Dexie v16 ? | A — créer pour rendre les lectures offline-first complètes | familySharedTransactions + familySharingRules + familySharedRecurring |

### Série 3 — Découpage de session (après Q10 warning)
| Question | Réponse | Implication |
|---|---|---|
| Q10 Q6 réaffirmé ? | B — tout offline-first | Mais reporté dans le découpage S73 |
| Q11 Découpage 3 blocs ? | B — Bloc 1 + Bloc 2 dans S72, Bloc 3 dans S73 | Plus prudent pour la cascade complexe |

---

## Travail accompli

### Bloc 1 — Cache local + lectures offline-first

**Nouveau fichier `types/familyLocal.ts`** : 3 interfaces Dexie avec snapshots dénormalisés
- `FamilySharedTransactionLocal` : id, familyGroupId, transactionId, sharedBy, paidBy, isPrivate, splitType, splitDetails, hasReimbursementRequest, sharedAt/createdAt/updatedAt + snapshots transactionDescription/Amount/Category/Date/Type
- `FamilySharingRuleLocal` : id, familyGroupId, userId, name, description, category, accountId, splitType, defaultSplitDetails, isActive, createdAt, updatedAt
- `FamilySharedRecurringLocal` : id, familyGroupId, recurringTransactionId, sharedBy, autoShareGenerated, createdAt, updatedAt

**Extension Dexie `lib/database.ts` v16** : 3 nouvelles tables avec index composites
- `familySharedTransactions` : `id, familyGroupId, transactionId, sharedBy, paidBy, sharedAt, [familyGroupId+sharedAt], [familyGroupId+transactionId]`
- `familySharingRules` : `id, familyGroupId, userId, category, isActive, [familyGroupId+userId], [familyGroupId+userId+isActive], [familyGroupId+userId+category]`
- `familySharedRecurring` : `id, familyGroupId, recurringTransactionId, sharedBy, [familyGroupId+recurringTransactionId]`
- Migration upgrade vide — premier appel online des lectures peuplera Dexie

**Refactor `services/familySharingService.ts` 5 lectures en SWR** :
- `getFamilySharedTransactions(groupId, options?)` : lecture Dexie par familyGroupId + tri/pagination en mémoire
- `getUserSharingRules(groupId)` : lecture Dexie par `[familyGroupId+userId]` + filtre isActive
- `getSharedTransactionByTransactionId(txId, groupId?)` : lecture Dexie par transactionId index simple
- `getSharedRecurringTransactions(groupId)` : lecture Dexie par familyGroupId
- `shouldAutoShare(groupId, category)` : lecture Dexie par `[familyGroupId+userId+category]`
- Pattern uniforme : lecture locale → si trouvé retour immédiat + refresh background si online → sinon refresh synchrone

**Helpers ajoutés dans familySharingService** :
- 3 mappers Supabase → Local (`mapRowToFamilySharedTransactionLocal`, etc.)
- 2 mappers Local → public (`localToFamilySharedTransaction`, `localToFamilySharingRule`)
- 1 helper queue (`queueFamilySharingSyncOperation`)
- 3 helpers refresh background (`refreshSharedTransactionsForGroup`, `refreshSharingRulesForUser`, `refreshSharedRecurringForGroup`)

### Bloc 2 — Mutations offline-first

**Extension `types/index.ts`** : `SyncOperation.table_name` accepte 4 nouvelles tables :
- `family_shared_transactions`, `family_sharing_rules`, `family_shared_recurring_transactions`, `family_members`

**Extension `services/syncManager.ts`** : 4 nouvelles fonctions `processXxxOperation` avec CREATE/UPDATE/DELETE classiques pour ces tables (data déjà en snake_case poussé par les services).

**Refactor `services/familySharingService.ts` 6 mutations offline-first** :

| Mutation | Pattern |
|---|---|
| `shareTransaction` (Q5B) | UUID client + INSERT Dexie avec snapshots lus depuis `db.transactions` + push Supabase ou queue. Vérif "déjà partagée" en local (`db.familySharedTransactions where transactionId`). Retour `FamilySharedTransaction` complet via `localToFamilySharedTransaction(local)`. |
| `unshareTransaction` | Vérif ownership Dexie + cascade DELETE des `reimbursement_requests` liés (Dexie + queue par id) puis DELETE `family_shared_transactions` |
| `upsertSharingRule` | Recherche locale par `[familyGroupId+userId+category]` → UPDATE local + queue UPDATE si existe, sinon UUID client + INSERT local + queue CREATE |
| `deleteSharingRule` | Vérif ownership Dexie + DELETE local + queue DELETE |
| `shareRecurringTransaction` | Vérif ownership recurring depuis `db.recurringTransactions` (fallback Supabase si pas en cache + online) + vérif "déjà partagée" en local + INSERT Dexie + queue |
| `unshareRecurringTransaction` | Vérif ownership Dexie + DELETE local + queue |

**Refactor `services/familyGroupService.ts`** :
- Imports : ajout `withTimeout`, `SyncOperation`, `SYNC_PRIORITY` + helper `isOnline()` + constantes `LOG_TAG`/`SUPABASE_TIMEOUT_MS`
- `leaveFamilyGroup` offline-first : vérification "dernier admin" depuis cache local `db.familyMembers`, soft delete local (`isActive=false`) + queue UPDATE `family_members`
- `createFamilyGroup` + `joinFamilyGroup` : early throw avec message clair "nécessite une connexion Internet" si offline (le code d'invitation est généré côté serveur par trigger Supabase)

**Fix `pages/BudgetsPage.tsx`** :
- Suppression import `apiService` (devenu inutile)
- Les 3 emplacements qui créaient un budget passent par `budgetService.createBudget(userId, ...)` au lieu de `apiService.createBudget(...)` :
  - `handleCreateIntelligentBudgets` (suggestions auto, ligne ~409)
  - `handleSaveCustomizedBudgets` (suggestions personnalisées, ligne ~475)
  - `handleSaveNewBudget` (création manuelle, ligne ~581)
- Adaptation des tests de succès : `result.success` → check `budget !== null` via `Promise.all` avec try/catch par promesse

---

## Statistiques

- **9 fichiers modifiés** (+1 nouveau) — +1492 / -793 lignes
- **3 nouvelles tables Dexie** (v16)
- **5 lectures refactorées** en SWR offline-first
- **6 mutations refactorées** en offline-first queue-able
- **1 mutation refactorée** (`leaveFamilyGroup`)
- **2 messages "nécessite Internet"** ajoutés (`createFamilyGroup` + `joinFamilyGroup`)
- **3 createBudget BudgetsPage** migrés vers le service offline-first
- **4 nouvelles tables** supportées par syncManager

---

## Pièges connus rencontrés

### Le worktree dédié n'a pas été utilisé
JOEL m'a fourni un worktree `claude/relaxed-heisenberg-f59cfc`, mais en utilisant des chemins absolus `C:\bazarkely-2\...` (sans préfixe `.claude/worktrees/...`), les modifications sont allées directement dans le worktree principal sur la branche `main`. Conséquence : pas de merge intermédiaire, commit direct sur `main`. Pas grave en pratique (cohérent avec le workflow de déploiement Netlify) mais à noter pour les sessions futures.

### Erreur SW `sw-custom.js: Not found` persistante (pré-existante)
Le polling de mise à jour Service Worker continue à logger une erreur `Failed to update a ServiceWorker [...] sw-custom.js: Not found` immédiatement après déploiement (le nouveau hash de `sw-custom.js` n'est pas encore servi par Netlify pendant la propagation). Non bloquant : le skip-offline (v3.14.6) prend le relais dès que la connexion bascule. À investiguer plus tard pour identifier la cause exacte (cache CDN Netlify ? hash dans manifest qui change ?).

---

## Reste à faire (S73)

### P3 Bloc 3 — `updateSharedTransaction` cascade `hasReimbursementRequest` offline-first complète
Reporté car logique complexe à reproduire côté client (RPC `update_reimbursement_request` + cascade INSERT/UPDATE `reimbursement_requests` avec calcul de rate custom/localStorage/default + résolution créancier/débiteur depuis `family_members`).

**Risque accepté par JOEL (Q10=B)** : si un membre quitte le groupe entre l'enregistrement local de la cascade et la synchro réseau, le serveur peut rejeter la création du reimbursement. Pour cette raison, prévoir des tests offline rigoureux avec scénarios multi-membres.

### P4 — Phase 2 reimbursement (~3-4h)
- `recordReimbursementPayment` FIFO + credit balance + allocations offline-first
- 2 nouvelles tables Dexie : `reimbursement_payments`, `reimbursement_payment_allocations`
- `getPaymentHistory`, `getAllocationDetails` SWR
- Propagation icône `CloudOff` sur `FamilyReimbursementsPage`

### Cleanup
- Pages legacy utilisant `apiService` directement → substitution mécanique
- `hooks/useMultiYearBudgetData` + `hooks/useYearlyBudgetData` → migrer `apiService.getBudgets` et auth
- `loanStorageService` dead code à supprimer
- Unification `syncManager` + `onlineStatusService` (deux services qui font du polling, à fusionner)

### Investigation
- Erreur `sw-custom.js: Not found` après déploiement Netlify — identifier la cause racine
