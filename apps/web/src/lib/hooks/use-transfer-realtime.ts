"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { logger } from "@repo/utils";
import type { Transfer } from "@repo/types";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  deleteTransfer as deleteTransferFromDB,
  deleteMultipleTransfers as deleteMultipleFromDB,
} from "@/lib/services/transfer-service";

const TRANSFERS_LOADING_TIMEOUT_MS = 12000;

/**
 * Subscribe to all transfers for the current user
 */
export function useUserTransfersRealtime(initialLimit = 20) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const userIdRef = useRef<string | null>(null);
  const transfersRef = useRef<Transfer[]>([]);

  useEffect(() => {
    transfersRef.current = transfers;
  }, [transfers]);

  const fetchTransfers = useCallback(
    async (userId: string, targetPage = 0, append = false) => {
      const offset = targetPage * initialLimit;
      const { data, error } = await supabase
        .from("transfers")
        .select("*")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .range(offset, offset + initialLimit - 1);

      if (error) {
        logger.error({ error, userId, targetPage }, "[REALTIME] Failed to fetch transfers");
        if (!append) {
          setTransfers([]);
        }
        setHasMore(false);
        return;
      }

      if (data) {
        if (data.length < initialLimit) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }

        // Filter to only show final statuses (completed, failed, cancelled)
        const finalTransfers = data.filter(
          (t) => t.status === "complete" || t.status === "failed" || t.status === "cancelled"
        );

        // Deduplicate transfers
        const seen = new Map<string, Transfer>();
        for (const transfer of finalTransfers) {
          seen.set(transfer.id, transfer);
        }

        const newTransfers = Array.from(seen.values());

        if (append) {
          setTransfers((prev) => {
            const combined = new Map<string, Transfer>();
            prev.forEach((t) => combined.set(t.id, t));
            newTransfers.forEach((t) => combined.set(t.id, t));
            return Array.from(combined.values()).sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
          });
        } else {
          setTransfers(newTransfers);
        }
      }
    },
    [initialLimit]
  );

  useEffect(() => {
    const instanceId = crypto.randomUUID();
    let mounted = true;
    const loadingTimeout = window.setTimeout(() => {
      if (!mounted) return;
      logger.warn(
        { timeoutMs: TRANSFERS_LOADING_TIMEOUT_MS },
        "[REALTIME] Initial load timed out, hiding loading skeleton"
      );
      setLoading(false);
    }, TRANSFERS_LOADING_TIMEOUT_MS);

    async function setupRealtimeSubscription() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          logger.error({ authError }, "[REALTIME] Failed to read authenticated user");
          return;
        }

        if (!user || !mounted) {
          return;
        }

        userIdRef.current = user.id;

        // Fetch initial transfers
        await fetchTransfers(user.id);
        if (!mounted) return;

        // Subscribe with a unique channel name to avoid collisions across page navigations
        channelRef.current = supabase
          .channel(`user-transfers-${instanceId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "transfers",
              filter: `sender_id=eq.${user.id}`,
            },
            (payload) => {
              const newTransfer = payload.new as Transfer;
              if (["complete", "failed", "cancelled"].includes(newTransfer.status)) {
                setTransfers((prev) => [newTransfer, ...prev]);
              }
            }
          )
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "transfers",
              filter: `receiver_id=eq.${user.id}`,
            },
            (payload) => {
              const newTransfer = payload.new as Transfer;
              if (["complete", "failed", "cancelled"].includes(newTransfer.status)) {
                setTransfers((prev) => [newTransfer, ...prev]);
              }
            }
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "transfers",
            },
            (payload) => {
              const updatedTransfer = payload.new as Transfer;
              const isFinal = ["complete", "failed", "cancelled"].includes(updatedTransfer.status);

              setTransfers((prev) => {
                const exists = prev.some((t) => t.id === updatedTransfer.id);

                if (exists) {
                  if (isFinal) {
                    return prev.map((t) => (t.id === updatedTransfer.id ? updatedTransfer : t));
                  }
                  // If it was there and now isn't final (shouldn't happen often in history), remove it
                  return prev.filter((t) => t.id !== updatedTransfer.id);
                }

                if (isFinal) {
                  // If it wasn't there but is now final, add it at the top
                  return [updatedTransfer, ...prev].sort(
                    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                  );
                }

                return prev;
              });
            }
          )
          .on(
            "postgres_changes",
            {
              event: "DELETE",
              schema: "public",
              table: "transfers",
            },
            (payload) => {
              setTransfers((prev) => prev.filter((t) => t.id !== payload.old.id));
            }
          )
          .subscribe();
      } catch (error) {
        logger.error({ error }, "[REALTIME] Unexpected error during initial subscription setup");
      } finally {
        if (!mounted) return;
        window.clearTimeout(loadingTimeout);
        setLoading(false);
      }
    }

    setupRealtimeSubscription();

    // Refetch when tab/page becomes visible again (covers navigation + tab switching)
    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && userIdRef.current) {
        fetchTransfers(userIdRef.current);
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mounted = false;
      window.clearTimeout(loadingTimeout);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [fetchTransfers]);

  /**
   * Optimistically remove a single transfer from local state and delete from DB
   */
  const removeTransfer = useCallback(async (transferId: string) => {
    const previousTransfers = transfersRef.current;

    // Optimistic: remove from state immediately
    setTransfers((prev) => prev.filter((t) => t.id !== transferId));

    try {
      const deleted = await deleteTransferFromDB(transferId);
      if (!deleted) {
        logger.error(
          { transferId },
          "[REALTIME] Failed to delete transfer in DB, rolling back UI state"
        );
        setTransfers(previousTransfers);
        return false;
      }
      return true;
    } catch (error) {
      logger.error(
        { error, transferId },
        "[REALTIME] Delete transfer threw, rolling back UI state"
      );
      setTransfers(previousTransfers);
      return false;
    }
  }, []);

  /**
   * Optimistically remove multiple transfers and delete from DB
   */
  const removeMultipleTransfers = useCallback(async (transferIds: string[]) => {
    logger.debug({ transferIds }, "[REALTIME] Removing multiple transfers");

    const previousTransfers = transfersRef.current;
    setTransfers((prev) => prev.filter((t) => !transferIds.includes(t.id)));

    try {
      const result = await deleteMultipleFromDB(transferIds);
      if (!result) {
        logger.error(
          { transferIds },
          "[REALTIME] Failed to delete transfers in DB, rolling back UI state"
        );
        setTransfers(previousTransfers);
        return false;
      }

      logger.debug({ result }, "[REALTIME] Delete result");
      return true;
    } catch (error) {
      logger.error({ error, transferIds }, "[REALTIME] Bulk delete threw, rolling back UI state");
      setTransfers(previousTransfers);
      return false;
    }
  }, []);

  /**
   * Manually refresh transfers from the database
   */
  const refresh = useCallback(async () => {
    if (userIdRef.current) {
      setPage(0);
      await fetchTransfers(userIdRef.current, 0, false);
    }
  }, [fetchTransfers]);

  const loadMore = useCallback(async () => {
    if (userIdRef.current && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      await fetchTransfers(userIdRef.current, nextPage, true);
    }
  }, [fetchTransfers, page, hasMore]);

  return {
    transfers,
    loading,
    removeTransfer,
    removeMultipleTransfers,
    refresh,
    loadMore,
    hasMore,
  };
}
