/**
 * Notification utilities for transfer completion
 */

const createAudioContext = () => {
  return new (window.AudioContext || (window as any).webkitAudioContext)();
};

const playTone = (
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  type: OscillatorType = "sine",
  volume: number = 0.3
) => {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = type;

  // Fade in and out for smooth sound
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.05);
  gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
};

/**
 * Play a success chime sound (C5 -> E5)
 */
export function playSuccessSound(): void {
  try {
    const ctx = createAudioContext();
    const now = ctx.currentTime;

    // Two ascending tones for a pleasant "complete" sound
    playTone(ctx, 523.25, now, 0.15);        // C5
    playTone(ctx, 659.25, now + 0.15, 0.25); // E5

    setTimeout(() => ctx.close(), 500);
  } catch (e) {
    console.warn("Could not play success sound:", e);
  }
}

/**
 * Play an error sound (E4 -> A3)
 */
export function playErrorSound(): void {
  try {
    const ctx = createAudioContext();
    const now = ctx.currentTime;

    // Descending tones with sawtooth wave for "error" feel
    playTone(ctx, 329.63, now, 0.15, "triangle", 0.4); // E4
    playTone(ctx, 220.00, now + 0.15, 0.3, "triangle", 0.4); // A3

    setTimeout(() => ctx.close(), 600);
  } catch (e) {
    console.warn("Could not play error sound:", e);
  }
}

/**
 * Play a connection established sound (High C6 ping)
 */
export function playConnectionSound(): void {
  try {
    const ctx = createAudioContext();
    const now = ctx.currentTime;

    // Single high ping
    playTone(ctx, 1046.50, now, 0.1, "sine", 0.2); // C6

    setTimeout(() => ctx.close(), 200);
  } catch (e) {
    console.warn("Could not play connection sound:", e);
  }
}


/**
 * Request browser notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
}

/**
 * Show browser notification for transfer completion
 */
export function showTransferNotification(
  type: "sent" | "received",
  filename: string
): void {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const title = type === "sent" ? "File Sent Successfully" : "File Received";
  const body = type === "sent"
    ? `"${filename}" has been transferred successfully.`
    : `"${filename}" is ready to download.`;

  try {
    const notification = new Notification(title, {
      body,
      icon: "/icon-192.png", // Use app icon if available
      tag: "transfer-complete", // Prevent duplicate notifications
      requireInteraction: false,
    });

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);

    // Focus window when notification is clicked
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (e) {
    console.warn("Could not show notification:", e);
  }
}

/**
 * Notify user of transfer completion (sound + browser notification)
 */
export function notifyTransferComplete(
  type: "sent" | "received",
  filename: string
): void {
  playSuccessSound();
  showTransferNotification(type, filename);
}
