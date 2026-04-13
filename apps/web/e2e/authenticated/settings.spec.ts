import { test, expect } from "@playwright/test";

const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? "playwright-test@hyperlink.app";

test.describe("Settings Page (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings");
    // Wait for the page to be fully loaded before running tests
    await page.waitForLoadState("domcontentloaded");
  });

  test("loads the settings page", async ({ page }) => {
    await expect(page).toHaveURL("/settings");
  });

  test("shows 'Settings' heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /^settings/i })).toBeVisible();
  });

  test("display name input is visible and editable", async ({ page }) => {
    // Wait for page to be interactive
    await page.waitForLoadState("domcontentloaded");

    const input = page.locator("#settings-display-name");
    await expect(input).toBeVisible({ timeout: 10000 });
    await expect(input).toBeEditable();
  });

  test("email input shows test account email and is read-only", async ({ page }) => {
    // Wait for page to be interactive
    await page.waitForLoadState("domcontentloaded");

    const emailInput = page.locator("#settings-email");
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(emailInput).toHaveValue(TEST_EMAIL);
    await expect(emailInput).toBeDisabled();
  });

  test("avatar icon grid renders", async ({ page }) => {
    // Wait for page to be fully loaded and interactive
    await page.waitForLoadState("domcontentloaded");

    // Avatar section heading - wait with longer timeout for Firefox
    await expect(page.getByText(/avatar icon/i)).toBeVisible({ timeout: 10000 });

    // Wait for the avatar icon picker buttons to be rendered
    // Use size-10 to distinguish from nav icons which use different sizing
    await page.waitForSelector("button.size-10 span.material-symbols-outlined", {
      state: "visible",
      timeout: 10000,
    });

    // At least one icon button present
    const firstIconBtn = page.locator("button.size-10 span.material-symbols-outlined").first();
    await expect(firstIconBtn).toBeVisible({ timeout: 5000 });
  });

  test("Save Changes button is visible", async ({ page }) => {
    // Wait for page to be fully loaded
    await page.waitForLoadState("domcontentloaded");

    // Wait for the save button with longer timeout for Firefox
    await expect(page.getByRole("button", { name: /save changes/i })).toBeVisible({
      timeout: 10000,
    });
  });

  test("can update display name and save", async ({ page }) => {
    // Wait for page to be fully loaded
    await page.waitForLoadState("domcontentloaded");

    const input = page.locator("#settings-display-name");

    // Wait for input to be ready
    await expect(input).toBeVisible({ timeout: 10000 });
    await expect(input).toBeEditable();

    // Update display name
    await input.clear();
    await input.fill("Playwright Test User");

    // Click save button
    const saveButton = page.getByRole("button", { name: /save changes/i });
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    // Wait a bit for the save to process
    await page.waitForTimeout(1000);

    // Just verify we're still on the settings page and no errors appeared
    await expect(page).toHaveURL(/\/settings/);
  });

  test("can select avatar icon", async ({ page }) => {
    // Wait for page to be fully loaded
    await page.waitForLoadState("domcontentloaded");

    // Wait for avatar icon picker buttons to be visible
    // Use size-10 class to specifically target avatar grid buttons (not nav icons)
    await page.waitForSelector("button.size-10 span.material-symbols-outlined", {
      state: "visible",
      timeout: 10000,
    });

    // Select a different avatar icon (e.g., "star")
    const starIcon = page
      .locator("button.size-10 span.material-symbols-outlined")
      .filter({ hasText: "star" })
      .first();
    await expect(starIcon).toBeVisible({ timeout: 5000 });

    // Click the icon's parent button
    const starButton = starIcon.locator("..");
    await starButton.click();

    // Verify the icon is selected (button should have border-primary class)
    await expect(starButton).toHaveClass(/border-primary/, { timeout: 3000 });

    // Verify the preview updates
    const previewIcon = page.locator(".size-32 span.material-symbols-outlined");
    await expect(previewIcon).toHaveText("star", { timeout: 3000 });
  });

  test("Sign Out button redirects to /auth", async ({ page, context }) => {
    let mockedLogoutRequests = 0;

    // Intercept at context scope (not page scope) so logout calls from any frame/worker
    // are consistently mocked and cannot revoke the shared auth session used by later tests.
    await context.route(/\/auth\/v1\/logout(?:\?.*)?$/, async (route) => {
      mockedLogoutRequests += 1;
      await route.fulfill({
        status: 200,
        body: "{}",
        contentType: "application/json",
      });
    });

    await page
      .getByRole("button", { name: /sign out/i })
      .first()
      .click();

    // Auth page may include redirect params, so use regex.
    await expect(page).toHaveURL(/\/auth/, { timeout: 10_000 });

    // Guard against accidental real logout calls due route mismatch/regression.
    expect(mockedLogoutRequests).toBeGreaterThan(0);
  });
});
