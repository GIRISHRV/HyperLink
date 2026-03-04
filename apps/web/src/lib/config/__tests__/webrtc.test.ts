import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getIceServers, getPeerConfigAsync, getPeerConfig } from "../webrtc";

describe("webrtc config", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  // ── getIceServers ─────────────────────────────────────────────────────

  describe("getIceServers", () => {
    it("returns iceServers from /api/turn-credentials on success", async () => {
      const servers: RTCIceServer[] = [
        { urls: "turn:turn.example.com", username: "user", credential: "pass" },
      ];
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ iceServers: servers }),
      } as Response);

      const result = await getIceServers();
      expect(result).toEqual(servers);
      expect(fetch).toHaveBeenCalledWith("/api/turn-credentials");
    });

    it("falls back to two STUN servers when fetch rejects", async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));

      const result = await getIceServers();
      expect(result).toHaveLength(2);
      expect((result[0] as { urls: string }).urls).toMatch(/^stun:/);
      expect((result[1] as { urls: string }).urls).toMatch(/^stun:/);
    });

    it("falls back to STUN when response is not ok", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 500 } as Response);

      const result = await getIceServers();
      expect(result).toHaveLength(2);
      expect((result[0] as { urls: string }).urls).toMatch(/^stun:/);
    });
  });

  // ── getPeerConfigAsync ────────────────────────────────────────────────

  describe("getPeerConfigAsync", () => {
    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_PEER_SERVER_HOST", "peer.example.com");
      vi.stubEnv("NEXT_PUBLIC_PEER_SERVER_PORT", "9000");
      vi.stubEnv("NEXT_PUBLIC_PEER_SERVER_PATH", "/myapp");
    });

    it("uses NEXT_PUBLIC_PEER_SERVER_HOST / PORT / PATH env vars", async () => {
      const config = await getPeerConfigAsync([]);
      expect(config.host).toBe("peer.example.com");
      expect(config.port).toBe(9000);
      expect(config.path).toBe("/myapp");
    });

    it("embeds the provided iceServers in config.iceServers", async () => {
      const iceServers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
      const config = await getPeerConfigAsync(iceServers);
      expect(config.config!.iceServers).toEqual(iceServers);
    });

    it("sets iceTransportPolicy to 'all'", async () => {
      const config = await getPeerConfigAsync([]);
      expect(config.config!.iceTransportPolicy).toBe("all");
    });

    it("sets debug to 0", async () => {
      const config = await getPeerConfigAsync([]);
      expect(config.debug).toBe(0);
    });
  });

  // ── getPeerConfig (deprecated) ────────────────────────────────────────

  describe("getPeerConfig (deprecated)", () => {
    it("throws an error directing callers to use getPeerConfigAsync", () => {
      expect(() => getPeerConfig()).toThrow();
    });
  });
});
