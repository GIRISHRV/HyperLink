import { useState, useRef, useEffect, useCallback } from "react";
import { PeerManager } from "@/lib/webrtc/peer-manager";
import { FileSender } from "@/lib/transfer/sender";
import type { DataConnection } from "peerjs";
import { getIceServers, getPeerConfigAsync } from "@/lib/config/webrtc";
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
  } = useTransferState();
  const [error, setError] = useState("");
  const [transferId, setTransferId] = useState<string | null>(null);
  const [isPeerReady, setIsPeerReady] = useState(false);

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

  const { request: requestWakeLock, release: releaseWakeLock } = useWakeLock();
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
    if ("clearAppBadge" in navigator) {
      navigator.clearAppBadge().catch((err: unknown) => logger.error({ err }, "[SEND] clearAppBadge failed:"));
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
      logger.info({ userId: user.id }, "[SEND] User authenticated");

      const iceServers = await getIceServers();
      const config = await getPeerConfigAsync(iceServers);
      peerManagerRef.current = new PeerManager(config);

      await peerManagerRef.current.initialize();
      addLog("✓ Peer manager initialized successfully");
      setIsPeerReady(true);

      peerManagerRef.current.on("incoming-connection", (rawConnection: unknown) => {
        const connection = rawConnection as DataConnection;
        // Reject incoming connections — sender initiates outward
        connection.on("open", () => {
          connection.send({
            type: "sender-busy",
            transferId: "",
            payload: null,
            timestamp: Date.now(),
          });
          setTimeout(() => connection.close(), 100);
        });
      });

      peerManagerRef.current.on("reconnecting", (data: unknown) => {
        const info = data as { attempt: number; maxAttempts: number };
        toast.warning(
          `Reconnecting to server... (${info.attempt}/${info.maxAttempts})`,
          { id: "reconnect" }
        );
      });
      peerManagerRef.current.on("reconnected", () => {
        toast.success("Reconnected to server", { id: "reconnect" });
      });
      peerManagerRef.current.on("reconnect-failed", () => {
        toast.error(
          "Failed to reconnect to server. Please refresh the page.",
          { id: "reconnect" }
        );
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

  const handleSend = useCallback(async () => {
    if (!file || !receiverPeerId || !user) {
      toast.error("Missing file, recipient ID, or authentication");
      return;
    }

    dispatchTransfer({ type: "CONNECT" });
    setError("");
    dispatchTransfer({
      type: "PROGRESS",
      bytesTransferred: 0,
      speed: 0,
      remaining: 0,
    });
    addLog(`> Connecting to peer: ${receiverPeerId.slice(0, 8)}...`);

    let dbTransferId: string | null = null;

    try {
      const transfer = await createTransfer(user.id, {
        filename: file.name,
        fileSize: file.size,
      });
      if (!transfer) throw new Error("Failed to create transfer record");

      setTransferId(transfer.id);
      dbTransferId = transfer.id;
      addLog(`✓ Transfer record created: ${transfer.id.slice(0, 8)}`);

      addLog(`> Initiating connection to ${receiverPeerId}...`);
      const connection =
        peerManagerRef.current!.connectToPeer(receiverPeerId);
      connectionRef.current = connection;

      connection.on("close", () => {
        logger.info("[CONNECTION] Connection closed by remote peer");
        if (transferState.status === "complete") return;
        resetSend();
      });

      connection.on("error", (err: unknown) => {
        logger.error({ err }, "[CONNECTION] Error on active connection");
        dispatchTransfer({
          type: "FAIL",
          error: "Connection error: " + err,
        });
      });

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Connection timeout")),
          30000
        );
        connection.on("open", () => {
          clearTimeout(timeout);
          addLog("✓ Peer connection established");
          vibrate("medium");
          playConnectionSound();
          resolve();
        });
        connection.on("data", (data: unknown) => {
          onDataRef.current?.(data);
        });
        connection.on("error", (err: unknown) => {
          if (connectionRef.current !== connection) return;
          logger.error({ err }, "[CONNECTION] Error");
          dispatchTransfer({
            type: "FAIL",
            error: "Connection error: " + err,
          });
        });
      });

      await updateTransferStatus(transfer.id, "transferring");
      addLog("> Setting up file transfer...");
      const sender = new FileSender(file, connection, dbTransferId);
      fileSenderRef.current = sender;

      if (password) {
        addLog("> Setting up end-to-end encryption...");
        await sender.setPassword(password);
      }

      addLog(
        "> Sending exact file metadata and waiting for acceptance..."
      );
      dispatchTransfer({ type: "AWAIT_ACCEPTANCE" });
      await sender.sendOffer();

      sender.onPauseChange((paused) => {
        dispatchTransfer({ type: paused ? "PAUSE" : "RESUME" });
        addLog(
          paused
            ? "> Transfer paused by receiver"
            : "> Transfer resumed by receiver"
        );
      });

      sender.onReject(() => {
        dispatchTransfer({
          type: "FAIL",
          error: "Receiver rejected the file offer",
        });
        addLog("✗ Receiver rejected the file");
        vibrate("error");
        playErrorSound();
      });

      sender
        .startTransfer((progressData) => {
          if (
            fileSenderRef.current?.getStatus() === "transferring" &&
            transferState.status !== "transferring"
          ) {
            dispatchTransfer({
              type: "START_TRANSFER",
              totalBytes: file.size,
            });
          }
          dispatchTransfer({
            type: "PROGRESS",
            bytesTransferred: progressData.bytesTransferred,
            speed: progressData.speed,
            remaining: progressData.timeRemaining,
          });
          if (
            Math.floor(progressData.percentage) % 10 === 0 &&
            Math.floor(progressData.percentage) !==
            Math.floor(
              ((progressData.bytesTransferred - 16384) /
                progressData.totalBytes) *
              100
            )
          ) {
            addLog(
              `> Progress: ${progressData.percentage.toFixed(0)}%`
            );
          }
        })
        .then(async () => {
          addLog("✓ Transfer complete");
          dispatchTransfer({ type: "COMPLETE" });
          vibrate("success");
          playSuccessSound();
          if (dbTransferId)
            await updateTransferStatus(dbTransferId, "complete");
          if ("setAppBadge" in navigator) {
            navigator.setAppBadge(1)
              .catch((err: unknown) => logger.error({ err }, "[SEND] setAppBadge failed:"));
          }
        })
        .catch((err) => {
          if (
            err.message === "Transfer cancelled by receiver" ||
            err.message === "File offer rejected by receiver"
          ) {
            dispatchTransfer({ type: "CANCEL" });
            vibrate("error");
            playErrorSound();
            if (dbTransferId)
              updateTransferStatus(dbTransferId, "cancelled");
            return;
          }
          addLog(`✗ Transfer failed: ${err.message}`);
          logger.error({ err }, "[SEND] Transfer failed:");
          dispatchTransfer({
            type: "FAIL",
            error: "Transfer failed: " + err.message,
          });
          if (dbTransferId)
            updateTransferStatus(dbTransferId, "failed");
        });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error({ err }, "Transfer failed:");
      if (errMsg.includes("peer-unavailable")) {
        dispatchTransfer({
          type: "FAIL",
          error:
            "Cannot find peer. Ensure they have the site open and the ID is correct.",
        });
      } else {
        dispatchTransfer({
          type: "FAIL",
          error: errMsg || "Unknown error",
        });
      }
      addLog(`✗ Transfer failed: ${errMsg}`);
      dispatchTransfer({ type: "CANCEL" });
      vibrate("error");
      playErrorSound();
      if (dbTransferId) {
        updateTransferStatus(dbTransferId, "failed");
      }
    }
  }, [
    file,
    receiverPeerId,
    user,
    password,
    addLog,
    dispatchTransfer,
    vibrate,
    transferState.status,
    resetSend,
  ]);

  const handlePauseResume = useCallback(() => {
    if (!fileSenderRef.current) return;
    if (transferState.status === "paused") {
      fileSenderRef.current.resume();
      dispatchTransfer({ type: "RESUME" });
    } else {
      fileSenderRef.current.pause();
      dispatchTransfer({ type: "PAUSE" });
    }
  }, [transferState.status, dispatchTransfer]);

  const handleCancel = useCallback(() => {
    if (!fileSenderRef.current) return;
    fileSenderRef.current.cancel();
    dispatchTransfer({ type: "CANCEL" });
    addLog("✗ Transfer cancelled by user");
    if (transferId) updateTransferStatus(transferId, "cancelled");
  }, [dispatchTransfer, addLog, transferId]);

  return {
    transferState,
    dispatchTransfer,
    isTransferActive,
    isPeerReady,
    transferId,
    error,
    connectionRef,
    peerManagerRef,
    handleSend,
    resetSend,
    handlePauseResume,
    handleCancel,
    showBackModal,
    confirmBackNavigation,
    cancelBackNavigation,
  };
}
