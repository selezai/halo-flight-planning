import { expect, test } from '@playwright/test';

test.use({
  viewport: {
    width: 393,
    height: 852,
  },
  deviceScaleFactor: 3,
  hasTouch: true,
  isMobile: true,
  geolocation: {
    longitude: 28.246,
    latitude: -26.134,
    accuracy: 12,
  },
  permissions: ['geolocation'],
});

test.describe('aircraft location tracking', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
    });
  });

  test('renders the aircraft marker after a granted mobile GPS fix', async ({ page }) => {
    const locationOverlayErrors: string[] = [];

    page.on('console', (message) => {
      const text = message.text();
      if (
        text.includes('location_overlay_failed') ||
        text.includes('location_tracking_fix_rejected')
      ) {
        locationOverlayErrors.push(text);
      }
    });

    await page.goto('/');
    await expect(page.getByRole('region', { name: 'Map' })).toBeVisible();
    await expect(page.getByText('Loading aviation map...')).toBeHidden({ timeout: 30_000 });

    const trackingButton = page.getByRole('button', { name: 'Track aircraft position' });
    await expect(trackingButton).toBeVisible();
    await trackingButton.tap();

    await expect(page.locator('.halo-location-aircraft-marker')).toBeVisible();
    expect(locationOverlayErrors).toEqual([]);
  });
});
