import type { PeerMessage, PeerMessageType } from "@repo/types";

const VALID_MESSAGE_TYPES = new Set<PeerMessageType>([
  "file-offer",
  "file-accept",
  "file-reject",
  "chunk",
  "chunk-ack",
  "chunk-probe", // C3 fix: used by sender for ACK resilience (was silently dropped)
  "transfer-complete",
  "transfer-error",
  "transfer-cancel",
  "transfer-pause",
  "transfer-resume",
  "resume-from", // C3 fix: used by receiver for crash recovery (was silently dropped)
  "receiver-busy",
  "chat-message",
]);

/**
 * FINDING-017: Validate the shape of an incoming WebRTC peer message before
 * processing. Malicious peers could send crafted payloads; we reject anything
 * that doesn't match the expected schema instead of blindly casting.
 *
 * @returns A typed PeerMessage if valid, or null if the message is malformed.
 */
export function validatePeerMessage(data: unknown): PeerMessage | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;

  const msg = data as Record<string, unknown>;

  // Required fields
  if (typeof msg.type !== "string") return null;
  if (typeof msg.transferId !== "string") return null;
  if (typeof msg.timestamp !== "number") return null;

  // Type must be a known message type
  if (!VALID_MESSAGE_TYPES.has(msg.type as PeerMessageType)) return null;

  // SEC-014: Validate transferId is a proper UUID v4 format to prevent
  // arbitrary data being embedded in the field as a covert side-channel.
  const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!UUID_V4_REGEX.test(msg.transferId as string)) return null;

  return msg as unknown as PeerMessage;
}
