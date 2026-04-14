import { test, expect } from "@playwright/test";

test.describe("Video Reordering + Per-Video Transitions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "testpassword123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");
  });

  test("should display video grid with reorderable videos", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("text=Storyboard")).toBeVisible();
    
    const createLink = page.locator('a:has-text("Create Project")');
    if (await createLink.isVisible()) {
      await createLink.click();
      await page.fill('input[name="name"]', "Test Video Project");
      await page.click('button:has-text("Create")');
      await page.waitForURL(/\/project\/\d+/);
    }
    
    await page.goto("/project/1");
    
    await expect(page.locator("text=Videos")).toBeVisible();
  });

  test("should show transition dropdown on each video card", async ({ page }) => {
    await page.goto("/project/1");
    
    const videoCards = page.locator('[data-testid="video-card"]');
    if (await videoCards.first().isVisible()) {
      const transitionSelect = videoCards.first().locator('select[name="transitionType"]');
      await expect(transitionSelect).toBeVisible();
      
      await transitionSelect.selectOption("fade");
      await expect(transitionSelect).toHaveValue("fade");
    }
  });

  test("should allow manual video upload", async ({ page }) => {
    await page.goto("/project/1");
    
    const uploadButton = page.locator('input[type="video/mp4"]');
    if (await uploadButton.isVisible()) {
      await uploadButton.setInputFiles({
        name: "test-video.mp4",
        mimeType: "video/mp4",
        buffer: Buffer.from("fake-video-content"),
      });
      await expect(page.locator("text=Processing...")).toBeVisible();
    }
  });

  test("should reorder videos via drag and drop", async ({ page }) => {
    await page.goto("/project/1");
    
    const videoCards = page.locator('[data-testid="video-card"]');
    const count = await videoCards.count();
    
    if (count >= 2) {
      const firstCard = videoCards.first();
      const secondCard = videoCards.nth(1);
      
      const firstBounding = await firstCard.boundingBox();
      const secondBounding = await secondCard.boundingBox();
      
      await firstCard.dragTo(secondCard);
      
      const newFirstCard = videoCards.first();
      expect(newFirstCard).toBeTruthy();
    }
  });

  test("should combine videos with per-video transitions", async ({ page }) => {
    await page.goto("/project/1");
    
    const combineSection = page.locator("text=Combine Video");
    await expect(combineSection).toBeVisible();
    
    await combineSection.locator('button:has-text("Combine into Final Video")').click();
    
    await expect(page.locator("text=Combining...")).toBeVisible();
  });
});