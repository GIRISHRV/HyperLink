import { test, expect } from "@playwright/test";

test.describe("Dashboard (authenticated)", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/dashboard");
    });

    test("loads the dashboard page", async ({ page }) => {
        await expect(page).toHaveURL("/dashboard");
    });

    test("shows Send File card", async ({ page }) => {
        await expect(
            page.getByRole("heading", { name: /send file/i })
        ).toBeVisible();
    });

    test("shows Receive File card", async ({ page }) => {
        await expect(
            page.getByRole("heading", { name: /receive file/i })
        ).toBeVisible();
    });

    test("shows Lifetime Data stats card", async ({ page }) => {
        await expect(page.getByText(/lifetime data/i)).toBeVisible();
    });

    test("shows Recent Activity section", async ({ page }) => {
        await expect(page.getByText(/recent activity/i)).toBeVisible();
    });

    test("'Go to Send' navigates to /send", async ({ page }) => {
        await page.getByRole("link", { name: /go to send/i }).click();
        await expect(page).toHaveURL("/send");
    });

    test("'Go to Receive' navigates to /receive", async ({ page }) => {
        await page.goto("/dashboard");
        await page.getByRole("link", { name: /go to receive/i }).click();
        await expect(page).toHaveURL("/receive");
    });

    test("'View All History' navigates to /history", async ({ page }) => {
        await page.goto("/dashboard");
        await page.getByRole("link", { name: /view all history/i }).click();
        await expect(page).toHaveURL("/history");
    });
});
