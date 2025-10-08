/**
 * Tests de compatibilité Safari/iOS pour BazarKELY PWA
 * Vérifie le fonctionnement sur différents navigateurs et appareils
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import safariCompatibility from '../services/safariCompatibility';
import safariStorageService from '../services/safariStorageService';

// Mock des APIs du navigateur
const mockUserAgent = (userAgent: string) => {
  Object.defineProperty(navigator, 'userAgent', {
    value: userAgent,
    writable: true
  });
};

const mockIndexedDB = (available: boolean) => {
  if (available) {
    Object.defineProperty(window, 'indexedDB', {
      value: {
        open: vi.fn(),
        deleteDatabase: vi.fn()
      },
      writable: true
    });
  } else {
    delete (window as any).indexedDB;
  }
};

const mockServiceWorker = (available: boolean) => {
  if (available) {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: vi.fn(),
        ready: Promise.resolve({
          active: { postMessage: vi.fn() }
        })
      },
      writable: true
    });
  } else {
    delete (navigator as any).serviceWorker;
  }
};

const mockNotifications = (available: boolean) => {
  if (available) {
    Object.defineProperty(window, 'Notification', {
      value: vi.fn().mockImplementation(() => ({
        close: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      })),
      writable: true
    });
    (window.Notification as any).permission = 'default';
    (window.Notification as any).requestPermission = vi.fn().mockResolvedValue('granted');
  } else {
    delete (window as any).Notification;
  }
};

const mockLocalStorage = () => {
  const store: { [key: string]: string } = {};
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach(key => delete store[key]); }
    },
    writable: true
  });
};

const mockWebSQL = (available: boolean) => {
  if (available) {
    Object.defineProperty(window, 'openDatabase', {
      value: vi.fn().mockReturnValue({
        transaction: vi.fn(),
        readTransaction: vi.fn()
      }),
      writable: true
    });
  } else {
    delete (window as any).openDatabase;
  }
};

describe('Safari Compatibility Service', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    mockLocalStorage();
  });

  afterEach(() => {
    // Clean up
    vi.restoreAllMocks();
  });

  describe('Détection des capacités', () => {
    it('détecte correctement Safari sur iOS', () => {
      mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1');
      mockIndexedDB(true);
      mockServiceWorker(false);
      mockNotifications(false);
      mockWebSQL(true);

      const capabilities = safariCompatibility.detectCapabilities();

      expect(capabilities.isSafari).toBe(true);
      expect(capabilities.isIOS).toBe(true);
      expect(capabilities.isIPhone).toBe(true);
      expect(capabilities.isIPad).toBe(false);
      expect(capabilities.supportsPWA).toBe(false);
      expect(capabilities.supportsServiceWorker).toBe(false);
      expect(capabilities.supportsIndexedDB).toBe(true);
      expect(capabilities.supportsNotifications).toBe(false);
      expect(capabilities.supportsAddToHomeScreen).toBe(true);
    });

    it('détecte correctement Safari sur iPad', () => {
      mockUserAgent('Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1');
      mockIndexedDB(true);
      mockServiceWorker(false);
      mockNotifications(false);
      mockWebSQL(true);

      const capabilities = safariCompatibility.detectCapabilities();

      expect(capabilities.isSafari).toBe(true);
      expect(capabilities.isIOS).toBe(true);
      expect(capabilities.isIPhone).toBe(false);
      expect(capabilities.isIPad).toBe(true);
    });

    it('détecte correctement Safari desktop', () => {
      mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15');
      mockIndexedDB(true);
      mockServiceWorker(true);
      mockNotifications(true);
      mockWebSQL(false);

      const capabilities = safariCompatibility.detectCapabilities();

      expect(capabilities.isSafari).toBe(true);
      expect(capabilities.isIOS).toBe(false);
      expect(capabilities.isIPhone).toBe(false);
      expect(capabilities.isIPad).toBe(false);
      expect(capabilities.supportsPWA).toBe(true);
    });

    it('détecte correctement Chrome (non-Safari)', () => {
      mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/93.0.4577.63 Mobile/15E148 Safari/604.1');
      mockIndexedDB(true);
      mockServiceWorker(true);
      mockNotifications(true);
      mockWebSQL(false);

      const capabilities = safariCompatibility.detectCapabilities();

      expect(capabilities.isSafari).toBe(false);
      expect(capabilities.isIOS).toBe(true);
      expect(capabilities.supportsPWA).toBe(true);
    });
  });

  describe('Optimisations', () => {
    it('recommandations pour iOS sans PWA', () => {
      mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1');
      mockIndexedDB(false);
      mockServiceWorker(false);
      mockNotifications(false);
      mockWebSQL(true);

      const recommendations = safariCompatibility.getOptimizationRecommendations();

      expect(recommendations).toContain('Utiliser le mode web app avec Add to Home Screen');
      expect(recommendations).toContain('Utiliser localStorage pour le cache offline');
      expect(recommendations).toContain('Utiliser WebSQL ou localStorage comme fallback');
      expect(recommendations).toContain('Utiliser des alertes visuelles à la place des notifications');
      expect(recommendations).toContain('Optimiser pour les écrans iPhone avec safe area');
    });

    it('classes CSS correctes pour iPhone', () => {
      mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1');
      mockIndexedDB(false);
      mockServiceWorker(false);
      mockNotifications(false);
      mockWebSQL(true);

      const classes = safariCompatibility.getCSSClasses();

      expect(classes).toContain('safari');
      expect(classes).toContain('ios');
      expect(classes).toContain('iphone');
      expect(classes).toContain('no-pwa');
      expect(classes).toContain('no-sw');
      expect(classes).toContain('no-indexeddb');
      expect(classes).toContain('no-notifications');
    });

    it('classes CSS correctes pour iPad', () => {
      mockUserAgent('Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1');
      mockIndexedDB(true);
      mockServiceWorker(false);
      mockNotifications(false);
      mockWebSQL(true);

      const classes = safariCompatibility.getCSSClasses();

      expect(classes).toContain('safari');
      expect(classes).toContain('ios');
      expect(classes).toContain('ipad');
      expect(classes).not.toContain('iphone');
    });
  });

  describe('Vérification des fonctionnalités', () => {
    it('vérifie le support PWA', () => {
      mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1');
      mockIndexedDB(true);
      mockServiceWorker(true);
      mockNotifications(true);
      mockWebSQL(false);

      expect(safariCompatibility.isFeatureSupported('supportsPWA')).toBe(true);
      expect(safariCompatibility.isFeatureSupported('supportsServiceWorker')).toBe(true);
      expect(safariCompatibility.isFeatureSupported('supportsIndexedDB')).toBe(true);
    });

    it('vérifie le non-support PWA sur ancien iOS', () => {
      mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15E148 Safari/604.1');
      mockIndexedDB(false);
      mockServiceWorker(false);
      mockNotifications(false);
      mockWebSQL(true);

      expect(safariCompatibility.isFeatureSupported('supportsPWA')).toBe(false);
      expect(safariCompatibility.isFeatureSupported('supportsServiceWorker')).toBe(false);
      expect(safariCompatibility.isFeatureSupported('supportsIndexedDB')).toBe(false);
    });
  });
});

describe('Safari Storage Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialisation', () => {
    it('s\'initialise correctement avec IndexedDB', async () => {
      mockIndexedDB(true);
      mockWebSQL(true);

      await safariStorageService.initialize();

      const options = safariStorageService.getOptions();
      expect(options.useIndexedDB).toBe(true);
      expect(options.useLocalStorage).toBe(true);
      expect(options.useWebSQL).toBe(true);
    });

    it('s\'initialise avec fallbacks si IndexedDB indisponible', async () => {
      mockIndexedDB(false);
      mockWebSQL(true);

      await safariStorageService.initialize();

      const options = safariStorageService.getOptions();
      expect(options.useIndexedDB).toBe(false);
      expect(options.useLocalStorage).toBe(true);
      expect(options.useWebSQL).toBe(true);
    });
  });

  describe('Sauvegarde et chargement', () => {
    it('sauvegarde et charge des données avec IndexedDB', async () => {
      mockIndexedDB(true);
      mockWebSQL(false);

      const testData = { test: 'data', number: 123 };
      const success = await safariStorageService.save('test-key', testData);
      expect(success).toBe(true);

      const loadedData = await safariStorageService.load('test-key');
      expect(loadedData).toEqual(testData);
    });

    it('utilise localStorage comme fallback', async () => {
      mockIndexedDB(false);
      mockWebSQL(false);

      const testData = { test: 'data', number: 123 };
      const success = await safariStorageService.save('test-key', testData);
      expect(success).toBe(true);

      const loadedData = await safariStorageService.load('test-key');
      expect(loadedData).toEqual(testData);
    });

    it('utilise WebSQL comme fallback', async () => {
      mockIndexedDB(false);
      mockWebSQL(true);

      const testData = { test: 'data', number: 123 };
      const success = await safariStorageService.save('test-key', testData);
      expect(success).toBe(true);

      const loadedData = await safariStorageService.load('test-key');
      expect(loadedData).toEqual(testData);
    });

    it('utilise la mémoire comme dernier recours', async () => {
      mockIndexedDB(false);
      mockWebSQL(false);

      const testData = { test: 'data', number: 123 };
      const success = await safariStorageService.save('test-key', testData);
      expect(success).toBe(true);

      const loadedData = await safariStorageService.load('test-key');
      expect(loadedData).toEqual(testData);
    });
  });

  describe('Suppression', () => {
    it('supprime des données de tous les stockages', async () => {
      mockIndexedDB(true);
      mockWebSQL(true);

      const testData = { test: 'data' };
      await safariStorageService.save('test-key', testData);
      
      const success = await safariStorageService.remove('test-key');
      expect(success).toBe(true);

      const loadedData = await safariStorageService.load('test-key');
      expect(loadedData).toBeNull();
    });
  });

  describe('Statistiques', () => {
    it('calcule les statistiques de stockage', async () => {
      mockIndexedDB(true);
      mockWebSQL(false);

      await safariStorageService.save('key1', { data: 'test1' });
      await safariStorageService.save('key2', { data: 'test2' });

      const stats = await safariStorageService.getStats();
      expect(stats.itemCount).toBeGreaterThan(0);
      expect(stats.usedSize).toBeGreaterThan(0);
    });
  });

  describe('Nettoyage', () => {
    it('nettoie tous les stockages', async () => {
      mockIndexedDB(true);
      mockWebSQL(true);

      await safariStorageService.save('key1', { data: 'test1' });
      await safariStorageService.save('key2', { data: 'test2' });

      const success = await safariStorageService.cleanup();
      expect(success).toBe(true);

      const stats = await safariStorageService.getStats();
      expect(stats.itemCount).toBe(0);
    });
  });
});

describe('Intégration Safari/iOS', () => {
  it('simule un workflow complet iPhone Safari', async () => {
    // Simuler iPhone Safari
    mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1');
    mockIndexedDB(false);
    mockServiceWorker(false);
    mockNotifications(false);
    mockWebSQL(true);
    mockLocalStorage();

    // Détecter les capacités
    const capabilities = safariCompatibility.detectCapabilities();
    expect(capabilities.isIPhone).toBe(true);
    expect(capabilities.supportsAddToHomeScreen).toBe(true);

    // Initialiser le stockage
    await safariStorageService.initialize();
    const options = safariStorageService.getOptions();
    expect(options.useWebSQL).toBe(true);
    expect(options.useLocalStorage).toBe(true);

    // Tester la sauvegarde/chargement
    const testData = { 
      user: { name: 'Test User' },
      transactions: [{ id: 1, amount: 1000 }]
    };
    
    const saveSuccess = await safariStorageService.save('user-data', testData);
    expect(saveSuccess).toBe(true);

    const loadedData = await safariStorageService.load('user-data');
    expect(loadedData).toEqual(testData);

    // Vérifier les recommandations
    const recommendations = safariCompatibility.getOptimizationRecommendations();
    expect(recommendations.length).toBeGreaterThan(0);
  });

  it('simule un workflow complet iPad Safari', async () => {
    // Simuler iPad Safari
    mockUserAgent('Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1');
    mockIndexedDB(true);
    mockServiceWorker(false);
    mockNotifications(false);
    mockWebSQL(true);
    mockLocalStorage();

    // Détecter les capacités
    const capabilities = safariCompatibility.detectCapabilities();
    expect(capabilities.isIPad).toBe(true);
    expect(capabilities.supportsIndexedDB).toBe(true);

    // Initialiser le stockage
    await safariStorageService.initialize();
    const options = safariStorageService.getOptions();
    expect(options.useIndexedDB).toBe(true);

    // Tester les classes CSS
    const classes = safariCompatibility.getCSSClasses();
    expect(classes).toContain('ipad');
    expect(classes).not.toContain('iphone');
  });
});















