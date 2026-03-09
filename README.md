# HyperLink

[![CI - Tests](https://github.com/GIRISHRV/HyperLink/actions/workflows/test.yml/badge.svg)](https://github.com/GIRISHRV/HyperLink/actions/workflows/test.yml)

> **High-speed P2P file transfer using WebRTC and IndexedDB**

Transfer 10GB+ files directly between browsers without storing them on any server. Zero-memory architecture, end-to-end encryption, and no file size limits.

## ✨ Features

- **Zero-Memory Transfer** - Stream files in chunks, never load entire file into RAM
- **No File Size Limits** - Transfer 10GB, 50GB, or more (disk space permitting)
- **End-to-End Encryption** - WebRTC DTLS encryption by default, with optional password protection
- **No Server Storage** - Files never touch our servers, only metadata
- **Transfer History** - Track your transfers with metadata in Supabase
- **PWA Ready** - Install as app with offline support
- **Real-time Monitoring** - Sentry integration for error tracking

## 🏗️ Tech Stack

**Monorepo Structure** (Turborepo):

- `apps/web` - Next.js 14 frontend (Vercel)
- `apps/signaling` - Node.js PeerServer (Railway)
- `packages/*` - Shared configs and utilities

**Technologies:**

- **Frontend:** Next.js 14, TypeScript, React 18, Tailwind CSS
- **P2P:** PeerJS (WebRTC wrapper)
- **Storage:** IndexedDB (via `idb`)
- **Auth & DB:** Supabase (PostgreSQL + Auth)
- **Monitoring:** Sentry

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ and npm 10+
- Supabase account (free tier works)
- Railway account (optional, for signaling server)

### Installation

```bash
# Clone repository
git clone https://github.com/GIRISHRV/HyperLink.git
cd HyperLink

# Install dependencies
npm install

# Set up environment variables (see docs/guides/GETTING_STARTED.md)
cp apps/web/.env.example apps/web/.env.local
cp apps/signaling/.env.example apps/signaling/.env.local

# Start development servers
npm run dev
```

Frontend: http://localhost:3000  
Signaling Server: http://localhost:9000

**For detailed setup instructions, see [Getting Started Guide](./docs/guides/GETTING_STARTED.md)**

## 📦 Project Structure

```
hyperlink/
├── apps/
│   ├── web/              # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/      # Pages (App Router)
│   │   │   ├── components/ # React components
│   │   │   └── lib/      # Core logic (transfer, peer, storage)
│   │   └── e2e/          # Playwright E2E tests
│   └── signaling/        # PeerServer signaling backend
├── packages/
│   ├── types/            # Shared TypeScript types
│   ├── utils/            # Shared utilities (logger)
│   ├── eslint-config/    # Shared ESLint config
│   └── typescript-config/# Shared TypeScript config
├── supabase/
│   └── migrations/       # Database schema
├── docs/                 # Documentation
└── turbo.json            # Turborepo config
```

## 🛠️ Development

### Commands

```bash
# Development
npm run dev              # Start all apps
npm run dev:web          # Start frontend only
npm run dev:signaling    # Start signaling server only

# Testing
npm test                 # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run test:e2e         # Run E2E tests
npm run test:coverage    # Generate coverage report

# Code Quality
npm run lint             # Lint all code
npm run format           # Format all code
npm run format:check     # Check formatting
npm run validate         # Run all checks (test + lint + typecheck + build)

# Build
npm run build            # Build all apps
```

### Logging

Use the centralized logger from `@repo/utils`:

```typescript
import { logger } from "@repo/utils";

logger.info("Transfer started", { transferId, fileSize });
logger.warn("Connection unstable", { peerId });
logger.error("Transfer failed", { error });
```

**Never use `console.log` in production code.**

### Development Guides

- [Development Guide](./docs/guides/DEVELOPMENT.md) - Patterns, conventions, and workflows
- [Testing Guide](./docs/guides/TESTING.md) - Testing strategies
- [AI Context](./docs/AI_CONTEXT.md) - Comprehensive codebase reference

## � Documentation

Complete documentation is available in the [`docs/`](./docs) directory.

### Quick Links

- **[Documentation Hub](./docs/README.md)** - Start here for all documentation
- **[AI Context](./docs/AI_CONTEXT.md)** - Comprehensive reference for AI assistants and developers

### Guides

- [Getting Started](./docs/guides/GETTING_STARTED.md) - Setup and installation
- [Development Guide](./docs/guides/DEVELOPMENT.md) - Development workflow and patterns
- [Testing Guide](./docs/guides/TESTING.md) - Unit and E2E testing
- [Deployment Guide](./docs/guides/DEPLOYMENT.md) - Production deployment

### Architecture & Specifications

- [System Architecture](./docs/architecture/OVERVIEW.md) - Technical architecture and design
- [Software Requirements Specification](./docs/specifications/SRS.md) - Complete requirements
- [Versioning Guidelines](./docs/specifications/VERSIONING.md) - Version numbering system

## 🚢 Deployment

HyperLink is deployed across three services:

- **Frontend**: Vercel (auto-deploy from `main`)
- **Signaling Server**: Railway (auto-deploy from `main`)
- **Database**: Supabase (managed PostgreSQL)

See [Deployment Guide](./docs/guides/DEPLOYMENT.md) for detailed instructions.

## 🧪 Testing

```bash
# Unit tests (Vitest)
npm test

# E2E tests (Playwright)
npm run test:e2e

# Coverage report
npm run test:coverage
```

Current test coverage: 100% passing (770+ tests)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [Development Guide](./docs/guides/DEVELOPMENT.md) for coding standards and patterns.

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details

## 🙏 Acknowledgments

- [PeerJS](https://peerjs.com/) - WebRTC wrapper
- [Supabase](https://supabase.com/) - Backend infrastructure
- [Next.js](https://nextjs.org/) - React framework
- [Vercel](https://vercel.com/) - Frontend hosting
- [Railway](https://railway.app/) - Signaling server hosting

---

**Version**: 1.0.0  
**Maintainer**: HyperLink Team  
**Repository**: [github.com/GIRISHRV/HyperLink](https://github.com/GIRISHRV/HyperLink)
