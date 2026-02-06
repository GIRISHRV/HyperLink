import { supabase } from "@/lib/supabase/client";

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_icon: string;
  avatar_color: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileData {
  display_name?: string;
  avatar_icon?: string;
  avatar_color?: string;
}

/**
 * Get the current user's profile
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }

  return data;
}

/**
 * Update the current user's profile
 */
export async function updateUserProfile(updates: UpdateProfileData): Promise<UserProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Use upsert to handle cases where the profile might not exist yet (e.g. older users)
  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(
      {
        user_id: user.id,
        ...updates,
        updated_at: new Date().toISOString(), // Manually update timestamp for upsert
      },
      {
        onConflict: "user_id",
      }
    )
    .select()
    .single();

  if (error) {
    console.error("Error updating user profile:", error);
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
    console.error("Error creating user profile:", error);
    return null;
  }

  return data;
}
