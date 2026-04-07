import { unlinkSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.resolve(__dirname, "fixtures");

/**
 * Clean up generated fixture files after all tests complete.
 * This ensures test artifacts don't accumulate and consume disk space.
 */
export default async function globalTeardown() {
    console.log('[global-teardown] Cleaning up test fixtures...');
    
    const fixtures = [
        path.resolve(FIXTURES_DIR, "test-file-10mb.bin"),
        path.resolve(FIXTURES_DIR, "test-file-50mb.bin"),
        path.resolve(FIXTURES_DIR, "test-file-100mb.bin")
    ];
    
    let cleanedCount = 0;
    
    for (const fixture of fixtures) {
        try {
            if (existsSync(fixture)) {
                unlinkSync(fixture);
                cleanedCount++;
                console.log(`[global-teardown] ✓ Deleted: ${path.basename(fixture)}`);
            }
        } catch (error) {
            console.error(`[global-teardown] ✗ Failed to delete ${path.basename(fixture)}:`, error);
        }
    }
    
    console.log(`[global-teardown] Cleanup complete (${cleanedCount}/${fixtures.length} files removed)`);
}
