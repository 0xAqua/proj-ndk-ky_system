// useCredentialsAuth.ts
import { useState } from "react";
import { authService } from '@/lib/service/auth';

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
            // BFFは { error: "メッセージ" } 形式で返す
            const axiosError = err as { response?: { data?: { error?: string } } };
            const message = axiosError.response?.data?.error || 'ログインに失敗しました';
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