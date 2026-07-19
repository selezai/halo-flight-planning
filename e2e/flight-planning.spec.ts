import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
});

test('creates a route from starter waypoints and generates a briefing package', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Halo' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Map' })).toBeVisible();

  const waypointSearch = page.getByPlaceholder('ICAO, navaid, or name');
  await waypointSearch.fill('FAOR');
  await page.getByRole('button', { name: /FAOR\s+O\.R\. Tambo International/i }).click();

  await waypointSearch.fill('FALA');
  await page.getByRole('button', { name: /FALA\s+Lanseria International/i }).click();

  await expect(page.getByText('FAOR -> FALA')).toBeVisible();
  await expect(page.getByText(/FAOR\s+·\s+-26\.13370, 28\.24600/i)).toBeVisible();
  await expect(page.getByText(/FALA\s+·\s+-25\.93850, 27\.92610/i)).toBeVisible();

  await page.getByRole('button', { name: 'Briefing' }).click();

  await expect(page.getByText('HALO FLIGHT BRIEFING')).toBeVisible();
  await expect(page.getByText('Route: South Africa cross-country')).toBeVisible();
  await expect(page.getByText(/1\. FAOR to FALA:/)).toBeVisible();
  await expect(page.getByText('Route NOTAM review', { exact: true })).toBeVisible();
  await expect(page.locator('body')).toContainText(/FAA NOTAM API credentials are not configured/i);
  await expect(page.locator('body')).toContainText('Route locations prepared: FAOR, FALA');
  await expect(page.locator('pre')).toContainText('NOTAM REVIEW');
  await expect(page.getByRole('button', { name: 'Copy' })).toBeVisible();
});
