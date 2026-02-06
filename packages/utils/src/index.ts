/**
 * Format bytes to human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Generate unique transfer ID
 */
export function generateTransferId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Calculate total number of chunks for a file
 */
export function calculateChunkCount(fileSize: number, chunkSize: number = 65536): number {
  return Math.ceil(fileSize / chunkSize);
}

/**
 * Calculate transfer speed in bytes per second
 */
export function calculateSpeed(bytesTransferred: number, elapsedTime: number): number {
  if (elapsedTime === 0) return 0;
  return Math.round(bytesTransferred / (elapsedTime / 1000));
}

/**
 * Calculate estimated time remaining in seconds
 */
export function calculateTimeRemaining(
  totalBytes: number,
  bytesTransferred: number,
  speed: number
): number {
  if (speed === 0) return Infinity;
  const remainingBytes = totalBytes - bytesTransferred;
  return Math.round(remainingBytes / speed);
}

/**
 * Format time in seconds to human-readable format
 */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return "Calculating...";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

/**
 * Validate file size (max 50GB to be safe)
 */
export function validateFileSize(fileSize: number): { valid: boolean; error?: string } {
  const MAX_FILE_SIZE = 50 * 1024 * 1024 * 1024; // 50GB
  if (fileSize === 0) {
    return { valid: false, error: "File is empty" };
  }
  if (fileSize > MAX_FILE_SIZE) {
    return { valid: false, error: `File exceeds maximum size of ${formatFileSize(MAX_FILE_SIZE)}` };
  }
  return { valid: true };
}

/**
 * Debounce function for UI updates
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function for progress updates
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
