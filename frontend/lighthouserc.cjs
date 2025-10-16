module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000'],
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
        // Performance - Target 70+ (plus réaliste pour le développement)
        'categories:performance': ['warn', { minScore: 0.70 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 3000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 4000 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.25 }],
        'total-blocking-time': ['warn', { maxNumericValue: 600 }],
        'speed-index': ['warn', { maxNumericValue: 4000 }],
        'interactive': ['warn', { maxNumericValue: 6000 }],
        
        // Accessibility - Target 80+ (améliorable)
        'categories:accessibility': ['warn', { minScore: 0.80 }],
        'color-contrast': 'warn',
        'image-alt': 'warn',
        'label': 'warn',
        'link-name': 'warn',
        'button-name': 'warn',
        
        // Best Practices - Target 80+
        'categories:best-practices': ['warn', { minScore: 0.80 }],
        
        // SEO - Target 70+
        'categories:seo': ['warn', { minScore: 0.70 }],
        'viewport': 'warn',
        
        // PWA - Target 70+
        'categories:pwa': ['warn', { minScore: 0.70 }],
        
        // Bundle Size - Max 10MB (plus réaliste pour le développement)
        'total-byte-weight': ['warn', { maxNumericValue: 10 * 1024 * 1024 }],
        'unused-css-rules': ['warn', { maxNumericValue: 100000 }],
        'unused-javascript': ['warn', { maxNumericValue: 200000 }],
        'uses-text-compression': 'warn',
        'uses-long-cache-ttl': 'warn'
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
}
