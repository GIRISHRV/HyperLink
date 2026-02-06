-- RPC function to let an authenticated user claim a transfer as receiver.
-- This bypasses RLS because the receiver can't satisfy the UPDATE policy
-- while receiver_id is still NULL.
CREATE OR REPLACE FUNCTION public.claim_transfer(
  p_transfer_id UUID,
  p_receiver_id UUID
)
RETURNS SETOF public.transfers
LANGUAGE sql
SECURITY DEFINER          -- runs with table-owner privileges
SET search_path = public  -- prevent search_path injection
AS $$
  UPDATE public.transfers
  SET receiver_id = p_receiver_id
  WHERE id = p_transfer_id
    AND receiver_id IS NULL   -- only claim unclaimed transfers
  RETURNING *;
$$;
