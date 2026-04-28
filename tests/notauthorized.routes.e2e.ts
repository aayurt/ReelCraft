import { test, expect } from '@playwright/test';

const gatedRoutes = ["/dashboard", "/admin", "/moderation", "/settings"];

test.describe('NotAuthorized gating across routes', () => {
for (const route of gatedRoutes) {
  test(`NotAuthorized renders for ${route}`, async ({ page }) => {
    await page.goto(route);
    // Expect Not Authorized UI to render if user is authenticated but unauthorized
    await expect(page.locator('text=Not Authorized')).toBeVisible();
    await expect(page.locator('text=Request Access')).toBeVisible();
    // Ensure Logout action is present and usable
    await expect(page.locator('text=Logout')).toBeVisible();
  });
}
});
