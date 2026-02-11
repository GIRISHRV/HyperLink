import { useEffect } from "react";
import { logger } from "@repo/utils";

/**
 * Hook to listen for file paste events on the window
 * @param onFilePasted Callback when a valid file is pasted
 */
export function useClipboardFile(onFilePasted: (file: File) => void) {
    useEffect(() => {
        const handlePaste = (event: ClipboardEvent) => {
            // Don't intercept if user is typing in an input/textarea
            if (
                event.target instanceof HTMLInputElement ||
                event.target instanceof HTMLTextAreaElement ||
                (event.target as HTMLElement).isContentEditable
            ) {
                return;
            }

            const items = event.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                if (items[i].kind === "file") {
                    const file = items[i].getAsFile();
                    if (file) {
                        logger.info({ name: file.name, type: file.type, size: file.size }, "[CLIPBOARD] File detected");
                        onFilePasted(file);
                        event.preventDefault(); // successful paste
                        return;
                    }
                }
            }
        };

        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    }, [onFilePasted]);
}
