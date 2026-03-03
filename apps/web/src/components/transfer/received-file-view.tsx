"use client";

import Image from "next/image";
import { formatFileSize } from "@repo/utils";

interface ReceivedFileViewProps {
  receivedFile: { name: string; size: number; blob?: Blob };
  onDownload: () => void;
  onShare: () => void;
  showShareFallback: boolean;
  onTextShareFallback: () => void;
  onReset: () => void;
}

export default function ReceivedFileView({
  receivedFile,
  onDownload,
  onShare,
  showShareFallback,
  onTextShareFallback,
  onReset,
}: ReceivedFileViewProps) {
  return (
    <div className="bg-black/60 backdrop-blur-xl p-6 border border-primary/20 shadow-[0_0_50px_-20px_rgba(var(--primary-rgb),0.2)] flex flex-col gap-6 animate-in zoom-in-95 fade-in duration-500 rounded-sm relative overflow-hidden group">
      {/* Holographic Scanline */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(255,255,255,0.03)_50%,transparent_100%)] h-[200%] w-full animate-[scan_4s_linear_infinite] pointer-events-none" />

      <div className="flex justify-between items-start z-10">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-full border border-primary/20">
            <span className="material-symbols-outlined text-primary text-2xl">
              verified
            </span>
          </div>
          <div>
            <p className="font-bold text-lg text-white tracking-tight">
              {receivedFile.name}
            </p>
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
            <div className="relative w-full h-[320px]">
              <Image
                src={URL.createObjectURL(receivedFile.blob)}
                alt="Preview"
                fill
                className="object-contain rounded-sm z-10 transition-transform duration-500 hover:scale-[1.02]"
                unoptimized
              />
            </div>
          ) : /* Video Preview */
          /\.(mp4|webm|ogg)$/i.test(receivedFile.name) ? (
            <video
              src={URL.createObjectURL(receivedFile.blob)}
              controls
              className="max-h-80 w-full rounded-sm relative z-10"
            />
          ) : /* PDF Preview */
          /\.pdf$/i.test(receivedFile.name) ? (
            <div
              className="w-full h-80 bg-surface rounded-sm overflow-hidden relative group cursor-pointer border border-white/5 hover:border-primary/30 transition-colors"
              onClick={onDownload}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 group-hover:text-primary transition-colors z-10">
                <span className="material-symbols-outlined text-7xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  picture_as_pdf
                </span>
                <span className="text-sm font-mono mt-2 uppercase tracking-widest text-white/50 group-hover:text-primary">
                  PDF Document
                </span>
                <span className="text-[10px] mt-2 bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                  Click to Open
                </span>
              </div>
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
            </div>
          ) : (
            /* Generic File Icon */
            <div className="h-40 w-full flex flex-col items-center justify-center text-gray-500 relative z-10">
              <span className="material-symbols-outlined text-6xl opacity-50">
                draft
              </span>
              <span className="text-xs font-mono mt-4 uppercase tracking-widest opacity-40">
                Preview not available
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onDownload}
          className="flex-1 h-14 bg-primary hover:bg-primary-hover text-black text-sm font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.6)] z-10"
        >
          <span className="material-symbols-outlined !text-[20px]">
            download
          </span>
          Save
        </button>

        {"share" in navigator && (
          <div className="flex flex-col gap-2">
            <button
              onClick={onShare}
              className={`h-14 px-6 border transition-all active:scale-[0.95] flex items-center justify-center z-10 ${
                showShareFallback
                  ? "bg-surface border-white/10 text-white/50"
                  : "bg-[#2d2b1f] border-primary/30 text-primary hover:bg-primary/10"
              }`}
              title="Share Locally"
            >
              <span className="material-symbols-outlined">share</span>
            </button>

            {showShareFallback && (
              <button
                onClick={onTextShareFallback}
                className="h-10 px-4 bg-primary/20 border border-primary/40 text-primary text-[10px] font-bold uppercase tracking-wider animate-in fade-in slide-in-from-top-2"
              >
                Share as Link
              </button>
            )}
          </div>
        )}
      </div>

      <button
        onClick={onReset}
        className="w-full h-12 bg-surface border border-white/10 hover:bg-white/5 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors mt-2"
      >
        <span className="material-symbols-outlined !text-[18px]">
          refresh
        </span>
        Receive Another File
      </button>
    </div>
  );
}
