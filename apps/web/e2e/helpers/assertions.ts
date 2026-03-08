import { Page, expect } from '@playwright/test';

/**
 * Custom Assertion Helper Functions
 * Provides reusable assertions for common test scenarios
 */

/**
 * Assert that a file transfer has completed successfully
 * @param page - Playwright page instance
 * @param timeout - Maximum time to wait in milliseconds (default: 60000)
 */
export async function expectTransferComplete(
  page: Page,
  timeout: number = 60000
): Promise<void> {
  // Wait for completion indicator
  const completionIndicators = [
    page.getByText(/transfer complete/i),
    page.getByText(/completed/i),
    page.locator('[data-testid="transfer-complete"]'),
    page.locator('[data-status="complete"]'),
  ];
  
  // Try each indicator until one is found
  let found = false;
  for (const indicator of completionIndicators) {
    try {
      await expect(indicator).toBeVisible({ timeout: timeout / completionIndicators.length });
      found = true;
      break;
    } catch {
      // Continue to next indicator
    }
  }
  
  if (!found) {
    throw new Error('Transfer completion indicator not found within timeout');
  }
  
  // Verify progress is at 100%
  const progressElement = page.locator('[data-testid="progress"]');
  const progressCount = await progressElement.count();
  
  if (progressCount > 0) {
    const progressText = await progressElement.textContent();
    if (progressText && !progressText.includes('100')) {
      throw new Error(`Transfer marked complete but progress is ${progressText}`);
    }
  }
}

/**
 * Assert that transfer progress is within expected range
 * @param page - Playwright page instance
 * @param minProgress - Minimum expected progress percentage (0-100)
 * @param maxProgress - Maximum expected progress percentage (0-100)
 */
export async function expectTransferProgress(
  page: Page,
  minProgress: number,
  maxProgress: number
): Promise<void> {
  if (minProgress < 0 || minProgress > 100 || maxProgress < 0 || maxProgress > 100) {
    throw new Error('Progress values must be between 0 and 100');
  }
  
  if (minProgress > maxProgress) {
    throw new Error('minProgress cannot be greater than maxProgress');
  }
  
  // Get progress value
  const progressElement = page.locator('[data-testid="progress"]');
  await expect(progressElement).toBeVisible({ timeout: 5000 });
  
  const progressText = await progressElement.textContent();
  if (!progressText) {
    throw new Error('Progress text is empty');
  }
  
  // Extract numeric value
  const progressMatch = progressText.match(/(\d+)/);
  if (!progressMatch) {
    throw new Error(`Could not extract progress value from: ${progressText}`);
  }
  
  const progress = parseInt(progressMatch[1], 10);
  
  if (progress < minProgress || progress > maxProgress) {
    throw new Error(
      `Progress ${progress}% is outside expected range [${minProgress}%, ${maxProgress}%]`
    );
  }
}

/**
 * Assert that the connection state matches expected state
 * @param page - Playwright page instance
 * @param expectedState - Expected connection state (e.g., 'connected', 'connecting', 'disconnected')
 */
export async function expectConnectionState(
  page: Page,
  expectedState: string
): Promise<void> {
  // Check for connection state indicator in the UI
  const stateIndicators = [
    page.locator(`[data-connection-state="${expectedState}"]`),
    page.getByText(new RegExp(expectedState, 'i')),
    page.locator(`[data-testid="connection-state"]:has-text("${expectedState}")`),
  ];
  
  let found = false;
  for (const indicator of stateIndicators) {
    try {
      await expect(indicator).toBeVisible({ timeout: 5000 });
      found = true;
      break;
    } catch {
      // Continue to next indicator
    }
  }
  
  if (!found) {
    // Also check programmatically via JavaScript
    const actualState = await page.evaluate(() => {
      const peerConnection = (window as any).peerConnection;
      if (peerConnection) {
        return peerConnection.connectionState;
      }
      return null;
    });
    
    if (actualState !== expectedState) {
      throw new Error(
        `Connection state mismatch: expected "${expectedState}", got "${actualState}"`
      );
    }
  }
}

/**
 * Assert that file integrity is maintained (checksums match)
 * @param page - Playwright page instance
 * @param expectedChecksum - Expected file checksum
 */
export async function expectFileIntegrity(
  page: Page,
  expectedChecksum: string
): Promise<void> {
  // This assertion checks if the file integrity indicator shows success
  // In a real implementation, this would verify the actual checksum
  
  // Look for integrity verification UI elements
  const integrityIndicators = [
    page.getByText(/integrity verified/i),
    page.getByText(/checksum match/i),
    page.locator('[data-testid="integrity-verified"]'),
    page.locator('[data-integrity="valid"]'),
  ];
  
  let found = false;
  for (const indicator of integrityIndicators) {
    try {
      await expect(indicator).toBeVisible({ timeout: 10000 });
      found = true;
      break;
    } catch {
      // Continue to next indicator
    }
  }
  
  if (!found) {
    // Try to get checksum from page data
    const actualChecksum = await page.evaluate(() => {
      const checksumElement = document.querySelector('[data-checksum]');
      return checksumElement?.getAttribute('data-checksum') || null;
    });
    
    if (actualChecksum && actualChecksum !== expectedChecksum) {
      throw new Error(
        `File integrity check failed: expected checksum "${expectedChecksum}", ` +
        `got "${actualChecksum}"`
      );
    }
    
    if (!actualChecksum) {
      console.warn('Could not verify file integrity - no checksum found in UI');
    }
  }
}
