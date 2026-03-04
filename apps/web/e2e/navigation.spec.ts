import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("landing page → about page via 'How it Works' link", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /how it works/i }).first().click();
    await page.waitForURL("/about");
    await expect(page.getByRole("heading", { name: /how it works/i })).toBeVisible();
  });

  test("landing page → status page via 'Status' link", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /status/i }).first().click();
    await page.waitForURL("/status");
    await expect(page.locator("body")).toContainText(/signaling server/i);
  });

  test("landing page → auth page via 'Login' link", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /login/i }).first().click();
    await page.waitForURL("/auth");
    await expect(page.locator("#auth-email")).toBeVisible();
  });
});
