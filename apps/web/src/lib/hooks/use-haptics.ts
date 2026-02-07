import { useCallback } from 'react';

type HapticPattern = 'success' | 'error' | 'warning' | 'heavy' | 'medium' | 'light';

export function useHaptics() {
    const vibrate = useCallback((pattern: HapticPattern | number | number[]) => {
        // Check if vibration is supported
        if (typeof navigator === 'undefined' || !navigator.vibrate) {
            return;
        }

        try {
            let vibrationPattern: number | number[] = 0;

            if (typeof pattern === 'number' || Array.isArray(pattern)) {
                vibrationPattern = pattern;
            } else {
                switch (pattern) {
                    case 'success':
                        // Two short pulses
                        vibrationPattern = [10, 30, 10];
                        break;
                    case 'error':
                        // Three long pulses
                        vibrationPattern = [50, 30, 50, 30, 50];
                        break;
                    case 'warning':
                        // Long pulse
                        vibrationPattern = 50;
                        break;
                    case 'heavy':
                        vibrationPattern = 20;
                        break;
                    case 'medium':
                        vibrationPattern = 10;
                        break;
                    case 'light':
                        vibrationPattern = 5;
                        break;
                }
            }

            navigator.vibrate(vibrationPattern);
        } catch (e) {
            // Ignore errors (some browsers might block it)
            console.error('Haptic feedback failed:', e);
        }
    }, []);

    return { vibrate };
}
