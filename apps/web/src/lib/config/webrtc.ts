import type { PeerConfig } from "@repo/types";

/**
 * FINDING-015: ICE servers are now fetched server-side via /api/turn-credentials
 * so TURN credentials never appear in the client bundle.
 *
 * Call `getIceServers()` once on mount and pass the result into getPeerConfig().
 */
export async function getIceServers(): Promise<RTCIceServer[]> {
  try {
    const res = await fetch("/api/turn-credentials");
    if (!res.ok) throw new Error(`turn-credentials: ${res.status}`);
    const { iceServers } = (await res.json()) as { iceServers: RTCIceServer[] };
    return iceServers;
  } catch {
    // Graceful fallback: STUN only (no TURN) so basic P2P still works
    return [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }];
  }
}

export async function getPeerConfigAsync(
  iceServers: RTCIceServer[],
  forceRelay: boolean = false
): Promise<PeerConfig> {
  return {
    host: process.env.NEXT_PUBLIC_PEER_SERVER_HOST!,
    port: parseInt(process.env.NEXT_PUBLIC_PEER_SERVER_PORT!),
    path: process.env.NEXT_PUBLIC_PEER_SERVER_PATH!,
    secure: typeof window !== "undefined" && window.location.protocol === "https:",
    debug: 0,
    config: {
      iceServers,
      iceTransportPolicy: forceRelay ? "relay" : "all", // Task #4: Support forced relay
      iceCandidatePoolSize: 10,
    },
  };
}

/**
 * @deprecated Use `getPeerConfigAsync()` with `getIceServers()`.
 * Kept temporarily so IDE can surface remaining call sites.
 */
export function getPeerConfig(): never {
  throw new Error(
    "getPeerConfig() is removed. Use `const ice = await getIceServers(); getPeerConfigAsync(ice)` instead."
  );
}
