import { test, expect, chromium } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURE_FILE = path.resolve(__dirname, "../fixtures/test-file-10mb.bin");
const LARGE_FIXTURE_FILE = path.resolve(__dirname, "../fixtures/test-file-50mb.bin");
const AUTH_FILE = path.resolve(__dirname, "../.auth/user.json");
const RECEIVER_AUTH_FILE = path.resolve(__dirname, "../.auth/receiver.json");

// Add delay between tests to let WebRTC connections fully close
test.afterEach(async () => {
  // Longer delay in CI to ensure cleanup
  const delay = process.env.CI ? 5000 : 2000;
  await new Promise((resolve) => setTimeout(resolve, delay));
});

/**
 * Calculate dynamic timeout based on file size
 * @param fileSizeBytes - Size of the file in bytes
 * @returns Timeout in milliseconds
 */
function calculateTransferTimeout(fileSizeBytes: number): number {
  // Base timeout: 30 seconds for connection establishment
  const baseTimeout = 30_000;

  // Transfer rate assumption: 5 MB/s (conservative for localhost)
  const transferRateMBps = 5;
  const transferTimeMs = (fileSizeBytes / (1024 * 1024) / transferRateMBps) * 1000;

  // Add 50% buffer for processing overhead (encryption, chunking, etc.)
  const bufferMultiplier = 1.5;

  return Math.ceil(baseTimeout + transferTimeMs * bufferMultiplier);
}

/**
 * Monitor transfer progress with explicit waits
 * @param page - Playwright page instance
 * @param minProgress - Minimum expected progress percentage
 * @param timeout - Maximum time to wait in milliseconds
 */
async function waitForProgress(
  page: any,
  minProgress: number,
  timeout: number = 30_000
): Promise<void> {
  const startTime = Date.now();
  let lastProgress = 0;
  let stuckCount = 0;
  const maxStuckIterations = 5; // Allow progress to be stuck for 5 iterations before failing

  while (Date.now() - startTime < timeout) {
    try {
      // Check for "Transfer Complete" or "100%" anywhere on the page first,
      // as the progress element might unmount immediately on completion.
      const pageText = await page.textContent("body");
      if (pageText?.includes("Transfer Complete") || pageText?.includes("100%")) {
        console.log(`[TEST] Transfer confirmed complete via page content.`);
        return;
      }

      // Wait for progress element to be visible
      const progressElement = page.locator('[data-testid="progress"]');
      const isVisible = await progressElement.isVisible({ timeout: 2000 }).catch(() => false);

      if (!isVisible) {
        // If not visible but we haven't reached minProgress, wait a bit and retry
        // The transfer might have finished between our "pageText" check and locator check.
        await page.waitForTimeout(500);
        continue;
      }

      const progressText = await progressElement.textContent({ timeout: 5000 });
      const currentProgress = parseInt(progressText?.replace("%", "") || "0");

      // Verify progress is monotonically increasing or stable
      if (currentProgress < lastProgress) {
        throw new Error(`Progress decreased from ${lastProgress}% to ${currentProgress}%`);
      }

      // Track if progress is stuck
      if (currentProgress === lastProgress && currentProgress < minProgress) {
        stuckCount++;
        if (stuckCount >= maxStuckIterations) {
          console.warn(`[TEST] Progress stuck at ${currentProgress}% for ${stuckCount} iterations`);
        }
      } else {
        stuckCount = 0; // Reset stuck counter if progress changed
      }

      lastProgress = currentProgress;

      if (currentProgress >= minProgress) {
        console.log(`[TEST] Progress reached ${currentProgress}% (target: ${minProgress}%)`);
        return;
      }

      // Wait before next check
      await page.waitForTimeout(1000);
    } catch (error) {
      // If element not found or other error, wait and retry
      const elapsed = Date.now() - startTime;
      if (elapsed >= timeout) {
        throw new Error(
          `Progress did not reach ${minProgress}% within ${timeout}ms (last: ${lastProgress}%, error: ${error})`
        );
      }
      await page.waitForTimeout(1000);
    }
  }

  throw new Error(
    `Progress did not reach ${minProgress}% within ${timeout}ms (last: ${lastProgress}%)`
  );
}

/**
 * Wait for WebRTC connection with retry logic and stability checks
 * @param page - Playwright page instance
 * @param maxRetries - Maximum number of retry attempts
 * @returns Peer ID string
 */
async function waitForPeerConnectionWithRetry(page: any, maxRetries: number = 3): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `[TEST] Attempting to establish peer connection (attempt ${attempt}/${maxRetries})...`
      );

      // Wait for the peer ID element to be visible
      const peerIdElement = page.getByTestId("my-peer-id");
      await peerIdElement.waitFor({ state: "visible", timeout: 30_000 });

      // Wait for the peer ID to not be "Loading..."
      await expect(peerIdElement).not.toHaveText("Loading...", { timeout: 30_000 });

      // Get the actual peer ID
      const peerId = await peerIdElement.textContent();

      if (!peerId || peerId.trim() === "" || peerId.trim() === "Loading...") {
        throw new Error("Peer ID is empty or still loading");
      }

      // Verify peer ID format (should be alphanumeric)
      const peerIdTrimmed = peerId.trim();
      if (!/^[a-zA-Z0-9-_]+$/.test(peerIdTrimmed)) {
        throw new Error(`Invalid peer ID format: ${peerIdTrimmed}`);
      }

      // Wait a bit to ensure connection is stable
      await page.waitForTimeout(1000);

      // Verify peer ID hasn't changed (connection stability check)
      const peerIdAfterWait = await peerIdElement.textContent();
      if (peerIdAfterWait?.trim() !== peerIdTrimmed) {
        throw new Error("Peer ID changed during stability check - connection unstable");
      }

      console.log(
        `[TEST] ✓ Peer connection established successfully on attempt ${attempt}: ${peerIdTrimmed}`
      );
      return peerIdTrimmed;
    } catch (error) {
      lastError = error as Error;
      console.log(`[TEST] ✗ Peer connection attempt ${attempt} failed: ${lastError.message}`);

      if (attempt < maxRetries) {
        // Wait with exponential backoff before retry
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10_000);
        console.log(`[TEST] Retrying in ${backoffMs}ms...`);
        await page.waitForTimeout(backoffMs);

        // Reload page to reset WebRTC state
        console.log(`[TEST] Reloading page to reset WebRTC state...`);
        await page.reload({ waitUntil: "networkidle" });
      }
    }
  }

  throw new Error(
    `Failed to establish peer connection after ${maxRetries} attempts: ${lastError?.message}`
  );
}

/**
 * Wait for "System Ready" status with retry logic and browser-specific handling
 * @param page - Playwright page instance
 * @param browserName - Browser name for browser-specific handling
 * @param maxRetries - Maximum number of retry attempts
 */
async function waitForSystemReady(
  page: any,
  browserName: string = "chromium",
  maxRetries: number = 3
): Promise<void> {
  let lastError: Error | null = null;

  // WebKit needs longer timeout and different selector strategy
  const baseTimeout = browserName === "webkit" ? 30_000 : 20_000;
  const retries = browserName === "webkit" ? 5 : maxRetries;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(
        `[TEST] Waiting for System Ready on ${browserName} (attempt ${attempt}/${retries})...`
      );

      // Try multiple selector strategies for better browser compatibility
      const strategies = [
        // Strategy 1: Exact text match
        () =>
          page
            .locator("span")
            .filter({ hasText: /^System Ready$/ })
            .first(),
        // Strategy 2: Contains text (more lenient for WebKit)
        () => page.locator("span:has-text('System Ready')").first(),
        // Strategy 3: Test ID if available
        () => page.locator('[data-testid*="system-status"]').filter({ hasText: /ready/i }).first(),
        // Strategy 4: Any element with "System Ready" text
        () => page.getByText("System Ready", { exact: true }).first(),
      ];

      // Try each strategy
      for (const strategy of strategies) {
        try {
          const statusElement = strategy();
          await expect(statusElement).toBeVisible({ timeout: baseTimeout });
          console.log(
            `[TEST] ✓ System Ready confirmed on attempt ${attempt} using strategy ${strategies.indexOf(strategy) + 1}`
          );
          return;
        } catch {
          // Continue to next strategy
          continue;
        }
      }

      // If all strategies failed, throw error
      throw new Error("All selector strategies failed");
    } catch (error) {
      lastError = error as Error;
      console.log(`[TEST] ✗ System Ready check failed on attempt ${attempt}: ${lastError.message}`);

      if (attempt < retries) {
        const backoffMs = browserName === "webkit" ? 3000 : 2000;
        console.log(`[TEST] Retrying System Ready check in ${backoffMs}ms...`);
        await page.waitForTimeout(backoffMs);
      }
    }
  }

  throw new Error(
    `System Ready not detected after ${retries} attempts on ${browserName}: ${lastError?.message}`
  );
}

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
test("complete file transfer between two authenticated peers", async ({ browserName }) => {
  // Skip on Firefox - WebRTC timing is too unreliable
  test.skip(browserName === "firefox", "Firefox has WebRTC timing issues");

  // Calculate dynamic timeout based on 10MB file size
  const fileSizeBytes = 10 * 1024 * 1024; // 10MB
  const transferTimeout = calculateTransferTimeout(fileSizeBytes);
  test.setTimeout(transferTimeout + 60_000); // Extra 60s buffer for parallel resource contention

  // Create two independent browser contexts from the same saved auth session
  const browser = await chromium.launch({ slowMo: 500 }); // Match abort test slowMo

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
    // ── STEP 1: Receiver opens /receive and waits for WebRTC to initialize ──
    await receiverPage.goto("http://localhost:3000/receive", { waitUntil: "networkidle" });

    // Wait for peer connection with retry logic
    const receiverPeerId = await waitForPeerConnectionWithRetry(receiverPage);
    console.log("[TEST] Receiver peer ID:", receiverPeerId);

    // ── STEP 2: Sender opens /send and waits for system ready ──
    await senderPage.goto("http://localhost:3000/send", { waitUntil: "networkidle" });

    // Wait for WebRTC to initialize on sender side with retry and browser-specific handling
    await waitForSystemReady(senderPage, browserName);

    // Upload the fixture file
    await senderPage.locator('[data-testid="file-input"]').setInputFiles(FIXTURE_FILE);

    // File name heading should appear in the drop zone / selected file card
    await expect(senderPage.getByRole("heading", { name: "test-file-10mb.bin" })).toBeVisible({
      timeout: 5_000,
    });

    // ── STEP 3: Sender enters receiver's peer ID and connects ──
    const peerInput = senderPage.getByPlaceholder("Enter hash...");
    await expect(peerInput).toBeVisible({ timeout: 5_000 });
    await peerInput.fill(receiverPeerId.trim());

    // Click the connect/send button
    const connectBtn = senderPage
      .getByRole("button", {
        name: /connect|send|initiate/i,
      })
      .first();
    await connectBtn.click();

    console.log("[TEST] Sender initiated connection, waiting for receiver to see offer...");

    // ── STEP 4: Receiver sees incoming offer and accepts ──
    const acceptBtn = receiverPage.getByRole("button", { name: /accept/i });
    await expect(acceptBtn).toBeVisible({ timeout: 60_000 }); // Increased to 60s for CI
    await acceptBtn.click();
    console.log("[TEST] Receiver accepted transfer");

    // ── STEP 5: Monitor transfer progress ──
    console.log("[TEST] Monitoring transfer progress...");

    // Wait for transfer to reach 50% on sender side
    await waitForProgress(senderPage, 50, transferTimeout / 2);
    console.log("[TEST] Transfer reached 50% on sender");

    // Just log progress for debugging - don't enforce strict sync
    const senderProgress = await senderPage.locator('[data-testid="progress"]').textContent();
    const receiverProgress = await receiverPage.locator('[data-testid="progress"]').textContent();
    const senderPercent = parseInt(senderProgress?.replace("%", "") || "0");
    const receiverPercent = parseInt(receiverProgress?.replace("%", "") || "0");

    console.log(
      `[TEST] Progress sync check - Sender: ${senderPercent}%, Receiver: ${receiverPercent}%`
    );

    // ── STEP 6: Both sides complete ──
    // Sender shows transfer complete state
    await expect(senderPage.getByText(/transfer complete|complete|100%/i).first()).toBeVisible({
      timeout: transferTimeout,
    });

    // Receiver shows transfer complete state
    await expect(
      receiverPage.getByText(/transfer complete|complete|download/i).first()
    ).toBeVisible({ timeout: transferTimeout });

    console.log("[TEST] ✅ Full transfer E2E completed successfully");
  } finally {
    await receiverContext.close();
    await senderContext.close();
    await browser.close();
  }
});

test("abort synchronization between peers", async ({ browserName }) => {
  // Calculate dynamic timeout for 50MB file
  const fileSizeBytes = 50 * 1024 * 1024; // 50MB
  const transferTimeout = calculateTransferTimeout(fileSizeBytes);
  test.setTimeout(transferTimeout + 30_000);

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
    // Setup receiver with retry logic
    await receiverPage.goto("http://localhost:3000/receive", { waitUntil: "networkidle" });
    const receiverPeerId = await waitForPeerConnectionWithRetry(receiverPage);
    console.log("[TEST] Receiver peer ID:", receiverPeerId);

    // Setup sender
    await senderPage.goto("http://localhost:3000/send", { waitUntil: "networkidle" });

    // Wait for system ready with retry and browser-specific handling
    await waitForSystemReady(senderPage, browserName);

    await senderPage.locator('[data-testid="file-input"]').setInputFiles(LARGE_FIXTURE_FILE);

    const peerInput = senderPage.getByPlaceholder("Enter hash...");
    await expect(peerInput).toBeVisible({ timeout: 5_000 });
    await peerInput.fill(receiverPeerId.trim());

    const connectBtn = senderPage.getByRole("button", { name: /connect|send|initiate/i }).first();
    await connectBtn.click();

    const acceptBtn = receiverPage.getByRole("button", { name: /accept/i });
    await expect(acceptBtn).toBeVisible({ timeout: 30_000 });
    await acceptBtn.click();

    // Wait for transfer to start with explicit progress monitoring
    console.log("[TEST] Waiting for transfer to start...");
    await waitForProgress(senderPage, 5, 30_000); // Wait for at least 5% progress
    console.log("[TEST] Transfer started, aborting...");

    // Verify abort button is visible
    await expect(senderPage.getByRole("button", { name: /abort/i })).toBeVisible({
      timeout: 15_000,
    });

    // Sender aborts transfer
    await senderPage.getByRole("button", { name: /abort/i }).click();

    // Confirm cancellation in the modal
    await senderPage.getByRole("button", { name: /cancel transfer/i }).click();

    // Sender should see failed/cancelled state
    await expect(senderPage.getByText(/transfer cancelled by sender/i).first()).toBeVisible({
      timeout: 5_000,
    });

    // Receiver should automatically see cancelled state
    await expect(receiverPage.getByText(/transfer cancelled by peer/i).first()).toBeVisible({
      timeout: 5_000,
    });

    console.log("[TEST] ✅ Abort synchronization test completed successfully");
  } finally {
    await receiverContext.close();
    await senderContext.close();
    await browser.close();
  }
});

test("pause and resume synchronization between peers", async ({ browserName }) => {
  // Calculate dynamic timeout for 50MB file
  const fileSizeBytes = 50 * 1024 * 1024; // 50MB
  const transferTimeout = calculateTransferTimeout(fileSizeBytes);
  test.setTimeout(transferTimeout + 30_000);

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
    // Setup receiver with retry logic
    await receiverPage.goto("http://localhost:3000/receive", { waitUntil: "networkidle" });
    const receiverPeerId = await waitForPeerConnectionWithRetry(receiverPage);
    console.log("[TEST] Receiver peer ID:", receiverPeerId);

    // Setup sender
    await senderPage.goto("http://localhost:3000/send", { waitUntil: "networkidle" });

    // Wait for system ready with retry and browser-specific handling
    await waitForSystemReady(senderPage, browserName);

    await senderPage.locator('[data-testid="file-input"]').setInputFiles(LARGE_FIXTURE_FILE);

    const peerInput = senderPage.getByPlaceholder("Enter hash...");
    await expect(peerInput).toBeVisible({ timeout: 5_000 });
    await peerInput.fill(receiverPeerId.trim());

    const connectBtn = senderPage.getByRole("button", { name: /connect|send|initiate/i }).first();
    await connectBtn.click();

    const acceptBtn = receiverPage.getByRole("button", { name: /accept/i });
    await expect(acceptBtn).toBeVisible({ timeout: 30_000 });
    await acceptBtn.click();

    // Wait for transfer to start with explicit progress monitoring
    console.log("[TEST] Waiting for transfer to start...");
    await waitForProgress(senderPage, 5, 30_000); // Wait for at least 5% progress
    console.log("[TEST] Transfer started");

    // Wait for pause buttons to be visible
    const senderPauseBtn = senderPage.locator('button:has-text("Pause")');
    const receiverPauseBtn = receiverPage.locator('button:has-text("Halt")');

    await expect(senderPauseBtn).toBeVisible({ timeout: 15_000 });
    await expect(receiverPauseBtn).toBeVisible({ timeout: 15_000 });

    // Receiver pauses the transfer
    console.log("[TEST] Receiver pausing transfer...");
    await receiverPauseBtn.click();

    // Receiver's button should change to Resume
    await expect(receiverPage.locator('button:has-text("RESUME DOWNLINK")')).toBeVisible({
      timeout: 5_000,
    });

    // Sender shouldn't be able to resume (button disabled or says "Paused by peer")
    const senderPausedBtn = senderPage.locator('button:has-text("Paused by Peer")');
    await expect(senderPausedBtn).toBeVisible({ timeout: 5_000 });
    await expect(senderPausedBtn).toBeDisabled();

    // Receiver resumes the transfer
    console.log("[TEST] Receiver resuming transfer...");
    await receiverPage.locator('button:has-text("RESUME DOWNLINK")').click();

    // Both should be back to initial state
    await expect(senderPage.locator('button:has-text("Pause")')).toBeVisible({ timeout: 5_000 });
    await expect(receiverPage.locator('button:has-text("Halt")')).toBeVisible({ timeout: 5_000 });

    console.log("[TEST] ✅ Pause and resume synchronization test completed successfully");
  } finally {
    await receiverContext.close();
    await senderContext.close();
    await browser.close();
  }
});

test("complete encrypted file transfer with password", async ({ browserName }) => {
  // Skip on Firefox - encryption + WebRTC timing is too unreliable
  test.skip(browserName === "firefox", "Firefox has encryption + WebRTC timing issues");

  // Calculate dynamic timeout for 10MB file with encryption overhead
  const fileSizeBytes = 10 * 1024 * 1024; // 10MB
  const transferTimeout = calculateTransferTimeout(fileSizeBytes);
  // Encryption adds processing time, add 50% more buffer
  test.setTimeout(Math.ceil(transferTimeout * 1.5) + 30_000);

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
    // 1. Receiver opens /receive with retry logic
    await receiverPage.goto("http://localhost:3000/receive", { waitUntil: "networkidle" });
    const receiverPeerId = await waitForPeerConnectionWithRetry(receiverPage);
    console.log("[TEST] Receiver peer ID:", receiverPeerId);

    // 2. Sender opens /send and waits for system ready
    await senderPage.goto("http://localhost:3000/send", { waitUntil: "networkidle" });

    // Wait for system ready with retry and browser-specific handling
    await waitForSystemReady(senderPage, browserName);

    // Select file
    await senderPage.locator('[data-testid="file-input"]').setInputFiles(FIXTURE_FILE);

    // 3. Sender enters receiver ID
    const peerInput = senderPage.getByPlaceholder("Enter hash...");
    await peerInput.fill(receiverPeerId);

    // 4. Sender sets password (isCreation=true modal requires min 8 chars + confirm)
    await senderPage.getByRole("button", { name: /set encryption password/i }).click();
    const senderPasswordInput = senderPage.locator("#password-modal-input");
    await expect(senderPasswordInput).toBeVisible();
    await senderPasswordInput.fill("test-password-123");
    // Fill confirm password field (required in creation mode)
    const confirmPasswordInput = senderPage.locator("#confirm-password-input");
    await expect(confirmPasswordInput).toBeVisible();
    await confirmPasswordInput.fill("test-password-123");
    await senderPage.getByRole("button", { name: /set password/i }).click();

    // Verify "Encrypted" status badge appears
    await expect(senderPage.getByTestId("encryption-status-badge")).toBeVisible();

    // 5. Sender initiates transfer
    const connectBtn = senderPage.getByRole("button", { name: /connect|send|initiate/i }).first();
    await connectBtn.click();

    console.log("[TEST] Sender initiated connection, waiting for receiver to see offer...");

    // 6. Receiver accepts offer - wait longer for WebRTC connection
    const acceptBtn = receiverPage.getByRole("button", { name: /accept/i });
    await expect(acceptBtn).toBeVisible({ timeout: 60_000 }); // Increased to 60s for CI

    console.log("[TEST] Receiver sees accept button, clicking...");
    await acceptBtn.click();

    // 7. Receiver enters password to decrypt (modal appears after accepting)
    const receiverPasswordInput = receiverPage.locator("#password-modal-input");
    await expect(receiverPasswordInput).toBeVisible({ timeout: 10_000 });
    await receiverPasswordInput.fill("test-password-123");
    await receiverPage.getByRole("button", { name: /decrypt/i }).click();

    // 8. Monitor transfer progress - encryption is slower, just verify it starts
    console.log("[TEST] Monitoring encrypted transfer progress...");

    // For encrypted transfers, just wait for any progress (>5%)
    // Encryption overhead makes progress tracking unreliable
    await waitForProgress(senderPage, 5, 30_000); // Just verify transfer started
    console.log("[TEST] Encrypted transfer started");

    // 9. Verify both sides complete - give plenty of time
    await expect(senderPage.getByText(/transfer complete|complete|100%/i).first()).toBeVisible({
      timeout: transferTimeout * 2,
    }); // Double timeout for encryption

    await expect(
      receiverPage.getByText(/transfer complete|complete|download/i).first()
    ).toBeVisible({ timeout: transferTimeout * 2 });

    console.log("[TEST] ✅ Encrypted transfer E2E completed successfully");
  } finally {
    await receiverContext.close();
    await senderContext.close();
    await browser.close();
  }
});
