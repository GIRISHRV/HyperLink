"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/services/auth-service";
import { createTransfer, updateTransferStatus } from "@/lib/services/transfer-service";
import { PeerManager } from "@/lib/webrtc/peer-manager";
import { FileSender } from "@/lib/transfer/sender";
import type { PeerConfig, TransferProgress } from "@repo/types";
import { formatFileSize, formatTime, validateFileSize } from "@repo/utils";
import SimpleHeader from "@/components/simple-header";

export default function SendPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [myPeerId, setMyPeerId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [receiverPeerId, setReceiverPeerId] = useState("");
  const [status, setStatus] = useState<
    "idle" | "connecting" | "transferring" | "complete" | "error"
  >("idle");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<TransferProgress | null>(null);
  const [transferId, setTransferId] = useState<string | null>(null);

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

  async function checkAuthAndInitPeer() {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      router.push("/auth");
      return;
    }

    setUser(currentUser);

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
      setMyPeerId(peerId);
    } catch (err: any) {
      setError(`Failed to connect to signaling server: ${err.message}`);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validation = validateFileSize(selectedFile.size);
    if (!validation.valid) {
      setError(validation.error!);
      return;
    }

    setFile(selectedFile);
    setError("");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;

    const validation = validateFileSize(droppedFile.size);
    if (!validation.valid) {
      setError(validation.error!);
      return;
    }

    setFile(droppedFile);
    setError("");
  }

  async function handleSend() {
    if (!file || !receiverPeerId || !peerManagerRef.current) return;

    setStatus("connecting");
    setError("");

    try {
      const transfer = await createTransfer({
        filename: file.name,
        fileSize: file.size,
      });

      if (!transfer) {
        throw new Error("Failed to create transfer record");
      }

      setTransferId(transfer.id);

      const connection = peerManagerRef.current.connectToPeer(receiverPeerId);

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Connection timeout")), 30000);

        connection.on("open", () => {
          clearTimeout(timeout);
          resolve();
        });

        connection.on("error", (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      await updateTransferStatus(transfer.id, "transferring");
      setStatus("transferring");

      fileSenderRef.current = new FileSender(file, connection);
      await fileSenderRef.current.sendOffer();

      await fileSenderRef.current.startTransfer((progressData) => {
        setProgress(progressData);
      });

      await updateTransferStatus(transfer.id, "complete");
      setStatus("complete");
    } catch (err: any) {
      setError(err.message || "Transfer failed");
      setStatus("error");

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
    fileSenderRef.current = null;
  }

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white min-h-screen flex flex-col selection:bg-primary selection:text-black overflow-x-hidden">
      <SimpleHeader userEmail={user?.email} />

      {/* Main Layout */}
      <main className="flex-grow flex flex-col lg:flex-row relative">
        {/* Decorative Left Sidebar (Bauhaus Geometry) */}
        <aside className="hidden lg:flex w-24 border-r border-white/10 flex-col items-center py-12 gap-12 bauhaus-grid">
          <div className="w-12 h-12 border-2 border-primary rounded-full"></div>
          <div className="w-0.5 h-32 bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
          <div className="w-8 h-8 bg-white rotate-45"></div>
          <div className="flex-grow"></div>
          <p className="text-vertical text-xs font-bold tracking-[0.2em] text-white/30 uppercase rotate-180">
            Secure P2P Protocol v.2.4
          </p>
        </aside>

        {/* Central Interaction Area */}
        <section className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 relative z-10">
          <div className="w-full max-w-3xl flex flex-col gap-10">
            {status === "idle" && (
              <>
                {/* Page Title */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline gap-4">
                    <div className="w-4 h-4 bg-primary"></div>
                    <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none">
                      Initiate <br />
                      <span className="text-white/40">Transfer</span>
                    </h2>
                  </div>
                  <p className="text-white/60 text-lg ml-8 font-light max-w-md">
                    Drag and drop your data packages for secure, decentralized transmission.
                  </p>
                </div>

                {/* Main Drop Zone */}
                <div
                  className="group relative w-full aspect-[16/7] min-h-[300px] border-2 border-dashed border-primary/50 hover:border-primary bg-white/5 hover:bg-white/10 transition-all cursor-pointer flex flex-col items-center justify-center gap-6 overflow-hidden"
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

                  {/* Geometric Upload Icon */}
                  <div className="relative w-24 h-24 flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                    {/* Square */}
                    <div className="absolute inset-0 border-4 border-white rotate-45 group-hover:rotate-90 transition-transform duration-700"></div>
                    {/* Circle */}
                    <div className="absolute inset-4 border-4 border-primary rounded-full opacity-50 group-hover:opacity-100 transition-opacity"></div>
                    {/* Arrow */}
                    <span className="material-symbols-outlined text-5xl text-white relative z-10 group-hover:-translate-y-2 transition-transform">
                      upload_file
                    </span>
                  </div>

                  {file ? (
                    <div className="text-center z-10 space-y-2">
                      <p className="text-xl font-bold uppercase tracking-widest text-primary">
                        {file.name}
                      </p>
                      <p className="text-sm font-mono text-white/50">{formatFileSize(file.size)}</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                        className="mt-2 text-xs text-bauhaus-red hover:text-red-400"
                      >
                        Remove File
                      </button>
                    </div>
                  ) : (
                    <div className="text-center z-10 space-y-2">
                      <p className="text-xl font-bold uppercase tracking-widest text-white group-hover:text-primary transition-colors">
                        Drag Files Here
                      </p>
                      <p className="text-sm font-mono text-white/50">OR CLICK TO BROWSE</p>
                    </div>
                  )}

                  {/* Decorative corner accents */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary"></div>
                </div>

                {/* Input & Action Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
                  {/* Destination Input */}
                  <div className="md:col-span-2 flex flex-col gap-3">
                    <label className="text-xs font-bold tracking-[0.1em] text-primary uppercase flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">hub</span>
                      Destination Peer ID
                    </label>
                    <div className="relative group">
                      <input
                        className="w-full bg-surface-dark border-b-2 border-white/20 focus:border-primary px-0 py-4 text-xl font-mono text-white placeholder-white/20 outline-none transition-colors"
                        placeholder="Enter Receiver Hash..."
                        type="text"
                        value={receiverPeerId}
                        onChange={(e) => setReceiverPeerId(e.target.value)}
                      />
                      <div className="absolute right-0 bottom-4 text-white/30">
                        <span className="material-symbols-outlined animate-pulse">
                          qr_code_scanner
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Send Button */}
                  <button
                    onClick={handleSend}
                    disabled={!file || !receiverPeerId}
                    className="w-full h-16 bg-primary text-black font-black text-xl tracking-widest uppercase hover:bg-white hover:text-black transition-colors flex items-center justify-center gap-2 group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="relative z-10">Send File</span>
                    <span className="material-symbols-outlined relative z-10 group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                    {/* Hover effect fill */}
                    <div className="absolute inset-0 bg-white transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out z-0"></div>
                  </button>
                </div>

                {error && <p className="text-bauhaus-red text-sm">{error}</p>}
              </>
            )}

            {/* Transferring State */}
            {status === "transferring" && file && progress && (
              <div className="border border-white/10 bg-surface-dark p-6 relative overflow-hidden">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    {/* Geometric File Badge */}
                    <div className="w-12 h-12 bg-white text-black flex items-center justify-center font-bold text-xs relative">
                      {file.name.split(".").pop()?.toUpperCase() || "FILE"}
                      <div className="absolute top-0 right-0 w-0 h-0 border-l-[12px] border-l-transparent border-t-[12px] border-t-background-dark"></div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold leading-tight">{file.name}</h3>
                      <p className="text-sm text-white/50 font-mono">
                        {formatFileSize(file.size)} • Secure Transfer
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={resetTransfer}
                    className="text-white/40 hover:text-red-500 transition-colors"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                {/* Bauhaus Progress Bar */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs font-mono text-primary uppercase tracking-wider mb-1">
                    <span>Uploading...</span>
                    <span>{progress.percentage.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-4 bg-white/5 relative">
                    {/* Solid Fill */}
                    <div
                      className="absolute top-0 left-0 h-full bg-primary"
                      style={{ width: `${progress.percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs font-mono text-white/40 mt-1">
                    <span>{formatFileSize(progress.speed)}/s</span>
                    <span>ETA: {formatTime(progress.timeRemaining)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Complete State */}
            {status === "complete" && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl text-white">check</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Transfer Complete!</h3>
                <p className="text-gray-400 mb-6">{file?.name} has been sent successfully</p>
                <button
                  onClick={resetTransfer}
                  className="px-6 py-3 bg-primary hover:bg-white text-black font-semibold transition-colors"
                >
                  Send Another File
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Right Sidebar (Stats / Art) */}
        <aside className="hidden xl:flex w-80 border-l border-white/10 bg-surface-dark/50 p-8 flex-col justify-between">
          <div className="space-y-8">
            <div className="border-b border-white/10 pb-2">
              <h3 className="font-bold text-white uppercase tracking-widest text-sm mb-4">
                Network Stats
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white/5 border border-white/10">
                  <p className="text-xs text-white/40 uppercase">Peers</p>
                  <p className="text-xl font-mono text-primary">128</p>
                </div>
                <div className="p-3 bg-white/5 border border-white/10">
                  <p className="text-xs text-white/40 uppercase">Latency</p>
                  <p className="text-xl font-mono text-green-400">24ms</p>
                </div>
              </div>
            </div>
          </div>

          {/* Abstract Graphic */}
          <div className="relative w-full aspect-square mt-auto opacity-50">
            <div className="absolute bottom-0 right-0 w-2/3 h-2/3 bg-primary rounded-full mix-blend-difference"></div>
            <div className="absolute top-0 left-0 w-2/3 h-2/3 bg-white mix-blend-difference border border-white"></div>
          </div>
        </aside>
      </main>
    </div>
  );
}
