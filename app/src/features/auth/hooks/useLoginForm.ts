// src/features/auth/hooks/useLoginForm.ts
import React, { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient, useQuery } from "@tanstack/react-query";

import { useCredentialsAuth } from "./useCredentialsAuth";
import { authService } from '@/lib/service/auth';

export const useLoginForm = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const credentialsAuth = useCredentialsAuth();

    /**
     * 1. セッションチェックを Query 化
     */
    const { data: session, isLoading: isCheckingSession } = useQuery({
        queryKey: ['session'],
        queryFn: authService.checkSession,
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

    /**
     * 2. プリフェッチロジック（統合版）
     * ログイン後に必要な「ユーザー情報」と「工事マスタ」を一括で事前に読み込みます。
     */
    const prefetchAuthContext = useCallback(async () => {
        await queryClient.prefetchQuery({
            queryKey: ['authContext'],
            queryFn: authService.getAuthContext,
            staleTime: 1000 * 60 * 60, // 1時間
        });
    }, [queryClient]);

    /**
     * 3. ログイン済みの場合の自動リダイレクト
     */
    useEffect(() => {
        if (session?.authenticated) {
            // セッションがあればコンテキストをプリフェッチして遷移
            void prefetchAuthContext();
            navigate("/entry", { replace: true });
        }
    }, [session, navigate, prefetchAuthContext]);

    /**
     * 4. ログイン実行
     */
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const result = await credentialsAuth.handleLogin();

        if (result?.success) {
            // 1. セッション情報のキャッシュを無効化
            await queryClient.invalidateQueries({ queryKey: ['session'] });

            // 2. 統合されたデータを取得（prefetchではなくfetchQueryを使って結果を受け取る）
            // これにより、遷移前に role を確認できます
            const authContext = await queryClient.fetchQuery({
                queryKey: ['authContext'],
                queryFn: authService.getAuthContext,
                staleTime: 60 * 60 * 1000,
            });

            // 3. role に応じて遷移先を分岐
            const userRole = authContext?.user?.role;

            if (userRole === "admin") {
                // 管理者の場合
                navigate("/admin/sample", { replace: true });
            } else {
                // 一般ユーザー（またはrole未設定）の場合
                navigate("/entry", { replace: true });
            }
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