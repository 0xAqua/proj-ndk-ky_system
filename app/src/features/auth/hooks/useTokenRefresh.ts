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
                // (前回提示した /bff/auth/refresh を叩く処理)
                await authService.refresh();
                console.log('Session refreshed');
            } catch (error) {
                console.error('Failed to refresh session', error);
                // リフレッシュ失敗時は何もしない（次のAPIコールで401になり、自然にログアウト等の処理に流れるのを待つ）
                // または、ここで強制ログアウトさせるのも手です
            }
        }, REFRESH_INTERVAL);

        return () => clearInterval(intervalId);
    }, [isAuthenticated]);
};