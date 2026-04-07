"use client";

import { useModalAccessibility } from "@/lib/hooks/use-modal-accessibility";
import { KEYBOARD_SHORTCUTS } from "@/lib/hooks/use-keyboard-shortcuts";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const { modalRef, handleKeyDown } = useModalAccessibility(isOpen, onClose);

  if (!isOpen) return null;

  const isMac =
    typeof navigator !== "undefined" && navigator.userAgent.toUpperCase().indexOf("MAC") >= 0;
  const modifierKey = isMac ? "⌘" : "Ctrl";

  return (
    <div
      ref={modalRef}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard Shortcuts"
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-subtle-bauhaus max-w-lg w-full p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined text-2xl">close</span>
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-primary text-3xl">keyboard</span>
            <h2 className="text-3xl font-black uppercase tracking-tighter text-white">
              Keyboard <span className="text-primary">Shortcuts</span>
            </h2>
          </div>
          <p className="text-muted text-sm font-mono">
            Navigate faster with these keyboard shortcuts
          </p>
        </div>

        {/* Shortcuts List */}
        <div className="space-y-3">
          {KEYBOARD_SHORTCUTS.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-surface-inset border border-subtle-bauhaus hover:border-primary/30 transition-colors"
            >
              <span className="text-white font-medium text-sm">{shortcut.description}</span>
              <div className="flex items-center gap-1">
                {shortcut.ctrlOrCmd && (
                  <>
                    <kbd className="px-2 py-1 bg-white/10 border border-white/20 text-white font-mono text-xs font-bold rounded-sm">
                      {modifierKey}
                    </kbd>
                    <span className="text-white/50 text-xs">+</span>
                  </>
                )}
                <kbd className="px-2 py-1 bg-white/10 border border-white/20 text-white font-mono text-xs font-bold rounded-sm">
                  {shortcut.key}
                </kbd>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 p-3 bg-bauhaus-blue/10 border border-bauhaus-blue/30">
          <p className="text-xs text-gray-300 flex items-start gap-2">
            <span className="material-symbols-outlined text-bauhaus-blue text-sm shrink-0">
              info
            </span>
            <span>
              Shortcuts work globally except when typing in text fields. Press{" "}
              <kbd className="px-1 py-0.5 bg-white/10 border border-white/20 text-white font-mono text-xs rounded-sm">
                {modifierKey} + /
              </kbd>{" "}
              anytime to view this help.
            </span>
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full mt-6 h-12 bg-primary hover:bg-primary-hover text-black font-bold uppercase tracking-wider transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
