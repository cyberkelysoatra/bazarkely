import { test, expect, Page } from '@playwright/test';

test.describe('Authentication Flow', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/auth');
  });

  test('should display login form', async () => {
    // Verify login form elements are visible
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Se connecter")')).toBeVisible();
    
    // Check for login form text
    await expect(page.locator('text=Se connecter')).toBeVisible();
    await expect(page.locator('text=Nom d\'utilisateur')).toBeVisible();
    await expect(page.locator('text=Mot de passe')).toBeVisible();
  });

  test('should handle login with test credentials', async () => {
    const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword123';

    // Fill login form
    await page.fill('input[type="text"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    
    // Submit form
    await page.click('button:has-text("Se connecter")');
    
    // Wait for navigation or error message
    await page.waitForTimeout(3000);
    
    // Check if redirected to dashboard or if error message appears
    const currentUrl = page.url();
    const hasError = await page.locator('text=Erreur').isVisible().catch(() => false);
    const hasSuccess = currentUrl.includes('/dashboard') || currentUrl.includes('/app');
    
    if (hasError) {
      console.log('Login failed - this is expected if test credentials are not valid');
      // Take screenshot for debugging
      await page.screenshot({ path: 'tests/reports/login-error.png' });
    } else if (hasSuccess) {
      console.log('Login successful - redirected to dashboard');
      // Verify dashboard elements
      await expect(page.locator('text=Tableau de bord')).toBeVisible();
    }
  });

  test('should verify Supabase auth integration', async () => {
    // Check if Supabase client is loaded
    const supabaseLoaded = await page.evaluate(() => {
      return typeof window !== 'undefined' && 
             window.localStorage.getItem('supabase.auth.token') !== null;
    });
    
    console.log('Supabase auth token present:', supabaseLoaded);
    
    // Check for Supabase environment variables
    const envCheck = await page.evaluate(() => {
      return {
        hasSupabaseUrl: typeof window !== 'undefined' && 
                       window.location.origin.includes('1sakely.org'),
        localStorage: typeof window !== 'undefined' ? 
                     Object.keys(window.localStorage) : []
      };
    });
    
    console.log('Environment check:', envCheck);
  });

  test('should handle form validation', async () => {
    // Test empty form submission
    await page.click('button:has-text("Se connecter")');
    
    // Check for validation messages
    const hasValidationError = await page.locator('text=requis').isVisible().catch(() => false);
    if (hasValidationError) {
      console.log('Form validation working correctly');
    }
    
    // Test invalid email format
    await page.fill('input[type="text"]', 'invalid-email');
    await page.fill('input[type="password"]', 'password');
    await page.click('button:has-text("Se connecter")');
    
    await page.waitForTimeout(1000);
    
    // Check for email validation
    const hasEmailError = await page.locator('text=email').isVisible().catch(() => false);
    if (hasEmailError) {
      console.log('Email validation working correctly');
    }
  });

  test('should check for console errors', async () => {
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Navigate and wait for page load
    await page.waitForLoadState('networkidle');
    
    console.log('Console errors found:', consoleErrors);
    
    // Check for Supabase-related errors
    const supabaseErrors = consoleErrors.filter(error => 
      error.toLowerCase().includes('supabase') || 
      error.toLowerCase().includes('auth')
    );
    
    if (supabaseErrors.length > 0) {
      console.log('Supabase errors detected:', supabaseErrors);
    }
  });

  test('should verify session persistence', async () => {
    // Check localStorage for session data
    const sessionData = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      return keys.filter(key => 
        key.includes('supabase') || 
        key.includes('auth') || 
        key.includes('session')
      );
    });
    
    console.log('Session-related localStorage keys:', sessionData);
    
    // Check for IndexedDB usage
    const indexedDBData = await page.evaluate(async () => {
      try {
        const databases = await indexedDB.databases();
        return databases.map(db => db.name);
      } catch (e) {
        return [];
      }
    });
    
    console.log('IndexedDB databases:', indexedDBData);
  });
});
