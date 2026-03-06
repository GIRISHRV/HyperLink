import { useReducer } from "react";

export type TransferStatus =
    | "idle"
    | "connecting"
    | "offering"
    | "awaiting_acceptance"
    | "transferring"
    | "paused"
    | "complete"
    | "failed"
    | "cancelled";

export interface TransferState {
    status: TransferStatus;
    bytesTransferred: number;
    totalBytes: number;
    error?: string;
    speedBytesPerSecond?: number;
    estimatedSecondsRemaining?: number;
    pausedBy?: "local" | "remote";
}

export type TransferAction =
    | { type: "CONNECT" }
    | { type: "OFFER" }
    | { type: "AWAIT_ACCEPTANCE" }
    | { type: "START_TRANSFER"; totalBytes: number }
    | { type: "PROGRESS"; bytesTransferred: number; speed?: number; remaining?: number }
    | { type: "PAUSE"; pausedBy: "local" | "remote" }
    | { type: "RESUME" }
    | { type: "COMPLETE" }
    | { type: "FAIL"; error: string }
    | { type: "CANCEL" }
    | { type: "RESET" };

function transferReducer(state: TransferState, action: TransferAction): TransferState {
    switch (action.type) {
        case "CONNECT":
            return { ...state, status: "connecting", error: undefined };
        case "OFFER":
            return { ...state, status: "offering", error: undefined };
        case "AWAIT_ACCEPTANCE":
            return { ...state, status: "awaiting_acceptance", error: undefined };
        case "START_TRANSFER":
            return {
                ...state,
                status: "transferring",
                totalBytes: action.totalBytes,
                bytesTransferred: 0,
                error: undefined,
                pausedBy: undefined
            };
        case "PROGRESS":
            // If chunks are flowing but we're still in the offer/acceptance phase,
            // transition to transferring so the progress panel becomes visible.
            if (state.status === "awaiting_acceptance" || state.status === "offering" || state.status === "connecting") {
                return {
                    ...state,
                    status: "transferring",
                    bytesTransferred: action.bytesTransferred,
                    speedBytesPerSecond: action.speed,
                    estimatedSecondsRemaining: action.remaining,
                };
            }
            if (state.status !== "transferring" && state.status !== "paused") return state;
            return {
                ...state,
                bytesTransferred: action.bytesTransferred,
                speedBytesPerSecond: action.speed,
                estimatedSecondsRemaining: action.remaining
            };
        case "PAUSE":
            if (state.status !== "transferring") return state;
            return { ...state, status: "paused", pausedBy: action.pausedBy };
        case "RESUME":
            if (state.status !== "paused") return state;
            return { ...state, status: "transferring", pausedBy: undefined };
        case "COMPLETE":
            return { ...state, status: "complete", bytesTransferred: state.totalBytes };
        case "FAIL":
            return { ...state, status: "failed", error: action.error };
        case "CANCEL":
            return { ...state, status: "cancelled" };
        case "RESET":
            return {
                status: "idle",
                bytesTransferred: 0,
                totalBytes: 0,
                pausedBy: undefined,
            };
        default:
            return state;
    }
}

export function useTransferState() {
    const [state, dispatch] = useReducer(transferReducer, {
        status: "idle",
        bytesTransferred: 0,
        totalBytes: 0,
    });

    return {
        state,
        dispatch,

        // Convenience checkers
        isIdle: state.status === "idle",
        isConnecting: state.status === "connecting" || state.status === "offering" || state.status === "awaiting_acceptance",
        isTransferring: state.status === "transferring",
        isPaused: state.status === "paused",
        isComplete: state.status === "complete",
        isFailed: state.status === "failed",
        isCancelled: state.status === "cancelled",
        isActive: state.status === "transferring" || state.status === "paused",

        // Helper to calculate progress percentage (0-100)
        progress: state.totalBytes > 0
            ? Math.min(100, Math.max(0, (state.bytesTransferred / state.totalBytes) * 100))
            : 0
    };
}
