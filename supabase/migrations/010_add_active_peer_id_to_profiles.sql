-- Add active_peer_id to user_profiles to support stable peer discovery across sessions
alter table user_profiles 
add column if not exists active_peer_id text;

-- Create an index for faster lookups by peer_id (used by signaling/sending)
create index if not exists user_profiles_active_peer_id_idx on user_profiles(active_peer_id);

-- Update RLS to ensure others can look up a user's active_peer_id if they are authorized
-- (Existing policies allow owners to update, but we might need a public lookup policy 
--  if we want to allow senders to find receivers via their User ID)

-- Allow authenticated users to look up other users' active_peer_id
-- (Privacy note: This allows discovery within the app)
create policy "Users can view active_peer_id of others"
    on user_profiles for select
    using (auth.role() = 'authenticated');
