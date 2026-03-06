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
    // 50 MB fixture — used by abort / pause-resume tests to ensure the transfer
    // is still in progress when the test interacts with the control buttons.
    generateFixture(
        path.resolve(FIXTURES_DIR, "test-file-50mb.bin"),
        50 * 1024 * 1024
    );
}
