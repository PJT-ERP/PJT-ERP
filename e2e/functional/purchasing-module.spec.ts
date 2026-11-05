import { test, expect } from '@playwright/test';

test.describe('Functional Test - Purchasing Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/auth/login')) {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

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
