# Monorepo Upgrade Plan - The Proper Way

## Current Status: ✅ STABLE BASELINE ESTABLISHED

- Next.js: 15.1.7 (stable, working)
- ESLint: 8.57.1 (deprecated but functional)
- All workspaces aligned
- CI/CD passing

## Why We Reverted the "Big Bang" Upgrade

Following monorepo best practices (thanks Gemini!), we reverted the ESLint 9 + Next.js 16 upgrade because:

1. **Hoisting Conflicts**: Turborepo hoists dependencies to root. Mixing ESLint 8 and 9 across workspaces breaks this.
2. **All-or-Nothing**: In a monorepo, you can't half-upgrade. Either all apps use ESLint 9 or none do.
3. **Breaking Changes**: ESLint 9 requires flat config format - a structural change affecting all packages.

## The Proper Incremental Upgrade Strategy

### Phase 1: Establish Baseline (✅ DONE)

- [x] Revert to stable versions
- [x] Ensure all workspaces use same ESLint version
- [x] Verify CI/CD passes
- [x] Document current state

### Phase 2: Create Parallel Config (NEXT)

Instead of rewriting `packages/eslint-config`, create a new package:

```bash
# Create new ESLint 9 config package
mkdir packages/eslint-config-v9
```

**packages/eslint-config-v9/package.json**:

```json
{
  "name": "@repo/eslint-config-v9",
  "version": "1.0.0",
  "main": "index.js",
  "peerDependencies": {
    "eslint": "^9.0.0",
    "typescript": "^5.0.0"
  }
}
```

**packages/eslint-config-v9/index.js** (flat config):

```js
import nextPlugin from "@next/eslint-plugin-next";
import typescriptPlugin from "@typescript-eslint/eslint-plugin";
// ... ESLint 9 flat config
```

### Phase 3: Migrate One App at a Time

#### Step 1: Upgrade `apps/web` first

```json
// apps/web/package.json
{
  "devDependencies": {
    "eslint": "^9.39.4",
    "eslint-config-next": "^16.1.6",
    "@repo/eslint-config-v9": "*", // New config
    "next": "16.1.6"
  }
}
```

Create `apps/web/eslint.config.js` (flat config):

```js
import baseConfig from "@repo/eslint-config-v9";
export default [...baseConfig];
```

#### Step 2: Test thoroughly

- Run `npm install` (will hoist ESLint 9 for web app)
- Run `npm run lint --workspace=apps/web`
- Run full test suite
- Test in CI/CD

#### Step 3: Migrate other workspaces

Only after `apps/web` is stable:

- Migrate `apps/signaling`
- Migrate `packages/*` one by one

#### Step 4: Remove old config

Once ALL workspaces use v9:

- Delete `packages/eslint-config`
- Rename `packages/eslint-config-v9` → `packages/eslint-config`
- Update root `package.json` overrides

### Phase 4: Supabase Auth Migration (PARALLEL TRACK)

This can happen independently:

1. Create new auth utilities using `@supabase/ssr`
2. Gradually replace `@supabase/auth-helpers-nextjs` imports
3. Test each auth flow
4. Remove deprecated package

## Tools to Use

### 1. manypkg (Version Consistency)

```bash
# Check for version mismatches
npx @manypkg/cli check

# Auto-fix common issues
npx @manypkg/cli fix
```

### 2. syncpack (Alternative)

```bash
# List version mismatches
npx syncpack list-mismatches

# Fix them
npx syncpack fix-mismatches
```

### 3. Turborepo Cache

```bash
# Clear cache when changing configs
npx turbo clean
```

## Key Principles for Monorepo Upgrades

1. **Never Mix Major Versions**: All workspaces must use same major version of shared deps
2. **Use Overrides at Root**: Put version overrides in root `package.json`, not individual apps
3. **Parallel Configs**: Create new config packages instead of rewriting existing ones
4. **Incremental Migration**: Migrate one workspace at a time, test thoroughly
5. **Use Tools**: manypkg/syncpack catch version mismatches automatically

## Current Dependencies Status

### Critical (Needs Migration)

- ⚠️ `@supabase/auth-helpers-nextjs@0.10.0` → Migrate to `@supabase/ssr`

### Important (Blocked by Ecosystem)

- ⚠️ `eslint@8.57.1` → Upgrade to 9.x (follow plan above)

### Low Priority (Dev Only)

- ℹ️ Storybook crypto vulnerabilities (6 low severity)
- ℹ️ Various deprecated transitive dependencies

## Timeline Estimate

- **Phase 2** (Parallel Config): 2-4 hours
- **Phase 3** (Incremental Migration): 1-2 days (with testing)
- **Phase 4** (Supabase): 4-8 hours (parallel track)

**Total**: ~1 week for complete modernization, done properly

## Resources

- [Turborepo Docs](https://turbo.build/repo/docs)
- [manypkg](https://github.com/Thinkmill/manypkg)
- [ESLint 9 Migration Guide](https://eslint.org/docs/latest/use/migrate-to-9.0.0)
- [Supabase SSR Migration](https://supabase.com/docs/guides/auth/server-side/migrating-to-ssr-from-auth-helpers)
