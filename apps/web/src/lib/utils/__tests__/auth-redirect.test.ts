/**
 * Tests for getSafeRedirect (SEC-008: open-redirect prevention).
 *
 * The auth page reads ?redirect= from the URL after sign-in/sign-up and
 * navigates there. Without sanitization, an attacker could craft a URL like:
 *   /auth?redirect=https://evil.com
 * and the user would be redirected to an external site after login.
 */
import { describe, it, expect } from "vitest";
import { getSafeRedirect } from "@/lib/utils/auth-redirect";

describe("getSafeRedirect (SEC-008)", () => {
  // ── Safe relative paths ────────────────────────────────────────────────────

  it("allows a simple relative path", () => {
    expect(getSafeRedirect("/send")).toBe("/send");
  });

  it("allows /receive", () => {
    expect(getSafeRedirect("/receive")).toBe("/receive");
  });

  it("allows /dashboard", () => {
    expect(getSafeRedirect("/dashboard")).toBe("/dashboard");
  });

  it("allows nested paths like /settings/profile", () => {
    expect(getSafeRedirect("/settings/profile")).toBe("/settings/profile");
  });

  it("allows paths with query strings", () => {
    expect(getSafeRedirect("/send?file=test")).toBe("/send?file=test");
  });

  // ── Fallback cases ──────────────────────────────────────────────────────────

  it("returns /dashboard when redirect is null", () => {
    expect(getSafeRedirect(null)).toBe("/dashboard");
  });

  it("returns /dashboard for empty string", () => {
    expect(getSafeRedirect("")).toBe("/dashboard");
  });

  it("uses custom fallback when provided", () => {
    expect(getSafeRedirect(null, "/home")).toBe("/home");
  });

  // ── Open-redirect attack vectors (should all fall back to /dashboard) ───────

  it("blocks absolute http URL", () => {
    expect(getSafeRedirect("http://evil.com")).toBe("/dashboard");
  });

  it("blocks absolute https URL", () => {
    expect(getSafeRedirect("https://evil.com/steal-credentials")).toBe("/dashboard");
  });

  it("blocks protocol-relative URL (//evil.com)", () => {
    // //evil.com starts with / but also starts with // — must be blocked
    expect(getSafeRedirect("//evil.com")).toBe("/dashboard");
  });

  it("blocks protocol-relative URL with path (//evil.com/path)", () => {
    expect(getSafeRedirect("//evil.com/auth/callback")).toBe("/dashboard");
  });

  it("blocks javascript: URI", () => {
    expect(getSafeRedirect("javascript:alert(1)")).toBe("/dashboard");
  });

  it("blocks data: URI", () => {
    expect(getSafeRedirect("data:text/html,<script>evil</script>")).toBe("/dashboard");
  });

  it("blocks bare domain without protocol", () => {
    expect(getSafeRedirect("evil.com/steal")).toBe("/dashboard");
  });
});
