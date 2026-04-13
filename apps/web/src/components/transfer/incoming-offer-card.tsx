"use client";

import { formatFileSize } from "@repo/utils";
import type { PendingOffer } from "@/lib/hooks/use-receive-transfer";
import { getFileType, getFileIcon } from "@/lib/utils/file-preview";

interface IncomingOfferCardProps {
  pendingOffer: PendingOffer;
}

function getFileTypeFromName(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const mimeMap: Record<string, string> = {
    // Images
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    // Videos
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    // Audio
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    // Documents
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    txt: "text/plain",
    // Archives
    zip: "application/zip",
    rar: "application/x-rar-compressed",
    "7z": "application/x-7z-compressed",
    tar: "application/x-tar",
    gz: "application/gzip",
    // Code
    js: "application/javascript",
    json: "application/json",
    html: "text/html",
    css: "text/css",
    xml: "application/xml",
  };
  return mimeMap[ext] || "application/octet-stream";
}

export default function IncomingOfferCard({ pendingOffer }: IncomingOfferCardProps) {
  const mimeType = pendingOffer.fileType || getFileTypeFromName(pendingOffer.filename);
  const fileType = getFileType(mimeType);
  const icon = getFileIcon(fileType);
  const senderPeerId = pendingOffer.connection?.peer || "Unknown";
  const senderFingerprint = `${senderPeerId.slice(0, 6)}...${senderPeerId.slice(-4)}`;

  return (
    <div className="bg-surface p-6 border-l-4 border-bauhaus-blue flex flex-col gap-4 shadow-[0_0_30px_-10px_rgba(46,149,255,0.2)]">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div className="bg-bauhaus-blue/10 p-3 border border-bauhaus-blue/20 flex items-center justify-center w-16 h-16">
            <span className="material-symbols-outlined text-bauhaus-blue text-3xl">{icon}</span>
          </div>
          <div>
            <p className="font-black text-lg uppercase tracking-tight text-white mb-1">
              Incoming File Request
            </p>
            <p className="font-bold text-sm text-gray-300">{pendingOffer.filename}</p>
            <p className="text-xs text-white/50 font-mono mt-1">
              {formatFileSize(pendingOffer.fileSize)} •{" "}
              <span className="text-bauhaus-blue">SECURE LINK</span>
            </p>
            <p className="text-xs text-gray-400 font-mono mt-1">Sender: {senderFingerprint}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs font-bold bg-bauhaus-blue/20 text-bauhaus-blue px-2 py-1 uppercase tracking-wider border border-bauhaus-blue/30">
            Action Required
          </span>
        </div>
      </div>
    </div>
  );
}
