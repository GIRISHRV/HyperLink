#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Local CI Test Script
# Mimics the GitHub Actions CI pipeline for local testing
# ─────────────────────────────────────────────────────────────────────────────

set -e  # Exit on error

echo "🚀 Running Local CI Pipeline"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ─── Stage 1: Foundation (Lint & Type Check) ─────────────────────────────────
echo -e "\n${BLUE}📋 Stage 1: Foundation (Lint & Type Check)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "${YELLOW}Running security audit...${NC}"
npm audit --audit-level=high || echo "⚠️  Security audit found issues (non-blocking for local)"

echo -e "\n${YELLOW}Running lint and typecheck...${NC}"
npx turbo run lint typecheck

echo -e "${GREEN}✅ Foundation stage passed${NC}"

# ─── Stage 2: Unit Tests ──────────────────────────────────────────────────────
echo -e "\n${BLUE}🧪 Stage 2: Unit Tests${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

npx turbo run test

echo -e "${GREEN}✅ Unit tests passed${NC}"

# ─── Stage 3: E2E Tests ───────────────────────────────────────────────────────
echo -e "\n${BLUE}🎭 Stage 3: E2E Tests${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if .env.local exists
if [ ! -f "apps/web/.env.local" ]; then
    echo -e "${YELLOW}⚠️  Warning: apps/web/.env.local not found${NC}"
    echo "E2E tests require environment variables. Create .env.local with:"
    echo "  NEXT_PUBLIC_SUPABASE_URL=..."
    echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY=..."
    echo "  E2E_TEST_EMAIL=..."
    echo "  E2E_TEST_PASSWORD=..."
    echo "  E2E_RECEIVER_EMAIL=..."
    echo "  E2E_RECEIVER_PASSWORD=..."
    echo ""
    read -p "Skip E2E tests? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping E2E tests..."
    else
        exit 1
    fi
else
    # Install Playwright browsers if needed
    if [ ! -d "apps/web/node_modules/.cache/ms-playwright" ]; then
        echo -e "${YELLOW}Installing Playwright browsers...${NC}"
        cd apps/web && npx playwright install --with-deps && cd ../..
    fi
    
    # Run E2E tests (not sharded for local)
    cd apps/web && npx playwright test && cd ../..
    
    echo -e "${GREEN}✅ E2E tests passed${NC}"
fi

# ─── Stage 4: Build ───────────────────────────────────────────────────────────
echo -e "\n${BLUE}🏗️  Stage 4: Build${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

npx turbo build --filter=@hyperlink/web

echo -e "${GREEN}✅ Build passed${NC}"

# ─── Summary ──────────────────────────────────────────────────────────────────
echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ All CI stages passed successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
