// src/hooks/useAdminSidebar.ts
import { useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";

const SIDEBAR_EXPANDED_KEY = "ui_sidebar_expanded";

/**
 * 管理画面サイドバー用フック
 * 認証状態やユーザー情報は useAuth (TanStack Query) に集約されました。
 */
export const useAdminSidebar = () => {
    // 1. 統合された認証フックから情報を取得
    // 定期的なチェックやウィンドウフォーカス時の再取得は TanStack Query が自動で行います
    const {
        user,
        isAuthenticated,
        isLoading,
        logout: authLogout
    } = useAuth();

    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // UI状態（サイドバーの開閉）のみ自前で管理
    const [isExpanded, setIsExpanded] = useState(() =>
        localStorage.getItem(SIDEBAR_EXPANDED_KEY) === "true"
    );

    // サイドバーの開閉切り替え
    const toggleExpanded = () => {
        setIsExpanded(prev => {
            const newState = !prev;
            localStorage.setItem(SIDEBAR_EXPANDED_KEY, String(newState));
            return newState;
        });
    };

    // ログアウト処理
    const handleLogout = async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        try {
            await authLogout();
        } finally {
            setIsLoggingOut(false);
        }
    };

    // 表示用ユーザー情報の整形
    const userInfo = {
        name: `${user?.family_name || ""}${user?.given_name || ""}`.trim() || user?.email || "ユーザー",
        email: user?.email || "",
    };

    // 既存のUIとの互換性のためのステートマッピング
    const authState = isLoading
        ? "checking"
        : isAuthenticated
            ? "authenticated"
            : "unauthenticated";

    return {
        authState,
        userInfo,
        isExpanded,
        isLoggingOut,
        toggleExpanded,
        handleLogout
    };
};