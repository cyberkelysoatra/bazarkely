import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import './styles/ios-optimizations.css'
import App from './App.tsx'

// TEMPORARY FIX: Comment out problematic imports to prevent blocking errors
// import optimizationManager from './services/optimizationManager'
// import safariCompatibility from './services/safariCompatibility'

// TEMPORARY: Mock services to prevent blocking
const optimizationManager = {
  initialize: () => {
    console.log('🔧 Optimization manager temporarily disabled')
    return Promise.resolve()
  },
  enablePerformanceMonitoring: () => {
    console.log('📊 Performance monitoring temporarily disabled')
  },
  optimizeImages: () => {
    console.log('🖼️ Image optimization temporarily disabled')
  }
}

const safariCompatibility = {
  applyOptimizations: () => {
    console.log('🍎 Safari optimizations temporarily disabled')
  },
  isSafariOrIOS: () => false,
  isIOSStandalone: () => false,
  detectSafariVersion: () => 'unknown',
  applySafariSpecificFixes: () => {
    console.log('🔧 Safari-specific fixes temporarily disabled')
  }
}

// Initialize services (mocked temporarily)
console.log('🚀 Initializing BazarKELY with temporary service mocks...')
optimizationManager.initialize().catch(console.error)
safariCompatibility.applyOptimizations()

// CRITICAL: Capture OAuth tokens IMMEDIATELY before React renders
// This prevents Service Worker or React Router from clearing the hash
const captureOAuthTokens = () => {
  const hash = window.location.hash;
  console.log('🔍 OAuth Pre-Capture - Hash:', hash);
  
  if (hash && hash.includes('access_token')) {
    console.log('✅ OAuth tokens detected, saving to sessionStorage...');
    
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
        
        console.log('✅ OAuth tokens saved to sessionStorage');
        
        // Clear hash immediately to prevent re-processing
        window.history.replaceState({}, document.title, window.location.pathname);
        console.log('🧹 Hash cleared after token capture');
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
  console.log('🔍 PWA Pre-Capture - Checking for beforeinstallprompt event...');
  
  // Clear any existing saved prompt to avoid stale data
  sessionStorage.removeItem('bazarkely-pwa-prompt');
  console.log('🧹 Cleared any existing PWA prompt data');
  
  const handleBeforeInstallPrompt = (e: Event) => {
    console.log('🎉 PWA Pre-Capture - beforeinstallprompt event fired!');
    
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
      
      console.log('✅ PWA prompt data saved to sessionStorage:', promptData);
      
      // Remove event listener after capture
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      console.log('🧹 PWA event listener removed after capture');
      
    } catch (error) {
      console.error('❌ Error capturing PWA prompt:', error);
    }
  };
  
  // Listen for beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  console.log('👂 PWA event listener attached, waiting for beforeinstallprompt...');
};

// Capture PWA prompt BEFORE React renders
capturePWAPrompt();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)