import { test, expect } from "@playwright/test";

test.describe("About Page", () => {
  test("renders the about page heading", async ({ page }) => {
    await page.goto("/about");
    const heading = page.getByRole("heading", { name: /how it works/i });
    await expect(heading).toBeVisible();
  });

  test("shows WebRTC explanation text", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByText(/peer-to-peer file transfer/i)).toBeVisible();
  });

  test("renders the AppHeader", async ({ page }) => {
    await page.goto("/about");
    // HyperLink logo in the header
    await expect(page.locator("header").getByRole("link", { name: /hyperlink/i })).toBeVisible();
  });
});
