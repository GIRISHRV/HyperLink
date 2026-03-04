import { test, expect } from "@playwright/test";

test.describe("Protected Route Redirects", () => {
  const protectedPaths = ["/dashboard", "/history", "/settings", "/send", "/receive"];

  for (const path of protectedPaths) {
    test(`${path} redirects unauthenticated users to /auth`, async ({ page }) => {
      await page.goto(path);
      // Middleware redirects to /auth?redirect=<path>
      await page.waitForURL(/\/auth/);
      expect(page.url()).toContain("/auth");
    });
  }
});
