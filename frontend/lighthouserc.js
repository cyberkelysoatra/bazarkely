module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:5173'],
      startServerCommand: 'npm run dev',
      startServerReadyPattern: 'ready in',
      startServerReadyTimeout: 30000,
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --disable-dev-shm-usage --disable-gpu --headless',
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4
        }
      }
    },
    assert: {
      assertions: {
        // Performance - Target 95+
        'categories:performance': ['error', { minScore: 0.95 }],
        'first-contentful-paint': ['error', { maxNumericValue: 1800 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        'speed-index': ['error', { maxNumericValue: 2500 }],
        'interactive': ['error', { maxNumericValue: 3800 }],
        
        // Accessibility - Target 95+
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'color-contrast': 'error',
        'image-alt': 'error',
        'label': 'error',
        'link-name': 'error',
        'button-name': 'error',
        
        // Best Practices - Target 95+
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'uses-https': 'error',
        'service-worker': 'error',
        'works-offline': 'error',
        
        // SEO - Target 90+
        'categories:seo': ['error', { minScore: 0.90 }],
        'viewport': 'error',
        
        // PWA - Target 95+
        'categories:pwa': ['error', { minScore: 0.95 }],
        
        // Bundle Size - Max 1MB
        'total-byte-weight': ['error', { maxNumericValue: 1024 * 1024 }],
        'unused-css-rules': ['warn', { maxNumericValue: 50000 }],
        'unused-javascript': ['warn', { maxNumericValue: 100000 }],
        'uses-text-compression': 'error',
        'uses-long-cache-ttl': 'warn'
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
}
