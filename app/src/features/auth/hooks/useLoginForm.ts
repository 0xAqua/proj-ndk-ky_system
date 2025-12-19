// src/hooks/useLoginForm.ts
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { useCredentialsAuth } from "./useCredentialsAuth";
import { bffAuth } from "@/lib/bffAuth";
import { fetchConstructionMaster } from "@/api/constructionApi.ts";

export const useLoginForm = () => {
    const [isCheckingSession, setIsCheckingSession] = useState(true);

    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const prefetchMasterData = () => {
        void queryClient.prefetchQuery({
            queryKey: ['constructionMaster'],
            queryFn: fetchConstructionMaster,
            staleTime: 1000 * 60 * 60,
        });
    };

    const handleSuccess = () => {
        prefetchMasterData();
        navigate("/entry");
    };

    const credentialsAuth = useCredentialsAuth();

    // セッションチェック
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const session = await bffAuth.checkSession();
                if (session.authenticated) {
                    console.log("Already logged in");
                    prefetchMasterData();
                    navigate("/entry", { replace: true });
                }
            } catch (err) {
                console.log("Not logged in");
            } finally {
                setIsCheckingSession(false);
            }
        };
        void checkAuth();
    }, [navigate]);

    // ★修正: e.preventDefault() を追加
    const handleLogin = async (e: React.FormEvent) => {
        console.log("★ handleLogin called!");  // ★追加
        e.preventDefault();

        console.log("★ About to call credentialsAuth.handleLogin");  // ★追加
        const result = await credentialsAuth.handleLogin();
        console.log("★ Result:", result);  // ★追加

        if (result?.success) {
            handleSuccess();
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