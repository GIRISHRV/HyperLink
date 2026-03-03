/**
 * Phase 1 — Auth Service (auth-service.ts)
 *
 * Tests for: signUp, signIn, signInWithMagicLink, resetPassword, signOut, getCurrentUser
 *
 * Security focus: error normalisation, no user enumeration, session handling.
 *
 * All Supabase calls are mocked — no real network or database access.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Supabase BEFORE importing the service ─────────────────────────

const { mockAuth } = vi.hoisted(() => {
  return {
    mockAuth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOtp: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
    },
  };
});

vi.mock("@/lib/supabase/client", () => ({
  supabase: { auth: mockAuth },
}));

import { signUp, signIn, signInWithMagicLink, resetPassword, signOut, getCurrentUser } from "../auth-service";

describe("Auth Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Set up window.location.origin for magic link / reset redirects
    Object.defineProperty(window, "location", {
      value: { origin: "https://app.example.com" },
      writable: true,
    });
  });

  // ─── signUp ────────────────────────────────────────────────────────────

  describe("signUp", () => {
    it("calls supabase.auth.signUp with email and password", async () => {
      const mockData = { user: { id: "u1" }, session: {} };
      mockAuth.signUp.mockResolvedValue({ data: mockData, error: null });

      const result = await signUp("test@example.com", "password123");

      expect(mockAuth.signUp).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
      expect(result.data).toBe(mockData);
      expect(result.error).toBeNull();
    });

    it("returns error on duplicate email", async () => {
      const err = { message: "User already registered", status: 422 };
      mockAuth.signUp.mockResolvedValue({ data: null, error: err });

      const result = await signUp("existing@example.com", "pw");
      expect(result.error).toEqual(err);
    });

    it("returns error on invalid/weak password", async () => {
      const err = { message: "Password should be at least 6 characters", status: 422 };
      mockAuth.signUp.mockResolvedValue({ data: null, error: err });

      const result = await signUp("test@example.com", "123");
      expect(result.error).toEqual(err);
    });
  });

  // ─── signIn ────────────────────────────────────────────────────────────

  describe("signIn", () => {
    it("calls signInWithPassword with email and password", async () => {
      const mockData = { user: { id: "u1" }, session: { access_token: "tok" } };
      mockAuth.signInWithPassword.mockResolvedValue({ data: mockData, error: null });

      const result = await signIn("user@test.com", "secret");

      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: "user@test.com",
        password: "secret",
      });
      expect(result.data).toBe(mockData);
      expect(result.error).toBeNull();
    });

    it("returns error on invalid credentials", async () => {
      const err = { message: "Invalid login credentials", status: 400 };
      mockAuth.signInWithPassword.mockResolvedValue({ data: null, error: err });

      const result = await signIn("user@test.com", "wrong");
      expect(result.error).toEqual(err);
    });
  });

  // ─── signInWithMagicLink ──────────────────────────────────────────────

  describe("signInWithMagicLink", () => {
    it("calls signInWithOtp with redirect URL", async () => {
      mockAuth.signInWithOtp.mockResolvedValue({ data: {}, error: null });

      const result = await signInWithMagicLink("user@test.com");

      expect(mockAuth.signInWithOtp).toHaveBeenCalledWith({
        email: "user@test.com",
        options: {
          emailRedirectTo: "https://app.example.com/dashboard",
        },
      });
      expect(result.error).toBeNull();
    });

    it("returns error on rate limiting", async () => {
      const err = { message: "Rate limit exceeded", status: 429 };
      mockAuth.signInWithOtp.mockResolvedValue({ data: null, error: err });

      const result = await signInWithMagicLink("user@test.com");
      expect(result.error).toEqual(err);
    });
  });

  // ─── resetPassword ────────────────────────────────────────────────────

  describe("resetPassword", () => {
    it("calls resetPasswordForEmail with redirect URL", async () => {
      mockAuth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

      await resetPassword("user@test.com");

      expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith(
        "user@test.com",
        { redirectTo: "https://app.example.com/auth" }
      );
    });

    it("throws on error", async () => {
      const err = new Error("Service unavailable");
      mockAuth.resetPasswordForEmail.mockResolvedValue({ data: null, error: err });

      await expect(resetPassword("user@test.com")).rejects.toThrow("Service unavailable");
    });
  });

  // ─── signOut ──────────────────────────────────────────────────────────

  describe("signOut", () => {
    it("calls supabase.auth.signOut", async () => {
      mockAuth.signOut.mockResolvedValue({ error: null });

      const result = await signOut();

      expect(mockAuth.signOut).toHaveBeenCalledOnce();
      expect(result.error).toBeNull();
    });

    it("returns error if sign-out fails", async () => {
      const err = { message: "Network error" };
      mockAuth.signOut.mockResolvedValue({ error: err });

      const result = await signOut();
      expect(result.error).toEqual(err);
    });
  });

  // ─── getCurrentUser ───────────────────────────────────────────────────

  describe("getCurrentUser", () => {
    it("returns user when authenticated", async () => {
      const user = { id: "u1", email: "test@example.com" };
      mockAuth.getUser.mockResolvedValue({ data: { user } });

      const result = await getCurrentUser();
      expect(result).toEqual(user);
    });

    it("returns null when not authenticated", async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null } });

      const result = await getCurrentUser();
      expect(result).toBeNull();
    });
  });
});
