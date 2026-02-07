"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/services/auth-service";
import { claimTransferAsReceiver, updateTransferStatus } from "@/lib/services/transfer-service";
import { PeerManager } from "@/lib/webrtc/peer-manager";
import { FileReceiver } from "@/lib/transfer/receiver";
import { getPeerConfig } from "@/lib/config/webrtc";
import { useTransferGuard } from "@/lib/hooks/use-transfer-guard";
import type { PeerMessage, TransferProgress } from "@repo/types";
import { formatFileSize, formatTime } from "@repo/utils";
import ConfirmLeaveModal from "@/components/confirm-leave-modal";
import ConfirmCancelModal from "@/components/confirm-cancel-modal";
import FileOfferPrompt from "@/components/file-offer-prompt";
import { requestNotificationPermission, notifyTransferComplete, playErrorSound, isSecureContext } from "@/lib/utils/notification";
import { useWakeLock } from "@/lib/hooks/use-wake-lock";
import { useHaptics } from "@/lib/hooks/use-haptics";
import ChatDrawer from "@/components/chat-drawer";
import QRCodeModal from "@/components/qr-code-modal";
import { ProgressBar } from "@/components/progress-bar";


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
  const [showQRModal, setShowQRModal] = useState(false);
  const [logs, setLogs] = useState<string[]>(["[RADAR] Initializing P2P receiver...", "[RADAR] Waiting for incoming connections..."]);

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<import("@repo/types").ChatMessage[]>([]);
  const [hasUnread, setHasUnread] = useState(false);

  // Handle incoming chat messages
  function handleData(data: any) {
    if (data && data.type === "chat-message") {
      const msg = data.payload as import("@repo/types").ChatMessage;
      setMessages((prev) => [...prev, msg]);
      if (!isChatOpen) {
        setHasUnread(true);
      }
    }
  }

  function handleSendMessage(text: string) {
    if (!activeConnectionRef.current || !user) return;

    const msg: import("@repo/types").ChatMessage = {
      id: crypto.randomUUID(),
      senderId: user.id, // Current user ID
      text,
      timestamp: Date.now(),
    };

    // Send to peer
    activeConnectionRef.current.send({
      type: "chat-message",
      transferId: transferId || "", // Optional context
      payload: msg,
      timestamp: Date.now(),
    });

    // Add to local state
    setMessages((prev) => [...prev, msg]);
  }

  const peerManagerRef = useRef<PeerManager | null>(null);
  const initializingRef = useRef(false);
  const fileReceiverRef = useRef<FileReceiver | null>(null);
  const activeConnectionRef = useRef<any>(null);
  const statusRef = useRef(status);
  const { request: requestWakeLock, release: releaseWakeLock } = useWakeLock();
  const { vibrate } = useHaptics();

  // Initialize refs
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  function addLog(message: string) {
    setLogs((prev) => [...prev.slice(-10), message]); // Keep last 10 logs
  }

  const isTransferActive = status === "connecting" || status === "prompted" || status === "receiving" || status === "paused";
  const { showBackModal, confirmBackNavigation, cancelBackNavigation } = useTransferGuard(transferId, isTransferActive);

  // Robustness: Tab Title & Notifications
  useEffect(() => {
    // 1. Request permission on load
    requestNotificationPermission();

    // 2. Check for secure context
    if (!isSecureContext() && window.location.hostname !== 'localhost') {
      setError("Insecure Context: WebRTC is likely blocked. Please use HTTPS.");
    }
  }, []);

  useEffect(() => {
    const updateTitle = () => {
      if (status === "receiving" && progress) {
        document.title = `${progress.percentage.toFixed(0)}% - Downloading...`;
      } else if (status === "complete") {
        document.title = "File Received - HyperLink";
      } else {
        document.title = "HyperLink - Secure P2P";
      }
    };
    updateTitle();

    if (status === "complete") {
      notifyTransferComplete("received", receivedFile?.name || "File");
    }

    // 3. Screen Wake Lock
    if (status === "connecting" || status === "receiving" || status === "prompted") {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
  }, [status, progress, receivedFile, requestWakeLock, releaseWakeLock]);


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

  const checkAuthAndInitPeer = useCallback(async (isMountedCheck: () => boolean) => {
    console.log("[RECEIVE] checkAuthAndInitPeer called", {
      hasPeerManager: !!peerManagerRef.current,
      isInitializing: initializingRef.current
    });

    // If already initialized, just set the peer ID
    if (peerManagerRef.current) {
      const peerId = peerManagerRef.current.getPeerId();
      console.log("[RECEIVE] Peer already exists, ID:", peerId);
      if (peerId) {
        setMyPeerId(peerId);
        console.log("[RECEIVE] Set peer ID:", peerId);
      }
      return;
    }

    if (initializingRef.current) {
      console.log("[RECEIVE] Already initializing, skipping");
      return;
    }

    console.log("[RECEIVE] Starting initialization...");
    initializingRef.current = true;
    try {
      const currentUser = await getCurrentUser();

      if (!isMountedCheck()) {
        console.log("[RECEIVE] Component unmounted during auth check");
        return;
      }

      if (!currentUser) {
        console.log("[RECEIVE] No user, redirecting to auth");
        router.push("/auth");
        return;
      }
      setUser(currentUser);
      console.log("[RECEIVE] User authenticated:", currentUser.id);

      const config = getPeerConfig();
      console.log("[RECEIVE] Creating PeerManager with config:", config);
      peerManagerRef.current = new PeerManager(config);

      console.log("[RECEIVE] Initializing PeerManager...");
      const peerId = await peerManagerRef.current.initialize();

      if (!isMountedCheck()) {
        console.log("[RECEIVE] Component unmounted during peer init");
        return;
      }

      console.log("[RECEIVE] PeerManager initialized with ID:", peerId);
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

        connection.on("close", () => {
          if (activeConnectionRef.current !== connection) return;
          addLog("[CONNECTION] Peer connection closed");
          resetReceive();
          activeConnectionRef.current = null;
        });

        connection.on("error", (err: any) => {
          if (activeConnectionRef.current !== connection) return;
          console.error("[RECEIVE PAGE] Connection ERROR:", err);
          setError(`Connection error: ${err}`);
          setStatus("error");
        });

        connection.on("data", async (data: any) => {
          if (activeConnectionRef.current !== connection) return;
          handleData(data); // Process chat messages
          const message = data as PeerMessage;

          if (message.type === "file-offer") {
            console.log("[RECEIVE] 🎯 FILE-OFFER received:", message);
            const transferData = message.payload as any;
            const offerData = {
              filename: transferData.filename,
              fileSize: transferData.fileSize,
              fileType: transferData.fileType,
              connection,
              message,
              dbTransferId: transferData.dbTransferId,
            };
            setPendingOffer(offerData);
            setReceivedFile({ name: transferData.filename, size: transferData.fileSize });
            setStatus("prompted");
          } else if (message.type === "chunk") {
            if (fileReceiverRef.current) {
              await fileReceiverRef.current.handleChunk(message as any);
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
          }
        });
      });
    } catch (err: any) {
      console.error("[RECEIVE] Initialization failed:", err);
      if (isMountedCheck()) {
        setError(`Failed to initialize: ${err.message}`);
      }
    } finally {
      initializingRef.current = false;
    }
  }, [router]);

  // Initialization Effect
  useEffect(() => {
    let isMounted = true;
    checkAuthAndInitPeer(() => isMounted);
    return () => {
      isMounted = false;
      initializingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkAuthAndInitPeer]);

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
      vibrate('success');
      notifyTransferComplete("received", pendingOffer.filename);
      if (dbTransferId) updateTransferStatus(dbTransferId, "complete");
    });

    receiver.onCancel(() => {
      setStatus("cancelled");
      addLog("[CANCEL] Transfer cancelled by sender");
      vibrate('error');
      playErrorSound();
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
    <div className="bg-transparent min-h-screen text-[#121212] dark:text-white overflow-x-hidden font-display flex flex-col">
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
      {/* Main Layout (Mirrored from Send Page) */}
      <main className="flex-grow flex flex-col relative">
        <section className="flex-1 flex flex-col relative">
          <div className="flex-1 p-6 md:p-12 flex flex-col max-w-7xl mx-auto w-full gap-8">

            {/* === LAYOUT 1: TRANSFERRING (Split View) === */}
            {(status === "receiving" || status === "paused") && receivedFile && progress ? (
              <div className="flex flex-col gap-8 w-full h-full">
                {/* Page Header (Mirrored from Send Page) */}
                <div className="flex flex-col gap-1">
                  <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase">
                    Secure Transfer <span className="text-primary">Downlink</span>
                  </h1>
                  <div className="flex items-center gap-2 text-[#bcb89a] font-mono text-sm">
                    <span className="material-symbols-outlined text-sm">lock</span>
                    <span>/secure_channel/receive</span>
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse ml-2"></span>
                    <span className="text-green-500">WEBRTC_ACTIVE</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                  {/* Left Column: Controls & Progress */}
                  <div className="lg:col-span-5 flex flex-col gap-6">
                    {/* Secure Link Card */}
                    <div className="bg-[#1a1a1a] p-4 border-l-4 border-primary flex items-center justify-between shadow-lg">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-12 h-12 bg-[#2d1f1f] rounded-full flex items-center justify-center border border-primary/30">
                            <span className="material-symbols-outlined text-primary">satellite_alt</span>
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-bauhaus-blue border-2 border-[#1a1a1a] rounded-full animate-pulse"></div>
                        </div>
                        <div>
                          <p className="text-[#a1a1a1] text-[10px] font-bold uppercase tracking-widest">Incoming Data Stream</p>
                          <p className="text-white font-bold font-mono text-sm tracking-tight">ID: {myPeerId?.slice(0, 8)}...{myPeerId?.slice(-4)}</p>
                        </div>
                      </div>
                      <span className={`material-symbols-outlined text-primary ${!isPaused && "animate-pulse"}`}>
                        {isPaused ? "pause_circle" : "downloading"}
                      </span>
                    </div>

                    {/* Main Progress Card */}
                    <div className="bg-[#11110f]/90 backdrop-blur-sm p-6 border border-[#3a3827] flex-1 flex flex-col gap-6 relative overflow-hidden group">
                      {/* Background Grid */}
                      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] opacity-20" />

                      {/* Header */}
                      <div className="flex justify-between items-start z-10">
                        <div>
                          <h3 className="text-white font-black uppercase text-xl tracking-tighter">Receiving Payload</h3>
                          <p className="text-[#bcb89a] text-xs font-mono mt-1">{receivedFile.name}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-primary font-mono text-2xl font-bold block">{progress.percentage.toFixed(0)}%</span>
                          <span className="text-white/30 text-[10px] uppercase tracking-wider">Integrity</span>
                        </div>
                      </div>

                      {/* Enhanced Progress Bar */}
                      <ProgressBar
                        percentage={progress.percentage}
                        isPaused={isPaused}
                        speed={progress.speed}
                        formatFileSize={formatFileSize}
                        formatTime={formatTime}
                        timeRemaining={progress.timeRemaining}
                      />

                      {/* Controls */}
                      <div className="grid grid-cols-2 gap-3 mt-auto z-10">
                        <button
                          onClick={handlePauseResume}
                          className={`h-12 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] border ${isPaused
                            ? "bg-primary text-black border-primary hover:bg-white"
                            : "bg-transparent text-white border-white/20 hover:border-white hover:bg-white/5"
                            }`}
                        >
                          <span className="material-symbols-outlined !text-[18px]">
                            {isPaused ? "play_arrow" : "pause"}
                          </span>
                          {isPaused ? "RESUME DOWNLINK" : "Halt"}
                        </button>
                        <button
                          onClick={handleCancelClick}
                          className="h-12 bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        >
                          <span className="material-symbols-outlined !text-[18px]">block</span>
                          Abort
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Downlink Visualizer */}
                  <div className="lg:col-span-7 relative min-h-[400px] border border-[#3a3827] bg-[#0a0a0a] overflow-hidden flex items-center justify-center">
                    {/* Background Elements */}
                    <div className="absolute inset-0 pointer-events-none opacity-20"
                      style={{
                        backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
                        backgroundSize: '40px 40px'
                      }}
                    />

                    {/* Central Receiver */}
                    <div className="relative z-10 flex items-center justify-center">
                      <div className="absolute w-[300px] h-[300px] border border-primary/20 rounded-full animate-[spin_10s_linear_infinite]" />
                      <div className="absolute w-[200px] h-[200px] border border-dashed border-primary/40 rounded-full animate-[spin_20s_linear_infinite_reverse]" />
                      <div className="absolute w-[100px] h-[100px] bg-primary/10 rounded-full blur-xl animate-pulse" />

                      {/* Core */}
                      <div className="w-16 h-16 bg-[#1a1a1a] border border-primary rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,217,0,0.5)] z-20">
                        <span className={`material-symbols-outlined text-primary text-3xl ${!isPaused && "animate-pulse"}`}>download</span>
                      </div>

                      {/* Particles (CSS Simulated - Inward) */}
                      {!isPaused && (
                        <>
                          <div className="absolute w-2 h-2 bg-primary rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite_reverse]" style={{ top: '-100px' }} />
                          <div className="absolute w-2 h-2 bg-primary rounded-full animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite_reverse]" style={{ bottom: '-80px', right: '-40px' }} />
                          <div className="absolute w-2 h-2 bg-primary rounded-full animate-[ping_1.8s_cubic-bezier(0,0,0.2,1)_infinite_reverse]" style={{ bottom: '-20px', left: '-90px' }} />
                        </>
                      )}
                    </div>

                    {/* Status Overlays */}
                    <div className="absolute top-6 left-6 flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-widest border border-primary px-2 py-1 bg-primary/10">Downlink Active</span>
                      <span className="text-[10px] font-mono text-white/50">CHANNEL_SECURE</span>
                    </div>

                    {/* Incoming Data Visualization */}
                    <div className="absolute bottom-6 right-6 text-right">
                      <p className="text-[#bcb89a] font-mono text-xs uppercase tracking-widest">
                        {isPaused ? "TRANSMISSION HALTED" : "PACKETS_INBOUND..."}
                      </p>
                      <div className="flex justify-end gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className={`w-1 h-3 ${!isPaused ? "bg-primary animate-pulse" : "bg-white/10"}`} style={{ animationDelay: `${i * 0.1}s` }} />
                        ))}
                      </div>
                    </div>
                  </div>

                </div>


                {/* Terminal / Log Output */}
                <div className="flex-1 min-h-0 pt-8">
                  <div className="bg-black/40 border-l-2 border-primary p-4 font-mono text-xs text-[#bcb89a] h-full overflow-y-auto">
                    {logs.map((log, i) => (
                      <p key={i} className="mb-1">
                        <span className="text-primary">&gt;</span> {log}
                      </p>
                    ))}
                    <span className="inline-block w-2 h-4 bg-primary animate-pulse align-middle"></span>
                  </div>
                </div>
              </div>
            ) : (
              /* === LAYOUT 2: IDLE/PROMPTED/RESULT (Standard Grid) === */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 w-full">
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
                        <button
                          onClick={() => setShowQRModal(true)}
                          disabled={!myPeerId}
                          className="flex-1 h-12 bg-transparent border-2 border-primary hover:bg-primary/10 text-primary text-base font-bold tracking-wide uppercase flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="material-symbols-outlined">qr_code_2</span>
                          Show QR
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
                      <div className="text-center py-12 text-gray-500 border-2 border-dashed border-white/5 rounded-sm bg-white/[0.02]">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center animate-pulse">
                          <span className="material-symbols-outlined text-4xl opacity-50">wifi_tethering</span>
                        </div>
                        <h3 className="text-white font-bold uppercase tracking-widest text-sm mb-1">Receiver Active</h3>
                        <p className="font-mono text-xs text-[#bcb89a]">Awaiting incoming secure handshake...</p>
                      </div>
                    )}

                    {status === "prompted" && pendingOffer && (
                      <div className="bg-[#1a1a1a] p-6 border-l-4 border-bauhaus-blue flex flex-col gap-4 shadow-[0_0_30px_-10px_rgba(46,149,255,0.2)]">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-4">
                            <div className="bg-bauhaus-blue/10 p-3 border border-bauhaus-blue/20">
                              <span className="material-symbols-outlined text-bauhaus-blue text-2xl animate-bounce">mark_email_unread</span>
                            </div>
                            <div>
                              <p className="font-black text-lg uppercase tracking-tight text-white mb-1">Incoming Transmission</p>
                              <p className="font-bold text-sm text-gray-300">{pendingOffer.filename}</p>
                              <p className="text-xs text-white/50 font-mono mt-1">
                                {formatFileSize(pendingOffer.fileSize)} • <span className="text-bauhaus-blue">SECURE LINK</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] font-bold bg-bauhaus-blue/20 text-bauhaus-blue px-2 py-1 uppercase tracking-wider border border-bauhaus-blue/30">
                              Action Required
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {status === "complete" && receivedFile && (
                      <div className="bg-black/60 backdrop-blur-xl p-6 border border-primary/20 shadow-[0_0_50px_-20px_rgba(var(--primary-rgb),0.2)] flex flex-col gap-6 animate-in zoom-in-95 fade-in duration-500 rounded-sm relative overflow-hidden group">
                        {/* Holographic Scanline */}
                        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(255,255,255,0.03)_50%,transparent_100%)] h-[200%] w-full animate-[scan_4s_linear_infinite] pointer-events-none" />

                        <div className="flex justify-between items-start z-10">
                          <div className="flex items-center gap-4">
                            <div className="bg-primary/10 p-3 rounded-full border border-primary/20">
                              <span className="material-symbols-outlined text-primary text-2xl">verified</span>
                            </div>
                            <div>
                              <p className="font-bold text-lg text-white tracking-tight">{receivedFile.name}</p>
                              <p className="text-xs text-primary/60 font-mono uppercase tracking-widest mt-1">
                                {formatFileSize(receivedFile.size)} • Verified Complete
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* File Preview Container */}
                        {receivedFile.blob && (
                          <div className="bg-black/40 p-1 rounded border border-white/5 flex justify-center relative shadow-inner z-10">
                            <div className="absolute inset-0 bg-primary/5 blur-xl rounded-full opacity-20" />

                            {/* Image Preview */}
                            {/\.(jpg|jpeg|png|gif|webp)$/i.test(receivedFile.name) ? (
                              <img
                                src={URL.createObjectURL(receivedFile.blob)}
                                alt="Preview"
                                className="max-h-80 object-contain rounded-sm relative z-10 transition-transform duration-500 hover:scale-[1.02]"
                              />
                            ) : /* Video Preview */
                              /\.(mp4|webm|ogg)$/i.test(receivedFile.name) ? (
                                <video
                                  src={URL.createObjectURL(receivedFile.blob)}
                                  controls
                                  className="max-h-80 w-full rounded-sm relative z-10"
                                />
                              ) : /* PDF Preview */
                                /\.pdf$/i.test(receivedFile.name) ? (
                                  <div className="w-full h-80 bg-[#1a1a1a] rounded-sm overflow-hidden relative group cursor-pointer border border-white/5 hover:border-primary/30 transition-colors" onClick={handleDownload}>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 group-hover:text-primary transition-colors z-10">
                                      <span className="material-symbols-outlined text-7xl mb-4 group-hover:scale-110 transition-transform duration-300">picture_as_pdf</span>
                                      <span className="text-sm font-mono mt-2 uppercase tracking-widest text-white/50 group-hover:text-primary">PDF Document</span>
                                      <span className="text-[10px] mt-2 bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">Click to Open</span>
                                    </div>
                                    {/* Grid bg for PDF preview */}
                                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
                                  </div>
                                ) : (
                                  /* Generic File Icon */
                                  <div className="h-40 w-full flex flex-col items-center justify-center text-gray-500 relative z-10">
                                    <span className="material-symbols-outlined text-6xl opacity-50">draft</span>
                                    <span className="text-xs font-mono mt-4 uppercase tracking-widest opacity-40">Preview not available</span>
                                  </div>
                                )}
                          </div>
                        )}

                        <button
                          onClick={handleDownload}
                          className="w-full h-14 bg-primary hover:bg-[#ffea2e] text-black text-sm font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.6)] z-10"
                        >
                          <span className="material-symbols-outlined !text-[20px]">download</span>
                          Save File
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
                      <div className="bg-bauhaus-red/10 border border-bauhaus-red/30 p-4 space-y-4">
                        <p className="text-bauhaus-red text-sm font-mono border-b border-bauhaus-red/20 pb-2">{error}</p>

                        {/* Diagnostic Report */}
                        <div className="text-left font-mono text-[9px] text-[#bcb89a] space-y-1 bg-black/40 p-3">
                          <p className="text-primary font-bold uppercase mb-2">Diagnostic Data</p>
                          <div className="grid grid-cols-2 gap-x-2">
                            <p>SECURE_CONTEXT:</p> <p className={isSecureContext() ? "text-green-400" : "text-bauhaus-red"}>{String(isSecureContext()).toUpperCase()}</p>
                            <p>NETWORK:</p> <p className="text-white">{navigator.onLine ? "ONLINE" : "OFFLINE"}</p>
                            <p>PEER_STATUS:</p> <p className={peerManagerRef.current?.getState() === 'failed' ? "text-bauhaus-red" : "text-green-400"}>{peerManagerRef.current?.getState()?.toUpperCase() || "UNKNOWN"}</p>
                          </div>
                          <p className="mt-3 text-[8px] text-white/30 italic">
                            Tip: Safari/iOS prevents WebRTC on HTTP. Ensure both sides are using HTTPS.
                          </p>
                        </div>

                        <button
                          onClick={resetReceive}
                          className="w-full py-2 bg-bauhaus-red/20 hover:bg-bauhaus-red/40 text-bauhaus-red text-[10px] font-bold uppercase tracking-widest transition-colors"
                        >
                          Clear Error
                        </button>
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
              </div>
            )
            }
          </div>
        </section>
      </main>

      {/* Footer: Tri-Color Strip */}
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
      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={messages}
        onSendMessage={handleSendMessage}
        currentUserId={user?.id || "receiver"}
        peerId={activeConnectionRef.current?.peer || "sender"}
      />

      {/* Floating Chat Button */}
      {
        status !== "idle" && (
          <button
            onClick={() => {
              setIsChatOpen(true);
              setHasUnread(false);
            }}
            className="fixed bottom-6 right-6 z-40 bg-primary text-black p-4 rounded-full shadow-xl hover:scale-110 transition-transform flex items-center justify-center border-2 border-[#121212]"
          >
            <span className="material-symbols-outlined text-2xl">forum</span>
            {hasUnread && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] text-white font-bold items-center justify-center">!</span>
              </span>
            )}
          </button>
        )
      }
      <QRCodeModal
        isOpen={showQRModal}
        peerId={myPeerId}
        onClose={() => setShowQRModal(false)}
      />
    </div >
  );
}
