"use client";

import { useState, useCallback, useEffect } from "react";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";
import { useReceiveTransfer } from "@/lib/hooks/use-receive-transfer";
import { useChat } from "@/lib/hooks/use-chat";
import { formatFileSize } from "@repo/utils";
import AppHeader from "@/components/app-header";
import ConfirmLeaveModal from "@/components/confirm-leave-modal";
import ConfirmCancelModal from "@/components/confirm-cancel-modal";
import FileOfferPrompt from "@/components/file-offer-prompt";
import PasswordModal from "@/components/password-modal";
import ChatDrawer from "@/components/chat-drawer";
import QRCodeModal from "@/components/qr-code-modal";
import TransferProgressPanel from "@/components/transfer/transfer-progress-panel";
import TransferVisualizer from "@/components/transfer/transfer-visualizer";
import PeerIdCard from "@/components/transfer/peer-id-card";
import RadarVisualizer from "@/components/transfer/radar-visualizer";
import TerminalLog from "@/components/transfer/terminal-log";
import ReceivedFileView from "@/components/transfer/received-file-view";
import IncomingOfferCard from "@/components/transfer/incoming-offer-card";
import DiagnosticPanel from "@/components/transfer/diagnostic-panel";
import ChatFAB from "@/components/transfer/chat-fab";

export default function ReceivePage() {
  const { user } = useRequireAuth();

  // --- Page-only UI state ---
  const [showMyQRModal, setShowMyQRModal] = useState(false);

  // --- Chat hook ---
  const chat = useChat(user?.id);

  const [logs, setLogs] = useState<string[]>([
    "[SYS] Terminal initialized",
    "[SYS] Awaiting incoming connection",
  ]);

  const addLog = useCallback((message: string) => {
    setLogs((prev) => [...prev, message]);
  }, []);

  // --- Receive transfer hook ---
  const {
    transferState,
    myPeerId,
    error,
    progress,
    receivedFile,
    pendingOffer,
    isReceiveTransferActive,
    showPasswordModal,
    setShowPasswordModal,
    showCancelModal,
    setShowCancelModal,
    showBackModal,
    confirmBackNavigation,
    cancelBackNavigation,
    showShareFallback,
    peerManagerRef,
    activeConnectionRef,
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
  } = useReceiveTransfer({
    user,
    onData: chat.handleIncomingData,
    onLog: addLog,
  });

  // Auto-close QR Modal if an offer or password prompt comes in
  useEffect(() => {
    if (transferState.status === "offering" || showPasswordModal) {
      setShowMyQRModal(false);
    }
  }, [transferState.status, showPasswordModal]);

  return (
    <div className="bg-transparent min-h-screen text-background-dark dark:text-white overflow-x-hidden font-display flex flex-col">
      <AppHeader
        variant="transfer"
        isPeerReady={!!myPeerId}
        status={transferState.status}
        onBackCheck={() => {
          if (isReceiveTransferActive && !confirm("Transfer in progress. Are you sure you want to leave? This will cancel the transfer.")) {
            return false;
          }
          return true;
        }}
      />

      <main className="flex-grow flex flex-col relative">
        <section className="flex-1 flex flex-col relative">
          <div className="flex-1 p-6 md:p-12 flex flex-col max-w-7xl mx-auto w-full gap-8">

            {/* === TRANSFERRING / PAUSED (Split View) === */}
            {(transferState.status === "transferring" || transferState.status === "paused") && receivedFile && progress ? (
              <div className="flex flex-col gap-8 w-full h-full">
                {/* Page Header */}
                <div className="flex flex-col gap-1">
                  <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase">
                    Secure Transfer <span className="text-primary">Downlink</span>
                  </h1>
                  <div className="flex items-center gap-2 text-muted font-mono text-sm">
                    <span className="material-symbols-outlined text-sm">lock</span>
                    <span>/secure_channel/receive</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                  <TransferProgressPanel
                    peerId={myPeerId}
                    fileName={receivedFile.name}
                    percentage={progress.percentage}
                    isPaused={transferState.status === "paused"}
                    pausedBy={transferState.pausedBy}
                    speed={progress.speed}
                    timeRemaining={progress.timeRemaining}
                    onPauseResume={handlePauseResume}
                    onCancel={handleCancelClick}
                    direction="downlink"
                  />
                  <TransferVisualizer isPaused={transferState.status === "paused"} direction="downlink" />
                </div>
                <TerminalLog logs={logs} />
              </div>
            ) : (
              /* === IDLE / OFFERING / COMPLETE / CANCELLED / ERROR (Standard Grid) === */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 w-full flex-1">
                {/* Left Column */}
                <section className="flex flex-col gap-8">
                  {/* Header */}
                  <div className="space-y-2">
                    <h1 className="text-5xl md:text-6xl font-black tracking-tighter uppercase leading-none">
                      Ready to <span className="text-primary">Receive</span>
                    </h1>
                    <p className="text-muted text-lg font-medium max-w-md">
                      Securely receive encrypted files directly to your device via WebRTC.
                    </p>
                  </div>

                  {/* Peer ID Card */}
                  <PeerIdCard
                    peerId={myPeerId}
                    onCopy={copyPeerId}
                    onShowQR={() => setShowMyQRModal(true)}
                  />

                  {/* Instructions */}
                  <div className="p-6 border border-dashed border-subtle-bauhaus flex gap-4 items-start">
                    <span className="material-symbols-outlined text-primary text-2xl">info</span>
                    <div className="flex flex-col gap-1">
                      <h4 className="text-white font-bold uppercase text-sm">How it works</h4>
                      <p className="text-muted text-sm leading-relaxed">
                        Share your Peer ID with the sender. Keep this tab open. The transfer will start automatically once connected.
                      </p>
                    </div>
                  </div>

                  <RadarVisualizer status={transferState.status} isPeerReady={!!myPeerId} className="flex-1" />
                </section>

                {/* Right Column */}
                <section className="flex flex-col gap-8 h-full">
                  <div className="flex flex-col gap-4">
                    <h3 className="text-muted text-xs font-bold uppercase tracking-wider border-b border-subtle-bauhaus pb-2">
                      Incoming Queue
                    </h3>

                    {transferState.status === "idle" && (
                      <div className="text-center py-12 text-gray-500 border-2 border-dashed border-white/5 rounded-sm bg-white/[0.02]">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center animate-pulse">
                          <span className="material-symbols-outlined text-4xl opacity-50">wifi_tethering</span>
                        </div>
                        <h3 className="text-white font-bold uppercase tracking-widest text-sm mb-1">Receiver Active</h3>
                        <p className="font-mono text-xs text-muted">Awaiting incoming secure handshake...</p>
                      </div>
                    )}

                    {transferState.status === "offering" && pendingOffer && (
                      <IncomingOfferCard pendingOffer={pendingOffer} />
                    )}

                    {transferState.status === "complete" && receivedFile && (
                      <ReceivedFileView
                        receivedFile={receivedFile}
                        onDownload={handleDownload}
                        onShare={handleShare}
                        showShareFallback={showShareFallback}
                        onTextShareFallback={handleTextShareFallback}
                        onReset={resetReceive}
                      />
                    )}

                    {transferState.status === "cancelled" && (
                      <div className="bg-surface p-4 border-l-4 border-gray-500 flex flex-col gap-3">
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

                    {(transferState.error || error) && (
                      <DiagnosticPanel
                        error={transferState.error || error || ""}
                        peerManagerRef={peerManagerRef}
                        onClear={resetReceive}
                      />
                    )}
                  </div>

                  <TerminalLog logs={logs} className="flex-1 min-h-[250px]" />
                </section>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Modals */}
      <FileOfferPrompt
        isOpen={transferState.status === "offering" && !!pendingOffer && !showPasswordModal}
        filename={pendingOffer?.filename ?? ""}
        fileSize={pendingOffer?.fileSize ?? 0}
        fileType={pendingOffer?.fileType ?? ""}
        onAccept={handleAcceptOffer}
        onReject={handleRejectOffer}
      />

      <PasswordModal
        isOpen={showPasswordModal}
        title="Encrypted File"
        description={`"${pendingOffer?.filename}" is encrypted. Enter the password to accept the transfer.`}
        onSubmit={handlePasswordSubmit}
        onCancel={() => setShowPasswordModal(false)}
        isCreation={false}
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

      {/* Chat */}
      <ChatDrawer
        isOpen={chat.isChatOpen}
        onClose={() => chat.setIsChatOpen(false)}
        messages={chat.messages}
        onSendMessage={(text) => chat.sendMessage(text, activeConnectionRef.current, "")}
        currentUserId={user?.id || "receiver"}
        peerId={activeConnectionRef.current?.peer || "sender"}
      />

      {
        transferState.status !== "idle" && (
          <ChatFAB
            hasUnread={chat.hasUnread}
            onClick={() => {
              chat.setIsChatOpen(true);
              chat.setHasUnread(false);
            }}
          />
        )
      }

      <QRCodeModal
        isOpen={showMyQRModal}
        peerId={myPeerId}
        onClose={() => setShowMyQRModal(false)}
      />
    </div >
  );
}
