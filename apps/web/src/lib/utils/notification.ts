/**
 * Notification utilities for transfer completion
 */

/**
 * Play a success chime sound using Web Audio API
 */
export function playSuccessSound(): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a pleasant two-tone chime
    const playTone = (frequency: number, startTime: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = "sine";
      
      // Fade in and out for smooth sound
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };
    
    const now = audioContext.currentTime;
    // Two ascending tones for a pleasant "complete" sound
    playTone(523.25, now, 0.15);        // C5
    playTone(659.25, now + 0.15, 0.25); // E5
    
    // Clean up after sounds finish
    setTimeout(() => audioContext.close(), 500);
  } catch (e) {
    console.warn("Could not play notification sound:", e);
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
