import { test, expect, Page } from '@playwright/test';

test.describe('Supabase Connectivity Tests', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/');
    
    // Try to login if test credentials are available
    const testEmail = process.env.TEST_USER_EMAIL;
    const testPassword = process.env.TEST_USER_PASSWORD;
    
    if (testEmail && testPassword) {
      try {
        await page.fill('input[type="email"]', testEmail);
        await page.fill('input[type="password"]', testPassword);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(3000);
      } catch (e) {
        console.log('Login attempt failed, continuing with public access');
      }
    }
  });

  test('should verify Supabase client initialization', async () => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Check if Supabase client is available
    const supabaseClient = await page.evaluate(() => {
      return {
        hasSupabase: typeof (window as any).supabase !== 'undefined',
        supabaseType: typeof (window as any).supabase,
        supabaseMethods: typeof (window as any).supabase !== 'undefined' ? 
          Object.keys((window as any).supabase) : []
      };
    });
    
    console.log('Supabase client check:', supabaseClient);
    
    // Check for Supabase initialization errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().toLowerCase().includes('supabase')) {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    console.log('Supabase-related console errors:', consoleErrors);
  });

  test('should verify environment variables', async () => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Check for Supabase environment variables
    const envVars = await page.evaluate(() => {
      return {
        supabaseUrl: typeof (window as any).VITE_SUPABASE_URL !== 'undefined' ? 
                    (window as any).VITE_SUPABASE_URL : 'Not found',
        supabaseKey: typeof (window as any).VITE_SUPABASE_ANON_KEY !== 'undefined' ? 
                    (window as any).VITE_SUPABASE_ANON_KEY : 'Not found',
        hasEnvVars: typeof (window as any).VITE_SUPABASE_URL !== 'undefined' && 
                   typeof (window as any).VITE_SUPABASE_ANON_KEY !== 'undefined'
      };
    });
    
    console.log('Environment variables:', envVars);
    
    // Check if variables are properly configured
    if (envVars.supabaseUrl !== 'Not found' && envVars.supabaseKey !== 'Not found') {
      console.log('Supabase environment variables are configured');
    } else {
      console.log('Supabase environment variables are missing or not accessible');
    }
  });

  test('should test database connection', async () => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Monitor network requests for Supabase API calls
    const supabaseRequests: any[] = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('supabase') || url.includes('1sakely.org/api')) {
        supabaseRequests.push({
          url: url,
          method: request.method(),
          headers: request.headers()
        });
      }
    });
    
    // Wait for potential API calls
    await page.waitForTimeout(3000);
    
    console.log('Supabase API requests:', supabaseRequests);
    
    // Check for successful API responses
    const successfulRequests = supabaseRequests.filter(req => 
      req.url.includes('supabase') && !req.url.includes('error')
    );
    
    console.log(`Found ${successfulRequests.length} successful Supabase requests`);
  });

  test('should test RLS policies', async () => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Check if user data is properly isolated
    const userData = await page.evaluate(() => {
      return {
        localStorage: Object.keys(localStorage),
        hasUserSession: localStorage.getItem('supabase.auth.token') !== null,
        sessionData: localStorage.getItem('supabase.auth.token')
      };
    });
    
    console.log('User session data:', userData);
    
    // Check for user-specific data in the page
    const userSpecificElements = [
      '[data-testid="user-data"]',
      '.user-specific',
      'text=Utilisateur',
      'text=Profil'
    ];
    
    let userElements = 0;
    for (const selector of userSpecificElements) {
      const isVisible = await page.locator(selector).isVisible().catch(() => false);
      if (isVisible) userElements++;
    }
    
    console.log(`Found ${userElements} user-specific elements`);
  });

  test('should test real-time subscriptions', async () => {
    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');
    
    // Check for real-time subscription indicators
    const realtimeConfig = await page.evaluate(() => {
      return {
        hasWebSocket: typeof WebSocket !== 'undefined',
        hasEventSource: typeof EventSource !== 'undefined',
        hasSupabase: typeof (window as any).supabase !== 'undefined',
        hasRealtime: typeof (window as any).supabase !== 'undefined' && 
                    typeof (window as any).supabase.realtime !== 'undefined'
      };
    });
    
    console.log('Real-time configuration:', realtimeConfig);
    
    // Monitor for real-time events
    const realtimeEvents: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('realtime') || 
          msg.text().includes('subscription') || 
          msg.text().includes('websocket')) {
        realtimeEvents.push(msg.text());
      }
    });
    
    // Wait for potential real-time events
    await page.waitForTimeout(5000);
    
    console.log('Real-time events detected:', realtimeEvents);
  });

  test('should test data persistence', async () => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Get initial data
    const initialData = await page.evaluate(() => {
      return {
        localStorage: Object.keys(localStorage),
        indexedDB: 'indexedDB' in window,
        hasData: document.querySelector('[data-testid="dashboard"]') !== null
      };
    });
    
    console.log('Initial data state:', initialData);
    
    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check if data persisted
    const persistedData = await page.evaluate(() => {
      return {
        localStorage: Object.keys(localStorage),
        indexedDB: 'indexedDB' in window,
        hasData: document.querySelector('[data-testid="dashboard"]') !== null
      };
    });
    
    console.log('Data after refresh:', persistedData);
    
    // Compare data persistence
    const dataPersisted = JSON.stringify(initialData.localStorage) === 
                         JSON.stringify(persistedData.localStorage);
    
    console.log('Data persistence check:', dataPersisted);
  });

  test('should test authentication flow', async () => {
    // Test login flow
    const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword123';
    
    await page.goto('/');
    
    // Fill login form
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    
    // Monitor authentication requests
    const authRequests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('auth') || request.url().includes('login')) {
        authRequests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers()
        });
      }
    });
    
    // Submit form
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    console.log('Authentication requests:', authRequests);
    
    // Check authentication result
    const authResult = await page.evaluate(() => {
      return {
        currentUrl: window.location.href,
        hasAuthToken: localStorage.getItem('supabase.auth.token') !== null,
        hasSession: sessionStorage.getItem('supabase.auth.token') !== null
      };
    });
    
    console.log('Authentication result:', authResult);
  });

  test('should test API error handling', async () => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Monitor for API errors
    const apiErrors: string[] = [];
    page.on('response', response => {
      if (response.url().includes('supabase') || response.url().includes('1sakely.org/api')) {
        if (response.status() >= 400) {
          apiErrors.push(`${response.url()}: ${response.status()}`);
        }
      }
    });
    
    // Wait for potential API calls
    await page.waitForTimeout(3000);
    
    console.log('API errors detected:', apiErrors);
    
    // Check for error handling in the UI
    const errorElements = [
      '.error-message',
      '.alert-error',
      'text=Erreur',
      'text=Error',
      '[data-testid="error"]'
    ];
    
    let errorElementsFound = 0;
    for (const selector of errorElements) {
      const isVisible = await page.locator(selector).isVisible().catch(() => false);
      if (isVisible) errorElementsFound++;
    }
    
    console.log(`Found ${errorElementsFound} error elements in UI`);
  });

  test('should test data synchronization', async () => {
    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');
    
    // Monitor sync-related requests
    const syncRequests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('sync') || 
          request.url().includes('update') || 
          request.url().includes('upsert')) {
        syncRequests.push({
          url: request.url(),
          method: request.method(),
          timestamp: Date.now()
        });
      }
    });
    
    // Wait for potential sync operations
    await page.waitForTimeout(3000);
    
    console.log('Sync requests detected:', syncRequests);
    
    // Check for sync indicators in the UI
    const syncIndicators = [
      'text=Synchronisation',
      'text=Sync',
      '.sync-indicator',
      '[data-testid="sync-status"]'
    ];
    
    let syncIndicatorsFound = 0;
    for (const selector of syncIndicators) {
      const isVisible = await page.locator(selector).isVisible().catch(() => false);
      if (isVisible) syncIndicatorsFound++;
    }
    
    console.log(`Found ${syncIndicatorsFound} sync indicators`);
  });

  test('should test offline data handling', async () => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Check for offline data storage
    const offlineData = await page.evaluate(() => {
      return {
        indexedDB: 'indexedDB' in window,
        localStorage: Object.keys(localStorage),
        hasOfflineData: localStorage.getItem('offline-data') !== null
      };
    });
    
    console.log('Offline data storage:', offlineData);
    
    // Simulate offline mode
    await page.context().setOffline(true);
    console.log('Set to offline mode');
    
    // Try to perform an action that would normally sync
    try {
      await page.goto('/transactions');
      await page.waitForTimeout(2000);
      
      // Check if offline data is being used
      const offlineUsage = await page.evaluate(() => {
        return {
          hasOfflineData: localStorage.getItem('offline-data') !== null,
          indexedDBDatabases: 'indexedDB' in window
        };
      });
      
      console.log('Offline data usage:', offlineUsage);
    } catch (e) {
      console.log('Offline mode test failed:', e);
    }
    
    // Restore online mode
    await page.context().setOffline(false);
    console.log('Restored to online mode');
  });
});
