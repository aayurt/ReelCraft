import { test, expect } from '@playwright/test';

test('NotAuthorized UI renders with actions', async ({ page }) => {
  await page.goto('/not-authorized');
  await expect(page.locator('h1')).toHaveText('Not Authorized');
  await expect(page.locator('a[href="/request-access"]')).toBeVisible();
  await expect(page.locator('button[aria-label="Logout"]')).toBeVisible();
});
