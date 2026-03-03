-- FINDING-031 FIX: Replace client-side JS aggregation (fetching all rows
-- then summing in JS) with a server-side SQL aggregate function.
-- This runs in the database and returns a single row regardless of how many
-- transfers the user has.

CREATE OR REPLACE FUNCTION public.get_user_transfer_stats(p_user_id UUID)
RETURNS TABLE(total_bytes BIGINT, total_transfers BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(file_size), 0)::BIGINT AS total_bytes,
    COUNT(*)::BIGINT                    AS total_transfers
  FROM public.transfers
  WHERE sender_id = p_user_id
    AND status = 'complete';
$$;

-- Grant execute only to authenticated users
REVOKE ALL ON FUNCTION public.get_user_transfer_stats(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_transfer_stats(UUID) TO authenticated;
