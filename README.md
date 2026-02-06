# HyperLink

> **High-Speed P2P File Engine using WebRTC and IndexedDB**

A decentralized file-sharing application capable of transferring 10GB+ files between peers without crashing the browser, using a hybrid cloud architecture.

## 🏗️ Architecture

**Monorepo Structure:**

- `apps/web` - Next.js 14 frontend (Vercel)
- `apps/signaling` - Node.js PeerServer (Railway)
- `packages/*` - Shared configurations and utilities

**Technology Stack:**

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **P2P:** PeerJS (WebRTC)
- **Storage:** IndexedDB (`idb` wrapper)
- **Auth & DB:** Supabase
- **Signaling:** PeerServer (Node.js)

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm 10+
- Supabase account
- Railway account (for signaling server)

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
```

## 📦 Project Structure

```
hyperlink/
├── apps/
│   ├── web/              # Next.js frontend
│   └── signaling/        # PeerServer backend
├── packages/
│   ├── typescript-config/
│   ├── eslint-config/
│   ├── types/
│   └── utils/
├── supabase/
│   └── migrations/
└── turbo.json
```

## 🔑 Key Features

- **Zero-Memory Transfer:** No file accumulation in RAM
- **Backpressure Control:** Automatic flow control for large files
- **Direct-to-Disk:** IndexedDB streaming for received chunks
- **Supabase Auth:** Secure authentication
- **Transfer History:** Metadata tracking in Postgres

## 🛠️ Development

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

## 📝 License

MIT
