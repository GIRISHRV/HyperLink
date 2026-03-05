"use client";

import { useEffect, useState } from "react";

const SW_UPDATED_KEY = "sw:just-updated";

/**
 * Handles service worker updates silently.
 *
 * When a new SW takes control (skipWaiting is already enabled in next-pwa),
 * this hook:
 *   1. Marks a sessionStorage flag
 *   2. Reloads the page to load fresh assets
 *
 * On the next render (post-reload), it returns `justUpdated: true` so the
 * UI can show a brief "App updated" confirmation banner.
 */
export function useSwUpdate() {
    const [justUpdated, setJustUpdated] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

        // Check if we just reloaded due to an SW update
        if (sessionStorage.getItem(SW_UPDATED_KEY) === "1") {
            sessionStorage.removeItem(SW_UPDATED_KEY);
            setJustUpdated(true);
        }

        // When a new SW takes control, silently reload to pick up fresh assets
        const handleControllerChange = () => {
            sessionStorage.setItem(SW_UPDATED_KEY, "1");
            window.location.reload();
        };

        navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
        return () => {
            navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
        };
    }, []);

    return { justUpdated, dismiss: () => setJustUpdated(false) };
}
