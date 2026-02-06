"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Transfer } from "@repo/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

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

      // Subscribe to changes
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

  useEffect(() => {
    let channel: RealtimeChannel;

    async function setupRealtimeSubscription() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch initial transfers
      const { data } = await supabase
        .from("transfers")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (data) {
        setTransfers(data);
      }
      setLoading(false);

      // Subscribe to INSERT events (new transfers)
      channel = supabase
        .channel("user-transfers")
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

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return { transfers, loading };
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
