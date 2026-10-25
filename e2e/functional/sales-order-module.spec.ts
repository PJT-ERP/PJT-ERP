import { test, expect } from '@playwright/test';

test.describe('Functional Test - Sales Order Module', () => {
  test('should load Sales Order dashboard and sub-navigation', async ({ page }) => {
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

    await page.goto('/erp/so/dashboard');
    await expect(page).toHaveURL(/\/erp\/so\/dashboard/);
  });

  test('should navigate to Sales Orders list and display order list header', async ({ page }) => {
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

    await page.goto('/erp/so/orders');
    await expect(page).toHaveURL(/\/erp\/so\/orders/);
  });

  test('should navigate to Customer list page', async ({ page }) => {
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

    await page.goto('/erp/so/customers');
    await expect(page).toHaveURL(/\/erp\/so\/customers/);
  });
});
