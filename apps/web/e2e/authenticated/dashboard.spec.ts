import { test, expect } from '@playwright/test';

test.describe('Dashboard UI & RPC Stats', () => {
    // Use sequential mode if dealing with DB state, or setup auth state
    test.use({ storageState: 'e2e/.auth/user.json' });

    test.beforeEach(async ({ page }) => {
        await page.goto('/dashboard');
    });

    test('SEC-007: Verify Data Moved stats load successfully', async ({ page }) => {
        // Wait for skeleton loaders to disappear (loading state to complete)
        await page.waitForSelector('.animate-pulse', { state: 'detached', timeout: 10000 }).catch(() => {
            // If no skeleton found, that's fine - page may have loaded quickly
        });

        // Verify the "Total Data Moved" label is visible
        const dataMovedLabel = page.locator('text=Total Data Moved');
        await expect(dataMovedLabel).toBeVisible();

        // Wait for the stat value to be visible and contain actual data
        const statValue = page.locator('[data-testid="data-moved-value"]');
        await expect(statValue).toBeVisible({ timeout: 10000 });
        
        // Verify the value is not empty and contains a valid size format (e.g., "195.72 MB", "0 B", etc.)
        await expect(statValue).toHaveText(/\d+(\.\d+)?\s*(B|KB|MB|GB|TB)/i, { timeout: 10000 });
    });

    test('UI-Audit: History button visibility', async ({ page }) => {
        // Wait for page to fully load
        await page.waitForLoadState('domcontentloaded');
        
        // Target the "View All History" button specifically (not the nav link)
        // This button is in the Recent Activity section of the dashboard
        const historyBtn = page.locator('a[href="/history"]:has-text("View All History")');
        await expect(historyBtn).toBeVisible({ timeout: 10000 });

        // Verify the button text contains "View All History"
        await expect(historyBtn).toHaveText(/View All History/);
    });
});
