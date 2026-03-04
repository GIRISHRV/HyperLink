import { test, expect } from "@playwright/test";

test.describe("Send Page (authenticated)", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/send");
    });

    test("loads the send page", async ({ page }) => {
        await expect(page).toHaveURL("/send");
    });

    test("shows 'Secure Transfer' heading", async ({ page }) => {
        await expect(
            page.getByRole("heading", { name: /secure transfer/i })
        ).toBeVisible();
    });

    test("shows peer status indicator (WEBRTC_READY or INITIALIZING)", async ({
        page,
    }) => {
        // Use exact span filter to avoid matching terminal log lines
        const statusSpan = page
            .locator("span")
            .filter({ hasText: /^(WEBRTC_READY|INITIALIZING)$/ })
            .first();
        await expect(statusSpan).toBeVisible({ timeout: 10_000 });
    });

    test("shows file drop zone", async ({ page }) => {
        // FileDropZone is a div[role="button"] with aria-label "File drop zone..."
        const dropZone = page.getByRole("button", { name: /file drop zone/i });
        await expect(dropZone).toBeVisible();
    });

    test("shows SendControlPanel after selecting a file", async ({ page }) => {
        await page.locator('[data-testid="file-input"]').setInputFiles({
            name: "test.txt",
            mimeType: "text/plain",
            buffer: Buffer.from("hello world"),
        });

        // SelectedFileCard uses a heading for the filename
        await expect(
            page.getByRole("heading", { name: "test.txt" })
        ).toBeVisible({ timeout: 5_000 });

        // Peer ID input (placeholder: "Enter hash...") visible inside SendControlPanel
        await expect(
            page.getByPlaceholder("Enter hash...")
        ).toBeVisible({ timeout: 5_000 });
    });
});
