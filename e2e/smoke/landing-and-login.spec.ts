import { test, expect } from '@playwright/test';

test.describe('Smoke Test - Landing Page & Authentication Navigation', () => {
  test('should load landing page correctly with header and navigation elements', async ({ page }) => {
    await page.goto('/');

    // Verify page title / main company heading is visible
    await expect(page.getByText('PT. PRATAMA JAYA TEKINDO').first()).toBeVisible();

    // Verify key navigation items in navbar
    const nav = page.locator('nav');
    await expect(nav.getByRole('link', { name: 'Home', exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'About', exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Projects', exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Facility', exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Brands', exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Contact Us', exact: true })).toBeVisible();
  });

  test('should navigate to login page and render login form', async ({ page }) => {
    await page.goto('/login');

    // Verify login page header text
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
    await expect(page.getByText('Sign in to the Manufacturing ERP System')).toBeVisible();

    // Verify input fields
    await expect(page.getByPlaceholder('Enter your email')).toBeVisible();
    await expect(page.getByPlaceholder('Enter your password')).toBeVisible();

    // Verify submit button
    await expect(page.getByRole('button', { name: /Sign In to System/i })).toBeVisible();
  });
});
