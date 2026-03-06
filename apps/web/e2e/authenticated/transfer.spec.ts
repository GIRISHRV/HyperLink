import { test, expect, chromium } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURE_FILE = path.resolve(__dirname, "../fixtures/test-file-10mb.bin");
const LARGE_FIXTURE_FILE = path.resolve(__dirname, "../fixtures/test-file-50mb.bin");
const AUTH_FILE = path.resolve(__dirname, "../.auth/user.json");
const RECEIVER_AUTH_FILE = path.resolve(__dirname, "../.auth/receiver.json");

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
    const browser = await chromium.launch({ slowMo: 1000 });

    const receiverContext = await browser.newContext({
        storageState: RECEIVER_AUTH_FILE,
        baseURL: "http://localhost:3000",
        recordVideo: { dir: "test-results/transfer-videos/receiver/" }
    });
    const senderContext = await browser.newContext({
        storageState: AUTH_FILE,
        baseURL: "http://localhost:3000",
        recordVideo: { dir: "test-results/transfer-videos/sender/" }
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
        await expect(peerIdElement).not.toHaveText("Loading...", { timeout: 30_000 });
        const receiverPeerId = await peerIdElement.textContent();
        expect(receiverPeerId).toBeTruthy();
        console.log("[TEST] Receiver peer ID:", receiverPeerId);

        // ── STEP 2: Sender opens /send and selects file ──
        await senderPage.goto("http://localhost:3000/send");

        // Wait for WebRTC to initialize on sender side too
        const statusSpan = senderPage
            .locator("span")
            .filter({ hasText: /^System Ready$/ })
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

test("abort synchronization between peers", async () => {
    test.setTimeout(120_000);
    // Use 50MB fixture so the transfer is still in progress when we assert the abort button.
    const browser = await chromium.launch({ slowMo: 1000 });

    const receiverContext = await browser.newContext({
        storageState: RECEIVER_AUTH_FILE,
        baseURL: "http://localhost:3000",
    });
    const senderContext = await browser.newContext({
        storageState: AUTH_FILE,
        baseURL: "http://localhost:3000",
    });

    const receiverPage = await receiverContext.newPage();
    const senderPage = await senderContext.newPage();

    try {
        await receiverPage.goto("http://localhost:3000/receive");
        const peerIdElement = receiverPage.getByTestId("my-peer-id");
        await expect(peerIdElement).not.toHaveText("Loading...", { timeout: 30_000 });
        const receiverPeerId = await peerIdElement.textContent();

        await senderPage.goto("http://localhost:3000/send");
        await senderPage.locator('[data-testid="file-input"]').setInputFiles(LARGE_FIXTURE_FILE);

        const peerInput = senderPage.getByPlaceholder("Enter hash...");
        await expect(peerInput).toBeVisible({ timeout: 5_000 });
        await peerInput.fill(receiverPeerId!.trim());

        const connectBtn = senderPage.getByRole("button", { name: /connect|send|initiate/i }).first();
        await connectBtn.click();

        const acceptBtn = receiverPage.getByRole("button", { name: /accept/i });
        await expect(acceptBtn).toBeVisible({ timeout: 30_000 });
        await acceptBtn.click();

        // Wait for transfer to start (progress bar or pause/abort buttons appear)
        await expect(senderPage.getByRole("button", { name: /abort/i })).toBeVisible({ timeout: 15_000 });

        // Sender aborts transfer
        await senderPage.getByRole("button", { name: /abort/i }).click();

        // Confirm cancellation in the modal
        await senderPage.getByRole("button", { name: /cancel transfer/i }).click();

        // Sender should see failed/cancelled state
        await expect(senderPage.getByText(/transfer cancelled by sender/i).first()).toBeVisible({ timeout: 5_000 });

        // Receiver should automatically see cancelled state
        await expect(receiverPage.getByText(/transfer cancelled by peer/i).first()).toBeVisible({ timeout: 5_000 });

    } finally {
        await receiverContext.close();
        await senderContext.close();
        await browser.close();
    }
});

test("pause and resume synchronization between peers", async () => {
    test.setTimeout(120_000);
    // Use 50MB fixture so the transfer is still in progress when we assert the pause button.
    const browser = await chromium.launch({ slowMo: 1000 });

    const receiverContext = await browser.newContext({
        storageState: RECEIVER_AUTH_FILE,
        baseURL: "http://localhost:3000",
    });
    const senderContext = await browser.newContext({
        storageState: AUTH_FILE,
        baseURL: "http://localhost:3000",
    });

    const receiverPage = await receiverContext.newPage();
    const senderPage = await senderContext.newPage();

    try {
        await receiverPage.goto("http://localhost:3000/receive");
        const peerIdElement = receiverPage.getByTestId("my-peer-id");
        await expect(peerIdElement).not.toHaveText("Loading...", { timeout: 30_000 });
        const receiverPeerId = await peerIdElement.textContent();

        await senderPage.goto("http://localhost:3000/send");
        await senderPage.locator('[data-testid="file-input"]').setInputFiles(LARGE_FIXTURE_FILE);

        const peerInput = senderPage.getByPlaceholder("Enter hash...");
        await expect(peerInput).toBeVisible({ timeout: 5_000 });
        await peerInput.fill(receiverPeerId!.trim());

        const connectBtn = senderPage.getByRole("button", { name: /connect|send|initiate/i }).first();
        await connectBtn.click();

        const acceptBtn = receiverPage.getByRole("button", { name: /accept/i });
        await expect(acceptBtn).toBeVisible({ timeout: 30_000 });
        await acceptBtn.click();

        // Wait for transfer to start
        const senderPauseBtn = senderPage.locator('button:has-text("Pause")');
        const receiverPauseBtn = receiverPage.locator('button:has-text("Halt")');

        await expect(senderPauseBtn).toBeVisible({ timeout: 15_000 });

        // Receiver pauses the transfer
        await receiverPauseBtn.click();

        // Receiver's button should change to Resume
        await expect(receiverPage.locator('button:has-text("RESUME DOWNLINK")')).toBeVisible({ timeout: 5_000 });

        // Sender shouldn't be able to resume (button disabled or says "Paused by peer")
        const senderPausedBtn = senderPage.locator('button:has-text("Paused by Peer")');
        await expect(senderPausedBtn).toBeVisible({ timeout: 5_000 });
        await expect(senderPausedBtn).toBeDisabled();

        // Receiver resumes the transfer
        await receiverPage.locator('button:has-text("RESUME DOWNLINK")').click();

        // Both should be back to initial state
        await expect(senderPage.locator('button:has-text("Pause")')).toBeVisible({ timeout: 5_000 });
        await expect(receiverPage.locator('button:has-text("Halt")')).toBeVisible({ timeout: 5_000 });

    } finally {
        await receiverContext.close();
        await senderContext.close();
        await browser.close();
    }
});

test("complete encrypted file transfer with password", async () => {
    test.setTimeout(120_000); // Encryption adds processing time
    const browser = await chromium.launch({ slowMo: 500 });

    const receiverContext = await browser.newContext({
        storageState: RECEIVER_AUTH_FILE,
        baseURL: "http://localhost:3000",
    });
    const senderContext = await browser.newContext({
        storageState: AUTH_FILE,
        baseURL: "http://localhost:3000",
    });

    const receiverPage = await receiverContext.newPage();
    const senderPage = await senderContext.newPage();

    try {
        // 1. Receiver opens /receive
        await receiverPage.goto("http://localhost:3000/receive");
        const peerIdElement = receiverPage.getByTestId("my-peer-id");
        await expect(peerIdElement).not.toHaveText("Loading...", { timeout: 30_000 });
        const receiverPeerId = (await peerIdElement.textContent())?.trim();

        // 2. Sender opens /send and selects file
        await senderPage.goto("http://localhost:3000/send");
        await senderPage.locator('[data-testid="file-input"]').setInputFiles(FIXTURE_FILE);

        // 3. Sender enters receiver ID
        const peerInput = senderPage.getByPlaceholder("Enter hash...");
        await peerInput.fill(receiverPeerId!);

        // 4. Sender sets password
        await senderPage.getByRole("button", { name: /set encryption password/i }).click();
        const senderPasswordInput = senderPage.locator("#password-modal-input");
        await expect(senderPasswordInput).toBeVisible();
        await senderPasswordInput.fill("test-password-123");
        await senderPage.getByRole("button", { name: /set password/i }).click();

        // Verify "Encrypted" status badge appears
        await expect(senderPage.getByTestId("encryption-status-badge")).toBeVisible();

        // 5. Sender initiates transfer
        const connectBtn = senderPage.getByRole("button", { name: /connect|send|initiate/i }).first();
        await connectBtn.click();

        // 6. Receiver accepts offer
        const acceptBtn = receiverPage.getByRole("button", { name: /accept/i });
        await expect(acceptBtn).toBeVisible({ timeout: 30_000 });
        await acceptBtn.click();

        // 7. Receiver enters password to decrypt
        const receiverPasswordInput = receiverPage.locator("#password-modal-input");
        await expect(receiverPasswordInput).toBeVisible({ timeout: 10_000 });
        await receiverPasswordInput.fill("test-password-123");
        await receiverPage.getByRole("button", { name: /decrypt/i }).click();

        // 8. Verify both sides complete
        await expect(
            senderPage.getByText(/transfer complete|complete|100%/i).first()
        ).toBeVisible({ timeout: 60_000 });

        await expect(
            receiverPage.getByText(/transfer complete|complete|download/i).first()
        ).toBeVisible({ timeout: 60_000 });

        console.log("[TEST] ✅ Encrypted transfer E2E completed successfully");
    } finally {
        await receiverContext.close();
        await senderContext.close();
        await browser.close();
    }
});
