"use client";

interface TerminalLogProps {
  logs: string[];
}

export default function TerminalLog({ logs }: TerminalLogProps) {
  return (
    <div className="mt-auto pt-8">
      <div className="bg-black/40 border-l-2 border-primary p-4 font-mono text-xs text-muted h-64 overflow-y-auto">
        {logs.map((log, i) => (
          <p key={i} className="mb-1">
            <span className="text-primary">&gt;</span> {log}
          </p>
        ))}
        <span className="inline-block w-2 h-4 bg-primary animate-pulse align-middle"></span>
      </div>
    </div>
  );
}
