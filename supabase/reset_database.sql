-- ============================================================
-- HyperLink Database Reset Script (v6 - Transfers Only)
-- ============================================================

-- ==== STEP 1: DROP TABLE FIRST ====
DROP TABLE IF EXISTS public.transfers CASCADE;

-- ==== STEP 2: DROP ORPHANED FUNCTIONS ====
DROP FUNCTION IF EXISTS public.notify_transfer_update() CASCADE;

-- ==== STEP 3: CREATE TRANSFERS TABLE ====
CREATE TABLE public.transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  sender_id UUID NOT NULL, 
  receiver_id UUID,        
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'connecting', 'transferring', 'complete', 'failed', 'cancelled'))
);

-- ==== STEP 4: CREATE INDEXES ====
CREATE INDEX idx_transfers_sender_id ON public.transfers(sender_id);
CREATE INDEX idx_transfers_receiver_id ON public.transfers(receiver_id);
CREATE INDEX idx_transfers_status ON public.transfers(status);
CREATE INDEX idx_transfers_created_at ON public.transfers(created_at DESC);

-- ==== STEP 5: ENABLE RLS ====
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

-- ==== STEP 6: CREATE POLICIES (Simplified for standalone) ====
CREATE POLICY "Public handle own transfers"
  ON public.transfers FOR ALL
  USING (true)
  WITH CHECK (true);

-- ==== STEP 7: GRANT PERMISSIONS ====
GRANT ALL ON public.transfers TO authenticated;
GRANT ALL ON public.transfers TO anon;
GRANT ALL ON public.transfers TO service_role;

-- ==== STEP 8: CREATE FUNCTIONS ====
CREATE OR REPLACE FUNCTION public.notify_transfer_update()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('transfer_update', json_build_object('id', NEW.id, 'status', NEW.status)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.claim_transfer(
  p_transfer_id UUID
)
RETURNS SETOF public.transfers
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.transfers
  SET receiver_id = auth.uid() 
  WHERE id = p_transfer_id
    AND receiver_id IS NULL       
    AND sender_id <> auth.uid()   
  RETURNING *;
$$;

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

-- Grant permissions for RPCs
REVOKE ALL ON FUNCTION public.claim_transfer(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_transfer(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.get_user_transfer_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_transfer_stats() TO authenticated;

-- ==== STEP 9: CREATE TRIGGERS ====
CREATE TRIGGER transfer_update_trigger
  AFTER UPDATE ON public.transfers
  FOR EACH ROW EXECUTE FUNCTION public.notify_transfer_update();

-- ==== STEP 10: ENABLE REALTIME ====
DO $$
BEGIN
  -- Re-add to publication if it exists
  ALTER PUBLICATION supabase_realtime ADD TABLE public.transfers;
EXCEPTION WHEN OTHERS THEN 
  -- Publication might not exist or table already in it
  NULL;
END $$;

-- ==== DONE! ====
SELECT 'Database reset (transfers only & RPC functions) complete!' as status;
