import type { PeerMessage, PeerMessageType } from "@repo/types";

const VALID_MESSAGE_TYPES = new Set<PeerMessageType>([
    "file-offer",
    "file-accept",
    "file-reject",
    "chunk",
    "chunk-ack",
    "transfer-complete",
    "transfer-error",
    "transfer-cancel",
    "transfer-pause",
    "transfer-resume",
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

    // transferId must look like a UUID or a reasonable ID string
    if (msg.transferId.length === 0 || msg.transferId.length > 128) return null;

    return msg as unknown as PeerMessage;
}
