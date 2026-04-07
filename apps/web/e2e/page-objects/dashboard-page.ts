import { Page, expect } from "@playwright/test";

/**
 * Interface for transfer items displayed in the dashboard
 */
export interface TransferItem {
  id: string;
  fileName: string;
  fileSize: string;
  status: string;
  direction: "sent" | "received";
  timestamp: string;
  peerId: string;
}

/**
 * Page Object Model for the Dashboard page (/dashboard)
 * Encapsulates all interactions with the dashboard interface
 */
export class DashboardPage {
  constructor(private page: Page) {}

  /**
   * Navigate to the dashboard page
   */
  async goto(): Promise<void> {
    await this.page.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle" });
  }

  /**
   * Get the total data moved statistic
   * @returns Total data moved as a string (e.g., "1.5 GB")
   */
  async getTotalDataMoved(): Promise<string> {
    const dataMovedElement = this.page.locator('[data-testid="total-data-moved"]');
    await expect(dataMovedElement).toBeVisible({ timeout: 10000 });
    const dataText = await dataMovedElement.textContent();
    return dataText?.trim() || "0 B";
  }

  /**
   * Get the total number of transfers
   * @returns Total transfer count
   */
  async getTotalTransfers(): Promise<number> {
    const transferCountElement = this.page.locator('[data-testid="total-transfers"]');
    await expect(transferCountElement).toBeVisible({ timeout: 10000 });
    const countText = await transferCountElement.textContent();
    return parseInt(countText?.trim() || "0");
  }

  /**
   * Get the list of recent transfers displayed on the dashboard
   * @returns Array of transfer items
   */
  async getRecentTransfers(): Promise<TransferItem[]> {
    // Wait for transfers to load
    await this.page.waitForSelector('[data-testid="recent-transfers"]', {
      state: "visible",
      timeout: 10000,
    });

    // Get all transfer items
    const transferElements = await this.page.locator('[data-testid="transfer-item"]').all();

    const transfers: TransferItem[] = [];

    for (const element of transferElements) {
      const id = (await element.getAttribute("data-transfer-id")) || "";
      const fileName = (await element.locator('[data-testid="file-name"]').textContent()) || "";
      const fileSize = (await element.locator('[data-testid="file-size"]').textContent()) || "";
      const status = (await element.locator('[data-testid="transfer-status"]').textContent()) || "";
      const directionText =
        (await element.locator('[data-testid="transfer-direction"]').textContent()) || "";
      const direction = directionText.toLowerCase().includes("sent") ? "sent" : "received";
      const timestamp =
        (await element.locator('[data-testid="transfer-timestamp"]').textContent()) || "";
      const peerId = (await element.locator('[data-testid="peer-id"]').textContent()) || "";

      transfers.push({
        id: id.trim(),
        fileName: fileName.trim(),
        fileSize: fileSize.trim(),
        status: status.trim(),
        direction,
        timestamp: timestamp.trim(),
        peerId: peerId.trim(),
      });
    }

    return transfers;
  }

  /**
   * Navigate to the history page from the dashboard
   */
  async navigateToHistory(): Promise<void> {
    const historyLink = this.page.getByRole("link", { name: /history|view all/i });
    await expect(historyLink).toBeVisible({ timeout: 5000 });
    await historyLink.click();

    // Wait for navigation to complete
    await this.page.waitForURL("**/history", { timeout: 5000 });
  }

  /**
   * Verify that the dashboard statistics have loaded
   */
  async verifyStatsLoaded(): Promise<void> {
    // Wait for stats to load (not showing skeleton loaders)
    await expect(this.page.locator('[data-testid="total-data-moved"]')).toBeVisible({
      timeout: 10000,
    });
    await expect(this.page.locator('[data-testid="total-transfers"]')).toBeVisible({
      timeout: 10000,
    });

    // Verify stats are not in loading state
    await expect(this.page.locator('[data-testid="stats-skeleton"]')).not.toBeVisible({
      timeout: 5000,
    });
  }
}
