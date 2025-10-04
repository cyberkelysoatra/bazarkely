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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)