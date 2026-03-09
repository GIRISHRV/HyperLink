# Development Guide

This guide covers development workflows, patterns, and best practices for HyperLink.

## Development Workflow

### Daily Development

```bash
# Start development servers
npm run dev

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Format code
npm run format
```

### Before Committing

```bash
# Run all checks
npm run validate  # Runs: test + lint + typecheck + build

# Or run individually
npm test
npm run lint
npm run format:check
npm run build
```

## Code Organization

### Component Structure

```typescript
// 1. Imports (external first, then internal)
import { FC, useState, useCallback } from 'react';
import { logger } from '@repo/utils';

// 2. Types/Interfaces
interface MyComponentProps {
  title: string;
  onAction: () => void;
}

// 3. Component
export const MyComponent: FC<MyComponentProps> = ({ title, onAction }) => {
  // 4. State
  const [isLoading, setIsLoading] = useState(false);
  
  // 5. Callbacks
  const handleClick = useCallback(() => {
    logger.info('Button clicked');
    onAction();
  }, [onAction]);
  
  // 6. Render
  return (
    <div>
      <h2>{title}</h2>
      <button onClick={handleClick} disabled={isLoading}>
        Action
      </button>
    </div>
  );
};
```

### Custom Hook Structure

```typescript
export function useCustomHook(initialValue: string) {
  // 1. State
  const [value, setValue] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  
  // 2. Refs
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  // 3. Effects
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  // 4. Callbacks
  const updateValue = useCallback((newValue: string) => {
    setIsLoading(true);
    setValue(newValue);
    setIsLoading(false);
  }, []);
  
  // 5. Return
  return { value, isLoading, updateValue };
}
```

### API Route Structure

```typescript
// apps/web/src/app/api/my-endpoint/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@repo/utils';

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // 2. Validate input
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing id parameter' },
        { status: 400 }
      );
    }
    
    // 3. Fetch data
    const { data, error } = await supabase
      .from('my_table')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      logger.error('Database error', { error, userId: user.id });
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
    
    // 4. Return response
    return NextResponse.json({ data });
  } catch (error) {
    logger.error('Unexpected error', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `FileTransfer`, `SendButton` |
| Hooks | camelCase with `use` prefix | `useSendTransfer`, `usePeerConnection` |
| Functions | camelCase | `sendFile`, `handleConnection` |
| Constants | UPPER_SNAKE_CASE | `CHUNK_SIZE`, `MAX_RETRIES` |
| Types/Interfaces | PascalCase | `TransferState`, `PeerConfig` |
| Files (components) | PascalCase.tsx | `FileTransfer.tsx` |
| Files (utilities) | kebab-case.ts | `file-utils.ts` |

## Import Organization

```typescript
// 1. External dependencies
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. Internal dependencies (absolute imports)
import { logger } from '@repo/utils';
import { TransferState } from '@repo/types';

// 3. Local imports (relative)
import { PeerManager } from '../peer/PeerManager';
import { sendChunk } from './utils';

// 4. Types
import type { FC } from 'react';
import type { Transfer } from '@/types';
```

## Logging

**CRITICAL**: Never use `console.log`. Always use the centralized logger:

```typescript
import { logger } from '@repo/utils';

// Good ✅
logger.info('Transfer started', { transferId, fileSize });
logger.warn('Connection unstable', { peerId, latency });
logger.error('Transfer failed', { error, transferId });

// Bad ❌
console.log('Transfer started');
console.error(error);
```

**Logger Benefits:**
- Structured logging (JSON in production)
- Automatic Sentry integration
- Consistent formatting
- Contextual information

## Error Handling

### User-Facing Errors

```typescript
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', { error, context });
  
  // Show user-friendly message
  toast.error('Something went wrong. Please try again.');
  
  // Update state
  setState('error');
}
```

### API Errors

```typescript
export async function POST(request: NextRequest) {
  try {
    // Implementation
  } catch (error) {
    logger.error('API error', { error, path: request.url });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Testing

### Unit Tests

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('MyComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('renders with title', () => {
    render(<MyComponent title="Test" onAction={() => {}} />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
  
  it('calls onAction when button clicked', async () => {
    const onAction = vi.fn();
    const user = userEvent.setup();
    
    render(<MyComponent title="Test" onAction={onAction} />);
    await user.click(screen.getByRole('button'));
    
    expect(onAction).toHaveBeenCalledOnce();
  });
});
```

### E2E Tests

```typescript
import { test, expect } from '@playwright/test';

test('user can send file', async ({ page }) => {
  await page.goto('/app/send');
  
  await page.setInputFiles('input[type="file"]', 'test-file.txt');
  await page.click('button:has-text("Send")');
  
  await expect(page.locator('text=Transfer Complete')).toBeVisible();
});
```

## Performance Best Practices

### 1. Memoization

```typescript
// Memoize expensive computations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// Memoize callbacks
const handleClick = useCallback(() => {
  doSomething();
}, []);
```

### 2. Lazy Loading

```typescript
// Lazy load components
const HeavyComponent = lazy(() => import('./HeavyComponent'));

// Use with Suspense
<Suspense fallback={<Loading />}>
  <HeavyComponent />
</Suspense>
```

### 3. Avoid Memory Leaks

```typescript
useEffect(() => {
  const subscription = subscribe();
  
  // Always cleanup
  return () => {
    subscription.unsubscribe();
  };
}, []);
```

## Git Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation updates

### Commit Messages

```
type(scope): subject

body (optional)

footer (optional)
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Examples:**
```
feat(transfer): add pause/resume functionality
fix(auth): resolve token expiration issue
docs(readme): update installation instructions
```

## Common Patterns

### Loading States

```typescript
const [isLoading, setIsLoading] = useState(false);

const handleAction = async () => {
  setIsLoading(true);
  try {
    await performAction();
  } finally {
    setIsLoading(false);
  }
};
```

### Form Handling

```typescript
const [formData, setFormData] = useState({ email: '', password: '' });

const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
  setFormData(prev => ({
    ...prev,
    [e.target.name]: e.target.value
  }));
};

const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  // Handle submission
};
```

### Conditional Rendering

```typescript
// Good ✅
{isLoading && <Spinner />}
{error && <ErrorMessage error={error} />}
{data && <DataDisplay data={data} />}

// Bad ❌
{isLoading ? <Spinner /> : null}
{error ? <ErrorMessage error={error} /> : null}
```

## Debugging

### Browser DevTools

- **Application > IndexedDB**: Inspect stored chunks
- **Network**: Monitor API calls
- **Console**: View logger output
- **Sources**: Set breakpoints

### WebRTC Debugging

- Chrome: `chrome://webrtc-internals`
- Firefox: `about:webrtc`

### Sentry

- View errors in Sentry dashboard
- Check breadcrumbs for context
- Review stack traces

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

---

**Last Updated**: 2024
