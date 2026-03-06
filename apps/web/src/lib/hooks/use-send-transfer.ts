import { useState, useRef, useEffect, useCallback } from "react";
import { PeerManager } from "@/lib/webrtc/peer-manager";
import { FileSender } from "@/lib/transfer/sender";
import type { DataConnection } from "peerjs";
import { getIceServers, getPeerConfigAsync } from "@/lib/config/webrtc";
import { validatePeerMessage } from "@/lib/utils/peer-message-validator";
import {
  createTransfer,
  updateTransferStatus,
} from "@/lib/services/transfer-service";
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

  const { request: requestWakeLock, release: releaseWakeLock, isLocked: isWakeLockActive } = useWakeLock();
  const { vibrate } = useHaptics();

  const { showBackModal, confirmBackNavigation, cancelBackNavigation } =
    useTransferGuard(transferId, isTransferActive);

  const addLog = useCallback((message: string) => {
    onLogRef.current?.(message);
  }, []);

  // Notification permission & secure context check on mount
  useEffect(() => {
    requestNotificationPermission();
    if (!isSecureContext() && window.location.hostname !== "localhost") {
      setError(
        "Insecure Context: WebRTC is likely blocked. Please use HTTPS."
      );
    }
  }, []);

  // Title updates, notifications, wake lock
  useEffect(() => {
    if (
      transferState.status === "transferring" &&
      transferState.totalBytes > 0
    ) {
      const percentage =
        (transferState.bytesTransferred / transferState.totalBytes) * 100;
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
        logger.info("[SEND] No user yet, waiting...");
        initializingRef.current = false;
        return;
      }

      const iceServers = await getIceServers();
      // Task #4: Support Compatibility Mode (Forced Relay)
      const forceRelay = localStorage.getItem("hl_compatibility_mode") === "true";
      const config = await getPeerConfigAsync(iceServers, forceRelay);

      peerManagerRef.current = new PeerManager(config);

      // Task #4: Listen for firewall blocked events
      peerManagerRef.current.on("firewall-blocked", () => {
        toast.error("Firewall Blocked", {
          description: "Your network is preventing a direct connection. Try enabling 'Compatibility Mode' in Settings.",
          duration: 10000,
        });
      });

      // Task #3: Fetch Supabase JWT for signaling authentication
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Task #9: Generate a stable, user-linked Peer ID
      const stablePeerId = PeerManager.getRandomId(`hl-${user.id.slice(0, 8)}`);
      const id = await peerManagerRef.current.initialize(stablePeerId, token);
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

  const handleCancel = useCallback(() => {
    if (fileSenderRef.current) {
      fileSenderRef.current.cancel();
    }
  }, []);

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
    if (!file || !receiverPeerId || !peerManagerRef.current || !isPeerReady || !user) {
      return;
    }

    try {
      setError("");
      dispatchTransfer({ type: "CONNECT" });
      addLog(`Connecting to peer: ${receiverPeerId}...`);

      const conn = peerManagerRef.current.connectToPeer(receiverPeerId);
      connectionRef.current = conn;

      conn.on("open", async () => {
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
          fileSenderRef.current = sender;

          if (password) {
            await sender.setPassword(password);
          }

          addLog("Sending file offer...");
          await sender.sendOffer();
          dispatchTransfer({ type: "AWAIT_ACCEPTANCE" });

          sender.onAccepted(() => {
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
            });
            onDataRef.current?.(p);
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
          const message = validatePeerMessage(data);
          if (message && message.type === "chunk-ack") {
            // Handled internally by FileSender
          }
        } catch (err) {
          logger.error({ err }, "[SEND] Invalid peer message");
        }
      });

      conn.on("error", (err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Connection error: ${msg}`);
        addLog(`✗ Connection error: ${msg}`);
        playErrorSound();
        resetSend();
      });

      conn.on("close", () => {
        if (transferState.status !== "complete") {
          setError("Connection closed");
          addLog("✗ Connection closed");
          resetSend();
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
    transferState.status,
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
    handleCancel,
    resetSend,
  };
}
