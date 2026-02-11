import { supabase } from "@/lib/supabase/client";
import { logger } from "@repo/utils";
import type { Transfer } from "@repo/types";

/**
 * Create a new transfer record
 */
export async function createTransfer(data: {
  filename: string;
  fileSize: number;
  receiverId?: string;
}): Promise<Transfer | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: transfer, error } = await supabase
    .from("transfers")
    .insert({
      filename: data.filename,
      file_size: data.fileSize,
      sender_id: user.id,
      receiver_id: data.receiverId || null,
      status: "pending",
    })
    .select()
    .single();

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Use RPC to bypass RLS — the receiver can't satisfy the UPDATE policy
  // because receiver_id is still NULL when they try to claim the record.
  const { data, error } = await supabase.rpc("claim_transfer", {
    p_transfer_id: transferId,
    p_receiver_id: user.id,
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
export async function getUserTransfers(): Promise<Transfer[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("transfers")
    .select("*")
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error({ error }, "Error fetching transfers");
    return [];
  }

  return data || [];
}

/**
 * Get transfer by ID
 */
export async function getTransfer(transferId: string): Promise<Transfer | null> {
  const { data, error } = await supabase
    .from("transfers")
    .select("*")
    .eq("id", transferId)
    .single();

  if (error) {
    logger.error({ error }, "Error fetching transfer");
    return null;
  }

  return data;
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

  logger.info({ transferIds }, "[TRANSFER-SERVICE] Deleting transfers");

  // First check what we can actually see
  const { data: user } = await supabase.auth.getUser();
  logger.info({ userId: user?.user?.id }, "[TRANSFER-SERVICE] Current user ID");

  const { data: checkData } = await supabase
    .from("transfers")
    .select("id, sender_id, receiver_id")
    .in("id", transferIds);
  logger.info({ checkData }, "[TRANSFER-SERVICE] Transfers we can SELECT");

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

  logger.info({ data }, "[TRANSFER-SERVICE] Actually deleted");
  return true;
}
