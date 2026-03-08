# Test Fixtures

This directory contains test fixture files used by the e2e test suite.

## Fixture Files

The following fixture files are automatically generated during test suite initialization:

- **test-file-10mb.bin** (10 MB) - Used for quick transfer tests
- **test-file-50mb.bin** (50 MB) - Used for abort/pause-resume tests
- **test-file-100mb.bin** (100 MB) - Used for stress testing and network resilience tests

## Fixture Management

### Generation

Fixtures are generated in parallel during the global setup phase (`global-setup.ts`) before any tests run. This ensures:

- Fixtures are available for all tests
- Generation happens only once per test run
- Tests can reuse fixtures without regeneration overhead

### Cleanup

Fixtures are automatically cleaned up during the global teardown phase (`global-teardown.ts`) after all tests complete. This ensures:

- Test artifacts don't accumulate on disk
- Clean state for subsequent test runs
- Efficient disk space usage

### Manual Management

If you need to manually regenerate fixtures:

```bash
# Generate fixtures
node --import tsx e2e/global-setup.ts

# Clean up fixtures
node --import tsx e2e/global-teardown.ts
```

## Large Fixtures

For tests requiring very large files (1GB+), fixtures should be generated on-demand within the test rather than in global setup to avoid:

- Long setup times
- Excessive disk space usage
- Memory constraints in CI environments

Example:

```typescript
import { generateTestFile } from './helpers/file';

test('transfer 1GB file', async () => {
  const largePath = await generateTestFile(1024 * 1024 * 1024);
  // ... test logic
  await cleanupTestFiles([largePath]);
});
```

## Fixture Properties

All generated fixtures use deterministic content patterns:

- **Deterministic**: Same size produces same content (reproducible)
- **Efficient**: Generated in 1MB chunks to avoid memory issues
- **Fast**: Uses simple byte patterns rather than random data
- **Verifiable**: Consistent checksums for integrity validation
