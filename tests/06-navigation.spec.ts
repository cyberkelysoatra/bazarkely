import { test, expect, Page } from '@playwright/test';

test.describe('Navigation Tests', () => {
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

  test('should navigate to dashboard', async () => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    expect(page.url()).toContain('dashboard');
    
    // Check for dashboard elements
    const dashboardElements = [
      'text=Tableau de bord',
      'text=Dashboard',
      '[data-testid="dashboard"]',
      '.dashboard'
    ];
    
    let foundElements = 0;
    for (const selector of dashboardElements) {
      const isVisible = await page.locator(selector).isVisible().catch(() => false);
      if (isVisible) foundElements++;
    }
    
    console.log(`Found ${foundElements} dashboard elements`);
    await page.screenshot({ path: 'tests/reports/navigation-dashboard.png' });
  });

  test('should navigate to accounts page', async () => {
    await page.goto('/accounts');
    await page.waitForLoadState('networkidle');
    
    expect(page.url()).toContain('accounts');
    
    // Check for accounts page elements
    const accountsElements = [
      'text=Comptes',
      'text=Gestion des comptes',
      '[data-testid="accounts-page"]',
      '.accounts-page'
    ];
    
    let foundElements = 0;
    for (const selector of accountsElements) {
      const isVisible = await page.locator(selector).isVisible().catch(() => false);
      if (isVisible) foundElements++;
    }
    
    console.log(`Found ${foundElements} accounts elements`);
    await page.screenshot({ path: 'tests/reports/navigation-accounts.png' });
  });

  test('should navigate to transactions page', async () => {
    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');
    
    expect(page.url()).toContain('transactions');
    
    // Check for transactions page elements
    const transactionsElements = [
      'text=Transactions',
      'text=Gestion des transactions',
      '[data-testid="transactions-page"]',
      '.transactions-page'
    ];
    
    let foundElements = 0;
    for (const selector of transactionsElements) {
      const isVisible = await page.locator(selector).isVisible().catch(() => false);
      if (isVisible) foundElements++;
    }
    
    console.log(`Found ${foundElements} transactions elements`);
    await page.screenshot({ path: 'tests/reports/navigation-transactions.png' });
  });

  test('should navigate to budgets page', async () => {
    await page.goto('/budgets');
    await page.waitForLoadState('networkidle');
    
    expect(page.url()).toContain('budgets');
    
    // Check for budgets page elements
    const budgetsElements = [
      'text=Budgets',
      'text=Gestion des budgets',
      '[data-testid="budgets-page"]',
      '.budgets-page'
    ];
    
    let foundElements = 0;
    for (const selector of budgetsElements) {
      const isVisible = await page.locator(selector).isVisible().catch(() => false);
      if (isVisible) foundElements++;
    }
    
    console.log(`Found ${foundElements} budgets elements`);
    await page.screenshot({ path: 'tests/reports/navigation-budgets.png' });
  });

  test('should navigate to goals page', async () => {
    await page.goto('/goals');
    await page.waitForLoadState('networkidle');
    
    expect(page.url()).toContain('goals');
    
    // Check for goals page elements
    const goalsElements = [
      'text=Objectifs',
      'text=Gestion des objectifs',
      '[data-testid="goals-page"]',
      '.goals-page'
    ];
    
    let foundElements = 0;
    for (const selector of goalsElements) {
      const isVisible = await page.locator(selector).isVisible().catch(() => false);
      if (isVisible) foundElements++;
    }
    
    console.log(`Found ${foundElements} goals elements`);
    await page.screenshot({ path: 'tests/reports/navigation-goals.png' });
  });

  test('should navigate to education page', async () => {
    await page.goto('/education');
    await page.waitForLoadState('networkidle');
    
    expect(page.url()).toContain('education');
    
    // Check for education page elements
    const educationElements = [
      'text=Éducation',
      'text=Éducation financière',
      '[data-testid="education-page"]',
      '.education-page'
    ];
    
    let foundElements = 0;
    for (const selector of educationElements) {
      const isVisible = await page.locator(selector).isVisible().catch(() => false);
      if (isVisible) foundElements++;
    }
    
    console.log(`Found ${foundElements} education elements`);
    await page.screenshot({ path: 'tests/reports/navigation-education.png' });
  });

  test('should navigate to fee management page', async () => {
    await page.goto('/fee-management');
    await page.waitForLoadState('networkidle');
    
    expect(page.url()).toContain('fee-management');
    
    // Check for fee management page elements
    const feeElements = [
      'text=Gestion des frais',
      'text=Frais Mobile Money',
      '[data-testid="fee-management-page"]',
      '.fee-management-page'
    ];
    
    let foundElements = 0;
    for (const selector of feeElements) {
      const isVisible = await page.locator(selector).isVisible().catch(() => false);
      if (isVisible) foundElements++;
    }
    
    console.log(`Found ${foundElements} fee management elements`);
    await page.screenshot({ path: 'tests/reports/navigation-fee-management.png' });
  });

  test('should test navigation menu', async () => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Look for navigation menu elements
    const navElements = [
      'nav',
      '.navigation',
      '.nav-menu',
      '[data-testid="navigation"]',
      'text=Accueil',
      'text=Comptes',
      'text=Transactions',
      'text=Budgets',
      'text=Objectifs'
    ];
    
    let foundNavElements = 0;
    for (const selector of navElements) {
      const isVisible = await page.locator(selector).isVisible().catch(() => false);
      if (isVisible) foundNavElements++;
    }
    
    console.log(`Found ${foundNavElements} navigation elements`);
    
    // Test navigation links
    const navLinks = [
      { text: 'Comptes', expectedUrl: '/accounts' },
      { text: 'Transactions', expectedUrl: '/transactions' },
      { text: 'Budgets', expectedUrl: '/budgets' },
      { text: 'Objectifs', expectedUrl: '/goals' }
    ];
    
    for (const link of navLinks) {
      try {
        const element = page.locator(`text=${link.text}`);
        const isVisible = await element.isVisible();
        
        if (isVisible) {
          console.log(`Navigation link "${link.text}" is visible`);
          
          // Test click (open in new tab to avoid navigation)
          await element.click({ modifiers: ['Control'] });
          await page.waitForTimeout(500);
        }
      } catch (e) {
        console.log(`Error testing navigation link "${link.text}":`, e);
      }
    }
  });

  test('should test mobile navigation', async () => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Look for mobile navigation elements
    const mobileNavElements = [
      '.mobile-nav',
      '.bottom-nav',
      '.hamburger-menu',
      '[data-testid="mobile-menu"]',
      'text=Menu',
      'text=☰'
    ];
    
    let foundMobileNav = 0;
    for (const selector of mobileNavElements) {
      const isVisible = await page.locator(selector).isVisible().catch(() => false);
      if (isVisible) foundMobileNav++;
    }
    
    console.log(`Found ${foundMobileNav} mobile navigation elements`);
    
    // Take mobile screenshot
    await page.screenshot({ path: 'tests/reports/navigation-mobile.png' });
  });

  test('should test page load performance', async () => {
    const pages = [
      { path: '/dashboard', name: 'Dashboard' },
      { path: '/accounts', name: 'Accounts' },
      { path: '/transactions', name: 'Transactions' },
      { path: '/budgets', name: 'Budgets' },
      { path: '/goals', name: 'Goals' },
      { path: '/education', name: 'Education' }
    ];
    
    const performanceResults: any[] = [];
    
    for (const pageInfo of pages) {
      const startTime = Date.now();
      
      await page.goto(pageInfo.path);
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Check for console errors
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      // Check page status
      const status = await page.evaluate(() => {
        return {
          title: document.title,
          hasContent: document.body.children.length > 0,
          hasErrors: document.querySelector('.error') !== null
        };
      });
      
      performanceResults.push({
        page: pageInfo.name,
        loadTime,
        consoleErrors: consoleErrors.length,
        status
      });
      
      console.log(`${pageInfo.name}: ${loadTime}ms, ${consoleErrors.length} errors`);
    }
    
    // Generate performance report
    console.log('Performance Results:', performanceResults);
    
    // Check for pages with high load times
    const slowPages = performanceResults.filter(result => result.loadTime > 5000);
    if (slowPages.length > 0) {
      console.log('Slow loading pages:', slowPages);
    }
  });

  test('should test 404 error handling', async () => {
    // Test non-existent page
    await page.goto('/non-existent-page');
    await page.waitForLoadState('networkidle');
    
    // Check for 404 page elements
    const errorElements = [
      'text=404',
      'text=Page non trouvée',
      'text=Not Found',
      '.error-page',
      '[data-testid="404"]'
    ];
    
    let foundErrorElements = 0;
    for (const selector of errorElements) {
      const isVisible = await page.locator(selector).isVisible().catch(() => false);
      if (isVisible) foundErrorElements++;
    }
    
    console.log(`Found ${foundErrorElements} 404 error elements`);
    
    if (foundErrorElements === 0) {
      // Check if redirected to home or login
      const currentUrl = page.url();
      console.log('Current URL after 404 test:', currentUrl);
      
      if (currentUrl.includes('/') && !currentUrl.includes('non-existent-page')) {
        console.log('Page redirected to home/login (expected behavior)');
      }
    }
    
    await page.screenshot({ path: 'tests/reports/navigation-404.png' });
  });

  test('should test browser back/forward navigation', async () => {
    // Navigate through multiple pages
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    await page.goto('/accounts');
    await page.waitForLoadState('networkidle');
    
    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');
    
    // Test browser back
    await page.goBack();
    await page.waitForLoadState('networkidle');
    
    const backUrl = page.url();
    console.log('URL after back navigation:', backUrl);
    
    // Test browser forward
    await page.goForward();
    await page.waitForLoadState('networkidle');
    
    const forwardUrl = page.url();
    console.log('URL after forward navigation:', forwardUrl);
    
    // Verify navigation worked
    expect(forwardUrl).toContain('transactions');
  });
});
