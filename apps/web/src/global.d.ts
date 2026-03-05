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

interface Window {
    /** @deprecated webkit-prefixed AudioContext; present in older Safari / iOS */
    webkitAudioContext?: typeof AudioContext;
}

/** App Badging API — implemented in Chrome/Edge; not yet in lib.dom.d.ts */
interface Navigator {
    /** Sets the badge count shown on the app icon. */
    setAppBadge(count?: number): Promise<void>;
    /** Clears the badge from the app icon. */
    clearAppBadge(): Promise<void>;
}
