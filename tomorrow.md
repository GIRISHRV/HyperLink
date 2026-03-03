# Tomorrow — Test Coverage Plan

Current state: `v_next` @ `8a8bccf` | 398 tests, 24 files | All passing ✅

---

## Phase 1 — Unit: Remaining Hooks + Config

Install nothing new — Vitest + jsdom already available.

### 1a. Simple hooks (fast, 1 session)

| File | Key cases |
|---|---|
| `use-chat.ts` | `handleIncomingData` returns true only for chat messages, adds to state; ignores non-chat; `sendMessage` calls `connection.send` with correct shape; `resetChat` clears all state |
| `use-clipboard-file.ts` | Adds/removes `paste` listener on mount/unmount; calls callback for file items; ignores paste in input/textarea; ignores non-file items |
| `use-haptics.ts` | Calls `navigator.vibrate` with correct patterns per `HapticPattern` enum; no-ops when `navigator.vibrate` absent |
| `use-wake-lock.ts` | Calls `navigator.wakeLock.request("screen")`; releases on unmount; no-ops when API absent; re-requests after visibility change |
| `lib/config/webrtc.ts` | `getIceServers` returns TURN config when env vars set, falls back to empty; `getPeerConfigAsync` returns merged config object |

### 1b. Complex hooks (need PeerManager + FileSender/Receiver mocks)

Mock strategy: `vi.mock("@/lib/webrtc/peer-manager")`, `vi.mock("@/lib/transfer/sender")`, `vi.mock("@/lib/transfer/receiver")`, `vi.mock("@/lib/services/transfer-service")`, `vi.mock("@/lib/config/webrtc")`.

| File | Key cases |
|---|---|
| `use-send-transfer.ts` | Initialises PeerManager on mount; destroys on unmount; `handleSend` creates transfer record, connects to peer, starts FileSender; dispatches COMPLETE on success; dispatches FAIL on timeout; `resetSend` cancels sender + closes connection |
| `use-receive-transfer.ts` | Initialises PeerManager on mount; sets `myPeerId` from manager; incoming connection triggers pending offer; `acceptOffer` starts FileReceiver; `rejectOffer` sends reject message; dispatches COMPLETE on file-complete event |
| `use-transfer-realtime.ts` | Fetches initial transfer from Supabase; subscribes to UPDATE/DELETE channel events; updates state on UPDATE payload; sets null on DELETE; unsubscribes on unmount; handles null transferId (no fetch, no subscribe) |
| `use-file-selection.ts` | Single file path; multi-file zips; folder path (has webkitRelativePath); size over 10GB rejects; drag enter/leave/drop events update `isDraggingOver`; clipboard paste calls `processFiles` |

---

## Phase 2 — Component Tests (React Testing Library)

Install needed:
```
npm install -D @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

Add to `vitest.setup.ts`:
```ts
import "@testing-library/jest-dom";
```

### 2a. Pure / display components (no async, no hooks)

| Component | Key assertions |
|---|---|
| `empty-state.tsx` | Renders message text; renders icon |
| `progress-bar.tsx` | Width style reflects percentage prop; shows % label |
| `background-grid.tsx` | Renders without crashing |
| `ripple.tsx` | Renders without crashing |
| `skeletons.tsx` | Each skeleton variant renders correct count of placeholder elements |
| `global-footer.tsx` | Renders links; renders version if provided |
| `ui/button.tsx` | Renders children; disabled state; onClick fires |
| `terminal-log.tsx` | Renders each log entry; empty state renders nothing |
| `drag-overlay.tsx` | Visible when `isDragging=true`; hidden when false |
| `transfer-visualizer.tsx` / `radar-visualizer.tsx` | Renders without error for each status |

### 2b. Modal / interactive components

| Component | Key assertions |
|---|---|
| `confirm-cancel-modal.tsx` | Opens when `isOpen=true`; Confirm button calls `onConfirm`; Cancel button calls `onClose` |
| `confirm-leave-modal.tsx` | Same pattern as above |
| `password-modal.tsx` | Input field accepts text; submit calls `onSubmit(password)`; empty submit shows error |
| `file-offer-prompt.tsx` | Shows filename + size; Accept fires `onAccept`; Reject fires `onReject` |
| `file-preview-modal.tsx` | Shows filename; image preview for image types; download button present |
| `qr-code-modal.tsx` | Renders QR canvas when `value` prop given; close button calls `onClose` |
| `transfer-details-modal.tsx` | Shows transfer id, size, speed; close fires `onClose` |
| `chat-drawer.tsx` | Renders messages list; input + send button submits; closes on backdrop click |

### 2c. Transfer state components

| Component | Key assertions |
|---|---|
| `transfer-progress-panel.tsx` | Shows bytes transferred / total; shows speed; shows remaining time |
| `transfer-complete-state.tsx` | Shows success message; shows filename; download button present for receiver |
| `transfer-failed-state.tsx` | Shows error message; retry button calls `onRetry` |
| `send-control-panel.tsx` | Send button disabled when no file; calls `onSend` when clicked; shows cancel when transferring |
| `received-file-view.tsx` | Shows file info; download triggers `URL.createObjectURL` |
| `diagnostic-panel.tsx` | Renders connection stats; shows peer ID |

### 2d. Page-level smoke tests

Wrap pages in `SessionProvider` + Supabase mocks. Just assert they render without crashing and key UI elements are present.

| Page | Key assertions |
|---|---|
| `send/page.tsx` | Renders file drop zone; renders peer ID input |
| `receive/page.tsx` | Renders "Your Peer ID" display |
| `dashboard/page.tsx` | Renders stats section; renders transfer list |
| `history/page.tsx` | Renders transfers table; empty state when no results |
| `auth/page.tsx` | Renders sign-in form |
| `settings/page.tsx` | Renders profile section |

---

## Phase 3 — E2E (Playwright)

Install:
```
npm init playwright@latest  # in repo root, choose TypeScript
```

Add `.github/workflows/e2e.yml` separate from unit CI (needs a running dev server).

### Test scenarios

| Scenario | Steps |
|---|---|
| **Auth flow** | Visit `/`, not authed → redirect to `/auth`; sign in → redirect to `/dashboard` |
| **Send/receive happy path** | Open two browser contexts; receiver at `/receive` copies peer ID; sender at `/send` selects file, enters peer ID, sends; receiver accepts; both reach complete state |
| **Password-protected transfer** | Sender sets password; receiver prompted for password modal; correct password completes; wrong password shows error |
| **Multi-file zip** | Sender drops 3 files; zip progress shows; single `.zip` sent to receiver |
| **Transfer cancel** | Sender cancels mid-transfer; receiver sees disconnected state |
| **PWA offline page** | Service worker registered; navigate offline → `/offline` renders |
| **QR code flow** | Receiver opens QR modal; sender scans with `qr-scanner-modal`; peer ID populated |
| **History page** | Complete a transfer; visit `/history`; entry appears with correct filename/size |

---

## Phase 4 — Merge + Deploy

Once all three test layers are green on `v_next`:

1. `git checkout master && git merge v_next --no-ff -m "chore: merge v2 complete"`
2. `git push origin master`
3. Set env vars in Vercel (from `.env.example`)
4. Set env vars in Railway for signaling server
5. Verify production deploy passes health check at `/api/health`

---

## Suggested Session Order

```
Session 1  →  Phase 1a (simple hooks + config)          ~20 tests
Session 2  →  Phase 1b (complex hooks)                  ~40 tests
Session 3  →  Phase 2a + 2b (pure + modal components)   ~50 tests
Session 4  →  Phase 2c + 2d (transfer + pages)          ~40 tests
Session 5  →  Phase 3 (Playwright setup + E2E suite)     ~8 scenarios
Session 6  →  Phase 4 (merge + deploy)
```
