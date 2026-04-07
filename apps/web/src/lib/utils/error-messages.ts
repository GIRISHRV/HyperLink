export type ErrorCode = string;

export interface ErrorInfo {
  severity: "error" | "warning" | "info";
  title: string;
  message: string;
  suggestion: string;
  action?: string;
  code?: string;
}

export function parseError(error: unknown): ErrorCode {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "UNKNOWN_ERROR";
}

export function getErrorInfo(code: ErrorCode): ErrorInfo {
  // Default fallback for unknown errors
  const info: ErrorInfo = {
    severity: "error",
    title: "Something Went Wrong",
    message: "An unexpected error occurred during the transfer setup.",
    suggestion: "Please try reloading the page or starting a new transfer.",
    action: "Retry",
    code,
  };

  const codeStr = code.toLowerCase();

  if (codeStr.includes("ice") || codeStr.includes("webrtc") || codeStr.includes("peer")) {
    info.title = "Connection Failed";
    info.message = "Failed to establish a direct peer-to-peer connection.";
    info.suggestion =
      "This is typically caused by strict corporate firewalls or VPNs blocking WebRTC traffic.";
  } else if (codeStr.includes("timeout")) {
    info.title = "Connection Timeout";
    info.message = "The other peer did not respond in time.";
    info.suggestion = "Ensure the other user still has the page open and active.";
  } else if (codeStr.includes("network_error") || codeStr.includes("offline")) {
    info.title = "Network Disconnected";
    info.message = "Your device lost connection to the internet.";
    info.suggestion = "Check your WiFi or cellular network and try connecting again.";
  } else if (codeStr.includes("not-found")) {
    info.severity = "warning";
    info.title = "Peer Not Found";
    info.message = "The requested peer is not currently connected to the signaling server.";
    info.suggestion = "Double check the Peer ID and ensure the other device is online.";
  }

  return info;
}
