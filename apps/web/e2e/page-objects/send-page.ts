import { Page, expect } from "@playwright/test";

/**
 * Page Object Model for the Send page (/send)
 * Encapsulates all interactions with the file sending interface
 */
export class SendPage {
  constructor(private page: Page) {}

  /**
   * Navigate to the send page
   */
  async goto(): Promise<void> {
    await this.page.goto("http://localhost:3000/send", { waitUntil: "networkidle" });
  }

  /**
   * Select a single file for transfer
   * @param filePath - Absolute path to the file to select
   */
  async selectFile(filePath: string): Promise<void> {
    await this.page.locator('[data-testid="file-input"]').setInputFiles(filePath);
    // Wait for file to be selected and displayed
    await this.page.waitForSelector('[data-testid="selected-file"]', { 
      state: "visible",
      timeout: 5000 
    });
  }

  /**
   * Select multiple files for transfer
   * @param filePaths - Array of absolute paths to files to select
   */
  async selectMultipleFiles(filePaths: string[]): Promise<void> {
    await this.page.locator('[data-testid="file-input"]').setInputFiles(filePaths);
    // Wait for files to be selected and displayed
    await this.page.waitForSelector('[data-testid="selected-file"]', { 
      state: "visible",
      timeout: 5000 
    });
  }

  /**
   * Enter the receiver's peer ID
   * @param peerId - The peer ID to connect to
   */
  async enterReceiverPeerId(peerId: string): Promise<void> {
    const peerInput = this.page.getByPlaceholder("Enter hash...");
    await expect(peerInput).toBeVisible({ timeout: 5000 });
    await peerInput.fill(peerId.trim());
  }

  /**
   * Set an encryption password for the transfer
   * @param password - The password to use for encryption
   */
  async setEncryptionPassword(password: string): Promise<void> {
    // Open password modal
    await this.page.getByRole("button", { name: /set encryption password/i }).click();
    
    // Enter password
    const passwordInput = this.page.locator("#password-modal-input");
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
    await passwordInput.fill(password);
    
    // Confirm password
    await this.page.getByRole("button", { name: /set password/i }).click();
    
    // Verify encryption badge appears
    await expect(this.page.getByTestId("encryption-status-badge")).toBeVisible({ timeout: 5000 });
  }

  /**
   * Initiate the file transfer
   */
  async initiateTransfer(): Promise<void> {
    const connectBtn = this.page.getByRole("button", {
      name: /connect|send|initiate/i,
    }).first();
    await expect(connectBtn).toBeVisible({ timeout: 5000 });
    await connectBtn.click();
  }

  /**
   * Pause the ongoing transfer
   */
  async pauseTransfer(): Promise<void> {
    const pauseBtn = this.page.locator('button:has-text("Pause")');
    await expect(pauseBtn).toBeVisible({ timeout: 15000 });
    await pauseBtn.click();
  }

  /**
   * Resume a paused transfer
   */
  async resumeTransfer(): Promise<void> {
    const resumeBtn = this.page.locator('button:has-text("Resume")');
    await expect(resumeBtn).toBeVisible({ timeout: 5000 });
    await resumeBtn.click();
  }

  /**
   * Cancel the ongoing transfer
   */
  async cancelTransfer(): Promise<void> {
    // Click abort button
    const abortBtn = this.page.getByRole("button", { name: /abort/i });
    await expect(abortBtn).toBeVisible({ timeout: 15000 });
    await abortBtn.click();
    
    // Confirm cancellation in modal
    const confirmBtn = this.page.getByRole("button", { name: /cancel transfer/i });
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();
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
   * Verify that the transfer has completed successfully
   */
  async verifyTransferComplete(): Promise<void> {
    await expect(
      this.page.getByText(/transfer complete|complete|100%/i).first()
    ).toBeVisible({ timeout: 60000 });
  }
}
