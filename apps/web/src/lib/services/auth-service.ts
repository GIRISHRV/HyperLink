import { supabase } from "@/lib/supabase/client";
import { logger } from "@repo/utils";

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

/**
 * Sign in with magic link
 */
export async function signInWithMagicLink(email: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/dashboard`,
    },
  });
  return { data, error };
}

/**
 * Reset password (send email with reset link)
 */
export async function resetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth`,
  });

  if (error) throw new Error(error.message ?? JSON.stringify(error));
  return { data, error };
}

/**
 * Sign out
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      // AUTH_SESSION_MISSING is the normal response when no user is logged in — not a real error.
      // All other codes are unexpected and worth logging at error level.
      if (error.code === "session_not_found" || error.message === "Auth session missing!") {
        logger.info({ code: error.code }, "No active auth session (unauthenticated visitor)");
      } else {
        logger.error({ error: error.message }, "Supabase auth error in getCurrentUser");
      }
      return null;
    }
    return user;
  } catch (err) {
    logger.error({ err }, "getCurrentUser unexpected error");
    return null;
  }
}
