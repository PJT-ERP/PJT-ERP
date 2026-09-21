import { test, expect } from '@playwright/test';

test.describe('Persistence Test - Session & Authentication State', () => {
  test('should persist authentication state in localStorage and remain logged in after page reload', async ({ page }) => {
    // Pre-seed localStorage with authenticated user data
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'dev-master-token');
      localStorage.setItem(
        'auth_user',
        JSON.stringify({
          userId: 'u-admin',
          email: 'admin@test.com',
          name: 'System Admin',
          roles: ['Admin'],
          department: 'Admin',
          status: 'Active',
        })
      );
      localStorage.setItem('erp_current_username', 'admin@test.com');
    });

    // Navigate to protected admin route
    await page.goto('/erp/admin');

    // Verify page loads without redirecting to /login
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByText('System Admin').first()).toBeVisible();

    // Reload page to test persistence
    await page.reload();

    // Verify session is retained after reload
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByText('System Admin').first()).toBeVisible();
  });
});
