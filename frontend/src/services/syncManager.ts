/**
 * Service de gestion de la synchronisation offline-first
 * Traite la queue de synchronisation quand la connexion est rétablie
 */

import { db } from '../lib/database';
import { supabase } from '../lib/supabase';
import type { SyncOperation } from '../types';

/**
 * Nombre maximum de tentatives par opération
 */
const MAX_RETRIES = 3;

/**
 * Set pour suivre les opérations en cours de traitement
 * Évite de traiter la même opération deux fois simultanément
 */
const processingOperations = new Set<string>();

/**
 * Flag pour indiquer si le SyncManager est initialisé
 */
let isInitialized = false;

/**
 * Flag pour éviter les syncs simultanées (Background Sync + polling)
 */
let isSyncInProgress = false;

/**
 * Tag pour Background Sync API
 */
const BACKGROUND_SYNC_TAG = 'bazarkely-sync';

/**
 * Configuration du polling intelligent (fallback Safari/Firefox)
 */
let pollingIntervalId: NodeJS.Timeout | null = null;
let consecutiveFailures = 0;
const BASE_POLLING_INTERVAL = 30000; // 30 secondes quand queue a des items
const IDLE_POLLING_INTERVAL = 5 * 60 * 1000; // 5 minutes quand queue vide
const MAX_BACKOFF_INTERVAL = 5 * 60 * 1000; // 5 minutes max backoff
const BACKOFF_MULTIPLIER = 2;

/**
 * Attend qu'une session Supabase valide soit disponible
 * @param maxWaitMs - Temps maximum d'attente en millisecondes (défaut: 10000ms)
 * @returns true si une session valide est détectée, false en cas de timeout
 */
const waitForSession = async (maxWaitMs: number = 10000): Promise<boolean> => {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      console.log('🔄 [SyncManager] ✅ Session valide détectée');
      return true;
    }

    await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
  }

  console.log('🔄 [SyncManager] ⚠️ Timeout: pas de session après', maxWaitMs, 'ms');
  return false;
};

/**
 * Vérifie si Background Sync API est supporté
 * @returns true si Background Sync est supporté, false sinon
 */
export async function isBackgroundSyncSupported(): Promise<boolean> {
  // Vérifier le support de Service Worker
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Vérifier si l'API sync est disponible
    if (!('sync' in registration)) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Initialise le fallback de synchronisation (polling intelligent)
 * Utilisé uniquement si Background Sync n'est pas supporté (Safari/Firefox)
 */
function initializeSyncFallback(): void {
  // Ne pas initialiser si Background Sync est supporté
  isBackgroundSyncSupported().then(supported => {
    if (supported) {
      console.log('🔄 [SyncManager] ✅ Background Sync supporté, polling désactivé');
      return;
    }

    console.log('🔄 [SyncManager] 🦁 Background Sync non supporté, activation du polling intelligent...');
    startIntelligentPolling();
  });
}

/**
 * Démarre le polling intelligent avec intervalles adaptatifs
 */
function startIntelligentPolling(): void {
  // Arrêter le polling existant si présent
  if (pollingIntervalId) {
    clearInterval(pollingIntervalId);
    pollingIntervalId = null;
  }

  // Fonction de polling adaptatif
  const poll = async () => {
    // Ne pas poller si déjà en sync ou hors ligne
    if (isSyncInProgress || !navigator.onLine) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return; // Pas de session, skip
      }

      const pendingCount = await db.syncQueue
        .where('status')
        .anyOf(['pending', 'failed'])
        .filter(op => op.retryCount < MAX_RETRIES)
        .count();

      if (pendingCount > 0) {
        console.log(`🔄 [SyncManager] 🦁 Polling: ${pendingCount} opération(s) en attente`);
        const successCount = await processSyncQueue(true);
        
        // Réinitialiser les échecs consécutifs en cas de succès
        if (successCount > 0) {
          consecutiveFailures = 0;
        } else {
          consecutiveFailures++;
        }
      } else {
        // Queue vide, réinitialiser les échecs
        consecutiveFailures = 0;
      }
    } catch (error) {
      console.error('🔄 [SyncManager] ❌ Erreur lors du polling:', error);
      consecutiveFailures++;
    }
  };

  // Calculer l'intervalle adaptatif
  const calculateInterval = async (): Promise<number> => {
    try {
      const pendingCount = await db.syncQueue
        .where('status')
        .anyOf(['pending', 'failed'])
        .filter(op => op.retryCount < MAX_RETRIES)
        .count();

      if (pendingCount === 0) {
        // Queue vide : intervalle idle
        return IDLE_POLLING_INTERVAL;
      }

      // Queue avec items : intervalle de base avec backoff exponentiel
      const backoffInterval = Math.min(
        BASE_POLLING_INTERVAL * Math.pow(BACKOFF_MULTIPLIER, consecutiveFailures),
        MAX_BACKOFF_INTERVAL
      );
      return backoffInterval;
    } catch (error) {
      // En cas d'erreur, utiliser l'intervalle de base
      return BASE_POLLING_INTERVAL;
    }
  };

  // Fonction récursive avec intervalle adaptatif
  const scheduleNextPoll = async () => {
    const interval = await calculateInterval();
    
    pollingIntervalId = setTimeout(async () => {
      await poll();
      scheduleNextPoll(); // Planifier le prochain poll
    }, interval);
  };

  // Démarrer le premier poll
  scheduleNextPoll();
  console.log('🔄 [SyncManager] 🦁 Polling intelligent démarré');
}

/**
 * Arrête le polling intelligent
 */
function stopIntelligentPolling(): void {
  if (pollingIntervalId) {
    clearTimeout(pollingIntervalId);
    pollingIntervalId = null;
    console.log('🔄 [SyncManager] 🦁 Polling intelligent arrêté');
  }
}

/**
 * Initialise le SyncManager
 * Ajoute un listener pour l'événement 'online'
 * Appelle processSyncQueue() automatiquement quand la connexion est rétablie
 * Détecte le support Background Sync et active le fallback si nécessaire
 */
export function initSyncManager(): void {
  if (isInitialized) {
    console.log('🔄 [SyncManager] Déjà initialisé');
    return;
  }

  console.log('🔄 [SyncManager] Initialisation...');

  // Écouter l'événement 'online' (fonctionne pour tous les navigateurs)
  window.addEventListener('online', () => {
    console.log('🔄 [SyncManager] 🌐 Connexion rétablie, traitement immédiat de la queue...');
    // Sync immédiate sur reconnexion
    consecutiveFailures = 0; // Réinitialiser les échecs
    processSyncQueue().catch(error => {
      console.error('🔄 [SyncManager] ❌ Erreur lors du traitement automatique de la queue:', error);
    });
  });

  // Écouter l'événement 'offline' pour arrêter le polling
  window.addEventListener('offline', () => {
    console.log('🔄 [SyncManager] 📴 Connexion perdue, pause du polling');
    // Le polling se mettra en pause automatiquement (vérifie navigator.onLine)
  });

  // Traiter la queue au démarrage si online
  if (navigator.onLine) {
    console.log('🔄 [SyncManager] 🌐 En ligne au démarrage, traitement de la queue...');
    processSyncQueue().catch(error => {
      console.error('🔄 [SyncManager] ❌ Erreur lors du traitement initial de la queue:', error);
    });
  }

  // Écouter les changements d'état d'authentification
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('🔄 [SyncManager] 🔐 Auth event:', event, session?.user?.email || 'no user');
    
    // Traiter la queue sur connexion OU restauration de session
    if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') && session?.user) {
      console.log('🔄 [SyncManager] 🔐 Session détectée, traitement de la queue...');
      consecutiveFailures = 0; // Réinitialiser les échecs
      processSyncQueue(true).catch(error => {
        console.error('🔄 [SyncManager] ❌ Erreur lors du traitement de la queue:', error);
      });
    }
  });

  // Initialiser le fallback pour Safari/Firefox (si Background Sync non supporté)
  initializeSyncFallback();

  isInitialized = true;
  console.log('🔄 [SyncManager] ✅ Initialisé');
}

/**
 * Traite toutes les opérations en attente dans la queue
 * @param skipSessionCheck - Si true, skip la vérification de session (utilisateur déjà authentifié)
 * @returns Nombre d'opérations traitées avec succès
 */
export async function processSyncQueue(skipSessionCheck: boolean = false): Promise<number> {
  // Vérifier si une sync est déjà en cours (évite les doublons)
  if (isSyncInProgress) {
    console.log('🔄 [SyncManager] ⏸️ Sync déjà en cours, ignorée');
    return 0;
  }

  // Vérifier la connexion
  if (!navigator.onLine) {
    console.warn('🔄 [SyncManager] ⚠️ Hors ligne, impossible de traiter la queue');
    return 0;
  }

  // Marquer comme en cours
  isSyncInProgress = true;

  try {
    // Attendre une session valide avant de traiter (sauf si skipSessionCheck est true)
    if (!skipSessionCheck) {
      const hasSession = await waitForSession();
      if (!hasSession) {
        console.log('🔄 [SyncManager] ⏸️ Sync reportée: pas de session utilisateur');
        return 0;
      }
    } else {
      console.log('🔄 [SyncManager] ✅ Vérification de session ignorée (utilisateur déjà authentifié)');
    }

    // Récupération et traitement des opérations
    console.log('🔄 [SyncManager] 📋 Récupération des opérations en attente...');
    
    // Récupérer toutes les opérations en attente ou en échec
    const pendingOperations = await db.syncQueue
      .where('status')
      .anyOf(['pending', 'failed'])
      .filter(op => op.retryCount < MAX_RETRIES)
      .toArray();

    if (pendingOperations.length === 0) {
      console.log('🔄 [SyncManager] ✅ Aucune opération en attente');
      return 0;
    }

    console.log(`🔄 [SyncManager] 📦 ${pendingOperations.length} opération(s) à traiter`);

    let successCount = 0;
    let errorCount = 0;

    // Traiter chaque opération séquentiellement pour éviter les conflits
    for (const operation of pendingOperations) {
      // Vérifier si l'opération n'est pas déjà en cours de traitement
      if (processingOperations.has(operation.id)) {
        console.log(`🔄 [SyncManager] ⏭️ Opération ${operation.id} déjà en cours, ignorée`);
        continue;
      }

      try {
        const success = await processOperation(operation);
        if (success) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        console.error(`🔄 [SyncManager] ❌ Erreur lors du traitement de l'opération ${operation.id}:`, error);
        errorCount++;
      }
    }

    console.log(`🔄 [SyncManager] ✅ Traitement terminé: ${successCount} succès, ${errorCount} erreurs`);
    return successCount;
  } catch (error) {
    console.error('🔄 [SyncManager] ❌ Erreur lors de la récupération de la queue:', error);
    return 0;
  } finally {
    // Libérer le flag de sync en cours
    isSyncInProgress = false;
  }
}

/**
 * Traite une opération de synchronisation
 * @param operation - L'opération à traiter
 * @returns true si l'opération a réussi, false sinon
 */
async function processOperation(operation: SyncOperation): Promise<boolean> {
  // Marquer l'opération comme en cours de traitement
  processingOperations.add(operation.id);

  try {
    // Marquer l'opération comme "processing"
    await db.syncQueue.update(operation.id, { status: 'processing' });

    console.log(`🔄 [SyncManager] 🔄 Traitement de l'opération ${operation.id} (${operation.operation} sur ${operation.table_name})`);

    let result: { error: any } | null = null;

    // Exécuter l'opération selon le type et la table
    switch (operation.table_name) {
      case 'transactions':
        result = await processTransactionOperation(operation);
        break;
      case 'accounts':
        result = await processAccountOperation(operation);
        break;
      case 'budgets':
        result = await processBudgetOperation(operation);
        break;
      case 'goals':
        result = await processGoalOperation(operation);
        break;
      case 'fee_configurations':
        result = await processFeeConfigurationOperation(operation);
        break;
      default:
        console.error(`🔄 [SyncManager] ❌ Table non supportée: ${operation.table_name}`);
        await db.syncQueue.update(operation.id, {
          status: 'failed',
          retryCount: operation.retryCount + 1
        });
        return false;
    }

    // Vérifier le résultat
    if (result && result.error) {
      throw result.error;
    }

    // Succès : supprimer l'opération de la queue
    await db.syncQueue.delete(operation.id);
    console.log(`🔄 [SyncManager] ✅ Opération ${operation.id} synchronisée avec succès`);
    return true;

  } catch (error: any) {
    console.error(`🔄 [SyncManager] ❌ Erreur lors de la synchronisation de l'opération ${operation.id}:`, error);

    // Incrémenter le compteur de tentatives
    const newRetryCount = operation.retryCount + 1;

    if (newRetryCount >= MAX_RETRIES) {
      // Maximum de tentatives atteint, marquer comme échoué définitivement
      await db.syncQueue.update(operation.id, {
        status: 'failed',
        retryCount: newRetryCount
      });
      console.error(`🔄 [SyncManager] ❌ Opération ${operation.id} a échoué après ${MAX_RETRIES} tentatives`);
    } else {
      // Réessayer plus tard
      await db.syncQueue.update(operation.id, {
        status: 'pending',
        retryCount: newRetryCount
      });
      console.log(`🔄 [SyncManager] ⏳ Opération ${operation.id} sera réessayée (tentative ${newRetryCount}/${MAX_RETRIES})`);
    }

    return false;
  } finally {
    // Retirer l'opération du set de traitement
    processingOperations.delete(operation.id);
  }
}

/**
 * Traite une opération sur la table transactions
 */
async function processTransactionOperation(operation: SyncOperation): Promise<{ error: any } | null> {
  const { operation: opType, data } = operation;

  try {
    switch (opType) {
      case 'CREATE': {
        // Pour CREATE, on enlève l'id du data car Supabase le génère
        const { id, ...insertData } = data;
        const { error } = await supabase
          .from('transactions')
          .insert(insertData);
        return error ? { error } : null;
      }
      case 'UPDATE': {
        const { id, ...updateData } = data;
        const { error } = await supabase
          .from('transactions')
          .update(updateData)
          .eq('id', id);
        return error ? { error } : null;
      }
      case 'DELETE': {
        const { id } = data;
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', id);
        return error ? { error } : null;
      }
      default:
        return { error: new Error(`Opération non supportée: ${opType}`) };
    }
  } catch (error) {
    return { error };
  }
}

/**
 * Traite une opération sur la table accounts
 */
async function processAccountOperation(operation: SyncOperation): Promise<{ error: any } | null> {
  const { operation: opType, data } = operation;

  try {
    switch (opType) {
      case 'CREATE': {
        const { id, ...insertData } = data;
        const { error } = await supabase
          .from('accounts')
          .insert(insertData);
        return error ? { error } : null;
      }
      case 'UPDATE': {
        const { id, ...updateData } = data;
        const { error } = await supabase
          .from('accounts')
          .update(updateData)
          .eq('id', id);
        return error ? { error } : null;
      }
      case 'DELETE': {
        const { id } = data;
        const { error } = await supabase
          .from('accounts')
          .delete()
          .eq('id', id);
        return error ? { error } : null;
      }
      default:
        return { error: new Error(`Opération non supportée: ${opType}`) };
    }
  } catch (error) {
    return { error };
  }
}

/**
 * Traite une opération sur la table budgets
 */
async function processBudgetOperation(operation: SyncOperation): Promise<{ error: any } | null> {
  const { operation: opType, data } = operation;

  try {
    switch (opType) {
      case 'CREATE': {
        const { id, ...insertData } = data;
        const { error } = await supabase
          .from('budgets')
          .insert(insertData);
        return error ? { error } : null;
      }
      case 'UPDATE': {
        const { id, ...updateData } = data;
        const { error } = await supabase
          .from('budgets')
          .update(updateData)
          .eq('id', id);
        return error ? { error } : null;
      }
      case 'DELETE': {
        const { id } = data;
        const { error } = await supabase
          .from('budgets')
          .delete()
          .eq('id', id);
        return error ? { error } : null;
      }
      default:
        return { error: new Error(`Opération non supportée: ${opType}`) };
    }
  } catch (error) {
    return { error };
  }
}

/**
 * Traite une opération sur la table goals
 */
async function processGoalOperation(operation: SyncOperation): Promise<{ error: any } | null> {
  const { operation: opType, data } = operation;

  try {
    switch (opType) {
      case 'CREATE': {
        const { id, ...insertData } = data;
        const { error } = await supabase
          .from('goals')
          .insert(insertData);
        return error ? { error } : null;
      }
      case 'UPDATE': {
        const { id, ...updateData } = data;
        const { error } = await supabase
          .from('goals')
          .update(updateData)
          .eq('id', id);
        return error ? { error } : null;
      }
      case 'DELETE': {
        const { id } = data;
        const { error } = await supabase
          .from('goals')
          .delete()
          .eq('id', id);
        return error ? { error } : null;
      }
      default:
        return { error: new Error(`Opération non supportée: ${opType}`) };
    }
  } catch (error) {
    return { error };
  }
}

/**
 * Traite une opération sur la table fee_configurations
 */
async function processFeeConfigurationOperation(operation: SyncOperation): Promise<{ error: any } | null> {
  const { operation: opType, data } = operation;

  try {
    switch (opType) {
      case 'CREATE': {
        const { id, ...insertData } = data;
        const { error } = await supabase
          .from('fee_configurations')
          .insert(insertData);
        return error ? { error } : null;
      }
      case 'UPDATE': {
        const { id, ...updateData } = data;
        const { error } = await supabase
          .from('fee_configurations')
          .update(updateData)
          .eq('id', id);
        return error ? { error } : null;
      }
      case 'DELETE': {
        const { id } = data;
        const { error } = await supabase
          .from('fee_configurations')
          .delete()
          .eq('id', id);
        return error ? { error } : null;
      }
      default:
        return { error: new Error(`Opération non supportée: ${opType}`) };
    }
  } catch (error) {
    return { error };
  }
}

/**
 * Déclenche manuellement la synchronisation
 * Utile pour les tests ou les actions utilisateur
 * @returns Nombre d'opérations traitées avec succès
 */
export async function manualSync(): Promise<number> {
  console.log('🔄 [SyncManager] 🔧 Synchronisation manuelle déclenchée');
  return await processSyncQueue();
}

/**
 * Obtient le nombre d'opérations en attente dans la queue
 * @returns Nombre d'opérations en attente
 */
export async function getPendingOperationsCount(): Promise<number> {
  try {
    const count = await db.syncQueue
      .where('status')
      .anyOf(['pending', 'failed'])
      .filter(op => op.retryCount < MAX_RETRIES)
      .count();
    return count;
  } catch (error) {
    console.error('🔄 [SyncManager] ❌ Erreur lors du comptage des opérations:', error);
    return 0;
  }
}

/**
 * Obtient toutes les opérations en attente
 * Utile pour le debugging ou l'affichage dans l'UI
 * @returns Liste des opérations en attente
 */
export async function getPendingOperations(): Promise<SyncOperation[]> {
  try {
    const operations = await db.syncQueue
      .where('status')
      .anyOf(['pending', 'failed'])
      .filter(op => op.retryCount < MAX_RETRIES)
      .toArray();
    return operations;
  } catch (error) {
    console.error('🔄 [SyncManager] ❌ Erreur lors de la récupération des opérations:', error);
    return [];
  }
}

/**
 * Nettoie les opérations échouées définitivement (retryCount >= MAX_RETRIES)
 * @returns Nombre d'opérations nettoyées
 */
export async function cleanupFailedOperations(): Promise<number> {
  try {
    const failedOperations = await db.syncQueue
      .where('status')
      .equals('failed')
      .filter(op => op.retryCount >= MAX_RETRIES)
      .toArray();

    const ids = failedOperations.map(op => op.id);
    if (ids.length > 0) {
      await db.syncQueue.bulkDelete(ids);
      console.log(`🔄 [SyncManager] 🗑️ ${ids.length} opération(s) échouée(s) nettoyée(s)`);
    }

    return ids.length;
  } catch (error) {
    console.error('🔄 [SyncManager] ❌ Erreur lors du nettoyage:', error);
    return 0;
  }
}

/**
 * Enregistre un tag Background Sync pour déclencher la synchronisation automatique
 * Fonctionne uniquement sur les navigateurs supportant Background Sync API (Chrome/Edge)
 * Fallback silencieux si non supporté (l'événement 'online' prendra le relais)
 * 
 * Cette fonction doit être appelée après avoir ajouté une opération à la queue
 * @returns true si l'enregistrement a réussi, false sinon
 */
export async function registerBackgroundSync(): Promise<boolean> {
  // Vérifier le support de Service Worker
  if (!('serviceWorker' in navigator)) {
    console.log('🔄 [SyncManager] ⚠️ Service Worker non supporté, Background Sync ignoré');
    return false;
  }

  // Vérifier le support de Background Sync API
  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Vérifier si l'API sync est disponible
    if (!('sync' in registration)) {
      console.log('🔄 [SyncManager] ⚠️ Background Sync API non supporté, utilisation du fallback (événement online)');
      return false;
    }

    // Enregistrer le tag de synchronisation
    try {
      await (registration as any).sync.register(BACKGROUND_SYNC_TAG);
      console.log('🔄 [SyncManager] ✅ Tag Background Sync enregistré:', BACKGROUND_SYNC_TAG);
      return true;
    } catch (syncError: any) {
      // Erreur possible: tag déjà enregistré (pas grave)
      if (syncError.name === 'InvalidStateError' || syncError.message?.includes('already registered')) {
        console.log('🔄 [SyncManager] ℹ️ Tag Background Sync déjà enregistré');
        return true;
      }
      console.warn('🔄 [SyncManager] ⚠️ Erreur lors de l\'enregistrement du tag Background Sync:', syncError);
      return false;
    }
  } catch (error) {
    console.warn('🔄 [SyncManager] ⚠️ Erreur lors de l\'accès au Service Worker:', error);
    return false;
  }
}

