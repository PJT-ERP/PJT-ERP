import { test, expect } from '@playwright/test';

test.describe('Error Handling - Invalid Auth and Form Validation', () => {
  test('should display helper message when login fails due to incorrect credentials', async ({ page }) => {
    // Intercept login to return 401 error
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Invalid credentials' }),
      });
    });

    await page.goto('/login');

    await page.getByPlaceholder('Enter your email').fill('invalid@test.com');
    await page.getByPlaceholder('Enter your password').fill('wrongpassword');
    await page.getByRole('button', { name: /Sign In to System/i }).click();

    // Verify error message is rendered
    await expect(page.getByText('Login gagal. Periksa email dan password, lalu coba lagi.')).toBeVisible();
  });

  test('should display server error message when backend is unreachable', async ({ page }) => {
    // Abort request to simulate network/server failure
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.abort('failed');
    });

    await page.goto('/login');

    await page.getByPlaceholder('Enter your email').fill('admin@test.com');
    await page.getByPlaceholder('Enter your password').fill('password123');
    await page.getByRole('button', { name: /Sign In to System/i }).click();

    await expect(
      page.getByText('Login gagal. Periksa email dan password, lalu coba lagi.')
    ).toBeVisible();
  });

  test('should redirect unauthenticated users away from protected ERP routes to login', async ({ page }) => {
    // Make sure localStorage has no auth user
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());

    // Try accessing protected ERP route directly
    await page.goto('/erp/finance/dashboard');

    // Should automatically redirect back to /login
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });

  test('should prevent form submission when required fields are empty', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.getByPlaceholder('Enter your email');
    const passwordInput = page.getByPlaceholder('Enter your password');

    // Email and Password inputs should have required attribute
    await expect(emailInput).toHaveAttribute('required', '');
    await expect(passwordInput).toHaveAttribute('required', '');
  });
});
