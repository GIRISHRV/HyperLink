import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logger } from "@repo/utils";

/**
 * GDPR Article 17 — Right to Erasure ("right to be forgotten").
 *
 * Deletes the authenticated user's account and all associated data.
 * Requires SUPABASE_SERVICE_ROLE_KEY (server-only, never NEXT_PUBLIC_*).
 *
 * Data deletion cascade:
 *   auth.users → public.profiles (ON DELETE CASCADE)
 *   auth.users → public.transfers (ON DELETE CASCADE for sender_id/receiver_id)
 */
export async function DELETE() {
  // 1. Verify the requester is authenticated
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Verify service role key is configured
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || !supabaseUrl) {
    logger.error(
      { userId: user.id },
      "[account/delete] SUPABASE_SERVICE_ROLE_KEY not configured — cannot delete account"
    );
    return NextResponse.json(
      { error: "Account deletion is not configured. Please contact support." },
      { status: 503 }
    );
  }

  try {
    // 3. Use admin client (service role) to hard-delete the user from auth.users.
    //    The ON DELETE CASCADE migrations handle cleanup of profiles and transfers.
    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

    if (deleteError) {
      logger.error(
        { error: deleteError, userId: user.id },
        "[account/delete] Failed to delete user"
      );
      return NextResponse.json(
        { error: "Failed to delete account. Please try again or contact support." },
        { status: 500 }
      );
    }

    logger.info({ userId: user.id }, "[account/delete] Account deleted successfully");

    // 4. Sign out the current session (best-effort — account is already deleted)
    await supabase.auth.signOut();

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error(
      { error, userId: user.id },
      "[account/delete] Unexpected error during account deletion"
    );
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
