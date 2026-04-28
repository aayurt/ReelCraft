import { test, expect } from '@playwright/test';

test('NotAuthorized gating across /dashboard path with NotAuthorized UI', async ({ page }) => {
  // This assumes an authenticated but unauthorized state in CI/test env.
  // Navigate directly to a gated route and verify NotAuthorized UI is shown.
  await page.goto('/dashboard');
  await expect(page.locator('text=Not Authorized')).toBeVisible();
  await expect(page.locator('text=Request Access')).toBeVisible();
  // Logout option should be present as a fallback action
  await expect(page.locator('text=Logout')).toBeVisible();
});
