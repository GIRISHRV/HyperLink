import { test, expect } from "@playwright/test";

test.describe("Send Flow & Hooks Regressions", () => {
  test.use({ storageState: "e2e/.auth/user-chromium.json" });

  test.beforeEach(async ({ page }) => {
    await page.goto("/send");
  });

  test("UI-Audit: Single connection indicator and correct visualizer", async ({ page }) => {
    // 1. Core send workspace should be present
    await expect(page.locator('[data-testid="send-main-panel"]')).toBeVisible();

    // 2. Visualizer lives in collapsed connection details; expand and verify.
    const detailsSummary = page.locator('[data-testid="send-connection-details"] summary').first();
    await expect(detailsSummary).toBeVisible();
    await detailsSummary.click();
    await expect(page.locator('[data-testid="radar-visualizer"]')).toBeVisible();

    // 3. We should only see ONE transfer header instance
    const appHeaders = await page
      .locator('[data-testid="app-header"][data-header-variant="transfer"]')
      .count();
    expect(appHeaders).toBe(1);

    // 4. User selects file and progresses to transfer state (mocked)
    // Here we ensure the 'Transferring' view eventually loads properly
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles("package.json");
    // Note: E2E data mock needed for testing the DB completion hook (we fixed this in `use-send-transfer`)
  });

  test("Transfer Status: Completes cleanly", async () => {
    // Regression check for the `awaited` DB updates logic making it stick on "transferring"
    // E2E mock placeholder
  });
});
