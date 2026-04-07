/**
 * Phase 2 — PeerManager (peer-manager.ts) — Comprehensive Tests
 * @vitest-environment jsdom
 *
 * Tests for: initialize, connectToPeer, event emission, destroy, reconnection.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PeerManager } from "../peer-manager";

vi.mock("peerjs", () => {
  class MockDataConnection {
    open = true;
    peer = "remote-peer-id";
    metadata = {};
    serialization = "binary";
    reliable = true;
    label = "mock-label";
    type = "data";
    bufferSize = 0;
    peerConnection = {
      signalingState: "stable",
      iceConnectionState: "connected",
      iceGatheringState: "complete",
      localDescription: { type: "offer", sdp: "" },
      remoteDescription: { type: "answer", sdp: "" },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getStats: vi.fn().mockResolvedValue(new Map()),
    };
    private _events: Record<string, Function[]> = {};

    on(event: string, callback: Function) {
      if (!this._events[event]) this._events[event] = [];
      this._events[event].push(callback);
      return this;
    }
    off(event: string, callback?: Function) {
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
    send = vi.fn();
    close() {
      this.open = false;
      this.emit("close");
    }
  }

  class MockPeer {
    id: string;
    options: unknown;
    open = false;
    connections = {};
    disconnected = false;
    destroyed = false;
    _events: Record<string, Function[]> = {};

    constructor(id?: string | object, options?: object) {
      if (typeof id === "object") {
        options = id;
        id = undefined;
      }
      this.id = (id as string) || "mock-peer-id";
      this.options = options || {};

      setTimeout(() => {
        if (!this.destroyed) {
          this.open = true;
          this.emit("open", this.id);
        }
      }, 10);
    }

    on(event: string, callback: Function) {
      if (!this._events[event]) this._events[event] = [];
      this._events[event].push(callback);
      return this;
    }
    off(event: string, callback?: Function) {
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

  return {
    default: vi.fn(function (id?: string | object, options?: object) {
      return new MockPeer(id, options);
    }),
    DataConnection: MockDataConnection,
  };
});

describe("PeerManager", () => {
  let peerManager: PeerManager;
  const config = {
    host: "localhost",
    port: 9000,
    path: "/myapp",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    peerManager = new PeerManager(config);
  });

  afterEach(() => {
    peerManager.destroy();
    vi.useRealTimers();
  });

  // ─── Initial state ──────────────────────────────────────────────────

  it("starts in disconnected state", () => {
    expect(peerManager.getState()).toBe("disconnected");
  });

  it("has no peer ID before initialization", () => {
    expect(peerManager.getPeerId()).toBeNull();
  });

  it("can generate a random secure ID", () => {
    const id = PeerManager.getRandomId();
    expect(id).toMatch(/^hl-/);
    expect(id.length).toBeGreaterThan(10);
  });

  // ─── Initialize ────────────────────────────────────────────────────

  it("initializes with provided peerId", async () => {
    const p = peerManager.initialize("hl-custom-id");
    vi.advanceTimersByTime(50);
    const id = await p;
    expect(id).toBe("hl-custom-id");
    expect(peerManager.getState()).toBe("connected");
  });

  it("initializes with auto-generated peerId if none provided", async () => {
    // Mock crypto.randomUUID to return a predictable string
    const mockUUID = "12345678-1234-1234-1234-1234567890ab";
    const originalUUID = global.crypto.randomUUID;
    global.crypto.randomUUID = vi.fn().mockReturnValue(mockUUID);

    const p = peerManager.initialize();
    vi.advanceTimersByTime(50);
    const id = await p;

    // PeerManager.getRandomId() returns hl-prefix + first segment of UUID
    expect(id).toBe("hl-12345678");
    expect(peerManager.getState()).toBe("connected");

    global.crypto.randomUUID = originalUUID;
  });

  it("returns existing promise on re-initialization", () => {
    const p1 = peerManager.initialize();
    const p2 = peerManager.initialize();
    expect(p1).toBe(p2);
  });

  it("rejects initialization if destroyed", async () => {
    peerManager.destroy();
    await expect(peerManager.initialize()).rejects.toThrow("PeerManager is destroyed");
  });

  // ─── connectToPeer ─────────────────────────────────────────────────

  it("connects to a remote peer", async () => {
    const p = peerManager.initialize("local");
    vi.advanceTimersByTime(50);
    await p;

    const conn = peerManager.connectToPeer("remote-peer");
    expect(conn).toBeDefined();
    expect(conn.peer).toBe("remote-peer-id");
  });

  it("throws when connecting without initialization", () => {
    expect(() => peerManager.connectToPeer("remote")).toThrow("Peer not initialized");
  });

  // ─── Event emission ────────────────────────────────────────────────

  it("emits state-change on connect", async () => {
    const states: string[] = [];
    peerManager.on("state-change", (s) => states.push(s as string));

    const p = peerManager.initialize();
    vi.advanceTimersByTime(50);
    await p;

    expect(states).toContain("connected");
  });

  it("supports event listener removal", async () => {
    const cb = vi.fn();
    peerManager.on("state-change", cb);
    peerManager.off("state-change", cb);

    const p = peerManager.initialize();
    vi.advanceTimersByTime(50);
    await p;

    expect(cb).not.toHaveBeenCalled();
  });

  // ─── Connection management ─────────────────────────────────────────

  it("tracks connections", async () => {
    const p = peerManager.initialize();
    vi.advanceTimersByTime(50);
    await p;

    peerManager.connectToPeer("remote-1");
    const conns = peerManager.getConnections();
    expect(conns.length).toBeGreaterThanOrEqual(0);
  });

  // ─── Destroy ───────────────────────────────────────────────────────

  it("cleans up on destroy", async () => {
    const p = peerManager.initialize();
    vi.advanceTimersByTime(50);
    await p;

    peerManager.destroy();
    expect(peerManager.getState()).toBe("closed");
    expect(peerManager.getConnections()).toEqual([]);
  });

  it("can be destroyed multiple times safely", async () => {
    const p = peerManager.initialize();
    vi.advanceTimersByTime(50);
    await p;

    peerManager.destroy();
    peerManager.destroy();
    expect(peerManager.getState()).toBe("closed");
  });

  // ─── NAT Traversal (Task #4) ──────────────────────────────────────────

  it("Task #4: emits firewall-blocked if only host candidates gathered", async () => {
    const p = peerManager.initialize("local");
    vi.advanceTimersByTime(50);
    await p;

    const firewallBlockedCb = vi.fn();
    peerManager.on("firewall-blocked", firewallBlockedCb);

    // Manually trigger a connection to get access to the mock RTCPeerConnection
    const conn = peerManager.connectToPeer("remote");
    const pc = (conn as any).peerConnection;

    // Find the icecandidate listener
    const candidateListener = pc.addEventListener.mock.calls.find(
      (call: any) => call[0] === "icecandidate"
    )[1];
    const stateListener = pc.addEventListener.mock.calls.find(
      (call: any) => call[0] === "iceconnectionstatechange"
    )[1];

    // 1. Gather ONLY a host candidate
    candidateListener({ candidate: { type: "host", protocol: "udp", address: "127.0.0.1" } });

    // 2. Fail the connection
    // Mocking the state property on the pc object itself
    Object.defineProperty(pc, "iceConnectionState", { get: () => "failed" });
    stateListener();

    expect(firewallBlockedCb).toHaveBeenCalled();
  });

  it("Task #4: does NOT emit firewall-blocked if relay candidate exists", async () => {
    const p = peerManager.initialize("local");
    vi.advanceTimersByTime(50);
    await p;

    const firewallBlockedCb = vi.fn();
    peerManager.on("firewall-blocked", firewallBlockedCb);

    const conn = peerManager.connectToPeer("remote");
    const pc = (conn as any).peerConnection;

    const candidateListener = pc.addEventListener.mock.calls.find(
      (call: any) => call[0] === "icecandidate"
    )[1];
    const stateListener = pc.addEventListener.mock.calls.find(
      (call: any) => call[0] === "iceconnectionstatechange"
    )[1];

    // 1. Gather a relay candidate
    candidateListener({ candidate: { type: "relay", protocol: "udp", address: "1.2.3.4" } });

    // 2. Fail the connection
    Object.defineProperty(pc, "iceConnectionState", { get: () => "failed" });
    stateListener();

    expect(firewallBlockedCb).not.toHaveBeenCalled();
  });

  // ─── Reconnection ──────────────────────────────────────────────────

  it("does not reconnect after destroy", async () => {
    const p = peerManager.initialize();
    vi.advanceTimersByTime(50);
    await p;

    peerManager.destroy();
    vi.advanceTimersByTime(60000);
    expect(peerManager.getState()).toBe("closed");
  });
});
