"use client";

import { useEffect, useRef, useState } from "react";

interface TerminalLogProps {
  logs: string[];
  className?: string;
  defaultCollapsed?: boolean;
}

export default function TerminalLog({
  logs,
  className = "",
  defaultCollapsed = false,
}: TerminalLogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const hasErrorLog = logs.some((log) => /\[err\]|error|failed|cancelled/i.test(log));

  useEffect(() => {
    if (hasErrorLog) {
      setCollapsed(false);
    }
  }, [hasErrorLog, setCollapsed]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (!collapsed && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, collapsed]);

  return (
    <div
      className={`w-full border border-white/5 bg-surface-deep/50 rounded-sm overflow-hidden flex flex-col ${className}`}
    >
      <div className="bg-white/5 px-4 py-2 border-b border-white/5 flex items-center gap-2 flex-shrink-0">
        <span className="w-2 h-2 rounded-full bg-red-500/50"></span>
        <span className="w-2 h-2 rounded-full bg-yellow-500/50"></span>
        <span className="w-2 h-2 rounded-full bg-green-500/50"></span>
        <span className="ml-2 text-[10px] font-mono text-white/30 uppercase tracking-widest">
          transfer_log
        </span>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto text-[10px] font-mono text-white/40 hover:text-white/70 uppercase tracking-widest transition-colors"
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Show technical log" : "Hide technical log"}
        >
          {collapsed ? "Show technical log" : "Hide technical log"}
        </button>
      </div>
      {collapsed ? (
        <div className="px-4 py-3 text-xs font-mono text-white/40 border-t border-white/5">
          {logs.length > 0 ? logs[logs.length - 1] : "No transfer events yet."}
        </div>
      ) : (
        <div
          ref={containerRef}
          className="p-4 font-mono text-xs leading-5 text-white/50 flex-1 overflow-y-auto scroll-smooth terminal-scrollbar"
          style={{ maxHeight: "24rem" }}
        >
          <div className="flex flex-col gap-1 min-h-full">
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
      )}
      <style jsx>{`
        .terminal-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .terminal-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .terminal-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .terminal-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
