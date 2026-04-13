import { useState, useRef, useEffect, useCallback } from "react";
import { PeerManager } from "@/lib/webrtc/peer-manager";
import { FileSender } from "@/lib/transfer/sender";
import type { DataConnection } from "peerjs";
import { getIceServers, getPeerConfigAsync } from "@/lib/config/webrtc";
import { validatePeerMessage } from "@/lib/utils/peer-message-validator";
import { createTransfer, updateTransferStatus } from "@/lib/services/transfer-service";
import { useWakeLock } from "@/lib/hooks/use-wake-lock";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { useTransferGuard } from "@/lib/hooks/use-transfer-guard";
import { useTransferState } from "@/lib/hooks/use-transfer-state";
import {
  requestNotificationPermission,
  notifyTransferComplete,
  playErrorSound,
  playSuccessSound,
  playConnectionSound,
  isSecureContext,
} from "@/lib/utils/notification";
import { logger } from "@repo/utils";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { updateUserProfile } from "@/lib/services/profile-service";

interface UseSendTransferOptions {
  user: { id: string } | null;
  file: File | null;
  receiverPeerId: string;
  password: string;
  onData?: (data: unknown) => void;
  onLog?: (message: string) => void;
  onReset?: () => void;
}

function normalizeReceiverPeerId(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  // Accept raw IDs and shared transfer links like /send?peerId=<id>
  if (trimmed.includes("peerId=")) {
    try {
      const url = new URL(trimmed);
      return (url.searchParams.get("peerId") || "").trim();
    } catch {
      // Handle partial links without protocol
      const match = trimmed.match(/[?&]peerId=([^&]+)/i);
      if (match?.[1]) {
        return decodeURIComponent(match[1]).trim();
      }
    }
  }

  return trimmed;
}

export function useSendTransfer({
  user,
  file,
  receiverPeerId,
  password,
  onData,
  onLog,
  onReset,
}: UseSendTransferOptions) {
  const {
    state: transferState,
    dispatch: dispatchTransfer,
    isActive: isTransferActive,
    isPaused,
  } = useTransferState();
  const [error, setError] = useState("");
  const [transferId, setTransferId] = useState<string | null>(null);
  const [isPeerReady, setIsPeerReady] = useState(false);
  const [myPeerId, setMyPeerId] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);

  const peerManagerRef = useRef<PeerManager | null>(null);
  const initializingRef = useRef(false);
  const fileSenderRef = useRef<FileSender | null>(null);
  const connectionRef = useRef<DataConnection | null>(null);

  // Use refs for callback props to avoid stale closures in event handlers
  const onDataRef = useRef(onData);
  const onLogRef = useRef(onLog);
  const onResetRef = useRef(onReset);
  useEffect(() => {
    onDataRef.current = onData;
  }, [onData]);
  useEffect(() => {
    onLogRef.current = onLog;
  }, [onLog]);
  useEffect(() => {
    onResetRef.current = onReset;
  }, [onReset]);

  const {
    request: requestWakeLock,
    release: releaseWakeLock,
    isLocked: isWakeLockActive,
  } = useWakeLock();
  const { vibrate } = useHaptics();

  const { showBackModal, confirmBackNavigation, cancelBackNavigation } = useTransferGuard(
    transferId,
    isTransferActive
  );

  const addLog = useCallback((message: string) => {
    onLogRef.current?.(message);
  }, []);

  // Notification permission & secure context check on mount
  useEffect(() => {
    requestNotificationPermission();
    if (!isSecureContext() && window.location.hostname !== "localhost") {
      setError("Insecure Context: WebRTC is likely blocked. Please use HTTPS.");
    }
  }, []);

  // Title updates, notifications, wake lock
  useEffect(() => {
    if (transferState.status === "transferring" && transferState.totalBytes > 0) {
      const percentage = (transferState.bytesTransferred / transferState.totalBytes) * 100;
      document.title = `${percentage.toFixed(0)}% - Sending...`;
    } else if (transferState.status === "complete") {
      document.title = "File Sent - HyperLink";
    } else {
      document.title = "HyperLink - Secure P2P";
    }

    if (transferState.status === "complete") {
      notifyTransferComplete("sent", file?.name || "File");
    }

    if (
      transferState.status === "connecting" ||
      transferState.status === "transferring" ||
      transferState.status === "awaiting_acceptance"
    ) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
  }, [
    transferState.status,
    transferState.bytesTransferred,
    transferState.totalBytes,
    file,
    requestWakeLock,
    releaseWakeLock,
  ]);

  // Peer initialization
  const checkAuthAndInitPeer = useCallback(async () => {
    if (initializingRef.current || peerManagerRef.current) return;
    initializingRef.current = true;
    try {
      if (!user) {
        logger.debug("[SEND] No user yet, waiting...");
        initializingRef.current = false;
        return;
      }

      const iceServers = await getIceServers();
      // Compatibility mode is opt-in; default keeps direct+relay candidate policy.
      const forceRelay = localStorage.getItem("hl_compatibility_mode") === "true";
      const config = await getPeerConfigAsync(iceServers, forceRelay);
      config.onLog = addLog;

      peerManagerRef.current = new PeerManager(config);

      // Task #4: Listen for firewall blocked events
      peerManagerRef.current.on("firewall-blocked", () => {
        toast.error("Firewall Blocked", {
          description:
            "Your network is preventing a direct connection. Try enabling 'Compatibility Mode' in Settings.",
          duration: 10000,
        });
      });

      // Task #3: Fetch Supabase JWT for signaling authentication
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Task #9: Generate a stable, user-linked Peer ID
      const stablePeerId = PeerManager.getRandomId(`hl-${user.id.slice(0, 8)}`);

      // Add timeout wrapper for initialization
      const INIT_TIMEOUT = 45000; // 45 seconds (increased for slower browsers/networks)
      const initPromise = peerManagerRef.current.initialize(stablePeerId, token);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("PeerManager initialization timed out")), INIT_TIMEOUT);
      });

      const id = await Promise.race([initPromise, timeoutPromise]);
      setMyPeerId(id);
      setIsPeerReady(true);
      addLog("✓ Peer manager initialized successfully");

      // Task #5: Update Supabase with the active Peer ID for discovery (non-blocking)
      updateUserProfile(user.id, { active_peer_id: id }).catch((err) => {
        logger.error({ err }, "[SEND] Failed to update user profile with Peer ID");
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to connect to signaling server: ${msg}`);
      addLog(`✗ Error: ${msg}`);
      setIsPeerReady(false);
    } finally {
      initializingRef.current = false;
    }
  }, [addLog, user]);

  useEffect(() => {
    checkAuthAndInitPeer();
    return () => {
      if (peerManagerRef.current) {
        peerManagerRef.current.destroy();
      }
    };
  }, [checkAuthAndInitPeer]);

  const resetSend = useCallback(() => {
    dispatchTransfer({ type: "RESET" });
    setError("");
    setTransferId(null);
    if (fileSenderRef.current) {
      fileSenderRef.current.cancel();
      fileSenderRef.current = null;
    }
    if (connectionRef.current) {
      connectionRef.current.close();
      connectionRef.current = null;
    }
    onResetRef.current?.();
  }, [dispatchTransfer]);

  const handleCancelClick = useCallback(() => {
    setShowCancelModal(true);
  }, []);

  const confirmCancel = useCallback(async () => {
    setShowCancelModal(false);
    if (fileSenderRef.current) {
      fileSenderRef.current.cancel();
    }
    dispatchTransfer({ type: "CANCEL" });
    if (transferId) {
      try {
        await updateTransferStatus(transferId, "cancelled");
      } catch (err) {
        logger.error({ err }, "[SEND] Failed to update transfer status to cancelled");
      }
    }
  }, [dispatchTransfer, transferId]);

  const handlePauseResume = useCallback(() => {
    if (!fileSenderRef.current) return;
    if (isPaused) {
      fileSenderRef.current.resume();
      dispatchTransfer({ type: "RESUME" });
    } else {
      fileSenderRef.current.pause();
      dispatchTransfer({ type: "PAUSE", pausedBy: "local" });
    }
  }, [isPaused, dispatchTransfer]);

  const handleSend = useCallback(async () => {
    const targetPeerId = normalizeReceiverPeerId(receiverPeerId);

    if (!file) {
      const message = "Select a file before sending.";
      setError(message);
      addLog(`✗ ${message}`);
      toast.error(message);
      return;
    }

    if (!targetPeerId) {
      const message = "Enter a valid receiver code.";
      setError(message);
      addLog(`✗ ${message}`);
      toast.error(message);
      return;
    }

    if (!peerManagerRef.current || !isPeerReady || !user) {
      const message = "System not ready yet. Wait for signaling initialization.";
      setError(message);
      addLog(`✗ ${message}`);
      toast.error(message);
      return;
    }

    try {
      setError("");
      dispatchTransfer({ type: "CONNECT" });
      addLog(`Connecting to peer: ${targetPeerId}...`);

      const conn = peerManagerRef.current.connectToPeer(targetPeerId);
      connectionRef.current = conn;

      const CONNECT_OPEN_TIMEOUT_MS = 25000;
      let channelOpened = false;
      const connectTimeout = setTimeout(() => {
        if (channelOpened) return;
        const timeoutMessage =
          "Connection timed out before channel opened. Verify receiver code and try Compatibility Mode.";
        setError(timeoutMessage);
        addLog(`✗ ${timeoutMessage}`);
        playErrorSound();
        dispatchTransfer({ type: "FAIL", error: timeoutMessage });
        try {
          conn.close();
        } catch {
          // No-op: closing an already-closed connection is safe to ignore
        }
      }, CONNECT_OPEN_TIMEOUT_MS);

      const clearConnectTimeout = () => {
        clearTimeout(connectTimeout);
      };

      conn.on("open", async () => {
        channelOpened = true;
        clearConnectTimeout();
        logger.debug({ receiverPeerId: targetPeerId }, "[useSendTransfer] Connection opened");
        try {
          addLog("✓ Connection established");
          playConnectionSound();
          vibrate([50]);

          const dbTransfer = await createTransfer(user.id, {
            filename: file.name,
            fileSize: file.size,
          });
          const dbId = dbTransfer?.id || "";
          setTransferId(dbId);

          const sender = new FileSender(file, conn, dbId);
          sender.setOnLog(addLog);
          fileSenderRef.current = sender;

          if (password) {
            await sender.setPassword(password);
          }

          addLog("Sending file offer...");
          logger.debug(
            { filename: file.name, fileSize: file.size },
            "[useSendTransfer] Sending file offer"
          );
          await sender.sendOffer();
          dispatchTransfer({ type: "AWAIT_ACCEPTANCE" });

          sender.onAccepted(() => {
            logger.debug("[useSendTransfer] Peer accepted the file");
            dispatchTransfer({
              type: "START_TRANSFER",
              totalBytes: file.size,
            });
            addLog("✓ Peer accepted the file");
          });

          sender.onPauseChange((paused) => {
            if (paused) {
              dispatchTransfer({ type: "PAUSE", pausedBy: "remote" });
            } else {
              dispatchTransfer({ type: "RESUME" });
            }
          });

          sender.onReject(() => {
            setError("Transfer rejected by receiver");
            addLog("✗ Transfer rejected");
            playErrorSound();
            dispatchTransfer({ type: "FAIL", error: "Transfer rejected by receiver" });
          });

          sender.onCancel(() => {
            setError("Transfer cancelled by receiver");
            addLog("✗ Transfer cancelled");
            playErrorSound();
            dispatchTransfer({ type: "FAIL", error: "Transfer cancelled by receiver" });
          });

          await sender.startTransfer((p) => {
            dispatchTransfer({
              type: "PROGRESS",
              bytesTransferred: p.bytesTransferred,
              speed: p.speed,
              remaining: p.timeRemaining,
              chunkSize: p.chunkSize,
              windowSize: p.windowSize,
            });
            // Removed redundant onData call here as Progress is handled via dispatch
          });

          if (dbId) {
            await updateTransferStatus(dbId, "complete");
          }
          dispatchTransfer({ type: "COMPLETE" });
          addLog("✓ Transfer complete!");
          playSuccessSound();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(`Transfer failed: ${msg}`);
          addLog(`✗ Error: ${msg}`);
          playErrorSound();
          dispatchTransfer({ type: "FAIL", error: msg });
        }
      });

      conn.on("data", (data: unknown) => {
        try {
          // Task: Fix Chat Reception - This listener handles chat messages
          // and other non-transfer control messages.
          onDataRef.current?.(data);

          const message = validatePeerMessage(data);
          if (message && message.type === "receiver-busy") {
            const errorMessage = "Receiver is busy with another transfer.";
            setError(errorMessage);
            addLog(`✗ ${errorMessage}`);
            playErrorSound();
            dispatchTransfer({ type: "FAIL", error: errorMessage });
            conn.close();
            return;
          }
          if (message && message.type === "chunk-ack") {
            // Handled internally by FileSender
          }
        } catch (err) {
          logger.error({ err }, "[SEND] Invalid peer message");
        }
      });

      conn.on("error", (err: unknown) => {
        clearConnectTimeout();
        const msg = err instanceof Error ? err.message : String(err);
        const errorMessage = `Connection error: ${msg}`;
        setError(errorMessage);
        addLog(`✗ ${errorMessage}`);
        playErrorSound();
        dispatchTransfer({ type: "FAIL", error: errorMessage });
      });

      conn.on("close", () => {
        clearConnectTimeout();
        // Use ref to avoid stale closure - check current status from FileSender
        const currentStatus = fileSenderRef.current?.getStatus();
        if (currentStatus !== "complete") {
          const errorMessage = "Connection closed";
          setError(errorMessage);
          addLog(`✗ ${errorMessage}`);
          dispatchTransfer({ type: "FAIL", error: errorMessage });
        }
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to initiate transfer: ${msg}`);
      addLog(`✗ Error: ${msg}`);
      playErrorSound();
      resetSend();
    }
  }, [
    file,
    receiverPeerId,
    user,
    password,
    isPeerReady,
    addLog,
    dispatchTransfer,
    resetSend,
    vibrate,
    // transferState.status removed - we now use fileSenderRef.current?.getStatus() to avoid stale closure
  ]);

  return {
    transferState,
    error,
    isPeerReady,
    myPeerId,
    isWakeLockActive,
    showBackModal,
    confirmBackNavigation,
    cancelBackNavigation,
    connectionRef,
    peerManagerRef,
    handleSend,
    handlePauseResume,
    handleCancelClick,
    confirmCancel,
    showCancelModal,
    setShowCancelModal,
    resetSend,
  };
}
