import { test, expect } from "@playwright/test";

test.describe("History Page (authenticated)", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/history");
    });

    test("loads the history page", async ({ page }) => {
        await expect(page).toHaveURL("/history");
    });

    test("shows 'Transfer History' heading", async ({ page }) => {
        await expect(
            page.getByRole("heading", { name: /transfer history/i })
        ).toBeVisible();
    });

    test("shows filter buttons", async ({ page }) => {
        await expect(page.getByRole("button", { name: /all transfers/i })).toBeVisible();
        await expect(page.getByRole("button", { name: /^sent$/i })).toBeVisible();
        await expect(page.getByRole("button", { name: /^received$/i })).toBeVisible();
        await expect(page.getByRole("button", { name: /completed/i })).toBeVisible();
        await expect(page.getByRole("button", { name: /failed/i })).toBeVisible();
    });

    test("'All Transfers' filter is active by default", async ({ page }) => {
        const allBtn = page.getByRole("button", { name: /all transfers/i });
        // Active filter has bg-primary (yellow) — check via class or aria-pressed
        await expect(allBtn).toHaveClass(/bg-primary/);
    });

    test("shows transfer table with column headers", async ({ page }) => {
        // Use role-based selectors to avoid strict-mode violations
        await expect(page.getByRole("columnheader", { name: "File" })).toBeVisible();
        await expect(page.getByRole("columnheader", { name: "Size" })).toBeVisible();
        await expect(page.getByRole("columnheader", { name: "Status" })).toBeVisible();
        await expect(page.getByRole("columnheader", { name: "Date" })).toBeVisible();
    });

    test("shows either transfer rows or empty state", async ({ page }) => {
        // Wait for loading to finish
        const emptyHeading = page.getByRole("heading", { name: /no transfers found/i });
        // Skeletons have 'animate-pulse', so we exclude them
        const tableRow = page.locator("tbody tr:not(.animate-pulse)").first();
        await expect(emptyHeading.or(tableRow)).toBeVisible({ timeout: 10_000 });
    });

    test("clicking 'Sent' filter updates active button", async ({ page }) => {
        await page.getByRole("button", { name: /^sent$/i }).click();
        const sentBtn = page.getByRole("button", { name: /^sent$/i });
        await expect(sentBtn).toHaveClass(/bg-primary/);
    });

    test("clicking 'Received' filter updates active button", async ({ page }) => {
        await page.getByRole("button", { name: /^received$/i }).click();
        const receivedBtn = page.getByRole("button", { name: /^received$/i });
        await expect(receivedBtn).toHaveClass(/bg-primary/);
    });
});
