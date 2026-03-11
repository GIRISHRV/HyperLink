"use client";

import { useState } from "react";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import KeyboardShortcutsModal from "@/components/keyboard-shortcuts-modal";

export function KeyboardShortcutsProvider() {
  const [showHelp, setShowHelp] = useState(false);

  useKeyboardShortcuts(() => setShowHelp(true));

  return <KeyboardShortcutsModal isOpen={showHelp} onClose={() => setShowHelp(false)} />;
}
