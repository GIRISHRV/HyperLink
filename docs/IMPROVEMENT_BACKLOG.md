# HyperLink Improvement Backlog

## Completed ✅

### 1. CI/CD Workflows ✅

**Status**: Fully implemented

Existing workflows:

- ✅ `test.yml`: Lint, type-check, unit tests (with coverage), E2E tests, build, Vercel deployment
- ✅ `lighthouse.yml`: Performance monitoring on PRs
- ✅ Concurrency control to cancel outdated runs
- ✅ Artifact uploads for coverage and test reports
- ✅ Conditional deployment (production on master, preview on PRs)

### 2. Pre-commit Hooks ✅

**Status**: Implemented

Setup complete with Husky + lint-staged:

- ✅ ESLint auto-fix on staged files
- ✅ Prettier auto-format on staged files
- ✅ TypeScript compilation check
- ✅ Works with VS Code GUI commits, CLI, and all git clients

### 3. API Documentation ✅

**Status**: Implemented

Added comprehensive API documentation:

- ✅ OpenAPI 3.0 specification (`apps/signaling/openapi.yaml`)
- ✅ Complete README with examples (`apps/signaling/README.md`)
- ✅ Authentication guide (JWT tokens)
- ✅ Rate limiting documentation
- ✅ Deployment instructions (Railway, Docker, manual)
- ✅ Troubleshooting guide

### 4. Storybook Integration ✅

**Status**: Implemented

Added Storybook for component development:

- ✅ Storybook 10.2.16 with Next.js integration
- ✅ Tailwind CSS support configured
- ✅ Example stories for Button, ProgressBar, EmptyState
- ✅ Accessibility addon (a11y) for testing
- ✅ Comprehensive guide at `apps/web/STORYBOOK.md`

### 5. ZIP Memory Optimization ✅

**Status**: Implemented

Improved multi-file zipping with memory optimization:

- ✅ Chunked file reading (1MB chunks) to reduce memory pressure
- ✅ Sequential file processing instead of loading all at once
- ✅ Progress indicator with percentage
- ✅ Modal UI with cancel functionality
- ✅ Processing state for immediate user feedback
- ✅ 10GB limit with helpful error messages

---

## Active Backlog

### High Priority

#### 1. WebWorker Integration

**Why Important**: UI freezes during encryption make the app feel broken, especially for large files.

---

**Note**: Testing improvements have been moved to a separate planning document. See [TESTING_ROADMAP.md](./TESTING_ROADMAP.md) for future test enhancements.
Add Storybook for:

- Component library documentation
- Visual testing
- Isolated component development
- Design system reference

**Why Important**: Improves developer experience and makes UI development faster.

---

**Note**: Testing improvements have been moved to a separate planning document. See [TESTING_ROADMAP.md](./TESTING_ROADMAP.md) for future test enhancements.

- Encryption workflows
- Transfer history

## Low Priority

### 8. Load Testing

**Status**: Not implemented  
**Impact**: Understand system limits and bottlenecks  
**Effort**: Medium

Stress test:

- Signaling server concurrent connections
- Multiple simultaneous transfers
- Large file handling (50GB+)
- Network condition simulation

### 9. Mobile E2E Tests

**Status**: Desktop-focused only  
**Impact**: Better mobile experience validation  
**Effort**: Low

Playwright config currently targets desktop browsers. Add:

- Mobile viewport testing
- Touch interaction tests
- Mobile-specific UI tests
- iOS Safari and Android Chrome

### 10. Visual Regression Testing

**Status**: Not implemented  
**Impact**: Catch unintended UI changes  
**Effort**: Low

Add Chromatic or similar tool for:

- Automated screenshot comparison
- UI consistency checks
- Design system validation
- Cross-browser visual testing

---

**Note**: This backlog was generated from codebase analysis. Priorities may shift based on user needs and business requirements.
