import { test, expect } from '@playwright/test';

test('NotAuthorized page renders', async ({ page }) => {
  await page.goto('/not-authorized');
  await expect(page.locator('text=Not Authorized')).toBeVisible();
  await expect(page.locator('text=Request Access')).toBeVisible();
  // Logout should be present as an explicit action
  await expect(page.locator('text=Logout')).toBeVisible();
});
