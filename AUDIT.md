# Codebase Audit Report

## 1. Unused Files & Dead Code

The following files are currently unused and can be safely removed or refactored to be utilized:

**E2E Test Helpers & Mocks (`apps/web/e2e/`)**

- `auth.setup.ts`
- `helpers/assertions.ts`
- `helpers/auth.ts`
- `helpers/file.ts`
- `helpers/network.ts`
- `helpers/webrtc.ts`
- `mocks/indexeddb-mock.ts`
- `mocks/webrtc-mock.ts`
- `page-objects/dashboard-page.ts`
- `page-objects/index.ts`
- `page-objects/receive-page.ts`
- `page-objects/send-page.ts`

**Hooks & Utilities (`apps/web/src/lib/`)**

- `hooks/use-encryption-worker.ts`
- `hooks/use-zip-worker.ts`
- `test-utils/render-with-providers.tsx`
- `worker/index.ts`

**Config Files**

- `packages/eslint-config/library.js`

## 2. Unused Dependencies

The following packages are installed but not used anywhere in their respective workspaces:

**`apps/signaling`**

- `@repo/types`
- `pino-pretty`

**`apps/web`**

- `clsx`
- `lucide-react`
- `serwist`
- `tailwind-merge`

**`packages/eslint-config`**

- `eslint-config-turbo`

**`packages/utils`**

- `pino-pretty`

_Recommendation_: Remove these dependencies from the respective `package.json` files to decrease install times, lower security vulnerabilities, and reduce repository size.

## 3. Technical Debt & Complexity

### A. Oversized Files (Candidates for Refactoring)

Several files have grown too large and violate the Single Responsibility Principle, making them harder to maintain and test. They should be broken down into smaller modules or hooks:

- `apps/web/src/app/status/page.tsx` (872 lines)
- `apps/web/src/lib/transfer/sender.ts` (833 lines)
- `apps/web/src/lib/hooks/use-receive-transfer.ts` (814 lines)
- `apps/web/src/lib/transfer/receiver.ts` (673 lines)
- `apps/web/src/app/settings/page.tsx` (645 lines)

### B. Pending TODOs & FIXMEs

The codebase contains comments marking incomplete work or workarounds that need to be addressed:

- **`apps/web/next.config.js:76`**: `// TODO: migrate to nonce-based CSP when Next.js natively supports it in App Router.`
- **`apps/web/e2e/helpers/auth.ts:24`**: `// TODO: Implement actual user creation via API`
- **`apps/web/e2e/helpers/auth.ts:43`**: `// TODO: Implement actual user deletion via API`

### C. Unused Exports

There are several exported functions and types which are never imported elsewhere. These should be removed unless intended for public consumption:

- `SUPABASE` in `apps/signaling/src/app.ts`
- `Dashboard` in `apps/web/src/components/skeletons.tsx`
- `useTransferRealtime` in `apps/web/src/lib/hooks/use-transfer-realtime.ts`
- `createRateLimit` in `apps/web/src/lib/supabase/rate-limit.ts`

### D. Missing Dev Dependencies Configuration

Several `devDependencies` (like `@vitest/coverage`, `@repo/eslint-config`) and tools like `dotenv` and `@next/eslint-plugin-next` are either missing from `package.json`, incorrectly typed as dependencies, or misconfigured. They should be appropriately listed.

## 4. Recommendations

1. **Clean up Dead Code**: Perform a targeted repository clean-up to delete the 17 identified unused files and remove the 8 unused npm dependencies to tighten the codebase.
2. **Refactor Complex Modules**: Break down the oversized files like `sender.ts` and `use-receive-transfer.ts`. Consider using smaller, composable helpers and moving state logic strictly into dedicated hooks or classes.
3. **Address Test Infrastructure**: Given that many e2e helpers and page objects are completely unused, evaluate the current state of Playwright e2e tests to determine if they are actually running or simply obsolete. If obsolete, remove them; if necessary, integrate them back into the test runner.
