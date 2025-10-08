/**
 * Gestionnaire de Service Worker adaptatif pour Safari/iOS
 * Détecte les capacités et charge le bon Service Worker
 */

import safariCompatibility from './safariCompatibility';

class SafariServiceWorkerManager {
  private isRegistered = false;
  private registration: ServiceWorkerRegistration | null = null;

  /**
   * Initialise le Service Worker approprié
   */
  async initialize(): Promise<boolean> {
    try {
      const capabilities = safariCompatibility.detectCapabilities();
      
      if (!capabilities.supportsServiceWorker) {
        console.log('⚠️ Service Worker non supporté, utilisation du mode web app');
        return false;
      }

      // Choisir le Service Worker approprié
      const swPath = this.getServiceWorkerPath(capabilities);
      
      console.log('🔧 Enregistrement Service Worker:', swPath);
      
      this.registration = await navigator.serviceWorker.register(swPath, {
        scope: '/',
        updateViaCache: 'none'
      });

      this.isRegistered = true;
      
      // Gérer les mises à jour
      this.setupUpdateHandling();
      
      // Gérer les messages
      this.setupMessageHandling();
      
      console.log('✅ Service Worker enregistré:', this.registration.scope);
      return true;
      
    } catch (error) {
      console.error('❌ Erreur enregistrement Service Worker:', error);
      return false;
    }
  }

  /**
   * Détermine le chemin du Service Worker approprié
   */
  private getServiceWorkerPath(capabilities: any): string {
    if (capabilities.isSafari) {
      return '/sw-safari.js';
    } else {
      return '/sw.js';
    }
  }

  /**
   * Configure la gestion des mises à jour
   */
  private setupUpdateHandling(): void {
    if (!this.registration) return;

    this.registration.addEventListener('updatefound', () => {
      const newWorker = this.registration!.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // Nouvelle version disponible
            console.log('🔄 Nouvelle version disponible');
            this.notifyUpdateAvailable();
          } else {
            // Première installation
            console.log('✅ Service Worker installé');
          }
        }
      });
    });
  }

  /**
   * Configure la gestion des messages
   */
  private setupMessageHandling(): void {
    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, data } = event.data;
      
      switch (type) {
        case 'CACHE_UPDATED':
          console.log('📦 Cache mis à jour:', data);
          break;
          
        case 'SYNC_COMPLETED':
          console.log('🔄 Synchronisation terminée:', data);
          break;
          
        case 'NOTIFICATION_CLICKED':
          console.log('🔔 Notification cliquée:', data);
          break;
          
        case 'ERROR_OCCURRED':
          console.error('❌ Erreur Service Worker:', data);
          break;
      }
    });
  }

  /**
   * Notifie qu'une mise à jour est disponible
   */
  private notifyUpdateAvailable(): void {
    // Créer une notification visuelle
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-blue-500 text-white p-4 rounded-lg shadow-lg z-50';
    notification.innerHTML = `
      <div class="flex items-center space-x-3">
        <span>🔄 Mise à jour disponible</span>
        <button 
          onclick="this.parentElement.parentElement.remove(); window.location.reload();"
          class="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
        >
          Actualiser
        </button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Supprimer automatiquement après 10 secondes
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 10000);
  }

  /**
   * Force la mise à jour du Service Worker
   */
  async updateServiceWorker(): Promise<boolean> {
    if (!this.registration) return false;

    try {
      await this.registration.update();
      return true;
    } catch (error) {
      console.error('❌ Erreur mise à jour Service Worker:', error);
      return false;
    }
  }

  /**
   * Désactive le Service Worker
   */
  async unregister(): Promise<boolean> {
    if (!this.isRegistered) return true;

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
      
      this.isRegistered = false;
      this.registration = null;
      
      console.log('✅ Service Worker désactivé');
      return true;
    } catch (error) {
      console.error('❌ Erreur désactivation Service Worker:', error);
      return false;
    }
  }

  /**
   * Obtient l'état du Service Worker
   */
  getStatus(): {
    isRegistered: boolean;
    isActive: boolean;
    isInstalling: boolean;
    isWaiting: boolean;
    scope: string | null;
  } {
    return {
      isRegistered: this.isRegistered,
      isActive: this.registration?.active !== null,
      isInstalling: this.registration?.installing !== null,
      isWaiting: this.registration?.waiting !== null,
      scope: this.registration?.scope || null
    };
  }

  /**
   * Envoie un message au Service Worker
   */
  async sendMessage(type: string, data?: any): Promise<void> {
    if (!this.registration?.active) {
      console.warn('⚠️ Service Worker non actif, message non envoyé');
      return;
    }

    try {
      this.registration.active.postMessage({ type, data });
    } catch (error) {
      console.error('❌ Erreur envoi message Service Worker:', error);
    }
  }

  /**
   * Obtient les informations de debug
   */
  getDebugInfo(): object {
    const capabilities = safariCompatibility.detectCapabilities();
    const status = this.getStatus();
    
    return {
      capabilities: {
        supportsServiceWorker: capabilities.supportsServiceWorker,
        isSafari: capabilities.isSafari,
        isIOS: capabilities.isIOS,
        version: capabilities.version
      },
      serviceWorker: status,
      registration: this.registration ? {
        scope: this.registration.scope,
        updateViaCache: this.registration.updateViaCache,
        installing: this.registration.installing?.state,
        waiting: this.registration.waiting?.state,
        active: this.registration.active?.state
      } : null,
      timestamp: new Date().toISOString()
    };
  }
}

export default new SafariServiceWorkerManager();















