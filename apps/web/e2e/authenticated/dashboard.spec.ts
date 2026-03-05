import { test, expect } from '@playwright/test';

test.describe('Dashboard UI & RPC Stats', () => {
    // Use sequential mode if dealing with DB state, or setup auth state
    test.use({ storageState: 'e2e/.auth/user.json' });

    test.beforeEach(async ({ page }) => {
        await page.goto('/dashboard');
    });

    test('SEC-007: Verify Data Moved stats load successfully', async ({ page }) => {
        // Since we fixed the zero-parameter RPC, this should resolve instead of failing
        const dataMovedLabel = page.locator('text=Total Data Moved');
        await expect(dataMovedLabel).toBeVisible();

        // Ensure the skeleton loaders disappear and a value (even 0 B) is shown
        const statValue = page.locator('[data-testid="data-moved-value"]');
        await expect(statValue).not.toHaveText('0 B', { timeout: 10000 }); // Assuming the test user has data
    });

    test('UI-Audit: History button visibility', async ({ page }) => {
        // We fixed the view-all-history button styling to be visible on dark backgrounds
        const historyBtn = page.locator('a:has-text("View All History")');
        await expect(historyBtn).toBeVisible();

        // Check it navigates correctly
        await historyBtn.click();
        await expect(page).toHaveURL(/.*\/history/);
    });
});
