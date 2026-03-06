"use client";

import { useEffect, useState } from "react";

interface FilePreviewBoxProps {
  file: File | null;
}

export default function FilePreviewBox({ file }: FilePreviewBoxProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textFilePreview, setTextFilePreview] = useState<string | null>(null);

  useEffect(() => {
    setPreviewUrl(null);
    setTextFilePreview(null);

    if (!file) return;

    if (file.type.startsWith("image/") || file.type.startsWith("video/") || file.type.startsWith("audio/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => {
        // Find existing media elements and clear src to prevent fetch AbortError in console
        const mediaElements = document.querySelectorAll('video, audio');
        mediaElements.forEach((el) => {
          if ((el as HTMLMediaElement).src === url) {
            (el as HTMLMediaElement).removeAttribute('src');
            (el as HTMLMediaElement).load();
          }
        });
        URL.revokeObjectURL(url);
      };
    } else if (file.type.startsWith("text/") || file.name.endsWith(".md") || file.name.endsWith(".json")) {
      // Read a tiny snippet of the text file for preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setTextFilePreview(text.slice(0, 1000) + (text.length > 1000 ? "..." : ""));
      };
      // Read first 2KB for a richer text preview
      reader.readAsText(file.slice(0, 2048));
    }
  }, [file]);

  return (
    <div className="group relative w-full border-[2px] border-white/10 bg-surface-deep/50 backdrop-blur-sm p-6 flex flex-col h-full min-h-[300px] overflow-hidden transition-all duration-500 hover:shadow-[0_0_30px_-10px_rgba(255,234,46,0.1)]">
      {/* Background glow & borders */}
      <div className="absolute inset-0 border-[2px] border-primary/20 group-hover:border-primary/40 transition-colors duration-500 mask-container pointer-events-none"></div>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_center,rgba(255,234,46,0.03)_0%,transparent_70%)] pointer-events-none"></div>

      {/* Header */}
      <div className="flex justify-between items-center mb-4 relative z-10 w-full border-b border-white/10 pb-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <span className="material-symbols-outlined text-sm text-primary">visibility</span>
          Payload Inspection
        </h3>
        <span className="text-xs font-mono text-primary uppercase drop-shadow-[0_0_8px_rgba(255,234,46,0.5)]">
          {file ? (file.type || "BINARY/UNKNOWN") : "AWAITING PAYLOAD"}
        </span>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-black/20 border border-white/5 flex items-center justify-center relative overflow-hidden z-10 p-2 group-hover:border-primary/20 transition-colors duration-500">
        {!file ? (
          <div className="flex flex-col items-center justify-center gap-6 opacity-40 text-center p-6 transition-opacity duration-500 group-hover:opacity-60">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping opacity-20 duration-1000"></div>
              <div className="absolute inset-0 border border-primary/30 rounded-full"></div>
              <span className="material-symbols-outlined text-primary text-5xl drop-shadow-[0_0_15px_rgba(255,234,46,0.5)]">radar</span>
            </div>
            <p className="font-mono text-[10px] uppercase text-center max-w-[200px] text-primary tracking-widest leading-relaxed">
              System on standby.<br />Awaiting file selection.
            </p>
          </div>
        ) : previewUrl && file.type.startsWith("image/") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Preview" className="w-full h-full object-contain drop-shadow-2xl" />
        ) : previewUrl && file.type.startsWith("video/") ? (
          <video src={previewUrl} className="w-full h-full object-contain" controls />
        ) : previewUrl && file.type.startsWith("audio/") ? (
          <div className="flex flex-col items-center justify-center gap-4 w-full p-6">
            <span className="material-symbols-outlined text-primary text-6xl drop-shadow-[0_0_15px_rgba(255,234,46,0.5)]">audio_file</span>
            <audio src={previewUrl} controls className="w-full max-w-sm mt-4 filter invert-[0.85] sepia hue-rotate-180 opacity-80" />
          </div>
        ) : textFilePreview ? (
          <div className="w-full h-full p-4 overflow-auto custom-scrollbar bg-black/40">
            <pre className="text-[10px] md:text-xs font-mono text-primary/70 break-all whitespace-pre-wrap leading-relaxed">
              {textFilePreview}
            </pre>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 opacity-50">
            <span className="material-symbols-outlined text-4xl text-primary">inventory_2</span>
            <p className="font-mono text-xs uppercase text-center max-w-[200px] text-primary">Preview unavailable for this format</p>
          </div>
        )}

        {/* Scanline overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none z-10"></div>
      </div>

      {/* Decorative animated corners like FileDropZone */}
      <div className="absolute top-4 left-4 w-4 h-4 border-l-2 border-t-2 border-white/20 group-hover:border-primary group-hover:w-6 group-hover:h-6 transition-all duration-300 pointer-events-none"></div>
      <div className="absolute top-4 right-4 w-4 h-4 border-r-2 border-t-2 border-white/20 group-hover:border-primary group-hover:w-6 group-hover:h-6 transition-all duration-300 pointer-events-none"></div>
      <div className="absolute bottom-4 left-4 w-4 h-4 border-l-2 border-b-2 border-white/20 group-hover:border-primary group-hover:w-6 group-hover:h-6 transition-all duration-300 pointer-events-none"></div>
      <div className="absolute bottom-4 right-4 w-4 h-4 border-r-2 border-b-2 border-white/20 group-hover:border-primary group-hover:w-6 group-hover:h-6 transition-all duration-300 pointer-events-none"></div>

      {/* Moving scanner line */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(255,255,255,0.02)_50%,transparent_100%)] h-[200%] w-full animate-[scan_6s_linear_infinite] pointer-events-none opacity-0 group-hover:opacity-100 mix-blend-overlay"></div>
    </div>
  );
}
