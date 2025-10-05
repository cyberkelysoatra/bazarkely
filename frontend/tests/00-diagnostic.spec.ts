import { test, expect, Page } from '@playwright/test';

test.describe('Diagnostic - Page Structure Analysis', () => {
  test('should analyze page structure', async ({ page }) => {
    await page.goto('https://1sakely.org');
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot for analysis
    await page.screenshot({ path: 'test-results/diagnostic-homepage.png', fullPage: true });
    
    // Get page title and URL
    const title = await page.title();
    const url = page.url();
    console.log('Page Title:', title);
    console.log('Page URL:', url);
    
    // Check for common login form elements
    const formElements = await page.evaluate(() => {
      const forms = document.querySelectorAll('form');
      const inputs = document.querySelectorAll('input');
      const buttons = document.querySelectorAll('button');
      
      return {
        forms: forms.length,
        inputs: inputs.length,
        buttons: buttons.length,
        inputTypes: Array.from(inputs).map(input => input.getAttribute('type')),
        buttonTexts: Array.from(buttons).map(button => button.textContent?.trim()),
        allText: document.body.textContent?.substring(0, 500)
      };
    });
    
    console.log('Form Elements:', formElements);
    
    // Look for specific text patterns
    const textPatterns = [
      'Se connecter',
      'Login',
      'Connexion',
      'Email',
      'Mot de passe',
      'Password',
      'Sign in',
      'Sign up',
      'Inscription',
      'Register'
    ];
    
    for (const pattern of textPatterns) {
      const found = await page.locator(`text=${pattern}`).isVisible().catch(() => false);
      if (found) {
        console.log(`Found text pattern: ${pattern}`);
      }
    }
    
    // Check for React components or specific classes
    const reactElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('[data-testid], [class*="react"], [class*="component"]');
      return Array.from(elements).map(el => ({
        tagName: el.tagName,
        className: el.className,
        testId: el.getAttribute('data-testid'),
        text: el.textContent?.substring(0, 100)
      }));
    });
    
    console.log('React/Component Elements:', reactElements);
    
    // Check for authentication-related elements
    const authElements = await page.evaluate(() => {
      const authSelectors = [
        'input[type="email"]',
        'input[type="password"]',
        'input[name="email"]',
        'input[name="password"]',
        'input[placeholder*="email"]',
        'input[placeholder*="password"]',
        'input[placeholder*="Email"]',
        'input[placeholder*="Password"]',
        'input[placeholder*="email"]',
        'input[placeholder*="mot de passe"]'
      ];
      
      const found = [];
      for (const selector of authSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          found.push({
            selector,
            count: elements.length,
            attributes: Array.from(elements).map(el => ({
              type: el.getAttribute('type'),
              name: el.getAttribute('name'),
              placeholder: el.getAttribute('placeholder'),
              id: el.getAttribute('id'),
              className: el.className
            }))
          });
        }
      }
      return found;
    });
    
    console.log('Authentication Elements Found:', authElements);
    
    // Check for Supabase integration
    const supabaseCheck = await page.evaluate(() => {
      return {
        hasSupabase: typeof (window as any).supabase !== 'undefined',
        localStorage: Object.keys(localStorage),
        sessionStorage: Object.keys(sessionStorage),
        scripts: Array.from(document.querySelectorAll('script')).map(script => script.src).filter(src => src),
        hasReact: typeof (window as any).React !== 'undefined',
        hasReactDOM: typeof (window as any).ReactDOM !== 'undefined'
      };
    });
    
    console.log('Supabase/React Check:', supabaseCheck);
  });
  
  test('should check if page is a SPA', async ({ page }) => {
    await page.goto('https://1sakely.org');
    await page.waitForLoadState('networkidle');
    
    // Check for SPA indicators
    const spaIndicators = await page.evaluate(() => {
      return {
        hasReact: typeof (window as any).React !== 'undefined',
        hasReactDOM: typeof (window as any).ReactDOM !== 'undefined',
        hasRouter: typeof (window as any).ReactRouter !== 'undefined',
        hasVite: document.querySelector('script[src*="vite"]') !== null,
        hasWebpack: document.querySelector('script[src*="webpack"]') !== null,
        hasBundler: document.querySelector('script[src*="bundle"]') !== null,
        hasApp: document.querySelector('#app, #root, [data-reactroot]') !== null,
        bodyClasses: document.body.className,
        hasServiceWorker: 'serviceWorker' in navigator
      };
    });
    
    console.log('SPA Indicators:', spaIndicators);
    
    // Check for loading states
    const loadingElements = await page.locator('[class*="loading"], [class*="spinner"], [class*="loader"]').count();
    console.log('Loading elements found:', loadingElements);
    
    // Wait a bit more for any async loading
    await page.waitForTimeout(3000);
    
    // Take another screenshot after waiting
    await page.screenshot({ path: 'test-results/diagnostic-after-wait.png', fullPage: true });
  });
});
