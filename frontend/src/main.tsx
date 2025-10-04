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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)