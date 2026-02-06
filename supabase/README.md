# Supabase Migrations

This directory contains SQL migrations for the HyperLink database schema.

## Setup

1. **Install Supabase CLI** (optional, for local development):

   ```bash
   npm install -g supabase
   ```

2. **Link to your Supabase project**:

   ```bash
   supabase link --project-ref glqnegwnlafuvdbvsbbg
   ```

3. **Apply migrations**:
   ```bash
   supabase db push
   ```

## Manual Migration (via Supabase Dashboard)

If you prefer not to use the CLI:

1. Go to your [Supabase Dashboard](https://glqnegwnlafuvdbvsbbg.supabase.co)
2. Navigate to **SQL Editor**
3. Copy the contents of `001_create_transfers_table.sql`
4. Paste and run the migration

## Schema Overview

### `transfers` table

Stores metadata about file transfers (NOT the actual files):

| Column         | Type        | Description          |
| -------------- | ----------- | -------------------- |
| `id`           | UUID        | Primary key          |
| `filename`     | TEXT        | Original filename    |
| `file_size`    | BIGINT      | File size in bytes   |
| `sender_id`    | UUID        | User ID of sender    |
| `receiver_id`  | UUID        | User ID of receiver  |
| `status`       | TEXT        | Transfer status      |
| `created_at`   | TIMESTAMPTZ | Creation timestamp   |
| `completed_at` | TIMESTAMPTZ | Completion timestamp |

### `user_profiles` table

Stores user profile information (synchronized with Auth users):

| Column         | Type        | Description               |
| -------------- | ----------- | ------------------------- |
| `id`           | UUID        | Primary key               |
| `user_id`      | UUID        | References auth.users     |
| `display_name` | TEXT        | Custom display name       |
| `avatar_icon`  | TEXT        | Material symbol icon name |
| `avatar_color` | TEXT        | Tailwind color class      |
| `created_at`   | TIMESTAMPTZ | Creation timestamp        |
| `updated_at`   | TIMESTAMPTZ | Last update timestamp     |

### Row Level Security

- Users can only view transfers they're involved in (sender or receiver)
- Only authenticated users can create transfers
- Users can update their own transfers

## Important Notes

- **NO file data is stored in Supabase**
- Only metadata for tracking transfer history
- Files are transferred P2P via WebRTC
- File chunks stored temporarily in browser IndexedDB
