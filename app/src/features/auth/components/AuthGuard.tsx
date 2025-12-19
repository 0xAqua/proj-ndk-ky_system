import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { bffAuth } from "@/lib/bffAuth"; // ★変更
import { Spinner, Center } from "@chakra-ui/react";
import { useAutoLogout } from "@/features/auth/hooks/useAutoLogout";

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
    const [isChecked, setIsChecked] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useAutoLogout();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                // ★変更: BFF APIでセッションチェック
                const session = await bffAuth.checkSession();

                if (session.authenticated) {
                    setIsChecked(true); // OKなら通す
                } else {
                    // NGならログイン画面へ飛ばす
                    navigate("/login", { state: { from: location }, replace: true });
                }
            } catch (err) {
                // エラー時もログイン画面へ
                navigate("/login", { state: { from: location }, replace: true });
            }
        };
        void checkAuth();
    }, [navigate, location]);

    // チェック中はローディング画面
    if (!isChecked) {
        return (
            <Center h="100vh" bg="gray.50">
                <Spinner size="xl" color="blue.500" />
            </Center>
        );
    }

    // チェックOKなら中身を表示
    return <>{children}</>;
};