import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';

test.describe('Synchronization Tests', () => {
  let browser: Browser;
  let context1: BrowserContext;
  let context2: BrowserContext;
  let page1: Page;
  let page2: Page;

  test.beforeAll(async ({ browser: testBrowser }) => {
    browser = testBrowser;
  });

  test.beforeEach(async () => {
    // Create two browser contexts to simulate two devices
    context1 = await browser.newContext();
    context2 = await browser.newContext();
    
    page1 = await context1.newPage();
    page2 = await context2.newPage();
    
    // Navigate both pages to the application
    await page1.goto('https://1sakely.org');
    await page2.goto('https://1sakely.org');
    
    // Try to login both pages if test credentials are available
    const testEmail = process.env.TEST_USER_EMAIL;
    const testPassword = process.env.TEST_USER_PASSWORD;
    
    if (testEmail && testPassword) {
      try {
        // Login page 1
        await page1.fill('input[type="email"]', testEmail);
        await page1.fill('input[type="password"]', testPassword);
        await page1.click('button[type="submit"]');
        await page1.waitForTimeout(3000);
        
        // Login page 2
        await page2.fill('input[type="email"]', testEmail);
        await page2.fill('input[type="password"]', testPassword);
        await page2.click('button[type="submit"]');
        await page2.waitForTimeout(3000);
        
        console.log('Both pages logged in successfully');
      } catch (e) {
        console.log('Login failed for one or both pages, continuing with public access');
      }
    }
  });

  test.afterEach(async () => {
    await context1.close();
    await context2.close();
  });

  test('should test cross-tab synchronization', async () => {
    // Navigate both pages to dashboard
    await page1.goto('https://1sakely.org/dashboard');
    await page2.goto('https://1sakely.org/dashboard');
    
    await page1.waitForLoadState('networkidle');
    await page2.waitForLoadState('networkidle');
    
    console.log('Both pages loaded on dashboard');
    
    // Take initial screenshots
    await page1.screenshot({ path: 'tests/reports/sync-page1-initial.png' });
    await page2.screenshot({ path: 'tests/reports/sync-page2-initial.png' });
    
    // Check if both pages show the same data initially
    const page1Data = await page1.evaluate(() => {
      return {
        url: window.location.href,
        localStorage: Object.keys(localStorage),
        hasData: document.querySelector('[data-testid="dashboard"]') !== null
      };
    });
    
    const page2Data = await page2.evaluate(() => {
      return {
        url: window.location.href,
        localStorage: Object.keys(localStorage),
        hasData: document.querySelector('[data-testid="dashboard"]') !== null
      };
    });
    
    console.log('Page 1 data:', page1Data);
    console.log('Page 2 data:', page2Data);
  });

  test('should test offline functionality', async () => {
    // Navigate to transactions page
    await page1.goto('https://1sakely.org/transactions');
    await page1.waitForLoadState('networkidle');
    
    // Simulate offline mode
    await page1.context().setOffline(true);
    console.log('Page 1 set to offline mode');
    
    // Try to add a transaction while offline
    try {
      await page1.click('text=Ajouter une transaction');
      await page1.waitForTimeout(1000);
      
      // Check if form is accessible offline
      const formVisible = await page1.locator('input[name="amount"]').isVisible().catch(() => false);
      if (formVisible) {
        console.log('Transaction form accessible offline');
        
        // Fill form with test data
        await page1.fill('input[name="amount"]', '50000');
        await page1.fill('input[name="description"]', 'Test offline transaction');
        
        // Try to submit
        await page1.click('button[type="submit"]');
        await page1.waitForTimeout(1000);
        
        console.log('Offline transaction form submitted');
      }
    } catch (e) {
      console.log('Offline transaction test failed:', e);
    }
    
    // Check IndexedDB for queued operations
    const indexedDBData = await page1.evaluate(async () => {
      try {
        const databases = await indexedDB.databases();
        return databases.map(db => ({
          name: db.name,
          version: db.version
        }));
      } catch (e) {
        return [];
      }
    });
    
    console.log('IndexedDB databases in offline mode:', indexedDBData);
    
    // Check localStorage for queued data
    const localStorageData = await page1.evaluate(() => {
      const keys = Object.keys(localStorage);
      return keys.filter(key => 
        key.includes('queue') || 
        key.includes('offline') || 
        key.includes('sync')
      );
    });
    
    console.log('Offline queue data in localStorage:', localStorageData);
    
    // Reconnect to online
    await page1.context().setOffline(false);
    console.log('Page 1 reconnected to online');
    
    // Wait for potential sync
    await page1.waitForTimeout(2000);
    
    // Check if data synced
    const syncStatus = await page1.evaluate(() => {
      return {
        localStorage: Object.keys(localStorage),
        hasNetwork: navigator.onLine
      };
    });
    
    console.log('Sync status after reconnection:', syncStatus);
  });

  test('should test real-time synchronization', async () => {
    // Navigate both pages to the same section
    await page1.goto('https://1sakely.org/transactions');
    await page2.goto('https://1sakely.org/transactions');
    
    await page1.waitForLoadState('networkidle');
    await page2.waitForLoadState('networkidle');
    
    // Monitor network requests on both pages
    const page1Requests: string[] = [];
    const page2Requests: string[] = [];
    
    page1.on('request', request => {
      if (request.url().includes('supabase') || request.url().includes('1sakely.org/api')) {
        page1Requests.push(request.url());
      }
    });
    
    page2.on('request', request => {
      if (request.url().includes('supabase') || request.url().includes('1sakely.org/api')) {
        page2Requests.push(request.url());
      }
    });
    
    // Wait for potential real-time updates
    await page1.waitForTimeout(3000);
    await page2.waitForTimeout(3000);
    
    console.log('Page 1 API requests:', page1Requests);
    console.log('Page 2 API requests:', page2Requests);
    
    // Check for real-time subscription indicators
    const realtimeIndicators = await page1.evaluate(() => {
      return {
        hasWebSocket: typeof WebSocket !== 'undefined',
        hasEventSource: typeof EventSource !== 'undefined',
        hasSupabase: typeof (window as any).supabase !== 'undefined'
      };
    });
    
    console.log('Real-time indicators:', realtimeIndicators);
  });

  test('should test data consistency between tabs', async () => {
    // Navigate both pages to dashboard
    await page1.goto('https://1sakely.org/dashboard');
    await page2.goto('https://1sakely.org/dashboard');
    
    await page1.waitForLoadState('networkidle');
    await page2.waitForLoadState('networkidle');
    
    // Get data from both pages
    const page1Data = await page1.evaluate(() => {
      const elements = document.querySelectorAll('[data-testid="stat-card"], .card, .stat-item');
      return Array.from(elements).map(el => el.textContent);
    });
    
    const page2Data = await page2.evaluate(() => {
      const elements = document.querySelectorAll('[data-testid="stat-card"], .card, .stat-item');
      return Array.from(elements).map(el => el.textContent);
    });
    
    console.log('Page 1 dashboard data:', page1Data);
    console.log('Page 2 dashboard data:', page2Data);
    
    // Check if data is consistent
    const dataConsistent = JSON.stringify(page1Data) === JSON.stringify(page2Data);
    console.log('Data consistency between tabs:', dataConsistent);
    
    // Take screenshots for comparison
    await page1.screenshot({ path: 'tests/reports/sync-consistency-page1.png' });
    await page2.screenshot({ path: 'tests/reports/sync-consistency-page2.png' });
  });

  test('should test Supabase real-time subscriptions', async () => {
    // Navigate to a page that might have real-time features
    await page1.goto('https://1sakely.org/transactions');
    await page1.waitForLoadState('networkidle');
    
    // Check for Supabase real-time configuration
    const supabaseConfig = await page1.evaluate(() => {
      return {
        hasSupabase: typeof (window as any).supabase !== 'undefined',
        supabaseUrl: typeof (window as any).VITE_SUPABASE_URL !== 'undefined',
        supabaseKey: typeof (window as any).VITE_SUPABASE_ANON_KEY !== 'undefined'
      };
    });
    
    console.log('Supabase configuration:', supabaseConfig);
    
    // Monitor for real-time events
    const realtimeEvents: string[] = [];
    page1.on('console', msg => {
      if (msg.text().includes('realtime') || msg.text().includes('subscription')) {
        realtimeEvents.push(msg.text());
      }
    });
    
    // Wait for potential real-time events
    await page1.waitForTimeout(5000);
    
    console.log('Real-time events detected:', realtimeEvents);
  });

  test('should test localStorage synchronization', async () => {
    // Set some data in page 1 localStorage
    await page1.evaluate(() => {
      localStorage.setItem('test-sync-data', JSON.stringify({
        timestamp: Date.now(),
        testValue: 'sync-test-value'
      }));
    });
    
    // Check if data is accessible in page 2 (should not be due to context isolation)
    const page2Data = await page2.evaluate(() => {
      return localStorage.getItem('test-sync-data');
    });
    
    console.log('Cross-context localStorage access:', page2Data);
    
    // Check IndexedDB for sync mechanisms
    const indexedDBSync = await page1.evaluate(async () => {
      try {
        const databases = await indexedDB.databases();
        return databases.filter(db => 
          db.name.includes('sync') || 
          db.name.includes('bazarkely') ||
          db.name.includes('dexie')
        );
      } catch (e) {
        return [];
      }
    });
    
    console.log('IndexedDB sync databases:', indexedDBSync);
  });

  test('should test network connectivity detection', async () => {
    // Test online/offline detection
    const connectivityTest = await page1.evaluate(() => {
      return {
        isOnline: navigator.onLine,
        hasNetworkInfo: 'connection' in navigator,
        userAgent: navigator.userAgent
      };
    });
    
    console.log('Connectivity test:', connectivityTest);
    
    // Test offline/online events
    let offlineEventFired = false;
    let onlineEventFired = false;
    
    page1.on('console', msg => {
      if (msg.text().includes('offline')) offlineEventFired = true;
      if (msg.text().includes('online')) onlineEventFired = true;
    });
    
    // Simulate offline
    await page1.context().setOffline(true);
    await page1.waitForTimeout(1000);
    
    // Simulate online
    await page1.context().setOffline(false);
    await page1.waitForTimeout(1000);
    
    console.log('Offline event fired:', offlineEventFired);
    console.log('Online event fired:', onlineEventFired);
  });
});
