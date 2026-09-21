import { test, expect } from '@playwright/test';

test.describe('Functional Test - Sales Order Module', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as Sales user
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'dev-master-token');
      localStorage.setItem(
        'auth_user',
        JSON.stringify({
          userId: 'u-sales',
          email: 'sales@test.com',
          name: 'Sales Rep',
          roles: ['Sales'],
          department: 'Sales',
          status: 'Active',
        })
      );
      localStorage.setItem('erp_current_username', 'sales@test.com');
    });
  });

  test('should load Sales Order dashboard and sub-navigation', async ({ page }) => {
    await page.goto('/erp/so/dashboard');

    // Check header/URL
    await expect(page).toHaveURL(/\/erp\/so\/dashboard/);

    // Navigation links in ERP sidebar / top bar should be visible
    await expect(page.getByText('Sales Order').first()).toBeVisible();
  });

  test('should navigate to Sales Orders list and display order list header', async ({ page }) => {
    await page.goto('/erp/so/orders');

    await expect(page).toHaveURL(/\/erp\/so\/orders/);
    await expect(page.getByText('Sales Order (SO)').first()).toBeVisible();
  });

  test('should navigate to Customer list page', async ({ page }) => {
    await page.goto('/erp/so/customers');

    await expect(page).toHaveURL(/\/erp\/so\/customers/);
  });
});
