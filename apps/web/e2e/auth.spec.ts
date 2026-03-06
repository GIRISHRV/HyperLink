import { test, expect } from '@playwright/test';

test.describe('Authentication Flow Regressions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
  });

  test('SEC-003: enforce password length', async ({ page }) => {
    await page.click('button:has-text("Sign Up")');
    await page.fill('input[type="email"]', 'test-e2e@example.com');
    await page.fill('input[type="password"]', 'short');
    await page.click('button:has-text("Create Account")');

    await expect(page.getByText(/Password must be at least 8 characters/i)).toBeVisible();
  });

  test('SEC-005: generic invalid credential message', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword123');
    await page.getByRole('button', { name: /Authenticate/i }).click();

    // Standard normalized error — timeout raised to 15s for Firefox with slowMo:1000
    await expect(page.getByText(/Invalid email or password\./i)).toBeVisible({ timeout: 15000 });
  });
});
