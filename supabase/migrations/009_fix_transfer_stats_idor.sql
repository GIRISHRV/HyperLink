-- SEC-007 FIX: Remove p_user_id parameter from get_user_transfer_stats.
-- The function now uses auth.uid() server-side to prevent IDOR attacks
-- where any authenticated user could query stats for arbitrary user IDs.

-- Drop old signatures (handles both possible function names)
DROP FUNCTION IF EXISTS public.get_user_transfer_stats(UUID);
DROP FUNCTION IF EXISTS public.get_user_stats(UUID);

CREATE OR REPLACE FUNCTION public.get_user_transfer_stats()
RETURNS TABLE(total_bytes BIGINT, total_transfers BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(file_size), 0)::BIGINT AS total_bytes,
    COUNT(*)::BIGINT                    AS total_transfers
  FROM public.transfers
  WHERE sender_id = auth.uid()
    AND status = 'complete';
$$;

-- Grant execute only to authenticated users
REVOKE ALL ON FUNCTION public.get_user_transfer_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_transfer_stats() TO authenticated;
