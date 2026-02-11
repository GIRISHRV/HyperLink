import { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from "@repo/utils";

export function useWakeLock() {
    const [isLocked, setIsLocked] = useState(false);
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);

    const request = useCallback(async () => {
        if ('wakeLock' in navigator) {
            try {
                const lock = await navigator.wakeLock.request('screen');
                wakeLockRef.current = lock;
                setIsLocked(true);
                logger.info('Wake Lock acquired');

                lock.addEventListener('release', () => {
                    setIsLocked(false);
                    logger.info('Wake Lock released');
                });
            } catch (err) {
                logger.error({ err }, 'Failed to acquire Wake Lock');
            }
        }
    }, []);

    const release = useCallback(async () => {
        if (wakeLockRef.current) {
            try {
                await wakeLockRef.current.release();
                wakeLockRef.current = null;
            } catch (err) {
                logger.error({ err }, 'Failed to release Wake Lock');
            }
        }
    }, []);

    // Re-acquire lock when page visibility changes (e.g. switching back to tab)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isLocked && !wakeLockRef.current) {
                request();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isLocked, request]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            release();
        };
    }, [release]);

    return { request, release, isLocked };
}
