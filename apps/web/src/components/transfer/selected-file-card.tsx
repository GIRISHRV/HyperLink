"use client";

import { formatFileSize } from "@repo/utils";
import { useEffect, useState } from "react";
import Image from "next/image";
import { getFileType, getFileIcon, generateImageThumbnail } from "@/lib/utils/file-preview";

interface SelectedFileCardProps {
  file: File;
  onRemove: () => void;
}

export default function SelectedFileCard({ file, onRemove }: SelectedFileCardProps) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const fileType = getFileType(file.type);
  const icon = getFileIcon(fileType);

  useEffect(() => {
    // Reset thumbnail when file changes
    setThumbnail(null);

    if (fileType === "image") {
      generateImageThumbnail(file).then(setThumbnail);
    }
  }, [file, fileType]);

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-5 h-full">
      <h3 className="font-mono text-muted text-[11px] mb-4 uppercase tracking-[0.2em]">
        Selected Payload
      </h3>
      <div className="rounded-lg border border-white/10 bg-black/30 p-5 md:p-6 min-h-[220px] h-full flex gap-5">
        <div className="w-28 h-28 rounded-lg bg-surface-inset flex items-center justify-center shrink-0 border border-subtle-bauhaus overflow-hidden">
          {thumbnail ? (
            <Image
              src={thumbnail}
              alt={file.name}
              width={128}
              height={128}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="material-symbols-outlined text-white/50" style={{ fontSize: "48px" }}>
              {icon}
            </span>
          )}
        </div>
        <div className="flex flex-col justify-between flex-1 py-1 min-w-0">
          <div>
            <h4 className="text-white text-lg md:text-xl font-bold leading-tight mb-2 break-all line-clamp-3">
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
            className="self-start rounded-md px-2 py-1 text-bauhaus-red hover:bg-bauhaus-red/10 hover:text-red-300 font-bold text-xs uppercase tracking-[0.12em] flex items-center gap-2 mt-4 transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              delete
            </span>
            Remove File
          </button>
        </div>
      </div>
    </div>
  );
}
