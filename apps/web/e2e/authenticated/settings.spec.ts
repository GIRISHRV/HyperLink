import { test, expect } from "@playwright/test";

const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? "playwright-test@hyperlink.app";

test.describe("Settings Page (authenticated)", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/settings");
    });

    test("loads the settings page", async ({ page }) => {
        await expect(page).toHaveURL("/settings");
    });

    test("shows 'Settings' heading", async ({ page }) => {
        await expect(
            page.getByRole("heading", { name: /^settings/i })
        ).toBeVisible();
    });

    test("display name input is visible and editable", async ({ page }) => {
        const input = page.locator("#settings-display-name");
        await expect(input).toBeVisible();
        await expect(input).toBeEditable();
    });

    test("email input shows test account email and is read-only", async ({
        page,
    }) => {
        const emailInput = page.locator("#settings-email");
        await expect(emailInput).toBeVisible();
        await expect(emailInput).toHaveValue(TEST_EMAIL);
        await expect(emailInput).toBeDisabled();
    });

    test("avatar icon grid renders", async ({ page }) => {
        // Avatar section heading
        await expect(page.getByText(/avatar icon/i)).toBeVisible();
        // At least one icon button present
        const firstIconBtn = page.locator("button span.material-symbols-outlined").first();
        await expect(firstIconBtn).toBeVisible();
    });

    test("Save Changes button is visible", async ({ page }) => {
        await expect(
            page.getByRole("button", { name: /save changes/i })
        ).toBeVisible();
    });

    test("can update display name and save", async ({ page }) => {
        const input = page.locator("#settings-display-name");
        await input.fill("Playwright Test User");
        await page.getByRole("button", { name: /save changes/i }).click();
        // "Saving..." appears immediately — reliable without network timing
        await expect(
            page.getByRole("button", { name: /saving/i })
        ).toBeVisible({ timeout: 3_000 });
        // Eventually returns to rest state
        await expect(
            page.getByRole("button", { name: /save changes|saved!/i })
        ).toBeVisible({ timeout: 10_000 });
    });

    test("Sign Out button redirects to /auth", async ({ page }) => {
        await page.getByRole("button", { name: /sign out/i }).click();
        await expect(page).toHaveURL("/auth", { timeout: 10_000 });
    });
});
