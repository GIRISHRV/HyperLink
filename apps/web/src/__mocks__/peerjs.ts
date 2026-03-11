/**
 * Shared PeerJS mock for all test files.
 *
 * Usage in tests:
 *   vi.mock("peerjs", () => import("@/__mocks__/peerjs"));
 */
import { vi } from "vitest";

// ---------------------------------------------------------------------------
// MockDataConnection
// ---------------------------------------------------------------------------
export class MockDataConnection {
  open = true;
  peer = "remote-peer-id";
  metadata = {};
  serialization: string = "binary";
  reliable = true;
  label = "mock-label";
  type = "data";
  bufferSize = 0;
  dataChannel = {
    bufferedAmount: 0,
    readyState: "open" as string,
  };
  peerConnection: Record<string, any> = {
    signalingState: "stable" as string,
    iceConnectionState: "connected" as string,
    iceGatheringState: "complete" as string,
    localDescription: { type: "offer", sdp: "" },
    remoteDescription: { type: "answer", sdp: "" },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getStats: vi.fn().mockResolvedValue(new Map()),
  };

  private _events: Record<string, ((...args: unknown[]) => void)[]> = {};
  private _onceEvents: Record<string, ((...args: unknown[]) => void)[]> = {};

  on(event: string, callback: (...args: unknown[]) => void) {
    if (!this._events[event]) this._events[event] = [];
    this._events[event].push(callback);
    return this;
  }

  once(event: string, callback: (...args: unknown[]) => void) {
    if (!this._onceEvents[event]) this._onceEvents[event] = [];
    this._onceEvents[event].push(callback);
    return this;
  }

  off(event: string, callback?: (...args: unknown[]) => void) {
    if (callback) {
      this._events[event] = (this._events[event] || []).filter((cb) => cb !== callback);
      this._onceEvents[event] = (this._onceEvents[event] || []).filter((cb) => cb !== callback);
    } else {
      delete this._events[event];
      delete this._onceEvents[event];
    }
    return this;
  }

  emit(event: string, ...args: unknown[]) {
    (this._events[event] || []).forEach((cb) => cb(...args));
    (this._onceEvents[event] || []).forEach((cb) => cb(...args));
    delete this._onceEvents[event];
  }

  send: any = vi.fn();

  close() {
    this.open = false;
    this.emit("close");
  }
}

// ---------------------------------------------------------------------------
// MockPeer
// ---------------------------------------------------------------------------
export class MockPeer {
  id: string;
  options: unknown;
  open = false;
  connections = {};
  disconnected = false;
  destroyed = false;
  private _events: Record<string, ((...args: unknown[]) => void)[]> = {};

  constructor(id?: string | object, options?: object) {
    if (typeof id === "object") {
      options = id;
      id = undefined;
    }
    this.id = (id as string) || "mock-peer-id";
    this.options = options || {};

    // Auto-emit open after a microtask (controllable with fake timers)
    setTimeout(() => {
      if (!this.destroyed) {
        this.open = true;
        this.emit("open", this.id);
      }
    }, 10);
  }

  on(event: string, callback: (...args: unknown[]) => void) {
    if (!this._events[event]) this._events[event] = [];
    this._events[event].push(callback);
    return this;
  }

  off(event: string, callback?: (...args: unknown[]) => void) {
    if (callback) {
      this._events[event] = (this._events[event] || []).filter((cb) => cb !== callback);
    } else {
      delete this._events[event];
    }
    return this;
  }

  emit(event: string, ...args: unknown[]) {
    (this._events[event] || []).forEach((cb) => cb(...args));
  }

  connect(_id: string, _options?: unknown) {
    return new MockDataConnection();
  }

  disconnect() {
    this.disconnected = true;
    this.emit("disconnected");
  }

  reconnect() {
    this.disconnected = false;
  }

  destroy() {
    this.destroyed = true;
    this.emit("close");
  }
}

// Default export matches `import Peer from "peerjs"`
const PeerConstructor = vi.fn(
  (id?: string | object, options?: object) => new MockPeer(id, options)
);
export default PeerConstructor;
export { MockDataConnection as DataConnection };
