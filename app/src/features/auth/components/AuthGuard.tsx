import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAutoLogout } from "@/features/auth/hooks/useAutoLogout";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {Box} from "@chakra-ui/react";
import {useTokenRefresh} from "@/features/auth/hooks/useTokenRefresh.ts";

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

    useTokenRefresh();

    // 1. ローディング中の処理
    // isLoadingがtrueの間は、children（中身）を絶対にレンダリングさせない
    if (isLoading) {
        return (
            <Box
                w="100vw"
                h="100vh"
                position="fixed"
                top={0}
                left={0}
                backgroundColor="#fcfaf2"
                backgroundImage={`
                    radial-gradient(ellipse at 100% 100%, rgba(191, 219, 254, 0.4) 0%, transparent 50%),
                    linear-gradient(-45deg, #fcfaf2, #fcfaf2, #faf5f0, #fcfaf2)
                `}
            />
        );
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