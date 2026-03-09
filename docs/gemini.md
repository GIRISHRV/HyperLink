# HyperLink - Gemini AI Context

## 🎯 Project Summary

HyperLink is a **P2P file transfer application** that enables direct browser-to-browser transfers of files up to 10GB+ using WebRTC technology, without storing files on any intermediate server.

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14 + TypeScript | Web application framework |
| P2P | PeerJS + WebRTC | Direct peer-to-peer connections |
| Storage | IndexedDB | Browser-based chunk storage |
| Auth | Supabase | User authentication |
| Database | PostgreSQL (Supabase) | Transfer metadata |
| Signaling | Node.js + Express | WebRTC peer discovery |
| Testing | Vitest + Playwright | Unit and E2E testing |
| Monitoring | Sentry | Error tracking |

### Project Structure

```
hyperlink/
├── apps/
│   ├── web/              # Next.js frontend application
│   │   ├── src/
│   │   │   ├── app/      # Next.js App Router pages
│   │   │   ├── components/ # React components
│   │   │   ├── lib/      # Core logic (transfer, peer, storage)
│   │   │   └── middleware.ts # Auth middleware
│   │   ├── e2e/          # Playwright E2E tests
│   │   └── public/       # Static assets
│   └── signaling/        # PeerServer signaling backend
│       └── src/
│           └── index.ts  # Express server with PeerJS
├── packages/
│   ├── types/            # Shared TypeScript types
│   ├── utils/            # Shared utilities (logger)
│   ├── eslint-config/    # Shared linting config
│   └── typescript-config/# Shared TypeScript config
├── supabase/
│   └── migrations/       # Database schema migrations
└── docs/                 # Documentation
```

## 🏗️ Core Architecture

### 1. File Transfer Protocol

**Challenge**: Transfer 10GB+ files without crashing the browser

**Solution**: Chunked streaming with backpressure control

```
┌─────────────┐                           ┌─────────────┐
│   Sender    │                           │  Receiver   │
└──────┬──────┘                           └──────┬──────┘
       │                                         │
       │  1. Read 64KB chunk from file          │
       ├────────────────────────────────────────>│
       │  2. Send chunk via WebRTC              │
       │                                         │
       │                                         │  3. Write chunk to IndexedDB
       │                                         │
       │  4. Send ACK                            │
       │<────────────────────────────────────────┤
       │                                         │
       │  5. Repeat (max 16 chunks in-flight)   │
       │                                         │
```

**Key Files**:
- `apps/web/src/lib/transfer/sender.ts` - File sending logic
- `apps/web/src/lib/transfer/receiver.ts` - File receiving logic

**Protocol Features**:
- **Sliding Window**: Maximum 16 chunks in-flight at once
- **Backpressure**: Sender waits for ACKs before sending more
- **Chunk Size**: 64KB per chunk (configurable)
- **ACK Resilience**: Heartbeat probes prevent deadlocks

### 2. WebRTC Connection Management

**PeerManager** (`apps/web/src/lib/peer/PeerManager.ts`):
- Manages PeerJS instance lifecycle
- Handles connection state transitions
- Provides event-driven API for components

**Connection Flow**:
```
Sender                    Signaling Server              Receiver
  │                              │                          │
  │  1. Create Peer with ID      │                          │
  ├─────────────────────────────>│                          │
  │                              │                          │
  │  2. Generate connection code │                          │
  │     (Peer ID)                │                          │
  │                              │                          │
  │                              │  3. Enter code           │
  │                              │<─────────────────────────┤
  │                              │                          │
  │                              │  4. Request connection   │
  │<─────────────────────────────┼──────────────────────────┤
  │                              │                          │
  │  5. WebRTC handshake (ICE)   │                          │
  │<─────────────────────────────┼─────────────────────────>│
  │                              │                          │
  │  6. Data channel established │                          │
  │<────────────────────────────────────────────────────────>│
```

### 3. Storage Architecture

**IndexedDB Schema**:

```typescript
Database: 'hyperlink-db'
├── Store: 'chunks'
│   ├── Key: `${transferId}-${chunkIndex}`
│   └── Value: Uint8Array (chunk data)
└── Store: 'metadata'
    ├── Key: transferId
    └── Value: {
          fileName: string,
          fileSize: number,
          totalChunks: number,
          receivedChunks: number[]
        }
```

**Storage Pattern**:
1. Receiver writes each chunk to IndexedDB immediately
2. Metadata tracks which chunks have been received
3. On completion, chunks are assembled into final file
4. Chunks are deleted after successful assembly

**File**: `apps/web/src/lib/storage/indexeddb.ts`

### 4. Authentication & Database

**Supabase Integration**:

**Tables**:
- `profiles` - User profiles (1:1 with auth.users)
- `transfers` - Transfer history metadata
- `transfer_participants` - Many-to-many relationship

**Auth Flow**:
```typescript
// Client-side
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();

// Server-side (API routes)
import { createClient } from '@/lib/supabase/server';
const supabase = createClient();
// Automatically uses cookies for auth
```

**Security**: All tables use Row Level Security (RLS) policies

## 📦 Key Components

### Frontend Components

| Component | Path | Purpose |
|-----------|------|---------|
| FileTransfer | `components/transfer/FileTransfer.tsx` | Main transfer orchestrator |
| SendTransfer | `components/transfer/SendTransfer.tsx` | File sending UI |
| ReceiveTransfer | `components/transfer/ReceiveTransfer.tsx` | File receiving UI |
| TransferHistory | `components/history/TransferHistory.tsx` | Transfer history list |
| PeerConnectionStatus | `components/peer/PeerConnectionStatus.tsx` | Connection indicator |

### Custom Hooks

| Hook | Path | Purpose |
|------|------|---------|
| useSendTransfer | `lib/hooks/use-send-transfer.ts` | File sending state & logic |
| useReceiveTransfer | `lib/hooks/use-receive-transfer.ts` | File receiving state & logic |
| usePeerConnection | `lib/hooks/use-peer-connection.ts` | WebRTC connection state |
| useTransferHistory | `lib/hooks/use-transfer-history.ts` | Fetch transfer history |
| useWakeLock | `lib/hooks/use-wake-lock.ts` | Prevent system sleep |

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/turn-credentials` | GET | Fetch TURN server credentials |
| `/api/transfers` | GET | Fetch user's transfer history |
| `/api/transfers` | POST | Create new transfer record |
| `/api/transfers/[id]` | PATCH | Update transfer status |

## 🛠️ Development Workflows

### Adding a New Feature

**Step 1: Update Transfer Protocol** (if needed)
```typescript
// apps/web/src/lib/transfer/sender.ts or receiver.ts

// Add new message type
type TransferMessage = 
  | { type: 'chunk'; data: Uint8Array }
  | { type: 'ack'; chunkIndex: number }
  | { type: 'my-new-message'; payload: any }; // Add here

// Handle new message
dataChannel.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'my-new-message':
      // Handle new message
      break;
  }
};
```

**Step 2: Update Hook**
```typescript
// apps/web/src/lib/hooks/use-send-transfer.ts

export function useSendTransfer(peerManagerRef) {
  // Add new state
  const [myNewState, setMyNewState] = useState();
  
  // Add new callback
  const handleNewFeature = useCallback(() => {
    // Implementation
  }, []);
  
  return { 
    // Existing exports
    myNewState, 
    handleNewFeature 
  };
}
```

**Step 3: Update UI Component**
```typescript
// apps/web/src/components/transfer/SendTransfer.tsx

export function SendTransfer() {
  const { myNewState, handleNewFeature } = useSendTransfer(peerManagerRef);
  
  return (
    <div>
      {/* Add UI for new feature */}
      <button onClick={handleNewFeature}>
        New Feature
      </button>
    </div>
  );
}
```

**Step 4: Add Tests**
```typescript
// apps/web/src/components/transfer/__tests__/SendTransfer.test.tsx

describe('SendTransfer', () => {
  it('handles new feature', async () => {
    render(<SendTransfer />);
    
    await userEvent.click(screen.getByText('New Feature'));
    
    expect(screen.getByText('Success')).toBeInTheDocument();
  });
});
```

### Creating a New API Endpoint

```typescript
// apps/web/src/app/api/my-endpoint/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // 1. Authenticate user
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' }, 
      { status: 401 }
    );
  }
  
  // 2. Fetch data
  const { data, error: dbError } = await supabase
    .from('my_table')
    .select('*')
    .eq('user_id', user.id);
  
  if (dbError) {
    return NextResponse.json(
      { error: dbError.message }, 
      { status: 500 }
    );
  }
  
  // 3. Return response
  return NextResponse.json({ data });
}
```

### Creating a New Component

```typescript
// apps/web/src/components/MyComponent.tsx

import { FC } from 'react';

interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export const MyComponent: FC<MyComponentProps> = ({ 
  title, 
  onAction 
}) => {
  return (
    <div className="p-4 border rounded">
      <h2 className="text-xl font-bold">{title}</h2>
      <button 
        onClick={onAction}
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Action
      </button>
    </div>
  );
};
```

**With Tests**:
```typescript
// apps/web/src/components/__tests__/MyComponent.test.tsx

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('renders with title', () => {
    render(<MyComponent title="Test" onAction={() => {}} />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
  
  it('calls onAction when button clicked', async () => {
    const onAction = vi.fn();
    render(<MyComponent title="Test" onAction={onAction} />);
    
    await userEvent.click(screen.getByRole('button'));
    
    expect(onAction).toHaveBeenCalledOnce();
  });
});
```

## 🧪 Testing Patterns

### Unit Testing with Vitest

**Test Structure**:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('ComponentName', () => {
  beforeEach(() => {
    // Setup before each test
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    // Cleanup after each test
    vi.restoreAllMocks();
  });
  
  it('test description', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Component />);
    
    // Act
    await user.click(screen.getByRole('button'));
    
    // Assert
    await waitFor(() => {
      expect(screen.getByText('Result')).toBeInTheDocument();
    });
  });
});
```

**Mocking WebRTC**:
```typescript
// Mock RTCPeerConnection
global.RTCPeerConnection = vi.fn(() => ({
  createDataChannel: vi.fn(() => ({
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn(),
  })),
  setLocalDescription: vi.fn(),
  setRemoteDescription: vi.fn(),
  addIceCandidate: vi.fn(),
  close: vi.fn(),
}));
```

**Mocking Supabase**:
```typescript
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn(() => ({
        data: { user: { id: 'test-user-id' } },
        error: null,
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: [],
          error: null,
        })),
      })),
    })),
  }),
}));
```

### E2E Testing with Playwright

**Test Structure**:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('user can complete action', async ({ page }) => {
    // Navigate
    await page.goto('/app');
    
    // Interact
    await page.click('button:has-text("Action")');
    await page.fill('input[name="field"]', 'value');
    await page.click('button:has-text("Submit")');
    
    // Assert
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

**Authenticated Tests**:
```typescript
// Use setup project for authentication
test.use({ storageState: 'e2e/.auth/user.json' });

test('authenticated user can access protected page', async ({ page }) => {
  await page.goto('/app/dashboard');
  await expect(page).toHaveURL('/app/dashboard');
});
```

## 📝 Code Conventions

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `FileTransfer`, `SendButton` |
| Hooks | camelCase with `use` prefix | `useSendTransfer`, `usePeerConnection` |
| Functions | camelCase | `sendFile`, `handleConnection` |
| Constants | UPPER_SNAKE_CASE | `CHUNK_SIZE`, `MAX_RETRIES` |
| Types/Interfaces | PascalCase | `TransferState`, `PeerConfig` |
| Files (components) | PascalCase.tsx | `FileTransfer.tsx` |
| Files (utilities) | kebab-case.ts | `file-utils.ts` |

### Import Ordering

```typescript
// 1. External dependencies
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. Internal dependencies (absolute imports)
import { logger } from '@repo/utils';
import { TransferState } from '@repo/types';

// 3. Local imports (relative)
import { PeerManager } from '../peer/PeerManager';
import { sendChunk } from './utils';

// 4. Types
import type { FC } from 'react';
import type { Transfer } from '@/types';
```

### Logging

**CRITICAL**: Never use `console.log`. Always use the centralized logger:

```typescript
import { logger } from '@repo/utils';

// Good ✅
logger.info('Transfer started', { transferId, fileSize });
logger.warn('Connection unstable', { peerId, latency });
logger.error('Transfer failed', { error, transferId });

// Bad ❌
console.log('Transfer started');
console.error(error);
```

**Logger Benefits**:
- Structured logging (JSON in production)
- Automatic Sentry integration
- Consistent formatting
- Contextual information

### Error Handling

```typescript
// Always handle errors gracefully
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', { error, context });
  
  // Show user-friendly message
  toast.error('Something went wrong. Please try again.');
  
  // Update state
  setState('error');
}
```

## 🚀 Commands Reference

### Development

```bash
# Install dependencies
npm install

# Start all apps (web + signaling)
npm run dev

# Start specific app
npm run dev --workspace=apps/web
npm run dev --workspace=apps/signaling

# Build all apps
npm run build

# Build specific app
npm run build --workspace=apps/web
```

### Testing

```bash
# Run unit tests
npm test

# Run unit tests with coverage
npm run test:coverage

# Run E2E tests (all browsers)
npm run test:e2e

# Run E2E tests (specific browser)
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit

# Run E2E tests with UI
npm run test:e2e:ui
```

### Code Quality

```bash
# Lint all code
npm run lint

# Format all code
npm run format

# Check formatting
npm run format:check

# Validate everything
npm run validate  # test + lint + typecheck + build
```

### Database

```bash
# Start local Supabase
supabase start

# Apply migrations
supabase db push

# Reset database
supabase db reset

# Generate TypeScript types
supabase gen types typescript --local > apps/web/src/types/supabase.ts
```

## 🐛 Common Issues & Solutions

### Issue: WebRTC Connection Fails

**Symptoms**: Peers stuck on "Connecting..." status

**Possible Causes**:
1. TURN server credentials expired
2. Firewall blocking WebRTC ports
3. Signaling server unreachable

**Solutions**:
```typescript
// 1. Check TURN credentials
const response = await fetch('/api/turn-credentials');
const { iceServers } = await response.json();
console.log('ICE Servers:', iceServers);

// 2. Enable "Compatibility Mode" (forced relay)
// This forces all traffic through TURN server

// 3. Check signaling server health
const health = await fetch('https://signaling-server/health');
console.log('Signaling server status:', health.status);
```

### Issue: Transfer Stuck at X%

**Symptoms**: Progress bar stops moving, no errors

**Possible Causes**:
1. Lost ACK message (deadlock)
2. Data channel closed unexpectedly
3. IndexedDB write failure

**Solutions**:
```typescript
// 1. Check data channel state
console.log('Data channel state:', dataChannel.readyState);

// 2. Check for errors in console
// Look for IndexedDB quota errors

// 3. Verify ACK handling
// Check receiver is sending ACKs
// Check sender is receiving ACKs
```

### Issue: File Corrupted After Transfer

**Symptoms**: Downloaded file is wrong size or won't open

**Possible Causes**:
1. Chunks assembled in wrong order
2. Missing chunks
3. Chunk data corrupted during transfer

**Solutions**:
```typescript
// 1. Verify all chunks received
const metadata = await db.get('metadata', transferId);
console.log('Received chunks:', metadata.receivedChunks.length);
console.log('Total chunks:', metadata.totalChunks);

// 2. Check chunk ordering
const chunks = await getAllChunks(transferId);
const orderedChunks = chunks.sort((a, b) => 
  a.index - b.index
);

// 3. Add checksum validation (future enhancement)
```

## 🔐 Security Best Practices

1. **Authentication**: All API routes check user authentication
2. **RLS Policies**: Database enforces row-level security
3. **Input Validation**: Validate all user inputs
4. **XSS Prevention**: Sanitize all user-generated content
5. **CORS**: Signaling server restricts origins
6. **Rate Limiting**: API endpoints have rate limits
7. **JWT Validation**: Signaling server validates Supabase JWTs

## 📚 Additional Resources

- **Main README**: `/README.md`
- **Architecture Docs**: `/docs/APP_ANALYSIS.md`
- **Testing Guide**: `/docs/TESTING.md`
- **Explainer**: `/docs/EXPLAINER.md`
- **Supabase Setup**: `/docs/README-supabase.md`
- **Signaling Server**: `/docs/README-signaling.md`

---

**Version**: 1.00.003  
**Last Updated**: 2024  
**Maintainer**: HyperLink Team
