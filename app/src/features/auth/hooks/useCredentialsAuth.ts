import { useState } from "react";
import { bffAuth } from "@/lib/bffAuth";

export const useCredentialsAuth = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async () => {

        if (!username || !password) {
            setError("メールアドレスとパスワードを入力してください。");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // BFF API経由でログイン
            await bffAuth.login(username, password);

            // ログイン成功 (HttpOnly Cookieが自動設定される)
            console.log("Login successful.");

            // 成功を返す (useLoginFormで画面遷移を処理)
            return { success: true };

        } catch (err: any) {
            console.error("Login failed:", err);

            // バックエンドからのエラーメッセージを取得
            const message = err.response?.data?.error || 'ログインに失敗しました';
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