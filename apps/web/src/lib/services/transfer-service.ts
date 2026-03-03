import { supabase } from "@/lib/supabase/client";
import { logger } from "@repo/utils";
import { withRetry } from "@/lib/utils/with-retry";
import type { Transfer } from "@repo/types";

/**
 * Create a new transfer record
 */
export async function createTransfer(userId: string, data: {
  filename: string;
  fileSize: number;
  receiverId?: string;
}): Promise<Transfer | null> {
  const { data: transfer, error } = await withRetry(() =>
    supabase
      .from("transfers")
      .insert({
        filename: data.filename,
        file_size: data.fileSize,
        sender_id: userId,
        receiver_id: data.receiverId || null,
        status: "pending",
      })
      .select()
      .single()
  );

  if (error) {
    logger.error({ error }, "Error creating transfer");
    return null;
  }

  return transfer;
}

/**
 * Update transfer status
 */
export async function updateTransferStatus(
  transferId: string,
  status: Transfer["status"]
): Promise<boolean> {
  const updates: Partial<Transfer> = { status };

  if (status === "complete") {
    updates.completed_at = new Date().toISOString();
  }

  const { error } = await supabase.from("transfers").update(updates).eq("id", transferId);

  if (error) {
    logger.error({ error }, "Error updating transfer");
    return false;
  }

  return true;
}

/**
 * Claim an existing transfer as the receiver (set receiver_id)
 */
export async function claimTransferAsReceiver(transferId: string): Promise<Transfer | null> {
  // Use RPC to bypass RLS — the receiver can't satisfy the UPDATE policy
  // because receiver_id is still NULL when they try to claim the record.
  // The function uses auth.uid() server-side, so no receiver_id param needed.
  const { data, error } = await supabase.rpc("claim_transfer", {
    p_transfer_id: transferId,
    // p_receiver_id removed — migration 006 enforces auth.uid() server-side
  });

  if (error) {
    logger.error({ error }, "Error claiming transfer");
    return null;
  }

  // RPC returns the updated row; normalise to Transfer shape
  return (data as Transfer) ?? null;
}

/**
 * Get user's transfer history
 */
export async function getUserTransfers(userId: string): Promise<Transfer[]> {
  const { data, error } = await withRetry(() =>
    supabase
      .from("transfers")
      .select("*")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false })
  );

  if (error) {
    logger.error({ error }, "Error fetching transfers");
    return [];
  }

  return data || [];
}

/**
 * Delete transfer
 */
export async function deleteTransfer(transferId: string): Promise<boolean> {
  const { error } = await supabase.from("transfers").delete().eq("id", transferId);

  if (error) {
    logger.error({ error }, "Error deleting transfer");
    return false;
  }

  return true;
}

/**
 * Delete multiple transfers at once
 */
export async function deleteMultipleTransfers(transferIds: string[]): Promise<boolean> {
  if (transferIds.length === 0) return true;

  logger.info({ count: transferIds.length }, "[TRANSFER-SERVICE] Deleting transfers");

  // Use .select() to get rows that were deleted (requires RLS access)
  const { data, error } = await supabase
    .from("transfers")
    .delete()
    .in("id", transferIds)
    .select("id");

  if (error) {
    logger.error({ error }, "[TRANSFER-SERVICE] Error deleting transfers");
    return false;
  }

  logger.info({ deleted: data?.length ?? 0 }, "[TRANSFER-SERVICE] Deleted");
  return true;
}

/**
 * Get total transfer statistics for the current user.
 * SEC-007: No userId parameter — the RPC uses auth.uid() server-side
 * to prevent IDOR attacks.
 */
export async function getUserTransferStats(): Promise<{
  totalTransfers: number;
  totalBytesSent: number;
}> {
  const { data, error } = await withRetry(() =>
    supabase.rpc("get_user_transfer_stats")
  );

  if (error) {
    logger.error({ error }, "Error fetching user transfer stats");
    return { totalTransfers: 0, totalBytesSent: 0 };
  }

  // Handle both possible RPC return formats depending on the database function version
  const stats = data as { total_transfers?: number; total_bytes_sent?: number; total_bytes?: number }[];
  if (!stats || stats.length === 0) {
    return { totalTransfers: 0, totalBytesSent: 0 };
  }

  const firstRow = stats[0];
  return {
    totalTransfers: Number(firstRow?.total_transfers || 0),
    totalBytesSent: Number(firstRow?.total_bytes_sent || firstRow?.total_bytes || 0),
  };
}
