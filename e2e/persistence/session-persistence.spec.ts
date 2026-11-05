import { test, expect } from '@playwright/test';

test.describe('Persistence Test - Session & Authentication State', () => {
  test('should persist authentication state in localStorage and remain logged in after page reload', async ({ page }) => {
    await page.route('**/api/v1/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/auth/login')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            accessToken: 'dev-master-token',
            userId: 'u-owner',
            email: 'owner@test.com',
            name: 'Executive Owner',
            roles: ['Owner'],
            department: 'Owner',
            status: 'Active',
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Seed localStorage on /login page
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

    // Navigate to protected executive route
    await page.goto('/erp/dashboard');
    await expect(page).toHaveURL(/\/erp\/dashboard/);

    // Reload page to test session persistence
    await page.reload();

    // Verify session is retained after reload and does not kick user back to /login
    await expect(page).toHaveURL(/\/erp\/dashboard/);
  });
});
