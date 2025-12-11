import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
// Build test - force new hash generation
import { useAppStore, useSyncStore, useErrorStore } from './stores/appStore';
import feeService from './services/feeService';
import apiService from './services/apiService';
import dialogService from './services/dialogService';
// import ApiDebugPanel from './components/ApiDebugPanel'; // Removed - no longer needed with Supabase
// TEMPORARY FIX: Comment out problematic imports to prevent blocking errors
// import safariCompatibility from './services/safariCompatibility';
// import safariServiceWorkerManager from './services/safariServiceWorkerManager';
import './index.css';

// TEMPORARY: Mock services to prevent blocking
// const safariCompatibility = {
//   applyOptimizations: () => {
//     console.log('🍎 Safari optimizations temporarily disabled in App.tsx')
//   },
//   isSafariOrIOS: () => false,
//   isIOSStandalone: () => false,
//   detectSafariVersion: () => 'unknown',
//   applySafariSpecificFixes: () => {
//     console.log('🔧 Safari-specific fixes temporarily disabled in App.tsx')
//   }
// }

const safariServiceWorkerManager = {
  initialize: () => {
    return Promise.resolve()
  },
  registerServiceWorker: () => {
    return Promise.resolve()
  }
}

// Composants de base (à créer)
import AppLayout from './components/Layout/AppLayout';
import ErrorBoundary from './components/ErrorBoundary';
import IOSInstallPrompt from './components/iOSInstallPrompt';
import UpdatePrompt from './components/UpdatePrompt';
import { ModuleSwitcherProvider } from './contexts/ModuleSwitcherContext';
// Construction POC Context - Mounted globally so Header can access ConstructionContext
import { ConstructionProvider } from './modules/construction-poc/context/ConstructionContext';

// Configuration React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

function App() {
  const { setUser, setAuthenticated } = useAppStore();
  const { setOnline } = useSyncStore();
  const { error, clearError } = useErrorStore();
  // const [isDebugPanelOpen, setIsDebugPanelOpen] = useState(false); // Removed - no longer needed with Supabase
  


  // Gestion de l'état en ligne/hors ligne
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline]);

  // Initialisation de l'application
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialiser le service de dialogues modernes
        dialogService.initialize();
        
        // Initialiser les services de base
        await feeService.initializeDefaultFees();
        
        // Initialiser le Service Worker adaptatif
        await safariServiceWorkerManager.initialize();
        
        // Vérifier si l'utilisateur est connecté
        const storedUser = localStorage.getItem('bazarkely-user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          
          setUser(userData);
          setAuthenticated(true);
          
          // Note: Username is now handled by Supabase Auth directly
          
          // Tester la connexion API
          const isConnected = await apiService.testConnection();
          if (!isConnected) {
            console.warn('⚠️ Connexion API non disponible, mode hors ligne');
          }
          
        }
        
        
      } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
      }
    };

    initializeApp();
  }, [setUser, setAuthenticated]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        
        <Router>
          <ModuleSwitcherProvider>
            {/* ConstructionProvider mounted globally so Header (inside AppLayout) can access ConstructionContext */}
            <ConstructionProvider>
              <div className="min-h-screen bg-gray-50">
                <AppLayout />
                <IOSInstallPrompt />
                <UpdatePrompt />
            
            {/* Toast Notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 4000,
                  style: {
                    background: '#10B981',
                    color: '#fff',
                  },
                  iconTheme: {
                    primary: '#fff',
                    secondary: '#10B981',
                  },
                },
                error: {
                  duration: 5000,
                  style: {
                    background: '#EF4444',
                    color: '#fff',
                  },
                  iconTheme: {
                    primary: '#fff',
                    secondary: '#EF4444',
                  },
                },
              }}
            />
            
            {/* Bouton de débogage API - Removed - no longer needed with Supabase */}
            {/* <button
              onClick={() => setIsDebugPanelOpen(true)}
              className="fixed bottom-4 right-4 bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600 transition-colors z-40"
              title="Configuration API"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            
            <ApiDebugPanel
              isOpen={isDebugPanelOpen}
              onClose={() => setIsDebugPanelOpen(false)}
            /> */}
            
            {error && (
              <div className="fixed top-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50">
                <div className="flex justify-between items-center">
                  <span>{String(error)}</span>
                  <button
                    onClick={clearError}
                    className="ml-4 text-white hover:text-gray-200"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
              </div>
            </ConstructionProvider>
          </ModuleSwitcherProvider>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;