import { test, expect } from "@playwright/test";

test.describe("Authentication Flow Regressions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth");
  });

  test("SEC-003: enforce password length", async ({ page }) => {
    await page.click('button:has-text("Sign Up")');
    await page.fill('input[type="email"]', "test-e2e@example.com");
    await page.fill('input[type="password"]', "short");
    await page.click('button[type="submit"]');

    // Wait for the error message to appear
    await expect(page.getByText(/Password must be at least 8 characters/i)).toBeVisible({
      timeout: 5000,
    });
  });
});
