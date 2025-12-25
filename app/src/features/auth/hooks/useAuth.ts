// src/features/auth/hooks/useAuth.ts - 元に戻す + デバッグ追加
import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authService } from "@/lib/service/auth";

export const useAuth = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isLoggingOut = useRef(false);

    const {
        data: session,
        isLoading: isSessionLoading,
        error: sessionError
    } = useQuery({
        queryKey: ["session"],
        queryFn: authService.checkSession,
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

    const isAuthenticated = !!session?.authenticated;

    const {
        data: authContext,
        isLoading: isContextLoading,
        error: contextError
    } = useQuery({
        queryKey: ["authContext"],
        queryFn: authService.getAuthContext,
        enabled: isAuthenticated,
        staleTime: 60 * 60 * 1000,
    });

    const isLoading = isSessionLoading ||
        (isAuthenticated && (isContextLoading || !authContext));

    const user = authContext?.user;

    // ★ デバッグログ追加
    console.log('[useAuth]', {
        isSessionLoading,
        isContextLoading,
        isLoading,
        isAuthenticated,
        sessionUser: session?.user,
        authContextUser: user,
        role: user?.role ?? session?.user?.role,
    });

    const logout = useCallback(async () => {
        if (isLoggingOut.current) return;
        isLoggingOut.current = true;
        try {
            await authService.logout();
        } catch (error) {
            console.error("Logout API failed", error);
        } finally {
            // ★ clear() ではなく、未認証状態をセット
            queryClient.setQueryData(['session'], { authenticated: false });
            queryClient.removeQueries({ queryKey: ['authContext'] });

            sessionStorage.clear();
            localStorage.setItem('logout_event', Date.now().toString());
            localStorage.removeItem('logout_event');

            navigate('/login', { replace: true });
            isLoggingOut.current = false;
        }
    }, [queryClient, navigate]);

    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'logout_event') {
                queryClient.clear();
                navigate('/login', { replace: true });
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [queryClient, navigate]);

    const departments = Object.entries(user?.departments ?? {}).map(([key, value]) => ({
        id: key,
        name: String(value)
    }));

    return {
        isAuthenticated,
        user: user ? { ...session?.user, ...user } : session?.user,
        tenantId: user?.tenantId ?? null,
        email: user?.email ?? null,
        role: user?.role ?? session?.user?.role ?? null,
        departments,
        constructionMaster: authContext?.constructionMaster,
        isLoading,
        error: sessionError || contextError || null,
        logout,
    };
};