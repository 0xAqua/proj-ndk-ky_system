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
// AuthGuard.tsx の useEffect内
        const checkAuth = async () => {
            try {
                const session = await bffAuth.checkSession();
                console.log("Session response:", session); // ★ここで中身を確認

                if (session.authenticated) {
                    console.log("Auth OK - Stay in protected route");
                    setIsChecked(true);
                } else {
                    console.warn("Auth NG - Redirecting to login");
                    navigate("/login", { state: { from: location }, replace: true });
                }
            } catch (err) {
                console.error("Session check error:", err);
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