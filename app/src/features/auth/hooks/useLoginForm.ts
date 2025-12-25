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

    const { data: session } = useQuery({
        queryKey: ['session'],
        queryFn: authService.checkSession,
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

    // ★ authContext も取得する
    const { data: authContext } = useQuery({
        queryKey: ['authContext'],
        queryFn: authService.getAuthContext,
        enabled: !!session?.authenticated,
        staleTime: 60 * 60 * 1000,
    });

    const navigateByRole = useCallback((role: string | undefined) => {
        setIsNavigating(true);

        if (role === "admin") {
            navigate("/admin/sample", { replace: true });
        } else {
            navigate("/entry", { replace: true });
        }
    }, [navigate]);

    // ★ session と authContext の両方が揃ったら遷移
    useEffect(() => {
        if (session?.authenticated && authContext?.user?.role) {
            navigateByRole(authContext.user.role);
        }
    }, [session?.authenticated, authContext?.user?.role, navigateByRole]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        const result = await credentialsAuth.handleLogin();

        if (result?.success) {
            await queryClient.invalidateQueries({ queryKey: ['session'] });
        }
    };

    return {
        username: credentialsAuth.username,
        setUsername: credentialsAuth.setUsername,
        password: credentialsAuth.password,
        setPassword: credentialsAuth.setPassword,
        handleLogin,
        isLoading: credentialsAuth.isLoading || isNavigating,
        error: credentialsAuth.error,
    };
};