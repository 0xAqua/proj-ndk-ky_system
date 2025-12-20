import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { authService } from '@/lib/service/auth';
import { Spinner, Center } from "@chakra-ui/react";
import { useAutoLogout } from "@/features/auth/hooks/useAutoLogout";

// ロールの型定義（ユーザー情報の定義に合わせる）
type UserRole = 'admin' | 'user';

interface AuthGuardProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
}

export const AuthGuard = ({ children, allowedRoles }: AuthGuardProps) => {
    const [isChecked, setIsChecked] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useAutoLogout();

    useEffect(() => {
        let isMounted = true;

        const checkAuth = async () => {
            try {
                // 1. セッションチェック
                const session = await authService.checkSession();

                if (!isMounted) return;

                if (session.authenticated && session.user) {
                    // 2. ロール（権限）の判定
                    if (allowedRoles && !allowedRoles.includes(session.user.role as UserRole)) {
                        // 権限がない場合はトップやエラーページへ
                        console.warn("Access denied: Insufficient permissions");
                        navigate("/entry", { replace: true });
                        return;
                    }
                    setIsChecked(true);
                } else {
                    throw new Error("Not authenticated");
                }
            } catch (err) {
                if (isMounted) {
                    navigate("/login", { state: { from: location }, replace: true });
                }
            }
        };

        void checkAuth();
        return () => { isMounted = false; };
    }, [navigate, location, allowedRoles]);

    if (!isChecked) {
        return (
            <Center h="100vh" bg="gray.50">
                <Spinner size="xl" color="blue.500"/>
            </Center>
        );
    }

    return <>{children}</>;
};