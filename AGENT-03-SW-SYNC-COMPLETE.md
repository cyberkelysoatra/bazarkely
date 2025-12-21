# AGENT 03 - SERVICE WORKER & SYNC API CAPABILITIES ANALYSIS

**Date:** 2025-01-12  
**Projet:** BazarKELY  
**Objectif:** Analyser l'implémentation actuelle du Service Worker et planifier l'intégration de l'API Background Sync avec IndexedDB

---

## 1. IMPLÉMENTATION ACTUELLE DU SERVICE WORKER

### 1.1 Configuration Vite PWA

**Fichier:** `frontend/vite.config.ts`

Le projet utilise `vite-plugin-pwa` (v1.0.3) avec Workbox pour générer automatiquement le Service Worker.

**Configuration actuelle:**
- **registerType:** `'autoUpdate'` - Mise à jour automatique du SW
- **Stratégie de cache:** 
  - `globPatterns`: `['**/*.{js,css,html,ico,png,svg,woff2}']`
  - `maximumFileSizeToCacheInBytes`: 3 MB
  - `navigateFallback`: `/index.html` (SPA fallback)
- **Runtime caching:**
  - API routes: `NetworkFirst` avec expiration 24h
  - Cache name: `api-cache`

**Service Workers générés:**
- `/sw.js` - Service Worker principal (généré par Workbox)
- `/sw-safari.js` - Service Worker spécifique Safari (référencé mais non trouvé dans le codebase)
- `/sw-notifications.js` - Service Worker pour notifications (référencé dans manifest)

### 1.2 Gestionnaire Service Worker

**Fichier:** `frontend/src/services/safariServiceWorkerManager.ts`

**Fonctionnalités:**
- Détection des capacités Safari
- Enregistrement adaptatif du SW (`/sw-safari.js` pour Safari, `/sw.js` pour autres)
- Gestion des mises à jour (`updatefound`, `statechange`)
- Communication par messages (`postMessage`)
- Désactivation/statut du SW

**Messages supportés:**
- `CACHE_UPDATED`
- `SYNC_COMPLETED`
- `NOTIFICATION_CLICKED`
- `ERROR_OCCURRED`

### 1.3 Hook de mise à jour

**Fichier:** `frontend/src/hooks/useServiceWorkerUpdate.ts`

**Fonctionnalités:**
- Détection automatique des mises à jour disponibles
- Vérification périodique (60 secondes)
- Vérification sur `visibilitychange` (page redevenue visible)
- Application des mises à jour avec `skipWaiting`
- Rechargement automatique sur `controllerchange`

### 1.4 Handlers d'événements actuels

**Événements gérés:**
- ✅ `install` - Géré par Workbox (precaching)
- ✅ `activate` - Géré par Workbox (cleanup)
- ✅ `fetch` - Géré par Workbox (runtime caching)
- ❌ `sync` - **NON IMPLÉMENTÉ** (Background Sync API)
- ❌ `message` - Partiellement implémenté (messages custom uniquement)

---

## 2. SUPPORT BACKGROUND SYNC API - MATRICE DE COMPATIBILITÉ

| Navigateur | Version minimale | Support Background Sync | Notes |
|------------|------------------|------------------------|-------|
| **Chrome** | 49+ | ✅ Complet | Support natif |
| **Edge** | 79+ | ✅ Complet | Basé sur Chromium |
| **Firefox** | Toutes versions | ❌ Non supporté | Pas de support prévu |
| **Safari** | Toutes versions | ❌ Non supporté | Limitation iOS/Safari |
| **Opera** | 36+ | ✅ Complet | Basé sur Chromium |

### 2.1 Détection de compatibilité

**Fichier:** `frontend/src/services/safariCompatibility.ts`

**Détection actuelle:**
```typescript
noBackgroundSync: isSafari  // true pour Safari
```

**Limitations Safari documentées:**
- ❌ Pas de Background Sync API
- ❌ Pas de Push Notifications
- ⚠️ Service Worker limité (version < 14.0)
- ⚠️ IndexedDB limité (version < 13.0)
- ⚠️ Quota de stockage strict (~50 MB)

---

## 3. STRATÉGIE DE FALLBACK SAFARI

### 3.1 Approche recommandée

**Stratégie hybride:**
1. **Chrome/Edge:** Utiliser Background Sync API native
2. **Safari/Firefox:** Polling + événements réseau

### 3.2 Implémentation Safari (Fallback)

**Pattern recommandé:**

```typescript
// 1. Détection de connectivité
window.addEventListener('online', () => {
  processSyncQueue();
});

// 2. Polling périodique (si Safari)
if (isSafari) {
  setInterval(() => {
    if (navigator.onLine) {
      processSyncQueue();
    }
  }, 60000); // 1 minute
}

// 3. Vérification au démarrage du SW
self.addEventListener('activate', () => {
  if (navigator.onLine) {
    processSyncQueue();
  }
});
```

### 3.3 Service existant pour Safari

**Fichier:** `frontend/src/services/SafariSyncService.ts`

**Fonctionnalités déjà implémentées:**
- ✅ Queue de synchronisation en mémoire
- ✅ Polling périodique (60 secondes)
- ✅ Écouteurs `online`/`offline`
- ✅ Persistance dans SafariStorageFallback
- ✅ Gestion des retries (max 3 tentatives)

**Limitations:**
- Queue stockée en mémoire uniquement (pas de persistance IndexedDB dans le SW)
- Pas d'intégration avec le Service Worker

---

## 4. DESIGN INDEXEDDB QUEUE

### 4.1 Schéma actuel

**Fichier:** `frontend/src/lib/database.ts` (Version 7)

**Store `syncQueue`:**
```typescript
syncQueue: '++id, userId, operation, table_name, data, timestamp, status, retryCount, [userId+status], [status+timestamp]'
```

**Interface TypeScript:**
```typescript
export interface SyncOperation {
  id: string;
  userId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  table_name: 'accounts' | 'transactions' | 'budgets' | 'goals' | 'fee_configurations';
  data: any;
  timestamp: Date;
  status: 'pending' | 'processing' | 'failed' | 'completed';
  retryCount: number;
}
```

### 4.2 Schéma recommandé pour Background Sync

**Améliorations proposées:**

```typescript
interface BackgroundSyncOperation extends SyncOperation {
  // Champs existants
  id: string;
  userId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  table_name: string;
  data: any;
  timestamp: Date;
  status: 'pending' | 'processing' | 'failed' | 'completed';
  retryCount: number;
  
  // Nouveaux champs pour Background Sync
  syncTag?: string;           // Tag pour Background Sync API
  priority: number;            // 1-10 (10 = haute priorité)
  expiresAt?: Date;           // Expiration de l'opération
  lastAttempt?: Date;         // Dernière tentative de sync
  errorMessage?: string;      // Message d'erreur si échec
  metadata?: {                // Métadonnées additionnelles
    requestMethod: string;     // 'POST', 'PUT', 'DELETE'
    requestUrl: string;      // URL de l'API
    requestHeaders?: Record<string, string>;
  };
}
```

**Indexes recommandés:**
```typescript
syncQueue: '++id, userId, operation, table_name, data, timestamp, status, retryCount, priority, expiresAt, syncTag, [userId+status], [status+timestamp], [status+priority], [syncTag]'
```

### 4.3 Gestion de la queue dans le Service Worker

**Pattern recommandé:**

```typescript
// Dans le Service Worker (sw.js)
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// 1. Plugin Background Sync pour Chrome/Edge
const bgSyncPlugin = new BackgroundSyncPlugin('sync-queue', {
  maxRetentionTime: 24 * 60, // 24 heures
});

// 2. Route pour les requêtes API
workbox.routing.registerRoute(
  /^https:\/\/api\.bazarkely\.agirpourlequite\.org/,
  new workbox.strategies.NetworkOnly({
    plugins: [
      bgSyncPlugin, // Rejoue automatiquement si échec
    ],
  })
);

// 3. Handler pour Safari (fallback)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-queue') {
    event.waitUntil(processSyncQueueFromIndexedDB());
  }
});
```

---

## 5. FLUX DE SYNCHRONISATION

### 5.1 Flux actuel (sans Background Sync)

```
┌─────────────────┐
│  User Action    │
│  (Create/Update)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  IndexedDB      │
│  (Immediate)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  syncQueue.add()│
│  (status: pending)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Supabase API   │
│  (If online)     │
└────────┬────────┘
         │
    ┌────┴────┐
    │        │
    ▼        ▼
┌──────┐  ┌──────────┐
│Success│  │  Failure │
└───┬──┘  └────┬─────┘
    │          │
    │          ▼
    │    ┌─────────────┐
    │    │  Queue      │
    │    │  (retry)    │
    │    └─────┬───────┘
    │          │
    │          ▼
    │    ┌─────────────┐
    │    │  Event:     │
    │    │  'online'   │
    │    └─────┬───────┘
    │          │
    └──────────┘
         │
         ▼
┌─────────────────┐
│  processSyncQueue│
│  (syncManager)  │
└─────────────────┘
```

### 5.2 Flux proposé (avec Background Sync)

```
┌─────────────────┐
│  User Action    │
│  (Create/Update)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  IndexedDB      │
│  (Immediate)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  syncQueue.add()│
│  (status: pending)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Supabase API   │
│  (If online)     │
└────────┬────────┘
         │
    ┌────┴────┐
    │        │
    ▼        ▼
┌──────┐  ┌──────────┐
│Success│  │  Failure │
└───┬──┘  └────┬─────┘
    │          │
    │          ▼
    │    ┌─────────────────────┐
    │    │  Background Sync    │
    │    │  (Chrome/Edge)      │
    │    └──────────┬──────────┘
    │               │
    │               ▼
    │    ┌─────────────────────┐
    │    │  SW: sync event     │
    │    │  (when online)      │
    │    └──────────┬──────────┘
    │               │
    │               ▼
    │    ┌─────────────────────┐
    │    │  Replay Request     │
    │    │  (from IndexedDB)   │
    │    └──────────┬──────────┘
    │               │
    │    ┌──────────┴──────────┐
    │    │                     │
    ▼    ▼                     ▼
┌──────┐  ┌──────────┐  ┌──────────┐
│Success│  │  Failure │  │  Safari   │
│       │  │  (retry) │  │  Polling  │
└───────┘  └──────────┘  └──────────┘
```

### 5.3 Flux Safari (Fallback)

```
┌─────────────────┐
│  User Action    │
│  (Create/Update)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  IndexedDB      │
│  (Immediate)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  syncQueue.add()│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Polling Timer  │
│  (60s interval) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Event: 'online'│
│  (if offline)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  processSyncQueue│
│  (from IndexedDB)│
└─────────────────┘
```

---

## 6. CHECKLIST D'IMPLÉMENTATION

### 6.1 Phase 1: Configuration Workbox Background Sync

- [ ] **Installer/Configurer Workbox Background Sync**
  - [ ] Vérifier que `workbox-background-sync` est disponible (✅ déjà dans package-lock.json)
  - [ ] Configurer `BackgroundSyncPlugin` dans `vite.config.ts`
  - [ ] Définir `maxRetentionTime` (recommandé: 24 heures)
  - [ ] Configurer les routes API pour utiliser le plugin

- [ ] **Modifier `vite.config.ts`:**
```typescript
import { BackgroundSyncPlugin } from 'workbox-background-sync';

VitePWA({
  workbox: {
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/api\.bazarkely\.agirpourlequite\.org/,
        handler: 'NetworkOnly',
        options: {
          plugins: [
            new BackgroundSyncPlugin('sync-queue', {
              maxRetentionTime: 24 * 60, // 24 heures
            }),
          ],
        },
      },
    ],
  },
})
```

### 6.2 Phase 2: Extension du schéma IndexedDB

- [ ] **Mettre à jour le schéma `syncQueue`:**
  - [ ] Ajouter champ `syncTag` (string, indexé)
  - [ ] Ajouter champ `priority` (number, indexé)
  - [ ] Ajouter champ `expiresAt` (Date, optionnel)
  - [ ] Ajouter champ `lastAttempt` (Date, optionnel)
  - [ ] Ajouter champ `errorMessage` (string, optionnel)
  - [ ] Ajouter champ `metadata` (object, optionnel)

- [ ] **Créer migration Dexie:**
  - [ ] Version 8 du schéma avec nouveaux champs
  - [ ] Migration des données existantes
  - [ ] Création des nouveaux index

### 6.3 Phase 3: Service Worker Custom

- [ ] **Créer handler `sync` dans Service Worker:**
  - [ ] Écouter événement `sync` avec tag `sync-queue`
  - [ ] Lire queue depuis IndexedDB
  - [ ] Rejouer les requêtes échouées
  - [ ] Mettre à jour statut dans IndexedDB

- [ ] **Créer fonction `processSyncQueueFromIndexedDB()`:**
  - [ ] Ouvrir IndexedDB dans le Service Worker
  - [ ] Récupérer opérations `pending` ou `failed`
  - [ ] Filtrer par `expiresAt` (si défini)
  - [ ] Trier par `priority` (décroissant)
  - [ ] Exécuter requêtes Supabase
  - [ ] Mettre à jour statut (`completed` ou `failed`)

### 6.4 Phase 4: Intégration avec syncManager existant

- [ ] **Modifier `syncManager.ts`:**
  - [ ] Détecter support Background Sync API
  - [ ] Si supporté: utiliser Background Sync
  - [ ] Si non supporté: utiliser polling (Safari)
  - [ ] Unifier l'interface pour les deux approches

- [ ] **Créer fonction `registerBackgroundSync()`:**
```typescript
async function registerBackgroundSync(operation: SyncOperation): Promise<void> {
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    // Chrome/Edge: utiliser Background Sync API
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register(`sync-queue-${operation.id}`);
  } else {
    // Safari/Firefox: fallback polling
    // Déjà géré par syncManager
  }
}
```

### 6.5 Phase 5: Gestion Safari (Fallback)

- [ ] **Améliorer `SafariSyncService.ts`:**
  - [ ] Intégrer avec IndexedDB (au lieu de mémoire)
  - [ ] Utiliser le même schéma que Chrome/Edge
  - [ ] Synchroniser avec `syncManager.ts`

- [ ] **Créer handler dans Service Worker pour Safari:**
  - [ ] Écouter événement `activate` du SW
  - [ ] Vérifier connectivité
  - [ ] Traiter queue si online

### 6.6 Phase 6: Tests et validation

- [ ] **Tests Chrome/Edge:**
  - [ ] Créer transaction offline
  - [ ] Vérifier que Background Sync se déclenche
  - [ ] Vérifier que la requête est rejouée quand online
  - [ ] Vérifier mise à jour IndexedDB

- [ ] **Tests Safari:**
  - [ ] Créer transaction offline
  - [ ] Vérifier que polling fonctionne
  - [ ] Vérifier que queue est traitée quand online
  - [ ] Vérifier persistance IndexedDB

- [ ] **Tests de régression:**
  - [ ] Vérifier que syncManager existant fonctionne toujours
  - [ ] Vérifier que les autres services (transactionService, accountService) fonctionnent
  - [ ] Vérifier performance (pas de dégradation)

### 6.7 Phase 7: Documentation et monitoring

- [ ] **Documenter:**
  - [ ] Architecture Background Sync
  - [ ] Stratégie Safari fallback
  - [ ] Schéma IndexedDB mis à jour
  - [ ] Guide de débogage

- [ ] **Monitoring:**
  - [ ] Ajouter métriques de sync (succès/échec)
  - [ ] Logger les opérations Background Sync
  - [ ] Alertes si queue dépasse seuil

---

## 7. CONSIDÉRATIONS TECHNIQUES

### 7.1 Limitations Safari

**Problèmes identifiés:**
1. ❌ Pas de Background Sync API
2. ⚠️ Service Worker peut être tué après inactivité
3. ⚠️ IndexedDB peut être vidé après période d'inactivité
4. ⚠️ Quota de stockage limité (~50 MB)

**Solutions:**
1. ✅ Polling périodique (60 secondes)
2. ✅ Événements `online`/`offline`
3. ✅ Persistance dans SafariStorageFallback
4. ✅ Nettoyage automatique des opérations expirées

### 7.2 Performance

**Optimisations recommandées:**
1. **Batching:** Traiter plusieurs opérations en une seule requête
2. **Priorité:** Traiter les opérations haute priorité en premier
3. **Expiration:** Supprimer les opérations expirées automatiquement
4. **Limite:** Limiter le nombre d'opérations en queue (max 100)

### 7.3 Sécurité

**Recommandations:**
1. ✅ Valider les données avant ajout à la queue
2. ✅ Limiter `retryCount` (max 3 tentatives)
3. ✅ Expirer les opérations après 24 heures
4. ✅ Filtrer par `userId` pour éviter les fuites de données

---

## 8. RÉSUMÉ

### 8.1 État actuel

✅ **Déjà implémenté:**
- Service Worker avec Workbox
- Queue IndexedDB (`syncQueue`)
- Gestionnaire de synchronisation (`syncManager.ts`)
- Service Safari avec polling (`SafariSyncService.ts`)
- Détection de compatibilité Safari

❌ **Manquant:**
- Configuration Workbox Background Sync
- Handler `sync` dans Service Worker
- Intégration Background Sync avec syncManager
- Schéma IndexedDB étendu (priority, syncTag, etc.)

### 8.2 Prochaines étapes

1. **Priorité HAUTE:** Configurer Workbox Background Sync dans `vite.config.ts`
2. **Priorité HAUTE:** Créer handler `sync` dans Service Worker custom
3. **Priorité MOYENNE:** Étendre schéma IndexedDB avec nouveaux champs
4. **Priorité MOYENNE:** Intégrer Background Sync avec syncManager
5. **Priorité BASSE:** Améliorer SafariSyncService avec IndexedDB

### 8.3 Estimation

- **Phase 1-2:** 2-3 heures (configuration Workbox + schéma)
- **Phase 3-4:** 4-6 heures (Service Worker + intégration)
- **Phase 5:** 2-3 heures (Safari fallback)
- **Phase 6-7:** 3-4 heures (tests + documentation)

**Total estimé:** 11-16 heures

---

**AGENT-03-SW-SYNC-COMPLETE**

