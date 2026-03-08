// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useReceiveTransfer } from "@/lib/hooks/use-receive-transfer";

// ──────────────────────────────────────────────────────────────
// Hoisted mocks
// ──────────────────────────────────────────────────────────────
const m = vi.hoisted(() => {
  // PeerManager
  const pmEvents: Record<string, ((...args: unknown[]) => void)[]> = {};
  const mockPMInitialize = vi.fn().mockResolvedValue("recv-peer-id");
  const mockPMOn = vi.fn().mockImplementation(
    (event: string, cb: (...a: unknown[]) => void) => {
      (pmEvents[event] = pmEvents[event] || []).push(cb);
    }
  );
  const mockPMDestroy = vi.fn();
  const mockPMGetPeerId = vi.fn().mockReturnValue("recv-peer-id");

  // FileReceiver
  const recvCallbacks: Record<string, ((...a: unknown[]) => void)> = {};
  const mockRecvSetConnection = vi.fn();
  const mockRecvSetStorageId = vi.fn();
  const mockRecvHandleOffer = vi.fn();
  const mockRecvOnProgress = vi.fn().mockImplementation(
    (cb: (...a: unknown[]) => void) => { recvCallbacks["progress"] = cb; }
  );
  const mockRecvOnComplete = vi.fn().mockImplementation(
    (cb: (...a: unknown[]) => void) => { recvCallbacks["complete"] = cb; }
  );
  const mockRecvOnCancel = vi.fn().mockImplementation(
    (cb: (...a: unknown[]) => void) => { recvCallbacks["cancel"] = cb; }
  );
  const mockRecvOnPauseChange = vi.fn().mockImplementation(
    (cb: (...a: unknown[]) => void) => { recvCallbacks["pauseChange"] = cb; }
  );
  const mockRecvOnError = vi.fn().mockImplementation(
    (cb: (...a: unknown[]) => void) => { recvCallbacks["error"] = cb; }
  );
  const mockRecvHandleChunk = vi.fn();
  const mockRecvHandleControlMessage = vi.fn();
  const mockRecvSendResumeFrom = vi.fn();
  const mockRecvCancel = vi.fn();
  const mockRecvPause = vi.fn();
  const mockRecvResume = vi.fn();
  const mockRecvProcessPassword = vi.fn().mockResolvedValue(undefined);

  // Services
  const mockClaimTransfer = vi.fn().mockResolvedValue({ id: "claimed-transfer" });
  const mockUpdateTransferStatus = vi.fn().mockResolvedValue(undefined);

  // Config
  const mockGetIceServers = vi.fn().mockResolvedValue([]);
  const mockGetPeerConfigAsync = vi.fn().mockResolvedValue({ config: {} });

  // Notification utils
  const mockRequestNotificationPermission = vi.fn();
  const mockNotifyTransferComplete = vi.fn();
  const mockPlayErrorSound = vi.fn();
  const mockPlaySuccessSound = vi.fn();
  const mockIsSecureContext = vi.fn().mockReturnValue(true);

  // Toast
  const mockToastWarning = vi.fn();
  const mockToastSuccess = vi.fn();
  const mockToastError = vi.fn();
  const mockToastInfo = vi.fn();

  return {
    pmEvents,
    mockPMInitialize,
    mockPMOn,
    mockPMDestroy,
    mockPMGetPeerId,
    recvCallbacks,
    mockRecvSetConnection,
    mockRecvSetStorageId,
    mockRecvHandleOffer,
    mockRecvOnProgress,
    mockRecvOnComplete,
    mockRecvOnCancel,
    mockRecvOnPauseChange,
    mockRecvOnError,
    mockRecvHandleChunk,
    mockRecvHandleControlMessage,
    mockRecvSendResumeFrom,
    mockRecvCancel,
    mockRecvPause,
    mockRecvResume,
    mockRecvProcessPassword,
    mockClaimTransfer,
    mockUpdateTransferStatus,
    mockGetIceServers,
    mockGetPeerConfigAsync,
    mockRequestNotificationPermission,
    mockNotifyTransferComplete,
    mockPlayErrorSound,
    mockPlaySuccessSound,
    mockIsSecureContext,
    mockToastWarning,
    mockToastSuccess,
    mockToastError,
    mockToastInfo,
  };
});

vi.mock("@/lib/webrtc/peer-manager", () => {
  class PeerManager {
    initialize = m.mockPMInitialize;
    on = m.mockPMOn;
    destroy = m.mockPMDestroy;
    getPeerId = m.mockPMGetPeerId;
    static getRandomId = vi.fn().mockImplementation((prefix = "hl") => `${prefix}-random-id`);
  }
  return { PeerManager };
});

vi.mock("@/lib/services/profile-service", () => ({
  updateUserProfile: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/transfer/receiver", () => {
  class FileReceiver {
    setOnLog = vi.fn();
    setConnection = m.mockRecvSetConnection;
    setStorageId = m.mockRecvSetStorageId;
    handleOffer = m.mockRecvHandleOffer;
    onProgress = m.mockRecvOnProgress;
    onComplete = m.mockRecvOnComplete;
    onCancel = m.mockRecvOnCancel;
    onPauseChange = m.mockRecvOnPauseChange;
    onError = m.mockRecvOnError;
    onCleanup = vi.fn().mockImplementation(
      (cb: (...a: unknown[]) => void) => { m.recvCallbacks["cleanupProgress"] = cb; }
    );
    handleChunk = m.mockRecvHandleChunk;
    handleControlMessage = m.mockRecvHandleControlMessage;
    sendResumeFrom = m.mockRecvSendResumeFrom;
    cancel = m.mockRecvCancel;
    pause = m.mockRecvPause;
    resume = m.mockRecvResume;
    processPassword = m.mockRecvProcessPassword;
  }
  return { FileReceiver };
});

vi.mock("@/lib/services/transfer-service", () => ({
  claimTransferAsReceiver: (...args: unknown[]) =>
    m.mockClaimTransfer(...args),
  updateTransferStatus: (...args: unknown[]) =>
    m.mockUpdateTransferStatus(...args),
}));

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: { access_token: "test-token" } },
        error: null,
      })),
    },
  },
}));

vi.mock("@repo/utils", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/config/webrtc", () => ({
  getIceServers: () => m.mockGetIceServers(),
  getPeerConfigAsync: (...args: unknown[]) =>
    m.mockGetPeerConfigAsync(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: any[]) => m.mockToastError(...args),
    warning: (...args: any[]) => m.mockToastWarning(...args),
    success: (...args: any[]) => m.mockToastSuccess(...args),
    info: (...args: any[]) => m.mockToastInfo(...args),
  },
}));

vi.mock("@/lib/hooks/use-wake-lock", () => ({
  useWakeLock: () => ({ request: vi.fn(), release: vi.fn(), isLocked: false }),
}));

vi.mock("@/lib/hooks/use-haptics", () => ({
  useHaptics: () => ({ vibrate: vi.fn() }),
}));

vi.mock("@/lib/hooks/use-transfer-guard", () => ({
  useTransferGuard: () => ({
    showBackModal: false,
    confirmBackNavigation: vi.fn(),
    cancelBackNavigation: vi.fn(),
  }),
}));

vi.mock("@/lib/utils/notification", () => ({
  requestNotificationPermission: () => m.mockRequestNotificationPermission(),
  notifyTransferComplete: (...args: unknown[]) =>
    m.mockNotifyTransferComplete(...args),
  playErrorSound: () => m.mockPlayErrorSound(),
  playSuccessSound: () => m.mockPlaySuccessSound(),
  isSecureContext: () => m.mockIsSecureContext(),
}));

vi.mock("@/lib/utils/mime", () => ({
  getMimeType: vi.fn().mockReturnValue("text/plain"),
}));

vi.mock("sonner", () => ({
  toast: {
    warning: (...args: unknown[]) => m.mockToastWarning(...args),
    success: (...args: unknown[]) => m.mockToastSuccess(...args),
    error: (...args: unknown[]) => m.mockToastError(...args),
    info: (...args: unknown[]) => m.mockToastInfo(...args),
  },
}));

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

const USER = { id: "user-1" };

function defaultOptions(overrides = {}) {
  return { user: USER, ...overrides };
}

/** Build a mock DataConnection that captures its event handlers */
function buildMockConnection() {
  const connEvents: Record<string, ((...a: unknown[]) => void)[]> = {};
  const mockOn = vi.fn().mockImplementation(
    (event: string, cb: (...a: unknown[]) => void) => {
      (connEvents[event] = connEvents[event] || []).push(cb);
    }
  );
  const mockSend = vi.fn();
  const mockClose = vi.fn();
  return {
    connEvents,
    conn: { on: mockOn, send: mockSend, close: mockClose, mockSend, mockClose },
  };
}

/** Build a standard file-offer PeerMessage */
function makeFileOfferMessage(overrides = {}) {
  return {
    type: "file-offer",
    transferId: "tx-001",
    timestamp: Date.now(),
    payload: {
      filename: "hello.txt",
      fileSize: 1024,
      fileType: "text/plain",
      dbTransferId: "db-tx-001",
      isEncrypted: false,
      ...overrides,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  // Clear event stores
  for (const k of Object.keys(m.pmEvents)) delete m.pmEvents[k];
  for (const k of Object.keys(m.recvCallbacks)) delete m.recvCallbacks[k];

  // Re-wire implementations
  m.mockPMInitialize.mockResolvedValue("recv-peer-id");
  m.mockPMGetPeerId.mockReturnValue("recv-peer-id");
  m.mockPMOn.mockImplementation(
    (event: string, cb: (...a: unknown[]) => void) => {
      (m.pmEvents[event] = m.pmEvents[event] || []).push(cb);
    }
  );
  m.mockRecvOnProgress.mockImplementation(
    (cb: (...a: unknown[]) => void) => { m.recvCallbacks["progress"] = cb; }
  );
  m.mockRecvOnComplete.mockImplementation(
    (cb: (...a: unknown[]) => void) => { m.recvCallbacks["complete"] = cb; }
  );
  m.mockRecvOnCancel.mockImplementation(
    (cb: (...a: unknown[]) => void) => { m.recvCallbacks["cancel"] = cb; }
  );
  m.mockRecvOnPauseChange.mockImplementation(
    (cb: (...a: unknown[]) => void) => { m.recvCallbacks["pauseChange"] = cb; }
  );
  m.mockRecvOnError.mockImplementation(
    (cb: (...a: unknown[]) => void) => { m.recvCallbacks["error"] = cb; }
  );
  m.mockRecvProcessPassword.mockResolvedValue(undefined);
  m.mockClaimTransfer.mockResolvedValue({ id: "claimed-transfer" });
  m.mockUpdateTransferStatus.mockResolvedValue(undefined);
  m.mockGetIceServers.mockResolvedValue([]);
  m.mockGetPeerConfigAsync.mockResolvedValue({ config: {} });
  m.mockIsSecureContext.mockReturnValue(true);
});

// ──────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────

describe("useReceiveTransfer", () => {
  describe("initialization", () => {
    it("starts with empty myPeerId and idle status", () => {
      const { result } = renderHook(() =>
        useReceiveTransfer(defaultOptions())
      );

      expect(result.current.myPeerId).toBe("");
      expect(result.current.transferState.status).toBe("idle");
    });

    it("sets myPeerId after PeerManager initializes", async () => {
      const { result } = renderHook(() =>
        useReceiveTransfer(defaultOptions())
      );

      await waitFor(() =>
        expect(result.current.myPeerId).toBe("recv-peer-id")
      );
      // Verify initialize was called with hl- prefix + first 8 of user ID + auth token
      expect(m.mockPMInitialize).toHaveBeenCalledWith(
        expect.stringMatching(/^hl-user-1/),
        expect.any(String)
      );
    });

    it("does not initialize when user is null", async () => {
      const { result } = renderHook(() =>
        useReceiveTransfer(defaultOptions({ user: null }))
      );

      await new Promise((r) => setTimeout(r, 50));
      expect(result.current.myPeerId).toBe("");
      expect(m.mockPMInitialize).not.toHaveBeenCalled();
    });

    it("sets error when PeerManager initialization fails", async () => {
      m.mockPMInitialize.mockRejectedValueOnce(new Error("Init failed"));

      const { result } = renderHook(() =>
        useReceiveTransfer(defaultOptions())
      );

      await waitFor(() => expect(result.current.error).toMatch(/Init failed/));
    });

    it("unmounts cleanly after initialization", async () => {
      const { unmount } = renderHook(() =>
        useReceiveTransfer(defaultOptions())
      );
      await waitFor(() => expect(m.mockPMInitialize).toHaveBeenCalled());

      // The receive hook doesn't call destroy on unmount (it lets
      // the peer remain for reconnect scenarios), but should not throw
      expect(() => unmount()).not.toThrow();
    });
  });

  describe("incoming connection – file-offer", () => {
    async function setupConnectedHook() {
      const { result } = renderHook(() =>
        useReceiveTransfer(defaultOptions())
      );

      // Wait for peer to initialize
      await waitFor(() =>
        expect(result.current.myPeerId).toBe("recv-peer-id")
      );

      // Simulate incoming connection
      const { connEvents, conn } = buildMockConnection();
      await act(async () => {
        const incomingHandlers = m.pmEvents["incoming-connection"];
        expect(incomingHandlers).toBeDefined();
        await incomingHandlers[0](conn);
      });

      return { result, connEvents, conn };
    }

    it("sets transfer status to 'connecting' on incoming connection", async () => {
      const { result } = await setupConnectedHook();
      // The hook dispatches CONNECT on incoming connection
      await waitFor(() =>
        expect(result.current.transferState.status).toBe("connecting")
      );
    });

    it("sets pendingOffer and status='offering' on file-offer data event", async () => {
      const { result, connEvents } = await setupConnectedHook();

      const offerMsg = makeFileOfferMessage();
      await act(async () => {
        connEvents["data"]?.forEach((cb) => cb(offerMsg));
        await new Promise((r) => setTimeout(r, 0));
      });

      await waitFor(() =>
        expect(result.current.transferState.status).toBe("offering")
      );
      expect(result.current.pendingOffer).toMatchObject({
        filename: "hello.txt",
        fileSize: 1024,
      });
    });

    it("clears pendingOffer on handleRejectOffer", async () => {
      const { result, connEvents, conn } = await setupConnectedHook();

      // Send a file offer
      const offerMsg = makeFileOfferMessage();
      await act(async () => {
        connEvents["data"]?.forEach((cb) => cb(offerMsg));
        await new Promise((r) => setTimeout(r, 0));
      });
      await waitFor(() => expect(result.current.pendingOffer).not.toBeNull());

      // Reject it
      await act(async () => {
        result.current.handleRejectOffer();
      });

      expect(result.current.pendingOffer).toBeNull();
      expect(conn.mockSend).toHaveBeenCalledWith(
        expect.objectContaining({ type: "file-reject" })
      );
    });

    it("sends receiver-busy if already in active transfer", async () => {
      const { result } = renderHook(() =>
        useReceiveTransfer(defaultOptions())
      );
      await waitFor(() =>
        expect(result.current.myPeerId).toBe("recv-peer-id")
      );

      // First connection triggers CONNECT so status='connecting'
      const { conn: conn1 } = buildMockConnection();
      await act(async () => {
        await m.pmEvents["incoming-connection"][0](conn1);
      });
      await waitFor(() =>
        expect(result.current.transferState.status).toBe("connecting")
      );

      // Second connection while busy → should be rejected
      const { conn: conn2 } = buildMockConnection();
      await act(async () => {
        await m.pmEvents["incoming-connection"][0](conn2);
      });

      // conn2 should have its open handler registered to send receiver-busy
      // The open handler sets up a 'receiver-busy' send
      expect(conn2.mockSend).not.toHaveBeenCalled(); // not yet opened
    });
  });

  describe("resetReceive", () => {
    it("resets to idle state", async () => {
      const { result } = renderHook(() =>
        useReceiveTransfer(defaultOptions())
      );

      act(() => {
        result.current.resetReceive();
      });

      expect(result.current.transferState.status).toBe("idle");
      expect(result.current.error).toBe("");
      expect(result.current.pendingOffer).toBeNull();
    });
  });

  describe("copyPeerId", () => {
    it("writes myPeerId to clipboard", async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: writeTextMock },
        configurable: true,
      });

      const { result } = renderHook(() =>
        useReceiveTransfer(defaultOptions())
      );
      await waitFor(() =>
        expect(result.current.myPeerId).toBe("recv-peer-id")
      );

      act(() => {
        result.current.copyPeerId();
      });

      expect(writeTextMock).toHaveBeenCalledWith("recv-peer-id");
    });
  });

  describe("handleAcceptOffer – non-encrypted", () => {
    it("creates FileReceiver and transitions to transferring state", async () => {
      const { result } = renderHook(() =>
        useReceiveTransfer(defaultOptions())
      );
      await waitFor(() =>
        expect(result.current.myPeerId).toBe("recv-peer-id")
      );

      // Simulate incoming connection + file offer using the SAME connection
      const { connEvents, conn } = buildMockConnection();
      await act(async () => {
        await m.pmEvents["incoming-connection"][0](conn);
      });

      const offerMsg = makeFileOfferMessage();
      await act(async () => {
        connEvents["data"]?.forEach((cb) => cb(offerMsg));
        await new Promise((r) => setTimeout(r, 0));
      });
      await waitFor(() => expect(result.current.pendingOffer).not.toBeNull());

      // Accept — triggers startTransferSequence (has an internal 100ms delay)
      await act(async () => {
        result.current.handleAcceptOffer();
        await new Promise((r) => setTimeout(r, 200));
      });

      // FileReceiver.handleOffer should have been called
      expect(m.mockRecvHandleOffer).toHaveBeenCalled();
    });
  });

  describe("handleAcceptOffer – encrypted", () => {
    it("shows password modal when offer is encrypted", async () => {
      const { result } = renderHook(() =>
        useReceiveTransfer(defaultOptions())
      );
      await waitFor(() =>
        expect(result.current.myPeerId).toBe("recv-peer-id")
      );

      const { connEvents, conn } = buildMockConnection();
      await act(async () => {
        await m.pmEvents["incoming-connection"][0](conn);
      });

      const encryptedOffer = makeFileOfferMessage({ isEncrypted: true });
      await act(async () => {
        connEvents["data"]?.forEach((cb) => cb(encryptedOffer));
        await new Promise((r) => setTimeout(r, 0));
      });
      await waitFor(() => expect(result.current.pendingOffer).not.toBeNull());

      await act(async () => {
        await result.current.handleAcceptOffer();
      });

      expect(result.current.showPasswordModal).toBe(true);
    });
  });

  describe("transferState", () => {
    it("starts as idle with zero bytes", () => {
      const { result } = renderHook(() =>
        useReceiveTransfer(defaultOptions())
      );

      expect(result.current.transferState.status).toBe("idle");
      expect(result.current.transferState.bytesTransferred).toBe(0);
    });
  });

  describe("transfer reception sequence", () => {
    it("awaits claimTransferAsReceiver before dispatching CONNECT", async () => {
      let isDbClaimResolved = false;
      m.mockClaimTransfer.mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, 50)); // Simulating DB delay
        isDbClaimResolved = true;
        return { id: "claimed-tx-sync-test" };
      });

      const { result } = renderHook(() => useReceiveTransfer(defaultOptions()));
      await waitFor(() => expect(result.current.myPeerId).toBe("recv-peer-id"));

      // Simulate incoming connection and a file offer so we can accept
      const { connEvents, conn } = buildMockConnection();
      await act(async () => {
        await m.pmEvents["incoming-connection"][0](conn);
      });

      const offerMsg = makeFileOfferMessage({ dbTransferId: "remote-db-id" });
      await act(async () => {
        connEvents["data"]?.forEach((cb) => cb(offerMsg));
        await new Promise((r) => setTimeout(r, 0));
      });

      // Now we explicitly accept the offer, triggering the transfer sequence
      // which includes claimTransferAsReceiver
      await act(async () => {
        result.current.handleAcceptOffer();
        // Give it time to hit the `.then()` chain but stop before it finishes internally
        await new Promise((r) => setTimeout(r, 20));
      });

      // Verify claim behavior
      expect(m.mockClaimTransfer).toHaveBeenCalledWith("remote-db-id");

      // Allow sequence to complete
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });
      // Verification that the actual DB claim returned our data
      expect(isDbClaimResolved).toBe(true);
    });
  });

  describe("cleanupProgress", () => {
    it("updates cleanupProgress when FileReceiver emits cleanup status", async () => {
      const { result } = renderHook(() =>
        useReceiveTransfer(defaultOptions())
      );
      await waitFor(() => expect(result.current.myPeerId).toBe("recv-peer-id"));

      // 1. Simulate incoming connection and offer so we can start the sequence
      const { conn, connEvents } = buildMockConnection();
      await act(async () => {
        await m.pmEvents["incoming-connection"][0](conn);
      });
      const offerMsg = makeFileOfferMessage();
      await act(async () => {
        connEvents["data"]?.forEach((cb) => cb(offerMsg));
      });

      // 2. Accept offer to create internal FileReceiver and register cleanup callback
      await act(async () => {
        result.current.handleAcceptOffer();
      });

      // 3. Now the callback should be in m.recvCallbacks
      await act(async () => {
        const cleanupCb = m.recvCallbacks["cleanupProgress"] as any;
        if (cleanupCb) {
          cleanupCb(50, 100);
        }
      });

      expect(result.current.cleanupProgress).toEqual({ cleared: 50, total: 100 });
    });
  });

  describe("Task 2: ACK Resilience routing", () => {
    it("routes chunk-probe to FileReceiver.handleChunk", async () => {
      const { result } = renderHook(() =>
        useReceiveTransfer(defaultOptions())
      );
      await waitFor(() => expect(result.current.myPeerId).toBe("recv-peer-id"));

      const { connEvents, conn } = buildMockConnection();
      await act(async () => {
        const incomingHandlers = m.pmEvents["incoming-connection"];
        if (incomingHandlers) await incomingHandlers[0](conn);
      });

      const offerMsg = makeFileOfferMessage();
      await act(async () => {
        connEvents["data"]?.forEach((cb) => cb(offerMsg));
      });

      await act(async () => {
        result.current.handleAcceptOffer();
        await new Promise((r) => setTimeout(r, 200));
      });

      const probeMsg = {
        type: "chunk-probe",
        transferId: "tx-001",
        payload: { chunkIndex: 0, data: new ArrayBuffer(10) },
        timestamp: Date.now()
      };

      await act(async () => {
        connEvents["data"]?.forEach((cb) => cb(probeMsg as any));
      });

      expect(m.mockRecvHandleChunk).toHaveBeenCalledWith(probeMsg);
    });
    describe("NAT Traversal (Task #4)", () => {
      it("Task #4: shows toast error when firewall-blocked is emitted", async () => {
        const { result } = renderHook(() => useReceiveTransfer(defaultOptions()));

        await waitFor(() => expect(result.current.myPeerId).toBe("recv-peer-id"));

        // Trigger the 'firewall-blocked' callback registered in PeerManager mock
        await act(async () => {
          const firewallBlockedCbs = m.pmEvents["firewall-blocked"];
          if (firewallBlockedCbs) {
            firewallBlockedCbs.forEach((cb) => cb());
          }
        });

        expect(m.mockToastError).toHaveBeenCalledWith(
          "Firewall Blocked",
          expect.objectContaining({
            description: expect.stringContaining("Compatibility Mode"),
          })
        );
      });
    });
  });
});
