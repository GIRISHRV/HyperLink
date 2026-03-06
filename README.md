# HyperLink

[![CI - Tests](https://github.com/GIRISHRV/HyperLink/actions/workflows/test.yml/badge.svg)](https://github.com/GIRISHRV/HyperLink/actions/workflows/test.yml)

> **High-Speed P2P File Engine using WebRTC and IndexedDB**

HyperLink is a robust, decentralized file-sharing application capable of transferring 10GB+ files between peers without crashing the browser, using a hybrid cloud architecture.

## 🏗️ Architecture

**Monorepo Structure:**

- `apps/web` - [Next.js 14 frontend](https://vercel.com)
- `apps/signaling` - [Node.js PeerServer](https://peerjs.com/peerserver.html)
- `packages/*` - Shared configurations and utilities

**Technology Stack:**

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **P2P:** PeerJS (WebRTC)
- **Storage:** IndexedDB (`idb` wrapper)
- **Auth & DB:** Supabase
- **Signaling:** PeerServer (Node.js)
- **Monitoring:** Sentry (Performance & Error Tracking)

## 🔑 Key Features

- **Zero-Memory Transfer:** No file accumulation in RAM
- **Backpressure Control:** Automatic flow control for large files
- **Direct-to-Disk:** IndexedDB streaming for received chunks
- **Supabase Auth:** Secure authentication
- **Transfer History:** Metadata tracking in Postgres
- **PWA Ready:** Installable with offline support and custom branding
- **Real-time Monitoring:** Sentry integration for client and server-side errors

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm 10+
- Supabase account
- Railway/Render account (for signaling server)

### Installation

```bash
# Install dependencies
npm install

# Start development servers
npm run dev
```

### Environment Setup

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_PEER_SERVER_HOST=localhost
NEXT_PUBLIC_PEER_SERVER_PORT=9000
NEXT_PUBLIC_PEER_SERVER_PATH=/myapp
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
```

## 📦 Project Structure

```text
hyperlink/
├── apps/
│   ├── web/              # Next.js frontend
│   └── signaling/        # PeerServer backend
├── packages/
│   ├── typescript-config/
│   ├── eslint-config/
│   ├── types/
│   └── utils/            # Includes specialized logger
├── supabase/
│   └── migrations/       # Database schema and RLS policies
└── turbo.json
```

## 🛠️ Development

### Logging

The project uses a centralized `logger` from `@repo/utils`. Avoid using `console.log`. Use `logger.info`, `logger.warn`, or `logger.error` which are properly structured for production monitoring.

```bash
# Run all apps
npm run dev

# Build all apps
npm run build

# Lint
npm run lint

# Format code
npm run format
```

## 📝 Documentation

Detailed documentation is available in the [`docs/`](./docs) directory:

- [Main Concepts](./docs/README-main.md)
- [Signaling Server](./docs/README-signaling.md)
- [Supabase Setup](./docs/README-supabase.md)
- [Testing Strategy](./docs/TESTING.md)
- [Versioning Guidelines](./docs/VERSIONING.md)
- [Non-Technical Explainer](./docs/EXPLAINER.md)
- [Technical Audit (The "Holes")](./docs/APP_ANALYSIS.md)

## 📝 License

MIT
