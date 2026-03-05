"use client";

import { useEffect } from "react";

interface SwUpdateBannerProps {
    onDismiss: () => void;
}

/**
 * A brief "App updated to latest version" confirmation banner shown after a
 * silent service-worker-triggered page reload.
 *
 * Auto-dismisses after 4 seconds. Can also be dismissed manually.
 */
export default function SwUpdateBanner({ onDismiss }: SwUpdateBannerProps) {
    useEffect(() => {
        const timer = setTimeout(onDismiss, 4000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    return (
        <div
            role="status"
            aria-live="polite"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-surface border border-primary/40 shadow-[0_0_20px_rgba(var(--primary-rgb),0.15)] animate-in slide-in-from-bottom-4 fade-in duration-300"
        >
            <span className="material-symbols-outlined text-primary text-xl">
                check_circle
            </span>
            <span className="text-white text-sm font-mono uppercase tracking-wider">
                App updated to latest version
            </span>
            <button
                onClick={onDismiss}
                aria-label="Dismiss update notification"
                className="ml-2 text-muted hover:text-white transition-colors"
            >
                <span className="material-symbols-outlined text-base">close</span>
            </button>
        </div>
    );
}
