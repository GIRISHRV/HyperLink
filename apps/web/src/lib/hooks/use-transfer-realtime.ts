"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Transfer } from "@repo/types";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { deleteTransfer as deleteTransferFromDB, deleteMultipleTransfers as deleteMultipleFromDB } from "@/lib/services/transfer-service";

/**
 * Subscribe to real-time updates for a specific transfer
 */
export function useTransferRealtime(transferId: string | null) {
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!transferId) {
      setLoading(false);
      return;
    }

    let channel: RealtimeChannel;

    async function setupRealtimeSubscription() {
      // Fetch initial transfer data
      const { data } = await supabase.from("transfers").select("*").eq("id", transferId).single();

      if (data) {
        setTransfer(data);
      }
      setLoading(false);

      // Subscribe to changes (UPDATE + DELETE)
      channel = supabase
        .channel(`transfer:${transferId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "transfers",
            filter: `id=eq.${transferId}`,
          },
          (payload) => {
            setTransfer(payload.new as Transfer);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "transfers",
            filter: `id=eq.${transferId}`,
          },
          () => {
            setTransfer(null);
          }
        )
        .subscribe();
    }

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [transferId]);

  return { transfer, loading };
}

/**
 * Subscribe to all transfers for the current user
 */
export function useUserTransfersRealtime() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const userIdRef = useRef<string | null>(null);

  const fetchTransfers = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("transfers")
      .select("*")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (data) {
      setTransfers(data);
    }
  }, []);

  useEffect(() => {
    const instanceId = Math.random().toString(36).slice(2, 8);

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
            setTransfers((prev) => [payload.new as Transfer, ...prev]);
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
            setTransfers((prev) => [payload.new as Transfer, ...prev]);
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
            setTransfers((prev) =>
              prev.map((t) => (t.id === payload.new.id ? (payload.new as Transfer) : t))
            );
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
            setTransfers((prev) =>
              prev.filter((t) => t.id !== payload.old.id)
            );
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
    console.log("[REALTIME] Removing multiple transfers:", transferIds);
    setTransfers((prev) => prev.filter((t) => !transferIds.includes(t.id)));
    const result = await deleteMultipleFromDB(transferIds);
    console.log("[REALTIME] Delete result:", result);
    return result;
  }, []);

  /**
   * Manually refresh transfers from the database
   */
  const refresh = useCallback(async () => {
    if (userIdRef.current) {
      await fetchTransfers(userIdRef.current);
    }
  }, [fetchTransfers]);

  return { transfers, loading, removeTransfer, removeMultipleTransfers, refresh };
}

/**
 * Subscribe to transfer status changes
 */
export function useTransferStatus(transferId: string | null) {
  const { transfer, loading } = useTransferRealtime(transferId);

  return {
    status: transfer?.status,
    completedAt: transfer?.completed_at,
    loading,
  };
}
