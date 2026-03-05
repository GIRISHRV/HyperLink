import { test, expect } from '@playwright/test';

test.describe('Receive Flow & Hooks Regressions', () => {
    test.use({ storageState: 'e2e/.auth/user.json' });

    test.beforeEach(async ({ page }) => {
        await page.goto('/receive');
    });

    test('UI-Audit: Displays clean waiting state and correct visualizer', async ({ page }) => {
        // 1. Verify idle UI without duplicated visual elements
        await expect(page.locator('text=Ready to Receive')).toBeVisible();
        await expect(page.locator('[data-testid="radar-visualizer"]')).toBeVisible();

        // Ensure no overlapping connection bubbles
        const peerBubbles = await page.locator('.rounded-full.bg-bauhaus-blue').count();
        expect(peerBubbles).toBe(1); // Should just be the receiver itself
    });

    test('Transfer Status: Accepts connection and claims ownership', async () => {
        // Regression check for `claimTransferAsReceiver` being strictly awaited before WebRTC begins
        // E2E mock placeholder 
    });
});
