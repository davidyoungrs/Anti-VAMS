import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook to handle user inactivity.
 * @param {number} timeoutMs - Timeout in milliseconds.
 * @param {Function} onTimeout - Callback to run when timeout is reached.
 * @param {boolean} isActive - Whether the timer should be active (e.g., only when logged in).
 */
export const useInactivityTimer = (timeoutMs, onTimeout, isActive = true) => {
    const timerRef = useRef(null);
    const lastActivityRef = useRef(null); // Initialize as null to keep render pure

    const resetTimer = useCallback(() => {
        if (!isActive) return;

        lastActivityRef.current = Date.now();

        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(() => {
            // Double check time diff to prevent premature timeouts from background throttling
            const now = Date.now();
            if (now - lastActivityRef.current >= timeoutMs) {
                onTimeout();
            }
        }, timeoutMs);
    }, [isActive, timeoutMs, onTimeout]);

    useEffect(() => {
        if (!isActive) {
            if (timerRef.current) clearTimeout(timerRef.current);
            return;
        }

        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

        // Throttle the event listeners to avoid performance hit
        let throttleTimer = null;
        const handleActivity = () => {
            if (!throttleTimer) {
                throttleTimer = setTimeout(() => {
                    resetTimer();
                    throttleTimer = null;
                }, 1000); // Only reset timer max once per second
            }
        };

        // Initial start
        if (lastActivityRef.current === null) {
            lastActivityRef.current = Date.now();
        }
        resetTimer();

        events.forEach(event => window.addEventListener(event, handleActivity));

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (throttleTimer) clearTimeout(throttleTimer);
            events.forEach(event => window.removeEventListener(event, handleActivity));
        };
    }, [isActive, resetTimer]);

    return { resetTimer };
};
