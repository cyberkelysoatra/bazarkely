/**
 * Service Worker custom pour BazarKELY
 * Ajoute le support de Background Sync API pour la synchronisation automatique
 * Utilise injectManifest mode avec Workbox
 * 
 * Ce fichier est utilisé comme SW principal avec Vite PWA en mode injectManifest
 */

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

// Prendre le contrôle immédiatement
clientsClaim();

// Tag pour Background Sync
const SYNC_TAG = 'bazarkely-sync';

// Nom de la base de données IndexedDB
const DB_NAME = 'BazarKELY';
const DB_VERSION = 1;
const SYNC_QUEUE_STORE = 'syncQueue';

/**
 * Ouvre la base de données IndexedDB depuis le Service Worker
 * Note: Le SW utilise l'API IndexedDB native, pas Dexie
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      // Créer le store s'il n'existe pas
      if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
        const store = db.createObjectStore(SYNC_QUEUE_STORE, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Récupère les opérations en attente depuis IndexedDB
 */
async function getPendingOperations(): Promise<any[]> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SYNC_QUEUE_STORE], 'readonly');
    const store = transaction.objectStore(SYNC_QUEUE_STORE);
    const index = store.index('status');
    const request = index.getAll(['pending', 'failed']);
    
    request.onsuccess = () => {
      const operations = request.result || [];
      // Filtrer les opérations avec retryCount < 3
      const filtered = operations.filter((op: any) => (op.retryCount || 0) < 3);
      resolve(filtered);
    };
    
    request.onerror = () => reject(request.error);
    
    transaction.oncomplete = () => db.close();
  });
}

/**
 * Met à jour le statut d'une opération dans IndexedDB
 */
async function updateOperationStatus(
  operationId: string,
  status: 'processing' | 'pending' | 'failed',
  retryCount?: number
): Promise<void> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SYNC_QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(SYNC_QUEUE_STORE);
    const getRequest = store.get(operationId);
    
    getRequest.onsuccess = () => {
      const operation = getRequest.result;
      if (!operation) {
        reject(new Error(`Operation ${operationId} not found`));
        return;
      }
      
      operation.status = status;
      if (retryCount !== undefined) {
        operation.retryCount = retryCount;
      }
      
      const putRequest = store.put(operation);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };
    
    getRequest.onerror = () => reject(getRequest.error);
    
    transaction.oncomplete = () => db.close();
  });
}

/**
 * Supprime une opération de la queue après succès
 */
async function deleteOperation(operationId: string): Promise<void> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SYNC_QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(SYNC_QUEUE_STORE);
    const request = store.delete(operationId);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    
    transaction.oncomplete = () => db.close();
  });
}

/**
 * Traite une opération de synchronisation
 * Envoie une requête à Supabase pour exécuter l'opération
 */
async function processOperation(operation: any): Promise<boolean> {
  try {
    const { operation: opType, table_name, data } = operation;
    
    // URL Supabase (doit correspondre à celle dans lib/supabase.ts)
    const supabaseUrl = 'https://ofzmwrzatcztoekrpvkj.supabase.co';
    
    // Construire l'URL de l'API Supabase
    let url = `${supabaseUrl}/rest/v1/${table_name}`;
    let method = 'POST';
    let body: any = null;
    
    if (opType === 'CREATE') {
      // Pour CREATE, enlever l'id car Supabase le génère
      const { id, ...insertData } = data;
      body = JSON.stringify(insertData);
      method = 'POST';
    } else if (opType === 'UPDATE') {
      const { id, ...updateData } = data;
      url = `${url}?id=eq.${id}`;
      body = JSON.stringify(updateData);
      method = 'PATCH';
    } else if (opType === 'DELETE') {
      const { id } = data;
      url = `${url}?id=eq.${id}`;
      method = 'DELETE';
    }
    
    // Récupérer le token d'authentification depuis IndexedDB
    // Le token est stocké dans IndexedDB par l'application principale
    let authToken: string | null = null;
    try {
      const db = await openDatabase();
      const tokenStore = 'auth_tokens'; // Store pour les tokens (à créer si nécessaire)
      // Pour l'instant, on essaie de récupérer depuis localStorage via postMessage
      // TODO: Implémenter le stockage du token dans IndexedDB
    } catch (tokenError) {
      console.warn('[SW] ⚠️ Impossible de récupérer le token, tentative sans auth');
    }
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mem13cnphdGN6dG9la3JwdmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNjAxMTUsImV4cCI6MjA3NDczNjExNX0.hYDpbvzwNZWmDgXPSGEgoKLR-m51TQZmaWw1whQ90Cw', // Anon key
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await fetch(url, {
      method,
      headers,
      body: body || undefined,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error(`[SW] ❌ Erreur lors du traitement de l'opération ${operation.id}:`, error);
    throw error; // Re-throw pour déclencher le retry
  }
}

/**
 * Handler pour l'événement 'sync' de Background Sync API
 * Traite toutes les opérations en attente depuis IndexedDB
 */
self.addEventListener('sync', (event: any) => {
  console.log('[SW] 🔄 Événement sync déclenché:', event.tag);
  
  if (event.tag === SYNC_TAG) {
    event.waitUntil(
      (async () => {
        try {
          console.log('[SW] 📋 Récupération des opérations en attente...');
          const operations = await getPendingOperations();
          
          if (operations.length === 0) {
            console.log('[SW] ✅ Aucune opération en attente');
            return;
          }
          
          console.log(`[SW] 📦 ${operations.length} opération(s) à traiter`);
          
          let successCount = 0;
          let errorCount = 0;
          
          // Traiter chaque opération séquentiellement
          for (const operation of operations) {
            try {
              // Marquer comme "processing"
              await updateOperationStatus(operation.id, 'processing');
              
              // Traiter l'opération
              const success = await processOperation(operation);
              
              if (success) {
                // Supprimer de la queue
                await deleteOperation(operation.id);
                successCount++;
                console.log(`[SW] ✅ Opération ${operation.id} synchronisée avec succès`);
              } else {
                throw new Error('Operation failed');
              }
            } catch (error) {
              errorCount++;
              const newRetryCount = (operation.retryCount || 0) + 1;
              
              if (newRetryCount >= 3) {
                // Maximum de tentatives atteint
                await updateOperationStatus(operation.id, 'failed', newRetryCount);
                console.error(`[SW] ❌ Opération ${operation.id} a échoué après 3 tentatives`);
              } else {
                // Réessayer plus tard
                await updateOperationStatus(operation.id, 'pending', newRetryCount);
                console.log(`[SW] ⏳ Opération ${operation.id} sera réessayée (tentative ${newRetryCount}/3)`);
                // Re-throw pour déclencher un nouveau sync event
                throw error;
              }
            }
          }
          
          console.log(`[SW] ✅ Traitement terminé: ${successCount} succès, ${errorCount} erreurs`);
        } catch (error) {
          console.error('[SW] ❌ Erreur lors du traitement de la queue:', error);
          // Re-throw pour déclencher un nouveau sync event
          throw error;
        }
      })()
    );
  }
});

// Précharger et router les assets
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// Précharger les assets définis par Vite PWA
precacheAndRoute(self.__WB_MANIFEST);

// Navigation fallback pour SPA
const handler = createHandlerBoundToURL('/index.html');
const navigationRoute = new NavigationRoute(handler, {
  denylist: [
    /^\/api\/.*/i,
    /^\/supabase\/.*/i,
    /\.(?:js|css|png|svg|ico|woff2?|ttf|eot|jpg|jpeg|gif|webp|json|xml|txt|pdf|zip)$/i,
    /^\/sw\.js$/i,
    /^\/sw-notifications\.js$/i,
    /^\/workbox-.*\.js$/i,
    /^\/manifest\.json$/i,
    /^\/manifest\.webmanifest$/i
  ]
});
registerRoute(navigationRoute);

// Cache runtime pour les API
registerRoute(
  /^https:\/\/api\.bazarkely\.agirpourlequite\.org/,
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      {
        cacheKeyWillBeUsed: async ({ request }) => request.url,
        cacheWillUpdate: async ({ response }) => {
          return response && response.status === 200 ? response : null;
        }
      }
    ]
  })
);

