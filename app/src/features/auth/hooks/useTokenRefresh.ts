import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { authService } from '@/lib/service/auth';

// 14分ごとにリフレッシュ（トークン寿命15分より少し短くする）
const REFRESH_INTERVAL = 14 * 60 * 1000;

export const useTokenRefresh = () => {
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        if (!isAuthenticated) return;

        // 定期的にリフレッシュAPIを叩くタイマー
        const intervalId = setInterval(async () => {
            try {
                // authService.refresh() の実装が必要です
                await authService.refresh();
            } catch (error) {
                //
            }
        }, REFRESH_INTERVAL);

        return () => clearInterval(intervalId);
    }, [isAuthenticated]);
};