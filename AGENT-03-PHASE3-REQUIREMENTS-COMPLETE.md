# AGENT 03 - PHASE 3 IMPLEMENTATION REQUIREMENTS

**Date:** 2025-01-12  
**Projet:** BazarKELY PWA Phase 3  
**Objectif:** Définir les exigences complètes pour l'extension du schéma `syncQueue` avec `priority`, `syncTag`, et `expiresAt`

---

## 1. SPÉCIFICATION DES NOUVEAUX CHAMPS

### 1.1 Champ `priority`

**Type:** `number`  
**Valeurs:** `0` (critical), `1` (high), `2` (normal), `3` (low)  
**Valeur par défaut:** `2` (normal)  
**Indexé:** Oui (`[status+priority]` pour trier par statut puis priorité)

**Justification:**
- Permet de traiter les opérations critiques en premier
- Améliore l'expérience utilisateur pour les actions importantes
- Compatible avec Background Sync API qui peut utiliser la priorité

**Mapping des priorités:**
```typescript
enum SyncPriority {
  CRITICAL = 0,  // Opérations critiques (ex: suppression de compte)
  HIGH = 1,      // Opérations importantes (ex: création transaction)
  NORMAL = 2,    // Opérations normales (ex: mise à jour budget)
  LOW = 3        // Opérations non urgentes (ex: mise à jour préférences)
}
```

**Règles d'attribution:**
- `DELETE` operations → `priority: 0` (critical)
- `CREATE` operations → `priority: 1` (high)
- `UPDATE` operations → `priority: 2` (normal) par défaut
- Opérations utilisateur explicites → `priority: 1` (high)
- Opérations automatiques/système → `priority: 2` (normal)

### 1.2 Champ `syncTag`

**Type:** `string`  
**Valeur par défaut:** `'bazarkely-sync'`  
**Indexé:** Oui (`[syncTag]` pour requêtes par tag)

**Justification:**
- Nécessaire pour Background Sync API (`registration.sync.register(tag)`)
- Permet de grouper les opérations par type ou priorité
- Facilite le debugging et le monitoring

**Stratégie de tags:**
```typescript
// Tag unique par opération (recommandé pour Background Sync)
syncTag: `sync-${operation.id}`

// OU tags groupés par priorité (alternative)
syncTag: `sync-priority-${priority}`

// OU tags groupés par table (alternative)
syncTag: `sync-${table_name}`
```

**Recommandation:** Tag unique par opération (`sync-${operation.id}`) pour:
- Meilleur contrôle individuel
- Éviter les conflits
- Faciliter le debugging

### 1.3 Champ `expiresAt`

**Type:** `Date | null`  
**Valeur par défaut:** `null` (pas d'expiration)  
**Indexé:** Oui (`[expiresAt]` pour requêtes d'expiration)

**Justification:**
- Évite de synchroniser des opérations obsolètes
- Réduit la taille de la queue
- Améliore les performances

**Règles d'expiration:**
- Par défaut: `null` (pas d'expiration)
- Opérations critiques: `null` (jamais expirer)
- Opérations normales: `24 heures` après création
- Opérations low: `12 heures` après création

**Calcul de l'expiration:**
```typescript
const EXPIRATION_TIMES = {
  0: null,        // Critical: jamais
  1: 24 * 60 * 60 * 1000,  // High: 24h
  2: 24 * 60 * 60 * 1000,  // Normal: 24h
  3: 12 * 60 * 60 * 1000   // Low: 12h
};

const expiresAt = priority === 0 
  ? null 
  : new Date(Date.now() + EXPIRATION_TIMES[priority]);
```

### 1.4 Champs additionnels recommandés

**`lastAttempt` (optionnel):**
- Type: `Date | null`
- Valeur par défaut: `null`
- Utilité: Suivre la dernière tentative de synchronisation pour debugging

**`errorMessage` (optionnel):**
- Type: `string | null`
- Valeur par défaut: `null`
- Utilité: Stocker le message d'erreur de la dernière tentative

**`metadata` (optionnel):**
- Type: `object | null`
- Valeur par défaut: `null`
- Utilité: Métadonnées additionnelles (requestMethod, requestUrl, etc.)

---

## 2. STRATÉGIE DE MIGRATION

### 2.1 Version de base de données

**Version actuelle:** `7`  
**Nouvelle version:** `8`  
**Incrément:** `+1`

### 2.2 Schéma Dexie mis à jour

**Schéma actuel (Version 7):**
```typescript
syncQueue: '++id, userId, operation, table_name, data, timestamp, status, retryCount, [userId+status], [status+timestamp]'
```

**Schéma proposé (Version 8):**
```typescript
syncQueue: '++id, userId, operation, table_name, data, timestamp, status, retryCount, priority, syncTag, expiresAt, [userId+status], [status+timestamp], [status+priority], [syncTag], [expiresAt]'
```

**Indexes ajoutés:**
- `[status+priority]` - Pour trier par statut puis priorité
- `[syncTag]` - Pour requêtes par tag Background Sync
- `[expiresAt]` - Pour requêtes d'expiration

### 2.3 Fonction de migration

**Pattern utilisé dans le projet:**
```typescript
this.version(8).stores({
  // ... autres stores ...
  syncQueue: '++id, userId, operation, table_name, data, timestamp, status, retryCount, priority, syncTag, expiresAt, [userId+status], [status+timestamp], [status+priority], [syncTag], [expiresAt]'
}).upgrade(async (trans) => {
  console.log('🔄 Migration vers la version 8 (Phase 3 - Background Sync)...');
  
  const syncQueueTable = trans.table('syncQueue');
  const operations = await syncQueueTable.toArray();
  
  console.log(`📊 Migration de ${operations.length} opération(s) existante(s)...`);
  
  for (const operation of operations) {
    const updates: any = {};
    
    // Ajouter priority avec valeur par défaut basée sur operation type
    if (operation.priority === undefined) {
      if (operation.operation === 'DELETE') {
        updates.priority = 0; // Critical
      } else if (operation.operation === 'CREATE') {
        updates.priority = 1; // High
      } else {
        updates.priority = 2; // Normal
      }
    }
    
    // Ajouter syncTag avec valeur par défaut
    if (operation.syncTag === undefined) {
      updates.syncTag = `sync-${operation.id}`;
    }
    
    // Ajouter expiresAt avec valeur par défaut basée sur priority
    if (operation.expiresAt === undefined) {
      const priority = updates.priority ?? operation.priority ?? 2;
      if (priority === 0) {
        updates.expiresAt = null; // Critical: jamais expirer
      } else if (priority === 1 || priority === 2) {
        updates.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
      } else {
        updates.expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12h
      }
    }
    
    if (Object.keys(updates).length > 0) {
      await syncQueueTable.update(operation.id, updates);
    }
  }
  
  console.log('✅ Migration vers la version 8 terminée');
});
```

### 2.4 Compatibilité ascendante

**Stratégie:**
1. ✅ Tous les champs sont optionnels dans l'interface TypeScript
2. ✅ Valeurs par défaut appliquées lors de la migration
3. ✅ Code existant continue de fonctionner sans modification
4. ✅ Nouveaux champs ajoutés progressivement

**Interface TypeScript mise à jour:**
```typescript
export interface SyncOperation {
  id: string;
  userId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  table_name: 'accounts' | 'transactions' | 'budgets' | 'goals' | 'fee_configurations';
  data: any;
  timestamp: Date;
  retryCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  
  // Nouveaux champs (Phase 3)
  priority?: number;        // 0=critical, 1=high, 2=normal, 3=low
  syncTag?: string;         // Tag pour Background Sync API
  expiresAt?: Date | null;  // Date d'expiration (null = jamais)
  
  // Champs optionnels additionnels
  lastAttempt?: Date | null;
  errorMessage?: string | null;
  metadata?: {
    requestMethod?: string;
    requestUrl?: string;
    requestHeaders?: Record<string, string>;
  } | null;
}
```

---

## 3. SERVICES À METTRE À JOUR

### 3.1 Services créant des opérations sync

**Services identifiés:**
1. ✅ `transactionService.ts` - `queueSyncOperation()` (ligne 45)
2. ✅ `accountService.ts` - `queueSyncOperation()` (ligne 35)
3. ✅ `budgetService.ts` - `queueSyncOperation()` (ligne 34)
4. ✅ `syncService.ts` - `queueOperation()` (ligne 157)
5. ✅ `SafariSyncService.ts` - `queueOperation()` (ligne 87)

### 3.2 Modifications requises par service

#### 3.2.1 `transactionService.ts`

**Fichier:** `frontend/src/services/transactionService.ts`  
**Méthode:** `queueSyncOperation()` (lignes 45-68)

**Modifications:**
```typescript
private async queueSyncOperation(
  userId: string,
  operation: 'CREATE' | 'UPDATE' | 'DELETE',
  transactionId: string,
  data: any,
  priority?: number  // Nouveau paramètre optionnel
): Promise<void> {
  try {
    // Déterminer la priorité si non fournie
    const opPriority = priority ?? (operation === 'DELETE' ? 0 : operation === 'CREATE' ? 1 : 2);
    
    // Calculer l'expiration
    const expiresAt = opPriority === 0 
      ? null 
      : new Date(Date.now() + (opPriority === 3 ? 12 : 24) * 60 * 60 * 1000);
    
    const syncOp: SyncOperation = {
      id: crypto.randomUUID(),
      userId,
      operation,
      table_name: 'transactions',
      data: { id: transactionId, ...data },
      timestamp: new Date(),
      retryCount: 0,
      status: 'pending',
      // Nouveaux champs
      priority: opPriority,
      syncTag: `sync-${crypto.randomUUID()}`,
      expiresAt
    };
    
    await db.syncQueue.add(syncOp);
    
    // Enregistrer Background Sync tag si supporté
    await registerBackgroundSyncTag(syncOp.syncTag!);
    
    console.log(`📱 [TransactionService] 📦 Opération ${operation} ajoutée à la queue (priority: ${opPriority})`);
  } catch (error) {
    console.error('📱 [TransactionService] ❌ Erreur lors de l\'ajout à la queue:', error);
  }
}
```

**Appels à modifier:**
- Ligne 421: `await this.queueSyncOperation(userId, 'CREATE', transactionId, supabaseData);`
- Ligne 447: `await this.queueSyncOperation(userId, 'CREATE', transactionId, supabaseData);`
- Ligne 473: `await this.queueSyncOperation(userId, 'CREATE', transactionId, supabaseData);`
- Ligne 556: `await this.queueSyncOperation(userId, 'UPDATE', id, supabaseData);`
- Ligne 561: `await this.queueSyncOperation(userId, 'UPDATE', id, transactionData);`
- Ligne 567: `await this.queueSyncOperation(userId, 'UPDATE', id, transactionData);`
- Ligne 618: `await this.queueSyncOperation(userId, 'DELETE', id, {});`
- Ligne 623: `await this.queueSyncOperation(userId, 'DELETE', id, {});`
- Ligne 629: `await this.queueSyncOperation(userId, 'DELETE', id, {});`

**Priorités recommandées:**
- `DELETE` → `priority: 0` (critical)
- `CREATE` → `priority: 1` (high)
- `UPDATE` → `priority: 2` (normal)

#### 3.2.2 `accountService.ts`

**Fichier:** `frontend/src/services/accountService.ts`  
**Méthode:** `queueSyncOperation()` (lignes 35-58)

**Modifications:** Identiques à `transactionService.ts`

**Priorités recommandées:**
- `DELETE` → `priority: 0` (critical) - Suppression de compte
- `CREATE` → `priority: 1` (high) - Création de compte
- `UPDATE` → `priority: 2` (normal) - Mise à jour de compte

#### 3.2.3 `budgetService.ts`

**Fichier:** `frontend/src/services/budgetService.ts`  
**Méthode:** `queueSyncOperation()` (lignes 34-57)

**Modifications:** Identiques à `transactionService.ts`

**Priorités recommandées:**
- `DELETE` → `priority: 0` (critical)
- `CREATE` → `priority: 1` (high)
- `UPDATE` → `priority: 2` (normal)

#### 3.2.4 `syncService.ts`

**Fichier:** `frontend/src/services/syncService.ts`  
**Méthode:** `queueOperation()` (ligne 157)

**Modifications:**
```typescript
async queueOperation(
  operation: 'CREATE' | 'UPDATE' | 'DELETE',
  table_name: 'accounts' | 'transactions' | 'budgets' | 'goals',
  data: any,
  userId: string,
  priority?: number  // Nouveau paramètre optionnel
): Promise<void> {
  const opPriority = priority ?? (operation === 'DELETE' ? 0 : operation === 'CREATE' ? 1 : 2);
  
  const expiresAt = opPriority === 0 
    ? null 
    : new Date(Date.now() + (opPriority === 3 ? 12 : 24) * 60 * 60 * 1000);
  
  const syncOp: SyncOperation = {
    id: crypto.randomUUID(),
    userId,
    operation,
    table_name,
    data,
    timestamp: new Date(),
    retryCount: 0,
    status: 'pending',
    priority: opPriority,
    syncTag: `sync-${crypto.randomUUID()}`,
    expiresAt
  };
  
  // ... reste du code ...
}
```

#### 3.2.5 `SafariSyncService.ts`

**Fichier:** `frontend/src/services/SafariSyncService.ts`  
**Méthode:** `queueOperation()` (ligne 87)

**Modifications:** Identiques à `syncService.ts`

**Note:** SafariSyncService utilise son propre type `SyncOperation` (ligne 9). Il faudra soit:
1. Unifier les types
2. Ajouter les champs au type SafariSyncService

### 3.3 Services consommant la queue

**Services à mettre à jour:**
1. ✅ `syncManager.ts` - `processSyncQueue()` (ligne 112)
2. ✅ `syncManager.ts` - `processOperation()` (ligne 184)
3. ✅ `OptimizedSyncService.ts` - Méthodes de traitement

**Modifications requises:**

#### 3.3.1 `syncManager.ts` - Tri par priorité

**Fichier:** `frontend/src/services/syncManager.ts`  
**Méthode:** `processSyncQueue()` (ligne 112)

**Modifications:**
```typescript
// Récupérer les opérations en attente, triées par priorité
const pendingOperations = await db.syncQueue
  .where('status')
  .anyOf(['pending', 'failed'])
  .filter(op => {
    // Filtrer les opérations expirées
    if (op.expiresAt && op.expiresAt < new Date()) {
      return false;
    }
    return op.retryCount < MAX_RETRIES;
  })
  .sortBy('priority'); // Trier par priorité (0 = critical en premier)
```

#### 3.3.2 `syncManager.ts` - Nettoyage des expirées

**Nouvelle fonction à ajouter:**
```typescript
/**
 * Nettoie les opérations expirées
 * @returns Nombre d'opérations nettoyées
 */
export async function cleanupExpiredOperations(): Promise<number> {
  try {
    const now = new Date();
    const expiredOperations = await db.syncQueue
      .where('expiresAt')
      .below(now)
      .and(op => op.status === 'pending' || op.status === 'failed')
      .toArray();

    const ids = expiredOperations.map(op => op.id);
    if (ids.length > 0) {
      await db.syncQueue.bulkDelete(ids);
      console.log(`🔄 [SyncManager] 🗑️ ${ids.length} opération(s) expirée(s) nettoyée(s)`);
    }

    return ids.length;
  } catch (error) {
    console.error('🔄 [SyncManager] ❌ Erreur lors du nettoyage des expirées:', error);
    return 0;
  }
}
```

---

## 4. BACKGROUND SYNC TAGS

### 4.1 Utilisation avec Background Sync API

**Fonction existante:** `registerBackgroundSyncTag()` dans `syncManager.ts` (ligne 705+)

**Stratégie recommandée:**

#### 4.1.1 Tag unique par opération (RECOMMANDÉ)

**Avantages:**
- Contrôle individuel de chaque opération
- Évite les conflits
- Facilite le debugging

**Implémentation:**
```typescript
// Dans queueSyncOperation
const syncTag = `sync-${operation.id}`;
syncOp.syncTag = syncTag;

// Enregistrer le tag
await registerBackgroundSyncTag(syncTag);
```

#### 4.1.2 Tags groupés par priorité (ALTERNATIVE)

**Avantages:**
- Moins de tags enregistrés
- Traitement groupé par priorité

**Implémentation:**
```typescript
const syncTag = `sync-priority-${priority}`;
syncOp.syncTag = syncTag;

// Enregistrer le tag (une seule fois par priorité)
await registerBackgroundSyncTag(syncTag);
```

**Inconvénients:**
- Toutes les opérations de même priorité se déclenchent ensemble
- Moins de contrôle individuel

### 4.2 Handler dans Service Worker

**À créer dans Service Worker custom:**

```typescript
// Dans sw.js ou sw-custom.js
self.addEventListener('sync', (event) => {
  if (event.tag.startsWith('sync-')) {
    event.waitUntil(processSyncOperation(event.tag));
  }
});

async function processSyncOperation(syncTag: string) {
  // Extraire l'ID de l'opération du tag
  const operationId = syncTag.replace('sync-', '');
  
  // Récupérer l'opération depuis IndexedDB
  const operation = await getSyncOperationFromIndexedDB(operationId);
  
  if (!operation) {
    console.warn(`Opération ${operationId} non trouvée`);
    return;
  }
  
  // Vérifier l'expiration
  if (operation.expiresAt && operation.expiresAt < new Date()) {
    console.log(`Opération ${operationId} expirée, suppression`);
    await deleteSyncOperationFromIndexedDB(operationId);
    return;
  }
  
  // Traiter l'opération
  await executeSyncOperation(operation);
}
```

---

## 5. NETTOYAGE DES EXPIRATIONS

### 5.1 Quand exécuter le nettoyage

**Stratégies recommandées:**

1. **Au démarrage de l'application**
   - Dans `App.tsx` ou `main.tsx`
   - Nettoyer les opérations expirées avant de traiter la queue

2. **Avant le traitement de la queue**
   - Dans `processSyncQueue()` avant de récupérer les opérations
   - Évite de traiter des opérations expirées

3. **Périodiquement**
   - Toutes les heures via `setInterval`
   - Nettoyage préventif

4. **Lors de la vérification d'expiration**
   - Dans le Service Worker lors du `sync` event
   - Suppression immédiate si expirée

### 5.2 Implémentation du nettoyage

**Fonction de nettoyage:**
```typescript
/**
 * Nettoie les opérations expirées
 * @param force - Si true, nettoie même les opérations en cours de traitement
 * @returns Nombre d'opérations nettoyées
 */
export async function cleanupExpiredOperations(force: boolean = false): Promise<number> {
  try {
    const now = new Date();
    
    let query = db.syncQueue
      .where('expiresAt')
      .below(now);
    
    if (!force) {
      // Ne nettoyer que les opérations pending ou failed
      query = query.and(op => 
        op.status === 'pending' || op.status === 'failed'
      );
    }
    
    const expiredOperations = await query.toArray();
    
    const ids = expiredOperations.map(op => op.id);
    if (ids.length > 0) {
      await db.syncQueue.bulkDelete(ids);
      console.log(`🔄 [SyncManager] 🗑️ ${ids.length} opération(s) expirée(s) nettoyée(s)`);
    }
    
    return ids.length;
  } catch (error) {
    console.error('🔄 [SyncManager] ❌ Erreur lors du nettoyage des expirées:', error);
    return 0;
  }
}
```

**Intégration dans `processSyncQueue()`:**
```typescript
export async function processSyncQueue(skipSessionCheck: boolean = false): Promise<number> {
  // ... vérifications ...
  
  // Nettoyer les opérations expirées AVANT de traiter
  await cleanupExpiredOperations();
  
  // ... reste du code ...
}
```

**Intégration périodique:**
```typescript
// Dans initSyncManager()
setInterval(async () => {
  await cleanupExpiredOperations();
}, 60 * 60 * 1000); // Toutes les heures
```

### 5.3 Gestion des opérations expirées

**Comportement recommandé:**

1. **Opérations expirées:**
   - Supprimer automatiquement de la queue
   - Logger pour debugging
   - Ne pas notifier l'utilisateur (silencieux)

2. **Opérations critiques expirées (priority: 0):**
   - Ne jamais expirer (`expiresAt: null`)
   - Toujours traiter même si anciennes

3. **Opérations en cours de traitement:**
   - Ne pas nettoyer si `status: 'processing'`
   - Attendre la fin du traitement

---

## 6. RISQUES ET MITIGATIONS

### 6.1 Risques de perte de données

**Risque:** Migration échoue, données perdues

**Mitigation:**
- ✅ Migration transactionnelle (Dexie garantit l'atomicité)
- ✅ Backup avant migration (optionnel mais recommandé)
- ✅ Rollback possible en cas d'échec (restaurer version 7)

**Stratégie de rollback:**
```typescript
// En cas d'échec de migration, restaurer version 7
try {
  await db.version(8).stores({...}).upgrade(...);
} catch (error) {
  console.error('❌ Migration échouée, rollback vers version 7');
  // Supprimer la base et recréer version 7
  await db.delete();
  await db.open();
}
```

### 6.2 Risques de migration

**Risque:** Migration bloque l'application si trop d'opérations

**Mitigation:**
- ✅ Migration asynchrone avec progression
- ✅ Limiter le nombre d'opérations traitées par batch
- ✅ Afficher un indicateur de progression

**Optimisation:**
```typescript
.upgrade(async (trans) => {
  const BATCH_SIZE = 100;
  const operations = await trans.table('syncQueue').toArray();
  
  for (let i = 0; i < operations.length; i += BATCH_SIZE) {
    const batch = operations.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(op => migrateOperation(op, trans)));
    
    // Permettre au navigateur de respirer
    await new Promise(resolve => setTimeout(resolve, 0));
  }
});
```

### 6.3 Risques de compatibilité

**Risque:** Code existant ne fonctionne plus

**Mitigation:**
- ✅ Champs optionnels dans l'interface TypeScript
- ✅ Valeurs par défaut appliquées lors de la migration
- ✅ Code existant continue de fonctionner sans modification
- ✅ Tests de régression avant déploiement

### 6.4 Risques de performance

**Risque:** Indexes supplémentaires ralentissent les écritures

**Mitigation:**
- ✅ Indexes optimisés (composés seulement si nécessaire)
- ✅ Monitoring des performances après migration
- ✅ Possibilité de désactiver certains index si problème

### 6.5 Risques Background Sync

**Risque:** Background Sync API non disponible, tags inutiles

**Mitigation:**
- ✅ Détection de support avant enregistrement
- ✅ Fallback silencieux si non supporté
- ✅ Tags utilisés uniquement si Background Sync disponible

---

## 7. CHECKLIST D'IMPLÉMENTATION

### 7.1 Phase 1: Préparation

- [ ] Backup de la base de données avant migration
- [ ] Tests sur environnement de développement
- [ ] Documentation des changements

### 7.2 Phase 2: Migration du schéma

- [ ] Créer version 8 dans `database.ts`
- [ ] Ajouter nouveaux champs au schéma Dexie
- [ ] Créer fonction de migration avec valeurs par défaut
- [ ] Tester la migration sur données réelles

### 7.3 Phase 3: Mise à jour des types

- [ ] Mettre à jour interface `SyncOperation` dans `types/index.ts`
- [ ] Rendre les nouveaux champs optionnels
- [ ] Ajouter types pour `SyncPriority` enum

### 7.4 Phase 4: Mise à jour des services

- [ ] Modifier `transactionService.ts` - `queueSyncOperation()`
- [ ] Modifier `accountService.ts` - `queueSyncOperation()`
- [ ] Modifier `budgetService.ts` - `queueSyncOperation()`
- [ ] Modifier `syncService.ts` - `queueOperation()`
- [ ] Modifier `SafariSyncService.ts` - `queueOperation()`

### 7.5 Phase 5: Mise à jour du traitement

- [ ] Modifier `syncManager.ts` - `processSyncQueue()` pour trier par priorité
- [ ] Modifier `syncManager.ts` - Filtrer les expirées
- [ ] Créer `cleanupExpiredOperations()` dans `syncManager.ts`
- [ ] Intégrer nettoyage dans `processSyncQueue()`

### 7.6 Phase 6: Background Sync

- [ ] Vérifier fonction `registerBackgroundSyncTag()` dans `syncManager.ts`
- [ ] Appeler `registerBackgroundSyncTag()` dans chaque `queueSyncOperation()`
- [ ] Créer handler `sync` dans Service Worker custom
- [ ] Tester Background Sync sur Chrome/Edge

### 7.7 Phase 7: Tests

- [ ] Tests unitaires pour migration
- [ ] Tests d'intégration pour queue avec priorités
- [ ] Tests d'expiration
- [ ] Tests Background Sync
- [ ] Tests de régression

### 7.8 Phase 8: Documentation

- [ ] Documenter nouveaux champs
- [ ] Documenter stratégie de priorités
- [ ] Documenter nettoyage des expirées
- [ ] Mettre à jour README si nécessaire

---

## 8. RÉSUMÉ

### 8.1 Nouveaux champs

| Champ | Type | Défaut | Indexé |
|-------|------|--------|--------|
| `priority` | `number` | `2` (normal) | `[status+priority]` |
| `syncTag` | `string` | `'sync-${id}'` | `[syncTag]` |
| `expiresAt` | `Date \| null` | `null` ou calculé | `[expiresAt]` |

### 8.2 Migration

- **Version:** 7 → 8
- **Compatibilité:** Ascendante (champs optionnels)
- **Risque:** Faible (migration transactionnelle)

### 8.3 Services impactés

- 5 services créant des opérations sync
- 2 services consommant la queue
- 1 fonction de nettoyage à créer

### 8.4 Estimation

- **Migration schéma:** 2-3 heures
- **Mise à jour services:** 4-6 heures
- **Background Sync:** 2-3 heures
- **Tests:** 3-4 heures
- **Documentation:** 1-2 heures

**Total estimé:** 12-18 heures

---

**AGENT-03-PHASE3-REQUIREMENTS-COMPLETE**

