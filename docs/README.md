# HyperLink Documentation

> High-speed P2P file transfer using WebRTC and IndexedDB

## Quick Start

**New to HyperLink?** Start here:

1. [Project Overview](#project-overview) - What is HyperLink?
2. [Getting Started](./guides/GETTING_STARTED.md) - Setup and installation
3. [Architecture](./architecture/OVERVIEW.md) - System design
4. [Development Guide](./guides/DEVELOPMENT.md) - Contributing to the project

**For AI Assistants:** See [AI Context](./AI_CONTEXT.md) for comprehensive codebase reference.

## Project Overview

HyperLink enables direct browser-to-browser file transfers of 10GB+ files using WebRTC, without storing files on any server.

**Key Features:**

- Zero-memory transfer architecture
- End-to-end encryption
- No file size limits (disk space permitting)
- Transfer history tracking
- PWA with offline support

**Tech Stack:** Next.js 14, TypeScript, WebRTC (PeerJS), IndexedDB, Supabase, Node.js

## Documentation Structure

```
docs/
├── README.md                    # This file - documentation hub
├── AI_CONTEXT.md               # Comprehensive AI assistant reference
├── architecture/               # System architecture
│   └── OVERVIEW.md            # Architecture diagrams and design
├── guides/                     # User and developer guides
│   ├── GETTING_STARTED.md     # Setup and installation
│   ├── DEVELOPMENT.md         # Development workflow
│   ├── DEPLOYMENT.md          # Deployment instructions
│   └── TESTING.md             # Testing guide
└── specifications/            # Formal specifications
    ├── SRS.md                 # Software Requirements Specification
    └── VERSIONING.md          # Version numbering system
```

## Core Documentation

### Architecture & Design

- [System Architecture](./architecture/OVERVIEW.md) - High-level system design, components, and data flow
- [Software Requirements](./specifications/SRS.md) - Complete functional and non-functional requirements

### Development Guides

- [Getting Started](./guides/GETTING_STARTED.md) - Environment setup and first steps
- [Development Guide](./guides/DEVELOPMENT.md) - Development workflow, patterns, and conventions
- [Testing Guide](./guides/TESTING.md) - Unit, integration, and E2E testing
- [Deployment Guide](./guides/DEPLOYMENT.md) - Production deployment instructions

### Reference

- [AI Context](./AI_CONTEXT.md) - Comprehensive reference for AI assistants
- [Versioning](./specifications/VERSIONING.md) - Version numbering guidelines

## Quick Links

### By Role

**Frontend Developer:**

- [AI Context](./AI_CONTEXT.md) - Quick reference
- [Development Guide](./guides/DEVELOPMENT.md) - Patterns and conventions
- [Architecture](./architecture/OVERVIEW.md) - Component structure

**Backend Developer:**

- [Deployment Guide](./guides/DEPLOYMENT.md) - Signaling server setup
- [Architecture](./architecture/OVERVIEW.md) - System components

**QA Engineer:**

- [Testing Guide](./guides/TESTING.md) - Testing strategies
- [SRS](./specifications/SRS.md) - Requirements and acceptance criteria

**Product Manager:**

- [SRS](./specifications/SRS.md) - Complete requirements
- [Architecture](./architecture/OVERVIEW.md) - Technical overview

### By Topic

**Authentication:** [SRS §3.1](./specifications/SRS.md#31-user-authentication) | [Architecture](./architecture/OVERVIEW.md#4-authentication-supabase-auth)

**File Transfer:** [SRS §3.3](./specifications/SRS.md#33-file-transfer) | [AI Context](./AI_CONTEXT.md#1-zero-memory-file-transfer)

**WebRTC & P2P:** [SRS §3.2](./specifications/SRS.md#32-peer-connection) | [Architecture](./architecture/OVERVIEW.md#2-signaling-server-peerserver)

**Testing:** [Testing Guide](./guides/TESTING.md) | [SRS §9](./specifications/SRS.md#9-traceability-matrix)

**Deployment:** [Deployment Guide](./guides/DEPLOYMENT.md) | [Architecture](./architecture/OVERVIEW.md#deployment-architecture)

## Contributing

When updating documentation:

1. Keep it concise and actionable
2. Use examples and code snippets
3. Update this README if adding new documents
4. Follow the existing structure and style

## Support

- **Issues:** [GitHub Issues](https://github.com/GIRISHRV/HyperLink/issues)
- **Discussions:** [GitHub Discussions](https://github.com/GIRISHRV/HyperLink/discussions)

---

**Version:** 1.0.0  
**License:** MIT
