/**
 * SEC-008: Sanitize the ?redirect= query parameter before navigating.
 * Only allow relative paths to prevent open-redirect attacks where an attacker
 * crafts a link like /auth?redirect=https://evil.com or /auth?redirect=//evil.com
 */
export function getSafeRedirect(raw: string | null, fallback = "/dashboard"): string {
  if (!raw) return fallback;
  // Must start with / and NOT be a protocol-relative URL like //evil.com
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : fallback;
}
