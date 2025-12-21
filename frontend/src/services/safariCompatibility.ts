/**
 * Service de compatibilité Safari/iOS pour BazarKELY
 * Gère la détection des fonctionnalités et les fallbacks pour Safari
 */

export interface SafariCapabilities {
  isSafari: boolean;
  isIOS: boolean;
  isIPhone: boolean;
  isIPad: boolean;
  supportsPWA: boolean;
  supportsServiceWorker: boolean;
  supportsIndexedDB: boolean;
  supportsWebNotifications: boolean;
  supportsHapticFeedback: boolean;
  supportsSafeArea: boolean;
  supportsAddToHomeScreen: boolean;
  version: string;
  isStandalone: boolean;
}

export interface SafariLimitations {
  limitedServiceWorker: boolean;
  noBackgroundSync: boolean;
  noPushNotifications: boolean;
  limitedIndexedDB: boolean;
  noHapticFeedback: boolean;
  noFullscreenAPI: boolean;
}

class SafariCompatibilityService {
  private capabilities: SafariCapabilities | null = null;
  private limitations: SafariLimitations | null = null;
  private userAgent: string;
  private isInitialized = false;

  constructor() {
    // Guard défensif : vérifier que navigator existe (peut être absent en SSR/Service Worker)
    if (typeof navigator !== 'undefined' && navigator.userAgent) {
      this.userAgent = navigator.userAgent;
    } else {
      // Fallback pour environnements sans navigator (SSR, Service Worker, build)
      this.userAgent = 'Unknown';
      console.warn('⚠️ navigator.userAgent non disponible, utilisation de valeurs par défaut');
    }
    this.detectCapabilities();
  }

  /**
   * Détecte les capacités et limitations de Safari/iOS
   */
  private detectCapabilities(): void {
    // Guard défensif : vérifier que userAgent est valide
    if (!this.userAgent || this.userAgent === 'Unknown') {
      // Valeurs par défaut si userAgent non disponible
      this.capabilities = {
        isSafari: false,
        isIOS: false,
        isIPhone: false,
        isIPad: false,
        supportsPWA: false,
        supportsServiceWorker: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
        supportsIndexedDB: typeof window !== 'undefined' && 'indexedDB' in window,
        supportsWebNotifications: typeof window !== 'undefined' && 'Notification' in window,
        supportsHapticFeedback: false,
        supportsSafeArea: false,
        supportsAddToHomeScreen: false,
        version: '0.0',
        isStandalone: false
      };
      
      this.limitations = {
        limitedServiceWorker: false,
        noBackgroundSync: false,
        noPushNotifications: false,
        limitedIndexedDB: false,
        noHapticFeedback: true,
        noFullscreenAPI: false
      };
      
      this.isInitialized = true;
      return;
    }

    const isSafari = /^((?!chrome|android).)*safari/i.test(this.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(this.userAgent);
    const isIPhone = /iPhone|iPod/.test(this.userAgent);
    const isIPad = /iPad/.test(this.userAgent);
    
    // Détection de la version Safari
    const safariVersion = this.getSafariVersion();
    
    // Détection du mode standalone (PWA installée) - avec guard défensif
    const isStandalone = typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );

    this.capabilities = {
      isSafari,
      isIOS,
      isIPhone,
      isIPad,
      supportsPWA: this.supportsPWA(),
      supportsServiceWorker: this.supportsServiceWorker(),
      supportsIndexedDB: this.supportsIndexedDB(),
      supportsWebNotifications: this.supportsWebNotifications(),
      supportsHapticFeedback: this.supportsHapticFeedback(),
      supportsSafeArea: this.supportsSafeArea(),
      supportsAddToHomeScreen: isIOS && !isStandalone,
      version: safariVersion,
      isStandalone
    };

    this.limitations = {
      limitedServiceWorker: isSafari && safariVersion < '14.0',
      noBackgroundSync: isSafari,
      noPushNotifications: isSafari,
      limitedIndexedDB: isSafari && safariVersion < '13.0',
      noHapticFeedback: !isIOS,
      noFullscreenAPI: isSafari
    };

    this.isInitialized = true;
    this.logCapabilities();
  }

  /**
   * Obtient la version de Safari
   */
  private getSafariVersion(): string {
    const match = this.userAgent.match(/Version\/(\d+\.\d+)/);
    return match ? match[1] : '0.0';
  }

  /**
   * Vérifie le support PWA
   */
  private supportsPWA(): boolean {
    return 'serviceWorker' in navigator && 
           'PushManager' in window && 
           window.matchMedia('(display-mode: standalone)').matches;
  }

  /**
   * Vérifie le support Service Worker
   */
  private supportsServiceWorker(): boolean {
    return 'serviceWorker' in navigator;
  }

  /**
   * Vérifie le support IndexedDB
   */
  private supportsIndexedDB(): boolean {
    return 'indexedDB' in window;
  }

  /**
   * Vérifie le support des notifications web
   */
  private supportsWebNotifications(): boolean {
    return 'Notification' in window;
  }

  /**
   * Vérifie le support du haptic feedback
   */
  private supportsHapticFeedback(): boolean {
    return 'vibrate' in navigator || 
           (navigator as any).vibrate !== undefined;
  }

  /**
   * Vérifie le support des safe areas (iPhone X+)
   */
  private supportsSafeArea(): boolean {
    return CSS.supports('padding: env(safe-area-inset-top)') ||
           CSS.supports('padding: constant(safe-area-inset-top)');
  }

  /**
   * Obtient les capacités détectées
   */
  getCapabilities(): SafariCapabilities {
    if (!this.isInitialized) {
      this.detectCapabilities();
    }
    
    // Guard défensif : retourner un objet par défaut si capabilities est null
    if (!this.capabilities) {
      console.warn('⚠️ Capabilities non initialisées, retour de valeurs par défaut');
      // Réessayer l'initialisation
      this.detectCapabilities();
      
      // Si toujours null après réessai, retourner un objet par défaut sûr
      if (!this.capabilities) {
        return {
          isSafari: false,
          isIOS: false,
          isIPhone: false,
          isIPad: false,
          supportsPWA: false,
          supportsServiceWorker: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
          supportsIndexedDB: typeof window !== 'undefined' && 'indexedDB' in window,
          supportsWebNotifications: typeof window !== 'undefined' && 'Notification' in window,
          supportsHapticFeedback: false,
          supportsSafeArea: false,
          supportsAddToHomeScreen: false,
          version: '0.0',
          isStandalone: false
        };
      }
    }
    
    return this.capabilities;
  }

  /**
   * Obtient les limitations détectées
   */
  getLimitations(): SafariLimitations {
    if (!this.isInitialized) {
      this.detectCapabilities();
    }
    return this.limitations!;
  }

  /**
   * Vérifie si l'appareil est Safari/iOS
   */
  isSafariOrIOS(): boolean {
    return this.getCapabilities().isSafari || this.getCapabilities().isIOS;
  }

  /**
   * Vérifie si l'appareil nécessite des optimisations iOS
   */
  needsIOSOptimizations(): boolean {
    return this.getCapabilities().isIOS;
  }

  /**
   * Vérifie si l'appareil nécessite des fallbacks Safari
   */
  needsSafariFallbacks(): boolean {
    return this.getCapabilities().isSafari && !this.getCapabilities().supportsPWA;
  }

  /**
   * Obtient les classes CSS à appliquer selon l'appareil
   */
  getDeviceClasses(): string[] {
    const caps = this.getCapabilities();
    const classes: string[] = [];

    if (caps.isIOS) classes.push('ios-device');
    if (caps.isIPhone) classes.push('iphone');
    if (caps.isIPad) classes.push('ipad');
    if (caps.isSafari) classes.push('safari');
    if (caps.isStandalone) classes.push('pwa-installed');
    if (caps.supportsSafeArea) classes.push('safe-area-supported');
    if (this.needsSafariFallbacks()) classes.push('safari-fallback');

    return classes;
  }

  /**
   * Obtient les métadonnées pour l'installation PWA
   */
  getInstallationMetadata(): {
    canInstall: boolean;
    method: 'native' | 'manual' | 'unsupported';
    instructions: string[];
  } {
    const caps = this.getCapabilities();
    
    if (caps.isStandalone) {
      return {
        canInstall: false,
        method: 'unsupported',
        instructions: ['Application déjà installée']
      };
    }

    if (caps.isIOS) {
      return {
        canInstall: true,
        method: 'manual',
        instructions: [
          'Appuyez sur le bouton Partager',
          'Sélectionnez "Sur l\'écran d\'accueil"',
          'Appuyez sur "Ajouter"'
        ]
      };
    }

    if (caps.supportsPWA) {
      return {
        canInstall: true,
        method: 'native',
        instructions: ['Cliquez sur le bouton d\'installation']
      };
    }

    return {
      canInstall: false,
      method: 'unsupported',
      instructions: ['Installation non supportée sur ce navigateur']
    };
  }

  /**
   * Obtient les stratégies de stockage recommandées
   */
  getStorageStrategy(): {
    primary: 'indexeddb' | 'localstorage' | 'websql';
    fallback: 'localstorage' | 'memory';
    sync: 'serviceworker' | 'polling' | 'manual';
  } {
    const caps = this.getCapabilities();
    const lims = this.getLimitations();

    if (caps.supportsIndexedDB && !lims.limitedIndexedDB) {
      return {
        primary: 'indexeddb',
        fallback: 'localstorage',
        sync: caps.supportsServiceWorker ? 'serviceworker' : 'polling'
      };
    }

    return {
      primary: 'localstorage',
      fallback: 'memory',
      sync: 'manual'
    };
  }

  /**
   * Obtient les optimisations de performance recommandées
   */
  getPerformanceOptimizations(): {
    enableVirtualScrolling: boolean;
    enableLazyLoading: boolean;
    enableImageOptimization: boolean;
    enableCodeSplitting: boolean;
    maxConcurrentOperations: number;
  } {
    const caps = this.getCapabilities();
    
    return {
      enableVirtualScrolling: caps.isIOS, // iOS bénéficie du virtual scrolling
      enableLazyLoading: true, // Toujours activé pour les performances
      enableImageOptimization: caps.isIOS, // iOS nécessite l'optimisation d'images
      enableCodeSplitting: caps.isSafari, // Safari bénéficie du code splitting
      maxConcurrentOperations: caps.isIOS ? 10 : 50 // Limite plus basse sur iOS
    };
  }

  /**
   * Applique les classes CSS à l'élément body
   */
  applyDeviceClasses(): void {
    const classes = this.getDeviceClasses();
    document.body.classList.add(...classes);
  }

  /**
   * Obtient les métriques de performance spécifiques à l'appareil
   */
  getDeviceMetrics(): {
    memoryLimit: number; // MB
    storageLimit: number; // MB
    maxTabs: number;
    recommendedPageSize: number;
  } {
    const caps = this.getCapabilities();
    
    if (caps.isIPhone) {
      return {
        memoryLimit: 100, // iPhone a moins de mémoire
        storageLimit: 50, // Limite de stockage plus basse
        maxTabs: 5,
        recommendedPageSize: 20
      };
    }
    
    if (caps.isIPad) {
      return {
        memoryLimit: 200,
        storageLimit: 100,
        maxTabs: 10,
        recommendedPageSize: 50
      };
    }
    
    // Desktop Safari
    return {
      memoryLimit: 500,
      storageLimit: 200,
      maxTabs: 20,
      recommendedPageSize: 100
    };
  }

  /**
   * Log des capacités détectées (debug)
   */
  private logCapabilities(): void {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Safari/iOS Compatibility Detection:');
      console.log('📱 Device:', this.capabilities);
      console.log('⚠️ Limitations:', this.limitations);
      console.log('💾 Storage Strategy:', this.getStorageStrategy());
      console.log('⚡ Performance Optimizations:', this.getPerformanceOptimizations());
    }
  }

  /**
   * Vérifie si une fonctionnalité est supportée
   */
  isFeatureSupported(feature: keyof SafariCapabilities): boolean {
    return this.getCapabilities()[feature];
  }

  /**
   * Obtient un message d'erreur adapté à l'appareil
   */
  getErrorMessage(feature: string): string {
    const caps = this.getCapabilities();
    
    if (caps.isIOS) {
      return `Cette fonctionnalité n'est pas disponible sur iOS. ${feature} sera désactivé.`;
    }
    
    if (caps.isSafari) {
      return `Cette fonctionnalité n'est pas supportée par Safari. ${feature} sera désactivé.`;
    }
    
    return `Cette fonctionnalité n'est pas supportée sur votre appareil. ${feature} sera désactivé.`;
  }

  /**
   * Initialise les optimisations spécifiques à l'appareil
   */
  initializeDeviceOptimizations(): void {
    this.applyDeviceClasses();
    
    const caps = this.getCapabilities();
    const metrics = this.getDeviceMetrics();
    
    // Appliquer les optimisations de performance
    const optimizations = this.getPerformanceOptimizations();
    
    // Configurer les limites de mémoire
    if (caps.isIOS) {
      // Réduire la taille des caches sur iOS
      this.configureIOSMemoryLimits(metrics.memoryLimit);
    }
    
    // Configurer les safe areas pour iPhone X+
    if (caps.supportsSafeArea) {
      this.configureSafeAreas();
    }
    
    console.log('✅ Optimisations spécifiques à l\'appareil initialisées');
  }

  /**
   * Configure les limites de mémoire pour iOS
   */
  private configureIOSMemoryLimits(memoryLimit: number): void {
    // Configuration des limites de mémoire pour iOS
    const config = {
      maxCacheSize: memoryLimit * 0.5, // 50% de la mémoire disponible
      maxImageCache: memoryLimit * 0.2, // 20% pour les images
      maxDataCache: memoryLimit * 0.3  // 30% pour les données
    };
    
    // Stocker la configuration pour utilisation par d'autres services
    localStorage.setItem('ios-memory-config', JSON.stringify(config));
  }

  /**
   * Configure les safe areas pour iPhone X+
   */
  private configureSafeAreas(): void {
    // Ajouter les styles CSS pour les safe areas
    const style = document.createElement('style');
    style.textContent = `
      .safe-area-top { padding-top: env(safe-area-inset-top); }
      .safe-area-bottom { padding-bottom: env(safe-area-inset-bottom); }
      .safe-area-left { padding-left: env(safe-area-inset-left); }
      .safe-area-right { padding-right: env(safe-area-inset-right); }
      .safe-area-all { 
        padding-top: env(safe-area-inset-top);
        padding-bottom: env(safe-area-inset-bottom);
        padding-left: env(safe-area-inset-left);
        padding-right: env(safe-area-inset-right);
      }
    `;
    document.head.appendChild(style);
  }
}

// Instance singleton
export const safariCompatibility = new SafariCompatibilityService();

// Initialisation automatique
if (typeof window !== 'undefined') {
  safariCompatibility.initializeDeviceOptimizations();
}





























































