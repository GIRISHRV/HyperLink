/**
 * FINDING-009: Circuit breaker / retry wrapper for Supabase API calls.
 *
 * Retries `fn` up to `maxRetries` times with exponential backoff + jitter.
 * On every attempt except the last it catches all errors. If the final
 * attempt throws, the error propagates to the caller unchanged.
 *
 * Usage:
 *   const data = await withRetry(() => supabase.from("transfers").select("*"));
 */
export async function withRetry<T>(
    fn: () => PromiseLike<T> | Promise<T> | T,
    maxRetries = 3,
    baseDelayMs = 500,
): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            if (attempt === maxRetries) throw err;

            // Exponential backoff with full-jitter: delay in [0, baseDelay * 2^attempt]
            const cap = baseDelayMs * Math.pow(2, attempt);
            const delay = Math.random() * cap;
            await new Promise<void>((resolve: () => void) => setTimeout(resolve, delay));
        }
    }

    // TypeScript requires a return here even though the loop above always
    // resolves or throws before we reach this point.
    throw new Error("withRetry: exhausted retries");
}
