-- Create transfers table for metadata storage
CREATE TABLE IF NOT EXISTS public.transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'connecting', 'transferring', 'complete', 'failed', 'cancelled'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transfers_sender_id ON public.transfers(sender_id);
CREATE INDEX IF NOT EXISTS idx_transfers_receiver_id ON public.transfers(receiver_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON public.transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_created_at ON public.transfers(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own transfers (as sender or receiver)
CREATE POLICY "Users can view own transfers"
  ON public.transfers
  FOR SELECT
  USING (
    auth.uid() = sender_id OR 
    auth.uid() = receiver_id
  );

-- Policy: Authenticated users can insert transfers
CREATE POLICY "Authenticated users can create transfers"
  ON public.transfers
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Policy: Users can update their own transfers
CREATE POLICY "Users can update own transfers"
  ON public.transfers
  FOR UPDATE
  USING (
    auth.uid() = sender_id OR 
    auth.uid() = receiver_id
  );

-- Policy: Users can delete their own transfers
CREATE POLICY "Users can delete own transfers"
  ON public.transfers
  FOR DELETE
  USING (
    auth.uid() = sender_id OR 
    auth.uid() = receiver_id
  );

-- Grant permissions
GRANT ALL ON public.transfers TO authenticated;
GRANT SELECT ON public.transfers TO anon;
