import { test, expect } from '@playwright/test';

test.describe('Functional Test - Role-based Module Dashboards', () => {
  test('Engineering role can access Engineering module page', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'dev-master-token');
      localStorage.setItem(
        'auth_user',
        JSON.stringify({
          userId: 'u-eng',
          email: 'engineering@test.com',
          name: 'Lead Engineer',
          roles: ['Engineering'],
          department: 'Engineering',
          status: 'Active',
        })
      );
      localStorage.setItem('erp_current_username', 'engineering@test.com');
    });

    await page.goto('/erp/engineer');
    await expect(page).toHaveURL(/\/erp\/engineer/);
  });

  test('QC role can access QC module page', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'dev-master-token');
      localStorage.setItem(
        'auth_user',
        JSON.stringify({
          userId: 'u-qc',
          email: 'qc@test.com',
          name: 'QC Inspector',
          roles: ['QC'],
          department: 'QC',
          status: 'Active',
        })
      );
      localStorage.setItem('erp_current_username', 'qc@test.com');
    });

    await page.goto('/erp/qc');
    await expect(page).toHaveURL(/\/erp\/qc/);
  });

  test('Finance role can access Finance dashboard page', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'dev-master-token');
      localStorage.setItem(
        'auth_user',
        JSON.stringify({
          userId: 'u-fin',
          email: 'finance@test.com',
          name: 'Finance Manager',
          roles: ['Finance'],
          department: 'Finance',
          status: 'Active',
        })
      );
      localStorage.setItem('erp_current_username', 'finance@test.com');
    });

    await page.goto('/erp/finance/dashboard');
    await expect(page).toHaveURL(/\/erp\/finance\/dashboard/);
  });

  test('Owner role can access Executive Dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'dev-master-token');
      localStorage.setItem(
        'auth_user',
        JSON.stringify({
          userId: 'u-owner',
          email: 'owner@test.com',
          name: 'Executive Owner',
          roles: ['Owner'],
          department: 'Owner',
          status: 'Active',
        })
      );
      localStorage.setItem('erp_current_username', 'owner@test.com');
    });

    await page.goto('/erp/dashboard');
    await expect(page).toHaveURL(/\/erp\/dashboard/);
  });
});
