import { test, expect, chromium } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURE_FILE = path.resolve(__dirname, "../fixtures/test-file-10mb.bin");
const AUTH_FILE = path.resolve(__dirname, "../.auth/user.json");

/**
 * Full two-browser transfer E2E test.
 *
 * Spins up two independent Chrome contexts from the same saved auth state,
 * one acting as "Receiver" and one as "Sender". Verifies a real file
 * transfer completes end-to-end through the local PeerJS signaling server.
 *
 * Requires:
 *  - Next.js dev/prod server at localhost:3000
 *  - PeerJS signaling server at localhost:9000 (started automatically by
 *    playwright.config.ts webServer[1])
 */
test("complete file transfer between two authenticated peers", async () => {
    // Use longer timeout for full transfer — WebRTC negotiation takes ~5-10s
    test.setTimeout(90_000);

    // Create two independent browser contexts from the same saved auth session
    const browser = await chromium.launch();

    const receiverContext = await browser.newContext({
        storageState: AUTH_FILE,
        baseURL: "http://localhost:3000",
    });
    const senderContext = await browser.newContext({
        storageState: AUTH_FILE,
        baseURL: "http://localhost:3000",
    });

    const receiverPage = await receiverContext.newPage();
    const senderPage = await senderContext.newPage();

    try {
        // ── STEP 1: Receiver opens /receive and waits for WebRTC to initialize ──
        await receiverPage.goto("http://localhost:3000/receive");

        // Wait for the PeerIdCard to appear — means WebRTC peer initialized
        const copyButton = receiverPage.getByRole("button", { name: /copy/i }).first();
        await expect(copyButton).toBeVisible({ timeout: 20_000 });

        // Read the receiver's peer ID using the data-testid
        const peerIdElement = receiverPage.getByTestId("my-peer-id");
        await expect(peerIdElement).not.toHaveText("Loading...", { timeout: 10_000 });
        const receiverPeerId = await peerIdElement.textContent();
        expect(receiverPeerId).toBeTruthy();
        console.log("[TEST] Receiver peer ID:", receiverPeerId);

        // ── STEP 2: Sender opens /send and selects file ──
        await senderPage.goto("http://localhost:3000/send");

        // Wait for WebRTC to initialize on sender side too
        const statusSpan = senderPage
            .locator("span")
            .filter({ hasText: /^(WEBRTC_READY|INITIALIZING)$/ })
            .first();
        await expect(statusSpan).toBeVisible({ timeout: 20_000 });

        // Upload the fixture file
        await senderPage.locator('[data-testid="file-input"]').setInputFiles(FIXTURE_FILE);

        // File name heading should appear in the drop zone / selected file card
        await expect(
            senderPage.getByRole("heading", { name: "test-file-10mb.bin" })
        ).toBeVisible({ timeout: 5_000 });

        // ── STEP 3: Sender enters receiver's peer ID and connects ──
        const peerInput = senderPage.getByPlaceholder("Enter hash...");
        await expect(peerInput).toBeVisible({ timeout: 5_000 });
        await peerInput.fill(receiverPeerId!.trim());

        // Click the connect/send button
        const connectBtn = senderPage.getByRole("button", {
            name: /connect|send|initiate/i,
        }).first();
        await connectBtn.click();

        // ── STEP 4: Receiver sees incoming offer and accepts ──
        const acceptBtn = receiverPage.getByRole("button", { name: /accept/i });
        await expect(acceptBtn).toBeVisible({ timeout: 30_000 });
        await acceptBtn.click();

        // ── STEP 5: Both sides complete ──
        // Sender shows transfer complete state
        await expect(
            senderPage.getByText(/transfer complete|complete|100%/i).first()
        ).toBeVisible({ timeout: 60_000 });

        // Receiver shows transfer complete state
        await expect(
            receiverPage.getByText(/transfer complete|complete|download/i).first()
        ).toBeVisible({ timeout: 60_000 });

        console.log("[TEST] ✅ Full transfer E2E completed successfully");
    } finally {
        await receiverContext.close();
        await senderContext.close();
        await browser.close();
    }
});
