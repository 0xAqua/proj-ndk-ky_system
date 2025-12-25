import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { authService } from '@/lib/service/auth';

const REFRESH_INTERVAL = 14 * 60 * 1000;        // 14分
const ACTIVITY_THRESHOLD = 5 * 60 * 1000;       // 5分以内に操作があればリフレッシュ
const MAX_SESSION_DURATION = 3 * 60 * 60 * 1000; // 最大3時間

export const useTokenRefresh = () => {
    const { isAuthenticated, logout } = useAuth();
    const lastActivityRef = useRef(Date.now());
    const sessionStartRef = useRef<number | null>(null);

    useEffect(() => {
        if (!isAuthenticated) return;

        // セッション開始時刻を記録（初回のみ）
        if (sessionStartRef.current === null) {
            sessionStartRef.current = Date.now();
        }

        const updateActivity = () => {
            lastActivityRef.current = Date.now();
        };

        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach(e => window.addEventListener(e, updateActivity));

        const intervalId = setInterval(async () => {
            // 最大3時間チェック
            if (sessionStartRef.current &&
                Date.now() - sessionStartRef.current > MAX_SESSION_DURATION) {
                void logout();
                return;
            }

            // 最後の操作から5分以内ならリフレッシュ
            if (Date.now() - lastActivityRef.current < ACTIVITY_THRESHOLD) {
                try {
                    await authService.refresh();
                } catch {
                    void logout();
                }
            }
        }, REFRESH_INTERVAL);

        return () => {
            clearInterval(intervalId);
            events.forEach(e => window.removeEventListener(e, updateActivity));
        };
    }, [isAuthenticated, logout]);
};