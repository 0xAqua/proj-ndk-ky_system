// useCredentialsAuth.ts
import { useState } from "react";
import { authService } from '@/lib/service/auth';
import { getAuthErrorMessage } from "@/features/auth/utils/authErrors";

export const useCredentialsAuth = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async () => {
        const trimmedUsername = username.trim();
        const trimmedPassword = password.trim();

        if (!trimmedUsername || !trimmedPassword) {
            setError("メールアドレスとパスワードを入力してください。");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedUsername)) {
            setError("有効なメールアドレスを入力してください。");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await authService.login(trimmedUsername, trimmedPassword);
            setPassword("");
            return { success: true };

        } catch (err: unknown) {
            // 1. BFF (Axios) からのエラーレスポンスを解析
            const axiosError = err as { response?: { data?: { error?: string } } };

            // 2. BFF が返したエラーコード（例: "LimitExceededException"）を取得
            const errorCode = axiosError.response?.data?.error;

            // 3. getAuthErrorMessage を呼び出して日本語メッセージに変換
            // オブジェクト形式で渡すのが今の実装と最も相性が良いです。
            const message = getAuthErrorMessage({
                code: errorCode || 'DefaultError'
            });

            setError(message);
            return { success: false };
        } finally {
            setIsLoading(false);
        }
    };

    const clearError = () => setError(null);

    return {
        username,
        setUsername,
        password,
        setPassword,
        isLoading,
        error,
        handleLogin,
        clearError
    };
};