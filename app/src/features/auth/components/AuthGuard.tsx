import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAutoLogout } from "@/features/auth/hooks/useAutoLogout";
import { useAuth } from "@/features/auth/hooks/useAuth";

type UserRole = 'admin' | 'user';

interface AuthGuardProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
}

export const AuthGuard = ({ children, allowedRoles }: AuthGuardProps) => {
    const location = useLocation();
    const { isAuthenticated, user, isLoading } = useAuth();

    // 無操作ログアウトの監視
    useAutoLogout();

    // 1. ローディング中の処理
    if (isLoading && !isAuthenticated) {
        return null
    }

    // 2. 未認証ならログインへリダイレクト（宣言的リダイレクト）
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 3. 権限（ロール）のチェック
    if (allowedRoles && user) {
        const currentRole = (user.tenantUser?.role || user.role) as UserRole;
        if (!allowedRoles.includes(currentRole)) {
            return <Navigate to="/entry" replace />;
        }
    }

    // すべての条件をクリアした場合のみ children を表示
    return <>{children}</>;
};