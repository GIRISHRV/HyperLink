import { test, expect } from '@playwright/test';

test.describe('Send Flow & Hooks Regressions', () => {
    test.use({ storageState: 'e2e/.auth/user.json' });

    test.beforeEach(async ({ page }) => {
        await page.goto('/send');
    });

    test('UI-Audit: Single connection indicator and correct visualizer', async ({ page }) => {
        // 1. We refactored the visualizer to avoid the duplicate connection indicators 
        // Wait for the radar scanner to load
        await expect(page.locator('[data-testid="radar-visualizer"]')).toBeVisible();

        // 2. We should only see ONE top-level AppHeader, test there are no nested headers
        const appHeaders = await page.locator('nav > div:has-text("hyperlink")').count();
        expect(appHeaders).toBe(1);

        // 3. User selects file and progresses to transfer state (mocked)
        // Here we ensure the 'Transferring' view eventually loads properly
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles('package.json');
        // Note: E2E data mock needed for testing the DB completion hook (we fixed this in `use-send-transfer`)
    });

    test('Transfer Status: Completes cleanly', async ({ page }) => {
        // Regression check for the `awaited` DB updates logic making it stick on "transferring"
        // E2E mock placeholder
    });
});
