import { test, expect } from '@playwright/test';

test.describe('Accessibility - Basic A11y & Keyboard Navigation', () => {
  test('should support keyboard navigation through login form', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.getByPlaceholder('Enter your email');
    const passwordInput = page.getByPlaceholder('Enter your password');

    // Focus email input and type
    await emailInput.focus();
    await expect(emailInput).toBeFocused();
    await page.keyboard.type('admin@test.com');

    // Tab to password field
    await page.keyboard.press('Tab');
    await expect(passwordInput).toBeFocused();
    await page.keyboard.type('password123');

    // Tab to submit button
    await page.keyboard.press('Tab');
    const submitBtn = page.getByRole('button', { name: /Sign In to System/i });
    await expect(submitBtn).toBeFocused();
  });

  test('should have proper alt attributes for key images', async ({ page }) => {
    await page.goto('/');

    // Check navbar logo alt tag
    const logoImg = page.locator('img[alt="PJT Logo"]').first();
    await expect(logoImg).toBeVisible();

    // Check login page logo alt tag
    await page.goto('/login');
    const loginLogo = page.locator('img[alt="PT Pratama Jaya"]');
    await expect(loginLogo).toBeVisible();
  });

  test('should have accessible nav landmarks and headings', async ({ page }) => {
    await page.goto('/');

    const navLandmark = page.getByRole('navigation');
    await expect(navLandmark).toBeVisible();

    const heading = page.getByRole('heading', { name: 'Track Your Order' });
    await expect(heading).toBeVisible();
  });
});
