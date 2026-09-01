import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
});

test('loads a typed coordinate route and generates a briefing package', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('region', { name: 'Map' })).toBeVisible();
  await page.getByRole('button', { name: 'Route worksheet' }).click();

  const typedRoute = page.getByLabel('Routing');
  await typedRoute.fill('-26.13370, 28.24600\n-25.93850, 27.92610');
  await page.getByRole('button', { name: 'Load route' }).click();

  await expect(page.getByText('Loaded 2 route points.')).toBeVisible();
  await expect(page.getByText('PT01 -> PT02', { exact: true })).toBeVisible();
  await expect(page.getByText('-26.13370, 28.24600').first()).toBeVisible();
  await expect(page.getByText('Fuel planning', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/approved POH\/AFM performance profile/i)).toBeVisible();
  await expect(page.getByText(/untrusted fallback/i)).toBeVisible();
  await expect(page.getByText('Grid MORA', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Brief', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Pilot digest' })).toBeVisible();
  await expect(page.getByText('Route NOTAM review', { exact: true })).toBeVisible();
  await expect(page.locator('body')).toContainText(/No airport or navaid identifiers are available for route NOTAM lookup/i);
  await expect(page.getByRole('button', { name: 'Copy' })).toBeVisible();
});
