import { writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.resolve(__dirname, "fixtures");

/**
 * Generates a fixture file filled with pseudo-random bytes.
 * Using a deterministic seed pattern so the content is predictable but
 * large enough that WebRTC P2P transfer takes several seconds on localhost.
 */
function generateFixture(filepath: string, sizeBytes: number) {
    if (existsSync(filepath)) return; // already exists, skip

    console.log(`[global-setup] Generating fixture: ${filepath} (${sizeBytes / 1024 / 1024} MB)…`);
    const chunkSize = 1024 * 1024; // 1 MB chunks to avoid OOM
    const chunks: Buffer[] = [];

    for (let offset = 0; offset < sizeBytes; offset += chunkSize) {
        const size = Math.min(chunkSize, sizeBytes - offset);
        const buf = Buffer.allocUnsafe(size);
        // Fill with a repeating byte pattern — fast and deterministic
        for (let i = 0; i < size; i++) {
            buf[i] = (offset + i) & 0xff;
        }
        chunks.push(buf);
    }

    mkdirSync(FIXTURES_DIR, { recursive: true });
    writeFileSync(filepath, Buffer.concat(chunks));
    console.log(`[global-setup] ✓ Fixture ready: ${filepath}`);
}

export default async function globalSetup() {
    console.log('[global-setup] Generating test fixtures in parallel...');
    
    // Generate 10MB, 50MB, and 100MB fixtures in parallel
    // These fixtures are used across multiple tests for file transfer validation
    await Promise.all([
        // 10MB fixture - for quick transfer tests
        Promise.resolve().then(() => generateFixture(
            path.resolve(FIXTURES_DIR, "test-file-10mb.bin"),
            10 * 1024 * 1024
        )),
        // 50MB fixture - for abort/pause-resume tests
        Promise.resolve().then(() => generateFixture(
            path.resolve(FIXTURES_DIR, "test-file-50mb.bin"),
            50 * 1024 * 1024
        )),
        // 100MB fixture - for stress testing and network resilience
        Promise.resolve().then(() => generateFixture(
            path.resolve(FIXTURES_DIR, "test-file-100mb.bin"),
            100 * 1024 * 1024
        ))
    ]);
    
    console.log('[global-setup] All fixtures ready');
}
