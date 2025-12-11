import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import './styles/ios-optimizations.css'
import App from './App.tsx'

// Initialiser le système de chiffrement AES-256
import './services/encryptionInit'

// TEMPORARY FIX: Comment out problematic imports to prevent blocking errors
// import optimizationManager from './services/optimizationManager'
// import safariCompatibility from './services/safariCompatibility'

// TEMPORARY: Mock services to prevent blocking
const optimizationManager = {
  initialize: () => {
    return Promise.resolve()
  },
  enablePerformanceMonitoring: () => {
  },
  optimizeImages: () => {
  }
}

const safariCompatibility = {
  applyOptimizations: () => {
  },
  isSafariOrIOS: () => false,
  isIOSStandalone: () => false,
  detectSafariVersion: () => 'unknown',
  applySafariSpecificFixes: () => {
  }
}

// Initialize services (mocked temporarily)
optimizationManager.initialize().catch(console.error)
safariCompatibility.applyOptimizations()

// CRITICAL: Capture OAuth tokens IMMEDIATELY before React renders
// This prevents Service Worker or React Router from clearing the hash
const captureOAuthTokens = () => {
  const hash = window.location.hash;
  
  if (hash && hash.includes('access_token')) {
    try {
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const tokenType = hashParams.get('token_type') || 'bearer';
      const expiresIn = hashParams.get('expires_in');
      
      if (accessToken && refreshToken) {
        // Save tokens to sessionStorage for processing by AuthPage
        sessionStorage.setItem('bazarkely-oauth-tokens', JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: tokenType,
          expires_in: expiresIn,
          captured_at: Date.now()
        }));
        
        // Clear hash immediately to prevent re-processing
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (error) {
      console.error('❌ Error capturing OAuth tokens:', error);
    }
  }
};

// Capture tokens BEFORE React renders
captureOAuthTokens();

// CRITICAL: Capture PWA install prompt IMMEDIATELY before React renders
// This prevents the beforeinstallprompt event from being lost during React mount
const capturePWAPrompt = () => {
  // Clear any existing saved prompt to avoid stale data
  sessionStorage.removeItem('bazarkely-pwa-prompt');
  
  const handleBeforeInstallPrompt = (e: Event) => {
    // Prevent default behavior to control when prompt shows
    e.preventDefault();
    
    try {
      // Store essential prompt properties (event cannot be serialized directly)
      const promptData = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        timestamp: Date.now(),
        ready: true,
        captured_at: new Date().toISOString()
      };
      
      // Save to sessionStorage for usePWAInstall hook
      sessionStorage.setItem('bazarkely-pwa-prompt', JSON.stringify(promptData));
      
      // Remove event listener after capture
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      
    } catch (error) {
      console.error('❌ Error capturing PWA prompt:', error);
    }
  };
  
  // Listen for beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
};

// Capture PWA prompt BEFORE React renders
capturePWAPrompt();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)