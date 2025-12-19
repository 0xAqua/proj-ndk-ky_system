// src/hooks/useCredentialsAuth.ts
import { useState } from "react";
import { bffAuth } from "@/lib/bffAuth";

export const useCredentialsAuth = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async () => {
        setIsLoading(true);
        setError(null);

        try {
            await bffAuth.login(username, password);

            // ログイン成功
            console.log("Login successful");
            return { success: true };
        } catch (err: any) {
            const message = err.response?.data?.error || 'ログインに失敗しました';
            setError(message);
            console.error("Login failed:", message);
            return { success: false };
        } finally {
            setIsLoading(false);
        }
    };

    return {
        username,
        setUsername,
        password,
        setPassword,
        handleLogin,
        isLoading,
        error,
    };
};