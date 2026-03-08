import { Page } from '@playwright/test';

/**
 * WebRTC Helper Functions
 * Provides utilities for WebRTC connection testing
 */

/**
 * Wait for peer connection to be established and return the peer ID
 * @param page - Playwright page instance
 * @param timeout - Maximum time to wait in milliseconds (default: 30000)
 * @returns The peer ID string
 */
export async function waitForPeerConnection(
  page: Page,
  timeout: number = 30000
): Promise<string> {
  // Wait for the peer ID element to be visible
  const peerIdElement = page.locator('[data-testid="my-peer-id"]');
  await peerIdElement.waitFor({ state: 'visible', timeout });
  
  // Get the peer ID text
  const peerId = await peerIdElement.textContent();
  
  if (!peerId || peerId.trim() === '') {
    throw new Error('Peer ID is empty or null');
  }
  
  return peerId.trim();
}

/**
 * Verify the WebRTC connection state matches the expected state
 * @param page - Playwright page instance
 * @param expectedState - Expected RTCPeerConnectionState
 */
export async function verifyConnectionState(
  page: Page,
  expectedState: RTCPeerConnectionState
): Promise<void> {
  // Evaluate the connection state in the browser context
  const actualState = await page.evaluate(() => {
    // Access the global peer connection if available
    const peerConnection = (window as any).peerConnection;
    if (!peerConnection) {
      return null;
    }
    return peerConnection.connectionState;
  });
  
  if (actualState !== expectedState) {
    throw new Error(
      `Connection state mismatch: expected "${expectedState}", got "${actualState}"`
    );
  }
}

/**
 * Simulate a WebRTC connection failure
 * @param page - Playwright page instance
 */
export async function simulateConnectionFailure(page: Page): Promise<void> {
  // Inject script to force connection failure
  await page.evaluate(() => {
    const peerConnection = (window as any).peerConnection;
    if (peerConnection) {
      // Close the connection to simulate failure
      peerConnection.close();
    }
  });
  
  // Wait a bit for the failure to propagate
  await page.waitForTimeout(1000);
}

/**
 * Simulate a network interruption for a specified duration
 * @param page - Playwright page instance
 * @param durationMs - Duration of the interruption in milliseconds
 */
export async function simulateNetworkInterruption(
  page: Page,
  durationMs: number
): Promise<void> {
  // Set network to offline
  await page.context().setOffline(true);
  
  // Wait for the specified duration
  await page.waitForTimeout(durationMs);
  
  // Restore network
  await page.context().setOffline(false);
}

/**
 * Verify that ICE candidates are being generated and exchanged
 * @param page - Playwright page instance
 */
export async function verifyICECandidates(page: Page): Promise<void> {
  // Check if ICE candidates have been gathered
  const hasCandidates = await page.evaluate(() => {
    const peerConnection = (window as any).peerConnection;
    if (!peerConnection) {
      return false;
    }
    
    // Check if local description has ICE candidates
    const localDescription = peerConnection.localDescription;
    if (!localDescription || !localDescription.sdp) {
      return false;
    }
    
    // Check if SDP contains ICE candidate lines
    return localDescription.sdp.includes('a=candidate:');
  });
  
  if (!hasCandidates) {
    throw new Error('No ICE candidates found in peer connection');
  }
}
