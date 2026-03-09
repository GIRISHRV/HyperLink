# HyperLink - AI Assistant Context

> **Priority: CRITICAL** - Read this file first when working with the HyperLink codebase

## Project Overview

**HyperLink** is a high-speed P2P file transfer application enabling direct browser-to-browser transfers of 10GB+ files using WebRTC, without storing files on any server.

**Core Stack:**
- **Frontend**: Next.js 14 (App Router), TypeScript, React 18, Tailwind CSS
- **P2P**: PeerJS (WebRTC), WebRTC Data Channels
- **Storage**: IndexedDB (via `idb`)
- **Auth & DB**: Supabase (PostgreSQL + Auth)
- **Signaling**: Custom PeerServer (Node.js + Express)
- **Monitoring**: Sentry
- **Testing**: Vitest (unit), Playwright (E2E)

**Monorepo Structure** (Turborepo):
```
hyperlink/
├── apps/
│   ├── web/              # Next.js frontend (Vercel)
│   └── signaling/        # PeerServer backend (Railway)
├── packages/
│   ├── types/            # Shared TypeScript types
│   ├── utils/            # Shared utilities (logger)
│   ├── eslint-config/    # Shared ESLint config
│   └── typescript-config/# Shared TS config
├── supabase/
│   └── migrations/       # Database schema
└── docs/                 # Documentation
```

## Critical Architecture Patterns

### 1. Zero-Memory File Transfer

**Problem**: Loading large files into RAM crashes browsers.

**Solution**: Streaming architecture with chunking and backpressure control.

**Key Components:**
- `FileSender` (`apps/web/src/lib/transfer/sender.ts`): Reads file in 64KB chunks, sends via WebRTC
- `FileReceiver` (`apps/web/src/lib/transfer/receiver.ts`): Receives chunks, writes to IndexedDB
- **Sliding Window Protocol**: Max 16 chunks in-flight, waits for ACKs before sending more

**Code Pattern:**
```typescript
// Sender: Read chunk, send, wait for ACK
const chunk = await readChunk(file, offset, CHUNK_SIZE);
dataChannel.send(chunk);
await waitForAck(chunkIndex);

// Receiver: Receive chunk, write to IndexedDB, send ACK
dataChannel.onmessage = async (event) => {
  await saveChunkToIndexedDB(chunkIndex, event.data);
  sendAck(chunkIndex);
};
```

### 2. WebRTC Connection Management

**PeerManager** (`apps/web/src/lib/peer/PeerManager.ts`):
- Singleton pattern (via React ref)
- Manages PeerJS instance lifecycle
- Handles connection state
- Provides event-driven API

**Connection Flow:**
1. Both users authenticate with Supabase
2. Sender creates Peer with ID from Supabase
3. Sender generates connection code (Peer ID)
4. Receiver enters code, connects to sender's Peer ID
5. WebRTC data channel established
6. File transfer begins

**Critical**: Always check `dataChannel.readyState === 'open'` before sending.

### 3. IndexedDB Storage Pattern

**Database**: `hyperlink-db`

**Stores:**
- `chunks`: File chunks during transfer
  - Key: `${transferId}-${chunkIndex}`
  - Value: `Uint8Array`
- `metadata`: Transfer metadata
  - Key: `transferId`
  - Value: `{ fileName, fileSize, totalChunks, receivedChunks }`

**Pattern:**
```typescript
import { openDB } from 'idb';

const db = await openDB('hyperlink-db', 1, {
  upgrade(db) {
    db.createObjectStore('chunks');
    db.createObjectStore('metadata');
  }
});

// Write chunk
await db.put('chunks', chunkData, `${transferId}-${chunkIndex}`);

// Read all chunks (for assembly)
const keys = await db.getAllKeys('chunks');
const chunks = await Promise.all(keys.map(k => db.get('chunks', k)));
```

### 4. Supabase Integration

**Tables:**
- `profiles`: User profiles (linked to auth.users)
- `transfers`: Transfer history metadata
- `transfer_participants`: Many-to-many relationship

**Auth Pattern:**
```typescript
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();

// All API routes use middleware for auth
// See: apps/web/src/middleware.ts
```

**RLS Policies**: All tables have Row Level Security enabled.

### 5. Custom Hooks Pattern

**Key Hooks:**
- `useSendTransfer`: Manages file sending state and logic
- `useReceiveTransfer`: Manages file receiving state and logic
- `usePeerConnection`: Manages WebRTC connection state
- `useTransferHistory`: Fetches transfer history from Supabase
- `useWakeLock`: Prevents system sleep during transfers

**Hook Pattern:**
```typescript
export function useSendTransfer(peerManagerRef: RefObject<PeerManager>) {
  const [state, setState] = useState<TransferState>('idle');
  const [progress, setProgress] = useState(0);
  
  const sendFile = useCallback(async (file: File) => {
    // Implementation
  }, [peerManagerRef]);
  
  return { state, progress, sendFile };
}
```

## Key Components

### Frontend (`apps/web/src/`)

**Pages** (App Router):
- `/` - Landing page (public)
- `/app` - Main app (protected)
- `/app/send` - Send file interface
- `/app/receive` - Receive file interface
- `/app/history` - Transfer history
- `/auth` - Authentication pages

**Core Components:**
- `FileTransfer` - Main transfer orchestrator
- `SendTransfer` - File sending UI
- `ReceiveTransfer` - File receiving UI
- `TransferHistory` - History list
- `PeerConnectionStatus` - Connection indicator

**Transfer Logic:**
- `lib/transfer/sender.ts` - File sending protocol
- `lib/transfer/receiver.ts` - File receiving protocol
- `lib/peer/PeerManager.ts` - WebRTC management
- `lib/storage/indexeddb.ts` - IndexedDB utilities

### Signaling Server (`apps/signaling/src/`)

**Purpose**: WebRTC signaling (peer discovery and connection establishment)

**Key Features:**
- JWT authentication (validates Supabase tokens)
- Rate limiting (100 req/15min per IP)
- CORS enabled for frontend origin
- Health check endpoint

**Code:**
```typescript
// apps/signaling/src/index.ts
import { ExpressPeerServer } from 'peer';
import express from 'express';

const app = express();
const server = app.listen(PORT);

const peerServer = ExpressPeerServer(server, {
  path: '/myapp',
  allow_discovery: false, // Security: disable peer listing
});

app.use('/myapp', peerServer);
```

## Common Development Tasks

### Task 1: Add New Transfer Feature

1. **Update Transfer Protocol**: Modify `sender.ts` or `receiver.ts`
2. **Update Hook**: Modify `useSendTransfer` or `useReceiveTransfer`
3. **Update UI**: Modify component in `components/transfer/`
4. **Add Tests**: Unit test in `__tests__/`, E2E test in `e2e/`

### Task 2: Add New API Endpoint

```typescript
// apps/web/src/app/api/my-endpoint/route.ts
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Implementation
  return Response.json({ data });
}
```

### Task 3: Add New Component

```typescript
// apps/web/src/components/MyComponent.tsx
import { FC } from 'react';

interface MyComponentProps {
  // Props
}

export const MyComponent: FC<MyComponentProps> = ({ }) => {
  return <div>Component</div>;
};
```

### Task 4: Debug Transfer Issues

**Common Issues:**
1. **Transfer Stuck**: Check ACK handling in receiver
2. **Connection Failed**: Check TURN server credentials
3. **File Corrupted**: Verify chunk ordering and assembly
4. **Memory Leak**: Check for missing cleanup in useEffect

**Debugging Tools:**
- Browser DevTools > Application > IndexedDB
- Chrome > chrome://webrtc-internals
- Sentry error logs
- Logger output (use `logger.info`, not `console.log`)

## File Structure Navigation

**Finding Components:**
- UI Components: `apps/web/src/components/`
- Pages: `apps/web/src/app/`
- Hooks: `apps/web/src/lib/hooks/`
- Transfer Logic: `apps/web/src/lib/transfer/`
- API Routes: `apps/web/src/app/api/`

**Finding Tests:**
- Unit Tests: `__tests__/` next to source files
- E2E Tests: `apps/web/e2e/`
- Test Utilities: `apps/web/src/test-utils/`

**Finding Configuration:**
- TypeScript: `tsconfig.json` (per app)
- ESLint: `.eslintrc.json` (per app)
- Tailwind: `tailwind.config.ts` (web app)
- Next.js: `next.config.js` (web app)
- Vitest: `vitest.config.ts` (web app)
- Playwright: `playwright.config.ts` (web app)

## Testing Patterns

### Unit Testing (Vitest)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('MyComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('handles user interaction', async () => {
    const user = userEvent.setup();
    render(<MyComponent />);
    
    await user.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText('Success')).toBeInTheDocument();
    });
  });
});
```

### E2E Testing (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test('user can send file', async ({ page }) => {
  await page.goto('/app/send');
  
  await page.setInputFiles('input[type="file"]', 'test-file.txt');
  await page.click('button:has-text("Send")');
  
  await expect(page.locator('text=Transfer Complete')).toBeVisible();
});
```

## Logging Best Practices

**NEVER use `console.log`**. Always use the centralized logger:

```typescript
import { logger } from '@repo/utils';

logger.info('Transfer started', { transferId, fileSize });
logger.warn('Connection unstable', { peerId });
logger.error('Transfer failed', { error, transferId });
```

## Environment Variables

**Web App** (`.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
NEXT_PUBLIC_PEER_SERVER_HOST=localhost
NEXT_PUBLIC_PEER_SERVER_PORT=9000
NEXT_PUBLIC_PEER_SERVER_PATH=/myapp
NEXT_PUBLIC_SENTRY_DSN=xxx
```

**Signaling Server** (`.env.local`):
```env
PORT=9000
SUPABASE_JWT_SECRET=xxx
ALLOWED_ORIGIN=http://localhost:3000
```

## Quick Reference

**Start Development:**
```bash
npm install
npm run dev  # Starts all apps
```

**Run Tests:**
```bash
npm test              # Unit tests
npm run test:e2e      # E2E tests
npm run test:coverage # Coverage report
```

**Build:**
```bash
npm run build  # Builds all apps
```

**Lint & Format:**
```bash
npm run lint          # Lint all apps
npm run format        # Format all files
```

## Code Generation Guidelines

When generating code for HyperLink:

1. **Use TypeScript**: All code must be TypeScript with proper types
2. **Use Logger**: Never use `console.log`, always use `logger` from `@repo/utils`
3. **Follow Patterns**: Match existing patterns for hooks, components, and APIs
4. **Add Tests**: Every new feature needs unit tests and E2E tests
5. **Handle Errors**: Always handle errors gracefully with user-friendly messages
6. **Use Supabase**: For auth and data persistence
7. **Optimize Performance**: Consider memory usage for large file operations
8. **Security First**: Validate all inputs, use RLS policies, sanitize data

## Known Limitations

- File System Access API not supported on mobile (falls back to IndexedDB)
- Both peers must be online simultaneously
- Transfer pauses if either peer closes browser
- Maximum file size limited by available disk space

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Maintainer**: HyperLink Team
