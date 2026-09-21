import { test, expect } from '@playwright/test';

test.describe('Functional Test - Purchasing Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'dev-master-token');
      localStorage.setItem(
        'auth_user',
        JSON.stringify({
          userId: 'u-purchasing',
          email: 'purchasing@test.com',
          name: 'Purchasing Manager',
          roles: ['Purchasing'],
          department: 'Purchasing',
          status: 'Active',
        })
      );
      localStorage.setItem('erp_current_username', 'purchasing@test.com');
    });
  });

  test('should load Purchasing Dashboard page', async ({ page }) => {
    await page.goto('/erp/purchasing/dashboard');

    await expect(page).toHaveURL(/\/erp\/purchasing\/dashboard/);
  });

  test('should navigate to Material Requests page', async ({ page }) => {
    await page.goto('/erp/purchasing/requests');

    await expect(page).toHaveURL(/\/erp\/purchasing\/requests/);
  });

  test('should navigate to Inventory page', async ({ page }) => {
    await page.goto('/erp/purchasing/inventory');

    await expect(page).toHaveURL(/\/erp\/purchasing\/inventory/);
  });
});
