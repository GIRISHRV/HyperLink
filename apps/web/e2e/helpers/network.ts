import { Page } from '@playwright/test';

/**
 * Network Helper Functions
 * Provides utilities for network condition simulation
 */

/**
 * Network condition configuration
 */
export interface NetworkConditions {
  offline: boolean;
  downloadThroughput: number; // bytes/s, -1 for unlimited
  uploadThroughput: number;   // bytes/s, -1 for unlimited
  latency: number;            // milliseconds
}

/**
 * Predefined network condition presets
 */
export const NETWORK_PRESETS = {
  FAST_3G: {
    offline: false,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
    latency: 150,
  },
  SLOW_3G: {
    offline: false,
    downloadThroughput: (500 * 1024) / 8,
    uploadThroughput: (500 * 1024) / 8,
    latency: 400,
  },
  OFFLINE: {
    offline: true,
    downloadThroughput: 0,
    uploadThroughput: 0,
    latency: 0,
  },
  NO_THROTTLE: {
    offline: false,
    downloadThroughput: -1,
    uploadThroughput: -1,
    latency: 0,
  },
} as const;

/**
 * Set custom network conditions
 * @param page - Playwright page instance
 * @param conditions - Network condition configuration
 */
export async function setNetworkConditions(
  page: Page,
  conditions: NetworkConditions
): Promise<void> {
  const context = page.context();
  
  // Set offline state
  await context.setOffline(conditions.offline);
  
  // Set network throttling if not offline
  if (!conditions.offline) {
    const cdpSession = await context.newCDPSession(page);
    
    await cdpSession.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: conditions.downloadThroughput,
      uploadThroughput: conditions.uploadThroughput,
      latency: conditions.latency,
    });
  }
}

/**
 * Simulate a slow network with specified speeds
 * @param page - Playwright page instance
 * @param downloadKbps - Download speed in Kbps
 * @param uploadKbps - Upload speed in Kbps
 */
export async function simulateSlowNetwork(
  page: Page,
  downloadKbps: number,
  uploadKbps: number
): Promise<void> {
  const conditions: NetworkConditions = {
    offline: false,
    downloadThroughput: (downloadKbps * 1024) / 8, // Convert Kbps to bytes/s
    uploadThroughput: (uploadKbps * 1024) / 8,
    latency: 100, // Default latency
  };
  
  await setNetworkConditions(page, conditions);
}

/**
 * Simulate high latency network conditions
 * @param page - Playwright page instance
 * @param latencyMs - Latency in milliseconds
 */
export async function simulateHighLatency(
  page: Page,
  latencyMs: number
): Promise<void> {
  const conditions: NetworkConditions = {
    offline: false,
    downloadThroughput: -1, // Unlimited
    uploadThroughput: -1,   // Unlimited
    latency: latencyMs,
  };
  
  await setNetworkConditions(page, conditions);
}

/**
 * Simulate packet loss by periodically interrupting the connection
 * @param page - Playwright page instance
 * @param lossPercentage - Percentage of packets to lose (0-100)
 */
export async function simulatePacketLoss(
  page: Page,
  lossPercentage: number
): Promise<void> {
  if (lossPercentage < 0 || lossPercentage > 100) {
    throw new Error('Loss percentage must be between 0 and 100');
  }
  
  // Inject script to randomly drop network requests
  await page.route('**/*', (route) => {
    const shouldDrop = Math.random() * 100 < lossPercentage;
    
    if (shouldDrop) {
      route.abort('failed');
    } else {
      route.continue();
    }
  });
}

/**
 * Restore normal network conditions (no throttling)
 * @param page - Playwright page instance
 */
export async function restoreNetwork(page: Page): Promise<void> {
  const context = page.context();
  
  // Restore offline state
  await context.setOffline(false);
  
  // Remove network throttling
  try {
    const cdpSession = await context.newCDPSession(page);
    
    await cdpSession.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0,
    });
  } catch (error) {
    // Ignore errors if CDP session is not available
    console.warn('Could not restore network via CDP:', error);
  }
  
  // Clear any route handlers
  await page.unroute('**/*');
}
