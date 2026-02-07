"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/services/auth-service";
import { createTransfer, updateTransferStatus } from "@/lib/services/transfer-service";
import { PeerManager } from "@/lib/webrtc/peer-manager";
import { FileSender } from "@/lib/transfer/sender";
import type { PeerConfig, TransferProgress } from "@repo/types";
import { formatFileSize, formatTime, validateFileSize } from "@repo/utils";
import { requestNotificationPermission, notifyTransferComplete } from "@/lib/utils/notification";
import { useWakeLock } from "@/lib/hooks/use-wake-lock";
import ChatDrawer from "@/components/chat-drawer";
import QRScannerModal from "@/components/qr-scanner-modal";

export default function SendPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [receiverPeerId, setReceiverPeerId] = useState("");
  const [status, setStatus] = useState<
    "idle" | "connecting" | "waiting" | "transferring" | "complete" | "error"
  >("idle");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<TransferProgress | null>(null);
  const [transferId, setTransferId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false); // Global drag state
  const [logs, setLogs] = useState<string[]>([
    "Initializing WebRTC handshake...",
    "Waiting for peer connection...",
  ]);

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<import("@repo/types").ChatMessage[]>([]);
  const [hasUnread, setHasUnread] = useState(false);

  const peerManagerRef = useRef<PeerManager | null>(null);
  const initializingRef = useRef(false);
  const fileSenderRef = useRef<FileSender | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const connectionRef = useRef<any>(null); // Keep track of active connection
  const { request: requestWakeLock, release: releaseWakeLock } = useWakeLock();

  useEffect(() => {
    checkAuthAndInitPeer();
    return () => {
      if (peerManagerRef.current) {
        peerManagerRef.current.destroy();
      }
    };
  }, []);

  // Navigation warning for active transfers
  useEffect(() => {
    const isActive = status === "connecting" || status === "waiting" || status === "transferring";
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isActive) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [status]);

  // Robustness: Tab Title & Notifications
  useEffect(() => {
    // Request permission on load
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    // 1. Tab Title Progress
    if (status === "transferring" && progress) {
      document.title = `${progress.percentage.toFixed(0)}% - Uploading...`;
    } else if (status === "complete") {
      document.title = "Transfer Complete - HyperLink";
    } else {
      document.title = "HyperLink - Secure P2P";
    }

    // 2. Browser Notifications
    if (status === "complete") {
      notifyTransferComplete("sent", file?.name || "File");
    }
    // 3. Screen Wake Lock
    if (status === "connecting" || status === "transferring") {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
  }, [status, progress, file, requestWakeLock, releaseWakeLock]);

  // QoL: Global Drag & Drop + Paste
  useEffect(() => {
    // 1. Paste Support
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        const pastedFile = e.clipboardData.files[0];
        if (pastedFile) {
          const validation = validateFileSize(pastedFile.size);
          if (validation.valid) {
            setFile(pastedFile);
            setError("");
            addLog(`✓ Pasted file: ${pastedFile.name}`);
          } else {
            setError(validation.error!);
            addLog(`✗ Paste failed: ${validation.error}`);
          }
        }
      }
    };

    // 2. Global Drag & Drop
    const handleGlobalDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer?.types.includes("Files")) {
        setIsDraggingOver(true);
      }
    };

    const handleGlobalDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Only set false if leaving the window (relatedTarget is null)
      if (e.relatedTarget === null) {
        setIsDraggingOver(false);
      }
    };

    const handleGlobalDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(true); // Ensure it stays true while over
    };

    const handleGlobalDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);

      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
          const validation = validateFileSize(droppedFile.size);
          if (validation.valid) {
            setFile(droppedFile);
            setError("");
            addLog(`✓ Dropped file: ${droppedFile.name}`);
          } else {
            setError(validation.error!);
            addLog(`✗ Drop failed: ${validation.error}`);
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    window.addEventListener("dragenter", handleGlobalDragEnter);
    window.addEventListener("dragleave", handleGlobalDragLeave);
    window.addEventListener("dragover", handleGlobalDragOver);
    window.addEventListener("drop", handleGlobalDrop);

    return () => {
      window.removeEventListener("paste", handlePaste);
      window.removeEventListener("dragenter", handleGlobalDragEnter);
      window.removeEventListener("dragleave", handleGlobalDragLeave);
      window.removeEventListener("dragover", handleGlobalDragOver);
      window.removeEventListener("drop", handleGlobalDrop);
    };
  }, []);

  function addLog(message: string) {
    setLogs((prev) => [...prev, message]);
  }

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
    if (!connectionRef.current || !user) return;

    const msg: import("@repo/types").ChatMessage = {
      id: crypto.randomUUID(),
      senderId: user.id, // Current user ID
      text,
      timestamp: Date.now(),
    };

    // Send to peer
    connectionRef.current.send({
      type: "chat-message",
      transferId: transferId || "", // Optional context
      payload: msg,
      timestamp: Date.now(),
    });

    // Add to local state
    setMessages((prev) => [...prev, msg]);
  }

  async function checkAuthAndInitPeer() {
    if (initializingRef.current || peerManagerRef.current) return;
    initializingRef.current = true;
    try {
      const currentUser = await getCurrentUser();
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
      config: {
        iceServers: [
          // Google's public STUN servers
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          // Free TURN servers from OpenRelay (no signup required)
          {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
          {
            urls: "turn:openrelay.metered.ca:443",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
          {
            urls: "turn:openrelay.metered.ca:443?transport=tcp",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
        ],
        iceTransportPolicy: "all", // Try all connection types (relay, srflx, host)
        iceCandidatePoolSize: 10, // Pre-gather candidates for faster connections
      },
    };

    peerManagerRef.current = new PeerManager(config);

    try {
      await peerManagerRef.current.initialize();
      addLog("✓ Peer manager initialized successfully");
    } catch (err: any) {
      setError(`Failed to connect to signaling server: ${err.message}`);
      addLog(`✗ Error: ${err.message}`);
    } finally {
      initializingRef.current = false;
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validation = validateFileSize(selectedFile.size);
    if (!validation.valid) {
      setError(validation.error!);
      addLog(`✗ File validation failed: ${validation.error}`);
      return;
    }

    setFile(selectedFile);
    setError("");
    addLog(`✓ File selected: ${selectedFile.name} (${formatFileSize(selectedFile.size)})`);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;

    const validation = validateFileSize(droppedFile.size);
    if (!validation.valid) {
      setError(validation.error!);
      addLog(`✗ File validation failed: ${validation.error}`);
      return;
    }

    setFile(droppedFile);
    setError("");
    addLog(`✓ File selected: ${droppedFile.name} (${formatFileSize(droppedFile.size)})`);
  }

  async function handleSend() {
    if (!file || !receiverPeerId || !peerManagerRef.current) return;

    setStatus("connecting");
    setError("");
    addLog(`> Connecting to peer: ${receiverPeerId.slice(0, 8)}...`);

    try {
      const transfer = await createTransfer({
        filename: file.name,
        fileSize: file.size,
      });

      if (!transfer) {
        throw new Error("Failed to create transfer record");
      }

      setTransferId(transfer.id);
      addLog(`✓ Transfer record created: ${transfer.id.slice(0, 8)}`);

      const connection = peerManagerRef.current.connectToPeer(receiverPeerId);
      connectionRef.current = connection; // Store reference

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Connection timeout")), 30000);

        connection.on("open", () => {
          clearTimeout(timeout);
          addLog("✓ Peer connection established");
          resolve();
        });

        // Listen for chat messages here as well to ensure we catch them
        connection.on("data", handleData);

        connection.on("error", (err) => {
          clearTimeout(timeout);
          addLog(`✗ Connection error: ${err}`);
          reject(err);
        });
      });

      await updateTransferStatus(transfer.id, "transferring");
      setStatus("transferring");
      addLog("> Starting file transfer protocol...");

      fileSenderRef.current = new FileSender(file, connection);

      // Setup pause callback
      fileSenderRef.current.onPauseChange((paused) => {
        setIsPaused(paused);
        if (paused) {
          addLog("> Transfer paused by receiver");
        } else {
          addLog("> Transfer resumed by receiver");
        }
      });

      fileSenderRef.current.onReject(() => {
        setStatus("error");
        setError("Receiver rejected the file offer");
        addLog("✗ Receiver rejected the file");
      });

      // Track if we've already switched to transferring state
      let hasStartedTransfer = false;

      // Start listening for accept/reject events BEFORE sending the offer
      // This prevents a race condition where the receiver accepts before we're listening
      const transferPromise = fileSenderRef.current.startTransfer((progressData) => {
        // Update status to transferring on first progress update
        if (!hasStartedTransfer) {
          hasStartedTransfer = true;
          setStatus("transferring");
          addLog("> File accepted! Starting transfer...");
        }
        setProgress(progressData);
        // Log every 10% progress
        const percentage = progressData.percentage;
        if (Math.floor(percentage) % 10 === 0 && Math.floor(percentage) !== Math.floor((progressData.bytesTransferred - 16384) / progressData.totalBytes * 100)) {
          addLog(`> Progress: ${percentage.toFixed(0)}%`);
        }
      });

      await fileSenderRef.current.sendOffer();
      addLog("> File metadata sent to receiver");
      setStatus("waiting");
      addLog("> Waiting for receiver to accept...");

      // Wait for the transfer to complete (or fail)
      await transferPromise;

      await updateTransferStatus(transfer.id, "complete");
      setStatus("complete");
      addLog("✓ Transfer completed successfully");
    } catch (err: any) {
      setError(err.message || "Transfer failed");
      setStatus("error");
      addLog(`✗ Transfer failed: ${err.message}`);

      if (transferId) {
        await updateTransferStatus(transferId, "failed");
      }
    }
  }

  function resetTransfer() {
    // Cleanup if transfer is in progress
    if (fileSenderRef.current) {
      try {
        fileSenderRef.current.cancel();
      } catch (e) {
        console.error("Error cancelling transfer:", e);
      }
    }

    // Explicitly close connection
    if (connectionRef.current) {
      try {
        connectionRef.current.close();
      } catch (e) {
        console.error("Error closing connection:", e);
      }
    }

    setFile(null);
    setReceiverPeerId("");
    setStatus("idle");
    setError("");
    setProgress(null);
    setTransferId(null);
    setIsPaused(false);
    fileSenderRef.current = null;
    connectionRef.current = null;
    setMessages([]);
    setLogs([
      "Initializing WebRTC handshake...",
      "Waiting for peer connection...",
    ]);
  }

  function handlePauseResume() {
    if (!fileSenderRef.current) return;
    if (isPaused) {
      fileSenderRef.current.resume();
      setIsPaused(false);
      addLog("> Transfer resumed");
    } else {
      fileSenderRef.current.pause();
      setIsPaused(true);
      addLog("> Transfer paused");
    }
  }

  function handleCancel() {
    if (!fileSenderRef.current) return;
    fileSenderRef.current.cancel();
    setStatus("error");
    addLog("✗ Transfer cancelled by user");
    if (transferId) {
      updateTransferStatus(transferId, "cancelled");
    }
  }

  return (
    <div className="bg-transparent min-h-screen text-[#121212] dark:text-white overflow-x-hidden font-display flex flex-col">
      {/* Navbar: Split Header Design */}
      <nav className="w-full flex flex-col md:flex-row border-b border-[#333]">
        {/* Left: Logo Block */}
        <div className="bg-primary text-[#121212] px-8 py-6 flex items-center justify-center md:justify-start min-w-[200px]">
          <span className="font-black text-4xl tracking-tighter uppercase">HYPER</span>
        </div>
        {/* Right: Navigation & Secondary Logo Part */}
        <div className="flex-1 bg-white dark:bg-[#121212] flex items-center justify-between px-8 py-4 md:py-0">
          <span className="font-black text-4xl tracking-tighter uppercase text-[#121212] dark:text-white">LINK</span>
          <div className="flex gap-4 md:gap-8 items-center">
            <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-[#1a1a1a] border border-[#333]">
              <div className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </div>
              <span className="text-xs font-mono text-gray-400">WebRTC Ready</span>
              {user && <span className="text-xs font-mono text-white ml-2">• {user.email}</span>}
            </div>
            <button
              onClick={() => {
                const isActive = status === "connecting" || status === "waiting" || status === "transferring";
                if (isActive && !confirm("Transfer in progress. Are you sure you want to leave? This will cancel the transfer.")) {
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

      {/* Main Layout */}
      <main className="flex-grow flex flex-col relative">
        {/* Central Workspace with Grid Background */}
        {/* Central Workspace */}
        <section className="flex-1 flex flex-col relative">
          {/* Content Container */}
          <div className="flex-1 p-6 md:p-12 flex flex-col max-w-7xl mx-auto w-full gap-8">
            {/* Page Header */}
            <div className="flex flex-col gap-1">
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase">
                Secure Transfer <span className="text-primary">Uplink</span>
              </h1>
              <div className="flex items-center gap-2 text-[#bcb89a] font-mono text-sm">
                <span className="material-symbols-outlined text-sm">lock</span>
                <span>/secure_channel/send</span>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse ml-2"></span>
                <span className="text-green-500">WEBRTC_READY</span>
              </div>
            </div>

            {status === "idle" && (
              <>
                {/* Drag & Drop Zone - Mechanical/Breathing */}
                <div
                  className="group relative w-full h-80 md:h-96 border-[2px] border-white/10 bg-[#0a0a0a]/50 backdrop-blur-sm hover:bg-[#0a0a0a]/80 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-6 overflow-hidden hover:scale-[1.01] active:scale-[0.99] hover:shadow-[0_0_50px_-10px_rgba(255,234,46,0.1)]"
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {/* Breathing Glow Border */}
                  <div className="absolute inset-0 border-[2px] border-primary/20 group-hover:border-primary/60 transition-colors duration-500 mask-container"></div>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_center,rgba(255,234,46,0.05)_0%,transparent_70%)]"></div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {/* Animated Center Icon */}
                  <div className="relative z-10 flex flex-col items-center gap-4 group-hover:-translate-y-2 transition-transform duration-300">
                    <div className="relative w-24 h-24 flex items-center justify-center">
                      <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping opacity-20 group-hover:opacity-40 duration-1000"></div>
                      <div className="absolute inset-0 border border-primary/30 rounded-full scale-100 group-hover:scale-110 transition-transform duration-500"></div>
                      <span className="material-symbols-outlined text-primary text-6xl group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_0_15px_rgba(255,234,46,0.5)]">
                        add_circle
                      </span>
                    </div>

                    {file ? (
                      <div className="text-center space-y-2">
                        <p className="text-xl font-bold uppercase tracking-widest text-primary drop-shadow-md">
                          {file.name}
                        </p>
                        <p className="text-sm font-mono text-white/50">{formatFileSize(file.size)}</p>
                      </div>
                    ) : (
                      <div className="text-center space-y-2">
                        <p className="text-2xl font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors">
                          Initiate Sequence
                        </p>
                        <p className="font-mono text-[#bcb89a] text-xs uppercase tracking-widest">
                          Drop Payload or Click to Browse
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Mechanical Corner Brackets */}
                  <div className="absolute top-4 left-4 w-4 h-4 border-l-2 border-t-2 border-white/30 group-hover:border-primary group-hover:w-8 group-hover:h-8 transition-all duration-300"></div>
                  <div className="absolute top-4 right-4 w-4 h-4 border-r-2 border-t-2 border-white/30 group-hover:border-primary group-hover:w-8 group-hover:h-8 transition-all duration-300"></div>
                  <div className="absolute bottom-4 left-4 w-4 h-4 border-l-2 border-b-2 border-white/30 group-hover:border-primary group-hover:w-8 group-hover:h-8 transition-all duration-300"></div>
                  <div className="absolute bottom-4 right-4 w-4 h-4 border-r-2 border-b-2 border-white/30 group-hover:border-primary group-hover:w-8 group-hover:h-8 transition-all duration-300"></div>

                  {/* Scanline Effect */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(255,255,255,0.02)_50%,transparent_100%)] h-[200%] w-full animate-[scan_4s_linear_infinite] pointer-events-none opacity-0 group-hover:opacity-100"></div>
                </div>

                {/* File Preview & Transfer Controls */}
                {file && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* File Preview Card with Corner Fold */}
                    <div className="lg:col-span-2">
                      <h3 className="font-mono text-[#bcb89a] text-sm mb-4 uppercase tracking-widest">Selected Payload</h3>
                      <div className="corner-fold bg-surface-dark p-6 md:p-8 min-h-[200px] flex gap-6 shadow-2xl">
                        {/* File Icon */}
                        <div className="w-32 h-32 bg-[#11110f] flex items-center justify-center shrink-0 border border-[#3a3827]">
                          <span className="material-symbols-outlined text-white/50" style={{ fontSize: '48px' }}>description</span>
                        </div>
                        {/* File Details */}
                        <div className="flex flex-col justify-between flex-1 py-1">
                          <div>
                            <h4 className="text-white text-xl md:text-2xl font-bold leading-tight mb-2">{file.name}</h4>
                            <div className="flex flex-col gap-1 font-mono text-sm text-[#bcb89a]">
                              <p>SIZE: {formatFileSize(file.size)}</p>
                              <p className="truncate max-w-[300px] md:max-w-md text-xs opacity-50">Ready for encrypted transfer</p>
                            </div>
                          </div>
                          {/* Remove Action */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFile(null);
                              addLog("File removed from queue");
                            }}
                            className="self-start text-bauhaus-red hover:text-red-400 font-bold text-sm uppercase tracking-wider flex items-center gap-2 mt-4"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                            Remove File
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Transfer Controls */}
                    <div className="lg:col-span-1 flex flex-col gap-6">
                      <h3 className="font-mono text-[#bcb89a] text-sm mb-2 uppercase tracking-widest">Transfer Control</h3>

                      {/* Peer ID Input */}
                      <div className="flex flex-col gap-3">
                        <label className="text-xs font-bold tracking-[0.1em] text-primary uppercase flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">hub</span>
                          Destination Peer ID
                        </label>
                        <div className="flex gap-2">
                          <input
                            className="flex-1 bg-transparent border-b-2 border-white/20 focus:border-primary px-0 py-3 text-lg font-mono text-white placeholder-white/20 outline-none transition-colors"
                            placeholder="Enter hash..."
                            type="text"
                            autoFocus
                            value={receiverPeerId}
                            onChange={(e) => setReceiverPeerId(e.target.value)}
                          />
                          <button
                            onClick={() => setShowQRScanner(true)}
                            className="h-12 px-4 bg-transparent border-2 border-primary hover:bg-primary/10 text-primary flex items-center justify-center gap-2 transition-colors self-end"
                            title="Scan QR Code"
                          >
                            <span className="material-symbols-outlined">qr_code_scanner</span>
                          </button>
                        </div>
                      </div>

                      {/* Main Action Button */}
                      <button
                        onClick={handleSend}
                        disabled={!file || !receiverPeerId}
                        className="w-full bg-primary hover:bg-[#e6ce00] text-black h-16 flex items-center justify-center gap-3 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="font-black text-lg tracking-wider">INITIATE TRANSFER</span>
                        <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform font-bold">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-bauhaus-red/10 border border-bauhaus-red/30 px-4 py-3">
                    <p className="text-sm text-bauhaus-red font-medium">{error}</p>
                  </div>
                )}
              </>
            )}

            {/* Connecting State */}
            {status === "connecting" && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary flex items-center justify-center animate-pulse">
                  <span className="material-symbols-outlined text-3xl text-black animate-spin">sync</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 uppercase">Connecting...</h3>
                <p className="text-gray-400 mb-6 font-mono text-sm">Establishing peer-to-peer connection</p>
                <button
                  onClick={resetTransfer}
                  className="px-6 py-3 border border-white/20 hover:border-red-500 text-white font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Waiting for Acceptance State */}
            {status === "waiting" && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary flex items-center justify-center animate-pulse">
                  <span className="material-symbols-outlined text-3xl text-black">hourglass_empty</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 uppercase">Waiting for Receiver</h3>
                <p className="text-gray-400 mb-2 font-mono text-sm">File offer sent to peer</p>
                <p className="text-[#bcb89a] mb-6 font-mono text-xs">Waiting for {receiverPeerId.slice(0, 8)}... to accept</p>
                <button
                  onClick={resetTransfer}
                  className="px-6 py-3 border border-white/20 hover:border-red-500 text-white font-semibold transition-colors"
                >
                  Cancel Offer
                </button>
              </div>
            )}

            {/* Transferring State - Split Layout */}
            {status === "transferring" && file && progress && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 h-full">
                {/* Left Column: Controls & Progress */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  {/* Connected Peer Card */}
                  <div className="bg-[#1a1a1a] p-4 border-l-4 border-primary flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 bg-[#2d2b1f] rounded-full flex items-center justify-center border border-primary/30">
                          <span className="material-symbols-outlined text-primary">hub</span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-[#1a1a1a] rounded-full animate-pulse"></div>
                      </div>
                      <div>
                        <p className="text-[#bcb89a] text-[10px] font-bold uppercase tracking-widest">Secure Uplink Established</p>
                        <p className="text-white font-bold font-mono text-sm tracking-tight">ID: {receiverPeerId.slice(0, 8)}...{receiverPeerId.slice(-4)}</p>
                      </div>
                    </div>
                    <span className="text-primary material-symbols-outlined animate-pulse">lock</span>
                  </div>

                  {/* Main Progress Card */}
                  <div className="bg-[#11110f]/90 backdrop-blur-sm p-6 border border-[#3a3827] flex-1 flex flex-col gap-6 relative overflow-hidden group">
                    {/* Background Grid */}
                    <div className="absolute inset-0 bg-[radial-gradient(#3a3827_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />

                    {/* Header */}
                    <div className="flex justify-between items-start z-10">
                      <div>
                        <h3 className="text-white font-black uppercase text-xl tracking-tighter">Uploading Payload</h3>
                        <p className="text-[#bcb89a] text-xs font-mono mt-1">{file.name}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-primary font-mono text-2xl font-bold block">{progress.percentage.toFixed(0)}%</span>
                        <span className="text-white/30 text-[10px] uppercase tracking-wider">Completion</span>
                      </div>
                    </div>

                    {/* Industrial Progress Bar */}
                    <div className="relative z-10 py-4">
                      <div className="flex justify-between text-[10px] font-mono text-[#bcb89a] mb-2 uppercase tracking-widest">
                        <span>Transmission Speed: {formatFileSize(progress.speed)}/s</span>
                        <span>ETA: {formatTime(progress.timeRemaining)}</span>
                      </div>
                      <div className="h-4 w-full bg-[#1a1a1a] border border-[#3a3827] p-[2px]">
                        <div className={`h-full ${isPaused ? "bg-orange-400" : "bg-primary"} relative overflow-hidden transition-all duration-300`} style={{ width: `${progress.percentage}%` }}>
                          {!isPaused && <div className="absolute inset-0 bg-[linear-gradient(-45deg,rgba(0,0,0,0.2)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.2)_50%,rgba(0,0,0,0.2)_75%,transparent_75%,transparent)] bg-[length:10px_10px] animate-[progress-stripes_1s_linear_infinite]" />}
                        </div>
                      </div>
                    </div>

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
                        {isPaused ? "Resume Uplink" : "Pause"}
                      </button>
                      <button
                        onClick={handleCancel}
                        className="h-12 bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                      >
                        <span className="material-symbols-outlined !text-[18px]">block</span>
                        Abort
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column: Uplink Visualizer */}
                <div className="lg:col-span-7 relative min-h-[400px] border border-[#3a3827] bg-[#0a0a0a] overflow-hidden flex items-center justify-center">
                  {/* Background Elements */}
                  <div className="absolute inset-0 pointer-events-none opacity-20"
                    style={{
                      backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
                      backgroundSize: '40px 40px'
                    }}
                  />

                  {/* Central Emitter */}
                  <div className="relative z-10 flex items-center justify-center">
                    <div className="absolute w-[300px] h-[300px] border border-primary/20 rounded-full animate-[spin_10s_linear_infinite]" />
                    <div className="absolute w-[200px] h-[200px] border border-dashed border-primary/40 rounded-full animate-[spin_20s_linear_infinite_reverse]" />
                    <div className="absolute w-[100px] h-[100px] bg-primary/10 rounded-full blur-xl animate-pulse" />

                    {/* Core */}
                    <div className="w-16 h-16 bg-[#1a1a1a] border border-primary rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,234,46,0.5)] z-20">
                      <span className={`material-symbols-outlined text-primary text-3xl ${!isPaused && "animate-ping"}`}>upload</span>
                    </div>

                    {/* Particles (CSS Simulated) */}
                    {!isPaused && (
                      <>
                        <div className="absolute w-2 h-2 bg-primary rounded-full animate-[ping_2s_linear_infinite]" style={{ top: '-100px' }} />
                        <div className="absolute w-2 h-2 bg-primary rounded-full animate-[ping_2.5s_linear_infinite]" style={{ bottom: '-80px', right: '-40px' }} />
                        <div className="absolute w-2 h-2 bg-primary rounded-full animate-[ping_1.8s_linear_infinite]" style={{ bottom: '-20px', left: '-90px' }} />
                      </>
                    )}

                    {/* Scanning Line */}
                    <div className="absolute inset-0 w-full h-[2px] bg-primary/50 top-1/2 -translate-y-1/2 animate-[spin_4s_linear_infinite] shadow-[0_0_10px_rgba(255,234,46,0.8)]" />
                  </div>

                  {/* Status Overlays */}
                  <div className="absolute top-6 left-6 flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest border border-primary px-2 py-1 bg-primary/10">Uplink Active</span>
                    <span className="text-[10px] font-mono text-white/50">CHANNEL_SECURE</span>
                  </div>

                  <div className="absolute bottom-6 right-6 text-right">
                    <p className="text-[#bcb89a] font-mono text-xs uppercase tracking-widest">
                      {isPaused ? "TRANSMISSION HALTED" : "PACKETS_OUTBOUND..."}
                    </p>
                    <div className="flex justify-end gap-1 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className={`w-1 h-3 ${!isPaused ? "bg-primary animate-pulse" : "bg-white/10"}`} style={{ animationDelay: `${i * 0.1}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error State */}
            {status === "error" && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-bauhaus-red flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl text-white">error</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 uppercase">Transfer Failed</h3>
                <p className="text-bauhaus-red mb-6 font-mono text-sm">{error || "Unknown error occurred"}</p>
                <button
                  onClick={resetTransfer}
                  className="px-6 py-3 bg-primary hover:bg-white text-black font-semibold transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Complete State */}
            {status === "complete" && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-500 flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl text-white">check</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 uppercase">Transfer Complete!</h3>
                <p className="text-gray-400 mb-6 font-mono text-sm">{file?.name} has been sent successfully</p>
                <button
                  onClick={resetTransfer}
                  className="px-6 py-3 bg-primary hover:bg-white text-black font-semibold transition-colors"
                >
                  Send Another File
                </button>
              </div>
            )}

            {/* Terminal / Log Output */}
            <div className="mt-auto pt-8">
              <div className="bg-black/40 border-l-2 border-primary p-4 font-mono text-xs text-[#bcb89a] h-64 overflow-y-auto">
                {logs.map((log, i) => (
                  <p key={i} className="mb-1">
                    <span className="text-primary">&gt;</span> {log}
                  </p>
                ))}
                <span className="inline-block w-2 h-4 bg-primary animate-pulse align-middle"></span>
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

      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={messages}
        onSendMessage={handleSendMessage}
        currentUserId={user?.id || "sender"}
        peerId={receiverPeerId}
      />

      {/* Floating Chat Button */}
      {status !== "idle" && (
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
      )}

      {/* Custom Styles */}
      <style jsx>{`
        /* Corner Fold Effect */
        .corner-fold {
          clip-path: polygon(
            0 0,
            calc(100% - 48px) 0,
            100% 48px,
            100% 100%,
            0 100%
          );
          position: relative;
        }

        .corner-fold::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 48px;
          height: 48px;
          background: linear-gradient(to bottom left, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(0,0,0,0.3) 100%);
          pointer-events: none;
        }

        @keyframes scan {
          0% { transform: translateY(-50%); }
          100% { transform: translateY(0%); }
        }
      `}</style>

      {/* Global Drag Overlay */}
      {isDraggingOver && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-200">
          <div className="w-64 h-64 rounded-full border-4 border-dashed border-primary animate-[spin_10s_linear_infinite] flex items-center justify-center mb-8">
            <div className="w-48 h-48 rounded-full bg-primary/20 animate-pulse"></div>
          </div>
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter">
            Drop Payload Here
          </h2>
          <p className="text-primary font-mono mt-4">Initiating Transfer Sequence</p>
        </div>
      )}

      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={messages}
        onSendMessage={handleSendMessage}
        currentUserId={user?.id || "sender"}
        peerId={connectionRef.current?.peer || "receiver"}
      />

      <QRScannerModal
        isOpen={showQRScanner}
        onScan={(scannedPeerId) => {
          setReceiverPeerId(scannedPeerId);
          addLog(`✓ Scanned Peer ID: ${scannedPeerId.slice(0, 8)}...`);
        }}
        onClose={() => setShowQRScanner(false)}
      />
    </div>
  );
}
