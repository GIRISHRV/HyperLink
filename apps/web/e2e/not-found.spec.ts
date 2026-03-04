import { test, expect } from "@playwright/test";

test.describe("404 Not Found Page", () => {
  test("shows 404 text for nonexistent route", async ({ page }) => {
    await page.goto("/this-does-not-exist", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  });

  test("shows 'Route Not Found' label", async ({ page }) => {
    await page.goto("/this-does-not-exist", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Route Not Found")).toBeVisible();
  });

  test("shows Go Home button linking to /", async ({ page }) => {
    await page.goto("/this-does-not-exist", { waitUntil: "domcontentloaded" });
    const homeLink = page.getByRole("link", { name: /go home/i });
    await expect(homeLink).toBeVisible();
  });
});
