import { test as setup, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const senderFile = path.join(__dirname, ".auth/user.json");
const receiverFile = path.join(__dirname, ".auth/receiver.json");

setup("authenticate sender", async ({ page }) => {
    const email = process.env.E2E_TEST_EMAIL;
    const password = process.env.E2E_TEST_PASSWORD;

    if (!email || !password) {
        throw new Error(
            "E2E_TEST_EMAIL and E2E_TEST_PASSWORD must be set in .env.local"
        );
    }

    await page.goto("/auth");

    // Wait for the auth form to be ready
    await expect(page.locator("#auth-email")).toBeVisible();

    // Fill in credentials
    await page.locator("#auth-email").fill(email);
    await page.locator("#auth-password").fill(password);

    // Submit the form
    await page.getByRole("button", { name: /authenticate/i }).click();

    // Wait for redirect to dashboard after successful login
    await page.waitForURL("/dashboard", { timeout: 15_000 });
    await expect(page).toHaveURL("/dashboard");

    // Save the authenticated state
    await page.context().storageState({ path: senderFile });
});

setup("authenticate receiver", async ({ page }) => {
    // Generate derived credentials for the receiver
    const baseEmail = process.env.E2E_TEST_EMAIL || "";
    const password = process.env.E2E_TEST_PASSWORD;

    if (!baseEmail || !password) {
        throw new Error("E2E_TEST_EMAIL and E2E_TEST_PASSWORD must be set");
    }

    // Create a deterministic receiver email by injecting "-receiver"
    const [user, domain] = baseEmail.split("@");
    const email = `${user}-receiver@${domain}`;

    await page.goto("/auth");
    await expect(page.locator("#auth-email")).toBeVisible();

    // Fill in credentials
    await page.locator("#auth-email").fill(email);
    await page.locator("#auth-password").fill(password);

    // Try normal login
    await page.getByRole("button", { name: /authenticate/i }).click();

    // If login fails (e.g. account doesn't exist yet), switch to Sign Up
    const errorMsg = page.locator("text=Invalid email or password");
    try {
        await expect(errorMsg).toBeVisible({ timeout: 3000 });
        // Account might not exist, let's sign up
        await page.getByRole("button", { name: /Sign Up/i }).click();
        await page.locator("#auth-password").fill(password); // re-fill just in case
        await page.getByRole("button", { name: /Create Account/i }).click();
    } catch {
        // Did not fail normal login, proceed as usual
    }

    // Wait for redirect to dashboard after successful login/signup
    await page.waitForURL("/dashboard", { timeout: 15_000 });
    await expect(page).toHaveURL("/dashboard");

    // Save the authenticated state
    await page.context().storageState({ path: receiverFile });
});
