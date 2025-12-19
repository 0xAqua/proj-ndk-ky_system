import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { bffAuth } from "@/lib/bffAuth";
import { Spinner, Center } from "@chakra-ui/react";
import { useAutoLogout } from "@/features/auth/hooks/useAutoLogout";

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
    const [isChecked, setIsChecked] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // 一定時間操作がない場合の自動ログアウト監視
    useAutoLogout();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const session = await bffAuth.checkSession();

                if (session.authenticated) {
                    setIsChecked(true);
                } else {
                    // 認証失敗時はログイン画面へ。戻り先情報を state に持たせる
                    navigate("/login", { state: { from: location }, replace: true });
                }
            } catch (err) {
                navigate("/login", { state: { from: location }, replace: true });
            }
        };
        void checkAuth();
    }, [navigate, location]);

    // 認証確認中はローディングスピナーを表示
    if (!isChecked) {
        return (
            <Center h="100vh" bg="gray.50">
                <Spinner size="xl" color="blue.500"/>
            </Center>
        );
    }

    // 認証済みの場合は子コンポーネントを表示
    return <>{children}</>;
};