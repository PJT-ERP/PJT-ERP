import { test, expect } from '@playwright/test';

test.describe('Functional Test - Authentication & Role Redirection Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept backend login API request for deterministic role testing
    await page.route('**/api/v1/auth/login', async (route) => {
      const request = route.request();
      const body = request.postDataJSON();
      const email = body?.email || '';

      if (email.includes('fail')) {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Invalid credentials' }),
        });
        return;
      }

      let role = 'Sales';
      let name = 'Sales User';
      let userId = 'u-sales';

      if (email.includes('admin')) {
        role = 'Admin';
        name = 'System Admin';
        userId = 'u-admin';
      } else if (email.includes('finance')) {
        role = 'Finance';
        name = 'Finance Officer';
        userId = 'u-finance';
      } else if (email.includes('owner')) {
        role = 'Owner';
        name = 'Company Owner';
        userId = 'u-owner';
      } else if (email.includes('engineering') || email.includes('engineer')) {
        role = 'Engineering';
        name = 'Lead Engineer';
        userId = 'u-engineer';
      } else if (email.includes('qc')) {
        role = 'QC';
        name = 'QC Inspector';
        userId = 'u-qc';
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'dev-master-token',
          userId,
          email,
          name,
          roles: [role],
          department: role,
          status: 'Active',
        }),
      });
    });

    // Mock initial user me endpoint
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({ status: 401 });
    });
  });

  test('should successfully log in as Admin and redirect to Finance Dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder('Enter your email').fill('admin@test.com');
    await page.getByPlaceholder('Enter your password').fill('password123');
    await page.getByRole('button', { name: /Sign In to System/i }).click();

    await page.waitForURL('**/erp/finance/dashboard');
    expect(page.url()).toContain('/erp/finance/dashboard');
  });

  test('should successfully log in as Finance and redirect to Finance module', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder('Enter your email').fill('finance@test.com');
    await page.getByPlaceholder('Enter your password').fill('password123');
    await page.getByRole('button', { name: /Sign In to System/i }).click();

    await page.waitForURL('**/erp/finance**');
    expect(page.url()).toContain('/erp/finance');
  });

  test('should successfully log in as Owner and redirect to Executive Dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder('Enter your email').fill('owner@test.com');
    await page.getByPlaceholder('Enter your password').fill('password123');
    await page.getByRole('button', { name: /Sign In to System/i }).click();

    await page.waitForURL('**/erp/dashboard');
    expect(page.url()).toContain('/erp/dashboard');
  });

  test('should successfully log in as Sales and redirect to Sales Order module', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder('Enter your email').fill('sales@test.com');
    await page.getByPlaceholder('Enter your password').fill('password123');
    await page.getByRole('button', { name: /Sign In to System/i }).click();

    await page.waitForURL('**/erp/so**');
    expect(page.url()).toContain('/erp/so');
  });
});
