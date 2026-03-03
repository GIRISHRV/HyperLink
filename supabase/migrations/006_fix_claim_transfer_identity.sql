-- FINDING-013 FIX: claim_transfer RPC now uses auth.uid() instead of
-- trusting a client-supplied p_receiver_id parameter. This prevents any
-- authenticated user from claiming a transfer on behalf of another user.
--
-- Breaking change: client call signature changes from:
--   supabase.rpc("claim_transfer", { p_transfer_id: id, p_receiver_id: uid })
-- to:
--   supabase.rpc("claim_transfer", { p_transfer_id: id })
--
CREATE OR REPLACE FUNCTION public.claim_transfer(
  p_transfer_id UUID
)
RETURNS SETOF public.transfers
LANGUAGE sql
SECURITY DEFINER          -- runs with table-owner privileges
SET search_path = public  -- prevent search_path injection
AS $$
  UPDATE public.transfers
  SET receiver_id = auth.uid()   -- always use the actual caller's session UID
  WHERE id = p_transfer_id
    AND receiver_id IS NULL       -- only claim unclaimed transfers
    AND sender_id <> auth.uid()   -- cannot claim your own transfer
  RETURNING *;
$$;

-- Revoke from public/anon; only authenticated users may call this
REVOKE ALL ON FUNCTION public.claim_transfer(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_transfer(UUID) TO authenticated;
