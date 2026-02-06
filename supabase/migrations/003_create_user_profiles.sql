-- Create user_profiles table for storing user customization settings
create table if not exists user_profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade unique not null,
    display_name text,
    avatar_icon text default 'person',
    avatar_color text default 'bg-primary',
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Create index on user_id for faster lookups
create index user_profiles_user_id_idx on user_profiles(user_id);

-- Enable RLS
alter table user_profiles enable row level security;

-- Policies: Users can only read and update their own profile
create policy "Users can view own profile"
    on user_profiles for select
    using (auth.uid() = user_id);

create policy "Users can insert own profile"
    on user_profiles for insert
    with check (auth.uid() = user_id);

create policy "Users can update own profile"
    on user_profiles for update
    using (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
create or replace function update_user_profile_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Trigger to call the function
create trigger update_user_profile_updated_at
    before update on user_profiles
    for each row
    execute function update_user_profile_updated_at();

-- Function to create default profile on user signup
create or replace function create_default_user_profile()
returns trigger as $$
begin
    insert into user_profiles (user_id, display_name, avatar_icon, avatar_color)
    values (
        new.id,
        split_part(new.email, '@', 1),
        'person',
        'bg-primary'
    );
    return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile when user signs up
create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute function create_default_user_profile();
