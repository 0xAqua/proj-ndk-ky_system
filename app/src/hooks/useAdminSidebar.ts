// src/hooks/useAdminSidebar.ts
import { useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";

const SIDEBAR_EXPANDED_KEY = "ui_sidebar_expanded";

/**
 * 管理画面サイドバー用フック
 * 認証状態やユーザー情報は useAuth (TanStack Query) に集約されました。
 */
export const useAdminSidebar = () => {
    const {
        user,
        isAuthenticated,
        isLoading,
        logout,  // ← 直接使う
    } = useAuth();

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
        toggleExpanded,
        handleLogout: logout,  // ← そのまま渡す
    };
};