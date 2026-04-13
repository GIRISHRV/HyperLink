import { describe, it, expect } from "vitest";
import { getClientIp, turnCredentialsLimiter } from "../rate-limit";

describe("getClientIp", () => {
  it("prefers x-vercel-forwarded-for", () => {
    const request = new Request("http://localhost/api/test", {
      headers: {
        "x-vercel-forwarded-for": "203.0.113.10",
        "x-forwarded-for": "198.51.100.12",
      },
    });

    expect(getClientIp(request)).toBe("203.0.113.10");
  });

  it("falls back to first x-forwarded-for value", () => {
    const request = new Request("http://localhost/api/test", {
      headers: {
        "x-forwarded-for": "198.51.100.12, 10.0.0.1",
      },
    });

    expect(getClientIp(request)).toBe("198.51.100.12");
  });

  it("returns unknown for malformed values", () => {
    const request = new Request("http://localhost/api/test", {
      headers: {
        "x-forwarded-for": "not-an-ip-address",
      },
    });

    expect(getClientIp(request)).toBe("unknown");
  });
});

describe("turnCredentialsLimiter", () => {
  it("limits requests after max within the same window", async () => {
    const ip = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;
    const request = new Request("http://localhost/api/turn-credentials", {
      headers: {
        "x-forwarded-for": ip,
      },
    });

    for (let i = 0; i < 10; i++) {
      const result = await turnCredentialsLimiter(request);
      expect(result.limited).toBe(false);
    }

    const blocked = await turnCredentialsLimiter(request);
    expect(blocked.limited).toBe(true);
    expect(blocked.headers["Retry-After"]).toBeDefined();
  });
});
