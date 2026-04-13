# CI/CD Scripts

## Running CI Locally

To test the full CI pipeline locally before pushing:

```bash
./scripts/ci-local.sh
```

This script runs all CI stages in order:

1. **Foundation**: Lint & Type Check + Security Audit
2. **Unit Tests**: All vitest tests
3. **E2E Tests**: Playwright tests (requires `.env.local`)
4. **Build**: Production build

## Running Individual Stages

You can also run individual stages:

```bash
# Lint and typecheck only
npx turbo run lint typecheck

# Unit tests only
npx turbo run test

# E2E tests only (from apps/web directory)
cd apps/web && npx playwright test

# Build only
npx turbo build --filter=@hyperlink/web

# Full validation (what pre-push hook runs)
npm run validate
```

## E2E Test Requirements

E2E tests require environment variables in `apps/web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
E2E_TEST_EMAIL=sender@example.com
E2E_TEST_PASSWORD=your_password
E2E_RECEIVER_EMAIL=receiver@example.com
E2E_RECEIVER_PASSWORD=your_password
NEXT_PUBLIC_PEER_SERVER_HOST=localhost
NEXT_PUBLIC_PEER_SERVER_PORT=9000
NEXT_PUBLIC_PEER_SERVER_PATH=/myapp
```

## Using Act (GitHub Actions Locally)

For a more accurate simulation of GitHub Actions, use [act](https://github.com/nektos/act):

```bash
# Install act (macOS)
brew install act

# Install act (Linux)
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Run the workflow
act push -W .github/workflows/test.yml

# Run specific job
act push -W .github/workflows/test.yml -j foundation

# Run with secrets (create .secrets file)
act push -W .github/workflows/test.yml --secret-file .secrets
```

### .secrets file format

```text
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
E2E_TEST_EMAIL=sender@example.com
E2E_TEST_PASSWORD=password
E2E_RECEIVER_EMAIL=receiver@example.com
E2E_RECEIVER_PASSWORD=password
```

## Troubleshooting

### "npm ci" fails with ERESOLVE

This means `package-lock.json` is out of sync. Run:

```bash
npm install
git add package-lock.json
git commit -m "chore: update package-lock.json"
```

### E2E tests fail locally

- Ensure `.env.local` exists with correct values
- Install Playwright browsers: `cd apps/web && npx playwright install --with-deps`
- Check if ports 3000 and 9000 are available

### Build fails

- Clear cache: `npx turbo run build --force`
- Delete `.next` and `node_modules`: `rm -rf apps/web/.next apps/web/node_modules && npm install`
