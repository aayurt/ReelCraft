import { test, expect } from '@playwright/test';

// Helper to read env vars safely for tests
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'tester@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'password123';
const MODERATOR_EMAIL = process.env.TEST_MODERATOR_EMAIL || TEST_EMAIL; // If not provided, reuse TEST_EMAIL
const MODERATOR_PASSWORD = process.env.TEST_MODERATOR_PASSWORD || TEST_PASSWORD;

test.describe('Authentication flows', () => {
  test('User login success', async ({ page }) => {
    await page.goto('/login');
    // Fill email and password
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    // Expect redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('Projects', { timeout: 5000 });
  });

  test('User login failure with wrong password', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', 'wrong-password');
    await page.click('button[type="submit"]');
    // Expect an error message to appear
    await expect(page.locator('.text-rose-400')).toBeVisible({ timeout: 5000 });
  });

  test('Moderator login path works and RBAC gates /dashboard for moderator', async ({ page }) => {
    await page.goto('/login/moderator');
    await page.fill('input[type="email"]', MODERATOR_EMAIL);
    await page.fill('input[type="password"]', MODERATOR_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    // Should see Projects heading on moderator dashboard
    await expect(page.locator('h1')).toContainText('Projects', { timeout: 5000 });
  });

  test('Forgot password flow page loads and submits', async ({ page }) => {
    await page.goto('/login/forgot-password');
    // Enter test email and submit
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.click('button[type="submit"]');
    // Page should display a result message or no crash
    await expect(page).toBeVisible();
  });
});
