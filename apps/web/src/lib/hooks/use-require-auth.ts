"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/services/auth-service";
import { logger } from "@repo/utils";
import type { User } from "@supabase/supabase-js";

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

        getCurrentUser()
            .then(u => {
                if (!mounted) return;
                setUser(u);
                setLoading(false);
            })
            .catch(err => {
                logger.error({ err }, "Auth check failed");
                if (mounted) {
                    setLoading(false);
                }
            });

        return () => {
            mounted = false;
        };
    }, []);

    return { user, loading };
}
