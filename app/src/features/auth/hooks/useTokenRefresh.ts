import {useEffect, useRef} from 'react';
import { useAuth } from './useAuth';
import { authService } from '@/lib/service/auth';

// 14分ごとにリフレッシュ（トークン寿命15分より少し短くする）
const REFRESH_INTERVAL = 14 * 60 * 1000;

// 改善案: 操作があった時だけリフレッシュタイマーをリセット
export const useTokenRefresh = () => {
    const { isAuthenticated } = useAuth();
    const lastActivityRef = useRef(Date.now());

    useEffect(() => {
        if (!isAuthenticated) return;

        // 操作を検知してタイムスタンプ更新
        const updateActivity = () => {
            lastActivityRef.current = Date.now();
        };

        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach(e => window.addEventListener(e, updateActivity));

        const intervalId = setInterval(async () => {
            // 最後の操作から5分以内ならリフレッシュ
            if (Date.now() - lastActivityRef.current < 5 * 60 * 1000) {
                try {
                    await authService.refresh();
                } catch (error) {
                    // handle error
                }
            }
        }, REFRESH_INTERVAL);

        return () => {
            clearInterval(intervalId);
            events.forEach(e => window.removeEventListener(e, updateActivity));
        };
    }, [isAuthenticated]);
};