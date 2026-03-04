import { test, expect } from "@playwright/test";

test.describe("Offline Page", () => {
  test("renders the offline page", async ({ page }) => {
    await page.goto("/offline");
    await expect(page.getByRole("heading", { name: /hyperlink/i })).toBeVisible();
  });

  test("shows offline icon content", async ({ page }) => {
    await page.goto("/offline");
    await expect(page.locator("body")).toContainText(/offline|connection/i);
  });
});
