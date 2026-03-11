import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface KeyboardShortcut {
  key: string;
  ctrlOrCmd: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(onShowHelp?: () => void) {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs/textareas
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl/Cmd + N - New transfer
      if (ctrlOrCmd && e.key === "n") {
        e.preventDefault();
        router.push("/send");
        return;
      }

      // Ctrl/Cmd + H - History
      if (ctrlOrCmd && e.key === "h") {
        e.preventDefault();
        router.push("/history");
        return;
      }

      // Ctrl/Cmd + R - Receive
      if (ctrlOrCmd && e.key === "r") {
        e.preventDefault();
        router.push("/receive");
        return;
      }

      // Ctrl/Cmd + / - Show shortcuts help
      if (ctrlOrCmd && e.key === "/") {
        e.preventDefault();
        onShowHelp?.();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, onShowHelp]);
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  {
    key: "N",
    ctrlOrCmd: true,
    action: () => {},
    description: "New Transfer",
  },
  {
    key: "H",
    ctrlOrCmd: true,
    action: () => {},
    description: "View History",
  },
  {
    key: "R",
    ctrlOrCmd: true,
    action: () => {},
    description: "Receive Files",
  },
  {
    key: "/",
    ctrlOrCmd: true,
    action: () => {},
    description: "Show Shortcuts",
  },
  {
    key: "Esc",
    ctrlOrCmd: false,
    action: () => {},
    description: "Close Modal",
  },
];
