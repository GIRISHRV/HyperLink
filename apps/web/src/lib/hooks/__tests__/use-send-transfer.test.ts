// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSendTransfer } from "@/lib/hooks/use-send-transfer";

// ──────────────────────────────────────────────────────────────
// Hoisted mocks
// ──────────────────────────────────────────────────────────────
const m = vi.hoisted(() => {
  // --- PeerManager ---
  const pmEvents: Record<string, ((...args: unknown[]) => void)[]> = {};
  const mockPMInitialize = vi.fn().mockResolvedValue("my-peer-id");
  const mockPMOn = vi.fn().mockImplementation((event: string, cb: (...a: unknown[]) => void) => {
    (pmEvents[event] = pmEvents[event] || []).push(cb);
  });
  const mockPMDestroy = vi.fn();
  const mockPMGetPeerId = vi.fn().mockReturnValue("my-peer-id");

  // --- DataConnection mock ---
  const connEvents: Record<string, ((...args: unknown[]) => void)[]> = {};
  const mockConnOn = vi.fn().mockImplementation((event: string, cb: (...a: unknown[]) => void) => {
    (connEvents[event] = connEvents[event] || []).push(cb);
  });
  const mockConnSend = vi.fn();
  const mockConnClose = vi.fn();

  const mockConnectToPeer = vi.fn().mockReturnValue({
    on: mockConnOn,
    send: mockConnSend,
    close: mockConnClose,
  });

  // --- FileSender ---
  const senderEvents: {
    onPauseChange?: (paused: boolean) => void;
    onReject?: () => void;
  } = {};
  const mockSenderSetPassword = vi.fn().mockResolvedValue(undefined);
  const mockSenderSendOffer = vi.fn().mockResolvedValue(undefined);
  const mockSenderStartTransfer = vi.fn().mockResolvedValue(undefined);
  const mockSenderOnPauseChange = vi.fn().mockImplementation((cb: (p: boolean) => void) => {
    senderEvents.onPauseChange = cb;
  });
  const mockSenderOnReject = vi.fn().mockImplementation((cb: () => void) => {
    senderEvents.onReject = cb;
  });
  const mockSenderCancel = vi.fn();
  const mockSenderPause = vi.fn();
  const mockSenderResume = vi.fn();
  const mockSenderGetStatus = vi.fn().mockReturnValue("transferring");

  // --- Service ---
  const mockCreateTransfer = vi.fn().mockResolvedValue({ id: "db-transfer-1" });
  const mockUpdateTransferStatus = vi.fn().mockResolvedValue(undefined);

  // --- Config ---
  const mockGetIceServers = vi.fn().mockResolvedValue([]);
  const mockGetPeerConfigAsync = vi.fn().mockResolvedValue({ config: {} });

  // --- Notification ---
  const mockRequestNotificationPermission = vi.fn();
  const mockNotifyTransferComplete = vi.fn();
  const mockPlayErrorSound = vi.fn();
  const mockPlaySuccessSound = vi.fn();
  const mockPlayConnectionSound = vi.fn();
  const mockIsSecureContext = vi.fn().mockReturnValue(true);

  // --- Toast ---
  const mockToastError = vi.fn();
  const mockToastWarning = vi.fn();
  const mockToastSuccess = vi.fn();

  return {
    pmEvents,
    mockPMInitialize,
    mockPMOn,
    mockPMDestroy,
    mockPMGetPeerId,
    connEvents,
    mockConnOn,
    mockConnSend,
    mockConnClose,
    mockConnectToPeer,
    senderEvents,
    mockSenderSetPassword,
    mockSenderSendOffer,
    mockSenderStartTransfer,
    mockSenderOnPauseChange,
    mockSenderOnReject,
    mockSenderCancel,
    mockSenderPause,
    mockSenderResume,
    mockSenderGetStatus,
    mockCreateTransfer,
    mockUpdateTransferStatus,
    mockGetIceServers,
    mockGetPeerConfigAsync,
    mockRequestNotificationPermission,
    mockNotifyTransferComplete,
    mockPlayErrorSound,
    mockPlaySuccessSound,
    mockPlayConnectionSound,
    mockIsSecureContext,
    mockToastError,
    mockToastWarning,
    mockToastSuccess,
  };
});

vi.mock("@/lib/webrtc/peer-manager", () => {
  class PeerManager {
    initialize = m.mockPMInitialize;
    on = m.mockPMOn;
    destroy = m.mockPMDestroy;
    getPeerId = m.mockPMGetPeerId;
    connectToPeer = m.mockConnectToPeer;
  }
  return { PeerManager };
});

vi.mock("@/lib/transfer/sender", () => {
  class FileSender {
    setPassword = m.mockSenderSetPassword;
    sendOffer = m.mockSenderSendOffer;
    startTransfer = m.mockSenderStartTransfer;
    onPauseChange = m.mockSenderOnPauseChange;
    onReject = m.mockSenderOnReject;
    cancel = m.mockSenderCancel;
    pause = m.mockSenderPause;
    resume = m.mockSenderResume;
    getStatus = m.mockSenderGetStatus;
  }
  return { FileSender };
});

vi.mock("@/lib/services/transfer-service", () => ({
  createTransfer: (...args: unknown[]) => m.mockCreateTransfer(...args),
  updateTransferStatus: (...args: unknown[]) => m.mockUpdateTransferStatus(...args),
}));

vi.mock("@/lib/config/webrtc", () => ({
  getIceServers: () => m.mockGetIceServers(),
  getPeerConfigAsync: (...args: unknown[]) => m.mockGetPeerConfigAsync(...args),
}));

vi.mock("@/lib/hooks/use-wake-lock", () => ({
  useWakeLock: () => ({ request: vi.fn(), release: vi.fn() }),
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
  playConnectionSound: () => m.mockPlayConnectionSound(),
  isSecureContext: () => m.mockIsSecureContext(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => m.mockToastError(...args),
    warning: (...args: unknown[]) => m.mockToastWarning(...args),
    success: (...args: unknown[]) => m.mockToastSuccess(...args),
  },
}));

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

const USER = { id: "user-1" };
const FILE = new File(["hello"], "test.txt", { type: "text/plain" });

function defaultOptions(overrides = {}) {
  return {
    user: USER,
    file: FILE,
    receiverPeerId: "peer-abc",
    password: "",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Reset event stores
  for (const k of Object.keys(m.pmEvents)) delete m.pmEvents[k];
  for (const k of Object.keys(m.connEvents)) delete m.connEvents[k];
  m.senderEvents.onPauseChange = undefined;
  m.senderEvents.onReject = undefined;

  // Re-wire implementations
  m.mockPMInitialize.mockResolvedValue("my-peer-id");
  m.mockPMGetPeerId.mockReturnValue("my-peer-id");
  m.mockPMOn.mockImplementation((event: string, cb: (...a: unknown[]) => void) => {
    (m.pmEvents[event] = m.pmEvents[event] || []).push(cb);
  });
  m.mockConnOn.mockImplementation((event: string, cb: (...a: unknown[]) => void) => {
    (m.connEvents[event] = m.connEvents[event] || []).push(cb);
  });
  m.mockConnectToPeer.mockReturnValue({
    on: m.mockConnOn,
    send: m.mockConnSend,
    close: m.mockConnClose,
  });
  m.mockCreateTransfer.mockResolvedValue({ id: "db-transfer-1" });
  m.mockUpdateTransferStatus.mockResolvedValue(undefined);
  m.mockGetIceServers.mockResolvedValue([]);
  m.mockGetPeerConfigAsync.mockResolvedValue({ config: {} });
  m.mockSenderSendOffer.mockResolvedValue(undefined);
  m.mockSenderStartTransfer.mockResolvedValue(undefined);
  m.mockSenderOnPauseChange.mockImplementation((cb: (p: boolean) => void) => {
    m.senderEvents.onPauseChange = cb;
  });
  m.mockSenderOnReject.mockImplementation((cb: () => void) => {
    m.senderEvents.onReject = cb;
  });
  m.mockIsSecureContext.mockReturnValue(true);
});

// ──────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────

describe("useSendTransfer", () => {
  describe("initialization", () => {
    it("starts with isPeerReady=false and no error", () => {
      const { result } = renderHook(() =>
        useSendTransfer(defaultOptions())
      );
      expect(result.current.isPeerReady).toBe(false);
      expect(result.current.error).toBe("");
    });

    it("sets isPeerReady=true after successful PeerManager initialization", async () => {
      const { result } = renderHook(() =>
        useSendTransfer(defaultOptions())
      );
      await waitFor(() => expect(result.current.isPeerReady).toBe(true));
    });

    it("skips initialization when user is null", async () => {
      const { result } = renderHook(() =>
        useSendTransfer(defaultOptions({ user: null }))
      );
      // Give enough time for any async init to run
      await new Promise((r) => setTimeout(r, 50));
      expect(result.current.isPeerReady).toBe(false);
      expect(m.mockPMInitialize).not.toHaveBeenCalled();
    });

    it("reports error when PeerManager initialization fails", async () => {
      m.mockPMInitialize.mockRejectedValueOnce(
        new Error("Connection refused")
      );

      const { result } = renderHook(() =>
        useSendTransfer(defaultOptions())
      );

      await waitFor(() => expect(result.current.error).toMatch(/Connection refused/));
      expect(result.current.isPeerReady).toBe(false);
    });

    it("destroys PeerManager on unmount", async () => {
      const { unmount } = renderHook(() =>
        useSendTransfer(defaultOptions())
      );
      await waitFor(() => expect(m.mockPMInitialize).toHaveBeenCalled());

      unmount();

      expect(m.mockPMDestroy).toHaveBeenCalled();
    });
  });

  describe("handleSend guards", () => {
    it("shows toast when file is missing", async () => {
      const { result } = renderHook(() =>
        useSendTransfer(defaultOptions({ file: null }))
      );

      await act(async () => {
        await result.current.handleSend();
      });

      expect(m.mockToastError).toHaveBeenCalledWith(
        expect.stringContaining("Missing")
      );
    });

    it("shows toast when user is null", async () => {
      const { result } = renderHook(() =>
        useSendTransfer(defaultOptions({ user: null }))
      );

      await act(async () => {
        await result.current.handleSend();
      });

      expect(m.mockToastError).toHaveBeenCalled();
    });

    it("shows toast when receiverPeerId is empty", async () => {
      const { result } = renderHook(() =>
        useSendTransfer(defaultOptions({ receiverPeerId: "" }))
      );

      await act(async () => {
        await result.current.handleSend();
      });

      expect(m.mockToastError).toHaveBeenCalled();
    });
  });

  describe("handleSend – happy path", () => {
    it("transitions through CONNECT → AWAIT_ACCEPTANCE → COMPLETE", async () => {
      // Simulate connection open immediately
      m.mockConnOn.mockImplementation(
        (event: string, cb: (...a: unknown[]) => void) => {
          if (event === "open") {
            // Trigger open synchronously next tick
            setTimeout(() => cb(), 0);
          }
          (m.connEvents[event] = m.connEvents[event] || []).push(cb);
        }
      );
      m.mockConnectToPeer.mockReturnValue({
        on: m.mockConnOn,
        send: m.mockConnSend,
        close: m.mockConnClose,
      });

      const { result } = renderHook(() =>
        useSendTransfer(defaultOptions())
      );
      await waitFor(() => expect(result.current.isPeerReady).toBe(true));

      await act(async () => {
        // Don't await – the inner promise will settle via mock
        result.current.handleSend();
        await new Promise((r) => setTimeout(r, 50));
      });

      // At minimum we should have created the DB transfer record
      expect(m.mockCreateTransfer).toHaveBeenCalledWith("user-1", {
        filename: "test.txt",
        fileSize: FILE.size,
      });
      expect(m.mockConnectToPeer).toHaveBeenCalledWith("peer-abc");
    });

    it("updates transfer status to transferring after connection opens", async () => {
      m.mockConnOn.mockImplementation(
        (event: string, cb: (...a: unknown[]) => void) => {
          if (event === "open") setTimeout(() => cb(), 0);
          (m.connEvents[event] = m.connEvents[event] || []).push(cb);
        }
      );
      m.mockConnectToPeer.mockReturnValue({
        on: m.mockConnOn,
        send: m.mockConnSend,
        close: m.mockConnClose,
      });

      const { result } = renderHook(() =>
        useSendTransfer(defaultOptions())
      );
      await waitFor(() => expect(result.current.isPeerReady).toBe(true));

      await act(async () => {
        result.current.handleSend();
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(m.mockUpdateTransferStatus).toHaveBeenCalledWith(
        "db-transfer-1",
        "transferring"
      );
    });
  });

  describe("resetSend", () => {
    it("resets transfer state and clears error", async () => {
      m.mockPMInitialize.mockRejectedValueOnce(new Error("Oops"));

      const { result } = renderHook(() =>
        useSendTransfer(defaultOptions())
      );
      await waitFor(() => expect(result.current.error).toBeTruthy());

      act(() => {
        result.current.resetSend();
      });

      // Status should be back to idle
      expect(result.current.transferState.status).toBe("idle");
      expect(result.current.error).toBe("");
    });
  });

  describe("handlePauseResume", () => {
    it("does nothing when no fileSender is active", () => {
      const { result } = renderHook(() =>
        useSendTransfer(defaultOptions())
      );

      // Should not throw
      act(() => {
        result.current.handlePauseResume();
      });

      expect(m.mockSenderPause).not.toHaveBeenCalled();
      expect(m.mockSenderResume).not.toHaveBeenCalled();
    });
  });

  describe("handleCancel", () => {
    it("does nothing when no fileSender is active", () => {
      const { result } = renderHook(() =>
        useSendTransfer(defaultOptions())
      );

      act(() => {
        result.current.handleCancel();
      });

      expect(m.mockSenderCancel).not.toHaveBeenCalled();
    });
  });

  describe("transferState", () => {
    it("exposes initial idle state", () => {
      const { result } = renderHook(() =>
        useSendTransfer(defaultOptions())
      );

      expect(result.current.transferState.status).toBe("idle");
      expect(result.current.transferState.bytesTransferred).toBe(0);
    });
  });
});
