/**
 * Type augmentations for non-standard browser APIs used in this project.
 *
 * RTCIceCandidate.ip / RTCIceCandidateInit.ip is the legacy (non-standard)
 * alias for .address, present in some older browser implementations.
 * Declaring it here avoids `as any` casts when reading it.
 */
interface RTCIceCandidateInit {
    /** @deprecated alias for `address`; present in some older browsers */
    ip?: string;
}

interface RTCIceCandidate {
    /** @deprecated alias for `address`; present in some older browsers */
    ip?: string;
}
