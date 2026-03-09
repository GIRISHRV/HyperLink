# WebWorker Integration

## Overview

WebWorker integration offloads CPU-intensive operations (encryption, decryption, ZIP compression) to background threads, preventing UI blocking during large file transfers.

## Architecture

### Workers

1. **Encryption Worker** (`apps/web/src/workers/encryption.worker.ts`)
   - Handles `deriveKey`, `encrypt`, and `decrypt` operations
   - Uses transferable objects for performance
   - Runs crypto operations in background thread

2. **ZIP Worker** (`apps/web/src/workers/zip.worker.ts`)
   - Handles ZIP compression using fflate
   - Reports progress during compression
   - Uses level 0 (store) compression for speed

### Infrastructure

1. **WorkerPool** (`apps/web/src/lib/utils/worker-pool.ts`)
   - Manages worker lifecycle (creation, termination)
   - Provides promise-based API for worker communication
   - Handles message passing and error handling
   - Supports progress callbacks

2. **Encryption Worker Client** (`apps/web/src/lib/utils/encryption-worker-client.ts`)
   - Singleton client for non-React contexts
   - Used by FileSender and FileReceiver classes
   - Lazy initialization of worker pool

3. **React Hooks**
   - `useEncryptionWorker` - For React components
   - `useZipWorker` - For React components
   - Automatic cleanup on unmount

## Integration Points

### File Transfer (Sender)

**File**: `apps/web/src/lib/transfer/sender.ts`

```typescript
// Before (blocking)
arrayBuffer = await encryptChunk(arrayBuffer, this.cryptoKey);

// After (non-blocking)
arrayBuffer = await encryptionWorkerClient.encrypt(arrayBuffer, this.cryptoKey);
```

### File Transfer (Receiver)

**File**: `apps/web/src/lib/transfer/receiver.ts`

```typescript
// Before (blocking)
chunkData = await decryptChunk(data, this.cryptoKey);

// After (non-blocking)
chunkData = await encryptionWorkerClient.decrypt(data, this.cryptoKey);
```

### ZIP Compression

**File**: `apps/web/src/lib/utils/zip-helper.ts`

```typescript
// Before (blocking)
const zipped = zipSync(zipData, { level: 0 });

// After (non-blocking)
const zipped = await workerPool.execute("zip", { files: fileDataArray }, onProgress);
```

## Benefits

1. **Responsive UI**: Main thread stays responsive during heavy operations
2. **Better UX**: Users can interact with the app while files are processing
3. **Progress Updates**: Workers report progress back to main thread
4. **Cancellation**: Operations can be cancelled without freezing
5. **Performance**: Transferable objects minimize data copying

## Technical Details

### Message Passing

Workers communicate via structured messages:

```typescript
// Request
{
  id: "msg_1",
  type: "encrypt",
  payload: { data: ArrayBuffer, key: CryptoKey }
}

// Response
{
  id: "msg_1",
  type: "success",
  payload: { data: ArrayBuffer }
}

// Progress
{
  id: "msg_1",
  type: "progress",
  payload: { progress: 50 }
}
```

### Transferable Objects

ArrayBuffers are transferred (not copied) for performance:

```typescript
worker.postMessage(message, [arrayBuffer]); // Transfer ownership
```

### Error Handling

- Worker errors are caught and propagated as promise rejections
- All pending requests are rejected on worker error
- Worker is automatically recreated after error

## Configuration

### Next.js

No special configuration needed. Next.js 13+ supports workers natively with:

```typescript
new Worker(new URL("@/workers/encryption.worker.ts", import.meta.url));
```

### Content Security Policy

Already configured in `next.config.js`:

```javascript
"worker-src 'self' blob:";
```

## Testing

Workers are mocked in tests using Vitest's `vi.mock()`:

```typescript
vi.mock("fflate", () => ({
  zipSync: vi.fn(() => new Uint8Array([80, 75, 5, 6])),
}));
```

## Performance Impact

### Before WebWorkers

- UI freezes during encryption/compression
- Large files (1GB+) cause noticeable lag
- Users think app has crashed

### After WebWorkers

- UI remains responsive
- Smooth progress updates
- Better perceived performance
- Can cancel operations cleanly

## Future Improvements

1. **Worker Pool Size**: Currently single worker per type, could use multiple workers
2. **Chunk Processing**: Could parallelize chunk encryption across multiple workers
3. **Hash Computation**: Move hash computation to workers
4. **Adaptive Chunking**: Adjust chunk size based on file size and available memory

## Maintenance

### Adding New Worker Operations

1. Add message type to worker file
2. Implement handler in worker's `onmessage`
3. Add method to client/hook
4. Update TypeScript types

### Debugging

Workers run in separate context, so:

- Use `console.log` in worker (appears in DevTools)
- Check Network tab for worker script loading
- Use Chrome DevTools > Sources > Workers for debugging

## Related Files

- `apps/web/src/workers/encryption.worker.ts`
- `apps/web/src/workers/zip.worker.ts`
- `apps/web/src/lib/utils/worker-pool.ts`
- `apps/web/src/lib/utils/encryption-worker-client.ts`
- `apps/web/src/lib/hooks/use-encryption-worker.ts`
- `apps/web/src/lib/hooks/use-zip-worker.ts`
- `apps/web/src/lib/transfer/sender.ts`
- `apps/web/src/lib/transfer/receiver.ts`
- `apps/web/src/lib/utils/zip-helper.ts`
