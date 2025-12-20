// src/features/auth/hooks/useAuth.ts
import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authService } from "@/lib/service/auth";
import { useUserStore } from "@/stores/useUserStore";

export const useAuth = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const clearUser = useUserStore((state) => state.clearUser);
    const isLoggingOut = useRef(false);

    // 1. セッション状態の取得 (TanStack Query)
    const { data: session, isLoading } = useQuery({
        queryKey: ["session"],
        queryFn: authService.checkSession,
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

    // 2. 認証されている場合のみ、詳細プロフィール（/me）を取得
    const { data: profile} = useQuery({
        queryKey: ["userProfile"],
        queryFn: authService.getMe,
        enabled: !!session?.authenticated, // ログイン済みの場合のみ走る
        staleTime: 60 * 60 * 1000, // プロフィールは頻繁に変わらないので1時間キャッシュ
    });

    // 2. ログアウト処理 (コアロジック)
    const logout = useCallback(async () => {
        if (isLoggingOut.current) return;
        isLoggingOut.current = true;

        try {
            // BFF経由でサーバーセッションを破棄
            await authService.logout();
        } catch (error) {
            console.error("Logout API failed", error);
        } finally {
            // クライアント情報の完全消去
            clearUser();
            queryClient.clear(); // 全キャッシュ削除（重要！）
            sessionStorage.clear();

            // 他タブへの通知
            localStorage.setItem('logout_event', Date.now().toString());
            localStorage.removeItem('logout_event');

            navigate('/login', { replace: true });
            isLoggingOut.current = false;
        }
    }, [clearUser, queryClient, navigate]);

    // 3. 他タブでのログアウト検知
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'logout_event') {
                clearUser();
                queryClient.clear();
                navigate('/login', { replace: true });
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [clearUser, queryClient, navigate]);

    return {
        isAuthenticated: !!session?.authenticated,
        user: profile ? { ...session?.user, ...profile } : session?.user,
        role: session?.user?.role ?? null,
        isLoading,
        logout,
    };
};