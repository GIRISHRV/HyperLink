"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getCurrentUser } from "@/lib/services/auth-service";
import { createTransfer, updateTransferStatus } from "@/lib/services/transfer-service";
import TransferHeader from "@/components/transfer-header";
import { PeerManager } from "@/lib/webrtc/peer-manager";
import { FileSender } from "@/lib/transfer/sender";
import { getPeerConfig } from "@/lib/config/webrtc";
import type { TransferProgress } from "@repo/types";
import { formatFileSize, formatTime, validateFileSize } from "@repo/utils";
import { requestNotificationPermission, notifyTransferComplete, playErrorSound, playSuccessSound, playConnectionSound, isSecureContext } from "@/lib/utils/notification";
import { useWakeLock } from "@/lib/hooks/use-wake-lock";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { useClipboardFile } from "@/lib/hooks/use-clipboard-file";
import { zipFiles, getFilesFromDataTransferItems } from "@/lib/utils/zip-helper";
import ChatDrawer from "@/components/chat-drawer";
import QRScannerModal from "@/components/qr-scanner-modal";
import { ProgressBar } from "@/components/progress-bar";
import { useTransferGuard } from "@/lib/hooks/use-transfer-guard";
import ConfirmLeaveModal from "@/components/confirm-leave-modal";
import PasswordModal from "@/components/password-modal";

function SendPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isPeerReady, setIsPeerReady] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [password, setPassword] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [logs, setLogs] = useState<string[]>([
    "Initializing WebRTC handshake...",
    "Waiting for peer connection...",
  ]);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<import("@repo/types").ChatMessage[]>([]);
  const [hasUnread, setHasUnread] = useState(false);

  const peerManagerRef = useRef<PeerManager | null>(null);
  const initializingRef = useRef(false);
  const fileSenderRef = useRef<FileSender | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const connectionRef = useRef<any>(null);
  const { request: requestWakeLock, release: releaseWakeLock } = useWakeLock();

  const { vibrate } = useHaptics();

  const isTransferActive = status === "connecting" || status === "waiting" || status === "transferring";
  const { showBackModal, confirmBackNavigation, cancelBackNavigation } = useTransferGuard(
    transferId,
    isTransferActive
  );

  const addLog = useCallback((message: string) => {
    setLogs((prev) => [...prev, message]);
  }, []);

  const processFiles = useCallback(async (files: File[]) => {
    const totalSize = files.reduce((acc, file) => acc + file.size, 0);
    const MAX_SIZE = 10 * 1024 * 1024 * 1024; // 10GB
    if (totalSize > MAX_SIZE) {
      setError(`Total size (${formatFileSize(totalSize)}) exceeds the 10GB limit for browser zipping.`);
      addLog(`✗ Size limit exceeded: ${formatFileSize(totalSize)}`);
      return;
    }

    const isSingleFile = files.length === 1;
    const hasPath = files[0].webkitRelativePath && files[0].webkitRelativePath.includes("/");

    if (isSingleFile && !hasPath) {
      const file = files[0];
      const validation = validateFileSize(file.size);
      if (!validation.valid) {
        setError(validation.error!);
        addLog(`✗ File validation failed: ${validation.error}`);
        return;
      }
      setFile(file);
      setError("");
      addLog(`✓ File selected: ${file.name} (${formatFileSize(file.size)})`);
    } else {
      try {
        setIsZipping(true);
        setZipProgress(0);
        setError("");
        addLog(`> Zipping ${files.length} files...`);
        const zippedFile = await zipFiles(files, (percent) => setZipProgress(percent));
        setFile(zippedFile);
        addLog(`✓ Zipping complete: ${zippedFile.name} (${formatFileSize(zippedFile.size)})`);
      } catch (err: any) {
        console.error("Zipping failed:", err);
        setError("Failed to zip files. Browser memory might be full.");
        addLog(`✗ Zipping error: ${err.message}`);
      } finally {
        setIsZipping(false);
      }
    }
  }, [addLog]);

  useEffect(() => {
    requestNotificationPermission();
    if (!isSecureContext() && window.location.hostname !== 'localhost') {
      setError("Insecure Context: WebRTC is likely blocked. Please use HTTPS.");
    }

    const title = searchParams?.get("title");
    const text = searchParams?.get("text");
    const url = searchParams?.get("url");

    if (title || text || url) {
      const content = [
        title ? `Title: ${title}` : "",
        text ? `Text: ${text}` : "",
        url ? `URL: ${url}` : ""
      ].filter(Boolean).join("\n");

      if (content) {
        const sharedFile = new File([content], "shared_content.txt", { type: "text/plain" });
        setFile(sharedFile);
        addLog(`✓ Received shared content from system`);
      }
    }

    if (typeof navigator !== 'undefined' && 'clearAppBadge' in navigator) {
      (navigator as any).clearAppBadge().catch(console.error);
    }
  }, [searchParams, addLog]);

  useEffect(() => {
    if (status === "transferring" && progress) {
      document.title = `${progress.percentage.toFixed(0)}% - Uploading...`;
    } else if (status === "complete") {
      document.title = "Transfer Complete - HyperLink";
    } else {
      document.title = "HyperLink - Secure P2P";
    }

    if (status === "complete") {
      notifyTransferComplete("sent", file?.name || "File");
    }
    if (status === "connecting" || status === "transferring") {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
  }, [status, progress, file, requestWakeLock, releaseWakeLock]);

  const handlePaste = useCallback((file: File) => {
    processFiles([file]);
  }, [processFiles]);

  useClipboardFile(handlePaste);

  useEffect(() => {
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
      if (e.relatedTarget === null) {
        setIsDraggingOver(false);
      }
    };

    const handleGlobalDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(true);
    };

    const handleGlobalDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);

      if (e.dataTransfer && e.dataTransfer.items) {
        const droppedFiles = await getFilesFromDataTransferItems(e.dataTransfer.items);
        if (droppedFiles.length > 0) {
          addLog(`✓ Dropped ${droppedFiles.length} file(s)`);
          await processFiles(droppedFiles);
        }
      }
    };

    window.addEventListener("dragenter", handleGlobalDragEnter);
    window.addEventListener("dragleave", handleGlobalDragLeave);
    window.addEventListener("dragover", handleGlobalDragOver);
    window.addEventListener("drop", handleGlobalDrop);

    return () => {
      window.removeEventListener("dragenter", handleGlobalDragEnter);
      window.removeEventListener("dragleave", handleGlobalDragLeave);
      window.removeEventListener("dragover", handleGlobalDragOver);
      window.removeEventListener("drop", handleGlobalDrop);
    };
  }, [processFiles, addLog]);

  const handleData = useCallback((data: any) => {
    if (data && data.type === "chat-message") {
      const msg = data.payload as import("@repo/types").ChatMessage;
      setMessages((prev) => [...prev, msg]);
      if (!isChatOpen) {
        setHasUnread(true);
      }
    }
  }, [isChatOpen]);

  const handleSendMessage = (text: string) => {
    if (!connectionRef.current || !user) return;
    const msg: import("@repo/types").ChatMessage = {
      id: crypto.randomUUID(),
      senderId: user.id,
      text,
      timestamp: Date.now(),
    };
    connectionRef.current.send({
      type: "chat-message",
      transferId: transferId || "",
      payload: msg,
      timestamp: Date.now(),
    });
    setMessages((prev) => [...prev, msg]);
  };

  const checkAuthAndInitPeer = useCallback(async () => {
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

    const config = getPeerConfig();
    peerManagerRef.current = new PeerManager(config);

    try {
      await peerManagerRef.current.initialize();
      addLog("✓ Peer manager initialized successfully");
      setIsPeerReady(true);
    } catch (err: any) {
      setError(`Failed to connect to signaling server: ${err.message}`);
      addLog(`✗ Error: ${err.message}`);
      setIsPeerReady(false);
    } finally {
      initializingRef.current = false;
    }
  }, [router, addLog]);

  useEffect(() => {
    checkAuthAndInitPeer();
    return () => {
      if (peerManagerRef.current) {
        peerManagerRef.current.destroy();
      }
    };
  }, [checkAuthAndInitPeer]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;
    await processFiles(selectedFiles);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const items = e.dataTransfer.items;
    const droppedFiles = await getFilesFromDataTransferItems(items);
    if (droppedFiles.length === 0) return;
    await processFiles(droppedFiles);
  };

  const handleSend = async () => {
    if (!file || !receiverPeerId || !peerManagerRef.current) return;
    setStatus("connecting");
    setError("");
    addLog(`> Connecting to peer: ${receiverPeerId.slice(0, 8)}...`);

    try {
      const transfer = await createTransfer({ filename: file.name, fileSize: file.size });
      if (!transfer) throw new Error("Failed to create transfer record");

      setTransferId(transfer.id);
      addLog(`✓ Transfer record created: ${transfer.id.slice(0, 8)}`);

      const connection = peerManagerRef.current.connectToPeer(receiverPeerId);
      connectionRef.current = connection;

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Connection timeout")), 30000);
        connection.on("open", () => {
          clearTimeout(timeout);
          addLog("✓ Peer connection established");
          vibrate('medium');
          playConnectionSound();
          resolve();
        });
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

      fileSenderRef.current = new FileSender(file, connection, transfer.id);
      if (password) {
        addLog("> 🔒 Encrypting file with password...");
        await fileSenderRef.current.setPassword(password);
      }

      fileSenderRef.current.onPauseChange((paused) => {
        setIsPaused(paused);
        addLog(paused ? "> Transfer paused by receiver" : "> Transfer resumed by receiver");
      });

      fileSenderRef.current.onReject(() => {
        setStatus("error");
        setError("Receiver rejected the file offer");
        addLog("✗ Receiver rejected the file");
        vibrate('error');
        playErrorSound();
      });

      let hasStartedTransfer = false;
      const transferPromise = fileSenderRef.current.startTransfer((progressData) => {
        if (!hasStartedTransfer) {
          hasStartedTransfer = true;
          setStatus("transferring");
          addLog("> File accepted! Starting transfer...");
        }
        setProgress(progressData);
        if (Math.floor(progressData.percentage) % 10 === 0 && Math.floor(progressData.percentage) !== Math.floor((progressData.bytesTransferred - 16384) / progressData.totalBytes * 100)) {
          addLog(`> Progress: ${progressData.percentage.toFixed(0)}%`);
        }
      });

      await fileSenderRef.current.sendOffer();
      addLog("> File metadata sent to receiver");
      setStatus("waiting");
      addLog("> Waiting for receiver to accept...");

      await transferPromise;
      await updateTransferStatus(transfer.id, "complete");
      setStatus("complete");
      addLog("✓ Transfer completed successfully");
      vibrate('success');
      playSuccessSound();
      notifyTransferComplete("sent", file.name);

      if ('setAppBadge' in navigator) {
        (navigator as any).setAppBadge(1).catch(console.error);
      }
    } catch (err: any) {
      console.error("Transfer failed:", err);
      setError(err.message || "Transfer failed");
      setStatus("error");
      addLog(`✗ Transfer failed: ${err.message}`);
      vibrate('error');
      playErrorSound();
      if (transferId) await updateTransferStatus(transferId, "failed");
    }
  };

  const resetTransfer = () => {
    if (fileSenderRef.current) fileSenderRef.current.cancel();
    if (connectionRef.current) connectionRef.current.close();
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
    setLogs(["Initializing WebRTC handshake...", "Waiting for peer connection..."]);
  };

  const handlePauseResume = () => {
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
  };

  const handleCancel = () => {
    if (!fileSenderRef.current) return;
    fileSenderRef.current.cancel();
    setStatus("error");
    addLog("✗ Transfer cancelled by user");
    if (transferId) updateTransferStatus(transferId, "cancelled");
  };

  return (
    <div className="bg-transparent min-h-screen text-[#121212] dark:text-white overflow-x-hidden font-display flex flex-col">
      <ConfirmLeaveModal
        isOpen={showBackModal}
        onConfirm={confirmBackNavigation}
        onCancel={cancelBackNavigation}
      />

      <PasswordModal
        isOpen={showPasswordModal}
        title="Set Encryption Password"
        description="Create a password to encrypt this file. The receiver will need this password to decrypt the file."
        onSubmit={(pw) => {
          setPassword(pw);
          setShowPasswordModal(false);
          addLog("> Password set for encryption");
        }}
        onCancel={() => setShowPasswordModal(false)}
        isCreation={true}
      />

      <TransferHeader
        isPeerReady={isPeerReady}
        status={status}
        onBackCheck={() => {
          const isActive = status === "connecting" || status === "waiting" || status === "transferring";
          if (isActive && !confirm("Transfer in progress. Are you sure you want to leave? This will cancel the transfer.")) {
            return false;
          }
          return true;
        }}
      />

      <main className="flex-grow flex flex-col relative">
        <section className="flex-1 flex flex-col relative">
          <div className="flex-1 p-6 md:p-12 flex flex-col max-w-7xl mx-auto w-full gap-8">
            <div className="flex flex-col gap-1">
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase">
                Secure Transfer <span className="text-primary">Uplink</span>
              </h1>
              <div className="flex items-center gap-2 text-[#bcb89a] font-mono text-sm">
                <span className="material-symbols-outlined text-sm">lock</span>
                <span>/secure_channel/send</span>
                <span className={`w-2 h-2 rounded-full ${isPeerReady ? 'bg-green-500 animate-pulse' : 'bg-red-500'} ml-2`}></span>
                <span className={isPeerReady ? 'text-green-500' : 'text-red-500'}>{isPeerReady ? 'WEBRTC_READY' : 'INITIALIZING'}</span>
              </div>
            </div>

            {status === "idle" && (
              <>
                <div
                  className="group relative w-full h-80 md:h-96 border-[2px] border-white/10 bg-[#0a0a0a]/50 backdrop-blur-sm hover:bg-[#0a0a0a]/80 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-6 overflow-hidden hover:scale-[1.01] active:scale-[0.99] hover:shadow-[0_0_50px_-10px_rgba(255,234,46,0.1)]"
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="absolute inset-0 border-[2px] border-primary/20 group-hover:border-primary/60 transition-colors duration-500 mask-container"></div>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_center,rgba(255,234,46,0.05)_0%,transparent_70%)]"></div>

                  <input
                    ref={fileInputRef}
                    data-testid="file-input"
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />

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

                  <div className="absolute top-4 left-4 w-4 h-4 border-l-2 border-t-2 border-white/30 group-hover:border-primary group-hover:w-8 group-hover:h-8 transition-all duration-300"></div>
                  <div className="absolute top-4 right-4 w-4 h-4 border-r-2 border-t-2 border-white/30 group-hover:border-primary group-hover:w-8 group-hover:h-8 transition-all duration-300"></div>
                  <div className="absolute bottom-4 left-4 w-4 h-4 border-l-2 border-b-2 border-white/30 group-hover:border-primary group-hover:w-8 group-hover:h-8 transition-all duration-300"></div>
                  <div className="absolute bottom-4 right-4 w-4 h-4 border-r-2 border-b-2 border-white/30 group-hover:border-primary group-hover:w-8 group-hover:h-8 transition-all duration-300"></div>
                  <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(255,255,255,0.02)_50%,transparent_100%)] h-[200%] w-full animate-[scan_4s_linear_infinite] pointer-events-none opacity-0 group-hover:opacity-100"></div>
                </div>

                {file && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-2">
                      <h3 className="font-mono text-[#bcb89a] text-sm mb-4 uppercase tracking-widest">Selected Payload</h3>
                      <div className="corner-fold bg-surface-dark p-6 md:p-8 min-h-[200px] flex gap-6 shadow-2xl">
                        <div className="w-32 h-32 bg-[#11110f] flex items-center justify-center shrink-0 border border-[#3a3827]">
                          <span className="material-symbols-outlined text-white/50" style={{ fontSize: '48px' }}>description</span>
                        </div>
                        <div className="flex flex-col justify-between flex-1 py-1">
                          <div>
                            <h4 className="text-white text-xl md:text-2xl font-bold leading-tight mb-2">{file.name}</h4>
                            <div className="flex flex-col gap-1 font-mono text-sm text-[#bcb89a]">
                              <p>SIZE: {formatFileSize(file.size)}</p>
                              <p className="truncate max-w-[300px] md:max-w-md text-xs opacity-50">Ready for encrypted transfer</p>
                            </div>
                          </div>
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

                    <div className="lg:col-span-1 flex flex-col gap-6">
                      <h3 className="font-mono text-[#bcb89a] text-sm mb-2 uppercase tracking-widest">Transfer Control</h3>
                      <div className="flex flex-col gap-3">
                        <label className="text-xs font-bold tracking-[0.1em] text-primary uppercase flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">hub</span>
                          Destination Peer ID
                        </label>
                        <div className="flex gap-2">
                          <input
                            data-testid="peer-id-input"
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

                      <div className="flex flex-col gap-3">
                        <label className="text-xs font-bold tracking-[0.1em] text-primary uppercase flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">enhanced_encryption</span>
                          Security (Optional)
                        </label>
                        {password ? (
                          <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 p-3 rounded-sm">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-green-500">lock</span>
                              <span className="text-sm font-bold text-green-400 uppercase tracking-wider">Encrypted</span>
                            </div>
                            <button
                              onClick={() => setPassword("")}
                              className="text-xs text-red-400 hover:text-red-300 uppercase font-bold tracking-wider"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowPasswordModal(true)}
                            className="w-full h-12 border border-dashed border-white/20 hover:border-primary/50 hover:bg-white/5 text-gray-400 hover:text-primary flex items-center justify-center gap-2 transition-all uppercase text-xs font-bold tracking-widest"
                          >
                            <span className="material-symbols-outlined text-sm">add_moderator</span>
                            Set Encryption Password
                          </button>
                        )}
                      </div>

                      <button
                        data-testid="initiate-transfer-button"
                        onClick={handleSend}
                        disabled={!file || !receiverPeerId || !isPeerReady}
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

            {isZipping && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary flex items-center justify-center animate-pulse">
                  <span className="material-symbols-outlined text-3xl text-black animate-spin">folder_zip</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 uppercase">Compressing...</h3>
                <p className="text-gray-400 mb-6 font-mono text-sm">Preparing your files for transfer</p>
                <div className="w-64 h-2 bg-white/10 rounded-full mx-auto overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${zipProgress}%` }}
                  />
                </div>
                <p className="text-primary font-mono text-xs mt-2">{zipProgress.toFixed(0)}%</p>
              </div>
            )}

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

            {status === "transferring" && file && progress && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 h-full">
                <div className="lg:col-span-5 flex flex-col gap-6">
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

                  <div className="bg-[#11110f]/90 backdrop-blur-sm p-6 border border-[#3a3827] flex-1 flex flex-col gap-6 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[radial-gradient(#3a3827_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
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

                    <ProgressBar
                      percentage={progress.percentage}
                      isPaused={isPaused}
                      speed={progress.speed}
                      formatFileSize={formatFileSize}
                      formatTime={formatTime}
                      timeRemaining={progress.timeRemaining}
                    />

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

                <div className="lg:col-span-7 relative min-h-[400px] border border-[#3a3827] bg-[#0a0a0a] overflow-hidden flex items-center justify-center">
                  <div className="absolute inset-0 pointer-events-none opacity-20"
                    style={{
                      backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
                      backgroundSize: '40px 40px'
                    }}
                  />

                  <div className="relative z-10 flex items-center justify-center">
                    <div className="absolute w-[300px] h-[300px] border border-primary/20 rounded-full animate-[spin_10s_linear_infinite]" />
                    <div className="absolute w-[200px] h-[200px] border border-dashed border-primary/40 rounded-full animate-[spin_20s_linear_infinite_reverse]" />
                    <div className="absolute w-[100px] h-[100px] bg-primary/10 rounded-full blur-xl animate-pulse" />

                    <div className="w-16 h-16 bg-[#1a1a1a] border border-primary rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,234,46,0.5)] z-20">
                      <span className={`material-symbols-outlined text-primary text-3xl ${!isPaused && "animate-ping"}`}>upload</span>
                    </div>

                    {!isPaused && (
                      <>
                        <div className="absolute w-2 h-2 bg-primary rounded-full animate-[ping_2s_linear_infinite]" style={{ top: '-100px' }} />
                        <div className="absolute w-2 h-2 bg-primary rounded-full animate-[ping_2.5s_linear_infinite]" style={{ bottom: '-80px', right: '-40px' }} />
                        <div className="absolute w-2 h-2 bg-primary rounded-full animate-[ping_1.8s_linear_infinite]" style={{ bottom: '-20px', left: '-90px' }} />
                      </>
                    )}

                    <div className="absolute inset-0 w-full h-[2px] bg-primary/50 top-1/2 -translate-y-1/2 animate-[spin_4s_linear_infinite] shadow-[0_0_10px_rgba(255,234,46,0.8)]" />
                  </div>

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

            {status === "error" && (
              <div className="text-center py-12 max-w-2xl mx-auto">
                <div className="w-16 h-16 mx-auto mb-4 bg-bauhaus-red flex items-center justify-center shadow-[0_0_20px_rgba(255,59,48,0.3)]">
                  <span className="material-symbols-outlined text-3xl text-white">error</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 uppercase tracking-tighter">Transfer Failed</h3>
                <p className="text-bauhaus-red mb-6 font-mono text-sm border border-bauhaus-red/20 bg-bauhaus-red/5 p-3 leading-relaxed">
                  {error || "Unknown error occurred"}
                </p>

                <div className="mb-8 p-4 bg-white/5 border border-white/10 text-left font-mono text-[10px] space-y-2">
                  <p className="text-primary font-bold uppercase mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-xs">analytics</span>
                    Diagnostic Report
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 opacity-70">
                    <p>SECURE_CONTEXT:</p> <p className={isSecureContext() ? "text-green-400" : "text-bauhaus-red"}>{String(isSecureContext()).toUpperCase()}</p>
                    <p>NETWORK_STATUS:</p> <p className="text-white">{typeof navigator !== 'undefined' && navigator.onLine ? "ONLINE" : "OFFLINE"}</p>
                    <p>SIGNALING_SERVER:</p> <p className={peerManagerRef.current?.getState() === 'failed' ? "text-bauhaus-red" : "text-green-400"}>{peerManagerRef.current?.getState()?.toUpperCase() || "UNKNOWN"}</p>
                  </div>
                  <p className="mt-4 text-[9px] text-white/30 italic">
                    Hint: If on mobile, ensure you are using HTTPS. &quot;Connection timeout&quot; often indicates NAT traversal issues.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={resetTransfer}
                    className="px-8 py-4 bg-primary hover:bg-white text-black font-black uppercase tracking-widest transition-all active:scale-95"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="px-8 py-4 border border-white/20 hover:border-white text-white font-bold uppercase tracking-widest transition-all"
                  >
                    Return to Home
                  </button>
                </div>
              </div>
            )}

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

      {status !== "idle" && (
        <button
          onClick={() => { setIsChatOpen(true); setHasUnread(false); }}
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

      <style jsx>{`
        .corner-fold {
          clip-path: polygon(0 0, calc(100% - 48px) 0, 100% 48px, 100% 100%, 0 100%);
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

      {isDraggingOver && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-200">
          <div className="w-64 h-64 rounded-full border-4 border-dashed border-primary animate-[spin_10s_linear_infinite] flex items-center justify-center mb-8">
            <div className="w-48 h-48 rounded-full bg-primary/20 animate-pulse"></div>
          </div>
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Drop Payload Here</h2>
          <p className="text-primary font-mono mt-4">Initiating Transfer Sequence</p>
        </div>
      )}

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

export default function SendPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="font-mono text-primary animate-pulse text-xs uppercase tracking-widest">Initialising Uplink...</p>
        </div>
      </div>
    }>
      <SendPageContent />
    </Suspense>
  );
}
