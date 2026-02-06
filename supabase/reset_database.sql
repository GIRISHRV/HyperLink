-- ============================================================
-- HyperLink Database Reset Script (v4 - Robust)
-- ============================================================

-- ==== STEP 1: DROP TABLES FIRST (this cascades triggers too) ====
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.transfers CASCADE;

-- ==== STEP 2: DROP ORPHANED FUNCTIONS ====
DROP FUNCTION IF EXISTS public.create_default_user_profile() CASCADE;
DROP FUNCTION IF EXISTS public.update_user_profile_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.notify_transfer_update() CASCADE;

-- ==== STEP 3: CREATE TRANSFERS TABLE ====
CREATE TABLE public.transfers (
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

-- ==== STEP 4: CREATE USER_PROFILES TABLE ====
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  display_name TEXT,
  avatar_icon TEXT DEFAULT 'person',
  avatar_color TEXT DEFAULT 'bg-primary',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==== STEP 5: CREATE INDEXES ====
CREATE INDEX idx_transfers_sender_id ON public.transfers(sender_id);
CREATE INDEX idx_transfers_receiver_id ON public.transfers(receiver_id);
CREATE INDEX idx_transfers_status ON public.transfers(status);
CREATE INDEX idx_transfers_created_at ON public.transfers(created_at DESC);
CREATE INDEX user_profiles_user_id_idx ON public.user_profiles(user_id);

-- ==== STEP 6: ENABLE RLS ====
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- ==== STEP 7: CREATE POLICIES FOR TRANSFERS ====
CREATE POLICY "Users can view own transfers"
  ON public.transfers FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Authenticated users can create transfers"
  ON public.transfers FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update own transfers"
  ON public.transfers FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can delete own transfers"
  ON public.transfers FOR DELETE
  USING (auth.uid() = sender_id);

-- ==== STEP 8: CREATE POLICIES FOR USER_PROFILES ====
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- ==== STEP 9: GRANT PERMISSIONS ====
GRANT ALL ON public.transfers TO authenticated;
GRANT SELECT ON public.transfers TO anon;
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;

-- ==== STEP 10: CREATE FUNCTIONS ====
CREATE OR REPLACE FUNCTION public.notify_transfer_update()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('transfer_update', json_build_object('id', NEW.id, 'status', NEW.status)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_user_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.create_default_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, display_name, avatar_icon, avatar_color)
  VALUES (NEW.id, COALESCE(split_part(NEW.email, '@', 1), 'User'), 'person', 'bg-primary')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to create user profile: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ==== STEP 11: CREATE TRIGGERS ====
CREATE TRIGGER transfer_update_trigger
  AFTER UPDATE ON public.transfers
  FOR EACH ROW EXECUTE FUNCTION public.notify_transfer_update();

CREATE TRIGGER update_user_profile_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_user_profile_updated_at();

-- Drop auth trigger first if exists, then recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_default_user_profile();

-- ==== STEP 12: ENABLE REALTIME ====
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.transfers;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ==== DONE! ====
SELECT 'Database reset complete!' as status;
