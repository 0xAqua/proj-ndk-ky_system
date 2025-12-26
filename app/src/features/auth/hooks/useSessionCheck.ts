// src/features/auth/hooks/useSessionCheck.ts
import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { authService } from '@/lib/service/authService.ts';

export const useSessionCheck = () => {
    const { logout, isAuthenticated } = useAuth();

    useEffect(() => {
        if (!isAuthenticated) return;

        const handleVisibilityChange = async () => {
            // タブがアクティブになった時
            if (document.visibilityState === 'visible') {
                try {
                    // セッション確認
                    const result = await authService.checkSession();
                    if (!result.authenticated) {
                        void logout();
                    }
                } catch (error) {
                    // エラー時もログアウト
                    void logout();
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isAuthenticated, logout]);
};