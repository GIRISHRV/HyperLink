/**
 * Phase 2 — Profile Service (profile-service.ts)
 *
 * Tests for: getUserProfile, updateUserProfile, createUserProfile
 *
 * All Supabase calls mocked.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock setup ─────────────────────────────────────────────────────────

function createQueryBuilder(resolvedData: unknown = null, resolvedError: unknown = null) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ["select", "insert", "update", "upsert", "eq"]) {
    builder[m] = vi.fn().mockReturnValue(builder);
  }
  builder.single = vi.fn().mockResolvedValue({ data: resolvedData, error: resolvedError });
  return builder;
}

let currentBuilder = createQueryBuilder();

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => currentBuilder),
  },
}));

vi.mock("@repo/utils", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/lib/utils/with-retry", () => ({
  withRetry: vi.fn((fn: () => unknown) => fn()),
}));

import {
  getUserProfile,
  updateUserProfile,
  createUserProfile,
} from "../profile-service";

const mockProfile = {
  id: "p1",
  user_id: "u1",
  display_name: "Test User",
  avatar_icon: "person",
  avatar_color: "bg-primary",
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
};

describe("Profile Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentBuilder = createQueryBuilder();
  });

  // ─── getUserProfile ───────────────────────────────────────────────────

  describe("getUserProfile", () => {
    it("returns existing profile", async () => {
      currentBuilder = createQueryBuilder(mockProfile);
      const { supabase } = await import("@/lib/supabase/client");
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(currentBuilder);

      const result = await getUserProfile("u1");
      expect(result).toEqual(mockProfile);
    });

    it("auto-creates profile on PGRST116 (row not found)", async () => {
      // First call: row not found
      const notFoundBuilder = createQueryBuilder(null, { code: "PGRST116", message: "Not found" });
      const { supabase } = await import("@/lib/supabase/client");

      // getUserProfile calls from("user_profiles") twice — once to get, once to create
      let callCount = 0;
      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) return notFoundBuilder;
        // Second call is for createUserProfile
        return createQueryBuilder(mockProfile);
      });

      const result = await getUserProfile("u1");
      // Should have created a profile and returned it
      expect(result).toEqual(mockProfile);
    });

    it("throws on non-PGRST116 errors", async () => {
      const errorBuilder = createQueryBuilder(null, { code: "PGRST500", message: "Server error" });
      const { supabase } = await import("@/lib/supabase/client");
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(errorBuilder);

      await expect(getUserProfile("u1")).rejects.toMatchObject({ code: "PGRST500" });
    });
  });

  // ─── updateUserProfile ────────────────────────────────────────────────

  describe("updateUserProfile", () => {
    it("upserts profile and returns updated data", async () => {
      const updatedProfile = { ...mockProfile, display_name: "New Name" };
      currentBuilder = createQueryBuilder(updatedProfile);
      const { supabase } = await import("@/lib/supabase/client");
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(currentBuilder);

      const result = await updateUserProfile("u1", { display_name: "New Name" });
      expect(result).toEqual(updatedProfile);
    });

    it("throws on error", async () => {
      currentBuilder = createQueryBuilder(null, { message: "Update failed" });
      const { supabase } = await import("@/lib/supabase/client");
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(currentBuilder);

      await expect(
        updateUserProfile("u1", { display_name: "X" })
      ).rejects.toMatchObject({ message: "Update failed" });
    });
  });

  // ─── createUserProfile ────────────────────────────────────────────────

  describe("createUserProfile", () => {
    it("creates profile with default avatar settings", async () => {
      currentBuilder = createQueryBuilder(mockProfile);
      const { supabase } = await import("@/lib/supabase/client");
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(currentBuilder);

      const result = await createUserProfile("u1", "Test User");

      expect(currentBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "u1",
          display_name: "Test User",
          avatar_icon: "person",
          avatar_color: "bg-primary",
        })
      );
      expect(result).toEqual(mockProfile);
    });

    it("returns null on error", async () => {
      currentBuilder = createQueryBuilder(null, { message: "Duplicate" });
      const { supabase } = await import("@/lib/supabase/client");
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(currentBuilder);

      const result = await createUserProfile("u1");
      expect(result).toBeNull();
    });
  });
});
