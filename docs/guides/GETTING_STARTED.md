# Getting Started with HyperLink

This guide will help you set up HyperLink for local development.

## Prerequisites

- **Node.js** 20+ and npm 10+
- **Git** for version control
- **Supabase account** (free tier works)
- **Railway account** (optional, for signaling server deployment)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/GIRISHRV/HyperLink.git
cd HyperLink
```

### 2. Install Dependencies

```bash
npm install
```

This installs dependencies for all apps and packages in the monorepo.

### 3. Set Up Environment Variables

#### Frontend (`apps/web/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_PEER_SERVER_HOST=localhost
NEXT_PUBLIC_PEER_SERVER_PORT=9000
NEXT_PUBLIC_PEER_SERVER_PATH=/myapp
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
```

#### Signaling Server (`apps/signaling/.env.local`)

```env
PORT=9000
SUPABASE_JWT_SECRET=your_jwt_secret
ALLOWED_ORIGIN=http://localhost:3000
```

### 4. Set Up Supabase

#### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your_project_ref

# Apply migrations
supabase db push
```

#### Option B: Manual Setup via Dashboard

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **SQL Editor**
3. Copy and run the migration from `supabase/migrations/001_create_transfers_table.sql`

### 5. Start Development Servers

```bash
npm run dev
```

This starts:
- **Frontend**: http://localhost:3000
- **Signaling Server**: http://localhost:9000

## Project Structure

```
hyperlink/
├── apps/
│   ├── web/              # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/      # Pages (App Router)
│   │   │   ├── components/ # React components
│   │   │   └── lib/      # Core logic
│   │   └── e2e/          # E2E tests
│   └── signaling/        # PeerServer backend
│       └── src/
│           └── index.ts  # Express server
├── packages/
│   ├── types/            # Shared types
│   ├── utils/            # Shared utilities
│   ├── eslint-config/    # Shared ESLint
│   └── typescript-config/# Shared TypeScript
├── supabase/
│   └── migrations/       # Database migrations
└── docs/                 # Documentation
```

## Verify Installation

### 1. Check Frontend

Open http://localhost:3000 in your browser. You should see the HyperLink landing page.

### 2. Check Signaling Server

```bash
curl http://localhost:9000/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "HyperLink Signaling Server",
  "uptime": 123.45,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 3. Run Tests

```bash
# Unit tests
npm test

# E2E tests (requires browsers installed)
npm run test:e2e
```

## Common Issues

### Port Already in Use

If port 3000 or 9000 is already in use:

```bash
# Kill process on port 3000 (macOS/Linux)
lsof -ti:3000 | xargs kill -9

# Kill process on port 9000
lsof -ti:9000 | xargs kill -9
```

### Supabase Connection Error

- Verify your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Check that your Supabase project is active
- Ensure migrations have been applied

### WebRTC Connection Fails

- Ensure signaling server is running on port 9000
- Check that `NEXT_PUBLIC_PEER_SERVER_HOST` is set to `localhost`
- Verify firewall isn't blocking WebRTC traffic

## Next Steps

- [Development Guide](./DEVELOPMENT.md) - Learn development workflow and patterns
- [Testing Guide](./TESTING.md) - Write and run tests
- [Architecture Overview](../architecture/OVERVIEW.md) - Understand system design
- [AI Context](../AI_CONTEXT.md) - Comprehensive codebase reference

## Need Help?

- **Issues**: [GitHub Issues](https://github.com/GIRISHRV/HyperLink/issues)
- **Discussions**: [GitHub Discussions](https://github.com/GIRISHRV/HyperLink/discussions)

---

**Last Updated**: 2024
