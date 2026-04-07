import { Page } from "@playwright/test";

/**
 * WebRTC mock utilities for testing connection failures and network conditions
 */
export class WebRTCMock {
  /**
   * Mock WebRTC connection failure
   * Forces the peer connection to fail after 5 seconds
   *
   * @param page - Playwright page instance
   */
  async mockConnectionFailure(page: Page): Promise<void> {
    await page.addInitScript(() => {
      const originalRTCPeerConnection = window.RTCPeerConnection;
      window.RTCPeerConnection = class extends originalRTCPeerConnection {
        constructor(config?: RTCConfiguration) {
          super(config);
          // Force connection to fail after 5 seconds
          setTimeout(() => {
            this.dispatchEvent(new Event("connectionstatechange"));
            Object.defineProperty(this, "connectionState", { value: "failed" });
          }, 5000);
        }
      } as any;
    });
  }

  /**
   * Mock slow WebRTC connection
   * Adds artificial delay to data channel send operations
   *
   * @param page - Playwright page instance
   * @param delayMs - Delay in milliseconds to add to each send operation
   */
  async mockSlowConnection(page: Page, delayMs: number): Promise<void> {
    await page.addInitScript((delay) => {
      const originalCreateDataChannel = RTCPeerConnection.prototype.createDataChannel;
      RTCPeerConnection.prototype.createDataChannel = function (
        label: string,
        dataChannelDict?: RTCDataChannelInit
      ): RTCDataChannel {
        const channel = originalCreateDataChannel.call(this, label, dataChannelDict);
        const originalSend = channel.send;
        channel.send = function (data: any) {
          setTimeout(() => originalSend.call(channel, data), delay);
        };
        return channel;
      };
    }, delayMs);
  }
}
