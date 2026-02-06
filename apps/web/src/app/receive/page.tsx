"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/services/auth-service";
import { createTransfer, updateTransferStatus } from "@/lib/services/transfer-service";
import { PeerManager } from "@/lib/webrtc/peer-manager";
import { FileReceiver } from "@/lib/transfer/receiver";
import type { PeerConfig, PeerMessage, TransferProgress } from "@repo/types";
import { formatFileSize } from "@repo/utils";
import SimpleHeader from "@/components/simple-header";

export default function ReceivePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [myPeerId, setMyPeerId] = useState("");
  const [status, setStatus] = useState<"idle" | "connecting" | "receiving" | "complete" | "error">(
    "idle"
  );
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<TransferProgress | null>(null);
  const [receivedFile, setReceivedFile] = useState<{
    name: string;
    size: number;
    blob?: Blob;
  } | null>(null);
  const [transferId, setTransferId] = useState<string | null>(null);

  const peerManagerRef = useRef<PeerManager | null>(null);
  const fileReceiverRef = useRef<FileReceiver | null>(null);

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

      peerManagerRef.current.on("incoming-connection", async (connection: any) => {
        setStatus("connecting");

        connection.on("data", async (data: any) => {
          const message = data as PeerMessage;

          if (message.type === "offer") {
            const transferData = message.payload as any;

            const transfer = await createTransfer({
              filename: transferData.filename,
              fileSize: transferData.fileSize,
            });

            if (!transfer) {
              setError("Failed to create transfer record");
              return;
            }

            setTransferId(transfer.id);
            setReceivedFile({ name: transferData.filename, size: transferData.fileSize });

            await updateTransferStatus(transfer.id, "transferring");
            setStatus("receiving");

            fileReceiverRef.current = new FileReceiver();
            fileReceiverRef.current.onProgress((progressData) => {
              setProgress(progressData);
            });

            fileReceiverRef.current.onComplete((blob) => {
              setReceivedFile({ name: transferData.filename, size: transferData.fileSize, blob });
              updateTransferStatus(transfer.id, "complete");
              setStatus("complete");
            });

            fileReceiverRef.current.handleOffer(message as any);
          } else if (message.type === "chunk") {
            if (fileReceiverRef.current) {
              await fileReceiverRef.current.handleChunk(message as any);
            }
          }
        });

        connection.on("error", (err: any) => {
          setError(`Connection error: ${err}`);
          setStatus("error");

          if (transferId) {
            updateTransferStatus(transferId, "failed");
          }
        });
      });
    } catch (err: any) {
      setError(`Failed to initialize: ${err.message}`);
    }
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

  function copyPeerId() {
    navigator.clipboard.writeText(myPeerId);
  }

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display min-h-screen flex flex-col overflow-x-hidden selection:bg-primary selection:text-black">
      <SimpleHeader userEmail={user?.email} />

      {/* Main Content */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-start mt-6 lg:mt-12">
        {/* Left Column: ID & Status */}
        <section className="lg:col-span-5 flex flex-col gap-8">
          {/* Receive Header */}
          <div className="space-y-2">
            <div className="w-12 h-1 bg-primary mb-4"></div>
            <h2 className="text-5xl md:text-6xl font-bold uppercase tracking-tighter leading-[0.9]">
              Receive
              <br />
              Mode
            </h2>
            <p className="text-white/60 text-lg max-w-md">
              Share your unique Peer ID to establish a secure P2P connection.
            </p>
          </div>

          {/* Peer ID Card */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-bauhaus-red opacity-20 group-hover:opacity-40 blur transition duration-500"></div>
            <div className="relative bg-[#1a1a1a] border border-white/10 p-6 rounded-sm flex flex-col gap-4">
              <label className="text-xs font-bold uppercase tracking-widest text-primary">
                Your Peer ID
              </label>
              <div className="flex items-stretch gap-3">
                <div className="flex-1 bg-black border border-white/20 px-4 py-3 flex items-center">
                  <span className="font-mono text-xl md:text-2xl tracking-widest text-white">
                    {myPeerId ? myPeerId.slice(0, 12) : "Loading..."}
                  </span>
                </div>
                <button
                  onClick={copyPeerId}
                  className="bg-primary hover:bg-white text-black w-[54px] flex items-center justify-center transition-colors rounded-sm"
                  title="Copy ID"
                >
                  <span className="material-symbols-outlined !text-[24px]">content_copy</span>
                </button>
              </div>
            </div>
          </div>

          {/* Active / Recent Transfers List */}
          <div className="flex flex-col gap-4 mt-8">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white/50 border-b border-white/10 pb-2">
              Incoming Queue
            </h3>

            {status === "receiving" && receivedFile && progress && (
              <div className="bg-[#1a1a1a] p-4 border-l-4 border-bauhaus-red flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/5 p-2 rounded-sm">
                      <span className="material-symbols-outlined text-bauhaus-red">folder_zip</span>
                    </div>
                    <div>
                      <p className="font-bold text-sm">{receivedFile.name}</p>
                      <p className="text-xs text-white/50 font-mono">
                        {formatFileSize(receivedFile.size)} • Peer: connected
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-bauhaus-red animate-pulse">
                    RECEIVING
                  </span>
                </div>

                {/* Bauhaus Progress Bar */}
                <div className="w-full h-3 bg-black border border-white/10 relative overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-bauhaus-red"
                    style={{ width: `${progress.percentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] font-mono uppercase text-white/40">
                  <span>
                    {formatFileSize(progress.bytesTransferred)} /{" "}
                    {formatFileSize(receivedFile.size)}
                  </span>
                  <span>{progress.percentage.toFixed(0)}%</span>
                </div>
              </div>
            )}

            {status === "complete" && receivedFile && (
              <div className="bg-[#1a1a1a] p-4 border-l-4 border-primary flex flex-col gap-4 group">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/5 p-2 rounded-sm">
                      <span className="material-symbols-outlined text-primary">movie</span>
                    </div>
                    <div>
                      <p className="font-bold text-sm">{receivedFile.name}</p>
                      <p className="text-xs text-white/50 font-mono">
                        {formatFileSize(receivedFile.size)} • Completed
                      </p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-primary">check_circle</span>
                </div>
                <button
                  onClick={handleDownload}
                  className="w-full h-10 bg-primary hover:bg-white text-black text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all rounded-sm"
                >
                  <span className="material-symbols-outlined !text-[18px]">download</span>
                  Download to Disk
                </button>
              </div>
            )}

            {status === "idle" && (
              <div className="text-center py-8 text-gray-500">
                <span className="material-symbols-outlined text-5xl opacity-20">download</span>
                <p className="mt-4 text-sm">Waiting for incoming connection...</p>
              </div>
            )}

            {error && (
              <div className="bg-bauhaus-red/10 border border-bauhaus-red/30 p-4 rounded-sm">
                <p className="text-bauhaus-red text-sm">{error}</p>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Visualizer */}
        <section className="lg:col-span-7 flex flex-col h-full min-h-[500px] relative">
          {/* Main Visual Container */}
          <div className="bg-[#0a0a0a] border border-white/5 w-full h-full flex flex-col items-center justify-center relative overflow-hidden rounded-sm p-10">
            {/* Background Grid */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  "linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            ></div>

            {/* Geometric Composition / Animation */}
            <div className="relative z-10 size-[300px] md:size-[400px] flex items-center justify-center">
              {/* Outer Ring */}
              <div className="absolute inset-0 border border-white/10 rounded-full animate-[spin_20s_linear_infinite]"></div>

              {/* Bauhaus Shapes Animation */}
              <div className="absolute inset-4 border-[20px] border-t-bauhaus-red border-r-primary border-b-transparent border-l-transparent rounded-full animate-spin-slow opacity-80"></div>

              {/* Middle Pulse */}
              <div className="absolute size-48 bg-white/5 rounded-full animate-pulse-slow backdrop-blur-sm border border-white/10"></div>

              {/* Center Core */}
              <div className="absolute size-24 bg-primary rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(255,217,0,0.3)]">
                <span className="material-symbols-outlined text-black !text-[40px] animate-pulse">
                  leak_add
                </span>
              </div>

              {/* Floating Orbiting Square */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 size-4 bg-bauhaus-blue animate-bounce"></div>
            </div>

            {/* Status Text */}
            <div className="mt-12 text-center z-20 space-y-2">
              {status === "idle" && (
                <>
                  <p className="text-xl font-bold uppercase tracking-widest animate-pulse text-white">
                    Waiting for connection...
                  </p>
                  <p className="text-sm font-mono text-white/40">
                    Port 8080 open • Listening on local network
                  </p>
                </>
              )}

              {status === "receiving" && (
                <>
                  <p className="text-xl font-bold uppercase tracking-widest text-bauhaus-red">
                    Receiving Data...
                  </p>
                  <p className="text-sm font-mono text-white/40">
                    {progress?.percentage.toFixed(0)}% complete
                  </p>
                </>
              )}

              {status === "complete" && (
                <>
                  <p className="text-xl font-bold uppercase tracking-widest text-primary">
                    Transfer Complete!
                  </p>
                  <p className="text-sm font-mono text-white/40">File ready for download</p>
                </>
              )}
            </div>

            {/* Decorative Corner Elements */}
            <div className="absolute top-4 left-4 size-3 border-t-2 border-l-2 border-primary"></div>
            <div className="absolute top-4 right-4 size-3 border-t-2 border-r-2 border-primary"></div>
            <div className="absolute bottom-4 left-4 size-3 border-b-2 border-l-2 border-primary"></div>
            <div className="absolute bottom-4 right-4 size-3 border-b-2 border-r-2 border-primary"></div>
          </div>
        </section>
      </main>

      {/* Footer / Info */}
      <footer className="max-w-[1400px] mx-auto w-full px-6 py-6 border-t border-white/5 text-white/30 text-xs font-mono flex justify-between uppercase">
        <span>HyperLink v2.0 // Bauhaus Edition</span>
        <span>Secure P2P Protocol</span>
      </footer>
    </div>
  );
}
