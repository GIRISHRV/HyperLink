import { Page, expect } from "@playwright/test";

/**
 * Page Object Model for the Receive page (/receive)
 * Encapsulates all interactions with the file receiving interface
 */
export class ReceivePage {
  constructor(private page: Page) {}

  /**
   * Navigate to the receive page
   */
  async goto(): Promise<void> {
    await this.page.goto("http://localhost:3000/receive", { waitUntil: "networkidle" });
  }

  /**
   * Get the peer ID assigned to this receiver
   * @returns The peer ID string
   */
  async getPeerId(): Promise<string> {
    // Wait for the PeerIdCard to appear
    const copyButton = this.page.getByRole("button", { name: /copy/i }).first();
    await expect(copyButton).toBeVisible({ timeout: 20000 });

    // Read the receiver's peer ID using the data-testid
    const peerIdElement = this.page.getByTestId("my-peer-id");
    await expect(peerIdElement).not.toHaveText("Loading...", { timeout: 30000 });

    const peerId = await peerIdElement.textContent();
    if (!peerId) {
      throw new Error("Failed to retrieve peer ID");
    }

    return peerId.trim();
  }

  /**
   * Accept an incoming transfer offer
   */
  async acceptTransfer(): Promise<void> {
    const acceptBtn = this.page.getByRole("button", { name: /accept/i });
    await expect(acceptBtn).toBeVisible({ timeout: 30000 });
    await acceptBtn.click();
  }

  /**
   * Reject an incoming transfer offer
   */
  async rejectTransfer(): Promise<void> {
    const rejectBtn = this.page.getByRole("button", { name: /reject|decline/i });
    await expect(rejectBtn).toBeVisible({ timeout: 30000 });
    await rejectBtn.click();
  }

  /**
   * Enter the decryption password for an encrypted transfer
   * @param password - The password to decrypt the transfer
   */
  async enterDecryptionPassword(password: string): Promise<void> {
    const passwordInput = this.page.locator("#password-modal-input");
    await expect(passwordInput).toBeVisible({ timeout: 10000 });
    await passwordInput.fill(password);

    // Click decrypt button
    const decryptBtn = this.page.getByRole("button", { name: /decrypt/i });
    await expect(decryptBtn).toBeVisible({ timeout: 5000 });
    await decryptBtn.click();
  }

  /**
   * Pause the ongoing transfer (halt downlink)
   */
  async pauseTransfer(): Promise<void> {
    const pauseBtn = this.page.locator('button:has-text("Pause Transfer")');
    await expect(pauseBtn).toBeVisible({ timeout: 15000 });
    await pauseBtn.click();
  }

  /**
   * Resume a paused transfer
   */
  async resumeTransfer(): Promise<void> {
    const resumeBtn = this.page.locator('button:has-text("Resume Transfer")');
    await expect(resumeBtn).toBeVisible({ timeout: 5000 });
    await resumeBtn.click();
  }

  /**
   * Get the current transfer progress percentage
   * @returns Progress value between 0 and 100
   */
  async getTransferProgress(): Promise<number> {
    const progressElement = this.page.locator('[data-testid="progress"]');
    await expect(progressElement).toBeVisible({ timeout: 5000 });
    const progressText = await progressElement.textContent();
    return parseInt(progressText?.replace("%", "") || "0");
  }

  /**
   * Get the current transfer status
   * @returns Transfer status string
   */
  async getTransferStatus(): Promise<string> {
    const statusElement = this.page.locator('[data-testid="transfer-status"]');
    await expect(statusElement).toBeVisible({ timeout: 5000 });
    const status = await statusElement.textContent();
    return status?.trim() || "";
  }

  /**
   * Download the received file
   */
  async downloadFile(): Promise<void> {
    const downloadBtn = this.page.getByRole("button", { name: /download/i });
    await expect(downloadBtn).toBeVisible({ timeout: 60000 });
    await downloadBtn.click();
  }

  /**
   * Verify that the transfer has completed successfully
   */
  async verifyTransferComplete(): Promise<void> {
    await expect(this.page.getByText(/transfer complete|complete|download/i).first()).toBeVisible({
      timeout: 60000,
    });
  }
}
