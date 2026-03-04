import { test, expect } from "@playwright/test";

test.describe("Receive Page (authenticated)", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/receive");
    });

    test("loads the receive page", async ({ page }) => {
        await expect(page).toHaveURL("/receive");
    });

    test("shows 'Receive Files' heading", async ({ page }) => {
        await expect(
            page.getByRole("heading", { name: /receive files/i })
        ).toBeVisible();
    });

    test("shows PeerIdCard with own peer ID", async ({ page }) => {
        // PeerIdCard renders after peer initializes — wait up to 10s for it
        const peerIdCard = page.locator("[data-testid='peer-id-card'], .peer-id-card").first();
        // Fallback: look for the copy button which is always inside PeerIdCard
        const copyBtn = page.getByRole("button", { name: /copy/i });
        await expect(copyBtn.or(peerIdCard)).toBeVisible({ timeout: 10_000 });
    });

    test("shows 'Receiver Active' waiting state in incoming queue", async ({
        page,
    }) => {
        await expect(page.getByText(/receiver active/i)).toBeVisible({
            timeout: 10_000,
        });
    });

    test("shows 'Awaiting incoming secure handshake' message", async ({
        page,
    }) => {
        await expect(
            page.getByText(/awaiting incoming secure handshake/i)
        ).toBeVisible({ timeout: 10_000 });
    });

    test("shows QR code button on PeerIdCard", async ({ page }) => {
        const qrButton = page.getByRole("button", { name: /qr/i });
        await expect(qrButton).toBeVisible({ timeout: 10_000 });
    });
});
