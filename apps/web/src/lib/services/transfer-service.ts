import { supabase } from "@/lib/supabase/client";
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
    console.error("Error creating transfer:", error);
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
    console.error("Error updating transfer:", error);
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
    console.error("Error claiming transfer:", error);
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
    console.error("Error fetching transfers:", error);
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
    console.error("Error fetching transfer:", error);
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
    console.error("Error deleting transfer:", error);
    return false;
  }

  return true;
}

/**
 * Delete multiple transfers at once
 */
export async function deleteMultipleTransfers(transferIds: string[]): Promise<boolean> {
  if (transferIds.length === 0) return true;

  console.log("[TRANSFER-SERVICE] Deleting transfers:", transferIds);
  
  // First check what we can actually see
  const { data: user } = await supabase.auth.getUser();
  console.log("[TRANSFER-SERVICE] Current user ID:", user?.user?.id);
  
  const { data: checkData } = await supabase
    .from("transfers")
    .select("id, sender_id, receiver_id")
    .in("id", transferIds);
  console.log("[TRANSFER-SERVICE] Transfers we can SELECT:", checkData);
  
  // Use .select() to get rows that were deleted (requires RLS access)
  const { data, error } = await supabase
    .from("transfers")
    .delete()
    .in("id", transferIds)
    .select("id");

  if (error) {
    console.error("[TRANSFER-SERVICE] Error deleting transfers:", error);
    return false;
  }

  console.log("[TRANSFER-SERVICE] Actually deleted:", data);
  return true;
}
