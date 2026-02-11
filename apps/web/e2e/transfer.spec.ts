
import { test, expect, type Page, type BrowserContext } from '@playwright/test';

test.describe('P2P File Transfer', () => {
    let senderContext: BrowserContext;
    let receiverContext: BrowserContext;
    let senderPage: Page;
    let receiverPage: Page;

    test.beforeEach(async ({ browser }) => {
        // Create two isolated browser contexts
        senderContext = await browser.newContext();
        receiverContext = await browser.newContext();

        senderPage = await senderContext.newPage();
        receiverPage = await receiverContext.newPage();

        // Enable console logging for debugging
        senderPage.on('console', msg => console.log(`[SENDER]: ${msg.text()}`));
        receiverPage.on('console', msg => console.log(`[RECEIVER]: ${msg.text()}`));
    });

    test.afterEach(async () => {
        await senderContext.close();
        await receiverContext.close();
    });


    async function ensureAuthenticated(page: Page, email: string) {
        await page.goto('/auth');
        await page.locator('input[type="email"]').fill(email);
        // Use the password provided by user
        await page.locator('input[type="password"]').fill('testtest');
        await page.getByRole('button', { name: /authenticate/i }).click();
        await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    }

    test('should connect two peers and transfer a file', async () => {
        // Extended timeout for visual mode
        if (process.env.VISUAL) {
            test.setTimeout(180000);
            console.log('[TEST] Visual mode enabled. Starting auth...');
        }

        // 0. Authenticate both users
        await Promise.all([
            ensureAuthenticated(senderPage, '1@test.com'),
            ensureAuthenticated(receiverPage, '2@test.com'),
        ]);
        if (process.env.VISUAL) console.log('[TEST] Auth complete. Navigating to Receive...');

        // 1. Get Receiver's Peer ID from Receiver Page
        await receiverPage.goto('/receive');
        if (process.env.VISUAL) console.log('[TEST] Receiver on /receive');

        // Wait for ID to load
        const receiverIdLocator = receiverPage.locator('[data-testid="my-peer-id"]');
        await expect(receiverIdLocator).toBeVisible({ timeout: 10000 });
        await expect(receiverIdLocator).not.toContainText('Loading');
        const receiverId = await receiverIdLocator.textContent();
        expect(receiverId).toBeTruthy();
        if (process.env.VISUAL) console.log(`[TEST] Receiver ID: ${receiverId}`);

        // 2. Sender goes to "Send" mode
        await senderPage.goto('/send');
        if (process.env.VISUAL) console.log('[TEST] Sender on /send');

        // 3. Sender uploads a file
        // Create a dummy file for testing
        await senderPage.locator('[data-testid="file-input"]').setInputFiles({
            name: 'test-file.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from('Hello P2P World!'),
        });

        // 4. Sender enters Receiver's ID
        const input = senderPage.locator('[data-testid="peer-id-input"]');
        await input.fill((receiverId || '').trim());

        // 5. Sender initiates transfer
        await senderPage.locator('[data-testid="initiate-transfer-button"]').click();
        if (process.env.VISUAL) console.log('[TEST] Transfer initiated');

        // 6. Verify connection and transfer flow
        // Check for potential error messages first
        const errorLocator = senderPage.locator('.text-red-400');
        if (await errorLocator.isVisible()) {
            const errorText = await errorLocator.textContent();
            console.log(`[TEST ERROR]: Sender page showed error: ${errorText}`);
            throw new Error(`Sender page error: ${errorText}`);
        }

        // Sender should show "Connecting..."
        await expect(senderPage.getByRole('heading', { name: /Connecting/i })).toBeVisible({ timeout: 30000 });
        if (process.env.VISUAL) console.log('[TEST] Connection verified');

        // Receiver should get a prompt
        await expect(receiverPage.getByText(/Incoming Transmission/i)).toBeVisible();
        await expect(receiverPage.getByText(/test-file.txt/i).first()).toBeVisible();
        if (process.env.VISUAL) console.log('[TEST] Receiver prompt visible');

        // 7. Receiver accepts the transfer
        await receiverPage.getByRole('button', { name: /accept/i }).click();
        if (process.env.VISUAL) console.log('[TEST] Receiver accepted');

        // 8. Verify transfer completion
        // Both sides should eventually show "Complete"
        await expect(senderPage.getByText(/Transfer complete/i).first()).toBeVisible({ timeout: 30000 });
        await expect(receiverPage.getByText(/Transfer complete/i).first()).toBeVisible({ timeout: 30000 });
        if (process.env.VISUAL) console.log('[TEST] Transfer complete!');

        // Add a pause so the user can see the success state
        if (process.env.VISUAL) {
            await receiverPage.waitForTimeout(5000);
        }
    });
});
