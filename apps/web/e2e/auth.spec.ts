import { test, expect } from "@playwright/test";

test.describe("Auth Page", () => {
  test("renders the auth form with email input", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.locator("#auth-email")).toBeVisible();
  });

  test("renders password input by default (not magic-link mode)", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.locator("#auth-password")).toBeVisible();
  });

  test("shows 'Authenticate' submit button text by default", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByRole("button", { name: /authenticate/i })).toBeVisible();
  });

  test("shows 'Authentication Portal' label", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByText("Authentication Portal")).toBeVisible();
  });

  test("shows 'Access Network' heading in sign-in mode", async ({ page }) => {
    await page.goto("/auth");
    const heading = page.getByRole("heading", { name: /access.*network/i });
    await expect(heading).toBeVisible();
  });
});
