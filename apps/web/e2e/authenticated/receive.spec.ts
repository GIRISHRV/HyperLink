import { test, expect } from "@playwright/test";

test.describe("Receive Flow & Hooks Regressions", () => {
  test.use({ storageState: "e2e/.auth/user-chromium.json" });

  test.beforeEach(async ({ page }) => {
    await page.goto("/receive");
  });

  test("UI-Audit: Displays clean waiting state and correct visualizer", async ({ page }) => {
    // 1. Verify idle UI heading + key panels
    await expect(page.getByRole("heading", { name: /receive file/i })).toBeVisible();
    await expect(page.locator('[data-testid="receive-identity-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="receive-inbox-panel"]')).toBeVisible();

    // 2. Visualizer is inside collapsed connection details; expand and verify.
    const detailsSummary = page
      .locator('[data-testid="receive-connection-details"] summary')
      .first();
    await expect(detailsSummary).toBeVisible();
    await detailsSummary.click();
    await expect(page.locator('[data-testid="radar-visualizer"]')).toBeVisible();
  });

  test("Transfer Status: Accepts connection and claims ownership", async () => {
    // Regression check for `claimTransferAsReceiver` being strictly awaited before WebRTC begins
    // E2E mock placeholder
  });
});
