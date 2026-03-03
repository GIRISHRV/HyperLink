"use client";

import { formatFileSize } from "@repo/utils";
import type { PendingOffer } from "@/lib/hooks/use-receive-transfer";

interface IncomingOfferCardProps {
  pendingOffer: PendingOffer;
}

export default function IncomingOfferCard({
  pendingOffer,
}: IncomingOfferCardProps) {
  return (
    <div className="bg-surface p-6 border-l-4 border-bauhaus-blue flex flex-col gap-4 shadow-[0_0_30px_-10px_rgba(46,149,255,0.2)]">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div className="bg-bauhaus-blue/10 p-3 border border-bauhaus-blue/20">
            <span className="material-symbols-outlined text-bauhaus-blue text-2xl animate-bounce">
              mark_email_unread
            </span>
          </div>
          <div>
            <p className="font-black text-lg uppercase tracking-tight text-white mb-1">
              Incoming Transmission
            </p>
            <p className="font-bold text-sm text-gray-300">
              {pendingOffer.filename}
            </p>
            <p className="text-xs text-white/50 font-mono mt-1">
              {formatFileSize(pendingOffer.fileSize)} •{" "}
              <span className="text-bauhaus-blue">SECURE LINK</span>
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] font-bold bg-bauhaus-blue/20 text-bauhaus-blue px-2 py-1 uppercase tracking-wider border border-bauhaus-blue/30">
            Action Required
          </span>
        </div>
      </div>
    </div>
  );
}
