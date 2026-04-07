import { test as setup, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const senderFile = path.join(__dirname, ".auth/user.json");
const receiverFile = path.join(__dirname, ".auth/receiver.json");

setup("authenticate sender", async ({ page, context }) => {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;

  if (!email || !password) {
    throw new Error("E2E_TEST_EMAIL and E2E_TEST_PASSWORD must be set in .env.local");
  }

  // Clear any existing auth state first
  await context.clearCookies();
  await context.clearPermissions();

  // Clear localStorage and sessionStorage
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  await page.goto("/auth", { waitUntil: "domcontentloaded" });

  // Wait for the loading skeleton to disappear (auth check happens first)
  await page.waitForSelector(".animate-pulse", { state: "detached", timeout: 15_000 }).catch(() => {
    // If no skeleton found, that's fine - page might have loaded quickly
  });

  // Wait for the auth form to be ready
  await expect(page.locator("#auth-email")).toBeVisible({ timeout: 15_000 });

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

setup("authenticate receiver", async ({ page, context }) => {
  const email = process.env.E2E_RECEIVER_EMAIL;
  const password = process.env.E2E_RECEIVER_PASSWORD;

  if (!email || !password) {
    throw new Error("E2E_RECEIVER_EMAIL and E2E_RECEIVER_PASSWORD must be set in the environment");
  }

  // Clear any existing auth state first
  await context.clearCookies();
  await context.clearPermissions();

  // Clear localStorage and sessionStorage
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // If the receiver env is the same as the sender, generate a unique receiver email
  let receiverEmail = email;
  if (!receiverEmail) receiverEmail = email; // keep type
  try {
    const senderEmail = process.env.E2E_TEST_EMAIL;
    if (receiverEmail === senderEmail) {
      // generate a unique alias using +receiver and a timestamp
      const parts = receiverEmail.split("@");
      if (parts.length === 2) {
        receiverEmail = `${parts[0]}+receiver.${Date.now()}@${parts[1]}`;
      } else {
        receiverEmail = `${receiverEmail}+receiver.${Date.now()}`;
      }
    }
  } catch {
    // ignore and use provided receiverEmail
  }

  await page.goto("/auth", { waitUntil: "domcontentloaded" });

  // Wait for the loading skeleton to disappear (auth check happens first)
  await page.waitForSelector(".animate-pulse", { state: "detached", timeout: 15_000 }).catch(() => {
    // If no skeleton found, that's fine - page might have loaded quickly
  });

  await expect(page.locator("#auth-email")).toBeVisible({ timeout: 15_000 });

  // Fill in credentials
  await page.locator("#auth-email").fill(receiverEmail as string);
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
