// src/features/auth/hooks/useAutoLogout.ts
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';

const TIMEOUT_MS = 15 * 60 * 1000;

export const useAutoLogout = () => {
    const { logout, isAuthenticated } = useAuth();
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const resetTimer = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        // ログインしていない場合はタイマーを回さない
        if (!isAuthenticated) return;

        timerRef.current = setTimeout(logout, TIMEOUT_MS);
    }, [logout, isAuthenticated]);

    useEffect(() => {
        if (!isAuthenticated) return;

        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach((event) => window.addEventListener(event, resetTimer));

        resetTimer();

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            events.forEach((event) => window.removeEventListener(event, resetTimer));
        };
    }, [resetTimer, isAuthenticated]);
};