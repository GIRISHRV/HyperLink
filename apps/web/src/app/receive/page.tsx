"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/services/auth-service";
import { claimTransferAsReceiver, updateTransferStatus } from "@/lib/services/transfer-service";
import { PeerManager } from "@/lib/webrtc/peer-manager";
import { FileReceiver } from "@/lib/transfer/receiver";
import { useTransferGuard } from "@/lib/hooks/use-transfer-guard";
import type { PeerConfig, PeerMessage, TransferProgress } from "@repo/types";
import { formatFileSize, formatTime } from "@repo/utils";
import ConfirmLeaveModal from "@/components/confirm-leave-modal";
import ConfirmCancelModal from "@/components/confirm-cancel-modal";
import FileOfferPrompt from "@/components/file-offer-prompt";
import { requestNotificationPermission, notifyTransferComplete } from "@/lib/utils/notification";

export default function ReceivePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [myPeerId, setMyPeerId] = useState("");
  const [status, setStatus] = useState<"idle" | "connecting" | "prompted" | "receiving" | "paused" | "complete" | "error" | "cancelled">(
    "idle"
  );
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<TransferProgress | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [receivedFile, setReceivedFile] = useState<{
    name: string;
    size: number;
    blob?: Blob;
  } | null>(null);
  const [transferId, setTransferId] = useState<string | null>(null);
  const [pendingOffer, setPendingOffer] = useState<{
    filename: string;
    fileSize: number;
    fileType: string;
    connection: any;
    message: any;
    dbTransferId?: string;
  } | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [logs, setLogs] = useState<string[]>(["[RADAR] Initializing P2P receiver...", "[RADAR] Waiting for incoming connections..."]);

  const peerManagerRef = useRef<PeerManager | null>(null);
  const fileReceiverRef = useRef<FileReceiver | null>(null);
  const activeConnectionRef = useRef<any>(null);
  const statusRef = useRef(status);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  function addLog(message: string) {
    setLogs((prev) => [...prev.slice(-10), message]); // Keep last 10 logs
  }

  const isTransferActive = status === "connecting" || status === "prompted" || status === "receiving" || status === "paused";
  const { showBackModal, confirmBackNavigation, cancelBackNavigation } = useTransferGuard(transferId, isTransferActive);

  useEffect(() => {
    let isMounted = true;

    checkAuthAndInitPeer(() => isMounted);
    requestNotificationPermission();

    return () => {
      isMounted = false;
      if (peerManagerRef.current) {
        peerManagerRef.current.destroy();
        peerManagerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navigation warning for active transfers
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isTransferActive) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isTransferActive]);

  async function checkAuthAndInitPeer(isMountedCheck: () => boolean) {
    try {
      const currentUser = await getCurrentUser();

      if (!isMountedCheck()) return;

      if (!currentUser) {
        router.push("/auth");
        return;
      }
      setUser(currentUser);
    } catch (e) {
      console.error("Auth check failed:", e);
      router.push("/auth");
      return;
    }

    const config: PeerConfig = {
      host: process.env.NEXT_PUBLIC_PEER_SERVER_HOST!,
      port: parseInt(process.env.NEXT_PUBLIC_PEER_SERVER_PORT!),
      path: process.env.NEXT_PUBLIC_PEER_SERVER_PATH!,
      secure: window.location.protocol === "https:",
      debug: 0,
    };

    peerManagerRef.current = new PeerManager(config);

    try {
      const peerId = await peerManagerRef.current.initialize();

      if (!isMountedCheck()) return;

      setMyPeerId(peerId);

      peerManagerRef.current.on("incoming-connection", async (connection: any) => {
        const currentStatus = statusRef.current;
        const isBusy = currentStatus === "connecting" || currentStatus === "prompted" ||
          currentStatus === "receiving" || currentStatus === "paused";

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
        setStatus("connecting");
        setError("");
        setProgress(null);
        setIsPaused(false);
        addLog("[CONNECTION] Incoming peer connection detected");

        connection.on("open", () => {
          if (activeConnectionRef.current !== connection) return;
        });

        if (connection.open) {
        }

        connection.on("close", () => {
          if (activeConnectionRef.current !== connection) return;
          setStatus("idle");
        });

        connection.on("error", (err: any) => {
          if (activeConnectionRef.current !== connection) return;
          console.error("[RECEIVE PAGE] Connection ERROR:", err);
          setError(`Connection error: ${err}`);
          setStatus("error");
        });

        connection.on("data", async (data: any) => {
          if (activeConnectionRef.current !== connection) return;
          const message = data as PeerMessage;

          if (message.type === "file-offer") {
            const transferData = message.payload as any;

            setPendingOffer({
              filename: transferData.filename,
              fileSize: transferData.fileSize,
              fileType: transferData.fileType,
              connection,
              message,
              dbTransferId: transferData.dbTransferId,
            });
            setReceivedFile({ name: transferData.filename, size: transferData.fileSize });
            setStatus("prompted");
          } else if (message.type === "chunk") {
            console.log("[RECEIVE PAGE] Chunk received, fileReceiverRef.current:", !!fileReceiverRef.current, "status:", statusRef.current);
            if (fileReceiverRef.current) {
              await fileReceiverRef.current.handleChunk(message as any);
              const chunkIndex = (message.payload as any)?.chunkIndex;
              if (chunkIndex !== undefined && chunkIndex % 100 === 0) {
                addLog(`[RECEIVER] Processing chunk ${chunkIndex}`);
              }
            } else {
              console.warn("[RECEIVE PAGE] FileReceiver not initialized! Chunk arrived but receiver is null. Status:", statusRef.current);
              addLog("[ERROR] Chunk arrived before receiver ready");
            }
          } else if (message.type === "transfer-cancel" || message.type === "transfer-pause" || message.type === "transfer-resume") {
            if (message.type === "transfer-cancel" && !fileReceiverRef.current) {
              setPendingOffer(null);
              setReceivedFile(null);
              setStatus("cancelled");
              return;
            }
            if (fileReceiverRef.current) {
              fileReceiverRef.current.handleControlMessage(message as any);
            }
          } else {
          }
        });
      });
    } catch (err: any) {
      setError(`Failed to initialize: ${err.message}`);
    }
  }

  async function handleAcceptOffer() {
    console.log("[RECEIVE PAGE] handleAcceptOffer called");
    if (!pendingOffer) return;

    const { connection, message, dbTransferId: senderDbId } = pendingOffer;

    console.log("[RECEIVE PAGE] Creating FileReceiver...");
    const receiver = new FileReceiver();
    fileReceiverRef.current = receiver;
    receiver.setConnection(connection);
    console.log("[RECEIVE PAGE] FileReceiver created and assigned to ref");

    let dbTransferId: string | null = null;

    receiver.onProgress((progressData) => {
      setProgress(progressData);
    });

    receiver.onComplete((blob) => {
      setReceivedFile({ name: pendingOffer.filename, size: pendingOffer.fileSize, blob });
      setStatus("complete");
      notifyTransferComplete("received", pendingOffer.filename);
      if (dbTransferId) updateTransferStatus(dbTransferId, "complete");
    });

    receiver.onCancel(() => {
      setStatus("cancelled");
      addLog("[CANCEL] Transfer cancelled by sender");
      if (dbTransferId) updateTransferStatus(dbTransferId, "cancelled");
    });

    receiver.onPauseChange((paused) => {
      setIsPaused(paused);
      if (paused) {
        setStatus("paused");
        addLog("[PAUSE] Transfer paused by sender");
      } else {
        setStatus("receiving");
        addLog("[RESUME] Transfer resumed by sender");
      }
    });

    console.log("[RECEIVE PAGE] Calling handleOffer on receiver...");
    receiver.handleOffer(message as any);
    console.log("[RECEIVE PAGE] handleOffer completed");
    setStatus("receiving");
    setPendingOffer(null);

    // Give the receiver a moment to fully initialize before sending acceptance
    // This prevents chunks from arriving before the receiver is ready
    console.log("[RECEIVE PAGE] Waiting 100ms before sending accept...");
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log("[RECEIVE PAGE] Sending file-accept message to sender...");

    const acceptMessage: PeerMessage = {
      type: "file-accept",
      transferId: message.transferId,
      payload: null,
      timestamp: Date.now(),
    };
    connection.send(acceptMessage);
    console.log("[RECEIVE PAGE] file-accept message sent");

    if (senderDbId) {
      const claimed = await claimTransferAsReceiver(senderDbId);
      if (claimed) {
        dbTransferId = claimed.id;
        setTransferId(claimed.id);
        await updateTransferStatus(claimed.id, "transferring");
      }
    }
  }

  function handleRejectOffer() {
    if (!pendingOffer) return;

    const { connection, message, dbTransferId: senderDbId } = pendingOffer;

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
    setStatus("idle");
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

  function handleCancelClick() {
    setShowCancelModal(true);
  }

  async function confirmCancel() {
    setShowCancelModal(false);
    if (fileReceiverRef.current) {
      fileReceiverRef.current.cancel();
    }
    setStatus("cancelled");
    if (transferId) {
      await updateTransferStatus(transferId, "cancelled");
    }
  }

  function handlePauseResume() {
    if (!fileReceiverRef.current) return;
    if (isPaused) {
      fileReceiverRef.current.resume();
      setIsPaused(false);
    } else {
      fileReceiverRef.current.pause();
      setIsPaused(true);
    }
  }

  function resetReceive() {
    setStatus("idle");
    setError("");
    setProgress(null);
    setReceivedFile(null);
    setTransferId(null);
    setIsPaused(false);
    setPendingOffer(null);
    fileReceiverRef.current = null;
  }

  function copyPeerId() {
    navigator.clipboard.writeText(myPeerId);
  }

  return (
    <div className="bg-background-light dark:bg-[#121212] min-h-screen text-[#121212] dark:text-white overflow-x-hidden font-display flex flex-col">
      {/* Navbar: Split Header Design */}
      <nav className="w-full flex flex-col md:flex-row border-b border-[#333]">
        <div className="bg-primary text-[#121212] px-8 py-6 flex items-center justify-center md:justify-start min-w-[200px]">
          <span className="font-black text-4xl tracking-tighter uppercase">HYPER</span>
        </div>
        <div className="flex-1 bg-white dark:bg-[#121212] flex items-center justify-between px-8 py-4 md:py-0">
          <span className="font-black text-4xl tracking-tighter uppercase text-[#121212] dark:text-white">LINK</span>
          <div className="flex gap-4 md:gap-8 items-center">
            <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-[#1a1a1a] border border-[#333]">
              <div className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </div>
              <span className="text-xs font-mono text-gray-400">Radar Active</span>
              {user && <span className="text-xs font-mono text-white ml-2">• {user.email}</span>}
            </div>
            <button
              onClick={() => {
                if (isTransferActive && !confirm("Transfer in progress. Are you sure you want to leave? This will cancel the transfer.")) {
                  return;
                }
                router.push("/dashboard");
              }}
              className="h-12 px-6 bg-[#333] hover:bg-[#555] text-white text-sm font-bold uppercase tracking-wide transition-colors"
            >
              ← Dashboard
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto p-6 md:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Left Column: Peer ID & Incoming Queue */}
        <section className="lg:col-span-5 flex flex-col gap-8">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter uppercase leading-none">
              Receive <span className="text-primary">Files</span>
            </h1>
            <p className="text-[#bcb89a] text-lg font-medium max-w-md">
              Securely receive encrypted files directly to your device via WebRTC.
            </p>
          </div>

          {/* Peer ID Card */}
          <div className="bg-[#2d2b1f] border border-[#3a3827] p-1 shadow-2xl shadow-black/50">
            <div className="bg-[#23210f] border border-[#3a3827]/50 p-6 flex flex-col gap-6 relative overflow-hidden group">
              {/* Decorative blur */}
              <div className="absolute -right-10 -top-10 size-32 bg-primary/5 rounded-full blur-2xl"></div>

              <div className="flex flex-col gap-2 z-10">
                <label className="text-[#bcb89a] text-xs font-bold uppercase tracking-[0.15em]">Your Peer ID</label>
                <div className="font-mono text-2xl md:text-3xl text-white font-bold tracking-tight break-all border-l-4 border-primary pl-4 py-2">
                  {myPeerId ? myPeerId : "Loading..."}
                </div>
              </div>

              <div className="h-px w-full bg-[#3a3827]"></div>

              <div className="flex gap-3 z-10">
                <button
                  onClick={copyPeerId}
                  className="flex-1 h-12 bg-primary hover:bg-[#ffea2e] text-[#23210f] text-base font-bold tracking-wide uppercase flex items-center justify-center gap-2 transition-colors"
                >
                  <span className="material-symbols-outlined">content_copy</span>
                  Copy ID
                </button>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="p-6 border border-dashed border-[#3a3827] flex gap-4 items-start">
            <span className="material-symbols-outlined text-primary text-2xl">info</span>
            <div className="flex flex-col gap-1">
              <h4 className="text-white font-bold uppercase text-sm">How it works</h4>
              <p className="text-[#bcb89a] text-sm leading-relaxed">
                Share your Peer ID with the sender. Keep this tab open. The transfer will start automatically once connected.
              </p>
            </div>
          </div>

          {/* Incoming Queue */}
          <div className="flex flex-col gap-4">
            <h3 className="text-[#bcb89a] text-xs font-bold uppercase tracking-wider border-b border-[#3a3827] pb-2">
              Incoming Queue
            </h3>

            {status === "idle" && (
              <div className="text-center py-8 text-gray-500">
                <span className="material-symbols-outlined text-5xl opacity-20">download</span>
                <p className="mt-4 text-sm">Waiting for incoming connection...</p>
              </div>
            )}

            {status === "prompted" && pendingOffer && (
              <div className="bg-[#1a1a1a] p-4 border-l-4 border-bauhaus-blue flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/5 p-2">
                      <span className="material-symbols-outlined text-bauhaus-blue">help</span>
                    </div>
                    <div>
                      <p className="font-bold text-sm">{pendingOffer.filename}</p>
                      <p className="text-xs text-white/50 font-mono">
                        {formatFileSize(pendingOffer.fileSize)} • Awaiting your response
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-bauhaus-blue animate-pulse">
                    PENDING
                  </span>
                </div>
              </div>
            )}

            {(status === "receiving" || status === "paused") && receivedFile && progress && (
              <div className={`bg-[#1a1a1a] border-l-4 ${isPaused ? "border-orange-400" : "border-bauhaus-red"} relative overflow-hidden`}>
                {/* Progress Bar at bottom */}
                <div className="absolute bottom-0 left-0 h-1 bg-[#3a3827] w-full">
                  <div className={`h-full ${isPaused ? "bg-orange-400" : "bg-primary"}`} style={{ width: `${progress.percentage}%` }}></div>
                </div>

                <div className="p-4 flex items-center gap-4">
                  <div className="size-12 bg-[#23210f] flex items-center justify-center border border-[#3a3827] shrink-0">
                    <span className={`material-symbols-outlined ${isPaused ? "text-orange-400" : "text-bauhaus-red"} text-2xl`}>description</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`${isPaused ? "bg-orange-400" : "bg-bauhaus-red"} text-white text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-wider`}>
                        {isPaused ? "PAUSED" : "RECEIVING"}
                      </span>
                      <span className="text-white font-mono text-xs">{progress.percentage.toFixed(0)}%</span>
                    </div>
                    <h3 className="text-white font-bold text-sm truncate pr-2">{receivedFile.name}</h3>
                    <p className="text-[#bcb89a] text-xs font-mono mt-0.5">
                      {formatFileSize(receivedFile.size)} • {isPaused ? "Paused" : formatFileSize(progress.speed) + "/s"} • ETA: {formatTime(progress.timeRemaining)}
                    </p>
                  </div>
                </div>

                {/* Pause/Resume and Cancel */}
                <div className="flex gap-2 px-4 pb-4">
                  <button
                    onClick={handlePauseResume}
                    className={`flex-1 h-9 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors ${isPaused
                      ? "bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30"
                      : "bg-orange-400/20 text-orange-400 border border-orange-400/40 hover:bg-orange-400/30"
                      }`}
                  >
                    <span className="material-symbols-outlined !text-[16px]">
                      {isPaused ? "play_arrow" : "pause"}
                    </span>
                    {isPaused ? "Resume" : "Pause"}
                  </button>
                  <button
                    onClick={handleCancelClick}
                    className="flex-1 h-9 bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined !text-[16px]">close</span>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {status === "complete" && receivedFile && (
              <div className="bg-[#1a1a1a] p-4 border-l-4 border-primary flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/5 p-2">
                      <span className="material-symbols-outlined text-primary">check_circle</span>
                    </div>
                    <div>
                      <p className="font-bold text-sm">{receivedFile.name}</p>
                      <p className="text-xs text-white/50 font-mono">
                        {formatFileSize(receivedFile.size)} • Completed
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleDownload}
                  className="w-full h-10 bg-primary hover:bg-white text-black text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                >
                  <span className="material-symbols-outlined !text-[18px]">download</span>
                  Download to Disk
                </button>
              </div>
            )}

            {status === "cancelled" && (
              <div className="bg-[#1a1a1a] p-4 border-l-4 border-gray-500 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/5 p-2">
                      <span className="material-symbols-outlined text-gray-400">cancel</span>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-300">Transfer Cancelled</p>
                      <p className="text-xs text-white/50 font-mono">
                        {receivedFile ? formatFileSize(receivedFile.size) : "—"} • Cancelled
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={resetReceive}
                  className="w-full h-9 bg-primary text-black text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors hover:bg-white"
                >
                  Ready for New Transfer
                </button>
              </div>
            )}

            {error && (
              <div className="bg-bauhaus-red/10 border border-bauhaus-red/30 p-4">
                <p className="text-bauhaus-red text-sm">{error}</p>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Radar Visualizer */}
        <section className="lg:col-span-7 relative flex flex-col overflow-hidden border border-[#3a3827] bg-[#181810]">
          {/* Grid Background */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundSize: '40px 40px',
              backgroundImage: 'linear-gradient(to right, #3a3827 1px, transparent 1px), linear-gradient(to bottom, #3a3827 1px, transparent 1px)',
              maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)'
            }}
          ></div>

          {/* Radar Container */}
          <div className="flex-1 flex flex-col items-center justify-center relative min-h-[400px] p-8">
            {/* Radar Rings */}
            <div className="absolute flex items-center justify-center">
              {/* Outer Ring */}
              <div className="size-[300px] sm:size-[400px] border border-white/5 rounded-full flex items-center justify-center">
                {/* Mid Ring */}
                <div className="size-[200px] sm:size-[260px] border border-white/10 rounded-full flex items-center justify-center">
                  {/* Inner Ring */}
                  <div className="size-[100px] sm:size-[140px] border border-white/20 rounded-full bg-white/5 backdrop-blur-sm flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                    <div className="size-3 bg-primary rounded-full shadow-[0_0_15px_#ffe500] animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <div className="absolute top-8 left-0 right-0 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2d2b1f] border border-[#3a3827]">
                <span className="block size-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                <span className="text-xs font-mono text-[#bcb89a] uppercase">Radar Active</span>
              </div>
            </div>

            {/* Status Text */}
            <p className="mt-48 text-[#bcb89a] font-mono text-sm tracking-widest uppercase z-10">
              {status === "idle" && "Waiting for connection..."}
              {status === "prompted" && "Incoming File Offer"}
              {status === "receiving" && "Receiving Data..."}
              {status === "paused" && "Transfer Paused"}
              {status === "complete" && "Transfer Complete!"}
              {status === "cancelled" && "Transfer Cancelled"}
            </p>

            {/* Console Logs */}
            <div className="absolute bottom-4 left-4 right-4 bg-black/80 border-l-2 border-primary p-3 max-h-64 overflow-y-auto z-20">
              <div className="font-mono text-xs space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-green-400">
                    <span className="text-primary">›</span> {log}
                  </div>
                ))}
                <div className="flex items-center gap-1">
                  <span className="text-primary">›</span>
                  <span className="w-2 h-3 bg-primary animate-pulse"></span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer: Tri-Color Strip */}
      <footer className="mt-auto">
        <div className="flex h-3 w-full">
          <div className="flex-1 bg-bauhaus-blue"></div>
          <div className="flex-1 bg-bauhaus-red"></div>
          <div className="flex-1 bg-primary"></div>
        </div>
      </footer>

      <FileOfferPrompt
        isOpen={status === "prompted" && !!pendingOffer}
        filename={pendingOffer?.filename ?? ""}
        fileSize={pendingOffer?.fileSize ?? 0}
        fileType={pendingOffer?.fileType ?? ""}
        onAccept={handleAcceptOffer}
        onReject={handleRejectOffer}
      />

      <ConfirmLeaveModal
        isOpen={showBackModal}
        onConfirm={confirmBackNavigation}
        onCancel={cancelBackNavigation}
      />

      <ConfirmCancelModal
        isOpen={showCancelModal}
        onConfirm={confirmCancel}
        onCancel={() => setShowCancelModal(false)}
        transferType="receiving"
      />
    </div>
  );
}
