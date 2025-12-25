import React, { useEffect, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient, useQuery } from "@tanstack/react-query";

import { useCredentialsAuth } from "./useCredentialsAuth";
import { authService } from '@/lib/service/auth';

export const useLoginForm = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const credentialsAuth = useCredentialsAuth();

    // 【重要】遷移開始から画面が消えるまでの「繋ぎ」の状態
    const [isNavigating, setIsNavigating] = useState(false);

    const { data: session, isLoading: isCheckingSession } = useQuery({
        queryKey: ['session'],
        queryFn: authService.checkSession,
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

    // 【重要】async/await を削除し、即座に navigate するように変更
    const navigateByRole = useCallback(() => {
        setIsNavigating(true); // 遷移開始を宣言

        // ロール判定は遷移先の EntryForm 内で行うため、ここでは即座に /entry へ飛ばす
        // キャッシュに admin 情報がある場合のみ admin へ飛ばす（同期的なチェック）
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

        // 1. ログイン認証の通信（ここは待つ必要がある）
        const result = await credentialsAuth.handleLogin();

        if (result?.success) {
            // 2. セッションの無効化（await しない：バックグラウンドで実行）
            void queryClient.invalidateQueries({ queryKey: ['session'] });

            // 3. 即座に遷移
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