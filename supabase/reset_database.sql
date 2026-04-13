-- ============================================================
-- HyperLink Database Reset Script (v7 - Full Schema Teardown/Setup)
-- WARNING: THIS SCRIPT DROPS ALL DATA AND RECREATES THE SCHEMA.
-- ============================================================

-- ==== STEP 1: DROP ALL TABLES & FUNCTIONS ====
DROP TABLE IF EXISTS public.transfers CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.incidents CASCADE;
DROP TABLE IF EXISTS public.account_deletions CASCADE;

DROP FUNCTION IF EXISTS public.notify_transfer_update() CASCADE;
DROP FUNCTION IF EXISTS public.claim_transfer(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.claim_transfer(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_transfer_stats() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_transfer_stats(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_stats(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.update_user_profile_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.create_default_user_profile() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.make_user_admin(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.revoke_user_admin(TEXT) CASCADE;

-- ─────────────────────────────────────────────────────────────
-- 1. TRANSFERS TABLE
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.transfers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename     TEXT NOT NULL,
  file_size    BIGINT NOT NULL,
  sender_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  CONSTRAINT valid_status CHECK (
    status IN ('pending', 'connecting', 'transferring', 'complete', 'failed', 'cancelled')
  )
);

CREATE INDEX IF NOT EXISTS idx_transfers_sender_id   ON public.transfers(sender_id);
CREATE INDEX IF NOT EXISTS idx_transfers_receiver_id ON public.transfers(receiver_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status      ON public.transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_created_at  ON public.transfers(created_at DESC);

ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='transfers' AND policyname='Users can view own transfers') THEN
    CREATE POLICY "Users can view own transfers" ON public.transfers FOR SELECT
      USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='transfers' AND policyname='Authenticated users can create transfers') THEN
    CREATE POLICY "Authenticated users can create transfers" ON public.transfers FOR INSERT
      WITH CHECK (auth.uid() = sender_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='transfers' AND policyname='Users can update own transfers') THEN
    CREATE POLICY "Users can update own transfers" ON public.transfers FOR UPDATE
      USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='transfers' AND policyname='Users can delete own transfers') THEN
    CREATE POLICY "Users can delete own transfers" ON public.transfers FOR DELETE
      USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
  END IF;
END $$;

GRANT ALL ON public.transfers TO authenticated;
-- Revoke anon SELECT (migration 007 fix)
REVOKE SELECT ON public.transfers FROM anon;


-- ─────────────────────────────────────────────────────────────
-- 2. REALTIME
-- ─────────────────────────────────────────────────────────────

-- Add transfers to realtime publication (safe to re-run)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'transfers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transfers;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.notify_transfer_update()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'transfer_update',
    json_build_object('id', NEW.id, 'status', NEW.status, 'completed_at', NEW.completed_at)::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS transfer_update_trigger ON public.transfers;
CREATE TRIGGER transfer_update_trigger
  AFTER UPDATE ON public.transfers
  FOR EACH ROW EXECUTE FUNCTION public.notify_transfer_update();


-- ─────────────────────────────────────────────────────────────
-- 3. USER PROFILES TABLE
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  display_name   TEXT,
  avatar_icon    TEXT DEFAULT 'person',
  avatar_color   TEXT DEFAULT 'bg-primary',
  is_admin       BOOLEAN DEFAULT FALSE,
  active_peer_id TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_profiles_user_id_idx       ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin      ON public.user_profiles(is_admin) WHERE is_admin = true;
CREATE INDEX IF NOT EXISTS user_profiles_active_peer_id_idx ON public.user_profiles(active_peer_id);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_profiles' AND policyname='Users can view own profile') THEN
    CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_profiles' AND policyname='Users can insert own profile') THEN
    CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_profiles' AND policyname='Users can update own profile') THEN
    CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Restrict authenticated users to non-privileged profile columns only.
-- This prevents self-escalation via updates to sensitive fields like is_admin.
REVOKE UPDATE ON public.user_profiles FROM authenticated;
GRANT UPDATE (display_name, avatar_icon, avatar_color, active_peer_id) ON public.user_profiles TO authenticated;

-- Create a restricted view for peer discovery that only exposes necessary fields
-- This prevents authenticated users from seeing sensitive profile data like is_admin, display_name, etc.
CREATE OR REPLACE VIEW public.peer_discovery AS
SELECT
  user_id,
  active_peer_id
FROM public.user_profiles
WHERE active_peer_id IS NOT NULL;

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.peer_discovery TO authenticated;

CREATE OR REPLACE FUNCTION public.update_user_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profile_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profile_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_user_profile_updated_at();

CREATE OR REPLACE FUNCTION public.create_default_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, display_name, avatar_icon, avatar_color)
  VALUES (NEW.id, 'User', 'person', 'bg-primary');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_default_user_profile();


-- ─────────────────────────────────────────────────────────────
-- 4. INCIDENTS TABLE
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.incidents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
  severity    TEXT NOT NULL CHECK (severity IN ('minor', 'major', 'critical')),
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidents_started_at ON public.incidents(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_status     ON public.incidents(status);

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='incidents' AND policyname='Allow public read access to incidents') THEN
    CREATE POLICY "Allow public read access to incidents" ON public.incidents FOR SELECT USING (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_incidents_updated_at ON public.incidents;
CREATE TRIGGER update_incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ─────────────────────────────────────────────────────────────
-- 5. RPC: claim_transfer
-- Final version: uses auth.uid() — no client-supplied receiver_id
-- Supersedes: 005_claim_transfer_rpc.sql (had IDOR via p_receiver_id)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.claim_transfer(p_transfer_id UUID)
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

REVOKE ALL ON FUNCTION public.claim_transfer(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_transfer(UUID) TO authenticated;


-- ─────────────────────────────────────────────────────────────
-- 6. RPC: get_user_transfer_stats
-- Final version: uses auth.uid() — no IDOR via p_user_id param
-- Supersedes: 008_get_user_transfer_stats_rpc.sql (had IDOR)
-- ─────────────────────────────────────────────────────────────

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

REVOKE ALL ON FUNCTION public.get_user_transfer_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_transfer_stats() TO authenticated;


-- ─────────────────────────────────────────────────────────────
-- 7. ADMIN ROLE — incidents write policies
-- ─────────────────────────────────────────────────────────────

-- AUDIT FIX: Added DROP POLICY IF EXISTS for idempotency
DROP POLICY IF EXISTS "Allow admin users to insert incidents" ON public.incidents;
DROP POLICY IF EXISTS "Allow admin users to update incidents" ON public.incidents;
DROP POLICY IF EXISTS "Allow admin users to delete incidents" ON public.incidents;

CREATE POLICY "Allow admin users to insert incidents"
  ON public.incidents FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Allow admin users to update incidents"
  ON public.incidents FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Allow admin users to delete incidents"
  ON public.incidents FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

-- Helper functions (call via Supabase dashboard or service role)
CREATE OR REPLACE FUNCTION public.make_user_admin(user_email TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_profiles SET is_admin = true
  WHERE user_id = (SELECT id FROM auth.users WHERE email = user_email);
  IF NOT FOUND THEN RAISE NOTICE 'User % not found', user_email;
  ELSE RAISE NOTICE 'User % is now an admin', user_email; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.revoke_user_admin(user_email TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_profiles SET is_admin = false
  WHERE user_id = (SELECT id FROM auth.users WHERE email = user_email);
  IF NOT FOUND THEN RAISE NOTICE 'User % not found', user_email;
  ELSE RAISE NOTICE 'Admin revoked for %', user_email; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restrict admin helpers to service_role only (C6 fix)
REVOKE ALL ON FUNCTION public.make_user_admin(TEXT)    FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_user_admin(TEXT)  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.make_user_admin(TEXT)   TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_user_admin(TEXT) TO service_role;


-- ─────────────────────────────────────────────────────────────
-- 8. GDPR ACCOUNT DELETIONS
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.account_deletions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason     TEXT DEFAULT 'user_requested'
);

ALTER TABLE public.account_deletions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins can view deletion log" ON public.account_deletions;
CREATE POLICY "Only admins can view deletion log"
  ON public.account_deletions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()   -- C4 fix: correct FK column
      AND is_admin = TRUE
    )
  );

DROP POLICY IF EXISTS "Users can log own account deletion" ON public.account_deletions;
CREATE POLICY "Users can log own account deletion"
  ON public.account_deletions FOR INSERT
  WITH CHECK (user_id = auth.uid());

REVOKE ALL ON public.account_deletions FROM PUBLIC;
GRANT INSERT ON public.account_deletions TO authenticated;
GRANT SELECT ON public.account_deletions TO authenticated;

COMMENT ON TABLE public.account_deletions IS
  'GDPR Article 17 compliance log. Records when accounts are deleted and by whom.';

-- ==== DONE! ====
SELECT 'Database reset and complete schema redeployment successful!' as status;
