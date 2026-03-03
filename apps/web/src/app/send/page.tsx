"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";
import { useSendTransfer } from "@/lib/hooks/use-send-transfer";
import { useFileSelection } from "@/lib/hooks/use-file-selection";
import { useChat } from "@/lib/hooks/use-chat";
import AppHeader from "@/components/app-header";
import ConfirmLeaveModal from "@/components/confirm-leave-modal";
import PasswordModal from "@/components/password-modal";
import ChatDrawer from "@/components/chat-drawer";
import QRScannerModal from "@/components/qr-scanner-modal";
import FileDropZone from "@/components/transfer/file-drop-zone";
import SelectedFileCard from "@/components/transfer/selected-file-card";
import SendControlPanel from "@/components/transfer/send-control-panel";
import TransferProgressPanel from "@/components/transfer/transfer-progress-panel";
import TransferVisualizer from "@/components/transfer/transfer-visualizer";
import TransferFailedState from "@/components/transfer/transfer-failed-state";
import TransferCompleteState from "@/components/transfer/transfer-complete-state";
import TerminalLog from "@/components/transfer/terminal-log";
import ChatFAB from "@/components/transfer/chat-fab";
import DragOverlay from "@/components/transfer/drag-overlay";

import { openDB } from "idb";

const DB_NAME = "hyperlink-pwa-share";
const STORE_NAME = "shared-files";

function SendPageContent() {
  const searchParams = useSearchParams();
  const { user } = useRequireAuth();

  // --- Page-only UI state ---
  const [receiverPeerId, setReceiverPeerId] = useState("");
  const [password, setPassword] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [swStatus, setSwStatus] = useState<"not_registered" | "installing" | "active" | "error">("not_registered");
  const [logs, setLogs] = useState<string[]>([
    "Initializing WebRTC handshake...",
    "Waiting for peer connection...",
  ]);

  const addLog = useCallback((message: string) => {
    setLogs((prev) => [...prev, message]);
  }, []);

  // --- File selection hook ---
  const {
    file,
    setFile,
    isDraggingOver,
    isZipping,
    zipProgress,
    error: fileError,
    fileInputRef,
    processFiles,
    handleFileSelect,
    handleDrop,
    removeFile,
  } = useFileSelection({ onLog: addLog });

  // --- Chat hook ---
  const chat = useChat(user?.id);

  // --- Transfer hook ---
  const {
    transferState,
    isPeerReady,
    error: transferError,
    connectionRef,
    peerManagerRef,
    handleSend,
    resetSend,
    handlePauseResume,
    handleCancel,
    showBackModal,
    confirmBackNavigation,
    cancelBackNavigation,
  } = useSendTransfer({
    user,
    file,
    receiverPeerId,
    password,
    onData: chat.handleIncomingData,
    onLog: addLog,
    onReset: () => {
      setFile(null);
      if (!searchParams?.get("peerId")) {
        setReceiverPeerId("");
      }
      setLogs(["Initializing WebRTC handshake...", "Waiting for peer connection..."]);
    },
  });

  const error = fileError || transferError;

  // --- PWA Share Target Handling ---
  useEffect(() => {
    const shared = searchParams?.get("shared");
    const isShared = shared === "true";
    const title = searchParams?.get("title");
    const text = searchParams?.get("text");
    const url = searchParams?.get("url");

    if (shared === "middleware_bypass" || shared === "legacy_fallback" || shared === "failed_sw_bypass") {
      // setError handled via fileError state in useFileSelection — not critical for PWA share
    }

    if (isShared) {
      (async () => {
        try {
          const db = await openDB(DB_NAME, 1);
          const sharedData = await db.get(STORE_NAME, "latest");
          if (sharedData) {
            addLog("✓ Loading shared content from System");
            if (sharedData.files && sharedData.files.length > 0) {
              const files = sharedData.files.map(
                (f: { blob: BlobPart; name: string; type: string }) =>
                  new File([f.blob], f.name, { type: f.type })
              );
              await processFiles(files);
            } else {
              const content = [
                sharedData.title ? `Title: ${sharedData.title}` : "",
                sharedData.text ? `Text: ${sharedData.text}` : "",
                sharedData.url ? `URL: ${sharedData.url}` : "",
              ]
                .filter(Boolean)
                .join("\n");
              if (content) {
                const sharedFile = new File([content], "shared_content.txt", { type: "text/plain" });
                setFile(sharedFile);
                addLog("✓ Received shared text from system");
              }
            }
            await db.delete(STORE_NAME, "latest");
          }
        } catch {
          console.error("Failed to load shared data");
        }
      })();
    } else if (title || text || url) {
      const content = [
        title ? `Title: ${title}` : "",
        text ? `Text: ${text}` : "",
        url ? `URL: ${url}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      if (content) {
        const sharedFile = new File([content], "shared_content.txt", { type: "text/plain" });
        setFile(sharedFile);
        addLog("✓ Received shared content from system");
      }
    }

    // Service Worker status
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .ready.then((reg) => setSwStatus(reg.active ? "active" : "installing"))
        .catch(() => setSwStatus("error"));
      navigator.serviceWorker.addEventListener("controllerchange", () => setSwStatus("active"));
    }
  }, [searchParams, addLog, processFiles, setFile]);

  // --- Pre-fill peer ID from URL ---
  useEffect(() => {
    const peerId = searchParams?.get("peerId");
    if (peerId) setReceiverPeerId(peerId);
  }, [searchParams]);

  return (
    <div className="bg-transparent min-h-screen text-background-dark dark:text-white overflow-x-hidden font-display flex flex-col">
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

      <AppHeader
        variant="transfer"
        isPeerReady={isPeerReady}
        status={transferState.status}
        onBackCheck={() => {
          const isActive =
            transferState.status === "connecting" ||
            transferState.status === "awaiting_acceptance" ||
            transferState.status === "transferring";
          if (isActive && !confirm("Transfer in progress. Are you sure you want to leave? This will cancel the transfer.")) {
            return false;
          }
          return true;
        }}
      />

      <main className="flex-grow flex flex-col relative">
        <section className="flex-1 flex flex-col relative">
          <div className="flex-1 p-6 md:p-12 flex flex-col max-w-7xl mx-auto w-full gap-8">
            {/* Page Header */}
            <div className="flex flex-col gap-1">
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase">
                Secure Transfer <span className="text-primary">Uplink</span>
              </h1>
              <div className="flex items-center gap-2 text-muted font-mono text-sm">
                <span className="material-symbols-outlined text-sm">lock</span>
                <span>/secure_channel/send</span>
                <span className={`w-2 h-2 rounded-full ${isPeerReady ? "bg-green-500 animate-pulse" : "bg-red-500"} ml-2`}></span>
                <span className={isPeerReady ? "text-green-500" : "text-red-500"}>
                  {isPeerReady ? "WEBRTC_READY" : "INITIALIZING"}
                </span>
                {swStatus !== "active" && (
                  <span className="ml-2 text-xs px-1.5 py-0.5 border border-bauhaus-red text-bauhaus-red animate-pulse">
                    SW_WAITING: REFRESH AGAIN
                  </span>
                )}
              </div>
            </div>

            {/* === IDLE STATE === */}
            {transferState.status === "idle" && (
              <>
                <FileDropZone
                  file={file}
                  fileInputRef={fileInputRef}
                  onDrop={handleDrop}
                  onFileSelect={handleFileSelect}
                />

                {file && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-2">
                      <SelectedFileCard file={file} onRemove={removeFile} />
                    </div>
                    <SendControlPanel
                      receiverPeerId={receiverPeerId}
                      onPeerIdChange={setReceiverPeerId}
                      onQRScan={() => setShowQRScanner(true)}
                      password={password}
                      onSetPassword={() => setShowPasswordModal(true)}
                      onRemovePassword={() => setPassword("")}
                      onSend={handleSend}
                      isPeerReady={isPeerReady}
                      hasFile={!!file}
                    />
                  </div>
                )}

                {error && (
                  <div className="bg-bauhaus-red/10 border border-bauhaus-red/30 px-4 py-3">
                    <p className="text-sm text-bauhaus-red font-medium">{error}</p>
                  </div>
                )}
              </>
            )}

            {/* === ZIPPING === */}
            {isZipping && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary flex items-center justify-center animate-pulse">
                  <span className="material-symbols-outlined text-3xl text-black animate-spin">folder_zip</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 uppercase">Compressing...</h3>
                <p className="text-gray-400 mb-6 font-mono text-sm">Preparing your files for transfer</p>
                <div className="w-64 h-2 bg-white/10 rounded-full mx-auto overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-300 ease-out" style={{ width: `${zipProgress}%` }} />
                </div>
                <p className="text-primary font-mono text-xs mt-2">{zipProgress.toFixed(0)}%</p>
              </div>
            )}

            {/* === CONNECTING === */}
            {transferState.status === "connecting" && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary flex items-center justify-center animate-pulse">
                  <span className="material-symbols-outlined text-3xl text-black animate-spin">sync</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 uppercase">Connecting...</h3>
                <p className="text-gray-400 mb-6 font-mono text-sm">Establishing peer-to-peer connection</p>
                <button onClick={resetSend} className="px-6 py-3 border border-white/20 hover:border-red-500 text-white font-semibold transition-colors">
                  Cancel
                </button>
              </div>
            )}

            {/* === AWAITING ACCEPTANCE === */}
            {transferState.status === "awaiting_acceptance" && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary flex items-center justify-center animate-pulse">
                  <span className="material-symbols-outlined text-3xl text-black">hourglass_empty</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 uppercase">Waiting for Receiver</h3>
                <p className="text-gray-400 mb-2 font-mono text-sm">File offer sent to peer</p>
                <p className="text-muted mb-6 font-mono text-xs">Waiting for {receiverPeerId.slice(0, 8)}... to accept</p>
                <button onClick={resetSend} className="px-6 py-3 border border-white/20 hover:border-red-500 text-white font-semibold transition-colors">
                  Cancel Offer
                </button>
              </div>
            )}

            {/* === TRANSFERRING / PAUSED === */}
            {(transferState.status === "transferring" || transferState.status === "paused") && file && transferState.totalBytes > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 h-full">
                <TransferProgressPanel
                  peerId={receiverPeerId}
                  fileName={file.name}
                  percentage={(transferState.bytesTransferred / transferState.totalBytes) * 100}
                  isPaused={transferState.status === "paused"}
                  speed={transferState.speedBytesPerSecond || 0}
                  timeRemaining={transferState.estimatedSecondsRemaining || 0}
                  onPauseResume={handlePauseResume}
                  onCancel={handleCancel}
                  direction="uplink"
                />
                <TransferVisualizer isPaused={transferState.status === "paused"} direction="uplink" />
              </div>
            )}

            {/* === FAILED === */}
            {transferState.status === "failed" && (
              <TransferFailedState
                error={error || ""}
                peerManagerRef={peerManagerRef}
                onRetry={resetSend}
              />
            )}

            {/* === COMPLETE === */}
            {transferState.status === "complete" && (
              <TransferCompleteState fileName={file?.name || "File"} onReset={resetSend} />
            )}

            {/* Terminal Log */}
            <TerminalLog logs={logs} />
          </div>
        </section>
      </main>

      {/* Chat */}
      <ChatDrawer
        isOpen={chat.isChatOpen}
        onClose={() => chat.setIsChatOpen(false)}
        messages={chat.messages}
        onSendMessage={(text) => chat.sendMessage(text, connectionRef.current, "")}
        currentUserId={user?.id || "sender"}
        peerId={receiverPeerId}
      />

      {transferState.status !== "idle" && (
        <ChatFAB
          hasUnread={chat.hasUnread}
          onClick={() => {
            chat.setIsChatOpen(true);
            chat.setHasUnread(false);
          }}
        />
      )}

      {/* Drag Overlay */}
      {isDraggingOver && <DragOverlay />}

      {/* QR Scanner */}
      <QRScannerModal
        isOpen={showQRScanner}
        onScan={(scannedPeerId) => {
          setReceiverPeerId(scannedPeerId);
          addLog(`✓ Scanned Peer ID: ${scannedPeerId.slice(0, 8)}...`);
        }}
        onClose={() => setShowQRScanner(false)}
      />

      <style jsx>{`
        @keyframes scan {
          0% {
            transform: translateY(-50%);
          }
          100% {
            transform: translateY(0%);
          }
        }
      `}</style>
    </div>
  );
}

export default function SendPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-surface-deep">
          <div className="flex flex-col items-center gap-4">
            <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <p className="font-mono text-primary animate-pulse text-xs uppercase tracking-widest">
              Initialising Uplink...
            </p>
          </div>
        </div>
      }
    >
      <SendPageContent />
    </Suspense>
  );
}
