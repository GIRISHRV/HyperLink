"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/services/auth-service";
import { logger } from "@repo/utils";
import type { User } from "@supabase/supabase-js";

const AUTH_LOADING_TIMEOUT_MS = 8000;

/**
 * Provides the current authenticated user and a loading flag.
 *
 * Auth gating (redirecting unauthenticated users to /auth) is handled
 * exclusively by the server-side middleware (middleware.ts). This hook
 * does NOT redirect — it only fetches user data for the component tree.
 *
 * This separation prevents redirect loops that occur when both middleware
 * and client-side code try to redirect simultaneously.
 */
export function useRequireAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadingTimeout = window.setTimeout(() => {
      if (!mounted) return;
      logger.warn(
        { timeoutMs: AUTH_LOADING_TIMEOUT_MS },
        "Auth check timed out, continuing without blocking UI"
      );
      setLoading(false);
    }, AUTH_LOADING_TIMEOUT_MS);

    (async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!mounted) return;
        setUser(currentUser);
      } catch (err) {
        logger.error({ err }, "Auth check failed");
      } finally {
        if (!mounted) return;
        window.clearTimeout(loadingTimeout);
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      window.clearTimeout(loadingTimeout);
    };
  }, []);

  return { user, loading };
}
