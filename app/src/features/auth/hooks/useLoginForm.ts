// src/hooks/useLoginForm.ts
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { useCredentialsAuth } from "./useCredentialsAuth";
import { authService } from '@/lib/service/auth';
import { constructionService } from "@/lib/service/construction";

export const useLoginForm = () => {
    const [isCheckingSession, setIsCheckingSession] = useState(true);

    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const prefetchMasterData = useCallback(() => {
        void queryClient.prefetchQuery({
            queryKey: ['constructionMaster'],
            queryFn: constructionService.getMaster,
            staleTime: 1000 * 60 * 60,
        });
    }, [queryClient]);

    const credentialsAuth = useCredentialsAuth();

    // セッションチェック
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const session = await authService.checkSession();
                if (session.authenticated) {
                    prefetchMasterData();
                    navigate("/entry", { replace: true });
                }
            } catch {
                // 未ログインは正常（何もしない）
            } finally {
                setIsCheckingSession(false);
            }
        };
        void checkAuth();
    }, [navigate, prefetchMasterData]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const result = await credentialsAuth.handleLogin();

        if (result?.success) {
            prefetchMasterData();
            navigate("/entry");
        }
    };

    return {
        isCheckingSession,
        username: credentialsAuth.username,
        setUsername: credentialsAuth.setUsername,
        password: credentialsAuth.password,
        setPassword: credentialsAuth.setPassword,
        handleLogin,
        isLoading: credentialsAuth.isLoading,
        error: credentialsAuth.error,
    };
};