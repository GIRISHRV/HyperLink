# HyperLink — Project Plan

> Last updated: 4 March 2026  
> Branch: `master`

---

## Project Overview

**HyperLink** is a peer-to-peer file transfer web app built with:

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (auth, database, realtime)
- **P2P**: PeerJS (WebRTC abstraction)
- **Signaling**: Custom Express server on Render

### Repository Structure

```text
/home/girishrv/Documents/Projects/inhouse/
├── apps/
│   ├── web/              # Next.js frontend (Vercel)
│   └── signaling/        # PeerJS signaling server (Render)
├── packages/
│   ├── types/            # Shared TypeScript types
│   ├── utils/            # Shared utilities
│   ├── eslint-config/    # ESLint presets
│   └── typescript-config/# TSConfig presets
├── supabase/             # Database migrations
└── turbo.json            # Turborepo config
```

### Deployments

| Service | URL | Platform |
| --------- | ----- | ---------- |
| Web App | <https://v1-hyperlink.vercel.app> | Vercel |
| Signaling (prod) | <https://hyperlink-signaling.onrender.com> | Render |
| Signaling (staging) | <https://hyperlink-signaling-staging.onrender.com> | Render |

---

## Current Test State

### Summary

| Layer | Tests | Files | Status |
| ------- | ------- | ------- | -------- |
| Vitest (unit + component) | 886 | 68 | ✅ All passing |
| Playwright E2E | 63 | 13 | ✅ All passing |
| **Total** | **949** | **81** | ✅ |

### Coverage (enforced thresholds)

| Metric | Current | Threshold |
| -------- | --------- | ----------- |
| Lines | 75.19% | 75% |
| Statements | 74.16% | 74% |
| Branches | 59.64% | 59% |
| Functions | 67.16% | 67% |

Thresholds configured in `apps/web/vitest.config.ts` — CI will fail if coverage drops below these.

### CI Pipeline

- **File**: `.github/workflows/test.yml`
- **Triggers**: Push to `master`, all PRs
- **Jobs**:
  1. `test` — Runs `npx turbo test` (Vitest)
  2. `deploy` — Vercel production deploy (only on master, after tests pass)

---

## Completed Work

### Phase 1: CI Pipeline ✅

- GitHub Actions workflow with Vitest + Vercel deploy
- Staging signaling server on Render
- Vercel project properly linked

### Phase 2: P0 Coverage Boost ✅

- `peer-manager.ts`: 56% → 83%
- `idb-manager.ts`: 57% → 83%
- `use-send-transfer.ts`: 61% → ~85%
- `use-receive-transfer.ts`: 53% → ~83%
- Overall hooks: 71% → 87%

### Phase 3: Transfer Components ✅

- All 10 transfer components: 30% → 100% lines
- Files: file-drop-zone, send-control-panel, terminal-log, transfer-progress-panel, transfer-visualizer, drag-overlay, chat-fab, received-file-view, diagnostic-panel, radar-visualizer

### Phase 4: Quick Wins ✅

- `button.tsx`: 44% → 100%
- `transfer-details-modal.tsx`: 47% → 100%
- `qr-scanner-modal.tsx`: 68% → 100%
- `zip-helper.ts`: 72% → 100%
- `error-boundary.tsx`: 0% → covered
- `chat-drawer.tsx`: 0% → covered
- `use-modal-accessibility.ts`: extended with Tab-wrap tests

### Phase 5: Coverage Thresholds ✅

- Added threshold enforcement to vitest.config.ts
- CI will fail if any PR drops coverage below thresholds

---

## Next Priority: E2E Authenticated Flows (P1)

### Goal

Test the core product features (file send/receive) as a logged-in user. Currently E2E tests only cover public pages.

### Prerequisites

1. **Auth State Fixture** — Playwright needs to authenticate once, save `storageState`, and reuse it
2. **Test User** — Either mock Supabase auth or use a real test account

### Implementation Options

#### Option A: Real Supabase Login (Recommended)

```typescript
// e2e/auth.setup.ts
import { test as setup } from '@playwright/test';

const TEST_EMAIL = 'e2e-test@hyperlink.app';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD;

setup('authenticate', async ({ page }) => {
  await page.goto('/auth');
  await page.fill('[name="email"]', TEST_EMAIL);
  await page.fill('[name="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
  
  // Save auth state
  await page.context().storageState({ path: 'e2e/.auth/user.json' });
});
```

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'authenticated',
      dependencies: ['setup'],
      use: { storageState: 'e2e/.auth/user.json' },
      testMatch: /authenticated\/.*\.spec\.ts/,
    },
    {
      name: 'unauthenticated',
      testMatch: /^(?!.*authenticated).*\.spec\.ts/,
    },
  ],
});
```

#### Option B: Mock Supabase Session

Inject session token directly into localStorage before tests.

### Test Cases to Implement

#### Dashboard (`e2e/authenticated/dashboard.spec.ts`)

- [ ] Shows user's transfer history
- [ ] Stats cards display correct numbers
- [ ] Can click into transfer details
- [ ] Empty state for new users

#### Send Page (`e2e/authenticated/send.spec.ts`)

- [ ] Can select file(s)
- [ ] Generates peer ID / QR code
- [ ] Shows "waiting for receiver" state
- [ ] Can set password protection
- [ ] Cancel button works

#### Receive Page (`e2e/authenticated/receive.spec.ts`)

- [ ] Shows own peer ID
- [ ] Can enter sender's peer ID
- [ ] Can scan QR code (mock camera or skip)
- [ ] Shows incoming file offer
- [ ] Accept/Reject buttons work

#### Settings Page (`e2e/authenticated/settings.spec.ts`)

- [ ] Profile form loads with current values
- [ ] Can update display name
- [ ] Can update preferences
- [ ] Shows save confirmation

#### History Page (`e2e/authenticated/history.spec.ts`)

- [ ] Lists past transfers
- [ ] Pagination works
- [ ] Can filter by status
- [ ] Can search by filename

### Full Transfer E2E ✅

Test actual file transfer between two browser contexts using a local PeerJS
signaling server started automatically by Playwright's `webServer` config.

**Implementation:**
- `playwright.config.ts` — `webServer` is now an array; second entry starts `apps/signaling` on port 9000 before tests and kills it after
- `e2e/authenticated/transfer.spec.ts` — two `chromium` contexts, both using `e2e/.auth/user.json`
- `e2e/fixtures/test-file.txt` — small text fixture for the transfer

**Future concern (separate task):** Verify transfer history correctly records sender vs receiver identity using **two separate test accounts**.

---

## Lower Priority Items

### Cross-Browser E2E (P2)

```typescript
// playwright.config.ts
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
]
```

- Install browsers: `npx playwright install firefox webkit`
- Run on all 3: ~81 test runs (27 specs × 3 browsers)

### Dead Code Cleanup ✅

`sender.ts` — `safeSend()` calls in `cancel()`, `pause()`, `resume()` were unawaited inside try/catch (catch blocks unreachable). Fixed by replacing `try { this.safeSend(...) } catch` with `.catch()` on the returned promise.

### Performance / Monitoring ✅

- [x] Bundle analyzer (`@next/bundle-analyzer`) added and `npm run analyze` configured.
- [x] Lighthouse CI workflow created.
- [x] Error tracking (Sentry) completely configured in `instrumentation.ts` and `next.config.js`.
- [x] Analytics (`@vercel/analytics`) added to the root layout.
- [x] Speed Insights (`@vercel/speed-insights`) added to the root layout for Web Vitals tracking.

### Two-Account Transfer History Verification ✅

Created a secondary E2E test account (`playwright-test-receiver@hyperlink.app`). The `two-account-history.spec.ts` script successfully verifies:
- Sender's history shows the file as "Sent"
- Receiver's history shows the file as "Received"
- Both users have the exact same Transfer ID recorded for the transaction

---

## Quick Commands

```bash
# Navigate to project
cd /home/girishrv/Documents/Projects/inhouse

# Install dependencies
npm install

# Run all unit tests
cd apps/web && npm run test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# E2E with UI
npm run test:e2e:ui

# Lint all packages
npx turbo lint

# Build all
npx turbo build

# Dev server
cd apps/web && npm run dev
```

---

## Key Files Reference

| Purpose | Path |
| --------- | ------ |
| Vitest config | `apps/web/vitest.config.ts` |
| Playwright config | `apps/web/playwright.config.ts` |
| CI workflow | `.github/workflows/test.yml` |
| Test setup | `apps/web/vitest.setup.ts` |
| Test utils | `apps/web/src/test-utils/` |
| E2E specs | `apps/web/e2e/` |
| Unit tests | `apps/web/src/**/__tests__/` |

---

## Environment Variables

### Web App (Vercel)

```text
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
NEXT_PUBLIC_PEERJS_HOST=hyperlink-signaling.onrender.com
NEXT_PUBLIC_PEERJS_PORT=443
NEXT_PUBLIC_PEERJS_PATH=/peerjs
NEXT_PUBLIC_PEERJS_SECURE=true
```

### CI (GitHub Actions)

```text
VERCEL_ORG_ID=team_7dVZy4SuuGRT43YBwxq1uzIU
VERCEL_PROJECT_ID=prj_XTd0jyyghAVU6WsoA2szVLX7JzQx
VERCEL_TOKEN=(secret)
```

### E2E (if using real auth)

```text
E2E_TEST_PASSWORD=(secret)
```

---

## Notes for Next Agent

1. **Always run lint before pushing**: `npx turbo lint`
2. **Coverage must stay above thresholds** — vitest config enforces this
3. **E2E authenticated flows are the last high-value testing item** — after that, testing is "done" until new features
4. **Supabase auth** — the app uses Supabase for auth, sessions stored in cookies/localStorage
5. **PeerJS mocks** exist at `apps/web/src/__mocks__/peerjs.ts` for unit tests
6. **jsdom limitations** — some tests need `Element.prototype.scrollIntoView = vi.fn()` or similar mocks
