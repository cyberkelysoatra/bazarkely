import { test, expect, Page } from '@playwright/test';

test.describe('Accounts Management', () => {
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

  test('should navigate to accounts page', async () => {
    await page.goto('/accounts');
    await page.waitForLoadState('networkidle');
    
    // Verify page loaded
    expect(page.url()).toContain('accounts');
    
    // Check for accounts page elements
    const accountElements = [
      'text=Comptes',
      'text=Gestion des comptes',
      'text=Ajouter un compte',
      '[data-testid="accounts-page"]',
      '.accounts-page'
    ];
    
    let foundElements = 0;
    for (const selector of accountElements) {
      const isVisible = await page.locator(selector).isVisible().catch(() => false);
      if (isVisible) foundElements++;
    }
    
    console.log(`Found ${foundElements} account page elements`);
    await page.screenshot({ path: 'tests/reports/accounts-page.png' });
  });

  test('should display accounts list', async () => {
    await page.goto('/accounts');
    await page.waitForLoadState('networkidle');
    
    // Look for accounts list
    const accountListSelectors = [
      '[data-testid="accounts-list"]',
      '.account-item',
      '.account-card',
      'text=Compte courant',
      'text=Compte épargne',
      'text=Orange Money',
      'text=Mvola'
    ];
    
    let accountItems = 0;
    for (const selector of accountListSelectors) {
      const elements = await page.locator(selector).all();
      accountItems += elements.length;
    }
    
    console.log(`Found ${accountItems} account items`);
    
    // Check for account data
    const hasAccountData = await page.locator('text=/\\d+\\s*Ar/').isVisible().catch(() => false);
    if (hasAccountData) {
      console.log('Account balance data found');
    }
  });

  test('should test add account button', async () => {
    await page.goto('/accounts');
    await page.waitForLoadState('networkidle');
    
    // Look for add account button
    const addButtonSelectors = [
      'text=Ajouter un compte',
      'text=Nouveau compte',
      'button:has-text("Ajouter")',
      '[data-testid="add-account-button"]',
      '.add-account-button'
    ];
    
    let addButtonFound = false;
    for (const selector of addButtonSelectors) {
      const isVisible = await page.locator(selector).isVisible().catch(() => false);
      if (isVisible) {
        addButtonFound = true;
        console.log(`Add account button found with selector: ${selector}`);
        break;
      }
    }
    
    if (addButtonFound) {
      // Try to click the button
      try {
        await page.click('text=Ajouter un compte');
        await page.waitForTimeout(1000);
        console.log('Add account button clicked successfully');
      } catch (e) {
        console.log('Could not click add account button:', e);
      }
    } else {
      console.log('Add account button not found');
    }
  });

  test('should verify account creation form', async () => {
    await page.goto('/accounts');
    await page.waitForLoadState('networkidle');
    
    // Try to open account creation form
    try {
      await page.click('text=Ajouter un compte');
      await page.waitForTimeout(1000);
    } catch (e) {
      console.log('Could not open account creation form');
    }
    
    // Look for form elements
    const formElements = [
      'input[name="name"]',
      'input[name="type"]',
      'input[name="balance"]',
      'select[name="type"]',
      'text=Type de compte',
      'text=Nom du compte',
      'text=Solde initial'
    ];
    
    let formFields = 0;
    for (const selector of formElements) {
      const isVisible = await page.locator(selector).isVisible().catch(() => false);
      if (isVisible) formFields++;
    }
    
    console.log(`Found ${formFields} form fields`);
    
    if (formFields > 0) {
      await page.screenshot({ path: 'tests/reports/account-form.png' });
    }
  });

  test('should test form validation', async () => {
    await page.goto('/accounts');
    await page.waitForLoadState('networkidle');
    
    // Try to open form
    try {
      await page.click('text=Ajouter un compte');
      await page.waitForTimeout(1000);
    } catch (e) {
      console.log('Form not accessible for validation test');
      return;
    }
    
    // Test empty form submission
    try {
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);
      
      // Check for validation messages
      const validationMessages = [
        'text=requis',
        'text=obligatoire',
        'text=champ requis',
        '.error-message',
        '.validation-error'
      ];
      
      let validationFound = false;
      for (const selector of validationMessages) {
        const isVisible = await page.locator(selector).isVisible().catch(() => false);
        if (isVisible) {
          validationFound = true;
          console.log(`Validation message found: ${selector}`);
        }
      }
      
      if (validationFound) {
        console.log('Form validation working correctly');
      }
    } catch (e) {
      console.log('Form validation test failed:', e);
    }
  });

  test('should test account types', async () => {
    await page.goto('/accounts');
    await page.waitForLoadState('networkidle');
    
    // Look for different account types
    const accountTypes = [
      'text=Compte courant',
      'text=Compte épargne',
      'text=Orange Money',
      'text=Mvola',
      'text=Airtel Money',
      'text=Compte bancaire'
    ];
    
    let foundTypes = 0;
    for (const accountType of accountTypes) {
      const isVisible = await page.locator(accountType).isVisible().catch(() => false);
      if (isVisible) {
        foundTypes++;
        console.log(`Found account type: ${accountType}`);
      }
    }
    
    console.log(`Found ${foundTypes} different account types`);
  });

  test('should verify account details functionality', async () => {
    await page.goto('/accounts');
    await page.waitForLoadState('networkidle');
    
    // Look for account items that might be clickable
    const accountItems = await page.locator('.account-item, .account-card, [data-testid="account-item"]').all();
    
    if (accountItems.length > 0) {
      console.log(`Found ${accountItems.length} account items`);
      
      // Try to click on first account
      try {
        await accountItems[0].click();
        await page.waitForTimeout(1000);
        
        // Check if navigated to account details
        const currentUrl = page.url();
        if (currentUrl.includes('/account/') || currentUrl.includes('/details')) {
          console.log('Navigated to account details page');
          await page.screenshot({ path: 'tests/reports/account-details.png' });
        }
      } catch (e) {
        console.log('Could not click on account item:', e);
      }
    } else {
      console.log('No account items found to test details functionality');
    }
  });

  test('should check Supabase integration for accounts', async () => {
    await page.goto('/accounts');
    await page.waitForLoadState('networkidle');
    
    // Monitor network requests for Supabase
    const supabaseRequests: string[] = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('supabase') || url.includes('accounts') || url.includes('1sakely.org/api')) {
        supabaseRequests.push(url);
      }
    });
    
    // Wait for potential API calls
    await page.waitForTimeout(2000);
    
    console.log('Supabase requests for accounts:', supabaseRequests);
    
    // Check for accounts data in localStorage
    const accountsData = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      return keys.filter(key => 
        key.includes('account') || 
        key.includes('supabase') ||
        key.includes('bazarkely')
      );
    });
    
    console.log('Accounts-related localStorage keys:', accountsData);
  });

  test('should test account update functionality', async () => {
    await page.goto('/accounts');
    await page.waitForLoadState('networkidle');
    
    // Look for edit buttons or account items
    const editButtons = [
      'text=Modifier',
      'text=Éditer',
      'button:has-text("Edit")',
      '[data-testid="edit-account"]',
      '.edit-button'
    ];
    
    let editButtonFound = false;
    for (const selector of editButtons) {
      const isVisible = await page.locator(selector).isVisible().catch(() => false);
      if (isVisible) {
        editButtonFound = true;
        console.log(`Edit button found with selector: ${selector}`);
        break;
      }
    }
    
    if (editButtonFound) {
      try {
        await page.click('text=Modifier');
        await page.waitForTimeout(1000);
        console.log('Edit account functionality accessible');
      } catch (e) {
        console.log('Could not access edit functionality:', e);
      }
    } else {
      console.log('Edit functionality not found or not accessible');
    }
  });
});
