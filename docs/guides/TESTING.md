# HyperLink Testing Guide

HyperLink uses **Vitest** for unit and integration testing, and **Playwright** for End-to-End (E2E) testing. This document outlines how to run, write, and maintain tests.

## 🏃‍♀️ Running Tests

### Unit and Integration Tests (Vitest)

Vitest is configured to run tests using jsdom for React components and Node for server/API utilities.

```bash
# Run all tests once
npm run test

# Run tests in watch mode (useful during development)
npm run test:watch

# Run tests with UI
npm run test:ui

# Generate a coverage report
npm run coverage
```

*Note: As of v1.00.000, the project maintains 100% test passing rate across 770+ unit tests.*

### End-to-End Tests (Playwright)

Playwright tests the full P2P file transfer flow by launching multiple browsers and having them communicate with each other over the signaling server.

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run all E2E tests headlessly
npx playwright test

# Run tests with the UI interface
npx playwright test --ui

# Debug a specific test
npx playwright test transfer.spec.ts --debug
```

## 🏗️ Test Structure

- **Unit Tests (`__tests__`)**: Located next to the components or utilities they test.
  - Components: `src/components/__tests__/`
  - Hooks: `src/lib/hooks/__tests__/`
  - APIs: `src/app/api/__tests__/`
- **E2E Tests (`e2e/`)**: Located in the root `e2e` directory.
  - Full flows: e.g., `e2e/transfer.spec.ts`, `e2e/auth.spec.ts`

## 🧩 Mocking and Stubs

When writing unit tests for WebRTC and Browser APIs, we use extensive mocking since `jsdom` does not support these natively. 

Key mocks available in `src/setupTests.ts` and individual test files:
- **WebRTC**: `RTCPeerConnection`, `RTCDataChannel`, `sessionDescription`
- **IndexedDB**: `idb` mock
- **Browser APIs**: `navigator.setAppBadge`, `navigator.clearAppBadge`, `HTMLElement.prototype.scrollIntoView`
- **Audio**: `window.Audio` mock for sound effects
- **Supabase**: `createClient` mock for simulating auth states

### Example: Mocking PeerManager

When testing components that rely on `PeerManager` (e.g., Transfer components), avoid real WebRTC connections by passing a mock ref:

```tsx
const mockPeerManager = {
  current: {
    getState: () => "connected",
    // omit complex methods
  }
} as any;

render(<MyComponent peerManagerRef={mockPeerManager} />);
```

## 📝 Best Practices

1. **Test User Flows, Not Implementation Details**: Rely on `@testing-library/react` (e.g. `screen.getByRole`, `screen.getByText`) rather than querying the DOM structure.
2. **Handle Async Properly**: Use `waitFor` or `findBy...` when testing asynchronous actions like signaling or file chunk processing.
3. **Clean Up State**: Vitest is configured to run `cleanup()` after each test automatically. If you mock global `window` or `navigator` properties, restore them in `afterEach`.
4. **Coverage**: Aim for high branch coverage on complex custom hooks (`use-receive-transfer`, `use-send-transfer`) and transfer protocol managers (`sender.ts`, `receiver.ts`).
