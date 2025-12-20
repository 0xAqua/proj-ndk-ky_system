// src/hooks/useLoginForm.ts
import React, { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient, useQuery } from "@tanstack/react-query";

import { useCredentialsAuth } from "./useCredentialsAuth";
import { authService } from '@/lib/service/auth';
import { constructionService } from "@/lib/service/construction";

export const useLoginForm = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const credentialsAuth = useCredentialsAuth();

    /**
     * 1. セッションチェックを Query 化
     * 認証状態そのものをキャッシュすることで、Sidebarなど他コンポーネントでの再取得を防ぎます。
     */
    const { data: session, isLoading: isCheckingSession } = useQuery({
        queryKey: ['session'],
        queryFn: authService.checkSession,
        staleTime: 5 * 60 * 1000, // 5分間はフレッシュとみなす
        retry: false,             // 未ログイン時に何度もリトライさせない
    });

    /**
     * 2. プリフェッチロジック
     */
    const prefetchMasterData = useCallback(async () => {
        await queryClient.prefetchQuery({
            queryKey: ['constructionMaster'],
            queryFn: constructionService.getMaster,
            staleTime: 1000 * 60 * 60, // 1時間
        });
    }, [queryClient]);

    /**
     * 3. ログイン済みの場合の自動リダイレクト
     * キャッシュされた session の変化を監視して実行します。
     */
    useEffect(() => {
        if (session?.authenticated) {
            void prefetchMasterData();
            navigate("/entry", { replace: true });
        }
    }, [session, navigate, prefetchMasterData]);

    /**
     * 4. ログイン実行
     */
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const result = await credentialsAuth.handleLogin();

        if (result?.success) {
            // ★ 瞬間表示のための「並列プリフェッチ」
            // 全て同時に開始し、完了を待たずに遷移しても TanStack Query が裏で維持します
            void Promise.all([
                queryClient.prefetchQuery({
                    queryKey: ['session'],
                    queryFn: authService.checkSession,
                    staleTime: 5 * 60 * 1000,
                }),
                queryClient.prefetchQuery({
                    queryKey: ['userProfile'],
                    queryFn: authService.getMe,
                    staleTime: 60 * 60 * 1000,
                }),
                queryClient.prefetchQuery({
                    queryKey: ['constructionMaster'],
                    queryFn: constructionService.getMaster,
                    staleTime: 60 * 60 * 1000,
                })
            ]);

            // プリフェッチを開始したら、すぐに遷移（裏で通信は続く）
            navigate("/entry", { replace: true });
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