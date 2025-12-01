import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getCurrentUser } from "aws-amplify/auth";
import { Spinner, Center } from "@chakra-ui/react";

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
    const [isChecked, setIsChecked] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                await getCurrentUser(); // セッションチェック
                setIsChecked(true);     // OKなら通す
            } catch (err) {
                // NGならログイン画面へ飛ばす
                navigate("/login", { state: { from: location }, replace: true });
            }
        };
        void checkAuth();
    }, [navigate, location]);

    // チェック中はローディング画面（真っ白だと不安になるので）
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