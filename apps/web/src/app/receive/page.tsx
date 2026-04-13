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
import ChatFAB from "@/components/transfer/chat-fab";
import ErrorDisplay from "@/components/ui/error-display";
import { parseError, getErrorInfo } from "@/lib/utils/error-messages";
import { getUserProfile, type UserProfile } from "@/lib/services/profile-service";
import { logger } from "@repo/utils";

export default function ReceivePage() {
  const { user } = useRequireAuth();

  // --- Page-only UI state ---
  const [showMyQRModal, setShowMyQRModal] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // --- Chat hook ---
  const chat = useChat(user?.id);

  // --- Fetch Profile ---
  useEffect(() => {
    if (user?.id) {
      getUserProfile(user.id)
        .then(setProfile)
        .catch((err) => {
          logger.error({ err }, "Failed to fetch user profile for chat");
        });
    }
  }, [user?.id]);

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
    cleanupProgress,
    isReceiveTransferActive,
    isWakeLockActive,
    showPasswordModal,
    setShowPasswordModal,
    showCancelModal,
    setShowCancelModal,
    showBackModal,
    confirmBackNavigation,
    cancelBackNavigation,
    showShareFallback,
    peerManagerRef: _peerManagerRef,
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
    <div
      className="bg-transparent min-h-screen text-background-dark dark:text-white overflow-x-hidden font-display flex flex-col"
      data-testid="receive-page"
      data-peer-id={myPeerId || ""}
    >
      <AppHeader
        variant="transfer"
        isPeerReady={!!myPeerId}
        status={transferState.status}
        onBackCheck={() => {
          if (isReceiveTransferActive) {
            setShowCancelModal(true);
            return false;
          }
          return true;
        }}
      />

      <main className="flex-grow flex flex-col relative">
        <section className="flex-1 flex flex-col relative">
          <div className="flex-1 p-6 md:p-12 flex flex-col max-w-7xl mx-auto w-full gap-8">
            {/* === TRANSFERRING / PAUSED (Split View) === */}
            {(transferState.status === "transferring" || transferState.status === "paused") &&
            receivedFile &&
            progress ? (
              <div className="flex flex-col gap-8 w-full h-full">
                {/* Page Header */}
                <div className="rounded-xl border border-white/10 bg-gradient-to-r from-bauhaus-blue/10 via-white/[0.02] to-primary/10 p-5 md:p-7">
                  <div className="flex flex-col gap-1">
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white uppercase">
                      Receiver <span className="text-primary">Monitor</span>
                    </h1>
                    <div className="flex items-center gap-2 text-muted font-mono text-xs md:text-sm">
                      <span className="material-symbols-outlined text-sm">lock</span>
                      <span>Share your code, verify sender, approve transfer.</span>
                    </div>
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
                    isWakeLockActive={isWakeLockActive}
                    chunkSize={transferState.chunkSize}
                    windowSize={transferState.windowSize}
                  />
                  <TransferVisualizer
                    isPaused={transferState.status === "paused"}
                    direction="downlink"
                  />
                </div>
                <TerminalLog logs={logs} defaultCollapsed={true} />
              </div>
            ) : (
              <div className="flex flex-col gap-6 w-full flex-1">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 xl:gap-8 w-full items-start">
                  <section
                    data-testid="receive-identity-column"
                    className="xl:col-span-5 rounded-xl bg-black/20 border border-white/10 p-6 flex flex-col gap-5"
                  >
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 border-b border-white/10 pb-4">
                      <div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white uppercase">
                          Receive File
                        </h1>
                        <p className="text-sm text-gray-400 mt-1">
                          Share your receiver code and keep this tab open for incoming transfers.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
                        <span
                          className={`inline-flex size-2 rounded-full ${myPeerId ? "bg-green-400" : "bg-gray-500"}`}
                        />
                        <span>{myPeerId ? "Receiver ready" : "Initializing endpoint"}</span>
                      </div>
                    </div>

                    <div data-testid="receive-identity-panel">
                      <PeerIdCard
                        peerId={myPeerId}
                        onCopy={copyPeerId}
                        onShowQR={() => setShowMyQRModal(true)}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">
                          Tunnel Security
                        </p>
                        <p className="text-sm font-bold text-primary">End-to-end encrypted</p>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">
                          Connection Health
                        </p>
                        <p
                          className={`text-sm font-bold ${myPeerId ? "text-green-300" : "text-gray-400"}`}
                        >
                          {myPeerId ? "Ready for sender" : "Initializing"}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section data-testid="receive-inbox-column" className="xl:col-span-7 h-full">
                    <article
                      data-testid="receive-inbox-panel"
                      className="rounded-xl bg-black/20 border border-white/10 p-6 flex flex-col gap-4 h-full"
                    >
                      <div className="flex items-center justify-between border-b border-subtle-bauhaus pb-3">
                        <h3 className="text-muted text-xs font-bold uppercase tracking-wider">
                          Incoming Queue
                        </h3>
                        <span className="text-[10px] uppercase tracking-widest text-gray-500">
                          State: {transferState.status}
                        </span>
                      </div>

                      {transferState.status === "idle" && (
                        <div className="text-center py-12 px-4 text-gray-500 border border-dashed border-white/10 rounded-xl bg-gradient-to-b from-white/[0.04] to-white/[0.01]">
                          <div className="w-20 h-20 mx-auto mb-6 rounded-full border border-white/10 bg-white/[0.03] flex items-center justify-center animate-pulse">
                            <span className="material-symbols-outlined text-4xl opacity-60">
                              wifi_tethering
                            </span>
                          </div>
                          <h3 className="text-white font-bold uppercase tracking-widest text-sm mb-1">
                            Waiting for Sender
                          </h3>
                          <p className="font-mono text-xs text-muted">
                            Keep this screen open while the sender connects.
                          </p>
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
                          cleanupProgress={cleanupProgress}
                          isWakeLockActive={isWakeLockActive}
                        />
                      )}

                      {error && (
                        <div className="mb-2" data-testid="receive-error-banner">
                          <ErrorDisplay
                            error={getErrorInfo(parseError(error))}
                            onDismiss={() => resetReceive()}
                          />
                        </div>
                      )}

                      {transferState.status === "cancelled" && (
                        <div className="rounded-xl bg-surface p-4 border-l-4 border-gray-500 flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div className="rounded-md bg-white/5 p-2">
                                <span className="material-symbols-outlined text-gray-400">
                                  cancel
                                </span>
                              </div>
                              <div>
                                <p className="font-bold text-sm text-gray-300">
                                  Transfer Cancelled
                                </p>
                                <p className="text-xs text-white/50 font-mono">
                                  {receivedFile ? formatFileSize(receivedFile.size) : "—"} •
                                  Cancelled
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
                    </article>
                  </section>
                </div>

                <section
                  data-testid="receive-connection-details"
                  className="rounded-xl border border-white/10 bg-black/20 p-4 md:p-6"
                >
                  <details>
                    <summary className="cursor-pointer list-none flex items-center justify-between text-xs md:text-sm font-bold uppercase tracking-[0.12em] text-gray-300">
                      <span>Connection Details</span>
                      <span className="material-symbols-outlined text-base">expand_more</span>
                    </summary>
                    <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-6">
                      <RadarVisualizer
                        status={transferState.status}
                        isPeerReady={!!myPeerId}
                        className="min-h-[240px] rounded-lg border border-white/10 bg-black/20"
                      />

                      <TerminalLog logs={logs} className="min-h-[280px]" defaultCollapsed={true} />
                    </div>
                  </details>
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
        senderPeerId={pendingOffer?.connection?.peer}
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
        onSendMessage={(text) =>
          chat.sendMessage(
            text,
            activeConnectionRef.current,
            "",
            profile?.display_name || "Receiver",
            myPeerId
          )
        }
        currentUserId={user?.id || "receiver"}
        peerId={activeConnectionRef.current?.peer || "sender"}
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

      <QRCodeModal
        isOpen={showMyQRModal}
        peerId={myPeerId}
        onClose={() => setShowMyQRModal(false)}
      />
    </div>
  );
}
