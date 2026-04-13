"use client";

import { formatFileSize } from "@repo/utils";
import type { RefObject } from "react";

interface FileDropZoneProps {
  file: File | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function FileDropZone({
  file,
  fileInputRef,
  onDrop,
  onFileSelect,
}: FileDropZoneProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="File drop zone. Press Enter or Space to browse files"
      className="group relative w-full h-[320px] md:h-[320px] border border-white/10 bg-black/20 backdrop-blur-sm hover:bg-black/30 focus:-outline-offset-2 focus:ring-2 focus:ring-primary transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-6 overflow-hidden hover:scale-[1.01] active:scale-[0.99] hover:shadow-[0_0_50px_-10px_rgba(255,234,46,0.1)]"
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
      <div className="absolute inset-0 border border-primary/20 group-hover:border-primary/60 transition-colors duration-500 mask-container"></div>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_center,rgba(255,234,46,0.05)_0%,transparent_70%)]"></div>

      <input
        ref={fileInputRef as React.RefObject<HTMLInputElement>}
        data-testid="file-input"
        type="file"
        multiple
        onChange={onFileSelect}
        className="hidden"
      />

      <div className="relative z-10 flex flex-col items-center gap-4 group-hover:-translate-y-2 transition-transform duration-300">
        <div className="relative w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping opacity-20 group-hover:opacity-40 duration-1000"></div>
          <div className="absolute inset-0 border border-primary/30 rounded-full scale-100 group-hover:scale-110 transition-transform duration-500"></div>
          <span className="material-symbols-outlined text-primary text-6xl group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_0_15px_rgba(255,234,46,0.5)]">
            add_circle
          </span>
        </div>

        {file ? (
          <div className="text-center space-y-2">
            <p className="text-xl font-bold uppercase tracking-widest text-primary drop-shadow-md">
              {file.name}
            </p>
            <p className="text-sm font-mono text-white/50">{formatFileSize(file.size)}</p>
          </div>
        ) : (
          <div className="text-center space-y-2">
            <p className="text-2xl font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors">
              Select a File
            </p>
            <p className="font-mono text-muted text-xs uppercase tracking-widest">
              Drag and drop here or click to browse
            </p>
          </div>
        )}
      </div>

      <div className="absolute top-4 left-4 w-4 h-4 border-l-2 border-t-2 border-white/30 group-hover:border-primary group-hover:w-8 group-hover:h-8 transition-all duration-300"></div>
      <div className="absolute top-4 right-4 w-4 h-4 border-r-2 border-t-2 border-white/30 group-hover:border-primary group-hover:w-8 group-hover:h-8 transition-all duration-300"></div>
      <div className="absolute bottom-4 left-4 w-4 h-4 border-l-2 border-b-2 border-white/30 group-hover:border-primary group-hover:w-8 group-hover:h-8 transition-all duration-300"></div>
      <div className="absolute bottom-4 right-4 w-4 h-4 border-r-2 border-b-2 border-white/30 group-hover:border-primary group-hover:w-8 group-hover:h-8 transition-all duration-300"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(255,255,255,0.02)_50%,transparent_100%)] h-[200%] w-full animate-[scan_4s_linear_infinite] pointer-events-none opacity-0 group-hover:opacity-100"></div>
    </div>
  );
}
