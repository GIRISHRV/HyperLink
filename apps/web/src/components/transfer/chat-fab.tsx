"use client";

interface ChatFABProps {
  hasUnread: boolean;
  onClick: () => void;
}

export default function ChatFAB({ hasUnread, onClick }: ChatFABProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 bg-primary text-black p-4 rounded-full shadow-xl hover:scale-110 transition-transform flex items-center justify-center border-2 border-background-dark"
    >
      <span className="material-symbols-outlined text-2xl">forum</span>
      {hasUnread && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-xs text-white font-bold items-center justify-center">
            !
          </span>
        </span>
      )}
    </button>
  );
}
