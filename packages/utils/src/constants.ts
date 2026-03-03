/**
 * Shared avatar color map — single source of truth for avatar color → text color mapping.
 * Used in GlobalHeader, Dashboard, and Settings pages.
 */
export const AVATAR_COLOR_MAP: Record<string, { value: string; text: string }> = {
  "bg-primary": { value: "bg-primary", text: "text-black" },
  "bg-bauhaus-blue": { value: "bg-bauhaus-blue", text: "text-white" },
  "bg-bauhaus-red": { value: "bg-bauhaus-red", text: "text-white" },
  "bg-green-500": { value: "bg-green-500", text: "text-white" },
  "bg-purple-500": { value: "bg-purple-500", text: "text-white" },
  "bg-orange-500": { value: "bg-orange-500", text: "text-black" },
};

/**
 * Default avatar color when no color is set or the stored color is not found.
 */
export const DEFAULT_AVATAR_COLOR = AVATAR_COLOR_MAP["bg-primary"]!;

/**
 * Shared transfer status configuration — single source of truth for status → styling mapping.
 * Used in Dashboard (recent activity) and History (full table) pages.
 */
export const STATUS_CONFIG = {
  complete: {
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    text: "text-green-500",
    dot: "bg-green-500",
    icon: "check_circle",
  },
  transferring: {
    bg: "bg-bauhaus-blue/10",
    border: "border-bauhaus-blue/20",
    text: "text-bauhaus-blue",
    dot: "bg-bauhaus-blue",
    icon: "sync",
  },
  failed: {
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    text: "text-red-500",
    dot: "bg-red-500",
    icon: "error",
  },
  cancelled: {
    bg: "bg-gray-500/10",
    border: "border-gray-500/20",
    text: "text-gray-400",
    dot: "bg-gray-400",
    icon: "cancel",
  },
  pending: {
    bg: "bg-primary/10",
    border: "border-primary/20",
    text: "text-primary",
    dot: "bg-primary",
    icon: "hourglass_top",
  },
  connecting: {
    bg: "bg-primary/10",
    border: "border-primary/20",
    text: "text-primary",
    dot: "bg-primary",
    icon: "hourglass_top",
  },
  paused: {
    bg: "bg-gray-500/10",
    border: "border-gray-500/20",
    text: "text-gray-400",
    dot: "bg-gray-400",
    icon: "pause_circle",
  },
} as const;

export type StatusConfigKey = keyof typeof STATUS_CONFIG;
