"use client";

import { type ChangeEvent, type DragEvent, type RefObject, useEffect, useState } from "react";
import { formatFileSize } from "@repo/utils";
import { getFileIcon, getFileType } from "@/lib/utils/file-preview";

interface SendFileWorkspaceProps {
  file: File | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onDrop: (e: DragEvent) => void;
  onFileSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: () => void;
}

export default function SendFileWorkspace({
  file,
  fileInputRef,
  onDrop,
  onFileSelect,
  onRemoveFile,
}: SendFileWorkspaceProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textPreview, setTextPreview] = useState<string | null>(null);

  useEffect(() => {
    setPreviewUrl(null);
    setTextPreview(null);

    if (!file) return;

    if (
      file.type.startsWith("image/") ||
      file.type.startsWith("video/") ||
      file.type.startsWith("audio/")
    ) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      return () => {
        const mediaElements = document.querySelectorAll("video, audio");
        mediaElements.forEach((el) => {
          if ((el as HTMLMediaElement).src === url) {
            (el as HTMLMediaElement).removeAttribute("src");
            (el as HTMLMediaElement).load();
          }
        });
        URL.revokeObjectURL(url);
      };
    }

    if (file.type.startsWith("text/") || file.name.endsWith(".md") || file.name.endsWith(".json")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setTextPreview(text.slice(0, 1000) + (text.length > 1000 ? "..." : ""));
      };
      reader.readAsText(file.slice(0, 2048));
    }
  }, [file]);

  const fileType = file ? getFileType(file.type) : "unknown";
  const fileIcon = getFileIcon(fileType);

  return (
    <section
      data-testid="send-file-workspace"
      className="rounded-xl border border-white/10 bg-black/20 p-5 md:p-6 h-full"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div
          role="button"
          tabIndex={0}
          aria-label="File drop zone. Press Enter or Space to browse files"
          className="group relative min-h-[300px] rounded-lg border border-white/10 bg-black/30 hover:bg-black/40 transition-colors cursor-pointer overflow-hidden flex items-center justify-center"
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          <input
            ref={fileInputRef as RefObject<HTMLInputElement>}
            data-testid="file-input"
            type="file"
            multiple
            onChange={onFileSelect}
            className="hidden"
          />

          <div className="text-center px-6">
            <div className="mx-auto mb-4 size-16 rounded-full border border-primary/30 bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">add_circle</span>
            </div>
            {file ? (
              <>
                <p className="text-xl font-black text-primary uppercase tracking-tight break-words">
                  {file.name}
                </p>
                <p className="text-sm font-mono text-gray-400 mt-2">{formatFileSize(file.size)}</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-black text-white uppercase tracking-tight">
                  Select a File
                </p>
                <p className="font-mono text-xs uppercase tracking-widest text-gray-500 mt-2">
                  Drag and drop here or click to browse
                </p>
              </>
            )}
          </div>

          <div className="absolute inset-3 border border-primary/15 pointer-events-none" />
        </div>

        <div className="rounded-lg border border-white/10 bg-black/30 p-4 min-h-[300px] flex flex-col">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-primary">visibility</span>
              File Preview
            </h3>
            <span className="text-xs font-mono text-primary uppercase">
              {file ? file.type || "UNKNOWN FILE TYPE" : "NO FILE SELECTED"}
            </span>
          </div>

          <div className="flex-1 rounded border border-white/10 bg-black/30 p-2 overflow-hidden flex items-center justify-center">
            {!file ? (
              <div className="text-center text-gray-500 text-xs uppercase tracking-widest">
                Select a file to preview
              </div>
            ) : previewUrl && file.type.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
            ) : previewUrl && file.type.startsWith("video/") ? (
              <video src={previewUrl} className="w-full h-full object-contain" controls />
            ) : previewUrl && file.type.startsWith("audio/") ? (
              <audio src={previewUrl} controls className="w-full" />
            ) : textPreview ? (
              <pre className="w-full h-full p-2 overflow-auto text-[11px] font-mono text-primary/70 whitespace-pre-wrap break-all">
                {textPreview}
              </pre>
            ) : (
              <div className="text-center text-gray-500 text-xs uppercase tracking-widest">
                Preview unavailable for this file type
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-white/10 min-h-[92px] flex items-center">
        {file ? (
          <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0 flex items-center gap-3">
              <div className="size-10 rounded border border-white/10 bg-black/30 flex items-center justify-center text-gray-300">
                <span className="material-symbols-outlined text-lg">{fileIcon}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{file.name}</p>
                <p className="text-xs font-mono text-gray-400">SIZE: {formatFileSize(file.size)}</p>
              </div>
            </div>

            <button
              onClick={onRemoveFile}
              className="self-start sm:self-auto rounded-md px-2 py-1 text-bauhaus-red hover:bg-bauhaus-red/10 hover:text-red-300 font-bold text-xs uppercase tracking-[0.12em] flex items-center gap-2 transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                delete
              </span>
              Remove File
            </button>
          </div>
        ) : (
          <p
            data-testid="send-selected-file-placeholder"
            className="text-xs uppercase tracking-widest text-gray-500"
          >
            No file selected
          </p>
        )}
      </div>
    </section>
  );
}
