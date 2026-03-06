"use client";

import { useEffect, useRef } from "react";

interface TerminalLogProps {
  logs: string[];
  className?: string;
}

export default function TerminalLog({ logs, className = "" }: TerminalLogProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className={`mt-auto w-full border border-white/5 bg-surface-deep/50 rounded-sm overflow-hidden flex flex-col ${className}`}>
      <div className="bg-white/5 px-4 py-2 border-b border-white/5 flex items-center gap-2 flex-shrink-0">
        <span className="w-2 h-2 rounded-full bg-red-500/50"></span>
        <span className="w-2 h-2 rounded-full bg-yellow-500/50"></span>
        <span className="w-2 h-2 rounded-full bg-green-500/50"></span>
        <span className="ml-2 text-[10px] font-mono text-white/30 uppercase tracking-widest">sys_out</span>
      </div>
      <div
        ref={containerRef}
        className="p-4 font-mono text-xs text-white/50 flex-1 min-h-0 overflow-y-auto scroll-smooth custom-scrollbar"
      >
        <div className="flex flex-col gap-1">
          {logs.map((log, i) => (
            <div key={i} className="flex gap-2 animate-[reveal-simple_0.2s_ease-out_forwards]">
              <span className="text-primary font-bold opacity-80">&gt;</span>
              <span className="break-words">{log}</span>
            </div>
          ))}
          <div className="flex gap-2 mt-1">
            <span className="text-primary font-bold opacity-50">&gt;</span>
            <span className="inline-block w-2.5 h-3.5 bg-primary/70 animate-pulse"></span>
          </div>
        </div>
      </div>
    </div>
  );
}
