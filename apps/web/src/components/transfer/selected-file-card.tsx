"use client";

import { formatFileSize } from "@repo/utils";

interface SelectedFileCardProps {
  file: File;
  onRemove: () => void;
}

export default function SelectedFileCard({
  file,
  onRemove,
}: SelectedFileCardProps) {
  return (
    <div>
      <h3 className="font-mono text-muted text-sm mb-4 uppercase tracking-widest">
        Selected Payload
      </h3>
      <div className="corner-fold bg-surface-dark p-6 md:p-8 min-h-[200px] flex gap-6 shadow-2xl">
        <div className="w-32 h-32 bg-surface-inset flex items-center justify-center shrink-0 border border-subtle-bauhaus">
          <span
            className="material-symbols-outlined text-white/50"
            style={{ fontSize: "48px" }}
          >
            description
          </span>
        </div>
        <div className="flex flex-col justify-between flex-1 py-1">
          <div>
            <h4 className="text-white text-xl md:text-2xl font-bold leading-tight mb-2">
              {file.name}
            </h4>
            <div className="flex flex-col gap-1 font-mono text-sm text-muted">
              <p>SIZE: {formatFileSize(file.size)}</p>
              <p className="truncate max-w-[300px] md:max-w-md text-xs opacity-50">
                Ready for encrypted transfer
              </p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="self-start text-bauhaus-red hover:text-red-400 font-bold text-sm uppercase tracking-wider flex items-center gap-2 mt-4"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "18px" }}
            >
              delete
            </span>
            Remove File
          </button>
        </div>
      </div>

      <style jsx>{`
        .corner-fold {
          clip-path: polygon(
            0 0,
            calc(100% - 48px) 0,
            100% 48px,
            100% 100%,
            0 100%
          );
          position: relative;
        }
        .corner-fold::after {
          content: "";
          position: absolute;
          top: 0;
          right: 0;
          width: 48px;
          height: 48px;
          background: linear-gradient(
            to bottom left,
            transparent 50%,
            rgba(255, 255, 255, 0.15) 50%,
            rgba(0, 0, 0, 0.3) 100%
          );
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
