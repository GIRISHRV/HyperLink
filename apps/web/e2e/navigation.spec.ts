import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("landing page → about page via 'How it Works' link", async ({ page, browserName }) => {
    // Firefox needs longer timeout for navigation
    const navigationTimeout = browserName === "firefox" ? 60_000 : 30_000;

    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Wait for the link to be visible before clicking
    const link = page.getByRole("link", { name: /how it works/i }).first();
    await expect(link).toBeVisible({ timeout: 15000 });

    // Use Promise.race to handle Firefox navigation issues
    await Promise.race([link.click(), page.waitForTimeout(1000)]);

    // Wait for navigation by checking URL or content
    try {
      await page.waitForURL("/about", {
        timeout: navigationTimeout,
        waitUntil: "domcontentloaded",
      });
    } catch {
      // Fallback: check if we're on the right page by content
      await expect(page).toHaveURL(/\/about/, { timeout: 5000 });
    }

    await expect(page.getByRole("heading", { name: /how it works/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("landing page → status page via 'Status' link", async ({ page, browserName }) => {
    // Firefox needs longer timeout for navigation
    const navigationTimeout = browserName === "firefox" ? 60_000 : 30_000;

    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Wait for the link to be visible before clicking
    const link = page.getByRole("link", { name: /status/i }).first();
    await expect(link).toBeVisible({ timeout: 15000 });

    // Use Promise.race to handle Firefox navigation issues
    await Promise.race([link.click(), page.waitForTimeout(1000)]);

    // Wait for navigation by checking URL or content
    try {
      await page.waitForURL("/status", {
        timeout: navigationTimeout,
        waitUntil: "domcontentloaded",
      });
    } catch {
      // Fallback: check if we're on the right page by content
      await expect(page).toHaveURL(/\/status/, { timeout: 5000 });
    }

    await expect(page.locator("body")).toContainText(/signaling server/i, { timeout: 10_000 });
  });

  test("landing page → auth page via 'Login' link", async ({ page, browserName }) => {
    // Firefox needs longer timeout for navigation
    const navigationTimeout = browserName === "firefox" ? 60_000 : 30_000;

    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Wait for the link to be visible before clicking
    const link = page.getByRole("link", { name: /login/i }).first();
    await expect(link).toBeVisible({ timeout: 15000 });

    // Use Promise.race to handle Firefox navigation issues
    await Promise.race([link.click(), page.waitForTimeout(1000)]);

    // Wait for navigation by checking URL or content
    try {
      await page.waitForURL("/auth", { timeout: navigationTimeout, waitUntil: "domcontentloaded" });
    } catch {
      // Fallback: check if we're on the right page by content
      await expect(page).toHaveURL(/\/auth/, { timeout: 5000 });
    }

    await expect(page.locator("#auth-email")).toBeVisible({ timeout: 10_000 });
  });
});
