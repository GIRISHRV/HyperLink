"use client";

import { useSwUpdate } from "@/lib/hooks/use-sw-update";
import SwUpdateBanner from "@/components/sw-update-banner";

/**
 * Client-side service worker update watcher.
 * Renders a brief "App updated" banner after a silent SW-triggered reload.
 * Drop this into the root layout — it renders nothing during normal operation.
 */
export function SwUpdateWatcher() {
    const { justUpdated, dismiss } = useSwUpdate();
    if (!justUpdated) return null;
    return <SwUpdateBanner onDismiss={dismiss} />;
}
