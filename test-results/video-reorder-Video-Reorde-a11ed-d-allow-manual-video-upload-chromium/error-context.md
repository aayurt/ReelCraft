# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: video-reorder.spec.ts >> Video Reordering + Per-Video Transitions >> should allow manual video upload
- Location: tests/video-reorder.spec.ts:42:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3001/login
Call log:
  - navigating to "http://localhost:3001/login", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test.describe("Video Reordering + Per-Video Transitions", () => {
  4  |   test.beforeEach(async ({ page }) => {
> 5  |     await page.goto("/login");
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3001/login
  6  |     await page.fill('input[name="email"]', "test@example.com");
  7  |     await page.fill('input[name="password"]', "testpassword123");
  8  |     await page.click('button[type="submit"]');
  9  |     await page.waitForURL("/dashboard");
  10 |   });
  11 | 
  12 |   test("should display video grid with reorderable videos", async ({ page }) => {
  13 |     await page.goto("/dashboard");
  14 |     await expect(page.locator("text=Storyboard")).toBeVisible();
  15 |     
  16 |     const createLink = page.locator('a:has-text("Create Project")');
  17 |     if (await createLink.isVisible()) {
  18 |       await createLink.click();
  19 |       await page.fill('input[name="name"]', "Test Video Project");
  20 |       await page.click('button:has-text("Create")');
  21 |       await page.waitForURL(/\/project\/\d+/);
  22 |     }
  23 |     
  24 |     await page.goto("/project/1");
  25 |     
  26 |     await expect(page.locator("text=Videos")).toBeVisible();
  27 |   });
  28 | 
  29 |   test("should show transition dropdown on each video card", async ({ page }) => {
  30 |     await page.goto("/project/1");
  31 |     
  32 |     const videoCards = page.locator('[data-testid="video-card"]');
  33 |     if (await videoCards.first().isVisible()) {
  34 |       const transitionSelect = videoCards.first().locator('select[name="transitionType"]');
  35 |       await expect(transitionSelect).toBeVisible();
  36 |       
  37 |       await transitionSelect.selectOption("fade");
  38 |       await expect(transitionSelect).toHaveValue("fade");
  39 |     }
  40 |   });
  41 | 
  42 |   test("should allow manual video upload", async ({ page }) => {
  43 |     await page.goto("/project/1");
  44 |     
  45 |     const uploadButton = page.locator('input[type="video/mp4"]');
  46 |     if (await uploadButton.isVisible()) {
  47 |       await uploadButton.setInputFiles({
  48 |         name: "test-video.mp4",
  49 |         mimeType: "video/mp4",
  50 |         buffer: Buffer.from("fake-video-content"),
  51 |       });
  52 |       await expect(page.locator("text=Processing...")).toBeVisible();
  53 |     }
  54 |   });
  55 | 
  56 |   test("should reorder videos via drag and drop", async ({ page }) => {
  57 |     await page.goto("/project/1");
  58 |     
  59 |     const videoCards = page.locator('[data-testid="video-card"]');
  60 |     const count = await videoCards.count();
  61 |     
  62 |     if (count >= 2) {
  63 |       const firstCard = videoCards.first();
  64 |       const secondCard = videoCards.nth(1);
  65 |       
  66 |       const firstBounding = await firstCard.boundingBox();
  67 |       const secondBounding = await secondCard.boundingBox();
  68 |       
  69 |       await firstCard.dragTo(secondCard);
  70 |       
  71 |       const newFirstCard = videoCards.first();
  72 |       expect(newFirstCard).toBeTruthy();
  73 |     }
  74 |   });
  75 | 
  76 |   test("should combine videos with per-video transitions", async ({ page }) => {
  77 |     await page.goto("/project/1");
  78 |     
  79 |     const combineSection = page.locator("text=Combine Video");
  80 |     await expect(combineSection).toBeVisible();
  81 |     
  82 |     await combineSection.locator('button:has-text("Combine into Final Video")').click();
  83 |     
  84 |     await expect(page.locator("text=Combining...")).toBeVisible();
  85 |   });
  86 | });
```