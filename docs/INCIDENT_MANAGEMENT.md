# Incident Management System

## Overview

The incident management system allows you to track and display service incidents, maintenance events, and system status updates on the public status page.

## Database Schema

```sql
incidents table:
- id: UUID (primary key)
- title: TEXT (incident title)
- description: TEXT (detailed description)
- status: TEXT (investigating | identified | monitoring | resolved)
- severity: TEXT (minor | major | critical)
- started_at: TIMESTAMPTZ (when incident started)
- resolved_at: TIMESTAMPTZ (when incident was resolved, nullable)
- created_at: TIMESTAMPTZ (record creation time)
- updated_at: TIMESTAMPTZ (last update time)
```

## Setup

1. **Run the migrations:**

   ```bash
   # The migration files will be applied automatically on Supabase deployment
   # - 20260309000000_create_incidents_table.sql (creates incidents table)
   # - 20260310000000_add_admin_role.sql (adds admin role system)
   ```

2. **Make yourself an admin:**

   **Option A: Via Supabase SQL Editor**

   ```sql
   SELECT make_user_admin('your-email@example.com');
   ```

   **Option B: Via Supabase Dashboard**
   - Go to Table Editor → user_profiles
   - Find your user row
   - Set `is_admin` = `true`

   **Option C: Via SQL Direct**

   ```sql
   UPDATE user_profiles
   SET is_admin = true
   WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
   ```

3. **Access the admin panel:**
   - Navigate to `/admin/incidents` (requires authentication + admin role)
   - Create, view, and update incidents

4. **View incidents on status page:**
   - Public status page at `/status` shows last 5 incidents
   - Incidents are color-coded by severity
   - Status updates are shown in real-time
   - Section only appears when incidents exist (no "No incidents" message on public page)

## Database Reset (Local Development)

To reset your local database and re-run all migrations:

```bash
npm run db:reset
```

This will:

1. Stop local Supabase
2. Clean up temporary files
3. Start fresh Supabase instance
4. Run all migrations
5. Provide instructions to make yourself admin

**Note:** This only works with local Supabase (requires Supabase CLI installed)

## Usage

### Creating an Incident

**Via Admin Panel:**

1. Go to `/admin/incidents`
2. Click "New Incident"
3. Fill in the form:
   - Title: Brief description (e.g., "Signaling Server Maintenance")
   - Description: Detailed explanation
   - Status: Current status (investigating/identified/monitoring/resolved)
   - Severity: Impact level (minor/major/critical)
   - Started At: When the incident began
   - Resolved At: (optional) When it was resolved
4. Click "Create Incident"

**Via Supabase Dashboard:**

```sql
INSERT INTO incidents (title, description, status, severity, started_at)
VALUES (
  'Scheduled Maintenance',
  'Routine server updates and security patches',
  'monitoring',
  'minor',
  NOW()
);
```

### Updating Incident Status

**Via Admin Panel:**

- Click status buttons: "Mark Identified", "Mark Monitoring", "Mark Resolved"
- "Mark Resolved" automatically sets `resolved_at` timestamp

**Via Supabase Dashboard:**

```sql
UPDATE incidents
SET status = 'resolved', resolved_at = NOW()
WHERE id = 'incident-uuid';
```

## Severity Levels

- **Minor**: Low impact, informational (blue)
  - Examples: Scheduled maintenance, minor performance degradation
- **Major**: Significant impact, some features affected (yellow)
  - Examples: Slow connections, intermittent issues
- **Critical**: Severe impact, service unavailable (red)
  - Examples: Complete outage, data loss risk

## Status Workflow

1. **Investigating**: Issue detected, team is investigating
2. **Identified**: Root cause found, working on fix
3. **Monitoring**: Fix deployed, monitoring for stability
4. **Resolved**: Issue completely resolved

## API Endpoints

### GET /api/incidents

Returns last 10 incidents, ordered by most recent.

**Response:**

```json
{
  "incidents": [
    {
      "id": "uuid",
      "title": "Scheduled Maintenance",
      "description": "Routine updates",
      "status": "resolved",
      "severity": "minor",
      "started_at": "2026-03-09T10:00:00Z",
      "resolved_at": "2026-03-09T12:00:00Z",
      "created_at": "2026-03-09T10:00:00Z"
    }
  ]
}
```

## Best Practices

1. **Be Transparent**: Update incidents promptly and honestly
2. **Use Appropriate Severity**: Don't overstate or understate impact
3. **Update Status Regularly**: Keep users informed of progress
4. **Resolve Promptly**: Mark incidents as resolved when fixed
5. **Learn from Incidents**: Use history to improve reliability

## Security

**Access Control:**

- **Public Read Access**: Incidents are publicly visible on the `/status` page
  - This is intentional for transparency - users should see service status
  - No authentication required to view incidents
- **Admin Write Access**: Only users with `is_admin = true` can create/update incidents
  - `/admin/incidents` page requires authentication + admin role check
  - Protected by Supabase RLS policies
  - Only admin users can INSERT/UPDATE via database

**Admin Role Management:**

To grant admin access:

```sql
SELECT make_user_admin('user-email@example.com');
```

To revoke admin access:

```sql
SELECT revoke_user_admin('user-email@example.com');
```

Or directly via SQL:

```sql
-- Grant admin
UPDATE user_profiles SET is_admin = true
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'user@example.com');

-- Revoke admin
UPDATE user_profiles SET is_admin = false
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'user@example.com');
```

**Why Public Read?**
Status pages are meant to be transparent. Users need to see:

- Current incidents affecting the service
- Historical incidents and resolutions
- Maintenance schedules

This builds trust and helps users understand service reliability.

**Production Recommendations:**

- Limit admin access to trusted team members only
- Add audit logging for incident changes (track who created/updated)
- Implement approval workflow for critical incidents
- Rate limit the incidents API endpoint
- Consider adding incident templates for common issues
- Set up monitoring alerts to auto-create incidents

## Future Enhancements

- Email notifications for new incidents
- RSS feed for status updates
- Incident templates for common issues
- Automated incident creation from monitoring alerts
- Incident postmortems and root cause analysis
