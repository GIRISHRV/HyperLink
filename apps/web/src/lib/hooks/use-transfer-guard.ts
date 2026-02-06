"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { updateTransferStatus } from "@/lib/services/transfer-service";

/**
 * Guard against accidental navigation/reload during an active transfer.
 * 
 * - Shows browser-native "beforeunload" confirmation dialog on tab close / reload
 * - Shows a custom modal for browser back/forward via `showBackModal` state
 * - Marks the transfer as "failed" in the DB on unmount (navigation / tab close)
 * - The header handles its own modal for navbar link clicks via `isTransferActive`
 */
export function useTransferGuard(
  transferId: string | null,
  isActive: boolean // true when status is connecting/transferring/paused
) {
  const transferIdRef = useRef(transferId);
  const isActiveRef = useRef(isActive);
  const cleanedUpRef = useRef(false); // Prevent duplicate cleanup calls
  const [showBackModal, setShowBackModal] = useState(false);

  // Keep refs in sync so the cleanup closure always has latest values
  useEffect(() => {
    transferIdRef.current = transferId;
    isActiveRef.current = isActive;
    // Reset cleanup flag when a new transfer starts
    if (transferId && isActive) {
      cleanedUpRef.current = false;
    }
  }, [transferId, isActive]);

  // Helper to mark transfer as failed (idempotent via cleanedUpRef)
  const markTransferFailed = useCallback(() => {
    if (cleanedUpRef.current) return;
    if (!isActiveRef.current || !transferIdRef.current) return;
    cleanedUpRef.current = true;
    // Fire-and-forget: page may unload before completion
    updateTransferStatus(transferIdRef.current, "failed").catch(() => {});
  }, []);

  // Browser beforeunload — warns on tab close / reload (browser-native, can't customize)
  // Also attempts to mark transfer as failed
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!isActiveRef.current) return;
      e.preventDefault();
      e.returnValue = "";
      // Attempt cleanup here (browsers give some time for this)
      markTransferFailed();
      return "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [markTransferFailed]);

  // pagehide is more reliable than beforeunload for actual page unload
  useEffect(() => {
    function handlePageHide() {
      markTransferFailed();
    }

    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, [markTransferFailed]);

  // Intercept browser back / forward buttons — show custom modal
  useEffect(() => {
    function handlePopState() {
      if (!isActiveRef.current) return;
      // Push the current URL back so the user stays on the page
      window.history.pushState(null, "", window.location.href);
      // Show custom modal
      setShowBackModal(true);
    }

    // Push an extra history entry so we can intercept the first back press
    if (isActive) {
      window.history.pushState(null, "", window.location.href);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isActive]);

  // Cleanup on unmount — if component unmounts while transfer is active
  // (Next.js navigation, clicking navbar links, etc.), mark as failed
  useEffect(() => {
    return () => {
      markTransferFailed();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps = only runs on mount/unmount

  /** Called when user confirms leaving via back-button modal */
  const confirmBackNavigation = useCallback(() => {
    setShowBackModal(false);
    // Go back for real — pop the extra history entry and the actual entry
    window.history.go(-2);
  }, []);

  /** Called when user cancels leaving via back-button modal */
  const cancelBackNavigation = useCallback(() => {
    setShowBackModal(false);
  }, []);

  return { showBackModal, confirmBackNavigation, cancelBackNavigation };
}
