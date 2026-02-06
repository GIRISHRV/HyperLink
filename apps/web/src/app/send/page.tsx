"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/services/auth-service";
import { createTransfer, updateTransferStatus } from "@/lib/services/transfer-service";
import { PeerManager } from "@/lib/webrtc/peer-manager";
import { FileSender } from "@/lib/transfer/sender";
import type { PeerConfig, TransferProgress } from "@repo/types";
import { formatFileSize, formatTime, validateFileSize } from "@repo/utils";

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
  const [logs, setLogs] = useState<string[]>([
    "Initializing WebRTC handshake...",
    "Waiting for peer connection...",
  ]);

  const peerManagerRef = useRef<PeerManager | null>(null);
  const fileSenderRef = useRef<FileSender | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function addLog(message: string) {
    setLogs((prev) => [...prev, message]);
  }

  async function checkAuthAndInitPeer() {
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
    };

    peerManagerRef.current = new PeerManager(config);

    try {
      await peerManagerRef.current.initialize();
      addLog("✓ Peer manager initialized successfully");
    } catch (err: any) {
      setError(`Failed to connect to signaling server: ${err.message}`);
      addLog(`✗ Error: ${err.message}`);
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

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Connection timeout")), 30000);

        connection.on("open", () => {
          clearTimeout(timeout);
          addLog("✓ Peer connection established");
          resolve();
        });

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

      await fileSenderRef.current.sendOffer();
      addLog("> File metadata sent to receiver");
      setStatus("waiting");
      addLog("> Waiting for receiver to accept...");

      // Give connection time to stabilize
      await new Promise(r => setTimeout(r, 1000));

      // Track if we've already switched to transferring state
      let hasStartedTransfer = false;

      await fileSenderRef.current.startTransfer((progressData) => {
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
    setFile(null);
    setReceiverPeerId("");
    setStatus("idle");
    setError("");
    setProgress(null);
    setTransferId(null);
    setIsPaused(false);
    fileSenderRef.current = null;
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
    <div className="bg-background-light dark:bg-[#121212] min-h-screen text-[#121212] dark:text-white overflow-x-hidden font-display flex flex-col">
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
        <section className="flex-1 flex flex-col relative bg-grid-pattern">
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
                {/* Drag & Drop Zone */}
                <div
                  className="group relative w-full h-64 md:h-80 border-[6px] border-dashed border-primary bg-[#23210f]/50 hover:bg-[#23210f] transition-all cursor-pointer flex flex-col items-center justify-center gap-6"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {/* Bauhaus Plus Icon */}
                  <div className="relative">
                    <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform duration-300" style={{ fontSize: '80px', fontWeight: '700' }}>
                      add
                    </span>
                  </div>

                  {file ? (
                    <div className="text-center z-10 space-y-2">
                      <p className="text-xl font-bold uppercase tracking-widest text-primary">
                        {file.name}
                      </p>
                      <p className="text-sm font-mono text-white/50">{formatFileSize(file.size)}</p>
                    </div>
                  ) : (
                    <div className="text-center z-10 space-y-2">
                      <p className="text-2xl font-bold text-white mb-2">DROP PAYLOAD HERE</p>
                      <p className="font-mono text-[#bcb89a] text-sm">or click to browse local drive</p>
                    </div>
                  )}

                  {/* Decorative corner accents */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white"></div>
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
                        <input
                          className="w-full bg-transparent border-b-2 border-white/20 focus:border-primary px-0 py-3 text-lg font-mono text-white placeholder-white/20 outline-none transition-colors"
                          placeholder="Enter hash..."
                          type="text"
                          value={receiverPeerId}
                          onChange={(e) => setReceiverPeerId(e.target.value)}
                        />
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

            {/* Transferring State */}
            {status === "transferring" && file && progress && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <div className="bg-[#11110f] p-4 border border-[#3a3827]">
                    <div className="flex justify-between text-white font-mono text-xs mb-2">
                      <span>TRANSFER_PROGRESS</span>
                      <span>{progress.percentage.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-4 bg-[#2a2a26]">
                      <div className="h-full bg-bauhaus-blue transition-all" style={{ width: `${progress.percentage}%` }}></div>
                    </div>
                    <div className="mt-2 flex justify-between font-mono text-xs text-[#bcb89a]">
                      <span>{formatFileSize(progress.speed)}/s</span>
                      <span>ETA: {formatTime(progress.timeRemaining)}</span>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-1 flex flex-col gap-4">
                  <div className="flex items-center gap-4 py-3 border border-[#3a3827] px-4 bg-[#11110f]">
                    <div className="relative w-10 h-10 bg-bauhaus-blue rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-white">person</span>
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-primary border-2 border-black"></div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-white font-bold text-sm">Connected to Peer</span>
                      <span className="text-[#bcb89a] font-mono text-xs">ID: {receiverPeerId.slice(0, 4)}...{receiverPeerId.slice(-4)}</span>
                    </div>
                  </div>

                  {/* Pause/Resume and Cancel buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={handlePauseResume}
                      className={`flex-1 h-10 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors ${isPaused
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
                      onClick={handleCancel}
                      className="flex-1 h-10 bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span className="material-symbols-outlined !text-[16px]">close</span>
                      Cancel
                    </button>
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

        /* Dotted Grid Background Pattern */
        .bg-grid-pattern {
          background-image: radial-gradient(#3a3827 1px, transparent 1px);
          background-size: 24px 24px;
        }
      `}</style>
    </div>
  );
}
