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

  const fetchTransfers = useCallback(
    async (userId: string, targetPage = 0, append = false) => {
      const offset = targetPage * initialLimit;
      const { data } = await supabase
        .from("transfers")
        .select("*")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .range(offset, offset + initialLimit - 1);

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

    async function setupRealtimeSubscription() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      userIdRef.current = user.id;

      // Fetch initial transfers
      await fetchTransfers(user.id);
      setLoading(false);

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
                } else {
                  // If it was there and now isn't final (shouldn't happen often in history), remove it
                  return prev.filter((t) => t.id !== updatedTransfer.id);
                }
              } else if (isFinal) {
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
    // Optimistic: remove from state immediately
    setTransfers((prev) => prev.filter((t) => t.id !== transferId));
    // Then delete from DB (realtime will also fire, but we already removed it)
    await deleteTransferFromDB(transferId);
  }, []);

  /**
   * Optimistically remove multiple transfers and delete from DB
   */
  const removeMultipleTransfers = useCallback(async (transferIds: string[]) => {
    logger.debug({ transferIds }, "[REALTIME] Removing multiple transfers");
    setTransfers((prev) => prev.filter((t) => !transferIds.includes(t.id)));
    const result = await deleteMultipleFromDB(transferIds);
    logger.debug({ result }, "[REALTIME] Delete result");
    return result;
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
