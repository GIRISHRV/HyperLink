import { createHash } from 'crypto';
import { readFile, writeFile, unlink } from 'fs/promises';
import { join } from 'path';

/**
 * File Helper Functions
 * Provides utilities for file generation, validation, and cleanup
 */

/**
 * Generate a test file with specified size and optional pattern
 * @param sizeBytes - Size of the file in bytes
 * @param pattern - Optional pattern to fill the file (default: random data)
 * @returns Path to the generated file
 */
export async function generateTestFile(
  sizeBytes: number,
  pattern?: string
): Promise<string> {
  const timestamp = Date.now();
  const fileName = `test-file-${timestamp}-${sizeBytes}b.bin`;
  const filePath = join(process.cwd(), 'apps/web/e2e/fixtures', fileName);
  
  let buffer: Buffer;
  
  if (pattern) {
    // Fill with repeating pattern
    const patternBuffer = Buffer.from(pattern);
    const repeatCount = Math.ceil(sizeBytes / patternBuffer.length);
    buffer = Buffer.concat(
      Array(repeatCount).fill(patternBuffer)
    ).slice(0, sizeBytes);
  } else {
    // Fill with random data
    buffer = Buffer.alloc(sizeBytes);
    for (let i = 0; i < sizeBytes; i++) {
      buffer[i] = Math.floor(Math.random() * 256);
    }
  }
  
  await writeFile(filePath, buffer);
  return filePath;
}

/**
 * Verify file integrity by comparing checksums
 * @param originalPath - Path to the original file
 * @param downloadedPath - Path to the downloaded file
 * @returns True if files are identical, false otherwise
 */
export async function verifyFileIntegrity(
  originalPath: string,
  downloadedPath: string
): Promise<boolean> {
  try {
    const originalChecksum = await calculateChecksum(originalPath);
    const downloadedChecksum = await calculateChecksum(downloadedPath);
    
    return originalChecksum === downloadedChecksum;
  } catch (error) {
    console.error('Error verifying file integrity:', error);
    return false;
  }
}

/**
 * Calculate SHA-256 checksum of a file
 * @param filePath - Path to the file
 * @returns Hexadecimal checksum string
 */
export async function calculateChecksum(filePath: string): Promise<string> {
  const fileBuffer = await readFile(filePath);
  const hash = createHash('sha256');
  hash.update(fileBuffer);
  return hash.digest('hex');
}

/**
 * Clean up test files by deleting them
 * @param paths - Array of file paths to delete
 */
export async function cleanupTestFiles(paths: string[]): Promise<void> {
  const deletePromises = paths.map(async (path) => {
    try {
      await unlink(path);
    } catch (error) {
      // Ignore errors if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error(`Error deleting file ${path}:`, error);
      }
    }
  });
  
  await Promise.all(deletePromises);
}
