#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if ! command -v supabase >/dev/null 2>&1; then
  echo "Error: Supabase CLI is required for local DB reset."
  echo "Install it first: https://supabase.com/docs/guides/cli"
  exit 1
fi

cd "$REPO_ROOT"

echo "Resetting local Supabase database..."
supabase db reset --local

echo "Local database reset complete."
echo "If needed, grant admin access via SQL:"
echo "SELECT make_user_admin('your-email@example.com');"
