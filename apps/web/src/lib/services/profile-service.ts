import { supabase } from "@/lib/supabase/client";
import { logger } from "@repo/utils";
import { withRetry } from "@/lib/utils/with-retry";

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_icon: string;
  avatar_color: string;
  active_peer_id: string | null; // Added for Task #9
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileData {
  display_name?: string;
  avatar_icon?: string;
  avatar_color?: string;
  active_peer_id?: string; // Added for Task #9
}

/**
 * Get the current user's profile
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await withRetry(() =>
    supabase.from("user_profiles").select("*").eq("user_id", userId).single()
  );

  if (error) {
    // FINDING-020: Only auto-create on genuine "row not found" (PGRST116).
    // Any other error (network, auth, server) should propagate, not silently
    // create a profile, which would mask the underlying problem.
    if (error.code === "PGRST116") {
      // NOTE: We don't have the user's email here anymore, so we fallback to "User"
      return await createUserProfile(userId, "User");
    }
    throw error;
  }

  return data;
}

/**
 * Update the current user's profile
 */
export async function updateUserProfile(
  userId: string,
  updates: UpdateProfileData
): Promise<UserProfile | null> {
  // Try to update first. Since user_profiles are auto-created by a trigger on auth.users,
  // the profile should almost always exist.
  const { data, error } = await withRetry(() =>
    supabase
      .from("user_profiles")
      .update(updates)
      .eq("user_id", userId)
      .select()
      .single()
  );

  if (error) {
    // If it doesn't exist (PGRST116), try to insert it once.
    if (error.code === "PGRST116") {
      logger.debug({ userId }, "[PROFILE] Profile not found, attempting to create...");
      return await createUserProfile(userId, updates.display_name || "User");
    }
    logger.error({
      code: error.code,
      message: error.message,
      details: error.details,
      userId
    }, "Error updating user profile");
    throw error;
  }

  return data;
}

/**
 * Create a profile for a user (usually called automatically by trigger)
 */
export async function createUserProfile(
  userId: string,
  displayName?: string
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .insert({
      user_id: userId,
      display_name: displayName,
      avatar_icon: "person",
      avatar_color: "bg-primary",
    })
    .select()
    .single();

  if (error) {
    logger.error({ error }, "Error creating user profile");
    return null;
  }

  return data;
}
