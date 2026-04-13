import { test, expect } from "@playwright/test";

test.describe("Authentication Flow Regressions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth");
  });

  test("SEC-003: enforce password length", async ({ page }) => {
    await page.getByRole("button", { name: /new here\? create account/i }).click();
    await page.fill('input[type="email"]', "test-e2e@example.com");
    await page.fill('input[type="password"]', "short");
    await page.getByRole("button", { name: /create account/i }).click();

    // Wait for the error message to appear
    await expect(page.getByText(/Password must be at least 8 characters/i)).toBeVisible({
      timeout: 5000,
    });
  });
});
