import { Page } from "@playwright/test";
import { readFile } from "fs/promises";
import { join } from "path";

/**
 * Authentication Helper Functions
 * Provides utilities for test user management and authentication state
 */

/**
 * Create a test user (placeholder - actual implementation depends on auth system)
 * @param email - User email
 * @param password - User password
 */
export async function createTestUser(email: string, password: string): Promise<void> {
  // This is a placeholder implementation
  // In a real scenario, this would call the authentication API
  // to create a test user in the database
  console.log(`Creating test user: ${email} with password: ${password.replace(/./g, "*")}`);

  // TODO: Implement actual user creation via API
  // Example:
  // await fetch('http://localhost:3000/api/auth/create-test-user', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ email, password })
  // });
}

/**
 * Delete a test user (placeholder - actual implementation depends on auth system)
 * @param email - User email to delete
 */
export async function deleteTestUser(email: string): Promise<void> {
  // This is a placeholder implementation
  // In a real scenario, this would call the authentication API
  // to delete the test user from the database
  console.log(`Deleting test user: ${email}`);

  // TODO: Implement actual user deletion via API
  // Example:
  // await fetch('http://localhost:3000/api/auth/delete-test-user', {
  //   method: 'DELETE',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ email })
  // });
}

/**
 * Get the authentication state file path for a user type
 * @param userType - Type of user ('sender' or 'receiver')
 * @returns Path to the authentication state file
 */
export async function getAuthState(userType: "sender" | "receiver"): Promise<string> {
  const fileName = userType === "sender" ? "user.json" : "receiver.json";
  const authStatePath = join(process.cwd(), "apps/web/e2e/.auth", fileName);

  // Verify the file exists by attempting to read it
  try {
    await readFile(authStatePath, "utf-8");
    return authStatePath;
  } catch {
    throw new Error(
      `Authentication state file not found: ${authStatePath}. ` + "Please run auth.setup.ts first."
    );
  }
}

/**
 * Verify that the page has valid authentication state
 * @param page - Playwright page instance
 * @returns True if authenticated, false otherwise
 */
export async function verifyAuthState(page: Page): Promise<boolean> {
  try {
    // Check for authentication indicators in the page
    // This could be checking for cookies, localStorage, or specific UI elements

    // Method 1: Check for authentication cookie
    const cookies = await page.context().cookies();
    const hasAuthCookie = cookies.some(
      (cookie) =>
        cookie.name.includes("auth") ||
        cookie.name.includes("session") ||
        cookie.name.includes("token")
    );

    if (hasAuthCookie) {
      return true;
    }

    // Method 2: Check localStorage for auth tokens
    const hasAuthToken = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      return keys.some(
        (key) =>
          key.includes("auth") ||
          key.includes("session") ||
          key.includes("token") ||
          key.includes("supabase")
      );
    });

    if (hasAuthToken) {
      return true;
    }

    // Method 3: Check for authenticated UI elements
    // Try to find elements that only appear when authenticated
    const authenticatedElements = [
      '[data-testid="user-menu"]',
      '[data-testid="logout-button"]',
      'button:has-text("Sign out")',
      'button:has-text("Logout")',
    ];

    for (const selector of authenticatedElements) {
      const element = page.locator(selector);
      const count = await element.count();
      if (count > 0) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("Error verifying auth state:", error);
    return false;
  }
}
