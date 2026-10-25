import { test, expect } from '@playwright/test';

test.describe('Functional Test - Public Order Tracker', () => {
  test('should display search input and hints on landing page', async ({ page }) => {
    await page.goto('/');

    const trackingSection = page.locator('#tracking');
    await expect(trackingSection.getByRole('heading', { name: 'Track Your Order' })).toBeVisible();

    const input = trackingSection.getByPlaceholder('e.g. SO-2506-001');
    await expect(input).toBeVisible();

    const trackBtn = trackingSection.getByRole('button', { name: 'Track Order' });
    await expect(trackBtn).toBeVisible();
  });

  test('should show Order Not Found when tracking invalid SO number', async ({ page }) => {
    await page.goto('/');

    // Mock API response for 404
    await page.route('**/api/v1/production/tracking/*', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Order not found' }),
      });
    });

    const trackingSection = page.locator('#tracking');
    const input = trackingSection.getByPlaceholder('e.g. SO-2506-001');
    await input.fill('SO-9999-999');

    const trackBtn = trackingSection.getByRole('button', { name: 'Track Order' });
    await trackBtn.click();

    await expect(trackingSection.getByText('Order Not Found')).toBeVisible();
    await expect(trackingSection.getByText('No order found for "SO-9999-999"')).toBeVisible();
  });

  test('should display tracking details and timeline for a valid SO number', async ({ page }) => {
    await page.goto('/');

    // Mock API response for successful public tracking
    await page.route('**/api/v1/production/tracking/SO-2026-080*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          soNumber: 'SO-2026-080',
          customerName: 'PT Astra Otoparts',
          salesOrderStatus: 'InProduction',
          productionStatus: 'InProgress',
          progressPercent: 65,
          totalItems: 2,
          totalQuantity: 100,
          updatedAtUtc: new Date().toISOString(),
          items: [
            { productPartNumber: 'PART-001', productDescription: 'Precision Shaft 10mm', qty: 50 },
            { productPartNumber: 'PART-002', productDescription: 'Flange Bushing', qty: 50 },
          ],
        }),
      });
    });

    const trackingSection = page.locator('#tracking');
    const input = trackingSection.getByPlaceholder('e.g. SO-2506-001');
    await input.fill('SO-2026-080');

    const trackBtn = trackingSection.getByRole('button', { name: 'Track Order' });
    await trackBtn.click();

    await expect(trackingSection.getByText('SALES ORDER', { exact: true })).toBeVisible();
    await expect(trackingSection.getByText('SO-2026-080', { exact: true })).toBeVisible();
    await expect(trackingSection.getByText('PT Astra Otoparts')).toBeVisible();
    await expect(trackingSection.getByText('In Production')).toBeVisible();
    await expect(trackingSection.getByText('PART-001')).toBeVisible();
    await expect(trackingSection.getByText('Precision Shaft 10mm')).toBeVisible();
    await expect(trackingSection.getByText('Production Progress')).toBeVisible();
  });
});
