# E2E Test Mocks

This directory contains mock implementations for testing various browser APIs and error conditions in the HyperLink e2e test suite.

## WebRTCMock

Mock utilities for testing WebRTC connection failures and network conditions.

### Methods

#### `mockConnectionFailure(page: Page): Promise<void>`

Forces the WebRTC peer connection to fail after 5 seconds. Useful for testing error handling and connection failure recovery.

**Example:**
```typescript
import { WebRTCMock } from './mocks/webrtc-mock'

test('handle WebRTC connection failure', async ({ page }) => {
  const webrtcMock = new WebRTCMock()
  await webrtcMock.mockConnectionFailure(page)
  
  await page.goto('/send')
  // Connection will fail after 5 seconds
  await expect(page.getByText(/connection failed/i)).toBeVisible()
})
```

#### `mockSlowConnection(page: Page, delayMs: number): Promise<void>`

Adds artificial delay to WebRTC data channel send operations. Useful for testing slow network conditions and timeout handling.

**Parameters:**
- `delayMs` - Delay in milliseconds to add to each send operation

**Example:**
```typescript
import { WebRTCMock } from './mocks/webrtc-mock'

test('handle slow connection', async ({ page }) => {
  const webrtcMock = new WebRTCMock()
  await webrtcMock.mockSlowConnection(page, 1000) // 1 second delay
  
  await page.goto('/send')
  // All data channel sends will be delayed by 1 second
})
```

## IndexedDBMock

Mock utilities for testing IndexedDB storage quota and error conditions.

### Methods

#### `mockQuotaExceeded(page: Page): Promise<void>`

Forces IndexedDB add and put operations to fail with QuotaExceededError. Useful for testing storage quota handling and error recovery.

**Example:**
```typescript
import { IndexedDBMock } from './mocks/indexeddb-mock'

test('handle IndexedDB quota exceeded', async ({ page }) => {
  const indexedDBMock = new IndexedDBMock()
  await indexedDBMock.mockQuotaExceeded(page)
  
  await page.goto('/send')
  // IndexedDB operations will fail with QuotaExceededError
  await expect(page.getByText(/storage quota exceeded/i)).toBeVisible()
})
```

## Usage Notes

- All mocks use `page.addInitScript()` to inject code before page load
- Mocks must be applied before navigating to the page
- Mocks affect all subsequent operations on the page
- To reset mocks, create a new page or browser context

## Related Files

- `helpers/network.ts` - Network simulation utilities
- `helpers/webrtc.ts` - WebRTC helper functions
- `helpers/assertions.ts` - Custom test assertions
