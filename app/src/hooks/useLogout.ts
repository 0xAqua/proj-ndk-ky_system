// src/hooks/useLogout.ts
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useUserStore } from "@/stores/useUserStore";
import { authService } from '@/lib/service/auth';
import { useCallback, useRef, useEffect } from 'react';

export const useLogout = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const clearUser = useUserStore((state) => state.clearUser);
    const isLoggingOut = useRef(false);

    // 他タブでのログアウト検知
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'logout') {
                clearUser();
                queryClient.clear();
                navigate('/login', { replace: true });
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [clearUser, queryClient, navigate]);

    const logout = useCallback(async () => {
        if (isLoggingOut.current) return;
        isLoggingOut.current = true;

        try {
            // BFF経由でCognito globalSignOut + HttpOnly Cookie削除
            await authService.logout();
        } catch {
            // サーバー側失敗してもクライアントは必ずクリア
        } finally {
            clearUser();
            queryClient.clear();
            sessionStorage.clear();

            // 他タブへログアウト通知
            localStorage.setItem('logout', Date.now().toString());
            localStorage.removeItem('logout');

            navigate('/login', { replace: true });
            isLoggingOut.current = false;
        }
    }, [clearUser, queryClient, navigate]);

    return { logout };
};