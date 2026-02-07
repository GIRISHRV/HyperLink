import type { PeerConfig } from "@repo/types";

export const DEFAULT_ICE_SERVERS = [
    // Google's public STUN servers
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },

    // Mozilla's STUN server
    { urls: "stun:stun.services.mozilla.com" },

    // Twilio's STUN server (Global)
    { urls: "stun:global.stun.twilio.com:3478" },

    // Free TURN servers from OpenRelay (no signup required)
    {
        urls: "turn:openrelay.metered.ca:80",
        username: "openrelayproject",
        credential: "openrelayproject",
    },
    {
        urls: "turn:openrelay.metered.ca:443",
        username: "openrelayproject",
        credential: "openrelayproject",
    },
    {
        urls: "turn:openrelay.metered.ca:443?transport=tcp",
        username: "openrelayproject",
        credential: "openrelayproject",
    },
];

export const getPeerConfig = (): PeerConfig => {
    return {
        host: process.env.NEXT_PUBLIC_PEER_SERVER_HOST!,
        port: parseInt(process.env.NEXT_PUBLIC_PEER_SERVER_PORT!),
        path: process.env.NEXT_PUBLIC_PEER_SERVER_PATH!,
        secure: typeof window !== 'undefined' && window.location.protocol === "https:",
        debug: 0,
        config: {
            iceServers: DEFAULT_ICE_SERVERS,
            iceTransportPolicy: "all",
            iceCandidatePoolSize: 10,
        },
    };
};
