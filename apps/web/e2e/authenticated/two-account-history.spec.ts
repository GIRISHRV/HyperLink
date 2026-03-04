import { test, expect, chromium } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURE_FILE = path.resolve(__dirname, "../fixtures/test-file.txt");
const SENDER_AUTH = path.resolve(__dirname, "../.auth/user.json");
const RECEIVER_AUTH = path.resolve(__dirname, "../.auth/receiver.json");

test("history records correct sender and receiver identities", async () => {
    test.setTimeout(90_000);

    const browser = await chromium.launch();

    // Context 1: Account A (Sender)
    const senderContext = await browser.newContext({
        storageState: SENDER_AUTH,
        baseURL: "http://localhost:3000",
    });

    // Context 2: Account B (Receiver)
    const receiverContext = await browser.newContext({
        storageState: RECEIVER_AUTH,
        baseURL: "http://localhost:3000",
    });

    const senderPage = await senderContext.newPage();
    const receiverPage = await receiverContext.newPage();

    try {
        // ── 1. Receiver gets ready ──
        await receiverPage.goto("http://localhost:3000/receive");
        const copyButton = receiverPage.getByRole("button", { name: /copy/i }).first();
        await expect(copyButton).toBeVisible({ timeout: 20_000 });

        const peerIdElement = receiverPage.getByTestId("my-peer-id");
        await expect(peerIdElement).not.toHaveText("Loading...", { timeout: 10_000 });
        const receiverPeerId = await peerIdElement.textContent();
        expect(receiverPeerId).toBeTruthy();

        // ── 2. Sender prepares file ──
        await senderPage.goto("http://localhost:3000/send");
        const statusSpan = senderPage.locator("span").filter({ hasText: /^(WEBRTC_READY|INITIALIZING)$/ }).first();
        await expect(statusSpan).toBeVisible({ timeout: 20_000 });

        // Use the original small text file for speed
        await senderPage.locator('[data-testid="file-input"]').setInputFiles(FIXTURE_FILE);

        // ── 3. Execute Transfer ──
        const peerInput = senderPage.getByPlaceholder("Enter hash...");
        await expect(peerInput).toBeVisible({ timeout: 5_000 });
        await peerInput.fill(receiverPeerId!.trim());

        const connectBtn = senderPage.getByRole("button", { name: /connect|send|initiate/i }).first();
        await connectBtn.click();

        const acceptBtn = receiverPage.getByRole("button", { name: /accept/i });
        await expect(acceptBtn).toBeVisible({ timeout: 30_000 });
        await acceptBtn.click();

        // Wait for complete on both sides
        await expect(senderPage.getByText(/transfer complete|complete|100%/i).first()).toBeVisible({ timeout: 30_000 });
        await expect(receiverPage.getByText(/transfer complete|complete|download/i).first()).toBeVisible({ timeout: 30_000 });

        // ── 4. Verify History ──
        // Sender verification
        await senderPage.goto("http://localhost:3000/history");
        await expect(senderPage.getByRole("heading", { name: /transfer history/i })).toBeVisible({ timeout: 10_000 });

        // Wait for the table row to appear
        const senderRow = senderPage.getByRole("row").filter({ hasText: "test-file.txt" }).first();
        await expect(senderRow).toBeVisible({ timeout: 10_000 });

        // Verify sender sees "Sent"
        await expect(senderRow).toContainText("Sent");

        // Receiver verification
        await receiverPage.goto("http://localhost:3000/history");
        await expect(receiverPage.getByRole("heading", { name: /transfer history/i })).toBeVisible({ timeout: 10_000 });

        // Wait for the table row to appear
        const receiverRow = receiverPage.getByRole("row").filter({ hasText: "test-file.txt" }).first();
        await expect(receiverRow).toBeVisible({ timeout: 10_000 });

        // Verify receiver sees "Received"
        await expect(receiverRow).toContainText("Received");

        // ── 5. Verify IDs match (Optional strict check) ──
        // Depending on your UI, the Transfer ID might be in a cell or a details modal.
        // Opening details modal to get exact transfer hashes if they exist
        await senderRow.click();
        const senderModalId = await senderPage.getByTestId("transfer-id").textContent();
        await senderPage.keyboard.press("Escape");
        await senderPage.waitForTimeout(500);

        await receiverRow.click();
        const receiverModalId = await receiverPage.getByTestId("transfer-id").textContent();
        await receiverPage.keyboard.press("Escape");

        if (senderModalId && receiverModalId) {
            expect(senderModalId).toEqual(receiverModalId);
        }

        console.log("[TEST] ✅ Two-account history verification complete!");
    } finally {
        await receiverContext.close();
        await senderContext.close();
        await browser.close();
    }
});
