# HyperLink — Test Suite Documentation

> **689 unit/component tests** across **55 test files** + **27 E2E tests** across **7 spec files**
> Framework: Vitest 4.x + jsdom + @testing-library/react + @testing-library/user-event + Playwright 1.x

---

## Test Architecture

```text
apps/web/src/
├── __mocks__/
│   ├── supabase.ts          # Shared Supabase mock with chainable query builder
│   └── peerjs.ts            # Shared PeerJS mock (MockPeer + MockDataConnection)
├── __tests__/
│   └── middleware.test.ts    # Next.js middleware auth tests
├── app/api/__tests__/
│   └── routes.test.ts        # API route handler tests
├── components/__tests__/
│   ├── app-header.test.tsx          # AppHeader (landing/app/transfer variants)
│   ├── background-grid.test.tsx     # Decorative overlay (SSR guard)
│   ├── clipboard-listener.test.tsx  # Clipboard paste toast
│   ├── confirm-cancel-modal.test.tsx
│   ├── confirm-leave-modal.test.tsx
│   ├── empty-state.test.tsx
│   ├── file-offer-prompt.test.tsx
│   ├── file-preview-modal.test.tsx
│   ├── global-footer.test.tsx
│   ├── password-modal.test.tsx
│   ├── progress-bar.test.tsx
│   ├── qr-code-modal.test.tsx
│   ├── qr-scanner-modal.test.tsx
│   ├── ripple.test.tsx
│   ├── skeletons.test.tsx
│   └── transfer-details-modal.test.tsx
├── components/transfer/__tests__/
│   ├── incoming-offer-card.test.tsx
│   ├── peer-id-card.test.tsx
│   ├── selected-file-card.test.tsx
│   ├── transfer-complete-state.test.tsx
│   └── transfer-failed-state.test.tsx
├── components/stats/__tests__/
│   └── data-moved-card.test.tsx
├── lib/
│   ├── hooks/__tests__/
│   │   ├── use-transfer-state.test.ts     # FSM reducer tests
│   │   ├── use-modal-accessibility.test.ts # A11y hook tests
│   │   ├── use-chat.test.ts
│   │   ├── use-clipboard-file.test.ts
│   │   ├── use-haptics.test.ts
│   │   ├── use-wake-lock.test.ts
│   │   ├── use-transfer-realtime.test.ts
│   │   ├── use-file-selection.test.ts
│   │   ├── use-send-transfer.test.ts
│   │   ├── use-receive-transfer.test.ts
│   │   ├── use-require-auth.test.ts
│   │   └── use-transfer-stats.test.ts
│   ├── services/__tests__/
│   │   ├── auth-service.test.ts
│   │   ├── transfer-service.test.ts
│   │   └── profile-service.test.ts
│   ├── storage/__tests__/
│   │   └── idb-manager.test.ts
│   ├── supabase/__tests__/
│   │   └── client.test.ts
│   ├── transfer/__tests__/
│   │   ├── sender.test.ts
│   │   └── receiver.test.ts
│   ├── utils/__tests__/
│   │   ├── index.test.ts
│   │   ├── crypto.test.ts
│   │   ├── auth-redirect.test.ts
│   │   ├── peer-message-validator.test.ts
│   │   ├── with-retry.test.ts
│   │   └── mime.test.ts
│   └── webrtc/__tests__/
│       └── peer-manager.test.ts
├── test-utils/
│   └── render-with-providers.tsx   # RTL wrapper (mocked navigation + auth)
e2e/
├── landing.spec.ts           # Hero headline, features, SEND/RECEIVE blocks
├── auth.spec.ts              # Login form, inputs, heading
├── protected-routes.spec.ts  # Auth redirect for 5 protected paths
├── about.spec.ts             # About page heading, WebRTC text, header logo
├── navigation.spec.ts        # Link navigation (About, Status, Login)
├── not-found.spec.ts         # 404 page text, button
└── offline.spec.ts           # Offline page branding, connection text
playwright.config.ts              # Playwright config (Chromium, webServer)
```

---

## Test Case Registry

### Phase 1 — Smoke / MVP (~180 tests)

| TestID | Module | Function | Scenario | Risk | Type |
| ------ | ------ | -------- | -------- | ---- | ---- |
| U-001 | `packages/utils` | `formatFileSize` | 0 B → "0 B" | Low | Unit |
| U-002 | `packages/utils` | `formatFileSize` | 1024 → "1.00 KB" | Low | Unit |
| U-003 | `packages/utils` | `formatFileSize` | 1 GB boundary | Low | Unit |
| U-004 | `packages/utils` | `formatFileSize` | Negative input | Low | Unit |
| U-005 | `packages/utils` | `generateTransferId` | Returns 36-char UUID | Low | Unit |
| U-006 | `packages/utils` | `generateTransferId` | Uniqueness (100 calls) | Low | Unit |
| U-007 | `packages/utils` | `calculateChunkCount` | Exact division | Low | Unit |
| U-008 | `packages/utils` | `calculateChunkCount` | Remainder chunk | Low | Unit |
| U-009 | `packages/utils` | `calculateChunkCount` | 0-byte file | Low | Unit |
| U-010 | `packages/utils` | `calculateSpeed` | bytes/time → speed | Low | Unit |
| U-011 | `packages/utils` | `calculateSpeed` | Zero time → Infinity | Low | Unit |
| U-012 | `packages/utils` | `calculateTimeRemaining` | Normal estimate | Low | Unit |
| U-013 | `packages/utils` | `calculateTimeRemaining` | Zero speed → Infinity | Low | Unit |
| U-014 | `packages/utils` | `formatTime` | Seconds/minutes/hours | Low | Unit |
| U-015 | `packages/utils` | `validateFileSize` | Under/over/at limit | Med | Unit |
| U-016 | `packages/utils` | `debounce` | Delays execution | Low | Unit |
| U-017 | `packages/utils` | `debounce` | Clears on re-call | Low | Unit |
| U-018 | `packages/utils` | `throttle` | Rate limiting | Low | Unit |
| C-001 | `crypto` | `generateSalt` | 16-byte Uint8Array | High | Unit |
| C-002 | `crypto` | `generateSalt` | Uniqueness (100 salts) | High | Unit |
| C-003 | `crypto` | `generateIV` | 12-byte IV (AES-GCM std) | High | Unit |
| C-004 | `crypto` | `generateIV` | Uniqueness (100 IVs) | High | Unit |
| C-005 | `crypto` | `deriveKey` | Returns CryptoKey | High | Unit |
| C-006 | `crypto` | `deriveKey` | Deterministic (same pwd+salt) | High | Unit |
| C-007 | `crypto` | `deriveKey` | Different pwd → different key | High | Unit |
| C-008 | `crypto` | `deriveKey` | Different salt → different key | High | Unit |
| C-009 | `crypto` | `deriveKey` | Empty password | Med | Unit |
| C-010 | `crypto` | `deriveKey` | Long password (1000 chars) | Med | Unit |
| C-011 | `crypto` | `deriveKey` | Unicode password | Med | Unit |
| C-012 | `crypto` | `encrypt/decrypt` | ASCII round-trip | Critical | Unit |
| C-013 | `crypto` | `encrypt/decrypt` | Empty data round-trip | Med | Unit |
| C-014 | `crypto` | `encrypt/decrypt` | 64KB binary round-trip | Critical | Unit |
| C-015 | `crypto` | `encrypt/decrypt` | Overhead = IV + auth tag | High | Unit |
| C-016 | `crypto` | `encrypt/decrypt` | Random IV per encryption | High | Unit |
| C-017 | `crypto` | `encrypt/decrypt` | Tamper detection | Critical | Unit |
| C-018 | `crypto` | `encrypt/decrypt` | Wrong key rejection | Critical | Unit |
| C-019 | `crypto` | `encrypt/decrypt` | 1-byte data | Low | Unit |
| C-020 | `crypto` | `encrypt/decrypt` | 1 MB payload | Med | Unit |
| C-021 | `crypto` | `base64` | Known byte round-trip | Low | Unit |
| C-022 | `crypto` | `base64` | Empty round-trip | Low | Unit |
| C-023 | `crypto` | `base64` | Salt round-trip | Low | Unit |
| C-024 | `crypto` | `base64` | Valid chars only | Low | Unit |
| V-001 | `peer-message-validator` | `validate` | Valid message passes | High | Unit |
| V-002 | `peer-message-validator` | `validate` | All 12 message types | High | Unit |
| V-003 | `peer-message-validator` | `validate` | Missing fields → null | High | Unit |
| V-004 | `peer-message-validator` | `validate` | Wrong types → null | High | Unit |
| V-005 | `peer-message-validator` | `validate` | Overflow transferId | High | Unit |
| V-006 | `peer-message-validator` | `validate` | Extra fields stripped | Med | Unit |
| V-007 | `peer-message-validator` | `validate` | Prototype pollution safe | Critical | Unit |
| R-001 | `with-retry` | `withRetry` | Immediate success | Med | Unit |
| R-002 | `with-retry` | `withRetry` | Retry-then-succeed | Med | Unit |
| R-003 | `with-retry` | `withRetry` | Max retries exhausted | Med | Unit |
| R-004 | `with-retry` | `withRetry` | Exponential backoff | Med | Unit |
| R-005 | `with-retry` | `withRetry` | Sync throw handling | Low | Unit |
| M-001 | `mime` | `getMimeType` | All known extensions | Low | Unit |
| M-002 | `mime` | `getMimeType` | Unknown → octet-stream | Low | Unit |
| M-003 | `mime` | `getMimeType` | Case insensitive | Low | Unit |
| M-004 | `mime` | `getMimeType` | Edge cases (dots, no ext) | Low | Unit |
| FSM-001 | `use-transfer-state` | `CONNECT` | idle → connecting | Critical | Unit |
| FSM-002 | `use-transfer-state` | `OFFER` | connecting → offering | Critical | Unit |
| FSM-003 | `use-transfer-state` | `PAUSE/RESUME` | Guard from wrong state | High | Unit |
| FSM-004 | `use-transfer-state` | `PROGRESS` | Clamp 0–100 | Med | Unit |
| FSM-005 | `use-transfer-state` | `FAIL` | Any state → failed | High | Unit |
| FSM-006 | `use-transfer-state` | `RESET` | Any state → idle | Med | Unit |
| A-001 | `auth-service` | `signUp` | Happy path | High | Unit |
| A-002 | `auth-service` | `signUp` | Duplicate email | Med | Unit |
| A-003 | `auth-service` | `signIn` | Happy path | High | Unit |
| A-004 | `auth-service` | `signIn` | Invalid creds | Med | Unit |
| A-005 | `auth-service` | `signInWithMagicLink` | With redirect | Med | Unit |
| A-006 | `auth-service` | `signOut` | Happy path | Med | Unit |
| A-007 | `auth-service` | `getCurrentUser` | Auth/unauth | Med | Unit |

### Phase 2 — Comprehensive (~133 tests)

| TestID | Module | Function | Scenario | Risk | Type |
| ------ | ------ | -------- | -------- | ---- | ---- |
| IDB-001 | `idb-manager` | `initDB` | Creates stores on first open | High | Integ |
| IDB-002 | `idb-manager` | `addChunk` | Store and retrieve chunk | High | Integ |
| IDB-003 | `idb-manager` | `clearTransfer` | Removes all chunks for transfer | Med | Integ |
| IDB-004 | `idb-manager` | `getLastReceivedChunkIndex` | Cursor max index | Med | Integ |
| IDB-005 | `idb-manager` | `assembleFileFromCursor` | Reassembles blob | Critical | Integ |
| IDB-006 | `idb-manager` | `addFile/getFile/deleteFile` | CRUD lifecycle | Med | Integ |
| S-001 | `sender` | Constructor | Sets initial state | Med | Unit |
| S-002 | `sender` | `sendOffer` | Sends file-offer message | High | Unit |
| S-003 | `sender` | `startTransfer` | Pumps chunks on accept | Critical | Unit |
| S-004 | `sender` | `pump` | Sliding window, ACK handling | Critical | Unit |
| S-005 | `sender` | `pause/resume` | Control flow | High | Unit |
| S-006 | `sender` | `cancel` | Sends cancel message, cleans up | High | Unit |
| S-007 | `sender` | `setPassword` | Derives encryption key | High | Unit |
| S-008 | `sender` | Error paths | File read error, send error | High | Unit |
| RX-001 | `receiver` | Constructor | Sets initial state | Med | Unit |
| RX-002 | `receiver` | `handleOffer` | Extracts metadata | High | Unit |
| RX-003 | `receiver` | `handleOffer` | Crash recovery from IDB | Critical | Unit |
| RX-004 | `receiver` | `handleChunk` | Decrypt → store → ACK | Critical | Unit |
| RX-005 | `receiver` | `handleChunk` | Assembly on final chunk | Critical | Unit |
| RX-006 | `receiver` | `processPassword` | Derives key | High | Unit |
| RX-007 | `receiver` | Control messages | Cancel/pause/resume from sender | High | Unit |
| RX-008 | `receiver` | `sendResumeFrom` | Sends resume-from msg | Med | Unit |
| TS-001 | `transfer-service` | `createTransfer` | Insert + return | High | Unit |
| TS-002 | `transfer-service` | `updateTransferStatus` | Status + completed_at | High | Unit |
| TS-003 | `transfer-service` | `claimTransferAsReceiver` | RPC call | High | Unit |
| TS-004 | `transfer-service` | `getUserTransfers` | List with filters | Med | Unit |
| TS-005 | `transfer-service` | `deleteTransfer` | Single delete | Med | Unit |
| TS-006 | `transfer-service` | `deleteMultipleTransfers` | Batch delete | Med | Unit |
| TS-007 | `transfer-service` | `getUserTransferStats` | RPC + legacy field | Med | Unit |
| PS-001 | `profile-service` | `getUserProfile` | Fetch + auto-create | High | Unit |
| PS-002 | `profile-service` | `updateUserProfile` | Upsert | Med | Unit |
| PS-003 | `profile-service` | `createUserProfile` | Default values | Med | Unit |
| API-001 | `/api/health` | `GET` | Returns status + timestamp | Low | Unit |
| API-002 | `/api/turn-credentials` | `GET` | Returns STUN/TURN servers | High | Unit |
| API-003 | `/api/turn-credentials` | `GET` | OpenRelay fallback | Med | Unit |
| API-004 | `/api/turn-credentials` | `GET` | Cache-Control headers | Med | Unit |
| API-005 | `/api/share-target` | `POST` | Origin validation | High | Unit |
| API-006 | `/api/share-target` | `POST` | 100MB limit | Med | Unit |
| MW-001 | `middleware` | Protected paths | Redirects unauth users | Critical | Unit |
| MW-002 | `middleware` | Public paths | Passes through | High | Unit |
| MW-003 | `middleware` | POST /send | Redirects with bypass | Med | Unit |
| MW-004 | `middleware` | Auth header | Passes authenticated | Critical | Unit |
| PM-001 | `peer-manager` | Constructor | Disconnected initial state | Med | Unit |
| PM-002 | `peer-manager` | `initialize` | Creates Peer, emits connected | High | Unit |
| PM-003 | `peer-manager` | `connectToPeer` | Returns DataConnection | High | Unit |
| PM-004 | `peer-manager` | `destroy` | Cleans up all resources | High | Unit |
| PM-005 | `peer-manager` | Events | On/off listener management | Med | Unit |
| PM-006 | `peer-manager` | Double destroy | Idempotent cleanup | Med | Unit |
| MA-001 | `use-modal-accessibility` | Focus trap | Tab wraps in modal | Med | Unit |
| MA-002 | `use-modal-accessibility` | ESC | Closes on Escape | Med | Unit |
| MA-003 | `use-modal-accessibility` | Restore focus | Returns focus on close | Med | Unit |

### Phase 2c — Modal Components (~70 tests)

| TestID | Component | Scenario | Risk | Type |
| ------ | --------- | -------- | ---- | ---- |
| CM-001 | `PasswordModal` | Hidden when `isOpen=false` | Med | RTL |
| CM-002 | `PasswordModal` | Default/custom title & description | Low | RTL |
| CM-003 | `PasswordModal` | `isCreation` label variants | Low | RTL |
| CM-004 | `PasswordModal` | Empty-password validation error | Med | RTL |
| CM-005 | `PasswordModal` | `onSubmit` called with typed value | High | RTL |
| CM-006 | `PasswordModal` | Input clears after submit | Med | RTL |
| CM-007 | `PasswordModal` | `onCancel` on Cancel click | Med | RTL |
| CM-008 | `ConfirmCancelModal` | Hidden when closed | Med | RTL |
| CM-009 | `ConfirmCancelModal` | sending/receiving copy variants | Low | RTL |
| CM-010 | `ConfirmCancelModal` | `onConfirm` / `onCancel` buttons | High | RTL |
| CM-011 | `ConfirmCancelModal` | Backdrop click calls `onCancel` | Med | RTL |
| CM-012 | `ConfirmLeaveModal` | Hidden when closed | Med | RTL |
| CM-013 | `ConfirmLeaveModal` | Stay/Leave buttons | High | RTL |
| CM-014 | `ConfirmLeaveModal` | Backdrop click calls `onCancel` | Med | RTL |
| CM-015 | `QRCodeModal` | Mocked `QRCodeSVG` renders | Med | RTL |
| CM-016 | `QRCodeModal` | `peerId` text displayed | High | RTL |
| CM-017 | `QRCodeModal` | Close button calls `onClose` | Med | RTL |
| CM-018 | `QRScannerModal` | `Html5Qrcode` mocked (no camera) | High | RTL |
| CM-019 | `QRScannerModal` | `#qr-reader` container rendered | Med | RTL |
| CM-020 | `QRScannerModal` | Cancel button rendered | Low | RTL |
| CM-021 | `FilePreviewModal` | Hidden when closed | Med | RTL |
| CM-022 | `FilePreviewModal` | `<img>` for image MIME / `<video>` for video | High | RTL |
| CM-023 | `FilePreviewModal` | Fallback "Preview not available" | Med | RTL |
| CM-024 | `FilePreviewModal` | Download link has correct `download` attr | Med | RTL |
| CM-025 | `FilePreviewModal` | `URL.createObjectURL` called with file | High | RTL |
| CM-026 | `TransferDetailsModal` | Status badges (Complete/Pending/Failed…) | High | RTL |
| CM-027 | `TransferDetailsModal` | Cancel Transfer for active transfer | High | RTL |
| CM-028 | `TransferDetailsModal` | Delete Record for inactive transfer | Med | RTL |
| CM-029 | `TransferDetailsModal` | Ephemeral file notice when no blob | Med | RTL |
| CM-030 | `TransferDetailsModal` | Close buttons call `onClose` | Med | RTL |

### Phase 2d — Complex & Transfer Components (~65 tests)

| TestID | Component | Scenario | Risk | Type |
| ------ | --------- | -------- | ---- | ---- |
| CD-001 | `FileOfferPrompt` | Hidden when `isOpen=false` | Med | RTL |
| CD-002 | `FileOfferPrompt` | Filename, type, extension badge | Low | RTL |
| CD-003 | `FileOfferPrompt` | Accept / Decline buttons + callbacks | High | RTL |
| CD-004 | `FileOfferPrompt` | P2P no-server notice | Low | RTL |
| CD-005 | `Skeletons` | `CardSkeleton` renders with `animate-pulse` | Low | RTL |
| CD-006 | `Skeletons` | `TableRowSkeleton` renders `<tr>` | Low | RTL |
| CD-007 | `Skeletons` | `ListSkeleton` renders 3 items | Low | RTL |
| CD-008 | `PeerIdCard` | Displays peerId / "Loading..." fallback | High | RTL |
| CD-009 | `PeerIdCard` | Copy ID button → `onCopy` | Med | RTL |
| CD-010 | `PeerIdCard` | Show QR disabled when peerId empty | Med | RTL |
| CD-011 | `SelectedFileCard` | Filename displayed | High | RTL |
| CD-012 | `SelectedFileCard` | Remove File → `onRemove` | Med | RTL |
| CD-013 | `TransferCompleteState` | "Transfer Complete!" + filename | High | RTL |
| CD-014 | `TransferCompleteState` | Send Another File → `onReset` | Med | RTL |
| CD-015 | `TransferFailedState` | Error message / "Unknown error" fallback | High | RTL |
| CD-016 | `TransferFailedState` | Try Again → `onRetry` | High | RTL |
| CD-017 | `TransferFailedState` | Return to Home → `router.push("/dashboard")` | Med | RTL |
| CD-018 | `TransferFailedState` | Diagnostic rows (SECURE_CONTEXT, NETWORK) | Med | RTL |
| CD-019 | `IncomingOfferCard` | "Incoming Transmission" + filename | High | RTL |
| CD-020 | `IncomingOfferCard` | Action Required badge + SECURE LINK | Med | RTL |
| CD-021 | `DataMovedCard` | Loading skeleton when `isLoading=true` | Low | RTL |
| CD-022 | `DataMovedCard` | Formatted bytes + unit displayed | High | RTL |
| CD-023 | `DataMovedCard` | Transfer count message | Med | RTL |
| CD-024 | `ClipboardListener` | Renders null before any paste | Med | RTL |
| CD-025 | `ClipboardListener` | Toast shown after file paste | High | RTL |
| CD-026 | `ClipboardListener` | Pasted filename in toast | Med | RTL |
| CD-027 | `ClipboardListener` | Go to Send → `router.push("/send")` | High | RTL |
| CD-028 | `ClipboardListener` | Dismiss hides toast | Med | RTL |

### Phase 3 — Playwright E2E (27 tests)

| TestID | Spec | Scenario | Risk | Type |
| ------ | ---- | -------- | ---- | ---- |
| E2E-001 | `landing.spec` | Hero headline contains Secure / Direct / Fast | Med | E2E |
| E2E-002 | `landing.spec` | WebRTC Ready status indicator visible | Med | E2E |
| E2E-003 | `landing.spec` | SEND and RECEIVE blocks visible | High | E2E |
| E2E-004 | `landing.spec` | Three feature cards rendered | Low | E2E |
| E2E-005 | `landing.spec` | SEND links to /auth for unauthenticated | High | E2E |
| E2E-006 | `landing.spec` | RECEIVE links to /auth for unauthenticated | High | E2E |
| E2E-007 | `auth.spec` | Email input visible | High | E2E |
| E2E-008 | `auth.spec` | Password input visible | High | E2E |
| E2E-009 | `auth.spec` | Authenticate submit button | Med | E2E |
| E2E-010 | `auth.spec` | Authentication Portal label | Low | E2E |
| E2E-011 | `auth.spec` | Access Network heading | Low | E2E |
| E2E-012 | `protected-routes.spec` | /dashboard redirects to /auth | Critical | E2E |
| E2E-013 | `protected-routes.spec` | /history redirects to /auth | Critical | E2E |
| E2E-014 | `protected-routes.spec` | /settings redirects to /auth | Critical | E2E |
| E2E-015 | `protected-routes.spec` | /send redirects to /auth | Critical | E2E |
| E2E-016 | `protected-routes.spec` | /receive redirects to /auth | Critical | E2E |
| E2E-017 | `about.spec` | How It Works heading | Low | E2E |
| E2E-018 | `about.spec` | WebRTC/peer-to-peer explanation text | Low | E2E |
| E2E-019 | `about.spec` | AppHeader HyperLink logo in header | Low | E2E |
| E2E-020 | `navigation.spec` | Landing → About via How it Works | Med | E2E |
| E2E-021 | `navigation.spec` | Landing → Status via Status link | Med | E2E |
| E2E-022 | `navigation.spec` | Landing → Auth via Login link | Med | E2E |
| E2E-023 | `not-found.spec` | 404 heading for nonexistent route | Med | E2E |
| E2E-024 | `not-found.spec` | Route Not Found label | Low | E2E |
| E2E-025 | `not-found.spec` | Go Home button visible | Low | E2E |
| E2E-026 | `offline.spec` | HyperLink branding on offline page | Low | E2E |
| E2E-027 | `offline.spec` | Offline/connection content shown | Med | E2E |

---

## Risk Distribution

| Risk Level | Count | Coverage |
| ---------- | ----- | -------- |
| Critical | ~35 | Crypto, FSM, auth middleware, chunk pipeline |
| High | ~85 | Services, WebRTC, sender/receiver, validation |
| Medium | ~130 | Edge cases, error paths, defaults |
| Low | ~63 | Formatting, MIME, encoding, health endpoint |

---

## Coverage Targets

| Module Category | Target | Status |
| --------------- | ------ | ------ |
| `lib/utils/` (crypto, validation, retry, mime) | 95%+ | ✅ |
| `lib/hooks/` (FSM, a11y, use-chat, use-clipboard…) | 90%+ | ✅ |
| `lib/services/` (auth, transfer, profile) | 85%+ | ✅ |
| `lib/storage/` (IDB) | 85%+ | ✅ |
| `lib/transfer/` (sender, receiver) | 80%+ | ✅ |
| `lib/webrtc/` (peer-manager) | 75%+ | ✅ |
| `app/api/` (route handlers) | 90%+ | ✅ |
| `middleware.ts` | 95%+ | ✅ |
| `components/` (UI, modals, transfer, stats) | 75%+ | ✅ |

---

## Running Tests

```bash
# All unit/component tests
cd apps/web && npx vitest run

# Watch mode
npx vitest

# With coverage
npx vitest run --coverage

# Single file
npx vitest run src/lib/utils/__tests__/crypto.test.ts

# Pattern match
npx vitest run --reporter=verbose -t "encryptChunk"

# All E2E tests (builds & starts Next.js automatically)
npx playwright test

# E2E with UI mode
npx playwright test --ui

# Single E2E spec
npx playwright test e2e/landing.spec.ts
```

---

## Phase 3 — Roadmap

| Area | Description | Priority | Status |
| ---- | ----------- | -------- | ------ |
| E2E Navigation & UI | Playwright standalone UI tests (Option A) | P0 | ✅ Done (27 tests) |
| E2E Sender→Receiver | Full transfer flow with two PeerManager instances | P1 | ⏳ |
| Component Tests | React component rendering with @testing-library/react | P1 | ✅ Done (689 tests) |
| Performance Benchmarks | Chunk throughput, encryption overhead, IDB latency | P1 | ⏳ |
| Security Fuzzing | Random payloads to crypto/validator, prototype pollution | P2 | ⏳ |
| Cross-Browser | Playwright matrix (Chrome, Firefox, Safari, Edge) | P2 | ⏳ |
| Offline/PWA | Service worker caching, offline transfer resume | P2 | ⏳ |
| Load Testing | Concurrent transfers, memory profiling | P3 | ⏳ |
