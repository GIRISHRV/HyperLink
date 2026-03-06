import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { PeerManager } from "@/lib/webrtc/peer-manager";
import { FileReceiver } from "@/lib/transfer/receiver";
import { getIceServers, getPeerConfigAsync } from "@/lib/config/webrtc";
import {
  claimTransferAsReceiver,
  updateTransferStatus,
} from "@/lib/services/transfer-service";
import { useTransferGuard } from "@/lib/hooks/use-transfer-guard";
import { useTransferState } from "@/lib/hooks/use-transfer-state";
import { useWakeLock } from "@/lib/hooks/use-wake-lock";
import { useHaptics } from "@/lib/hooks/use-haptics";
import {
  requestNotificationPermission,
  notifyTransferComplete,
  playErrorSound,
  playSuccessSound,
  isSecureContext,
} from "@/lib/utils/notification";
import { logger } from "@repo/utils";
import { getMimeType } from "@/lib/utils/mime";
import { supabase } from "@/lib/supabase/client";
import { updateUserProfile } from "@/lib/services/profile-service";
import type {
  PeerMessage,
  TransferProgress,
  ChunkPayload,
  FileOfferPayload,
} from "@repo/types";
import type { DataConnection } from "peerjs";

export interface PendingOffer {
  filename: string;
  fileSize: number;
  fileType: string;
  connection: DataConnection;
  message: PeerMessage<FileOfferPayload>;
  dbTransferId?: string;
  password?: string;
}

interface UseReceiveTransferOptions {
  user: { id: string } | null;
  onData?: (data: unknown) => void;
  onLog?: (msg: string) => void;
}

export function useReceiveTransfer({
  user,
  onData,
  onLog,
}: UseReceiveTransferOptions) {
  const {
    state: transferState,
    dispatch: dispatchTransfer,
  } = useTransferState();

  const [myPeerId, setMyPeerId] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<TransferProgress | null>(null);
  const [cleanupProgress, setCleanupProgress] = useState<{
    cleared: number;
    total: number;
  } | null>(null);
  const [receivedFile, setReceivedFile] = useState<{
    name: string;
    size: number;
    blob?: Blob;
  } | null>(null);
  const [transferId, setTransferId] = useState<string | null>(null);
  const [pendingOffer, setPendingOffer] = useState<PendingOffer | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [preparedShareData, setPreparedShareData] = useState<ShareData | null>(
    null
  );
  const [showShareFallback, setShowShareFallback] = useState(false);

  const peerManagerRef = useRef<PeerManager | null>(null);
  const initializingRef = useRef(false);
  const fileReceiverRef = useRef<FileReceiver | null>(null);
  const activeConnectionRef = useRef<DataConnection | null>(null);
  const statusRef = useRef(transferState.status);

  // Keep statusRef in sync for use in event handlers
  useEffect(() => {
    statusRef.current = transferState.status;
  }, [transferState.status]);

  // Ref for onData callback to avoid stale closures
  const onDataRef = useRef(onData);
  useEffect(() => {
    onDataRef.current = onData;
  }, [onData]);

  const { request: requestWakeLock, release: releaseWakeLock, isLocked: isWakeLockActive } = useWakeLock();
  const { vibrate } = useHaptics();

  const isReceiveTransferActive =
    transferState.status === "connecting" ||
    transferState.status === "offering" ||
    transferState.status === "transferring" ||
    transferState.status === "paused";

  const { showBackModal, confirmBackNavigation, cancelBackNavigation } =
    useTransferGuard(transferId || "", isReceiveTransferActive);

  // Notification permission & secure context check
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
    if (transferState.status === "transferring" && progress) {
      document.title = `${progress.percentage.toFixed(0)}% - Downloading...`;
    } else if (transferState.status === "complete") {
      document.title = "File Received - HyperLink";
    } else {
      document.title = "HyperLink - Secure P2P";
    }

    if (transferState.status === "complete") {
      notifyTransferComplete("received", receivedFile?.name || "File");
    }

    if (
      transferState.status === "connecting" ||
      transferState.status === "transferring" ||
      transferState.status === "offering"
    ) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
  }, [
    transferState.status,
    progress,
    receivedFile,
    requestWakeLock,
    releaseWakeLock,
  ]);

  // Navigation warning for active transfers
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isReceiveTransferActive) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isReceiveTransferActive]);

  function resetReceive() {
    dispatchTransfer({ type: "RESET" });
    setError("");
    setProgress(null);
    setReceivedFile(null);
    setTransferId(null);
    setPendingOffer(null);
    setCleanupProgress(null);
    fileReceiverRef.current = null;
  }

  // Peer initialization
  const checkAuthAndInitPeer = useCallback(
    async (isMountedCheck: () => boolean) => {
      logger.info(
        {
          hasPeerManager: !!peerManagerRef.current,
          isInitializing: initializingRef.current,
        },
        "[RECEIVE] checkAuthAndInitPeer called"
      );

      if (peerManagerRef.current) {
        const peerId = peerManagerRef.current.getPeerId();
        logger.info({ peerId }, "[RECEIVE] Peer already exists");
        if (peerId) {
          setMyPeerId(peerId);
        }
        return;
      }

      if (initializingRef.current) {
        logger.info("[RECEIVE] Already initializing, skipping");
        return;
      }

      logger.info("[RECEIVE] Starting initialization...");
      initializingRef.current = true;
      try {
        if (!user) {
          logger.info("[RECEIVE] No user yet, waiting...");
          initializingRef.current = false;
          return;
        }
        logger.info({ userId: user.id }, "[RECEIVE] User authenticated");

        const iceServers = await getIceServers();
        // Task #4: Support Compatibility Mode (Forced Relay)
        const forceRelay = localStorage.getItem("hl_compatibility_mode") === "true";
        const config = await getPeerConfigAsync(iceServers, forceRelay);

        logger.info({ config, forceRelay }, "[RECEIVE] Creating PeerManager");
        peerManagerRef.current = new PeerManager(config);

        // Task #4: Listen for firewall blocked events
        peerManagerRef.current.on("firewall-blocked", () => {
          toast.error("Firewall Blocked", {
            description: "Your network is preventing a direct connection. Try enabling 'Compatibility Mode' in Settings.",
            duration: 10000,
          });
        });

        logger.info("[RECEIVE] Initializing PeerManager...");
        // Task #3: Fetch Supabase JWT for signaling authentication
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        // Task #9: Generate a stable, user-linked Peer ID
        const stablePeerId = PeerManager.getRandomId(`hl-${user.id.slice(0, 8)}`);
        const id = await peerManagerRef.current.initialize(stablePeerId, token);

        if (!isMountedCheck()) {
          logger.info(
            "[RECEIVE] Component unmounted during peer initialization"
          );
          return;
        }

        logger.info({ id }, "[RECEIVE] PeerManager initialized");
        setMyPeerId(id);

        // Task #5: Update Supabase with the active Peer ID for discovery (non-blocking)
        updateUserProfile(user.id, { active_peer_id: id }).catch((err) => {
          logger.error({ err }, "[RECEIVE] Failed to update user profile with Peer ID");
        });

        logger.info("[RECEIVE] Listening for incoming connections...");

        // Reconnection event listeners
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

        peerManagerRef.current.on(
          "incoming-connection",
          async (rawConnection: unknown) => {
            const connection = rawConnection as DataConnection;
            const currentStatus = statusRef.current;
            const isBusy =
              currentStatus === "connecting" ||
              currentStatus === "offering" ||
              currentStatus === "transferring" ||
              currentStatus === "paused";

            if (isBusy) {
              connection.on("open", () => {
                connection.send({
                  type: "receiver-busy",
                  transferId: "",
                  payload: null,
                  timestamp: Date.now(),
                });
                setTimeout(() => connection.close(), 100);
              });
              return;
            }

            activeConnectionRef.current = connection;
            fileReceiverRef.current = null;
            dispatchTransfer({ type: "CONNECT" });
            setError("");
            setProgress(null);
            onLog?.("[SYS] Peer connected");
            logger.info(
              "[CONNECTION] Incoming peer connection detected"
            );

            connection.on("open", () => {
              if (activeConnectionRef.current !== connection) return;
            });

            connection.on("close", () => {
              if (activeConnectionRef.current !== connection) return;
              logger.info("[CONNECTION] Peer connection closed");

              if (statusRef.current === "complete") {
                activeConnectionRef.current = null;
                return;
              }

              resetReceive();
              activeConnectionRef.current = null;
            });

            connection.on("error", (err: unknown) => {
              if (activeConnectionRef.current !== connection) return;
              logger.error(
                { err },
                "[RECEIVE PAGE] Connection ERROR"
              );
              setError(`Connection error: ${err}`);
              dispatchTransfer({
                type: "FAIL",
                error: `Connection error: ${err}`,
              });
            });

            connection.on("data", async (data: unknown) => {
              if (activeConnectionRef.current !== connection) return;
              onDataRef.current?.(data); // Forward chat messages
              const message = data as PeerMessage;

              if (message.type === "file-offer") {
                onLog?.("[SYS] File offer received");
                logger.info(
                  { message },
                  "[RECEIVE] 🎯 FILE-OFFER received"
                );
                setShowCancelModal(false);

                const transferData =
                  message.payload as FileOfferPayload;
                const offerData: PendingOffer = {
                  filename: transferData.filename,
                  fileSize: transferData.fileSize,
                  fileType: transferData.fileType,
                  connection,
                  message:
                    message as PeerMessage<FileOfferPayload>,
                  dbTransferId: transferData.dbTransferId,
                };
                setPendingOffer(offerData);
                setReceivedFile({
                  name: transferData.filename,
                  size: transferData.fileSize,
                });

                dispatchTransfer({ type: "OFFER" });
              } else if (message.type === "chunk" || message.type === "chunk-probe") {
                if (fileReceiverRef.current) {
                  await fileReceiverRef.current.handleChunk(
                    message as PeerMessage<ChunkPayload>
                  );
                }
              } else if (
                message.type === "transfer-cancel" ||
                message.type === "transfer-pause" ||
                message.type === "transfer-resume"
              ) {
                if (
                  message.type === "transfer-cancel" &&
                  !fileReceiverRef.current
                ) {
                  setPendingOffer(null);
                  setReceivedFile(null);
                  dispatchTransfer({ type: "CANCEL" });
                  return;
                }
                if (fileReceiverRef.current) {
                  fileReceiverRef.current.handleControlMessage(message);

                  // Update UI state based on control message
                  if (message.type === "transfer-cancel") {
                    dispatchTransfer({ type: "CANCEL" });
                    setReceivedFile(null);
                  } else if (message.type === "transfer-pause") {
                    dispatchTransfer({ type: "PAUSE", pausedBy: "remote" });
                  } else if (message.type === "transfer-resume") {
                    dispatchTransfer({ type: "RESUME" });
                  }
                }
              }
            });
          }
        );
      } catch (err: unknown) {
        logger.error({ err }, "[RECEIVE] Initialization failed:");
        if (isMountedCheck()) {
          const errMsg =
            err instanceof Error ? err.message : String(err);
          setError(`Failed to initialize: ${errMsg}`);
        }
      } finally {
        initializingRef.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user]
  );

  // Initialization effect
  useEffect(() => {
    let isMounted = true;
    checkAuthAndInitPeer(() => isMounted);
    return () => {
      isMounted = false;
      initializingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkAuthAndInitPeer]);

  async function startTransferSequence(pw?: string) {
    if (!pendingOffer) return;

    const {
      connection,
      message,
      dbTransferId: senderDbId,
    } = pendingOffer;

    logger.info("[RECEIVE PAGE] Creating FileReceiver...");
    const receiver = new FileReceiver();
    fileReceiverRef.current = receiver;
    receiver.setConnection(connection);
    if (senderDbId) {
      receiver.setStorageId(senderDbId);
    }
    logger.info(
      "[RECEIVE PAGE] FileReceiver created and assigned to ref"
    );

    let dbTransferId: string | null = null;

    receiver.onProgress((progressData) => {
      setProgress(progressData);
    });

    receiver.onCleanup((cleared, total) => {
      setCleanupProgress({ cleared, total });
    });

    receiver.onComplete(async (blob) => {
      setReceivedFile({
        name: pendingOffer.filename,
        size: pendingOffer.fileSize,
        blob,
      });

      // Pre-prepare share data
      try {
        const type = getMimeType(pendingOffer.filename);
        const nameParts = pendingOffer.filename.split(".");
        const extension =
          nameParts.length > 1 ? nameParts.pop() : "";
        const baseName = nameParts
          .join(".")
          .replace(/[^a-z0-9]/gi, "_");
        const cleanName = extension
          ? `${baseName}.${extension}`
          : baseName;

        const fileToShow = new File([blob], cleanName, {
          type,
          lastModified: Date.now(),
        });

        setPreparedShareData({
          files: [fileToShow],
          title: cleanName,
        });
      } catch (e) {
        logger.error({ e }, "Failed to pre-prepare share data:");
      }

      dispatchTransfer({ type: "COMPLETE" });
      vibrate("success");
      playSuccessSound();
      notifyTransferComplete("received", pendingOffer.filename);
      if (dbTransferId) await updateTransferStatus(dbTransferId, "complete");

      if ("setAppBadge" in navigator) {
        navigator.setAppBadge(1)
          .catch((err: unknown) => logger.error({ err }, "[RECEIVE] setAppBadge failed:"));
      }
      onLog?.("[SYS] Transfer complete");
    });

    receiver.onCancel(async () => {
      dispatchTransfer({ type: "CANCEL" });
      logger.info("[CANCEL] Transfer cancelled by sender");
      onLog?.("[SYS] Transfer cancelled by peer");
      vibrate("error");
      playErrorSound();
      if (dbTransferId) await updateTransferStatus(dbTransferId, "cancelled");
    });

    receiver.onPauseChange((paused) => {
      if (paused) {
        dispatchTransfer({ type: "PAUSE", pausedBy: "remote" });
        logger.info("[PAUSE] Transfer paused by sender");
      } else {
        dispatchTransfer({ type: "RESUME" });
        logger.info("[RESUME] Transfer resumed by sender");
      }
    });

    receiver.onError((recvError) => {
      const msg = typeof recvError === "string" ? recvError : recvError.message;
      if (recvError === "DECRYPTION_FAILED") {
        setError("Incorrect password. The transfer was cancelled.");
        onLog?.("[ERR] Decryption failed. Incorrect password.");
        dispatchTransfer({
          type: "FAIL",
          error: "Incorrect password. The transfer was cancelled.",
        });
      } else {
        setError(`Transfer error: ${msg}`);
        onLog?.(`[ERR] ${msg}`);
        dispatchTransfer({
          type: "FAIL",
          error: `Transfer error: ${msg}`,
        });
      }
    });

    logger.info("[RECEIVE PAGE] Calling handleOffer on receiver...");
    receiver.handleOffer(message);

    if (pw) {
      logger.info("[RECEIVE PAGE] Processing password...");
      try {
        await receiver.processPassword(pw);
      } catch (e) {
        logger.error({ e }, "[RECEIVE PAGE] Key derivation failed");
        setError("Failed to verify password. Please try again.");
        dispatchTransfer({
          type: "FAIL",
          error: "Failed to verify password",
        });
        fileReceiverRef.current = null;
        return;
      }
    }

    logger.info(
      "[RECEIVE PAGE] Receiver setup complete, ready for chunks"
    );

    dispatchTransfer({
      type: "START_TRANSFER",
      totalBytes: pendingOffer.fileSize,
    });
    setPendingOffer(null);

    // If we have existing chunks from a prior crash, tell sender to skip ahead
    fileReceiverRef.current?.sendResumeFrom();

    if (senderDbId) {
      const claimed = await claimTransferAsReceiver(senderDbId);
      if (claimed) {
        dbTransferId = claimed.id;
        setTransferId(claimed.id);
        await updateTransferStatus(claimed.id, "transferring");
      }
    }

    // Give the receiver a moment to fully initialize before sending acceptance
    await new Promise((resolve) => setTimeout(resolve, 100));
    logger.info(
      "[RECEIVE PAGE] Sending file-accept message to sender..."
    );

    const acceptMessage: PeerMessage = {
      type: "file-accept",
      transferId: message.transferId,
      payload: null,
      timestamp: Date.now(),
    };
    connection.send(acceptMessage);
    logger.info("[RECEIVE PAGE] file-accept message sent");
  }

  async function handleAcceptOffer() {
    logger.info("[RECEIVE PAGE] handleAcceptOffer called");
    if (!pendingOffer) return;

    if (
      pendingOffer.message.payload.isEncrypted &&
      !pendingOffer.password
    ) {
      logger.info(
        "[RECEIVE PAGE] File is encrypted, prompting for password..."
      );
      setShowPasswordModal(true);
      return;
    }

    startTransferSequence(pendingOffer.password);
  }

  function handlePasswordSubmit(pw: string) {
    if (!pendingOffer) return;
    setPendingOffer({ ...pendingOffer, password: pw });
    setShowPasswordModal(false);
    startTransferSequence(pw);
  }

  function handleRejectOffer() {
    if (!pendingOffer) return;

    const {
      connection,
      message,
      dbTransferId: senderDbId,
    } = pendingOffer;

    const rejectMessage: PeerMessage = {
      type: "file-reject",
      transferId: message.transferId,
      payload: null,
      timestamp: Date.now(),
    };
    connection.send(rejectMessage);

    if (senderDbId) {
      updateTransferStatus(senderDbId, "cancelled");
    }

    setPendingOffer(null);
    setReceivedFile(null);
  }

  function handleDownload() {
    if (!receivedFile || !receivedFile.blob) return;

    const url = URL.createObjectURL(receivedFile.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = receivedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleShare() {
    if (!preparedShareData) {
      toast.error("Share data not ready.");
      return;
    }

    try {
      await navigator.share(preparedShareData);
      logger.info("✓ Share successful");
    } catch (err) {
      const shareError = err as Error;
      if (shareError.name === "AbortError") return;

      logger.error({ shareError }, "[Share] Failed:");
      logger.error(`✗ Share Error: ${shareError.name}`);

      setShowShareFallback(true);
      toast.info(
        "System blocked the file share. Tap the 'Share Link' button that just appeared."
      );
    }
  }

  async function handleTextShareFallback() {
    if (!receivedFile) return;
    try {
      await navigator.share({
        title: receivedFile.name,
        text: `HyperLink: Receive file at ${window.location.origin}`,
        url: window.location.origin,
      });
      logger.info("✓ Shared text fallback");
      setShowShareFallback(false);
    } catch (err) {
      logger.error(`✗ Fallback failed: ${(err as Error).name}`);
      toast.error("Sharing failed. Try downloading directly.");
    }
  }

  function handleCancelClick() {
    setShowCancelModal(true);
  }

  async function confirmCancel() {
    setShowCancelModal(false);
    if (fileReceiverRef.current) {
      await fileReceiverRef.current.cancel();
    }

    dispatchTransfer({ type: "CANCEL" });
    if (transferId) {
      await updateTransferStatus(transferId, "cancelled");
    }
  }

  async function handlePauseResume() {
    if (!fileReceiverRef.current) return;
    if (transferState.status === "paused") {
      if (transferState.pausedBy === "remote") return;
      await fileReceiverRef.current.resume();
      dispatchTransfer({ type: "RESUME" });
    } else {
      await fileReceiverRef.current.pause();
      dispatchTransfer({ type: "PAUSE", pausedBy: "local" });
    }
  }

  function copyPeerId() {
    navigator.clipboard.writeText(myPeerId);
  }

  return {
    // State
    transferState,
    myPeerId,
    error,
    progress,
    receivedFile,
    transferId,
    pendingOffer,
    cleanupProgress,
    isReceiveTransferActive,
    isWakeLockActive,

    // Modal states
    showPasswordModal,
    setShowPasswordModal,
    showCancelModal,
    setShowCancelModal,
    showBackModal,
    confirmBackNavigation,
    cancelBackNavigation,

    // Share state
    preparedShareData,
    showShareFallback,

    // Refs (for diagnostics / chat)
    peerManagerRef,
    activeConnectionRef,

    // Handlers
    handleAcceptOffer,
    handleRejectOffer,
    handlePasswordSubmit,
    handleDownload,
    handleShare,
    handleTextShareFallback,
    handlePauseResume,
    handleCancelClick,
    confirmCancel,
    resetReceive,
    copyPeerId,
  };
}
