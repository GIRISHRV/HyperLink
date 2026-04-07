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

      const isMac = navigator.userAgent.toUpperCase().indexOf("MAC") >= 0;
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl/Cmd + Shift + F1 - New transfer (F-keys avoid all browser conflicts)
      if (ctrlOrCmd && e.shiftKey && e.key === "F1") {
        e.preventDefault();
        router.push("/send");
        return;
      }

      // Ctrl/Cmd + Shift + F2 - Receive files
      if (ctrlOrCmd && e.shiftKey && e.key === "F2") {
        e.preventDefault();
        router.push("/receive");
        return;
      }

      // Ctrl/Cmd + Shift + F3 - History
      if (ctrlOrCmd && e.shiftKey && e.key === "F3") {
        e.preventDefault();
        router.push("/history");
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
    key: "Shift+F1",
    ctrlOrCmd: true,
    action: () => {},
    description: "New Transfer",
  },
  {
    key: "Shift+F2",
    ctrlOrCmd: true,
    action: () => {},
    description: "Receive Files",
  },
  {
    key: "Shift+F3",
    ctrlOrCmd: true,
    action: () => {},
    description: "View History",
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
