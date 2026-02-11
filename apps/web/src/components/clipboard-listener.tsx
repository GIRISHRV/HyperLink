"use client";

import { useClipboardFile } from "@/lib/hooks/use-clipboard-file";
import { useRouter, usePathname } from "next/navigation";
import { logger } from "@repo/utils";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

export function ClipboardListener() {
    const router = useRouter();
    const pathname = usePathname();
    const [showToast, setShowToast] = useState(false);
    const [pastedFile, setPastedFile] = useState<File | null>(null);

    // Auto-hide toast after 5 seconds
    useEffect(() => {
        if (showToast) {
            const timer = setTimeout(() => {
                setShowToast(false);
                setPastedFile(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [showToast]);

    useClipboardFile((file) => {
        // If we are already on the send page, let the page handle it
        if (pathname === "/send") return;

        logger.info({ name: file.name }, "[CLIPBOARD-LISTENER] File pasted globally, showing toast");
        setPastedFile(file);
        setShowToast(true);
    });

    const handleSendNow = () => {
        if (!pastedFile) return;
        router.push("/send");
        setShowToast(false);
    };

    if (!showToast || !pastedFile) return null;

    // Ideally createPortal needs document body which is available on client
    if (typeof document === "undefined") return null;

    return createPortal(
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="bg-[#1a1a1a] border border-primary/20 shadow-2xl rounded-sm p-4 flex items-center gap-4 min-w-[350px]">
                <div className="bg-primary/20 p-2 rounded-full text-primary">
                    <span className="material-symbols-outlined">content_paste</span>
                </div>
                <div className="flex-1">
                    <p className="text-white font-bold text-sm uppercase tracking-wide">Clipboard Detected</p>
                    <p className="text-gray-400 text-xs truncate max-w-[200px] mt-0.5 font-mono">{pastedFile.name}</p>
                </div>
                <button
                    onClick={handleSendNow}
                    className="bg-primary hover:bg-yellow-400 text-black text-xs font-bold uppercase py-2 px-4 rounded-sm transition-colors active:scale-95"
                >
                    Go to Send
                </button>
                <button
                    onClick={() => setShowToast(false)}
                    className="text-gray-500 hover:text-white transition-colors"
                >
                    <span className="material-symbols-outlined text-sm">close</span>
                </button>
            </div>
        </div>,
        document.body
    );
}
