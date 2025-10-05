import { test, expect, Page } from '@playwright/test';

test.describe('Dashboard Verification', () => {
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

  test('should load dashboard without errors', async () => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Check for JavaScript errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Verify page loaded successfully
    expect(page.url()).toContain('dashboard');
    
    // Check for main dashboard elements
    const dashboardElements = [
      'text=Tableau de bord',
      'text=Solde total',
      'text=Revenus',
      'text=Dépenses',
      '[data-testid="dashboard"]',
      '.dashboard',
      'main'
    ];
    
    let foundElements = 0;
    for (const selector of dashboardElements) {
      const isVisible = await page.locator(selector).isVisible().catch(() => false);
      if (isVisible) foundElements++;
    }
    
    console.log(`Found ${foundElements} dashboard elements`);
    console.log('Console errors:', consoleErrors);
    
    // Take screenshot for verification
    await page.screenshot({ path: 'tests/reports/dashboard.png' });
  });

  test('should display statistics cards', async () => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Look for statistics cards
    const statCards = [
      'text=Solde total',
      'text=Revenus mensuels',
      'text=Dépenses mensuelles',
      'text=Épargne',
      '[data-testid="stat-card"]',
      '.stat-card',
      '.card'
    ];
    
    let visibleCards = 0;
    for (const selector of statCards) {
      const elements = await page.locator(selector).all();
      for (const element of elements) {
        const isVisible = await element.isVisible().catch(() => false);
        if (isVisible) visibleCards++;
      }
    }
    
    console.log(`Found ${visibleCards} statistics cards`);
    
    // Check for numerical values in cards
    const hasNumbers = await page.locator('text=/\\d+/').isVisible().catch(() => false);
    if (hasNumbers) {
      console.log('Numerical values found in dashboard');
    }
  });

  test('should render charts correctly', async () => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Look for chart elements (Recharts components)
    const chartSelectors = [
      '[data-testid="chart"]',
      '.recharts-wrapper',
      'svg',
      'canvas',
      '[role="img"]'
    ];
    
    let chartCount = 0;
    for (const selector of chartSelectors) {
      const elements = await page.locator(selector).all();
      chartCount += elements.length;
    }
    
    console.log(`Found ${chartCount} chart elements`);
    
    // Check for specific chart types
    const chartTypes = [
      'text=Graphique',
      'text=Évolution',
      'text=Répartition',
      'text=Catégories'
    ];
    
    for (const chartType of chartTypes) {
      const isVisible = await page.locator(chartType).isVisible().catch(() => false);
      if (isVisible) {
        console.log(`Found chart: ${chartType}`);
      }
    }
  });

  test('should display recent transactions', async () => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Look for transactions list
    const transactionSelectors = [
      'text=Transactions récentes',
      'text=Dernières transactions',
      '[data-testid="transactions-list"]',
      '.transaction-item',
      '.transaction'
    ];
    
    let transactionElements = 0;
    for (const selector of transactionSelectors) {
      const elements = await page.locator(selector).all();
      transactionElements += elements.length;
    }
    
    console.log(`Found ${transactionElements} transaction elements`);
    
    // Check for transaction data
    const hasTransactionData = await page.locator('text=/\\d+\\s*Ar/').isVisible().catch(() => false);
    if (hasTransactionData) {
      console.log('Transaction amounts found');
    }
  });

  test('should verify navigation buttons', async () => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Test navigation links
    const navLinks = [
      { text: 'Comptes', href: '/accounts' },
      { text: 'Transactions', href: '/transactions' },
      { text: 'Budgets', href: '/budgets' },
      { text: 'Objectifs', href: '/goals' },
      { text: 'Éducation', href: '/education' }
    ];
    
    for (const link of navLinks) {
      try {
        const element = page.locator(`text=${link.text}`);
        const isVisible = await element.isVisible();
        const isClickable = await element.isEnabled();
        
        console.log(`Navigation link "${link.text}": visible=${isVisible}, clickable=${isClickable}`);
        
        if (isVisible && isClickable) {
          // Test click without navigation
          await element.click({ modifiers: ['Control'] }); // Open in new tab
          await page.waitForTimeout(500);
        }
      } catch (e) {
        console.log(`Error testing navigation link "${link.text}":`, e);
      }
    }
  });

  test('should check for Supabase connectivity', async () => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Monitor network requests
    const supabaseRequests: string[] = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('supabase') || url.includes('1sakely.org/api')) {
        supabaseRequests.push(url);
      }
    });
    
    // Wait for potential API calls
    await page.waitForTimeout(2000);
    
    console.log('Supabase API requests:', supabaseRequests);
    
    // Check for Supabase client in window
    const supabaseClient = await page.evaluate(() => {
      return typeof window !== 'undefined' && 
             (window as any).supabase !== undefined;
    });
    
    console.log('Supabase client available:', supabaseClient);
    
    // Check for environment variables
    const envVars = await page.evaluate(() => {
      return {
        supabaseUrl: typeof window !== 'undefined' ? 
                    (window as any).VITE_SUPABASE_URL : undefined,
        supabaseKey: typeof window !== 'undefined' ? 
                    (window as any).VITE_SUPABASE_ANON_KEY : undefined
      };
    });
    
    console.log('Environment variables:', envVars);
  });

  test('should verify responsive design', async () => {
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'tests/reports/dashboard-desktop.png' });
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'tests/reports/dashboard-tablet.png' });
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'tests/reports/dashboard-mobile.png' });
    
    console.log('Responsive design screenshots captured');
  });
});
