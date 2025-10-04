import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AppState, AppError } from '../types';
import authService from '../services/authService';

interface AppStore extends AppState {
  // Actions
  setUser: (user: User | null) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setOnline: (isOnline: boolean) => void;
  setLastSync: (lastSync: Date | null) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLanguage: (language: 'fr' | 'mg') => void;
  reset: () => void;
  logout: () => Promise<void>;
}

const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  isOnline: navigator.onLine,
  lastSync: null,
  theme: 'system',
  language: 'fr'
};

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      ...initialState,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      
      setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
      
      setOnline: (isOnline) => set({ isOnline }),
      
      setLastSync: (lastSync) => set({ lastSync }),
      
      setTheme: (theme) => set({ theme }),
      
      setLanguage: (language) => set({ language }),
      
      reset: () => set(initialState),
      
      logout: async () => {
        try {
          console.log('🚪 Déconnexion via le store...');
          await authService.logout();
          set(initialState);
          console.log('✅ Déconnexion via le store réussie');
        } catch (error) {
          console.error('❌ Erreur lors de la déconnexion via le store:', error);
          // Même en cas d'erreur, on reset l'état
          set(initialState);
        }
      }
    }),
    {
      name: 'bazarkely-app-store',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        theme: state.theme,
        language: state.language,
        lastSync: state.lastSync
      })
    }
  )
);

// Store pour les erreurs globales
interface ErrorStore {
  error: AppError | null;
  setError: (error: AppError | null) => void;
  clearError: () => void;
}

export const useErrorStore = create<ErrorStore>((set) => ({
  error: null,
  setError: (error) => set({ error }),
  clearError: () => set({ error: null })
}));

// Store pour l'état de synchronisation
interface SyncStore {
  isOnline: boolean;
  lastSync: Date | null;
  pendingOperations: number;
  isSyncing: boolean;
  setOnline: (isOnline: boolean) => void;
  setLastSync: (lastSync: Date | null) => void;
  setPendingOperations: (count: number) => void;
  setIsSyncing: (isSyncing: boolean) => void;
  incrementPendingOperations: () => void;
  decrementPendingOperations: () => void;
}

export const useSyncStore = create<SyncStore>((set) => ({
  isOnline: navigator.onLine,
  lastSync: null,
  pendingOperations: 0,
  isSyncing: false,

  setOnline: (isOnline) => set({ isOnline }),
  
  setLastSync: (lastSync) => set({ lastSync }),
  
  setPendingOperations: (count) => set({ pendingOperations: count }),
  
  setIsSyncing: (isSyncing) => set({ isSyncing }),
  
  incrementPendingOperations: () => set((state) => ({ 
    pendingOperations: state.pendingOperations + 1 
  })),
  
  decrementPendingOperations: () => set((state) => ({ 
    pendingOperations: Math.max(0, state.pendingOperations - 1) 
  }))
}));

// Store pour les préférences utilisateur
interface PreferencesStore {
  theme: 'light' | 'dark' | 'system';
  language: 'fr' | 'mg';
  currency: 'MGA';
  notifications: {
    budgetAlerts: boolean;
    goalReminders: boolean;
    syncStatus: boolean;
  };
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLanguage: (language: 'fr' | 'mg') => void;
  setCurrency: (currency: 'MGA') => void;
  setNotification: (key: keyof PreferencesStore['notifications'], value: boolean) => void;
  updateNotifications: (notifications: Partial<PreferencesStore['notifications']>) => void;
}

export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      theme: 'system',
      language: 'fr',
      currency: 'MGA',
      notifications: {
        budgetAlerts: true,
        goalReminders: true,
        syncStatus: true
      },

      setTheme: (theme) => set({ theme }),
      
      setLanguage: (language) => set({ language }),
      
      setCurrency: (currency) => set({ currency }),
      
      setNotification: (key, value) => set((state) => ({
        notifications: {
          ...state.notifications,
          [key]: value
        }
      })),
      
      updateNotifications: (notifications) => set((state) => ({
        notifications: {
          ...state.notifications,
          ...notifications
        }
      }))
    }),
    {
      name: 'bazarkely-preferences-store'
    }
  )
);

// Store pour l'état de chargement
interface LoadingStore {
  isLoading: boolean;
  loadingMessage: string | null;
  setLoading: (isLoading: boolean, message?: string) => void;
  clearLoading: () => void;
}

export const useLoadingStore = create<LoadingStore>((set) => ({
  isLoading: false,
  loadingMessage: null,

  setLoading: (isLoading, message) => set({ 
    isLoading, 
    loadingMessage: message || null 
  }),
  
  clearLoading: () => set({ 
    isLoading: false, 
    loadingMessage: null 
  })
}));

// Store pour les données en cache
interface CacheStore {
  cache: Map<string, { data: any; timestamp: number; ttl: number }>;
  set: (key: string, data: any, ttl?: number) => void;
  get: (key: string) => any | null;
  has: (key: string) => boolean;
  delete: (key: string) => void;
  clear: () => void;
  cleanup: () => void;
}

export const useCacheStore = create<CacheStore>((set, get) => ({
  cache: new Map(),

  set: (key, data, ttl = 300000) => { // 5 minutes par défaut
    const state = get();
    state.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    set({ cache: new Map(state.cache) });
  },

  get: (key) => {
    const state = get();
    const item = state.cache.get(key);
    
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      state.cache.delete(key);
      set({ cache: new Map(state.cache) });
      return null;
    }
    
    return item.data;
  },

  has: (key) => {
    const state = get();
    const item = state.cache.get(key);
    
    if (!item) return false;
    
    if (Date.now() - item.timestamp > item.ttl) {
      state.cache.delete(key);
      set({ cache: new Map(state.cache) });
      return false;
    }
    
    return true;
  },

  delete: (key) => {
    const state = get();
    state.cache.delete(key);
    set({ cache: new Map(state.cache) });
  },

  clear: () => set({ cache: new Map() }),

  cleanup: () => {
    const state = get();
    const now = Date.now();
    
    for (const [key, item] of state.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        state.cache.delete(key);
      }
    }
    
    set({ cache: new Map(state.cache) });
  }
}));
