import { useEffect, useRef, useCallback } from 'react';
import { useLogout } from '@/hooks/useLogout';

// 無操作許容時間（ミリ秒）: 15分
const TIMEOUT_MS = 15 * 60 * 1000;

export const useAutoLogout = () => {
    const { logout } = useLogout();
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const resetTimer = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(logout, TIMEOUT_MS);
    }, [logout]);

    useEffect(() => {
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

        events.forEach((event) => window.addEventListener(event, resetTimer));
        resetTimer();

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            events.forEach((event) => window.removeEventListener(event, resetTimer));
        };
    }, [resetTimer]);
};