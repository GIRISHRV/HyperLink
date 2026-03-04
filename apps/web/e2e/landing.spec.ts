import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("renders hero headline and tagline", async ({ page }) => {
    await page.goto("/");
    const heroHeading = page.getByRole("heading", { name: /secure/i });
    await expect(heroHeading).toContainText("Secure");
    await expect(heroHeading).toContainText("Direct");
    await expect(heroHeading).toContainText("Fast");
  });

  test("shows WebRTC status indicator", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("WebRTC Ready")).toBeVisible();
  });

  test("renders SEND and RECEIVE action blocks", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("SEND", { exact: true })).toBeVisible();
    await expect(page.getByText("RECEIVE", { exact: true })).toBeVisible();
  });

  test("renders three feature cards", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("End-to-End Encrypted")).toBeVisible();
    await expect(page.getByText("WebRTC Speed")).toBeVisible();
    await expect(page.getByText("No File Limits")).toBeVisible();
  });

  test("SEND block links to /auth for unauthenticated users", async ({ page }) => {
    await page.goto("/");
    const sendLink = page.locator('a:has-text("SEND")').first();
    await expect(sendLink).toHaveAttribute("href", "/auth");
  });

  test("RECEIVE block links to /auth for unauthenticated users", async ({ page }) => {
    await page.goto("/");
    const receiveLink = page.locator('a:has-text("RECEIVE")').first();
    await expect(receiveLink).toHaveAttribute("href", "/auth");
  });
});
