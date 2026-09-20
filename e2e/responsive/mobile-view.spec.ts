import { test, expect } from '@playwright/test';

test.describe('Responsive Behavior - Mobile Viewport Testing', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should render mobile menu button and open drawer on mobile screen size', async ({ page }) => {
    await page.goto('/');

    const nav = page.locator('nav');
    
    // Verify mobile hamburger button is visible
    const menuBtn = nav.locator('button.md\\:hidden');
    await expect(menuBtn).toBeVisible();

    // Open mobile menu
    await menuBtn.click();

    // Verify mobile menu drawer items are now displayed
    await expect(nav.getByRole('link', { name: 'Home', exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'About', exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Projects', exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Facility', exact: true })).toBeVisible();
  });

  test('should render login form responsively on mobile screen', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
    await expect(page.getByPlaceholder('Enter your email')).toBeVisible();
    await expect(page.getByPlaceholder('Enter your password')).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign In to System/i })).toBeVisible();
  });
});
