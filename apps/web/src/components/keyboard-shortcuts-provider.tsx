"use client";

import { useState, useEffect } from "react";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import KeyboardShortcutsModal from "@/components/keyboard-shortcuts-modal";

export function KeyboardShortcutsProvider() {
  const [showHelp, setShowHelp] = useState(false);

  useKeyboardShortcuts(() => setShowHelp(true));

  // Listen for custom event from header button
  useEffect(() => {
    const handleShowShortcuts = () => setShowHelp(true);
    window.addEventListener("show-keyboard-shortcuts", handleShowShortcuts);
    return () => window.removeEventListener("show-keyboard-shortcuts", handleShowShortcuts);
  }, []);

  return <KeyboardShortcutsModal isOpen={showHelp} onClose={() => setShowHelp(false)} />;
}
