import { useState, useEffect } from 'react';
import { safariCompatibility, type SafariCapabilities, type SafariLimitations } from '../services/SafariCompatibility';

export interface DeviceInfo {
  capabilities: SafariCapabilities;
  limitations: SafariLimitations;
  deviceClasses: string[];
  installationMetadata: {
    canInstall: boolean;
    method: 'native' | 'manual' | 'unsupported';
    instructions: string[];
  };
  storageStrategy: {
    primary: 'indexeddb' | 'localstorage' | 'websql';
    fallback: 'localstorage' | 'memory';
    sync: 'serviceworker' | 'polling' | 'manual';
  };
  performanceOptimizations: {
    enableVirtualScrolling: boolean;
    enableLazyLoading: boolean;
    enableImageOptimization: boolean;
    enableCodeSplitting: boolean;
    maxConcurrentOperations: number;
  };
  deviceMetrics: {
    memoryLimit: number;
    storageLimit: number;
    maxTabs: number;
    recommendedPageSize: number;
  };
}

export interface DeviceDetectionState {
  deviceInfo: DeviceInfo | null;
  isLoading: boolean;
  error: string | null;
  needsIOSOptimizations: boolean;
  needsSafariFallbacks: boolean;
  isSafariOrIOS: boolean;
}

/**
 * Hook pour la détection de dispositifs et l'amélioration progressive
 */
export const useDeviceDetection = (): DeviceDetectionState => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const detectDevice = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Attendre que le service de compatibilité soit initialisé
        await new Promise(resolve => setTimeout(resolve, 100));

        const capabilities = safariCompatibility.getCapabilities();
        const limitations = safariCompatibility.getLimitations();
        const deviceClasses = safariCompatibility.getDeviceClasses();
        const installationMetadata = safariCompatibility.getInstallationMetadata();
        const storageStrategy = safariCompatibility.getStorageStrategy();
        const performanceOptimizations = safariCompatibility.getPerformanceOptimizations();
        const deviceMetrics = safariCompatibility.getDeviceMetrics();

        const info: DeviceInfo = {
          capabilities,
          limitations,
          deviceClasses,
          installationMetadata,
          storageStrategy,
          performanceOptimizations,
          deviceMetrics
        };

        setDeviceInfo(info);

        // Appliquer les classes CSS au body
        safariCompatibility.applyDeviceClasses();

        // Log des informations de détection
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 Device Detection Complete:', info);
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erreur de détection de dispositif';
        setError(errorMessage);
        console.error('❌ Erreur de détection de dispositif:', err);
      } finally {
        setIsLoading(false);
      }
    };

    detectDevice();
  }, []);

  const needsIOSOptimizations = deviceInfo?.capabilities.isIOS ?? false;
  const needsSafariFallbacks = deviceInfo?.capabilities.isSafari && !deviceInfo?.capabilities.supportsPWA;
  const isSafariOrIOS = deviceInfo?.capabilities.isSafari || deviceInfo?.capabilities.isIOS;

  return {
    deviceInfo,
    isLoading,
    error,
    needsIOSOptimizations,
    needsSafariFallbacks,
    isSafariOrIOS
  };
};

/**
 * Hook pour les optimisations de performance spécifiques à l'appareil
 */
export const usePerformanceOptimizations = () => {
  const { deviceInfo } = useDeviceDetection();

  const getOptimizedPageSize = (defaultSize: number = 50): number => {
    return deviceInfo?.deviceMetrics.recommendedPageSize ?? defaultSize;
  };

  const getMaxConcurrentOperations = (): number => {
    return deviceInfo?.performanceOptimizations.maxConcurrentOperations ?? 50;
  };

  const shouldEnableVirtualScrolling = (): boolean => {
    return deviceInfo?.performanceOptimizations.enableVirtualScrolling ?? false;
  };

  const shouldEnableLazyLoading = (): boolean => {
    return deviceInfo?.performanceOptimizations.enableLazyLoading ?? true;
  };

  const shouldEnableImageOptimization = (): boolean => {
    return deviceInfo?.performanceOptimizations.enableImageOptimization ?? false;
  };

  const shouldEnableCodeSplitting = (): boolean => {
    return deviceInfo?.performanceOptimizations.enableCodeSplitting ?? false;
  };

  const getMemoryLimit = (): number => {
    return deviceInfo?.deviceMetrics.memoryLimit ?? 500;
  };

  const getStorageLimit = (): number => {
    return deviceInfo?.deviceMetrics.storageLimit ?? 200;
  };

  return {
    getOptimizedPageSize,
    getMaxConcurrentOperations,
    shouldEnableVirtualScrolling,
    shouldEnableLazyLoading,
    shouldEnableImageOptimization,
    shouldEnableCodeSplitting,
    getMemoryLimit,
    getStorageLimit
  };
};

/**
 * Hook pour la gestion des fonctionnalités PWA
 */
export const usePWAFeatures = () => {
  const { deviceInfo } = useDeviceDetection();

  const canInstallPWA = (): boolean => {
    return deviceInfo?.installationMetadata.canInstall ?? false;
  };

  const getInstallationMethod = (): 'native' | 'manual' | 'unsupported' => {
    return deviceInfo?.installationMetadata.method ?? 'unsupported';
  };

  const getInstallationInstructions = (): string[] => {
    return deviceInfo?.installationMetadata.instructions ?? [];
  };

  const supportsServiceWorker = (): boolean => {
    return deviceInfo?.capabilities.supportsServiceWorker ?? false;
  };

  const supportsIndexedDB = (): boolean => {
    return deviceInfo?.capabilities.supportsIndexedDB ?? false;
  };

  const supportsWebNotifications = (): boolean => {
    return deviceInfo?.capabilities.supportsWebNotifications ?? false;
  };

  const isStandalone = (): boolean => {
    return deviceInfo?.capabilities.isStandalone ?? false;
  };

  return {
    canInstallPWA,
    getInstallationMethod,
    getInstallationInstructions,
    supportsServiceWorker,
    supportsIndexedDB,
    supportsWebNotifications,
    isStandalone
  };
};

/**
 * Hook pour la gestion des limitations Safari
 */
export const useSafariLimitations = () => {
  const { deviceInfo } = useDeviceDetection();

  const hasLimitedServiceWorker = (): boolean => {
    return deviceInfo?.limitations.limitedServiceWorker ?? false;
  };

  const hasNoBackgroundSync = (): boolean => {
    return deviceInfo?.limitations.noBackgroundSync ?? false;
  };

  const hasNoPushNotifications = (): boolean => {
    return deviceInfo?.limitations.noPushNotifications ?? false;
  };

  const hasLimitedIndexedDB = (): boolean => {
    return deviceInfo?.limitations.limitedIndexedDB ?? false;
  };

  const hasNoHapticFeedback = (): boolean => {
    return deviceInfo?.limitations.noHapticFeedback ?? false;
  };

  const hasNoFullscreenAPI = (): boolean => {
    return deviceInfo?.limitations.noFullscreenAPI ?? false;
  };

  const getErrorMessage = (feature: string): string => {
    return safariCompatibility.getErrorMessage(feature);
  };

  return {
    hasLimitedServiceWorker,
    hasNoBackgroundSync,
    hasNoPushNotifications,
    hasLimitedIndexedDB,
    hasNoHapticFeedback,
    hasNoFullscreenAPI,
    getErrorMessage
  };
};

/**
 * Hook pour la gestion des classes CSS d'appareil
 */
export const useDeviceClasses = () => {
  const { deviceInfo } = useDeviceDetection();

  const getDeviceClasses = (): string[] => {
    return deviceInfo?.deviceClasses ?? [];
  };

  const getDeviceClassString = (): string => {
    return getDeviceClasses().join(' ');
  };

  const hasDeviceClass = (className: string): boolean => {
    return getDeviceClasses().includes(className);
  };

  const isIOSDevice = (): boolean => {
    return hasDeviceClass('ios-device');
  };

  const isIPhone = (): boolean => {
    return hasDeviceClass('iphone');
  };

  const isIPad = (): boolean => {
    return hasDeviceClass('ipad');
  };

  const isSafari = (): boolean => {
    return hasDeviceClass('safari');
  };

  const isPWAInstalled = (): boolean => {
    return hasDeviceClass('pwa-installed');
  };

  const needsSafariFallback = (): boolean => {
    return hasDeviceClass('safari-fallback');
  };

  return {
    getDeviceClasses,
    getDeviceClassString,
    hasDeviceClass,
    isIOSDevice,
    isIPhone,
    isIPad,
    isSafari,
    isPWAInstalled,
    needsSafariFallback
  };
};

/**
 * Hook pour la gestion des stratégies de stockage
 */
export const useStorageStrategy = () => {
  const { deviceInfo } = useDeviceDetection();

  const getPrimaryStorage = (): 'indexeddb' | 'localstorage' | 'websql' => {
    return deviceInfo?.storageStrategy.primary ?? 'indexeddb';
  };

  const getFallbackStorage = (): 'localstorage' | 'memory' => {
    return deviceInfo?.storageStrategy.fallback ?? 'localstorage';
  };

  const getSyncStrategy = (): 'serviceworker' | 'polling' | 'manual' => {
    return deviceInfo?.storageStrategy.sync ?? 'serviceworker';
  };

  const shouldUseIndexedDB = (): boolean => {
    return getPrimaryStorage() === 'indexeddb';
  };

  const shouldUseLocalStorage = (): boolean => {
    return getPrimaryStorage() === 'localstorage' || getFallbackStorage() === 'localstorage';
  };

  const shouldUseMemoryStorage = (): boolean => {
    return getFallbackStorage() === 'memory';
  };

  const shouldUseServiceWorkerSync = (): boolean => {
    return getSyncStrategy() === 'serviceworker';
  };

  const shouldUsePollingSync = (): boolean => {
    return getSyncStrategy() === 'polling';
  };

  const shouldUseManualSync = (): boolean => {
    return getSyncStrategy() === 'manual';
  };

  return {
    getPrimaryStorage,
    getFallbackStorage,
    getSyncStrategy,
    shouldUseIndexedDB,
    shouldUseLocalStorage,
    shouldUseMemoryStorage,
    shouldUseServiceWorkerSync,
    shouldUsePollingSync,
    shouldUseManualSync
  };
};


















