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
