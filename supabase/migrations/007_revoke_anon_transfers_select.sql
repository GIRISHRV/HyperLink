-- FINDING-014 FIX: Revoke SELECT on public.transfers from the anon role.
-- Unauthenticated users have no business reading transfer metadata
-- (filenames, sizes, sender/receiver UUIDs). RLS protects this at runtime
-- but if RLS is accidentally disabled the data would be fully exposed.
-- Authenticated users retain full access via their RLS policies.

REVOKE SELECT ON public.transfers FROM anon;
