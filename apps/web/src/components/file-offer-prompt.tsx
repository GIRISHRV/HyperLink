"use client";

import { formatFileSize } from "@repo/utils";

interface FileOfferPromptProps {
  isOpen: boolean;
  filename: string;
  fileSize: number;
  fileType: string;
  onAccept: () => void;
  onReject: () => void;
}

export default function FileOfferPrompt({
  isOpen,
  filename,
  fileSize,
  fileType,
  onAccept,
  onReject,
}: FileOfferPromptProps) {
  if (!isOpen) return null;

  const extension = filename.split(".").pop()?.toUpperCase() || "FILE";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-bauhaus-blue via-primary to-bauhaus-red" />

        {/* Content */}
        <div className="p-6 flex flex-col items-center text-center gap-5">
          {/* File icon */}
          <div className="relative">
            <div className="w-20 h-20 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30">
              <span className="material-symbols-outlined text-4xl text-primary">
                description
              </span>
            </div>
            {/* Incoming badge */}
            <div className="absolute -top-2 -right-2 w-7 h-7 bg-bauhaus-blue rounded-full flex items-center justify-center border-2 border-[#1a1a1a]">
              <span className="material-symbols-outlined text-white text-sm">
                arrow_downward
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white">
              Incoming File
            </h3>
            <p className="text-gray-400 text-sm">
              Someone wants to send you a file
            </p>
          </div>

          {/* File details */}
          <div className="w-full bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white text-black flex items-center justify-center font-bold text-xs relative shrink-0">
                {extension}
                <div className="absolute top-0 right-0 w-0 h-0 border-l-[8px] border-l-transparent border-t-[8px] border-t-[#1a1a1a]"></div>
              </div>
              <div className="text-left min-w-0">
                <p className="text-white font-bold truncate text-sm">{filename}</p>
                <p className="text-gray-500 text-xs font-mono">{fileType || "Unknown type"}</p>
              </div>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-white/5">
              <span className="text-xs text-gray-500 uppercase tracking-wider">Size</span>
              <span className="text-sm font-mono text-primary font-bold">{formatFileSize(fileSize)}</span>
            </div>
          </div>

          <p className="text-gray-500 text-xs leading-relaxed">
            The file will be transferred directly peer-to-peer. No data is stored on any server.
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-black/30 flex gap-3">
          <button
            onClick={onReject}
            className="flex-1 h-11 bg-white/10 hover:bg-white/20 text-white rounded font-bold text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">close</span>
            Decline
          </button>
          <button
            onClick={onAccept}
            className="flex-1 h-11 bg-primary hover:bg-white text-black rounded font-bold text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">download</span>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
