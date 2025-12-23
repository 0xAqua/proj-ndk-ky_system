// src/features/auth/hooks/useAutoLogout.ts
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';

const TIMEOUT_MS = 15 * 60 * 1000; // 15分
const CHECK_INTERVAL = 10 * 1000;  // 10秒ごとにチェック

export const useAutoLogout = () => {
    const { logout, isAuthenticated } = useAuth();
    const lastActivityRef = useRef<number>(Date.now());

    const resetTimer = useCallback(() => {
        lastActivityRef.current = Date.now();
    }, []);

    useEffect(() => {
        if (!isAuthenticated) return;

        // ユーザー操作を検知
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach((event) => window.addEventListener(event, resetTimer));

        // 定期的に経過時間をチェック（スリープ復帰対策）
        const intervalId = setInterval(() => {
            const elapsed = Date.now() - lastActivityRef.current;
            if (elapsed > TIMEOUT_MS) {
                void logout();
            }
        }, CHECK_INTERVAL);

        // 初期化
        resetTimer();

        return () => {
            clearInterval(intervalId);
            events.forEach((event) => window.removeEventListener(event, resetTimer));
        };
    }, [resetTimer, isAuthenticated, logout]);
};