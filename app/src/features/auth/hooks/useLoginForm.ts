import React, { useEffect, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient, useQuery } from "@tanstack/react-query";

import { useCredentialsAuth } from "./useCredentialsAuth";
import { authService } from '@/lib/service/auth';

export const useLoginForm = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const credentialsAuth = useCredentialsAuth();

    const [isNavigating, setIsNavigating] = useState(false);

    const { data: session, isLoading: isCheckingSession } = useQuery({
        queryKey: ['session'],
        queryFn: authService.checkSession,
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

    const navigateByRole = useCallback(() => {
        setIsNavigating(true);

        const authContext = queryClient.getQueryData<any>(['authContext']);
        const userRole = authContext?.user?.role;

        if (userRole === "admin") {
            navigate("/admin/sample", { replace: true });
        } else {
            navigate("/entry", { replace: true });
        }
    }, [navigate, queryClient]);

    useEffect(() => {
        if (session?.authenticated) {
            navigateByRole();
        }
    }, [session?.authenticated, navigateByRole]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        const result = await credentialsAuth.handleLogin();

        if (result?.success) {
            // ★ ログイン成功直後に authContext を先行取得開始
            void queryClient.prefetchQuery({
                queryKey: ['authContext'],
                queryFn: authService.getAuthContext,
            });

            void queryClient.invalidateQueries({ queryKey: ['session'] });

            navigateByRole();
        }
    };

    return {
        isCheckingSession,
        username: credentialsAuth.username,
        setUsername: credentialsAuth.setUsername,
        password: credentialsAuth.password,
        setPassword: credentialsAuth.setPassword,
        handleLogin,
        isLoading: credentialsAuth.isLoading || isNavigating,
        error: credentialsAuth.error,
    };
};