import { useCallback, useEffect, useRef, useState } from 'react';

export function useWakeLock() {
    const [isLocked, setIsLocked] = useState(false);
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);

    const request = useCallback(async () => {
        if ('wakeLock' in navigator) {
            try {
                const lock = await navigator.wakeLock.request('screen');
                wakeLockRef.current = lock;
                setIsLocked(true);
                console.log('Wake Lock acquired');

                lock.addEventListener('release', () => {
                    setIsLocked(false);
                    console.log('Wake Lock released');
                });
            } catch (err) {
                console.error('Failed to acquire Wake Lock:', err);
            }
        }
    }, []);

    const release = useCallback(async () => {
        if (wakeLockRef.current) {
            try {
                await wakeLockRef.current.release();
                wakeLockRef.current = null;
            } catch (err) {
                console.error('Failed to release Wake Lock:', err);
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
