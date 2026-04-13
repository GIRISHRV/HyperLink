"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { logger } from "@repo/utils";

export function useAdminStatus(userId?: string) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    if (!userId) {
      setIsAdmin(false);
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    setLoading(true);

    const checkAdminStatus = async () => {
      try {
        const { data, error } = await supabase
          .from("user_profiles")
          .select("is_admin")
          .eq("user_id", userId)
          .single();

        if (!mounted) return;

        if (error) {
          logger.error({ error, userId }, "Failed to check admin status");
          setIsAdmin(false);
          return;
        }

        setIsAdmin(Boolean(data?.is_admin));
      } catch (error) {
        if (!mounted) return;
        logger.error({ error, userId }, "Unexpected admin status error");
        setIsAdmin(false);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    checkAdminStatus();

    return () => {
      mounted = false;
    };
  }, [userId]);

  return { isAdmin, loading };
}
